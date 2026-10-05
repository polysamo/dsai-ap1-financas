import type { AppState } from './types';

export const LIMITE_HISTORICO = 50;

export interface EntradaHistorico {
  estado: AppState;
  descricao: string;
}

/** Pilhas de desfazer (`passado`) e refazer (`futuro`); o topo é o último elemento. */
export interface Historico {
  passado: EntradaHistorico[];
  futuro: EntradaHistorico[];
}

export const historicoVazio = (): Historico => ({ passado: [], futuro: [] });

interface Nome {
  singular: string;
  plural: string;
  feminino: boolean;
}

const n = (singular: string, plural: string, feminino: boolean): Nome => ({ singular, plural, feminino });

/** Nome de cada coleção do estado, para descrever a mudança. */
const NOMES: Partial<Record<keyof AppState, Nome>> = {
  contas: n('conta', 'contas', true),
  categorias: n('categoria', 'categorias', true),
  transacoes: n('transação', 'transações', true),
  orcamentos: n('orçamento', 'orçamentos', false),
  metas: n('meta', 'metas', true),
  recorrencias: n('recorrência', 'recorrências', true),
  importacoes: n('importação', 'importações', true),
  pagamentosFatura: n('pagamento de fatura', 'pagamentos de fatura', false),
  agenda: n('agendamento', 'agendamentos', false),
  regras: n('regra', 'regras', true),
  investimentos: n('ativo', 'ativos', false),
  dividas: n('dívida', 'dívidas', true),
  gruposDivisao: n('grupo de divisão', 'grupos de divisão', false),
  transferencias: n('transferência', 'transferências', true),
  cenariosIndependencia: n('cenário', 'cenários', false),
  metasPatrimonio: n('meta de patrimônio', 'metas de patrimônio', true),
  assinaturasDecisoes: n('assinatura', 'assinaturas', true),
};

const NOME_GENERICO = n('item', 'itens', false);

type Acao = 'criad' | 'excluíd' | 'editad';

function frase(nome: Nome, acao: Acao, quantidade: number): string {
  const sufixo = (nome.feminino ? 'a' : 'o') + (quantidade > 1 ? 's' : '');
  const substantivo = quantidade > 1 ? `${quantidade} ${nome.plural}` : nome.singular;
  return `${substantivo} ${acao}${sufixo}`;
}

function temId(x: unknown): x is { id: string } {
  return typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string';
}

interface Contagem {
  criados: number;
  excluidos: number;
  editados: number;
}

/** Compara duas listas pelo `id`; `null` quando a lista não tem ids (compara-se só a referência). */
function compararLista(antes: unknown[], depois: unknown[]): Contagem | null {
  if (!antes.every(temId) || !depois.every(temId)) return null;
  const mapaAntes = new Map(antes.map((x) => [x.id, x]));
  const idsDepois = new Set(depois.map((x) => x.id));
  let criados = 0;
  let editados = 0;
  for (const item of depois) {
    const anterior = mapaAntes.get(item.id);
    if (anterior === undefined) criados++;
    else if (anterior !== item && JSON.stringify(anterior) !== JSON.stringify(item)) editados++;
  }
  const excluidos = antes.filter((x) => !idsDepois.has(x.id)).length;
  return { criados, excluidos, editados };
}

/** Descreve em pt-BR o que mudou entre dois estados ("transação criada", "3 contas excluídas"). */
export function descreverMudanca(antes: AppState, depois: AppState): string {
  const frases: string[] = [];
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]) as Set<keyof AppState>;
  for (const chave of chaves) {
    const a = antes[chave];
    const d = depois[chave];
    if (a === d) continue;
    const nome = NOMES[chave] ?? NOME_GENERICO;
    if (Array.isArray(a) && Array.isArray(d)) {
      const c = compararLista(a, d);
      if (c === null) {
        if (JSON.stringify(a) !== JSON.stringify(d)) frases.push(`${nome.plural} alterad${nome.feminino ? 'as' : 'os'}`);
        continue;
      }
      if (c.criados) frases.push(frase(nome, 'criad', c.criados));
      if (c.excluidos) frases.push(frase(nome, 'excluíd', c.excluidos));
      if (c.editados) frases.push(frase(nome, 'editad', c.editados));
    } else if (JSON.stringify(a) !== JSON.stringify(d)) {
      frases.push('configuração alterada');
    }
  }
  if (frases.length === 0) return 'alteração';
  if (frases.length === 1) return frases[0];
  return `${frases.length} alterações`;
}

const empilhar = (pilha: EntradaHistorico[], entrada: EntradaHistorico, limite: number) => [...pilha, entrada].slice(-limite);

/** Registra uma operação feita: `antes` vai para o passado e o futuro é descartado. */
export function registrar(h: Historico, antes: AppState, depois: AppState, limite = LIMITE_HISTORICO): Historico {
  if (antes === depois) return h;
  return { passado: empilhar(h.passado, { estado: antes, descricao: descreverMudanca(antes, depois) }, limite), futuro: [] };
}

export interface Passo {
  historico: Historico;
  estado: AppState;
  descricao: string;
}

/** Volta um passo; `null` quando não há o que desfazer. */
export function desfazer(h: Historico, atual: AppState, limite = LIMITE_HISTORICO): Passo | null {
  const topo = h.passado[h.passado.length - 1];
  if (!topo) return null;
  return {
    estado: topo.estado,
    descricao: topo.descricao,
    historico: { passado: h.passado.slice(0, -1), futuro: empilhar(h.futuro, { estado: atual, descricao: topo.descricao }, limite) },
  };
}

/** Avança um passo desfeito; `null` quando não há o que refazer. */
export function refazer(h: Historico, atual: AppState, limite = LIMITE_HISTORICO): Passo | null {
  const topo = h.futuro[h.futuro.length - 1];
  if (!topo) return null;
  return {
    estado: topo.estado,
    descricao: topo.descricao,
    historico: { passado: empilhar(h.passado, { estado: atual, descricao: topo.descricao }, limite), futuro: h.futuro.slice(0, -1) },
  };
}

export const proximoDesfazer = (h: Historico): string | null => h.passado[h.passado.length - 1]?.descricao ?? null;
export const proximoRefazer = (h: Historico): string | null => h.futuro[h.futuro.length - 1]?.descricao ?? null;
