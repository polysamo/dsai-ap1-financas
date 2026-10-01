import { NavLink, Outlet } from 'react-router-dom';
import { OnboardingEAtalhos } from './OnboardingEAtalhos';
import { itensNavegacao } from '../navegacao';
import { PreferenciasProvider } from '../state/preferencias';
import { BotaoOcultarValores } from './BotaoOcultarValores';
import './Layout.css';

const classeLink = ({ isActive }: { isActive: boolean }) => `layout-link${isActive ? ' layout-link--ativo' : ''}`;

export function Layout() {
  return (
    <PreferenciasProvider>
    <div className="layout-raiz">
      <header className="layout-cabecalho">
        <div className="layout-cabecalho__interno">
          <span className="layout-marca">Finanças Pessoais</span>
          <nav aria-label="Principal" className="layout-nav">
            {itensNavegacao.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={classeLink}>
                {item.rotulo}
              </NavLink>
            ))}
          </nav>
          <BotaoOcultarValores />
          <NavLink to="/configuracoes" className={classeLink}>
            Configurações
          </NavLink>
        </div>
      </header>
      <OnboardingEAtalhos />
      <main className="layout-principal">
        <Outlet />
      </main>
    </div>
    </PreferenciasProvider>
  );
}
