import type { GrupoDivisao } from './divisao';
import type { Transferencia } from './transferencias';

export type Centavos = number;
/** Data no formato AAAA-MM-DD. */
export type DataISO = string;
/** Mês no formato AAAA-MM. */
export type Mes = string;

export type TipoConta = 'corrente' | 'poupanca' | 'dinheiro' | 'cartao' | 'investimento';
export type TipoMovimento = 'receita' | 'despesa';

/** Ciclo e limite de um cartão de crédito. Dias de 1 a 28 para valerem em todos os meses. */
export interface CartaoConfig {
  diaFechamento: number;
  diaVencimento: number;
  limite: Centavos;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoInicial: Centavos;
  arquivada: boolean;
  criadaEm: number;
  /** Só para contas do tipo cartão. */
  cartao?: CartaoConfig;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoMovimento;
  arquivada: boolean;
}

export interface Transacao {
  id: string;
  contaId: string;
  categoriaId: string;
  tipo: TipoMovimento;
  /** Sempre positivo; o sinal vem do tipo. */
  valor: Centavos;
  data: DataISO;
  descricao: string;
  criadaEm: number;
  importacaoId?: string;
  /** Identificador único do lançamento no extrato OFX; usado para não importar duas vezes. */
  fitid?: string;
  /** Etiquetas livres, normalizadas (minúsculas); ausente quando não há nenhuma. */
  tags?: string[];
  /** Presente em compras parceladas; as parcelas de uma compra compartilham o grupoId. */
  parcela?: { grupoId: string; numero: number; total: number };
}

export interface Orcamento {
  categoriaId: string;
  mes: Mes;
  limite: Centavos;
}

export interface Aporte {
  id: string;
  data: DataISO;
  /** Positivo para aporte, negativo para retirada. */
  valor: Centavos;
}

export type StatusMeta = 'ativa' | 'concluida' | 'arquivada';

export interface Meta {
  id: string;
  nome: string;
  valorAlvo: Centavos;
  prazo?: DataISO;
  aportes: Aporte[];
  status: StatusMeta;
  concluidaEm?: DataISO;
  criadaEm: number;
}

/** Valor mensal fixo considerado na projeção; não gera transações. */
export interface Recorrencia {
  id: string;
  descricao: string;
  tipo: TipoMovimento;
  valor: Centavos;
  categoriaId: string;
  ativa: boolean;
}

export type FormatoData = 'dd/mm/aaaa' | 'aaaa-mm-dd' | 'dd-mm-aaaa';

export interface MapeamentoCsv {
  colData: number;
  colDescricao: number;
  /** Coluna única com sinal. */
  colValor: number | null;
  colCredito: number | null;
  colDebito: number | null;
  formatoData: FormatoData;
  temCabecalho: boolean;
}

export interface Importacao {
  id: string;
  data: DataISO;
  contaId: string;
  transacaoIds: string[];
}

/** Pagamento de fatura: movimenta dinheiro entre contas e não é receita nem despesa. */
export interface PagamentoFatura {
  id: string;
  contaCartaoId: string;
  /** Mês de fechamento da fatura (AAAA-MM). */
  mesFatura: Mes;
  valor: Centavos;
  data: DataISO;
  contaOrigemId: string;
}

/** Lançamento agendado (conta a pagar ou a receber); só vira transação quando é pago. */
export interface Agendamento {
  id: string;
  descricao: string;
  tipo: TipoMovimento;
  valor: Centavos;
  vencimento: DataISO;
  categoriaId: string;
  contaId?: string;
  /** Presente nos lançamentos gerados por recorrência mensal. */
  serie?: { grupoId: string; numero: number; total: number };
  pagoEm?: DataISO;
  transacaoId?: string;
  criadoEm: number;
}

export type ModoPadrao = 'contem' | 'comeca' | 'igual';

/** Regra de categorização; a prioridade é a posição na lista `regras`. */
export interface RegraCategoria {
  id: string;
  padrao: string;
  modo: ModoPadrao;
  tipo: TipoMovimento;
  categoriaId: string;
  tags: string[];
  ativa: boolean;
}

export type ClasseAtivo = 'renda-fixa' | 'acoes' | 'fundos' | 'cripto' | 'outros';

export interface MovimentoAtivo {
  id: string;
  tipo: 'aporte' | 'resgate';
  data: DataISO;
  /** Sempre positivo; o sinal vem do tipo. */
  valor: Centavos;
}

/** Valor de mercado anotado para um ativo numa data. */
export interface MarcacaoAtivo {
  id: string;
  data: DataISO;
  valor: Centavos;
}

/** Ativo da carteira manual de investimentos; não gera transações nem mexe em saldos. */
export interface Ativo {
  id: string;
  nome: string;
  classe: ClasseAtivo;
  movimentos: MovimentoAtivo[];
  marcacoes: MarcacaoAtivo[];
  criadoEm: number;
}

export type TipoDivida = 'devo' | 'emprestei';
export type SistemaAmortizacao = 'price' | 'sac';

/** Pagamento de dívida; sem `parcela` é uma amortização extra. */
export interface PagamentoDivida {
  id: string;
  data: DataISO;
  valor: Centavos;
  parcela?: number;
}

/** Dívida ou empréstimo concedido; `taxaBp` é a taxa mensal em centésimos de ponto percentual (199 = 1,99%). */
export interface Divida {
  id: string;
  nome: string;
  tipo: TipoDivida;
  principal: Centavos;
  taxaBp: number;
  parcelas: number;
  primeiraParcela: DataISO;
  sistema: SistemaAmortizacao;
  pagamentos: PagamentoDivida[];
  criadaEm: number;
}

export interface AppState {
  schemaVersion: number;
  contas: Conta[];
  categorias: Categoria[];
  transacoes: Transacao[];
  orcamentos: Orcamento[];
  metas: Meta[];
  recorrencias: Recorrencia[];
  mapeamentosCsv: Record<string, MapeamentoCsv>;
  importacoes: Importacao[];
  pagamentosFatura: PagamentoFatura[];
  agenda: Agendamento[];
  regras: RegraCategoria[];
  investimentos: Ativo[];
  dividas: Divida[];
  gruposDivisao: GrupoDivisao[];
  /** Ausente em estados montados à mão (ex.: dados de exemplo); o carregamento sempre a preenche. */
  transferencias?: Transferencia[];
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string; campo?: string };

export const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const falha = (erro: string, campo?: string): Resultado<never> => ({ ok: false, erro, campo });
