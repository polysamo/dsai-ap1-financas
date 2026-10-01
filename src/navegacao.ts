export interface ItemNavegacao {
  to: string;
  rotulo: string;
}

/** Navegação principal, na ordem de exibição. */
export const itensNavegacao: ItemNavegacao[] = [
  { to: '/', rotulo: 'Dashboard' },
  { to: '/transacoes', rotulo: 'Transações' },
  { to: '/contas', rotulo: 'Contas' },
  { to: '/conciliacao', rotulo: 'Conciliação' },
  { to: '/cartoes', rotulo: 'Cartões' },
  { to: '/transferencias', rotulo: 'Transferências' },
  { to: '/assinaturas', rotulo: 'Assinaturas' },
  { to: '/calendario', rotulo: 'Calendário' },
  { to: '/fluxo', rotulo: 'Fluxo de caixa' },
  { to: '/orcamento', rotulo: 'Orçamento' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/investimentos', rotulo: 'Investimentos' },
  { to: '/independencia', rotulo: 'Independência' },
  { to: '/dividas', rotulo: 'Dívidas' },
  { to: '/divisao', rotulo: 'Divisão' },
  { to: '/patrimonio', rotulo: 'Patrimônio' },
  { to: '/relatorios', rotulo: 'Relatórios' },
  { to: '/regras', rotulo: 'Regras' },
  { to: '/importar', rotulo: 'Importar CSV' },
  { to: '/importar-ofx', rotulo: 'Importar OFX' },
  { to: '/ajuda', rotulo: 'Ajuda' },
];
