import { ID_OUTROS_DESPESA, ID_OUTROS_RECEITA } from '../data/categoriasPadrao';
import { efeitoTransacao } from './contas';
import { dataValida, diasEntre } from './date';
import { novoId, proximoTempo } from './id';
import { parseValor } from './money';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado, type Transacao } from './types';

export const DESCRICAO_AJUSTE = 'Ajuste de conciliação';
export const TOLERANCIA_PADRAO = 2;

export interface Conciliacao {
  id: string;
  contaId: string;
  /** Data do extrato conciliado. */
  data: DataISO;
  saldoExtrato: Centavos;
  /** Transações conciliadas (inclui a de ajuste, quando há). */
  transacaoIds: string[];
  /** Transação de ajuste criada no fechamento. */
  ajusteId?: string;
  /** Valor do ajuste com sinal (positivo = receita); 0 quando não houve. */
  ajuste: Centavos;
  criadaEm: number;
}

/** Conciliação em andamento de uma conta. */
export interface Rascunho {
  data: string;
  saldoExtrato: Centavos | null;
  marcadas: string[];
}

export interface EstadoConciliacoes {
  fechadas: Conciliacao[];
  rascunhos: Record<string, Rascunho>;
}

export const conciliacoesVazias = (): EstadoConciliacoes => ({ fechadas: [], rascunhos: {} });

const lista = (estado: AppState): EstadoConciliacoes => estado.conciliacoes ?? conciliacoesVazias();

export const rascunhoVazio = (): Rascunho => ({ data: '', saldoExtrato: null, marcadas: [] });

export function rascunhoDaConta(estado: AppState, contaId: string): Rascunho {
  return lista(estado).rascunhos[contaId] ?? rascunhoVazio();
}

/** Conciliações fechadas da conta, da mais recente para a mais antiga. */
export function historicoConta(estado: AppState, contaId: string): Conciliacao[] {
  return lista(estado)
    .fechadas.filter((c) => c.contaId === contaId)
    .sort((a, b) => b.criadaEm - a.criadaEm);
}

/** Verdadeiro quando a transação pertence a uma conciliação fechada (não pode ser editada nem excluída). */
export function transacaoBloqueada(estado: AppState, id: string): boolean {
  return lista(estado).fechadas.some((c) => c.transacaoIds.includes(id));
}

export interface ResumoConciliacao {
  saldoConciliado: Centavos;
  saldoCalculado: Centavos;
  /** Extrato menos conciliado; null enquanto o saldo do extrato não for informado. */
  diferenca: Centavos | null;
  /** Transações elegíveis (da conta, até a data do extrato, não conciliadas). */
  elegiveis: Transacao[];
  marcadas: Transacao[];
  pendentes: Transacao[];
}

const porData = (a: Transacao, b: Transacao) => a.data.localeCompare(b.data) || a.criadaEm - b.criadaEm || a.id.localeCompare(b.id);

export function calcularConciliacao(estado: AppState, contaId: string, rascunho: Rascunho): ResumoConciliacao {
  const conta = estado.contas.find((c) => c.id === contaId);
  const dataOk = dataValida(rascunho.data);
  const conciliadasIds = new Set(lista(estado).fechadas.flatMap((c) => c.transacaoIds));
  const daConta = estado.transacoes.filter((t) => t.contaId === contaId);
  const elegiveis = daConta.filter((t) => !conciliadasIds.has(t.id) && (!dataOk || t.data <= rascunho.data)).sort(porData);
  const idsElegiveis = new Set(elegiveis.map((t) => t.id));
  const marcadasIds = new Set(rascunho.marcadas.filter((id) => idsElegiveis.has(id)));
  const marcadas = elegiveis.filter((t) => marcadasIds.has(t.id));
  const pendentes = elegiveis.filter((t) => !marcadasIds.has(t.id));
  const pagamentos = estado.pagamentosFatura
    .filter((p) => p.contaOrigemId === contaId && (!dataOk || p.data <= rascunho.data))
    .reduce((s, p) => s - p.valor, 0);
  const jaConciliadas = daConta.filter((t) => conciliadasIds.has(t.id)).reduce((s, t) => s + efeitoTransacao(t), 0);
  const base = conta?.saldoInicial ?? 0;
  const saldoConciliado = base + pagamentos + jaConciliadas + marcadas.reduce((s, t) => s + efeitoTransacao(t), 0);
  const saldoCalculado =
    base +
    daConta.reduce((s, t) => s + efeitoTransacao(t), 0) +
    estado.pagamentosFatura.reduce((s, p) => s + (p.contaOrigemId === contaId ? -p.valor : 0) + (p.contaCartaoId === contaId ? p.valor : 0), 0);
  return {
    saldoConciliado,
    saldoCalculado,
    diferenca: rascunho.saldoExtrato === null ? null : rascunho.saldoExtrato - saldoConciliado,
    elegiveis,
    marcadas,
    pendentes,
  };
}

function contaConciliavel(estado: AppState, contaId: string): Resultado<null> {
  const conta = estado.contas.find((c) => c.id === contaId);
  if (!conta) return falha('Conta não encontrada.', 'contaId');
  if (conta.tipo === 'cartao') return falha('Cartões de crédito não são conciliados aqui.', 'contaId');
  return ok(null);
}

/** Guarda o rascunho da conta (qualquer conteúdo; a validação acontece no fechamento). */
export function salvarRascunho(estado: AppState, contaId: string, rascunho: Rascunho): Resultado<AppState> {
  const c = contaConciliavel(estado, contaId);
  if (!c.ok) return c;
  const atual = lista(estado);
  return ok({ ...estado, conciliacoes: { ...atual, rascunhos: { ...atual.rascunhos, [contaId]: rascunho } } });
}

export function descartarRascunho(estado: AppState, contaId: string): Resultado<AppState> {
  const atual = lista(estado);
  const { [contaId]: _removido, ...resto } = atual.rascunhos;
  void _removido;
  return ok({ ...estado, conciliacoes: { ...atual, rascunhos: resto } });
}

export function validarRascunho(estado: AppState, contaId: string, r: Rascunho): Resultado<{ data: DataISO; saldoExtrato: Centavos }> {
  const c = contaConciliavel(estado, contaId);
  if (!c.ok) return c;
  if (!dataValida(r.data)) return falha('Informe uma data válida para o extrato.', 'data');
  if (r.saldoExtrato === null || !Number.isSafeInteger(r.saldoExtrato)) return falha('Informe o saldo do extrato.', 'saldoExtrato');
  const ultima = historicoConta(estado, contaId)[0];
  if (ultima && r.data < ultima.data) return falha('A data não pode ser anterior à da última conciliação da conta.', 'data');
  return ok({ data: r.data, saldoExtrato: r.saldoExtrato });
}

/**
 * Fecha a conciliação do rascunho. Com diferença diferente de zero só fecha se `ajustar` for verdadeiro,
 * criando uma transação de ajuste na categoria "Outros".
 */
export function fecharConciliacao(estado: AppState, contaId: string, opcoes: { ajustar?: boolean } = {}): Resultado<AppState> {
  const rascunho = rascunhoDaConta(estado, contaId);
  const v = validarRascunho(estado, contaId, rascunho);
  if (!v.ok) return v;
  const resumo = calcularConciliacao(estado, contaId, rascunho);
  const diferenca = resumo.diferenca ?? 0;
  if (diferenca !== 0 && !opcoes.ajustar) {
    return falha('A diferença deve ser zero para fechar a conciliação. Marque as transações que faltam ou feche com ajuste.');
  }
  const ids = resumo.marcadas.map((t) => t.id);
  let transacoes = estado.transacoes;
  let ajusteId: string | undefined;
  if (diferenca !== 0) {
    const tipo = diferenca > 0 ? 'receita' : 'despesa';
    const categoriaId = tipo === 'receita' ? ID_OUTROS_RECEITA : ID_OUTROS_DESPESA;
    if (!estado.categorias.some((c) => c.id === categoriaId)) return falha('A categoria "Outros" não foi encontrada.');
    ajusteId = novoId();
    transacoes = [
      ...transacoes,
      { id: ajusteId, contaId, categoriaId, tipo, valor: Math.abs(diferenca), data: v.valor.data, descricao: DESCRICAO_AJUSTE, criadaEm: proximoTempo() },
    ];
    ids.push(ajusteId);
  }
  if (ids.length === 0) return falha('Marque ao menos uma transação para conciliar.');
  const atual = lista(estado);
  const { [contaId]: _r, ...rascunhos } = atual.rascunhos;
  void _r;
  const nova: Conciliacao = {
    id: novoId(),
    contaId,
    data: v.valor.data,
    saldoExtrato: v.valor.saldoExtrato,
    transacaoIds: ids,
    ...(ajusteId ? { ajusteId } : {}),
    ajuste: diferenca,
    criadaEm: proximoTempo(),
  };
  return ok({ ...estado, transacoes, conciliacoes: { fechadas: [...atual.fechadas, nova], rascunhos } });
}

/** Reabre a conciliação mais recente da conta: apaga o ajuste e devolve tudo ao rascunho. */
export function reabrirUltima(estado: AppState, contaId: string): Resultado<AppState> {
  const ultima = historicoConta(estado, contaId)[0];
  if (!ultima) return falha('Esta conta não tem conciliações fechadas.');
  if (rascunhoDaConta(estado, contaId).marcadas.length > 0) {
    return falha('Há uma conciliação em andamento com transações marcadas. Descarte-a antes de reabrir a última.');
  }
  const atual = lista(estado);
  const rascunho: Rascunho = {
    data: ultima.data,
    saldoExtrato: ultima.saldoExtrato,
    marcadas: ultima.transacaoIds.filter((id) => id !== ultima.ajusteId),
  };
  return ok({
    ...estado,
    transacoes: ultima.ajusteId ? estado.transacoes.filter((t) => t.id !== ultima.ajusteId) : estado.transacoes,
    conciliacoes: { fechadas: atual.fechadas.filter((c) => c.id !== ultima.id), rascunhos: { ...atual.rascunhos, [contaId]: rascunho } },
  });
}

// ---------- Extrato colado e sugestão de pares ----------

export interface LinhaExtrato {
  /** Número da linha no texto colado (a partir de 1). */
  linha: number;
  data: DataISO;
  descricao: string;
  /** Valor com sinal: positivo entra, negativo sai. */
  valor: Centavos;
}

export interface ErroLinha {
  linha: number;
  motivo: string;
}

function normalizarData(texto: string): DataISO | null {
  const t = texto.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : t;
  return dataValida(iso) ? iso : null;
}

/** Lê linhas `data;descrição;valor`. Linhas vazias são ignoradas; as inválidas viram erros. */
export function interpretarExtrato(texto: string): { linhas: LinhaExtrato[]; erros: ErroLinha[] } {
  const linhas: LinhaExtrato[] = [];
  const erros: ErroLinha[] = [];
  texto.split(/\r?\n/).forEach((bruta, i) => {
    if (!bruta.trim()) return;
    const n = i + 1;
    const partes = bruta.split(';');
    if (partes.length < 3) return void erros.push({ linha: n, motivo: 'Use o formato data;descrição;valor.' });
    const data = normalizarData(partes[0]);
    if (!data) return void erros.push({ linha: n, motivo: 'Data inválida.' });
    const valor = parseValor(partes[partes.length - 1]);
    if (valor === null || valor === 0) return void erros.push({ linha: n, motivo: 'Valor inválido.' });
    linhas.push({ linha: n, data, descricao: partes.slice(1, -1).join(';').trim(), valor });
  });
  return { linhas, erros };
}

export interface ParSugerido {
  linha: LinhaExtrato;
  transacao: Transacao;
  /** Diferença de dias entre a linha e a transação. */
  dias: number;
}

/** Casa linhas e transações de mesmo valor com sinal e data dentro da tolerância; cada transação é usada uma vez. */
export function sugerirPares(
  linhas: LinhaExtrato[],
  transacoes: Transacao[],
  toleranciaDias: number = TOLERANCIA_PADRAO,
): { pares: ParSugerido[]; semPar: LinhaExtrato[] } {
  const candidatos: ParSugerido[] = [];
  for (const linha of linhas) {
    for (const transacao of transacoes) {
      if (efeitoTransacao(transacao) !== linha.valor) continue;
      const dias = Math.abs(diasEntre(linha.data, transacao.data));
      if (dias <= toleranciaDias) candidatos.push({ linha, transacao, dias });
    }
  }
  candidatos.sort(
    (a, b) => a.dias - b.dias || a.linha.linha - b.linha.linha || a.transacao.criadaEm - b.transacao.criadaEm || a.transacao.id.localeCompare(b.transacao.id),
  );
  const linhasUsadas = new Set<number>();
  const transUsadas = new Set<string>();
  const pares: ParSugerido[] = [];
  for (const c of candidatos) {
    if (linhasUsadas.has(c.linha.linha) || transUsadas.has(c.transacao.id)) continue;
    linhasUsadas.add(c.linha.linha);
    transUsadas.add(c.transacao.id);
    pares.push(c);
  }
  pares.sort((a, b) => a.linha.linha - b.linha.linha);
  return { pares, semPar: linhas.filter((l) => !linhasUsadas.has(l.linha)) };
}

/** Marca as transações sugeridas no rascunho, sem duplicar. */
export function marcarSugestoes(r: Rascunho, ids: string[]): Rascunho {
  return { ...r, marcadas: [...new Set([...r.marcadas, ...ids])] };
}
