import { useMemo, useState } from 'react';
import { csvMensal, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, mesDe, mesValido, nomeMes } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { relatorioMensal } from '../../domain/relatorios';
import { useEstado } from '../../state/store';
import { CampoTexto, Cartao, EstadoVazio, Valor } from '../ui';
import { BarraExportacao } from './BarraExportacao';
import { TabelaQuebra } from './TabelaQuebra';

export function RelatorioMensalView() {
  const estado = useEstado();
  const [mes, setMes] = useState(mesDe(hojeISO()));
  const relatorio = useMemo(() => relatorioMensal(estado, mes), [estado, mes]);

  return (
    <div className="space-y-4">
      <p className="hidden text-lg font-semibold print:block">Relatório mensal: {nomeMes(mes)}</p>
      <Cartao>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-44 print:hidden">
            <CampoTexto label="Mês do relatório" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && setMes(e.target.value)} />
          </div>
          <BarraExportacao linhas={csvMensal(relatorio)} nomeArquivo={nomeArquivoRelatorio('mensal', mes)} desabilitado={relatorio.quantidade === 0} />
        </div>
      </Cartao>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Resumo do mês">
        <Cartao>
          <p className="text-sm text-slate-600">Receitas</p>
          <p className="text-xl font-bold" data-testid="rel-receitas">{formatarMoeda(relatorio.receitas)}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-slate-600">Despesas</p>
          <p className="text-xl font-bold" data-testid="rel-despesas">{formatarMoeda(relatorio.despesas)}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-slate-600">Resultado</p>
          <p className="text-xl font-bold" data-testid="rel-resultado">
            <Valor centavos={relatorio.resultado} texto={formatarMoeda(relatorio.resultado)} />
          </p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-slate-600">Taxa de poupança</p>
          <p className="text-xl font-bold" data-testid="rel-taxa">{formatarPercentual(relatorio.taxaPoupanca)}</p>
        </Cartao>
      </div>

      {relatorio.quantidade === 0 ? (
        <EstadoVazio titulo={`Sem transações em ${nomeMes(mes)}`}>Escolha outro mês ou registre transações para ver o detalhamento.</EstadoVazio>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
