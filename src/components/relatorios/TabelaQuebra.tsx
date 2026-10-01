import { formatarMoeda, formatarPercentual } from '../../domain/money';
import type { QuebraPorCategoria } from '../../domain/relatorios';

export function TabelaQuebra({ titulo, quebra }: { titulo: string; quebra: QuebraPorCategoria }) {
  if (quebra.linhas.length === 0) {
    return (
      <div>
        <h3 className="mb-1 font-medium text-slate-900">{titulo}</h3>
        <p className="text-sm text-slate-600">Sem lançamentos no período.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-left text-sm" aria-label={titulo}>
      <caption className="mb-1 text-left font-medium text-slate-900">{titulo}</caption>
      <thead>
        <tr className="text-slate-600">
          <th scope="col" className="py-1 font-medium">Categoria</th>
          <th scope="col" className="py-1 text-right font-medium">Valor</th>
          <th scope="col" className="py-1 text-right font-medium">% do total</th>
        </tr>
      </thead>
      <tbody>
        {quebra.linhas.map((l) => (
          <tr key={l.categoriaId} className="border-t border-slate-200">
            <th scope="row" className="py-1 font-normal">{l.nome}</th>
            <td className="py-1 text-right tabular-nums">{formatarMoeda(l.valor)}</td>
            <td className="py-1 text-right tabular-nums">{formatarPercentual(l.percentual)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-slate-300 font-medium">
          <th scope="row" className="py-1">Total</th>
          <td className="py-1 text-right tabular-nums" data-testid={`total-${titulo}`}>{formatarMoeda(quebra.total)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
