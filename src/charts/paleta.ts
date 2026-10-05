export const TOTAL_CORES = 8;

/** Variável CSS da cor `n` (1 a 8); passa de 8, a paleta recomeça. */
export function corDaSerie(n: number): string {
  const indice = ((((n - 1) % TOTAL_CORES) + TOTAL_CORES) % TOTAL_CORES) + 1;
  return `var(--grafico-${indice})`;
}

/** Cor de uma série pela posição, respeitando `cor` quando informada. */
export const corDe = (cor: number | undefined, posicao: number): string => corDaSerie(cor ?? posicao + 1);
