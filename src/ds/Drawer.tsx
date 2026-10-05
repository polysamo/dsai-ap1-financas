import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';
import { useFocusTrap } from './useFocusTrap';
import './Drawer.css';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

/** Painel lateral (embaixo no celular) com o mesmo comportamento do Modal. */
export function Drawer({ aberto, titulo, onFechar, children }: Props) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  useFocusTrap(aberto, painel, onFechar);
  if (!aberto) return null;
  return createPortal(
    <div className="ds-gaveta-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div ref={painel} className="ds-gaveta" role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
        <div className="ds-gaveta__topo">
          <h2 id={idTitulo} className="ds-gaveta__titulo">
            {titulo}
          </h2>
          <IconButton aria-label="Fechar" icone="✕" tamanho="pequeno" onClick={onFechar} />
        </div>
        <div className="ds-gaveta__corpo">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
