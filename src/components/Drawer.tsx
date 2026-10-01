import { useEffect, useRef, type ReactNode } from 'react';
import './Drawer.css';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Drawer({ aberto, titulo, onFechar, children }: Props) {
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    painel.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !painel.current) return;
      const itens = Array.from(painel.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) return;
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
  }, [aberto]);

  if (!aberto) return null;
  return (
    <div className="drawer__fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div ref={painel} role="dialog" aria-modal="true" aria-label={titulo} className="drawer">
        <header className="drawer__cabecalho">
          <h2 className="drawer__titulo">{titulo}</h2>
          <button type="button" className="drawer__fechar" aria-label="Fechar" onClick={onFechar}>
            ×
          </button>
        </header>
        <div className="drawer__corpo">{children}</div>
      </div>
    </div>
  );
}
