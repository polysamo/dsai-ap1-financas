import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nomeMes, nomeMesCurto } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { PontoEvolucao } from '../../domain/patrimonio';
import './GraficoPatrimonio.css';

const emReais = (centavos: number) => centavos / 100;
const rotuloEixo = (valor: unknown) => `R$ ${Number(valor).toLocaleString('pt-BR')}`;
const dica = (valor: unknown) => formatarMoeda(Math.round(Number(valor) * 100));

export function GraficoPatrimonio({ pontos }: { pontos: PontoEvolucao[] }) {
  const dados = pontos.map((p) => ({ mes: nomeMesCurto(p.mes), Patrimônio: emReais(p.valor) }));
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const descricao = `Gráfico de área do patrimônio líquido de ${nomeMes(primeiro.mes)} a ${nomeMes(ultimo.mes)}, de ${formatarMoeda(primeiro.valor)} para ${formatarMoeda(ultimo.valor)}.`;
  return (
    <div className="patrim-grafico">
      <div role="img" aria-label={descricao} className="patrim-grafico__area">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={dados} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis tickFormatter={rotuloEixo} fontSize={12} width={80} />
            <Tooltip formatter={dica} />
            <Area type="monotone" dataKey="Patrimônio" stroke="var(--cor-primaria)" fill="var(--cor-primaria-suave)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="patrim-grafico__tabela" aria-label="Patrimônio líquido por mês">
        <caption className="patrim-grafico__legenda">Mesmos dados do gráfico, em tabela</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col" className="patrim-grafico__num">Patrimônio líquido</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.mes}>
              <th scope="row">{nomeMes(p.mes)}</th>
              <td className="patrim-grafico__num">{formatarMoeda(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
