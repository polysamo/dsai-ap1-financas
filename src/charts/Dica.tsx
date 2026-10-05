import { formatarValor } from './formato';
import type { Unidade } from './tipos';

interface Entrada {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface Props {
  active?: boolean;
  label?: string | number;
  payload?: Entrada[];
  unidade: Unidade;
  formatarRotulo?: (v: string | number) => string;
}

/** Conteúdo do tooltip: rótulo do ponto e o valor de cada série formatado em pt-BR. */
export function Dica({ active, label, payload, unidade, formatarRotulo }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const rotulo = label === undefined ? payload[0].name : formatarRotulo ? formatarRotulo(label) : label;
  return (
    <div className="grafico-dica">
      <p className="grafico-dica__rotulo">{rotulo}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="grafico-dica__linha">
          <span className="grafico-legenda__amostra" style={{ background: p.color }} aria-hidden="true" />
          <span>{p.name}</span>
          <strong className="tabular-nums">{formatarValor(Number(p.value), unidade)}</strong>
        </p>
      ))}
    </div>
  );
}
