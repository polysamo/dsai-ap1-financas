import type { InputHTMLAttributes } from 'react';
import { Field, classeControle, type PropsCampo } from './Field';

export type InputProps = PropsCampo & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, erro, dica, className, ...resto }: InputProps) {
  return <Field label={label} erro={erro} dica={dica}>{(l) => <input {...l} className={classeControle(erro, className)} {...resto} />}</Field>;
}
