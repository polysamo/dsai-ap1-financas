export type Unidade = 'moeda' | 'numero' | 'percentual';

/** Um ponto do gráfico: a chave do eixo X mais um valor numérico por série. Moeda entra em centavos. */
export type Dado = Record<string, string | number>;

export interface Serie {
  chave: string;
  nome: string;
  /** Posição (1 a 8) na paleta; por padrão, a ordem da série. */
  cor?: number;
}

export interface PropsBase {
  /** Descrição lida por leitores de tela no lugar do desenho. */
  descricao: string;
  /** `aria-label` da tabela alternativa. */
  rotuloTabela: string;
  titulo?: string;
  /** Mensagem mostrada no lugar do gráfico quando não há dados. */
  vazio?: string;
  unidade?: Unidade;
  /** Quando a tela já tem uma tabela própria e mais completa, evita a tabela automática. */
  semTabela?: boolean;
  className?: string;
}

export interface PropsCartesiano extends PropsBase {
  dados: Dado[];
  chaveX: string;
  /** Título da primeira coluna da tabela. */
  rotuloX: string;
  series: Serie[];
  /** Texto do eixo X, do tooltip e da tabela a partir do valor da chave (ex.: mês curto). */
  formatarX?: (valor: string | number) => string;
  /** Acrescenta uma linha de total na tabela. */
  comTotal?: boolean;
}

export interface Fatia {
  nome: string;
  valor: number;
}
