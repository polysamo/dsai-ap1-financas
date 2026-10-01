import { dataValida } from './date';
import { novoId, proximoTempo } from './id';
import { falha, ok, type AppState, type Centavos, type Conta, type DataISO, type Resultado } from './types';

export const DESCRICAO_TRANSFERENCIA_MAX = 100;

/** Movimenta dinheiro entre duas contas; não é receita nem despesa. */
export interface Transferencia {
  id: string;
  contaOrigemId: string;
  contaDestinoId: string;
  /** Sempre positivo, em centavos inteiros. */
  valor: Centavos;
  data: DataISO;
  descricao: string;
  criadaEm: number;
}

export type DadosTransferencia = Omit<Transferencia, 'id' | 'criadaEm'>;

export interface FiltroTransferencias {
  /** Conta que aparece como origem ou destino; vazio para todas. */
  contaId?: string;
  de?: DataISO;
  ate?: DataISO;
}

export interface TotaisConta {
  contaId: string;
  enviado: Centavos;
  recebido: Centavos;
}

/** Valida os dados; contas já usadas pela transferência editada podem estar arquivadas. */
function validar(estado: AppState, dados: DadosTransferencia, anterior?: Transferencia): Resultado<DadosTransferencia> {
  const aceita = (id: string, campo: 'contaOrigemId' | 'contaDestinoId', rotulo: string) => {
    const c: Conta | undefined = estado.contas.find((x) => x.id === id);
    const mantida = anterior !== undefined && anterior[campo] === id;
    return c !== undefined && (!c.arquivada || mantida) ? null : falha(`Escolha uma conta de ${rotulo} ativa.`, campo);
  };
  const erroOrigem = aceita(dados.contaOrigemId, 'contaOrigemId', 'origem');
  if (erroOrigem) return erroOrigem;
  const erroDestino = aceita(dados.contaDestinoId, 'contaDestinoId', 'destino');
  if (erroDestino) return erroDestino;
  if (dados.contaOrigemId === dados.contaDestinoId) return falha('Origem e destino devem ser contas diferentes.', 'contaDestinoId');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  if (!dataValida(dados.data)) return falha('Informe uma data válida.', 'data');
  const descricao = dados.descricao.trim();
  if (descricao.length > DESCRICAO_TRANSFERENCIA_MAX) {
    return falha(`A descrição deve ter no máximo ${DESCRICAO_TRANSFERENCIA_MAX} caracteres.`, 'descricao');
  }
  return ok({ ...dados, descricao });
}

export const listaTransferencias = (estado: Pick<AppState, 'transferencias'>): Transferencia[] => estado.transferencias ?? [];

export function criarTransferencia(estado: AppState, dados: DadosTransferencia): Resultado<AppState> {
  const v = validar(estado, dados);
  if (!v.ok) return v;
  const nova: Transferencia = { id: novoId(), ...v.valor, criadaEm: proximoTempo() };
  return ok({ ...estado, transferencias: [...listaTransferencias(estado), nova] });
}

export function editarTransferencia(estado: AppState, id: string, dados: DadosTransferencia): Resultado<AppState> {
  const atual = listaTransferencias(estado).find((t) => t.id === id);
  if (!atual) return falha('Transferência não encontrada.');
  const v = validar(estado, dados, atual);
  if (!v.ok) return v;
  return ok({ ...estado, transferencias: listaTransferencias(estado).map((t) => (t.id === id ? { ...t, ...v.valor } : t)) });
}

export function excluirTransferencia(estado: AppState, id: string): Resultado<AppState> {
  if (!listaTransferencias(estado).some((t) => t.id === id)) return falha('Transferência não encontrada.');
  return ok({ ...estado, transferencias: listaTransferencias(estado).filter((t) => t.id !== id) });
}

/** Valida o período do filtro: data inicial não pode passar da final. */
export function validarPeriodo(de?: DataISO, ate?: DataISO): Resultado<null> {
  if (de && !dataValida(de)) return falha('Data inicial inválida.', 'de');
  if (ate && !dataValida(ate)) return falha('Data final inválida.', 'ate');
  if (de && ate && de > ate) return falha('A data inicial deve ser anterior ou igual à final.', 'ate');
  return ok(null);
}

/** Da mais recente para a mais antiga; empate pela ordem de criação (mais nova primeiro). */
export function filtrarTransferencias(transferencias: Transferencia[], filtro: FiltroTransferencias = {}): Transferencia[] {
  const { contaId, de, ate } = filtro;
  return transferencias
    .filter((t) => !contaId || t.contaOrigemId === contaId || t.contaDestinoId === contaId)
    .filter((t) => (!de || t.data >= de) && (!ate || t.data <= ate))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadaEm - a.criadaEm));
}

/** Enviado e recebido por conta nas transferências dadas (já filtradas pelo período). */
export function totaisPorConta(transferencias: Transferencia[]): TotaisConta[] {
  const mapa = new Map<string, TotaisConta>();
  const da = (contaId: string) => {
    const t = mapa.get(contaId) ?? { contaId, enviado: 0, recebido: 0 };
    mapa.set(contaId, t);
    return t;
  };
  for (const t of transferencias) {
    da(t.contaOrigemId).enviado += t.valor;
    da(t.contaDestinoId).recebido += t.valor;
  }
  return [...mapa.values()];
}
