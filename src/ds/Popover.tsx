import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import './Popover.css';

interface Props {
  /** Texto do botão que abre o painel. */
  gatilho: ReactNode;
  /** Nome acessível do painel. */
  rotulo: string;
  children: ReactNode;
  className?: string;
}

/** Painel flutuante ancorado a um botão; fecha com Esc, clique fora ou perda de foco para fora. */
export function Popover({ gatilho, rotulo, children, className }: Props) {
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className={cx('ds-popover', className)}>
      <button ref={botao} type="button" className="ds-botao ds-botao--secundario" aria-haspopup="dialog" aria-expanded={aberto} aria-controls={aberto ? id : undefined} onClick={() => setAberto((a) => !a)}>
        {gatilho}
      </button>
      {aberto ? (
        <div id={id} role="dialog" aria-label={rotulo} className="ds-popover__painel">
          {children}
        </div>
      ) : null}
    </div>
  );
}
