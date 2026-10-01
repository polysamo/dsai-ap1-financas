import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraficoDespesasPorCategoria, GraficoReceitasDespesas } from '../components/Graficos';
import { ProjecaoCard } from '../components/ProjecaoCard';
import { RecorrenciasPanel } from '../components/RecorrenciasPanel';
import { Botao, Cartao, CampoTexto, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import { saldoTotal } from '../domain/contas';
import { formatarData, hojeISO, mesDe, mesValido, nomeMes, somarMeses } from '../domain/date';
import { formatarMoeda, percentual } from '../domain/money';
import { acumulado, ordenarMetas } from '../domain/metas';
import { linhasOrcamento } from '../domain/orcamento';
import { calcularProjecao, despesasPorCategoria, resumoMes, serieMensal } from '../domain/projecao';
import { useEstado } from '../state/store';

const ROTULO_ESTADO = { atencao: 'Atenção', estourado: 'Estourado' } as const;

export function DashboardPage() {
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const hoje = hojeISO();
  const mesParam = params.get('mes') ?? '';
  const mes = mesValido(mesParam) ? mesParam : mesDe(hoje);
  const irPara = (novo: string) => setParams(novo === mesDe(hoje) ? {} : { mes: novo }, { replace: true });

  const resumo = useMemo(() => resumoMes(estado.transacoes, mes), [estado.transacoes, mes]);
  const saldo = useMemo(() => saldoTotal(estado), [estado]);
  const categorias = useMemo(() => despesasPorCategoria(estado, mes), [estado, mes]);
  const serie = useMemo(() => serieMensal(estado.transacoes, mes), [estado.transacoes, mes]);
  const projecao = useMemo(() => calcularProjecao(estado, hoje), [estado, hoje]);
  const alertasOrcamento = useMemo(() => linhasOrcamento(estado, mes).filter((l) => l.estado === 'estourado' || l.estado === 'atencao'), [estado, mes]);
  const temLimites = estado.orcamentos.some((o) => o.mes === mes);
  const metasAtivas = ordenarMetas(estado.metas.filter((m) => m.status === 'ativa'));
  const semContas = estado.contas.filter((c) => !c.arquivada).length === 0;

  return (
    <div>
      <TituloPagina>Dashboard</TituloPagina>
      <div className="space-y-4">
        {semContas && estado.transacoes.length === 0 ? (
          <EstadoVazio
            titulo="Bem-vindo! Comece criando uma conta"
            acao={
              <span className="flex flex-wrap justify-center gap-2">
                <Link to="/contas" className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
                  Criar conta
                </Link>
                <Link to="/transacoes" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                  Registrar transação
                </Link>
                <Link to="/configuracoes" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                  Carregar dados de exemplo
                </Link>
              </span>
            }
          >
            Cadastre suas contas, registre receitas e despesas e acompanhe orçamento, metas e projeção aqui.
          </EstadoVazio>
        ) : null}

        <Cartao>
          <div className="flex flex-wrap items-end gap-3">
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, -1))}>
              Mês anterior
            </Botao>
            <div className="w-44">
              <CampoTexto label="Mês" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && irPara(e.target.value)} />
            </div>
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, 1))}>
              Próximo mês
            </Botao>
            <p className="ml-auto text-lg font-semibold capitalize text-slate-800" aria-live="polite">
              {nomeMes(mes)}
            </p>
          </div>
        </Cartao>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Resumo do mês">
          <Cartao>
            <p className="text-sm text-slate-600">Receitas do mês</p>
            <p className="text-xl font-bold" data-testid="receitas">{formatarMoeda(resumo.receitas)}</p>
          </Cartao>
          <Cartao>
            <p className="text-sm text-slate-600">Despesas do mês</p>
            <p className="text-xl font-bold" data-testid="despesas">{formatarMoeda(resumo.despesas)}</p>
          </Cartao>
          <Cartao>
            <p className="text-sm text-slate-600">Resultado do mês</p>
            <p className="text-xl font-bold" data-testid="resultado">
              <Valor centavos={resumo.resultado} texto={formatarMoeda(resumo.resultado)} />
            </p>
          </Cartao>
          <Cartao>
            <p className="text-sm text-slate-600">Saldo total atual</p>
            <p className="text-xl font-bold" data-testid="saldo-total">
              <Valor centavos={saldo.total} texto={formatarMoeda(saldo.total)} />
            </p>
          </Cartao>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Despesas por categoria">
            {categorias.length === 0 ? <p className="text-sm text-slate-600">Sem despesas em {nomeMes(mes)}.</p> : <GraficoDespesasPorCategoria dados={categorias} />}
          </Cartao>
          <Cartao titulo="Receitas e despesas (6 meses)">
            {estado.transacoes.length === 0 ? <p className="text-sm text-slate-600">Registre transações para ver a evolução.</p> : <GraficoReceitasDespesas dados={serie} />}
          </Cartao>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao titulo="Orçamento do mês" acoes={<Link to={`/orcamento?mes=${mes}`} className="text-sm text-emerald-800 underline">Abrir orçamento</Link>}>
            {!temLimites ? (
              <p className="text-sm text-slate-600">Nenhum limite definido para {nomeMes(mes)}. Defina limites na tela Orçamento.</p>
            ) : alertasOrcamento.length === 0 ? (
              <p className="text-sm text-slate-700">Todas as categorias estão dentro do limite.</p>
            ) : (
              <ul className="space-y-1 text-sm" aria-label="Categorias em alerta">
                {alertasOrcamento.map((l) => (
                  <li key={l.categoria.id} className="flex justify-between gap-2">
                    <span>{l.categoria.nome}</span>
                    <span className={l.estado === 'estourado' ? 'font-medium text-red-800' : 'font-medium text-amber-800'}>
                      {ROTULO_ESTADO[l.estado as 'atencao' | 'estourado']}
                      {l.percentual !== null ? ` · ${l.percentual}%` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Metas ativas" acoes={<Link to="/metas" className="text-sm text-emerald-800 underline">Abrir metas</Link>}>
            {metasAtivas.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma meta ativa.</p>
            ) : (
              <ul className="space-y-2 text-sm" aria-label="Metas ativas">
                {metasAtivas.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-x-3">
                    <span className="font-medium text-slate-900">{m.nome}</span>
                    <span className="text-slate-700">
                      {percentual(acumulado(m), m.valorAlvo)}% · {m.prazo ? `prazo ${formatarData(m.prazo)}` : 'sem prazo'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>

        <ProjecaoCard projecao={projecao} categorias={estado.categorias} />
        <RecorrenciasPanel />
      </div>
    </div>
  );
}
