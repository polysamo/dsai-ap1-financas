import { useMemo, useState } from 'react';
import { csvComparativo, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, mesDe, mesValido, nomeMes, somarMeses } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { comparativoMeses } from '../../domain/relatorios';
import { useEstado } from '../../state/store';
import { CampoTexto, Cartao, EstadoVazio, Valor } from '../ui';
import { BarraExportacao } from './BarraExportacao';
import '../../styles/tabela-dados.css';
import './relatorios.css';

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
    <div className="relatorio">
      <p className="relatorio-titulo-impressao">
        Comparativo: {nomeMes(base)} e {nomeMes(comparado)}
      </p>
      <Cartao>
        <div className="relatorio-controles">
          <div className="relatorio-campos">
            <div className="relatorio-campo">
              <CampoTexto label="Mês-base" type="month" value={base} onChange={(e) => mesValido(e.target.value) && setBase(e.target.value)} />
            </div>
            <div className="relatorio-campo">
              <CampoTexto label="Mês comparado" type="month" value={comparado} onChange={(e) => mesValido(e.target.value) && setComparado(e.target.value)} />
            </div>
          </div>
          <BarraExportacao linhas={csvComparativo(comparativo)} nomeArquivo={nomeArquivoRelatorio('comparativo', `${base}_x_${comparado}`)} desabilitado={vazio} />
        </div>
      </Cartao>

      <Cartao titulo="Totais">
        <table className="tabela-dados" aria-label="Totais comparados">
          <thead>
            <tr>
              <th scope="col"> </th>
              <th scope="col" className="tabela-dados__num">{nomeMes(base)}</th>
              <th scope="col" className="tabela-dados__num">{nomeMes(comparado)}</th>
              <th scope="col" className="tabela-dados__num">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {totais.map(([rotulo, chave]) => (
              <tr key={chave} data-testid={`comp-${chave}`}>
                <th scope="row">{rotulo}</th>
                <td className="tabela-dados__num">{formatarMoeda(comparativo.totaisBase[chave])}</td>
                <td className="tabela-dados__num">{formatarMoeda(comparativo.totaisComparado[chave])}</td>
                <td className="tabela-dados__num"><Valor centavos={comparativo.diferencas[chave]} texto={formatarMoeda(comparativo.diferencas[chave])} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      {comparativo.linhas.length === 0 ? (
        <EstadoVazio titulo="Sem despesas nos dois meses">Escolha outros meses para comparar as categorias.</EstadoVazio>
      ) : (
        <Cartao titulo="Despesas por categoria">
          <table className="tabela-dados" aria-label="Comparativo por categoria">
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col" className="tabela-dados__num">{nomeMes(base)}</th>
                <th scope="col" className="tabela-dados__num">{nomeMes(comparado)}</th>
                <th scope="col" className="tabela-dados__num">Diferença</th>
                <th scope="col" className="tabela-dados__num">Variação</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.linhas.map((l) => (
                <tr key={l.categoriaId} data-testid={`comp-cat-${l.categoriaId}`}>
                  <th scope="row">{l.nome}</th>
                  <td className="tabela-dados__num">{formatarMoeda(l.valorBase)}</td>
                  <td className="tabela-dados__num">{formatarMoeda(l.valorComparado)}</td>
                  <td className="tabela-dados__num">{formatarMoeda(l.diferenca)}</td>
                  <td className="tabela-dados__num">{formatarPercentual(l.variacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </div>
  );
}
