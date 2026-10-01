import { formatarData } from '../../domain/date';
import type { ResumoDivida as Resumo } from '../../domain/dividas';
import { formatarMoeda } from '../../domain/money';
import type { TipoDivida } from '../../domain/types';
import { Alerta } from '../ui';
import { rotulosTipo } from './rotulos';

export function ResumoDivida({ resumo, tipo }: { resumo: Resumo; tipo: TipoDivida }) {
  const r = rotulosTipo(tipo);
  const { proxima, atrasadas } = resumo;
  return (
    <div className="space-y-3">
      {resumo.quitada ? <Alerta tipo="sucesso">{r.quitada}.</Alerta> : null}
      {atrasadas.quantidade > 0 ? (
        <Alerta tipo="aviso">
          {atrasadas.quantidade === 1 ? '1 parcela atrasada' : `${atrasadas.quantidade} parcelas atrasadas`}, somando{' '}
          <span data-testid="atrasadas-valor">{formatarMoeda(atrasadas.valor)}</span>.
        </Alerta>
      ) : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-600">{r.saldo}</dt>
          <dd className="text-lg font-bold tabular-nums" data-testid="saldo-devedor">{formatarMoeda(resumo.saldoDevedor)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">Total de juros</dt>
          <dd className="tabular-nums" data-testid="total-juros">{formatarMoeda(resumo.totalJuros)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">{r.pago}</dt>
          <dd className="tabular-nums" data-testid="total-pago">{formatarMoeda(resumo.totalPago)}</dd>
        </div>
        <div>
          <dt className="text-slate-600">{r.parcela}</dt>
          <dd data-testid="proxima">
            {proxima ? `Nº ${proxima.numero}, ${formatarData(proxima.vencimento)}, ${formatarMoeda(proxima.restante)}` : 'Nenhuma'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
