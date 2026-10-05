import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import './IconButton.css';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Obrigatório: um botão só de ícone não tem outro nome acessível. */
  'aria-label': string;
  icone: ReactNode;
  tamanho?: 'pequeno' | 'medio';
}

export function IconButton({ icone, tamanho = 'medio', type = 'button', className, ...resto }: Props) {
  return (
    <button type={type} className={cx('ds-icone-botao', tamanho === 'pequeno' && 'ds-icone-botao--pequeno', className)} {...resto}>
      <span aria-hidden="true" className="ds-icone-botao__icone">
        {icone}
      </span>
    </button>
  );
}
