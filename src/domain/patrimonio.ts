import { dataParaISO, dataValida, mesDe, somarMeses, ultimoDia } from './date';
import { gerarCsv, numeroCsv, percentualCsv } from './exportacao';
import { novoId } from './id';
import { valorEm } from './investimentos';
import { resumoDivida } from './dividas';
import { saldosPorConta } from './contas';
import { falha, ok, type AppState, type Centavos, type DataISO, type Divida, type Mes, type Resultado } from './types';

export const META_PATRIMONIO_NOME_MAX = 40;
export const MESES_PATRIMONIO = 12;

/** Meta opcional de patrimônio líquido; só o alvo é guardado, o progresso é sempre derivado. */
export interface MetaPatrimonio {
  id: string;
  nome: string;
  valor: Centavos;
}

export type GrupoAtivo = 'contas' | 'investimentos' | 'areceber';
export type GrupoPassivo = 'cartoes' | 'contas-negativo' | 'dividas';

export const ROTULO_GRUPO: Record<GrupoAtivo | GrupoPassivo, string> = {
  contas: 'Contas',
  investimentos: 'Investimentos',
  areceber: 'A receber (empréstimos)',
  cartoes: 'Cartões',
  'contas-negativo': 'Contas no negativo',
  dividas: 'Dívidas',
};

export interface Grupo<G extends string> {
  grupo: G;
  rotulo: string;
  valor: Centavos;
  /** Percentual com uma casa decimal sobre o total do lado; a soma dos grupos é 100. */
  pct: number;
}

export interface Composicao {
  data: DataISO;
  ativos: Grupo<GrupoAtivo>[];
  passivos: Grupo<GrupoPassivo>[];
  totalAtivos: Centavos;
  totalPassivos: Centavos;
  liquido: Centavos;
}

export interface PontoEvolucao {
  mes: Mes;
  valor: Centavos;
}

export interface Variacao {
  valor: Centavos;
  /** Percentual com uma casa decimal sobre o valor absoluto da base; null com base zero. */
  pct: number | null;
}

export interface VariacoesPatrimonio {
  mes: Variacao;
  anual: Variacao;
}

export interface ProgressoMeta {
  meta: MetaPatrimonio;
  /** De 0 a 100, uma casa decimal. */
  pct: number;
  falta: Centavos;
  atingida: boolean;
}

const umaCasa = (x: number) => Math.round(x * 10) / 10;

/** Percentuais em décimos que somam exatamente 100,0 (método dos maiores restos). */
function percentuais(valores: Centavos[]): number[] {
  const total = valores.reduce((s, v) => s + v, 0);
  if (total <= 0) return valores.map(() => 0);
  const brutos = valores.map((v) => (v * 1000) / total);
  const decimos = brutos.map(Math.floor);
  let faltam = 1000 - decimos.reduce((s, d) => s + d, 0);
  const ordem = brutos.map((b, i) => ({ i, resto: b - decimos[i] })).sort((x, y) => y.resto - x.resto || x.i - y.i);
  for (const { i } of ordem) {
    if (faltam <= 0) break;
    decimos[i] += 1;
    faltam -= 1;
  }
  return decimos.map((d) => d / 10);
}

function montarGrupos<G extends GrupoAtivo | GrupoPassivo>(ordem: G[], totais: Map<G, Centavos>): Grupo<G>[] {
  const presentes = ordem.filter((g) => (totais.get(g) ?? 0) > 0);
  const pcts = percentuais(presentes.map((g) => totais.get(g) ?? 0));
  return presentes.map((grupo, i) => ({ grupo, rotulo: ROTULO_GRUPO[grupo], valor: totais.get(grupo) ?? 0, pct: pcts[i] }));
}

/** Primeiro mês em que a dívida existe: o anterior à primeira parcela ou o do cadastro, o que vier antes. */
function mesInicioDivida(d: Divida): Mes {
  const contratada = somarMeses(mesDe(d.primeiraParcela), -1);
  const cadastro = Number.isFinite(d.criadaEm) ? mesDe(dataParaISO(new Date(d.criadaEm))) : contratada;
  return cadastro < contratada ? cadastro : contratada;
}

/** Saldo devedor da dívida na data, reutilizando `resumoDivida` com os pagamentos até ela. */
function saldoDividaEm(d: Divida, ate: DataISO): Centavos {
  if (mesInicioDivida(d) > mesDe(ate)) return 0;
  return resumoDivida({ ...d, pagamentos: d.pagamentos.filter((p) => p.data <= ate) }, ate).saldoDevedor;
}

/** Ativos e passivos por grupo na data. Contas arquivadas ficam de fora. */
export function composicaoEm(estado: AppState, ate: DataISO): Composicao {
  const saldos = saldosPorConta({
    contas: estado.contas,
    transacoes: estado.transacoes.filter((t) => t.data <= ate),
    pagamentosFatura: (estado.pagamentosFatura ?? []).filter((p) => p.data <= ate),
  });
  const ativos = new Map<GrupoAtivo, Centavos>();
  const passivos = new Map<GrupoPassivo, Centavos>();
  const somar = <G extends string>(mapa: Map<G, Centavos>, g: G, v: Centavos) => mapa.set(g, (mapa.get(g) ?? 0) + v);

  for (const c of estado.contas) {
    if (c.arquivada) continue;
    const saldo = saldos.get(c.id) ?? 0;
    if (saldo >= 0) somar(ativos, 'contas', saldo);
    else somar(passivos, c.tipo === 'cartao' ? 'cartoes' : 'contas-negativo', -saldo);
  }
  somar(ativos, 'investimentos', estado.investimentos.reduce((s, a) => s + valorEm(a, ate), 0));
  for (const d of estado.dividas) {
    const saldo = saldoDividaEm(d, ate);
    if (d.tipo === 'devo') somar(passivos, 'dividas', saldo);
    else somar(ativos, 'areceber', saldo);
  }

  const totalAtivos = [...ativos.values()].reduce((s, v) => s + v, 0);
  const totalPassivos = [...passivos.values()].reduce((s, v) => s + v, 0);
  return {
    data: ate,
    ativos: montarGrupos(['contas', 'investimentos', 'areceber'], ativos),
    passivos: montarGrupos(['cartoes', 'contas-negativo', 'dividas'], passivos),
    totalAtivos,
    totalPassivos,
    liquido: totalAtivos - totalPassivos,
  };
}

export const patrimonioEm = (estado: AppState, ate: DataISO): Centavos => composicaoEm(estado, ate).liquido;

/** Patrimônio no fim de cada um dos últimos 12 meses (no mês corrente, até hoje). */
export function evolucaoPatrimonioLiquido(estado: AppState, hoje: DataISO): PontoEvolucao[] {
  const mesHoje = mesDe(hoje);
  const pontos: PontoEvolucao[] = [];
  for (let i = MESES_PATRIMONIO - 1; i >= 0; i--) {
    const mes = somarMeses(mesHoje, -i);
    pontos.push({ mes, valor: patrimonioEm(estado, i === 0 ? hoje : ultimoDia(mes)) });
  }
  return pontos;
}

function variacao(atual: Centavos, base: Centavos): Variacao {
  const valor = atual - base;
  return { valor, pct: base === 0 ? null : umaCasa((valor * 100) / Math.abs(base)) };
}

export function variacoesPatrimonio(estado: AppState, hoje: DataISO): VariacoesPatrimonio {
  const mesHoje = mesDe(hoje);
  const atual = patrimonioEm(estado, hoje);
  return {
    mes: variacao(atual, patrimonioEm(estado, ultimoDia(somarMeses(mesHoje, -1)))),
    anual: variacao(atual, patrimonioEm(estado, ultimoDia(somarMeses(mesHoje, -12)))),
  };
}

export function progressoMeta(meta: MetaPatrimonio, patrimonio: Centavos): ProgressoMeta {
  const atingida = patrimonio >= meta.valor;
  const pct = patrimonio <= 0 ? 0 : atingida ? 100 : Math.min(100, umaCasa((patrimonio * 100) / meta.valor));
  return { meta, pct, falta: Math.max(0, meta.valor - patrimonio), atingida };
}

export const metasDoEstado = (estado: AppState): MetaPatrimonio[] => estado.metasPatrimonio ?? [];

export interface DadosMetaPatrimonio {
  nome: string;
  valor: Centavos;
}

function validarMeta(metas: MetaPatrimonio[], dados: DadosMetaPatrimonio, ignorarId?: string): Resultado<DadosMetaPatrimonio> {
  const nome = dados.nome.trim();
  if (!nome) return falha('Informe o nome da meta.', 'nome');
  if (nome.length > META_PATRIMONIO_NOME_MAX) return falha(`O nome deve ter no máximo ${META_PATRIMONIO_NOME_MAX} caracteres.`, 'nome');
  if (metas.some((m) => m.id !== ignorarId && m.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
    return falha('Já existe uma meta com esse nome.', 'nome');
  }
  if (!Number.isSafeInteger(dados.valor) || dados.valor <= 0) return falha('O valor da meta deve ser maior que zero.', 'valor');
  return ok({ nome, valor: dados.valor });
}

export function criarMetaPatrimonio(estado: AppState, dados: DadosMetaPatrimonio): Resultado<AppState> {
  const metas = metasDoEstado(estado);
  const v = validarMeta(metas, dados);
  if (!v.ok) return v;
  return ok({ ...estado, metasPatrimonio: [...metas, { id: novoId(), ...v.valor }] });
}

export function editarMetaPatrimonio(estado: AppState, id: string, dados: DadosMetaPatrimonio): Resultado<AppState> {
  const metas = metasDoEstado(estado);
  if (!metas.some((m) => m.id === id)) return falha('Meta não encontrada.');
  const v = validarMeta(metas, dados, id);
  if (!v.ok) return v;
  return ok({ ...estado, metasPatrimonio: metas.map((m) => (m.id === id ? { id, ...v.valor } : m)) });
}

export function excluirMetaPatrimonio(estado: AppState, id: string): Resultado<AppState> {
  const metas = metasDoEstado(estado);
  if (!metas.some((m) => m.id === id)) return falha('Meta não encontrada.');
  return ok({ ...estado, metasPatrimonio: metas.filter((m) => m.id !== id) });
}

export function nomeArquivoPatrimonio(hoje: DataISO): string {
  return `patrimonio-${hoje}.csv`;
}

/** Instantâneo do patrimônio em CSV (BOM, `;`, vírgula decimal), todo derivado do estado. */
export function csvPatrimonio(estado: AppState, hoje: DataISO): string {
  if (!dataValida(hoje)) throw new Error('Data inválida.');
  const comp = composicaoEm(estado, hoje);
  const v = variacoesPatrimonio(estado, hoje);
  const linhasGrupo = (grupos: Grupo<string>[]) => grupos.map((g) => [g.rotulo, numeroCsv(g.valor), percentualCsv(g.pct)]);
  return gerarCsv([
    ['Patrimônio líquido em', hoje],
    [],
    ['Ativos', 'Valor', '% dos ativos'],
    ...linhasGrupo(comp.ativos),
    ['Total de ativos', numeroCsv(comp.totalAtivos), ''],
    [],
    ['Passivos', 'Valor', '% dos passivos'],
    ...linhasGrupo(comp.passivos),
    ['Total de passivos', numeroCsv(comp.totalPassivos), ''],
    [],
    ['Patrimônio líquido', numeroCsv(comp.liquido)],
    [],
    ['Variação', 'Valor', '%'],
    ['No mês', numeroCsv(v.mes.valor), percentualCsv(v.mes.pct)],
    ['Em 12 meses', numeroCsv(v.anual.valor), percentualCsv(v.anual.pct)],
    [],
    ['Mês', 'Patrimônio líquido'],
    ...evolucaoPatrimonioLiquido(estado, hoje).map((p) => [p.mes, numeroCsv(p.valor)]),
    [],
    ['Meta', 'Valor da meta', 'Progresso (%)'],
    ...metasDoEstado(estado).map((m) => {
      const p = progressoMeta(m, comp.liquido);
      return [m.nome, numeroCsv(m.valor), percentualCsv(p.pct)];
    }),
  ]);
}
