import { ID_OUTROS_DESPESA, ID_OUTROS_RECEITA } from '../data/categoriasPadrao';
import { efeitoTransacao } from './contas';
import { dataValida } from './date';
import { novoId, proximoTempo } from './id';
import { primeiraRegra } from './regras';
import { parseValor } from './money';
import { comTags, DESCRICAO_MAX, normalizarTexto, validarTransacao } from './transacoes';
import {
  falha,
  ok,
  type AppState,
  type Centavos,
  type DataISO,
  type FormatoData,
  type Importacao,
  type MapeamentoCsv,
  type Resultado,
  type TipoMovimento,
  type Transacao,
} from './types';

export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const FORMATOS_DATA: FormatoData[] = ['dd/mm/aaaa', 'aaaa-mm-dd', 'dd-mm-aaaa'];

export function validarArquivo(nome: string, tamanho: number): Resultado<void> {
  if (!/\.csv$/i.test(nome)) return falha('Selecione um arquivo com extensão .csv.');
  if (tamanho > TAMANHO_MAXIMO_BYTES) return falha('O arquivo passa de 5 MB e não pode ser importado.');
  return ok(undefined);
}

/** Lê os bytes como UTF-8 e, se não forem válidos, como Windows-1252 (comum em bancos brasileiros). */
export function decodificar(bytes: Uint8Array): string {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder('windows-1252').decode(bytes);
  }
  return texto.replace(/^﻿/, '');
}

export type Separador = ',' | ';';

/** Escolhe entre `,` e `;` pela primeira linha, ignorando o que estiver entre aspas. */
export function detectarSeparador(texto: string): Separador {
  let virgulas = 0;
  let pontoEVirgulas = 0;
  let dentro = false;
  for (const c of texto) {
    if (c === '"') dentro = !dentro;
    else if (!dentro && (c === '\n' || c === '\r')) break;
    else if (!dentro && c === ',') virgulas++;
    else if (!dentro && c === ';') pontoEVirgulas++;
  }
  return pontoEVirgulas > 0 && pontoEVirgulas >= virgulas ? ';' : ',';
}

/** Parser de CSV com campos entre aspas, aspas escapadas ("") e quebras de linha dentro de campo. */
export function parseCsv(texto: string, separador: Separador = detectarSeparador(texto)): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let dentro = false;
  let temConteudo = false;

  const fecharCampo = () => {
    linha.push(campo);
    campo = '';
  };
  const fecharLinha = () => {
    fecharCampo();
    if (temConteudo || linha.some((c) => c.trim() !== '')) linhas.push(linha);
    linha = [];
    temConteudo = false;
  };

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentro = false;
      } else campo += c;
    } else if (c === '"') {
      dentro = true;
      temConteudo = true;
    } else if (c === separador) {
      fecharCampo();
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fecharLinha();
    } else campo += c;
  }
  if (campo !== '' || linha.length > 0 || temConteudo) fecharLinha();
  return linhas;
}

const padroesData: Record<FormatoData, RegExp> = {
  'dd/mm/aaaa': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'aaaa-mm-dd': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  'dd-mm-aaaa': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
};

/** Converte no formato escolhido; devolve null se o texto não bater com ele ou a data não existir. */
export function parseData(texto: string, formato: FormatoData): DataISO | null {
  const m = padroesData[formato].exec(texto.trim());
  if (!m) return null;
  const [ano, mes, dia] = formato === 'aaaa-mm-dd' ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const iso = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  return dataValida(iso) ? iso : null;
}

/** Primeiro formato em que todas as amostras não vazias são datas válidas. */
export function detectarFormatoData(amostras: string[]): FormatoData | null {
  const textos = amostras.map((a) => a.trim()).filter(Boolean);
  if (textos.length === 0) return null;
  return FORMATOS_DATA.find((f) => textos.every((t) => parseData(t, f) !== null)) ?? null;
}

/** Valor com sinal; parênteses indicam negativo (`(50,00)`). */
export function parseValorCsv(texto: string): Centavos | null {
  const limpo = texto.trim();
  const parenteses = /^\(.*\)$/.test(limpo);
  const valor = parseValor(parenteses ? limpo.slice(1, -1) : limpo);
  if (valor === null) return null;
  return parenteses ? -Math.abs(valor) : valor;
}

const cabecalhoContem = (cab: string, ...termos: string[]) => termos.some((t) => normalizarTexto(cab).includes(t));

/** Sugere o mapeamento a partir do cabeçalho e dos dados; o usuário pode ajustar. */
export function adivinharMapeamento(linhas: string[][]): MapeamentoCsv {
  const primeira = linhas[0] ?? [];
  const colunas = Math.max(...linhas.map((l) => l.length), 0);
  const achar = (...termos: string[]) => {
    const i = primeira.findIndex((c) => cabecalhoContem(c, ...termos));
    return i >= 0 ? i : null;
  };
  const colData = achar('data');
  const temCabecalho = colData !== null || achar('descri', 'historico', 'valor') !== null;
  const dados = temCabecalho ? linhas.slice(1) : linhas;
  const credito = achar('credito', 'entrada');
  const debito = achar('debito', 'saida');
  const valor = achar('valor', 'quantia');
  const usaDuasColunas = valor === null && credito !== null && debito !== null;
  const data = colData ?? 0;
  const descricao = achar('descri', 'historico', 'lancamento', 'estabelecimento') ?? Math.min(1, Math.max(colunas - 1, 0));
  const formatoData = detectarFormatoData(dados.map((l) => l[data] ?? '')) ?? 'dd/mm/aaaa';
  return {
    colData: data,
    colDescricao: descricao,
    colValor: usaDuasColunas ? null : (valor ?? Math.min(2, Math.max(colunas - 1, 0))),
    colCredito: usaDuasColunas ? credito : null,
    colDebito: usaDuasColunas ? debito : null,
    formatoData,
    temCabecalho,
  };
}

export interface LinhaInterpretada {
  /** Posição da linha no arquivo (começando em 1), para exibir ao usuário. */
  indice: number;
  data: DataISO | null;
  descricao: string;
  valor: Centavos;
  tipo: TipoMovimento;
  erro?: string;
}

export function interpretarLinhas(linhas: string[][], m: MapeamentoCsv): LinhaInterpretada[] {
  const resultado: LinhaInterpretada[] = [];
  linhas.forEach((celulas, posicao) => {
    if (m.temCabecalho && posicao === 0) return;
    const celula = (i: number | null) => (i === null ? '' : (celulas[i] ?? '').trim());
    const dataTexto = celula(m.colData);
    const data = dataTexto ? parseData(dataTexto, m.formatoData) : null;
    const descricao = celula(m.colDescricao).replace(/\s+/g, ' ').slice(0, DESCRICAO_MAX);
    const linha: LinhaInterpretada = { indice: posicao + 1, data, descricao, valor: 0, tipo: 'despesa' };

    let erroValor: string | undefined;
    if (m.colValor !== null) {
      const texto = celula(m.colValor);
      const v = texto === '' ? null : parseValorCsv(texto);
      if (texto === '') erroValor = 'Valor ausente';
      else if (v === null) erroValor = 'Valor inválido';
      else if (v === 0) erroValor = 'Valor zero';
      else {
        linha.tipo = v < 0 ? 'despesa' : 'receita';
        linha.valor = Math.abs(v);
      }
    } else {
      const deb = celula(m.colDebito) === '' ? 0 : parseValorCsv(celula(m.colDebito));
      const cred = celula(m.colCredito) === '' ? 0 : parseValorCsv(celula(m.colCredito));
      if (deb === null || cred === null) erroValor = 'Valor inválido';
      else if (deb !== 0 && cred !== 0) erroValor = 'Crédito e débito preenchidos na mesma linha';
      else if (deb === 0 && cred === 0) erroValor = 'Valor ausente';
      else if (deb !== 0) {
        linha.tipo = 'despesa';
        linha.valor = Math.abs(deb);
      } else {
        linha.tipo = 'receita';
        linha.valor = Math.abs(cred as number);
      }
    }

    if (!dataTexto) linha.erro = 'Data ausente';
    else if (!data) linha.erro = 'Data inválida para o formato escolhido';
    else if (erroValor) linha.erro = erroValor;
    resultado.push(linha);
  });
  return resultado;
}

const chaveDuplicata = (data: string, efeito: Centavos, descricao: string) => `${data}|${efeito}|${normalizarTexto(descricao)}`;

/** Mesma conta, mesma data, mesmo valor e mesma descrição normalizada. */
export function marcarDuplicatas(linhas: LinhaInterpretada[], estado: AppState, contaId: string): Set<number> {
  const existentes = new Set(estado.transacoes.filter((t) => t.contaId === contaId).map((t) => chaveDuplicata(t.data, efeitoTransacao(t), t.descricao)));
  const duplicadas = new Set<number>();
  for (const l of linhas) {
    if (l.erro || !l.data) continue;
    const efeito = l.tipo === 'receita' ? l.valor : -l.valor;
    if (existentes.has(chaveDuplicata(l.data, efeito, l.descricao))) duplicadas.add(l.indice);
  }
  return duplicadas;
}

/** Tags da primeira regra ativa que casa com a linha (vazio se nenhuma casar). */
export function sugerirTags(estado: AppState, descricao: string, tipo: TipoMovimento): string[] {
  return primeiraRegra(estado, descricao, tipo)?.tags ?? [];
}

/**
 * Sugere a categoria da primeira regra ativa que casar; senão reutiliza a categoria de uma transação anterior com a mesma descrição normalizada;
 * sem histórico, usa "Outros" do tipo correspondente.
 */
export function sugerirCategoria(estado: AppState, descricao: string, tipo: TipoMovimento): string | undefined {
  const regra = primeiraRegra(estado, descricao, tipo);
  if (regra) return regra.categoriaId;
  const ativas = new Map(estado.categorias.filter((c) => !c.arquivada && c.tipo === tipo).map((c) => [c.id, c]));
  const alvo = normalizarTexto(descricao);
  if (alvo) {
    let melhor: Transacao | undefined;
    for (const t of estado.transacoes) {
      if (t.tipo === tipo && ativas.has(t.categoriaId) && normalizarTexto(t.descricao) === alvo && (!melhor || t.criadaEm > melhor.criadaEm)) melhor = t;
    }
    if (melhor) return melhor.categoriaId;
  }
  const idOutros = tipo === 'despesa' ? ID_OUTROS_DESPESA : ID_OUTROS_RECEITA;
  if (ativas.has(idOutros)) return idOutros;
  const porNome = [...ativas.values()].find((c) => normalizarTexto(c.nome) === 'outros');
  return (porNome ?? [...ativas.values()][0])?.id;
}

export interface ItemImportacao {
  data: DataISO;
  descricao: string;
  valor: Centavos;
  tipo: TipoMovimento;
  categoriaId: string;
  tags?: string[];
}

/** Grava todos os itens de uma vez ou nenhum: qualquer item inválido cancela a importação inteira. */
export function importarTransacoes(
  estado: AppState,
  contaId: string,
  itens: ItemImportacao[],
  mapeamento: MapeamentoCsv,
  hoje: DataISO,
): Resultado<{ estado: AppState; importacao: Importacao }> {
  if (itens.length === 0) return falha('Nenhuma linha selecionada para importar.');
  const importacaoId = novoId();
  const novas: Transacao[] = [];
  for (const item of itens) {
    const v = validarTransacao(estado, { contaId, ...item });
    if (!v.ok) return falha(`Linha de ${item.data} ("${item.descricao}"): ${v.erro}`);
    novas.push(comTags({ ...v.valor, id: novoId(), criadaEm: proximoTempo(), importacaoId }));
  }
  const importacao: Importacao = { id: importacaoId, data: hoje, contaId, transacaoIds: novas.map((t) => t.id) };
  return ok({
    importacao,
    estado: {
      ...estado,
      transacoes: [...estado.transacoes, ...novas],
      importacoes: [...estado.importacoes, importacao],
      mapeamentosCsv: { ...estado.mapeamentosCsv, [contaId]: mapeamento },
    },
  });
}

/** Remove exatamente as transações criadas pela importação. */
export function desfazerImportacao(estado: AppState, importacaoId: string): Resultado<AppState> {
  const importacao = estado.importacoes.find((i) => i.id === importacaoId);
  if (!importacao) return falha('Importação não encontrada.');
  const ids = new Set(importacao.transacaoIds);
  return ok({
    ...estado,
    transacoes: estado.transacoes.filter((t) => !ids.has(t.id)),
    importacoes: estado.importacoes.filter((i) => i.id !== importacaoId),
  });
}
