import { useEffect, useId, useRef, type ReactNode } from 'react';
import './Drawer.css';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ aberto, titulo, onFechar, children }: { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode }) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  const retorno = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    retorno.current = document.activeElement as HTMLElement | null;
    painel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFechar();
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
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      retorno.current?.focus?.();
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="drawer-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div ref={painel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="drawer">
        <div className="drawer__topo">
          <h2 id={idTitulo} className="drawer__titulo">{titulo}</h2>
          <button type="button" className="drawer__fechar" aria-label="Fechar" onClick={onFechar}>×</button>
        </div>
        <div className="drawer__corpo">{children}</div>
      </div>
    </div>
  );
}
