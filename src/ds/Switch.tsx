import { useId } from 'react';
import { cx } from './cx';
import './Switch.css';

interface Props {
  label: string;
  checked: boolean;
  onChange: (ligado: boolean) => void;
  disabled?: boolean;
  dica?: string;
  className?: string;
}

/** Interruptor liga/desliga; é um botão com `role="switch"`, acionado por clique, Espaço ou Enter. */
export function Switch({ label, checked, onChange, disabled, dica, className }: Props) {
  const id = useId();
  return (
    <div className={cx('ds-switch', className)}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-describedby={dica ? `${id}-dica` : undefined}
        disabled={disabled}
        className="ds-switch__trilho"
        onClick={() => onChange(!checked)}
      >
        <span className="ds-switch__botao" aria-hidden="true" />
      </button>
      <label htmlFor={id} className="ds-switch__rotulo">
        {label}
      </label>
      {dica ? (
        <p id={`${id}-dica`} className="ds-campo__dica">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
