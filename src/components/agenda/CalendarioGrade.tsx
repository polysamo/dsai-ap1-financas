import { diasDaGrade, situacaoAgendamento } from '../../domain/agenda';
import type { Agendamento, DataISO, Mes } from '../../domain/types';
import { formatarMoeda } from '../../domain/money';
import './agenda.css';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const CLASSE = { pago: 'agenda-cal-item-pago', atrasado: 'agenda-cal-item-atrasado', pendente: 'agenda-cal-item-pendente' };
const ROTULO = { pago: 'Pago', atrasado: 'Atrasado', pendente: 'Pendente' };

interface Props {
  mes: Mes;
  itens: Agendamento[];
  hoje: DataISO;
  onSelecionar?: (data: DataISO) => void;
}

/** Grade mensal (domingo a sábado) com os lançamentos de cada dia. */
export function CalendarioGrade({ mes, itens, hoje, onSelecionar }: Props) {
  const dias = diasDaGrade(mes);
  const total = (d: DataISO) => itens.filter((a) => a.vencimento === d).reduce((t, a) => t + a.valor, 0);
  return (
    <div className="agenda-cal-rolagem">
      <div className="agenda-cal" role="group" aria-label="Calendário do mês">
        {SEMANA.map((d) => (
          <div key={d} className="agenda-cal-semana">
            {d}
          </div>
        ))}
        {dias.map((data, i) =>
          data === null ? (
            <div key={`vazio-${i}`} aria-hidden="true" />
          ) : (
            <div
              key={data}
              data-testid={`dia-${data}`}
              className={`agenda-cal-dia${data === hoje ? ' agenda-cal-dia-hoje' : ''}${onSelecionar ? ' agenda-cal-dia-clicavel' : ''}`}
              onClick={() => onSelecionar?.(data)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelecionar?.(data))}
              tabIndex={onSelecionar ? 0 : undefined}
              role={onSelecionar ? 'button' : undefined}
              aria-label={onSelecionar ? `Dia ${Number(data.slice(8, 10))}` : undefined}
            >
              <span className="agenda-cal-numero">{Number(data.slice(8, 10))}</span>
              {total(data) > 0 ? <span className="agenda-cal-total">{formatarMoeda(total(data))}</span> : null}
              <span className="agenda-cal-marcas" aria-hidden="true">
                {itens.some((a) => a.vencimento === data && a.tipo === 'despesa') ? <i className="agenda-marca-pagar" /> : null}
                {itens.some((a) => a.vencimento === data && a.tipo === 'receita') ? <i className="agenda-marca-receber" /> : null}
              </span>
              <ul className="agenda-cal-lista">
                {itens
                  .filter((a) => a.vencimento === data)
                  .map((a) => {
                    const situacao = situacaoAgendamento(a, hoje);
                    return (
                      <li key={a.id} className={`agenda-cal-item ${CLASSE[situacao]}`} title={`${a.descricao} (${ROTULO[situacao]})`}>
                        {a.descricao} <span className="agenda-cal-situacao">· {ROTULO[situacao]}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
