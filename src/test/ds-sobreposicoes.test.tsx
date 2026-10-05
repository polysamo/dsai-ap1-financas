import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Alert } from '../ds/Alert';
import { Banner } from '../ds/Banner';
import { Button } from '../ds/Button';
import { ConfirmDialog } from '../ds/ConfirmDialog';
import { Drawer } from '../ds/Drawer';
import { Dropdown } from '../ds/Dropdown';
import { Modal } from '../ds/Modal';
import { Popover } from '../ds/Popover';
import { DURACAO_TOAST_PADRAO, ToastProvider, useToast } from '../ds/Toast';
import { Tooltip } from '../ds/Tooltip';

afterEach(() => vi.useRealTimers());

function Abrir({ Componente }: { Componente: typeof Modal | typeof Drawer }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button onClick={() => setAberto(true)}>Abrir</button>
      <Componente aberto={aberto} titulo="Detalhes" onFechar={() => setAberto(false)}>
        <input aria-label="Primeiro" />
        <button>Último</button>
      </Componente>
    </>
  );
}

describe.each([
  ['Modal', Modal],
  ['Drawer', Drawer],
])('ds: %s', (_nome, Componente) => {
  it('abre com role dialog nomeado pelo título, move o foco para dentro e fecha com Esc devolvendo o foco', async () => {
    render(<Abrir Componente={Componente} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialogo = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(within(dialogo).getByLabelText('Primeiro')).toBeInTheDocument();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
  });

  it('prende o Tab dentro do painel nos dois sentidos', async () => {
    render(<Abrir Componente={Componente} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialogo = screen.getByRole('dialog');
    const ultimo = within(dialogo).getByRole('button', { name: 'Último' });
    ultimo.focus();
    await userEvent.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(ultimo);
    await userEvent.tab({ shift: true });
    expect(ultimo).toHaveFocus();
  });

  it('o botão Fechar e o clique no fundo fecham', async () => {
    render(<Abrir Componente={Componente} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ds: Modal (rodapé e tamanho) e ConfirmDialog', () => {
  it('mostra o rodapé e aplica o tamanho', () => {
    render(<Modal aberto titulo="T" onFechar={() => {}} tamanho="grande" rodape={<button>Salvar</button>}>corpo</Modal>);
    expect(screen.getByRole('dialog')).toHaveClass('ds-modal--grande');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('ConfirmDialog confirma e cancela, e Esc cancela', async () => {
    const confirmar = vi.fn();
    const cancelar = vi.fn();
    render(<ConfirmDialog titulo="Excluir" mensagem="Tem certeza?" rotuloConfirmar="Excluir" perigo onConfirmar={confirmar} onCancelar={cancelar} />);
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(confirmar).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('exige digitar o texto pedido antes de liberar o botão', async () => {
    const confirmar = vi.fn();
    render(<ConfirmDialog titulo="Apagar tudo" mensagem="Irreversível." rotuloConfirmar="Apagar" textoDigitado="APAGAR" onConfirmar={confirmar} onCancelar={() => {}} />);
    const botao = screen.getByRole('button', { name: 'Apagar' });
    expect(botao).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Digite APAGAR para confirmar'), 'APAGAR');
    expect(botao).toBeEnabled();
  });
});

describe('ds: Popover', () => {
  it('abre e fecha pelo botão, Esc devolve o foco e clicar fora fecha', async () => {
    render(
      <div>
        <Popover gatilho="Filtros" rotulo="Painel de filtros">
          <p>Conteúdo</p>
        </Popover>
        <button>Fora</button>
      </div>,
    );
    const gatilho = screen.getByRole('button', { name: 'Filtros' });
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(gatilho);
    expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Painel de filtros' })).toHaveTextContent('Conteúdo');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gatilho).toHaveFocus();
    await userEvent.click(gatilho);
    await userEvent.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ds: Tooltip', () => {
  it('aparece no foco e no hover, liga aria-describedby e some com Esc ou ao sair', async () => {
    render(
      <Tooltip texto="Exclui para sempre">
        <button>Excluir</button>
      </Tooltip>,
    );
    const botao = screen.getByRole('button', { name: 'Excluir' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.tab();
    const dica = screen.getByRole('tooltip');
    expect(dica).toHaveTextContent('Exclui para sempre');
    expect(botao).toHaveAccessibleDescription('Exclui para sempre');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.hover(botao);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await userEvent.unhover(botao);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('ds: Dropdown', () => {
  const montar = (aoApagar = vi.fn()) =>
    render(
      <Dropdown
        gatilho="Ações"
        rotulo="Ações da conta"
        itens={[
          { rotulo: 'Editar', aoSelecionar: () => {} },
          { rotulo: 'Arquivar', aoSelecionar: () => {}, desabilitado: true },
          { rotulo: 'Apagar', aoSelecionar: aoApagar, perigo: true },
        ]}
      />,
    );

  it('abre com menu e foca o primeiro item; setas pulam o desabilitado e dão a volta', async () => {
    montar();
    const gatilho = screen.getByRole('button', { name: 'Ações' });
    expect(gatilho).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(gatilho);
    expect(screen.getByRole('menu', { name: 'Ações da conta' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Apagar' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Apagar' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Apagar' })).toHaveFocus();
  });

  it('Enter escolhe o item, fecha o menu e devolve o foco', async () => {
    const apagar = vi.fn();
    montar(apagar);
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }));
    await userEvent.keyboard('{End}{Enter}');
    expect(apagar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ações' })).toHaveFocus();
  });

  it('Esc fecha e devolve o foco; clique fora fecha; item desabilitado não dispara', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }));
    expect(screen.getByRole('menuitem', { name: 'Arquivar' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ações' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Ações' }));
    await userEvent.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('ds: Alert e Banner', () => {
  it('Alert usa alert para erro e status para os demais, e diz o tipo em texto', () => {
    const { rerender } = render(<Alert tipo="erro" titulo="Falhou">Sem rede</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro: Falhou');
    rerender(<Alert tipo="sucesso">Salvo</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Sucesso: Salvo');
    rerender(<Alert tipo="info">Dica</Alert>);
    expect(screen.getByRole('status')).toHaveClass('ds-alerta--info');
  });

  it('Banner só tem botão de dispensar quando há callback, e some ao dispensar', async () => {
    const aoDispensar = vi.fn();
    const { rerender } = render(<Banner>Novidade</Banner>);
    expect(screen.queryByRole('button', { name: 'Dispensar aviso' })).not.toBeInTheDocument();
    rerender(<Banner tipo="aviso" aoDispensar={aoDispensar} acao={<a href="/ajuda">Saiba mais</a>}>Novidade</Banner>);
    expect(screen.getByRole('link', { name: 'Saiba mais' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar aviso' }));
    expect(aoDispensar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Novidade')).not.toBeInTheDocument();
  });
});

describe('ds: Toast', () => {
  function Disparo({ opcoes }: { opcoes?: Parameters<ReturnType<typeof useToast>['mostrar']>[1] }) {
    const { mostrar } = useToast();
    return <Button onClick={() => mostrar('Salvo com sucesso', opcoes)}>Salvar</Button>;
  }

  it('aparece numa região aria-live e some sozinho depois da duração padrão', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Disparo opcoes={{ tipo: 'sucesso' }} /></ToastProvider>);
    expect(screen.getByRole('region', { name: 'Notificações' })).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Salvo com sucesso');
    act(() => {
      vi.advanceTimersByTime(DURACAO_TOAST_PADRAO - 1);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('pode ser fechado à mão, erro usa role alert e duração zero não some', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Disparo opcoes={{ tipo: 'erro', duracao: 0 }} /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mantém no máximo 4 notificações e useToast fora do provedor falha', () => {
    render(<ToastProvider maximo={2}><Disparo /></ToastProvider>);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(botao);
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(screen.getAllByRole('status')).toHaveLength(2);
    const silenciar = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Disparo />)).toThrow('useToast precisa estar dentro de ToastProvider');
    silenciar.mockRestore();
  });
});
