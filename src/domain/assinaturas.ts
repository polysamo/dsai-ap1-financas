import { dataValida, diasEntre, diasNoMes, hojeISO, somarDias } from './date';
import { novoId } from './id';
import { normalizarTexto } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado } from './types';

export type FrequenciaAssinatura = 'semanal' | 'mensal' | 'anual';
export type DecisaoDeteccao = 'confirmada' | 'ignorada';

export const FREQUENCIAS: { valor: FrequenciaAssinatura; rotulo: string }[] = [
  { valor: 'semanal', rotulo: 'Semanal' },
  { valor: 'mensal', rotulo: 'Mensal' },
  { valor: 'anual', rotulo: 'Anual' },
];

export const DESCRICAO_ASSINATURA_MAX = 100;
export const MIN_OCORRENCIAS = 3;
export const VARIACAO_PADRAO_PCT = 15;

/** Dados de uma assinatura cadastrada à mão. */
export interface DadosManual {
  descricao: string;
  valor: Centavos;
  frequencia: FrequenciaAssinatura;
  proximaCobranca: DataISO;
}

/** Decisão do usuário sobre uma detecção ou assinatura manual (guardada em `assinaturasDecisoes`). */
export interface DecisaoAssinatura {
  /** `<descrição normalizada>|<frequência>` ou `manual:<id>`. */
  chave: string;
  decisao: DecisaoDeteccao;
  /** Presente quando a assinatura foi cancelada (continua `confirmada`). */
  canceladaEm?: DataISO;
  /** Presente nas assinaturas manuais. */
  manual?: DadosManual;
}

export interface OpcoesDeteccao {
  /** Variação máxima de valor entre cobranças consecutivas, em %. */
  variacaoMaxPct?: number;
  minOcorrencias?: number;
}

export type SituacaoAssinatura = 'pendente' | 'confirmada' | 'ignorada' | 'cancelada';

export interface AumentoPreco {
  anterior: Centavos;
  atual: Centavos;
  /** Percentual com uma casa decimal. */
  pct: number;
}

export interface ItemAssinatura {
  chave: string;
  origem: 'detectada' | 'manual';
  descricao: string;
  frequencia: FrequenciaAssinatura;
  ocorrencias: number;
  valorMedio: Centavos;
  ultimaCobranca?: DataISO;
  proximaCobranca: DataISO;
  atrasada: boolean;
  custoMensal: Centavos;
  custoAnual: Centavos;
  situacao: SituacaoAssinatura;
  canceladaEm?: DataISO;
  aumento?: AumentoPreco;
}

export interface TotaisAssinaturas {
  ativas: number;
  pendentes: number;
  mensal: Centavos;
  anual: Centavos;
  /** Custo anual das assinaturas canceladas. */
  economiaAnual: Centavos;
}

// ---------- datas ----------

/** Soma um período à data, preservando o dia do mês (limitado ao último dia do mês de destino). */
export function somarPeriodo(data: DataISO, frequencia: FrequenciaAssinatura): DataISO {
  if (frequencia === 'semanal') return somarDias(data, 7);
  const [a, m, d] = data.split('-').map(Number);
  const meses = frequencia === 'mensal' ? 1 : 12;
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const dia = Math.min(d, diasNoMes(ano, mes));
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// ---------- custos ----------

export function custoMensal(valor: Centavos, frequencia: FrequenciaAssinatura): Centavos {
  if (frequencia === 'mensal') return valor;
  if (frequencia === 'semanal') return Math.round((valor * 52) / 12);
  return Math.round(valor / 12);
}

export function custoAnual(valor: Centavos, frequencia: FrequenciaAssinatura): Centavos {
  if (frequencia === 'mensal') return valor * 12;
  if (frequencia === 'semanal') return valor * 52;
  return valor;
}

// ---------- detecção ----------

const TOLERANCIAS: Record<FrequenciaAssinatura, { min: number; max: number }> = {
  semanal: { min: 6, max: 8 },
  mensal: { min: 25, max: 34 },
  anual: { min: 350, max: 380 },
};

/** Frequência cujo intervalo (em dias) comporta `dias`, ou null. */
export function classificarIntervalo(dias: number): FrequenciaAssinatura | null {
  for (const f of ['semanal', 'mensal', 'anual'] as const) {
    if (dias >= TOLERANCIAS[f].min && dias <= TOLERANCIAS[f].max) return f;
  }
  return null;
}

export interface Deteccao {
  chave: string;
  descricao: string;
  frequencia: FrequenciaAssinatura;
  ocorrencias: number;
  valorMedio: Centavos;
  ultimaCobranca: DataISO;
  proximaCobranca: DataISO;
  aumento?: AumentoPreco;
}

/** Detecta despesas recorrentes. Função pura: não altera as transações. */
export function detectarAssinaturas(estado: AppState, opcoes: OpcoesDeteccao = {}): Deteccao[] {
  const variacaoMax = opcoes.variacaoMaxPct ?? VARIACAO_PADRAO_PCT;
  const minimo = Math.max(2, opcoes.minOcorrencias ?? MIN_OCORRENCIAS);
  const grupos = new Map<string, { data: DataISO; valor: Centavos; descricao: string }[]>();
  for (const t of estado.transacoes) {
    if (t.tipo !== 'despesa') continue;
    const chave = normalizarTexto(t.descricao).replace(/\s+/g, ' ').trim();
    if (!chave) continue;
    const itens = grupos.get(chave) ?? [];
    itens.push({ data: t.data, valor: t.valor, descricao: t.descricao.trim() });
    grupos.set(chave, itens);
  }
  const resultado: Deteccao[] = [];
  for (const [norm, itens] of grupos) {
    if (itens.length < minimo) continue;
    const ordenada = [...itens].sort((a, b) => a.data.localeCompare(b.data) || a.valor - b.valor);
    const n = ordenada.length;
    const frequencia = classificarIntervalo(diasEntre(ordenada[n - 2].data, ordenada[n - 1].data));
    if (!frequencia) continue;
    // Estende a sequência para trás enquanto intervalo e valor continuam coerentes.
    let inicio = n - 1;
    while (inicio > 0) {
      const a = ordenada[inicio - 1];
      const b = ordenada[inicio];
      if (classificarIntervalo(diasEntre(a.data, b.data)) !== frequencia) break;
      const base = Math.min(a.valor, b.valor);
      if ((Math.abs(a.valor - b.valor) * 100) / base > variacaoMax) break;
      inicio--;
    }
    const serie = ordenada.slice(inicio);
    if (serie.length < minimo) continue;
    const soma = serie.reduce((s, x) => s + x.valor, 0);
    const ultima = serie[serie.length - 1];
    const anterior = serie[serie.length - 2];
    resultado.push({
      chave: `${norm}|${frequencia}`,
      descricao: ultima.descricao,
      frequencia,
      ocorrencias: serie.length,
      valorMedio: Math.round(soma / serie.length),
      ultimaCobranca: ultima.data,
      proximaCobranca: somarPeriodo(ultima.data, frequencia),
      aumento:
        ultima.valor > anterior.valor
          ? { anterior: anterior.valor, atual: ultima.valor, pct: Math.round(((ultima.valor - anterior.valor) / anterior.valor) * 1000) / 10 }
          : undefined,
    });
  }
  return resultado.sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR') || a.chave.localeCompare(b.chave));
}

// ---------- lista combinada ----------

export function listarAssinaturas(estado: AppState, hoje: DataISO = hojeISO(), opcoes: OpcoesDeteccao = {}): ItemAssinatura[] {
  const decisoes = estado.assinaturasDecisoes ?? [];
  const porChave = new Map(decisoes.map((d) => [d.chave, d]));
  const itens: ItemAssinatura[] = [];
  for (const d of detectarAssinaturas(estado, opcoes)) {
    const dec = porChave.get(d.chave);
    const situacao: SituacaoAssinatura = !dec ? 'pendente' : dec.decisao === 'ignorada' ? 'ignorada' : dec.canceladaEm ? 'cancelada' : 'confirmada';
    itens.push({
      chave: d.chave,
      origem: 'detectada',
      descricao: d.descricao,
      frequencia: d.frequencia,
      ocorrencias: d.ocorrencias,
      valorMedio: d.valorMedio,
      ultimaCobranca: d.ultimaCobranca,
      proximaCobranca: d.proximaCobranca,
      atrasada: d.proximaCobranca < hoje,
      custoMensal: custoMensal(d.valorMedio, d.frequencia),
      custoAnual: custoAnual(d.valorMedio, d.frequencia),
      situacao,
      canceladaEm: dec?.canceladaEm,
      aumento: d.aumento,
    });
  }
  for (const dec of decisoes) {
    if (!dec.manual) continue;
    const m = dec.manual;
    itens.push({
      chave: dec.chave,
      origem: 'manual',
      descricao: m.descricao,
      frequencia: m.frequencia,
      ocorrencias: 0,
      valorMedio: m.valor,
      proximaCobranca: m.proximaCobranca,
      atrasada: m.proximaCobranca < hoje,
      custoMensal: custoMensal(m.valor, m.frequencia),
      custoAnual: custoAnual(m.valor, m.frequencia),
      situacao: dec.canceladaEm ? 'cancelada' : 'confirmada',
      canceladaEm: dec.canceladaEm,
    });
  }
  return itens;
}

export function totaisAssinaturas(itens: ItemAssinatura[]): TotaisAssinaturas {
  const t: TotaisAssinaturas = { ativas: 0, pendentes: 0, mensal: 0, anual: 0, economiaAnual: 0 };
  for (const i of itens) {
    if (i.situacao === 'confirmada') {
      t.ativas++;
      t.mensal += i.custoMensal;
      t.anual += i.custoAnual;
    } else if (i.situacao === 'pendente') t.pendentes++;
    else if (i.situacao === 'cancelada') t.economiaAnual += i.custoAnual;
  }
  return t;
}

// ---------- operações sobre decisões ----------

const decisoesDe = (estado: AppState) => estado.assinaturasDecisoes ?? [];
const comDecisoes = (estado: AppState, l: DecisaoAssinatura[]): AppState => ({ ...estado, assinaturasDecisoes: l });

/** Confirma ou ignora uma detecção existente. */
export function decidirAssinatura(estado: AppState, chave: string, decisao: DecisaoDeteccao): Resultado<AppState> {
  if (chave.startsWith('manual:')) return falha('Assinaturas manuais não precisam de decisão.');
  if (!detectarAssinaturas(estado).some((d) => d.chave === chave)) return falha('Esta assinatura não foi encontrada.');
  const outras = decisoesDe(estado).filter((d) => d.chave !== chave);
  return ok(comDecisoes(estado, [...outras, { chave, decisao }]));
}

/** Volta uma detecção ao estado pendente (remove a decisão). */
export function desfazerDecisao(estado: AppState, chave: string): Resultado<AppState> {
  const atual = decisoesDe(estado).find((d) => d.chave === chave);
  if (!atual || atual.manual) return falha('Não há decisão a desfazer.');
  return ok(comDecisoes(estado, decisoesDe(estado).filter((d) => d.chave !== chave)));
}

/** Cancela uma assinatura confirmada, manual ou detectada (cancelar uma detecção a confirma). */
export function cancelarAssinatura(estado: AppState, chave: string, data: DataISO = hojeISO()): Resultado<AppState> {
  if (!dataValida(data)) return falha('Informe uma data válida.', 'data');
  const atual = decisoesDe(estado).find((d) => d.chave === chave);
  if (atual?.decisao === 'ignorada') return falha('Restaure a assinatura ignorada antes de cancelá-la.');
  if (!atual && !detectarAssinaturas(estado).some((d) => d.chave === chave)) return falha('Esta assinatura não foi encontrada.');
  const nova: DecisaoAssinatura = { ...(atual ?? { chave, decisao: 'confirmada' }), decisao: 'confirmada', canceladaEm: data };
  return ok(comDecisoes(estado, [...decisoesDe(estado).filter((d) => d.chave !== chave), nova]));
}

export function reativarAssinatura(estado: AppState, chave: string): Resultado<AppState> {
  const atual = decisoesDe(estado).find((d) => d.chave === chave);
  if (!atual?.canceladaEm) return falha('Esta assinatura não está cancelada.');
  const { canceladaEm: _c, ...resto } = atual;
  void _c;
  // Uma detecção reativada volta a "confirmada"; a manual também.
  return ok(comDecisoes(estado, decisoesDe(estado).map((d) => (d.chave === chave ? resto : d))));
}

export function validarManual(dados: DadosManual): Resultado<DadosManual> {
  const descricao = dados.descricao.trim();
  if (!descricao) return falha('Informe a descrição.', 'descricao');
  if (descricao.length > DESCRICAO_ASSINATURA_MAX) return falha(`A descrição deve ter no máximo ${DESCRICAO_ASSINATURA_MAX} caracteres.`, 'descricao');
  if (!Number.isInteger(dados.valor) || dados.valor <= 0) return falha('O valor deve ser maior que zero.', 'valor');
  if (!FREQUENCIAS.some((f) => f.valor === dados.frequencia)) return falha('Selecione a frequência.', 'frequencia');
  if (!dataValida(dados.proximaCobranca)) return falha('Informe uma data válida.', 'proximaCobranca');
  return ok({ ...dados, descricao });
}

export function criarAssinaturaManual(estado: AppState, dados: DadosManual): Resultado<AppState> {
  const v = validarManual(dados);
  if (!v.ok) return v;
  return ok(comDecisoes(estado, [...decisoesDe(estado), { chave: `manual:${novoId()}`, decisao: 'confirmada', manual: v.valor }]));
}

export function excluirAssinaturaManual(estado: AppState, chave: string): Resultado<AppState> {
  if (!decisoesDe(estado).some((d) => d.chave === chave && d.manual)) return falha('Assinatura não encontrada.');
  return ok(comDecisoes(estado, decisoesDe(estado).filter((d) => d.chave !== chave)));
}
