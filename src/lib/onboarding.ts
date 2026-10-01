export const CHAVE_ONBOARDING = 'financas:onboarding';
export const EVENTO_ABRIR_TOUR = 'financas:abrir-tour';

/** Lê a flag de tour concluído; JSON inválido ou formato inesperado contam como não concluído. */
export function tourConcluido(armazenamento: Storage = localStorage): boolean {
  try {
    const bruto = armazenamento.getItem(CHAVE_ONBOARDING);
    if (bruto === null) return false;
    const dados: unknown = JSON.parse(bruto);
    return typeof dados === 'object' && dados !== null && (dados as { tourConcluido?: unknown }).tourConcluido === true;
  } catch {
    return false;
  }
}

export function marcarTourConcluido(armazenamento: Storage = localStorage): void {
  try {
    armazenamento.setItem(CHAVE_ONBOARDING, JSON.stringify({ tourConcluido: true }));
  } catch {
    // Armazenamento indisponível: o tour apenas poderá abrir de novo na próxima visita.
  }
}

/** Pede ao tour (montado no Layout) que abra, vindo de qualquer página. */
export function pedirTour(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_TOUR));
}

export interface PassoTour {
  titulo: string;
  texto: string;
}

export const passosTour: PassoTour[] = [
  { titulo: 'Contas', texto: 'Comece cadastrando suas contas: corrente, poupança, carteira e cartões. O saldo inicial de cada uma é o ponto de partida.' },
  { titulo: 'Transações', texto: 'Registre receitas, despesas e transferências. Use filtros e busca para encontrar qualquer lançamento depois.' },
  { titulo: 'Orçamento', texto: 'Defina quanto pretende gastar por categoria no mês e acompanhe o quanto já foi usado.' },
  { titulo: 'Metas', texto: 'Crie metas de economia com valor e prazo e acompanhe o progresso de cada uma.' },
  { titulo: 'Importar CSV', texto: 'Traga o extrato do banco em CSV: você confere as linhas antes de importar e duplicatas são sinalizadas.' },
  { titulo: 'Dashboard', texto: 'O Dashboard resume saldos, receitas, despesas do mês e a projeção dos próximos meses.' },
  { titulo: 'Dados', texto: 'Seus dados ficam só neste navegador. Em Dados você exporta um backup, importa um arquivo ou apaga tudo.' },
];
