export interface ItemNavegacao {
  to: string;
  rotulo: string;
}

/** Navegação principal, na ordem de exibição. */
export const itensNavegacao: ItemNavegacao[] = [
  { to: '/transacoes', rotulo: 'Transações' },
  { to: '/contas', rotulo: 'Contas' },
];
