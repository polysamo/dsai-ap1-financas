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
        <li key={conta.id} className="py-3">
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
      <li key={conta.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{conta.nome}</p>
          <p className="text-xs text-slate-600">{ROTULO_TIPO_CONTA[conta.tipo]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      <div className="space-y-4">
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
              <p className="text-2xl font-bold">
                <Valor centavos={total.total} texto={formatarMoeda(total.total)} data-testid="saldo-total" />
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-600">Contas</dt>
                  <dd data-testid="saldo-contas">{formatarMoeda(total.contas)}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">Cartões (fatura em aberto)</dt>
                  <dd data-testid="saldo-cartoes">{formatarMoeda(total.cartoes)}</dd>
                </div>
              </dl>
            </Cartao>
            <Cartao titulo="Contas ativas">
              <ul className="divide-y divide-slate-200">{ativas.map(linha)}</ul>
            </Cartao>
          </>
        ) : null}

        {arquivadas.length > 0 ? (
          <Cartao titulo="Contas arquivadas">
            <ul className="divide-y divide-slate-200">{arquivadas.map(linha)}</ul>
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
