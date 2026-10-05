import { cx } from './cx';
import './Skeleton.css';

interface Props {
  variante?: 'texto' | 'bloco' | 'circulo';
  /** Quantas linhas de texto desenhar (só para `texto`). */
  linhas?: number;
  largura?: string;
  altura?: string;
  className?: string;
}

/** Marcador de carregamento. É decorativo: o contêiner que carrega deve usar `aria-busy`. */
export function Skeleton({ variante = 'texto', linhas = 1, largura, altura, className }: Props) {
  if (variante === 'texto') {
    return (
      <span aria-hidden="true" className={cx('ds-esqueleto-grupo', className)}>
        {Array.from({ length: linhas }, (_, i) => (
          <span key={i} className="ds-esqueleto ds-esqueleto--texto" style={{ width: i === linhas - 1 && linhas > 1 ? '60%' : largura }} />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true" className={cx('ds-esqueleto', `ds-esqueleto--${variante}`, className)} style={{ width: largura, height: altura }} />;
}
