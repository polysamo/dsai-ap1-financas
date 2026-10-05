import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../ds/Modal';
import { atalhos, useAtalhos } from '../lib/atalhos';
import { EVENTO_ABRIR_TOUR, marcarTourConcluido, passosTour, tourConcluido } from '../lib/onboarding';
import { Botao } from './ui';
import './OnboardingEAtalhos.css';

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
  const [indice, setIndice] = useState(0);
  const passo = passosTour[indice];
  const ultimo = indice === passosTour.length - 1;

  return (
    <Modal aberto titulo={`Tour: ${passo.titulo}`} onFechar={aoFechar}>
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
        <Modal aberto titulo="Atalhos de teclado" onFechar={fecharAtalhos}>
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
