import type { TotaisAgenda } from '../../domain/agenda';
import { formatarMoeda } from '../../domain/money';
import './agenda.css';

export function ResumoAgenda({ totais }: { totais: TotaisAgenda }) {
  const linhas: [string, number, string][] = [
    ['A pagar', totais.aPagar, 'total-a-pagar'],
    ['A receber', totais.aReceber, 'total-a-receber'],
    ['Já pago', totais.jaPago, 'total-ja-pago'],
    ['Já recebido', totais.jaRecebido, 'total-ja-recebido'],
  ];
  return (
    <dl className="agenda-resumo">
      {linhas.map(([rotulo, valor, id]) => (
        <div key={id}>
          <dt className="agenda-resumo-rotulo">{rotulo}</dt>
          <dd className="agenda-resumo-valor" data-testid={id}>
            {formatarMoeda(valor)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
