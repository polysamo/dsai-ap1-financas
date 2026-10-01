import { useMemo, useState } from 'react';
import { csvComparativo, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, mesDe, mesValido, nomeMes, somarMeses } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { comparativoMeses } from '../../domain/relatorios';
import { useEstado } from '../../state/store';
import { CampoTexto, Cartao, EstadoVazio, Valor } from '../ui';
import { BarraExportacao } from './BarraExportacao';

export function RelatorioComparativoView() {
  const estado = useEstado();
  const atual = mesDe(hojeISO());
  const [base, setBase] = useState(somarMeses(atual, -1));
  const [comparado, setComparado] = useState(atual);
  const comparativo = useMemo(() => comparativoMeses(estado, base, comparado), [estado, base, comparado]);
  const vazio = comparativo.linhas.length === 0 && comparativo.totaisBase.receitas === 0 && comparativo.totaisComparado.receitas === 0;

  const totais: Array<[string, 'receitas' | 'despesas' | 'resultado']> = [
    ['Receitas', 'receitas'],
    ['Despesas', 'despesas'],
    ['Resultado', 'resultado'],
  ];

  return (
    <div className="space-y-4">
      <p className="hidden text-lg font-semibold print:block">
        Comparativo: {nomeMes(base)} e {nomeMes(comparado)}
      </p>
      <Cartao>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3 print:hidden">
            <div className="w-44">
              <CampoTexto label="Mês-base" type="month" value={base} onChange={(e) => mesValido(e.target.value) && setBase(e.target.value)} />
            </div>
            <div className="w-44">
              <CampoTexto label="Mês comparado" type="month" value={comparado} onChange={(e) => mesValido(e.target.value) && setComparado(e.target.value)} />
            </div>
          </div>
          <BarraExportacao linhas={csvComparativo(comparativo)} nomeArquivo={nomeArquivoRelatorio('comparativo', `${base}_x_${comparado}`)} desabilitado={vazio} />
        </div>
      </Cartao>

      <Cartao titulo="Totais">
        <table className="w-full text-left text-sm" aria-label="Totais comparados">
          <thead>
            <tr className="text-slate-600">
              <th scope="col" className="py-1 font-medium"> </th>
              <th scope="col" className="py-1 text-right font-medium">{nomeMes(base)}</th>
              <th scope="col" className="py-1 text-right font-medium">{nomeMes(comparado)}</th>
              <th scope="col" className="py-1 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {totais.map(([rotulo, chave]) => (
              <tr key={chave} className="border-t border-slate-200" data-testid={`comp-${chave}`}>
                <th scope="row" className="py-1 font-normal">{rotulo}</th>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(comparativo.totaisBase[chave])}</td>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(comparativo.totaisComparado[chave])}</td>
                <td className="py-1 text-right"><Valor centavos={comparativo.diferencas[chave]} texto={formatarMoeda(comparativo.diferencas[chave])} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      {comparativo.linhas.length === 0 ? (
        <EstadoVazio titulo="Sem despesas nos dois meses">Escolha outros meses para comparar as categorias.</EstadoVazio>
      ) : (
        <Cartao titulo="Despesas por categoria">
          <table className="w-full text-left text-sm" aria-label="Comparativo por categoria">
            <thead>
              <tr className="text-slate-600">
                <th scope="col" className="py-1 font-medium">Categoria</th>
                <th scope="col" className="py-1 text-right font-medium">{nomeMes(base)}</th>
                <th scope="col" className="py-1 text-right font-medium">{nomeMes(comparado)}</th>
                <th scope="col" className="py-1 text-right font-medium">Diferença</th>
                <th scope="col" className="py-1 text-right font-medium">Variação</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.linhas.map((l) => (
                <tr key={l.categoriaId} className="border-t border-slate-200" data-testid={`comp-cat-${l.categoriaId}`}>
                  <th scope="row" className="py-1 font-normal">{l.nome}</th>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(l.valorBase)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(l.valorComparado)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(l.diferenca)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarPercentual(l.variacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </div>
  );
}
