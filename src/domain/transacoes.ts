import { efeitoTransacao } from './contas';
import { dataValida } from './date';
import { novoId, proximoTempo } from './id';
import { normalizarTag, validarTags } from './tags';
import {
  falha,
  ok,
  type AppState,
  type Categoria,
  type Centavos,
  type DataISO,
  type Resultado,
  type TipoMovimento,
  type Transacao,
} from './types';

export const DESCRICAO_MAX = 100;
export const CATEGORIA_NOME_MAX = 30;

export interface DadosTransacao {
  contaId: string;
  categoriaId: string;
  tipo: TipoMovimento;
  valor: Centavos;
  data: DataISO;
  descricao: string;
  tags?: string[];
}

/** Guarda `tags` só quando há alguma, para que a ausência signifique "sem tags". */
export function comTags<T extends { tags?: string[] }>(t: T): T {
  if (t.tags && t.tags.length > 0) return t;
  const { tags: _tags, ...resto } = t;
  void _tags;
  return resto as T;
}

export function validarTransacao(estado: AppState, dados: DadosTransacao, existente?: Transacao): Resultado<DadosTransacao> {
  const conta = estado.contas.find((c) => c.id === dados.contaId);
  if (!conta) return falha('Selecione uma conta.', 'contaId');
  if (conta.arquivada && existente?.contaId !== conta.id) return falha('Esta conta está arquivada.', 'contaId');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  const categoria = estado.categorias.find((c) => c.id === dados.categoriaId);
  if (!categoria) return falha('Selecione uma categoria.', 'categoriaId');
  if (categoria.tipo !== dados.tipo) return falha(`A categoria deve ser de ${dados.tipo}.`, 'categoriaId');
  if (categoria.arquivada && existente?.categoriaId !== categoria.id) return falha('Esta categoria está arquivada.', 'categoriaId');
  const descricao = dados.descricao.trim();
  if (descricao.length > DESCRICAO_MAX) return falha(`A descrição deve ter no máximo ${DESCRICAO_MAX} caracteres.`, 'descricao');
  const tags = validarTags(dados.tags);
  if (!tags.ok) return tags;
  return ok({ ...dados, descricao, tags: tags.valor });
}

export function criarTransacao(estado: AppState, dados: DadosTransacao): Resultado<AppState> {
  const v = validarTransacao(estado, dados);
  if (!v.ok) return v;
  const transacao: Transacao = comTags({ ...v.valor, id: novoId(), criadaEm: proximoTempo() });
  return ok({ ...estado, transacoes: [...estado.transacoes, transacao] });
}

export function editarTransacao(estado: AppState, id: string, dados: DadosTransacao): Resultado<AppState> {
  const atual = estado.transacoes.find((t) => t.id === id);
  if (!atual) return falha('Transação não encontrada.');
  const v = validarTransacao(estado, dados, atual);
  if (!v.ok) return v;
  return ok({ ...estado, transacoes: estado.transacoes.map((t) => (t.id === id ? comTags({ ...t, ...v.valor }) : t)) });
}

export function excluirTransacao(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.transacoes.some((t) => t.id === id)) return falha('Transação não encontrada.');
  return ok({ ...estado, transacoes: estado.transacoes.filter((t) => t.id !== id) });
}

export interface FiltrosTransacoes {
  de?: DataISO;
  ate?: DataISO;
  contaId?: string;
  categoriaId?: string;
  tipo?: TipoMovimento;
  texto?: string;
  tag?: string;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Aplica todos os filtros presentes (E lógico). */
export function filtrarTransacoes(transacoes: Transacao[], f: FiltrosTransacoes): Transacao[] {
  const texto = f.texto ? normalizarTexto(f.texto) : '';
  const tag = f.tag ? normalizarTag(f.tag) : '';
  return transacoes.filter(
    (t) =>
      (!f.de || t.data >= f.de) &&
      (!f.ate || t.data <= f.ate) &&
      (!f.contaId || t.contaId === f.contaId) &&
      (!f.categoriaId || t.categoriaId === f.categoriaId) &&
      (!f.tipo || t.tipo === f.tipo) &&
      (!texto || normalizarTexto(t.descricao).includes(texto)) &&
      (!tag || (t.tags ?? []).includes(tag)),
  );
}

/** Data decrescente; em empate, a criada mais recentemente primeiro. */
export function ordenarTransacoes(transacoes: Transacao[]): Transacao[] {
  return [...transacoes].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadaEm - a.criadaEm));
}

export interface TotaisTransacoes {
  receitas: Centavos;
  despesas: Centavos;
  resultado: Centavos;
}

export function totaisTransacoes(transacoes: Transacao[]): TotaisTransacoes {
  let receitas = 0;
  let despesas = 0;
  for (const t of transacoes) {
    if (t.tipo === 'receita') receitas += t.valor;
    else despesas += t.valor;
  }
  return { receitas, despesas, resultado: receitas - despesas };
}

export { efeitoTransacao };

// ---------------------------------------------------------------- categorias

export interface DadosCategoria {
  nome: string;
  tipo: TipoMovimento;
}

export function validarNomeCategoria(categorias: Categoria[], nome: string, tipo: TipoMovimento, ignorarId?: string): Resultado<string> {
  const limpo = nome.trim();
  if (!limpo) return falha('Informe o nome da categoria.', 'nome');
  if (limpo.length > CATEGORIA_NOME_MAX) return falha(`O nome deve ter no máximo ${CATEGORIA_NOME_MAX} caracteres.`, 'nome');
  const igual = (n: string) => n.trim().toLocaleLowerCase('pt-BR') === limpo.toLocaleLowerCase('pt-BR');
  if (categorias.some((c) => c.tipo === tipo && c.id !== ignorarId && igual(c.nome))) {
    return falha('Já existe uma categoria com esse nome neste tipo.', 'nome');
  }
  return ok(limpo);
}

export function criarCategoria(estado: AppState, dados: DadosCategoria): Resultado<AppState> {
  const nome = validarNomeCategoria(estado.categorias, dados.nome, dados.tipo);
  if (!nome.ok) return nome;
  const categoria: Categoria = { id: novoId(), nome: nome.valor, tipo: dados.tipo, arquivada: false };
  return ok({ ...estado, categorias: [...estado.categorias, categoria] });
}

export function renomearCategoria(estado: AppState, id: string, nomeNovo: string): Resultado<AppState> {
  const categoria = estado.categorias.find((c) => c.id === id);
  if (!categoria) return falha('Categoria não encontrada.');
  const nome = validarNomeCategoria(estado.categorias, nomeNovo, categoria.tipo, id);
  if (!nome.ok) return nome;
  return ok({ ...estado, categorias: estado.categorias.map((c) => (c.id === id ? { ...c, nome: nome.valor } : c)) });
}

export function arquivarCategoria(estado: AppState, id: string, arquivada = true): Resultado<AppState> {
  if (!estado.categorias.some((c) => c.id === id)) return falha('Categoria não encontrada.');
  return ok({ ...estado, categorias: estado.categorias.map((c) => (c.id === id ? { ...c, arquivada } : c)) });
}

export function categoriaEmUso(estado: AppState, id: string): boolean {
  return estado.transacoes.some((t) => t.categoriaId === id) || estado.recorrencias.some((r) => r.categoriaId === id);
}

/**
 * Exclui a categoria. Se estiver em uso, exige uma categoria de destino do mesmo tipo
 * e reatribui transações e recorrências, de modo que nenhuma fique sem categoria.
 * Os limites de orçamento da categoria excluída são removidos.
 */
export function excluirCategoria(estado: AppState, id: string, destinoId?: string): Resultado<AppState> {
  const categoria = estado.categorias.find((c) => c.id === id);
  if (!categoria) return falha('Categoria não encontrada.');
  let transacoes = estado.transacoes;
  let recorrencias = estado.recorrencias;
  if (categoriaEmUso(estado, id)) {
    if (!destinoId) return falha('Esta categoria está em uso. Escolha uma categoria de destino ou arquive-a.', 'destino');
    const destino = estado.categorias.find((c) => c.id === destinoId);
    if (!destino || destino.id === id || destino.tipo !== categoria.tipo || destino.arquivada) {
      return falha('Escolha uma categoria de destino ativa do mesmo tipo.', 'destino');
    }
    transacoes = transacoes.map((t) => (t.categoriaId === id ? { ...t, categoriaId: destinoId } : t));
    recorrencias = recorrencias.map((r) => (r.categoriaId === id ? { ...r, categoriaId: destinoId } : r));
  }
  return ok({
    ...estado,
    categorias: estado.categorias.filter((c) => c.id !== id),
    orcamentos: estado.orcamentos.filter((o) => o.categoriaId !== id),
    transacoes,
    recorrencias,
  });
}
