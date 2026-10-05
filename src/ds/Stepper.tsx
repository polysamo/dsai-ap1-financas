import { cx } from './cx';
import './Stepper.css';

export interface Etapa {
  rotulo: string;
  descricao?: string;
}

const SITUACAO = { concluida: 'Concluída', atual: 'Etapa atual', pendente: 'Pendente' } as const;

/** Etapas de um fluxo; a situação de cada uma é dita em texto, não só por cor. `atual` começa em 0. */
export function Stepper({ etapas, atual }: { etapas: Etapa[]; atual: number }) {
  return (
    <ol className="ds-etapas" aria-label="Etapas">
      {etapas.map((e, i) => {
        const situacao = i < atual ? 'concluida' : i === atual ? 'atual' : 'pendente';
        return (
          <li key={e.rotulo} aria-current={situacao === 'atual' ? 'step' : undefined} className={cx('ds-etapas__etapa', `ds-etapas__etapa--${situacao}`)}>
            <span className="ds-etapas__marca" aria-hidden="true">
              {situacao === 'concluida' ? '✓' : i + 1}
            </span>
            <span className="ds-etapas__texto">
              <span className="ds-etapas__rotulo">{e.rotulo}</span>
              {e.descricao ? <span className="ds-etapas__descricao">{e.descricao}</span> : null}
              <span className="ds-sr-somente">{SITUACAO[situacao]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
