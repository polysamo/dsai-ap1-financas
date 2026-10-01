import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gerarExemplo } from '../data/exemplo';
import { criarCompraParcelada, registrarPagamento } from '../domain/cartoes';
import { hojeISO, mesDe, nomeMes, somarMeses } from '../domain/date';
import { csvAnual, csvComparativo, csvMensal, csvPorCategoria, escaparCampoCsv, gerarCsv, nomeArquivoRelatorio, numeroCsv, percentualCsv } from '../domain/exportacao';
import { comparativoMeses, percentualDecimal, relatorioAnual, relatorioMensal, relatorioPorCategoria, validarPeriodo } from '../domain/relatorios';
import { resumoMes } from '../domain/projecao';
import type { AppState, Conta, Transacao } from '../domain/types';
import { baixarArquivo } from '../lib/download';
import { construirEstado, renderizarApp } from './helpers';

vi.mock('../lib/download', async (original) => ({
  ...(await original<typeof import('../lib/download')>()),
  baixarArquivo: vi.fn(),
}));

const conta = (id: string, parcial: Partial<Conta> = {}): Conta => ({ id, nome: id, tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1, ...parcial });

let seq = 0;
const t = (parcial: Partial<Transacao>): Transacao => {
  seq += 1;
  return { id: `t${seq}`, contaId: 'a', categoriaId: 'cat-moradia', tipo: 'despesa', valor: 100, data: '2026-09-10', descricao: 'x', criadaEm: seq, ...parcial };
};

const estado = (transacoes: Transacao[]): AppState => construirEstado({ contas: [conta('a'), conta('b')], transacoes });

const set = estado([
  t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 500000, data: '2026-09-05' }),
  t({ categoriaId: 'cat-moradia', valor: 150000, data: '2026-09-06' }),
  t({ categoriaId: 'cat-alimentacao', valor: 50000, data: '2026-09-07' }),
  t({ categoriaId: 'cat-alimentacao', valor: 30001, data: '2026-09-27', contaId: 'b' }),
  t({ categoriaId: 'cat-lazer', valor: 20000, data: '2026-08-02' }),
  t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 400000, data: '2026-08-05' }),
  t({ categoriaId: 'cat-moradia', valor: 150000, data: '2026-08-10' }),
  t({ categoriaId: 'cat-saude', valor: 9999, data: '2025-12-31' }),
]);

describe('relatórios: mensal (critérios 2, 3)', () => {
  const r = relatorioMensal(set, '2026-09');

  it('critério 2: receitas, despesas, resultado e taxa de poupança', () => {
    expect(r).toMatchObject({ receitas: 500000, despesas: 230001, resultado: 269999, quantidade: 4 });
    expect(r.taxaPoupanca).toBe(54);
    expect(r.despesas).toBe(resumoMes(set.transacoes, '2026-09').despesas);
    expect(r.receitas).toBe(resumoMes(set.transacoes, '2026-09').receitas);
  });

  it('critério 2: sem receitas a taxa é nula, e o mês vazio zera tudo', () => {
    expect(relatorioMensal(estado([t({ valor: 100 })]), '2026-09').taxaPoupanca).toBeNull();
    expect(relatorioMensal(set, '2020-01')).toMatchObject({ receitas: 0, despesas: 0, resultado: 0, quantidade: 0, taxaPoupanca: null });
  });

  it('critério 3: categorias em ordem decrescente, com percentual e soma exata', () => {
    const { linhas, total } = r.despesasPorCategoria;
    expect(linhas.map((l) => l.nome)).toEqual(['Moradia', 'Alimentação']);
    expect(linhas.map((l) => l.valor)).toEqual([150000, 80001]);
    expect(linhas.map((l) => l.percentual)).toEqual([65.2, 34.8]);
    expect(linhas.reduce((s, l) => s + l.valor, 0)).toBe(total);
    expect(total).toBe(r.despesas);
    expect(r.receitasPorCategoria.linhas).toHaveLength(1);
  });

  it('percentualDecimal arredonda a uma casa e trata total zero', () => {
    expect(percentualDecimal(1, 3)).toBe(33.3);
    expect(percentualDecimal(2, 3)).toBe(66.7);
    expect(percentualDecimal(5, 0)).toBeNull();
  });
});

describe('relatórios: anual (critérios 4, 5)', () => {
  const r = relatorioAnual(set.transacoes, 2026);

  it('critério 4: 12 linhas, total do ano e média só dos meses com movimento', () => {
    expect(r.linhas).toHaveLength(12);
    expect(r.linhas[0].mes).toBe('2026-01');
    expect(r.linhas[8]).toMatchObject({ mes: '2026-09', receitas: 500000, despesas: 230001 });
    expect(r.receitas).toBe(900000);
    expect(r.despesas).toBe(400001);
    expect(r.resultado).toBe(499999);
    expect(r.mesesComMovimento).toBe(2);
    expect(r.mediaReceitas).toBe(450000);
    expect(r.mediaDespesas).toBe(200001);
    expect(r.linhas.filter((l) => !l.temMovimento)).toHaveLength(10);
    expect(r.linhas.filter((l) => !l.temMovimento).every((l) => l.resultado === 0)).toBe(true);
  });

  it('critério 4: ignora transações de outros anos', () => {
    expect(relatorioAnual(set.transacoes, 2025).despesas).toBe(9999);
    expect(relatorioAnual(set.transacoes, 2024).mesesComMovimento).toBe(0);
    expect(relatorioAnual([], 2026).mediaResultado).toBe(0);
  });

  it('critério 5: destaca melhor e pior mês só com ao menos dois meses de movimento', () => {
    expect(r.melhorMes).toBe('2026-09');
    expect(r.piorMes).toBe('2026-08');
    const um = relatorioAnual([t({ data: '2026-03-01' })], 2026);
    expect(um.melhorMes).toBeNull();
    expect(um.piorMes).toBeNull();
  });
});

describe('relatórios: por categoria (critérios 6, 7)', () => {
  it('critério 6: total, quantidade e valor médio por categoria, em ordem decrescente', () => {
    const r = relatorioPorCategoria(set, { de: '2026-08-01', ate: '2026-09-30', tipo: 'despesa' });
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.linhas.map((l) => [l.nome, l.total, l.quantidade, l.medio])).toEqual([
      ['Moradia', 300000, 2, 150000],
      ['Alimentação', 80001, 2, 40001],
      ['Lazer', 20000, 1, 20000],
    ]);
    expect(r.valor.total).toBe(400001);
    expect(r.valor.quantidade).toBe(5);
  });

  it('critério 6: filtra por tipo, por conta e por período (inclusive nas bordas)', () => {
    const receitas = relatorioPorCategoria(set, { de: '2026-08-05', ate: '2026-09-05', tipo: 'receita' });
    expect(receitas.ok && receitas.valor.total).toBe(900000);
    const conta = relatorioPorCategoria(set, { de: '2026-01-01', ate: '2026-12-31', tipo: 'despesa', contaId: 'b' });
    expect(conta.ok && conta.valor.linhas.map((l) => l.total)).toEqual([30001]);
    const estreito = relatorioPorCategoria(set, { de: '2026-09-06', ate: '2026-09-06', tipo: 'despesa' });
    expect(estreito.ok && estreito.valor.quantidade).toBe(1);
  });

  it('critério 7: período inválido ou invertido devolve erro com o campo', () => {
    expect(validarPeriodo('2026-09-10', '2026-09-01')).toMatchObject({ ok: false, campo: 'de' });
    expect(validarPeriodo('2026-02-31', '2026-09-01')).toMatchObject({ ok: false, campo: 'de' });
    expect(validarPeriodo('2026-01-01', '')).toMatchObject({ ok: false, campo: 'ate' });
    expect(relatorioPorCategoria(set, { de: '2026-09-10', ate: '2026-09-01', tipo: 'despesa' }).ok).toBe(false);
    expect(validarPeriodo('2026-09-01', '2026-09-01').ok).toBe(true);
  });
});

describe('relatórios: comparativo (critérios 8, 9)', () => {
  const c = comparativoMeses(set, '2026-08', '2026-09');

  it('critério 8: diferença, variação e ordem pela maior diferença absoluta', () => {
    expect(c.linhas.map((l) => l.nome)).toEqual(['Alimentação', 'Lazer', 'Moradia']);
    const alimentacao = c.linhas[0];
    expect(alimentacao).toMatchObject({ valorBase: 0, valorComparado: 80001, diferenca: 80001, variacao: null });
    expect(c.linhas[1]).toMatchObject({ valorBase: 20000, valorComparado: 0, diferenca: -20000, variacao: -100 });
    expect(c.linhas[2]).toMatchObject({ diferenca: 0, variacao: 0 });
  });

  it('critério 8: variação percentual com uma casa decimal', () => {
    const e = estado([t({ valor: 30000, data: '2026-08-01' }), t({ valor: 40000, data: '2026-09-01' })]);
    expect(comparativoMeses(e, '2026-08', '2026-09').linhas[0].variacao).toBe(33.3);
  });

  it('critério 9: totais dos dois meses e a diferença de cada um', () => {
    expect(c.totaisBase).toEqual({ receitas: 400000, despesas: 170000, resultado: 230000 });
    expect(c.totaisComparado).toEqual({ receitas: 500000, despesas: 230001, resultado: 269999 });
    expect(c.diferencas).toEqual({ receitas: 100000, despesas: 60001, resultado: 39999 });
  });
});

describe('relatórios: parcelas e pagamentos de fatura (critério 10)', () => {
  it('conta as parcelas na data de cada parcela e ignora pagamentos de fatura', () => {
    const cartao = conta('cartao', { tipo: 'cartao', cartao: { diaFechamento: 20, diaVencimento: 27, limite: 1000000 } });
    const inicial = construirEstado({ contas: [conta('a', { saldoInicial: 1000000 }), cartao] });
    const parcelado = criarCompraParcelada(inicial, { contaId: 'cartao', descricao: 'TV', valorTotal: 30001, parcelas: 3, data: '2026-09-15', categoriaId: 'cat-lazer' });
    if (!parcelado.ok) throw new Error(parcelado.erro);
    const pago = registrarPagamento(parcelado.valor, { contaCartaoId: 'cartao', mesFatura: '2026-09', valor: 5000, data: '2026-09-25', contaOrigemId: 'a' }, '2026-09-25');
    if (!pago.ok) throw new Error(pago.erro);
    expect(relatorioMensal(pago.valor, '2026-09').despesas).toBe(10001);
    expect(relatorioMensal(pago.valor, '2026-10').despesas).toBe(10000);
    expect(relatorioMensal(pago.valor, '2026-09').receitas).toBe(0);
    expect(relatorioAnual(pago.valor.transacoes, 2026).despesas).toBe(30001);
  });
});

describe('relatórios: exportação CSV (critério 11)', () => {
  it('formata números com vírgula e sem separador de milhar', () => {
    expect(numeroCsv(123456)).toBe('1234,56');
    expect(numeroCsv(-5)).toBe('-0,05');
    expect(numeroCsv(0)).toBe('0,00');
    expect(percentualCsv(33.3)).toBe('33,3');
    expect(percentualCsv(null)).toBe('');
  });

  it('escapa campos com ponto e vírgula, aspas e quebras de linha', () => {
    expect(escaparCampoCsv('Simples')).toBe('Simples');
    expect(escaparCampoCsv('a;b')).toBe('"a;b"');
    expect(escaparCampoCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(escaparCampoCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"');
  });

  it('gera texto com BOM, separador ; e quebras CRLF', () => {
    const csv = gerarCsv([['Categoria', 'Valor'], ['A;B', '1,00']]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿Categoria;Valor\r\n"A;B";1,00\r\n');
  });

  it('o nome do arquivo indica o relatório e o período', () => {
    expect(nomeArquivoRelatorio('mensal', '2026-09')).toBe('relatorio-mensal-2026-09.csv');
  });

  it('cada relatório vira linhas de CSV com os mesmos números', () => {
    const mensal = csvMensal(relatorioMensal(set, '2026-09'));
    expect(mensal[1]).toEqual(['Receitas', '5000,00']);
    expect(mensal).toContainEqual(['Moradia', '1500,00', '65,2']);
    expect(mensal).toContainEqual(['Total', '2300,01', '']);
    const anual = csvAnual(relatorioAnual(set.transacoes, 2026));
    expect(anual).toHaveLength(1 + 12 + 2);
    expect(anual[anual.length - 2]).toEqual(['Total', '9000,00', '4000,01', '4999,99']);
    const porCategoria = relatorioPorCategoria(set, { de: '2026-08-01', ate: '2026-09-30', tipo: 'despesa' });
    if (!porCategoria.ok) throw new Error(porCategoria.erro);
    expect(csvPorCategoria(porCategoria.valor)[1]).toEqual(['Moradia', '3000,00', '2', '1500,00']);
    const comp = csvComparativo(comparativoMeses(set, '2026-08', '2026-09'));
    expect(comp[0]).toEqual(['Categoria', '2026-08', '2026-09', 'Diferença', 'Variação (%)']);
    expect(comp[1]).toEqual(['Alimentação', '0,00', '800,01', '800,01', '']);
  });
});

describe('relatórios: desempenho (critério 14)', () => {
  it('gera todos os relatórios de 5.000 transações em menos de 300 ms', () => {
    const muitas = Array.from({ length: 5000 }, (_, i) =>
      t({ data: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`, valor: 100 + i, tipo: i % 4 === 0 ? 'receita' : 'despesa', categoriaId: i % 4 === 0 ? 'cat-salario' : ['cat-moradia', 'cat-lazer', 'cat-saude'][i % 3] }),
    );
    const grande = estado(muitas);
    const inicio = performance.now();
    relatorioMensal(grande, '2026-09');
    relatorioAnual(grande.transacoes, 2026);
    relatorioPorCategoria(grande, { de: '2026-01-01', ate: '2026-12-31', tipo: 'despesa' });
    comparativoMeses(grande, '2026-08', '2026-09');
    expect(performance.now() - inicio).toBeLessThan(300);
  });
});

describe('relatórios: tela', () => {
  const hoje = hojeISO();
  const mes = mesDe(hoje);
  const comDados = (): AppState =>
    estado([
      t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 500000, data: hoje }),
      t({ categoriaId: 'cat-moradia', valor: 150000, data: hoje }),
      t({ categoriaId: 'cat-lazer', valor: 20000, data: `${somarMeses(mes, -1)}-15` }),
    ]);

  beforeEach(() => {
    vi.mocked(baixarArquivo).mockClear();
    window.print = vi.fn();
  });

  it('critério 1: quatro abas, e a aba ativa fica na URL', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/relatorios?aba=anual', comDados());
    const abas = screen.getAllByRole('tab');
    expect(abas.map((a) => a.textContent)).toEqual(['Mensal', 'Anual', 'Por categoria', 'Comparativo']);
    expect(screen.getByRole('tab', { name: 'Anual' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Ano do relatório')).toBeInTheDocument();
    await usuario.click(screen.getByRole('tab', { name: 'Comparativo' }));
    expect(screen.getByRole('tab', { name: 'Comparativo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Mês-base')).toBeInTheDocument();
  });

  it('critérios 2 e 3: o mensal confere com o dashboard e mostra as tabelas por categoria', () => {
    const dados = comDados();
    renderizarApp('/relatorios', dados);
    const esperado = resumoMes(dados.transacoes, mes);
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100).replace(/ /g, ' ');
    expect(screen.getByTestId('rel-receitas')).toHaveTextContent(fmt(esperado.receitas));
    expect(screen.getByTestId('rel-despesas')).toHaveTextContent(fmt(esperado.despesas));
    expect(screen.getByTestId('rel-taxa')).toHaveTextContent('70,0%');
    const tabela = screen.getByRole('table', { name: 'Despesas por categoria' });
    expect(within(tabela).getByText('Moradia')).toBeInTheDocument();
    expect(within(tabela).getByText('100,0%')).toBeInTheDocument();
  });

  it('critério 13: mês sem transações mostra estado vazio e desabilita o CSV', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/relatorios', construirEstado({ contas: [conta('a')] }));
    expect(screen.getByText(`Sem transações em ${nomeMes(mes)}`)).toBeInTheDocument();
    expect(screen.getByTestId('rel-despesas')).toHaveTextContent('R$ 0,00');
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('critério 11: Exportar CSV baixa o arquivo com BOM, separador e nome do período', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/relatorios', comDados());
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixarArquivo).toHaveBeenCalledTimes(1);
    const [nome, conteudo, tipo] = vi.mocked(baixarArquivo).mock.calls[0];
    expect(nome).toBe(`relatorio-mensal-${mes}.csv`);
    expect(tipo).toBe('text/csv');
    expect(conteudo.startsWith('﻿Relatório mensal;')).toBe(true);
    expect(conteudo).toContain('Moradia;1500,00;100');
  });

  it('critério 12: Exportar PDF abre a impressão e os controles somem na impressão', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizarApp('/relatorios', comDados());
    await usuario.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    expect(window.print).toHaveBeenCalled();
    expect(container.querySelector('aside')?.className).toContain('layout-sidebar');
    expect(screen.getByRole('tablist').parentElement?.className).toContain('relatorios-cabecalho');
    expect(screen.getByText(/^Relatório mensal: /).className).toContain('relatorio-titulo-impressao');
  });

  it('critérios 4 e 5: o anual mostra 12 meses, total, média e destaques em texto', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/relatorios?aba=anual', comDados());
    expect(screen.getByRole('table', { name: 'Relatório anual' })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Relatório anual' })).getAllByRole('row')).toHaveLength(1 + 12 + 2);
    expect(screen.getByTestId('anual-total')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByTestId('destaques')).toHaveTextContent(/Melhor mês: .*Pior mês: /);
    await usuario.clear(screen.getByLabelText('Ano do relatório'));
    await usuario.type(screen.getByLabelText('Ano do relatório'), '20');
    expect(screen.getByRole('alert')).toHaveTextContent('4 dígitos');
  });

  it('critério 7: período invertido mostra o erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/relatorios?aba=categoria', comDados());
    expect(screen.getByTestId('cat-cat-moradia')).toHaveTextContent('R$ 1.500,00');
    await usuario.clear(screen.getByLabelText('Data final'));
    await usuario.type(screen.getByLabelText('Data final'), '2001-01-01');
    expect(screen.getByRole('alert')).toHaveTextContent('não pode ser posterior');
    expect(screen.queryByRole('table', { name: 'Relatório por categoria' })).not.toBeInTheDocument();
  });

  it('critérios 8 e 9: o comparativo traz totais e a tabela por categoria', () => {
    renderizarApp('/relatorios?aba=comparativo', comDados());
    expect(screen.getByTestId('comp-despesas')).toHaveTextContent('R$ 1.500,00');
    expect(screen.getByTestId('comp-cat-cat-moradia')).toHaveTextContent('—');
    expect(screen.getByTestId('comp-cat-cat-lazer')).toHaveTextContent('-100,0%');
  });

  it('funciona com os dados de exemplo sem erros', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizarApp('/relatorios?aba=anual', gerarExemplo(hoje));
    expect(screen.getByRole('table', { name: 'Relatório anual' })).toBeInTheDocument();
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
