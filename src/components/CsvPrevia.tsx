import { formatarData } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { LinhaInterpretada } from '../domain/csv';
import { formatarTags } from '../domain/tags';
import type { Categoria } from '../domain/types';
import './CsvPrevia.css';

export interface LinhaPrevia extends LinhaInterpretada {
  duplicata: boolean;
  selecionada: boolean;
  categoriaId?: string;
  /** Tags da regra que casou com a linha. */
  tags: string[];
}

interface Props {
  linhas: LinhaPrevia[];
  categorias: Categoria[];
  onSelecionar: (indice: number, selecionada: boolean) => void;
  onCategoria: (indice: number, categoriaId: string) => void;
}

export function CsvPrevia({ linhas, categorias, onSelecionar, onCategoria }: Props) {
  return (
    <ul className="csv-previa" aria-label="Prévia da importação">
      {linhas.map((l) => {
        const opcoes = categorias.filter((c) => c.tipo === l.tipo && !c.arquivada);
        const estado = l.erro ? `Erro: ${l.erro}` : l.duplicata ? 'Possível duplicata' : 'Pronta';
        const cor = l.erro ? 'csv-previa-estado--erro' : l.duplicata ? 'csv-previa-estado--duplicata' : 'csv-previa-estado--pronta';
        const rotulo = `linha ${l.indice}`;
        return (
          <li key={l.indice} className={`csv-previa-linha${l.erro ? ' csv-previa-linha--erro' : l.duplicata ? ' csv-previa-linha--duplicata' : ''}`}>
            <input
              type="checkbox"
              aria-label={`Importar ${rotulo}`}
              checked={l.selecionada}
              disabled={Boolean(l.erro)}
              onChange={(e) => onSelecionar(l.indice, e.target.checked)}
              className="csv-previa-marca"
            />
            <div className="csv-previa-info">
              <p className="csv-previa-descricao">{l.descricao || '(sem descrição)'}</p>
              <p className="csv-previa-detalhe">
                {l.data ? formatarData(l.data) : 'sem data'} · {l.erro ? '—' : `${l.tipo === 'receita' ? 'Receita' : 'Despesa'} ${formatarMoeda(l.valor)}`}
              </p>
              <p className={`csv-previa-estado ${cor}`} data-testid={`estado-linha-${l.indice}`}>
                {estado}
              </p>
              {l.tags.length > 0 ? (
                <p className="csv-previa-detalhe" data-testid={`tags-linha-${l.indice}`}>
                  Tags: {formatarTags(l.tags)}
                </p>
              ) : null}
            </div>
            {!l.erro ? (
              <select
                aria-label={`Categoria da ${rotulo}`}
                value={l.categoriaId ?? ''}
                onChange={(e) => onCategoria(l.indice, e.target.value)}
                className="csv-previa-categoria"
              >
                {opcoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}
