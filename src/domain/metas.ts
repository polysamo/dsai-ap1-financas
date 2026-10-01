import { dataValida, diferencaMeses, mesDe, somarMeses } from './date';
import { novoId, proximoTempo } from './id';
import { falha, ok, type Aporte, type AppState, type Centavos, type DataISO, type Meta, type Resultado } from './types';

export const META_NOME_MAX = 40;

export interface DadosMeta {
  nome: string;
  valorAlvo: Centavos;
  prazo?: DataISO;
}

export interface DadosAporte {
  data: DataISO;
  /** Positivo para aporte, negativo para retirada. */
  valor: Centavos;
}

export function acumulado(meta: Pick<Meta, 'aportes'>): Centavos {
  return meta.aportes.reduce((soma, a) => soma + a.valor, 0);
}

/**
 * Reavalia o status a partir dos aportes: concluída quando o acumulado atinge o alvo
 * (com a data do aporte que cruzou o alvo pela última vez) e ativa se voltar abaixo.
 * Metas arquivadas mantêm o status.
 */
export function recalcularStatus(meta: Meta): Meta {
  if (meta.status === 'arquivada') return meta;
  const ordenados = [...meta.aportes].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  let soma = 0;
  let cruzouEm: DataISO | undefined;
  for (const aporte of ordenados) {
    const antes = soma;
    soma += aporte.valor;
    if (antes < meta.valorAlvo && soma >= meta.valorAlvo) cruzouEm = aporte.data;
  }
  if (soma >= meta.valorAlvo) return { ...meta, status: 'concluida', concluidaEm: cruzouEm };
  const { concluidaEm: _removido, ...resto } = meta;
  void _removido;
  return { ...resto, status: 'ativa' };
}

export function validarDadosMeta(dados: DadosMeta, hoje: DataISO, existente?: Meta): Resultado<DadosMeta> {
  const nome = dados.nome.trim();
  if (!nome) return falha('Informe o nome da meta.', 'nome');
  if (nome.length > META_NOME_MAX) return falha(`O nome deve ter no máximo ${META_NOME_MAX} caracteres.`, 'nome');
  if (!Number.isInteger(dados.valorAlvo) || dados.valorAlvo <= 0) return falha('O valor alvo deve ser maior que zero.', 'valorAlvo');
  if (dados.prazo !== undefined && dados.prazo !== '') {
    if (!dataValida(dados.prazo)) return falha('Informe um prazo válido.', 'prazo');
    if (dados.prazo !== existente?.prazo && dados.prazo < hoje) return falha('O prazo não pode ser anterior a hoje.', 'prazo');
  }
  return ok({ nome, valorAlvo: dados.valorAlvo, prazo: dados.prazo || undefined });
}

export function criarMeta(estado: AppState, dados: DadosMeta, hoje: DataISO): Resultado<AppState> {
  const v = validarDadosMeta(dados, hoje);
  if (!v.ok) return v;
  const meta: Meta = { id: novoId(), ...v.valor, aportes: [], status: 'ativa', criadaEm: proximoTempo() };
  return ok({ ...estado, metas: [...estado.metas, meta] });
}

function atualizarMeta(estado: AppState, id: string, fn: (meta: Meta) => Resultado<Meta>): Resultado<AppState> {
  const meta = estado.metas.find((m) => m.id === id);
  if (!meta) return falha('Meta não encontrada.');
  const r = fn(meta);
  if (!r.ok) return r;
  return ok({ ...estado, metas: estado.metas.map((m) => (m.id === id ? r.valor : m)) });
}

export function editarMeta(estado: AppState, id: string, dados: DadosMeta, hoje: DataISO): Resultado<AppState> {
  return atualizarMeta(estado, id, (meta) => {
    const v = validarDadosMeta(dados, hoje, meta);
    if (!v.ok) return v;
    const { prazo: _prazo, ...semPrazo } = meta;
    void _prazo;
    return ok(recalcularStatus({ ...semPrazo, ...v.valor }));
  });
}

function validarAporte(dados: DadosAporte): Resultado<DadosAporte> {
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  if (!Number.isInteger(dados.valor) || dados.valor === 0) return falha('O valor deve ser maior que zero.', 'valor');
  return ok(dados);
}

function comAportes(meta: Meta, aportes: Aporte[]): Resultado<Meta> {
  const novo = { ...meta, aportes };
  if (acumulado(novo) < 0) return falha('A retirada deixaria o valor acumulado negativo.', 'valor');
  return ok(recalcularStatus(novo));
}

export function registrarAporte(estado: AppState, metaId: string, dados: DadosAporte): Resultado<AppState> {
  const v = validarAporte(dados);
  if (!v.ok) return v;
  return atualizarMeta(estado, metaId, (meta) => comAportes(meta, [...meta.aportes, { id: novoId(), ...v.valor }]));
}

export function editarAporte(estado: AppState, metaId: string, aporteId: string, dados: DadosAporte): Resultado<AppState> {
  const v = validarAporte(dados);
  if (!v.ok) return v;
  return atualizarMeta(estado, metaId, (meta) => {
    if (!meta.aportes.some((a) => a.id === aporteId)) return falha('Aporte não encontrado.');
    return comAportes(meta, meta.aportes.map((a) => (a.id === aporteId ? { ...a, ...v.valor } : a)));
  });
}

export function excluirAporte(estado: AppState, metaId: string, aporteId: string): Resultado<AppState> {
  return atualizarMeta(estado, metaId, (meta) => comAportes(meta, meta.aportes.filter((a) => a.id !== aporteId)));
}

export function arquivarMeta(estado: AppState, id: string): Resultado<AppState> {
  return atualizarMeta(estado, id, (meta) => ok({ ...meta, status: 'arquivada' }));
}

export function reativarMeta(estado: AppState, id: string): Resultado<AppState> {
  return atualizarMeta(estado, id, (meta) => ok(recalcularStatus({ ...meta, status: 'ativa' })));
}

export type AporteNecessario =
  | { tipo: 'sem-prazo' }
  | { tipo: 'concluida' }
  | { tipo: 'normal'; valor: Centavos; meses: number }
  | { tipo: 'ultimo-mes'; valor: Centavos; meses: 1 }
  | { tipo: 'vencido'; valor: Centavos; meses: 0 };

/** (alvo - acumulado) dividido pelos meses restantes, contando o mês corrente, arredondado para cima. */
export function aporteMensalNecessario(meta: Meta, hoje: DataISO): AporteNecessario {
  const restante = meta.valorAlvo - acumulado(meta);
  if (restante <= 0) return { tipo: 'concluida' };
  if (!meta.prazo) return { tipo: 'sem-prazo' };
  const meses = diferencaMeses(mesDe(hoje), mesDe(meta.prazo)) + 1;
  if (meses < 1) return { tipo: 'vencido', valor: restante, meses: 0 };
  if (meses === 1) return { tipo: 'ultimo-mes', valor: restante, meses: 1 };
  return { tipo: 'normal', valor: Math.ceil(restante / meses), meses };
}

/** Média mensal líquida dos aportes nos 3 últimos meses completos; null sem nenhum registro no período. */
export function ritmoReal(meta: Meta, hoje: DataISO): Centavos | null {
  const atual = mesDe(hoje);
  const janela = new Set([1, 2, 3].map((n) => somarMeses(atual, -n)));
  const dentro = meta.aportes.filter((a) => janela.has(mesDe(a.data)));
  if (dentro.length === 0) return null;
  return Math.round(dentro.reduce((s, a) => s + a.valor, 0) / 3);
}

export type SituacaoRitmo = 'no-ritmo' | 'abaixo-do-ritmo' | 'sem-dados';

/** Só se aplica a metas ativas com prazo e valor ainda a juntar. */
export function situacaoRitmo(meta: Meta, hoje: DataISO): SituacaoRitmo | null {
  const necessario = aporteMensalNecessario(meta, hoje);
  if (necessario.tipo === 'sem-prazo' || necessario.tipo === 'concluida') return null;
  const ritmo = ritmoReal(meta, hoje);
  if (ritmo === null) return 'sem-dados';
  return ritmo >= necessario.valor ? 'no-ritmo' : 'abaixo-do-ritmo';
}

/** Ativas por prazo mais próximo (sem prazo por último), depois as concluídas. */
export function ordenarMetas(metas: Meta[]): Meta[] {
  const grupo = (m: Meta) => (m.status === 'ativa' ? 0 : m.status === 'concluida' ? 1 : 2);
  return [...metas].sort((a, b) => {
    if (grupo(a) !== grupo(b)) return grupo(a) - grupo(b);
    const pa = a.prazo ?? '9999-99-99';
    const pb = b.prazo ?? '9999-99-99';
    return pa < pb ? -1 : pa > pb ? 1 : a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
