import { NavLink, useLocation } from 'react-router-dom';
import { grupoDe, gruposNavegacao, itensRodape, rotuloDe, siglaDe } from '../../navegacao';
import { cx } from '../../ds/cx';
import './Sidebar.css';

interface Props {
  recolhida: boolean;
  gruposFechados: string[];
  aoAlternarRecolhida: () => void;
  aoAlternarGrupo: (titulo: string) => void;
}

const classeLink = ({ isActive }: { isActive: boolean }) => cx('layout-link', isActive && 'layout-link--ativo');

/** Id de ARIA válido (sem espaços nem acentos) a partir do título do grupo. */
const idGrupo = (titulo: string) =>
  `grupo-${titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

function Item({ to, rotulo, recolhida }: { to: string; rotulo: string; recolhida: boolean }) {
  return (
    <NavLink to={to} end={to === '/'} className={classeLink} aria-label={recolhida ? rotulo : undefined} title={recolhida ? rotulo : undefined}>
      {recolhida ? <span aria-hidden="true">{siglaDe(rotulo)}</span> : rotulo}
    </NavLink>
  );
}

/** Menu lateral: grupos que abrem e fecham e modo recolhido só com siglas. */
export function Sidebar({ recolhida, gruposFechados, aoAlternarRecolhida, aoAlternarGrupo }: Props) {
  const { pathname } = useLocation();
  const grupoAtual = grupoDe(pathname);
  return (
    <aside className={cx('layout-sidebar', recolhida && 'layout-sidebar--recolhida')}>
      <div className="layout-sidebar__topo">
        {recolhida ? null : <span className="layout-marca">Finanças Pessoais</span>}
        <button type="button" className="layout-recolher" aria-expanded={!recolhida} aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'} onClick={aoAlternarRecolhida}>
          <span aria-hidden="true">{recolhida ? '»' : '«'}</span>
        </button>
      </div>
      <nav aria-label="Principal" className="layout-nav">
        {gruposNavegacao.map((g) => {
          const aberto = recolhida || !gruposFechados.includes(g.titulo) || grupoAtual === g.titulo;
          return (
            <div key={g.titulo} className="layout-grupo">
              {recolhida ? (
                <span className="layout-grupo__separador" aria-hidden="true" />
              ) : (
                <button type="button" className="layout-grupo__titulo" aria-expanded={aberto} aria-controls={idGrupo(g.titulo)} onClick={() => aoAlternarGrupo(g.titulo)}>
                  <span>{g.titulo}</span>
                  <span aria-hidden="true" className={cx('layout-grupo__seta', aberto && 'layout-grupo__seta--aberta')}>
                    ▾
                  </span>
                </button>
              )}
              {aberto ? (
                <div id={idGrupo(g.titulo)} className="layout-grupo__itens">
                  {g.itens.map((to) => (
                    <Item key={to} to={to} rotulo={rotuloDe(to)} recolhida={recolhida} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <nav aria-label="Secundária" className="layout-rodape">
        {itensRodape.map((i) => (
          <Item key={i.to} to={i.to} rotulo={i.rotulo} recolhida={recolhida} />
        ))}
      </nav>
    </aside>
  );
}
