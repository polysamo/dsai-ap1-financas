import { Fragment, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer, KpiCard } from '../components/novos';
import { CategoriasPanel } from '../components/CategoriasPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExclusaoParcelaDialog } from '../components/ExclusaoParcelaDialog';
import { FiltrosTransacoesForm } from '../components/FiltrosTransacoes';
import { TransacaoForm } from '../components/TransacaoForm';
import { BarraLote, ROTULO_ACAO_LOTE, type AcaoLote } from '../components/lote/BarraLote';
import { LoteForm } from '../components/lote/LoteForm';
import { LancamentoRapido } from '../components/LancamentoRapido';
import { aplicarLote, excluirLote, mensagemLote, restringirSelecao, resumoSelecao, type ResultadoLote } from '../domain/lote';
import { Botao, Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import { Tabs } from '../ds/Tabs';
import { useAtalhoNovo } from '../lib/atalhos';
import { useFeedback } from '../state/useFeedback';
import { excluirParcela } from '../domain/cartoes';
import { dataValida, formatarData, hojeISO, mesDe, primeiroDia, ultimoDia } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import { nomeCompleto } from '../domain/subcategorias';
import { formatarTags } from '../domain/tags';
import {
  criarTransacao,
  editarTransacao,
  efeitoTransacao,
  excluirTransacao,
  filtrarTransacoes,
  ordenarTransacoes,
  totaisTransacoes,
  type FiltrosTransacoes,
} from '../domain/transacoes';
import { ok, type AppState, type Resultado, type Transacao } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './TransacoesPage.css';

const TAMANHO_PAGINA = 50;

function filtrosPadrao(): FiltrosTransacoes {
  const mes = mesDe(hojeISO());
  return { de: primeiroDia(mes), ate: ultimoDia(mes) };
}

/** Filtros vindos da URL (`texto`, `de`, `ate`), usados pela busca global; sem nenhum, o mês atual. */
export function filtrosDaUrl(params: URLSearchParams): FiltrosTransacoes {
  const texto = params.get('texto') ?? '';
  const de = params.get('de') ?? '';
  const ate = params.get('ate') ?? '';
  if (!texto && !dataValida(de) && !dataValida(ate)) return filtrosPadrao();
  return { ...(texto ? { texto } : {}), ...(dataValida(de) ? { de } : {}), ...(dataValida(ate) ? { ate } : {}) };
}

type Aba = 'transacoes' | 'categorias';

export function TransacoesPage() {
  const store = useStore();
  const estado = useEstado();
  const [params] = useSearchParams();
  const abaDaUrl: Aba = params.get('aba') === 'categorias' ? 'categorias' : 'transacoes';
  const [aba, setAba] = useState<Aba>(abaDaUrl);
  const [filtros, setFiltros] = useState<FiltrosTransacoes>(() => filtrosDaUrl(params));
  // A busca global pode trocar a URL com a tela já aberta: os filtros acompanham.
  const [urlAnterior, setUrlAnterior] = useState(params.toString());
  if (params.toString() !== urlAnterior) {
    setUrlAnterior(params.toString());
    setFiltros(filtrosDaUrl(params));
    setAba(abaDaUrl);
  }
  const [limite, setLimite] = useState(TAMANHO_PAGINA);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Transacao | null>(null);
  const { executar, sucesso, erro: avisarErro } = useFeedback();
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [acaoLote, setAcaoLote] = useState<AcaoLote | null>(null);
  const [excluindoLote, setExcluindoLote] = useState(false);

  const filtradas = useMemo(() => ordenarTransacoes(filtrarTransacoes(estado.transacoes, filtros)), [estado.transacoes, filtros]);
  const totais = useMemo(() => totaisTransacoes(filtradas), [filtradas]);
  const nomeConta = useMemo(() => new Map(estado.contas.map((c) => [c.id, c.nome])), [estado.contas]);
  const categoria = useMemo(() => new Map(estado.categorias.map((c) => [c.id, c])), [estado.categorias]);
  const visiveis = filtradas.slice(0, limite);
  // A seleção vale só para o filtro atual: o que saiu do filtro deixa de contar.
  const selecao = useMemo(() => restringirSelecao(marcadas, filtradas), [marcadas, filtradas]);
  const resumoLote = useMemo(() => resumoSelecao(filtradas, selecao), [filtradas, selecao]);
  const todasMarcadas = filtradas.length > 0 && selecao.size === filtradas.length;

  const alternar = (id: string) =>
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  /** Executa uma operação em lote como uma única entrada do histórico e mostra o resultado. */
  const executarLote = (operacao: (s: AppState) => Resultado<ResultadoLote>, verbo?: string): Resultado<void> => {
    let resumo: ResultadoLote | null = null;
    const r = store.aplicar((s) => {
      const lote = operacao(s);
      if (!lote.ok) return lote;
      resumo = lote.valor;
      return ok(lote.valor.estado);
    });
    if (!r.ok || !resumo) return r;
    sucesso(mensagemLote(resumo, verbo), true);
    setMarcadas(new Set());
    setAcaoLote(null);
    return ok(undefined);
  };

  const confirmarExclusaoLote = () => {
    const r = executarLote((s) => excluirLote(s, selecao), 'excluída');
    if (!r.ok) avisarErro(r.erro);
    setExcluindoLote(false);
  };

  const mudarFiltros = (f: FiltrosTransacoes) => {
    setFiltros(f);
    setLimite(TAMANHO_PAGINA);
  };

  const filtrosAtivos = JSON.stringify(filtros) !== JSON.stringify(filtrosPadrao());
  const resumoFiltros = `${filtradas.length} de ${estado.transacoes.length} ${estado.transacoes.length === 1 ? 'transação' : 'transações'}`;
  const abrirCriacao = useCallback(() => {
    if (aba !== 'transacoes') return;
    setCriando(true);
    setEditandoId(null);
  }, [aba]);
  useAtalhoNovo(abrirCriacao);

  const painelTransacoes = (
    <div className="transacoes__painel">
          <LancamentoRapido />

          <Drawer aberto={criando} titulo="Nova transação" onFechar={() => setCriando(false)}>
              <TransacaoForm
                estado={estado}
                onCancelar={() => setCriando(false)}
                onSalvar={(dados) => {
                  const r = store.aplicar((s) => criarTransacao(s, dados));
                  if (r.ok) {
                    setCriando(false);
                    sucesso('Transação registrada.', true);
                  }
                  return r;
                }}
              />
          </Drawer>

          <FiltrosTransacoesForm estado={estado} filtros={filtros} onChange={mudarFiltros} onLimpar={() => mudarFiltros(filtrosPadrao())} ativo={filtrosAtivos} resumo={resumoFiltros} />

          <div className="transacoes__totais" aria-label="Totais do filtro" role="group">
            <KpiCard rotulo="Receitas" tom="receita" valor={<span data-testid="total-receitas">{formatarMoeda(totais.receitas)}</span>} />
            <KpiCard rotulo="Despesas" tom="despesa" valor={<span data-testid="total-despesas">{formatarMoeda(totais.despesas)}</span>} />
            <KpiCard rotulo="Resultado" valor={<span data-testid="total-resultado"><Valor centavos={totais.resultado} texto={formatarMoeda(totais.resultado)} /></span>} />
          </div>

          {estado.transacoes.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma transação registrada"
              acao={!criando ? <Botao onClick={() => setCriando(true)}>Adicione sua primeira transação</Botao> : undefined}
            >
              Registre receitas e despesas para acompanhar seu dinheiro.
            </EstadoVazio>
          ) : filtradas.length === 0 ? (
            <EstadoVazio titulo="Nenhuma transação encontrada">Ajuste ou limpe os filtros para ver mais resultados.</EstadoVazio>
          ) : (
            <Cartao>
              <p className="transacoes__contagem" aria-live="polite">
                {filtradas.length} {filtradas.length === 1 ? 'transação' : 'transações'}
              </p>
              <label className="transacoes__selecionar-todas">
                <input type="checkbox" checked={todasMarcadas} onChange={() => setMarcadas(todasMarcadas ? new Set() : new Set(filtradas.map((t) => t.id)))} />
                Selecionar todas
              </label>
              {selecao.size > 0 ? (
                <BarraLote resumo={resumoLote} onAcao={setAcaoLote} onExcluir={() => setExcluindoLote(true)} onLimpar={() => setMarcadas(new Set())} />
              ) : null}
              <ul className="transacoes__lista" aria-label="Lista de transações">
                {visiveis.map((t, i) => {
                  const novoDia = i === 0 || visiveis[i - 1].data !== t.data;
                  const cabecalhoDia = novoDia ? (
                    <li key={`dia-${t.data}`} className="transacoes__dia" aria-hidden="true">
                      {formatarData(t.data)}
                    </li>
                  ) : null;
                  if (editandoId === t.id) {
                    return (
                      <Fragment key={t.id}>{cabecalhoDia}<li className="transacoes__linha transacoes__linha--edicao">
                        <TransacaoForm
                          estado={estado}
                          inicial={t}
                          onCancelar={() => setEditandoId(null)}
                          onSalvar={(dados) => {
                            const r = store.aplicar((s) => editarTransacao(s, t.id, dados));
                            if (r.ok) {
                              setEditandoId(null);
                              sucesso('Transação atualizada.', true);
                            }
                            return r;
                          }}
                        />
                      </li></Fragment>
                    );
                  }
                  const cat = categoria.get(t.categoriaId);
                  const efeito = efeitoTransacao(t);
                  const rotulo = t.descricao || cat?.nome || 'Sem descrição';
                  return (
                    <Fragment key={t.id}>
                    {cabecalhoDia}
                    <li className="transacoes__linha">
                      <input type="checkbox" className="transacoes__marcar" aria-label={`Selecionar ${rotulo}`} checked={selecao.has(t.id)} onChange={() => alternar(t.id)} />
                      <div className="transacoes__info">
                        <p className="transacoes__descricao">{rotulo}</p>
                        <p className="transacoes__meta">
                          {formatarData(t.data)} · {cat ? nomeCompleto(estado.categorias, cat.id) : 'Sem categoria'}
                          {cat?.arquivada ? ' (arquivada)' : ''} · {nomeConta.get(t.contaId) ?? 'Conta removida'}
                        </p>
                        {t.tags?.length ? <p className="transacoes__meta">Tags: {formatarTags(t.tags)}</p> : null}
                      </div>
                      <div className="transacoes__acoes">
                        <Valor centavos={efeito} texto={`${efeito > 0 ? '+' : ''}${formatarMoeda(efeito)}`} />
                        <Botao variante="secundario" aria-label={`Editar ${rotulo}`} onClick={() => { setEditandoId(t.id); setCriando(false); }}>
                          Editar
                        </Botao>
                        <Botao variante="perigo" aria-label={`Excluir ${rotulo}`} onClick={() => setExcluindo(t)}>
                          Excluir
                        </Botao>
                      </div>
                    </li>
                    </Fragment>
                  );
                })}
              </ul>
              {filtradas.length > visiveis.length ? (
                <div className="transacoes__mais">
                  <Botao variante="secundario" onClick={() => setLimite((l) => l + TAMANHO_PAGINA)}>
                    Mostrar mais ({filtradas.length - visiveis.length} restantes)
                  </Botao>
                </div>
              ) : null}
            </Cartao>
          )}
    </div>
  );

  return (
    <div>
      <TituloPagina
        descricao="Receitas e despesas de todas as contas, com busca, filtros, categorias e edição em lote."
        acoes={aba === 'transacoes' ? <Botao onClick={abrirCriacao}>Nova transação</Botao> : undefined}
      >
        Transações
      </TituloPagina>

      <Tabs
        rotulo="Seções"
        valor={aba}
        aoMudar={(id) => setAba(id as Aba)}
        abas={[
          { id: 'transacoes', rotulo: 'Transações', conteudo: painelTransacoes },
          { id: 'categorias', rotulo: 'Categorias', conteudo: <CategoriasPanel /> },
        ]}
      />

      <Drawer aberto={acaoLote !== null} titulo={acaoLote ? ROTULO_ACAO_LOTE[acaoLote] : ''} onFechar={() => setAcaoLote(null)}>
        {acaoLote ? <LoteForm key={acaoLote} acao={acaoLote} estado={estado} onAplicar={(alteracao) => executarLote((s) => aplicarLote(s, selecao, alteracao))} onCancelar={() => setAcaoLote(null)} /> : null}
      </Drawer>
      {excluindoLote ? (
        <ConfirmDialog
          titulo="Excluir transações selecionadas?"
          mensagem={`Excluir ${selecao.size} ${selecao.size === 1 ? 'transação' : 'transações'}? Você poderá desfazer com o botão Desfazer no topo ou Ctrl+Z.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindoLote(false)}
          onConfirmar={confirmarExclusaoLote}
        />
      ) : null}
      {excluindo?.parcela ? (
        <ExclusaoParcelaDialog
          transacao={excluindo}
          onCancelar={() => setExcluindo(null)}
          onEscolher={(escopo) => {
            const alvo = excluindo;
            executar((s) => excluirParcela(s, alvo.id, escopo), escopo === 'uma' ? 'Parcela excluída.' : 'Compra parcelada excluída.');
            setExcluindo(null);
          }}
        />
      ) : null}
      {excluindo && !excluindo.parcela ? (
        <ConfirmDialog
          titulo="Excluir transação?"
          mensagem={`Excluir "${excluindo.descricao || 'transação'}" de ${formatarData(excluindo.data)}? Você poderá desfazer com o botão Desfazer no topo ou Ctrl+Z.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            const alvo = excluindo;
            executar((s) => excluirTransacao(s, alvo.id), 'Transação excluída.');
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
