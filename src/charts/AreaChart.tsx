import { Area, AreaChart as RAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from './ChartFrame';
import { Dica } from './Dica';
import { corDe } from './paleta';
import type { PropsCartesiano } from './tipos';
import { estiloEixo, useCartesiano } from './useCartesiano';

/** Áreas preenchidas: boas para acumulados, como patrimônio ao longo do tempo. */
export function AreaChart(props: PropsCartesiano) {
  const c = useCartesiano(props);
  return (
    <ChartFrame descricao={props.descricao} rotuloTabela={props.rotuloTabela} titulo={props.titulo} vazio={c.vazio} tabela={c.tabela} config={c.config} legenda={c.legenda} className={props.className}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RAreaChart data={props.dados} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={props.chaveX} tickFormatter={c.formatarX} tick={estiloEixo} minTickGap={c.config.espacoMarcas} />
          <YAxis tickFormatter={c.tickY} tick={estiloEixo} width={c.config.larguraEixoY} />
          <Tooltip content={<Dica unidade={c.unidade} formatarRotulo={c.formatarX} />} />
          {props.series.map((s, i) => (
            <Area key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={corDe(s.cor, i)} fill={corDe(s.cor, i)} fillOpacity={0.2} strokeWidth={2} isAnimationActive={!c.semAnimacao} />
          ))}
        </RAreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
