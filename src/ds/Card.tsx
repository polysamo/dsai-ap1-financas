import type { ReactNode } from 'react';
import { cx } from './cx';
import './Card.css';

interface Props {
  titulo?: string;
  /** Ações alinhadas à direita do título. */
  acoes?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ titulo, acoes, rodape, children, className = '' }: Props) {
  return (
    <section className={cx('ds-cartao', className)}>
      {titulo || acoes ? (
        <div className="ds-cartao__cabecalho">
          {titulo ? <h2 className="ds-cartao__titulo">{titulo}</h2> : <span />}
          {acoes}
        </div>
      ) : null}
      {children}
      {rodape ? <div className="ds-cartao__rodape">{rodape}</div> : null}
    </section>
  );
}
