import type { Centavos } from './types';
import type { Comparativo, RelatorioAnual, RelatorioMensal, RelatorioPorCategoria } from './relatorios';

/** Decimal com vírgula e sem separador de milhar, como planilhas em pt-BR esperam. */
export function numeroCsv(centavos: Centavos): string {
  const abs = Math.abs(centavos);
  return `${centavos < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function percentualCsv(valor: number | null): string {
  return valor === null ? '' : String(valor).replace('.', ',');
}

/** Campos com `;`, aspas ou quebra de linha vão entre aspas, com as aspas internas dobradas. */
export function escaparCampoCsv(campo: string): string {
  return /[;"\r\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo;
}

/** Texto CSV com BOM UTF-8 (para o Excel reconhecer acentos) e separador `;`. */
export function gerarCsv(linhas: string[][]): string {
  return `﻿${linhas.map((l) => l.map(escaparCampoCsv).join(';')).join('\r\n')}\r\n`;
}

export function nomeArquivoRelatorio(tipo: string, periodo: string): string {
  return `relatorio-${tipo}-${periodo}.csv`;
}

export function csvMensal(r: RelatorioMensal): string[][] {
  const bloco = (titulo: string, quebra: RelatorioMensal['despesasPorCategoria']): string[][] => [
    [titulo, 'Valor', '% do total'],
    ...quebra.linhas.map((l) => [l.nome, numeroCsv(l.valor), percentualCsv(l.percentual)]),
    ['Total', numeroCsv(quebra.total), ''],
  ];
  return [
    ['Relatório mensal', r.mes],
    ['Receitas', numeroCsv(r.receitas)],
    ['Despesas', numeroCsv(r.despesas)],
    ['Resultado', numeroCsv(r.resultado)],
    ['Taxa de poupança (%)', percentualCsv(r.taxaPoupanca)],
    [],
    ...bloco('Despesas por categoria', r.despesasPorCategoria),
    [],
    ...bloco('Receitas por categoria', r.receitasPorCategoria),
  ];
}

export function csvAnual(r: RelatorioAnual): string[][] {
  return [
    ['Mês', 'Receitas', 'Despesas', 'Resultado'],
    ...r.linhas.map((l) => [l.mes, numeroCsv(l.receitas), numeroCsv(l.despesas), numeroCsv(l.resultado)]),
    ['Total', numeroCsv(r.receitas), numeroCsv(r.despesas), numeroCsv(r.resultado)],
    ['Média mensal', numeroCsv(r.mediaReceitas), numeroCsv(r.mediaDespesas), numeroCsv(r.mediaResultado)],
  ];
}

export function csvPorCategoria(r: RelatorioPorCategoria): string[][] {
  return [
    ['Categoria', 'Total', 'Quantidade', 'Valor médio'],
    ...r.linhas.map((l) => [l.nome, numeroCsv(l.total), String(l.quantidade), numeroCsv(l.medio)]),
    ['Total', numeroCsv(r.total), String(r.quantidade), ''],
  ];
}

export function csvComparativo(c: Comparativo): string[][] {
  return [
    ['Categoria', c.base, c.comparado, 'Diferença', 'Variação (%)'],
    ...c.linhas.map((l) => [l.nome, numeroCsv(l.valorBase), numeroCsv(l.valorComparado), numeroCsv(l.diferenca), percentualCsv(l.variacao)]),
    [],
    ['Totais', c.base, c.comparado, 'Diferença'],
    ['Receitas', numeroCsv(c.totaisBase.receitas), numeroCsv(c.totaisComparado.receitas), numeroCsv(c.diferencas.receitas)],
    ['Despesas', numeroCsv(c.totaisBase.despesas), numeroCsv(c.totaisComparado.despesas), numeroCsv(c.diferencas.despesas)],
    ['Resultado', numeroCsv(c.totaisBase.resultado), numeroCsv(c.totaisComparado.resultado), numeroCsv(c.diferencas.resultado)],
  ];
}
