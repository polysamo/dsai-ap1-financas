import { NavLink, Outlet } from 'react-router-dom';
import { itensNavegacao } from '../navegacao';

const classeLink = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
    isActive ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-200'
  }`;

export function Layout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold text-emerald-800">Finanças Pessoais</span>
          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-1">
            {itensNavegacao.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={classeLink}>
                {item.rotulo}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/dados" className={classeLink}>
            Dados
          </NavLink>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
