import type { ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import './ErrorState.css';

interface Props {
  titulo?: string;
  children?: ReactNode;
  /** Quando informado, mostra o botão "Tentar de novo". */
  aoTentarNovamente?: () => void;
  className?: string;
}

/** Falha de carregamento ou de renderização, com saída clara. */
export function ErrorState({ titulo = 'Algo deu errado', children, aoTentarNovamente, className }: Props) {
  return (
    <div role="alert" className={cx('ds-erro-estado', className)}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M24 6L4 42h40L24 6z" />
        <path d="M24 20v10M24 35.5v.5" />
      </svg>
      <p className="ds-erro-estado__titulo">{titulo}</p>
      {children ? <p className="ds-erro-estado__texto">{children}</p> : null}
      {aoTentarNovamente ? <Button variante="secundario" onClick={aoTentarNovamente}>Tentar de novo</Button> : null}
    </div>
  );
}
