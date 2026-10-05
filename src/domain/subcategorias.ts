import { falha, ok, type AppState, type Categoria, type Centavos, type Resultado, type TipoMovimento } from './types';

export const SEPARADOR_CATEGORIA = ' › ';

/** Pai efetivo: `paiId` que aponta para uma categoria existente; senão a categoria é de primeiro nível. */
export function paiEfetivo(categorias: Categoria[], categoria: Categoria): Categoria | undefined {
  if (!categoria.paiId) return undefined;
  return categorias.find((c) => c.id === categoria.paiId);
}

export function filhasDe(categorias: Categoria[], id: string): Categoria[] {
  return categorias.filter((c) => c.paiId === id);
}

/** Id da categoria de primeiro nível que contém `id` (a própria, se não for subcategoria). */
export function raizDe(categorias: Categoria[], id: string): string {
  const c = categorias.find((x) => x.id === id);
  return (c && paiEfetivo(categorias, c)?.id) ?? id;
}

/** "Pai › Filha" para subcategorias; o nome simples para as demais. */
export function nomeCompleto(categorias: Categoria[], id: string): string {
  const c = categorias.find((x) => x.id === id);
  if (!c) return 'Sem categoria';
  const pai = paiEfetivo(categorias, c);
  return pai ? `${pai.nome}${SEPARADOR_CATEGORIA}${c.nome}` : c.nome;
}

export interface NoCategoria {
  categoria: Categoria;
  nivel: 0 | 1;
}

const porNome = (a: Categoria, b: Categoria) => a.nome.localeCompare(b.nome, 'pt-BR');

/**
 * Categorias de um tipo em ordem de árvore: cada pai seguido das filhas, ambos em ordem alfabética.
 * `incluir` decide quem entra (ex.: só ativas); um pai excluído não esconde as filhas incluídas.
 */
export function arvoreCategorias(categorias: Categoria[], tipo: TipoMovimento, incluir: (c: Categoria) => boolean = () => true): NoCategoria[] {
  const doTipo = categorias.filter((c) => c.tipo === tipo);
  const raizes = doTipo.filter((c) => !paiEfetivo(categorias, c)).sort(porNome);
  const nos: NoCategoria[] = [];
  for (const raiz of raizes) {
    const filhas = filhasDe(doTipo, raiz.id).filter(incluir).sort(porNome);
    if (incluir(raiz)) nos.push({ categoria: raiz, nivel: 0 });
    for (const f of filhas) nos.push({ categoria: f, nivel: 1 });
  }
  return nos;
}

/** Confere se `paiId` pode ser pai da categoria `id` (ou de uma nova, quando `id` é undefined). */
export function validarPai(categorias: Categoria[], tipo: TipoMovimento, paiId: string, id?: string): Resultado<string> {
  if (paiId === id) return falha('Uma categoria não pode ser pai de si mesma.', 'paiId');
  const pai = categorias.find((c) => c.id === paiId);
  if (!pai) return falha('Categoria pai não encontrada.', 'paiId');
  if (pai.tipo !== tipo) return falha(`A categoria pai deve ser de ${tipo}.`, 'paiId');
  if (pai.arquivada) return falha('A categoria pai está arquivada.', 'paiId');
  if (paiEfetivo(categorias, pai)) return falha('Escolha uma categoria de primeiro nível como pai.', 'paiId');
  if (id && filhasDe(categorias, id).length > 0) return falha('Esta categoria tem subcategorias e não pode virar subcategoria.', 'paiId');
  return ok(paiId);
}

/** Move a categoria para dentro de `paiId`, ou para o primeiro nível com `null`. */
export function definirPai(estado: AppState, id: string, paiId: string | null): Resultado<AppState> {
  const categoria = estado.categorias.find((c) => c.id === id);
  if (!categoria) return falha('Categoria não encontrada.');
  if (paiId !== null) {
    const v = validarPai(estado.categorias, categoria.tipo, paiId, id);
    if (!v.ok) return v;
  }
  if ((categoria.paiId ?? null) === paiId) return ok(estado);
  const categorias = estado.categorias.map((c) => {
    if (c.id !== id) return c;
    const { paiId: _antigo, ...resto } = c;
    return paiId === null ? resto : { ...resto, paiId };
  });
  return ok({ ...estado, categorias });
}

/** Soma valores por categoria no pai (as filhas somem do mapa). */
export function somarNaRaiz(valores: Map<string, Centavos>, categorias: Categoria[]): Map<string, Centavos> {
  const somado = new Map<string, Centavos>();
  for (const [id, v] of valores) {
    const raiz = raizDe(categorias, id);
    somado.set(raiz, (somado.get(raiz) ?? 0) + v);
  }
  return somado;
}
