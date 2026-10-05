import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscar, indexar, lembrarBusca, totalResultados, type ItemBusca } from '../../domain/busca';
import { gravarBuscasRecentes, lerBuscasRecentes } from '../../lib/buscasRecentes';
import { emCampoDeEdicao } from '../../lib/atalhos';
import { itensNavegacao, itensRodape } from '../../navegacao';
import { useEstado } from '../../state/store';
import { Botao } from '../ui';
import './BuscaGlobal.css';

const PAGINAS = [...itensNavegacao, ...itensRodape.filter((r) => !itensNavegacao.some((i) => i.to === r.to))];

/** Abre a busca com Ctrl/Meta+K em qualquer lugar e com `/` fora de campos. */
export function useAtalhoBusca(abrir: () => void) {
  useEffect(() => {
    const aoTeclar = (e: globalThis.KeyboardEvent) => {
      const ctrlK = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k';
      const barra = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !emCampoDeEdicao(e.target);
      if (ctrlK || barra) {
        e.preventDefault();
        abrir();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [abrir]);
}

export function BuscaGlobal({ onFechar }: { onFechar: () => void }) {
  const estado = useEstado();
  const navegar = useNavigate();
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [consulta, setConsulta] = useState('');
  const [ativo, setAtivo] = useState(0);
  const [recentes, setRecentes] = useState(() => lerBuscasRecentes(localStorage));

  const itens = useMemo(() => indexar(estado, PAGINAS), [estado]);
  const grupos = useMemo(() => buscar(itens, consulta), [itens, consulta]);
  const planos = grupos.flatMap((g) => g.itens);
  const total = totalResultados(grupos);
  const vazia = consulta.trim() === '';
  const idItem = (i: number) => `${id}-item-${i}`;

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    campo.current?.focus();
    return () => anterior?.focus();
  }, []);

  const abrir = (item: ItemBusca) => {
    gravarBuscasRecentes(localStorage, lembrarBusca(recentes, consulta));
    onFechar();
    navegar(item.rota);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onFechar();
    } else if (e.key === 'ArrowDown' && planos.length) {
      e.preventDefault();
      setAtivo((a) => (a + 1) % planos.length);
    } else if (e.key === 'ArrowUp' && planos.length) {
      e.preventDefault();
      setAtivo((a) => (a - 1 + planos.length) % planos.length);
    } else if (e.key === 'Enter' && planos[ativo]) {
      e.preventDefault();
      abrir(planos[ativo]);
    }
  };

  const limparRecentes = () => {
    gravarBuscasRecentes(localStorage, []);
    setRecentes([]);
  };

  let indice = -1;
  return (
    <div className="ui-modal-fundo busca-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div role="dialog" aria-modal="true" aria-label="Busca global" className="busca">
        <input
          ref={campo}
          className="busca__campo"
          type="search"
          role="combobox"
          aria-label="Buscar no app"
          aria-expanded={planos.length > 0}
          aria-controls={`${id}-lista`}
          aria-activedescendant={planos.length ? idItem(ativo) : undefined}
          aria-autocomplete="list"
          placeholder="Buscar transações, contas, páginas…"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAtivo(0);
          }}
          onKeyDown={aoTeclar}
        />
        <p className="sr-somente" aria-live="polite">
          {vazia ? '' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
        </p>
        <div id={`${id}-lista`} role="listbox" aria-label="Resultados" className="busca__resultados">
          {grupos.map((g) => (
            <div key={g.grupo} role="group" aria-label={g.rotulo} className="busca__grupo">
              <p className="busca__grupo-titulo" aria-hidden="true">
                {g.rotulo}
              </p>
              {g.itens.map((item) => {
                indice++;
                const i = indice;
                return (
                  <div
                    key={item.id}
                    id={idItem(i)}
                    role="option"
                    aria-selected={i === ativo}
                    className={`busca__item${i === ativo ? ' busca__item--ativo' : ''}`}
                    onMouseEnter={() => setAtivo(i)}
                    onClick={() => abrir(item)}
                  >
                    <span className="busca__item-titulo">{item.titulo}</span>
                    <span className="busca__item-detalhe tabular-nums">{item.detalhe}</span>
                  </div>
                );
              })}
              {g.restantes > 0 ? <p className="busca__restantes">e mais {g.restantes}</p> : null}
            </div>
          ))}
        </div>
        {!vazia && grupos.length === 0 ? <p className="busca__vazio">Nada encontrado para "{consulta.trim()}".</p> : null}
        {vazia && recentes.length > 0 ? (
          <div className="busca__recentes">
            <div className="linha linha--entre">
              <p className="busca__grupo-titulo">Buscas recentes</p>
              <Botao variante="link" onClick={limparRecentes}>
                Limpar recentes
              </Botao>
            </div>
            <ul>
              {recentes.map((r) => (
                <li key={r}>
                  <button type="button" className="busca__recente" onClick={() => setConsulta(r)}>
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {vazia && recentes.length === 0 ? <p className="busca__vazio">Digite para buscar. Use as setas para escolher e Enter para abrir.</p> : null}
      </div>
    </div>
  );
}
