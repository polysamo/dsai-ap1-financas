import { useMemo } from 'react';
import { configuracaoDoGrafico, useCompacto, useSemAnimacao } from './compacto';
import { formatarEixo } from './formato';
import { itensDeSeries } from './Legenda';
import { tabelaDeSeries } from './tabela';
import type { PropsCartesiano } from './tipos';

/** Tudo o que os gráficos cartesianos têm em comum: configuração por modo, tabela, legenda e formatadores. */
export function useCartesiano(p: PropsCartesiano) {
  const unidade = p.unidade ?? 'moeda';
  const compacto = useCompacto();
  const config = configuracaoDoGrafico(compacto);
  const formatarX = p.formatarX ?? String;
  const tabela = useMemo(
    () => (p.dados.length === 0 || p.semTabela ? null : tabelaDeSeries(p.dados, p.chaveX, p.rotuloX, p.series, unidade, formatarX, p.comTotal)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.dados, p.chaveX, p.rotuloX, p.series, unidade, p.comTotal, p.semTabela],
  );
  return {
    unidade,
    config,
    compacto,
    tabela,
    legenda: itensDeSeries(p.series),
    semAnimacao: useSemAnimacao(),
    formatarX,
    tickY: (v: number) => formatarEixo(v, unidade),
    vazio: p.dados.length === 0 ? (p.vazio ?? 'Sem dados para mostrar.') : undefined,
  };
}

export const estiloEixo = { fill: 'var(--cor-texto-mudo)', fontSize: 12 } as const;
