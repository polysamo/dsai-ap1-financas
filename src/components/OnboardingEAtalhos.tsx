import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { atalhos, useAtalhos } from '../lib/atalhos';
import { EVENTO_ABRIR_TOUR, marcarTourConcluido, passosTour, tourConcluido } from '../lib/onboarding';
import { Botao } from './ui';
import './OnboardingEAtalhos.css';

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
    <div className="ui-modal-fundo ui-modal-fundo--sem-impressao">
      <div ref={raiz} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="ui-modal">
        <h2 id={idTitulo} className="ui-modal__titulo">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function TabelaAtalhos() {
  return (
    <table className="atalhos-tabela">
      <caption className="sr-somente">Atalhos de teclado</caption>
      <thead>
        <tr className="atalhos-tabela__cabecalho">
          <th scope="col">Teclas</th>
          <th scope="col">Ação</th>
        </tr>
      </thead>
      <tbody>
        {atalhos.map((a) => (
          <tr key={a.teclas}>
            <td>
              {a.teclas.split(' ').map((t, i) => (
                <kbd key={i} className="atalhos-tecla">
                  {t}
                </kbd>
              ))}
            </td>
            <td className="atalhos-tabela__acao">{a.descricao}</td>
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
      <p className="tour-passo" aria-live="polite">
        Passo {indice + 1} de {passosTour.length}
      </p>
      <p className="tour-texto">{passo.texto}</p>
      <div className="tour-acoes">
        <Botao variante="link" onClick={aoFechar}>
          Pular
        </Botao>
        <div className="tour-botoes">
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
          <div className="atalhos-corpo">
            <TabelaAtalhos />
          </div>
          <div className="atalhos-rodape">
            <Botao variante="secundario" onClick={fecharAtalhos}>
              Fechar
            </Botao>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
