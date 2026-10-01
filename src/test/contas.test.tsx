import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  arquivarConta,
  criarConta,
  editarConta,
  excluirConta,
  ordenarContas,
  reativarConta,
  saldoConta,
  saldoTotal,
  validarNomeConta,
} from '../domain/contas';
import type { Conta, Transacao } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta = (parcial: Partial<Conta> & { id: string }): Conta => ({
  nome: parcial.id,
  tipo: 'corrente',
  saldoInicial: 0,
  arquivada: false,
  criadaEm: 1,
  ...parcial,
});

const transacao = (parcial: Partial<Transacao> & { id: string; contaId: string }): Transacao => ({
  categoriaId: 'cat-moradia',
  tipo: 'despesa',
  valor: 1000,
  data: '2026-10-01',
  descricao: 'x',
  criadaEm: 1,
  ...parcial,
});

describe('contas: regras de domínio', () => {
  it('critério 2: nome obrigatório, até 40 caracteres e único entre ativas sem diferenciar caixa', () => {
    const contas = [conta({ id: 'a', nome: 'Nubank' }), conta({ id: 'b', nome: 'Velha', arquivada: true })];
    expect(validarNomeConta(contas, '   ').ok).toBe(false);
    expect(validarNomeConta(contas, 'x'.repeat(41)).ok).toBe(false);
    expect(validarNomeConta(contas, 'x'.repeat(40)).ok).toBe(true);
    expect(validarNomeConta(contas, 'nubank').ok).toBe(false);
    expect(validarNomeConta(contas, 'Velha').ok).toBe(true);
    expect(validarNomeConta(contas, 'Nubank', 'a').ok).toBe(true);
  });

  it('critério 4: saldo atual = saldo inicial + receitas - despesas da conta', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'a', saldoInicial: 10000 }), conta({ id: 'b', saldoInicial: 500 })],
      transacoes: [
        transacao({ id: '1', contaId: 'a', tipo: 'receita', valor: 5000 }),
        transacao({ id: '2', contaId: 'a', valor: 2500 }),
        transacao({ id: '3', contaId: 'b', valor: 100 }),
      ],
    });
    expect(saldoConta(estado, 'a')).toBe(12500);
    expect(saldoConta(estado, 'b')).toBe(400);
    const semTransacao = { ...estado, transacoes: estado.transacoes.slice(1) };
    expect(saldoConta(semTransacao, 'a')).toBe(7500);
  });

  it('critério 5: total soma contas ativas e subtrai a fatura do cartão em linha separada', () => {
    const estado = construirEstado({
      contas: [
        conta({ id: 'c', saldoInicial: 100000 }),
        conta({ id: 'p', tipo: 'poupanca', saldoInicial: 50000 }),
        conta({ id: 'k', tipo: 'cartao' }),
        conta({ id: 'x', saldoInicial: 999999, arquivada: true }),
      ],
      transacoes: [transacao({ id: '1', contaId: 'k', valor: 30000 })],
    });
    expect(saldoTotal(estado)).toEqual({ contas: 150000, cartoes: -30000, total: 120000 });
  });

  it('critério 6: editar nome, tipo e saldo inicial recalcula o saldo sem mexer nas transações', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'a', nome: 'Antiga', saldoInicial: 1000 })],
      transacoes: [transacao({ id: '1', contaId: 'a', valor: 200 })],
    });
    const r = editarConta(estado, 'a', { nome: 'Nova', tipo: 'poupanca', saldoInicial: 5000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.contas[0]).toMatchObject({ nome: 'Nova', tipo: 'poupanca' });
      expect(saldoConta(r.valor, 'a')).toBe(4800);
      expect(r.valor.transacoes).toEqual(estado.transacoes);
    }
  });

  it('critério 7: conta com transações não pode ser excluída; sem transações pode', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'a' }), conta({ id: 'b' })],
      transacoes: [transacao({ id: '1', contaId: 'a' })],
    });
    expect(excluirConta(estado, 'a').ok).toBe(false);
    const r = excluirConta(estado, 'b');
    expect(r.ok && r.valor.contas.map((c) => c.id)).toEqual(['a']);
  });

  it('critério 8: arquivada sai do total, mas as transações continuam', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'a', saldoInicial: 1000 }), conta({ id: 'b', saldoInicial: 2000 })],
      transacoes: [transacao({ id: '1', contaId: 'a' })],
    });
    const r = arquivarConta(estado, 'a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(saldoTotal(r.valor).total).toBe(2000);
      expect(r.valor.transacoes).toHaveLength(1);
    }
  });

  it('critério 9: reativar falha se o nome colidir com conta ativa', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'a', nome: 'Banco', arquivada: true }), conta({ id: 'b', nome: 'banco' })],
    });
    expect(reativarConta(estado, 'a').ok).toBe(false);
    const livre = construirEstado({ contas: [conta({ id: 'a', nome: 'Banco', arquivada: true })] });
    const r = reativarConta(livre, 'a');
    expect(r.ok && r.valor.contas[0].arquivada).toBe(false);
  });

  it('critério 10: ordena por tipo e depois por nome, de forma estável', () => {
    const contas = [
      conta({ id: '1', nome: 'Visa', tipo: 'cartao' }),
      conta({ id: '2', nome: 'Zeta', tipo: 'corrente' }),
      conta({ id: '3', nome: 'Alfa', tipo: 'corrente' }),
      conta({ id: '4', nome: 'Cofre', tipo: 'dinheiro' }),
    ];
    const ordem = ordenarContas(contas).map((c) => c.nome);
    expect(ordem).toEqual(['Alfa', 'Zeta', 'Cofre', 'Visa']);
    expect(ordenarContas([...contas].reverse()).map((c) => c.nome)).toEqual(ordem);
  });

  it('criarConta não altera o estado original', () => {
    const estado = construirEstado();
    const r = criarConta(estado, { nome: 'Nova', tipo: 'corrente', saldoInicial: 0 });
    expect(r.ok).toBe(true);
    expect(estado.contas).toHaveLength(0);
  });
});

describe('contas: tela', () => {
  it('estado vazio sugere criar a primeira conta', () => {
    renderizarApp('/contas');
    expect(screen.getByText('Nenhuma conta ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crie sua primeira conta' })).toBeInTheDocument();
  });

  it('critérios 1 e 3: cria conta com saldo no formato brasileiro e persiste', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas');
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }));
    await usuario.type(screen.getByLabelText('Nome'), 'Banco Azul');
    await usuario.type(screen.getByLabelText('Saldo inicial'), '1.234,56');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Banco Azul')).toBeInTheDocument();
    expect(screen.getByTestId('saldo-total')).toHaveTextContent('R$ 1.234,56');
    expect(lerEstadoSalvo().contas[0]).toMatchObject({ nome: 'Banco Azul', saldoInicial: 123456 });
  });

  it('critério 3: saldo inicial não numérico é rejeitado e nada é salvo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas');
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }));
    await usuario.type(screen.getByLabelText('Nome'), 'Banco');
    await usuario.type(screen.getByLabelText('Saldo inicial'), 'abc');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valor válido');
    expect(screen.getByLabelText('Saldo inicial')).toHaveAttribute('aria-invalid', 'true');
    expect(localStorage.getItem('financas:estado')).toBeNull();
  });

  it('critério 2: nome duplicado mostra erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas', construirEstado({ contas: [conta({ id: 'a', nome: 'Nubank' })] }));
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }));
    await usuario.type(screen.getByLabelText('Nome'), 'NUBANK');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma conta ativa');
  });

  it('critério 7: conta com transações só oferece arquivar; sem transações oferece excluir com confirmação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp(
      '/contas',
      construirEstado({
        contas: [conta({ id: 'a', nome: 'Com movimento' }), conta({ id: 'b', nome: 'Vazia' })],
        transacoes: [transacao({ id: '1', contaId: 'a' })],
      }),
    );
    expect(screen.queryByRole('button', { name: 'Excluir Com movimento' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Excluir Vazia' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.contas.map((c) => c.id)).toEqual(['a']);
  });

  it('critério 8: arquivar move a conta para a lista de arquivadas e a tira do total', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas', construirEstado({ contas: [conta({ id: 'a', nome: 'Alfa', saldoInicial: 1000 }), conta({ id: 'b', nome: 'Beta', saldoInicial: 500 })] }));
    expect(screen.getByTestId('saldo-total')).toHaveTextContent('R$ 15,00');
    await usuario.click(screen.getByRole('button', { name: 'Arquivar Alfa' }));
    expect(screen.getByTestId('saldo-total')).toHaveTextContent('R$ 5,00');
    expect(screen.getByRole('heading', { name: 'Contas arquivadas' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reativar Alfa' }));
    expect(screen.queryByRole('heading', { name: 'Contas arquivadas' })).not.toBeInTheDocument();
  });

  it('critério 6: edita a conta pela tela', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas', construirEstado({ contas: [conta({ id: 'a', nome: 'Alfa', saldoInicial: 1000 })] }));
    await usuario.click(screen.getByRole('button', { name: 'Editar Alfa' }));
    const nome = screen.getByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Omega');
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Omega')).toBeInTheDocument();
    expect(lerEstadoSalvo().contas[0].nome).toBe('Omega');
  });
});
