import './TabelaFluxo.css';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import { rotuloOrigem, type DiaFluxo } from '../../domain/fluxoCaixa';

export function TabelaFluxo({ dias }: { dias: DiaFluxo[] }) {
  return (
    <div className="fluxo-tabela__rolagem">
      <table className="fluxo-tabela" aria-label="Fluxo de caixa diário">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Movimentos</th>
            <th scope="col" className="fluxo-tabela__num">Entradas</th>
            <th scope="col" className="fluxo-tabela__num">Saídas</th>
            <th scope="col" className="fluxo-tabela__num">Saldo</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((d) => (
            <tr key={d.data} data-testid={`dia-${d.data}`} className={d.negativo ? 'fluxo-tabela__linha fluxo-tabela__linha--negativa' : 'fluxo-tabela__linha'}>
              <th scope="row">{formatarData(d.data)}</th>
              <td>
                {d.itens.length === 0 ? (
                  <span className="fluxo-tabela__mudo">Sem movimento</span>
                ) : (
                  <ul className="fluxo-tabela__itens">
                    {d.itens.map((i) => (
                      <li key={i.chave} data-origem-tipo={i.origem.tipo} data-origem-id={i.origem.id}>
                        <span>{i.descricao}</span>{' '}
                        <span className="fluxo-tabela__origem">
                          {i.tipo === 'entrada' ? 'Entrada' : 'Saída'} de {formatarMoeda(i.valor)} · {rotuloOrigem(i.origem.tipo)} <code>{i.origem.id}</code>
                          {i.atrasado ? ` · atrasado (venceu em ${formatarData(i.dataOriginal)})` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="fluxo-tabela__num">{d.entradas > 0 ? formatarMoeda(d.entradas) : '—'}</td>
              <td className="fluxo-tabela__num">{d.saidas > 0 ? formatarMoeda(d.saidas) : '—'}</td>
              <td className={d.negativo ? 'fluxo-tabela__num fluxo-tabela__saldo--negativo' : 'fluxo-tabela__num'}>{formatarMoeda(d.saldo)}</td>
              <td>{d.negativo ? <strong className="fluxo-tabela__negativo">Negativo: saldo negativo</strong> : 'Positivo'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
