import { ordenarContas } from './contas';
import { sugerirCategoria, sugerirTags } from './csv';
import { dataValida, diaDaSemana, somarDias } from './date';
import { parseValor } from './money';
import { normalizarTag } from './tags';
import { normalizarTexto, type DadosTransacao } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado, type TipoMovimento } from './types';

export interface Interpretacao {
  tipo: TipoMovimento;
  valor: Centavos;
  data: DataISO;
  contaId: string;
  categoriaId: string;
  tags: string[];
  descricao: string;
}

const PALAVRAS_RECEITA = new Set(['recebi', 'receita']);

/** Dias da semana como `Date.getDay()` (0 = domingo), sem acento e sem "-feira". */
const DIAS_SEMANA: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

/** Interpreta um termo de data; `undefined` se o termo não é de data, `null` se parece data mas é inválido. */
export function lerData(termo: string, hoje: DataISO): DataISO | null | undefined {
  const t = normalizarTexto(termo).replace(/-feira$/, '');
  if (t === 'hoje') return hoje;
  if (t === 'ontem') return somarDias(hoje, -1);
  if (t === 'anteontem') return somarDias(hoje, -2);
  if (t in DIAS_SEMANA) {
    const atras = (diaDaSemana(hoje) - DIAS_SEMANA[t] + 7) % 7;
    return somarDias(hoje, -atras);
  }
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(t);
  if (!m) return undefined;
  const ano = m[3] === undefined ? hoje.slice(0, 4) : m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return dataValida(iso) ? iso : null;
}

/** Procura a sequência de palavras `alvo` em `palavras` a partir de posições livres; devolve o índice inicial. */
function acharSequencia(palavras: string[], livres: boolean[], alvo: string[]): number {
  for (let i = 0; i + alvo.length <= palavras.length; i++) {
    if (alvo.every((p, k) => livres[i + k] && palavras[i + k] === p)) return i;
  }
  return -1;
}

/** Conta usada quando o texto não diz qual: a da transação mais recente, senão a primeira ativa que não é cartão. */
export function contaPadrao(estado: AppState): string | undefined {
  const ativas = new Set(estado.contas.filter((c) => !c.arquivada).map((c) => c.id));
  const recente = estado.transacoes.filter((t) => ativas.has(t.contaId)).reduce<(typeof estado.transacoes)[number] | undefined>((m, t) => (!m || t.criadaEm > m.criadaEm ? t : m), undefined);
  if (recente) return recente.contaId;
  return ordenarContas(estado.contas.filter((c) => !c.arquivada && c.tipo !== 'cartao'))[0]?.id;
}

/** Interpreta a frase de lançamento rápido. Não grava nada. */
export function interpretar(texto: string, estado: AppState, hoje: DataISO): Resultado<Interpretacao> {
  const termos = texto.trim().split(/\s+/).filter(Boolean);
  if (termos.length === 0) return falha('Digite o lançamento.');
  const normalizados = termos.map((t) => normalizarTexto(t));
  const livres = termos.map(() => true);
  const usar = (i: number, n = 1) => {
    for (let k = i; k < i + n; k++) livres[k] = false;
  };

  let tipo: TipoMovimento = 'despesa';
  let valor: Centavos | null = null;
  let data: DataISO = hoje;
  let contaId: string | undefined;
  let categoriaNome: string | undefined;
  const tags: string[] = [];

  for (let i = 0; i < termos.length; i++) {
    const termo = termos[i];
    const norm = normalizados[i];
    if (PALAVRAS_RECEITA.has(norm)) {
      tipo = 'receita';
      usar(i);
    } else if (termo.startsWith('#') && termo.length > 1) {
      tags.push(normalizarTag(termo.slice(1)));
      usar(i);
    } else if (termo.startsWith('@') && termo.length > 1) {
      const nome = normalizarTexto(termo.slice(1));
      const conta = estado.contas.find((c) => !c.arquivada && normalizarTexto(c.nome).replace(/\s+/g, '') === nome.replace(/\s+/g, ''));
      if (!conta) return falha(`Conta "${termo.slice(1)}" não encontrada.`, 'contaId');
      contaId = conta.id;
      usar(i);
    } else if (termo.startsWith('/') && termo.length > 1) {
      categoriaNome = termo.slice(1);
      usar(i);
    } else if (norm === 'r$') {
      usar(i);
    } else if (valor === null && /\d/.test(termo) && !termo.includes('/') && parseValor(termo) !== null) {
      const v = parseValor(termo)!;
      if (termo.startsWith('+')) tipo = 'receita';
      valor = Math.abs(v);
      usar(i);
    } else {
      const d = lerData(termo, hoje);
      if (d === null) return falha(`Data "${termo}" inválida.`, 'data');
      if (d !== undefined) {
        data = d;
        usar(i);
      }
    }
  }
  if (valor === null || valor === 0) return falha('Informe o valor.', 'valor');

  if (contaId === undefined) {
    // Nome de conta escrito por inteiro no meio da frase; o mais longo vence.
    const candidatas = estado.contas
      .filter((c) => !c.arquivada)
      .map((c) => ({ c, palavras: normalizarTexto(c.nome).split(' ') }))
      .sort((a, b) => b.palavras.length - a.palavras.length);
    for (const { c, palavras } of candidatas) {
      const i = acharSequencia(normalizados, livres, palavras);
      if (i >= 0) {
        contaId = c.id;
        usar(i, palavras.length);
        break;
      }
    }
  }
  contaId ??= contaPadrao(estado);
  if (!contaId) return falha('Cadastre uma conta antes de lançar.', 'contaId');

  const descricao = termos.filter((_, i) => livres[i]).join(' ');

  let categoriaId: string | undefined;
  if (categoriaNome !== undefined) {
    const alvo = normalizarTexto(categoriaNome);
    categoriaId = estado.categorias.find((c) => !c.arquivada && c.tipo === tipo && normalizarTexto(c.nome) === alvo)?.id;
    if (!categoriaId) return falha(`Categoria "${categoriaNome}" de ${tipo} não encontrada.`, 'categoriaId');
  } else {
    categoriaId = sugerirCategoria(estado, descricao, tipo);
    if (!categoriaId) return falha(`Não há categoria de ${tipo} ativa.`, 'categoriaId');
  }

  const todasTags = [...new Set([...tags.filter(Boolean), ...sugerirTags(estado, descricao, tipo)])];
  return ok({ tipo, valor, data, contaId, categoriaId, tags: todasTags, descricao });
}

export function paraDadosTransacao(i: Interpretacao): DadosTransacao {
  return { contaId: i.contaId, categoriaId: i.categoriaId, tipo: i.tipo, valor: i.valor, data: i.data, descricao: i.descricao, tags: i.tags };
}
