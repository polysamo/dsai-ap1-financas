import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CHAVE_ESTADO } from '../storage/storage';
import { CHAVE_ONBOARDING, marcarTourConcluido, tourConcluido } from '../lib/onboarding';
import { itensNavegacao } from '../navegacao';
import { renderizarApp } from './helpers';

const titulo = (nome: string) => screen.getByRole('heading', { level: 1, name: nome });

describe('tour de primeiro uso', () => {
  it('abre sozinho no primeiro acesso como diálogo modal com foco dentro (1)', () => {
    renderizarApp('/', undefined, { tour: true });
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName(/Contas/);
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
  });

  it('tem 7 passos na ordem esperada com indicador "Passo X de 7" (2)', async () => {
    const user = userEvent.setup();
    renderizarApp('/', undefined, { tour: true });
    const ordem = ['Contas', 'Transações', 'Orçamento', 'Metas', 'Importar CSV', 'Dashboard', 'Dados'];
    for (const [i, nome] of ordem.entries()) {
      expect(screen.getByText(`Passo ${i + 1} de 7`)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAccessibleName(new RegExp(nome));
      if (i < ordem.length - 1) await user.click(screen.getByRole('button', { name: 'Próximo' }));
    }
  });

  it('navega com Próximo e Anterior e troca Próximo por Concluir no fim (3)', async () => {
    const user = userEvent.setup();
    renderizarApp('/', undefined, { tour: true });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Passo 1 de 7')).toBeInTheDocument();
    for (let i = 0; i < 6; i++) await user.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(screen.queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument();
  });

  it('Pular, Concluir e Esc fecham e gravam a flag, sem reabrir depois (4)', async () => {
    const user = userEvent.setup();
    const a = renderizarApp('/', undefined, { tour: true });
    await user.click(screen.getByRole('button', { name: 'Pular' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tourConcluido()).toBe(true);
    a.unmount();
    renderizarApp('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    localStorage.clear();
    const b = renderizarApp('/', undefined, { tour: true });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tourConcluido()).toBe(true);
    b.unmount();

    localStorage.clear();
    renderizarApp('/', undefined, { tour: true });
    for (let i = 0; i < 6; i++) await user.click(screen.getByRole('button', { name: 'Próximo' }));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tourConcluido()).toBe(true);
  });

  it('tolera JSON inválido e não toca na chave de estado (5)', () => {
    localStorage.setItem(CHAVE_ONBOARDING, '{quebrado');
    expect(tourConcluido()).toBe(false);
    localStorage.setItem(CHAVE_ONBOARDING, '42');
    expect(tourConcluido()).toBe(false);
    localStorage.setItem(CHAVE_ONBOARDING, 'null');
    expect(tourConcluido()).toBe(false);
    marcarTourConcluido();
    expect(tourConcluido()).toBe(true);
    expect(localStorage.getItem(CHAVE_ESTADO)).toBeNull();
    expect(CHAVE_ONBOARDING.startsWith('financas:')).toBe(true);
  });

  it('abre o app normalmente com a flag inválida, mostrando o tour (5)', () => {
    localStorage.setItem(CHAVE_ONBOARDING, '{quebrado');
    renderizarApp('/', undefined, { tour: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('o botão "Rever o tour" da Ajuda reabre o tour mesmo concluído (6, 14)', async () => {
    const user = userEvent.setup();
    renderizarApp('/ajuda');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rever o tour' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Contas/);
  });
});

describe('página de Ajuda', () => {
  it('lista 10 ou mais perguntas em acordeão com aria-expanded e aria-controls (7)', async () => {
    const user = userEvent.setup();
    renderizarApp('/ajuda');
    const faq = document.body;
    const botoes = within(faq).getAllByRole('button', { expanded: false });
    expect(botoes.length).toBeGreaterThanOrEqual(10);
    const botao = screen.getByRole('button', { name: /Onde ficam os meus dados/ });
    const idResposta = botao.getAttribute('aria-controls') as string;
    const resposta = document.getElementById(idResposta) as HTMLElement;
    expect(resposta).not.toBeVisible();
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(resposta).toBeVisible();
    expect(resposta).toHaveTextContent(/localStorage/);
    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(resposta).not.toBeVisible();
  });

  it('filtra por texto ignorando acentos e maiúsculas, com estado vazio (8)', async () => {
    const user = userEvent.setup();
    renderizarApp('/ajuda');
    const busca = screen.getByRole('searchbox', { name: 'Buscar nas perguntas' });
    await user.type(busca, 'PROJECAO');
    expect(screen.getByRole('button', { name: /projeção do Dashboard/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Onde ficam/ })).not.toBeInTheDocument();
    await user.clear(busca);
    await user.type(busca, 'zzxyw');
    expect(screen.getByText('Nenhuma pergunta encontrada')).toBeInTheDocument();
    expect(screen.getByText(/"zzxyw"/)).toBeInTheDocument();
  });

  it('mostra a tabela de atalhos completa (9)', () => {
    renderizarApp('/ajuda');
    const tabela = screen.getByRole('table', { name: 'Atalhos de teclado' });
    for (const d of ['Dashboard', 'Transações', 'Contas', 'Orçamento', 'Metas', 'Importar CSV', 'Relatórios', 'lista de atalhos']) {
      expect(within(tabela).getByText(new RegExp(d))).toBeInTheDocument();
    }
    expect(within(tabela).getByText('?')).toBeInTheDocument();
  });

  it('a navegação principal tem o item Ajuda para /ajuda (13)', () => {
    expect(itensNavegacao).toContainEqual({ to: '/ajuda', rotulo: 'Ajuda' });
    renderizarApp('/');
    expect(screen.getByRole('link', { name: 'Ajuda' })).toHaveAttribute('href', '/ajuda');
  });
});

describe('atalhos de teclado', () => {
  it('g seguido de letra navega para a rota correspondente (10)', async () => {
    const user = userEvent.setup();
    renderizarApp('/');
    const casos: Array<[string, string]> = [
      ['t', 'Transações'],
      ['c', 'Contas'],
      ['o', 'Orçamento'],
      ['m', 'Metas'],
      ['i', 'Importar CSV'],
      ['r', 'Relatórios'],
      ['d', 'Dashboard'],
    ];
    for (const [letra, nome] of casos) {
      await user.keyboard(`g${letra}`);
      expect(titulo(nome)).toBeInTheDocument();
    }
  });

  it('letra sem g ou desconhecida depois do g não navega (10)', async () => {
    const user = userEvent.setup();
    renderizarApp('/contas');
    await user.keyboard('t');
    expect(titulo('Contas')).toBeInTheDocument();
    await user.keyboard('gz');
    expect(titulo('Contas')).toBeInTheDocument();
    await user.keyboard('t');
    expect(titulo('Contas')).toBeInTheDocument();
  });

  it('não dispara em input, textarea, select, contenteditable nem com Ctrl/Alt/Meta (11)', async () => {
    const user = userEvent.setup();
    renderizarApp('/contas');
    const campos = [document.createElement('input'), document.createElement('textarea'), document.createElement('select'), document.createElement('div')];
    campos[3].setAttribute('contenteditable', 'true');
    campos[3].tabIndex = 0;
    for (const campo of campos) {
      document.body.appendChild(campo);
      campo.focus();
      fireEvent.keyDown(campo, { key: 'g' });
      fireEvent.keyDown(campo, { key: 't' });
      fireEvent.keyDown(campo, { key: '?' });
      expect(titulo('Contas')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      campo.remove();
    }
    for (const mod of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      fireEvent.keyDown(document.body, { key: 'g', ...mod });
      fireEvent.keyDown(document.body, { key: 't', ...mod });
      fireEvent.keyDown(document.body, { key: '?', ...mod });
    }
    expect(titulo('Contas')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('gt');
    expect(titulo('Transações')).toBeInTheDocument();
  });

  it('? abre a lista de atalhos e Esc fecha (12)', async () => {
    const user = userEvent.setup();
    renderizarApp('/');
    await user.keyboard('?');
    const dialogo = screen.getByRole('dialog', { name: 'Atalhos de teclado' });
    expect(within(dialogo).getByText('Ir para Transações')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o tour aberto não é sobreposto pelos atalhos e não os bloqueia depois (14)', async () => {
    const user = userEvent.setup();
    renderizarApp('/', undefined, { tour: true });
    await user.keyboard('?');
    expect(screen.queryByRole('dialog', { name: 'Atalhos de teclado' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.keyboard('gc');
    expect(titulo('Contas')).toBeInTheDocument();
  });
});
