import { useMemo, useState } from 'react';
import { Alerta, Botao, Cartao, EstadoVazio, TituloPagina, Valor } from '../components/ui';
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
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<Conta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const saldos = useMemo(() => saldosPorConta(estado), [estado]);
  const total = useMemo(() => saldoTotal(estado), [estado]);
  const ativas = ordenarContas(estado.contas.filter((c) => !c.arquivada));
  const arquivadas = ordenarContas(estado.contas.filter((c) => c.arquivada));

  const executar = (op: Parameters<typeof store.aplicar>[0]) => {
    const r = store.aplicar(op);
    setErro(r.ok ? null : r.erro);
    return r;
  };

  const linha = (conta: Conta) => {
    const saldo = saldos.get(conta.id) ?? 0;
    const temTransacoes = contaTemTransacoes(estado, conta.id);
    if (editandoId === conta.id) {
      return (
        <li key={conta.id} className="contas__linha contas__linha--edicao">
          <ContaForm
            inicial={conta}
            onCancelar={() => setEditandoId(null)}
            onSalvar={(dados: DadosConta) => {
              const r = store.aplicar((s) => editarConta(s, conta.id, dados));
              if (r.ok) setEditandoId(null);
              return r;
            }}
          />
        </li>
      );
    }
    return (
      <li key={conta.id} className="contas__linha">
        <div className="contas__info">
          <p className="contas__nome">{conta.nome}</p>
          <p className="contas__tipo">{ROTULO_TIPO_CONTA[conta.tipo]}</p>
        </div>
        <div className="contas__acoes">
          <Valor centavos={saldo} texto={formatarMoeda(saldo)} />
          <Botao variante="secundario" aria-label={`Editar ${conta.nome}`} onClick={() => setEditandoId(conta.id)}>
            Editar
          </Botao>
          {conta.arquivada ? (
            <Botao variante="secundario" aria-label={`Reativar ${conta.nome}`} onClick={() => executar((s) => reativarConta(s, conta.id))}>
              Reativar
            </Botao>
          ) : (
            <Botao variante="secundario" aria-label={`Arquivar ${conta.nome}`} onClick={() => executar((s) => arquivarConta(s, conta.id))}>
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
      <TituloPagina acoes={!criando ? <Botao onClick={() => setCriando(true)}>Nova conta</Botao> : undefined}>Contas</TituloPagina>
      <div className="contas__pilha">
        {erro ? <Alerta>{erro}</Alerta> : null}
        {criando ? (
          <Cartao titulo="Nova conta">
            <ContaForm
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarConta(s, dados));
                if (r.ok) setCriando(false);
                return r;
              }}
            />
          </Cartao>
        ) : null}

        {ativas.length === 0 && !criando ? (
          <EstadoVazio titulo="Nenhuma conta ainda" acao={<Botao onClick={() => setCriando(true)}>Crie sua primeira conta</Botao>}>
            Contas são os lugares onde seu dinheiro está: banco, carteira, cartão. Toda transação pertence a uma conta.
          </EstadoVazio>
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
            <Cartao titulo="Contas ativas">
              <ul className="contas__lista">{ativas.map(linha)}</ul>
            </Cartao>
          </>
        ) : null}

        {arquivadas.length > 0 ? (
          <Cartao titulo="Contas arquivadas">
            <ul className="contas__lista">{arquivadas.map(linha)}</ul>
          </Cartao>
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
            executar((s) => excluirConta(s, excluindo.id));
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
