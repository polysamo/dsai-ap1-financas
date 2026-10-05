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
  { to: '/saude', rotulo: 'Saúde financeira' },
  { to: '/alertas', rotulo: 'Alertas' },
  { to: '/orcamento', rotulo: 'Orçamento' },
  { to: '/orcamento-anual', rotulo: 'Orçamento anual' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/desejos', rotulo: 'Desejos' },
  { to: '/eventos', rotulo: 'Eventos' },
  { to: '/investimentos', rotulo: 'Investimentos' },
  { to: '/independencia', rotulo: 'Independência' },
  { to: '/calculadoras', rotulo: 'Calculadoras' },
  { to: '/dividas', rotulo: 'Dívidas' },
  { to: '/divisao', rotulo: 'Divisão' },
  { to: '/patrimonio', rotulo: 'Patrimônio' },
  { to: '/relatorios', rotulo: 'Relatórios' },
  { to: '/regras', rotulo: 'Regras' },
  { to: '/importar', rotulo: 'Importar CSV' },
  { to: '/importar-ofx', rotulo: 'Importar OFX' },
  { to: '/ajuda', rotulo: 'Ajuda' },
];

export interface GrupoNavegacao {
  titulo: string;
  itens: string[]; // rotas
}

/** Agrupamento da sidebar; rotas fora dos grupos caem em "Mais". */
export const gruposNavegacao: GrupoNavegacao[] = [
  { titulo: 'Visão geral', itens: ['/', '/calendario', '/relatorios', '/fluxo', '/saude', '/alertas', '/patrimonio'] },
  { titulo: 'Movimentação', itens: ['/transacoes', '/contas', '/cartoes', '/transferencias', '/assinaturas', '/conciliacao'] },
  { titulo: 'Planejamento', itens: ['/orcamento', '/orcamento-anual', '/metas', '/desejos', '/eventos', '/dividas', '/investimentos', '/independencia', '/calculadoras', '/divisao'] },
  { titulo: 'Automação', itens: ['/regras', '/importar', '/importar-ofx'] },
];

export const itensRodape: ItemNavegacao[] = [
  { to: '/ajuda', rotulo: 'Ajuda' },
  { to: '/configuracoes', rotulo: 'Configurações' },
];

export const rotuloDe = (to: string) => itensNavegacao.find((i) => i.to === to)?.rotulo ?? to;
