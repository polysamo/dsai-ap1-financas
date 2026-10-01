import type { Categoria } from '../domain/types';

export const ID_OUTROS_DESPESA = 'cat-outros-despesa';
export const ID_OUTROS_RECEITA = 'cat-outros-receita';

/** Conjunto inicial de categorias; o usuário pode renomear, arquivar e criar novas. */
export function categoriasPadrao(): Categoria[] {
  const despesas: Array<[string, string]> = [
    ['cat-moradia', 'Moradia'],
    ['cat-alimentacao', 'Alimentação'],
    ['cat-transporte', 'Transporte'],
    ['cat-saude', 'Saúde'],
    ['cat-lazer', 'Lazer'],
    ['cat-educacao', 'Educação'],
    [ID_OUTROS_DESPESA, 'Outros'],
  ];
  const receitas: Array<[string, string]> = [
    ['cat-salario', 'Salário'],
    ['cat-rendimentos', 'Rendimentos'],
    [ID_OUTROS_RECEITA, 'Outros'],
  ];
  return [
    ...despesas.map(([id, nome]): Categoria => ({ id, nome, tipo: 'despesa', arquivada: false })),
    ...receitas.map(([id, nome]): Categoria => ({ id, nome, tipo: 'receita', arquivada: false })),
  ];
}
