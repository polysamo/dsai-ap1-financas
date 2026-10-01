import { dataDaParcela } from './cartoes';
import { dataValida, mesDe } from './date';
import { novoId, proximoTempo } from './id';
import { DESCRICAO_MAX } from './transacoes';
import {
  falha,
  ok,
  type Agendamento,
  type AppState,
  type Categoria,
  type Centavos,
  type DataISO,
  type Mes,
  type Resultado,
  type TipoMovimento,
  type Transacao,
} from './types';

export const REPETICOES_MIN = 1;
export const REPETICOES_MAX = 60;
export const DIAS_ALERTA = 7;

export type SituacaoAgendamento = 'pago' | 'atrasado' | 'pendente';

export function situacaoAgendamento(item: Agendamento, hoje: DataISO): SituacaoAgendamento {
  if (item.pagoEm) return 'pago';
  return item.vencimento < hoje ? 'atrasado' : 'pendente';
}

function categoriaAtiva(categorias: Categoria[], id: string, tipo: TipoMovimento): boolean {
  const c = categorias.find((x) => x.id === id);
  return !!c && !c.arquivada && c.tipo === tipo;
}

const contaAtiva = (estado: AppState, id: string) => estado.contas.some((c) => c.id === id && !c.arquivada);

export interface DadosAgendamento {
  descricao: string;
  tipo: TipoMovimento;
  valor: Centavos;
  vencimento: DataISO;
  categoriaId: string;
  contaId?: string;
  /** Número de lançamentos mensais a criar (1 = sem recorrência). */
  repeticoes: number;
}

export function criarAgendamentos(estado: AppState, dados: DadosAgendamento): Resultado<AppState> {
  const descricao = dados.descricao.trim();
  if (!descricao) return falha('Informe a descrição.', 'descricao');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  if (!dataValida(dados.vencimento)) return falha('Informe um vencimento válido.', 'vencimento');
  if (!categoriaAtiva(estado.categorias, dados.categoriaId, dados.tipo)) {
    return falha(`Escolha uma categoria ativa de ${dados.tipo === 'despesa' ? 'despesa' : 'receita'}.`, 'categoriaId');
  }
  if (dados.contaId && !contaAtiva(estado, dados.contaId)) return falha('Escolha uma conta ativa.', 'contaId');
  const n = dados.repeticoes;
  if (!Number.isInteger(n) || n < REPETICOES_MIN || n > REPETICOES_MAX) {
    return falha(`As repetições devem ficar entre ${REPETICOES_MIN} e ${REPETICOES_MAX}.`, 'repeticoes');
  }

  const grupoId = novoId();
  const novos: Agendamento[] = Array.from({ length: n }, (_, i) => {
    const sufixo = n > 1 ? ` (${i + 1}/${n})` : '';
    return {
      id: novoId(),
      descricao: descricao.slice(0, DESCRICAO_MAX - sufixo.length) + sufixo,
      tipo: dados.tipo,
      valor: dados.valor,
      vencimento: dataDaParcela(dados.vencimento, i),
      categoriaId: dados.categoriaId,
      ...(dados.contaId ? { contaId: dados.contaId } : {}),
      ...(n > 1 ? { serie: { grupoId, numero: i + 1, total: n } } : {}),
      criadoEm: proximoTempo(),
    };
  });
  return ok({ ...estado, agenda: [...estado.agenda, ...novos] });
}

export interface DadosBaixa {
  contaId: string;
  categoriaId: string;
  data: DataISO;
}

/** Dá baixa: cria a transação real e liga o lançamento a ela. Recusa lançamentos já pagos. */
export function marcarComoPago(estado: AppState, id: string, dados: DadosBaixa): Resultado<AppState> {
  const item = estado.agenda.find((a) => a.id === id);
  if (!item) return falha('Lançamento não encontrado.');
  if (item.pagoEm) return falha('Este lançamento já foi pago.');
  if (!contaAtiva(estado, dados.contaId)) return falha('Escolha uma conta ativa.', 'contaId');
  if (!categoriaAtiva(estado.categorias, dados.categoriaId, item.tipo)) {
    return falha(`Escolha uma categoria ativa de ${item.tipo === 'despesa' ? 'despesa' : 'receita'}.`, 'categoriaId');
  }
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');

  const transacao: Transacao = {
    id: novoId(),
    contaId: dados.contaId,
    categoriaId: dados.categoriaId,
    tipo: item.tipo,
    valor: item.valor,
    data: dados.data,
    descricao: item.descricao,
    criadaEm: proximoTempo(),
  };
  return ok({
    ...estado,
    transacoes: [...estado.transacoes, transacao],
    agenda: estado.agenda.map((a) => (a.id === id ? { ...a, pagoEm: dados.data, transacaoId: transacao.id } : a)),
  });
}

/** Desfaz a baixa: remove a transação criada e volta o lançamento ao estado não pago. */
export function reabrirAgendamento(estado: AppState, id: string): Resultado<AppState> {
  const item = estado.agenda.find((a) => a.id === id);
  if (!item) return falha('Lançamento não encontrado.');
  if (!item.pagoEm) return falha('Este lançamento não está pago.');
  return ok({
    ...estado,
    transacoes: estado.transacoes.filter((t) => t.id !== item.transacaoId),
    agenda: estado.agenda.map((a) => {
      if (a.id !== id) return a;
      const { pagoEm: _pagoEm, transacaoId: _transacaoId, ...resto } = a;
      return resto;
    }),
  });
}

/** Remove só o lançamento; a transação de uma baixa já feita permanece. */
export function excluirAgendamento(estado: AppState, id: string): Resultado<AppState> {
  if (!estado.agenda.some((a) => a.id === id)) return falha('Lançamento não encontrado.');
  return ok({ ...estado, agenda: estado.agenda.filter((a) => a.id !== id) });
}

/** Lançamentos com vencimento no mês, por vencimento e depois por criação. */
export function agendamentosDoMes(estado: AppState, mes: Mes): Agendamento[] {
  return estado.agenda
    .filter((a) => mesDe(a.vencimento) === mes)
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.criadoEm - b.criadoEm));
}

export interface TotaisAgenda {
  aPagar: Centavos;
  aReceber: Centavos;
  jaPago: Centavos;
  jaRecebido: Centavos;
}

export function totaisAgenda(itens: Agendamento[]): TotaisAgenda {
  const t: TotaisAgenda = { aPagar: 0, aReceber: 0, jaPago: 0, jaRecebido: 0 };
  for (const a of itens) {
    const chave = a.tipo === 'despesa' ? (a.pagoEm ? 'jaPago' : 'aPagar') : a.pagoEm ? 'jaRecebido' : 'aReceber';
    t[chave] += a.valor;
  }
  return t;
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export interface AlertaVencimentos {
  proximos: Agendamento[];
  atrasados: number;
}

/** Não pagos que vencem de hoje até `DIAS_ALERTA` dias à frente, e a contagem dos atrasados. */
export function alertaVencimentos(estado: AppState, hoje: DataISO): AlertaVencimentos {
  const limite = somarDias(hoje, DIAS_ALERTA);
  const abertos = estado.agenda.filter((a) => !a.pagoEm);
  const proximos = abertos
    .filter((a) => a.vencimento >= hoje && a.vencimento <= limite)
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : a.criadoEm - b.criadoEm));
  return { proximos, atrasados: abertos.filter((a) => a.vencimento < hoje).length };
}

/** Dias da grade do mês: `null` nas células vazias antes do dia 1 (semana começa no domingo). */
export function diasDaGrade(mes: Mes): (DataISO | null)[] {
  const [ano, m] = mes.split('-').map(Number);
  const primeiro = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`),
  ];
}
