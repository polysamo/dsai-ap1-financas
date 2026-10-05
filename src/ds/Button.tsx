import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Spinner } from './Spinner';
import './Button.css';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma' | 'link';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: 'pequeno' | 'medio';
  /** Mostra um spinner, marca `aria-busy` e ignora cliques. */
  carregando?: boolean;
}

export function Button({ variante = 'primario', tamanho = 'medio', carregando = false, type = 'button', className, disabled, children, onClick, ...resto }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('ds-botao', `ds-botao--${variante}`, tamanho === 'pequeno' && 'ds-botao--pequeno', className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      onClick={carregando ? undefined : onClick}
      {...resto}
    >
      {carregando ? <Spinner tamanho="pequeno" rotulo="Carregando" /> : null}
      {children}
    </button>
  );
}
