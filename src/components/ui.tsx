import { useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

const base =
  'w-full min-w-0 rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link';

const variantes: Record<VarianteBotao, string> = {
  primario: 'bg-emerald-700 text-white hover:bg-emerald-800',
  secundario: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100',
  perigo: 'bg-red-700 text-white hover:bg-red-800',
  link: 'text-emerald-800 underline hover:text-emerald-950',
};

export function Botao({
  variante = 'primario',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${className}`}
      {...props}
    />
  );
}

interface CampoProps {
  label: string;
  erro?: string;
  dica?: string;
}

export function CampoTexto({ label, erro, dica, className = '', ...props }: CampoProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const idMsg = `${id}-msg`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro || dica ? idMsg : undefined}
        className={`${base} ${erro ? 'border-red-600' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {erro ? (
        <p id={idMsg} role="alert" className="mt-1 text-sm text-red-700">
          {erro}
        </p>
      ) : dica ? (
        <p id={idMsg} className="mt-1 text-xs text-slate-600">
          {dica}
        </p>
      ) : null}
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
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro || dica ? idMsg : undefined}
        className={`${base} ${erro ? 'border-red-600' : 'border-slate-300'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {erro ? (
        <p id={idMsg} role="alert" className="mt-1 text-sm text-red-700">
          {erro}
        </p>
      ) : dica ? (
        <p id={idMsg} className="mt-1 text-xs text-slate-600">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function Cartao({ titulo, children, acoes, className = '' }: { titulo?: string; children: ReactNode; acoes?: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {titulo || acoes ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo ? <h2 className="text-base font-semibold text-slate-900">{titulo}</h2> : <span />}
          {acoes}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function TituloPagina({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{children}</h1>
      {acoes}
    </div>
  );
}

export function EstadoVazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="font-medium text-slate-900">{titulo}</p>
      {children ? <p className="mt-1 text-sm text-slate-600">{children}</p> : null}
      {acao ? <div className="mt-3 flex justify-center">{acao}</div> : null}
    </div>
  );
}

export function Alerta({ tipo = 'erro', children }: { tipo?: 'erro' | 'aviso' | 'sucesso'; children: ReactNode }) {
  const cores = {
    erro: 'border-red-300 bg-red-50 text-red-900',
    aviso: 'border-amber-300 bg-amber-50 text-amber-900',
    sucesso: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  };
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${cores[tipo]}`}>
      {children}
    </div>
  );
}

/** Valor monetário com sinal e cor: positivo em verde, negativo em vermelho (o sinal vai no texto). */
export function Valor({ centavos, texto, className = '', ...props }: { centavos: number; texto: string } & HTMLAttributes<HTMLSpanElement>) {
  const cor = centavos < 0 ? 'text-red-700' : centavos > 0 ? 'text-emerald-800' : 'text-slate-700';
  return (
    <span className={`whitespace-nowrap font-medium tabular-nums ${cor} ${className}`} {...props}>
      {texto}
    </span>
  );
}
