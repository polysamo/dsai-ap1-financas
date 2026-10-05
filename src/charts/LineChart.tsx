import { CartesianGrid, Line, LineChart as RLineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from './ChartFrame';
import { Dica } from './Dica';
import { corDe } from './paleta';
import type { PropsCartesiano } from './tipos';
import { estiloEixo, useCartesiano } from './useCartesiano';

interface Props extends PropsCartesiano {
  /** Linha horizontal de referência (ex.: o alvo), no mesmo valor dos dados. */
  referencia?: { valor: number; rotulo: string };
  /** Eixo X numérico contínuo (ex.: anos), em vez de categorias. */
  eixoNumerico?: boolean;
  /** Linha com ponto em cada valor; ligado por padrão quando há poucos pontos. */
  pontos?: boolean;
}

export function LineChart(props: Props) {
  const c = useCartesiano(props);
  const mostrarPontos = props.pontos ?? props.dados.length <= 12;
  return (
    <ChartFrame descricao={props.descricao} rotuloTabela={props.rotuloTabela} titulo={props.titulo} vazio={c.vazio} tabela={c.tabela} config={c.config} legenda={c.legenda} className={props.className}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RLineChart data={props.dados} margin={{ left: 4, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={props.chaveX} type={props.eixoNumerico ? 'number' : 'category'} domain={props.eixoNumerico ? [0, 'dataMax'] : undefined} tickFormatter={c.formatarX} tick={estiloEixo} minTickGap={c.config.espacoMarcas} />
          <YAxis tickFormatter={c.tickY} tick={estiloEixo} width={c.config.larguraEixoY} />
          <Tooltip content={<Dica unidade={c.unidade} formatarRotulo={c.formatarX} />} />
          {props.referencia ? <ReferenceLine y={props.referencia.valor} stroke="var(--cor-texto-mudo)" strokeDasharray="6 4" label={{ value: props.referencia.rotulo, fontSize: 12, position: 'insideTopLeft', fill: 'var(--cor-texto-mudo)' }} /> : null}
          {props.series.map((s, i) => (
            <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={corDe(s.cor, i)} strokeWidth={2} dot={mostrarPontos} isAnimationActive={!c.semAnimacao} />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
