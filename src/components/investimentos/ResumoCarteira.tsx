import { formatarMoeda } from '../../domain/money';
import type { Desempenho } from '../../domain/investimentos';
import { Cartao } from '../ui';
import { Rentabilidade } from './Rentabilidade';
import './investimentos.css';

export function ResumoCarteira({ desempenho }: { desempenho: Desempenho }) {
  return (
    <Cartao titulo="Resumo da carteira">
      <dl className="invest-metricas">
        <div>
          <dt className="invest-rotulo">Investido líquido</dt>
          <dd className="invest-num invest-forte invest-grande" data-testid="resumo-investido">{formatarMoeda(desempenho.investido)}</dd>
        </div>
        <div>
          <dt className="invest-rotulo">Valor atual</dt>
          <dd className="invest-num invest-forte invest-grande" data-testid="resumo-atual">{formatarMoeda(desempenho.valorAtual)}</dd>
        </div>
        <div>
          <dt className="invest-rotulo">Rentabilidade</dt>
          <dd className="invest-grande"><Rentabilidade desempenho={desempenho} data-testid="resumo-rentabilidade" /></dd>
        </div>
      </dl>
    </Cartao>
  );
}
