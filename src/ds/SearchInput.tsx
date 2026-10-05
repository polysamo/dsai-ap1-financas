import type { InputHTMLAttributes } from 'react';
import { Field, classeControle } from './Field';
import { IconButton } from './IconButton';
import './SearchInput.css';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}

/** Campo de busca: o botão "Limpar busca" e a tecla Esc esvaziam o texto. */
export function SearchInput({ label, value, onChange, className, onKeyDown, ...resto }: Props) {
  return (
    <Field label={label}>
      {(l) => (
        <div className="ds-busca-campo">
          <input
            {...l}
            type="search"
            autoComplete="off"
            className={classeControle(undefined, className)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && value) {
                e.preventDefault();
                onChange('');
              }
              onKeyDown?.(e);
            }}
            {...resto}
          />
          {value ? <IconButton className="ds-busca-campo__limpar" tamanho="pequeno" aria-label="Limpar busca" icone="✕" onClick={() => onChange('')} /> : null}
        </div>
      )}
    </Field>
  );
}
