import type { LimiteCartao } from '../domain/cartoes';
import { formatarMoeda, percentual } from '../domain/money';

export function LimiteCartaoBarra({ limite, total }: { limite: LimiteCartao; total: number }) {
  const pct = Math.min(Math.max(percentual(limite.usado, total), 0), 100);
  return (
    <div>
      <div
        role="progressbar"
        aria-label="Limite usado do cartão"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className={`h-full ${limite.excedido ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : 'bg-sky-600'}`} style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-600">Limite</dt>
          <dd data-testid="limite-total">{formatarMoeda(total)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Usado</dt>
          <dd data-testid="limite-usado">{formatarMoeda(limite.usado)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Disponível</dt>
          <dd data-testid="limite-disponivel">
            {limite.excedido ? `Limite excedido em ${formatarMoeda(-limite.disponivel)}` : formatarMoeda(limite.disponivel)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
