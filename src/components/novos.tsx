import type { ReactNode } from 'react';
import { nomeMes, somarMeses } from '../domain/date';
import './novos.css';

/** Seletor de mês: setas + rótulo por extenso ("Outubro de 2026"). */
export function MonthPicker({ mes, onChange }: { mes: string; onChange: (mes: string) => void }) {
  return (
    <div className="mp" role="group" aria-label="Mês">
      <button type="button" className="mp__seta" aria-label="Mês anterior" onClick={() => onChange(somarMeses(mes, -1))}>
        ‹
      </button>
      <span className="mp__rotulo" aria-live="polite">
        {nomeMes(mes)}
      </span>
      <button type="button" className="mp__seta" aria-label="Próximo mês" onClick={() => onChange(somarMeses(mes, 1))}>
        ›
      </button>
    </div>
  );
}

/** Indicador: rótulo pequeno, valor grande tabular, variação opcional. */
export function KpiCard({ rotulo, valor, variacao, destaque = false, tom }: { rotulo: string; valor: ReactNode; variacao?: ReactNode; destaque?: boolean; tom?: 'receita' | 'despesa' | 'perigo' }) {
  return (
    <div className={`kpi${destaque ? ' kpi--destaque' : ''}${tom ? ` kpi--${tom}` : ''}`}>
      <span className="kpi__rotulo">{rotulo}</span>
      <span className="kpi__valor tabular-nums">{valor}</span>
      {variacao ? <span className="kpi__variacao">{variacao}</span> : null}
    </div>
  );
}

export { EmptyState } from '../ds/EmptyState';
export { ProgressBar, estadoProgresso, type EstadoProgresso } from '../ds/ProgressBar';
export { Drawer } from '../ds/Drawer';

export { DatePicker as DateField } from '../ds/DatePicker';
