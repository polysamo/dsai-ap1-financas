import './ProgressBar.css';

export function ProgressBar({ valor, maximo, rotulo, estado = 'ok' }: { valor: number; maximo: number; rotulo: string; estado?: 'ok' | 'atencao' | 'estourado' }) {
  const pct = maximo > 0 ? Math.min(Math.max((valor / maximo) * 100, 0), 100) : 0;
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className="pbar">
      <div className={`pbar__preench pbar__preench--${estado}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
