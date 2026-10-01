import './OfxPrevia.css';
import { formatarData } from '../domain/date';
import { formatarMoeda } from '../domain/money';
import type { LinhaOfx, OrigemDuplicata } from '../domain/ofx';
import type { Categoria } from '../domain/types';

export interface LinhaPreviaOfx extends LinhaOfx {
  duplicata?: OrigemDuplicata;
  selecionada: boolean;
  categoriaId?: string;
}

interface Props {
  linhas: LinhaPreviaOfx[];
  categorias: Categoria[];
  onSelecionar: (indice: number, selecionada: boolean) => void;
  onCategoria: (indice: number, categoriaId: string) => void;
}

function situacao(l: LinhaPreviaOfx): { texto: string; classe: string } {
  if (l.erro) return { texto: `Erro: ${l.erro}`, classe: 'ofx-previa__situacao--erro' };
  if (l.duplicata === 'fitid') return { texto: 'Já importada (FITID)', classe: 'ofx-previa__situacao--duplicata' };
  if (l.duplicata === 'dados') return { texto: 'Possível duplicata', classe: 'ofx-previa__situacao--duplicata' };
  return { texto: 'Pronta', classe: 'ofx-previa__situacao--pronta' };
}

export function OfxPrevia({ linhas, categorias, onSelecionar, onCategoria }: Props) {
  return (
    <ul className="ofx-previa" aria-label="Prévia da importação OFX">
      {linhas.map((l) => {
        const opcoes = categorias.filter((c) => c.tipo === l.tipo && !c.arquivada);
        const s = situacao(l);
        const rotulo = `lançamento ${l.indice}`;
        const destaque = l.erro ? 'ofx-previa__linha--erro' : l.duplicata ? 'ofx-previa__linha--duplicata' : '';
        return (
          <li key={l.indice} className={`ofx-previa__linha ${destaque}`}>
            <input
              type="checkbox"
              className="ofx-previa__marca"
              aria-label={`Importar ${rotulo}`}
              checked={l.selecionada}
              disabled={Boolean(l.erro)}
              onChange={(e) => onSelecionar(l.indice, e.target.checked)}
            />
            <div className="ofx-previa__dados">
              <p className="ofx-previa__descricao">{l.descricao || '(sem descrição)'}</p>
              <p className="ofx-previa__detalhe">
                {l.data ? formatarData(l.data) : 'sem data'}
                {l.erro ? '' : ` · ${l.tipo === 'receita' ? 'Receita' : 'Despesa'} ${formatarMoeda(l.valor)}`}
                {l.tipoOfx ? ` · ${l.tipoOfx}` : ''}
              </p>
              <p className={`ofx-previa__situacao ${s.classe}`} data-testid={`estado-ofx-${l.indice}`}>
                {s.texto}
              </p>
            </div>
            {l.erro ? (
              <span />
            ) : (
              <select
                className="ofx-previa__categoria"
                aria-label={`Categoria do ${rotulo}`}
                value={l.categoriaId ?? ''}
                onChange={(e) => onCategoria(l.indice, e.target.value)}
              >
                {opcoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}
