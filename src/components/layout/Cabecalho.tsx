import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb, type ItemMigalha } from '../../ds/Breadcrumb';
import { grupoDe, tituloDaRota } from '../../navegacao';
import { BotaoOcultarValores } from '../BotaoOcultarValores';
import { BotoesHistorico, type useHistoricoUI } from '../historico/ControlesHistorico';
import './Cabecalho.css';

/** Trilha "Início › Grupo › Tela"; vazia no Dashboard. */
export function migalhasDe(pathname: string): ItemMigalha[] {
  if (pathname === '/') return [];
  const grupo = grupoDe(pathname);
  return [{ rotulo: 'Início', to: '/' }, ...(grupo ? [{ rotulo: grupo }] : []), { rotulo: tituloDaRota(pathname) }];
}

interface Props {
  historico: ReturnType<typeof useHistoricoUI>;
  aoBuscar: () => void;
}

export function Cabecalho({ historico, aoBuscar }: Props) {
  const { pathname } = useLocation();
  const migalhas = migalhasDe(pathname);
  return (
    <header className="layout-topo">
      <div className="layout-topo__trilha">
        {migalhas.length > 0 ? <Breadcrumb itens={migalhas} /> : <span className="layout-topo__saudacao">Finanças Pessoais</span>}
      </div>
      <p className="layout-topo__titulo-mobile" aria-hidden="true">
        {tituloDaRota(pathname)}
      </p>
      <div className="layout-topo__acoes">
        <BotoesHistorico ui={historico} />
        <button type="button" className="layout-buscar" aria-keyshortcuts="Control+K" onClick={aoBuscar}>
          Buscar <kbd>Ctrl K</kbd>
        </button>
        <Link to="/atalhos" className="layout-topo__atalhos">
          Atalhos
        </Link>
        <BotaoOcultarValores />
      </div>
    </header>
  );
}
