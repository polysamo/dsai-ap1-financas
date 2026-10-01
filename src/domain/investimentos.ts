import { dataValida, diferencaMeses, mesDe, somarMeses, ultimoDia } from './date';
import { novoId, proximoTempo } from './id';
import {
  falha,
  ok,
  type AppState,
  type Ativo,
  type Centavos,
  type ClasseAtivo,
  type DataISO,
  type Mes,
  type MovimentoAtivo,
  type Resultado,
} from './types';

export const ATIVO_NOME_MAX = 40;
export const MESES_EVOLUCAO = 12;

export const CLASSES: { valor: ClasseAtivo; rotulo: string }[] = [
  { valor: 'renda-fixa', rotulo: 'Renda fixa' },
  { valor: 'acoes', rotulo: 'Ações' },
  { valor: 'fundos', rotulo: 'Fundos' },
  { valor: 'cripto', rotulo: 'Cripto' },
  { valor: 'outros', rotulo: 'Outros' },
];

export const rotuloClasse = (classe: ClasseAtivo): string => CLASSES.find((c) => c.valor === classe)?.rotulo ?? classe;

export interface DadosAtivo {
  nome: string;
  classe: ClasseAtivo;
}

export interface DadosMovimento {
  tipo: 'aporte' | 'resgate';
  data: DataISO;
  valor: Centavos;
}

export interface DadosMarcacao {
  data: DataISO;
  valor: Centavos;
}

export interface Desempenho {
  investido: Centavos;
  valorAtual: Centavos;
  rentabilidade: Centavos;
  /** Percentual com uma casa decimal sobre o investido líquido; null sem investido. */
  rentabilidadePct: number | null;
}

export interface FatiaClasse {
  classe: ClasseAtivo;
  valor: Centavos;
  /** Percentual com uma casa decimal; a soma das fatias é 100. */
  pct: number;
}

export interface PontoPatrimonio {
  mes: Mes;
  valor: Centavos;
}

const porData = <T extends { data: DataISO; id: string }>(a: T, b: T) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
const delta = (m: MovimentoAtivo): Centavos => (m.tipo === 'aporte' ? m.valor : -m.valor);

/** Investido líquido (aportes menos resgates) até `ate`, inclusive. */
export function investidoEm(ativo: Ativo, ate?: DataISO): Centavos {
  return ativo.movimentos.filter((m) => ate === undefined || m.data <= ate).reduce((s, m) => s + delta(m), 0);
}

/** Valor da última marcação até `ate` mais o líquido movimentado depois dela; sem marcação, o investido. */
export function valorEm(ativo: Ativo, ate?: DataISO): Centavos {
  const marcacoes = ativo.marcacoes.filter((m) => ate === undefined || m.data <= ate).sort(porData);
  const ultima = marcacoes[marcacoes.length - 1];
  if (!ultima) return investidoEm(ativo, ate);
  const depois = ativo.movimentos.filter((m) => m.data > ultima.data && (ate === undefined || m.data <= ate));
  return ultima.valor + depois.reduce((s, m) => s + delta(m), 0);
}

/** Arredonda para uma casa decimal. */
const umaCasa = (x: number) => Math.round(x * 10) / 10;

export function desempenho(investido: Centavos, valorAtual: Centavos): Desempenho {
  const rentabilidade = valorAtual - investido;
  return { investido, valorAtual, rentabilidade, rentabilidadePct: investido > 0 ? umaCasa((rentabilidade * 100) / investido) : null };
}

export const desempenhoAtivo = (ativo: Ativo, ate?: DataISO): Desempenho => desempenho(investidoEm(ativo, ate), valorEm(ativo, ate));

export function desempenhoCarteira(ativos: Ativo[], ate?: DataISO): Desempenho {
  return desempenho(
    ativos.reduce((s, a) => s + investidoEm(a, ate), 0),
    ativos.reduce((s, a) => s + valorEm(a, ate), 0),
  );
}

/** Alocação por classe com percentuais em décimos que somam exatamente 100,0 (maiores restos). */
export function alocacaoPorClasse(ativos: Ativo[], ate?: DataISO): FatiaClasse[] {
  const totais = new Map<ClasseAtivo, Centavos>();
  for (const a of ativos) totais.set(a.classe, (totais.get(a.classe) ?? 0) + valorEm(a, ate));
  const fatias = CLASSES.map((c) => ({ classe: c.valor, valor: totais.get(c.valor) ?? 0 })).filter((f) => f.valor > 0);
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  if (total === 0) return [];
  const brutos = fatias.map((f) => (f.valor * 1000) / total);
  const decimos = brutos.map(Math.floor);
  let faltam = 1000 - decimos.reduce((s, d) => s + d, 0);
  const ordem = brutos.map((b, i) => ({ i, resto: b - decimos[i] })).sort((x, y) => y.resto - x.resto || x.i - y.i);
  for (const { i } of ordem) {
    if (faltam <= 0) break;
    decimos[i] += 1;
    faltam -= 1;
  }
  return fatias.map((f, i) => ({ ...f, pct: decimos[i] / 10 })).sort((a, b) => b.valor - a.valor);
}

/** Patrimônio no fim de cada mês, dos últimos `MESES_EVOLUCAO` meses a partir do primeiro movimento. */
export function evolucaoPatrimonio(ativos: Ativo[], hoje: DataISO): PontoPatrimonio[] {
  const datas = ativos.flatMap((a) => a.movimentos.map((m) => m.data));
  if (datas.length === 0) return [];
  const mesHoje = mesDe(hoje);
  const primeiro = mesDe(datas.reduce((a, b) => (a < b ? a : b)));
  const inicio = diferencaMeses(primeiro, mesHoje) >= MESES_EVOLUCAO ? somarMeses(mesHoje, -(MESES_EVOLUCAO - 1)) : primeiro;
  const pontos: PontoPatrimonio[] = [];
  for (let mes = inicio; mes <= mesHoje; mes = somarMeses(mes, 1)) {
    const fim = mes === mesHoje ? hoje : ultimoDia(mes);
    pontos.push({ mes, valor: ativos.reduce((s, a) => s + valorEm(a, fim), 0) });
  }
  return pontos;
}

/** Menor posição acumulada ao longo do tempo; negativa significa resgate sem saldo. */
function posicaoMinima(movimentos: MovimentoAtivo[]): Centavos {
  // No mesmo dia os aportes contam antes dos resgates.
  const ordenados = [...movimentos].sort((a, b) => (a.data === b.data ? (a.tipo === b.tipo ? 0 : a.tipo === 'aporte' ? -1 : 1) : a.data < b.data ? -1 : 1));
  let soma = 0;
  let minimo = 0;
  for (const m of ordenados) {
    soma += delta(m);
    minimo = Math.min(minimo, soma);
  }
  return minimo;
}

function validarData(data: string, hoje: DataISO): Resultado<void> {
  if (!dataValida(data)) return falha('Informe uma data válida.', 'data');
  if (data > hoje) return falha('A data não pode ser futura.', 'data');
  return ok(undefined);
}

const validarValor = (valor: number): Resultado<void> =>
  Number.isSafeInteger(valor) && valor > 0 ? ok(undefined) : falha('O valor deve ser maior que zero.', 'valor');

export function validarDadosAtivo(estado: AppState, dados: DadosAtivo): Resultado<DadosAtivo> {
  const nome = dados.nome.trim();
  if (!nome) return falha('Informe o nome do ativo.', 'nome');
  if (nome.length > ATIVO_NOME_MAX) return falha(`O nome deve ter no máximo ${ATIVO_NOME_MAX} caracteres.`, 'nome');
  if (!CLASSES.some((c) => c.valor === dados.classe)) return falha('Escolha a classe do ativo.', 'classe');
  if (estado.investimentos.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) return falha('Já existe um ativo com esse nome.', 'nome');
  return ok({ nome, classe: dados.classe });
}

export function criarAtivo(estado: AppState, dados: DadosAtivo): Resultado<AppState> {
  const v = validarDadosAtivo(estado, dados);
  if (!v.ok) return v;
  const ativo: Ativo = { id: novoId(), ...v.valor, movimentos: [], marcacoes: [], criadoEm: proximoTempo() };
  return ok({ ...estado, investimentos: [...estado.investimentos, ativo] });
}

export function excluirAtivo(estado: AppState, ativoId: string): Resultado<AppState> {
  if (!estado.investimentos.some((a) => a.id === ativoId)) return falha('Ativo não encontrado.');
  return ok({ ...estado, investimentos: estado.investimentos.filter((a) => a.id !== ativoId) });
}

function atualizarAtivo(estado: AppState, ativoId: string, f: (a: Ativo) => Resultado<Ativo>): Resultado<AppState> {
  const ativo = estado.investimentos.find((a) => a.id === ativoId);
  if (!ativo) return falha('Ativo não encontrado.');
  const r = f(ativo);
  if (!r.ok) return r;
  return ok({ ...estado, investimentos: estado.investimentos.map((a) => (a.id === ativoId ? r.valor : a)) });
}

export function registrarMovimento(estado: AppState, ativoId: string, dados: DadosMovimento, hoje: DataISO): Resultado<AppState> {
  return atualizarAtivo(estado, ativoId, (ativo) => {
    if (dados.tipo !== 'aporte' && dados.tipo !== 'resgate') return falha('Escolha aporte ou resgate.', 'tipo');
    const vv = validarValor(dados.valor);
    if (!vv.ok) return vv;
    const vd = validarData(dados.data, hoje);
    if (!vd.ok) return vd;
    const movimentos = [...ativo.movimentos, { id: novoId(), tipo: dados.tipo, data: dados.data, valor: dados.valor }];
    if (posicaoMinima(movimentos) < 0) return falha('O resgate é maior que a posição do ativo nessa data.', 'valor');
    return ok({ ...ativo, movimentos });
  });
}

export function registrarMarcacao(estado: AppState, ativoId: string, dados: DadosMarcacao, hoje: DataISO): Resultado<AppState> {
  return atualizarAtivo(estado, ativoId, (ativo) => {
    const vv = validarValor(dados.valor);
    if (!vv.ok) return vv;
    const vd = validarData(dados.data, hoje);
    if (!vd.ok) return vd;
    const outras = ativo.marcacoes.filter((m) => m.data !== dados.data);
    return ok({ ...ativo, marcacoes: [...outras, { id: novoId(), data: dados.data, valor: dados.valor }] });
  });
}

export function excluirMovimento(estado: AppState, ativoId: string, movimentoId: string): Resultado<AppState> {
  return atualizarAtivo(estado, ativoId, (ativo) => {
    const movimentos = ativo.movimentos.filter((m) => m.id !== movimentoId);
    if (movimentos.length === ativo.movimentos.length) return falha('Movimento não encontrado.');
    if (posicaoMinima(movimentos) < 0) return falha('Não é possível excluir: a posição ficaria negativa em alguma data.');
    return ok({ ...ativo, movimentos });
  });
}

export function excluirMarcacao(estado: AppState, ativoId: string, marcacaoId: string): Resultado<AppState> {
  return atualizarAtivo(estado, ativoId, (ativo) => {
    const marcacoes = ativo.marcacoes.filter((m) => m.id !== marcacaoId);
    if (marcacoes.length === ativo.marcacoes.length) return falha('Marcação não encontrada.');
    return ok({ ...ativo, marcacoes });
  });
}
