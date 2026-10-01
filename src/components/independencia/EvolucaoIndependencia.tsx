import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Cartao } from '../ui';
import { formatarMoeda } from '../../domain/money';
import type { ParametrosIndependencia, Simulacao } from '../../domain/independencia';
import './EvolucaoIndependencia.css';
import './TabelaIndependencia.css';

const COR_PATRIMONIO = '#1d4ed8';
const COR_APORTADO = '#c2410c';

const emReais = (centavos: number) => centavos / 100;
const rotuloEixo = (valor: unknown) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
const dica = (valor: unknown) => formatarMoeda(Math.round(Number(valor) * 100));

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
    { ano: 0, Patrimônio: emReais(parametros.patrimonio), Aportado: 0 },
    ...simulacao.anual.map((p) => ({ ano: p.meses / 12, Patrimônio: emReais(p.patrimonio), Aportado: emReais(p.aportado) })),
  ];
  return (
    <Cartao titulo="Evolução do patrimônio">
      <div
        role="img"
        aria-label={`Gráfico de linhas da evolução anual do patrimônio até ${formatarMoeda(simulacao.alvo)}; a tabela abaixo traz os mesmos valores`}
        className="indep-evolucao__grafico"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={pontos} margin={{ left: 8, right: 16 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="ano" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => `${Math.round(Number(v))} a`} fontSize={12} />
            <YAxis tickFormatter={rotuloEixo} fontSize={12} width={88} />
            <Tooltip formatter={dica} labelFormatter={(v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`} />
            <Legend />
            <ReferenceLine y={emReais(simulacao.alvo)} stroke={COR_APORTADO} strokeDasharray="6 4" label={{ value: 'Alvo', fontSize: 12, position: 'insideTopLeft' }} />
            <Line type="monotone" dataKey="Patrimônio" stroke={COR_PATRIMONIO} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Aportado" stroke={COR_APORTADO} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
