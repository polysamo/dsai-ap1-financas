import type { Transferencia } from './transferencias';
import { novoId, proximoTempo } from './id';
import { falha, ok, type AppState, type CartaoConfig, type Centavos, type Conta, type Resultado, type TipoConta, type Transacao } from './types';

export const TIPOS_CONTA: TipoConta[] = ['corrente', 'poupanca', 'dinheiro', 'investimento', 'cartao'];

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  corrente: 'Conta corrente',
  poupanca: 'Poupança',
  dinheiro: 'Dinheiro',
  investimento: 'Investimento',
  cartao: 'Cartão de crédito',
};

export const NOME_MAX = 40;

export interface DadosConta {
  nome: string;
  tipo: TipoConta;
  saldoInicial: Centavos;
  /** Ciclo e limite; só vale para o tipo cartão e é opcional até o usuário configurar. */
  cartao?: CartaoConfig;
}

const normalizar = (nome: string) => nome.trim().toLocaleLowerCase('pt-BR');

export function validarNomeConta(contas: Conta[], nome: string, ignorarId?: string): Resultado<string> {
  const limpo = nome.trim();
  if (!limpo) return falha('Informe o nome da conta.', 'nome');
  if (limpo.length > NOME_MAX) return falha(`O nome deve ter no máximo ${NOME_MAX} caracteres.`, 'nome');
  const duplicada = contas.some((c) => !c.arquivada && c.id !== ignorarId && normalizar(c.nome) === normalizar(limpo));
  if (duplicada) return falha('Já existe uma conta ativa com esse nome.', 'nome');
  return ok(limpo);
}

/** Dias de 1 a 28 e limite maior que zero. O campo do erro indica qual valor corrigir. */
export function validarCartao(c: CartaoConfig): Resultado<CartaoConfig> {
  const diaOk = (d: number) => Number.isInteger(d) && d >= 1 && d <= 28;
  if (!diaOk(c.diaFechamento)) return falha('O dia de fechamento deve ser um inteiro de 1 a 28.', 'diaFechamento');
  if (!diaOk(c.diaVencimento)) return falha('O dia de vencimento deve ser um inteiro de 1 a 28.', 'diaVencimento');
  if (!Number.isInteger(c.limite) || c.limite <= 0) return falha('O limite deve ser maior que zero.', 'limite');
  return ok(c);
}

/** Só contas do tipo cartão guardam configuração de ciclo. */
function cartaoDaConta(dados: DadosConta): Resultado<CartaoConfig | undefined> {
  if (dados.tipo !== 'cartao' || !dados.cartao) return ok(undefined);
  return validarCartao(dados.cartao);
}

export function criarConta(estado: AppState, dados: DadosConta): Resultado<AppState> {
  const nome = validarNomeConta(estado.contas, dados.nome);
  if (!nome.ok) return nome;
  const cartao = cartaoDaConta(dados);
  if (!cartao.ok) return cartao;
  const conta: Conta = {
    id: novoId(),
    nome: nome.valor,
    tipo: dados.tipo,
    saldoInicial: dados.saldoInicial,
    arquivada: false,
    criadaEm: proximoTempo(),
    ...(cartao.valor ? { cartao: cartao.valor } : {}),
  };
  return ok({ ...estado, contas: [...estado.contas, conta] });
}

export function editarConta(estado: AppState, id: string, dados: DadosConta): Resultado<AppState> {
  const atual = estado.contas.find((c) => c.id === id);
  if (!atual) return falha('Conta não encontrada.');
  const nome = atual.arquivada ? ok(dados.nome.trim()) : validarNomeConta(estado.contas, dados.nome, id);
  if (!nome.ok) return nome;
  if (!nome.valor || nome.valor.length > NOME_MAX) return falha('Nome inválido.', 'nome');
  const cartao = cartaoDaConta(dados);
  if (!cartao.ok) return cartao;
  return ok({
    ...estado,
    contas: estado.contas.map((c) => {
      if (c.id !== id) return c;
      const { cartao: _antigo, ...resto } = c;
      void _antigo;
      return { ...resto, nome: nome.valor, tipo: dados.tipo, saldoInicial: dados.saldoInicial, ...(cartao.valor ? { cartao: cartao.valor } : {}) };
    }),
  });
}

export function contaTemTransacoes(estado: AppState, id: string): boolean {
  return (
    estado.transacoes.some((t) => t.contaId === id) ||
    estado.pagamentosFatura.some((p) => p.contaCartaoId === id || p.contaOrigemId === id) ||
    (estado.transferencias ?? []).some((t) => t.contaOrigemId === id || t.contaDestinoId === id)
  );
}

/** Só contas sem transações, pagamentos ou transferências podem ser excluídas; as demais devem ser arquivadas. */
export function excluirConta(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.contas.some((c) => c.id === id)) return falha('Conta não encontrada.');
  if (contaTemTransacoes(estado, id)) return falha('Esta conta tem transações e não pode ser excluída. Arquive-a.');
  return ok({ ...estado, contas: estado.contas.filter((c) => c.id !== id) });
}

export function arquivarConta(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.contas.some((c) => c.id === id)) return falha('Conta não encontrada.');
  return ok({ ...estado, contas: estado.contas.map((c) => (c.id === id ? { ...c, arquivada: true } : c)) });
}

export function reativarConta(estado: AppState, id: string): Resultado<AppState> {
  const conta = estado.contas.find((c) => c.id === id);
  if (!conta) return falha('Conta não encontrada.');
  const nome = validarNomeConta(estado.contas, conta.nome, id);
  if (!nome.ok) return falha('Já existe uma conta ativa com esse nome. Renomeie uma delas antes de reativar.', 'nome');
  return ok({ ...estado, contas: estado.contas.map((c) => (c.id === id ? { ...c, arquivada: false } : c)) });
}

export function efeitoTransacao(t: Pick<Transacao, 'tipo' | 'valor'>): Centavos {
  return t.tipo === 'receita' ? t.valor : -t.valor;
}

/** Saldo atual: saldo inicial mais receitas menos despesas da conta. Nunca é armazenado. */
export function saldoConta(estado: DadosDeSaldo, contaId: string): Centavos {
  return saldosPorConta(estado).get(contaId) ?? 0;
}

type DadosDeSaldo = Pick<AppState, 'contas' | 'transacoes'> & Partial<Pick<AppState, 'pagamentosFatura'>> & { transferencias?: Transferencia[] };

export function saldosPorConta(estado: DadosDeSaldo): Map<string, Centavos> {
  const saldos = new Map<string, Centavos>(estado.contas.map((c) => [c.id, c.saldoInicial]));
  const somar = (contaId: string, valor: Centavos) => {
    if (saldos.has(contaId)) saldos.set(contaId, (saldos.get(contaId) ?? 0) + valor);
  };
  for (const t of estado.transacoes) somar(t.contaId, efeitoTransacao(t));
  // Pagar a fatura tira dinheiro da conta de origem e reduz a dívida do cartão.
  for (const p of estado.pagamentosFatura ?? []) {
    somar(p.contaOrigemId, -p.valor);
    somar(p.contaCartaoId, p.valor);
  }
  // Transferência tira da origem e entrega ao destino; o total não muda.
  for (const t of estado.transferencias ?? []) {
    somar(t.contaOrigemId, -t.valor);
    somar(t.contaDestinoId, t.valor);
  }
  return saldos;
}

export interface SaldoTotal {
  /** Soma das contas ativas que não são cartão. */
  contas: Centavos;
  /** Saldo dos cartões ativos; negativo quando há fatura em aberto. */
  cartoes: Centavos;
  /** Contas mais cartões (a fatura em aberto é subtraída). */
  total: Centavos;
}

export function saldoTotal(estado: DadosDeSaldo): SaldoTotal {
  const saldos = saldosPorConta(estado);
  let contas = 0;
  let cartoes = 0;
  for (const c of estado.contas) {
    if (c.arquivada) continue;
    const saldo = saldos.get(c.id) ?? 0;
    if (c.tipo === 'cartao') cartoes += saldo;
    else contas += saldo;
  }
  return { contas, cartoes, total: contas + cartoes };
}

/** Ordena por tipo e depois por nome, de forma estável entre recarregamentos. */
export function ordenarContas(contas: Conta[]): Conta[] {
  return [...contas].sort(
    (a, b) => TIPOS_CONTA.indexOf(a.tipo) - TIPOS_CONTA.indexOf(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id),
  );
}
