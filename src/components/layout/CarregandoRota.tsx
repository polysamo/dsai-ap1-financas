import { Skeleton } from '../../ds/Skeleton';
import { Spinner } from '../../ds/Spinner';

/** Esqueleto de página mostrado enquanto uma tela carregada sob demanda chega. */
export function CarregandoRota() {
  return (
    <div aria-busy="true" className="layout-carregando">
      <Spinner rotulo="Carregando tela" />
      <Skeleton largura="40%" />
      <Skeleton variante="bloco" />
      <Skeleton linhas={4} />
    </div>
  );
}
