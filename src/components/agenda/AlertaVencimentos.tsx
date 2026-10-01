import { DIAS_ALERTA, type AlertaVencimentos as Alerta7 } from '../../domain/agenda';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { Alerta } from '../ui';

export function AlertaVencimentos({ alerta }: { alerta: Alerta7 }) {
  const { proximos, atrasados } = alerta;
  return (
    <div className="space-y-2" aria-label="Vencimentos próximos">
      {atrasados > 0 ? (
        <Alerta>{atrasados === 1 ? '1 lançamento atrasado.' : `${atrasados} lançamentos atrasados.`}</Alerta>
      ) : null}
      {proximos.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhum vencimento nos próximos {DIAS_ALERTA} dias.</p>
      ) : (
        <>
          <Alerta tipo="aviso">
            {proximos.length === 1 ? '1 vencimento' : `${proximos.length} vencimentos`} nos próximos {DIAS_ALERTA} dias.
          </Alerta>
          <ul className="divide-y divide-slate-200 text-sm" aria-label="Próximos vencimentos">
            {proximos.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-1">
                <span>
                  {formatarData(a.vencimento)} · {a.descricao} ({a.tipo === 'despesa' ? 'a pagar' : 'a receber'})
                </span>
                <span className="tabular-nums">{formatarMoeda(a.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
