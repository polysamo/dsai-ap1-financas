import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nomeMesCurto } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { FatiaCategoria, PontoMensal } from '../domain/projecao';

const COR_RECEITA = '#1d4ed8';
const COR_DESPESA = '#c2410c';

const emReais = (centavos: number) => centavos / 100;
const rotuloEixo = (valor: unknown) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
const dica = (valor: unknown) => formatarMoeda(Math.round(Number(valor) * 100));

export function GraficoDespesasPorCategoria({ dados }: { dados: FatiaCategoria[] }) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  const pontos = dados.map((d) => ({ nome: d.nome, valor: emReais(d.valor) }));
  return (
    <div>
      <div role="img" aria-label="Gráfico de barras das despesas por categoria no mês" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={pontos} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={rotuloEixo} fontSize={12} />
            <YAxis type="category" dataKey="nome" width={92} fontSize={12} />
            <Tooltip formatter={dica} />
            <Bar dataKey="valor" name="Despesas" fill={COR_DESPESA} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-emerald-800">Ver como tabela</summary>
        <table className="mt-2 w-full text-left" aria-label="Despesas por categoria">
          <thead>
            <tr className="text-slate-600">
              <th scope="col" className="py-1 font-medium">Categoria</th>
              <th scope="col" className="py-1 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.nome} className="border-t border-slate-200">
                <th scope="row" className="py-1 font-normal">{d.nome}</th>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(d.valor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-medium">
              <th scope="row" className="py-1">Total</th>
              <td className="py-1 text-right tabular-nums" data-testid="total-categorias">{formatarMoeda(total)}</td>
            </tr>
          </tfoot>
        </table>
      </details>
    </div>
  );
}

export function GraficoReceitasDespesas({ dados }: { dados: PontoMensal[] }) {
  const pontos = dados.map((d) => ({ mes: nomeMesCurto(d.mes), Receitas: emReais(d.receitas), Despesas: emReais(d.despesas) }));
  return (
    <div>
      <div role="img" aria-label="Gráfico de barras de receitas e despesas dos últimos 6 meses" className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={pontos} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis tickFormatter={rotuloEixo} fontSize={12} width={72} />
            <Tooltip formatter={dica} />
            <Legend />
            <Bar dataKey="Receitas" fill={COR_RECEITA} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill={COR_DESPESA} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-emerald-800">Ver como tabela</summary>
        <table className="mt-2 w-full text-left" aria-label="Receitas e despesas por mês">
          <thead>
            <tr className="text-slate-600">
              <th scope="col" className="py-1 font-medium">Mês</th>
              <th scope="col" className="py-1 text-right font-medium">Receitas</th>
              <th scope="col" className="py-1 text-right font-medium">Despesas</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="border-t border-slate-200">
                <th scope="row" className="py-1 font-normal">{nomeMesCurto(d.mes)}</th>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(d.receitas)}</td>
                <td className="py-1 text-right tabular-nums">{formatarMoeda(d.despesas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
