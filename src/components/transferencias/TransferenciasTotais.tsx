import { formatarMoeda } from '../../domain/money';
import type { TotaisConta } from '../../domain/transferencias';
import './TransferenciasTotais.css';

interface Props {
  totais: TotaisConta[];
  nomeConta: (id: string) => string;
}

/** Enviado e recebido por conta no período filtrado. */
export function TransferenciasTotais({ totais, nomeConta }: Props) {
  if (totais.length === 0) return <p className="transf-totais-vazio">Nenhuma movimentação no período.</p>;
  return (
    <table className="transf-totais">
      <caption className="transf-totais-legenda">Totais por conta no período</caption>
      <thead>
        <tr>
          <th scope="col">Conta</th>
          <th scope="col">Enviado</th>
          <th scope="col">Recebido</th>
        </tr>
      </thead>
      <tbody>
        {totais.map((t) => (
          <tr key={t.contaId} data-testid={`totais-${t.contaId}`}>
            <th scope="row">{nomeConta(t.contaId)}</th>
            <td>{formatarMoeda(t.enviado)}</td>
            <td>{formatarMoeda(t.recebido)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
