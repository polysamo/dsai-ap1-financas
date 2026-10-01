import { dataValida, mesDe } from './date';
import { falha, ok, type AppState, type Categoria, type Centavos, type DataISO, type Mes, type Resultado, type TipoMovimento, type Transacao } from './types';

/** Percentual com uma casa decimal (ex.: 33,3); null se o total for zero. */
export function percentualDecimal(parte: Centavos, total: Centavos): number | null {
  return total === 0 ? null : Math.round((parte * 1000) / total) / 10;
}

const nomeDe = (categorias: Categoria[]) => {
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  return (id: string) => nomes.get(id) ?? 'Sem categoria';
};

function somaPorCategoria(transacoes: Transacao[], tipo: TipoMovimento): Map<string, { total: Centavos; quantidade: number }> {
  const mapa = new Map<string, { total: Centavos; quantidade: number }>();
  for (const t of transacoes) {
    if (t.tipo !== tipo) continue;
    const atual = mapa.get(t.categoriaId) ?? { total: 0, quantidade: 0 };
    mapa.set(t.categoriaId, { total: atual.total + t.valor, quantidade: atual.quantidade + 1 });
  }
  return mapa;
}

// ------------------------------------------------------------------- mensal

export interface LinhaCategoria {
  categoriaId: string;
  nome: string;
  valor: Centavos;
  percentual: number | null;
}

export interface QuebraPorCategoria {
  linhas: LinhaCategoria[];
  total: Centavos;
}

function quebrar(transacoes: Transacao[], categorias: Categoria[], tipo: TipoMovimento): QuebraPorCategoria {
  const nome = nomeDe(categorias);
  const soma = somaPorCategoria(transacoes, tipo);
  const total = [...soma.values()].reduce((s, v) => s + v.total, 0);
  const linhas = [...soma.entries()]
    .map(([categoriaId, v]): LinhaCategoria => ({ categoriaId, nome: nome(categoriaId), valor: v.total, percentual: percentualDecimal(v.total, total) }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));
  return { linhas, total };
}

export interface RelatorioMensal {
  mes: Mes;
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
  /** Resultado sobre receitas, em %; null sem receitas. */
  taxaPoupanca: number | null;
  despesasPorCategoria: QuebraPorCategoria;
  receitasPorCategoria: QuebraPorCategoria;
  quantidade: number;
}

export function relatorioMensal(estado: Pick<AppState, 'transacoes' | 'categorias'>, mes: Mes): RelatorioMensal {
  const doMes = estado.transacoes.filter((t) => mesDe(t.data) === mes);
  const despesasPorCategoria = quebrar(doMes, estado.categorias, 'despesa');
  const receitasPorCategoria = quebrar(doMes, estado.categorias, 'receita');
  const receitas = receitasPorCategoria.total;
  const despesas = despesasPorCategoria.total;
  return {
    mes,
    receitas,
    despesas,
    resultado: receitas - despesas,
    taxaPoupanca: percentualDecimal(receitas - despesas, receitas),
    despesasPorCategoria,
    receitasPorCategoria,
    quantidade: doMes.length,
  };
}

// -------------------------------------------------------------------- anual

export interface LinhaAnual {
  mes: Mes;
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
  temMovimento: boolean;
}

export interface RelatorioAnual {
  ano: number;
  linhas: LinhaAnual[];
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
  /** Médias só sobre os meses com ao menos uma transação. */
  mesesComMovimento: number;
  mediaReceitas: Centavos;
  mediaDespesas: Centavos;
  mediaResultado: Centavos;
  melhorMes: Mes | null;
  piorMes: Mes | null;
}

export function relatorioAnual(transacoes: Transacao[], ano: number): RelatorioAnual {
  const prefixo = String(ano);
  const linhas: LinhaAnual[] = Array.from({ length: 12 }, (_, i) => ({
    mes: `${prefixo}-${String(i + 1).padStart(2, '0')}`,
    receitas: 0,
    despesas: 0,
    resultado: 0,
    temMovimento: false,
  }));
  for (const t of transacoes) {
    if (!t.data.startsWith(`${prefixo}-`)) continue;
    const linha = linhas[Number(t.data.slice(5, 7)) - 1];
    linha.temMovimento = true;
    if (t.tipo === 'receita') linha.receitas += t.valor;
    else linha.despesas += t.valor;
  }
  for (const l of linhas) l.resultado = l.receitas - l.despesas;

  const receitas = linhas.reduce((s, l) => s + l.receitas, 0);
  const despesas = linhas.reduce((s, l) => s + l.despesas, 0);
  const ativos = linhas.filter((l) => l.temMovimento);
  const n = ativos.length;
  const media = (v: Centavos) => (n === 0 ? 0 : Math.round(v / n));
  let melhor: LinhaAnual | undefined;
  let pior: LinhaAnual | undefined;
  for (const l of ativos) {
    if (!melhor || l.resultado > melhor.resultado) melhor = l;
    if (!pior || l.resultado < pior.resultado) pior = l;
  }
  return {
    ano,
    linhas,
    receitas,
    despesas,
    resultado: receitas - despesas,
    mesesComMovimento: n,
    mediaReceitas: media(receitas),
    mediaDespesas: media(despesas),
    mediaResultado: media(receitas - despesas),
    melhorMes: n >= 2 ? (melhor?.mes ?? null) : null,
    piorMes: n >= 2 ? (pior?.mes ?? null) : null,
  };
}

// ------------------------------------------------------------- por categoria

export interface FiltroCategoria {
  de: DataISO;
  ate: DataISO;
  tipo: TipoMovimento;
  contaId?: string;
}

export interface LinhaPorCategoria {
  categoriaId: string;
  nome: string;
  total: Centavos;
  quantidade: number;
  medio: Centavos;
}

export interface RelatorioPorCategoria {
  linhas: LinhaPorCategoria[];
  total: Centavos;
  quantidade: number;
}

export function validarPeriodo(de: string, ate: string): Resultado<void> {
  if (!dataValida(de)) return falha('Informe uma data inicial válida.', 'de');
  if (!dataValida(ate)) return falha('Informe uma data final válida.', 'ate');
  if (de > ate) return falha('A data inicial não pode ser posterior à final.', 'de');
  return ok(undefined);
}

export function relatorioPorCategoria(estado: Pick<AppState, 'transacoes' | 'categorias'>, filtro: FiltroCategoria): Resultado<RelatorioPorCategoria> {
  const periodo = validarPeriodo(filtro.de, filtro.ate);
  if (!periodo.ok) return periodo;
  const nome = nomeDe(estado.categorias);
  const selecionadas = estado.transacoes.filter(
    (t) => t.data >= filtro.de && t.data <= filtro.ate && (!filtro.contaId || t.contaId === filtro.contaId),
  );
  const soma = somaPorCategoria(selecionadas, filtro.tipo);
  const linhas = [...soma.entries()]
    .map(([categoriaId, v]): LinhaPorCategoria => ({
      categoriaId,
      nome: nome(categoriaId),
      total: v.total,
      quantidade: v.quantidade,
      medio: Math.round(v.total / v.quantidade),
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
  return ok({ linhas, total: linhas.reduce((s, l) => s + l.total, 0), quantidade: linhas.reduce((s, l) => s + l.quantidade, 0) });
}

// ------------------------------------------------------------- comparativo

export interface LinhaComparativo {
  categoriaId: string;
  nome: string;
  valorBase: Centavos;
  valorComparado: Centavos;
  diferenca: Centavos;
  /** Variação em % sobre o mês-base; null quando o base é zero. */
  variacao: number | null;
}

export interface TotaisComparativo {
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
}

export interface Comparativo {
  base: Mes;
  comparado: Mes;
  linhas: LinhaComparativo[];
  totaisBase: TotaisComparativo;
  totaisComparado: TotaisComparativo;
  diferencas: TotaisComparativo;
}

export function comparativoMeses(estado: Pick<AppState, 'transacoes' | 'categorias'>, base: Mes, comparado: Mes): Comparativo {
  const a = relatorioMensal(estado, base);
  const b = relatorioMensal(estado, comparado);
  const ids = new Set([...a.despesasPorCategoria.linhas, ...b.despesasPorCategoria.linhas].map((l) => l.categoriaId));
  const valor = (r: RelatorioMensal, id: string) => r.despesasPorCategoria.linhas.find((l) => l.categoriaId === id)?.valor ?? 0;
  const nome = nomeDe(estado.categorias);
  const linhas = [...ids]
    .map((id): LinhaComparativo => {
      const valorBase = valor(a, id);
      const valorComparado = valor(b, id);
      const diferenca = valorComparado - valorBase;
      return { categoriaId: id, nome: nome(id), valorBase, valorComparado, diferenca, variacao: valorBase === 0 ? null : Math.round((diferenca * 1000) / valorBase) / 10 };
    })
    .sort((x, y) => Math.abs(y.diferenca) - Math.abs(x.diferenca) || x.nome.localeCompare(y.nome, 'pt-BR'));
  const totais = (r: RelatorioMensal): TotaisComparativo => ({ receitas: r.receitas, despesas: r.despesas, resultado: r.resultado });
  const tb = totais(a);
  const tc = totais(b);
  return {
    base,
    comparado,
    linhas,
    totaisBase: tb,
    totaisComparado: tc,
    diferencas: { receitas: tc.receitas - tb.receitas, despesas: tc.despesas - tb.despesas, resultado: tc.resultado - tb.resultado },
  };
}
