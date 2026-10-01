import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { EmptyState } from './novos';
import '../styles/layout.css';
import './ui.css';

const juntar = (...partes: (string | false | undefined)[]) => partes.filter(Boolean).join(' ');

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link';

export function Botao({
  variante = 'primario',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }) {
  return <button type={type} className={juntar('ui-botao', `ui-botao--${variante}`, className)} {...props} />;
}

interface CampoProps {
  label: string;
  erro?: string;
  dica?: string;
}

function Mensagem({ id, erro, dica }: { id: string; erro?: string; dica?: string }) {
  if (erro) {
    return (
      <p id={id} role="alert" className="ui-campo__erro">
        {erro}
      </p>
    );
  }
  return dica ? (
    <p id={id} className="ui-campo__dica">
      {dica}
    </p>
  ) : null;
}

export function CampoTexto({ label, erro, dica, className = '', ...props }: CampoProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className="ui-campo">
      <label htmlFor={id} className="ui-campo__rotulo">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro || dica ? idMsg : undefined}
        className={juntar('ui-campo__controle', erro ? 'ui-campo__controle--erro' : undefined, className)}
        {...props}
      />
      <Mensagem id={idMsg} erro={erro} dica={dica} />
    </div>
  );
}

export function CampoSelect({
  label,
  erro,
  dica,
  className = '',
  children,
  ...props
}: CampoProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className="ui-campo">
      <label htmlFor={id} className="ui-campo__rotulo">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro || dica ? idMsg : undefined}
        className={juntar('ui-campo__controle', erro ? 'ui-campo__controle--erro' : undefined, className)}
        {...props}
      >
        {children}
      </select>
      <Mensagem id={idMsg} erro={erro} dica={dica} />
    </div>
  );
}

export function Cartao({ titulo, children, acoes, className = '' }: { titulo?: string; children: ReactNode; acoes?: ReactNode; className?: string }) {
  return (
    <section className={juntar('ui-cartao', className)}>
      {titulo || acoes ? (
        <div className="ui-cartao__cabecalho">
          {titulo ? <h2 className="ui-cartao__titulo">{titulo}</h2> : <span />}
          {acoes}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function TituloPagina({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="ui-titulo-pagina">
      <h1 className="ui-titulo-pagina__texto">{children}</h1>
      {acoes}
    </div>
  );
}

export const EstadoVazio = EmptyState;

export function Alerta({ tipo = 'erro', children }: { tipo?: 'erro' | 'aviso' | 'sucesso'; children: ReactNode }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`ui-alerta ui-alerta--${tipo}`}>
      {children}
    </div>
  );
}

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
