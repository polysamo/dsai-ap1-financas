import { useState, type InputHTMLAttributes } from 'react';
import { parseValor, valorParaCampo } from '../domain/money';
import { Field, classeControle, type PropsCampo } from './Field';

interface Props extends PropsCampo, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Valor em centavos; null enquanto o campo está vazio ou inválido. */
  value: number | null;
  onChange: (centavos: number | null) => void;
}

/** Campo de dinheiro: o usuário digita `1.234,56` e o componente entrega centavos inteiros. */
export function CurrencyInput({ label, erro, dica, value, onChange, className, onBlur, ...resto }: Props) {
  const [texto, setTexto] = useState(value === null ? '' : valorParaCampo(value));
  const [invalido, setInvalido] = useState(false);
  const mensagem = erro ?? (invalido ? 'Informe um valor como 1.234,56.' : undefined);
  return (
    <Field label={label} erro={mensagem} dica={dica}>
      {(l) => (
        <input
          {...l}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          className={classeControle(mensagem, className)}
          value={texto}
          onChange={(e) => {
            const bruto = e.target.value;
            setTexto(bruto);
            const v = bruto.trim() === '' ? null : parseValor(bruto);
            setInvalido(bruto.trim() !== '' && v === null);
            onChange(v);
          }}
          onBlur={(e) => {
            if (value !== null && !invalido) setTexto(valorParaCampo(value));
            onBlur?.(e);
          }}
          {...resto}
        />
      )}
    </Field>
  );
}
