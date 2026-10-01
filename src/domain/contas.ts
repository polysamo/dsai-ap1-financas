import { novoId, proximoTempo } from './id';
import { falha, ok, type AppState, type Centavos, type Conta, type Resultado, type TipoConta, type Transacao } from './types';

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

export function criarConta(estado: AppState, dados: DadosConta): Resultado<AppState> {
  const nome = validarNomeConta(estado.contas, dados.nome);
  if (!nome.ok) return nome;
  const conta: Conta = {
    id: novoId(),
    nome: nome.valor,
    tipo: dados.tipo,
    saldoInicial: dados.saldoInicial,
    arquivada: false,
    criadaEm: proximoTempo(),
  };
  return ok({ ...estado, contas: [...estado.contas, conta] });
}

export function editarConta(estado: AppState, id: string, dados: DadosConta): Resultado<AppState> {
  const atual = estado.contas.find((c) => c.id === id);
  if (!atual) return falha('Conta não encontrada.');
  const nome = atual.arquivada ? ok(dados.nome.trim()) : validarNomeConta(estado.contas, dados.nome, id);
  if (!nome.ok) return nome;
  if (!nome.valor || nome.valor.length > NOME_MAX) return falha('Nome inválido.', 'nome');
  return ok({
    ...estado,
    contas: estado.contas.map((c) => (c.id === id ? { ...c, nome: nome.valor, tipo: dados.tipo, saldoInicial: dados.saldoInicial } : c)),
  });
}

export function contaTemTransacoes(estado: AppState, id: string): boolean {
  return estado.transacoes.some((t) => t.contaId === id);
}

/** Só contas sem transações podem ser excluídas; as demais devem ser arquivadas. */
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
export function saldoConta(estado: Pick<AppState, 'contas' | 'transacoes'>, contaId: string): Centavos {
  const conta = estado.contas.find((c) => c.id === contaId);
  if (!conta) return 0;
  return estado.transacoes.reduce((soma, t) => (t.contaId === contaId ? soma + efeitoTransacao(t) : soma), conta.saldoInicial);
}

export function saldosPorConta(estado: Pick<AppState, 'contas' | 'transacoes'>): Map<string, Centavos> {
  const saldos = new Map<string, Centavos>(estado.contas.map((c) => [c.id, c.saldoInicial]));
  for (const t of estado.transacoes) {
    if (saldos.has(t.contaId)) saldos.set(t.contaId, (saldos.get(t.contaId) ?? 0) + efeitoTransacao(t));
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

export function saldoTotal(estado: Pick<AppState, 'contas' | 'transacoes'>): SaldoTotal {
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
