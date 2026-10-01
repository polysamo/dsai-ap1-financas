import './GraficoFluxo.css';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { DiaFluxo } from '../../domain/fluxoCaixa';

const rotuloEixo = (valor: unknown) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
const dica = (valor: unknown) => formatarMoeda(Math.round(Number(valor) * 100));

export function GraficoFluxo({ dias }: { dias: DiaFluxo[] }) {
  const pontos = dias.map((d) => ({ data: formatarData(d.data).slice(0, 5), Saldo: d.saldo / 100 }));
  return (
    <div className="fluxo-grafico">
      <div role="img" aria-label={`Gráfico de linha do saldo projetado dia a dia nos próximos ${dias.length} dias`} className="fluxo-grafico__area">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={pontos} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="data" fontSize={12} minTickGap={24} />
            <YAxis tickFormatter={rotuloEixo} fontSize={12} width={80} />
            <Tooltip formatter={dica} />
            <ReferenceLine y={0} stroke="var(--cor-perigo)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Saldo" stroke="var(--cor-primaria)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="fluxo-grafico__alternativa">
        <summary>Ver como tabela</summary>
        <table aria-label="Saldo projetado por dia (alternativa ao gráfico)" className="fluxo-grafico__tabela">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col" className="fluxo-grafico__num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((d) => (
              <tr key={d.data}>
                <th scope="row">{formatarData(d.data)}</th>
                <td className="fluxo-grafico__num">{formatarMoeda(d.saldo)}{d.negativo ? ' (negativo)' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
