import { useMemo, useState } from 'react';
import { AssinaturaForm } from '../components/assinaturas/AssinaturaForm';
import { AssinaturaItem } from '../components/assinaturas/AssinaturaItem';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import {
  cancelarAssinatura,
  criarAssinaturaManual,
  decidirAssinatura,
  desfazerDecisao,
  excluirAssinaturaManual,
  listarAssinaturas,
  reativarAssinatura,
  totaisAssinaturas,
  type ItemAssinatura,
} from '../domain/assinaturas';
import { hojeISO } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { AppState, Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './Assinaturas.css';

type Acao = { tipo: 'cancelar' | 'excluir'; item: ItemAssinatura };

export function AssinaturasPage() {
  const store = useStore();
  const estado = useEstado();
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<Acao | null>(null);

  const itens = useMemo(() => listarAssinaturas(estado, hojeISO()), [estado]);
  const totais = totaisAssinaturas(itens);
  const por = (s: ItemAssinatura['situacao']) => itens.filter((i) => i.situacao === s);

  const executar = (op: (s: AppState) => Resultado<AppState>) => {
    const r = store.aplicar(op);
    setErro(r.ok ? null : r.erro);
    return r;
  };

  const linha = (i: ItemAssinatura) => (
    <AssinaturaItem
      key={i.chave}
      item={i}
      onConfirmar={() => executar((s) => decidirAssinatura(s, i.chave, 'confirmada'))}
      onIgnorar={() => executar((s) => decidirAssinatura(s, i.chave, 'ignorada'))}
      onDesfazer={() => executar((s) => desfazerDecisao(s, i.chave))}
      onCancelar={() => setAcao({ tipo: 'cancelar', item: i })}
      onReativar={() => executar((s) => reativarAssinatura(s, i.chave))}
      onExcluir={() => setAcao({ tipo: 'excluir', item: i })}
    />
  );

  const confirmarAcao = () => {
    if (!acao) return;
    const { tipo, item } = acao;
    executar((s) => (tipo === 'cancelar' ? cancelarAssinatura(s, item.chave, hojeISO()) : excluirAssinaturaManual(s, item.chave)));
    setAcao(null);
  };

  const secao = (titulo: string, lista: ItemAssinatura[]) =>
    lista.length > 0 ? (
      <Cartao titulo={titulo}>
        <ul className="assin-lista">{lista.map(linha)}</ul>
      </Cartao>
    ) : null;

  return (
    <div className="assin-pagina">
      <TituloPagina acoes={!criando ? <Botao onClick={() => setCriando(true)}>Nova assinatura</Botao> : undefined}>Assinaturas</TituloPagina>
      <p className="assin-intro">
        Cobranças recorrentes encontradas no seu histórico de despesas (mínimo de 3 ocorrências seguidas). Confirme as que são assinaturas e ignore as demais.
      </p>
      {erro ? <Alerta>{erro}</Alerta> : null}

      {criando ? (
        <Cartao titulo="Nova assinatura">
          <AssinaturaForm
            onCancelar={() => setCriando(false)}
            onSalvar={(dados) => {
              const r = executar((s) => criarAssinaturaManual(s, dados));
              if (r.ok) setCriando(false);
              return r.ok ? { ok: true } : { ok: false, erro: r.erro };
            }}
          />
        </Cartao>
      ) : null}

      <Cartao titulo="Resumo">
        <dl className="assin-resumo">
          <div className="assin-resumo__item">
            <dt>Total mensal</dt>
            <dd data-testid="total-mensal">{formatarMoeda(totais.mensal)}</dd>
          </div>
          <div className="assin-resumo__item">
            <dt>Total anual</dt>
            <dd data-testid="total-anual">{formatarMoeda(totais.anual)}</dd>
          </div>
          <div className="assin-resumo__item">
            <dt>Assinaturas ativas</dt>
            <dd>{totais.ativas}</dd>
          </div>
          <div className="assin-resumo__item">
            <dt>A revisar</dt>
            <dd>{totais.pendentes}</dd>
          </div>
          <div className="assin-resumo__item">
            <dt>Economia anual</dt>
            <dd data-testid="economia-anual">{formatarMoeda(totais.economiaAnual)}</dd>
          </div>
        </dl>
      </Cartao>

      {itens.length === 0 ? (
        <EstadoVazio titulo="Nenhuma assinatura encontrada" acao={<Botao onClick={() => setCriando(true)}>Cadastrar assinatura</Botao>}>
          Quando houver ao menos 3 cobranças parecidas, semanais, mensais ou anuais, elas aparecem aqui para você revisar. Você também pode cadastrar uma manualmente.
        </EstadoVazio>
      ) : (
        <>
          {secao('A revisar', por('pendente'))}
          {secao('Ativas', por('confirmada'))}
          {secao('Canceladas', por('cancelada'))}
          {por('ignorada').length > 0 ? (
            <Cartao>
              <details className="assin-recolhida">
                <summary>Ignoradas ({por('ignorada').length})</summary>
                <ul className="assin-lista">{por('ignorada').map(linha)}</ul>
              </details>
            </Cartao>
          ) : null}
        </>
      )}

      {acao ? (
        <ConfirmDialog
          titulo={acao.tipo === 'cancelar' ? 'Marcar como cancelada' : 'Excluir assinatura'}
          mensagem={
            acao.tipo === 'cancelar'
              ? `Marcar "${acao.item.descricao}" como cancelada? Ela sai do total e economiza ${formatarMoeda(acao.item.custoAnual)} por ano.`
              : `Excluir a assinatura manual "${acao.item.descricao}"?`
          }
          rotuloConfirmar={acao.tipo === 'cancelar' ? 'Marcar como cancelada' : 'Excluir'}
          perigo={acao.tipo === 'excluir'}
          onConfirmar={confirmarAcao}
          onCancelar={() => setAcao(null)}
        />
      ) : null}
    </div>
  );
}
