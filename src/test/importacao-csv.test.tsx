import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  adivinharMapeamento,
  decodificar,
  desfazerImportacao,
  detectarFormatoData,
  detectarSeparador,
  importarTransacoes,
  interpretarLinhas,
  marcarDuplicatas,
  parseCsv,
  parseData,
  parseValorCsv,
  sugerirCategoria,
  validarArquivo,
} from '../domain/csv';
import type { Conta, MapeamentoCsv, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const conta: Conta = { id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };

const mapa = (parcial: Partial<MapeamentoCsv> = {}): MapeamentoCsv => ({
  colData: 0,
  colDescricao: 1,
  colValor: 2,
  colCredito: null,
  colDebito: null,
  formatoData: 'dd/mm/aaaa',
  temCabecalho: false,
  ...parcial,
});

const trans = (parcial: Partial<Transacao> & { id: string }): Transacao => ({
  contaId: 'a',
  categoriaId: 'cat-alimentacao',
  tipo: 'despesa',
  valor: 1250,
  data: '2026-10-01',
  descricao: 'Padaria',
  criadaEm: 1,
  ...parcial,
});

describe('csv: arquivo e parser (critérios 1 e 2)', () => {
  it('critério 1: recusa extensão errada e arquivo acima de 5 MB', () => {
    expect(validarArquivo('extrato.txt', 10).ok).toBe(false);
    expect(validarArquivo('extrato.CSV', 10).ok).toBe(true);
    expect(validarArquivo('extrato.csv', 5 * 1024 * 1024 + 1).ok).toBe(false);
    expect(validarArquivo('extrato.csv', 5 * 1024 * 1024).ok).toBe(true);
  });

  it('critério 2: detecta separador ignorando o que está entre aspas', () => {
    expect(detectarSeparador('a;b;c\n1;2;3')).toBe(';');
    expect(detectarSeparador('a,b,c\n1,2,3')).toBe(',');
    expect(detectarSeparador('"a;b",c,d\n1,2,3')).toBe(',');
  });

  it('critério 2: campos com aspas, aspas escapadas e quebras de linha dentro do campo', () => {
    const linhas = parseCsv('Data,Descricao,Valor\r\n01/10/2026,"Padaria, ""Doce Vida""",-12.50\n02/10/2026,"Linha 1\nLinha 2",5\n\n', ',');
    expect(linhas).toEqual([
      ['Data', 'Descricao', 'Valor'],
      ['01/10/2026', 'Padaria, "Doce Vida"', '-12.50'],
      ['02/10/2026', 'Linha 1\nLinha 2', '5'],
    ]);
    expect(parseCsv('a;;c\n;;\nx;y;z')).toEqual([['a', '', 'c'], ['x', 'y', 'z']]);
  });

  it('critério 2: UTF-8 e Windows-1252 mostram os acentos corretamente', () => {
    const utf8 = new TextEncoder().encode('Descrição;Valor');
    expect(decodificar(utf8)).toBe('Descrição;Valor');
    const cp1252 = new Uint8Array([0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0xe7, 0xe3, 0x6f]);
    expect(decodificar(cp1252)).toBe('Descrição');
    const comBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x41]);
    expect(decodificar(comBom)).toBe('A');
  });
});

describe('csv: mapeamento, datas e valores (critérios 3, 4, 5)', () => {
  it('critério 3: sugere o mapeamento pelo cabeçalho, inclusive crédito e débito separados', () => {
    const um = adivinharMapeamento([['Valor', 'Data', 'Histórico'], ['-5,00', '01/10/2026', 'Café']]);
    expect(um).toMatchObject({ colData: 1, colDescricao: 2, colValor: 0, temCabecalho: true, formatoData: 'dd/mm/aaaa' });
    const dois = adivinharMapeamento([['Data', 'Descrição', 'Crédito', 'Débito'], ['2026-10-01', 'X', '10,00', '']]);
    expect(dois).toMatchObject({ colValor: null, colCredito: 2, colDebito: 3, formatoData: 'aaaa-mm-dd' });
    expect(adivinharMapeamento([['01/10/2026', 'Café', '-5,00']])).toMatchObject({ temCabecalho: false, colData: 0, colDescricao: 1, colValor: 2 });
  });

  it('critério 4: reconhece os três formatos de data e recusa datas ambíguas ou inexistentes', () => {
    expect(parseData('01/10/2026', 'dd/mm/aaaa')).toBe('2026-10-01');
    expect(parseData('2026-10-01', 'aaaa-mm-dd')).toBe('2026-10-01');
    expect(parseData('1-2-2026', 'dd-mm-aaaa')).toBe('2026-02-01');
    expect(parseData('31/02/2026', 'dd/mm/aaaa')).toBeNull();
    expect(parseData('2026-10-01', 'dd/mm/aaaa')).toBeNull();
    expect(detectarFormatoData(['01/10/2026', '15/11/2026'])).toBe('dd/mm/aaaa');
    expect(detectarFormatoData(['01/10/2026', '2026-11-15'])).toBeNull();
  });

  it('critério 5: valores brasileiros, internacionais e parênteses', () => {
    expect(parseValorCsv('1.234,56')).toBe(123456);
    expect(parseValorCsv('1234.56')).toBe(123456);
    expect(parseValorCsv('-50,00')).toBe(-5000);
    expect(parseValorCsv('(50,00)')).toBe(-5000);
    expect(parseValorCsv('R$ 10,00')).toBe(1000);
    expect(parseValorCsv('abc')).toBeNull();
  });

  it('critério 5: sinal ou coluna de débito definem a despesa; ausência define a receita', () => {
    const unica = interpretarLinhas([['01/10/2026', 'A', '-10,00'], ['02/10/2026', 'B', '20,00'], ['03/10/2026', 'C', '(5,00)']], mapa());
    expect(unica.map((l) => [l.tipo, l.valor])).toEqual([['despesa', 1000], ['receita', 2000], ['despesa', 500]]);
    const duas = interpretarLinhas(
      [['01/10/2026', 'A', '', '10,00'], ['02/10/2026', 'B', '20,00', '0,00'], ['03/10/2026', 'C', '', ''], ['04/10/2026', 'D', '1,00', '2,00']],
      mapa({ colValor: null, colCredito: 2, colDebito: 3 }),
    );
    expect(duas[0]).toMatchObject({ tipo: 'despesa', valor: 1000 });
    expect(duas[1]).toMatchObject({ tipo: 'receita', valor: 2000 });
    expect(duas[2].erro).toBe('Valor ausente');
    expect(duas[3].erro).toMatch(/Crédito e débito/);
  });

  it('critério 9: linhas com data inválida, valor ausente ou zero ficam com o motivo', () => {
    const l = interpretarLinhas([['31/02/2026', 'A', '1,00'], ['', 'B', '1,00'], ['01/10/2026', 'C', ''], ['01/10/2026', 'D', 'xx'], ['01/10/2026', 'E', '0,00'], ['01/10/2026', 'F', '1,00']], mapa());
    expect(l.map((x) => x.erro)).toEqual(['Data inválida para o formato escolhido', 'Data ausente', 'Valor ausente', 'Valor inválido', 'Valor zero', undefined]);
  });

  it('o cabeçalho é pulado e o índice da linha segue o arquivo', () => {
    const l = interpretarLinhas([['Data', 'Desc', 'Valor'], ['01/10/2026', 'A', '1,00']], mapa({ temCabecalho: true }));
    expect(l).toHaveLength(1);
    expect(l[0].indice).toBe(2);
  });
});

describe('csv: duplicatas, categorias e gravação (critérios 7, 8, 10, 11, 12)', () => {
  const estado = construirEstado({ contas: [conta, { ...conta, id: 'b', nome: 'Outra' }], transacoes: [trans({ id: 't1' })] });

  it('critério 7: duplicata = mesma conta, data, valor e descrição normalizada', () => {
    const linhas = interpretarLinhas(
      [['01/10/2026', '  PADARIA ', '-12,50'], ['01/10/2026', 'Padaria', '-12,51'], ['02/10/2026', 'Padaria', '-12,50'], ['01/10/2026', 'Padaria', '12,50']],
      mapa(),
    );
    expect([...marcarDuplicatas(linhas, estado, 'a')]).toEqual([1]);
    expect([...marcarDuplicatas(linhas, estado, 'b')]).toEqual([]);
  });

  it('critério 8: reutiliza a categoria já usada na descrição; senão, "Outros" do tipo', () => {
    expect(sugerirCategoria(estado, 'padaria', 'despesa')).toBe('cat-alimentacao');
    expect(sugerirCategoria(estado, 'Loja nova', 'despesa')).toBe('cat-outros-despesa');
    expect(sugerirCategoria(estado, 'Padaria', 'receita')).toBe('cat-outros-receita');
  });

  const itens = [
    { data: '2026-10-05', descricao: 'Mercado', valor: 5000, tipo: 'despesa' as const, categoriaId: 'cat-alimentacao' },
    { data: '2026-10-06', descricao: 'Freela', valor: 20000, tipo: 'receita' as const, categoriaId: 'cat-outros-receita' },
  ];

  it('critério 10: grava tudo de uma vez e guarda o mapeamento da conta', () => {
    const r = importarTransacoes(estado, 'a', itens, mapa(), '2026-10-10');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.estado.transacoes).toHaveLength(3);
    expect(r.valor.estado.mapeamentosCsv.a).toEqual(mapa());
    expect(r.valor.importacao.transacaoIds).toHaveLength(2);
  });

  it('critério 10: um item inválido cancela a importação inteira', () => {
    const r = importarTransacoes(estado, 'a', [...itens, { ...itens[0], categoriaId: 'cat-inexistente' }], mapa(), '2026-10-10');
    expect(r.ok).toBe(false);
    expect(estado.transacoes).toHaveLength(1);
    expect(importarTransacoes(estado, 'a', [], mapa(), '2026-10-10').ok).toBe(false);
  });

  it('critério 11: desfazer remove exatamente as transações criadas pela importação', () => {
    const r = importarTransacoes(estado, 'a', itens, mapa(), '2026-10-10');
    if (!r.ok) throw new Error(r.erro);
    const d = desfazerImportacao(r.valor.estado, r.valor.importacao.id);
    expect(d.ok && d.valor.transacoes.map((t) => t.id)).toEqual(['t1']);
    expect(d.ok && d.valor.importacoes).toHaveLength(0);
  });

  it('critério 12: reimportar as mesmas linhas as marca todas como duplicatas', () => {
    const r = importarTransacoes(estado, 'a', itens, mapa(), '2026-10-10');
    if (!r.ok) throw new Error(r.erro);
    const linhas = interpretarLinhas([['05/10/2026', 'Mercado', '-50,00'], ['06/10/2026', 'Freela', '200,00']], mapa());
    expect([...marcarDuplicatas(linhas, r.valor.estado, 'a')]).toEqual([1, 2]);
  });
});

describe('csv: tela', () => {
  const csv = 'Data;Descrição;Valor\n01/10/2026;Padaria;-12,50\n02/10/2026;Salário;3000,00\n99/10/2026;Linha ruim;1,00\n';
  const arquivo = (nome = 'extrato.csv', conteudo = csv) => new File([conteudo], nome, { type: 'text/csv' });

  it('sem conta, avisa e leva para criar uma', () => {
    renderizarApp('/importar');
    expect(screen.getByRole('link', { name: 'Criar uma conta' })).toBeInTheDocument();
  });

  it('critério 1: recusa arquivo que não é .csv', async () => {
    const usuario = userEvent.setup({ applyAccept: false });
    renderizarApp('/importar', construirEstado({ contas: [conta] }));
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo('extrato.txt'));
    expect(await screen.findByRole('alert')).toHaveTextContent('.csv');
  });

  it('critérios 6, 9, 10, 11 e 12: prévia, erros, importação, resumo, desfazer e reimportação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/importar', construirEstado({ contas: [conta] }));
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo());

    expect(await screen.findByTestId('contadores')).toHaveTextContent('2 a importar · 0 ignoradas · 1 com erro');
    expect(screen.getByTestId('estado-linha-2')).toHaveTextContent('Pronta');
    expect(screen.getByTestId('estado-linha-4')).toHaveTextContent('Erro: Data inválida');
    expect(screen.getByLabelText('Categoria da linha 2')).toHaveValue('cat-outros-despesa');
    expect(screen.getByLabelText('Categoria da linha 3')).toHaveValue('cat-outros-receita');
    await usuario.selectOptions(screen.getByLabelText('Categoria da linha 2'), 'Alimentação');

    await usuario.click(screen.getByRole('button', { name: 'Importar 2 transações' }));
    expect(screen.getByTestId('resumo')).toHaveTextContent('2 importadas, 0 ignoradas, 1 com erro');
    const salvas = store.getSnapshot().estado.transacoes;
    expect(salvas).toHaveLength(2);
    expect(salvas.find((t) => t.descricao === 'Padaria')).toMatchObject({ valor: 1250, tipo: 'despesa', categoriaId: 'cat-alimentacao', data: '2026-10-01' });

    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo());
    expect(await screen.findByTestId('contadores')).toHaveTextContent('0 a importar · 2 ignoradas · 1 com erro');
    expect(screen.getByTestId('estado-linha-2')).toHaveTextContent('Possível duplicata');
    expect(screen.getByRole('button', { name: 'Importar 0 transações' })).toBeDisabled();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: 'Desfazer importação' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
  });

  it('critério 7: o usuário pode marcar uma duplicata para importar mesmo assim', async () => {
    const usuario = userEvent.setup();
    const estado = construirEstado({ contas: [conta], transacoes: [trans({ id: 't1', data: '2026-10-01', valor: 1250, descricao: 'Padaria' })] });
    const { store } = renderizarApp('/importar', estado);
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo());
    await screen.findByTestId('contadores');
    expect(screen.getByLabelText('Importar linha 2')).not.toBeChecked();
    await usuario.click(screen.getByLabelText('Importar linha 2'));
    await usuario.click(screen.getByRole('button', { name: 'Importar 2 transações' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(3);
  });

  it('critério 3: ajustar o mapeamento atualiza a prévia, e ele é lembrado na próxima importação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/importar', construirEstado({ contas: [conta] }));
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo('x.csv', 'Café;01-10-2026;-5,00\n'));
    await screen.findByTestId('contadores');
    expect(screen.getByTestId('contadores')).toHaveTextContent('0 a importar · 0 ignoradas · 1 com erro');
    await usuario.selectOptions(screen.getByLabelText('Coluna da data'), '1');
    await usuario.selectOptions(screen.getByLabelText('Coluna da descrição'), '0');
    await usuario.selectOptions(screen.getByLabelText('Formato da data'), 'dd-mm-aaaa');
    expect(screen.getByTestId('contadores')).toHaveTextContent('1 a importar');
    await usuario.click(screen.getByRole('button', { name: 'Importar 1 transação' }));
    expect(store.getSnapshot().estado.mapeamentosCsv.a).toMatchObject({ colData: 1, colDescricao: 0, formatoData: 'dd-mm-aaaa' });
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), arquivo('y.csv', 'Pão;02-10-2026;-3,00\n'));
    await waitFor(() => expect(screen.getByLabelText('Coluna da data')).toHaveValue('1'));
    expect(screen.getByTestId('contadores')).toHaveTextContent('1 a importar');
    expect(within(screen.getByRole('list', { name: 'Prévia da importação' })).getAllByRole('listitem')).toHaveLength(1);
  });
});
