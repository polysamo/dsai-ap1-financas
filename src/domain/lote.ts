import { dataValida } from './date';
import { TAGS_MAX, validarTags } from './tags';
import { totaisTransacoes, type TotaisTransacoes } from './transacoes';
import { falha, ok, type AppState, type DataISO, type Resultado, type Transacao } from './types';

/** Uma alteração aplicada a várias transações de uma vez. */
export type AlteracaoLote =
  | { tipo: 'categoria'; categoriaId: string }
  | { tipo: 'conta'; contaId: string }
  | { tipo: 'data'; data: DataISO }
  | { tipo: 'adicionar-tags'; tags: string[] }
  | { tipo: 'remover-tags'; tags: string[] };

export interface Pulada {
  id: string;
  motivo: string;
}

export interface ResultadoLote {
  estado: AppState;
  alteradas: number;
  puladas: Pulada[];
}

export interface ResumoSelecao extends TotaisTransacoes {
  quantidade: number;
}

export function resumoSelecao(transacoes: Transacao[], ids: ReadonlySet<string>): ResumoSelecao {
  const selecionadas = transacoes.filter((t) => ids.has(t.id));
  return { quantidade: selecionadas.length, ...totaisTransacoes(selecionadas) };
}

/** Mantém só os ids que continuam visíveis (ex.: depois de mudar os filtros). */
export function restringirSelecao(ids: ReadonlySet<string>, visiveis: Transacao[]): Set<string> {
  const permitidos = new Set(visiveis.map((t) => t.id));
  return new Set([...ids].filter((id) => permitidos.has(id)));
}

const ehParcelaDeCartao = (estado: AppState, t: Transacao) =>
  t.parcela !== undefined && estado.contas.find((c) => c.id === t.contaId)?.tipo === 'cartao';

/** Valida a alteração em si (independente de cada transação). */
function validarAlteracao(estado: AppState, alteracao: AlteracaoLote): Resultado<AlteracaoLote> {
  switch (alteracao.tipo) {
    case 'categoria': {
      const cat = estado.categorias.find((c) => c.id === alteracao.categoriaId);
      if (!cat) return falha('Selecione uma categoria.', 'categoriaId');
      if (cat.arquivada) return falha('Esta categoria está arquivada.', 'categoriaId');
      return ok(alteracao);
    }
    case 'conta': {
      const conta = estado.contas.find((c) => c.id === alteracao.contaId);
      if (!conta || conta.arquivada) return falha('Escolha uma conta ativa.', 'contaId');
      return ok(alteracao);
    }
    case 'data':
      return dataValida(alteracao.data) ? ok(alteracao) : falha('Informe uma data válida.', 'data');
    case 'adicionar-tags':
    case 'remover-tags': {
      const v = validarTags(alteracao.tags);
      if (!v.ok) return v;
      if (v.valor.length === 0) return falha('Informe ao menos uma tag.', 'tags');
      return ok({ ...alteracao, tags: v.valor });
    }
  }
}

/** Aplica a alteração a uma transação; devolve o motivo quando ela precisa ser pulada. */
function alterar(estado: AppState, t: Transacao, alteracao: AlteracaoLote): Transacao | string {
  switch (alteracao.tipo) {
    case 'categoria': {
      const cat = estado.categorias.find((c) => c.id === alteracao.categoriaId)!;
      if (cat.tipo !== t.tipo) return `a categoria é de ${cat.tipo} e a transação é ${t.tipo}`;
      return { ...t, categoriaId: cat.id };
    }
    case 'conta':
      if (ehParcelaDeCartao(estado, t)) return 'parcela de cartão fica na conta do cartão';
      return { ...t, contaId: alteracao.contaId };
    case 'data':
      if (ehParcelaDeCartao(estado, t)) return 'parcela de cartão tem a data da compra';
      return { ...t, data: alteracao.data };
    case 'adicionar-tags': {
      const tags = [...new Set([...(t.tags ?? []), ...alteracao.tags])];
      if (tags.length > TAGS_MAX) return `passaria de ${TAGS_MAX} tags`;
      return { ...t, tags };
    }
    case 'remover-tags': {
      const remover = new Set(alteracao.tags);
      const tags = (t.tags ?? []).filter((x) => !remover.has(x));
      const { tags: _antigas, ...resto } = t;
      return tags.length ? { ...resto, tags } : resto;
    }
  }
}

/** Aplica a alteração a todas as transações `ids`; falha se nenhuma puder ser alterada. */
export function aplicarLote(estado: AppState, ids: ReadonlySet<string>, alteracao: AlteracaoLote): Resultado<ResultadoLote> {
  if (ids.size === 0) return falha('Selecione ao menos uma transação.');
  const v = validarAlteracao(estado, alteracao);
  if (!v.ok) return v;
  const puladas: Pulada[] = [];
  let alteradas = 0;
  const transacoes = estado.transacoes.map((t) => {
    if (!ids.has(t.id)) return t;
    const r = alterar(estado, t, v.valor);
    if (typeof r === 'string') {
      puladas.push({ id: t.id, motivo: r });
      return t;
    }
    alteradas++;
    return r;
  });
  if (alteradas === 0) {
    const motivo = puladas[0]?.motivo ?? 'transações não encontradas';
    return falha(`Nenhuma transação pôde ser alterada: ${motivo}.`);
  }
  return ok({ estado: { ...estado, transacoes }, alteradas, puladas });
}

export function excluirLote(estado: AppState, ids: ReadonlySet<string>): Resultado<ResultadoLote> {
  const restantes = estado.transacoes.filter((t) => !ids.has(t.id));
  const removidas = estado.transacoes.length - restantes.length;
  if (removidas === 0) return falha('Selecione ao menos uma transação.');
  return ok({ estado: { ...estado, transacoes: restantes }, alteradas: removidas, puladas: [] });
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Mensagem final: quantas foram alteradas e, se houver, quantas puladas e por quê. */
export function mensagemLote(r: Pick<ResultadoLote, 'alteradas' | 'puladas'>, verbo = 'alterada'): string {
  const base = `${plural(r.alteradas, 'transação', 'transações')} ${verbo}${r.alteradas === 1 ? '' : 's'}.`;
  if (r.puladas.length === 0) return base;
  const motivos = [...new Set(r.puladas.map((p) => p.motivo))].join('; ');
  return `${base} ${plural(r.puladas.length, 'pulada', 'puladas')} (${motivos}).`;
}
