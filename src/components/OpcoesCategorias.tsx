import { arvoreCategorias } from '../domain/subcategorias';
import type { Categoria, TipoMovimento } from '../domain/types';

/** Recuo visual das subcategorias dentro de um <select> (option não aceita estilo de padding em todos os navegadores). */
const RECUO = '\u00a0\u00a0\u00a0';

/**
 * `<option>`s das categorias ativas de um tipo, com as subcategorias recuadas abaixo do pai.
 * `manterId` mantém na lista uma categoria arquivada que já está em uso (edição).
 */
export function OpcoesCategorias({ categorias, tipo, manterId }: { categorias: Categoria[]; tipo: TipoMovimento; manterId?: string }) {
  const nos = arvoreCategorias(categorias, tipo, (c) => !c.arquivada || c.id === manterId);
  return (
    <>
      {nos.map(({ categoria: c, nivel }) => (
        <option key={c.id} value={c.id}>
          {nivel === 1 ? RECUO : ''}
          {c.nome}
          {c.arquivada ? ' (arquivada)' : ''}
        </option>
      ))}
    </>
  );
}
