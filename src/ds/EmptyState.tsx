import type { ReactNode } from 'react';
import { cx } from './cx';
import './EmptyState.css';

/** Ilustração padrão: uma caixa vazia com uma moeda, em traço simples que acompanha o tema. */
export function IlustracaoVazia() {
  return (
    <svg className="ds-vazio__ilustracao" width="96" height="80" viewBox="0 0 96 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 34l10-18h52l10 18" />
      <rect x="12" y="34" width="72" height="34" rx="6" />
      <path d="M12 34h22a14 14 0 0028 0h22" />
      <circle cx="74" cy="14" r="7" />
      <path d="M74 11v6M72 13.5h4" />
    </svg>
  );
}

interface Props {
  titulo: string;
  children?: ReactNode;
  /** Chamada para ação (geralmente um botão). */
  acao?: ReactNode;
  ilustracao?: ReactNode;
  className?: string;
}

export function EmptyState({ titulo, children, acao, ilustracao, className }: Props) {
  return (
    <div className={cx('ds-vazio', className)}>
      {ilustracao ?? <IlustracaoVazia />}
      <p className="ds-vazio__titulo">{titulo}</p>
      {children ? <p className="ds-vazio__texto">{children}</p> : null}
      {acao ? <div className="ds-vazio__acao">{acao}</div> : null}
    </div>
  );
}
