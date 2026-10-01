import { formatarMoeda, formatarPercentual } from '../../domain/money';
import type { Variacao } from '../../domain/patrimonio';
import './ResumoPatrimonio.css';

const comSinal = (valor: number) => (valor > 0 ? `+${formatarMoeda(valor)}` : formatarMoeda(valor));
const pctComSinal = (pct: number | null) => (pct === null ? '—' : pct > 0 ? `+${formatarPercentual(pct)}` : formatarPercentual(pct));
const tendencia = (v: number) => (v > 0 ? 'positivo' : v < 0 ? 'negativo' : 'neutro');
const palavra = (v: number) => (v > 0 ? 'alta' : v < 0 ? 'queda' : 'sem variação');

function CartaoVariacao({ titulo, variacao, id }: { titulo: string; variacao: Variacao; id: string }) {
  return (
    <div className="patrim-resumo__item">
      <dt>{titulo}</dt>
      <dd className={`patrim-resumo__variacao patrim-resumo__variacao--${tendencia(variacao.valor)}`}>
        <span data-testid={`${id}-valor`}>{comSinal(variacao.valor)}</span>{' '}
        <span data-testid={`${id}-pct`}>({pctComSinal(variacao.pct)})</span>{' '}
        <span className="patrim-resumo__palavra">{palavra(variacao.valor)}</span>
      </dd>
    </div>
  );
}

export function ResumoPatrimonio({ liquido, mes, anual }: { liquido: number; mes: Variacao; anual: Variacao }) {
  return (
    <dl className="patrim-resumo">
      <div className="patrim-resumo__item">
        <dt>Patrimônio líquido hoje</dt>
        <dd className="patrim-resumo__total" data-testid="patrimonio-liquido">{formatarMoeda(liquido)}</dd>
      </div>
      <CartaoVariacao titulo="Variação no mês" variacao={mes} id="var-mes" />
      <CartaoVariacao titulo="Variação em 12 meses" variacao={anual} id="var-ano" />
    </dl>
  );
}
