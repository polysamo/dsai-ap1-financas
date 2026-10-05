import type { ReactNode } from 'react';
import { cx } from './cx';
import './Badge.css';

export type TomBadge = 'neutro' | 'primario' | 'sucesso' | 'aviso' | 'perigo' | 'info';

/** Selo curto de situação. Use texto claro: a cor sozinha não basta. */
export function Badge({ tom = 'neutro', children, className }: { tom?: TomBadge; children: ReactNode; className?: string }) {
  return <span className={cx('ds-selo', `ds-selo--${tom}`, className)}>{children}</span>;
}
