import { dataValida, diasEntre, somarDias } from './date';
import { novoId, proximoTempo } from './id';
import { raizDe } from './subcategorias';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado, type Transacao } from './types';

export const NOME_DESAFIO_MAX = 60;
export const DIAS_DESAFIO_MAX = 365;
export const SEMANAS = 52;
/** Soma de 1 a 52: o total das 52 semanas é este fator vezes o valor base. */
export const FATOR_52_SEMANAS = (SEMANAS * (SEMANAS + 1)) / 2;

interface Base {
  id: string;
  nome: string;
  inicio: DataISO;
  criadoEm: number;
  abandonadoEm?: DataISO;
}

export interface Desafio52 extends Base {
  tipo: 'semanas52';
  valorBase: Centavos;
  ordem: 'crescente' | 'decrescente';
  semanasFeitas: number[];
}

export interface DesafioSemGastos extends Base {
  tipo: 'sem-gastos';
  dias: number;
  categoriaIds: string[];
}

export interface DesafioTeto extends Base {
  tipo: 'teto';
  dias: number;
  categoriaId: string;
  limite: Centavos;
}

export type Desafio = Desafio52 | DesafioSemGastos | DesafioTeto;
export type TipoDesafio = Desafio['tipo'];

export const ROTULO_TIPO_DESAFIO: Record<TipoDesafio, string> = {
  semanas52: 'Desafio das 52 semanas',
  'sem-gastos': 'Dias sem gastar',
  teto: 'Teto de gastos',
};

export type SituacaoDesafio = 'futuro' | 'andamento' | 'concluido' | 'falhou' | 'abandonado';
export const ROTULO_SITUACAO_DESAFIO: Record<SituacaoDesafio, string> = {
  futuro: 'Ainda não começou',
  andamento: 'Em andamento',
  concluido: 'Concluído',
  falhou: 'Não cumprido',
  abandonado: 'Abandonado',
};

export type DadosDesafio =
  | Omit<Desafio52, keyof Base | 'semanasFeitas'> & Pick<Base, 'nome' | 'inicio'>
  | Omit<DesafioSemGastos, keyof Base> & Pick<Base, 'nome' | 'inicio'>
  | Omit<DesafioTeto, keyof Base> & Pick<Base, 'nome' | 'inicio'>;

export const listaDesafios = (estado: Pick<AppState, 'desafios'>): Desafio[] => estado.desafios ?? [];

const despesaAtiva = (estado: AppState, id: string) => estado.categorias.some((c) => c.id === id && c.tipo === 'despesa' && !c.arquivada);

function validarDias(dias: number): Resultado<never> | null {
  return Number.isInteger(dias) && dias >= 1 && dias <= DIAS_DESAFIO_MAX ? null : falha(`Informe de 1 a ${DIAS_DESAFIO_MAX} dias.`, 'dias');
}

function validar(estado: AppState, dados: DadosDesafio): Resultado<DadosDesafio> {
  const nome = dados.nome.trim();
  if (nome.length < 1 || nome.length > NOME_DESAFIO_MAX) return falha(`Informe um nome de 1 a ${NOME_DESAFIO_MAX} caracteres.`, 'nome');
  if (!dataValida(dados.inicio)) return falha('Informe a data de início.', 'inicio');
  if (dados.tipo === 'semanas52') {
    if (!Number.isSafeInteger(dados.valorBase) || dados.valorBase <= 0) return falha('Informe um valor base maior que zero.', 'valorBase');
    if (dados.ordem !== 'crescente' && dados.ordem !== 'decrescente') return falha('Escolha a ordem.', 'ordem');
  } else if (dados.tipo === 'sem-gastos') {
    const erro = validarDias(dados.dias);
    if (erro) return erro;
    const categorias = [...new Set(dados.categoriaIds)];
    if (categorias.length === 0 || !categorias.every((id) => despesaAtiva(estado, id))) return falha('Escolha ao menos uma categoria de despesa ativa.', 'categoriaIds');
    return ok({ ...dados, nome, categoriaIds: categorias });
  } else {
    if (!despesaAtiva(estado, dados.categoriaId)) return falha('Escolha uma categoria de despesa ativa.', 'categoriaId');
    const erro = validarDias(dados.dias);
    if (erro) return erro;
    if (!Number.isSafeInteger(dados.limite) || dados.limite <= 0) return falha('Informe um limite maior que zero.', 'limite');
  }
  return ok({ ...dados, nome });
}

export function criarDesafio(estado: AppState, dados: DadosDesafio): Resultado<AppState> {
  const v = validar(estado, dados);
  if (!v.ok) return v;
  const base = { id: novoId(), criadoEm: proximoTempo() };
  const desafio: Desafio = v.valor.tipo === 'semanas52' ? { ...v.valor, ...base, semanasFeitas: [] } : { ...v.valor, ...base };
  return ok({ ...estado, desafios: [...listaDesafios(estado), desafio] });
}

function alterar(estado: AppState, id: string, f: (d: Desafio) => Resultado<Desafio>): Resultado<AppState> {
  const atual = listaDesafios(estado).find((d) => d.id === id);
  if (!atual) return falha('Desafio não encontrado.');
  const r = f(atual);
  if (!r.ok) return r;
  return ok({ ...estado, desafios: listaDesafios(estado).map((d) => (d.id === id ? r.valor : d)) });
}

export function alternarSemana(estado: AppState, id: string, semana: number): Resultado<AppState> {
  return alterar(estado, id, (d) => {
    if (d.tipo !== 'semanas52') return falha('Este desafio não tem semanas.');
    if (!Number.isInteger(semana) || semana < 1 || semana > SEMANAS) return falha('Semana inválida.');
    const feitas = d.semanasFeitas.includes(semana) ? d.semanasFeitas.filter((s) => s !== semana) : [...d.semanasFeitas, semana].sort((a, b) => a - b);
    return ok({ ...d, semanasFeitas: feitas });
  });
}

export function abandonarDesafio(estado: AppState, id: string, hoje: DataISO): Resultado<AppState> {
  return alterar(estado, id, (d) => (d.abandonadoEm ? falha('O desafio já foi abandonado.') : ok({ ...d, abandonadoEm: hoje })));
}

export function excluirDesafio(estado: AppState, id: string): Resultado<AppState> {
  if (!listaDesafios(estado).some((d) => d.id === id)) return falha('Desafio não encontrado.');
  return ok({ ...estado, desafios: listaDesafios(estado).filter((d) => d.id !== id) });
}

// ----------------------------------------------------------- 52 semanas

export const valorDaSemana = (d: Pick<Desafio52, 'valorBase' | 'ordem'>, semana: number): Centavos =>
  (d.ordem === 'crescente' ? semana : SEMANAS + 1 - semana) * d.valorBase;

/** Semana que contém `hoje` (1 a 52); null antes do início ou depois da 52ª semana. */
export function semanaAtual(inicio: DataISO, hoje: DataISO): number | null {
  const dias = diasEntre(inicio, hoje);
  if (dias < 0) return null;
  const semana = Math.floor(dias / 7) + 1;
  return semana <= SEMANAS ? semana : null;
}

export interface Progresso52 {
  guardado: Centavos;
  total: Centavos;
  restante: Centavos;
  percentual: number;
  feitas: number;
  semanaAtual: number | null;
  situacao: SituacaoDesafio;
}

export function progresso52(d: Desafio52, hoje: DataISO): Progresso52 {
  const total = FATOR_52_SEMANAS * d.valorBase;
  const guardado = d.semanasFeitas.reduce((s, n) => s + valorDaSemana(d, n), 0);
  const situacao: SituacaoDesafio = d.abandonadoEm ? 'abandonado' : d.semanasFeitas.length === SEMANAS ? 'concluido' : hoje < d.inicio ? 'futuro' : 'andamento';
  return { guardado, total, restante: total - guardado, percentual: Math.round((guardado * 100) / total), feitas: d.semanasFeitas.length, semanaAtual: semanaAtual(d.inicio, hoje), situacao };
}

// --------------------------------------------- desafios verificados pelas transações

export interface ProgressoPeriodo {
  fim: DataISO;
  /** Dias já transcorridos dentro do período (0 antes do início). */
  diasDecorridos: number;
  situacao: SituacaoDesafio;
}

function periodo(d: Pick<Base, 'inicio' | 'abandonadoEm'> & { dias: number }, hoje: DataISO, falhou: boolean): ProgressoPeriodo {
  const fim = somarDias(d.inicio, d.dias - 1);
  const diasDecorridos = hoje < d.inicio ? 0 : Math.min(diasEntre(d.inicio, hoje) + 1, d.dias);
  const situacao: SituacaoDesafio = d.abandonadoEm ? 'abandonado' : falhou ? 'falhou' : hoje < d.inicio ? 'futuro' : hoje > fim ? 'concluido' : 'andamento';
  return { fim, diasDecorridos, situacao };
}

/** Despesas no período cuja categoria (ou a categoria pai) está entre as do desafio. */
function despesasDoDesafio(estado: AppState, categorias: string[], inicio: DataISO, fim: DataISO): Transacao[] {
  const alvo = new Set(categorias);
  return estado.transacoes
    .filter((t) => t.tipo === 'despesa' && t.data >= inicio && t.data <= fim && (alvo.has(t.categoriaId) || alvo.has(raizDe(estado.categorias, t.categoriaId))))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export interface ProgressoSemGastos extends ProgressoPeriodo {
  quebras: Transacao[];
  /** Dias sem despesa nas categorias, até hoje ou até o fim. */
  diasLimpos: number;
  percentual: number;
}

export function progressoSemGastos(estado: AppState, d: DesafioSemGastos, hoje: DataISO): ProgressoSemGastos {
  const fim = somarDias(d.inicio, d.dias - 1);
  const quebras = despesasDoDesafio(estado, d.categoriaIds, d.inicio, fim);
  const p = periodo(d, hoje, quebras.length > 0);
  const datasQuebra = new Set(quebras.filter((t) => t.data <= hoje).map((t) => t.data));
  const diasLimpos = Math.max(0, p.diasDecorridos - datasQuebra.size);
  return { ...p, quebras, diasLimpos, percentual: Math.round((diasLimpos * 100) / d.dias) };
}

export interface ProgressoTeto extends ProgressoPeriodo {
  gasto: Centavos;
  restante: Centavos;
  /** Quanto ainda cabe por dia até o fim; null se o período acabou ou o limite estourou. */
  porDia: Centavos | null;
  percentual: number;
}

export function progressoTeto(estado: AppState, d: DesafioTeto, hoje: DataISO): ProgressoTeto {
  const fim = somarDias(d.inicio, d.dias - 1);
  const gasto = despesasDoDesafio(estado, [d.categoriaId], d.inicio, fim).reduce((s, t) => s + t.valor, 0);
  const p = periodo(d, hoje, gasto > d.limite);
  const restante = d.limite - gasto;
  const diasRestantes = hoje > fim ? 0 : diasEntre(hoje < d.inicio ? d.inicio : hoje, fim) + 1;
  const porDia = restante >= 0 && diasRestantes > 0 ? Math.floor(restante / diasRestantes) : null;
  return { ...p, gasto, restante, porDia, percentual: Math.round((gasto * 100) / d.limite) };
}

export function situacaoDesafio(estado: AppState, d: Desafio, hoje: DataISO): SituacaoDesafio {
  if (d.tipo === 'semanas52') return progresso52(d, hoje).situacao;
  if (d.tipo === 'sem-gastos') return progressoSemGastos(estado, d, hoje).situacao;
  return progressoTeto(estado, d, hoje).situacao;
}

const ENCERRADAS: SituacaoDesafio[] = ['concluido', 'falhou', 'abandonado'];

export function separarDesafios(estado: AppState, hoje: DataISO): { ativos: Desafio[]; encerrados: Desafio[] } {
  const lista = [...listaDesafios(estado)].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.criadoEm - b.criadoEm);
  const encerrado = (d: Desafio) => ENCERRADAS.includes(situacaoDesafio(estado, d, hoje));
  return { ativos: lista.filter((d) => !encerrado(d)), encerrados: lista.filter(encerrado) };
}
