import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { normalizarTexto } from '../domain/transacoes';
import { Field, classeControle, type PropsCampo } from './Field';
import './Combobox.css';

export interface OpcaoCombobox {
  valor: string;
  rotulo: string;
}

interface Props extends PropsCampo {
  opcoes: OpcaoCombobox[];
  /** Valor da opção escolhida ('' quando nenhuma). */
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
}

/** Lista filtrável: digitar filtra, setas navegam, Enter escolhe, Esc fecha. */
export function Combobox({ label, erro, dica, opcoes, value, onChange, placeholder, className }: Props) {
  const idLista = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const escolhida = opcoes.find((o) => o.valor === value);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);

  const exibido = texto ?? escolhida?.rotulo ?? '';
  const filtradas = useMemo(() => {
    const alvo = normalizarTexto(texto ?? '');
    return alvo ? opcoes.filter((o) => normalizarTexto(o.rotulo).includes(alvo)) : opcoes;
  }, [opcoes, texto]);

  const escolher = (o: OpcaoCombobox) => {
    onChange(o.valor);
    setTexto(null);
    setAberto(false);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (filtradas.length ? (a + 1) % filtradas.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (filtradas.length ? (a - 1 + filtradas.length) % filtradas.length : 0));
    } else if (e.key === 'Enter' && aberto && filtradas[ativo]) {
      e.preventDefault();
      escolher(filtradas[ativo]);
    } else if (e.key === 'Escape' && aberto) {
      e.preventDefault();
      setTexto(null);
      setAberto(false);
    }
  };

  return (
    <Field label={label} erro={erro} dica={dica} className={className}>
      {(l) => (
        <div className="ds-combobox">
          <input
            {...l}
            ref={entrada}
            role="combobox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={aberto && filtradas[ativo] ? `${idLista}-${ativo}` : undefined}
            autoComplete="off"
            className={classeControle(erro)}
            placeholder={placeholder}
            value={exibido}
            onChange={(e) => {
              setTexto(e.target.value);
              setAtivo(0);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => {
              setAberto(false);
              setTexto(null);
            }}
            onKeyDown={aoTeclar}
          />
          {aberto ? (
            <ul id={idLista} role="listbox" aria-label={label} className="ds-combobox__lista">
              {filtradas.length === 0 ? (
                <li className="ds-combobox__vazio" role="presentation">
                  Nenhuma opção
                </li>
              ) : (
                filtradas.map((o, i) => (
                  <li
                    key={o.valor}
                    id={`${idLista}-${i}`}
                    role="option"
                    aria-selected={o.valor === value}
                    className={`ds-combobox__opcao${i === ativo ? ' ds-combobox__opcao--ativa' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      escolher(o);
                    }}
                    onMouseEnter={() => setAtivo(i)}
                  >
                    {o.rotulo}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
