import { Cartao } from '../ui';
import { formatarMoeda as formatarReais, formatarPercentual } from '../../domain/money';
import { formatarPrazo, textoDataEstimada, type CenarioCalculado, type LinhaSensibilidade } from '../../domain/independencia';
import './TabelaIndependencia.css';

export function CenariosDeRetorno({ cenarios }: { cenarios: CenarioCalculado[] }) {
  return (
    <Cartao titulo="Cenários de retorno">
      <div className="indep-tabela__envolt">
        <table className="indep-tabela" aria-label="Cenários de retorno lado a lado">
          <caption>Retorno do cenário base menos e mais 2 pontos percentuais.</caption>
          <thead>
            <tr>
              <th scope="col">Cenário</th>
              <th scope="col" className="indep-tabela__num">Retorno real a.a.</th>
              <th scope="col" className="indep-tabela__num">Tempo</th>
              <th scope="col">Data estimada</th>
            </tr>
          </thead>
          <tbody>
            {cenarios.map((c) => (
              <tr key={c.nome}>
                <th scope="row">{c.nome}</th>
                <td className="indep-tabela__num">{formatarPercentual(c.retornoAnualBp / 100)}</td>
                <td className="indep-tabela__num">{c.simulacao.meses === null ? 'Inalcançável' : formatarPrazo(c.simulacao.meses)}</td>
                <td>{textoDataEstimada(c.simulacao.mesAlvo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Cartao>
  );
}

export function SensibilidadeAporte({ linhas, aporteAtual }: { linhas: LinhaSensibilidade[]; aporteAtual: number }) {
  return (
    <Cartao titulo="Sensibilidade ao aporte">
      <div className="indep-tabela__envolt">
        <table className="indep-tabela" aria-label="Sensibilidade ao aporte mensal">
          <caption>Efeito de aumentar o aporte mensal sobre o prazo.</caption>
          <thead>
            <tr>
              <th scope="col">Aporte</th>
              <th scope="col" className="indep-tabela__num">Valor mensal</th>
              <th scope="col" className="indep-tabela__num">Tempo</th>
              <th scope="col" className="indep-tabela__num">Antecipa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.acrescimoPct}>
                <th scope="row">+{l.acrescimoPct}%</th>
                <td className="indep-tabela__num">{formatarReais(l.aporteMensal)}</td>
                <td className="indep-tabela__num">{l.simulacao.meses === null ? 'Inalcançável' : formatarPrazo(l.simulacao.meses)}</td>
                <td className="indep-tabela__num">
                  {l.mesesAntecipados === null ? '—' : l.mesesAntecipados === 0 ? 'nenhum mês' : `${l.mesesAntecipados} ${l.mesesAntecipados === 1 ? 'mês' : 'meses'}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {aporteAtual === 0 ? <p className="indep-tabela__nota">Com aporte atual zero, os acréscimos não alteram o prazo.</p> : null}
    </Cartao>
  );
}
