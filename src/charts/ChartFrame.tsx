import type { ReactNode } from 'react';
import { cx } from '../ds/cx';
import { Legenda } from './Legenda';
import type { TabelaGrafico } from './tabela';
import type { ConfigGrafico } from './compacto';
import './charts.css';

interface Props {
  descricao: string;
  rotuloTabela: string;
  titulo?: string;
  /** Mensagem exibida no lugar do gráfico; quando definida, nada é desenhado. */
  vazio?: string;
  tabela: TabelaGrafico | null;
  config: ConfigGrafico;
  legenda?: { nome: string; cor: string }[];
  className?: string;
  children: ReactNode;
}

/** Moldura comum: descrição acessível, estado vazio, legenda e a tabela alternativa recolhível. */
export function ChartFrame({ descricao, rotuloTabela, titulo, vazio, tabela, config, legenda, className, children }: Props) {
  return (
    <figure className={cx('grafico', className)}>
      {titulo ? <figcaption className="grafico__titulo">{titulo}</figcaption> : null}
      {vazio ? (
        <p className="grafico__vazio">{vazio}</p>
      ) : (
        <>
          <div role="img" aria-label={descricao} className="grafico__area" style={{ height: config.altura }}>
            {children}
          </div>
          {legenda && config.mostrarLegenda && legenda.length > 1 ? <Legenda itens={legenda} /> : null}
          {tabela ? (
            <details className="grafico__detalhes">
              <summary className="grafico__resumo">Ver como tabela</summary>
              <table className="grafico__tabela" aria-label={rotuloTabela}>
                <thead>
                  <tr>
                    {tabela.colunas.map((c, i) => (
                      <th key={c} scope="col" className={i > 0 ? 'grafico__num' : undefined}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tabela.linhas.map((l) => (
                    <tr key={l.rotulo}>
                      <th scope="row">{l.rotulo}</th>
                      {l.celulas.map((c, i) => (
                        <td key={i} className="grafico__num">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {tabela.total ? (
                  <tfoot>
                    <tr>
                      <th scope="row">{tabela.total.rotulo}</th>
                      {tabela.total.celulas.map((c, i) => (
                        <td key={i} className="grafico__num">
                          {c}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </details>
          ) : null}
        </>
      )}
    </figure>
  );
}
