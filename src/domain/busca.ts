import { ROTULO_TIPO_CONTA } from './contas';
import { formatarData } from './date';
import { rotuloClasse } from './investimentos';
import { formatarMoeda, parseValor } from './money';
import { normalizarTexto } from './transacoes';
import type { AppState, Centavos } from './types';

export type GrupoBusca = 'paginas' | 'transacoes' | 'contas' | 'categorias' | 'metas' | 'dividas' | 'investimentos' | 'agenda';

export const ORDEM_GRUPOS: GrupoBusca[] = ['paginas', 'transacoes', 'contas', 'categorias', 'metas', 'dividas', 'investimentos', 'agenda'];

export const ROTULO_GRUPO_BUSCA: Record<GrupoBusca, string> = {
  paginas: 'Páginas',
  transacoes: 'Transações',
  contas: 'Contas',
  categorias: 'Categorias',
  metas: 'Metas',
  dividas: 'Dívidas',
  investimentos: 'Investimentos',
  agenda: 'Agendamentos',
};

export const MAX_POR_GRUPO = 5;

export interface ItemBusca {
  id: string;
  grupo: GrupoBusca;
  titulo: string;
  detalhe: string;
  /** Rota de destino, já com os parâmetros de filtro quando houver. */
  rota: string;
  /** Texto extra pesquisável que não aparece (ex.: tags). */
  extra?: string;
  /** Valor exato, para a busca por valor. */
  valor?: Centavos;
  /** Desempate: maior primeiro (datas AAAA-MM-DD comparam como texto). */
  ordem?: string;
}

export interface GrupoResultado {
  grupo: GrupoBusca;
  rotulo: string;
  itens: ItemBusca[];
  /** Quantos resultados do grupo ficaram de fora do limite. */
  restantes: number;
}

export interface PaginaBusca {
  to: string;
  rotulo: string;
}

const arquivada = (sim: boolean) => (sim ? ' (arquivada)' : '');

/** Converte o estado e as páginas em itens pesquisáveis. */
export function indexar(estado: AppState, paginas: PaginaBusca[]): ItemBusca[] {
  const nomeConta = new Map(estado.contas.map((c) => [c.id, c.nome]));
  const nomeCategoria = new Map(estado.categorias.map((c) => [c.id, c.nome]));
  const itens: ItemBusca[] = paginas.map((p) => ({ id: `pagina:${p.to}`, grupo: 'paginas', titulo: p.rotulo, detalhe: 'Página', rota: p.to }));

  for (const t of estado.transacoes) {
    const titulo = t.descricao || nomeCategoria.get(t.categoriaId) || 'Sem descrição';
    const sinal = t.tipo === 'despesa' ? '-' : '+';
    const params = new URLSearchParams({ texto: t.descricao, de: t.data, ate: t.data });
    itens.push({
      id: `transacao:${t.id}`,
      grupo: 'transacoes',
      titulo,
      detalhe: `${formatarData(t.data)} · ${sinal}${formatarMoeda(t.valor)} · ${nomeConta.get(t.contaId) ?? 'Conta removida'}`,
      rota: `/transacoes?${params.toString()}`,
      extra: [nomeCategoria.get(t.categoriaId) ?? '', ...(t.tags ?? []).map((tag) => `#${tag}`)].join(' '),
      valor: t.valor,
      ordem: `${t.data}|${String(t.criadaEm).padStart(15, '0')}`,
    });
  }
  for (const c of estado.contas) {
    itens.push({ id: `conta:${c.id}`, grupo: 'contas', titulo: c.nome + arquivada(c.arquivada), detalhe: ROTULO_TIPO_CONTA[c.tipo], rota: c.tipo === 'cartao' ? '/cartoes' : '/contas' });
  }
  for (const c of estado.categorias) {
    itens.push({ id: `categoria:${c.id}`, grupo: 'categorias', titulo: c.nome + arquivada(c.arquivada), detalhe: c.tipo === 'receita' ? 'Categoria de receita' : 'Categoria de despesa', rota: '/transacoes?aba=categorias' });
  }
  for (const m of estado.metas) {
    itens.push({ id: `meta:${m.id}`, grupo: 'metas', titulo: m.nome, detalhe: `Alvo ${formatarMoeda(m.valorAlvo)}`, rota: '/metas' });
  }
  for (const d of estado.dividas) {
    itens.push({ id: `divida:${d.id}`, grupo: 'dividas', titulo: d.nome, detalhe: `${d.tipo === 'devo' ? 'Eu devo' : 'Emprestei'} · ${formatarMoeda(d.principal)}`, rota: '/dividas' });
  }
  for (const a of estado.investimentos) {
    itens.push({ id: `ativo:${a.id}`, grupo: 'investimentos', titulo: a.nome, detalhe: rotuloClasse(a.classe), rota: '/investimentos' });
  }
  for (const a of estado.agenda) {
    itens.push({
      id: `agenda:${a.id}`,
      grupo: 'agenda',
      titulo: a.descricao,
      detalhe: `Vence ${formatarData(a.vencimento)} · ${formatarMoeda(a.valor)}${a.pagoEm ? ' · pago' : ''}`,
      rota: '/calendario',
      valor: a.valor,
      ordem: a.vencimento,
    });
  }
  return itens;
}

/** 3: título começa com a consulta; 2: alguma palavra do título começa; 1: aparece em qualquer lugar; 0: não casa. */
function pontuar(item: ItemBusca, consulta: string, palavras: string[], valor: Centavos | null): number {
  const titulo = normalizarTexto(item.titulo);
  const texto = `${titulo} ${normalizarTexto(item.detalhe)} ${normalizarTexto(item.extra ?? '')}`;
  const casaTexto = palavras.every((p) => texto.includes(p) || (p.startsWith('#') && texto.includes(p.slice(1))));
  const casaValor = valor !== null && item.valor === Math.abs(valor);
  if (!casaTexto && !casaValor) return 0;
  if (titulo.startsWith(consulta)) return 3;
  if (titulo.split(' ').some((w) => w.startsWith(palavras[0]))) return 2;
  return 1;
}

/** Busca agrupada; consulta vazia não devolve nada. */
export function buscar(itens: ItemBusca[], consultaBruta: string, maximo = MAX_POR_GRUPO): GrupoResultado[] {
  const consulta = normalizarTexto(consultaBruta);
  if (!consulta) return [];
  const palavras = consulta.split(' ');
  const valor = /\d/.test(consulta) ? parseValor(consultaBruta) : null;
  const pontuados = itens
    .map((item) => ({ item, pontos: pontuar(item, consulta, palavras, valor) }))
    .filter((x) => x.pontos > 0);
  return ORDEM_GRUPOS.flatMap((grupo) => {
    const doGrupo = pontuados
      .filter((x) => x.item.grupo === grupo)
      .sort((a, b) => b.pontos - a.pontos || (b.item.ordem ?? '').localeCompare(a.item.ordem ?? '') || a.item.titulo.localeCompare(b.item.titulo, 'pt-BR'));
    if (doGrupo.length === 0) return [];
    return [{ grupo, rotulo: ROTULO_GRUPO_BUSCA[grupo], itens: doGrupo.slice(0, maximo).map((x) => x.item), restantes: Math.max(0, doGrupo.length - maximo) }];
  });
}

export const totalResultados = (grupos: GrupoResultado[]): number => grupos.reduce((s, g) => s + g.itens.length + g.restantes, 0);

export const MAX_RECENTES = 5;

/** Põe a consulta no topo das recentes, sem repetir (ignorando acento e maiúsculas). */
export function lembrarBusca(recentes: string[], consulta: string, maximo = MAX_RECENTES): string[] {
  const limpa = consulta.trim();
  if (!limpa) return recentes;
  const chave = normalizarTexto(limpa);
  return [limpa, ...recentes.filter((r) => normalizarTexto(r) !== chave)].slice(0, maximo);
}
