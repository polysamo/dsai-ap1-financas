import { cx } from './cx';
import './Pagination.css';

interface Props {
  /** Página atual, começando em 1. */
  pagina: number;
  totalPaginas: number;
  onChange: (pagina: number) => void;
  className?: string;
}

/** Páginas a mostrar: primeira, última e vizinhas da atual, com `null` onde há reticências. */
export function janelaDePaginas(pagina: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const visiveis = new Set([1, total, pagina - 1, pagina, pagina + 1].filter((p) => p >= 1 && p <= total));
  const ordenadas = [...visiveis].sort((a, b) => a - b);
  const saida: (number | null)[] = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) saida.push(null);
    saida.push(p);
  });
  return saida;
}

export function Pagination({ pagina, totalPaginas, onChange, className }: Props) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginação" className={cx('ds-paginacao', className)}>
      <button type="button" className="ds-paginacao__botao" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        Anterior
      </button>
      <ul className="ds-paginacao__lista">
        {janelaDePaginas(pagina, totalPaginas).map((p, i) =>
          p === null ? (
            <li key={`r${i}`} aria-hidden="true" className="ds-paginacao__reticencias">
              …
            </li>
          ) : (
            <li key={p}>
              <button type="button" aria-label={`Página ${p}`} aria-current={p === pagina ? 'page' : undefined} className={cx('ds-paginacao__botao', p === pagina && 'ds-paginacao__botao--atual')} onClick={() => onChange(p)}>
                {p}
              </button>
            </li>
          ),
        )}
      </ul>
      <button type="button" className="ds-paginacao__botao" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        Próxima
      </button>
    </nav>
  );
}
