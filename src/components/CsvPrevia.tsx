import { formatarData } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { LinhaInterpretada } from '../domain/csv';
import type { Categoria } from '../domain/types';

export interface LinhaPrevia extends LinhaInterpretada {
  duplicata: boolean;
  selecionada: boolean;
  categoriaId?: string;
}

interface Props {
  linhas: LinhaPrevia[];
  categorias: Categoria[];
  onSelecionar: (indice: number, selecionada: boolean) => void;
  onCategoria: (indice: number, categoriaId: string) => void;
}

export function CsvPrevia({ linhas, categorias, onSelecionar, onCategoria }: Props) {
  return (
    <ul className="divide-y divide-slate-200" aria-label="Prévia da importação">
      {linhas.map((l) => {
        const opcoes = categorias.filter((c) => c.tipo === l.tipo && !c.arquivada);
        const estado = l.erro ? `Erro: ${l.erro}` : l.duplicata ? 'Possível duplicata' : 'Pronta';
        const cor = l.erro ? 'text-red-800' : l.duplicata ? 'text-amber-800' : 'text-emerald-800';
        const rotulo = `linha ${l.indice}`;
        return (
          <li key={l.indice} className={`grid gap-2 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center ${l.erro ? 'bg-red-50' : l.duplicata ? 'bg-amber-50' : ''}`}>
            <input
              type="checkbox"
              aria-label={`Importar ${rotulo}`}
              checked={l.selecionada}
              disabled={Boolean(l.erro)}
              onChange={(e) => onSelecionar(l.indice, e.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{l.descricao || '(sem descrição)'}</p>
              <p className="text-xs text-slate-600">
                {l.data ? formatarData(l.data) : 'sem data'} · {l.erro ? '—' : `${l.tipo === 'receita' ? 'Receita' : 'Despesa'} ${formatarMoeda(l.valor)}`}
              </p>
              <p className={`text-xs font-medium ${cor}`} data-testid={`estado-linha-${l.indice}`}>
                {estado}
              </p>
            </div>
            {!l.erro ? (
              <select
                aria-label={`Categoria da ${rotulo}`}
                value={l.categoriaId ?? ''}
                onChange={(e) => onCategoria(l.indice, e.target.value)}
                className="min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
