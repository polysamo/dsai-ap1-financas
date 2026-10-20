import type { RegraCategoria } from '../domain/types';

/** Regras de fábrica; a ordem é a prioridade (a primeira que casa vence). */
export const REGRAS_PADRAO: RegraCategoria[] = [
  // Alimentação
  { id: 'regra-padrao-ifood', padrao: 'ifood', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-ifd', padrao: 'ifd*', modo: 'comeca', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-restaurante', padrao: 'restaurante', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-mercado', padrao: 'mercado', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  { id: 'regra-padrao-padaria', padrao: 'padaria', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
  // Transporte
  { id: 'regra-padrao-uber', padrao: 'uber', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-transporte', tags: [], ativa: true },
  { id: 'regra-padrao-99', padrao: '99*', modo: 'comeca', tipo: 'despesa', categoriaId: 'cat-transporte', tags: [], ativa: true },
  { id: 'regra-padrao-posto', padrao: 'posto', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-transporte', tags: [], ativa: true },
  { id: 'regra-padrao-estacionamento', padrao: 'estacionamento', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-transporte', tags: [], ativa: true },
];
