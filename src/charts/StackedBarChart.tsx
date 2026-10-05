import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from './ChartFrame';
import { Dica } from './Dica';
import { corDe } from './paleta';
import type { PropsCartesiano } from './tipos';
import { estiloEixo, useCartesiano } from './useCartesiano';

/** Barras empilhadas: as séries somam dentro de cada ponto do eixo X (a tabela traz o total). */
export function StackedBarChart(props: PropsCartesiano) {
  const c = useCartesiano({ comTotal: true, ...props });
  return (
    <ChartFrame descricao={props.descricao} rotuloTabela={props.rotuloTabela} titulo={props.titulo} vazio={c.vazio} tabela={c.tabela} config={c.config} legenda={c.legenda} className={props.className}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RBarChart data={props.dados} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={props.chaveX} tickFormatter={c.formatarX} tick={estiloEixo} minTickGap={c.config.espacoMarcas} />
          <YAxis tickFormatter={c.tickY} tick={estiloEixo} width={c.config.larguraEixoY} />
          <Tooltip content={<Dica unidade={c.unidade} formatarRotulo={c.formatarX} />} cursor={{ fill: 'var(--cor-superficie-alt)' }} />
          {props.series.map((s, i) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} stackId="pilha" fill={corDe(s.cor, i)} isAnimationActive={!c.semAnimacao} />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
