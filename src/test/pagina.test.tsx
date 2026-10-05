import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TituloPagina } from '../components/ui';
import { criarConta } from '../domain/contas';
import { ok } from '../domain/types';
import { FilterBar } from '../ds/FilterBar';
import { PageHeader } from '../ds/PageHeader';
import { ToastProvider, useToast } from '../ds/Toast';
import { useAtalhoNovo, atalhos } from '../lib/atalhos';
import { Store, StoreProvider } from '../state/store';
import { useFeedback } from '../state/useFeedback';
import { construirEstado } from './helpers';

describe('kit de página: PageHeader e TituloPagina', () => {
  it('critério 1: h1, descrição ligada por aria-describedby e ações', () => {
    render(<PageHeader titulo="Contas" descricao="Onde seu dinheiro está." acoes={<button>Nova conta</button>} />);
    const titulo = screen.getByRole('heading', { name: 'Contas', level: 1 });
    expect(titulo).toHaveAccessibleDescription('Onde seu dinheiro está.');
    expect(screen.getByRole('button', { name: 'Nova conta' })).toBeInTheDocument();
  });

  it('sem descrição nem ações, só o título', () => {
    const { container } = render(<PageHeader titulo="Só título" />);
    expect(screen.getByRole('heading', { name: 'Só título' })).not.toHaveAttribute('aria-describedby');
    expect(container.querySelector('.ds-pagina-cabecalho__acoes')).toBeNull();
  });

  it('critério 2: TituloPagina mantém a API antiga e aceita descricao', () => {
    const { rerender } = render(<TituloPagina acoes={<button>Ir</button>}>Metas</TituloPagina>);
    expect(screen.getByRole('heading', { name: 'Metas', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir' })).toBeInTheDocument();
    rerender(<TituloPagina descricao="Objetivos de poupança">Metas</TituloPagina>);
    expect(screen.getByRole('heading', { name: 'Metas' })).toHaveAccessibleDescription('Objetivos de poupança');
  });
});

describe('kit de página: FilterBar', () => {
  function Exemplo() {
    const [texto, setTexto] = useState('');
    return (
      <FilterBar ativo={texto !== ''} aoLimpar={() => setTexto('')} resumo={texto ? '1 de 3 itens' : '3 itens'}>
        <label>
          Buscar
          <input value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      </FilterBar>
    );
  }

  it('critério 3: form de busca com rótulo, resumo aria-live e limpar só com filtro ativo', async () => {
    render(<Exemplo />);
    const barra = screen.getByRole('search', { name: 'Filtros' });
    expect(within(barra).getByText('3 itens')).toHaveAttribute('aria-live', 'polite');
    expect(within(barra).queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    await userEvent.type(within(barra).getByLabelText('Buscar'), 'x');
    expect(within(barra).getByText('1 de 3 itens')).toBeInTheDocument();
    await userEvent.click(within(barra).getByRole('button', { name: 'Limpar filtros' }));
    expect(within(barra).getByLabelText('Buscar')).toHaveValue('');
    expect(within(barra).queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('Enter dentro do formulário não recarrega a página', async () => {
    render(<Exemplo />);
    const enviado = vi.fn((e: Event) => e.defaultPrevented);
    // O React trata o submit na raiz; ouvir no document vê o evento depois do preventDefault.
    document.addEventListener('submit', (e) => enviado(e));
    await userEvent.type(screen.getByLabelText('Buscar'), 'a{Enter}');
    expect(enviado).toHaveBeenCalled();
    expect(enviado.mock.results[0].value).toBe(true);
  });
});

describe('kit de página: Toast com ação', () => {
  it('critério 6: o botão da ação aparece, executa e fecha a notificação', async () => {
    const aoClicar = vi.fn();
    function Disparo() {
      const { mostrar } = useToast();
      return <button onClick={() => mostrar('Item excluído', { tipo: 'sucesso', acao: { rotulo: 'Desfazer', aoClicar } })}>Excluir</button>;
    }
    render(<ToastProvider><Disparo /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('Item excluído');
    await userEvent.click(within(aviso).getByRole('button', { name: 'Desfazer' }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('kit de página: useFeedback', () => {
  function Tela({ store }: { store: Store }) {
    const { executar } = useFeedback();
    return (
      <StoreProvider store={store}>
        <button onClick={() => executar((s) => criarConta(s, { nome: 'Nubank', tipo: 'corrente', saldoInicial: 0 }), 'Conta criada.')}>Criar</button>
        <button onClick={() => executar((s) => criarConta(s, { nome: '', tipo: 'corrente', saldoInicial: 0 }), 'Conta criada.')}>Criar inválida</button>
        <button onClick={() => executar((s) => ok(s), 'Nada mudou.', false)}>Sem desfazer</button>
      </StoreProvider>
    );
  }
  function montar() {
    localStorage.setItem('financas:estado', JSON.stringify(construirEstado()));
    const store = new Store(localStorage);
    render(
      <StoreProvider store={store}>
        <ToastProvider>
          <Tela store={store} />
        </ToastProvider>
      </StoreProvider>,
    );
    return store;
  }

  it('critérios 4 e 5: sucesso mostra a mensagem com Desfazer, que desfaz e avisa', async () => {
    const store = montar();
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('Conta criada.');
    await userEvent.click(within(aviso).getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(screen.getByText('Desfeito: conta criada')).toBeInTheDocument();
  });

  it('critério 4: erro vira notificação com role alert que não some sozinha e nada é gravado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const store = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Criar inválida' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(store.getSnapshot().historico.passado).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('critério 5: operação marcada como não desfazível mostra sucesso sem o botão', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Sem desfazer' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nada mudou.');
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });
});

describe('kit de página: atalho n', () => {
  function Tela({ aoCriar, comCampo = false }: { aoCriar: () => void; comCampo?: boolean }) {
    useAtalhoNovo(aoCriar);
    return comCampo ? <input aria-label="Campo" /> : <p>Tela</p>;
  }

  it('critério 7: n chama a função de criar; com modificadoras ou outra tecla, não', () => {
    const aoCriar = vi.fn();
    render(<Tela aoCriar={aoCriar} />);
    fireEvent.keyDown(document, { key: 'n' });
    expect(aoCriar).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'N', altKey: true });
    fireEvent.keyDown(document, { key: 'm' });
    expect(aoCriar).toHaveBeenCalledTimes(1);
  });

  it('critério 8: dentro de um campo de edição ou com um diálogo modal aberto, não dispara', () => {
    const aoCriar = vi.fn();
    render(<Tela aoCriar={aoCriar} comCampo />);
    fireEvent.keyDown(screen.getByLabelText('Campo'), { key: 'n' });
    expect(aoCriar).not.toHaveBeenCalled();
    const dialogo = document.createElement('div');
    dialogo.setAttribute('role', 'dialog');
    dialogo.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialogo);
    fireEvent.keyDown(document, { key: 'n' });
    expect(aoCriar).not.toHaveBeenCalled();
    dialogo.remove();
    fireEvent.keyDown(document, { key: 'n' });
    expect(aoCriar).toHaveBeenCalledTimes(1);
  });

  it('critério 7: está listado nos atalhos de Edição', () => {
    expect(atalhos).toContainEqual(expect.objectContaining({ teclas: 'n', grupo: 'Edição' }));
  });
});
