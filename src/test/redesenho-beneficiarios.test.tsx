import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { dadosBeneficiarios } from '../domain/beneficiarios';
import { hojeISO } from '../domain/date';
import type { AppState, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

let sequencia = 0;
const despesa = (descricao: string, valor: number, data = hojeISO()): Transacao => ({
  id: `benef-redesenho-${++sequencia}`,
  contaId: 'a',
  categoriaId: 'cat-alimentacao',
  tipo: 'despesa',
  valor,
  data,
  descricao,
  criadaEm: sequencia,
});
const estado = (parcial: Partial<AppState> = {}) => construirEstado({
  transacoes: [despesa('iFood', 5000), despesa('IFOOD 123', 3000), despesa('Padaria', 1000)],
  ...parcial,
});
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Beneficiários', () => {
  it('critérios 1 e 2: descrição, FilterBar e resumo acessível', () => {
    renderizarApp('/beneficiarios', estado());
    expect(screen.getByRole('heading', { name: 'Beneficiários', level: 1 })).toHaveAccessibleDescription(/Para quem vai o seu dinheiro/);
    const filtros = screen.getByRole('search', { name: 'Filtros' });
    expect(within(filtros).getByLabelText('Período')).toHaveValue('12');
    expect(within(filtros).getByText('2 beneficiários')).toHaveAttribute('aria-live', 'polite');
  });

  it('critério 3: limpar aparece somente com filtros ativos e restaura os padrões', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/beneficiarios', estado());
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Filtrar pelo nome'), 'padaria');
    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByLabelText('Filtrar pelo nome')).toHaveValue('');
    expect(screen.getByLabelText('Período')).toHaveValue('12');
  });

  it('critério 4: renomear notifica e Desfazer restaura o nome', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/beneficiarios', estado());
    await usuario.click(screen.getByRole('button', { name: /iFood|IFOOD/i }));
    await usuario.type(screen.getByLabelText('Nome exibido'), 'Delivery');
    await usuario.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(notificacoes().getByText('Nome salvo.')).toBeInTheDocument();
    expect(dadosBeneficiarios(store.getSnapshot().estado).nomes).toEqual({ ifood: 'Delivery' });
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).nomes).toEqual({});
  });

  it('critério 5: mesclar e desfazer a mescla notificam e permitem Desfazer', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/beneficiarios', estado());
    await usuario.click(screen.getByRole('button', { name: /Padaria/ }));
    await usuario.selectOptions(screen.getByLabelText('Mesclar em'), 'ifood');
    await usuario.click(screen.getByRole('button', { name: 'Mesclar' }));
    expect(notificacoes().getByText('Padaria foi mesclado.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).mesclas).toEqual({});

    await usuario.click(screen.getByRole('button', { name: /Padaria/ }));
    await usuario.selectOptions(screen.getByLabelText('Mesclar em'), 'ifood');
    await usuario.click(screen.getByRole('button', { name: 'Mesclar' }));
    await usuario.click(screen.getByRole('button', { name: 'Desfazer mescla de padaria' }));
    const aviso = notificacoes().getByText('Mescla desfeita.').closest('[role="status"]') as HTMLElement;
    await usuario.click(within(aviso).getByRole('button', { name: 'Desfazer' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).mesclas).toEqual({ padaria: 'ifood' });
  });

  it('critério 6: erro de validação aparece no campo e numa notificação persistente', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/beneficiarios', estado());
    await usuario.click(screen.getByRole('button', { name: /iFood|IFOOD/i }));
    await usuario.type(screen.getByLabelText('Nome exibido'), 'x'.repeat(61));
    await usuario.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent?.includes('60 caracteres'))).toBe(true);
    expect(document.querySelector('.benef-pagina > .ds-alerta')).toBeNull();
  });

  it('critérios 7 e 8: mostra selos de mesclas e de maior gasto em texto', () => {
    renderizarApp('/beneficiarios', estado({
      transacoes: [despesa('iFood', 5000), despesa('Padaria', 1000), despesa('Mercado', 2000)],
      beneficiarios: { nomes: { ifood: 'iFood' }, mesclas: { padaria: 'ifood' } },
    }));
    expect(screen.getByText('1 mesclada')).toBeInTheDocument();
    expect(screen.getByText('Maior gasto')).toBeInTheDocument();
  });

  it('critério 9: diferencia período vazio de busca vazia e oferece limpar', async () => {
    const usuario = userEvent.setup();
    const { unmount } = renderizarApp('/beneficiarios', construirEstado());
    expect(screen.getByText('Nenhuma despesa com descrição no período')).toBeInTheDocument();
    unmount();
    renderizarApp('/beneficiarios', estado());
    await usuario.type(screen.getByLabelText('Filtrar pelo nome'), 'inexistente');
    expect(screen.getByText('Nenhum beneficiário encontrado')).toBeInTheDocument();
    await usuario.click(screen.getAllByRole('button', { name: 'Limpar filtros' }).at(-1)!);
    expect(screen.getByRole('list', { name: 'Beneficiários por total gasto' })).toBeInTheDocument();
  });

  it('critério 10: preserva números, série mensal e link de transações', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/beneficiarios', estado({ beneficiarios: { nomes: { ifood: 'iFood' }, mesclas: { padaria: 'ifood' } } }));
    await usuario.click(screen.getByRole('button', { name: /iFood|IFOOD/i }));
    expect(screen.getAllByText('R$ 90,00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('table', { name: /Total mensal de (iFood|IFOOD)/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver transações' })).toHaveAttribute('href', expect.stringContaining('/transacoes?texto='));
  });
});
