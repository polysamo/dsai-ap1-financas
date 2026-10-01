import { formatarMoeda, formatarPercentual } from '../../domain/money';
import type { Composicao, Grupo } from '../../domain/patrimonio';
import './ComposicaoPatrimonio.css';

function Lado({ titulo, grupos, total, rotuloTotal }: { titulo: string; grupos: Grupo<string>[]; total: number; rotuloTotal: string }) {
  return (
    <div className="patrim-composicao__lado">
      <h3 className="patrim-composicao__titulo">{titulo}</h3>
      {grupos.length === 0 ? (
        <p className="patrim-composicao__vazio">Nada por aqui.</p>
      ) : (
        <table className="patrim-composicao__tabela" aria-label={titulo}>
          <thead>
            <tr>
              <th scope="col">Grupo</th>
              <th scope="col" className="patrim-composicao__num">Valor</th>
              <th scope="col" className="patrim-composicao__num">%</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.grupo}>
                <th scope="row">{g.rotulo}</th>
                <td className="patrim-composicao__num">{formatarMoeda(g.valor)}</td>
                <td className="patrim-composicao__num">
                  <span className="patrim-composicao__barra" aria-hidden="true">
                    <span className="patrim-composicao__barra-cheia" style={{ width: `${g.pct}%` }} />
                  </span>
                  {formatarPercentual(g.pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="patrim-composicao__total">
        {rotuloTotal}: <strong data-testid={`total-${titulo.toLowerCase()}`}>{formatarMoeda(total)}</strong>
      </p>
    </div>
  );
}

export function ComposicaoPatrimonio({ composicao }: { composicao: Composicao }) {
  return (
    <div className="patrim-composicao">
      <Lado titulo="Ativos" grupos={composicao.ativos} total={composicao.totalAtivos} rotuloTotal="Total de ativos" />
      <Lado titulo="Passivos" grupos={composicao.passivos} total={composicao.totalPassivos} rotuloTotal="Total de passivos" />
    </div>
  );
}
