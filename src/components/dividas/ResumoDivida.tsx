import { formatarData } from '../../domain/date';
import type { ResumoDivida as Resumo } from '../../domain/dividas';
import { formatarMoeda } from '../../domain/money';
import type { TipoDivida } from '../../domain/types';
import { Alerta } from '../ui';
import { rotulosTipo } from './rotulos';
import './dividas.css';

export function ResumoDivida({ resumo, tipo }: { resumo: Resumo; tipo: TipoDivida }) {
  const r = rotulosTipo(tipo);
  const { proxima, atrasadas } = resumo;
  return (
    <div className="dividas-resumo">
      {resumo.quitada ? <Alerta tipo="sucesso">{r.quitada}.</Alerta> : null}
      {atrasadas.quantidade > 0 ? (
        <Alerta tipo="aviso">
          {atrasadas.quantidade === 1 ? '1 parcela atrasada' : `${atrasadas.quantidade} parcelas atrasadas`}, somando{' '}
          <span data-testid="atrasadas-valor">{formatarMoeda(atrasadas.valor)}</span>.
        </Alerta>
      ) : null}
      <dl className="dividas-resumo-grade">
        <div>
          <dt className="dividas-rotulo">{r.saldo}</dt>
          <dd className="dividas-num dividas-destaque" data-testid="saldo-devedor">{formatarMoeda(resumo.saldoDevedor)}</dd>
        </div>
        <div>
          <dt className="dividas-rotulo">Total de juros</dt>
          <dd className="dividas-num" data-testid="total-juros">{formatarMoeda(resumo.totalJuros)}</dd>
        </div>
        <div>
          <dt className="dividas-rotulo">{r.pago}</dt>
          <dd className="dividas-num" data-testid="total-pago">{formatarMoeda(resumo.totalPago)}</dd>
        </div>
        <div>
          <dt className="dividas-rotulo">{r.parcela}</dt>
          <dd data-testid="proxima">
            {proxima ? `Nº ${proxima.numero}, ${formatarData(proxima.vencimento)}, ${formatarMoeda(proxima.restante)}` : 'Nenhuma'}
          </dd>
        </div>
        {resumo.economiaJuros > 0 || resumo.parcelasAMenos > 0 ? (
          <div>
            <dt className="dividas-rotulo">Economia com amortizações</dt>
            <dd data-testid="economia">
              {formatarMoeda(resumo.economiaJuros)} de juros
              {resumo.parcelasAMenos > 0 ? ` e ${resumo.parcelasAMenos} ${resumo.parcelasAMenos === 1 ? 'parcela' : 'parcelas'} a menos` : ''}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
