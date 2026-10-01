import { dataValida, diasNoMes, mesDe, somarMeses } from './date';
import { novoId, proximoTempo } from './id';
import { parseValor } from './money';
import {
  falha,
  ok,
  type AppState,
  type Centavos,
  type DataISO,
  type Divida,
  type PagamentoDivida,
  type Resultado,
  type SistemaAmortizacao,
  type TipoDivida,
} from './types';

export const NOME_DIVIDA_MAX = 60;
export const PARCELAS_DIVIDA_MAX = 480;
/** Taxa mensal máxima aceita: 100% (10000 centésimos de ponto percentual). */
export const TAXA_BP_MAX = 10000;

export interface TermosDivida {
  principal: Centavos;
  taxaBp: number;
  parcelas: number;
  sistema: SistemaAmortizacao;
}

export interface DadosDivida extends TermosDivida {
  nome: string;
  tipo: TipoDivida;
  primeiraParcela: DataISO;
}

export interface DadosPagamentoDivida {
  data: DataISO;
  valor: Centavos;
  /** Número da parcela paga; omitido numa amortização extra. */
  parcela?: number;
}

export interface LinhaAmortizacao {
  numero: number;
  vencimento: DataISO;
  juros: Centavos;
  amortizacao: Centavos;
  parcela: Centavos;
  /** Saldo devedor após esta parcela. */
  saldo: Centavos;
}

export type SituacaoParcela = 'paga' | 'parcial' | 'atrasada' | 'pendente';

export interface LinhaSituacao extends LinhaAmortizacao {
  pago: Centavos;
  restante: Centavos;
  situacao: SituacaoParcela;
}

export interface ResumoDivida {
  linhas: LinhaSituacao[];
  saldoDevedor: Centavos;
  totalJuros: Centavos;
  totalPago: Centavos;
  quitada: boolean;
  proxima: LinhaSituacao | null;
  atrasadas: { quantidade: number; valor: Centavos };
}

export interface ResumoSimulacao {
  primeiraParcela: Centavos;
  ultimaParcela: Centavos;
  totalJuros: Centavos;
  totalPago: Centavos;
}

/** Texto digitado (`1,99`) para centésimos de ponto percentual; null se inválido ou fora de 0 a 100. */
export function parseTaxaBp(texto: string): number | null {
  const bp = parseValor(texto);
  return bp === null || bp < 0 || bp > TAXA_BP_MAX ? null : bp;
}

/** Juros de um período: `saldo × taxa`, arredondado ao centavo mais próximo (meio para cima), só com inteiros. */
function jurosDoPeriodo(saldo: Centavos, taxaBp: number): Centavos {
  return Math.floor((saldo * taxaBp + 5000) / 10000);
}

/** Parcela fixa do sistema Price, calculada uma única vez e arredondada; sem juros, a parte inteira de principal ÷ prazo. */
function parcelaPrice({ principal, taxaBp, parcelas }: TermosDivida): Centavos {
  if (taxaBp === 0) return Math.floor(principal / parcelas);
  const i = taxaBp / 10000;
  return Math.round((principal * i) / (1 - Math.pow(1 + i, -parcelas)));
}

function calcularParcelas(termos: TermosDivida): Omit<LinhaAmortizacao, 'vencimento'>[] {
  const { principal, taxaBp, parcelas, sistema } = termos;
  const fixaPrice = sistema === 'price' ? parcelaPrice(termos) : 0;
  const fixaSac = Math.floor(principal / parcelas);
  const linhas: Omit<LinhaAmortizacao, 'vencimento'>[] = [];
  let saldo = principal;
  for (let numero = 1; numero <= parcelas; numero++) {
    const juros = jurosDoPeriodo(saldo, taxaBp);
    const ultima = numero === parcelas;
    const previsto = sistema === 'price' ? fixaPrice - juros : fixaSac;
    // A última parcela absorve o resto do arredondamento.
    const amortizacao = ultima ? saldo : Math.min(Math.max(previsto, 0), saldo);
    saldo -= amortizacao;
    linhas.push({ numero, juros, amortizacao, parcela: juros + amortizacao, saldo });
  }
  return linhas;
}

/** Data da parcela k (1 = primeira): k−1 meses depois, no mesmo dia, limitado ao último dia do mês. */
export function dataDaParcelaDivida(primeira: DataISO, numero: number): DataISO {
  const mes = somarMeses(mesDe(primeira), numero - 1);
  const [ano, m] = mes.split('-').map(Number);
  const dia = Math.min(Number(primeira.slice(8, 10)), diasNoMes(ano, m));
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

/** Tabela de amortização completa da dívida (contratual, sem considerar pagamentos). */
export function gerarTabela(d: Pick<Divida, keyof TermosDivida | 'primeiraParcela'>): LinhaAmortizacao[] {
  return calcularParcelas(d).map((l) => ({ ...l, vencimento: dataDaParcelaDivida(d.primeiraParcela, l.numero) }));
}

function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

export function resumoDivida(d: Divida, hoje: DataISO): ResumoDivida {
  const tabela = gerarTabela(d);
  const pagoDaParcela = (n: number) => somar(d.pagamentos.filter((p) => p.parcela === n).map((p) => p.valor));
  const extras = somar(d.pagamentos.filter((p) => p.parcela === undefined).map((p) => p.valor));

  const paga = tabela.map((l) => pagoDaParcela(l.numero) >= l.parcela);
  const saldoDevedor = Math.max(0, d.principal - somar(tabela.filter((_, i) => paga[i]).map((l) => l.amortizacao)) - extras);
  const quitada = saldoDevedor === 0;

  const linhas: LinhaSituacao[] = tabela.map((l, i) => {
    const pago = pagoDaParcela(l.numero);
    const situacao: SituacaoParcela = paga[i] ? 'paga' : !quitada && l.vencimento < hoje ? 'atrasada' : pago > 0 ? 'parcial' : 'pendente';
    return { ...l, pago, restante: Math.max(0, l.parcela - pago), situacao };
  });
  const abertas = quitada ? [] : linhas.filter((l) => l.situacao !== 'paga');
  const atrasadas = abertas.filter((l) => l.situacao === 'atrasada');

  return {
    linhas,
    saldoDevedor,
    totalJuros: somar(tabela.map((l) => l.juros)),
    totalPago: somar(d.pagamentos.map((p) => p.valor)),
    quitada,
    proxima: abertas[0] ?? null,
    atrasadas: { quantidade: atrasadas.length, valor: somar(atrasadas.map((l) => l.restante)) },
  };
}

/** Compara Price e SAC para os mesmos termos, sem salvar nada. */
export function simular(termos: Omit<TermosDivida, 'sistema'>): Record<SistemaAmortizacao, ResumoSimulacao> {
  const resumir = (sistema: SistemaAmortizacao): ResumoSimulacao => {
    const linhas = calcularParcelas({ ...termos, sistema });
    const totalPago = somar(linhas.map((l) => l.parcela));
    return { primeiraParcela: linhas[0].parcela, ultimaParcela: linhas[linhas.length - 1].parcela, totalJuros: totalPago - termos.principal, totalPago };
  };
  return { price: resumir('price'), sac: resumir('sac') };
}

/** Valida principal, taxa e prazo; compartilhado entre o cadastro e o simulador. */
export function validarTermos({ principal, taxaBp, parcelas }: Omit<TermosDivida, 'sistema'>): Resultado<void> {
  if (!Number.isSafeInteger(principal) || principal <= 0) return falha('Informe um valor maior que zero.', 'principal');
  if (!Number.isInteger(taxaBp) || taxaBp < 0 || taxaBp > TAXA_BP_MAX) return falha('Informe uma taxa mensal de 0 a 100%, com até 2 casas.', 'taxa');
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > PARCELAS_DIVIDA_MAX) {
    return falha(`Informe de 1 a ${PARCELAS_DIVIDA_MAX} parcelas.`, 'parcelas');
  }
  return ok(undefined);
}

export function criarDivida(estado: AppState, dados: DadosDivida): Resultado<AppState> {
  const nome = dados.nome.trim();
  if (nome === '' || nome.length > NOME_DIVIDA_MAX) return falha(`Informe um nome de 1 a ${NOME_DIVIDA_MAX} caracteres.`, 'nome');
  if (dados.tipo !== 'devo' && dados.tipo !== 'emprestei') return falha('Escolha o tipo.', 'tipo');
  if (dados.sistema !== 'price' && dados.sistema !== 'sac') return falha('Escolha o sistema de amortização.', 'sistema');
  const termos = validarTermos(dados);
  if (!termos.ok) return termos;
  if (!dataValida(dados.primeiraParcela)) return falha('Informe uma data válida para a primeira parcela.', 'primeiraParcela');
  const divida: Divida = { ...dados, nome, pagamentos: [], id: novoId(), criadaEm: proximoTempo() };
  return ok({ ...estado, dividas: [...estado.dividas, divida] });
}

export function excluirDivida(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.dividas.some((d) => d.id === id)) return falha('Dívida não encontrada.');
  return ok({ ...estado, dividas: estado.dividas.filter((d) => d.id !== id) });
}

/** Registra o pagamento de uma parcela (total ou parcial) ou, sem `parcela`, uma amortização extra. */
export function registrarPagamentoDivida(estado: AppState, dividaId: string, dados: DadosPagamentoDivida, hoje: DataISO): Resultado<AppState> {
  const divida = estado.dividas.find((d) => d.id === dividaId);
  if (!divida) return falha('Dívida não encontrada.');
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  if (!Number.isSafeInteger(dados.valor) || dados.valor <= 0) return falha('Informe um valor maior que zero.', 'valor');

  const resumo = resumoDivida(divida, hoje);
  if (dados.parcela === undefined) {
    if (dados.valor > resumo.saldoDevedor) return falha('A amortização extra não pode passar do saldo devedor atual.', 'valor');
  } else {
    const linha = resumo.linhas.find((l) => l.numero === dados.parcela);
    if (!linha) return falha('Parcela inexistente.', 'parcela');
    if (linha.restante === 0) return falha('Essa parcela já está quitada.', 'parcela');
    if (dados.valor > linha.restante) return falha('O valor passa do restante da parcela.', 'valor');
  }
  const pagamento: PagamentoDivida = { id: novoId(), data: dados.data, valor: dados.valor, ...(dados.parcela === undefined ? {} : { parcela: dados.parcela }) };
  return ok({ ...estado, dividas: estado.dividas.map((d) => (d.id === dividaId ? { ...d, pagamentos: [...d.pagamentos, pagamento] } : d)) });
}

export function excluirPagamentoDivida(estado: AppState, dividaId: string, pagamentoId: string): Resultado<AppState> {
  const divida = estado.dividas.find((d) => d.id === dividaId);
  if (!divida?.pagamentos.some((p) => p.id === pagamentoId)) return falha('Pagamento não encontrado.');
  return ok({ ...estado, dividas: estado.dividas.map((d) => (d.id === dividaId ? { ...d, pagamentos: d.pagamentos.filter((p) => p.id !== pagamentoId) } : d)) });
}
