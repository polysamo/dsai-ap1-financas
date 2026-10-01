import type { SituacaoAgendamento } from '../../domain/agenda';
import './agenda.css';

const ROTULO: Record<SituacaoAgendamento, string> = { pago: 'Pago', atrasado: 'Atrasado', pendente: 'Pendente' };
const COR: Record<SituacaoAgendamento, string> = {
  pago: 'agenda-badge-pago',
  atrasado: 'agenda-badge-atrasado',
  pendente: 'agenda-badge-pendente',
};

export function SituacaoBadge({ situacao }: { situacao: SituacaoAgendamento }) {
  return <span className={`agenda-badge ${COR[situacao]}`}>{ROTULO[situacao]}</span>;
}
