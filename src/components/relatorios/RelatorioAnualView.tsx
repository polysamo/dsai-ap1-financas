import { useMemo, useState } from 'react';
import { csvAnual, nomeArquivoRelatorio } from '../../domain/exportacao';
import { hojeISO, nomeMes, nomeMesCurto } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { relatorioAnual } from '../../domain/relatorios';
import { useEstado } from '../../state/store';
import { GraficoReceitasDespesas } from '../Graficos';
import { Alerta, CampoTexto, Cartao, EstadoVazio, Valor } from '../ui';
import { BarraExportacao } from './BarraExportacao';

export function RelatorioAnualView() {
  const estado = useEstado();
  const [anoTexto, setAnoTexto] = useState(hojeISO().slice(0, 4));
  const ano = Number(anoTexto);
  const anoValido = /^\d{4}$/.test(anoTexto) && ano >= 1900 && ano <= 2200;
  const relatorio = useMemo(() => (anoValido ? relatorioAnual(estado.transacoes, ano) : null), [estado.transacoes, ano, anoValido]);

  return (
    <div className="space-y-4">
      <p className="hidden text-lg font-semibold print:block">Relatório anual: {anoTexto}</p>
      <Cartao>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-36 print:hidden">
            <CampoTexto
              label="Ano do relatório"
              value={anoTexto}
              onChange={(e) => setAnoTexto(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              erro={anoValido ? undefined : 'Informe um ano com 4 dígitos.'}
            />
          </div>
          {relatorio ? <BarraExportacao linhas={csvAnual(relatorio)} nomeArquivo={nomeArquivoRelatorio('anual', anoTexto)} desabilitado={relatorio.mesesComMovimento === 0} /> : null}
        </div>
      </Cartao>

      {relatorio && relatorio.mesesComMovimento === 0 ? (
        <EstadoVazio titulo={`Sem transações em ${anoTexto}`}>Escolha outro ano ou registre transações.</EstadoVazio>
      ) : null}

      {relatorio && relatorio.mesesComMovimento > 0 ? (
        <>
          {relatorio.melhorMes && relatorio.piorMes ? (
            <Alerta tipo="sucesso">
              <span data-testid="destaques">
                Melhor mês: {nomeMes(relatorio.melhorMes)}. Pior mês: {nomeMes(relatorio.piorMes)}.
              </span>
            </Alerta>
          ) : null}
          <Cartao titulo="Receitas e despesas por mês">
            <GraficoReceitasDespesas dados={relatorio.linhas} />
          </Cartao>
          <Cartao titulo="Detalhamento">
            <table className="w-full text-left text-sm" aria-label="Relatório anual">
              <thead>
                <tr className="text-slate-600">
                  <th scope="col" className="py-1 font-medium">Mês</th>
                  <th scope="col" className="py-1 text-right font-medium">Receitas</th>
                  <th scope="col" className="py-1 text-right font-medium">Despesas</th>
                  <th scope="col" className="py-1 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.linhas.map((l) => (
                  <tr key={l.mes} className="border-t border-slate-200" data-testid={`anual-${l.mes}`}>
                    <th scope="row" className="py-1 font-normal">{nomeMesCurto(l.mes)}</th>
                    <td className="py-1 text-right tabular-nums">{formatarMoeda(l.receitas)}</td>
                    <td className="py-1 text-right tabular-nums">{formatarMoeda(l.despesas)}</td>
                    <td className="py-1 text-right"><Valor centavos={l.resultado} texto={formatarMoeda(l.resultado)} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-300 font-medium" data-testid="anual-total">
                  <th scope="row" className="py-1">Total do ano</th>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(relatorio.receitas)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(relatorio.despesas)}</td>
                  <td className="py-1 text-right"><Valor centavos={relatorio.resultado} texto={formatarMoeda(relatorio.resultado)} /></td>
                </tr>
                <tr className="text-slate-700" data-testid="anual-media">
                  <th scope="row" className="py-1 font-normal">Média mensal ({relatorio.mesesComMovimento} {relatorio.mesesComMovimento === 1 ? 'mês' : 'meses'} com movimento)</th>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(relatorio.mediaReceitas)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(relatorio.mediaDespesas)}</td>
                  <td className="py-1 text-right tabular-nums">{formatarMoeda(relatorio.mediaResultado)}</td>
                </tr>
              </tfoot>
            </table>
          </Cartao>
        </>
      ) : null}
    </div>
  );
}
