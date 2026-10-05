import { formatarParticipacao, formatarValor } from './formato';
import type { Dado, Fatia, Serie, Unidade } from './tipos';

export interface TabelaGrafico {
  colunas: string[];
  linhas: { rotulo: string; celulas: string[] }[];
  /** Linha de total (primeira célula é o rótulo "Total"); ausente quando não pedida. */
  total?: { rotulo: string; celulas: string[] };
}

const num = (v: string | number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Tabela alternativa de um gráfico cartesiano: uma linha por ponto, uma coluna por série. */
export function tabelaDeSeries(
  dados: Dado[],
  chaveX: string,
  rotuloX: string,
  series: Serie[],
  unidade: Unidade,
  formatarX: (v: string | number) => string = String,
  comTotal = false,
): TabelaGrafico {
  const linhas = dados.map((d) => ({ rotulo: formatarX(d[chaveX]), celulas: series.map((s) => formatarValor(num(d[s.chave]), unidade)) }));
  const tabela: TabelaGrafico = { colunas: [rotuloX, ...series.map((s) => s.nome)], linhas };
  if (comTotal) {
    tabela.total = { rotulo: 'Total', celulas: series.map((s) => formatarValor(dados.reduce((soma, d) => soma + num(d[s.chave]), 0), unidade)) };
  }
  return tabela;
}

/** Tabela alternativa do pizza: valor e participação de cada fatia, com total. */
export function tabelaDeFatias(fatias: Fatia[], rotuloX: string, unidade: Unidade): TabelaGrafico {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return {
    colunas: [rotuloX, 'Valor', 'Participação'],
    linhas: fatias.map((f) => ({ rotulo: f.nome, celulas: [formatarValor(f.valor, unidade), formatarParticipacao(f.valor, total)] })),
    total: { rotulo: 'Total', celulas: [formatarValor(total, unidade), total === 0 ? '0%' : '100%'] },
  };
}

export const NOME_OUTRAS = 'Outras';
export const MAX_FATIAS = 6;
export const LIMITE_PEQUENA = 0.03;

/**
 * Com mais de `MAX_FATIAS` fatias, junta as menores que 3% do total numa fatia "Outras".
 * Ordena do maior para o menor e deixa "Outras" por último.
 */
export function agruparFatias(fatias: Fatia[]): Fatia[] {
  const positivas = fatias.filter((f) => f.valor > 0).sort((a, b) => b.valor - a.valor);
  if (positivas.length <= MAX_FATIAS) return positivas;
  const total = positivas.reduce((s, f) => s + f.valor, 0);
  const grandes = positivas.filter((f) => f.valor / total >= LIMITE_PEQUENA);
  const pequenas = positivas.filter((f) => f.valor / total < LIMITE_PEQUENA);
  if (pequenas.length === 0) return positivas;
  const outras = pequenas.reduce((s, f) => s + f.valor, 0);
  return [...grandes, { nome: NOME_OUTRAS, valor: outras }];
}
