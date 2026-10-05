import { formatarMoeda } from '../domain/money';
import type { Unidade } from './tipos';

const numero = (n: number, casas = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas });

/** Valor completo para tooltip e tabela: moeda em centavos vira "R$ 1.234,56". */
export function formatarValor(valor: number, unidade: Unidade): string {
  if (unidade === 'moeda') return formatarMoeda(Math.round(valor));
  if (unidade === 'percentual') return `${numero(valor)}%`;
  return numero(valor, 2);
}

/** Valor curto para o eixo: R$ 1,5 mil, R$ 2 mi; o sinal de negativo é mantido. */
export function formatarEixo(valor: number, unidade: Unidade): string {
  if (unidade === 'percentual') return `${numero(valor, 0)}%`;
  if (unidade === 'numero') return numero(valor, 1);
  const reais = valor / 100;
  const sinal = reais < 0 ? '-' : '';
  const abs = Math.abs(reais);
  if (abs >= 1_000_000) return `${sinal}R$ ${numero(abs / 1_000_000)} mi`;
  if (abs >= 1_000) return `${sinal}R$ ${numero(abs / 1_000)} mil`;
  return `${sinal}R$ ${numero(abs, 0)}`;
}

/** Percentual de `parte` sobre `total` com uma casa; "0%" se o total é zero. */
export function formatarParticipacao(parte: number, total: number): string {
  return total === 0 ? '0%' : `${numero((parte * 100) / total)}%`;
}
