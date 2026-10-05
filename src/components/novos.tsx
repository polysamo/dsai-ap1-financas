import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { nomeMes, somarMeses } from '../domain/date';
import './novos.css';

/** Seletor de mês: setas + rótulo por extenso ("Outubro de 2026"). */
export function MonthPicker({ mes, onChange }: { mes: string; onChange: (mes: string) => void }) {
  return (
    <div className="mp" role="group" aria-label="Mês">
      <button type="button" className="mp__seta" aria-label="Mês anterior" onClick={() => onChange(somarMeses(mes, -1))}>
        ‹
      </button>
      <span className="mp__rotulo" aria-live="polite">
        {nomeMes(mes)}
      </span>
      <button type="button" className="mp__seta" aria-label="Próximo mês" onClick={() => onChange(somarMeses(mes, 1))}>
        ›
      </button>
    </div>
  );
}

/** Indicador: rótulo pequeno, valor grande tabular, variação opcional. */
export function KpiCard({ rotulo, valor, variacao, destaque = false, tom }: { rotulo: string; valor: ReactNode; variacao?: ReactNode; destaque?: boolean; tom?: 'receita' | 'despesa' | 'perigo' }) {
  return (
    <div className={`kpi${destaque ? ' kpi--destaque' : ''}${tom ? ` kpi--${tom}` : ''}`}>
      <span className="kpi__rotulo">{rotulo}</span>
      <span className="kpi__valor tabular-nums">{valor}</span>
      {variacao ? <span className="kpi__variacao">{variacao}</span> : null}
    </div>
  );
}

/** Estado vazio: ícone discreto, título curto, uma frase e ação primária (botão). */
export function EmptyState({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <svg className="vazio__icone" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M8 15h4" />
      </svg>
      <p className="vazio__titulo">{titulo}</p>
      {children ? <p className="vazio__texto">{children}</p> : null}
      {acao ? <div className="vazio__acao">{acao}</div> : null}
    </div>
  );
}

export type EstadoProgresso = 'ok' | 'atencao' | 'estourado';

export function estadoProgresso(gasto: number, limite: number): EstadoProgresso {
  if (limite > 0 && gasto > limite) return 'estourado';
  if (limite > 0 && gasto / limite >= 0.8) return 'atencao';
  return 'ok';
}

const TEXTO_ESTADO: Record<EstadoProgresso, string> = { ok: 'Dentro do limite', atencao: 'Atenção', estourado: 'Estourado' };

/** Barra semântica: o estado também aparece em texto (cor nunca é a única informação). */
export function ProgressBar({ valor, max, rotulo, mostrarEstado = true }: { valor: number; max: number; rotulo: string; mostrarEstado?: boolean }) {
  const estado = estadoProgresso(valor, max);
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div className={`pb pb--${estado}`}>
      <div className="pb__trilho" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="pb__barra" style={{ width: `${pct}%` }} />
      </div>
      {mostrarEstado ? <span className="pb__estado">{TEXTO_ESTADO[estado]}</span> : null}
    </div>
  );
}


/** Painel lateral acessível: role=dialog, foco preso, Esc fecha, foco volta ao gatilho. */
export { Drawer } from '../ds/Drawer';

const paraExibicao = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

function mascara(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function paraISO(exibicao: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(exibicao);
  if (!m) return '';
  const [, d, mes, a] = m;
  const dt = new Date(Number(a), Number(mes) - 1, Number(d));
  return dt.getFullYear() === Number(a) && dt.getMonth() === Number(mes) - 1 && dt.getDate() === Number(d) ? `${a}-${mes}-${d}` : '';
}

type DateFieldProps = { label: string; erro?: string; dica?: string; value: string; onChange: (iso: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

/** Campo de data dd/mm/aaaa independente do locale; value/onChange usam AAAA-MM-DD ('' quando incompleto). */
export function DateField({ label, erro, dica, value, onChange, className = '', ...props }: DateFieldProps) {
  const id = useId();
  const [texto, setTexto] = useState(paraExibicao(value));
  const [ultimo, setUltimo] = useState(value);
  if (value !== ultimo) {
    setUltimo(value);
    if (paraISO(texto) !== value) setTexto(paraExibicao(value));
  }
  const msg = erro ?? dica;
  return (
    <div className="ui-campo">
      <label htmlFor={id} className="ui-campo__rotulo">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        autoComplete="off"
        aria-invalid={erro ? true : undefined}
        aria-describedby={msg ? `${id}-msg` : undefined}
        className={`ds-controle tabular-nums ${erro ? 'ds-controle--erro' : ''} ${className}`}
        {...props}
        value={texto}
        onChange={(e) => {
          const t = mascara(e.target.value);
          setTexto(t);
          const iso = paraISO(t);
          setUltimo(iso);
          onChange(iso);
        }}
      />
      {msg ? (
        <p id={`${id}-msg`} role={erro ? 'alert' : undefined} className={erro ? 'ui-campo__erro' : 'ui-campo__dica'}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
