import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { rotuloClasse, type FatiaClasse } from '../../domain/investimentos';
import { Cartao } from '../ui';

export function AlocacaoCarteira({ fatias }: { fatias: FatiaClasse[] }) {
  return (
    <Cartao titulo="Alocação por classe">
      {fatias.length === 0 ? (
        <p className="text-sm text-slate-600">Sem valor investido para distribuir por classe.</p>
      ) : (
        <ul className="space-y-3">
          {fatias.map((f) => (
            <li key={f.classe} data-testid={`alocacao-${f.classe}`}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-medium">{rotuloClasse(f.classe)}</span>
                <span className="tabular-nums">
                  {formatarMoeda(f.valor)} · <strong>{formatarPercentual(f.pct)}</strong>
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-slate-100" role="presentation">
                <div className="h-2 rounded bg-emerald-700" style={{ width: `${f.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
