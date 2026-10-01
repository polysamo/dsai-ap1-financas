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
  { to: '/orcamento-anual', rotulo: 'Orçamento anual' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/investimentos', rotulo: 'Investimentos' },
  { to: '/dividas', rotulo: 'Dívidas' },
  { to: '/relatorios', rotulo: 'Relatórios' },
  { to: '/regras', rotulo: 'Regras' },
  { to: '/importar', rotulo: 'Importar CSV' },
  { to: '/ajuda', rotulo: 'Ajuda' },
];
