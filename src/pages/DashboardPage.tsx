import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraficoDespesasPorCategoria, GraficoReceitasDespesas } from '../components/Graficos';
import { ProjecaoCard } from '../components/ProjecaoCard';
import { RecorrenciasPanel } from '../components/RecorrenciasPanel';
import { Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import { KpiCard, MonthPicker } from '../components/novos';
import { Badge } from '../ds';
import { saldoTotal } from '../domain/contas';
import { formatarData, hojeISO, mesDe, mesValido, nomeMes } from '../domain/date';
import { formatarMoeda, percentual } from '../domain/money';
import { acumulado, ordenarMetas } from '../domain/metas';
import { linhasOrcamento } from '../domain/orcamento';
import { calcularProjecao, despesasPorCategoria, resumoMes, serieMensal } from '../domain/projecao';
import { saudeFinanceira } from '../domain/saude';
import { MedidorNota } from '../components/saude/MedidorNota';
import { useEstado } from '../state/store';
import { useAtalhoNovo } from '../lib/atalhos';
import './DashboardPage.css';

const ROTULO_ESTADO = { atencao: 'Atenção', estourado: 'Estourado' } as const;

export function DashboardPage() {
  const estado = useEstado();
  const navigate = useNavigate();
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
  const saude = useMemo(() => saudeFinanceira(estado, hoje), [estado, hoje]);
  useAtalhoNovo(() => navigate('/transacoes'));

  return (
    <div>
      <TituloPagina
        descricao="Visão geral do saldo, do mês, do orçamento, das metas e da projeção financeira."
        acoes={<Link to="/transacoes" className="dashboard__link dashboard__link--primario">Nova transação</Link>}
      >Dashboard</TituloPagina>
      <div className="dashboard">
        {semContas && estado.transacoes.length === 0 ? (
          <EstadoVazio
            titulo="Bem-vindo! Comece criando uma conta"
            acao={
              <ol className="dashboard__passos" aria-label="Primeiros passos">
                <li><span>1. Criar conta</span> <Link to="/contas" className="dashboard__link dashboard__link--primario">Criar conta</Link></li>
                <li><span>2. Registrar transação</span> <Link to="/transacoes" className="dashboard__link dashboard__link--secundario">Registrar transação</Link></li>
                <li><span>3. Definir orçamento</span> <Link to="/orcamento" className="dashboard__link dashboard__link--secundario">Definir orçamento</Link></li>
                <li><Link to="/configuracoes" className="dashboard__link dashboard__link--secundario">Carregar dados de exemplo</Link></li>
              </ol>
            }
          >
            Cadastre suas contas, registre receitas e despesas e acompanhe orçamento, metas e projeção aqui.
          </EstadoVazio>
        ) : null}

        <div className="dashboard__mes">
          <MonthPicker mes={mes} onChange={irPara} />
        </div>

        <div className="dashboard__resumo" role="group" aria-label="Resumo do mês">
          <div className="dashboard__saldo">
            <KpiCard
              destaque
              rotulo="Saldo total atual"
              valor={
                <span data-testid="saldo-total">
                  <Valor centavos={saldo.total} texto={formatarMoeda(saldo.total)} />
                </span>
              }
            />
          </div>
          <KpiCard rotulo="Receitas do mês" tom="receita" valor={<span data-testid="receitas">{formatarMoeda(resumo.receitas)}</span>} />
          <KpiCard rotulo="Despesas do mês" tom="despesa" valor={<span data-testid="despesas">{formatarMoeda(resumo.despesas)}</span>} />
          <KpiCard
            rotulo="Resultado do mês"
            valor={
              <span data-testid="resultado">
                <Valor centavos={resumo.resultado} texto={formatarMoeda(resumo.resultado)} />
              </span>
            }
          />
        </div>

        {saude.nota !== null && saude.classificacao !== null ? (
          <Cartao titulo="Saúde financeira" acoes={<Link to="/saude" className="dashboard__link dashboard__link--secundario">Ver indicadores</Link>}>
            <MedidorNota nota={saude.nota} classificacao={saude.classificacao} compacto />
          </Cartao>
        ) : null}

        <div className="dashboard__duas-colunas">
          <Cartao titulo="Despesas por categoria">
            {categorias.length === 0 ? <p className="dashboard__texto-mudo">Sem despesas em {nomeMes(mes)}.</p> : <GraficoDespesasPorCategoria dados={categorias} />}
          </Cartao>
          <Cartao titulo="Receitas e despesas (6 meses)">
            {estado.transacoes.length === 0 ? <p className="dashboard__texto-mudo">Registre transações para ver a evolução.</p> : <GraficoReceitasDespesas dados={serie} />}
          </Cartao>
        </div>

        <div className="dashboard__duas-colunas">
          <Cartao titulo="Orçamento do mês" acoes={<Link to={`/orcamento?mes=${mes}`} className="dashboard__link-cartao">Abrir orçamento</Link>}>
            {!temLimites ? (
              <div className="dashboard__vazio-cartao">
                <p className="dashboard__texto-mudo">Nenhum limite definido para {nomeMes(mes)}.</p>
                <Link to={`/orcamento?mes=${mes}`} className="dashboard__link dashboard__link--secundario">Definir limites</Link>
              </div>
            ) : alertasOrcamento.length === 0 ? (
              <p className="dashboard__texto">Todas as categorias estão dentro do limite.</p>
            ) : (
              <ul className="dashboard__lista" aria-label="Categorias em alerta">
                {alertasOrcamento.map((l) => (
                  <li key={l.categoria.id} className="dashboard__item">
                    <span>{l.categoria.nome}</span>
                    <Badge tom={l.estado === 'estourado' ? 'perigo' : 'aviso'}>
                      {ROTULO_ESTADO[l.estado as 'atencao' | 'estourado']}
                      {l.percentual !== null ? ` · ${l.percentual}%` : ''}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Metas ativas" acoes={<Link to="/metas" className="dashboard__link-cartao">Abrir metas</Link>}>
            {metasAtivas.length === 0 ? (
              <div className="dashboard__vazio-cartao">
                <p className="dashboard__texto-mudo">Nenhuma meta ativa.</p>
                <Link to="/metas" className="dashboard__link dashboard__link--secundario">Criar meta</Link>
              </div>
            ) : (
              <ul className="dashboard__lista dashboard__lista--larga" aria-label="Metas ativas">
                {metasAtivas.map((m) => (
                  <li key={m.id} className="dashboard__item dashboard__item--quebra">
                    <span className="dashboard__meta-nome">{m.nome}</span>
                    <span className="dashboard__meta-detalhe">
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
