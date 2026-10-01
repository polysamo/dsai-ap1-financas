import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  agendamentosDoMes,
  alertaVencimentos,
  criarAgendamentos,
  diasDaGrade,
  excluirAgendamento,
  marcarComoPago,
  reabrirAgendamento,
  situacaoAgendamento,
  somarDias,
  totaisAgenda,
  type DadosAgendamento,
} from '../domain/agenda';
import { saldoConta } from '../domain/contas';
import { hojeISO } from '../domain/date';
import type { Agendamento, AppState, Conta } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar } from '../storage/storage';
import { construirEstado, renderizarApp } from './helpers';

const corrente: Conta = { id: 'cc', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1 };
const velha: Conta = { id: 'velha', nome: 'Velha', tipo: 'dinheiro', saldoInicial: 0, arquivada: true, criadaEm: 2 };

const item = (id: string, vencimento: string, parcial: Partial<Agendamento> = {}): Agendamento => ({
  id,
  descricao: id,
  tipo: 'despesa',
  valor: 10000,
  vencimento,
  categoriaId: 'cat-moradia',
  contaId: 'cc',
  criadoEm: 1,
  ...parcial,
});

const base = (agenda: Agendamento[] = []): AppState => construirEstado({ contas: [corrente, velha], agenda });

const dados: DadosAgendamento = { descricao: 'Aluguel', tipo: 'despesa', valor: 150000, vencimento: '2026-10-31', categoriaId: 'cat-moradia', contaId: 'cc', repeticoes: 1 };

function criar(estado: AppState, parcial: Partial<DadosAgendamento> = {}): AppState {
  const r = criarAgendamentos(estado, { ...dados, ...parcial });
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
}

describe('calendário: criação (critérios 1, 2)', () => {
  it('critério 1: valida descrição, valor, vencimento, categoria, conta e repetições, indicando o campo', () => {
    const tenta = (parcial: Partial<DadosAgendamento>) => criarAgendamentos(base(), { ...dados, ...parcial });
    expect(tenta({ descricao: '  ' })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(tenta({ valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ vencimento: '2026-02-31' })).toMatchObject({ ok: false, campo: 'vencimento' });
    expect(tenta({ categoriaId: 'cat-salario' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(tenta({ tipo: 'receita' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(tenta({ contaId: 'velha' })).toMatchObject({ ok: false, campo: 'contaId' });
    expect(tenta({ repeticoes: 0 })).toMatchObject({ ok: false, campo: 'repeticoes' });
    expect(tenta({ repeticoes: 61 })).toMatchObject({ ok: false, campo: 'repeticoes' });
    expect(tenta({ contaId: undefined }).ok).toBe(true);
    expect(tenta({ tipo: 'receita', categoriaId: 'cat-salario' }).ok).toBe(true);
  });

  it('critério 2: a recorrência cria um lançamento por mês, com dia limitado ao fim do mês e sufixo (k/n)', () => {
    const agenda = criar(base(), { repeticoes: 3 }).agenda;
    expect(agenda.map((a) => a.vencimento)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
    expect(agenda.map((a) => a.descricao)).toEqual(['Aluguel (1/3)', 'Aluguel (2/3)', 'Aluguel (3/3)']);
    expect(new Set(agenda.map((a) => a.serie?.grupoId)).size).toBe(1);
    expect(agenda.every((a) => a.valor === 150000)).toBe(true);
    const unico = criar(base()).agenda;
    expect(unico).toHaveLength(1);
    expect(unico[0].descricao).toBe('Aluguel');
    expect(unico[0].serie).toBeUndefined();
    expect(criar(base(), { vencimento: '2027-01-31', repeticoes: 2 }).agenda[1].vencimento).toBe('2027-02-28');
  });
});

describe('calendário: situação, listas e totais (critérios 3, 4, 5, 6)', () => {
  it('critério 3: pago, atrasado e pendente (vencer hoje ainda é pendente)', () => {
    expect(situacaoAgendamento(item('a', '2026-10-10'), '2026-10-10')).toBe('pendente');
    expect(situacaoAgendamento(item('a', '2026-10-10'), '2026-10-11')).toBe('atrasado');
    expect(situacaoAgendamento(item('a', '2026-10-10'), '2026-10-09')).toBe('pendente');
    expect(situacaoAgendamento(item('a', '2026-10-01', { pagoEm: '2026-10-20' }), '2026-12-01')).toBe('pago');
  });

  it('critério 4: a grade começa no dia da semana certo e tem todos os dias do mês', () => {
    const out = diasDaGrade('2026-10');
    expect(out.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(out).toHaveLength(4 + 31);
    expect(diasDaGrade('2026-02')[0]).toBe('2026-02-01');
    expect(diasDaGrade('2026-02').filter(Boolean)).toHaveLength(28);
  });

  it('critério 5: a lista do mês exclui outros meses e ordena por vencimento e criação', () => {
    const estado = base([item('c', '2026-10-20', { criadoEm: 3 }), item('a', '2026-10-05'), item('b', '2026-10-20', { criadoEm: 2 }), item('fora', '2026-11-01')]);
    expect(agendamentosDoMes(estado, '2026-10').map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(agendamentosDoMes(estado, '2026-12')).toEqual([]);
  });

  it('critério 6: totais a pagar, a receber, já pago e já recebido', () => {
    const itens = [
      item('p1', '2026-10-05', { valor: 10001 }),
      item('p2', '2026-10-06', { valor: 5000 }),
      item('pg', '2026-10-07', { valor: 700, pagoEm: '2026-10-07' }),
      item('r1', '2026-10-08', { tipo: 'receita', valor: 30000 }),
      item('rr', '2026-10-09', { tipo: 'receita', valor: 250, pagoEm: '2026-10-09' }),
    ];
    expect(totaisAgenda(itens)).toEqual({ aPagar: 15001, aReceber: 30000, jaPago: 700, jaRecebido: 250 });
    expect(totaisAgenda([])).toEqual({ aPagar: 0, aReceber: 0, jaPago: 0, jaRecebido: 0 });
  });
});

describe('calendário: baixa, reabertura e exclusão (critérios 7 a 11)', () => {
  const estado = base([item('luz', '2026-10-10', { descricao: 'Conta de luz', valor: 18990 })]);
  const baixa = { contaId: 'cc', categoriaId: 'cat-moradia', data: '2026-10-09' };

  it('critério 7: a baixa cria a transação na conta e categoria escolhidas e muda o saldo', () => {
    const r = marcarComoPago(estado, 'luz', { contaId: 'cc', categoriaId: 'cat-lazer', data: '2026-10-09' });
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.transacoes).toHaveLength(1);
    expect(r.valor.transacoes[0]).toMatchObject({ contaId: 'cc', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 18990, data: '2026-10-09', descricao: 'Conta de luz' });
    expect(r.valor.agenda[0]).toMatchObject({ pagoEm: '2026-10-09', transacaoId: r.valor.transacoes[0].id });
    expect(saldoConta(r.valor, 'cc')).toBe(100000 - 18990);
  });

  it('critério 7: a baixa de uma receita soma ao saldo', () => {
    const rec = base([item('sal', '2026-10-05', { tipo: 'receita', categoriaId: 'cat-salario', valor: 50000 })]);
    const r = marcarComoPago(rec, 'sal', { contaId: 'cc', categoriaId: 'cat-salario', data: '2026-10-05' });
    expect(r.ok && saldoConta(r.valor, 'cc')).toBe(150000);
  });

  it('critério 8: não paga duas vezes nem duplica a transação', () => {
    const r = marcarComoPago(estado, 'luz', baixa);
    if (!r.ok) throw new Error(r.erro);
    expect(marcarComoPago(r.valor, 'luz', baixa)).toMatchObject({ ok: false, erro: 'Este lançamento já foi pago.' });
    expect(r.valor.transacoes).toHaveLength(1);
    expect(marcarComoPago(estado, 'nao-existe', baixa).ok).toBe(false);
  });

  it('critério 9: exige conta ativa, categoria do mesmo tipo e data válida, sem alterar nada', () => {
    expect(marcarComoPago(estado, 'luz', { ...baixa, contaId: 'velha' })).toMatchObject({ ok: false, campo: 'contaId' });
    expect(marcarComoPago(estado, 'luz', { ...baixa, contaId: 'x' })).toMatchObject({ ok: false, campo: 'contaId' });
    expect(marcarComoPago(estado, 'luz', { ...baixa, categoriaId: 'cat-salario' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(marcarComoPago(estado, 'luz', { ...baixa, categoriaId: '' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(marcarComoPago(estado, 'luz', { ...baixa, data: '2026-13-01' })).toMatchObject({ ok: false, campo: 'data' });
    expect(estado.transacoes).toHaveLength(0);
  });

  it('critério 10: reabrir remove a transação e volta à situação por data', () => {
    const paga = marcarComoPago(estado, 'luz', baixa);
    if (!paga.ok) throw new Error(paga.erro);
    const r = reabrirAgendamento(paga.valor, 'luz');
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.transacoes).toHaveLength(0);
    expect(r.valor.agenda[0].pagoEm).toBeUndefined();
    expect(r.valor.agenda[0].transacaoId).toBeUndefined();
    expect(situacaoAgendamento(r.valor.agenda[0], '2026-10-20')).toBe('atrasado');
    expect(reabrirAgendamento(r.valor, 'luz')).toMatchObject({ ok: false });
    expect(saldoConta(r.valor, 'cc')).toBe(100000);
  });

  it('critério 11: excluir remove só o lançamento e preserva a transação gerada e a série', () => {
    const serie = criar(base(), { repeticoes: 3 });
    const primeiro = serie.agenda[0].id;
    const paga = marcarComoPago(serie, primeiro, baixa);
    if (!paga.ok) throw new Error(paga.erro);
    const r = excluirAgendamento(paga.valor, primeiro);
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.agenda).toHaveLength(2);
    expect(r.valor.transacoes).toHaveLength(1);
    expect(excluirAgendamento(r.valor, primeiro).ok).toBe(false);
  });
});

describe('calendário: alerta e dados antigos (critérios 12, 13)', () => {
  it('critério 12: lista os não pagos de hoje a 7 dias, nos dois extremos, e conta os atrasados', () => {
    const hoje = '2026-10-10';
    expect(somarDias(hoje, 7)).toBe('2026-10-17');
    expect(somarDias('2026-12-30', 7)).toBe('2027-01-06');
    const estado = base([
      item('ontem', '2026-10-09'),
      item('hoje', hoje),
      item('d7', '2026-10-17'),
      item('d8', '2026-10-18'),
      item('pago', '2026-10-12', { pagoEm: '2026-10-11' }),
      item('d3', '2026-10-13', { criadoEm: 2 }),
    ]);
    const out = alertaVencimentos(estado, hoje);
    expect(out.proximos.map((a) => a.id)).toEqual(['hoje', 'd3', 'd7']);
    expect(out.atrasados).toBe(1);
    expect(alertaVencimentos(base(), hoje)).toEqual({ proximos: [], atrasados: 0 });
  });

  it('critério 13: dados sem agenda carregam com lista vazia e a navegação tem a rota', () => {
    const antigo = { schemaVersion: 2, contas: [corrente], categorias: [], transacoes: [], orcamentos: [], metas: [], recorrencias: [], mapeamentosCsv: {}, importacoes: [], pagamentosFatura: [] };
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    expect(carga.tipo === 'ok' && carga.estado.agenda).toEqual([]);
    expect(itensNavegacao).toContainEqual({ to: '/calendario', rotulo: 'Calendário' });
  });
});

describe('calendário: tela', () => {
  const hoje = hojeISO();
  const comItens = () =>
    base([
      item('Internet', hoje, { valor: 9990 }),
      item('Salario', hoje, { tipo: 'receita', categoriaId: 'cat-salario', valor: 500000, criadoEm: 2 }),
    ]);

  it('critério 5: sem lançamentos, mostra estado vazio; com lançamentos em outro mês, avisa o mês vazio', () => {
    const { unmount } = renderizarApp('/calendario');
    expect(screen.getByText('Nenhum lançamento agendado')).toBeInTheDocument();
    unmount();
    renderizarApp('/calendario?mes=2020-01', comItens());
    expect(screen.getByText('Nenhum lançamento com vencimento neste mês.')).toBeInTheDocument();
  });

  it('critérios 4 e 6: a grade mostra os lançamentos no dia e navegar troca o mês', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/calendario', comItens());
    const dia = screen.getByTestId(`dia-${hoje}`);
    expect(within(dia).getByText(/Internet/)).toBeInTheDocument();
    expect(within(dia).getAllByText(/Pendente/)).toHaveLength(2);
    expect(screen.getByTestId('total-a-pagar')).toHaveTextContent('R$ 99,90');
    expect(screen.getByTestId('total-a-receber')).toHaveTextContent('R$ 5.000,00');
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.queryByTestId(`dia-${hoje}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('total-a-pagar')).toHaveTextContent('R$ 0,00');
  });

  it('critério 1 e 2: o formulário mostra o erro junto ao campo e cria a série pela tela', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/calendario', base());
    await usuario.click(screen.getByRole('button', { name: 'Adicionar lançamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valor válido');
    await usuario.type(screen.getByLabelText('Valor do lançamento'), '350,00');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar lançamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe a descrição');
    await usuario.type(screen.getByLabelText('Descrição do lançamento'), 'Plano de saúde');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar lançamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('categoria ativa de despesa');
    await usuario.selectOptions(screen.getByLabelText('Categoria do lançamento'), 'Saúde');
    const reps = screen.getByLabelText('Repetições mensais');
    await usuario.clear(reps);
    await usuario.type(reps, '3');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar lançamento' }));
    const agenda = store.getSnapshot().estado.agenda;
    expect(agenda.map((a) => a.valor)).toEqual([35000, 35000, 35000]);
    expect(agenda[2].descricao).toBe('Plano de saúde (3/3)');
    expect(screen.getByLabelText('Descrição do lançamento')).toHaveValue('');
  });

  it('critérios 7, 8 e 10: marca como pago pela tela, mostra Pago e reabre', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/calendario', comItens());
    await usuario.click(screen.getByRole('button', { name: 'Marcar como pago: Internet' }));
    await usuario.selectOptions(screen.getByLabelText('Categoria do pagamento'), 'Lazer');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));
    const { transacoes, agenda } = store.getSnapshot().estado;
    expect(transacoes).toHaveLength(1);
    expect(transacoes[0]).toMatchObject({ valor: 9990, categoriaId: 'cat-lazer', contaId: 'cc', data: hoje });
    expect(agenda.find((a) => a.id === 'Internet')?.pagoEm).toBe(hoje);
    const lista = screen.getByRole('list', { name: 'Lançamentos do mês' });
    expect(within(lista).getByText('Pago')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como pago: Internet' })).not.toBeInTheDocument();
    expect(screen.getByTestId('total-ja-pago')).toHaveTextContent('R$ 99,90');

    await usuario.click(screen.getByRole('button', { name: 'Reabrir Internet' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Marcar como pago: Internet' })).toBeInTheDocument();
  });

  it('critério 9: a baixa mostra o erro da categoria junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/calendario', base([item('Sem cat', hoje, { categoriaId: 'inexistente' })]));
    await usuario.click(screen.getByRole('button', { name: 'Marcar como pago: Sem cat' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pagamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('categoria ativa de despesa');
  });

  it('critério 11: excluir pede confirmação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/calendario', comItens());
    await usuario.click(screen.getByRole('button', { name: 'Excluir Internet' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(store.getSnapshot().estado.agenda).toHaveLength(2);
    await usuario.click(screen.getByRole('button', { name: 'Excluir Internet' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.agenda.map((a) => a.id)).toEqual(['Salario']);
  });

  it('critério 12: o alerta mostra os próximos vencimentos, os atrasados e a mensagem de nenhum', () => {
    const ontem = somarDias(hoje, -1);
    const { unmount } = renderizarApp('/calendario', base([item('Boleto', somarDias(hoje, 3)), item('Velho', ontem), item('Longe', somarDias(hoje, 30))]));
    const lista = screen.getByRole('list', { name: 'Próximos vencimentos' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText(/Boleto/)).toBeInTheDocument();
    expect(screen.getByText('1 lançamento atrasado.')).toBeInTheDocument();
    unmount();
    renderizarApp('/calendario', base());
    expect(screen.getByText('Nenhum vencimento nos próximos 7 dias.')).toBeInTheDocument();
  });
});
