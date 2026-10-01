import { diasDaGrade, situacaoAgendamento } from '../../domain/agenda';
import type { Agendamento, DataISO, Mes } from '../../domain/types';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const COR_BORDA = { pago: 'border-emerald-600', atrasado: 'border-red-600', pendente: 'border-amber-500' };
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
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-7 gap-1 text-xs" role="group" aria-label="Calendário do mês">
        {SEMANA.map((d) => (
          <div key={d} className="px-1 text-center font-semibold uppercase text-slate-600">
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
              className={`min-h-20 rounded-md border p-1 ${data === hoje ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200 bg-white'}`}
            >
              <span className="block font-semibold text-slate-700">{Number(data.slice(8, 10))}</span>
              <ul className="space-y-0.5">
                {itens
                  .filter((a) => a.vencimento === data)
                  .map((a) => {
                    const situacao = situacaoAgendamento(a, hoje);
                    return (
                      <li key={a.id} className={`truncate rounded border-l-4 bg-slate-50 px-1 ${COR_BORDA[situacao]}`} title={`${a.descricao} (${ROTULO[situacao]})`}>
                        {a.descricao} <span className="text-slate-600">· {ROTULO[situacao]}</span>
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
