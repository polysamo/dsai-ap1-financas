import { falha, ok, type Resultado, type Transacao } from './types';

export const TAGS_MAX = 5;
export const TAG_TAMANHO_MAX = 20;

export function normalizarTag(tag: string): string {
  return tag.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** Separa por vírgula, normaliza e descarta vazias (a validação de limites fica em `validarTags`). */
export function parseTags(texto: string): string[] {
  return texto.split(',').map(normalizarTag).filter(Boolean);
}

export const formatarTags = (tags: string[] | undefined): string => (tags ?? []).join(', ');

/** Normaliza, remove repetições e confere o máximo de tags e o tamanho de cada uma. */
export function validarTags(tags: string[] | undefined): Resultado<string[]> {
  const unicas = [...new Set((tags ?? []).map(normalizarTag).filter(Boolean))];
  if (unicas.length > TAGS_MAX) return falha(`Use no máximo ${TAGS_MAX} tags.`, 'tags');
  const longa = unicas.find((t) => t.length > TAG_TAMANHO_MAX);
  if (longa) return falha(`Cada tag deve ter no máximo ${TAG_TAMANHO_MAX} caracteres ("${longa}" tem ${longa.length}).`, 'tags');
  return ok(unicas);
}

/** Une tags preservando as atuais e cortando no máximo permitido. */
export function somarTags(atuais: string[] | undefined, novas: string[]): string[] {
  return [...new Set([...(atuais ?? []), ...novas])].slice(0, TAGS_MAX);
}

/** Tags em uso nas transações, em ordem alfabética. */
export function listarTags(transacoes: Transacao[]): string[] {
  return [...new Set(transacoes.flatMap((t) => t.tags ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
