import type { ReactNode } from 'react';
import { cx } from './cx';
import './Alert.css';

export type TipoAlerta = 'erro' | 'aviso' | 'sucesso' | 'info';

const ROTULO: Record<TipoAlerta, string> = { erro: 'Erro', aviso: 'Aviso', sucesso: 'Sucesso', info: 'Informação' };

interface Props {
  tipo?: TipoAlerta;
  titulo?: string;
  children: ReactNode;
  className?: string;
}

/** Mensagem em linha. Erros são anunciados na hora (`alert`); os demais, com educação (`status`). O tipo também aparece em texto. */
export function Alert({ tipo = 'erro', titulo, children, className }: Props) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={cx('ds-alerta', `ds-alerta--${tipo}`, className)}>
      <span className="ds-sr-somente">{ROTULO[tipo]}: </span>
      {titulo ? <strong className="ds-alerta__titulo">{titulo}</strong> : null}
      <div className="ds-alerta__texto">{children}</div>
    </div>
  );
}
