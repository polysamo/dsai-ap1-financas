import { situacaoAgendamento } from '../../domain/agenda';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { Agendamento, DataISO } from '../../domain/types';
import { Botao, Valor } from '../ui';
import { SituacaoBadge } from './SituacaoBadge';

interface Props {
  itens: Agendamento[];
  hoje: DataISO;
  nomesCategorias: Map<string, string>;
  onPagar: (item: Agendamento) => void;
  onReabrir: (item: Agendamento) => void;
  onExcluir: (item: Agendamento) => void;
}

export function AgendaLista({ itens, hoje, nomesCategorias, onPagar, onReabrir, onExcluir }: Props) {
  return (
    <ul className="divide-y divide-slate-200" aria-label="Lançamentos do mês">
      {itens.map((a) => {
        const situacao = situacaoAgendamento(a, hoje);
        return (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{a.descricao}</span>
              <span className="text-xs text-slate-600">
                {a.tipo === 'despesa' ? 'A pagar' : 'A receber'} · vence em {formatarData(a.vencimento)} · {nomesCategorias.get(a.categoriaId) ?? 'Sem categoria'}
                {a.pagoEm ? ` · pago em ${formatarData(a.pagoEm)}` : ''}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <SituacaoBadge situacao={situacao} />
              <Valor centavos={a.tipo === 'despesa' ? -a.valor : a.valor} texto={formatarMoeda(a.tipo === 'despesa' ? -a.valor : a.valor)} />
              {a.pagoEm ? (
                <Botao variante="secundario" aria-label={`Reabrir ${a.descricao}`} onClick={() => onReabrir(a)}>
                  Reabrir
                </Botao>
              ) : (
                <Botao aria-label={`Marcar como pago: ${a.descricao}`} onClick={() => onPagar(a)}>
                  Marcar como pago
                </Botao>
              )}
              <Botao variante="secundario" aria-label={`Excluir ${a.descricao}`} onClick={() => onExcluir(a)}>
                Excluir
              </Botao>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
