import { formatarData } from '../../domain/date';
import {
  progresso52,
  progressoSemGastos,
  progressoTeto,
  ROTULO_SITUACAO_DESAFIO,
  ROTULO_TIPO_DESAFIO,
  SEMANAS,
  valorDaSemana,
  type Desafio,
  type Desafio52,
  type DesafioSemGastos,
  type DesafioTeto,
  type SituacaoDesafio,
} from '../../domain/desafios';
import { formatarMoeda } from '../../domain/money';
import { nomeCompleto } from '../../domain/subcategorias';
import type { AppState, DataISO } from '../../domain/types';
import { Botao } from '../ui';

function Barra({ percentual, rotulo }: { percentual: number; rotulo: string }) {
  const p = Math.max(0, Math.min(100, percentual));
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} className="desafio__trilho">
      <div className="desafio__barra" style={{ width: `${p}%` }} />
    </div>
  );
}

function Semanas({ desafio, hoje, onAlternar }: { desafio: Desafio52; hoje: DataISO; onAlternar: (semana: number) => void }) {
  const p = progresso52(desafio, hoje);
  return (
    <>
      <p className="desafio__linha">
        Guardado {formatarMoeda(p.guardado)} de {formatarMoeda(p.total)} · faltam {formatarMoeda(p.restante)} · {p.feitas} de {SEMANAS} semanas
      </p>
      <Barra percentual={p.percentual} rotulo={`Progresso de ${desafio.nome}`} />
      <div className="desafio__semanas" role="group" aria-label={`Semanas de ${desafio.nome}`}>
        {Array.from({ length: SEMANAS }, (_, i) => i + 1).map((n) => (
          <label key={n} className={`desafio__semana${n === p.semanaAtual ? ' desafio__semana--atual' : ''}`} title={formatarMoeda(valorDaSemana(desafio, n))}>
            <input type="checkbox" checked={desafio.semanasFeitas.includes(n)} onChange={() => onAlternar(n)} aria-label={`Semana ${n}, ${formatarMoeda(valorDaSemana(desafio, n))}${n === p.semanaAtual ? ', semana atual' : ''}`} />
            <span aria-hidden="true">{n}</span>
          </label>
        ))}
      </div>
    </>
  );
}

function SemGastos({ desafio, estado, hoje }: { desafio: DesafioSemGastos; estado: AppState; hoje: DataISO }) {
  const p = progressoSemGastos(estado, desafio, hoje);
  return (
    <>
      <p className="desafio__linha">
        Sem gastar com {desafio.categoriaIds.map((id) => nomeCompleto(estado.categorias, id)).join(', ')} até {formatarData(p.fim)} · {p.diasLimpos} de {desafio.dias} dias limpos
      </p>
      <Barra percentual={p.percentual} rotulo={`Progresso de ${desafio.nome}`} />
      {p.quebras.length > 0 ? (
        <ul className="desafio__quebras" aria-label={`Despesas que quebraram ${desafio.nome}`}>
          {p.quebras.map((t) => (
            <li key={t.id}>
              {formatarData(t.data)} · {t.descricao || nomeCompleto(estado.categorias, t.categoriaId)} · {formatarMoeda(t.valor)}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Teto({ desafio, estado, hoje }: { desafio: DesafioTeto; estado: AppState; hoje: DataISO }) {
  const p = progressoTeto(estado, desafio, hoje);
  return (
    <>
      <p className="desafio__linha">
        {nomeCompleto(estado.categorias, desafio.categoriaId)} até {formatarData(p.fim)} · gasto {formatarMoeda(p.gasto)} de {formatarMoeda(desafio.limite)} ·{' '}
        {p.restante >= 0 ? `restam ${formatarMoeda(p.restante)}` : `passou ${formatarMoeda(-p.restante)}`}
      </p>
      <Barra percentual={p.percentual} rotulo={`Consumo do teto de ${desafio.nome}`} />
      {p.porDia !== null ? <p className="desafio__dica">Cabem {formatarMoeda(p.porDia)} por dia até o fim.</p> : null}
    </>
  );
}

interface Props {
  desafio: Desafio;
  situacao: SituacaoDesafio;
  estado: AppState;
  hoje: DataISO;
  onAlternarSemana: (semana: number) => void;
  onAbandonar: () => void;
  onExcluir: () => void;
}

export function CartaoDesafio({ desafio, situacao, estado, hoje, onAlternarSemana, onAbandonar, onExcluir }: Props) {
  const encerrado = situacao === 'concluido' || situacao === 'falhou' || situacao === 'abandonado';
  return (
    <article className={`desafio desafio--${situacao}`} aria-label={desafio.nome}>
      <header className="desafio__cabecalho">
        <div>
          <h3 className="desafio__nome">{desafio.nome}</h3>
          <p className="desafio__tipo">
            {ROTULO_TIPO_DESAFIO[desafio.tipo]} · desde {formatarData(desafio.inicio)}
          </p>
        </div>
        <span className="desafio__situacao">{ROTULO_SITUACAO_DESAFIO[situacao]}</span>
      </header>
      {desafio.tipo === 'semanas52' ? <Semanas desafio={desafio} hoje={hoje} onAlternar={onAlternarSemana} /> : null}
      {desafio.tipo === 'sem-gastos' ? <SemGastos desafio={desafio} estado={estado} hoje={hoje} /> : null}
      {desafio.tipo === 'teto' ? <Teto desafio={desafio} estado={estado} hoje={hoje} /> : null}
      <div className="desafio__acoes">
        {encerrado ? null : (
          <Botao variante="secundario" onClick={onAbandonar} aria-label={`Abandonar ${desafio.nome}`}>
            Abandonar
          </Botao>
        )}
        <Botao variante="link" onClick={onExcluir} aria-label={`Excluir ${desafio.nome}`}>
          Excluir
        </Botao>
      </div>
    </article>
  );
}
