import { cx } from './cx';
import './Chip.css';

interface Props {
  rotulo: string;
  /** Quando informado, o chip ganha o botão "Remover <rótulo>". */
  aoRemover?: () => void;
  className?: string;
}

export function Chip({ rotulo, aoRemover, className }: Props) {
  return (
    <span className={cx('ds-chip', className)}>
      {rotulo}
      {aoRemover ? (
        <button type="button" className="ds-chip__remover" aria-label={`Remover ${rotulo}`} onClick={aoRemover}>
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </span>
  );
}
