import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Drawer } from '../../ds/Drawer';
import { gruposNavegacao, itensRodape, rotuloDe } from '../../navegacao';
import { cx } from '../../ds/cx';
import './BarraInferior.css';

const classeAba = ({ isActive }: { isActive: boolean }) => cx('layout-aba', isActive && 'layout-aba--ativa');
const classeLink = ({ isActive }: { isActive: boolean }) => cx('layout-link', isActive && 'layout-link--ativo');

/** Navegação do celular: quatro atalhos, o botão "+" e a gaveta "Mais" com todas as telas. */
export function BarraInferior({ aoBuscar }: { aoBuscar: () => void }) {
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
          className="layout-link layout-link--botao"
          onClick={() => {
            setMais(false);
            aoBuscar();
          }}
        >
          Buscar
        </button>
        {gruposNavegacao.map((g) => (
          <nav key={g.titulo} aria-label={g.titulo} className="layout-gaveta-grupo">
            <p className="layout-gaveta-grupo__titulo">{g.titulo}</p>
            {g.itens.map((to) => (
              <NavLink key={to} to={to} end={to === '/'} className={classeLink}>
                {rotuloDe(to)}
              </NavLink>
            ))}
          </nav>
        ))}
        <nav aria-label="Mais páginas" className="layout-gaveta-grupo">
          {itensRodape.map((i) => (
            <NavLink key={i.to} to={i.to} className={classeLink}>
              {i.rotulo}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
