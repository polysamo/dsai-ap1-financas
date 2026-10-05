import { useCallback, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetalheEvento } from '../components/eventos/DetalheEvento';
import { EventoForm } from '../components/eventos/EventoForm';
import { Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { Badge, type TomBadge } from '../ds/Badge';
import { useAtalhoNovo } from '../lib/atalhos';
import { useFeedback } from '../state/useFeedback';
import { formatarData, hojeISO } from '../domain/date';
import {
  criarEvento,
  despesasSemTag,
  editarEvento,
  etiquetarPeriodo,
  excluirEvento,
  listaEventos,
  resumoEvento,
  separarEventos,
  ROTULO_SITUACAO_EVENTO,
  type Evento,
  type SituacaoEvento,
} from '../domain/eventos';
import { mensagemLote } from '../domain/lote';
import { formatarMoeda, formatarPercentual } from '../domain/money';
import { ok, type Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import '../components/eventos/eventos.css';

const TOM_SITUACAO: Record<SituacaoEvento, TomBadge> = { dentro: 'sucesso', atencao: 'aviso', estourado: 'perigo' };

type Confirmacao = { tipo: 'excluir' | 'etiquetar'; evento: Evento };

export function EventosPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const eventos = listaEventos(estado);
  const { ativos, encerrados } = separarEventos(eventos, hoje);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState<Confirmacao | null>(null);
  const { sucesso, erro } = useFeedback();

  /** Leva o foco ao primeiro campo do formulário de novo evento. */
  const irParaFormulario = useCallback(() => {
    setEditando(false);
    document.querySelector<HTMLInputElement>('form[aria-label="Novo evento"] input')?.focus();
  }, []);
  useAtalhoNovo(irParaFormulario);

  const selecionado = eventos.find((e) => e.id === selecionadoId) ?? ativos[0] ?? encerrados[0] ?? null;

  const salvar = (dados: Parameters<typeof criarEvento>[1]): Resultado<void> => {
    const alvo = editando ? selecionado : null;
    const r = store.aplicar((s) => (alvo ? editarEvento(s, alvo.id, dados) : criarEvento(s, dados)));
    if (!r.ok) return r;
    sucesso(alvo ? 'Evento atualizado.' : 'Evento criado.', true);
    setEditando(false);
    if (!alvo) setSelecionadoId(listaEventos(store.getSnapshot().estado).at(-1)?.id ?? null);
    return ok(undefined);
  };

  const confirmar = () => {
    if (!confirmando) return;
    const { tipo, evento } = confirmando;
    if (tipo === 'excluir') {
      const r = store.aplicar((s) => excluirEvento(s, evento.id));
      if (r.ok) sucesso('Evento excluído. As transações e as tags continuam como estavam.', true);
      else erro(r.erro);
      setSelecionadoId(null);
    } else {
      let mensagem = '';
      const r = store.aplicar((s) => {
        const lote = etiquetarPeriodo(s, evento.id);
        if (!lote.ok) return lote;
        mensagem = mensagemLote(lote.valor, 'etiquetada');
        return ok(lote.valor.estado);
      });
      if (r.ok) sucesso(mensagem, true);
      else erro(r.erro);
    }
    setConfirmando(null);
  };

  const itemLista = (e: Evento) => {
    const r = resumoEvento(estado, e, hoje);
    return (
      <li key={e.id}>
        <button type="button" className={`eventos-item${selecionado?.id === e.id ? ' eventos-item--ativo' : ''}`} aria-pressed={selecionado?.id === e.id} onClick={() => { setSelecionadoId(e.id); setEditando(false); }}>
          <span className="eventos-item__nome">{e.nome}</span>
          <Badge tom={TOM_SITUACAO[r.situacao]}>{ROTULO_SITUACAO_EVENTO[r.situacao]}</Badge>
          <span className="eventos-item__meta">
            {formatarData(e.inicio)} a {formatarData(e.fim)} · {formatarMoeda(r.gasto)} de {formatarMoeda(e.orcamento)} ({formatarPercentual(r.percentual)})
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="eventos-pagina">
      <TituloPagina descricao="Acompanhe viagens, festas e reformas: toda despesa com a tag do evento conta no orçamento dele." acoes={<Botao onClick={irParaFormulario}>Novo evento</Botao>}>
        Eventos e viagens
      </TituloPagina>

      <Cartao titulo={editando && selecionado ? `Editar ${selecionado.nome}` : 'Novo evento'}>
        <EventoForm key={editando && selecionado ? selecionado.id : 'novo'} inicial={editando && selecionado ? selecionado : undefined} onSalvar={salvar} onCancelar={editando ? () => setEditando(false) : undefined} />
      </Cartao>

      {eventos.length === 0 ? (
        <EstadoVazio titulo="Nenhum evento cadastrado" acao={<Botao onClick={irParaFormulario}>Criar meu primeiro evento</Botao>}>
          Crie um evento (uma viagem, uma festa, uma reforma) com orçamento e uma tag. Toda despesa com essa tag conta no evento, em qualquer mês e categoria.
        </EstadoVazio>
      ) : (
        <div className="eventos-colunas">
          <nav aria-label="Eventos" className="eventos-lista">
            {ativos.length ? (
              <section aria-label="Em andamento e futuros">
                <h2 className="eventos-lista__titulo">Em andamento e futuros</h2>
                <ul>{ativos.map(itemLista)}</ul>
              </section>
            ) : null}
            {encerrados.length ? (
              <section aria-label="Encerrados">
                <h2 className="eventos-lista__titulo">Encerrados</h2>
                <ul>{encerrados.map(itemLista)}</ul>
              </section>
            ) : null}
          </nav>
          {selecionado ? (
            <Cartao titulo={selecionado.nome}>
              <DetalheEvento
                evento={selecionado}
                resumo={resumoEvento(estado, selecionado, hoje)}
                semTag={despesasSemTag(estado.transacoes, selecionado).length}
                onEtiquetar={() => setConfirmando({ tipo: 'etiquetar', evento: selecionado })}
                onEditar={() => setEditando(true)}
                onExcluir={() => setConfirmando({ tipo: 'excluir', evento: selecionado })}
              />
            </Cartao>
          ) : null}
        </div>
      )}

      {confirmando ? (
        <ConfirmDialog
          titulo={confirmando.tipo === 'excluir' ? 'Excluir evento' : 'Etiquetar despesas'}
          mensagem={
            confirmando.tipo === 'excluir'
              ? `Excluir "${confirmando.evento.nome}"? As transações e as tags não mudam.`
              : `Adicionar #${confirmando.evento.tag} a ${despesasSemTag(estado.transacoes, confirmando.evento).length} despesas entre ${formatarData(confirmando.evento.inicio)} e ${formatarData(confirmando.evento.fim)}?`
          }
          rotuloConfirmar={confirmando.tipo === 'excluir' ? 'Excluir' : 'Etiquetar'}
          perigo={confirmando.tipo === 'excluir'}
          onCancelar={() => setConfirmando(null)}
          onConfirmar={confirmar}
        />
      ) : null}
    </div>
  );
}
