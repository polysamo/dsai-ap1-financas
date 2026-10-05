import type { InputHTMLAttributes } from 'react';
import { Field, type PropsCampo } from './Field';
import './Slider.css';

interface Props extends PropsCampo, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (valor: number) => void;
  min: number;
  max: number;
  /** Texto do valor atual (ex.: "R$ 500,00"); por padrão, o número. */
  formatar?: (valor: number) => string;
}

export function Slider({ label, erro, dica, value, onChange, min, max, step = 1, formatar = String, className, ...resto }: Props) {
  return (
    <Field label={label} erro={erro} dica={dica} className={className}>
      {(l) => (
        <div className="ds-slider">
          <input {...l} type="range" className="ds-slider__entrada" min={min} max={max} step={step} value={value} aria-valuetext={formatar(value)} onChange={(e) => onChange(Number(e.target.value))} {...resto} />
          <output htmlFor={l.id} className="ds-slider__valor tabular-nums">
            {formatar(value)}
          </output>
        </div>
      )}
    </Field>
  );
}
