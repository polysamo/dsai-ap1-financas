import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { OnboardingEAtalhos } from './OnboardingEAtalhos';
import { tituloDaRota } from '../navegacao';
import { PreferenciasProvider } from '../state/preferencias';
import { ToastProvider } from '../ds/Toast';
import { BuscaGlobal, useAtalhoBusca } from './busca/BuscaGlobal';
import { AvisoHistorico, useHistoricoUI } from './historico/ControlesHistorico';
import { BarraInferior } from './layout/BarraInferior';
import { Cabecalho } from './layout/Cabecalho';
import { CarregandoRota } from './layout/CarregandoRota';
import { LimiteDeErro } from './layout/LimiteDeErro';
import { Sidebar } from './layout/Sidebar';
import { usePreferenciasLayout } from './layout/usePreferenciasLayout';
import './Layout.css';

const CONSULTA_ESTREITO = '(max-width: 47.99rem)';
export const TITULO_APP = 'Finanças Pessoais';

/** Verdadeiro em telas estreitas; sem matchMedia (testes) assume desktop. */
function useEstreito(): boolean {
  const consulta = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_ESTREITO) : null);
  const [estreito, setEstreito] = useState(() => consulta()?.matches === true);
  useEffect(() => {
    const mq = consulta();
    if (!mq || typeof mq.addEventListener !== 'function') return;
    const ao = () => setEstreito(mq.matches);
    mq.addEventListener('change', ao);
    return () => mq.removeEventListener('change', ao);
  }, []);
  return estreito;
}

/** Título do documento acompanha a tela atual. */
function useTituloDoDocumento() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname === '/' ? TITULO_APP : `${tituloDaRota(pathname)} · ${TITULO_APP}`;
  }, [pathname]);
}

export function Layout() {
  const estreito = useEstreito();
  const { pathname } = useLocation();
  const historico = useHistoricoUI();
  const layout = usePreferenciasLayout();
  const principal = useRef<HTMLElement>(null);
  const [buscando, setBuscando] = useState(false);
  const abrirBusca = useCallback(() => setBuscando(true), []);
  useAtalhoBusca(abrirBusca);
  useTituloDoDocumento();

  return (
    <PreferenciasProvider>
      <ToastProvider>
        <a
          href="#conteudo"
          className="layout-pular"
          onClick={(e) => {
            e.preventDefault();
            principal.current?.focus();
          }}
        >
          Pular para o conteúdo
        </a>
        <div className="layout-raiz">
          {estreito ? null : <Sidebar recolhida={layout.recolhida} gruposFechados={layout.gruposFechados} aoAlternarRecolhida={layout.alternarRecolhida} aoAlternarGrupo={layout.alternarGrupo} />}
          <div className="layout-conteudo">
            <Cabecalho historico={historico} aoBuscar={abrirBusca} />
            <AvisoHistorico ui={historico} />
            <OnboardingEAtalhos />
            <main id="conteudo" ref={principal} tabIndex={-1} className="layout-principal">
              <LimiteDeErro key={pathname}>
                <Suspense fallback={<CarregandoRota />}>
                  <Outlet context={{ abrirBusca }} />
                </Suspense>
              </LimiteDeErro>
            </main>
          </div>
          {estreito ? <BarraInferior aoBuscar={abrirBusca} /> : null}
          {buscando ? <BuscaGlobal onFechar={() => setBuscando(false)} /> : null}
        </div>
      </ToastProvider>
    </PreferenciasProvider>
  );
}
