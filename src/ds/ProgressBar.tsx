import { cx } from './cx';
import './ProgressBar.css';

export type EstadoProgresso = 'ok' | 'atencao' | 'estourado';

/** Estado de consumo: estourado acima do limite, atenção a partir de 80%. */
export function estadoProgresso(gasto: number, limite: number): EstadoProgresso {
  if (limite > 0 && gasto > limite) return 'estourado';
  if (limite > 0 && gasto / limite >= 0.8) return 'atencao';
  return 'ok';
}

const TEXTO_ESTADO: Record<EstadoProgresso, string> = { ok: 'Dentro do limite', atencao: 'Atenção', estourado: 'Estourado' };

interface Props {
  valor: number;
  max: number;
  rotulo: string;
  /** Mostra o estado em texto ao lado da barra (a cor nunca é a única informação). */
  mostrarEstado?: boolean;
  /** Força o estado em vez de calculá-lo pelo consumo. */
  estado?: EstadoProgresso;
  className?: string;
}

export function ProgressBar({ valor, max, rotulo, mostrarEstado = true, estado, className }: Props) {
  const situacao = estado ?? estadoProgresso(valor, max);
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((valor / max) * 100))) : 0;
  return (
    <div className={cx('ds-progresso', `ds-progresso--${situacao}`, className)}>
      <div className="ds-progresso__trilho" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="ds-progresso__barra" style={{ width: `${pct}%` }} />
      </div>
      {mostrarEstado ? <span className="ds-progresso__estado">{TEXTO_ESTADO[situacao]}</span> : null}
    </div>
  );
}
