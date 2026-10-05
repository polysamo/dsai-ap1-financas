import { cx } from './cx';
import './ProgressRing.css';

interface Props {
  valor: number;
  max: number;
  rotulo: string;
  /** Diâmetro em pixels. */
  tamanho?: number;
  className?: string;
}

/** Anel de progresso com a porcentagem no centro. */
export function ProgressRing({ valor, max, rotulo, tamanho = 72, className }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((valor / max) * 100))) : 0;
  const traco = 8;
  const raio = (tamanho - traco) / 2;
  const circunferencia = 2 * Math.PI * raio;
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cx('ds-anel', className)} style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} className="ds-anel__trilho" strokeWidth={traco} fill="none" />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          className="ds-anel__barra"
          strokeWidth={traco}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - pct / 100)}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </svg>
      <span className="ds-anel__valor tabular-nums">{pct}%</span>
    </div>
  );
}
