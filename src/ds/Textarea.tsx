import type { TextareaHTMLAttributes } from 'react';
import { Field, classeControle, type PropsCampo } from './Field';

export type TextareaProps = PropsCampo & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, erro, dica, className, ...resto }: TextareaProps) {
  return <Field label={label} erro={erro} dica={dica}>{(l) => <textarea {...l} className={classeControle(erro, className)} {...resto} />}</Field>;
}
