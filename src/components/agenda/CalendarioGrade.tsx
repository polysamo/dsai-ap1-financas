import { diasDaGrade, situacaoAgendamento } from '../../domain/agenda';
import type { Agendamento, DataISO, Mes } from '../../domain/types';
import './agenda.css';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const CLASSE = { pago: 'agenda-cal-item-pago', atrasado: 'agenda-cal-item-atrasado', pendente: 'agenda-cal-item-pendente' };
const ROTULO = { pago: 'Pago', atrasado: 'Atrasado', pendente: 'Pendente' };

interface Props {
  mes: Mes;
  itens: Agendamento[];
  hoje: DataISO;
}

/** Grade mensal (domingo a sábado) com os lançamentos de cada dia. */
export function CalendarioGrade({ mes, itens, hoje }: Props) {
  const dias = diasDaGrade(mes);
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
              className={`agenda-cal-dia${data === hoje ? ' agenda-cal-dia-hoje' : ''}`}
            >
              <span className="agenda-cal-numero">{Number(data.slice(8, 10))}</span>
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
