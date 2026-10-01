import { desempenhoCarteira } from './investimentos';
import { mesDe, nomeMes, somarMeses } from './date';
import { novoId, proximoTempo } from './id';
import { parseValor } from './money';
import { mesesBase, resumoMes } from './projecao';
import { falha, ok, type AppState, type Centavos, type DataISO, type Mes, type Resultado } from './types';

export const LIMITE_MESES = 1200;
export const MAX_CENARIOS = 5;
export const NOME_CENARIO_MAX = 40;
export const VARIACAO_CENARIO_BP = 200;
export const ACRESCIMOS_APORTE = [10, 25, 50] as const;
const PPB = 1_000_000_000n;

/** Premissas do simulador. Percentuais em pontos-base (centésimos de ponto percentual): 400 = 4%. */
export interface ParametrosIndependencia {
  patrimonio: Centavos;
  aporteMensal: Centavos;
  retornoAnualBp: number;
  gastoMensal: Centavos;
  taxaRetiradaBp: number;
  idadeAtual?: number;
  idadeAlvo?: number;
}

export interface CenarioIndependencia {
  id: string;
  nome: string;
  parametros: ParametrosIndependencia;
  criadoEm: number;
}

export interface PontoAnual {
  ano: number;
  meses: number;
  patrimonio: Centavos;
  aportado: Centavos;
  rendimento: Centavos;
}

export interface Simulacao {
  alvo: Centavos;
  alcancavel: boolean;
  /** Meses até atingir o alvo; null quando inalcançável em 100 anos. */
  meses: number | null;
  /** Mês estimado da independência; null quando inalcançável. */
  mesAlvo: Mes | null;
  anual: PontoAnual[];
}

/** Patrimônio-alvo: gasto anual dividido pela taxa de retirada, arredondado ao centavo. */
export function patrimonioAlvo(gastoMensal: Centavos, taxaRetiradaBp: number): Centavos {
  return Math.round((gastoMensal * 12 * 10000) / taxaRetiradaBp);
}

/** Taxa mensal equivalente à anual, como inteiro em partes por bilhão. */
export function taxaMensalPpb(retornoAnualBp: number): number {
  return Math.round((Math.pow(1 + retornoAnualBp / 10000, 1 / 12) - 1) * 1e9);
}

/** Juros de um mês sobre o saldo, em centavos, arredondando metade para cima (aritmética inteira). */
export function jurosDoMes(saldo: Centavos, ppb: number): Centavos {
  const produto = BigInt(saldo) * BigInt(ppb);
  const abs = produto < 0n ? -produto : produto;
  const arredondado = (abs + PPB / 2n) / PPB;
  return Number(produto < 0n ? -arredondado : arredondado);
}

/** Simula mês a mês: juros sobre o saldo de abertura, depois o aporte no fim do mês. */
export function simular(p: ParametrosIndependencia, retornoAnualBp = p.retornoAnualBp, hoje?: DataISO): Simulacao {
  const alvo = patrimonioAlvo(p.gastoMensal, p.taxaRetiradaBp);
  const ppb = taxaMensalPpb(retornoAnualBp);
  const anual: PontoAnual[] = [];
  let saldo = p.patrimonio;
  let aportado = 0;
  let meses = 0;
  while (saldo < alvo && meses < LIMITE_MESES) {
    saldo += jurosDoMes(saldo, ppb) + p.aporteMensal;
    aportado += p.aporteMensal;
    meses += 1;
    if (meses % 12 === 0 || saldo >= alvo || meses === LIMITE_MESES) {
      anual.push({ ano: Math.ceil(meses / 12), meses, patrimonio: saldo, aportado, rendimento: saldo - p.patrimonio - aportado });
    }
  }
  const alcancavel = saldo >= alvo;
  return {
    alvo,
    alcancavel,
    meses: alcancavel ? meses : null,
    mesAlvo: alcancavel && hoje ? somarMeses(mesDe(hoje), meses) : null,
    anual,
  };
}

export function formatarPrazo(meses: number): string {
  if (meses === 0) return '0 mês';
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const a = anos > 0 ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : '';
  const m = resto > 0 ? `${resto} ${resto === 1 ? 'mês' : 'meses'}` : '';
  return [a, m].filter(Boolean).join(' e ');
}

export const textoDataEstimada = (mes: Mes | null): string => (mes ? nomeMes(mes) : '—');

export interface CenarioCalculado {
  nome: 'Pessimista' | 'Base' | 'Otimista';
  retornoAnualBp: number;
  simulacao: Simulacao;
}

/** Pessimista (retorno − 2 p.p.), base e otimista (+ 2 p.p.). */
export function cenariosDeRetorno(p: ParametrosIndependencia, hoje: DataISO): CenarioCalculado[] {
  const faixa: [CenarioCalculado['nome'], number][] = [
    ['Pessimista', p.retornoAnualBp - VARIACAO_CENARIO_BP],
    ['Base', p.retornoAnualBp],
    ['Otimista', p.retornoAnualBp + VARIACAO_CENARIO_BP],
  ];
  return faixa.map(([nome, retornoAnualBp]) => ({ nome, retornoAnualBp, simulacao: simular(p, retornoAnualBp, hoje) }));
}

export interface LinhaSensibilidade {
  acrescimoPct: number;
  aporteMensal: Centavos;
  simulacao: Simulacao;
  /** Meses antecipados em relação ao aporte atual; null se algum dos dois for inalcançável. */
  mesesAntecipados: number | null;
}

export function sensibilidadeAporte(p: ParametrosIndependencia, hoje: DataISO): LinhaSensibilidade[] {
  const base = simular(p, p.retornoAnualBp, hoje);
  return ACRESCIMOS_APORTE.map((acrescimoPct) => {
    const aporteMensal = Math.round((p.aporteMensal * (100 + acrescimoPct)) / 100);
    const simulacao = simular({ ...p, aporteMensal }, p.retornoAnualBp, hoje);
    const mesesAntecipados = base.meses !== null && simulacao.meses !== null ? base.meses - simulacao.meses : null;
    return { acrescimoPct, aporteMensal, simulacao, mesesAntecipados };
  });
}

export interface SituacaoIdade {
  /** Idade em anos completos ao atingir o alvo; null quando inalcançável. */
  idadeNaIndependencia: number | null;
  /** Com idade alvo: meses de folga (positivo) ou atraso (negativo); null se inalcançável. */
  folgaMeses: number | null;
  /** Aporte mensal mínimo para atingir o alvo na idade alvo; 0 se o patrimônio já basta. */
  aporteNecessario: Centavos | null;
}

/** Menor aporte mensal que atinge o alvo em até `meses` meses (busca binária em centavos inteiros). */
export function aporteNecessario(p: ParametrosIndependencia, meses: number): Centavos {
  const bate = (aporteMensal: Centavos) => {
    const s = simular({ ...p, aporteMensal });
    return s.meses !== null && s.meses <= meses;
  };
  let baixo = 0;
  let alto = Math.max(patrimonioAlvo(p.gastoMensal, p.taxaRetiradaBp), 1);
  while (baixo < alto) {
    const meio = Math.floor((baixo + alto) / 2);
    if (bate(meio)) alto = meio;
    else baixo = meio + 1;
  }
  return baixo;
}

export function situacaoIdade(p: ParametrosIndependencia, s: Simulacao): SituacaoIdade | null {
  if (p.idadeAtual === undefined) return null;
  const idadeNaIndependencia = s.meses === null ? null : p.idadeAtual + Math.floor(s.meses / 12);
  if (p.idadeAlvo === undefined) return { idadeNaIndependencia, folgaMeses: null, aporteNecessario: null };
  const prazoDisponivel = (p.idadeAlvo - p.idadeAtual) * 12;
  return {
    idadeNaIndependencia,
    folgaMeses: s.meses === null ? null : prazoDisponivel - s.meses,
    aporteNecessario: aporteNecessario(p, prazoDisponivel),
  };
}

// ----------------------------------------------------------------- sugestões

export interface Sugestoes {
  patrimonio: Centavos | null;
  aporteMensal: Centavos | null;
  gastoMensal: Centavos | null;
}

/** Valores sugeridos pelos dados do app: carteira de investimentos e médias dos meses-base da projeção. */
export function sugerirPremissas(estado: AppState, hoje: DataISO): Sugestoes {
  const carteira = estado.investimentos.length > 0 ? desempenhoCarteira(estado.investimentos).valorAtual : null;
  const base = mesesBase(estado.transacoes, hoje);
  if (base.length === 0) return { patrimonio: carteira, aporteMensal: null, gastoMensal: null };
  const resumos = base.map((m) => resumoMes(estado.transacoes, m));
  const media = (f: (r: (typeof resumos)[number]) => number) => Math.round(resumos.reduce((s, r) => s + f(r), 0) / resumos.length);
  const despesas = media((r) => r.despesas);
  return {
    patrimonio: carteira,
    aporteMensal: Math.max(0, media((r) => r.resultado)),
    gastoMensal: despesas > 0 ? despesas : null,
  };
}

// ---------------------------------------------------------------- formulário

/** Campos do formulário, como texto digitado. */
export interface FormularioIndependencia {
  patrimonio: string;
  aporteMensal: string;
  retornoAnual: string;
  gastoMensal: string;
  taxaRetirada: string;
  idadeAtual: string;
  idadeAlvo: string;
}

export type CampoIndependencia = keyof FormularioIndependencia;
export type ErrosFormulario = Partial<Record<CampoIndependencia, string>>;

/** Converte "4,5" ou "4.25" em pontos-base (450, 425); null se inválido ou com mais de 2 casas. */
export function parsePercentualBp(texto: string): number | null {
  const s = texto.trim().replace('%', '').trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Pontos-base como texto de campo: 400 vira "4", 425 vira "4,25". */
export function bpParaCampo(bp: number): string {
  return String(bp / 100).replace('.', ',');
}

const idadeInteira = (t: string) => /^\d{1,3}$/.test(t.trim());

/** Valida os campos e devolve as premissas, ou os erros por campo. */
export function lerFormulario(f: FormularioIndependencia): { ok: true; valor: ParametrosIndependencia } | { ok: false; erros: ErrosFormulario } {
  const erros: ErrosFormulario = {};
  const patrimonio = parseValor(f.patrimonio);
  if (patrimonio === null || patrimonio < 0) erros.patrimonio = 'Informe um valor igual ou maior que zero.';
  const aporteMensal = parseValor(f.aporteMensal);
  if (aporteMensal === null || aporteMensal < 0) erros.aporteMensal = 'Informe um valor igual ou maior que zero.';
  const gastoMensal = parseValor(f.gastoMensal);
  if (gastoMensal === null || gastoMensal <= 0) erros.gastoMensal = 'O gasto mensal deve ser maior que zero.';
  const retornoAnualBp = parsePercentualBp(f.retornoAnual);
  if (retornoAnualBp === null || retornoAnualBp < -500 || retornoAnualBp > 3000) erros.retornoAnual = 'Informe um retorno entre -5% e 30% ao ano.';
  const taxaRetiradaBp = parsePercentualBp(f.taxaRetirada);
  if (taxaRetiradaBp === null || taxaRetiradaBp < 10 || taxaRetiradaBp > 2000) erros.taxaRetirada = 'Informe uma taxa entre 0,1% e 20% ao ano.';

  const temAtual = f.idadeAtual.trim() !== '';
  const temAlvo = f.idadeAlvo.trim() !== '';
  const idadeAtual = temAtual && idadeInteira(f.idadeAtual) ? Number(f.idadeAtual) : undefined;
  const idadeAlvo = temAlvo && idadeInteira(f.idadeAlvo) ? Number(f.idadeAlvo) : undefined;
  if (temAtual && (idadeAtual === undefined || idadeAtual > 120)) erros.idadeAtual = 'Informe uma idade inteira entre 0 e 120.';
  if (temAlvo && (idadeAlvo === undefined || idadeAlvo > 120)) erros.idadeAlvo = 'Informe uma idade inteira entre 0 e 120.';
  if (temAlvo && !temAtual && !erros.idadeAlvo) erros.idadeAtual = 'Informe a idade atual para usar a idade alvo.';
  if (idadeAtual !== undefined && idadeAlvo !== undefined && !erros.idadeAtual && !erros.idadeAlvo && idadeAlvo <= idadeAtual) {
    erros.idadeAlvo = 'A idade alvo deve ser maior que a idade atual.';
  }
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  const valor: ParametrosIndependencia = {
    patrimonio: patrimonio!,
    aporteMensal: aporteMensal!,
    retornoAnualBp: retornoAnualBp!,
    gastoMensal: gastoMensal!,
    taxaRetiradaBp: taxaRetiradaBp!,
  };
  if (idadeAtual !== undefined) valor.idadeAtual = idadeAtual;
  if (idadeAlvo !== undefined) valor.idadeAlvo = idadeAlvo;
  return { ok: true, valor };
}

// ------------------------------------------------------------ cenários salvos

/** Cenários salvos; a chave é opcional no tipo porque dados antigos e o exemplo não a trazem. */
export const listaCenarios = (estado: AppState): CenarioIndependencia[] => estado.cenariosIndependencia ?? [];

export function salvarCenario(estado: AppState, nomeDigitado: string, parametros: ParametrosIndependencia): Resultado<AppState> {
  const nome = nomeDigitado.trim();
  if (!nome) return falha('Informe um nome para o cenário.', 'nome');
  if (nome.length > NOME_CENARIO_MAX) return falha(`O nome deve ter no máximo ${NOME_CENARIO_MAX} caracteres.`, 'nome');
  if (listaCenarios(estado).some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return falha('Já existe um cenário com esse nome.', 'nome');
  if (listaCenarios(estado).length >= MAX_CENARIOS) {
    return falha(`Você pode guardar no máximo ${MAX_CENARIOS} cenários; exclua um para salvar outro.`, 'nome');
  }
  const cenario: CenarioIndependencia = { id: novoId(), nome, parametros: { ...parametros }, criadoEm: proximoTempo() };
  return ok({ ...estado, cenariosIndependencia: [...listaCenarios(estado), cenario] });
}

export function excluirCenario(estado: AppState, id: string): Resultado<AppState> {
  if (!listaCenarios(estado).some((c) => c.id === id)) return falha('Cenário não encontrado.');
  return ok({ ...estado, cenariosIndependencia: listaCenarios(estado).filter((c) => c.id !== id) });
}
