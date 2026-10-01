import type { SituacaoAgendamento } from '../../domain/agenda';

const ROTULO: Record<SituacaoAgendamento, string> = { pago: 'Pago', atrasado: 'Atrasado', pendente: 'Pendente' };
const COR: Record<SituacaoAgendamento, string> = {
  pago: 'bg-emerald-100 text-emerald-900',
  atrasado: 'bg-red-100 text-red-900',
  pendente: 'bg-amber-100 text-amber-900',
};

export function SituacaoBadge({ situacao }: { situacao: SituacaoAgendamento }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR[situacao]}`}>{ROTULO[situacao]}</span>;
}
