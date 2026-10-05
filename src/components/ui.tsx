import type { HTMLAttributes, ReactNode } from 'react';
import { EmptyState } from './novos';
import { Alert } from '../ds/Alert';
import { Card } from '../ds/Card';
import { PageHeader } from '../ds/PageHeader';
import { Button } from '../ds/Button';
import { Input } from '../ds/Input';
import { Select } from '../ds/Select';
import '../styles/layout.css';
import './ui.css';

const juntar = (...partes: (string | false | undefined)[]) => partes.filter(Boolean).join(' ');



export const EstadoVazio = EmptyState;


/** Valor monetário com sinal e cor: positivo em verde, negativo em vermelho (o sinal vai no texto). */
export function Valor({ centavos, texto, className = '', ...props }: { centavos: number; texto: string } & HTMLAttributes<HTMLSpanElement>) {
  const cor = centavos < 0 ? 'ui-valor--negativo' : centavos > 0 ? 'ui-valor--positivo' : 'ui-valor--zero';
  // `tabular-nums` é o gancho da regra `html.ocultar-valores` (desfoque) em index.css.
  return (
    <span className={juntar('ui-valor', 'tabular-nums', cor, className)} {...props}>
      {texto}
    </span>
  );
}

/** Nomes antigos em pt-BR; a implementação vive em `src/ds`. */
export const Botao = Button;
export const CampoTexto = Input;
export const CampoSelect = Select;
export const Alerta = Alert;
export const Cartao = Card;

/** Cabeçalho de página; `children` é o título. Veja `PageHeader` para a descrição. */
export function TituloPagina({ children, acoes, descricao }: { children: ReactNode; acoes?: ReactNode; descricao?: string }) {
  return <PageHeader titulo={children} acoes={acoes} descricao={descricao} />;
}
