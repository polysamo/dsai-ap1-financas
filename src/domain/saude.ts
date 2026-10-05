import { limiteCartao } from './cartoes';
import { saldosPorConta } from './contas';
import { mesDe, somarMeses } from './date';
import { resumoDivida } from './dividas';
import { formatarMoeda } from './money';
import { linhasOrcamento } from './orcamento';
import { mesesBase, resumoMes } from './projecao';
import type { AppState, Centavos, DataISO, Mes } from './types';

export type IdIndicador = 'poupanca' | 'reserva' | 'dividas' | 'cartoes' | 'orcamento' | 'tendencia';
export type Faixa = 'otimo' | 'bom' | 'atencao' | 'critico';
export type Classificacao = 'saudavel' | 'estavel' | 'atencao' | 'critica';

export const ROTULO_FAIXA: Record<Faixa, string> = { otimo: 'Ótimo', bom: 'Bom', atencao: 'Atenção', critico: 'Crítico' };
export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  saudavel: 'Saudável',
  estavel: 'Estável',
  atencao: 'Precisa de atenção',
  critica: 'Crítica',
};

export interface Indicador {
  id: IdIndicador;
  titulo: string;
  /** Valor formatado para exibição ("18,5%", "4,2 meses"); null sem dados. */
  valor: string | null;
  pontos: number | null;
  faixa: Faixa | null;
  explicacao: string;
  /** Presente quando o indicador está em atenção ou crítico. */
  recomendacao?: string;
}

export interface SaudeFinanceira {
  indicadores: Indicador[];
  nota: number | null;
  classificacao: Classificacao | null;
  mesesReferencia: Mes[];
}

/** Uma faixa de pontuação: vale `pontos` quando o valor atende `condicao`. */
type Degrau = [condicao: (v: number) => boolean, pontos: number];

function pontuar(valor: number, degraus: Degrau[]): number {
  return degraus.find(([condicao]) => condicao(valor))?.[1] ?? 0;
}

export function faixaDe(pontos: number): Faixa {
  if (pontos >= 100) return 'otimo';
  if (pontos >= 70) return 'bom';
  if (pontos >= 35) return 'atencao';
  return 'critico';
}

export function classificar(nota: number): Classificacao {
  if (nota >= 80) return 'saudavel';
  if (nota >= 60) return 'estavel';
  if (nota >= 40) return 'atencao';
  return 'critica';
}

const umaCasa = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (n: number) => `${umaCasa(n)}%`;
const arred1 = (n: number) => Math.round(n * 10) / 10;

interface Base {
  meses: Mes[];
  receitaMedia: Centavos;
  despesaMedia: Centavos;
}

function montar(id: IdIndicador, titulo: string, explicacao: string, valor: string | null, pontos: number | null, recomendacao?: string): Indicador {
  const faixa = pontos === null ? null : faixaDe(pontos);
  const ruim = faixa === 'atencao' || faixa === 'critico';
  return { id, titulo, explicacao, valor, pontos, faixa, ...(ruim && recomendacao ? { recomendacao } : {}) };
}

function indicadorPoupanca(base: Base): Indicador {
  const explicacao = 'Quanto da renda sobra depois das despesas, na média dos meses de referência. O ideal é 20% ou mais.';
  if (base.receitaMedia === 0) return montar('poupanca', 'Taxa de poupança', explicacao, null, null);
  const taxa = arred1(((base.receitaMedia - base.despesaMedia) * 100) / base.receitaMedia);
  const pontos = pontuar(taxa, [
    [(v) => v >= 20, 100],
    [(v) => v >= 10, 75],
    [(v) => v >= 0, 50],
  ]);
  const falta = Math.ceil(base.receitaMedia * 0.2) - (base.receitaMedia - base.despesaMedia);
  return montar('poupanca', 'Taxa de poupança', explicacao, pct(taxa), pontos, `Para poupar 20% da renda, o resultado mensal precisa melhorar ${formatarMoeda(falta)}.`);
}

const TIPOS_LIQUIDOS = new Set(['corrente', 'poupanca', 'dinheiro']);

function indicadorReserva(estado: AppState, base: Base): Indicador {
  const explicacao = 'Quantos meses de despesas o saldo em conta corrente, poupança e dinheiro cobre. O ideal é 6 meses.';
  if (base.despesaMedia === 0) return montar('reserva', 'Reserva de emergência', explicacao, null, null);
  const saldos = saldosPorConta(estado);
  const reserva = estado.contas.filter((c) => !c.arquivada && TIPOS_LIQUIDOS.has(c.tipo)).reduce((s, c) => s + Math.max(saldos.get(c.id) ?? 0, 0), 0);
  const meses = arred1(reserva / base.despesaMedia);
  const pontos = pontuar(meses, [
    [(v) => v >= 6, 100],
    [(v) => v >= 3, 75],
    [(v) => v >= 1, 40],
  ]);
  const falta = base.despesaMedia * 6 - reserva;
  return montar('reserva', 'Reserva de emergência', explicacao, `${umaCasa(meses)} ${meses === 1 ? 'mês' : 'meses'}`, pontos, `Faltam ${formatarMoeda(falta)} para a reserva cobrir 6 meses de despesas.`);
}

function indicadorDividas(estado: AppState, base: Base, hoje: DataISO): Indicador {
  const explicacao = 'Parcelas de dívidas que vencem neste mês sobre a renda média mensal. O ideal é até 15%.';
  const mesAtual = mesDe(hoje);
  const abertas = estado.dividas.filter((d) => d.tipo === 'devo').map((d) => resumoDivida(d, hoje)).filter((r) => !r.quitada);
  if (base.receitaMedia === 0) return montar('dividas', 'Comprometimento com dívidas', explicacao, null, null);
  if (abertas.length === 0) return montar('dividas', 'Comprometimento com dívidas', explicacao, 'Sem dívidas', 100);
  const parcelas = abertas.flatMap((r) => r.linhas).filter((l) => mesDe(l.vencimento) === mesAtual).reduce((s, l) => s + l.parcela, 0);
  const taxa = arred1((parcelas * 100) / base.receitaMedia);
  const pontos = pontuar(taxa, [
    [(v) => v <= 15, 100],
    [(v) => v <= 30, 70],
    [(v) => v <= 40, 35],
  ]);
  const reduzir = parcelas - Math.floor(base.receitaMedia * 0.15);
  return montar('dividas', 'Comprometimento com dívidas', explicacao, pct(taxa), pontos, `As parcelas deste mês somam ${formatarMoeda(parcelas)}; para ficar em 15% da renda seria preciso reduzir ${formatarMoeda(reduzir)} por mês (renegociar ou amortizar).`);
}

function indicadorCartoes(estado: AppState): Indicador {
  const explicacao = 'Quanto do limite total dos cartões está em uso. O ideal é até 30%.';
  const cartoes = estado.contas.filter((c) => !c.arquivada && c.tipo === 'cartao' && c.cartao);
  const limite = cartoes.reduce((s, c) => s + (c.cartao?.limite ?? 0), 0);
  if (cartoes.length === 0 || limite === 0) return montar('cartoes', 'Uso do limite dos cartões', explicacao, null, null);
  const usado = cartoes.reduce((s, c) => s + (limiteCartao(estado, c)?.usado ?? 0), 0);
  const taxa = arred1((usado * 100) / limite);
  const pontos = pontuar(taxa, [
    [(v) => v <= 30, 100],
    [(v) => v <= 50, 70],
    [(v) => v <= 80, 35],
  ]);
  const reduzir = usado - Math.floor(limite * 0.3);
  return montar('cartoes', 'Uso do limite dos cartões', explicacao, pct(taxa), pontos, `Pagar ${formatarMoeda(reduzir)} das faturas deixaria o uso em 30% do limite.`);
}

function indicadorOrcamento(estado: AppState, hoje: DataISO): Indicador {
  const explicacao = 'No último mês completo, quantas categorias com limite ficaram dentro dele.';
  const mes = somarMeses(mesDe(hoje), -1);
  const comLimite = linhasOrcamento(estado, mes).filter((l) => l.limite !== null);
  if (comLimite.length === 0) return montar('orcamento', 'Orçamento respeitado', explicacao, null, null);
  const estouradas = comLimite.filter((l) => l.gasto > (l.limite ?? 0));
  const taxa = arred1(((comLimite.length - estouradas.length) * 100) / comLimite.length);
  const pontos = pontuar(taxa, [
    [(v) => v >= 100, 100],
    [(v) => v >= 80, 75],
    [(v) => v >= 50, 40],
  ]);
  const lista = estouradas.map((l) => `${l.nome} (${formatarMoeda(l.gasto - (l.limite ?? 0))} acima)`).join(', ');
  return montar('orcamento', 'Orçamento respeitado', explicacao, pct(taxa), pontos, `Estouraram o orçamento: ${lista}.`);
}

function mediaDespesas(estado: AppState, meses: Mes[]): Centavos {
  return Math.round(meses.reduce((s, m) => s + resumoMes(estado.transacoes, m).despesas, 0) / meses.length);
}

function indicadorTendencia(estado: AppState, base: Base): Indicador {
  const explicacao = 'Variação das despesas médias dos últimos 3 meses completos contra os 3 meses anteriores.';
  const primeiro = estado.transacoes.reduce<string | null>((min, t) => (min === null || t.data < min ? t.data : min), null);
  const anteriores = base.meses.length === 3 ? [-3, -2, -1].map((n) => somarMeses(base.meses[0], n)) : [];
  if (anteriores.length === 0 || primeiro === null || mesDe(primeiro) > anteriores[0]) return montar('tendencia', 'Tendência das despesas', explicacao, null, null);
  const antes = mediaDespesas(estado, anteriores);
  if (antes === 0) return montar('tendencia', 'Tendência das despesas', explicacao, null, null);
  const variacao = arred1(((base.despesaMedia - antes) * 100) / antes);
  const pontos = pontuar(variacao, [
    [(v) => v <= 0, 100],
    [(v) => v <= 10, 70],
    [(v) => v <= 25, 35],
  ]);
  const sinal = variacao > 0 ? '+' : '';
  return montar('tendencia', 'Tendência das despesas', explicacao, `${sinal}${pct(variacao)}`, pontos, `As despesas médias subiram ${formatarMoeda(base.despesaMedia - antes)} por mês em relação ao trimestre anterior.`);
}

/** Calcula todos os indicadores e a nota geral; não altera o estado. */
export function saudeFinanceira(estado: AppState, hoje: DataISO): SaudeFinanceira {
  const meses = mesesBase(estado.transacoes, hoje);
  const resumos = meses.map((m) => resumoMes(estado.transacoes, m));
  const media = (f: (r: (typeof resumos)[number]) => number) => (meses.length ? Math.round(resumos.reduce((s, r) => s + f(r), 0) / meses.length) : 0);
  const base: Base = { meses, receitaMedia: media((r) => r.receitas), despesaMedia: media((r) => r.despesas) };
  const indicadores = [
    indicadorPoupanca(base),
    indicadorReserva(estado, base),
    indicadorDividas(estado, base, hoje),
    indicadorCartoes(estado),
    indicadorOrcamento(estado, hoje),
    indicadorTendencia(estado, base),
  ];
  const comDados = indicadores.filter((i) => i.pontos !== null);
  const nota = comDados.length ? Math.round(comDados.reduce((s, i) => s + (i.pontos ?? 0), 0) / comDados.length) : null;
  return { indicadores, nota, classificacao: nota === null ? null : classificar(nota), mesesReferencia: meses };
}
