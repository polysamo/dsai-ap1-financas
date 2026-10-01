import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { atalhos, useAtalhos } from '../lib/atalhos';
import { EVENTO_ABRIR_TOUR, marcarTourConcluido, passosTour, tourConcluido } from '../lib/onboarding';
import { Botao } from './ui';

const FOCAVEIS = 'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Moldura de diálogo modal: foco inicial dentro, Tab preso no diálogo, Esc fecha, foco devolvido ao fechar. */
function Modal({ titulo, idTitulo, aoFechar, children }: { titulo: string; idTitulo: string; aoFechar: () => void; children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    raiz.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    return () => anterior?.focus();
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        aoFechar();
      } else if (e.key === 'Tab' && raiz.current) {
        const itens = Array.from(raiz.current.querySelectorAll<HTMLElement>(FOCAVEIS));
        if (itens.length === 0) return;
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        if (!raiz.current.contains(document.activeElement)) {
          e.preventDefault();
          primeiro.focus();
        } else if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden">
      <div ref={raiz} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="max-h-full w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function TabelaAtalhos() {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Atalhos de teclado</caption>
      <thead>
        <tr className="border-b border-slate-200 text-slate-600">
          <th scope="col" className="py-2 pr-4 font-medium">
            Teclas
          </th>
          <th scope="col" className="py-2 font-medium">
            Ação
          </th>
        </tr>
      </thead>
      <tbody>
        {atalhos.map((a) => (
          <tr key={a.teclas} className="border-b border-slate-100">
            <td className="py-2 pr-4">
              {a.teclas.split(' ').map((t, i) => (
                <kbd key={i} className="mr-1 rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  {t}
                </kbd>
              ))}
            </td>
            <td className="py-2 text-slate-800">{a.descricao}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tour({ aoFechar }: { aoFechar: () => void }) {
  const idTitulo = useId();
  const [indice, setIndice] = useState(0);
  const passo = passosTour[indice];
  const ultimo = indice === passosTour.length - 1;

  return (
    <Modal titulo={`Tour: ${passo.titulo}`} idTitulo={idTitulo} aoFechar={aoFechar}>
      <p className="mt-1 text-xs text-slate-600" aria-live="polite">
        Passo {indice + 1} de {passosTour.length}
      </p>
      <p className="mt-3 text-sm text-slate-700">{passo.texto}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Botao variante="link" onClick={aoFechar}>
          Pular
        </Botao>
        <div className="flex gap-2">
          <Botao variante="secundario" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>
            Anterior
          </Botao>
          <Botao onClick={ultimo ? aoFechar : () => setIndice(indice + 1)}>{ultimo ? 'Concluir' : 'Próximo'}</Botao>
        </div>
      </div>
    </Modal>
  );
}

/** Tour de primeiro uso e diálogo de atalhos; montado uma vez no Layout. */
export function OnboardingEAtalhos() {
  const [tourAberto, setTourAberto] = useState(() => !tourConcluido());
  const [atalhosAbertos, setAtalhosAbertos] = useState(false);
  const idAtalhos = useId();

  const abrirAtalhos = useCallback(() => setAtalhosAbertos(true), []);
  const fecharAtalhos = useCallback(() => setAtalhosAbertos(false), []);
  const fecharTour = useCallback(() => {
    marcarTourConcluido();
    setTourAberto(false);
  }, []);

  useAtalhos(abrirAtalhos);

  useEffect(() => {
    const abrir = () => setTourAberto(true);
    window.addEventListener(EVENTO_ABRIR_TOUR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TOUR, abrir);
  }, []);

  return (
    <>
      {tourAberto ? <Tour aoFechar={fecharTour} /> : null}
      {atalhosAbertos && !tourAberto ? (
        <Modal titulo="Atalhos de teclado" idTitulo={idAtalhos} aoFechar={fecharAtalhos}>
          <div className="mt-3">
            <TabelaAtalhos />
          </div>
          <div className="mt-4 flex justify-end">
            <Botao variante="secundario" onClick={fecharAtalhos}>
              Fechar
            </Botao>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
