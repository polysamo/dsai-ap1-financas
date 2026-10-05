import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { criarDivida, gerarTabela, gerarTabelaEfetiva, previaAmortizacao, registrarPagamentoDivida, resumoDivida, type DadosDivida } from '../domain/dividas';
import type { AppState, Divida, EfeitoAmortizacao, PagamentoDivida } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-01-01';

const dados = (parcial: Partial<DadosDivida> = {}): DadosDivida => ({
  nome: 'Carro',
  tipo: 'devo',
  principal: 120000,
  taxaBp: 100,
  parcelas: 12,
  primeiraParcela: '2026-01-10',
  sistema: 'sac',
  ...parcial,
});

const divida = (parcial: Partial<DadosDivida> = {}, pagamentos: PagamentoDivida[] = []): Divida => {
  const r = criarDivida(construirEstado(), dados(parcial));
  if (!r.ok) throw new Error(r.erro);
  return { ...r.valor.dividas[0], pagamentos };
};

let seq = 0;
const extra = (valor: number, data: string, efeito?: EfeitoAmortizacao): PagamentoDivida => ({ id: `x${++seq}`, data, valor, ...(efeito ? { efeito } : {}) });
const parcelaPaga = (numero: number, valor: number): PagamentoDivida => ({ id: `p${++seq}`, data: '2026-01-10', valor, parcela: numero });

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('dívidas v2: tabela efetiva', () => {
  it('critérios 2 e 5: SAC com redução de prazo mantém a amortização e termina antes', () => {
    const d = divida({}, [extra(30000, '2026-04-01', 'prazo')]);
    const contrato = gerarTabela(d);
    const efetiva = gerarTabelaEfetiva(d);
    expect(efetiva.slice(0, 3)).toEqual(contrato.slice(0, 3));
    expect(efetiva).toHaveLength(9);
    expect(efetiva[3]).toMatchObject({ numero: 4, juros: 600, amortizacao: 10000, parcela: 10600, saldo: 50000 });
    expect(efetiva[8]).toMatchObject({ numero: 9, saldo: 0 });
  });

  it('critério 5: SAC com redução de parcela mantém o número de parcelas e divide o saldo', () => {
    const efetiva = gerarTabelaEfetiva(divida({}, [extra(30000, '2026-04-01', 'parcela')]));
    expect(efetiva).toHaveLength(12);
    expect(efetiva[3]).toMatchObject({ juros: 600, amortizacao: 6666, parcela: 7266 });
    expect(efetiva[11]).toMatchObject({ amortizacao: 6672, saldo: 0 });
  });

  it('critério 3: Price com redução de prazo mantém o valor da parcela até a penúltima', () => {
    const d = divida({ sistema: 'price' }, [extra(30000, '2026-04-01', 'prazo')]);
    const fixa = gerarTabela(d)[0].parcela;
    const efetiva = gerarTabelaEfetiva(d);
    expect(efetiva.length).toBeLessThan(12);
    expect(efetiva.slice(0, -1).every((l) => l.parcela === fixa)).toBe(true);
    expect(efetiva[efetiva.length - 1].parcela).toBeLessThanOrEqual(fixa);
  });

  it('critério 4: Price com redução de parcela mantém 12 parcelas de valor menor e igual entre si', () => {
    const d = divida({ sistema: 'price' }, [extra(30000, '2026-04-01', 'parcela')]);
    const fixa = gerarTabela(d)[0].parcela;
    const efetiva = gerarTabelaEfetiva(d);
    expect(efetiva).toHaveLength(12);
    const novas = efetiva.slice(3, -1).map((l) => l.parcela);
    expect(new Set(novas).size).toBe(1);
    expect(novas[0]).toBeLessThan(fixa);
    expect(Math.abs(efetiva[11].parcela - novas[0])).toBeLessThanOrEqual(5);
  });

  it('critério 2: taxa zero com extras é exata', () => {
    const prazo = gerarTabelaEfetiva(divida({ taxaBp: 0, sistema: 'price' }, [extra(30000, '2026-04-01', 'prazo')]));
    expect(prazo.map((l) => l.parcela)).toEqual([10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]);
    const parcela = gerarTabelaEfetiva(divida({ taxaBp: 0, sistema: 'price' }, [extra(30000, '2026-04-01', 'parcela')]));
    expect(parcela.slice(3).map((l) => l.parcela)).toEqual([6666, 6666, 6666, 6666, 6666, 6666, 6666, 6666, 6672]);
  });

  it('critério 6: invariantes em combinações de sistema, taxa e extras', () => {
    const cenarios: [Partial<DadosDivida>, PagamentoDivida[]][] = [
      [{ sistema: 'price', taxaBp: 199, parcelas: 36, principal: 2500000 }, [extra(300000, '2026-03-02', 'prazo'), extra(150000, '2026-09-20', 'parcela')]],
      [{ sistema: 'sac', taxaBp: 87, parcelas: 24, principal: 777777 }, [extra(100000, '2026-02-15', 'parcela'), extra(50000, '2026-02-16', 'prazo')]],
      [{ sistema: 'price', taxaBp: 0, parcelas: 7, principal: 1001 }, [extra(500, '2026-03-01')]],
      [{ sistema: 'sac', taxaBp: 350, parcelas: 60, principal: 9000000 }, [extra(4000000, '2027-01-01', 'prazo')]],
    ];
    for (const [termos, pagamentos] of cenarios) {
      const d = divida(termos, pagamentos);
      const efetiva = gerarTabelaEfetiva(d);
      const aplicadas = soma(pagamentos.filter((p) => p.data < efetiva[efetiva.length - 1].vencimento).map((p) => p.valor));
      expect(soma(efetiva.map((l) => l.amortizacao)) + aplicadas).toBe(d.principal);
      expect(efetiva[efetiva.length - 1].saldo).toBe(0);
      expect(efetiva.length).toBeLessThanOrEqual(d.parcelas);
      expect(efetiva.every((l) => l.parcela === l.juros + l.amortizacao)).toBe(true);
    }
  });

  it('critério 1: extra antiga sem efeito é lida como prazo', () => {
    const semEfeito = gerarTabelaEfetiva(divida({}, [extra(30000, '2026-04-01')]));
    const prazo = gerarTabelaEfetiva(divida({}, [extra(30000, '2026-04-01', 'prazo')]));
    expect(semEfeito).toEqual(prazo);
  });

  it('critério 7: extra que quita o saldo encerra a tabela e a dívida fica quitada', () => {
    const pagas = [parcelaPaga(1, 11200), parcelaPaga(2, 11100), parcelaPaga(3, 11000)];
    const d = divida({}, [...pagas, extra(90000, '2026-03-20', 'prazo')]);
    const r = resumoDivida(d, HOJE);
    expect(r.linhas).toHaveLength(3);
    expect(r.quitada).toBe(true);
    expect(r.parcelasAMenos).toBe(9);
  });

  it('critério 8: extra depois do último vencimento não muda a tabela, só o saldo', () => {
    const d = divida({ parcelas: 3, principal: 30000 }, [extra(5000, '2026-06-01', 'parcela')]);
    expect(gerarTabelaEfetiva(d)).toEqual(gerarTabela(d));
    expect(resumoDivida(d, HOJE).saldoDevedor).toBe(25000);
  });

  it('critério 9: o resumo mostra a economia de juros e as parcelas a menos', () => {
    const r = resumoDivida(divida({}, [extra(30000, '2026-04-01', 'prazo')]), HOJE);
    expect(r.economiaJuros).toBe(2400);
    expect(r.parcelasAMenos).toBe(3);
    expect(resumoDivida(divida(), HOJE)).toMatchObject({ economiaJuros: 0, parcelasAMenos: 0 });
  });

  it('critério 10: prévia das duas opções sem gravar, nula com valor inválido', () => {
    const d = divida();
    const previa = previaAmortizacao(d, 30000, '2026-04-01', HOJE);
    expect(previa).toEqual({
      prazo: { novaParcela: 10600, parcelasRestantes: 6, economiaJuros: 2400 },
      parcela: { novaParcela: 7266, parcelasRestantes: 9, economiaJuros: 1500 },
    });
    expect(d.pagamentos).toHaveLength(0);
    expect(previaAmortizacao(d, 0, '2026-04-01', HOJE)).toBeNull();
    expect(previaAmortizacao(d, 120001, '2026-04-01', HOJE)).toBeNull();
    expect(previaAmortizacao(d, 100, '2026-02-30', HOJE)).toBeNull();
  });

  it('critério 1: registrar extra grava o efeito, com prazo como padrão', () => {
    const estado: AppState = construirEstado({ dividas: [divida()] });
    const id = estado.dividas[0].id;
    const r1 = registrarPagamentoDivida(estado, id, { data: '2026-04-01', valor: 1000 }, HOJE);
    const r2 = registrarPagamentoDivida(estado, id, { data: '2026-04-01', valor: 1000, efeito: 'parcela' }, HOJE);
    expect(r1.ok && r1.valor.dividas[0].pagamentos[0].efeito).toBe('prazo');
    expect(r2.ok && r2.valor.dividas[0].pagamentos[0].efeito).toBe('parcela');
    const r3 = registrarPagamentoDivida(estado, id, { data: '2026-04-01', valor: 1000, parcela: 1 }, HOJE);
    expect(r3.ok && 'efeito' in r3.valor.dividas[0].pagamentos[0]).toBe(false);
  });
});

describe('dívidas v2: tela', () => {
  it('critérios 10, 11 e 12: prévia no formulário, efeito gravado, rótulo na lista e exclusão', async () => {
    const user = userEvent.setup();
    renderizarApp('/dividas', construirEstado({ dividas: [divida({ primeiraParcela: '2100-01-10' })] }));
    const form = () => within(screen.getByRole('form', { name: 'Registrar pagamento' }));
    await user.selectOptions(form().getByLabelText('Pagamento de'), 'extra');
    await user.type(form().getByLabelText('Valor do pagamento'), '300,00');
    const previa = form().getByRole('table', { name: 'Prévia da amortização' });
    expect(within(previa).getByRole('row', { name: /Reduzir o prazo/ })).toHaveTextContent(/R\$\s109,00\s*9/);
    expect(within(previa).getByRole('row', { name: /Reduzir a parcela/ })).toHaveTextContent(/R\$\s84,00\s*12/);
    await user.click(form().getByRole('radio', { name: 'Reduzir a parcela' }));
    await user.click(form().getByRole('button', { name: 'Registrar pagamento' }));
    expect(lerEstadoSalvo().dividas[0].pagamentos[0]).toMatchObject({ valor: 30000, efeito: 'parcela' });
    expect(await screen.findByText(/Amortização extra \(reduz a parcela\) · R\$\s300,00/)).toBeInTheDocument();
    expect(screen.getByTestId('economia')).toHaveTextContent('de juros');
    expect(screen.getByText(/0\/12 parcelas pagas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Excluir pagamento de/ }));
    expect(screen.queryByTestId('economia')).not.toBeInTheDocument();
  });

  it('critério 10: valor acima do saldo não mostra prévia', async () => {
    const user = userEvent.setup();
    renderizarApp('/dividas', construirEstado({ dividas: [divida({ primeiraParcela: '2100-01-10' })] }));
    const form = within(screen.getByRole('form', { name: 'Registrar pagamento' }));
    await user.selectOptions(form.getByLabelText('Pagamento de'), 'extra');
    await user.type(form.getByLabelText('Valor do pagamento'), '5000,00');
    expect(form.queryByRole('table', { name: 'Prévia da amortização' })).not.toBeInTheDocument();
    expect(form.getByRole('radio', { name: 'Reduzir o prazo' })).toBeChecked();
  });
});
