import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { Transferencia } from '../../domain/transferencias';
import { Botao } from '../ui';
import './TransferenciasLista.css';

interface Props {
  transferencias: Transferencia[];
  nomeConta: (id: string) => string;
  onEditar: (t: Transferencia) => void;
  onExcluir: (t: Transferencia) => void;
}

export function TransferenciasLista({ transferencias, nomeConta, onEditar, onExcluir }: Props) {
  return (
    <ul className="transf-lista" aria-label="Histórico de transferências">
      {transferencias.map((t) => {
        const resumo = `${formatarData(t.data)}, de ${nomeConta(t.contaOrigemId)} para ${nomeConta(t.contaDestinoId)}`;
        return (
          <li key={t.id} className="transf-item">
            <div className="transf-item-texto">
              <span className="transf-item-rota">
                {nomeConta(t.contaOrigemId)} <span aria-hidden="true">→</span>
                <span className="transf-sr"> para </span> {nomeConta(t.contaDestinoId)}
              </span>
              <span className="transf-item-meta">
                {formatarData(t.data)}
                {t.descricao ? ` · ${t.descricao}` : ''}
              </span>
            </div>
            <span className="transf-item-valor">{formatarMoeda(t.valor)}</span>
            <div className="transf-item-acoes">
              <Botao variante="secundario" aria-label={`Editar transferência ${resumo}`} onClick={() => onEditar(t)}>
                Editar
              </Botao>
              <Botao variante="secundario" aria-label={`Excluir transferência ${resumo}`} onClick={() => onExcluir(t)}>
                Excluir
              </Botao>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
