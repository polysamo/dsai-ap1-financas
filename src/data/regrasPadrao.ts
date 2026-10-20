import type { RegraCategoria } from '../domain/types';

/** Regras de fábrica; a ordem é a prioridade (a primeira que casa vence). */
export const REGRAS_PADRAO: RegraCategoria[] = [
  // Alimentação
  { id: 'regra-padrao-ifood', padrao: 'ifood', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-ifd', padrao: 'ifd*', modo: 'comeca', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-restaurante', padrao: 'restaurante', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-mercado', padrao: 'mercado', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-padaria', padrao: 'padaria', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
];
