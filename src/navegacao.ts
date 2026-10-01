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
  { to: '/orcamento', rotulo: 'Orçamento' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/relatorios', rotulo: 'Relatórios' },
  { to: '/regras', rotulo: 'Regras' },
  { to: '/importar', rotulo: 'Importar CSV' },
];
