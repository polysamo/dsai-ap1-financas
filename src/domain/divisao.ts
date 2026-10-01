import { dataValida } from './date';
import { gerarCsv, numeroCsv } from './exportacao';
import { novoId, proximoTempo } from './id';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado } from './types';

export const MIN_PARTICIPANTES = 2;
export const MAX_PARTICIPANTES = 12;
export const NOME_GRUPO_MAX = 60;
export const NOME_PARTICIPANTE_MAX = 40;
export const DESCRICAO_MAX = 80;
/** R$ 100 milhões em centavos: mantém as multiplicações proporcionais em inteiros seguros. */
export const VALOR_MAX: Centavos = 10_000_000_000;
/** 100% em centésimos de ponto percentual. */
export const TOTAL_PERCENTUAL = 10000;

export type TipoDivisao = 'igual' | 'percentual' | 'exata' | 'cotas';

export const ROTULO_TIPO_DIVISAO: Record<TipoDivisao, string> = {
  igual: 'Igual',
  percentual: 'Percentuais',
  exata: 'Valores exatos',
  cotas: 'Cotas',
};

export interface Participante {
  id: string;
  nome: string;
}

/** O significado do peso depende do tipo: 1 (igual), centésimos de % (percentual), centavos (exata) ou cotas. */
export interface ParteDespesa {
  participanteId: string;
  peso: number;
}

export interface DespesaDivisao {
  id: string;
  descricao: string;
  valor: Centavos;
  data: DataISO;
  pagadorId: string;
  tipo: TipoDivisao;
  partes: ParteDespesa[];
  criadaEm: number;
}

/** Pagamento efetivado de `deId` para `paraId`. */
export interface AcertoDivisao {
  id: string;
  deId: string;
  paraId: string;
  valor: Centavos;
  data: DataISO;
  criadoEm: number;
}

export interface GrupoDivisao {
  id: string;
  nome: string;
  participantes: Participante[];
  despesas: DespesaDivisao[];
  acertos: AcertoDivisao[];
  criadoEm: number;
}

const soma = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Divide `valor` entre as partes na proporção dos pesos. Cada parte recebe o piso do valor proporcional
 * e os centavos que sobram vão, de 1 em 1, às primeiras partes da lista.
 */
export function ratearProporcional(valor: Centavos, pesos: number[]): Centavos[] {
  const total = soma(pesos);
  const base = pesos.map((p) => Math.floor((valor * p) / total));
  let resto = valor - soma(base);
  return base.map((b) => (resto-- > 0 ? b + 1 : b));
}

const formatarReais = (c: Centavos): string => `R$ ${numeroCsv(c)}`;
const formatarPct = (bp: number): string => `${numeroCsv(bp)}%`;

/** Quanto cada participante da despesa deve; as chaves são os ids dos participantes das partes. */
export function ratearDespesa(valor: Centavos, tipo: TipoDivisao, partes: ParteDespesa[]): Resultado<Record<string, Centavos>> {
  if (partes.length === 0) return falha('Escolha pelo menos um participante na divisão.', 'partes');
  if (new Set(partes.map((p) => p.participanteId)).size !== partes.length) return falha('Participante repetido na divisão.', 'partes');
  if (partes.some((p) => !Number.isInteger(p.peso) || p.peso <= 0)) return falha('Os valores da divisão devem ser maiores que zero.', 'partes');
  const pesos = partes.map((p) => p.peso);
  if (tipo === 'exata') {
    const total = soma(pesos);
    if (total !== valor) return falha(`Os valores somam ${formatarReais(total)}, mas a despesa é de ${formatarReais(valor)}.`, 'partes');
  }
  if (tipo === 'percentual') {
    const total = soma(pesos);
    if (total !== TOTAL_PERCENTUAL) return falha(`Os percentuais somam ${formatarPct(total)}; devem somar 100,00%.`, 'partes');
  }
  const valores = tipo === 'exata' ? pesos : ratearProporcional(valor, tipo === 'igual' ? pesos.map(() => 1) : pesos);
  return ok(Object.fromEntries(partes.map((p, i) => [p.participanteId, valores[i]])));
}

export interface DadosGrupo {
  id?: string;
  nome: string;
  participantes: { id?: string; nome: string }[];
}

function atualizarGrupo(estado: AppState, grupoId: string, fn: (g: GrupoDivisao) => Resultado<GrupoDivisao>): Resultado<AppState> {
  const grupo = estado.gruposDivisao.find((g) => g.id === grupoId);
  if (!grupo) return falha('Grupo não encontrado.');
  const r = fn(grupo);
  if (!r.ok) return r;
  return ok({ ...estado, gruposDivisao: estado.gruposDivisao.map((g) => (g.id === grupoId ? r.valor : g)) });
}

/** Cria ou edita (quando há `id`) um grupo; participantes com id existente são renomeados. */
export function salvarGrupo(estado: AppState, dados: DadosGrupo): Resultado<{ estado: AppState; grupoId: string }> {
  const nome = dados.nome.trim();
  if (!nome) return falha('Informe o nome do grupo.', 'nome');
  if (nome.length > NOME_GRUPO_MAX) return falha(`O nome do grupo deve ter até ${NOME_GRUPO_MAX} caracteres.`, 'nome');
  const nomes = dados.participantes.map((p) => p.nome.trim());
  if (nomes.some((n) => !n)) return falha('Preencha o nome de todos os participantes.', 'participantes');
  if (nomes.some((n) => n.length > NOME_PARTICIPANTE_MAX)) return falha(`Cada nome deve ter até ${NOME_PARTICIPANTE_MAX} caracteres.`, 'participantes');
  if (nomes.length < MIN_PARTICIPANTES || nomes.length > MAX_PARTICIPANTES) {
    return falha(`O grupo precisa de ${MIN_PARTICIPANTES} a ${MAX_PARTICIPANTES} participantes.`, 'participantes');
  }
  if (new Set(nomes.map((n) => n.toLowerCase())).size !== nomes.length) return falha('Os nomes dos participantes devem ser diferentes.', 'participantes');
  const participantes: Participante[] = dados.participantes.map((p, i) => ({ id: p.id ?? novoId(), nome: nomes[i] }));

  if (!dados.id) {
    const grupo: GrupoDivisao = { id: novoId(), nome, participantes, despesas: [], acertos: [], criadoEm: proximoTempo() };
    return ok({ estado: { ...estado, gruposDivisao: [...estado.gruposDivisao, grupo] }, grupoId: grupo.id });
  }
  const r = atualizarGrupo(estado, dados.id, (g) => {
    const mantidos = new Set(participantes.map((p) => p.id));
    const emUso = (id: string) => g.despesas.some((d) => d.pagadorId === id || d.partes.some((x) => x.participanteId === id)) || g.acertos.some((a) => a.deId === id || a.paraId === id);
    const removido = g.participantes.find((p) => !mantidos.has(p.id) && emUso(p.id));
    if (removido) return falha(`${removido.nome} consta em despesas ou acertos e não pode ser removido.`, 'participantes');
    return ok({ ...g, nome, participantes });
  });
  return r.ok ? ok({ estado: r.valor, grupoId: dados.id }) : r;
}

export function excluirGrupo(estado: AppState, grupoId: string): Resultado<AppState> {
  if (!estado.gruposDivisao.some((g) => g.id === grupoId)) return falha('Grupo não encontrado.');
  return ok({ ...estado, gruposDivisao: estado.gruposDivisao.filter((g) => g.id !== grupoId) });
}

export interface DadosDespesa {
  id?: string;
  descricao: string;
  valor: Centavos;
  data: DataISO;
  pagadorId: string;
  tipo: TipoDivisao;
  partes: ParteDespesa[];
}

function validarValorEData(valor: Centavos, data: DataISO): Resultado<null> {
  if (!Number.isInteger(valor) || valor <= 0) return falha('Informe um valor maior que zero.', 'valor');
  if (valor > VALOR_MAX) return falha('O valor é grande demais.', 'valor');
  if (!dataValida(data)) return falha('Informe uma data válida.', 'data');
  return ok(null);
}

export function salvarDespesa(estado: AppState, grupoId: string, dados: DadosDespesa): Resultado<AppState> {
  return atualizarGrupo(estado, grupoId, (g) => {
    const descricao = dados.descricao.trim();
    if (!descricao) return falha('Informe a descrição da despesa.', 'descricao');
    if (descricao.length > DESCRICAO_MAX) return falha(`A descrição deve ter até ${DESCRICAO_MAX} caracteres.`, 'descricao');
    const v = validarValorEData(dados.valor, dados.data);
    if (!v.ok) return v;
    const ids = g.participantes.map((p) => p.id);
    if (!ids.includes(dados.pagadorId)) return falha('Escolha quem pagou.', 'pagadorId');
    if (dados.partes.some((p) => !ids.includes(p.participanteId))) return falha('A divisão tem um participante que não é do grupo.', 'partes');
    const partes = [...dados.partes].sort((a, b) => ids.indexOf(a.participanteId) - ids.indexOf(b.participanteId));
    const rateio = ratearDespesa(dados.valor, dados.tipo, partes);
    if (!rateio.ok) return rateio;
    if (dados.id) {
      const atual = g.despesas.find((d) => d.id === dados.id);
      if (!atual) return falha('Despesa não encontrada.');
      const nova: DespesaDivisao = { ...atual, descricao, valor: dados.valor, data: dados.data, pagadorId: dados.pagadorId, tipo: dados.tipo, partes };
      return ok({ ...g, despesas: g.despesas.map((d) => (d.id === nova.id ? nova : d)) });
    }
    const nova: DespesaDivisao = { id: novoId(), descricao, valor: dados.valor, data: dados.data, pagadorId: dados.pagadorId, tipo: dados.tipo, partes, criadaEm: proximoTempo() };
    return ok({ ...g, despesas: [...g.despesas, nova] });
  });
}

export function excluirDespesa(estado: AppState, grupoId: string, despesaId: string): Resultado<AppState> {
  return atualizarGrupo(estado, grupoId, (g) =>
    g.despesas.some((d) => d.id === despesaId) ? ok({ ...g, despesas: g.despesas.filter((d) => d.id !== despesaId) }) : falha('Despesa não encontrada.'),
  );
}

export interface DadosAcerto {
  deId: string;
  paraId: string;
  valor: Centavos;
  data: DataISO;
}

export function registrarAcerto(estado: AppState, grupoId: string, dados: DadosAcerto): Resultado<AppState> {
  return atualizarGrupo(estado, grupoId, (g) => {
    const ids = g.participantes.map((p) => p.id);
    if (!ids.includes(dados.deId)) return falha('Escolha quem paga.', 'deId');
    if (!ids.includes(dados.paraId)) return falha('Escolha quem recebe.', 'paraId');
    if (dados.deId === dados.paraId) return falha('Quem paga e quem recebe devem ser pessoas diferentes.', 'paraId');
    const v = validarValorEData(dados.valor, dados.data);
    if (!v.ok) return v;
    const acerto: AcertoDivisao = { id: novoId(), ...dados, criadoEm: proximoTempo() };
    return ok({ ...g, acertos: [...g.acertos, acerto] });
  });
}

export function excluirAcerto(estado: AppState, grupoId: string, acertoId: string): Resultado<AppState> {
  return atualizarGrupo(estado, grupoId, (g) =>
    g.acertos.some((a) => a.id === acertoId) ? ok({ ...g, acertos: g.acertos.filter((a) => a.id !== acertoId) }) : falha('Acerto não encontrado.'),
  );
}

/** Quanto cada participante deve numa despesa (0 para quem não participa). */
export function devidosDaDespesa(grupo: GrupoDivisao, despesa: DespesaDivisao): Record<string, Centavos> {
  const r = ratearDespesa(despesa.valor, despesa.tipo, despesa.partes);
  const devidos: Record<string, Centavos> = Object.fromEntries(grupo.participantes.map((p) => [p.id, 0]));
  return r.ok ? { ...devidos, ...r.valor } : devidos;
}

export interface SaldoParticipante {
  participanteId: string;
  nome: string;
  pagou: Centavos;
  deve: Centavos;
  /** pagou − deve + acertos enviados − acertos recebidos; positivo recebe, negativo deve. */
  saldo: Centavos;
}

export function calcularSaldos(grupo: GrupoDivisao): SaldoParticipante[] {
  const mapa = new Map<string, SaldoParticipante>(grupo.participantes.map((p) => [p.id, { participanteId: p.id, nome: p.nome, pagou: 0, deve: 0, saldo: 0 }]));
  for (const d of grupo.despesas) {
    const pagador = mapa.get(d.pagadorId);
    if (pagador) pagador.pagou += d.valor;
    for (const [id, v] of Object.entries(devidosDaDespesa(grupo, d))) {
      const s = mapa.get(id);
      if (s) s.deve += v;
    }
  }
  for (const s of mapa.values()) s.saldo = s.pagou - s.deve;
  for (const a of grupo.acertos) {
    const de = mapa.get(a.deId);
    const para = mapa.get(a.paraId);
    if (de) de.saldo += a.valor;
    if (para) para.saldo -= a.valor;
  }
  return [...mapa.values()];
}

export interface Transferencia {
  deId: string;
  paraId: string;
  valor: Centavos;
}

/** Guloso: o maior devedor paga ao maior credor até zerar um dos dois; empates seguem a ordem do grupo. */
export function sugerirTransferencias(saldos: SaldoParticipante[]): Transferencia[] {
  const credores = saldos.filter((s) => s.saldo > 0).map((s) => ({ id: s.participanteId, v: s.saldo }));
  const devedores = saldos.filter((s) => s.saldo < 0).map((s) => ({ id: s.participanteId, v: -s.saldo }));
  const maior = <T extends { v: number }>(xs: T[]): T => xs.reduce((m, x) => (x.v > m.v ? x : m), xs[0]);
  const resultado: Transferencia[] = [];
  while (credores.length > 0 && devedores.length > 0) {
    const c = maior(credores);
    const d = maior(devedores);
    const valor = Math.min(c.v, d.v);
    resultado.push({ deId: d.id, paraId: c.id, valor });
    c.v -= valor;
    d.v -= valor;
    if (c.v === 0) credores.splice(credores.indexOf(c), 1);
    if (d.v === 0) devedores.splice(devedores.indexOf(d), 1);
  }
  return resultado;
}

export interface ResumoGrupo {
  totalGasto: Centavos;
  qtdDespesas: number;
  totalAcertado: Centavos;
  qtdAcertos: number;
  saldos: SaldoParticipante[];
  transferencias: Transferencia[];
}

export function resumoGrupo(grupo: GrupoDivisao): ResumoGrupo {
  const saldos = calcularSaldos(grupo);
  return {
    totalGasto: soma(grupo.despesas.map((d) => d.valor)),
    qtdDespesas: grupo.despesas.length,
    totalAcertado: soma(grupo.acertos.map((a) => a.valor)),
    qtdAcertos: grupo.acertos.length,
    saldos,
    transferencias: sugerirTransferencias(saldos),
  };
}

export type TipoItemHistorico = 'todos' | 'despesa' | 'acerto';

export interface FiltrosHistorico {
  texto: string;
  participanteId: string;
  tipo: TipoItemHistorico;
  de: DataISO;
  ate: DataISO;
}

export const FILTROS_VAZIOS: FiltrosHistorico = { texto: '', participanteId: '', tipo: 'todos', de: '', ate: '' };

export type ItemHistorico = { tipo: 'despesa'; despesa: DespesaDivisao } | { tipo: 'acerto'; acerto: AcertoDivisao };

const dataDoItem = (i: ItemHistorico): DataISO => (i.tipo === 'despesa' ? i.despesa.data : i.acerto.data);
const criacaoDoItem = (i: ItemHistorico): number => (i.tipo === 'despesa' ? i.despesa.criadaEm : i.acerto.criadoEm);

/** Itens do histórico, do mais recente ao mais antigo; o texto procura na descrição e nos nomes envolvidos. */
export function historicoDoGrupo(grupo: GrupoDivisao, filtros: FiltrosHistorico): ItemHistorico[] {
  const nomes = new Map(grupo.participantes.map((p) => [p.id, p.nome]));
  const texto = filtros.texto.trim().toLowerCase();
  const itens: ItemHistorico[] = [
    ...grupo.despesas.map((despesa): ItemHistorico => ({ tipo: 'despesa', despesa })),
    ...grupo.acertos.map((acerto): ItemHistorico => ({ tipo: 'acerto', acerto })),
  ];
  return itens
    .filter((i) => {
      if (filtros.tipo !== 'todos' && i.tipo !== filtros.tipo) return false;
      if (filtros.de && dataDoItem(i) < filtros.de) return false;
      if (filtros.ate && dataDoItem(i) > filtros.ate) return false;
      const envolvidos = i.tipo === 'despesa' ? [i.despesa.pagadorId, ...i.despesa.partes.map((p) => p.participanteId)] : [i.acerto.deId, i.acerto.paraId];
      if (filtros.participanteId && !envolvidos.includes(filtros.participanteId)) return false;
      if (texto) {
        const alvo = [i.tipo === 'despesa' ? i.despesa.descricao : '', ...envolvidos.map((id) => nomes.get(id) ?? '')].join(' ').toLowerCase();
        if (!alvo.includes(texto)) return false;
      }
      return true;
    })
    .sort((a, b) => dataDoItem(b).localeCompare(dataDoItem(a)) || criacaoDoItem(b) - criacaoDoItem(a));
}

export function nomeArquivoGrupo(grupo: GrupoDivisao): string {
  const limpo = grupo.nome.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
  return `divisao-${limpo || 'grupo'}.csv`;
}

export function csvGrupo(grupo: GrupoDivisao): string {
  const nome = (id: string) => grupo.participantes.find((p) => p.id === id)?.nome ?? '';
  const cabecalho = ['Data', 'Tipo', 'Descrição', 'Pagou', 'Valor', 'Divisão', ...grupo.participantes.map((p) => `Parte de ${p.nome}`)];
  const linhas: string[][] = [cabecalho];
  for (const i of historicoDoGrupo(grupo, FILTROS_VAZIOS)) {
    if (i.tipo === 'despesa') {
      const devidos = devidosDaDespesa(grupo, i.despesa);
      linhas.push([i.despesa.data, 'Despesa', i.despesa.descricao, nome(i.despesa.pagadorId), numeroCsv(i.despesa.valor), ROTULO_TIPO_DIVISAO[i.despesa.tipo], ...grupo.participantes.map((p) => numeroCsv(devidos[p.id] ?? 0))]);
    } else {
      linhas.push([i.acerto.data, 'Acerto', `Para ${nome(i.acerto.paraId)}`, nome(i.acerto.deId), numeroCsv(i.acerto.valor), '', ...grupo.participantes.map(() => '')]);
    }
  }
  linhas.push([], ['Saldos'], ['Participante', 'Pagou', 'Deve', 'Saldo']);
  for (const s of calcularSaldos(grupo)) linhas.push([s.nome, numeroCsv(s.pagou), numeroCsv(s.deve), numeroCsv(s.saldo)]);
  return gerarCsv(linhas);
}
