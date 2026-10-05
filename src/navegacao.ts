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
  { to: '/beneficiarios', rotulo: 'Beneficiários' },
  { to: '/alertas', rotulo: 'Alertas' },
  { to: '/orcamento', rotulo: 'Orçamento' },
  { to: '/orcamento-anual', rotulo: 'Orçamento anual' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/desejos', rotulo: 'Desejos' },
  { to: '/eventos', rotulo: 'Eventos' },
  { to: '/desafios', rotulo: 'Desafios' },
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
  { to: '/atalhos', rotulo: 'Atalhos' },
  { to: '/design', rotulo: 'Design system' },
];

export interface GrupoNavegacao {
  titulo: string;
  itens: string[]; // rotas
}

/** Agrupamento da sidebar; rotas fora dos grupos caem em "Mais". */
export const gruposNavegacao: GrupoNavegacao[] = [
  { titulo: 'Visão geral', itens: ['/', '/calendario', '/relatorios', '/fluxo', '/saude', '/beneficiarios', '/alertas', '/patrimonio'] },
  { titulo: 'Movimentação', itens: ['/transacoes', '/contas', '/cartoes', '/transferencias', '/assinaturas', '/conciliacao'] },
  { titulo: 'Planejamento', itens: ['/orcamento', '/orcamento-anual', '/metas', '/desejos', '/eventos', '/desafios', '/dividas', '/investimentos', '/independencia', '/calculadoras', '/divisao'] },
  { titulo: 'Automação', itens: ['/regras', '/importar', '/importar-ofx'] },
];

export const itensRodape: ItemNavegacao[] = [
  { to: '/ajuda', rotulo: 'Ajuda' },
  { to: '/atalhos', rotulo: 'Atalhos' },
  { to: '/configuracoes', rotulo: 'Configurações' },
];

export const rotuloDe = (to: string) => itensNavegacao.find((i) => i.to === to)?.rotulo ?? to;

/** Título do grupo da sidebar a que a rota pertence; undefined para rodapé e rotas soltas. */
export const grupoDe = (to: string): string | undefined => gruposNavegacao.find((g) => g.itens.includes(to))?.titulo;

/** Duas letras para o menu recolhido: iniciais das duas primeiras palavras ou as duas primeiras letras. */
export function siglaDe(rotulo: string): string {
  const palavras = rotulo.trim().split(/\s+/);
  const sigla = palavras.length > 1 ? palavras[0][0] + palavras[1][0] : rotulo.trim().slice(0, 2);
  return sigla.toLocaleUpperCase('pt-BR');
}

/** Nome da tela para trilha e título do documento; rotas desconhecidas são "Página não encontrada". */
export const tituloDaRota = (to: string): string => itensNavegacao.find((i) => i.to === to)?.rotulo ?? 'Página não encontrada';
