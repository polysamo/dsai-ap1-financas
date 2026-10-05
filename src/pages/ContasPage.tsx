import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Botao, Cartao, TituloPagina, Valor } from '../components/ui';
import { Badge } from '../ds/Badge';
import { useAtalhoNovo } from '../lib/atalhos';
import { useFeedback } from '../state/useFeedback';
import { Drawer } from '../ds/Drawer';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContaForm } from '../components/ContaForm';
import {
  ROTULO_TIPO_CONTA,
  arquivarConta,
  contaTemTransacoes,
  criarConta,
  editarConta,
  excluirConta,
  ordenarContas,
  reativarConta,
  saldoTotal,
  saldosPorConta,
  type DadosConta,
} from '../domain/contas';
import { formatarMoeda } from '../domain/money';
import type { Conta } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import './ContasPage.css';

export function ContasPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [criandoLocal, setCriando] = useState(false);
  const tipoNovo = params.get('novo') === 'cartao' ? 'cartao' : undefined;
  const criando = criandoLocal || params.get('novo') !== null;
  const fecharCriacao = () => {
    setCriando(false);
    if (params.has('novo')) setParams({}, { replace: true });
  };
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Conta | null>(null);
  const { executar, sucesso } = useFeedback();
  const abrirCriacao = useCallback(() => setCriando(true), []);
  useAtalhoNovo(abrirCriacao);

  const saldos = useMemo(() => saldosPorConta(estado), [estado]);
  const total = useMemo(() => saldoTotal(estado), [estado]);
  const editando = estado.contas.find((c) => c.id === editandoId);
  const ativas = ordenarContas(estado.contas.filter((c) => !c.arquivada));
  const arquivadas = ordenarContas(estado.contas.filter((c) => c.arquivada));

  const linha = (conta: Conta) => {
    const saldo = saldos.get(conta.id) ?? 0;
    const temTransacoes = contaTemTransacoes(estado, conta.id);
    return (
      <li key={conta.id} className="contas__card" data-testid="conta-card">
        <div className="contas__info">
          <p className="contas__nome">{conta.nome}</p>
          <p className="contas__tipo">
            {ROTULO_TIPO_CONTA[conta.tipo]}{' '}
            {conta.arquivada ? <Badge tom="neutro">Arquivada</Badge> : conta.tipo === 'cartao' ? <Badge tom="info">Cartão</Badge> : null}
          </p>
        </div>
        <p className="contas__saldo">
          <Valor centavos={saldo} texto={formatarMoeda(saldo)} />
        </p>
        <div className="contas__acoes">
          <Botao variante="secundario" aria-label={`Editar ${conta.nome}`} onClick={() => setEditandoId(conta.id)}>
            Editar
          </Botao>
          {conta.arquivada ? (
            <Botao variante="secundario" aria-label={`Reativar ${conta.nome}`} onClick={() => executar((s) => reativarConta(s, conta.id), 'Conta reativada.')}>
              Reativar
            </Botao>
          ) : (
            <Botao variante="secundario" aria-label={`Arquivar ${conta.nome}`} onClick={() => executar((s) => arquivarConta(s, conta.id), 'Conta arquivada.')}>
              Arquivar
            </Botao>
          )}
          {!temTransacoes ? (
            <Botao variante="perigo" aria-label={`Excluir ${conta.nome}`} onClick={() => setExcluindo(conta)}>
              Excluir
            </Botao>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div>
      <TituloPagina descricao="Onde seu dinheiro está: bancos, carteira, cartões e investimentos. O saldo é sempre calculado pelas transações." acoes={<Botao onClick={() => setCriando(true)}>Nova conta</Botao>}>
        Contas
      </TituloPagina>
      <div className="contas__pilha">
        <Drawer aberto={criando} titulo="Nova conta" onFechar={fecharCriacao}>
          <ContaForm
            tipoInicial={tipoNovo}
            onCancelar={fecharCriacao}
            onSalvar={(dados) => {
              const r = store.aplicar((s) => criarConta(s, dados));
              if (r.ok) {
                fecharCriacao();
                sucesso('Conta criada.', true);
              }
              return r;
            }}
          />
        </Drawer>
        <Drawer aberto={editando !== undefined} titulo="Editar conta" onFechar={() => setEditandoId(null)}>
          {editando ? (
            <ContaForm
              inicial={editando}
              onCancelar={() => setEditandoId(null)}
              onSalvar={(dados: DadosConta) => {
                const r = store.aplicar((s) => editarConta(s, editando.id, dados));
                if (r.ok) {
                  setEditandoId(null);
                  sucesso('Conta atualizada.', true);
                }
                return r;
              }}
            />
          ) : null}
        </Drawer>

        {ativas.length === 0 ? (
          <EmptyState titulo="Nenhuma conta ainda" descricao="Contas são onde seu dinheiro está: banco, carteira, cartão. Toda transação pertence a uma conta." acaoRotulo="Crie sua primeira conta" onAcao={() => setCriando(true)} />
        ) : null}

        {ativas.length > 0 ? (
          <>
            <Cartao titulo="Saldo total">
              <p className="contas__total">
                <Valor centavos={total.total} texto={formatarMoeda(total.total)} data-testid="saldo-total" />
              </p>
              <dl className="contas__resumo">
                <div>
                  <dt>Contas</dt>
                  <dd data-testid="saldo-contas">{formatarMoeda(total.contas)}</dd>
                </div>
                <div>
                  <dt>Cartões (fatura em aberto)</dt>
                  <dd data-testid="saldo-cartoes">{formatarMoeda(total.cartoes)}</dd>
                </div>
              </dl>
            </Cartao>
            <ul className="contas__grade" aria-label="Contas ativas">{ativas.map(linha)}</ul>
          </>
        ) : null}

        {arquivadas.length > 0 ? (
          <section aria-labelledby="contas-arq">
            <h2 id="contas-arq" className="contas__sub">Contas arquivadas</h2>
            <ul className="contas__grade">{arquivadas.map(linha)}</ul>
          </section>
        ) : null}
      </div>

      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir conta?"
          mensagem={`A conta "${excluindo.nome}" será excluída definitivamente.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            executar((s) => excluirConta(s, excluindo.id), 'Conta excluída.');
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
