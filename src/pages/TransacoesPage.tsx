import { useEffect, useMemo, useState } from 'react';
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
  restaurarTransacao,
  totaisTransacoes,
  type FiltrosTransacoes,
} from '../domain/transacoes';
import type { Transacao } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './TransacoesPage.css';

const TAMANHO_PAGINA = 50;
const TEMPO_DESFAZER_MS = 8000;

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
  const [removida, setRemovida] = useState<Transacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!removida) return;
    const timer = setTimeout(() => setRemovida(null), TEMPO_DESFAZER_MS);
    return () => clearTimeout(timer);
  }, [removida]);

  const filtradas = useMemo(() => ordenarTransacoes(filtrarTransacoes(estado.transacoes, filtros)), [estado.transacoes, filtros]);
  const totais = useMemo(() => totaisTransacoes(filtradas), [filtradas]);
  const nomeConta = useMemo(() => new Map(estado.contas.map((c) => [c.id, c.nome])), [estado.contas]);
  const categoria = useMemo(() => new Map(estado.categorias.map((c) => [c.id, c])), [estado.categorias]);
  const visiveis = filtradas.slice(0, limite);

  const mudarFiltros = (f: FiltrosTransacoes) => {
    setFiltros(f);
    setLimite(TAMANHO_PAGINA);
  };

  const desfazer = () => {
    if (!removida) return;
    const r = store.aplicar((s) => restaurarTransacao(s, removida));
    setErro(r.ok ? null : r.erro);
    setRemovida(null);
  };

  const abaClasse = (a: Aba) =>
    `transacoes__aba${aba === a ? ' transacoes__aba--ativa' : ''}`;

  return (
    <div>
      <TituloPagina
        acoes={aba === 'transacoes' && !criando ? <Botao onClick={() => { setCriando(true); setEditandoId(null); }}>Nova transação</Botao> : undefined}
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
          {removida ? (
            <Alerta tipo="aviso">
              <span className="transacoes__desfazer">
                Transação excluída.
                <Botao variante="secundario" onClick={desfazer}>
                  Desfazer
                </Botao>
              </span>
            </Alerta>
          ) : null}

          {criando ? (
            <Cartao titulo="Nova transação">
              <TransacaoForm
                estado={estado}
                onCancelar={() => setCriando(false)}
                onSalvar={(dados) => {
                  const r = store.aplicar((s) => criarTransacao(s, dados));
                  if (r.ok) setCriando(false);
                  return r;
                }}
              />
            </Cartao>
          ) : null}

          <Cartao titulo="Filtros">
            <FiltrosTransacoesForm estado={estado} filtros={filtros} onChange={mudarFiltros} onLimpar={() => mudarFiltros(filtrosPadrao())} />
          </Cartao>

          <div className="transacoes__totais" aria-label="Totais do filtro" role="group">
            <Cartao>
              <p className="transacoes__rotulo-total">Receitas</p>
              <p className="transacoes__total" data-testid="total-receitas">{formatarMoeda(totais.receitas)}</p>
            </Cartao>
            <Cartao>
              <p className="transacoes__rotulo-total">Despesas</p>
              <p className="transacoes__total" data-testid="total-despesas">{formatarMoeda(totais.despesas)}</p>
            </Cartao>
            <Cartao>
              <p className="transacoes__rotulo-total">Resultado</p>
              <p className="transacoes__total" data-testid="total-resultado">
                <Valor centavos={totais.resultado} texto={formatarMoeda(totais.resultado)} />
              </p>
            </Cartao>
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
                {visiveis.map((t) => {
                  if (editandoId === t.id) {
                    return (
                      <li key={t.id} className="transacoes__linha transacoes__linha--edicao">
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
                      </li>
                    );
                  }
                  const cat = categoria.get(t.categoriaId);
                  const efeito = efeitoTransacao(t);
                  const rotulo = t.descricao || cat?.nome || 'Sem descrição';
                  return (
                    <li key={t.id} className="transacoes__linha">
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
            if (r.ok) {
              setRemovida(escopo === 'uma' ? alvo : null);
              setErro(null);
            } else setErro(r.erro);
            setExcluindo(null);
          }}
        />
      ) : null}
      {excluindo && !excluindo.parcela ? (
        <ConfirmDialog
          titulo="Excluir transação?"
          mensagem={`Excluir "${excluindo.descricao || 'transação'}" de ${formatarData(excluindo.data)}? Você poderá desfazer por alguns segundos.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            const alvo = excluindo;
            const r = store.aplicar((s) => excluirTransacao(s, alvo.id));
            if (r.ok) {
              setRemovida(alvo);
              setErro(null);
            } else setErro(r.erro);
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
