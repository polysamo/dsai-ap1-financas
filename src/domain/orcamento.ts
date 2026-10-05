import { arvoreCategorias, nomeCompleto, somarNaRaiz } from './subcategorias';
import { mesDe, mesValido, somarMeses } from './date';
import { falha, ok, type AppState, type Categoria, type Centavos, type Mes, type Resultado, type Transacao } from './types';

export type EstadoOrcamento = 'normal' | 'atencao' | 'estourado';

/** Abaixo de 80% é normal, de 80% a 100% é atenção, acima de 100% é estourado. */
export function estadoDoConsumo(gasto: Centavos, limite: Centavos): EstadoOrcamento {
  if (limite === 0) return gasto > 0 ? 'estourado' : 'normal';
  if (gasto > limite) return 'estourado';
  if (gasto * 100 >= limite * 80) return 'atencao';
  return 'normal';
}

/** Percentual consumido (inteiro); null quando o limite é zero. */
export function percentualConsumido(gasto: Centavos, limite: Centavos): number | null {
  return limite === 0 ? null : Math.round((gasto * 100) / limite);
}

/** Soma das despesas por categoria dentro do mês, em todas as contas. */
export function gastoPorCategoria(transacoes: Transacao[], mes: Mes): Map<string, Centavos> {
  const gastos = new Map<string, Centavos>();
  for (const t of transacoes) {
    if (t.tipo !== 'despesa' || mesDe(t.data) !== mes) continue;
    gastos.set(t.categoriaId, (gastos.get(t.categoriaId) ?? 0) + t.valor);
  }
  return gastos;
}

export interface LinhaOrcamento {
  categoria: Categoria;
  /** Nome completo ("Pai › Filha" nas subcategorias). */
  nome: string;
  limite: Centavos | null;
  /** Gasto da categoria somado ao das subcategorias. */
  gasto: Centavos;
  /** Só o gasto lançado na própria categoria. */
  gastoProprio: Centavos;
  restante: Centavos | null;
  percentual: number | null;
  estado: EstadoOrcamento | null;
}

export function linhasOrcamento(estado: AppState, mes: Mes): LinhaOrcamento[] {
  const gastos = gastoPorCategoria(estado.transacoes, mes);
  const limites = new Map(estado.orcamentos.filter((o) => o.mes === mes).map((o) => [o.categoriaId, o.limite]));
  const comFilhas = somarNaRaiz(gastos, estado.categorias);
  const entra = (c: Categoria) => !c.arquivada || limites.has(c.id) || (gastos.get(c.id) ?? 0) > 0 || (comFilhas.get(c.id) ?? 0) > 0;
  return arvoreCategorias(estado.categorias, 'despesa', entra)
    .map(({ categoria, nivel }): LinhaOrcamento => {
      const limite = limites.get(categoria.id) ?? null;
      const gastoProprio = gastos.get(categoria.id) ?? 0;
      const gasto = nivel === 0 ? (comFilhas.get(categoria.id) ?? 0) : gastoProprio;
      return {
        categoria,
        nome: nomeCompleto(estado.categorias, categoria.id),
        limite,
        gasto,
        gastoProprio,
        restante: limite === null ? null : limite - gasto,
        percentual: limite === null ? null : percentualConsumido(gasto, limite),
        estado: limite === null ? null : estadoDoConsumo(gasto, limite),
      };
    });
}

export interface TotaisOrcamento {
  limites: Centavos;
  gastoComLimite: Centavos;
  gastoSemOrcamento: Centavos;
}

/**
 * Totais sem contar duas vezes: o limite de uma subcategoria cujo pai tem limite já está dentro do dele,
 * e cada gasto próprio conta como "com limite" se a categoria ou o pai tiverem limite.
 */
export function totaisOrcamento(linhas: LinhaOrcamento[]): TotaisOrcamento {
  const limitePorId = new Map(linhas.map((l) => [l.categoria.id, l.limite]));
  const paiTemLimite = (l: LinhaOrcamento) => l.categoria.paiId !== undefined && (limitePorId.get(l.categoria.paiId) ?? null) !== null;
  let limites = 0;
  let gastoComLimite = 0;
  let gastoSemOrcamento = 0;
  for (const l of linhas) {
    if (l.limite !== null && !paiTemLimite(l)) limites += l.limite;
    if (l.limite !== null || paiTemLimite(l)) gastoComLimite += l.gastoProprio;
    else gastoSemOrcamento += l.gastoProprio;
  }
  return { limites, gastoComLimite, gastoSemOrcamento };
}

export function definirLimite(estado: AppState, categoriaId: string, mes: Mes, limite: Centavos): Resultado<AppState> {
  if (!mesValido(mes)) return falha('Mês inválido.');
  if (!Number.isInteger(limite) || limite < 0) return falha('O limite não pode ser negativo.', 'limite');
  const categoria = estado.categorias.find((c) => c.id === categoriaId);
  if (!categoria || categoria.tipo !== 'despesa') return falha('Escolha uma categoria de despesa.');
  const resto = estado.orcamentos.filter((o) => !(o.categoriaId === categoriaId && o.mes === mes));
  return ok({ ...estado, orcamentos: [...resto, { categoriaId, mes, limite }] });
}

export function removerLimite(estado: AppState, categoriaId: string, mes: Mes): Resultado<AppState> {
  return ok({ ...estado, orcamentos: estado.orcamentos.filter((o) => !(o.categoriaId === categoriaId && o.mes === mes)) });
}

export function mesTemLimites(estado: AppState, mes: Mes): boolean {
  return estado.orcamentos.some((o) => o.mes === mes);
}

/** Copia os limites do mês anterior sem sobrescrever limites que já existam no mês. */
export function copiarMesAnterior(estado: AppState, mes: Mes): Resultado<AppState> {
  const anterior = somarMeses(mes, -1);
  const origem = estado.orcamentos.filter((o) => o.mes === anterior);
  if (origem.length === 0) return falha('O mês anterior não tem limites para copiar.');
  const existentes = new Set(estado.orcamentos.filter((o) => o.mes === mes).map((o) => o.categoriaId));
  const novos = origem.filter((o) => !existentes.has(o.categoriaId)).map((o) => ({ ...o, mes }));
  return ok({ ...estado, orcamentos: [...estado.orcamentos, ...novos] });
}
