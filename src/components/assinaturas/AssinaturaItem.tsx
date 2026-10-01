import { FREQUENCIAS, type ItemAssinatura, type SituacaoAssinatura } from '../../domain/assinaturas';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { Botao } from '../ui';
import './AssinaturaItem.css';

const ROTULO_SITUACAO: Record<SituacaoAssinatura, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  ignorada: 'Ignorada',
  cancelada: 'Cancelada',
};

interface Props {
  item: ItemAssinatura;
  onConfirmar: () => void;
  onIgnorar: () => void;
  onDesfazer: () => void;
  onCancelar: () => void;
  onReativar: () => void;
  onExcluir: () => void;
}

export function AssinaturaItem({ item, onConfirmar, onIgnorar, onDesfazer, onCancelar, onReativar, onExcluir }: Props) {
  const freq = FREQUENCIAS.find((f) => f.valor === item.frequencia)?.rotulo ?? item.frequencia;
  const inativa = item.situacao === 'cancelada' || item.situacao === 'ignorada';
  const nome = item.descricao;
  return (
    <li className={`assin-item ${inativa ? 'assin-item--inativa' : ''}`} data-testid={`assinatura-${item.chave}`}>
      <div className="assin-item__topo">
        <p className="assin-item__nome">
          {nome}
          <span className={`assin-selo assin-selo--${item.situacao}`}>{ROTULO_SITUACAO[item.situacao]}</span>
          {item.origem === 'manual' ? <span className="assin-selo">Manual</span> : null}
        </p>
      </div>
      <dl className="assin-item__dados">
        <div>
          <dt>Frequência</dt>
          <dd>{freq}</dd>
        </div>
        <div>
          <dt>Valor médio</dt>
          <dd>{formatarMoeda(item.valorMedio)}</dd>
        </div>
        <div>
          <dt>Última cobrança</dt>
          <dd>{item.ultimaCobranca ? formatarData(item.ultimaCobranca) : 'Sem registro'}</dd>
        </div>
        <div>
          <dt>Próxima cobrança</dt>
          <dd>
            {formatarData(item.proximaCobranca)}
            {item.atrasada && item.situacao !== 'cancelada' ? <span className="assin-item__atraso"> (atrasada)</span> : null}
          </dd>
        </div>
        <div>
          <dt>Custo mensal</dt>
          <dd>{formatarMoeda(item.custoMensal)}</dd>
        </div>
        <div>
          <dt>Custo anual</dt>
          <dd>{formatarMoeda(item.custoAnual)}</dd>
        </div>
        {item.canceladaEm ? (
          <div>
            <dt>Cancelada em</dt>
            <dd>{formatarData(item.canceladaEm)}</dd>
          </div>
        ) : null}
      </dl>
      {item.aumento && !inativa ? (
        <p className="assin-item__aumento" role="status">
          Aumento de preço: de {formatarMoeda(item.aumento.anterior)} para {formatarMoeda(item.aumento.atual)} (+
          {String(item.aumento.pct).replace('.', ',')}%).
        </p>
      ) : null}
      <div className="assin-item__acoes">
        {item.situacao === 'pendente' ? (
          <>
            <Botao aria-label={`Confirmar ${nome}`} onClick={onConfirmar}>
              Confirmar
            </Botao>
            <Botao variante="secundario" aria-label={`Ignorar ${nome}`} onClick={onIgnorar}>
              Ignorar
            </Botao>
          </>
        ) : null}
        {item.situacao === 'confirmada' ? (
          <>
            <Botao variante="secundario" aria-label={`Cancelar assinatura ${nome}`} onClick={onCancelar}>
              Marcar como cancelada
            </Botao>
            {item.origem === 'detectada' ? (
              <Botao variante="link" aria-label={`Desfazer decisão de ${nome}`} onClick={onDesfazer}>
                Desfazer decisão
              </Botao>
            ) : null}
          </>
        ) : null}
        {item.situacao === 'ignorada' ? (
          <Botao variante="secundario" aria-label={`Restaurar ${nome}`} onClick={onDesfazer}>
            Restaurar
          </Botao>
        ) : null}
        {item.situacao === 'cancelada' ? (
          <Botao variante="secundario" aria-label={`Reativar ${nome}`} onClick={onReativar}>
            Reativar
          </Botao>
        ) : null}
        {item.origem === 'manual' ? (
          <Botao variante="perigo" aria-label={`Excluir ${nome}`} onClick={onExcluir}>
            Excluir
          </Botao>
        ) : null}
      </div>
    </li>
  );
}
