import { formatarData } from '../../domain/date';
import type { LinhaSituacao } from '../../domain/dividas';
import { formatarMoeda } from '../../domain/money';
import { COR_SITUACAO, ROTULO_SITUACAO } from './rotulos';
import './dividas.css';

export function TabelaAmortizacao({ linhas }: { linhas: LinhaSituacao[] }) {
  return (
    <div className="dividas-tabela-rolagem">
      <table className="dividas-tabela" aria-label="Tabela de amortização">
        <thead>
          <tr>
            <th scope="col">Nº</th>
            <th scope="col">Vencimento</th>
            <th scope="col" className="dividas-direita">Parcela</th>
            <th scope="col" className="dividas-direita">Juros</th>
            <th scope="col" className="dividas-direita">Amortização</th>
            <th scope="col" className="dividas-direita">Saldo</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.numero} data-testid={`parcela-${l.numero}`}>
              <td>{l.numero}</td>
              <td>{formatarData(l.vencimento)}</td>
              <td className="dividas-direita">{formatarMoeda(l.parcela)}</td>
              <td className="dividas-direita">{formatarMoeda(l.juros)}</td>
              <td className="dividas-direita">{formatarMoeda(l.amortizacao)}</td>
              <td className="dividas-direita">{formatarMoeda(l.saldo)}</td>
              <td>
                <span className={`dividas-badge ${COR_SITUACAO[l.situacao]}`}>{ROTULO_SITUACAO[l.situacao]}</span>
                {l.situacao === 'parcial' ? <span className="dividas-restam">restam {formatarMoeda(l.restante)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
