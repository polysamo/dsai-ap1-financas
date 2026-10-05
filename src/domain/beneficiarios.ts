import { mesDe, somarMeses } from './date';
import { percentualDecimal } from './relatorios';
import { normalizarTexto } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Mes, type Resultado, type Transacao } from './types';

export interface DadosBeneficiarios {
  /** Nome exibido por chave normalizada. */
  nomes: Record<string, string>;
  /** Origem → destino: a origem é contada no destino. */
  mesclas: Record<string, string>;
}

export const NOME_BENEFICIARIO_MAX = 60;
export type PeriodoBeneficiarios = 1 | 3 | 6 | 12 | 'tudo';
export const PERIODOS_BENEFICIARIOS: PeriodoBeneficiarios[] = [1, 3, 6, 12, 'tudo'];

export const dadosBeneficiarios = (estado: Pick<AppState, 'beneficiarios'>): DadosBeneficiarios => estado.beneficiarios ?? { nomes: {}, mesclas: {} };

/** Descrição sem acento, minúscula, sem números nem símbolos e com espaços colapsados. */
export function chaveBeneficiario(descricao: string): string {
  return normalizarTexto(descricao)
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Segue as mesclas até o destino final; ciclos (dados corrompidos) param na chave já vista. */
export function destinoFinal(mesclas: Record<string, string>, chave: string): string {
  const vistos = new Set<string>();
  let atual = chave;
  while (mesclas[atual] !== undefined && !vistos.has(atual)) {
    vistos.add(atual);
    atual = mesclas[atual];
  }
  return atual;
}

export interface Beneficiario {
  chave: string;
  nome: string;
  total: Centavos;
  quantidade: number;
  ticketMedio: Centavos;
  ultima: DataISO;
  /** Descrição original da compra mais recente (para o filtro de transações). */
  descricaoRecente: string;
  categoriaId: string;
  /** Média de dias entre compras consecutivas em datas diferentes; null com menos de 2 datas. */
  intervaloMedio: number | null;
  participacao: number | null;
  /** Chaves que foram mescladas neste beneficiário. */
  mesclados: string[];
}

export function inicioDoPeriodo(periodo: PeriodoBeneficiarios, hoje: DataISO): DataISO | null {
  if (periodo === 'tudo') return null;
  return `${somarMeses(mesDe(hoje), -(periodo - 1))}-01`;
}

const diaUTC = (iso: DataISO) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

function intervaloMedio(datas: DataISO[]): number | null {
  const unicas = [...new Set(datas)].sort();
  if (unicas.length < 2) return null;
  const dias = (diaUTC(unicas[unicas.length - 1]) - diaUTC(unicas[0])) / 86400000;
  return Math.round(dias / (unicas.length - 1));
}

function categoriaMaisFrequente(transacoes: Transacao[]): string {
  const contagem = new Map<string, { n: number; valor: Centavos }>();
  for (const t of transacoes) {
    const c = contagem.get(t.categoriaId) ?? { n: 0, valor: 0 };
    contagem.set(t.categoriaId, { n: c.n + 1, valor: c.valor + t.valor });
  }
  return [...contagem.entries()].sort((a, b) => b[1].n - a[1].n || b[1].valor - a[1].valor)[0][0];
}

/** Despesas do período agrupadas por beneficiário, do maior total para o menor. */
export function listarBeneficiarios(estado: AppState, periodo: PeriodoBeneficiarios, hoje: DataISO): Beneficiario[] {
  const { nomes, mesclas } = dadosBeneficiarios(estado);
  const inicio = inicioDoPeriodo(periodo, hoje);
  const grupos = new Map<string, Transacao[]>();
  for (const t of estado.transacoes) {
    if (t.tipo !== 'despesa' || (inicio && t.data < inicio) || t.data > hoje) continue;
    const chave = chaveBeneficiario(t.descricao);
    if (!chave) continue;
    const destino = destinoFinal(mesclas, chave);
    grupos.set(destino, [...(grupos.get(destino) ?? []), t]);
  }
  const totalGeral = [...grupos.values()].flat().reduce((s, t) => s + t.valor, 0);
  const origensPor = new Map<string, string[]>();
  for (const origem of Object.keys(mesclas)) {
    const destino = destinoFinal(mesclas, origem);
    origensPor.set(destino, [...(origensPor.get(destino) ?? []), origem]);
  }
  return [...grupos.entries()]
    .map(([chave, lista]): Beneficiario => {
      const recente = lista.reduce((m, t) => (t.data > m.data || (t.data === m.data && t.criadaEm > m.criadaEm) ? t : m));
      const total = lista.reduce((s, t) => s + t.valor, 0);
      return {
        chave,
        nome: nomes[chave] ?? recente.descricao.trim(),
        total,
        quantidade: lista.length,
        ticketMedio: Math.round(total / lista.length),
        ultima: recente.data,
        descricaoRecente: recente.descricao,
        categoriaId: categoriaMaisFrequente(lista),
        intervaloMedio: intervaloMedio(lista.map((t) => t.data)),
        participacao: percentualDecimal(total, totalGeral),
        mesclados: (origensPor.get(chave) ?? []).sort(),
      };
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Total mensal de um beneficiário nos últimos `meses` meses (incluindo o atual). */
export function serieMensalBeneficiario(estado: AppState, chave: string, hoje: DataISO, meses = 12): { mes: Mes; total: Centavos }[] {
  const { mesclas } = dadosBeneficiarios(estado);
  const lista = Array.from({ length: meses }, (_, i) => somarMeses(mesDe(hoje), i - meses + 1));
  const totais = new Map(lista.map((m) => [m, 0]));
  for (const t of estado.transacoes) {
    if (t.tipo !== 'despesa') continue;
    const c = chaveBeneficiario(t.descricao);
    if (!c || destinoFinal(mesclas, c) !== chave) continue;
    const mes = mesDe(t.data);
    if (totais.has(mes)) totais.set(mes, (totais.get(mes) ?? 0) + t.valor);
  }
  return lista.map((mes) => ({ mes, total: totais.get(mes) ?? 0 }));
}

const comDados = (estado: AppState, dados: DadosBeneficiarios): AppState => ({ ...estado, beneficiarios: dados });

export function renomearBeneficiario(estado: AppState, chave: string, nome: string): Resultado<AppState> {
  const atual = dadosBeneficiarios(estado);
  const limpo = nome.trim();
  if (limpo.length > NOME_BENEFICIARIO_MAX) return falha(`O nome deve ter no máximo ${NOME_BENEFICIARIO_MAX} caracteres.`, 'nome');
  const nomes = { ...atual.nomes };
  if (limpo) nomes[chave] = limpo;
  else delete nomes[chave];
  return ok(comDados(estado, { ...atual, nomes }));
}

export function mesclarBeneficiario(estado: AppState, origem: string, destino: string): Resultado<AppState> {
  const atual = dadosBeneficiarios(estado);
  if (!origem || !destino) return falha('Escolha o beneficiário de destino.', 'destino');
  if (destinoFinal(atual.mesclas, destino) === origem || origem === destino) return falha('Não é possível mesclar um beneficiário nele mesmo.', 'destino');
  return ok(comDados(estado, { ...atual, mesclas: { ...atual.mesclas, [origem]: destino } }));
}

export function desfazerMescla(estado: AppState, origem: string): Resultado<AppState> {
  const atual = dadosBeneficiarios(estado);
  if (atual.mesclas[origem] === undefined) return falha('Essa mescla não existe.');
  const mesclas = { ...atual.mesclas };
  delete mesclas[origem];
  return ok(comDados(estado, { ...atual, mesclas }));
}
