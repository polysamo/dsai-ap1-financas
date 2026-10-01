import { formatarMoeda, formatarPercentual } from '../../domain/money';
import type { QuebraPorCategoria } from '../../domain/relatorios';
import '../../styles/tabela-dados.css';
import './relatorios.css';

export function TabelaQuebra({ titulo, quebra }: { titulo: string; quebra: QuebraPorCategoria }) {
  if (quebra.linhas.length === 0) {
    return (
      <div>
        <h3 className="tabela-quebra__titulo">{titulo}</h3>
        <p className="tabela-quebra__vazio">Sem lançamentos no período.</p>
      </div>
    );
  }
  return (
    <table className="tabela-dados" aria-label={titulo}>
      <caption className="tabela-quebra__titulo">{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">Categoria</th>
          <th scope="col" className="tabela-dados__num">Valor</th>
          <th scope="col" className="tabela-dados__num">% do total</th>
        </tr>
      </thead>
      <tbody>
        {quebra.linhas.map((l) => (
          <tr key={l.categoriaId}>
            <th scope="row">{l.nome}</th>
            <td className="tabela-dados__num">{formatarMoeda(l.valor)}</td>
            <td className="tabela-dados__num">{formatarPercentual(l.percentual)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="tabela-dados__total">
          <th scope="row">Total</th>
          <td className="tabela-dados__num" data-testid={`total-${titulo}`}>{formatarMoeda(quebra.total)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
