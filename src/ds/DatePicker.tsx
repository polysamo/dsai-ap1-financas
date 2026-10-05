import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { dataValida, diaDaSemana, diasNoMes, hojeISO, mesDe, nomeMes, somarMeses } from '../domain/date';
import { Field, classeControle, type PropsCampo } from './Field';
import { IconButton } from './IconButton';
import './DatePicker.css';

const paraExibicao = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** Máscara dd/mm/aaaa: só dígitos, barras inseridas sozinhas, no máximo 8 dígitos. */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Converte `dd/mm/aaaa` em `AAAA-MM-DD`; vazio se incompleta ou se o dia não existe (31/02). */
export function dataDaExibicao(exibicao: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(exibicao);
  if (!m) return '';
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return dataValida(iso) ? iso : '';
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Calendario({ valor, onEscolher }: { valor: string; onEscolher: (iso: string) => void }) {
  const [mes, setMes] = useState(valor && dataValida(valor) ? mesDe(valor) : mesDe(hojeISO()));
  const vazios = diaDaSemana(`${mes}-01`);
  const dias = diasNoMes(Number(mes.slice(0, 4)), Number(mes.slice(5)));
  return (
    <div role="dialog" aria-label="Calendário" className="ds-calendario">
      <div className="ds-calendario__topo">
        <IconButton aria-label="Mês anterior" icone="‹" tamanho="pequeno" onClick={() => setMes(somarMeses(mes, -1))} />
        <span aria-live="polite" className="ds-calendario__mes">
          {nomeMes(mes)}
        </span>
        <IconButton aria-label="Próximo mês" icone="›" tamanho="pequeno" onClick={() => setMes(somarMeses(mes, 1))} />
      </div>
      <div className="ds-calendario__grade" role="grid" aria-label={nomeMes(mes)}>
        {SEMANA.map((s, i) => (
          <span key={i} role="columnheader" className="ds-calendario__semana">
            {s}
          </span>
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: dias }, (_, i) => {
          const iso = `${mes}-${String(i + 1).padStart(2, '0')}`;
          return (
            <button key={iso} type="button" role="gridcell" aria-label={paraExibicao(iso)} aria-pressed={iso === valor} className={`ds-calendario__dia${iso === valor ? ' ds-calendario__dia--escolhido' : ''}${iso === hojeISO() ? ' ds-calendario__dia--hoje' : ''}`} onClick={() => onEscolher(iso)}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = PropsCampo & { value: string; onChange: (iso: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

/** Campo de data dd/mm/aaaa independente do locale, com calendário opcional; entra e sai em AAAA-MM-DD ('' enquanto incompleta ou inválida). */
export function DatePicker({ label, erro, dica, value, onChange, className, ...resto }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState(paraExibicao(value));
  const [ultimo, setUltimo] = useState(value);
  const [calendario, setCalendario] = useState(false);

  if (value !== ultimo) {
    setUltimo(value);
    if (dataDaExibicao(texto) !== value) setTexto(paraExibicao(value));
  }

  const inexistente = texto.length === 10 && dataDaExibicao(texto) === '';
  const mensagem = erro ?? (inexistente ? 'Essa data não existe.' : undefined);

  useEffect(() => {
    if (!calendario) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setCalendario(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setCalendario(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [calendario]);

  const definir = (t: string) => {
    setTexto(t);
    const iso = dataDaExibicao(t);
    setUltimo(iso);
    onChange(iso);
  };

  return (
    <Field label={label} erro={mensagem} dica={dica}>
      {(l) => (
        <div ref={raiz} className="ds-data">
          <input {...l} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} autoComplete="off" className={classeControle(mensagem, `tabular-nums${className ? ` ${className}` : ''}`)} {...resto} value={texto} onChange={(e) => definir(mascaraData(e.target.value))} />
          <IconButton className="ds-data__abrir" tamanho="pequeno" aria-label="Abrir calendário" aria-expanded={calendario} icone="📅" onClick={() => setCalendario((a) => !a)} />
          {calendario ? (
            <Calendario
              valor={value}
              onEscolher={(iso) => {
                definir(paraExibicao(iso));
                setCalendario(false);
              }}
            />
          ) : null}
        </div>
      )}
    </Field>
  );
}
