import { dataValida, diasEntre } from './date';
import { novoId, proximoTempo } from './id';
import { aplicarLote, type ResultadoLote } from './lote';
import { percentualDecimal } from './relatorios';
import { nomeCompleto, raizDe } from './subcategorias';
import { TAG_TAMANHO_MAX, normalizarTag } from './tags';
import { normalizarTexto } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado, type Transacao } from './types';

export interface Evento {
  id: string;
  nome: string;
  inicio: DataISO;
  fim: DataISO;
  orcamento: Centavos;
  tag: string;
  criadoEm: number;
}

export type DadosEvento = Omit<Evento, 'id' | 'criadoEm'>;

export const NOME_EVENTO_MAX = 60;
export const LIMITE_ATENCAO = 80;
export const MAIORES_DESPESAS = 5;

export type SituacaoEvento = 'dentro' | 'atencao' | 'estourado';
export const ROTULO_SITUACAO_EVENTO: Record<SituacaoEvento, string> = { dentro: 'Dentro do orçamento', atencao: 'Atenção', estourado: 'Estourado' };

export const listaEventos = (estado: Pick<AppState, 'eventos'>): Evento[] => estado.eventos ?? [];

/** Tag sugerida a partir do nome: sem acento, sem espaços, até o tamanho máximo de uma tag. */
export function tagSugerida(nome: string): string {
  return normalizarTexto(nome).replace(/[^a-z0-9-]/g, '').slice(0, TAG_TAMANHO_MAX);
}

function validar(estado: AppState, dados: DadosEvento, id?: string): Resultado<DadosEvento> {
  const nome = dados.nome.trim();
  if (nome.length < 1 || nome.length > NOME_EVENTO_MAX) return falha(`Informe um nome de 1 a ${NOME_EVENTO_MAX} caracteres.`, 'nome');
  if (!dataValida(dados.inicio)) return falha('Informe a data de início.', 'inicio');
  if (!dataValida(dados.fim)) return falha('Informe a data de fim.', 'fim');
  if (dados.fim < dados.inicio) return falha('O fim não pode ser antes do início.', 'fim');
  if (!Number.isSafeInteger(dados.orcamento) || dados.orcamento <= 0) return falha('Informe um orçamento maior que zero.', 'orcamento');
  const tag = normalizarTag(dados.tag);
  if (!tag) return falha('Informe a tag do evento.', 'tag');
  if (tag.length > TAG_TAMANHO_MAX) return falha(`A tag deve ter no máximo ${TAG_TAMANHO_MAX} caracteres.`, 'tag');
  if (listaEventos(estado).some((e) => e.id !== id && e.tag === tag)) return falha('Outro evento já usa essa tag.', 'tag');
  return ok({ ...dados, nome, tag });
}

export function criarEvento(estado: AppState, dados: DadosEvento): Resultado<AppState> {
  const v = validar(estado, dados);
  if (!v.ok) return v;
  return ok({ ...estado, eventos: [...listaEventos(estado), { id: novoId(), ...v.valor, criadoEm: proximoTempo() }] });
}

export function editarEvento(estado: AppState, id: string, dados: DadosEvento): Resultado<AppState> {
  if (!listaEventos(estado).some((e) => e.id === id)) return falha('Evento não encontrado.');
  const v = validar(estado, dados, id);
  if (!v.ok) return v;
  return ok({ ...estado, eventos: listaEventos(estado).map((e) => (e.id === id ? { ...e, ...v.valor } : e)) });
}

export function excluirEvento(estado: AppState, id: string): Resultado<AppState> {
  if (!listaEventos(estado).some((e) => e.id === id)) return falha('Evento não encontrado.');
  return ok({ ...estado, eventos: listaEventos(estado).filter((e) => e.id !== id) });
}

/** Dias de `de` até `ate`, contando os dois extremos. */
const diasInclusivos = (de: DataISO, ate: DataISO) => diasEntre(de, ate) + 1;

export interface LinhaCategoriaEvento {
  categoriaId: string;
  nome: string;
  valor: Centavos;
  percentual: number | null;
}

export interface ResumoEvento {
  despesas: Centavos;
  reembolsos: Centavos;
  gasto: Centavos;
  restante: Centavos;
  percentual: number | null;
  situacao: SituacaoEvento;
  porCategoria: LinhaCategoriaEvento[];
  /** null antes do início. */
  mediaDiaria: Centavos | null;
  diasDecorridos: number;
  duracao: number;
  encerrado: boolean;
  /** Só para eventos em andamento. */
  projecao: Centavos | null;
  maiores: Transacao[];
  quantidade: number;
}

export const transacoesDoEvento = (transacoes: Transacao[], evento: Evento) => transacoes.filter((t) => (t.tags ?? []).includes(evento.tag));

export function resumoEvento(estado: Pick<AppState, 'transacoes' | 'categorias'>, evento: Evento, hoje: DataISO): ResumoEvento {
  const doEvento = transacoesDoEvento(estado.transacoes, evento);
  const despesasLista = doEvento.filter((t) => t.tipo === 'despesa');
  const despesas = despesasLista.reduce((s, t) => s + t.valor, 0);
  const reembolsos = doEvento.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const gasto = despesas - reembolsos;
  const percentual = percentualDecimal(gasto, evento.orcamento);
  const situacao: SituacaoEvento = gasto > evento.orcamento ? 'estourado' : (percentual ?? 0) >= LIMITE_ATENCAO ? 'atencao' : 'dentro';

  const somas = new Map<string, Centavos>();
  for (const t of despesasLista) {
    const raiz = raizDe(estado.categorias, t.categoriaId);
    somas.set(raiz, (somas.get(raiz) ?? 0) + t.valor);
  }
  const porCategoria = [...somas.entries()]
    .map(([categoriaId, valor]) => ({ categoriaId, nome: nomeCompleto(estado.categorias, categoriaId), valor, percentual: percentualDecimal(valor, despesas) }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));

  const duracao = diasInclusivos(evento.inicio, evento.fim);
  const encerrado = hoje > evento.fim;
  const diasDecorridos = hoje < evento.inicio ? 0 : diasInclusivos(evento.inicio, encerrado ? evento.fim : hoje);
  const mediaDiaria = diasDecorridos > 0 ? Math.round(gasto / diasDecorridos) : null;
  const emAndamento = !encerrado && diasDecorridos > 0;
  const projecao = emAndamento && mediaDiaria !== null ? Math.round((gasto / diasDecorridos) * duracao) : null;

  const maiores = [...despesasLista].sort((a, b) => b.valor - a.valor || b.data.localeCompare(a.data)).slice(0, MAIORES_DESPESAS);
  return { despesas, reembolsos, gasto, restante: evento.orcamento - gasto, percentual, situacao, porCategoria, mediaDiaria, diasDecorridos, duracao, encerrado, projecao, maiores, quantidade: doEvento.length };
}

/** Despesas do período que ainda não têm a tag do evento. */
export function despesasSemTag(transacoes: Transacao[], evento: Evento): Transacao[] {
  return transacoes.filter((t) => t.tipo === 'despesa' && t.data >= evento.inicio && t.data <= evento.fim && !(t.tags ?? []).includes(evento.tag));
}

/** Adiciona a tag do evento às despesas do período, numa operação; reaproveita a edição em lote. */
export function etiquetarPeriodo(estado: AppState, eventoId: string): Resultado<ResultadoLote> {
  const evento = listaEventos(estado).find((e) => e.id === eventoId);
  if (!evento) return falha('Evento não encontrado.');
  const ids = new Set(despesasSemTag(estado.transacoes, evento).map((t) => t.id));
  if (ids.size === 0) return falha('Todas as despesas do período já têm a tag.');
  return aplicarLote(estado, ids, { tipo: 'adicionar-tags', tags: [evento.tag] });
}

/** Em andamento e futuros (fim a partir de hoje), por início; encerrados, do mais recente ao mais antigo. */
export function separarEventos(eventos: Evento[], hoje: DataISO): { ativos: Evento[]; encerrados: Evento[] } {
  return {
    ativos: eventos.filter((e) => e.fim >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    encerrados: eventos.filter((e) => e.fim < hoje).sort((a, b) => b.fim.localeCompare(a.fim)),
  };
}
