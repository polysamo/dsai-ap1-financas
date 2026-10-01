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
import './DashboardPage.css';

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
      <div className="dashboard">
        {semContas && estado.transacoes.length === 0 ? (
          <EstadoVazio
            titulo="Bem-vindo! Comece criando uma conta"
            acao={
              <span className="dashboard__boas-vindas-acoes">
                <Link to="/contas" className="dashboard__link dashboard__link--primario">
                  Criar conta
                </Link>
                <Link to="/transacoes" className="dashboard__link dashboard__link--secundario">
                  Registrar transação
                </Link>
                <Link to="/configuracoes" className="dashboard__link dashboard__link--secundario">
                  Carregar dados de exemplo
                </Link>
              </span>
            }
          >
            Cadastre suas contas, registre receitas e despesas e acompanhe orçamento, metas e projeção aqui.
          </EstadoVazio>
        ) : null}

        <Cartao>
          <div className="dashboard__navegacao">
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, -1))}>
              Mês anterior
            </Botao>
            <div className="dashboard__campo-mes">
              <CampoTexto label="Mês" type="month" value={mes} onChange={(e) => mesValido(e.target.value) && irPara(e.target.value)} />
            </div>
            <Botao variante="secundario" onClick={() => irPara(somarMeses(mes, 1))}>
              Próximo mês
            </Botao>
            <p className="dashboard__mes-atual" aria-live="polite">
              {nomeMes(mes)}
            </p>
          </div>
        </Cartao>

        <div className="dashboard__resumo" role="group" aria-label="Resumo do mês">
          <Cartao>
            <p className="dashboard__texto-mudo">Receitas do mês</p>
            <p className="dashboard__valor" data-testid="receitas">{formatarMoeda(resumo.receitas)}</p>
          </Cartao>
          <Cartao>
            <p className="dashboard__texto-mudo">Despesas do mês</p>
            <p className="dashboard__valor" data-testid="despesas">{formatarMoeda(resumo.despesas)}</p>
          </Cartao>
          <Cartao>
            <p className="dashboard__texto-mudo">Resultado do mês</p>
            <p className="dashboard__valor" data-testid="resultado">
              <Valor centavos={resumo.resultado} texto={formatarMoeda(resumo.resultado)} />
            </p>
          </Cartao>
          <Cartao>
            <p className="dashboard__texto-mudo">Saldo total atual</p>
            <p className="dashboard__valor" data-testid="saldo-total">
              <Valor centavos={saldo.total} texto={formatarMoeda(saldo.total)} />
            </p>
          </Cartao>
        </div>

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
              <p className="dashboard__texto-mudo">Nenhum limite definido para {nomeMes(mes)}. Defina limites na tela Orçamento.</p>
            ) : alertasOrcamento.length === 0 ? (
              <p className="dashboard__texto">Todas as categorias estão dentro do limite.</p>
            ) : (
              <ul className="dashboard__lista" aria-label="Categorias em alerta">
                {alertasOrcamento.map((l) => (
                  <li key={l.categoria.id} className="dashboard__item">
                    <span>{l.categoria.nome}</span>
                    <span className={l.estado === 'estourado' ? 'dashboard__estado dashboard__estado--estourado' : 'dashboard__estado dashboard__estado--atencao'}>
                      {ROTULO_ESTADO[l.estado as 'atencao' | 'estourado']}
                      {l.percentual !== null ? ` · ${l.percentual}%` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Metas ativas" acoes={<Link to="/metas" className="dashboard__link-cartao">Abrir metas</Link>}>
            {metasAtivas.length === 0 ? (
              <p className="dashboard__texto-mudo">Nenhuma meta ativa.</p>
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
