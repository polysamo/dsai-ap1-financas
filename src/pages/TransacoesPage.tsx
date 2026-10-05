import { Fragment, useMemo, useState } from 'react';
import { Drawer, KpiCard } from '../components/novos';
import { CategoriasPanel } from '../components/CategoriasPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExclusaoParcelaDialog } from '../components/ExclusaoParcelaDialog';
import { FiltrosTransacoesForm } from '../components/FiltrosTransacoes';
import { TransacaoForm } from '../components/TransacaoForm';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
import { excluirParcela } from '../domain/cartoes';
import { formatarData, hojeISO, mesDe, primeiroDia, ultimoDia } from '../domain/date';
import { formatarMoeda } from '../domain/money';
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
import type { Transacao } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './TransacoesPage.css';

const TAMANHO_PAGINA = 50;

function filtrosPadrao(): FiltrosTransacoes {
  const mes = mesDe(hojeISO());
  return { de: primeiroDia(mes), ate: ultimoDia(mes) };
}

type Aba = 'transacoes' | 'categorias';

export function TransacoesPage() {
  const store = useStore();
  const estado = useEstado();
  const [aba, setAba] = useState<Aba>('transacoes');
  const [filtros, setFiltros] = useState<FiltrosTransacoes>(filtrosPadrao);
  const [limite, setLimite] = useState(TAMANHO_PAGINA);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Transacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const filtradas = useMemo(() => ordenarTransacoes(filtrarTransacoes(estado.transacoes, filtros)), [estado.transacoes, filtros]);
  const totais = useMemo(() => totaisTransacoes(filtradas), [filtradas]);
  const nomeConta = useMemo(() => new Map(estado.contas.map((c) => [c.id, c.nome])), [estado.contas]);
  const categoria = useMemo(() => new Map(estado.categorias.map((c) => [c.id, c])), [estado.categorias]);
  const visiveis = filtradas.slice(0, limite);

  const mudarFiltros = (f: FiltrosTransacoes) => {
    setFiltros(f);
    setLimite(TAMANHO_PAGINA);
  };

  const abaClasse = (a: Aba) =>
    `transacoes__aba${aba === a ? ' transacoes__aba--ativa' : ''}`;

  return (
    <div>
      <TituloPagina
        acoes={aba === 'transacoes' ? <Botao onClick={() => { setCriando(true); setEditandoId(null); }}>Nova transação</Botao> : undefined}
      >
        Transações
      </TituloPagina>

      <div role="tablist" aria-label="Seções" className="transacoes__abas">
        <button role="tab" type="button" id="aba-transacoes" aria-selected={aba === 'transacoes'} aria-controls="painel-transacoes" className={abaClasse('transacoes')} onClick={() => setAba('transacoes')}>
          Transações
        </button>
        <button role="tab" type="button" id="aba-categorias" aria-selected={aba === 'categorias'} aria-controls="painel-categorias" className={abaClasse('categorias')} onClick={() => setAba('categorias')}>
          Categorias
        </button>
      </div>

      {aba === 'categorias' ? (
        <div role="tabpanel" id="painel-categorias" aria-labelledby="aba-categorias">
          <CategoriasPanel />
        </div>
      ) : (
        <div role="tabpanel" id="painel-transacoes" aria-labelledby="aba-transacoes" className="transacoes__painel">
          {erro ? <Alerta>{erro}</Alerta> : null}

          <Drawer aberto={criando} titulo="Nova transação" onFechar={() => setCriando(false)}>
              <TransacaoForm
                estado={estado}
                onCancelar={() => setCriando(false)}
                onSalvar={(dados) => {
                  const r = store.aplicar((s) => criarTransacao(s, dados));
                  if (r.ok) setCriando(false);
                  return r;
                }}
              />
          </Drawer>

          <details className="transacoes__filtros">
            <summary>Filtros</summary>
            <FiltrosTransacoesForm estado={estado} filtros={filtros} onChange={mudarFiltros} onLimpar={() => mudarFiltros(filtrosPadrao())} />
          </details>

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
                            if (r.ok) setEditandoId(null);
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
                      <div className="transacoes__info">
                        <p className="transacoes__descricao">{rotulo}</p>
                        <p className="transacoes__meta">
                          {formatarData(t.data)} · {cat?.nome ?? 'Sem categoria'}
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
      )}

      {excluindo?.parcela ? (
        <ExclusaoParcelaDialog
          transacao={excluindo}
          onCancelar={() => setExcluindo(null)}
          onEscolher={(escopo) => {
            const alvo = excluindo;
            const r = store.aplicar((s) => excluirParcela(s, alvo.id, escopo));
            setErro(r.ok ? null : r.erro);
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
            const r = store.aplicar((s) => excluirTransacao(s, alvo.id));
            setErro(r.ok ? null : r.erro);
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
