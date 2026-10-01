import { categoriasPadrao } from '../data/categoriasPadrao';
import { falha, ok, type AppState, type Resultado } from '../domain/types';

/** Toda chave escrita pelo app começa com este prefixo. */
export const PREFIXO = 'financas:';
export const CHAVE_ESTADO = `${PREFIXO}estado`;
export const SCHEMA_ATUAL = 2;

export function estadoInicial(): AppState {
  return {
    schemaVersion: SCHEMA_ATUAL,
    contas: [],
    categorias: categoriasPadrao(),
    transacoes: [],
    orcamentos: [],
    metas: [],
    recorrencias: [],
    mapeamentosCsv: {},
    importacoes: [],
    pagamentosFatura: [],
    agenda: [],
    regras: [],
    investimentos: [],
    dividas: [],
    rolloverCategorias: [],
  };
}

export type Carga =
  | { tipo: 'ok'; estado: AppState }
  | { tipo: 'corrompido'; bruto: string }
  | { tipo: 'versao-futura'; bruto: string; versao: number };

type Dados = Record<string, unknown>;

/** Migrações indexadas pela versão de origem: `migracoes[n]` leva de n para n+1. */
const migracoes: Record<number, (dados: Dados) => Dados> = {
  0: (dados) => ({
    ...dados,
    schemaVersion: 1,
    contas: dados.contas ?? [],
    categorias: dados.categorias ?? categoriasPadrao(),
    transacoes: dados.transacoes ?? [],
    orcamentos: dados.orcamentos ?? [],
    metas: dados.metas ?? [],
    recorrencias: dados.recorrencias ?? [],
    mapeamentosCsv: dados.mapeamentosCsv ?? {},
    importacoes: dados.importacoes ?? [],
  }),
  // v2: pagamentos de fatura de cartão.
  1: (dados) => ({ ...dados, schemaVersion: 2, pagamentosFatura: dados.pagamentosFatura ?? [] }),
};

const CHAVES_LISTA = ['contas', 'categorias', 'transacoes', 'orcamentos', 'metas', 'recorrencias', 'importacoes', 'pagamentosFatura'] as const;

function ehObjeto(x: unknown): x is Dados {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function estruturaValida(dados: Dados): boolean {
  return (
    CHAVES_LISTA.every((k) => Array.isArray(dados[k])) &&
    ehObjeto(dados.mapeamentosCsv) &&
    dados.schemaVersion === SCHEMA_ATUAL
  );
}

/** Migra um objeto qualquer até a versão atual. Versões futuras são recusadas. */
export function migrar(bruto: unknown): { tipo: 'ok'; estado: AppState } | { tipo: 'corrompido' } | { tipo: 'versao-futura'; versao: number } {
  if (!ehObjeto(bruto)) return { tipo: 'corrompido' };
  let dados: Dados = bruto;
  const versaoLida = dados.schemaVersion === undefined ? 0 : dados.schemaVersion;
  if (typeof versaoLida !== 'number' || !Number.isInteger(versaoLida) || versaoLida < 0) {
    return { tipo: 'corrompido' };
  }
  if (versaoLida > SCHEMA_ATUAL) return { tipo: 'versao-futura', versao: versaoLida };
  if (versaoLida === 0 && !CHAVES_LISTA.some((k) => k in dados)) return { tipo: 'corrompido' };
  for (let v = versaoLida; v < SCHEMA_ATUAL; v++) {
    const migracao = migracoes[v];
    if (!migracao) return { tipo: 'corrompido' };
    dados = migracao(dados);
  }
  // Chaves aditivas (novos módulos) ausentes em dados antigos recebem o valor inicial, sem migração.
  const padrao = estadoInicial() as unknown as Dados;
  for (const chave of Object.keys(padrao)) if (dados[chave] === undefined) dados = { ...dados, [chave]: padrao[chave] };
  if (!estruturaValida(dados)) return { tipo: 'corrompido' };
  return { tipo: 'ok', estado: dados as unknown as AppState };
}

export function carregar(storage: Storage): Carga {
  let bruto: string | null;
  try {
    bruto = storage.getItem(CHAVE_ESTADO);
  } catch {
    return { tipo: 'ok', estado: estadoInicial() };
  }
  if (bruto === null) return { tipo: 'ok', estado: estadoInicial() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(bruto);
  } catch {
    return { tipo: 'corrompido', bruto };
  }
  const r = migrar(parsed);
  if (r.tipo === 'ok') return r;
  if (r.tipo === 'versao-futura') return { tipo: 'versao-futura', bruto, versao: r.versao };
  return { tipo: 'corrompido', bruto };
}

/** Lança se o navegador recusar a gravação (cota excedida, armazenamento bloqueado). */
export function salvar(estado: AppState, storage: Storage): void {
  storage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
}

export function apagarTudo(storage: Storage): void {
  const chaves: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const chave = storage.key(i);
    if (chave?.startsWith(PREFIXO)) chaves.push(chave);
  }
  chaves.forEach((c) => storage.removeItem(c));
}

export function exportarJson(estado: AppState): string {
  return JSON.stringify(estado, null, 2);
}

/** Lê um arquivo de exportação, migrando se necessário. */
export function importarJson(texto: string): Resultado<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(texto);
  } catch {
    return falha('O arquivo não é um JSON válido.');
  }
  const r = migrar(parsed);
  if (r.tipo === 'ok') return ok(r.estado);
  if (r.tipo === 'versao-futura') {
    return falha(`O arquivo foi gerado por uma versão mais nova do app (esquema ${r.versao}).`);
  }
  return falha('O arquivo não parece ser uma exportação deste app.');
}
