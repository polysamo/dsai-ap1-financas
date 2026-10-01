import { saldoTotal } from './contas';
import { mesDe, somarMeses } from './date';
import { novoId } from './id';
import {
  falha,
  ok,
  type AppState,
  type Categoria,
  type Centavos,
  type Mes,
  type Recorrencia,
  type Resultado,
  type TipoMovimento,
  type Transacao,
} from './types';

export const MESES_BASE = 3;
export const MESES_PROJETADOS = 6;
export const RECORRENCIA_DESCRICAO_MAX = 40;

// ---------------------------------------------------------------- recorrências

export interface DadosRecorrencia {
  descricao: string;
  tipo: TipoMovimento;
  valor: Centavos;
  categoriaId: string;
}

function validarRecorrencia(categorias: Categoria[], dados: DadosRecorrencia, existente?: Recorrencia): Resultado<DadosRecorrencia> {
  const descricao = dados.descricao.trim();
  if (!descricao) return falha('Informe a descrição.', 'descricao');
  if (descricao.length > RECORRENCIA_DESCRICAO_MAX) return falha(`A descrição deve ter no máximo ${RECORRENCIA_DESCRICAO_MAX} caracteres.`, 'descricao');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  const categoria = categorias.find((c) => c.id === dados.categoriaId);
  if (!categoria) return falha('Selecione uma categoria.', 'categoriaId');
  if (categoria.tipo !== dados.tipo) return falha(`A categoria deve ser de ${dados.tipo}.`, 'categoriaId');
  if (categoria.arquivada && existente?.categoriaId !== categoria.id) return falha('Esta categoria está arquivada.', 'categoriaId');
  return ok({ ...dados, descricao });
}

export function criarRecorrencia(estado: AppState, dados: DadosRecorrencia): Resultado<AppState> {
  const v = validarRecorrencia(estado.categorias, dados);
  if (!v.ok) return v;
  return ok({ ...estado, recorrencias: [...estado.recorrencias, { id: novoId(), ...v.valor, ativa: true }] });
}

export function editarRecorrencia(estado: AppState, id: string, dados: DadosRecorrencia): Resultado<AppState> {
  const atual = estado.recorrencias.find((r) => r.id === id);
  if (!atual) return falha('Recorrência não encontrada.');
  const v = validarRecorrencia(estado.categorias, dados, atual);
  if (!v.ok) return v;
  return ok({ ...estado, recorrencias: estado.recorrencias.map((r) => (r.id === id ? { ...r, ...v.valor } : r)) });
}

export function alternarRecorrencia(estado: AppState, id: string, ativa: boolean): Resultado<AppState> {
  if (!estado.recorrencias.some((r) => r.id === id)) return falha('Recorrência não encontrada.');
  return ok({ ...estado, recorrencias: estado.recorrencias.map((r) => (r.id === id ? { ...r, ativa } : r)) });
}

export function excluirRecorrencia(estado: AppState, id: string): Resultado<AppState> {
  return ok({ ...estado, recorrencias: estado.recorrencias.filter((r) => r.id !== id) });
}

// ------------------------------------------------------------------- projeção

/** Até 3 meses completos antes do mês corrente, a partir do mês da primeira transação. */
export function mesesBase(transacoes: Transacao[], hoje: string): Mes[] {
  if (transacoes.length === 0) return [];
  const atual = mesDe(hoje);
  const primeiro = transacoes.reduce((min, t) => (t.data < min ? t.data : min), transacoes[0].data);
  const candidatos = Array.from({ length: MESES_BASE }, (_, i) => somarMeses(atual, -(MESES_BASE - i)));
  return candidatos.filter((m) => m >= mesDe(primeiro));
}

export interface PontoProjecao {
  mes: Mes;
  saldo: Centavos;
}

export type Projecao =
  | { tipo: 'sem-dados' }
  | {
      tipo: 'ok';
      mesesBase: Mes[];
      mediaReceitas: Centavos;
      mediaDespesas: Centavos;
      receitasRecorrentes: Centavos;
      despesasRecorrentes: Centavos;
      categoriasCobertas: string[];
      efeitoMensal: Centavos;
      saldoAtual: Centavos;
      meses: PontoProjecao[];
      primeiroNegativo: Mes | null;
    };

/** Projeção simples e reproduzível à mão; veja SPEC/2026-10-01-dashboard-e-projecao-v2.md. */
export function calcularProjecao(estado: AppState, hoje: string, quantidade = MESES_PROJETADOS): Projecao {
  const base = mesesBase(estado.transacoes, hoje);
  const ativas = estado.recorrencias.filter((r) => r.ativa);
  if (base.length === 0 && ativas.length === 0) return { tipo: 'sem-dados' };

  const cobertas = new Set(ativas.map((r) => `${r.tipo}|${r.categoriaId}`));
  const noBase = new Set(base);
  let receitas = 0;
  let despesas = 0;
  for (const t of estado.transacoes) {
    if (!noBase.has(mesDe(t.data)) || cobertas.has(`${t.tipo}|${t.categoriaId}`)) continue;
    if (t.tipo === 'receita') receitas += t.valor;
    else despesas += t.valor;
  }
  const n = base.length;
  const mediaReceitas = n === 0 ? 0 : Math.round(receitas / n);
  const mediaDespesas = n === 0 ? 0 : Math.round(despesas / n);
  const receitasRecorrentes = ativas.filter((r) => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
  const despesasRecorrentes = ativas.filter((r) => r.tipo === 'despesa').reduce((s, r) => s + r.valor, 0);
  const efeitoMensal = mediaReceitas - mediaDespesas + receitasRecorrentes - despesasRecorrentes;
  const saldoAtual = saldoTotal(estado).total;
  const atual = mesDe(hoje);
  const meses = Array.from({ length: quantidade }, (_, i): PontoProjecao => ({ mes: somarMeses(atual, i + 1), saldo: saldoAtual + (i + 1) * efeitoMensal }));

  return {
    tipo: 'ok',
    mesesBase: base,
    mediaReceitas,
    mediaDespesas,
    receitasRecorrentes,
    despesasRecorrentes,
    categoriasCobertas: [...new Set(ativas.map((r) => r.categoriaId))],
    efeitoMensal,
    saldoAtual,
    meses,
    primeiroNegativo: meses.find((p) => p.saldo < 0)?.mes ?? null,
  };
}

// ------------------------------------------------------------------ dashboard

export interface ResumoMes {
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
}

export function resumoMes(transacoes: Transacao[], mes: Mes): ResumoMes {
  let receitas = 0;
  let despesas = 0;
  for (const t of transacoes) {
    if (mesDe(t.data) !== mes) continue;
    if (t.tipo === 'receita') receitas += t.valor;
    else despesas += t.valor;
  }
  return { receitas, despesas, resultado: receitas - despesas };
}

export interface FatiaCategoria {
  nome: string;
  valor: Centavos;
}

/** Maiores categorias de despesa do mês; o restante é agrupado em "Outras". */
export function despesasPorCategoria(estado: AppState, mes: Mes, maximo = 5): FatiaCategoria[] {
  const nomes = new Map(estado.categorias.map((c) => [c.id, c.nome]));
  const totais = new Map<string, Centavos>();
  for (const t of estado.transacoes) {
    if (t.tipo !== 'despesa' || mesDe(t.data) !== mes) continue;
    totais.set(t.categoriaId, (totais.get(t.categoriaId) ?? 0) + t.valor);
  }
  const ordenadas = [...totais.entries()]
    .map(([id, valor]): FatiaCategoria => ({ nome: nomes.get(id) ?? 'Sem categoria', valor }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (ordenadas.length <= maximo) return ordenadas;
  const resto = ordenadas.slice(maximo).reduce((s, f) => s + f.valor, 0);
  return [...ordenadas.slice(0, maximo), { nome: 'Outras', valor: resto }];
}

export interface PontoMensal {
  mes: Mes;
  receitas: Centavos;
  despesas: Centavos;
}

/** Receitas e despesas dos `quantidade` meses terminando em `mesFinal`. */
export function serieMensal(transacoes: Transacao[], mesFinal: Mes, quantidade = 6): PontoMensal[] {
  const meses = Array.from({ length: quantidade }, (_, i) => somarMeses(mesFinal, i - (quantidade - 1)));
  const pontos = new Map(meses.map((mes): [Mes, PontoMensal] => [mes, { mes, receitas: 0, despesas: 0 }]));
  for (const t of transacoes) {
    const p = pontos.get(mesDe(t.data));
    if (!p) continue;
    if (t.tipo === 'receita') p.receitas += t.valor;
    else p.despesas += t.valor;
  }
  return meses.map((m) => pontos.get(m)!);
}
