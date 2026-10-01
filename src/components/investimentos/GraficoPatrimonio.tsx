import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nomeMesCurto } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { PontoPatrimonio } from '../../domain/investimentos';
import { Cartao } from '../ui';

const rotuloEixo = (valor: unknown) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
const dica = (valor: unknown) => formatarMoeda(Math.round(Number(valor) * 100));

export function GraficoPatrimonio({ dados }: { dados: PontoPatrimonio[] }) {
  const pontos = dados.map((d) => ({ mes: nomeMesCurto(d.mes), Patrimônio: d.valor / 100 }));
  return (
    <Cartao titulo="Evolução do patrimônio">
      <div role="img" aria-label="Gráfico de barras da evolução mensal do patrimônio investido" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={pontos} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis tickFormatter={rotuloEixo} fontSize={12} width={72} />
            <Tooltip formatter={dica} />
            <Bar dataKey="Patrimônio" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-emerald-800">Ver como tabela</summary>
        <table className="mt-2 w-full text-left" aria-label="Patrimônio por mês">
          <thead>
            <tr className="text-slate-600">
              <th scope="col" className="py-1 font-medium">Mês</th>
              <th scope="col" className="py-1 text-right font-medium">Patrimônio</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="border-t border-slate-200">
                <th scope="row" className="py-1 font-normal">{d.mes}</th>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(d.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Cartao>
  );
}
