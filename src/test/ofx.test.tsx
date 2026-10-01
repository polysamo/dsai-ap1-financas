import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  conferirSaldo,
  decodificarOfx,
  importarOfx,
  marcarDuplicatasOfx,
  parseDataOfx,
  parseOfx,
  parseValorOfx,
  validarArquivoOfx,
  type ArquivoOfx,
} from '../domain/ofx';
import { itensNavegacao } from '../navegacao';
import type { Conta, Transacao } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta: Conta = { id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };

const sgml = (saldo = '937.50') => `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261005120000[-3:BRT]<LANGUAGE>POR</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>0341<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20261001<DTEND>20261005
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261001120000[-3:BRT]<TRNAMT>-12.50<FITID>A1<MEMO>PADARIA</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261002<TRNAMT>1000.00<FITID>A2<NAME>SALARIO<MEMO>EMPRESA XYZ</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003000000.000<TRNAMT>-50,00<FITID>A3<NAME>MERCADO</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>${saldo}<DTASOF>20261005</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL</CURDEF>
<BANKACCTFROM><BANKID>0341</BANKID><ACCTID>12345-6</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261001120000[-3:BRT]</DTPOSTED><TRNAMT>-12.50</TRNAMT><FITID>A1</FITID><MEMO>PADARIA</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261002</DTPOSTED><TRNAMT>1000.00</TRNAMT><FITID>A2</FITID><NAME>SALARIO</NAME><MEMO>EMPRESA XYZ</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261003000000.000</DTPOSTED><TRNAMT>-50,00</TRNAMT><FITID>A3</FITID><NAME>MERCADO</NAME></STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>937.50</BALAMT><DTASOF>20261005</DTASOF></LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const lido = (texto: string): ArquivoOfx => {
  const r = parseOfx(texto);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

const trans = (parcial: Partial<Transacao> & { id: string }): Transacao => ({
  contaId: 'a',
  categoriaId: 'cat-outros-despesa',
  tipo: 'despesa',
  valor: 1250,
  data: '2026-10-01',
  descricao: 'Padaria',
  criadaEm: 1,
  ...parcial,
});

const enviar = async (texto: string, nome = 'extrato.ofx') => {
  const input = screen.getByLabelText('Arquivo OFX');
  await userEvent.setup({ applyAccept: false }).upload(input, new File([texto], nome, { type: 'application/x-ofx' }));
};

describe('ofx: parser (critérios 1 a 5)', () => {
  it('critério 1: SGML 1.x e XML 2.x resultam no mesmo conteúdo, com BANKID e ACCTID', () => {
    const a = lido(sgml());
    const b = lido(xml);
    expect(a).toEqual(b);
    expect(a.contas).toHaveLength(1);
    expect(a.contas[0]).toMatchObject({ bancoId: '0341', contaId: '12345-6' });
    expect(a.contas[0].transacoes).toHaveLength(3);
  });

  it('critério 2: tipo, valor em centavos, FITID e descrição por NAME e MEMO', () => {
    const [t1, t2, t3] = lido(sgml()).contas[0].transacoes;
    expect(t1).toMatchObject({ tipoOfx: 'DEBIT', tipo: 'despesa', valor: 1250, fitid: 'A1', descricao: 'PADARIA' });
    expect(t2).toMatchObject({ tipoOfx: 'CREDIT', tipo: 'receita', valor: 100000, fitid: 'A2', descricao: 'SALARIO - EMPRESA XYZ' });
    expect(t3).toMatchObject({ valor: 5000, descricao: 'MERCADO' });
  });

  it('critério 3: formatos de DTPOSTED sem deslocar o dia; data inexistente invalida a linha', () => {
    expect(parseDataOfx('20261001')).toBe('2026-10-01');
    expect(parseDataOfx('20261001235959')).toBe('2026-10-01');
    expect(parseDataOfx('20261001000000.000')).toBe('2026-10-01');
    expect(parseDataOfx('20261001000000.000[-3:BRT]')).toBe('2026-10-01');
    expect(parseDataOfx('20261001235959[+9:JST]')).toBe('2026-10-01');
    expect(parseDataOfx('20261301')).toBeNull();
    expect(parseDataOfx('2026-10-01')).toBeNull();
    const ruim = lido(sgml().replace('20261002<TRNAMT>', '20261332<TRNAMT>')).contas[0].transacoes[1];
    expect(ruim.erro).toBe('Data inválida');
  });

  it('critério 4: TRNAMT com ponto ou vírgula; ausente, inválido ou zero invalidam a linha', () => {
    expect(parseValorOfx('-12.50')).toBe(-1250);
    expect(parseValorOfx('-12,50')).toBe(-1250);
    expect(parseValorOfx('1.234,56')).toBe(123456);
    expect(parseValorOfx('1,234.56')).toBe(123456);
    expect(parseValorOfx('+7')).toBe(700);
    expect(parseValorOfx('abc')).toBeNull();
    expect(parseValorOfx('1.234')).toBeNull();
    const t = lido(sgml().replace('<TRNAMT>-12.50', '<TRNAMT>0.00').replace('<TRNAMT>1000.00', '<TRNAMT>xx').replace('<TRNAMT>-50,00', '')).contas[0].transacoes;
    expect(t.map((l) => l.erro)).toEqual(['Valor zero', 'Valor inválido', 'Valor ausente']);
  });

  it('critério 5: saldo final (LEDGERBAL) em centavos com a data', () => {
    expect(lido(sgml()).contas[0].saldoFinal).toEqual({ valor: 93750, data: '2026-10-05' });
    expect(lido(xml).contas[0].saldoFinal).toEqual({ valor: 93750, data: '2026-10-05' });
    expect(lido(sgml().replace(/<LEDGERBAL>.*<\/LEDGERBAL>/, '')).contas[0].saldoFinal).toBeNull();
  });
});

describe('ofx: decodificação e arquivo inválido (critérios 6 e 7)', () => {
  it('critério 6: CHARSET 1252, UTF-8 e sem declaração mostram os acentos', () => {
    const corpo = '<OFX><STMTRS><STMTTRN><MEMO>Descrição</MEMO></STMTTRN></STMTRS></OFX>';
    const cp1252 = Uint8Array.from([...`CHARSET:1252\n${corpo}`].map((c) => (c === 'ç' ? 0xe7 : c === 'ã' ? 0xe3 : c.charCodeAt(0))));
    expect(decodificarOfx(cp1252)).toContain('Descrição');
    expect(decodificarOfx(new TextEncoder().encode(`CHARSET:UTF-8\n${corpo}`))).toContain('Descrição');
    expect(decodificarOfx(new TextEncoder().encode(corpo))).toContain('Descrição');
    const semCabecalho1252 = Uint8Array.from([...corpo].map((c) => (c === 'ç' ? 0xe7 : c === 'ã' ? 0xe3 : c.charCodeAt(0))));
    expect(decodificarOfx(semCabecalho1252)).toContain('Descrição');
  });

  it('critério 7: recusa extensão, tamanho, vazio, sem <OFX> e sem lançamentos', () => {
    expect(validarArquivoOfx('x.csv', 10).ok).toBe(false);
    expect(validarArquivoOfx('x.QFX', 10).ok).toBe(true);
    expect(validarArquivoOfx('x.ofx', 0).ok).toBe(false);
    expect(validarArquivoOfx('x.ofx', 5 * 1024 * 1024 + 1).ok).toBe(false);
    const semOfx = parseOfx('conteúdo qualquer');
    expect(!semOfx.ok && semOfx.erro).toMatch(/<OFX>/);
    const semLancamentos = parseOfx('<OFX><BANKMSGSRSV1><STMTRS><CURDEF>BRL</STMTRS></BANKMSGSRSV1></OFX>');
    expect(!semLancamentos.ok && semLancamentos.erro).toMatch(/nenhum lançamento/);
  });

  it('critério 7: a tela mostra a mensagem e não carrega nada', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar('a,b', 'extrato.csv');
    expect(await screen.findByRole('alert')).toHaveTextContent('extensão .ofx ou .qfx');
    await enviar('texto sem estrutura');
    expect(await screen.findByRole('alert')).toHaveTextContent('<OFX>');
    expect(screen.queryByLabelText('Prévia da importação OFX')).toBeNull();
  });
});

describe('ofx: contas do arquivo e prévia (critérios 8 e 9)', () => {
  const duasContas = sgml().replace(
    '</STMTRS>',
    '</STMTRS><STMTRS><BANKACCTFROM><BANKID>0001<ACCTID>999</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261004<TRNAMT>-9.99<FITID>B1<NAME>CINEMA</STMTTRN></BANKTRANLIST></STMTRS>',
  );

  it('critério 8: lista as contas lidas e permite escolher qual importar', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar(duasContas);
    const lista = await screen.findByRole('list', { name: 'Contas no arquivo' });
    expect(lista).toHaveTextContent('Banco 0341 · conta 12345-6 · 3 lançamentos');
    expect(lista).toHaveTextContent('Banco 0001 · conta 999 · 1 lançamentos · sem saldo final');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await userEvent.selectOptions(screen.getByLabelText('Conta do arquivo a importar'), '1');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByText('CINEMA')).toBeInTheDocument();
  });

  it('critério 9: prévia com tipo, valor, categoria sugerida editável e linha inválida sem seleção', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar(sgml().replace('<TRNAMT>-50,00', '<TRNAMT>zz'));
    expect(await screen.findByText(/Despesa R\$\s?12,50 · DEBIT/)).toBeInTheDocument();
    expect(screen.getByText(/Receita R\$\s?1\.000,00 · CREDIT/)).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria do lançamento 1')).toHaveValue('cat-outros-despesa');
    expect(screen.getByLabelText('Categoria do lançamento 2')).toHaveValue('cat-outros-receita');
    expect(screen.getByTestId('estado-ofx-3')).toHaveTextContent('Erro: Valor inválido');
    expect(screen.getByLabelText('Importar lançamento 3')).toBeDisabled();
    expect(screen.getByLabelText('Importar lançamento 3')).not.toBeChecked();
    expect(screen.queryByLabelText('Categoria do lançamento 3')).toBeNull();
  });
});

describe('ofx: duplicatas (critério 10)', () => {
  const existentes = [
    trans({ id: 't1', descricao: 'Outro nome', fitid: 'A1' }),
    trans({ id: 't2', tipo: 'receita', categoriaId: 'cat-outros-receita', valor: 100000, data: '2026-10-02', descricao: 'Salario - Empresa XYZ' }),
  ];

  it('critério 10: FITID e data+valor+descrição são detectados, vêm desmarcados e podem ser marcados', async () => {
    const estado = construirEstado({ contas: [conta], transacoes: existentes });
    const marcas = marcarDuplicatasOfx(lido(sgml()).contas[0].transacoes, estado, 'a');
    expect(marcas.get(1)).toBe('fitid');
    expect(marcas.get(2)).toBe('dados');
    expect(marcas.has(3)).toBe(false);
    expect(marcarDuplicatasOfx(lido(sgml()).contas[0].transacoes, estado, 'outra').size).toBe(0);

    renderizarApp('/importar-ofx', estado);
    await enviar(sgml());
    expect(await screen.findByTestId('estado-ofx-1')).toHaveTextContent('Já importada (FITID)');
    expect(screen.getByTestId('estado-ofx-2')).toHaveTextContent('Possível duplicata');
    expect(screen.getByTestId('estado-ofx-3')).toHaveTextContent('Pronta');
    expect(screen.getByLabelText('Importar lançamento 1')).not.toBeChecked();
    expect(screen.getByLabelText('Importar lançamento 2')).not.toBeChecked();
    expect(screen.getByTestId('contadores-ofx')).toHaveTextContent('1 a importar · 2 ignoradas · 0 com erro');
    await userEvent.click(screen.getByLabelText('Importar lançamento 1'));
    expect(screen.getByTestId('contadores-ofx')).toHaveTextContent('2 a importar');
  });
});

describe('ofx: importar, desfazer e conferir (critérios 11 a 13)', () => {
  it('critério 11: grava só as selecionadas, com fitid, e mostra o resumo', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar(sgml().replace('<TRNAMT>-50,00', '<TRNAMT>zz'));
    await userEvent.click(await screen.findByLabelText('Importar lançamento 2'));
    await userEvent.click(screen.getByRole('button', { name: 'Importar 1 transação' }));
    expect(await screen.findByTestId('resumo-ofx')).toHaveTextContent('1 importadas, 1 ignoradas, 1 com erro');
    const salvas = lerEstadoSalvo().transacoes;
    expect(salvas).toHaveLength(1);
    expect(salvas[0]).toMatchObject({ fitid: 'A1', valor: 1250, tipo: 'despesa', data: '2026-10-01', contaId: 'a' });
    expect(lerEstadoSalvo().importacoes).toHaveLength(1);
  });

  it('critério 11: importarOfx é tudo ou nada', () => {
    const estado = construirEstado({ contas: [conta] });
    const itens = [
      { data: '2026-10-01', descricao: 'ok', valor: 100, tipo: 'despesa' as const, categoriaId: 'cat-outros-despesa', fitid: 'X' },
      { data: '2026-10-01', descricao: 'ruim', valor: 100, tipo: 'despesa' as const, categoriaId: 'inexistente' },
    ];
    expect(importarOfx(estado, 'a', itens, '2026-10-05').ok).toBe(false);
    expect(importarOfx(estado, 'a', [], '2026-10-05').ok).toBe(false);
  });

  it('critério 12: desfazer remove exatamente a importação e o arquivo volta a ser ofertado como novo', async () => {
    const previa = trans({ id: 'previa', descricao: 'Antiga', data: '2026-09-01' });
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta], transacoes: [previa] }));
    await enviar(sgml());
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 3 transações' }));
    await screen.findByTestId('resumo-ofx');
    expect(lerEstadoSalvo().transacoes).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer importação' }));
    await waitFor(() => expect(screen.queryByTestId('resumo-ofx')).toBeNull());
    expect(lerEstadoSalvo().transacoes.map((t) => t.id)).toEqual(['previa']);
    await enviar(sgml());
    expect(await screen.findByTestId('estado-ofx-1')).toHaveTextContent('Pronta');
  });

  it('critério 13: saldo conferido quando igual', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar(sgml());
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 3 transações' }));
    expect(await screen.findByTestId('conferencia-ofx')).toHaveTextContent('Saldo conferido');
  });

  it('critério 13: aviso textual com os dois valores e a diferença quando diverge; aviso quando não há saldo', async () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    await enviar(sgml('1000.00'));
    await userEvent.click(await screen.findByRole('button', { name: 'Importar 3 transações' }));
    const aviso = await screen.findByTestId('conferencia-ofx');
    expect(aviso).toHaveTextContent('Saldo divergente');
    expect(aviso).toHaveTextContent(/arquivo informa R\$\s?1\.000,00/);
    expect(aviso).toHaveTextContent(/calculado da conta é R\$\s?937,50/);
    expect(aviso).toHaveTextContent(/diferença de R\$\s?62,50/);
  });

  it('critério 13: conferirSaldo cobre os três casos', () => {
    const estado = construirEstado({ contas: [{ ...conta, saldoInicial: 500 }] });
    expect(conferirSaldo(estado, 'a', null)).toEqual({ situacao: 'indisponivel' });
    expect(conferirSaldo(estado, 'a', { valor: 500, data: null }).situacao).toBe('conferido');
    expect(conferirSaldo(estado, 'a', { valor: 800, data: null })).toEqual({ situacao: 'divergente', esperado: 800, calculado: 500, diferenca: -300 });
  });
});

describe('ofx: rota, navegação e estados vazios (critério 14)', () => {
  it('critério 14: sem contas ativas oferece o link para Contas', () => {
    renderizarApp('/importar-ofx', construirEstado({ contas: [{ ...conta, arquivada: true }] }));
    expect(screen.getByRole('heading', { level: 1, name: 'Importar OFX' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma conta para receber a importação')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar uma conta' })).toHaveAttribute('href', '/contas');
  });

  it('critério 14: item na navegação, controles rotulados e situação em texto', async () => {
    expect(itensNavegacao).toContainEqual({ to: '/importar-ofx', rotulo: 'Importar OFX' });
    renderizarApp('/importar-ofx', construirEstado({ contas: [conta] }));
    expect(screen.getByLabelText('Conta de destino')).toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo OFX')).toHaveAttribute('accept', '.ofx,.qfx');
    await enviar(sgml());
    expect(await screen.findByTestId('estado-ofx-1')).toHaveTextContent('Pronta');
    expect(screen.getByLabelText('Importar lançamento 1')).toBeChecked();
  });
});
