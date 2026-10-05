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
  type EfeitoAmortizacao,
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
  /** Efeito da amortização extra; padrão 'prazo'. */
  efeito?: EfeitoAmortizacao;
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
  /** Juros da tabela contratual menos os da tabela efetiva (com as extras). */
  economiaJuros: Centavos;
  /** Parcelas da tabela contratual menos as da efetiva. */
  parcelasAMenos: number;
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

/** Data da parcela k (1 = primeira): k−1 meses depois, no mesmo dia, limitado ao último dia do mês. */
export function dataDaParcelaDivida(primeira: DataISO, numero: number): DataISO {
  const mes = somarMeses(mesDe(primeira), numero - 1);
  const [ano, m] = mes.split('-').map(Number);
  const dia = Math.min(Number(primeira.slice(8, 10)), diasNoMes(ano, m));
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

/** Amortização extra já reduzida ao que a construção da tabela precisa. */
interface Extra {
  data: DataISO;
  valor: Centavos;
  efeito: EfeitoAmortizacao;
}

/** Períodos necessários para zerar `saldo` pagando a parcela Price `fixa` (ou amortizando `amortSac` no SAC). */
function periodosNecessarios(saldo: Centavos, taxaBp: number, sistema: SistemaAmortizacao, fixa: Centavos, amortSac: Centavos): number | null {
  if (sistema === 'sac') return amortSac > 0 ? Math.ceil(saldo / amortSac) : null;
  if (taxaBp === 0) return fixa > 0 ? Math.ceil(saldo / fixa) : null;
  const i = taxaBp / 10000;
  // Parcela que não cobre os juros nunca quita a dívida.
  if (fixa <= saldo * i) return null;
  return Math.ceil(-Math.log(1 - (saldo * i) / fixa) / Math.log(1 + i) - 1e-9);
}

/**
 * Constrói a tabela em ordem. Antes dos juros de cada parcela, aplica as extras com data anterior ao
 * vencimento dela: com efeito 'prazo' mantém parcela/amortização e antecipa o fim; com 'parcela' mantém o
 * fim e recalcula o valor sobre o saldo e as parcelas restantes. A última parcela absorve o arredondamento.
 */
function construirTabela(termos: TermosDivida, primeiraParcela: DataISO, extras: Extra[] = []): LinhaAmortizacao[] {
  const { principal, taxaBp, parcelas, sistema } = termos;
  const pendentes = [...extras].sort((a, b) => a.data.localeCompare(b.data));
  let fixa = sistema === 'price' ? parcelaPrice(termos) : 0;
  let amortSac = Math.floor(principal / parcelas);
  let fim = parcelas;
  let saldo = principal;
  const linhas: LinhaAmortizacao[] = [];
  for (let numero = 1; numero <= fim && saldo > 0; numero++) {
    const vencimento = dataDaParcelaDivida(primeiraParcela, numero);
    while (pendentes.length > 0 && pendentes[0].data < vencimento && saldo > 0) {
      const extra = pendentes.shift()!;
      saldo -= Math.min(extra.valor, saldo);
      const restantes = fim - numero + 1;
      if (saldo === 0) break;
      if (extra.efeito === 'parcela') {
        fixa = sistema === 'price' ? parcelaPrice({ principal: saldo, taxaBp, parcelas: restantes, sistema }) : 0;
        amortSac = Math.floor(saldo / restantes);
      } else {
        const n = periodosNecessarios(saldo, taxaBp, sistema, fixa, amortSac);
        if (n !== null) fim = numero - 1 + Math.min(n, restantes);
      }
    }
    if (saldo === 0) break;
    const juros = jurosDoPeriodo(saldo, taxaBp);
    const previsto = sistema === 'price' ? fixa - juros : amortSac;
    const amortizacao = numero === fim ? saldo : Math.min(Math.max(previsto, 0), saldo);
    saldo -= amortizacao;
    linhas.push({ numero, vencimento, juros, amortizacao, parcela: juros + amortizacao, saldo });
  }
  return linhas;
}

const extrasDe = (d: Pick<Divida, 'pagamentos'>): Extra[] =>
  d.pagamentos.filter((p) => p.parcela === undefined).map((p) => ({ data: p.data, valor: p.valor, efeito: p.efeito ?? 'prazo' }));

/** Tabela de amortização contratual (sem considerar pagamentos). */
export function gerarTabela(d: Pick<Divida, keyof TermosDivida | 'primeiraParcela'>): LinhaAmortizacao[] {
  return construirTabela(d, d.primeiraParcela);
}

/** Tabela recalculada com as amortizações extras registradas. */
export function gerarTabelaEfetiva(d: Pick<Divida, keyof TermosDivida | 'primeiraParcela' | 'pagamentos'>): LinhaAmortizacao[] {
  return construirTabela(d, d.primeiraParcela, extrasDe(d));
}

function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0);
}

export function resumoDivida(d: Divida, hoje: DataISO): ResumoDivida {
  const contratual = gerarTabela(d);
  const tabela = gerarTabelaEfetiva(d);
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
    economiaJuros: somar(contratual.map((l) => l.juros)) - somar(tabela.map((l) => l.juros)),
    parcelasAMenos: contratual.length - tabela.length,
  };
}

export interface PreviaAmortizacao {
  /** Valor da primeira parcela que vence depois da extra. */
  novaParcela: Centavos;
  /** Parcelas que ainda faltariam depois da data da extra. */
  parcelasRestantes: number;
  economiaJuros: Centavos;
}

/** Efeito de uma amortização extra nas duas opções, sem gravar nada; null se o valor não cabe no saldo. */
export function previaAmortizacao(d: Divida, valor: Centavos, data: DataISO, hoje: DataISO): Record<EfeitoAmortizacao, PreviaAmortizacao> | null {
  const { saldoDevedor } = resumoDivida(d, hoje);
  if (!Number.isSafeInteger(valor) || valor <= 0 || valor > saldoDevedor || !dataValida(data)) return null;
  const jurosAntes = somar(gerarTabelaEfetiva(d).map((l) => l.juros));
  const calcular = (efeito: EfeitoAmortizacao): PreviaAmortizacao => {
    const depois = construirTabela(d, d.primeiraParcela, [...extrasDe(d), { data, valor, efeito }]);
    const futuras = depois.filter((l) => l.vencimento > data);
    return { novaParcela: futuras[0]?.parcela ?? 0, parcelasRestantes: futuras.length, economiaJuros: jurosAntes - somar(depois.map((l) => l.juros)) };
  };
  return { prazo: calcular('prazo'), parcela: calcular('parcela') };
}

/** Compara Price e SAC para os mesmos termos, sem salvar nada. */
export function simular(termos: Omit<TermosDivida, 'sistema'>): Record<SistemaAmortizacao, ResumoSimulacao> {
  const resumir = (sistema: SistemaAmortizacao): ResumoSimulacao => {
    // A data não altera valores; só é exigida pela construção da tabela.
    const linhas = construirTabela({ ...termos, sistema }, '2000-01-01');
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
  if (dados.efeito !== undefined && dados.efeito !== 'prazo' && dados.efeito !== 'parcela') return falha('Escolha o efeito da amortização.', 'efeito');
  const pagamento: PagamentoDivida = {
    id: novoId(),
    data: dados.data,
    valor: dados.valor,
    ...(dados.parcela === undefined ? { efeito: dados.efeito ?? 'prazo' } : { parcela: dados.parcela }),
  };
  return ok({ ...estado, dividas: estado.dividas.map((d) => (d.id === dividaId ? { ...d, pagamentos: [...d.pagamentos, pagamento] } : d)) });
}

export function excluirPagamentoDivida(estado: AppState, dividaId: string, pagamentoId: string): Resultado<AppState> {
  const divida = estado.dividas.find((d) => d.id === dividaId);
  if (!divida?.pagamentos.some((p) => p.id === pagamentoId)) return falha('Pagamento não encontrado.');
  return ok({ ...estado, dividas: estado.dividas.map((d) => (d.id === dividaId ? { ...d, pagamentos: d.pagamentos.filter((p) => p.id !== pagamentoId) } : d)) });
}
