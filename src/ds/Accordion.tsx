import { useId, useState, type ReactNode } from 'react';
import { cx } from './cx';
import './Accordion.css';

export interface ItemAccordion {
  id: string;
  titulo: string;
  conteudo: ReactNode;
}

interface Props {
  itens: ItemAccordion[];
  /** Permite vários itens abertos ao mesmo tempo. */
  multiplo?: boolean;
  abertosIniciais?: string[];
  className?: string;
}

export function Accordion({ itens, multiplo = false, abertosIniciais = [], className }: Props) {
  const base = useId();
  const [abertos, setAbertos] = useState<string[]>(abertosIniciais);

  const alternar = (id: string) =>
    setAbertos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : multiplo ? [...atual, id] : [id]));

  return (
    <div className={cx('ds-acordeao', className)}>
      {itens.map((item) => {
        const aberto = abertos.includes(item.id);
        return (
          <div key={item.id} className="ds-acordeao__item">
            <h3 className="ds-acordeao__titulo">
              <button type="button" id={`${base}-${item.id}-botao`} aria-expanded={aberto} aria-controls={`${base}-${item.id}-painel`} className="ds-acordeao__botao" onClick={() => alternar(item.id)}>
                <span>{item.titulo}</span>
                <span aria-hidden="true" className={cx('ds-acordeao__seta', aberto && 'ds-acordeao__seta--aberta')}>
                  ▾
                </span>
              </button>
            </h3>
            {aberto ? (
              <div role="region" id={`${base}-${item.id}-painel`} aria-labelledby={`${base}-${item.id}-botao`} className="ds-acordeao__painel">
                {item.conteudo}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
