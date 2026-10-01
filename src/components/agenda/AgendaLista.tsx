import { situacaoAgendamento } from '../../domain/agenda';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { Agendamento, DataISO } from '../../domain/types';
import { Botao, Valor } from '../ui';
import { SituacaoBadge } from './SituacaoBadge';
import './agenda.css';

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
    <ul className="agenda-lista" aria-label="Lançamentos do mês">
      {itens.map((a) => {
        const situacao = situacaoAgendamento(a, hoje);
        return (
          <li key={a.id} className="agenda-item">
            <span className="agenda-item-texto">
              <span className="agenda-item-titulo">{a.descricao}</span>
              <span className="agenda-item-detalhe">
                {a.tipo === 'despesa' ? 'A pagar' : 'A receber'} · vence em {formatarData(a.vencimento)} · {nomesCategorias.get(a.categoriaId) ?? 'Sem categoria'}
                {a.pagoEm ? ` · pago em ${formatarData(a.pagoEm)}` : ''}
              </span>
            </span>
            <span className="agenda-item-acoes">
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
