import { corDe } from './paleta';
import type { Serie } from './tipos';

interface ItemLegenda {
  nome: string;
  cor: string;
}

export const itensDeSeries = (series: Serie[]): ItemLegenda[] => series.map((s, i) => ({ nome: s.nome, cor: corDe(s.cor, i) }));

/** Legenda em HTML: amostra de cor e o nome em texto. */
export function Legenda({ itens }: { itens: ItemLegenda[] }) {
  return (
    <ul className="grafico-legenda" aria-label="Legenda">
      {itens.map((i) => (
        <li key={i.nome} className="grafico-legenda__item">
          <span className="grafico-legenda__amostra" style={{ background: i.cor }} aria-hidden="true" />
          {i.nome}
        </li>
      ))}
    </ul>
  );
}
