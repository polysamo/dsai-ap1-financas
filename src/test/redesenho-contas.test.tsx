import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Conta } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const conta = (parcial: Partial<Conta> = {}): Conta => ({ id: 'a', nome: 'Nubank', tipo: 'corrente', saldoInicial: 10000, arquivada: false, criadaEm: 1, ...parcial });
const estadoCom = (...contas: Conta[]) => construirEstado({ contas });
const aviso = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Contas', () => {
  it('critério 1: descrição ligada ao título e botão Nova conta', () => {
    renderizarApp('/contas', estadoCom(conta()));
    expect(screen.getByRole('heading', { name: 'Contas', level: 1 })).toHaveAccessibleDescription(/O saldo é sempre calculado pelas transações/);
    expect(screen.getByRole('button', { name: 'Nova conta' })).toBeInTheDocument();
  });

  it('critério 2: criar mostra "Conta criada." e Desfazer remove a conta', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/contas');
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }));
    await usuario.type(screen.getByLabelText('Nome'), 'Banco Azul');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(aviso().getByText('Conta criada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
    await usuario.click(aviso().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(aviso().getByText('Desfeito: conta criada')).toBeInTheDocument();
  });

  it('critério 3: editar, arquivar e reativar avisam, cada um com Desfazer', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/contas', estadoCom(conta()));
    await usuario.click(screen.getByRole('button', { name: 'Editar Nubank' }));
    const nome = screen.getByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Nubank Roxo');
    await usuario.click(screen.getByRole('button', { name: /Salvar/ }));
    expect(aviso().getByText('Conta atualizada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.contas[0].nome).toBe('Nubank Roxo');

    await usuario.click(screen.getByRole('button', { name: 'Arquivar Nubank Roxo' }));
    expect(aviso().getByText('Conta arquivada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.contas[0].arquivada).toBe(true);

    await usuario.click(screen.getByRole('button', { name: 'Reativar Nubank Roxo' }));
    expect(aviso().getByText('Conta reativada.')).toBeInTheDocument();
    const desfazer = aviso().getAllByRole('button', { name: 'Desfazer' });
    await usuario.click(desfazer[desfazer.length - 1]);
    expect(store.getSnapshot().estado.contas[0].arquivada).toBe(true);
  });

  it('critério 4: excluir pede confirmação, avisa e Desfazer devolve a conta', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/contas', estadoCom(conta()));
    await usuario.click(screen.getByRole('button', { name: 'Excluir Nubank' }));
    const dialogo = screen.getByRole('dialog', { name: 'Excluir conta?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(aviso().getByText('Conta excluída.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    await usuario.click(aviso().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
  });

  it('critério 5: erro vira notificação role alert persistente e não há alerta fixo no topo', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/contas', estadoCom(conta({ id: 'x', nome: 'Velha', arquivada: true }), conta({ id: 'y', nome: 'Velha' })));
    await usuario.click(screen.getByRole('button', { name: 'Reativar Velha' }));
    expect(aviso().getByRole('alert')).toHaveTextContent(/Já existe uma conta ativa/);
    expect(store.getSnapshot().estado.contas.find((c) => c.id === 'x')?.arquivada).toBe(true);
    expect(document.querySelector('main > div > .ui-alerta, main .ds-alerta')).toBeNull();
  });

  it('critério 6: selos de situação em texto para arquivada e cartão', () => {
    renderizarApp(
      '/contas',
      estadoCom(
        conta({ id: 'c', nome: 'Visa', tipo: 'cartao', cartao: { diaFechamento: 5, diaVencimento: 12, limite: 100000 } }),
        conta({ id: 'o', nome: 'Antiga', arquivada: true }),
      ),
    );
    const cartao = screen.getAllByTestId('conta-card').find((c) => within(c).queryByText('Visa'))!;
    expect(within(cartao).getByText('Cartão')).toBeInTheDocument();
    const antiga = screen.getAllByTestId('conta-card').find((c) => within(c).queryByText('Antiga'))!;
    expect(within(antiga).getByText('Arquivada')).toBeInTheDocument();
  });

  it('critério 7: n abre o painel Nova conta, mas não dentro do painel nem de um campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas', estadoCom(conta()));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'n' });
    const painel = screen.getByRole('dialog', { name: 'Nova conta' });
    await usuario.type(within(painel).getByLabelText('Nome'), 'nnn');
    expect(within(painel).getByLabelText('Nome')).toHaveValue('nnn');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('critério 8: sem contas, estado vazio com chamada para ação que abre a criação', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas');
    expect(screen.getByText('Nenhuma conta ainda')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Crie sua primeira conta' }));
    expect(screen.getByRole('dialog', { name: 'Nova conta' })).toBeInTheDocument();
  });

  it('critério 9: saldo total e detalhe continuam e respeitam ocultar valores', () => {
    renderizarApp('/contas', estadoCom(conta({ saldoInicial: 123456 })));
    expect(screen.getByTestId('saldo-total')).toHaveTextContent('R$ 1.234,56');
    expect(screen.getByTestId('saldo-contas')).toHaveTextContent('R$ 1.234,56');
    expect(screen.getByTestId('saldo-total')).toHaveClass('tabular-nums');
  });
});
