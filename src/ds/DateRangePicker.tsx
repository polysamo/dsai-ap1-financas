import { cx } from './cx';
import { DatePicker } from './DatePicker';
import './DateRangePicker.css';

export interface Intervalo {
  inicio: string;
  fim: string;
}

interface Props {
  legenda: string;
  value: Intervalo;
  onChange: (intervalo: Intervalo) => void;
  erro?: string;
  className?: string;
}

/** Dois campos de data (início e fim); o fim não pode vir antes do início. */
export function DateRangePicker({ legenda, value, onChange, erro, className }: Props) {
  const invertido = value.inicio !== '' && value.fim !== '' && value.fim < value.inicio;
  return (
    <fieldset className={cx('ds-intervalo', className)}>
      <legend>{legenda}</legend>
      <div className="ds-intervalo__campos">
        <DatePicker label="Início" value={value.inicio} onChange={(inicio) => onChange({ ...value, inicio })} />
        <DatePicker label="Fim" value={value.fim} onChange={(fim) => onChange({ ...value, fim })} erro={invertido ? 'O fim não pode ser antes do início.' : undefined} />
      </div>
      {erro ? (
        <p role="alert" className="ds-campo__erro">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}
