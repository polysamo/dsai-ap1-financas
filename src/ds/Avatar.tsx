import { cx } from './cx';
import './Avatar.css';

/** Iniciais: primeira letra da primeira e da última palavra do nome. */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '?';
  const primeira = palavras[0][0];
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : '';
  return (primeira + ultima).toLocaleUpperCase('pt-BR');
}

interface Props {
  nome: string;
  src?: string;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  className?: string;
}

export function Avatar({ nome, src, tamanho = 'medio', className }: Props) {
  return src ? (
    <img src={src} alt={nome} className={cx('ds-avatar', `ds-avatar--${tamanho}`, className)} />
  ) : (
    <span role="img" aria-label={nome} className={cx('ds-avatar', `ds-avatar--${tamanho}`, className)}>
      <span aria-hidden="true">{iniciais(nome)}</span>
    </span>
  );
}
