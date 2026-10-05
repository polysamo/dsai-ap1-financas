import { LineChart } from '../../charts';
import { Cartao } from '../ui';
import { formatarMoeda } from '../../domain/money';
import type { ParametrosIndependencia, Simulacao } from '../../domain/independencia';
import './EvolucaoIndependencia.css';
import './TabelaIndependencia.css';

interface Props {
  parametros: ParametrosIndependencia;
  simulacao: Simulacao;
}

export function EvolucaoIndependencia({ parametros, simulacao }: Props) {
  if (simulacao.anual.length === 0) {
    return (
      <Cartao titulo="Evolução do patrimônio">
        <p className="indep-evolucao__vazio">O patrimônio atual já cobre o alvo; não há evolução a mostrar.</p>
      </Cartao>
    );
  }
  const pontos = [
    { ano: 0, patrimonio: parametros.patrimonio, aportado: 0 },
    ...simulacao.anual.map((p) => ({ ano: p.meses / 12, patrimonio: p.patrimonio, aportado: p.aportado })),
  ];
  return (
    <Cartao titulo="Evolução do patrimônio">
      <LineChart
        descricao={`Gráfico de linhas da evolução anual do patrimônio até ${formatarMoeda(simulacao.alvo)}; a tabela abaixo traz os mesmos valores`}
        rotuloTabela="Evolução do patrimônio"
        dados={pontos}
        chaveX="ano"
        rotuloX="Ano"
        formatarX={(v) => `${Math.round(Number(v))} a`}
        eixoNumerico
        series={[
          { chave: 'patrimonio', nome: 'Patrimônio', cor: 1 },
          { chave: 'aportado', nome: 'Aportado', cor: 2 },
        ]}
        referencia={{ valor: simulacao.alvo, rotulo: 'Alvo' }}
        pontos={false}
        semTabela
      />
      <details className="indep-evolucao__detalhes" open>
        <summary>Tabela anual da evolução</summary>
        <div className="indep-tabela__envolt indep-tabela__rolagem">
          <table className="indep-tabela" aria-label="Evolução anual do patrimônio">
            <thead>
              <tr>
                <th scope="col">Ano</th>
                <th scope="col" className="indep-tabela__num">Patrimônio</th>
                <th scope="col" className="indep-tabela__num">Aportado</th>
                <th scope="col" className="indep-tabela__num">Rendimento</th>
              </tr>
            </thead>
            <tbody>
              {simulacao.anual.map((p) => (
                <tr key={p.meses}>
                  <th scope="row">{p.meses % 12 === 0 ? p.ano : `${p.ano} (parcial)`}</th>
                  <td className="indep-tabela__num">{formatarMoeda(p.patrimonio)}</td>
                  <td className="indep-tabela__num">{formatarMoeda(p.aportado)}</td>
                  <td className="indep-tabela__num">{formatarMoeda(p.rendimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Cartao>
  );
}
