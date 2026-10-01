import type { TotaisAgenda } from '../../domain/agenda';
import { formatarMoeda } from '../../domain/money';

export function ResumoAgenda({ totais }: { totais: TotaisAgenda }) {
  const linhas: [string, number, string][] = [
    ['A pagar', totais.aPagar, 'total-a-pagar'],
    ['A receber', totais.aReceber, 'total-a-receber'],
    ['Já pago', totais.jaPago, 'total-ja-pago'],
    ['Já recebido', totais.jaRecebido, 'total-ja-recebido'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
      {linhas.map(([rotulo, valor, id]) => (
        <div key={id}>
          <dt className="text-slate-600">{rotulo}</dt>
          <dd className="text-lg font-bold" data-testid={id}>
            {formatarMoeda(valor)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
