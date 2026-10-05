import { useEffect, useRef, type RefObject } from 'react';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Enquanto `ativo`: leva o foco para dentro do painel, prende o Tab nele, chama `aoFechar` com Esc
 * e devolve o foco a quem estava focado antes de abrir.
 */
export function useFocusTrap(ativo: boolean, painel: RefObject<HTMLElement | null>, aoFechar: () => void) {
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    if (!ativo) return;
    const anterior = document.activeElement as HTMLElement | null;
    const el = painel.current;
    (el?.querySelector<HTMLElement>(FOCAVEIS) ?? el)?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const itens = Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      anterior?.focus?.();
    };
  }, [ativo, painel]);
}
