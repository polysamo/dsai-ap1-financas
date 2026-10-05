import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  criarDivida,
  dataDaParcelaDivida,
  excluirDivida,
  excluirPagamentoDivida,
  gerarTabela,
  parseTaxaBp,
  registrarPagamentoDivida,
  resumoDivida,
  simular,
  type DadosDivida,
} from '../domain/dividas';
import type { AppState, Divida } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-01';

const dados = (parcial: Partial<DadosDivida> = {}): DadosDivida => ({
  nome: 'Financiamento',
  tipo: 'devo',
  principal: 100000,
  taxaBp: 100,
  parcelas: 3,
  primeiraParcela: '2026-09-10',
  sistema: 'price',
  ...parcial,
});

function comDivida(parcial: Partial<DadosDivida> = {}): { estado: AppState; divida: Divida } {
  const r = criarDivida(construirEstado(), dados(parcial));
  if (!r.ok) throw new Error(r.erro);
  return { estado: r.valor, divida: r.valor.dividas[0] };
}

const pagar = (estado: AppState, id: string, valor: number, parcela?: number) => {
  const r = registrarPagamentoDivida(estado, id, { data: '2026-09-10', valor, parcela }, HOJE);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('dívidas: cadastro e tabela (critérios 1 a 5)', () => {
  it('critério 1: recusa cada valor inválido indicando o campo', () => {
    const tenta = (p: Partial<DadosDivida>) => criarDivida(construirEstado(), dados(p));
    expect(tenta({ nome: '  ' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ nome: 'x'.repeat(61) })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ principal: 0 })).toMatchObject({ ok: false, campo: 'principal' });
    expect(tenta({ principal: Number.NaN })).toMatchObject({ ok: false, campo: 'principal' });
    expect(tenta({ taxaBp: -1 })).toMatchObject({ ok: false, campo: 'taxa' });
    expect(tenta({ taxaBp: 10001 })).toMatchObject({ ok: false, campo: 'taxa' });
    expect(tenta({ parcelas: 0 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(tenta({ parcelas: 481 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(tenta({ parcelas: 2.5 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(tenta({ primeiraParcela: '2026-02-30' })).toMatchObject({ ok: false, campo: 'primeiraParcela' });
    expect(tenta({ taxaBp: 0, parcelas: 480 }).ok).toBe(true);
    expect(parseTaxaBp('1,99')).toBe(199);
    expect(parseTaxaBp('100')).toBe(10000);
    expect(parseTaxaBp('100,01')).toBeNull();
    expect(parseTaxaBp('1,999')).toBeNull();
    expect(parseTaxaBp('-1')).toBeNull();
  });

  it('critério 2: Price de R$ 1.000,00, 1% e 3 parcelas, conferido à mão', () => {
    const t = gerarTabela(dados());
    expect(t.map((l) => l.parcela)).toEqual([34002, 34002, 34003]);
    expect(t.map((l) => l.juros)).toEqual([1000, 670, 337]);
    expect(t.map((l) => l.amortizacao)).toEqual([33002, 33332, 33666]);
    expect(t.map((l) => l.saldo)).toEqual([66998, 33666, 0]);
  });

  it('critério 3: SAC com os mesmos dados', () => {
    const t = gerarTabela(dados({ sistema: 'sac' }));
    expect(t.map((l) => l.amortizacao)).toEqual([33333, 33333, 33334]);
    expect(t.map((l) => l.parcela)).toEqual([34333, 34000, 33667]);
    expect(t.reduce((a, l) => a + l.juros, 0)).toBe(2000);
  });

  it('critério 4: as somas fecham exatamente, em várias combinações, e taxa zero põe o resto na última', () => {
    for (const sistema of ['price', 'sac'] as const) {
      for (const [principal, taxaBp, parcelas] of [[100000, 100, 3], [123457, 199, 12], [999999, 2575, 48], [1, 100, 7], [5000000, 50, 480], [100000, 0, 7]]) {
        const t = gerarTabela(dados({ sistema, principal, taxaBp, parcelas }));
        const amort = t.reduce((a, l) => a + l.amortizacao, 0);
        expect(amort).toBe(principal);
        expect(t[t.length - 1].saldo).toBe(0);
        expect(t.reduce((a, l) => a + l.parcela, 0)).toBe(principal + t.reduce((a, l) => a + l.juros, 0));
        expect(t.every((l) => Number.isInteger(l.parcela) && l.amortizacao >= 0)).toBe(true);
      }
    }
    const zero = gerarTabela(dados({ taxaBp: 0, parcelas: 7 }));
    expect(zero.every((l) => l.juros === 0)).toBe(true);
    expect(zero.map((l) => l.parcela)).toEqual([14285, 14285, 14285, 14285, 14285, 14285, 14290]);
  });

  it('critério 5: vencimentos mensais com limite no fim do mês e virada de ano', () => {
    expect(dataDaParcelaDivida('2026-01-31', 1)).toBe('2026-01-31');
    expect(dataDaParcelaDivida('2026-01-31', 2)).toBe('2026-02-28');
    expect(dataDaParcelaDivida('2026-01-31', 3)).toBe('2026-03-31');
    expect(dataDaParcelaDivida('2028-01-31', 2)).toBe('2028-02-29');
    expect(gerarTabela(dados({ primeiraParcela: '2026-11-15', parcelas: 3 })).map((l) => l.vencimento)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15']);
  });
});

describe('dívidas: pagamentos e resumo (critérios 6 a 10)', () => {
  it('critério 6: pagamento parcial deixa a parcela "Parcial" e valida os limites', () => {
    const { estado, divida } = comDivida({ primeiraParcela: '2026-11-10' });
    const parcial = pagar(estado, divida.id, 10000, 1);
    const linha = resumoDivida(parcial.dividas[0], HOJE).linhas[0];
    expect(linha).toMatchObject({ situacao: 'parcial', pago: 10000, restante: 24002 });

    const tenta = (d: Partial<{ data: string; valor: number; parcela: number }>) =>
      registrarPagamentoDivida(parcial, divida.id, { data: '2026-10-01', valor: 100, parcela: 1, ...d }, HOJE);
    expect(tenta({ data: '2026-13-01' })).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta({ valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ parcela: 9 })).toMatchObject({ ok: false, campo: 'parcela' });
    expect(tenta({ valor: 24003 })).toMatchObject({ ok: false, campo: 'valor' });
    const quitada = pagar(parcial, divida.id, 24002, 1);
    expect(resumoDivida(quitada.dividas[0], HOJE).linhas[0].situacao).toBe('paga');
    expect(registrarPagamentoDivida(quitada, divida.id, { data: '2026-10-01', valor: 1, parcela: 1 }, HOJE)).toMatchObject({ ok: false, campo: 'parcela' });
  });

  it('critério 7: paga, atrasada e pendente, com o vencimento comparado a hoje', () => {
    const { estado, divida } = comDivida({ primeiraParcela: '2026-09-10' });
    const pago = pagar(estado, divida.id, 34002, 1);
    // Vencimentos: 10/09 (paga), 10/10 (pendente em 01/10), 10/11 (pendente).
    expect(resumoDivida(pago.dividas[0], HOJE).linhas.map((l) => l.situacao)).toEqual(['paga', 'pendente', 'pendente']);
    expect(resumoDivida(estado.dividas[0], HOJE).linhas.map((l) => l.situacao)).toEqual(['atrasada', 'pendente', 'pendente']);
    expect(resumoDivida(estado.dividas[0], '2026-10-11').linhas.map((l) => l.situacao)).toEqual(['atrasada', 'atrasada', 'pendente']);
    expect(resumoDivida(estado.dividas[0], '2026-10-10').linhas[1].situacao).toBe('pendente');
  });

  it('critério 8: amortização extra abate o saldo e é limitada a ele', () => {
    const { estado, divida } = comDivida({ primeiraParcela: '2026-11-10' });
    const com = pagar(estado, divida.id, 40000);
    expect(resumoDivida(com.dividas[0], HOJE).saldoDevedor).toBe(60000);
    expect(registrarPagamentoDivida(com, divida.id, { data: '2026-10-01', valor: 60001 }, HOJE)).toMatchObject({ ok: false, campo: 'valor' });
    expect(registrarPagamentoDivida(com, divida.id, { data: 'x', valor: 100 }, HOJE)).toMatchObject({ ok: false, campo: 'data' });
    const zerada = pagar(com, divida.id, 60000);
    expect(resumoDivida(zerada.dividas[0], HOJE)).toMatchObject({ saldoDevedor: 0, quitada: true, proxima: null });
  });

  it('critério 9: resumo com saldo, juros, total pago, próxima parcela e atrasos', () => {
    const { estado, divida } = comDivida({ primeiraParcela: '2026-08-10' });
    const sem = resumoDivida(estado.dividas[0], HOJE);
    expect(sem).toMatchObject({ saldoDevedor: 100000, totalJuros: 2007, totalPago: 0, quitada: false });
    expect(sem.atrasadas).toEqual({ quantidade: 2, valor: 68004 });
    expect(sem.proxima?.numero).toBe(1);

    const pago = pagar(pagar(estado, divida.id, 34002, 1), divida.id, 4000, 2);
    const r = resumoDivida(pago.dividas[0], HOJE);
    expect(r.saldoDevedor).toBe(100000 - 33002);
    expect(r.totalPago).toBe(38002);
    expect(r.proxima).toMatchObject({ numero: 2, vencimento: '2026-09-10', restante: 30002 });
    expect(r.atrasadas).toEqual({ quantidade: 1, valor: 30002 });

    const tudo = pagar(pagar(pago, divida.id, 30002, 2), divida.id, 34003, 3);
    expect(resumoDivida(tudo.dividas[0], HOJE)).toMatchObject({ saldoDevedor: 0, quitada: true, proxima: null, atrasadas: { quantidade: 0, valor: 0 } });
  });

  it('exclusão de pagamento e de dívida', () => {
    const { estado, divida } = comDivida();
    const com = pagar(estado, divida.id, 1000, 1);
    const sem = excluirPagamentoDivida(com, divida.id, com.dividas[0].pagamentos[0].id);
    expect(sem.ok && sem.valor.dividas[0].pagamentos).toEqual([]);
    expect(excluirPagamentoDivida(com, divida.id, 'nada').ok).toBe(false);
    const fim = excluirDivida(com, divida.id);
    expect(fim.ok && fim.valor.dividas).toEqual([]);
    expect(excluirDivida(com, 'nada').ok).toBe(false);
  });

  it('critério 10: empréstimo concedido usa o mesmo cálculo', () => {
    const devo = gerarTabela(comDivida().divida);
    const emprestei = gerarTabela(comDivida({ tipo: 'emprestei' }).divida);
    expect(emprestei).toEqual(devo);
  });
});

describe('dívidas: simulador (critério 11)', () => {
  it('compara Price e SAC com os números conferidos à mão', () => {
    const s = simular({ principal: 100000, taxaBp: 100, parcelas: 3 });
    expect(s.price).toEqual({ primeiraParcela: 34002, ultimaParcela: 34003, totalJuros: 2007, totalPago: 102007 });
    expect(s.sac).toEqual({ primeiraParcela: 34333, ultimaParcela: 33667, totalJuros: 2000, totalPago: 102000 });
  });
});

describe('dívidas: tela (critérios 1, 6, 8, 10 a 14)', () => {
  const preencherNova = async (user: ReturnType<typeof userEvent.setup>, v: Record<string, string>) => {
    const form = within(screen.getByRole('form', { name: 'Nova dívida' }));
    await user.type(form.getByLabelText('Nome'), v.nome);
    await user.type(form.getByLabelText('Valor principal'), v.principal);
    await user.type(form.getByLabelText('Taxa de juros mensal (%)'), v.taxa);
    await user.type(form.getByLabelText('Número de parcelas'), v.parcelas);
    return form;
  };

  it('critério 12: estado vazio com simulador; cadastro recusa erros junto ao campo e depois grava', async () => {
    const user = userEvent.setup();
    renderizarApp('/dividas');
    expect(screen.getByText('Nenhuma dívida cadastrada')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Nova dívida' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nova dívida' }));

    const form = within(screen.getByRole('form', { name: 'Nova dívida' }));
    await user.click(form.getByRole('button', { name: 'Cadastrar dívida' }));
    expect(await form.findByText('Informe um nome de 1 a 60 caracteres.')).toBeInTheDocument();
    expect(form.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
    expect(form.getByRole('alert')).toBeInTheDocument();

    await preencherNova(user, { nome: 'Carro', principal: '1000,00', taxa: '1', parcelas: '0' });
    await user.click(form.getByRole('button', { name: 'Cadastrar dívida' }));
    expect(await form.findByText('Informe de 1 a 480 parcelas.')).toBeInTheDocument();

    await user.clear(form.getByLabelText('Número de parcelas'));
    await user.type(form.getByLabelText('Número de parcelas'), '3');
    await user.clear(form.getByLabelText('Data da primeira parcela'));
    await user.type(form.getByLabelText('Data da primeira parcela'), '2100-01-10');
    await user.click(form.getByRole('button', { name: 'Cadastrar dívida' }));

    expect(await screen.findByTestId('saldo-devedor')).toHaveTextContent('R$ 1.000,00');
    expect(screen.getByTestId('total-juros')).toHaveTextContent('R$ 20,07');
    expect(within(screen.getByTestId('parcela-1')).getByText('Pendente')).toBeInTheDocument();
    expect(lerEstadoSalvo().dividas[0]).toMatchObject({ nome: 'Carro', principal: 100000, taxaBp: 100, parcelas: 3, sistema: 'price', tipo: 'devo' });
  });

  it('critérios 6 e 8: registra pagamento parcial, quita e amortiza, com erros no campo', async () => {
    const user = userEvent.setup();
    const { estado } = comDivida({ primeiraParcela: '2100-01-10' });
    renderizarApp('/dividas', estado);

    const form = () => within(screen.getByRole('form', { name: 'Registrar pagamento' }));
    await user.clear(form().getByLabelText('Valor do pagamento'));
    await user.type(form().getByLabelText('Valor do pagamento'), '100,00');
    await user.click(form().getByRole('button', { name: 'Registrar pagamento' }));
    expect(await screen.findByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('restam R$ 240,02')).toBeInTheDocument();
    expect(screen.getByTestId('total-pago')).toHaveTextContent('R$ 100,00');

    await user.clear(form().getByLabelText('Valor do pagamento'));
    await user.type(form().getByLabelText('Valor do pagamento'), '999,00');
    await user.click(form().getByRole('button', { name: 'Registrar pagamento' }));
    expect(await form().findByRole('alert')).toHaveTextContent('O valor passa do restante da parcela.');

    await user.selectOptions(form().getByLabelText('Pagamento de'), 'extra');
    await user.clear(form().getByLabelText('Valor do pagamento'));
    await user.type(form().getByLabelText('Valor do pagamento'), '500,00');
    await user.click(form().getByRole('button', { name: 'Registrar pagamento' }));
    expect(await screen.findByText(/Amortização extra \(reduz o prazo\) · R\$ 500,00/)).toBeInTheDocument();
    expect(screen.getByTestId('saldo-devedor')).toHaveTextContent('R$ 500,00');

    await user.click(screen.getAllByRole('button', { name: /Excluir pagamento de/ })[0]);
    expect(lerEstadoSalvo().dividas[0].pagamentos).toHaveLength(1);
  });

  it('critério 9: mostra atrasos e próxima parcela; tabela com situação em texto', () => {
    const { estado } = comDivida({ primeiraParcela: '2020-01-10', parcelas: 3 });
    renderizarApp('/dividas', estado);
    expect(screen.getByTestId('atrasadas-valor')).toHaveTextContent('R$ 1.020,07');
    expect(screen.getAllByText('Atrasada')).toHaveLength(3);
    expect(screen.getByTestId('proxima')).toHaveTextContent('Nº 1, 10/01/2020, R$ 340,02');
  });

  it('critério 10: empréstimo concedido usa rótulos de recebimento', () => {
    const { estado } = comDivida({ tipo: 'emprestei', primeiraParcela: '2100-01-10' });
    renderizarApp('/dividas', estado);
    expect(screen.getByText('Saldo a receber')).toBeInTheDocument();
    expect(screen.getByText('Próxima parcela a receber')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Registrar recebimento' })).toBeInTheDocument();
    expect(screen.queryByText('Saldo devedor')).not.toBeInTheDocument();
  });

  it('critério 11: o simulador mostra Price e SAC lado a lado, recusa erros e não grava', async () => {
    const user = userEvent.setup();
    renderizarApp('/dividas');
    await user.click(screen.getByRole('button', { name: 'Simulador Price x SAC' }));
    const form = within(screen.getByRole('form', { name: 'Simulador' }));
    await user.click(form.getByRole('button', { name: 'Simular' }));
    expect(await form.findByRole('alert')).toHaveTextContent('Informe um valor maior que zero.');

    await user.type(form.getByLabelText('Principal a simular'), '1000');
    await user.type(form.getByLabelText('Taxa mensal a simular (%)'), '1');
    await user.type(form.getByLabelText('Prazo a simular (parcelas)'), '3');
    await user.click(form.getByRole('button', { name: 'Simular' }));
    expect(screen.getByTestId('sim-price-primeira')).toHaveTextContent('R$ 340,02');
    expect(screen.getByTestId('sim-price-juros')).toHaveTextContent('R$ 20,07');
    expect(screen.getByTestId('sim-sac-primeira')).toHaveTextContent('R$ 343,33');
    expect(screen.getByTestId('sim-sac-total')).toHaveTextContent('R$ 1.020,00');
    expect(localStorage.getItem(CHAVE_ESTADO)).toBeNull();
  });

  it('critério 12: exclui a dívida somente após confirmar', async () => {
    const user = userEvent.setup();
    const { estado } = comDivida({ primeiraParcela: '2100-01-10' });
    renderizarApp('/dividas', estado);
    await user.click(screen.getByRole('button', { name: 'Excluir dívida' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(lerEstadoSalvo().dividas).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Excluir dívida' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(lerEstadoSalvo().dividas).toEqual([]);
    expect(await screen.findByText('Nenhuma dívida cadastrada')).toBeInTheDocument();
  });

  it('critério 13: dados sem a chave dividas carregam vazios e as dívidas persistem', () => {
    const antigo = { ...construirEstado(), schemaVersion: 2 } as Partial<AppState>;
    delete antigo.dividas;
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.dividas).toEqual([]);

    const { estado } = comDivida();
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    const recarga = carregar(localStorage);
    expect(recarga.tipo === 'ok' && recarga.estado.dividas).toEqual(estado.dividas);
  });

  it('critério 14: a navegação tem o item Dívidas para /dividas', () => {
    expect(itensNavegacao).toContainEqual({ to: '/dividas', rotulo: 'Dívidas' });
    renderizarApp('/');
    expect(screen.getAllByRole('link', { name: 'Dívidas' })[0]).toHaveAttribute('href', '/dividas');
  });
});
