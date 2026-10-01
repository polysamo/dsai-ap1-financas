import { useEffect, useId, useRef, type ReactNode } from 'react';
import './Drawer.css';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Painel lateral modal: foco preso, Esc fecha, devolve o foco ao fechar. */
export function Drawer({ aberto, titulo, onFechar, children }: Props) {
  const idTitulo = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    raiz.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return fechar.current();
      if (e.key !== 'Tab' || !raiz.current) return;
      const itens = Array.from(raiz.current.querySelectorAll<HTMLElement>(FOCAVEIS));
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
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;
  return (
    <div className="drawer-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div ref={raiz} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="drawer">
        <header className="drawer-cabecalho">
          <h2 id={idTitulo} className="drawer-titulo">{titulo}</h2>
          <button type="button" className="drawer-fechar" aria-label="Fechar painel" onClick={onFechar}>×</button>
        </header>
        <div className="drawer-corpo">{children}</div>
      </div>
    </div>
  );
}
