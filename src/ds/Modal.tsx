import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { IconButton } from './IconButton';
import { useFocusTrap } from './useFocusTrap';
import './Modal.css';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  /** Área de ações fixa no rodapé. */
  rodape?: ReactNode;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  /** Esconde o botão de fechar (ex.: confirmações, que já têm "Cancelar"). */
  semBotaoFechar?: boolean;
  className?: string;
}

/** Diálogo modal: foco preso, Esc e clique fora fecham, foco volta a quem abriu. */
export function Modal({ aberto, titulo, onFechar, children, rodape, tamanho = 'medio', semBotaoFechar = false, className }: Props) {
  const idTitulo = useId();
  const painel = useRef<HTMLDivElement>(null);
  useFocusTrap(aberto, painel, onFechar);
  if (!aberto) return null;
  return createPortal(
    <div className="ds-modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div ref={painel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1} className={cx('ds-modal', `ds-modal--${tamanho}`, className)}>
        <div className="ds-modal__topo">
          <h2 id={idTitulo} className="ds-modal__titulo">
            {titulo}
          </h2>
          {semBotaoFechar ? null : <IconButton aria-label="Fechar" icone="✕" tamanho="pequeno" onClick={onFechar} />}
        </div>
        <div className="ds-modal__corpo">{children}</div>
        {rodape ? <div className="ds-modal__rodape">{rodape}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
