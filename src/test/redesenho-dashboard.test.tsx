import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { gerarExemplo } from '../data/exemplo';
import { hojeISO, mesDe } from '../domain/date';
import { criarRecorrencia } from '../domain/projecao';
import type { Conta, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();
const mes = mesDe(hoje);
const conta: Conta = { id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };
const gasto: Transacao = { id: 'g', contaId: 'a', categoriaId: 'cat-moradia', tipo: 'despesa', valor: 9000, data: hoje, descricao: 'Aluguel', criadaEm: 1 };
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho do Dashboard', () => {
  it('critérios 1, 2 e 3: descreve a página, oferece Nova transação e atende à tecla n', async () => {
    renderizarApp('/', construirEstado({ contas: [conta] }));
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toHaveAccessibleDescription(/Visão geral do saldo/);
    expect(screen.getByRole('link', { name: 'Nova transação' })).toHaveAttribute('href', '/transacoes');
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(await screen.findByRole('heading', { name: 'Transações', level: 1 })).toBeInTheDocument();
  });

  it('critérios 5, 6 e 7: usa selo no orçamento e ações nos estados sem dados', () => {
    const semPlanejamento = construirEstado({ contas: [conta] });
    const { unmount } = renderizarApp('/', semPlanejamento);
    expect(screen.getByRole('link', { name: 'Definir limites' })).toHaveAttribute('href', `/orcamento?mes=${mes}`);
    expect(screen.getByRole('link', { name: 'Criar meta' })).toHaveAttribute('href', '/metas');
    unmount();

    renderizarApp('/', construirEstado({ contas: [conta], transacoes: [gasto], orcamentos: [{ categoriaId: 'cat-moradia', mes, limite: 1000 }] }));
    expect(screen.getByText(/Estourado/)).toHaveClass('ds-selo', 'ds-selo--perigo');
  });

  it('critério 8: criar recorrência notifica e Desfazer restaura o estado', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/', construirEstado({ contas: [conta] }));
    await usuario.type(screen.getByLabelText('Descrição da recorrência'), 'Internet');
    await usuario.selectOptions(screen.getByLabelText('Categoria da recorrência'), 'Moradia');
    await usuario.type(screen.getByLabelText('Valor mensal'), '100,00');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar recorrência' }));
    expect(notificacoes().getByText('Recorrência criada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.recorrencias).toHaveLength(1);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.recorrencias).toHaveLength(0);
  });

  it('critérios 8 e 9: editar e alternar notificam; excluir confirma e permite desfazer', async () => {
    const usuario = userEvent.setup();
    const criada = criarRecorrencia(construirEstado({ contas: [conta] }), { descricao: 'Internet', tipo: 'despesa', valor: 10000, categoriaId: 'cat-moradia' });
    if (!criada.ok) throw new Error(criada.erro);
    const { store } = renderizarApp('/', criada.valor);

    await usuario.click(screen.getByRole('button', { name: 'Editar recorrência Internet' }));
    const formulario = within(screen.getByRole('form', { name: 'Editar recorrência' }));
    await usuario.clear(formulario.getByLabelText('Descrição da recorrência'));
    await usuario.type(formulario.getByLabelText('Descrição da recorrência'), 'Fibra');
    await usuario.click(formulario.getByRole('button', { name: 'Salvar recorrência' }));
    expect(notificacoes().getByText('Recorrência salva.')).toBeInTheDocument();

    await usuario.click(screen.getByLabelText('Recorrência Fibra ativa'));
    expect(notificacoes().getByText('Recorrência desativada.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Excluir recorrência Fibra' }));
    expect(screen.getByRole('dialog', { name: 'Excluir recorrência' })).toBeInTheDocument();
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('Recorrência excluída.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.recorrencias).toHaveLength(0);
    const aviso = notificacoes().getByText('Recorrência excluída.').closest('[role="status"]') as HTMLElement;
    await usuario.click(within(aviso).getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.recorrencias).toHaveLength(1);
  });

  it('critérios 10 a 12: erro aparece no campo e na notificação; conteúdo principal permanece', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', gerarExemplo(hoje));
    expect(screen.getByRole('group', { name: 'Resumo do mês' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Receitas e despesas por mês', hidden: true })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Descrição da recorrência'), 'Inválida');
    await usuario.selectOptions(screen.getByLabelText('Categoria da recorrência'), 'Lazer');
    await usuario.type(screen.getByLabelText('Valor mensal'), '0');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar recorrência' }));
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent?.includes('maior que zero'))).toBe(true);
    expect(document.querySelector('.recorrencias__form .ds-alerta')).toBeNull();
  });
});
