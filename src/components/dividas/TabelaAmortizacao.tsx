import { formatarData } from '../../domain/date';
import type { LinhaSituacao } from '../../domain/dividas';
import { formatarMoeda } from '../../domain/money';
import { COR_SITUACAO, ROTULO_SITUACAO } from './rotulos';

export function TabelaAmortizacao({ linhas }: { linhas: LinhaSituacao[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm" aria-label="Tabela de amortização">
        <thead>
          <tr className="border-b border-slate-300 text-left text-slate-600">
            <th scope="col" className="py-2 pr-2">Nº</th>
            <th scope="col" className="py-2 pr-2">Vencimento</th>
            <th scope="col" className="py-2 pr-2 text-right">Parcela</th>
            <th scope="col" className="py-2 pr-2 text-right">Juros</th>
            <th scope="col" className="py-2 pr-2 text-right">Amortização</th>
            <th scope="col" className="py-2 pr-2 text-right">Saldo</th>
            <th scope="col" className="py-2">Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.numero} className="border-b border-slate-100 tabular-nums" data-testid={`parcela-${l.numero}`}>
              <td className="py-2 pr-2">{l.numero}</td>
              <td className="py-2 pr-2">{formatarData(l.vencimento)}</td>
              <td className="py-2 pr-2 text-right">{formatarMoeda(l.parcela)}</td>
              <td className="py-2 pr-2 text-right">{formatarMoeda(l.juros)}</td>
              <td className="py-2 pr-2 text-right">{formatarMoeda(l.amortizacao)}</td>
              <td className="py-2 pr-2 text-right">{formatarMoeda(l.saldo)}</td>
              <td className="py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR_SITUACAO[l.situacao]}`}>{ROTULO_SITUACAO[l.situacao]}</span>
                {l.situacao === 'parcial' ? <span className="ml-1 text-xs text-slate-600">restam {formatarMoeda(l.restante)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
