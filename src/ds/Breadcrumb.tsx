import { Link } from 'react-router-dom';
import './Breadcrumb.css';

export interface ItemMigalha {
  rotulo: string;
  /** Sem `to`, o item não é link (o último é sempre a página atual). */
  to?: string;
}

/** Trilha de navegação; o último item marca a página atual com `aria-current="page"`. */
export function Breadcrumb({ itens }: { itens: ItemMigalha[] }) {
  return (
    <nav aria-label="Você está em" className="ds-migalhas">
      <ol className="ds-migalhas__lista">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <li key={`${item.rotulo}-${i}`} className="ds-migalhas__item">
              {ultimo || !item.to ? (
                <span aria-current={ultimo ? 'page' : undefined} className={ultimo ? 'ds-migalhas__atual' : undefined}>
                  {item.rotulo}
                </span>
              ) : (
                <Link to={item.to}>{item.rotulo}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
