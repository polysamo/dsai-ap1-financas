import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarDivida } from '../domain/dividas';
import { calcularFluxo, diaDaRecorrencia, itensPrevistos, oQueFazer } from '../domain/fluxoCaixa';
import type { Agendamento, AppState, Conta, Recorrencia, Transacao } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { construirEstado, renderizarApp } from './helpers';

const HOJE = '2026-10-01';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
});
afterEach(() => vi.useRealTimers());

const conta = (parcial: Partial<Conta> = {}): Conta => ({ id: 'c1', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1, ...parcial });
const cartao = (parcial: Partial<Conta> = {}): Conta =>
  conta({ id: 'cc', nome: 'Visa', tipo: 'cartao', saldoInicial: 0, cartao: { diaFechamento: 5, diaVencimento: 15, limite: 500000 }, ...parcial });
const agenda = (id: string, tipo: 'receita' | 'despesa', valor: number, vencimento: string, parcial: Partial<Agendamento> = {}): Agendamento => ({
  id,
  descricao: `Item ${id}`,
  tipo,
  valor,
  vencimento,
  categoriaId: 'x',
  criadoEm: 1,
  ...parcial,
});
const recorrencia = (id: string, tipo: 'receita' | 'despesa', valor: number, extra: object = {}, ativa = true): Recorrencia =>
  ({ id, descricao: `Rec ${id}`, tipo, valor, categoriaId: 'x', ativa, ...extra }) as Recorrencia;
const compra = (valor: number, data: string): Transacao => ({ id: `t${data}`, contaId: 'cc', categoriaId: 'x', tipo: 'despesa', valor, data, descricao: 'Compra', criadaEm: 1 });

/** Cenário numérico completo; conferido à mão no comentário de cada teste. */
function cenario(): AppState {
  const base = construirEstado({
    contas: [conta(), cartao()],
    agenda: [
      agenda('a1', 'despesa', 30000, '2026-10-05'),
      agenda('a2', 'receita', 20000, '2026-10-10'),
      agenda('a3', 'despesa', 5000, '2026-09-28'),
      agenda('a4', 'despesa', 99999, '2026-10-03', { pagoEm: '2026-10-03' }),
    ],
    recorrencias: [recorrencia('r1', 'despesa', 15000), recorrencia('r2', 'receita', 40000, { dia: 15 }), recorrencia('r3', 'despesa', 77777, {}, false)],
    transacoes: [compra(25000, '2026-09-20'), compra(10000, '2026-10-20')],
  });
  const r = criarDivida(base, { nome: 'Carro', tipo: 'devo', principal: 30000, taxaBp: 0, parcelas: 3, primeiraParcela: '2026-10-20', sistema: 'price' });
  if (!r.ok) throw new Error(r.erro);
  const e = criarDivida(r.valor, { nome: 'Amigo', tipo: 'emprestei', principal: 90000, taxaBp: 0, parcelas: 3, primeiraParcela: '2026-10-12', sistema: 'price' });
  if (!e.ok) throw new Error(e.erro);
  return e.valor;
}

describe('critério 10: janela, resumo e estado vazio', () => {
  it('calcula janelas de 30, 60 e 90 dias começando hoje', () => {
    const estado = cenario();
    for (const n of [30, 60, 90]) {
      const f = calcularFluxo(estado, HOJE, n);
      expect(f.dias).toHaveLength(n);
      expect(f.dias[0].data).toBe('2026-10-01');
    }
    expect(calcularFluxo(estado, HOJE, 30).dias[29].data).toBe('2026-10-30');
    expect(calcularFluxo(estado, HOJE, 90).dias[89].data).toBe('2026-12-29');
  });

  it('resume saldo inicial, totais, saldo final e menor saldo (30 dias)', () => {
    // inicial 100000; entradas 20000 (a2) + 40000 (r2) = 60000
    // saídas 15000 (r1) + 5000 (a3 atrasado) + 30000 (a1) + 25000 (fatura out) + 10000 (parcela 1) = 85000
    const f = calcularFluxo(cenario(), HOJE, 30);
    expect(f.saldoInicial).toBe(100000);
    expect(f.totalEntradas).toBe(60000);
    expect(f.totalSaidas).toBe(85000);
    expect(f.saldoFinal).toBe(75000);
    expect(f.menorSaldo).toEqual({ saldo: 50000, data: '2026-10-05' });
    expect(f.diasNegativos).toBe(0);
  });

  it('mostra o resumo e o seletor de período na tela', async () => {
    renderizarApp('/fluxo', cenario());
    expect(screen.getByRole('heading', { name: 'Fluxo de caixa' })).toBeInTheDocument();
    expect(screen.getByTestId('saldo-inicial')).toHaveTextContent('1.000,00');
    expect(screen.getByTestId('saldo-final')).toHaveTextContent('750,00');
    expect(screen.getByTestId('menor-saldo')).toHaveTextContent('500,00');
    expect(screen.getByTestId('menor-saldo')).toHaveTextContent('05/10/2026');
    expect(screen.getByTestId('dias-negativos')).toHaveTextContent('0');
    expect(screen.getAllByTestId(/^dia-/)).toHaveLength(30);
    await userEvent.selectOptions(screen.getByLabelText('Período'), '60');
    expect(screen.getAllByTestId(/^dia-/)).toHaveLength(60);
    await userEvent.selectOptions(screen.getByLabelText('Período'), '90');
    expect(screen.getAllByTestId(/^dia-/)).toHaveLength(90);
  });

  it('mostra estado vazio sem saldo nem itens e a rota aparece na navegação', () => {
    expect(itensNavegacao).toContainEqual({ to: '/fluxo', rotulo: 'Fluxo de caixa' });
    renderizarApp('/fluxo', construirEstado());
    expect(screen.getByText('Nada para prever ainda')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Fluxo de caixa diário' })).not.toBeInTheDocument();
  });
});

describe('critério 11: saldo diário e fontes', () => {
  it('o saldo de cada dia é o saldo inicial mais entradas menos saídas acumuladas', () => {
    const f = calcularFluxo(cenario(), HOJE, 30);
    const saldo = (data: string) => f.dias.find((d) => d.data === data)!.saldo;
    expect(saldo('2026-10-01')).toBe(80000); // 100000 - 15000 (r1 dia 1) - 5000 (a3 atrasado em hoje)
    expect(saldo('2026-10-04')).toBe(80000);
    expect(saldo('2026-10-05')).toBe(50000); // - 30000
    expect(saldo('2026-10-10')).toBe(70000); // + 20000
    expect(saldo('2026-10-15')).toBe(85000); // + 40000 (r2) - 25000 (fatura)
    expect(saldo('2026-10-20')).toBe(75000); // - 10000 (parcela 1 da dívida)
    expect(saldo('2026-10-30')).toBe(75000);
  });

  it('usa só contas não-cartão no saldo inicial e ignora arquivadas', () => {
    const estado = construirEstado({ contas: [conta(), conta({ id: 'c2', saldoInicial: 5000, arquivada: true }), cartao({ saldoInicial: -9000 })] });
    expect(calcularFluxo(estado, HOJE, 30).saldoInicial).toBe(100000);
  });

  it('não inclui itens pagos, recorrência inativa nem dívida "emprestei"', () => {
    const chaves = itensPrevistos(cenario(), HOJE, 30).map((i) => i.chave);
    expect(chaves.some((c) => c.includes('a4'))).toBe(false);
    expect(chaves.some((c) => c.includes('r3'))).toBe(false);
    expect(chaves.filter((c) => c.startsWith('divida:'))).toHaveLength(1);
  });

  it('recorrência usa o dia cadastrado ou, sem dia, o dia 1', () => {
    expect(diaDaRecorrencia(recorrencia('a', 'despesa', 1))).toBe(1);
    expect(diaDaRecorrencia(recorrencia('a', 'despesa', 1, { dia: 15 }))).toBe(15);
    expect(diaDaRecorrencia(recorrencia('a', 'despesa', 1, { dia: 40 }))).toBe(1);
    const itens = itensPrevistos(construirEstado({ contas: [conta()], recorrencias: [recorrencia('r', 'despesa', 100)] }), '2026-10-10', 60);
    expect(itens.map((i) => i.data)).toEqual(['2026-11-01', '2026-12-01']);
  });

  it('no horizonte de 60 dias entram a fatura seguinte e as demais parcelas', () => {
    // 60 dias: 10-01..11-29. Entradas: 20000 + 40000 + 40000 = 100000.
    // Saídas: 85000 + r1 nov 15000 + fatura nov 10000 + parcela 2 10000 = 120000.
    const f = calcularFluxo(cenario(), HOJE, 60);
    expect(f.totalEntradas).toBe(100000);
    expect(f.totalSaidas).toBe(120000);
    expect(f.saldoFinal).toBe(80000);
    expect(f.itens.some((i) => i.origem.tipo === 'fatura' && i.origem.id === 'cc@2026-11')).toBe(true);
  });

  it('fatura paga parcialmente entra pelo restante e fatura quitada não entra', () => {
    const estado = cenario();
    const parcial = { ...estado, pagamentosFatura: [{ id: 'p1', contaCartaoId: 'cc', mesFatura: '2026-10', valor: 10000, data: '2026-09-30', contaOrigemId: 'c1' }] };
    const fat = itensPrevistos(parcial, HOJE, 30).find((i) => i.origem.id === 'cc@2026-10')!;
    expect(fat.valor).toBe(15000);
    const quitada = { ...parcial, pagamentosFatura: [{ ...parcial.pagamentosFatura[0], valor: 25000 }] };
    expect(itensPrevistos(quitada, HOJE, 30).some((i) => i.origem.id === 'cc@2026-10')).toBe(false);
  });

  it('item vencido cai em hoje e fica marcado como atrasado', () => {
    const item = itensPrevistos(cenario(), HOJE, 30).find((i) => i.origem.id === 'a3')!;
    expect(item.data).toBe(HOJE);
    expect(item.dataOriginal).toBe('2026-09-28');
    expect(item.atrasado).toBe(true);
  });

  it('é puro: não altera o estado recebido', () => {
    const estado = cenario();
    const copia = JSON.stringify(estado);
    oQueFazer(calcularFluxo(estado, HOJE, 90), HOJE);
    expect(JSON.stringify(estado)).toBe(copia);
  });
});

describe('critério 12: rastreabilidade, filtro e destaque em texto', () => {
  it('cada item da tabela mostra tipo, valor, origem e id', () => {
    renderizarApp('/fluxo', cenario());
    const dia = within(screen.getByTestId('dia-2026-10-05'));
    expect(dia.getByText('Item a1')).toBeInTheDocument();
    expect(dia.getByText(/Saída de R\$\s*300,00 · Agendamento/)).toBeInTheDocument();
    const fatura = within(screen.getByTestId('dia-2026-10-15'));
    expect(fatura.getByText('cc@2026-10')).toBeInTheDocument();
    expect(fatura.getByText(/Fatura de cartão/)).toBeInTheDocument();
    expect(fatura.getByText(/Entrada de R\$\s*400,00 · Recorrência/)).toBeInTheDocument();
    const tipos = new Set([...document.querySelectorAll('[data-origem-tipo]')].map((e) => e.getAttribute('data-origem-tipo')));
    expect(tipos).toEqual(new Set(['agendamento', 'recorrencia', 'fatura', 'divida']));
  });

  it('o filtro "Somente dias com movimento" esconde os dias vazios', async () => {
    renderizarApp('/fluxo', cenario());
    await userEvent.click(screen.getByLabelText('Somente dias com movimento'));
    // Dias com movimento: 01 (r1, a3), 05, 10, 15, 20.
    expect(screen.getAllByTestId(/^dia-/).map((e) => e.getAttribute('data-testid'))).toEqual([
      'dia-2026-10-01',
      'dia-2026-10-05',
      'dia-2026-10-10',
      'dia-2026-10-15',
      'dia-2026-10-20',
    ]);
  });

  it('dias negativos são descritos em texto, não só por cor', () => {
    const estado = construirEstado({
      contas: [conta({ saldoInicial: 10000 })],
      agenda: [agenda('a1', 'despesa', 30000, '2026-10-05'), agenda('a2', 'receita', 50000, '2026-10-20')],
    });
    renderizarApp('/fluxo', estado);
    expect(within(screen.getByTestId('dia-2026-10-05')).getByText('Negativo: saldo negativo')).toBeInTheDocument();
    expect(within(screen.getByTestId('dia-2026-10-04')).getByText('Positivo')).toBeInTheDocument();
    expect(screen.getByTestId('dias-negativos')).toHaveTextContent('15');
    expect(screen.getByTestId('menor-saldo')).toHaveTextContent('05/10/2026');
    expect(screen.getByRole('status')).toHaveTextContent('o saldo fica negativo em 15 dias');
  });
});

describe('critério 13: gráfico e tabela alternativa', () => {
  it('mostra o gráfico com descrição e a tabela alternativa com todos os dias', () => {
    renderizarApp('/fluxo', cenario());
    expect(screen.getByRole('img', { name: /Gráfico de linha do saldo projetado dia a dia nos próximos 30 dias/ })).toBeInTheDocument();
    const alternativa = screen.getByRole('table', { name: /alternativa ao gráfico/ });
    expect(within(alternativa).getAllByRole('row')).toHaveLength(31);
    expect(within(alternativa).getByRole('row', { name: /05\/10\/2026/ })).toHaveTextContent('500,00');
    expect(screen.getByText('Ver como tabela')).toBeInTheDocument();
  });
});

describe('critério 14: o que fazer', () => {
  const negativo = (): AppState =>
    construirEstado({
      contas: [conta({ saldoInicial: 10000 })],
      agenda: [
        agenda('aluguel', 'despesa', 30000, '2026-10-05', { descricao: 'Aluguel' }),
        agenda('net', 'despesa', 8000, '2026-10-03', { descricao: 'Internet' }),
        agenda('sal', 'receita', 50000, '2026-10-20', { descricao: 'Salário' }),
      ],
    });

  it('sugere adiar a menor saída que cobre o rombo do primeiro dia negativo', () => {
    // 10-05: 10000 - 8000 - 30000 = -28000; só o aluguel (30000) cobre; a próxima entrada é 10-20.
    const f = calcularFluxo(negativo(), HOJE, 30);
    expect(f.menorSaldo).toEqual({ saldo: -28000, data: '2026-10-05' });
    const r = oQueFazer(f, HOJE);
    expect(r.sugestoes).toHaveLength(1);
    expect(r.sugestoes[0].item.origem).toEqual({ tipo: 'agendamento', id: 'aluguel' });
    expect(r.sugestoes[0].depoisDe).toBe('2026-10-20');
    expect(r.sugestoes[0].texto).toContain('Adiar "Aluguel"');
    expect(r.continuaNegativo).toBe(false);
  });

  it('limita a 3 sugestões e avisa quando o saldo continua negativo', () => {
    const estado = construirEstado({
      contas: [conta({ saldoInicial: 0 })],
      agenda: ['02', '03', '04', '05'].map((d) => agenda(`d${d}`, 'despesa', 10000, `2026-10-${d}`)),
    });
    const r = oQueFazer(calcularFluxo(estado, HOJE, 30), HOJE);
    expect(r.sugestoes.map((s) => s.item.origem.id)).toEqual(['d02', 'd03', 'd04']);
    expect(r.continuaNegativo).toBe(true);
  });

  it('sem saídas a adiar não sugere nada e sem dias negativos não há sugestões', () => {
    expect(oQueFazer(calcularFluxo(cenario(), HOJE, 30), HOJE)).toEqual({ sugestoes: [], continuaNegativo: false });
    const sem = construirEstado({ contas: [conta({ saldoInicial: -5000 })], agenda: [agenda('a', 'receita', 1000, '2026-10-20')] });
    const r = oQueFazer(calcularFluxo(sem, HOJE, 30), HOJE);
    expect(r.sugestoes).toEqual([]);
    expect(r.continuaNegativo).toBe(true);
  });

  it('mostra as sugestões na tela e a mensagem tranquila quando não há saldo negativo', () => {
    const { unmount } = renderizarApp('/fluxo', negativo());
    const lista = screen.getByRole('list', { name: 'Sugestões' });
    expect(within(lista).getByText(/Adiar "Aluguel" \(R\$\s*300,00, com vencimento em 05\/10\/2026, Agendamento\) para depois de 20\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Com esses adiamentos, o saldo não fica negativo/)).toBeInTheDocument();
    unmount();
    renderizarApp('/fluxo', cenario());
    expect(screen.getByText(/Não é preciso adiar nenhum pagamento/)).toBeInTheDocument();
  });
});
