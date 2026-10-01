import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { rotuloClasse, type FatiaClasse } from '../../domain/investimentos';
import { Cartao } from '../ui';
import './investimentos.css';

export function AlocacaoCarteira({ fatias }: { fatias: FatiaClasse[] }) {
  return (
    <Cartao titulo="Alocação por classe">
      {fatias.length === 0 ? (
        <p className="invest-texto-suave">Sem valor investido para distribuir por classe.</p>
      ) : (
        <ul className="invest-alocacao">
          {fatias.map((f) => (
            <li key={f.classe} data-testid={`alocacao-${f.classe}`}>
              <div className="invest-alocacao-linha">
                <span className="invest-alocacao-classe">{rotuloClasse(f.classe)}</span>
                <span className="invest-num">
                  {formatarMoeda(f.valor)} · <strong>{formatarPercentual(f.pct)}</strong>
                </span>
              </div>
              <div className="invest-barra" role="presentation">
                <div className="invest-barra-preenchida" style={{ width: `${f.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
