import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { definirLimite } from '../domain/orcamento';
import { construirEstado, renderizarApp } from './helpers';

const rota = '/orcamento?mes=2026-10';
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Orçamento', () => {
  it('critérios 1 e 2: descrição, ação principal e tecla n abrem e focam um limite', async () => {
    const usuario = userEvent.setup();
    const { unmount } = renderizarApp(rota, construirEstado());
    expect(screen.getByRole('heading', { name: 'Orçamento', level: 1 })).toHaveAccessibleDescription(/Compare limites mensais/);
    await usuario.click(screen.getByRole('button', { name: 'Definir limite' }));
    await waitFor(() => expect(screen.getByRole('form', { name: /Limite de/ }).querySelector('input')).toHaveFocus());
    unmount();
    renderizarApp(rota, construirEstado());
    fireEvent.keyDown(document.body, { key: 'n' });
    await waitFor(() => expect(screen.getByRole('form', { name: /Limite de/ }).querySelector('input')).toHaveFocus());
  });

  it('critérios 4 e 7: salvar notifica, Desfazer restaura e erro aparece no campo e no toast', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp(rota, construirEstado());
    await usuario.click(screen.getByRole('button', { name: 'Definir limite de Lazer' }));
    await usuario.type(screen.getByLabelText('Limite mensal de Lazer'), '100,00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(notificacoes().getByText('Limite salvo.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.orcamentos).toEqual([]);
    await usuario.click(screen.getByRole('button', { name: 'Definir limite de Lazer' }));
    await usuario.type(screen.getByLabelText('Limite mensal de Lazer'), '-1');
    await usuario.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getAllByRole('alert').filter((a) => a.textContent?.includes('negativo'))).toHaveLength(2);
  });

  it('critério 5: copiar limites notifica e permite desfazer', async () => {
    const usuario = userEvent.setup();
    const anterior = definirLimite(construirEstado(), 'cat-lazer', '2026-09', 5000);
    if (!anterior.ok) throw new Error(anterior.erro);
    const { store } = renderizarApp(rota, anterior.valor);
    await usuario.click(screen.getByRole('button', { name: 'Copiar limites do mês anterior' }));
    expect(notificacoes().getByText('Limites copiados do mês anterior.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.orcamentos.map((o) => o.mes)).toEqual(['2026-09']);
  });

  it('critério 6: remover exige confirmação, notifica e permite desfazer', async () => {
    const usuario = userEvent.setup();
    const inicial = definirLimite(construirEstado(), 'cat-lazer', '2026-10', 5000);
    if (!inicial.ok) throw new Error(inicial.erro);
    const { store } = renderizarApp(rota, inicial.valor);
    await usuario.click(screen.getByRole('button', { name: 'Remover limite de Lazer' }));
    expect(screen.getByRole('dialog', { name: 'Remover limite' })).toBeInTheDocument();
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(notificacoes().getByText('Limite removido.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.orcamentos).toEqual([]);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.orcamentos).toHaveLength(1);
  });

  it('critérios 8 a 11: situação usa Badge, cálculos continuam e vazio leva a Transações', () => {
    const comLimite = definirLimite(construirEstado(), 'cat-lazer', '2026-10', 5000);
    if (!comLimite.ok) throw new Error(comLimite.erro);
    const { unmount } = renderizarApp(rota, comLimite.valor);
    expect(within(screen.getByTestId('orcamento-cat-lazer')).getByText(/Dentro do limite/)).toHaveClass('ds-selo', 'ds-selo--sucesso');
    expect(screen.getByTestId('total-limites')).toHaveTextContent('R$ 50,00');
    unmount();
    renderizarApp(rota, construirEstado({ categorias: [] }));
    expect(screen.getByText('Nenhuma categoria de despesa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Transações' })).toHaveAttribute('href', '/transacoes');
  });
});
