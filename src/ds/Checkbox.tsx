import { useId, type InputHTMLAttributes } from 'react';
import { cx } from './cx';
import './Choice.css';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  dica?: string;
  erro?: string;
}

export function Checkbox({ label, dica, erro, className, ...resto }: Props) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className={cx('ds-escolha', className)}>
      <label className="ds-escolha__linha">
        <input id={id} type="checkbox" className="ds-escolha__entrada" aria-invalid={erro ? true : undefined} aria-describedby={erro || dica ? idMsg : undefined} {...resto} />
        <span>{label}</span>
      </label>
      {erro ? (
        <p id={idMsg} role="alert" className="ds-campo__erro">
          {erro}
        </p>
      ) : dica ? (
        <p id={idMsg} className="ds-campo__dica">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
