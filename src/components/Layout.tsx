import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { OnboardingEAtalhos } from './OnboardingEAtalhos';
import { gruposNavegacao, itensRodape, rotuloDe } from '../navegacao';
import { PreferenciasProvider } from '../state/preferencias';
import { BotaoOcultarValores } from './BotaoOcultarValores';
import { Drawer } from './novos';
import { BuscaGlobal, useAtalhoBusca } from './busca/BuscaGlobal';
import { AvisoHistorico, BotoesHistorico, useHistoricoUI } from './historico/ControlesHistorico';
import './Layout.css';

const classeLink = ({ isActive }: { isActive: boolean }) => `layout-link${isActive ? ' layout-link--ativo' : ''}`;
const classeAba = ({ isActive }: { isActive: boolean }) => `layout-aba${isActive ? ' layout-aba--ativa' : ''}`;
const CONSULTA_ESTREITO = '(max-width: 47.99rem)';

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

function Sidebar() {
  return (
    <aside className="layout-sidebar">
      <span className="layout-marca">Finanças Pessoais</span>
      <nav aria-label="Principal" className="layout-nav">
        {gruposNavegacao.map((g) => (
          <div key={g.titulo} className="layout-grupo">
            <span className="layout-grupo__titulo">{g.titulo}</span>
            {g.itens.map((to) => (
              <NavLink key={to} to={to} end={to === '/'} className={classeLink}>
                {rotuloDe(to)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <nav aria-label="Secundária" className="layout-rodape">
        {itensRodape.map((i) => (
          <NavLink key={i.to} to={i.to} className={classeLink}>
            {i.rotulo}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function BarraInferior({ onBuscar }: { onBuscar: () => void }) {
  const [mais, setMais] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMais(false), [pathname]);
  return (
    <>
      <nav aria-label="Principal" className="layout-barra">
        <NavLink to="/" end className={classeAba}>
          Dashboard
        </NavLink>
        <NavLink to="/transacoes" className={classeAba}>
          Transações
        </NavLink>
        <NavLink to="/transacoes" className="layout-aba layout-aba--nova" aria-label="Nova transação">
          +
        </NavLink>
        <NavLink to="/orcamento" className={classeAba}>
          Orçamento
        </NavLink>
        <button type="button" className="layout-aba" aria-haspopup="dialog" aria-expanded={mais} onClick={() => setMais(true)}>
          Mais
        </button>
      </nav>
      <Drawer aberto={mais} titulo="Mais" onFechar={() => setMais(false)}>
        <button
          type="button"
          className="layout-link"
          onClick={() => {
            setMais(false);
            onBuscar();
          }}
        >
          Buscar
        </button>
        <nav aria-label="Mais páginas" className="layout-nav">
          {[...gruposNavegacao.flatMap((g) => g.itens), ...itensRodape.map((i) => i.to)].map((to) => (
            <NavLink key={to} to={to} end={to === '/'} className={classeLink}>
              {rotuloDe(to)}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </>
  );
}

export function Layout() {
  const estreito = useEstreito();
  const historico = useHistoricoUI();
  const [buscando, setBuscando] = useState(false);
  const abrirBusca = useCallback(() => setBuscando(true), []);
  useAtalhoBusca(abrirBusca);
  return (
    <PreferenciasProvider>
      <div className="layout-raiz">
        {estreito ? null : <Sidebar />}
        <div className="layout-conteudo">
          <div className="layout-topo">
            <BotoesHistorico ui={historico} />
            <button type="button" className="layout-buscar" aria-keyshortcuts="Control+K" onClick={abrirBusca}>
              Buscar <kbd>Ctrl K</kbd>
            </button>
            <BotaoOcultarValores />
          </div>
          <AvisoHistorico ui={historico} />
          <OnboardingEAtalhos />
          <main className="layout-principal">
            <Outlet />
          </main>
        </div>
        {estreito ? <BarraInferior onBuscar={abrirBusca} /> : null}
        {buscando ? <BuscaGlobal onFechar={() => setBuscando(false)} /> : null}
      </div>
    </PreferenciasProvider>
  );
}
