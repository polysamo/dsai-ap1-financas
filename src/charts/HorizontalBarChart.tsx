import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from './ChartFrame';
import { Dica } from './Dica';
import { corDe } from './paleta';
import type { PropsCartesiano } from './tipos';
import { estiloEixo, useCartesiano } from './useCartesiano';

/** Barras horizontais: ideais para categorias com nomes longos; o eixo X do gráfico é o valor. */
export function HorizontalBarChart(props: PropsCartesiano) {
  const c = useCartesiano(props);
  return (
    <ChartFrame descricao={props.descricao} rotuloTabela={props.rotuloTabela} titulo={props.titulo} vazio={c.vazio} tabela={c.tabela} config={c.config} legenda={c.legenda} className={props.className}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RBarChart data={props.dados} layout="vertical" margin={{ left: 4, right: 16 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={c.tickY} tick={estiloEixo} />
          <YAxis type="category" dataKey={props.chaveX} tickFormatter={c.formatarX} tick={estiloEixo} width={c.compacto ? 72 : 100} />
          <Tooltip content={<Dica unidade={c.unidade} formatarRotulo={c.formatarX} />} cursor={{ fill: 'var(--cor-superficie-alt)' }} />
          {props.series.map((s, i) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={corDe(s.cor, i)} radius={[0, 4, 4, 0]} isAnimationActive={!c.semAnimacao} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
