import type { ReactNode } from 'react';
import { Alerta } from '../ui';

export interface ItemResultado {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}

/** Área de resultado anunciada a leitores de tela; vazia até o primeiro cálculo válido. */
export function Resultados({ titulo, itens, erro, children }: { titulo: string; itens: ItemResultado[] | null; erro?: string | null; children?: ReactNode }) {
  return (
    <div aria-live="polite" className="calc-resultado">
      {erro ? <Alerta>{erro}</Alerta> : null}
      {itens ? (
        <>
          <h3 className="calc-resultado__titulo">{titulo}</h3>
          <dl className="calc-resultado__grade">
            {itens.map((i) => (
              <div key={i.rotulo} className={i.destaque ? 'calc-resultado__item calc-resultado__item--destaque' : 'calc-resultado__item'}>
                <dt>{i.rotulo}</dt>
                <dd className="tabular-nums">{i.valor}</dd>
              </div>
            ))}
          </dl>
          {children}
        </>
      ) : null}
    </div>
  );
}
