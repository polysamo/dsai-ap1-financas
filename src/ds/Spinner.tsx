import { cx } from './cx';
import './Spinner.css';

interface Props {
  /** Texto lido por leitores de tela. */
  rotulo?: string;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  className?: string;
}

export function Spinner({ rotulo = 'Carregando', tamanho = 'medio', className }: Props) {
  return (
    <span role="status" className={cx('ds-spinner', `ds-spinner--${tamanho}`, className)}>
      <span className="ds-spinner__roda" aria-hidden="true" />
      <span className="ds-sr-somente">{rotulo}</span>
    </span>
  );
}
