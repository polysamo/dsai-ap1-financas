import { useState, type ReactNode } from 'react';
import { cx } from './cx';
import { IconButton } from './IconButton';
import type { TipoAlerta } from './Alert';
import './Banner.css';

interface Props {
  tipo?: TipoAlerta;
  children: ReactNode;
  /** Quando informado, mostra o botão de dispensar e chama esta função ao dispensar. */
  aoDispensar?: () => void;
  /** Ação principal (ex.: um link ou botão). */
  acao?: ReactNode;
  className?: string;
}

/** Faixa de aviso em destaque, opcionalmente dispensável. */
export function Banner({ tipo = 'info', children, aoDispensar, acao, className }: Props) {
  const [oculto, setOculto] = useState(false);
  if (oculto) return null;
  return (
    <section aria-label="Aviso" className={cx('ds-banner', `ds-banner--${tipo}`, className)}>
      <div className="ds-banner__texto">{children}</div>
      {acao}
      {aoDispensar ? (
        <IconButton
          aria-label="Dispensar aviso"
          icone="✕"
          tamanho="pequeno"
          onClick={() => {
            setOculto(true);
            aoDispensar();
          }}
        />
      ) : null}
    </section>
  );
}
