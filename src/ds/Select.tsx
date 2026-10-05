import type { ReactNode, SelectHTMLAttributes } from 'react';
import { Field, classeControle, type PropsCampo } from './Field';

export type SelectProps = PropsCampo & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };

export function Select({ label, erro, dica, className, children, ...resto }: SelectProps) {
  return (
    <Field label={label} erro={erro} dica={dica}>
      {(l) => (
        <select {...l} className={classeControle(erro, className)} {...resto}>
          {children}
        </select>
      )}
    </Field>
  );
}
