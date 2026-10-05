import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { itensNavegacao } from '../navegacao';
import { construirEstado, renderizarApp } from './helpers';

describe('página /design', () => {
  it('está na lista de rotas e mostra todas as seções do catálogo', async () => {
    expect(itensNavegacao).toContainEqual({ to: '/design', rotulo: 'Design system' });
    renderizarApp('/design', construirEstado());
    expect(await screen.findByRole('heading', { name: 'Design system', level: 1 })).toBeInTheDocument();
    for (const titulo of ['Fundação: cores, tipografia e sombras', 'Ação', 'Campos', 'Sobreposições e notificações', 'Navegação e organização', 'Exibição de dados', 'Feedback e estados']) {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    }
  });

  it('exibe as seis escalas de cor com dez passos cada', async () => {
    renderizarApp('/design', construirEstado());
    await screen.findByRole('heading', { name: 'Design system', level: 1 });
    for (const escala of ['neutra', 'primaria', 'sucesso', 'aviso', 'perigo', 'info']) {
      expect(within(screen.getByRole('group', { name: `Escala ${escala}` })).getAllByTitle(new RegExp(`^${escala} `))).toHaveLength(10);
    }
  });

  it('mostra todas as variantes de botão e alterna o tema pelo interruptor', async () => {
    renderizarApp('/design', construirEstado());
    await screen.findByRole('heading', { name: 'Design system', level: 1 });
    for (const v of ['primario', 'secundario', 'perigo', 'fantasma', 'link']) {
      expect(screen.getByRole('button', { name: v })).toHaveClass(`ds-botao--${v}`);
    }
    const chave = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(chave).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(chave);
    expect(chave).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement).toHaveClass('claro');
    await userEvent.click(chave);
    expect(document.documentElement).not.toHaveClass('claro');
  });

  it('os exemplos de sobreposição e notificação funcionam', async () => {
    renderizarApp('/design', construirEstado());
    await screen.findByRole('heading', { name: 'Design system', level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Abrir modal' }));
    expect(screen.getByRole('dialog', { name: 'Exemplo de modal' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toast sucesso' }));
    expect(screen.getByText('Notificação de sucesso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a tabela de exemplo ordena por valor decrescente e pagina', async () => {
    renderizarApp('/design', construirEstado());
    await screen.findByRole('heading', { name: 'Design system', level: 1 });
    const tabela = screen.getByRole('table', { name: 'Gastos de exemplo' });
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas).toHaveLength(4);
    expect(within(linhas[0]).getByText('Aluguel')).toBeInTheDocument();
  });
});
