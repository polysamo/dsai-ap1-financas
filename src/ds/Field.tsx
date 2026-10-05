import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import './Field.css';

export interface PropsCampo {
  label: string;
  erro?: string;
  dica?: string;
}

export interface LigacaoCampo {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Rótulo, controle, dica e erro ligados por id; o controle recebe as props de acessibilidade. */
export function Field({ label, erro, dica, className, children }: PropsCampo & { className?: string; children: (ligacao: LigacaoCampo) => ReactNode }) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className={cx('ds-campo', className)}>
      <label htmlFor={id} className="ds-campo__rotulo">
        {label}
      </label>
      {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': erro || dica ? idMsg : undefined })}
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

export const classeControle = (erro?: string, extra?: string) => cx('ds-controle', erro && 'ds-controle--erro', extra);
