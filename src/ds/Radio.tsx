import { useId, type KeyboardEvent } from 'react';
import { cx } from './cx';
import './Choice.css';

export interface OpcaoRadio {
  valor: string;
  rotulo: string;
  desabilitado?: boolean;
}

interface Props {
  legenda: string;
  opcoes: OpcaoRadio[];
  value: string;
  onChange: (valor: string) => void;
  horizontal?: boolean;
  className?: string;
}

/** Grupo de opções exclusivas. As setas movem a seleção entre as opções habilitadas. */
export function RadioGroup({ legenda, opcoes, value, onChange, horizontal = false, className }: Props) {
  const nome = useId();
  const habilitadas = opcoes.filter((o) => !o.desabilitado);

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>, atual: string) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = habilitadas.findIndex((o) => o.valor === atual);
    const proxima = habilitadas[(i + passo + habilitadas.length) % habilitadas.length];
    onChange(proxima.valor);
    const alvo = e.currentTarget.closest('fieldset')?.querySelector<HTMLInputElement>(`input[value="${proxima.valor}"]`);
    alvo?.focus();
  };

  return (
    <fieldset className={cx('ds-grupo-radio', horizontal && 'ds-grupo-radio--horizontal', className)}>
      <legend>{legenda}</legend>
      {opcoes.map((o) => (
        <label key={o.valor} className="ds-escolha__linha">
          <input
            type="radio"
            name={nome}
            value={o.valor}
            className="ds-escolha__entrada"
            checked={o.valor === value}
            disabled={o.desabilitado}
            tabIndex={o.valor === value || (!opcoes.some((x) => x.valor === value) && o === habilitadas[0]) ? 0 : -1}
            onChange={() => onChange(o.valor)}
            onKeyDown={(e) => aoTeclar(e, o.valor)}
          />
          <span>{o.rotulo}</span>
        </label>
      ))}
    </fieldset>
  );
}
