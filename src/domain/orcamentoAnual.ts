import { mesDe, nomeMesCurto } from './date';
import { numeroCsv, percentualCsv } from './exportacao';
import { definirLimite, estadoDoConsumo, type EstadoOrcamento } from './orcamento';
import { falha, ok, type AppState, type Categoria, type Centavos, type Mes, type Resultado, type Transacao } from './types';

/** Ids das categorias de despesa com rollover ligado; só a preferência é guardada. */
export type RolloverCategorias = string[];

export const ROTULO_ESTADO_ANUAL: Record<EstadoOrcamento, string> = {
  normal: 'Dentro do limite',
  atencao: 'Atenção: perto do limite',
  estourado: 'Estourado',
};

export interface CelulaAnual {
  mes: Mes;
  /** Limite definido pelo usuário no mês, sem rollover. */
  limiteBase: Centavos | null;
  /** Sobra (positiva) ou estouro (negativo) vindo do mês anterior; zero sem rollover. */
  carry: Centavos;
  /** Limite base mais carry; null quando o mês não tem limite. */
  limite: Centavos | null;
  gasto: Centavos;
  restante: Centavos | null;
  estado: EstadoOrcamento | null;
}

export interface LinhaAnual {
  categoria: Categoria;
  rollover: boolean;
  celulas: CelulaAnual[];
  /** Soma dos limites definidos (sem carries); null se nenhum mês tem limite. */
  orcado: Centavos | null;
  realizado: Centavos;
  percentual: number | null;
  estado: EstadoOrcamento | null;
}

export interface TotalMes {
  mes: Mes;
  limite: Centavos;
  gasto: Centavos;
}

export interface ResumoAnual {
  orcado: Centavos;
  realizadoComLimite: Centavos;
  gastoSemOrcamento: Centavos;
  percentual: number | null;
  estado: EstadoOrcamento | null;
}

export interface VisaoAnual {
  ano: number;
  meses: Mes[];
  linhas: LinhaAnual[];
  totaisMes: TotalMes[];
  resumo: ResumoAnual;
}

export function anoValido(texto: string): boolean {
  return /^\d{4}$/.test(texto) && Number(texto) >= 2000;
}

export function mesesDoAno(ano: number): Mes[] {
  return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
}

/** Percentual inteiro consumido; null quando o orçado não é positivo. */
export function percentualAnual(gasto: Centavos, orcado: Centavos): number | null {
  return orcado <= 0 ? null : Math.round((gasto * 100) / orcado);
}

function gastosDoAno(transacoes: Transacao[], ano: number): Map<string, Map<Mes, Centavos>> {
  const porCategoria = new Map<string, Map<Mes, Centavos>>();
  for (const t of transacoes) {
    if (t.tipo !== 'despesa') continue;
    const mes = mesDe(t.data);
    if (!mes.startsWith(`${ano}-`)) continue;
    const porMes = porCategoria.get(t.categoriaId) ?? new Map<Mes, Centavos>();
    porMes.set(mes, (porMes.get(mes) ?? 0) + t.valor);
    porCategoria.set(t.categoriaId, porMes);
  }
  return porCategoria;
}

export function visaoAnual(estado: AppState, ano: number): VisaoAnual {
  const meses = mesesDoAno(ano);
  const gastos = gastosDoAno(estado.transacoes, ano);
  const rollovers = new Set(estado.rolloverCategorias ?? []);
  const limitesDoAno = new Map<string, Map<Mes, Centavos>>();
  for (const o of estado.orcamentos) {
    if (!o.mes.startsWith(`${ano}-`)) continue;
    const porMes = limitesDoAno.get(o.categoriaId) ?? new Map<Mes, Centavos>();
    porMes.set(o.mes, o.limite);
    limitesDoAno.set(o.categoriaId, porMes);
  }

  const linhas = estado.categorias
    .filter((c) => c.tipo === 'despesa' && (!c.arquivada || limitesDoAno.has(c.id) || gastos.has(c.id)))
    .map((categoria): LinhaAnual => {
      const rollover = rollovers.has(categoria.id);
      const limites = limitesDoAno.get(categoria.id);
      const gastosCat = gastos.get(categoria.id);
      let carry = 0;
      let orcado: Centavos | null = null;
      let realizado = 0;
      const celulas = meses.map((mes): CelulaAnual => {
        const limiteBase = limites?.get(mes) ?? null;
        const gasto = gastosCat?.get(mes) ?? 0;
        realizado += gasto;
        const carryAtual = rollover && limiteBase !== null ? carry : 0;
        const limite = limiteBase === null ? null : limiteBase + carryAtual;
        if (limiteBase !== null) orcado = (orcado ?? 0) + limiteBase;
        // Mês sem limite interrompe a cadeia; sem rollover nada passa adiante.
        carry = rollover && limite !== null ? limite - gasto : 0;
        return {
          mes,
          limiteBase,
          carry: carryAtual,
          limite,
          gasto,
          restante: limite === null ? null : limite - gasto,
          estado: limite === null ? null : estadoDoConsumo(gasto, limite),
        };
      });
      return {
        categoria,
        rollover,
        celulas,
        orcado,
        realizado,
        percentual: orcado === null ? null : percentualAnual(realizado, orcado),
        estado: orcado === null ? null : estadoDoConsumo(realizado, orcado),
      };
    })
    .sort((a, b) => a.categoria.nome.localeCompare(b.categoria.nome, 'pt-BR'));

  const totaisMes = meses.map((mes, i): TotalMes => ({
    mes,
    limite: linhas.reduce((s, l) => s + (l.celulas[i].limite ?? 0), 0),
    gasto: linhas.reduce((s, l) => s + l.celulas[i].gasto, 0),
  }));

  let orcado = 0;
  let realizadoComLimite = 0;
  let gastoSemOrcamento = 0;
  for (const l of linhas) {
    if (l.orcado === null) gastoSemOrcamento += l.realizado;
    else {
      orcado += l.orcado;
      realizadoComLimite += l.realizado;
    }
  }
  const temOrcado = linhas.some((l) => l.orcado !== null);
  return {
    ano,
    meses,
    linhas,
    totaisMes,
    resumo: {
      orcado,
      realizadoComLimite,
      gastoSemOrcamento,
      percentual: percentualAnual(realizadoComLimite, orcado),
      estado: temOrcado ? estadoDoConsumo(realizadoComLimite, orcado) : null,
    },
  };
}

/** Define o mesmo limite em vários meses; nada é gravado se algum valor for recusado. */
export function definirLimiteEmMeses(estado: AppState, categoriaId: string, meses: Mes[], limite: Centavos): Resultado<AppState> {
  let atual = estado;
  for (const mes of meses) {
    const r = definirLimite(atual, categoriaId, mes, limite);
    if (!r.ok) return r;
    atual = r.valor;
  }
  return ok(atual);
}

/** Do mês informado até dezembro do mesmo ano. */
export function mesesAPartirDe(mes: Mes): Mes[] {
  return mesesDoAno(Number(mes.slice(0, 4))).filter((m) => m >= mes);
}

export function alternarRollover(estado: AppState, categoriaId: string): Resultado<AppState> {
  const categoria = estado.categorias.find((c) => c.id === categoriaId);
  if (!categoria || categoria.tipo !== 'despesa') return falha('Escolha uma categoria de despesa.');
  const atuais = estado.rolloverCategorias ?? [];
  const ligado = atuais.includes(categoriaId);
  return ok({
    ...estado,
    rolloverCategorias: ligado ? atuais.filter((id) => id !== categoriaId) : [...atuais, categoriaId],
  });
}

/** Linhas do CSV da visão anual: dois valores (limite e gasto) por mês, depois os totais do ano. */
export function csvOrcamentoAnual(v: VisaoAnual): string[][] {
  const rotulos = v.meses.map(nomeMesCurto);
  const cabecalho = [
    'Categoria',
    'Rollover',
    ...rotulos.flatMap((r) => [`Limite ${r}`, `Gasto ${r}`]),
    'Orçado anual',
    'Realizado anual',
    '% consumido',
    'Situação',
  ];
  const linhas = v.linhas.map((l) => [
    l.categoria.nome,
    l.rollover ? 'Sim' : 'Não',
    ...l.celulas.flatMap((c) => [c.limite === null ? '' : numeroCsv(c.limite), numeroCsv(c.gasto)]),
    l.orcado === null ? '' : numeroCsv(l.orcado),
    numeroCsv(l.realizado),
    percentualCsv(l.percentual),
    l.estado === null ? 'Sem limite' : ROTULO_ESTADO_ANUAL[l.estado],
  ]);
  const total = [
    'Total',
    '',
    ...v.totaisMes.flatMap((t) => [numeroCsv(t.limite), numeroCsv(t.gasto)]),
    numeroCsv(v.resumo.orcado),
    numeroCsv(v.resumo.realizadoComLimite + v.resumo.gastoSemOrcamento),
    percentualCsv(v.resumo.percentual),
    v.resumo.estado === null ? 'Sem limite' : ROTULO_ESTADO_ANUAL[v.resumo.estado],
  ];
  return [cabecalho, ...linhas, total];
}

export function nomeArquivoOrcamentoAnual(ano: number): string {
  return `orcamento-anual-${ano}.csv`;
}
