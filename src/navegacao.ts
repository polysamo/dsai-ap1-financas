export interface ItemNavegacao {
  to: string;
  rotulo: string;
}

/** Navegação principal, na ordem de exibição. */
export const itensNavegacao: ItemNavegacao[] = [
  { to: '/', rotulo: 'Dashboard' },
  { to: '/transacoes', rotulo: 'Transações' },
  { to: '/contas', rotulo: 'Contas' },
  { to: '/cartoes', rotulo: 'Cartões' },
  { to: '/calendario', rotulo: 'Calendário' },
  { to: '/orcamento', rotulo: 'Orçamento' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/investimentos', rotulo: 'Investimentos' },
  { to: '/dividas', rotulo: 'Dívidas' },
  { to: '/divisao', rotulo: 'Divisão' },
  { to: '/relatorios', rotulo: 'Relatórios' },
  { to: '/regras', rotulo: 'Regras' },
  { to: '/importar', rotulo: 'Importar CSV' },
  { to: '/importar-ofx', rotulo: 'Importar OFX' },
  { to: '/ajuda', rotulo: 'Ajuda' },
];
