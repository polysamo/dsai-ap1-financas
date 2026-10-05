import { useMemo, useState } from 'react';
import { csvMensal, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, mesDe, mesValido, nomeMes } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { relatorioMensal } from '../../domain/relatorios';
import { useEstado } from '../../state/store';
import { CampoTexto, Cartao, EstadoVazio, Valor } from '../ui';
import { BarraExportacao } from './BarraExportacao';
import { TabelaQuebra } from './TabelaQuebra';
import '../../styles/tabela-dados.css';
import './relatorios.css';

export function RelatorioMensalView() {
  const estado = useEstado();
  const [mes, setMes] = useState(mesDe(hojeISO()));
  const [agrupar, setAgrupar] = useState(true);
  const relatorio = useMemo(() => relatorioMensal(estado, mes, agrupar), [estado, mes, agrupar]);
  const temSubcategorias = estado.categorias.some((c) => c.paiId);

  return (
    <div className="relatorio">
      <p className="relatorio-titulo-impressao">Relatório mensal: {nomeMes(mes)}</p>
      <Cartao>
        <div className="relatorio-controles">
          <div className="relatorio-campo">
            <CampoTexto label="Mês do relatório" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && setMes(e.target.value)} />
          </div>
          {temSubcategorias ? (
            <label className="relatorio-opcao">
              <input type="checkbox" checked={agrupar} onChange={(e) => setAgrupar(e.target.checked)} />
              Agrupar subcategorias
            </label>
          ) : null}
          <BarraExportacao linhas={csvMensal(relatorio)} nomeArquivo={nomeArquivoRelatorio('mensal', mes)} desabilitado={relatorio.quantidade === 0} />
        </div>
      </Cartao>

      <div className="relatorio-resumo" role="group" aria-label="Resumo do mês">
        <Cartao>
          <p className="relatorio-resumo__rotulo">Receitas</p>
          <p className="relatorio-resumo__valor" data-testid="rel-receitas">{formatarMoeda(relatorio.receitas)}</p>
        </Cartao>
        <Cartao>
          <p className="relatorio-resumo__rotulo">Despesas</p>
          <p className="relatorio-resumo__valor" data-testid="rel-despesas">{formatarMoeda(relatorio.despesas)}</p>
        </Cartao>
        <Cartao>
          <p className="relatorio-resumo__rotulo">Resultado</p>
          <p className="relatorio-resumo__valor" data-testid="rel-resultado">
            <Valor centavos={relatorio.resultado} texto={formatarMoeda(relatorio.resultado)} />
          </p>
        </Cartao>
        <Cartao>
          <p className="relatorio-resumo__rotulo">Taxa de poupança</p>
          <p className="relatorio-resumo__valor" data-testid="rel-taxa">{formatarPercentual(relatorio.taxaPoupanca)}</p>
        </Cartao>
      </div>

      {relatorio.quantidade === 0 ? (
        <EstadoVazio titulo={`Sem transações em ${nomeMes(mes)}`}>Escolha outro mês ou registre transações para ver o detalhamento.</EstadoVazio>
      ) : (
        <div className="relatorio-quebras">
          <Cartao>
            <TabelaQuebra titulo="Despesas por categoria" quebra={relatorio.despesasPorCategoria} />
          </Cartao>
          <Cartao>
            <TabelaQuebra titulo="Receitas por categoria" quebra={relatorio.receitasPorCategoria} />
          </Cartao>
        </div>
      )}
    </div>
  );
}
