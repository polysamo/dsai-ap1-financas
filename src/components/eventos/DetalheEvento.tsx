import { formatarData } from '../../domain/date';
import { ROTULO_SITUACAO_EVENTO, type Evento, type ResumoEvento } from '../../domain/eventos';
import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { ProgressBar } from '../novos';
import { Botao, Valor } from '../ui';
import '../../styles/tabela-dados.css';

interface Props {
  evento: Evento;
  resumo: ResumoEvento;
  semTag: number;
  onEtiquetar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

export function DetalheEvento({ evento, resumo, semTag, onEtiquetar, onEditar, onExcluir }: Props) {
  const passou = resumo.projecao !== null && resumo.projecao > evento.orcamento;
  return (
    <div className="evento-detalhe">
      <p className="evento-detalhe__periodo">
        {formatarData(evento.inicio)} a {formatarData(evento.fim)} · {resumo.duracao} {resumo.duracao === 1 ? 'dia' : 'dias'} · tag <code>#{evento.tag}</code>
      </p>
      <dl className="evento-detalhe__numeros">
        <div>
          <dt>Orçamento</dt>
          <dd className="tabular-nums">{formatarMoeda(evento.orcamento)}</dd>
        </div>
        <div>
          <dt>Gasto</dt>
          <dd className="tabular-nums" data-testid="evento-gasto">
            {formatarMoeda(resumo.gasto)}
          </dd>
        </div>
        <div>
          <dt>Restante</dt>
          <dd data-testid="evento-restante">
            <Valor centavos={resumo.restante} texto={formatarMoeda(resumo.restante)} />
          </dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd data-testid="evento-situacao">
            {ROTULO_SITUACAO_EVENTO[resumo.situacao]} ({formatarPercentual(resumo.percentual)})
          </dd>
        </div>
      </dl>
      <ProgressBar valor={Math.max(resumo.gasto, 0)} max={evento.orcamento} rotulo={`Consumo do orçamento de ${evento.nome}`} mostrarEstado={false} />
      {resumo.reembolsos > 0 ? <p className="evento-detalhe__nota">Inclui {formatarMoeda(resumo.reembolsos)} de reembolsos abatidos.</p> : null}

      <p className="evento-detalhe__ritmo" data-testid="evento-ritmo">
        {resumo.mediaDiaria === null
          ? 'O evento ainda não começou.'
          : resumo.encerrado
            ? `Encerrado: total final de ${formatarMoeda(resumo.gasto)}, média de ${formatarMoeda(resumo.mediaDiaria)} por dia.`
            : `Média de ${formatarMoeda(resumo.mediaDiaria)} por dia em ${resumo.diasDecorridos} ${resumo.diasDecorridos === 1 ? 'dia' : 'dias'}; projeção de ${formatarMoeda(resumo.projecao ?? 0)} até o fim${passou ? ', acima do orçamento.' : ', dentro do orçamento.'}`}
      </p>

      {resumo.porCategoria.length > 0 ? (
        <table className="tabela-dados" aria-label={`Gasto por categoria em ${evento.nome}`}>
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col" className="tabela-dados__num">Valor</th>
              <th scope="col" className="tabela-dados__num">%</th>
            </tr>
          </thead>
          <tbody>
            {resumo.porCategoria.map((l) => (
              <tr key={l.categoriaId}>
                <th scope="row">{l.nome}</th>
                <td className="tabela-dados__num">{formatarMoeda(l.valor)}</td>
                <td className="tabela-dados__num">{formatarPercentual(l.percentual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="evento-detalhe__nota">Nenhuma despesa com a tag #{evento.tag} ainda.</p>
      )}

      {resumo.maiores.length > 0 ? (
        <>
          <h3 className="evento-detalhe__subtitulo">Maiores despesas</h3>
          <ol className="evento-detalhe__maiores" aria-label={`Maiores despesas de ${evento.nome}`}>
            {resumo.maiores.map((t) => (
              <li key={t.id}>
                <span>
                  {formatarData(t.data)} · {t.descricao || 'Sem descrição'}
                </span>
                <span className="tabular-nums">{formatarMoeda(t.valor)}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="evento-detalhe__acoes">
        <Botao variante="secundario" disabled={semTag === 0} onClick={onEtiquetar}>
          Etiquetar despesas do período ({semTag})
        </Botao>
        <Botao variante="secundario" onClick={onEditar}>
          Editar evento
        </Botao>
        <Botao variante="perigo" onClick={onExcluir}>
          Excluir evento
        </Botao>
      </div>
    </div>
  );
}
