import { saldoConta } from './contas';
import { marcarDuplicatas } from './csv';
import { dataValida } from './date';
import { novoId, proximoTempo } from './id';
import { comTags, DESCRICAO_MAX, validarTransacao } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Importacao, type Resultado, type TipoMovimento, type Transacao } from './types';

export const TAMANHO_MAXIMO_OFX_BYTES = 5 * 1024 * 1024;

export interface SaldoOfx {
  valor: Centavos;
  /** Data do saldo (DTASOF), quando informada e válida. */
  data: DataISO | null;
}

/** Transação lida do arquivo, ainda sem validação contra o estado do app. */
export interface LinhaOfx {
  /** Posição do lançamento no extrato (começando em 1). */
  indice: number;
  fitid?: string;
  data: DataISO | null;
  descricao: string;
  valor: Centavos;
  tipo: TipoMovimento;
  /** TRNTYPE do arquivo (DEBIT, CREDIT, ...), em maiúsculas; vazio se ausente. */
  tipoOfx: string;
  erro?: string;
}

export interface ContaOfx {
  bancoId: string;
  contaId: string;
  transacoes: LinhaOfx[];
  saldoFinal: SaldoOfx | null;
}

export interface ArquivoOfx {
  contas: ContaOfx[];
}

export function validarArquivoOfx(nome: string, tamanho: number): Resultado<void> {
  if (!/\.(ofx|qfx)$/i.test(nome)) return falha('Selecione um arquivo com extensão .ofx ou .qfx.');
  if (tamanho === 0) return falha('O arquivo está vazio.');
  if (tamanho > TAMANHO_MAXIMO_OFX_BYTES) return falha('O arquivo passa de 5 MB e não pode ser importado.');
  return ok(undefined);
}

/** Lê os bytes conforme o CHARSET do cabeçalho; sem declaração, UTF-8 e, se não for válido, Windows-1252. */
export function decodificarOfx(bytes: Uint8Array): string {
  const cabecalho = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  const declarado = /CHARSET\s*[:=]\s*"?([\w-]+)"?/i.exec(cabecalho.split(/<OFX/i)[0])?.[1]?.toLowerCase() ?? '';
  let texto: string;
  if (/1252|latin|8859/.test(declarado)) {
    texto = new TextDecoder('windows-1252').decode(bytes);
  } else {
    try {
      texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      texto = new TextDecoder('windows-1252').decode(bytes);
    }
  }
  return texto.replace(/^﻿/, '');
}

const entidades: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodificarEntidades = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, n: string) => entidades[n]);

/** Aceita AAAAMMDD, AAAAMMDDHHMMSS, AAAAMMDDHHMMSS.XXX e fuso `[-3:BRT]`; o dia vale como escrito, sem conversão de fuso. */
export function parseDataOfx(texto: string): DataISO | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:\d{2}(?:\d{2}(?:\d{2}(?:\.\d+)?)?)?)?\s*(?:\[[^\]]*\])?$/.exec(texto.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return dataValida(iso) ? iso : null;
}

/** Valor com sinal em centavos; ponto ou vírgula como decimal e o outro como milhar. */
export function parseValorOfx(texto: string): Centavos | null {
  let s = texto.trim().replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else s = s.replace(',', '.');
  const m = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const centavos = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos)) return null;
  return m[1] === '-' ? -centavos : centavos;
}

type Campos = Map<string, string>;

function descricaoDe(campos: Campos): string {
  const nome = (campos.get('NAME') ?? '').replace(/\s+/g, ' ').trim();
  const memo = (campos.get('MEMO') ?? '').replace(/\s+/g, ' ').trim();
  const junta = nome && memo && nome.toLowerCase() !== memo.toLowerCase() ? `${nome} - ${memo}` : nome || memo;
  return junta.slice(0, DESCRICAO_MAX);
}

function linhaDe(campos: Campos, indice: number): LinhaOfx {
  const tipoOfx = (campos.get('TRNTYPE') ?? '').toUpperCase();
  const linha: LinhaOfx = { indice, data: null, descricao: descricaoDe(campos), valor: 0, tipo: 'despesa', tipoOfx };
  const fitid = campos.get('FITID')?.trim();
  if (fitid) linha.fitid = fitid;
  const dataTexto = campos.get('DTPOSTED') ?? '';
  if (dataTexto) linha.data = parseDataOfx(dataTexto);
  const valorTexto = campos.get('TRNAMT') ?? '';
  const valor = valorTexto ? parseValorOfx(valorTexto) : null;
  if (valor !== null && valor !== 0) {
    linha.tipo = valor < 0 ? 'despesa' : 'receita';
    linha.valor = Math.abs(valor);
  }
  if (!dataTexto) linha.erro = 'Data ausente';
  else if (!linha.data) linha.erro = 'Data inválida';
  else if (!valorTexto) linha.erro = 'Valor ausente';
  else if (valor === null) linha.erro = 'Valor inválido';
  else if (valor === 0) linha.erro = 'Valor zero';
  return linha;
}

/**
 * Lê OFX 1.x (SGML, sem fechamento das tags de dados) e 2.x (XML). Os dois formatos são percorridos como
 * uma sequência de tags: só os agregados STMTRS, STMTTRN e LEDGERBAL têm fechamento garantido nos dois.
 */
export function parseOfx(texto: string): Resultado<ArquivoOfx> {
  const inicio = texto.search(/<OFX[\s>]/i);
  if (inicio < 0) return falha('Arquivo inválido: não encontrei o bloco <OFX>. Confira se é um extrato OFX ou QFX.');
  const corpo = texto.slice(inicio).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c: string) => c.replace(/</g, '&lt;'));

  const contas: ContaOfx[] = [];
  let conta: ContaOfx | null = null;
  let transacao: Campos | null = null;
  let saldo: Campos | null = null;
  let cabecalhoConta: Campos = new Map();

  const fecharSaldo = () => {
    if (!conta || !saldo) return;
    const valor = parseValorOfx(saldo.get('BALAMT') ?? '');
    if (valor !== null) conta.saldoFinal = { valor, data: parseDataOfx(saldo.get('DTASOF') ?? '') };
    saldo = null;
  };

  for (const [, fecha, nome, resto] of corpo.matchAll(/<(\/?)([A-Za-z][\w.]*)[^>]*>([^<]*)/g)) {
    const tag = nome.toUpperCase();
    if (fecha) {
      if (tag === 'STMTTRN' && conta && transacao) {
        conta.transacoes.push(linhaDe(transacao, conta.transacoes.length + 1));
        transacao = null;
      } else if (tag === 'LEDGERBAL') fecharSaldo();
      else if (tag === 'STMTRS') {
        fecharSaldo();
        conta = null;
      }
      continue;
    }
    if (tag === 'STMTRS') {
      cabecalhoConta = new Map();
      conta = { bancoId: '', contaId: '', transacoes: [], saldoFinal: null };
      contas.push(conta);
    } else if (tag === 'STMTTRN') {
      if (conta && transacao) conta.transacoes.push(linhaDe(transacao, conta.transacoes.length + 1));
      transacao = new Map();
    } else if (tag === 'LEDGERBAL') saldo = new Map();
    else if (conta) {
      const valor = decodificarEntidades(resto).trim();
      if (valor === '') continue;
      if (transacao) transacao.set(tag, valor);
      else if (saldo) saldo.set(tag, valor);
      else {
        cabecalhoConta.set(tag, valor);
        conta.bancoId = cabecalhoConta.get('BANKID') ?? '';
        conta.contaId = cabecalhoConta.get('ACCTID') ?? '';
      }
    }
  }
  // SGML sem fechamento do último agregado: descarrega o que ficou aberto.
  if (conta && transacao) (conta as ContaOfx).transacoes.push(linhaDe(transacao, (conta as ContaOfx).transacoes.length + 1));
  fecharSaldo();

  if (contas.length === 0 || contas.every((c) => c.transacoes.length === 0)) {
    return falha('Arquivo inválido: nenhum lançamento (STMTTRN) de extrato bancário foi encontrado.');
  }
  return ok({ contas });
}

export type OrigemDuplicata = 'fitid' | 'dados';

/** FITID já gravado em transação da conta tem prioridade; senão vale a regra data + valor + descrição do CSV. */
export function marcarDuplicatasOfx(linhas: LinhaOfx[], estado: AppState, contaId: string): Map<number, OrigemDuplicata> {
  const fitids = new Set(estado.transacoes.filter((t) => t.contaId === contaId && t.fitid).map((t) => t.fitid));
  const resultado = new Map<number, OrigemDuplicata>();
  for (const i of marcarDuplicatas(linhas, estado, contaId)) resultado.set(i, 'dados');
  for (const l of linhas) if (!l.erro && l.fitid && fitids.has(l.fitid)) resultado.set(l.indice, 'fitid');
  return resultado;
}

export interface ItemOfx {
  data: DataISO;
  descricao: string;
  valor: Centavos;
  tipo: TipoMovimento;
  categoriaId: string;
  tags?: string[];
  fitid?: string;
}

/** Grava todos os itens de uma vez ou nenhum, guardando o FITID e ligando tudo a uma importação desfazível. */
export function importarOfx(estado: AppState, contaId: string, itens: ItemOfx[], hoje: DataISO): Resultado<{ estado: AppState; importacao: Importacao }> {
  if (itens.length === 0) return falha('Nenhuma linha selecionada para importar.');
  const importacaoId = novoId();
  const novas: Transacao[] = [];
  for (const { fitid, ...item } of itens) {
    const v = validarTransacao(estado, { contaId, ...item });
    if (!v.ok) return falha(`Linha de ${item.data} ("${item.descricao}"): ${v.erro}`);
    novas.push(comTags({ ...v.valor, id: novoId(), criadaEm: proximoTempo(), importacaoId, ...(fitid ? { fitid } : {}) }));
  }
  const importacao: Importacao = { id: importacaoId, data: hoje, contaId, transacaoIds: novas.map((t) => t.id) };
  return ok({
    importacao,
    estado: { ...estado, transacoes: [...estado.transacoes, ...novas], importacoes: [...estado.importacoes, importacao] },
  });
}

export type ConferenciaSaldo =
  | { situacao: 'indisponivel' }
  | { situacao: 'conferido'; esperado: Centavos; calculado: Centavos }
  | { situacao: 'divergente'; esperado: Centavos; calculado: Centavos; diferenca: Centavos };

/** Compara o LEDGERBAL do arquivo com o saldo calculado da conta; só informa, nunca ajusta. */
export function conferirSaldo(estado: AppState, contaId: string, saldoFinal: SaldoOfx | null): ConferenciaSaldo {
  if (!saldoFinal) return { situacao: 'indisponivel' };
  const calculado = saldoConta(estado, contaId);
  if (calculado === saldoFinal.valor) return { situacao: 'conferido', esperado: saldoFinal.valor, calculado };
  return { situacao: 'divergente', esperado: saldoFinal.valor, calculado, diferenca: calculado - saldoFinal.valor };
}
