import type { LimiteCartao } from '../domain/cartoes';
import { formatarMoeda, percentual } from '../domain/money';
import './LimiteCartaoBarra.css';

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
        className="limite-cartao__trilho"
      >
        <div className={`limite-cartao__preenchimento ${limite.excedido ? 'limite-cartao__preenchimento--excedido' : pct >= 80 ? 'limite-cartao__preenchimento--alerta' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <dl className="limite-cartao__resumo">
        <div>
          <dt>Limite</dt>
          <dd data-testid="limite-total">{formatarMoeda(total)}</dd>
        </div>
        <div>
          <dt>Usado</dt>
          <dd data-testid="limite-usado">{formatarMoeda(limite.usado)}</dd>
        </div>
        <div>
          <dt>Disponível</dt>
          <dd data-testid="limite-disponivel">
            {limite.excedido ? `Limite excedido em ${formatarMoeda(-limite.disponivel)}` : formatarMoeda(limite.disponivel)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
