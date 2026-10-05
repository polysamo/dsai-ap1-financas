import { useEffect, useState } from 'react';

export const LARGURA_COMPACTA_PX = 768;

export interface ConfigGrafico {
  altura: number;
  mostrarLegenda: boolean;
  /** Distância mínima entre marcas do eixo X, em pixels. */
  espacoMarcas: number;
  larguraEixoY: number;
}

/** Configuração por modo: compacta no celular (menor, sem legenda no desenho, menos marcas). */
export function configuracaoDoGrafico(compacto: boolean): ConfigGrafico {
  return compacto
    ? { altura: 200, mostrarLegenda: false, espacoMarcas: 48, larguraEixoY: 56 }
    : { altura: 288, mostrarLegenda: true, espacoMarcas: 24, larguraEixoY: 76 };
}

export const ehCompacta = (larguraPx: number): boolean => larguraPx < LARGURA_COMPACTA_PX;

const consulta = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(`(max-width: ${LARGURA_COMPACTA_PX - 0.02}px)`) : null);

/** Verdadeiro em telas estreitas; sem `matchMedia` (testes) assume o modo normal. */
export function useCompacto(): boolean {
  const [compacto, setCompacto] = useState(() => consulta()?.matches === true);
  useEffect(() => {
    const mq = consulta();
    if (!mq || typeof mq.addEventListener !== 'function') return;
    const ao = () => setCompacto(mq.matches);
    mq.addEventListener('change', ao);
    return () => mq.removeEventListener('change', ao);
  }, []);
  return compacto;
}

/** Sem animação quando o usuário pede movimento reduzido. */
export function useSemAnimacao(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
}
