import { useState } from 'react';
import { formatarData } from '../../domain/date';
import {
  desempenhoAtivo,
  excluirAtivo,
  excluirMarcacao,
  excluirMovimento,
  registrarMarcacao,
  registrarMovimento,
  rotuloClasse,
} from '../../domain/investimentos';
import { formatarMoeda } from '../../domain/money';
import type { AppState, Ativo } from '../../domain/types';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { Alerta, Botao, Cartao } from '../ui';
import { LancamentoForm } from './LancamentoForm';
import { Rentabilidade } from './Rentabilidade';

type Painel = 'movimento' | 'marcacao' | null;
type Operacao = (estado: AppState) => ReturnType<typeof excluirAtivo>;

export function AtivoCard({ ativo, hoje }: { ativo: Ativo; hoje: string }) {
  const store = useStore();
  const [painel, setPainel] = useState<Painel>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const d = desempenhoAtivo(ativo);

  const aplicar = (op: Operacao) => {
    const r = store.aplicar(op);
    setErro(r.ok ? null : r.erro);
    return r;
  };
  const salvar = (op: Operacao) => {
    const r = store.aplicar(op);
    if (r.ok) {
      setPainel(null);
      setErro(null);
    }
    return r;
  };

  const movimentos = [...ativo.movimentos].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  const marcacoes = [...ativo.marcacoes].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  return (
    <Cartao
      titulo={`${ativo.nome} · ${rotuloClasse(ativo.classe)}`}
      acoes={
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={() => setPainel('movimento')} aria-label={`Registrar movimento de ${ativo.nome}`}>Registrar movimento</Botao>
          <Botao variante="secundario" onClick={() => setPainel('marcacao')} aria-label={`Marcar valor atual de ${ativo.nome}`}>Marcar valor atual</Botao>
          <Botao variante="perigo" onClick={() => setConfirmando(true)} aria-label={`Excluir ativo ${ativo.nome}`}>Excluir</Botao>
        </div>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-3" aria-label={`Desempenho de ${ativo.nome}`}>
        <div>
          <dt className="text-sm text-slate-600">Investido líquido</dt>
          <dd className="font-semibold tabular-nums" data-testid="ativo-investido">{formatarMoeda(d.investido)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Valor atual</dt>
          <dd className="font-semibold tabular-nums" data-testid="ativo-atual">{formatarMoeda(d.valorAtual)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Rentabilidade</dt>
          <dd><Rentabilidade desempenho={d} data-testid="ativo-rentabilidade" /></dd>
        </div>
      </dl>

      {erro ? <div className="mt-3"><Alerta>{erro}</Alerta></div> : null}

      {painel ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {painel === 'movimento' ? (
            <LancamentoForm modo="movimento" onCancelar={() => setPainel(null)} onSalvar={(dados) => salvar((s) => registrarMovimento(s, ativo.id, dados, hoje))} />
          ) : (
            <LancamentoForm modo="marcacao" onCancelar={() => setPainel(null)} onSalvar={(dados) => salvar((s) => registrarMarcacao(s, ativo.id, dados, hoje))} />
          )}
        </div>
      ) : null}

      {movimentos.length + marcacoes.length > 0 ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-emerald-800">Histórico de {ativo.nome}</summary>
          <ul className="mt-2 divide-y divide-slate-200">
            {movimentos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                <span>{formatarData(m.data)} · {m.tipo === 'aporte' ? 'Aporte' : 'Resgate'} · <span className="tabular-nums">{formatarMoeda(m.valor)}</span></span>
                <Botao variante="link" onClick={() => aplicar((s) => excluirMovimento(s, ativo.id, m.id))} aria-label={`Excluir ${m.tipo} de ${formatarData(m.data)} de ${ativo.nome}`}>Excluir</Botao>
              </li>
            ))}
            {marcacoes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                <span>{formatarData(m.data)} · Valor de mercado · <span className="tabular-nums">{formatarMoeda(m.valor)}</span></span>
                <Botao variante="link" onClick={() => aplicar((s) => excluirMarcacao(s, ativo.id, m.id))} aria-label={`Excluir marcação de ${formatarData(m.data)} de ${ativo.nome}`}>Excluir</Botao>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Nenhum movimento ainda. Registre o primeiro aporte.</p>
      )}

      {confirmando ? (
        <ConfirmDialog
          titulo="Excluir ativo"
          mensagem={`Excluir "${ativo.nome}" e todo o seu histórico? Isso não pode ser desfeito.`}
          rotuloConfirmar="Excluir ativo"
          perigo
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => {
            setConfirmando(false);
            aplicar((s) => excluirAtivo(s, ativo.id));
          }}
        />
      ) : null}
    </Cartao>
  );
}
