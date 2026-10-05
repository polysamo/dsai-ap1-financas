import type { ReactNode } from 'react';
import { cx } from './cx';
import './DataList.css';

export interface ParDado {
  rotulo: string;
  valor: ReactNode;
}

/** Lista de pares rótulo e valor com a semântica de `dl`, `dt` e `dd`. */
export function DataList({ itens, colunas, className }: { itens: ParDado[]; colunas?: boolean; className?: string }) {
  return (
    <dl className={cx('ds-dados', colunas && 'ds-dados--colunas', className)}>
      {itens.map((i) => (
        <div key={i.rotulo} className="ds-dados__par">
          <dt>{i.rotulo}</dt>
          <dd>{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
