import { ID_OUTROS_DESPESA, ID_OUTROS_RECEITA } from '../data/categoriasPadrao';
import { novoId } from './id';
import { somarTags, validarTags } from './tags';
import { normalizarTexto } from './transacoes';
import {
  falha,
  ok,
  type AppState,
  type Categoria,
  type ModoPadrao,
  type RegraCategoria,
  type Resultado,
  type TipoMovimento,
  type Transacao,
} from './types';

export const PADRAO_MAX = 60;
export const MODOS_PADRAO: { valor: ModoPadrao; rotulo: string }[] = [
  { valor: 'contem', rotulo: 'Contém' },
  { valor: 'comeca', rotulo: 'Começa com' },
  { valor: 'igual', rotulo: 'É igual a' },
];

/** `outros`: só transações que ainda estão em "Outros"; `todas`: qualquer categoria. */
export type EscopoAplicacao = 'outros' | 'todas';

export interface DadosRegra {
  padrao: string;
  modo: ModoPadrao;
  tipo: TipoMovimento;
  categoriaId: string;
  tags: string[];
}

export function casaPadrao(regra: Pick<RegraCategoria, 'padrao' | 'modo'>, descricao: string): boolean {
  const padrao = normalizarTexto(regra.padrao);
  const texto = normalizarTexto(descricao);
  if (!padrao) return false;
  if (regra.modo === 'igual') return texto === padrao;
  return regra.modo === 'comeca' ? texto.startsWith(padrao) : texto.includes(padrao);
}

/** A categoria da regra precisa existir, estar ativa e ser do mesmo tipo; senão a regra é ignorada. */
export function categoriaUtilizavel(estado: AppState, regra: RegraCategoria): boolean {
  const c = estado.categorias.find((x) => x.id === regra.categoriaId);
  return Boolean(c && !c.arquivada && c.tipo === regra.tipo);
}

/** Primeira regra ativa (na ordem de prioridade) que casa com a descrição e o tipo. */
export function primeiraRegra(estado: AppState, descricao: string, tipo: TipoMovimento): RegraCategoria | undefined {
  return estado.regras.find((r) => r.ativa && r.tipo === tipo && casaPadrao(r, descricao) && categoriaUtilizavel(estado, r));
}

export function validarRegra(estado: AppState, dados: DadosRegra): Resultado<DadosRegra> {
  const padrao = dados.padrao.trim();
  if (!normalizarTexto(padrao)) return falha('Informe o texto a procurar na descrição.', 'padrao');
  if (padrao.length > PADRAO_MAX) return falha(`O texto deve ter no máximo ${PADRAO_MAX} caracteres.`, 'padrao');
  const categoria = estado.categorias.find((c) => c.id === dados.categoriaId);
  if (!categoria) return falha('Selecione uma categoria.', 'categoriaId');
  if (categoria.tipo !== dados.tipo) return falha(`A categoria deve ser de ${dados.tipo}.`, 'categoriaId');
  if (categoria.arquivada) return falha('Esta categoria está arquivada.', 'categoriaId');
  const tags = validarTags(dados.tags);
  if (!tags.ok) return tags;
  return ok({ ...dados, padrao, tags: tags.valor });
}

export function criarRegra(estado: AppState, dados: DadosRegra): Resultado<AppState> {
  const v = validarRegra(estado, dados);
  if (!v.ok) return v;
  return ok({ ...estado, regras: [...estado.regras, { ...v.valor, id: novoId(), ativa: true }] });
}

export function editarRegra(estado: AppState, id: string, dados: DadosRegra): Resultado<AppState> {
  if (!estado.regras.some((r) => r.id === id)) return falha('Regra não encontrada.');
  const v = validarRegra(estado, dados);
  if (!v.ok) return v;
  return ok({ ...estado, regras: estado.regras.map((r) => (r.id === id ? { ...r, ...v.valor } : r)) });
}

export function alternarRegra(estado: AppState, id: string, ativa: boolean): Resultado<AppState> {
  if (!estado.regras.some((r) => r.id === id)) return falha('Regra não encontrada.');
  return ok({ ...estado, regras: estado.regras.map((r) => (r.id === id ? { ...r, ativa } : r)) });
}

export function excluirRegra(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.regras.some((r) => r.id === id)) return falha('Regra não encontrada.');
  return ok({ ...estado, regras: estado.regras.filter((r) => r.id !== id) });
}

/** Move a regra uma posição para cima (-1) ou para baixo (+1); nos extremos nada muda. */
export function moverRegra(estado: AppState, id: string, direcao: -1 | 1): Resultado<AppState> {
  const i = estado.regras.findIndex((r) => r.id === id);
  if (i < 0) return falha('Regra não encontrada.');
  const j = i + direcao;
  if (j < 0 || j >= estado.regras.length) return ok(estado);
  const regras = [...estado.regras];
  [regras[i], regras[j]] = [regras[j], regras[i]];
  return ok({ ...estado, regras });
}

export function ehOutros(categoria: Categoria | undefined): boolean {
  return Boolean(categoria && (categoria.id === ID_OUTROS_DESPESA || categoria.id === ID_OUTROS_RECEITA || normalizarTexto(categoria.nome) === 'outros'));
}

/** Transações existentes que a regra atingiria no escopo escolhido (regra inativa ou inutilizável não atinge nenhuma). */
export function transacoesAtingidas(estado: AppState, regra: RegraCategoria, escopo: EscopoAplicacao): Transacao[] {
  if (!regra.ativa || !categoriaUtilizavel(estado, regra)) return [];
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  return estado.transacoes.filter(
    (t) => t.tipo === regra.tipo && casaPadrao(regra, t.descricao) && (escopo === 'todas' || ehOutros(categorias.get(t.categoriaId))),
  );
}

/** Troca a categoria das transações atingidas e soma as tags da regra às existentes. */
export function aplicarRegra(estado: AppState, id: string, escopo: EscopoAplicacao): Resultado<{ estado: AppState; alteradas: number }> {
  const regra = estado.regras.find((r) => r.id === id);
  if (!regra) return falha('Regra não encontrada.');
  if (!regra.ativa) return falha('Ative a regra antes de aplicá-la.');
  const ids = new Set(transacoesAtingidas(estado, regra, escopo).map((t) => t.id));
  const transacoes = estado.transacoes.map((t): Transacao => {
    if (!ids.has(t.id)) return t;
    const tags = somarTags(t.tags, regra.tags);
    return { ...t, categoriaId: regra.categoriaId, ...(tags.length > 0 ? { tags } : {}) };
  });
  return ok({ estado: { ...estado, transacoes }, alteradas: ids.size });
}
