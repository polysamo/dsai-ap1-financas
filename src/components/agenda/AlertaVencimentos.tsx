import { DIAS_ALERTA, type AlertaVencimentos as Alerta7 } from '../../domain/agenda';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { Alerta } from '../ui';
import './agenda.css';

export function AlertaVencimentos({ alerta }: { alerta: Alerta7 }) {
  const { proximos, atrasados } = alerta;
  return (
    <div className="agenda-alertas" aria-label="Vencimentos próximos">
      {atrasados > 0 ? (
        <Alerta>{atrasados === 1 ? '1 lançamento atrasado.' : `${atrasados} lançamentos atrasados.`}</Alerta>
      ) : null}
      {proximos.length === 0 ? (
        <p className="agenda-texto-suave">Nenhum vencimento nos próximos {DIAS_ALERTA} dias.</p>
      ) : (
        <>
          <Alerta tipo="aviso">
            {proximos.length === 1 ? '1 vencimento' : `${proximos.length} vencimentos`} nos próximos {DIAS_ALERTA} dias.
          </Alerta>
          <ul className="agenda-proximos" aria-label="Próximos vencimentos">
            {proximos.map((a) => (
              <li key={a.id} className="agenda-proximo">
                <span>
                  {formatarData(a.vencimento)} · {a.descricao} ({a.tipo === 'despesa' ? 'a pagar' : 'a receber'})
                </span>
                <span className="agenda-num">{formatarMoeda(a.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
