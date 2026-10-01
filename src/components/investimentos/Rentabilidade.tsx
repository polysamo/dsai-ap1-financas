import { formatarMoeda, formatarPercentual } from '../../domain/money';
import type { Desempenho } from '../../domain/investimentos';
import { Valor } from '../ui';

const comSinal = (n: number, texto: string) => (n > 0 ? `+${texto}` : texto);

/** Rentabilidade em valor e em %, com o sinal no texto (não só na cor). */
export function Rentabilidade({ desempenho, ...props }: { desempenho: Desempenho } & { 'data-testid'?: string }) {
  const { rentabilidade, rentabilidadePct } = desempenho;
  const pct = rentabilidadePct === null ? '—' : comSinal(rentabilidadePct, formatarPercentual(rentabilidadePct));
  return <Valor centavos={rentabilidade} texto={`${comSinal(rentabilidade, formatarMoeda(rentabilidade))} (${pct})`} {...props} />;
}
