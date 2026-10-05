import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import './Tabs.css';

export interface AbaItem {
  id: string;
  rotulo: string;
  conteudo: ReactNode;
}

interface Props {
  abas: AbaItem[];
  /** Nome acessível da lista de abas. */
  rotulo: string;
  /** Controlado: id da aba ativa. Sem isto, o componente guarda o estado. */
  valor?: string;
  aoMudar?: (id: string) => void;
  className?: string;
}

/** Abas com teclado do padrão WAI-ARIA: setas, Home e End; só o painel ativo é renderizado. */
export function Tabs({ abas, rotulo, valor, aoMudar, className }: Props) {
  const base = useId();
  const [interno, setInterno] = useState(abas[0]?.id ?? '');
  const ativa = valor ?? interno;
  const indice = Math.max(0, abas.findIndex((a) => a.id === ativa));

  const escolher = (id: string) => {
    setInterno(id);
    aoMudar?.(id);
    document.getElementById(`${base}-aba-${id}`)?.focus();
  };

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const alvo =
      e.key === 'ArrowRight' ? (indice + 1) % abas.length : e.key === 'ArrowLeft' ? (indice - 1 + abas.length) % abas.length : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : null;
    if (alvo === null) return;
    e.preventDefault();
    escolher(abas[alvo].id);
  };

  return (
    <div className={cx('ds-abas', className)}>
      <div role="tablist" aria-label={rotulo} className="ds-abas__lista" onKeyDown={aoTeclar}>
        {abas.map((a) => (
          <button
            key={a.id}
            id={`${base}-aba-${a.id}`}
            role="tab"
            type="button"
            aria-selected={a.id === ativa}
            aria-controls={`${base}-painel-${a.id}`}
            tabIndex={a.id === ativa ? 0 : -1}
            className={cx('ds-abas__aba', a.id === ativa && 'ds-abas__aba--ativa')}
            onClick={() => escolher(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {abas[indice] ? (
        <div role="tabpanel" id={`${base}-painel-${abas[indice].id}`} aria-labelledby={`${base}-aba-${abas[indice].id}`} className="ds-abas__painel">
          {abas[indice].conteudo}
        </div>
      ) : null}
    </div>
  );
}
