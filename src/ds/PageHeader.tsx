import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import './PageHeader.css';

interface Props {
  titulo: ReactNode;
  descricao?: string;
  /** Botões e controles da página, alinhados à direita (abaixo do título no celular). */
  acoes?: ReactNode;
  className?: string;
}

/** Cabeçalho de página: `h1`, descrição ligada ao título por `aria-describedby` e ações. */
export function PageHeader({ titulo, descricao, acoes, className }: Props) {
  const idDescricao = useId();
  return (
    <div className={cx("ds-pagina-cabecalho", className)}>
      <div className="ds-pagina-cabecalho__texto">
        <h1 className="ds-pagina-cabecalho__titulo" aria-describedby={descricao ? idDescricao : undefined}>
          {titulo}
        </h1>
        {descricao ? (
          <p id={idDescricao} className="ds-pagina-cabecalho__descricao">
            {descricao}
          </p>
        ) : null}
      </div>
      {acoes ? <div className="ds-pagina-cabecalho__acoes">{acoes}</div> : null}
    </div>
  );
}
