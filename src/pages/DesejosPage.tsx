import { useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CartaoDesejo } from '../components/desejos/CartaoDesejo';
import { DesejoForm } from '../components/desejos/DesejoForm';
import { KpiCard } from '../components/novos';
import { Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { useAtalhoNovo } from '../lib/atalhos';
import { useFeedback } from '../state/useFeedback';
import { formatarData, hojeISO } from '../domain/date';
import {
  analisarDesejo,
  comprarDesejo,
  criarDesejo,
  desistirDesejo,
  editarDesejo,
  excluirDesejo,
  listaDesejos,
  metaDoDesejo,
  ordenarAtivos,
  ROTULO_SITUACAO_DESEJO,
  totaisDesejos,
  type Desejo,
} from '../domain/desejos';
import { formatarMoeda } from '../domain/money';
import { ok, type AppState, type Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import '../components/desejos/desejos.css';

export function DesejosPage() {
  const store = useStore();
  const estado = useEstado();
  const hoje = hojeISO();
  const [editando, setEditando] = useState<Desejo | null>(null);
  const [excluindo, setExcluindo] = useState<Desejo | null>(null);
  const feedback = useFeedback();

  /** Leva o foco ao primeiro campo do formulário de novo desejo. */
  const irParaFormulario = useCallback(() => {
    setEditando(null);
    document.querySelector<HTMLInputElement>('form[aria-label="Novo desejo"] input')?.focus();
  }, []);
  useAtalhoNovo(irParaFormulario);

  const desejos = listaDesejos(estado);
  const ativos = useMemo(() => ordenarAtivos(desejos), [desejos]);
  const concluidos = desejos.filter((d) => d.situacao !== 'ativo').sort((a, b) => (b.concluidoEm ?? '').localeCompare(a.concluidoEm ?? ''));
  const totais = totaisDesejos(desejos);

  /** Para formulários: o erro volta para o campo, então só o sucesso vira notificação. */
  const aplicarEmFormulario = (operacao: (s: AppState) => Resultado<AppState>, mensagem: string): Resultado<void> => {
    const r = store.aplicar(operacao);
    if (r.ok) feedback.sucesso(mensagem, true);
    return r.ok ? ok(undefined) : r;
  };
  const { executar } = feedback;

  return (
    <div className="desejos-pagina">
      <TituloPagina descricao="Anote o que quer comprar, espere e veja se a compra cabe na reserva, no orçamento e na sobra do mês." acoes={<Botao onClick={irParaFormulario}>Novo desejo</Botao>}>
        Lista de desejos
      </TituloPagina>

      <div className="desejos-totais" role="group" aria-label="Totais da lista">
        <KpiCard rotulo="Total dos desejos ativos" valor={<span data-testid="total-ativos">{formatarMoeda(totais.ativos)}</span>} />
        <KpiCard rotulo="Economia por desistência" tom="receita" valor={<span data-testid="economia">{formatarMoeda(totais.economia)}</span>} />
      </div>

      <Cartao titulo={editando ? `Editar ${editando.nome}` : 'Novo desejo'}>
        <DesejoForm
          key={editando?.id ?? 'novo'}
          categorias={estado.categorias}
          inicial={editando ?? undefined}
          onCancelar={editando ? () => setEditando(null) : undefined}
          onSalvar={(dados) => {
            const r = aplicarEmFormulario((s) => (editando ? editarDesejo(s, editando.id, dados) : criarDesejo(s, dados, hoje)), editando ? 'Desejo atualizado.' : 'Desejo anotado.');
            if (r.ok) setEditando(null);
            return r;
          }}
        />
      </Cartao>

      {ativos.length === 0 ? (
        <EstadoVazio titulo="Nenhum desejo anotado" acao={<Botao onClick={irParaFormulario}>Anotar meu primeiro desejo</Botao>}>
          Anote o que você quer comprar e espere alguns dias antes de decidir: a regra dos 30 dias evita compras por impulso. O app avisa quando a compra cabe na sua reserva, no orçamento e na sobra do mês.
        </EstadoVazio>
      ) : (
        <section aria-label="Desejos ativos" className="desejos-lista">
          {ativos.map((d) => (
            <CartaoDesejo
              key={d.id}
              desejo={d}
              estado={estado}
              analise={analisarDesejo(estado, d, hoje)}
              onComprar={(contaId, data) => aplicarEmFormulario((s) => comprarDesejo(s, d.id, contaId, data), `Compra de ${d.nome} registrada como despesa.`)}
              onDesistir={() => executar((s) => desistirDesejo(s, d.id, hoje), `Você desistiu de ${d.nome}: ${formatarMoeda(d.preco)} economizados.`)}
              onCriarMeta={() => executar((s) => metaDoDesejo(s, d.id, hoje), `Meta "${d.nome}" criada em Metas.`)}
              onEditar={() => setEditando(d)}
              onExcluir={() => setExcluindo(d)}
            />
          ))}
        </section>
      )}

      {concluidos.length > 0 ? (
        <details className="desejos-concluidos">
          <summary>Concluídos ({concluidos.length})</summary>
          <ul aria-label="Desejos concluídos">
            {concluidos.map((d) => (
              <li key={d.id} className="desejos-concluido">
                <span>
                  {d.nome} · {formatarMoeda(d.preco)} · {ROTULO_SITUACAO_DESEJO[d.situacao]} em {formatarData(d.concluidoEm ?? d.criadoEm)}
                </span>
                <Botao variante="link" aria-label={`Excluir ${d.nome}`} onClick={() => setExcluindo(d)}>
                  Excluir
                </Botao>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir desejo"
          mensagem={`Excluir "${excluindo.nome}" da lista?${excluindo.situacao === 'comprado' ? ' A despesa registrada na compra continua em Transações.' : ''}`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            executar((s) => excluirDesejo(s, excluindo.id), 'Desejo excluído.');
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
