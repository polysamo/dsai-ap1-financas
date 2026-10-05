import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LimiteDeErro } from '../components/layout/LimiteDeErro';
import { BarraInferior } from '../components/layout/BarraInferior';
import { migalhasDe } from '../components/layout/Cabecalho';
import { CHAVE_LAYOUT, LAYOUT_PADRAO, gravarLayout, lerLayout } from '../lib/layout';
import { atalhos, atalhosPorGrupo } from '../lib/atalhos';
import { grupoDe, gruposNavegacao, itensNavegacao, itensRodape, siglaDe } from '../navegacao';
import { construirEstado, renderizarApp } from './helpers';

const sidebar = () => screen.getByRole('complementary');
const principal = () => within(sidebar()).getByRole('navigation', { name: 'Principal' });

describe('layout: sidebar e grupos', () => {
  it('critério 1 e 3: grupos como botões abertos, item atual com aria-current e rodapé separado', () => {
    renderizarApp('/orcamento', construirEstado());
    for (const g of gruposNavegacao) {
      expect(within(principal()).getByRole('button', { name: new RegExp(g.titulo) })).toHaveAttribute('aria-expanded', 'true');
    }
    expect(within(principal()).getByRole('link', { name: 'Orçamento' })).toHaveAttribute('aria-current', 'page');
    expect(within(principal()).getByRole('link', { name: 'Metas' })).not.toHaveAttribute('aria-current');
    const rodape = within(sidebar()).getByRole('navigation', { name: 'Secundária' });
    expect(within(rodape).getAllByRole('link').map((l) => l.textContent)).toEqual(['Ajuda', 'Atalhos', 'Configurações']);
  });

  it('critério 1: fechar um grupo esconde os itens e persiste; o grupo da tela atual não fecha', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/orcamento', construirEstado());
    const automacao = within(principal()).getByRole('button', { name: /Automação/ });
    await usuario.click(automacao);
    expect(automacao).toHaveAttribute('aria-expanded', 'false');
    expect(within(principal()).queryByRole('link', { name: 'Regras' })).not.toBeInTheDocument();
    expect(lerLayout(localStorage).gruposFechados).toEqual(['Automação']);
    await usuario.click(automacao);
    expect(within(principal()).getByRole('link', { name: 'Regras' })).toBeInTheDocument();
    const planejamento = within(principal()).getByRole('button', { name: /Planejamento/ });
    await usuario.click(planejamento);
    expect(planejamento).toHaveAttribute('aria-expanded', 'true');
    expect(within(principal()).getByRole('link', { name: 'Orçamento' })).toBeInTheDocument();
  });

  it('critério 2: recolher mostra siglas com nome completo em aria-label e lembra depois de recarregar', async () => {
    const usuario = userEvent.setup();
    const { unmount } = renderizarApp('/', construirEstado());
    await usuario.click(screen.getByRole('button', { name: 'Recolher menu' }));
    const link = within(principal()).getByRole('link', { name: 'Orçamento anual' });
    expect(link).toHaveTextContent('OA');
    expect(link).toHaveAttribute('title', 'Orçamento anual');
    expect(sidebar()).toHaveClass('layout-sidebar--recolhida');
    expect(lerLayout(localStorage).recolhida).toBe(true);
    unmount();
    renderizarApp('/', construirEstado());
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(sidebar()).not.toHaveClass('layout-sidebar--recolhida');
  });

  it('preferências do layout: padrão, dados malformados e falha de gravação', () => {
    expect(lerLayout(localStorage)).toEqual(LAYOUT_PADRAO);
    for (const bruto of ['{', 'null', '5', '{"recolhida":"sim","gruposFechados":[1,"A"]}']) {
      localStorage.setItem(CHAVE_LAYOUT, bruto);
      const p = lerLayout(localStorage);
      expect(p.recolhida).toBe(false);
      expect(p.gruposFechados.every((g) => typeof g === 'string')).toBe(true);
    }
    const espiao = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    expect(() => gravarLayout({ recolhida: true, gruposFechados: [] }, localStorage)).not.toThrow();
    espiao.mockRestore();
  });

  it('siglaDe e grupoDe', () => {
    expect([siglaDe('Orçamento anual'), siglaDe('Dashboard'), siglaDe('Importar CSV'), siglaDe('Ajuda')]).toEqual(['OA', 'DA', 'IC', 'AJ']);
    expect(grupoDe('/metas')).toBe('Planejamento');
    expect(grupoDe('/ajuda')).toBeUndefined();
  });
});

describe('layout: cabeçalho e migalhas', () => {
  it('critério 4: migalhas Início, Grupo e Tela; sem trilha no Dashboard', () => {
    expect(migalhasDe('/')).toEqual([]);
    expect(migalhasDe('/metas')).toEqual([{ rotulo: 'Início', to: '/' }, { rotulo: 'Planejamento' }, { rotulo: 'Metas' }]);
    expect(migalhasDe('/ajuda')).toEqual([{ rotulo: 'Início', to: '/' }, { rotulo: 'Ajuda' }]);
  });

  it('critério 4: a trilha aparece na tela com a última migalha como página atual', () => {
    renderizarApp('/metas', construirEstado());
    const trilha = screen.getByRole('navigation', { name: 'Você está em' });
    expect(within(trilha).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(within(trilha).getByText('Planejamento')).toBeInTheDocument();
    expect(within(trilha).getByText('Metas')).toHaveAttribute('aria-current', 'page');
  });

  it('critério 5: cabeçalho reúne busca, desfazer, refazer, atalhos e ocultar valores', () => {
    renderizarApp('/', construirEstado());
    const topo = screen.getByRole('banner');
    expect(within(topo).getByRole('button', { name: /Buscar/ })).toBeInTheDocument();
    expect(within(topo).getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    expect(within(topo).getByRole('button', { name: 'Refazer' })).toBeInTheDocument();
    expect(within(topo).getByRole('link', { name: 'Atalhos' })).toHaveAttribute('href', '/atalhos');
    expect(within(topo).queryByRole('navigation', { name: 'Você está em' })).not.toBeInTheDocument();
  });
});

describe('layout: celular', () => {
  it('critério 6: barra inferior com cinco itens e gaveta Mais com todos os grupos, rodapés e busca', async () => {
    const usuario = userEvent.setup();
    const aoBuscar = vi.fn();
    render(
      <MemoryRouter>
        <BarraInferior aoBuscar={aoBuscar} />
      </MemoryRouter>,
    );
    const barra = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(barra).getByRole('link', { name: 'Nova transação' })).toBeInTheDocument();
    expect(within(barra).getAllByRole('link')).toHaveLength(4);
    await usuario.click(within(barra).getByRole('button', { name: 'Mais' }));
    const gaveta = screen.getByRole('dialog', { name: 'Mais' });
    for (const g of gruposNavegacao) expect(within(gaveta).getByRole('navigation', { name: g.titulo })).toBeInTheDocument();
    for (const i of itensRodape) expect(within(gaveta).getByRole('link', { name: i.rotulo })).toBeInTheDocument();
    await usuario.click(within(gaveta).getByRole('button', { name: 'Buscar' }));
    expect(aoBuscar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('layout: atalhos', () => {
  it('critério 7: todo atalho tem grupo e a página lista por Navegação, Edição e Busca e ajuda', () => {
    expect(atalhos.every((a) => a.grupo)).toBe(true);
    expect(atalhosPorGrupo().map((g) => g.grupo)).toEqual(['Navegação', 'Edição', 'Busca e ajuda']);
    renderizarApp('/atalhos', construirEstado());
    expect(screen.getByRole('heading', { name: 'Atalhos de teclado', level: 1 })).toBeInTheDocument();
    for (const grupo of ['Navegação', 'Edição', 'Busca e ajuda']) {
      expect(screen.getByRole('table', { name: `Atalhos de ${grupo}` })).toBeInTheDocument();
    }
    const edicao = within(screen.getByRole('table', { name: 'Atalhos de Edição' }));
    expect(edicao.getByText('Desfazer a última alteração')).toBeInTheDocument();
    expect(edicao.getAllByText('Ctrl+Z')[0].tagName).toBe('KBD');
    expect(itensNavegacao).toContainEqual({ to: '/atalhos', rotulo: 'Atalhos' });
  });
});

describe('layout: erro, carregamento e 404', () => {
  function Quebra(): never {
    throw new Error('falha de teste');
  }

  it('critério 8: o limite de erro mostra o ErrorState e "Tentar de novo" tenta renderizar outra vez', async () => {
    const silenciar = vi.spyOn(console, 'error').mockImplementation(() => {});
    let quebrar = true;
    function Instavel() {
      if (quebrar) return <Quebra />;
      return <p>Tela ok</p>;
    }
    render(
      <LimiteDeErro>
        <Instavel />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Esta tela falhou');
    quebrar = false;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(screen.getByText('Tela ok')).toBeInTheDocument();
    silenciar.mockRestore();
  });

  it('critério 9: a tela de design carrega sob demanda com esqueleto aria-busy anunciado', async () => {
    renderizarApp('/design', construirEstado());
    const carregando = document.querySelector('[aria-busy="true"]');
    if (carregando) expect(within(carregando as HTMLElement).getByRole('status')).toHaveTextContent('Carregando tela');
    expect(await screen.findByRole('heading', { name: 'Design system', level: 1 })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('critério 10: rota desconhecida mostra 404 com o caminho e ações; /dados ainda redireciona', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/nao-existe/aqui', construirEstado());
    expect(screen.getByRole('heading', { name: 'Página não encontrada', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('/nao-existe/aqui')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByRole('dialog', { name: 'Busca global' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    await usuario.click(screen.getByRole('button', { name: 'Ir para o Dashboard' }));
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
  });
});

describe('layout: acessibilidade do casco', () => {
  it('critério 11: o link de pular é o primeiro focável e leva o foco ao conteúdo principal', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas', construirEstado());
    await usuario.tab();
    const pular = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(pular).toHaveFocus();
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('critério 11: o título do documento acompanha a rota', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas', construirEstado());
    expect(document.title).toBe('Metas · Finanças Pessoais');
    await usuario.click(within(principal()).getByRole('link', { name: 'Orçamento' }));
    expect(document.title).toBe('Orçamento · Finanças Pessoais');
    await usuario.click(within(principal()).getByRole('link', { name: 'Dashboard' }));
    expect(document.title).toBe('Finanças Pessoais');
  });
});
