import { saldoConta } from './contas';
import { dataValida, diasNoMes, mesDe, somarMeses } from './date';
import { novoId, proximoTempo } from './id';
import { DESCRICAO_MAX } from './transacoes';
import {
  falha,
  ok,
  type AppState,
  type CartaoConfig,
  type Centavos,
  type Conta,
  type DataISO,
  type Mes,
  type PagamentoFatura,
  type Resultado,
  type Transacao,
} from './types';

export const PARCELAS_MIN = 2;
export const PARCELAS_MAX = 48;

const dia2 = (n: number) => String(n).padStart(2, '0');

export function cartoesAtivos(contas: Conta[]): Conta[] {
  return contas.filter((c) => c.tipo === 'cartao' && !c.arquivada);
}

/** Último dia do ciclo da fatura de `mes` (o dia de fechamento, inclusive). */
export function fechamentoFatura(config: CartaoConfig, mes: Mes): DataISO {
  return `${mes}-${dia2(config.diaFechamento)}`;
}

/** Ciclo da fatura de `mes`: do dia seguinte ao fechamento anterior até o fechamento de `mes`. */
export function cicloFatura(config: CartaoConfig, mes: Mes): { inicio: DataISO; fim: DataISO } {
  const anterior = fechamentoFatura(config, somarMeses(mes, -1));
  const [a, m, d] = anterior.split('-').map(Number);
  const proximo = new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
  return { inicio: proximo, fim: fechamentoFatura(config, mes) };
}

/** Vence no mês do fechamento se o vencimento é depois do fechamento; senão, no mês seguinte. */
export function vencimentoFatura(config: CartaoConfig, mes: Mes): DataISO {
  const mesVenc = config.diaVencimento > config.diaFechamento ? mes : somarMeses(mes, 1);
  return `${mesVenc}-${dia2(config.diaVencimento)}`;
}

/** Fatura aberta hoje: a que fecha no mês corrente, ou no seguinte se o fechamento já passou. */
export function mesFaturaAberta(config: CartaoConfig, hoje: DataISO): Mes {
  const dia = Number(hoje.slice(8, 10));
  return dia <= config.diaFechamento ? mesDe(hoje) : somarMeses(mesDe(hoje), 1);
}

export function transacoesDaFatura(estado: AppState, conta: Conta, mes: Mes): Transacao[] {
  if (!conta.cartao) return [];
  const { inicio, fim } = cicloFatura(conta.cartao, mes);
  return estado.transacoes
    .filter((t) => t.contaId === conta.id && t.data >= inicio && t.data <= fim)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadaEm - a.criadaEm));
}

/** Compras menos estornos (receitas) no ciclo. */
export function totalFatura(transacoes: Transacao[]): Centavos {
  return transacoes.reduce((s, t) => s + (t.tipo === 'despesa' ? t.valor : -t.valor), 0);
}

export function pagamentosDaFatura(estado: AppState, contaId: string, mes: Mes): PagamentoFatura[] {
  return estado.pagamentosFatura.filter((p) => p.contaCartaoId === contaId && p.mesFatura === mes);
}

export type SituacaoFatura = 'aberta' | 'fechada' | 'paga';

export interface ResumoFatura {
  transacoes: Transacao[];
  total: Centavos;
  pago: Centavos;
  restante: Centavos;
  vencimento: DataISO;
  situacao: SituacaoFatura;
}

export function resumoFatura(estado: AppState, conta: Conta, mes: Mes, hoje: DataISO): ResumoFatura | null {
  if (!conta.cartao) return null;
  const transacoes = transacoesDaFatura(estado, conta, mes);
  const total = totalFatura(transacoes);
  const pago = pagamentosDaFatura(estado, conta.id, mes).reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(total - pago, 0);
  const { fim } = cicloFatura(conta.cartao, mes);
  const situacao: SituacaoFatura = hoje <= fim ? 'aberta' : restante > 0 ? 'fechada' : 'paga';
  return { transacoes, total, pago, restante, vencimento: vencimentoFatura(conta.cartao, mes), situacao };
}

export interface LimiteCartao {
  usado: Centavos;
  disponivel: Centavos;
  excedido: boolean;
}

/** Usado = dívida atual (saldo negativo do cartão); nunca negativo. */
export function limiteCartao(estado: AppState, conta: Conta): LimiteCartao | null {
  if (!conta.cartao) return null;
  const usado = Math.max(-saldoConta(estado, conta.id), 0);
  const disponivel = conta.cartao.limite - usado;
  return { usado, disponivel, excedido: disponivel < 0 };
}

// ------------------------------------------------------------- parcelamento

export interface DadosCompraParcelada {
  contaId: string;
  descricao: string;
  valorTotal: Centavos;
  parcelas: number;
  /** Data da primeira parcela. */
  data: DataISO;
  categoriaId: string;
}

/** Divide em centavos exatos: o resto da divisão fica na primeira parcela. */
export function dividirParcelas(total: Centavos, parcelas: number): Centavos[] {
  const base = Math.floor(total / parcelas);
  const resto = total - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => (i === 0 ? base + resto : base));
}

/** Mesmo dia nos meses seguintes, limitado ao último dia de cada mês. */
export function dataDaParcela(primeira: DataISO, indice: number): DataISO {
  const mes = somarMeses(mesDe(primeira), indice);
  const [ano, m] = mes.split('-').map(Number);
  const dia = Math.min(Number(primeira.slice(8, 10)), diasNoMes(ano, m));
  return `${mes}-${dia2(dia)}`;
}

export function criarCompraParcelada(estado: AppState, dados: DadosCompraParcelada): Resultado<AppState> {
  const conta = estado.contas.find((c) => c.id === dados.contaId);
  if (!conta || conta.tipo !== 'cartao' || conta.arquivada) return falha('Escolha um cartão ativo.', 'contaId');
  const descricao = dados.descricao.trim();
  if (!descricao) return falha('Informe a descrição da compra.', 'descricao');
  if (!Number.isInteger(dados.parcelas) || dados.parcelas < PARCELAS_MIN || dados.parcelas > PARCELAS_MAX) {
    return falha(`O número de parcelas deve ficar entre ${PARCELAS_MIN} e ${PARCELAS_MAX}.`, 'parcelas');
  }
  if (!Number.isInteger(dados.valorTotal) || dados.valorTotal < dados.parcelas) {
    return falha('O valor total deve ser de ao menos 1 centavo por parcela.', 'valorTotal');
  }
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  const categoria = estado.categorias.find((c) => c.id === dados.categoriaId);
  if (!categoria || categoria.tipo !== 'despesa' || categoria.arquivada) return falha('Escolha uma categoria de despesa ativa.', 'categoriaId');

  const grupoId = novoId();
  const valores = dividirParcelas(dados.valorTotal, dados.parcelas);
  const novas: Transacao[] = valores.map((valor, i) => {
    const sufixo = ` (${i + 1}/${dados.parcelas})`;
    return {
      id: novoId(),
      contaId: conta.id,
      categoriaId: categoria.id,
      tipo: 'despesa',
      valor,
      data: dataDaParcela(dados.data, i),
      descricao: descricao.slice(0, DESCRICAO_MAX - sufixo.length) + sufixo,
      criadaEm: proximoTempo(),
      parcela: { grupoId, numero: i + 1, total: dados.parcelas },
    };
  });
  return ok({ ...estado, transacoes: [...estado.transacoes, ...novas] });
}

export type EscopoExclusao = 'uma' | 'todas';

/** Exclui só a parcela ou todas as parcelas do mesmo grupo. */
export function excluirParcela(estado: AppState, transacaoId: string, escopo: EscopoExclusao): Resultado<AppState> {
  const alvo = estado.transacoes.find((t) => t.id === transacaoId);
  if (!alvo) return falha('Transação não encontrada.');
  const grupo = alvo.parcela?.grupoId;
  const remover = (t: Transacao) => (escopo === 'todas' && grupo ? t.parcela?.grupoId === grupo : t.id === transacaoId);
  return ok({ ...estado, transacoes: estado.transacoes.filter((t) => !remover(t)) });
}

// ---------------------------------------------------------------- pagamentos

export interface DadosPagamento {
  contaCartaoId: string;
  mesFatura: Mes;
  valor: Centavos;
  data: DataISO;
  contaOrigemId: string;
}

export function registrarPagamento(estado: AppState, dados: DadosPagamento, hoje: DataISO): Resultado<AppState> {
  const cartao = estado.contas.find((c) => c.id === dados.contaCartaoId);
  if (!cartao || cartao.tipo !== 'cartao' || !cartao.cartao) return falha('Cartão não configurado.');
  const origem = estado.contas.find((c) => c.id === dados.contaOrigemId);
  if (!origem || origem.arquivada || origem.tipo === 'cartao') return falha('Escolha uma conta de origem ativa que não seja cartão.', 'contaOrigemId');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  const resumo = resumoFatura(estado, cartao, dados.mesFatura, hoje);
  if (!resumo) return falha('Cartão não configurado.');
  if (dados.valor > resumo.restante) return falha('O valor é maior que o restante da fatura.', 'valor');
  const pagamento: PagamentoFatura = { id: novoId(), ...dados };
  return ok({ ...estado, pagamentosFatura: [...estado.pagamentosFatura, pagamento] });
}

export function excluirPagamento(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.pagamentosFatura.some((p) => p.id === id)) return falha('Pagamento não encontrado.');
  return ok({ ...estado, pagamentosFatura: estado.pagamentosFatura.filter((p) => p.id !== id) });
}
