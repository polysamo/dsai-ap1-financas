import { useMemo, useState, type ReactNode } from 'react';
import { cx } from './cx';
import { Pagination } from './Pagination';
import './Table.css';

export interface Coluna<T> {
  id: string;
  titulo: string;
  celula: (linha: T) => ReactNode;
  /** Valor usado para ordenar; sem ele a coluna não é ordenável. */
  valor?: (linha: T) => string | number;
  alinhar?: 'direita';
}

export type Direcao = 'asc' | 'desc';

interface Props<T> {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (linha: T) => string;
  /** Descrição da tabela para leitores de tela. */
  legenda: string;
  ordenacaoInicial?: { coluna: string; direcao: Direcao };
  /** Mostra caixas de seleção; a seleção é controlada por quem usa. */
  selecionadas?: ReadonlySet<string>;
  aoSelecionar?: (ids: Set<string>) => void;
  rotuloSelecao?: (linha: T) => string;
  tamanhoPagina?: number;
  vazio?: ReactNode;
  className?: string;
}

function comparar(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
}

/** Tabela com ordenação, seleção, paginação e, em telas estreitas, linhas em formato de cartão. */
export function Table<T>({ colunas, linhas, chave, legenda, ordenacaoInicial, selecionadas, aoSelecionar, rotuloSelecao, tamanhoPagina, vazio, className }: Props<T>) {
  const [ordem, setOrdem] = useState(ordenacaoInicial ?? null);
  const [pagina, setPagina] = useState(1);
  const selecionavel = selecionadas !== undefined && aoSelecionar !== undefined;

  const ordenadas = useMemo(() => {
    const col = colunas.find((c) => c.id === ordem?.coluna);
    if (!ordem || !col?.valor) return linhas;
    const f = col.valor;
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...linhas].sort((a, b) => sinal * comparar(f(a), f(b)));
  }, [linhas, colunas, ordem]);

  const totalPaginas = tamanhoPagina ? Math.max(1, Math.ceil(ordenadas.length / tamanhoPagina)) : 1;
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = tamanhoPagina ? ordenadas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina) : ordenadas;

  const alternarOrdem = (id: string) =>
    setOrdem((atual) => (atual?.coluna === id && atual.direcao === 'asc' ? { coluna: id, direcao: 'desc' } : { coluna: id, direcao: 'asc' }));

  const todasVisiveis = visiveis.length > 0 && visiveis.every((l) => selecionadas?.has(chave(l)));
  const alternarTodas = () => {
    if (!selecionavel) return;
    const proximas = new Set(selecionadas);
    for (const l of visiveis) {
      if (todasVisiveis) proximas.delete(chave(l));
      else proximas.add(chave(l));
    }
    aoSelecionar(proximas);
  };
  const alternarLinha = (id: string) => {
    if (!selecionavel) return;
    const proximas = new Set(selecionadas);
    if (proximas.has(id)) proximas.delete(id);
    else proximas.add(id);
    aoSelecionar(proximas);
  };

  if (linhas.length === 0 && vazio) return <>{vazio}</>;

  return (
    <div className={cx('ds-tabela-envoltorio', className)}>
      <table className="ds-tabela">
        <caption className="ds-sr-somente">{legenda}</caption>
        <thead>
          <tr>
            {selecionavel ? (
              <th scope="col" className="ds-tabela__selecao">
                <input type="checkbox" aria-label="Selecionar todas as linhas" checked={todasVisiveis} onChange={alternarTodas} />
              </th>
            ) : null}
            {colunas.map((c) => {
              const ativa = ordem?.coluna === c.id;
              return (
                <th key={c.id} scope="col" aria-sort={c.valor ? (ativa ? (ordem?.direcao === 'asc' ? 'ascending' : 'descending') : 'none') : undefined} className={cx(c.alinhar === 'direita' && 'ds-tabela__direita')}>
                  {c.valor ? (
                    <button type="button" className="ds-tabela__ordenar" onClick={() => alternarOrdem(c.id)}>
                      {c.titulo}
                      <span aria-hidden="true">{ativa ? (ordem?.direcao === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((linha) => {
            const id = chave(linha);
            const marcada = selecionadas?.has(id) ?? false;
            return (
              <tr key={id} aria-selected={selecionavel ? marcada : undefined} className={cx(marcada && 'ds-tabela__linha--marcada')}>
                {selecionavel ? (
                  <td className="ds-tabela__selecao">
                    <input type="checkbox" aria-label={rotuloSelecao ? rotuloSelecao(linha) : `Selecionar linha ${id}`} checked={marcada} onChange={() => alternarLinha(id)} />
                  </td>
                ) : null}
                {colunas.map((c) => (
                  <td key={c.id} data-rotulo={c.titulo} className={cx(c.alinhar === 'direita' && 'ds-tabela__direita')}>
                    {c.celula(linha)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {tamanhoPagina ? <Pagination pagina={paginaAtual} totalPaginas={totalPaginas} onChange={setPagina} /> : null}
    </div>
  );
}
