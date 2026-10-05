import type { FormEvent, ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import './FilterBar.css';

interface Props {
  children: ReactNode;
  /** Há algum filtro diferente do padrão; controla o botão "Limpar filtros". */
  ativo?: boolean;
  aoLimpar?: () => void;
  /** Texto de resultado anunciado a leitores de tela (ex.: "12 de 140 transações"). */
  resumo?: string;
  className?: string;
}

/** Barra de filtros comum: campos em grade, "Limpar filtros" e resumo anunciado. */
export function FilterBar({ children, ativo = false, aoLimpar, resumo, className }: Props) {
  return (
    <form role="search" aria-label="Filtros" className={cx('ds-filtros', className)} onSubmit={(e: FormEvent) => e.preventDefault()}>
      <div className="ds-filtros__campos">{children}</div>
      <div className="ds-filtros__rodape">
        <p className="ds-filtros__resumo" aria-live="polite">
          {resumo}
        </p>
        {ativo && aoLimpar ? (
          <Button variante="fantasma" tamanho="pequeno" onClick={aoLimpar}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </form>
  );
}
