import { nomeMes, nomeMesCurto } from '../../domain/date';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { ROTULO_ESTADO_ANUAL, type CelulaAnual, type VisaoAnual } from '../../domain/orcamentoAnual';
import type { EstadoOrcamento } from '../../domain/orcamento';
import './GradeAnual.css';

const ICONE: Record<EstadoOrcamento, string> = { normal: '✓', atencao: '!', estourado: '✕' };

export interface CelulaSelecionada {
  categoriaId: string;
  mes: string;
}

interface Props {
  visao: VisaoAnual;
  selecionada: CelulaSelecionada | null;
  onSelecionar: (celula: CelulaSelecionada) => void;
  onAlternarRollover: (categoriaId: string) => void;
}

function textoCarry(c: CelulaAnual): string {
  return `Rollover ${c.carry > 0 ? '+' : '-'}${formatarMoeda(Math.abs(c.carry))}`;
}

export function GradeAnual({ visao, selecionada, onSelecionar, onAlternarRollover }: Props) {
  return (
    <div className="orcanual-rolagem" role="region" aria-label={`Orçamento de ${visao.ano}`} tabIndex={0}>
      <table className="orcanual-grade">
        <caption className="orcanual-oculto">Limites e gastos por categoria e mês em {visao.ano}</caption>
        <thead>
          <tr>
            <th scope="col" className="orcanual-col-categoria">
              Categoria
            </th>
            {visao.meses.map((mes) => (
              <th key={mes} scope="col" className="orcanual-col-mes" abbr={nomeMes(mes)}>
                {nomeMesCurto(mes)}
              </th>
            ))}
            <th scope="col" className="orcanual-col-total">
              Orçado × realizado
            </th>
          </tr>
        </thead>
        <tbody>
          {visao.linhas.map((l) => (
            <tr key={l.categoria.id} data-testid={`linha-${l.categoria.id}`}>
              <th scope="row" className="orcanual-col-categoria">
                <span className="orcanual-nome">
                  {l.categoria.nome}
                  {l.categoria.arquivada ? <span className="orcanual-etiqueta">arquivada</span> : null}
                </span>
                <label className="orcanual-rollover">
                  <input type="checkbox" checked={l.rollover} onChange={() => onAlternarRollover(l.categoria.id)} aria-label={`Rollover de ${l.categoria.nome}`} />
                  Rollover
                </label>
              </th>
              {l.celulas.map((c) => {
                const ativa = selecionada?.categoriaId === l.categoria.id && selecionada.mes === c.mes;
                return (
                  <td key={c.mes} className={`orcanual-celula${c.estado ? ` orcanual-celula--${c.estado}` : ''}`}>
                    <button
                      type="button"
                      className="orcanual-celula-botao"
                      aria-pressed={ativa}
                      aria-label={`Editar limite de ${l.categoria.nome} em ${nomeMes(c.mes)}`}
                      onClick={() => onSelecionar({ categoriaId: l.categoria.id, mes: c.mes })}
                    >
                      <span className="orcanual-limite" data-testid={`limite-${l.categoria.id}-${c.mes}`}>
                        {c.limite === null ? 'Sem limite' : formatarMoeda(c.limite)}
                      </span>
                      <span className="orcanual-gasto" data-testid={`gasto-${l.categoria.id}-${c.mes}`}>
                        Gasto {formatarMoeda(c.gasto)}
                      </span>
                      {c.carry !== 0 ? (
                        <span className="orcanual-carry" data-testid={`carry-${l.categoria.id}-${c.mes}`}>
                          {textoCarry(c)}
                        </span>
                      ) : null}
                      {c.estado ? (
                        <span className="orcanual-estado">
                          <span aria-hidden="true">{ICONE[c.estado]} </span>
                          {ROTULO_ESTADO_ANUAL[c.estado]}
                        </span>
                      ) : null}
                    </button>
                  </td>
                );
              })}
              <td className={`orcanual-total${l.estado ? ` orcanual-total--${l.estado}` : ''}`} data-testid={`anual-${l.categoria.id}`}>
                {l.orcado === null || l.estado === null ? (
                  <>
                    <span>Sem limite no ano</span>
                    <span>Realizado {formatarMoeda(l.realizado)}</span>
                  </>
                ) : (
                  <>
                    <span>Orçado {formatarMoeda(l.orcado)}</span>
                    <span>Realizado {formatarMoeda(l.realizado)}</span>
                    <span className="orcanual-estado" data-testid={`situacao-${l.categoria.id}`}>
                      <span aria-hidden="true">{ICONE[l.estado]} </span>
                      {ROTULO_ESTADO_ANUAL[l.estado]} · {formatarPercentual(l.percentual)}
                    </span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="orcanual-col-categoria">
              Total do mês
            </th>
            {visao.totaisMes.map((t) => (
              <td key={t.mes} className="orcanual-celula orcanual-celula--total" data-testid={`total-${t.mes}`}>
                <span className="orcanual-limite">{formatarMoeda(t.limite)}</span>
                <span className="orcanual-gasto">Gasto {formatarMoeda(t.gasto)}</span>
              </td>
            ))}
            <td className="orcanual-total" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
