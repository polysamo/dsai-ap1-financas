/** Junta nomes de classe ignorando valores falsos. */
export const cx = (...partes: (string | false | null | undefined)[]): string => partes.filter(Boolean).join(' ');
