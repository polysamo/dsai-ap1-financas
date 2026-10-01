import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gerarExemplo } from '../data/exemplo';
import { CHAVE_PREFERENCIAS, aplicarPreferencias, lerPreferencias } from '../lib/preferencias';
import { CHAVE_ESTADO } from '../storage/storage';
import { renderizarApp } from './helpers';

const html = document.documentElement;

/** Lê um arquivo-fonte pelo Node (o vitest roda com css: false, então ?raw não serve para CSS). */
async function lerFonte(caminho: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (c: string, e: string) => string };
  return fs.readFileSync(caminho, 'utf-8');
}

function simularSistema(escuro: boolean) {
  const ouvintes = new Set<() => void>();
  const consulta = {
    matches: escuro,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, f: () => void) => ouvintes.add(f),
    removeEventListener: (_: string, f: () => void) => ouvintes.delete(f),
  };
  vi.stubGlobal('matchMedia', () => consulta);
  return {
    mudar(valor: boolean) {
      consulta.matches = valor;
      ouvintes.forEach((f) => f());
    },
  };
}

function salvas() {
  return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? 'null');
}

afterEach(() => {
  html.classList.remove('dark', 'ocultar-valores');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('configurações: estrutura e navegação (critérios 1, 2, 13)', () => {
  it('mostra título e as três seções com título de nível 2', () => {
    renderizarApp('/configuracoes');
    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    for (const nome of ['Aparência', 'Privacidade', 'Dados']) {
      expect(screen.getByRole('heading', { level: 2, name: nome })).toBeInTheDocument();
    }
  });

  it('o cabeçalho tem o link Configurações no lugar de Dados e /dados redireciona', () => {
    renderizarApp('/dados');
    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Configurações' });
    expect(link).toHaveAttribute('href', '/configuracoes');
    expect(screen.queryByRole('link', { name: 'Dados' })).not.toBeInTheDocument();
  });

  it('informa a moeda BRL como texto, sem controle de escolha', () => {
    renderizarApp('/configuracoes');
    expect(screen.getByText('Moeda: real brasileiro (BRL)')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('configurações: tema (critérios 3, 4, 5)', () => {
  it('tem radiogroup Tema com Claro, Escuro e Sistema, padrão Sistema', () => {
    renderizarApp('/configuracoes');
    const grupo = screen.getByRole('radiogroup', { name: 'Tema' });
    const radios = within(grupo).getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['claro', 'escuro', 'sistema']);
    expect(within(grupo).getByRole('radio', { name: /Sistema/ })).toBeChecked();
  });

  it('Escuro adiciona dark ao html e Claro remove', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    await usuario.click(screen.getByRole('radio', { name: /Escuro/ }));
    expect(html).toHaveClass('dark');
    await usuario.click(screen.getByRole('radio', { name: /Claro/ }));
    expect(html).not.toHaveClass('dark');
  });

  it('Sistema segue prefers-color-scheme e reage a mudanças', async () => {
    const sistema = simularSistema(true);
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    expect(html).toHaveClass('dark');
    await usuario.click(screen.getByRole('radio', { name: /Claro/ }));
    expect(html).not.toHaveClass('dark');
    await usuario.click(screen.getByRole('radio', { name: /Sistema/ }));
    expect(html).toHaveClass('dark');
    sistema.mudar(false);
    expect(html).not.toHaveClass('dark');
  });

  it('o CSS redefine as variáveis do Tailwind sob html.dark e oculta valores por classe', async () => {
    const css = await lerFonte('src/index.css');
    const dark = css.slice(css.indexOf('html.dark'));
    for (const v of ['--color-white', '--color-slate-50', '--color-slate-600', '--color-slate-900', '--color-slate-200', '--color-emerald-700', '--color-red-700', '--color-amber-900']) {
      expect(dark).toContain(`${v}:`);
    }
    expect(css).toMatch(/html\.ocultar-valores \.tabular-nums\s*\{[^}]*blur/);
  });
});

describe('configurações: privacidade (critérios 6, 7, 14)', () => {
  it('a chave da página alterna a classe ocultar-valores', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    const chave = screen.getByRole('switch', { name: 'Ocultar valores' });
    expect(chave).toHaveAttribute('aria-checked', 'false');
    await usuario.click(chave);
    expect(chave).toHaveAttribute('aria-checked', 'true');
    expect(chave).toHaveTextContent('Ligado');
    expect(html).toHaveClass('ocultar-valores');
    await usuario.click(chave);
    expect(html).not.toHaveClass('ocultar-valores');
  });

  it('o botão do cabeçalho alterna a mesma preferência com aria-pressed e rótulo textual', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    const botao = screen.getByRole('button', { name: 'Ocultar valores' });
    expect(botao).toHaveAttribute('aria-pressed', 'false');
    botao.focus();
    await usuario.keyboard('{Enter}');
    expect(html).toHaveClass('ocultar-valores');
    expect(screen.getByRole('button', { name: 'Mostrar valores' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('switch', { name: 'Ocultar valores' })).toHaveAttribute('aria-checked', 'true');
  });

  it('o botão do cabeçalho também existe em outras páginas', () => {
    renderizarApp('/contas');
    expect(screen.getByRole('button', { name: 'Ocultar valores' })).toBeInTheDocument();
  });
});

describe('configurações: persistência (critérios 8, 9, 10)', () => {
  it('grava { tema, ocultarValores } em financas:preferencias e nada em financas:estado', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    await usuario.click(screen.getByRole('radio', { name: /Escuro/ }));
    await usuario.click(screen.getByRole('switch', { name: 'Ocultar valores' }));
    expect(salvas()).toEqual({ tema: 'escuro', ocultarValores: true });
    expect(localStorage.getItem(CHAVE_ESTADO)).toBeNull();
  });

  it('as preferências salvas são carregadas na página', () => {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ tema: 'escuro', ocultarValores: true }));
    renderizarApp('/configuracoes');
    expect(screen.getByRole('radio', { name: /Escuro/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Ocultar valores' })).toHaveAttribute('aria-checked', 'true');
    expect(html).toHaveClass('dark', 'ocultar-valores');
  });

  it('leitura tolera JSON inválido, tipos errados e tema desconhecido', () => {
    const padrao = { tema: 'sistema', ocultarValores: false };
    localStorage.setItem(CHAVE_PREFERENCIAS, '{nao e json');
    expect(lerPreferencias(localStorage)).toEqual(padrao);
    localStorage.setItem(CHAVE_PREFERENCIAS, 'null');
    expect(lerPreferencias(localStorage)).toEqual(padrao);
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ tema: 'roxo', ocultarValores: 'sim' }));
    expect(lerPreferencias(localStorage)).toEqual(padrao);
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ tema: 'claro', ocultarValores: 3 }));
    expect(lerPreferencias(localStorage)).toEqual({ tema: 'claro', ocultarValores: false });
    localStorage.setItem(CHAVE_PREFERENCIAS, '{nao e json');
    renderizarApp('/configuracoes');
    expect(screen.getByRole('radio', { name: /Sistema/ })).toBeChecked();
  });

  it('falha ao gravar mostra alerta e a página continua funcionando', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/configuracoes');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota', 'QuotaExceededError');
    });
    await usuario.click(screen.getByRole('radio', { name: /Escuro/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível salvar a preferência/);
    expect(html).toHaveClass('dark');
  });

  it('aplicarPreferencias (usada em main.tsx) ajusta as classes do html antes da renderização', async () => {
    const main = await lerFonte('src/main.tsx');
    aplicarPreferencias({ tema: 'escuro', ocultarValores: true });
    expect(html).toHaveClass('dark', 'ocultar-valores');
    aplicarPreferencias({ tema: 'claro', ocultarValores: false });
    expect(html).not.toHaveClass('dark');
    expect(html).not.toHaveClass('ocultar-valores');
    expect(main).toMatch(/aplicarPreferencias\(lerPreferencias\(window\.localStorage\)\)/);
    expect(main.indexOf('aplicarPreferencias(')).toBeLessThan(main.indexOf('createRoot('));
  });
});

describe('configurações: seção Dados (critérios 11, 12)', () => {
  it('reúne exportar, importar, exemplo e apagar', () => {
    renderizarApp('/configuracoes');
    for (const nome of ['Exportar dados', 'Importar dados', 'Carregar dados de exemplo', 'Apagar todos os dados']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Arquivo de dados para importar')).toBeInTheDocument();
  });

  it('exemplo substitui com confirmação quando já há dados', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/configuracoes', gerarExemplo('2026-10-01'));
    await usuario.click(screen.getByRole('button', { name: 'Carregar dados de exemplo' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Substituir' }));
    expect(store.getSnapshot().estado.contas.length).toBeGreaterThan(0);
    expect(screen.getByText('Dados de exemplo carregados.')).toBeInTheDocument();
  });

  it('apagar tudo restaura as preferências padrão', async () => {
    const usuario = userEvent.setup();
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ tema: 'escuro', ocultarValores: true }));
    const { store } = renderizarApp('/configuracoes', gerarExemplo('2026-10-01'));
    expect(html).toHaveClass('dark', 'ocultar-valores');
    await usuario.click(screen.getByRole('button', { name: 'Apagar todos os dados' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/Digite APAGAR/), 'APAGAR');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Apagar tudo' }));
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(localStorage.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    expect(html).not.toHaveClass('dark');
    expect(html).not.toHaveClass('ocultar-valores');
    expect(screen.getByRole('radio', { name: /Sistema/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Ocultar valores' })).toHaveAttribute('aria-checked', 'false');
  });
});
