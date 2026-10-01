export type Centavos = number;
/** Data no formato AAAA-MM-DD. */
export type DataISO = string;
/** Mês no formato AAAA-MM. */
export type Mes = string;

export type TipoConta = 'corrente' | 'poupanca' | 'dinheiro' | 'cartao' | 'investimento';
export type TipoMovimento = 'receita' | 'despesa';

export interface Conta {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoInicial: Centavos;
  arquivada: boolean;
  criadaEm: number;
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
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string; campo?: string };

export const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const falha = (erro: string, campo?: string): Resultado<never> => ({ ok: false, erro, campo });
