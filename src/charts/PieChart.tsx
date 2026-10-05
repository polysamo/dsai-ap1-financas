import { useMemo } from 'react';
import { Cell, Pie, PieChart as RPieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartFrame } from './ChartFrame';
import { configuracaoDoGrafico, useCompacto, useSemAnimacao } from './compacto';
import { Dica } from './Dica';
import { corDaSerie } from './paleta';
import { agruparFatias, tabelaDeFatias } from './tabela';
import type { Fatia, PropsBase } from './tipos';

interface Props extends PropsBase {
  fatias: Fatia[];
  /** Título da primeira coluna da tabela. */
  rotuloX: string;
  /** Desenha uma rosca (com furo) em vez de uma pizza cheia. */
  rosca?: boolean;
}

/** Pizza ou rosca. Com muitas fatias, as pequenas viram "Outras"; a tabela traz valor e participação. */
export function PieChart({ fatias, rotuloX, rosca = false, descricao, rotuloTabela, titulo, vazio, unidade = 'moeda', className }: Props) {
  const compacto = useCompacto();
  const semAnimacao = useSemAnimacao();
  const config = configuracaoDoGrafico(compacto);
  const agrupadas = useMemo(() => agruparFatias(fatias), [fatias]);
  const semDados = agrupadas.length === 0;
  const legenda = agrupadas.map((f, i) => ({ nome: f.nome, cor: corDaSerie(i + 1) }));
  return (
    <ChartFrame
      descricao={descricao}
      rotuloTabela={rotuloTabela}
      titulo={titulo}
      vazio={semDados ? (vazio ?? 'Sem dados para mostrar.') : undefined}
      tabela={semDados ? null : tabelaDeFatias(agrupadas, rotuloX, unidade)}
      config={config}
      legenda={legenda}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RPieChart>
          <Tooltip content={<Dica unidade={unidade} />} />
          <Pie data={agrupadas} dataKey="valor" nameKey="nome" innerRadius={rosca ? '55%' : 0} outerRadius="85%" paddingAngle={rosca ? 2 : 0} stroke="var(--cor-superficie)" isAnimationActive={!semAnimacao}>
            {agrupadas.map((f, i) => (
              <Cell key={f.nome} fill={corDaSerie(i + 1)} />
            ))}
          </Pie>
        </RPieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
