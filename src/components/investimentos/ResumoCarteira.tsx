import { formatarMoeda } from '../../domain/money';
import type { Desempenho } from '../../domain/investimentos';
import { Cartao } from '../ui';
import { Rentabilidade } from './Rentabilidade';

export function ResumoCarteira({ desempenho }: { desempenho: Desempenho }) {
  return (
    <Cartao titulo="Resumo da carteira">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-slate-600">Investido líquido</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="resumo-investido">{formatarMoeda(desempenho.investido)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Valor atual</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="resumo-atual">{formatarMoeda(desempenho.valorAtual)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Rentabilidade</dt>
          <dd className="text-lg"><Rentabilidade desempenho={desempenho} data-testid="resumo-rentabilidade" /></dd>
        </div>
      </dl>
    </Cartao>
  );
}
