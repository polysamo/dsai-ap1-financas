import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import './Dropdown.css';

export interface ItemMenu {
  rotulo: string;
  aoSelecionar: () => void;
  desabilitado?: boolean;
  perigo?: boolean;
}

interface Props {
  gatilho: ReactNode;
  itens: ItemMenu[];
  /** Nome acessível do menu. */
  rotulo: string;
  className?: string;
}

/** Menu de ações: setas, Home/End, Enter/Espaço escolhem, Esc fecha e devolve o foco ao botão. */
export function Dropdown({ gatilho, itens, rotulo, className }: Props) {
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [aberto, setAberto] = useState(false);

  const habilitados = itens.map((it, i) => (it.desabilitado ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (!aberto) return;
    refs.current[habilitados[0]]?.focus();
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const mover = (atual: number, passo: number) => {
    const pos = habilitados.indexOf(atual);
    refs.current[habilitados[(pos + passo + habilitados.length) % habilitados.length]]?.focus();
  };

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      mover(indice, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      mover(indice, -1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      refs.current[habilitados[0]]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      refs.current[habilitados[habilitados.length - 1]]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAberto(false);
      botao.current?.focus();
    } else if (e.key === 'Tab') {
      setAberto(false);
    }
  };

  return (
    <div ref={raiz} className={cx('ds-menu', className)}>
      <button ref={botao} type="button" className="ds-botao ds-botao--secundario" aria-haspopup="menu" aria-expanded={aberto} aria-controls={aberto ? id : undefined} onClick={() => setAberto((a) => !a)}>
        {gatilho}
      </button>
      {aberto ? (
        <div id={id} role="menu" aria-label={rotulo} className="ds-menu__lista">
          {itens.map((it, i) => (
            <button
              key={it.rotulo}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              disabled={it.desabilitado}
              className={cx('ds-menu__item', it.perigo && 'ds-menu__item--perigo')}
              onKeyDown={(e) => aoTeclar(e, i)}
              onClick={() => {
                setAberto(false);
                botao.current?.focus();
                it.aoSelecionar();
              }}
            >
              {it.rotulo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
