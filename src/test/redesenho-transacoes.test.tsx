import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO } from '../domain/date';
import type { AppState, Conta, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();
const conta = (p: Partial<Conta> = {}): Conta => ({ id: 'a', nome: 'Conta', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1, ...p });
const t = (id: string, p: Partial<Transacao> = {}): Transacao => ({ id, contaId: 'a', categoriaId: 'cat-alimentacao', tipo: 'despesa', valor: 1000, data: hoje, descricao: id, criadaEm: 1, ...p });
const estado = (transacoes: Transacao[] = [], p: Partial<AppState> = {}) => construirEstado({ contas: [conta()], transacoes, ...p });
const notificacoes = () => within(screen.getByRole('region', { name: 'Notificações' }));

describe('redesenho de Transações: cabeçalho, filtros e abas', () => {
  it('critério 1: descrição e botão Nova transação só na aba Transações', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado([t('Padaria')]));
    expect(screen.getByRole('heading', { name: 'Transações', level: 1 })).toHaveAccessibleDescription(/edição em lote/);
    expect(screen.getByRole('button', { name: 'Nova transação' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('tab', { name: 'Categorias' }));
    expect(screen.queryByRole('button', { name: 'Nova transação' })).not.toBeInTheDocument();
  });

  it('critério 2: filtros sempre visíveis na barra de busca, sem details, com resumo aria-live', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado([t('Padaria'), t('Farmácia'), t('Antiga', { data: '2020-01-01' })]));
    const barra = screen.getByRole('search', { name: 'Filtros' });
    expect(barra.closest('details')).toBeNull();
    expect(within(barra).getByText('2 de 3 transações')).toHaveAttribute('aria-live', 'polite');
    await usuario.type(within(barra).getByLabelText('Buscar na descrição'), 'padar');
    expect(within(barra).getByText('1 de 3 transações')).toBeInTheDocument();
  });

  it('critério 3: Limpar filtros só aparece com filtro ativo e volta ao padrão', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado([t('Padaria'), t('Farmácia')]));
    const barra = screen.getByRole('search', { name: 'Filtros' });
    expect(within(barra).queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    await usuario.type(within(barra).getByLabelText('Buscar na descrição'), 'zzz');
    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument();
    await usuario.click(within(barra).getByRole('button', { name: 'Limpar filtros' }));
    expect(within(barra).getByLabelText('Buscar na descrição')).toHaveValue('');
    expect(within(barra).queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
    expect(screen.getByText('Padaria')).toBeInTheDocument();
  });

  it('critério 4: as abas funcionam pelo teclado e ?aba=categorias abre a segunda', async () => {
    const usuario = userEvent.setup();
    const { unmount } = renderizarApp('/transacoes', estado());
    screen.getByRole('tab', { name: 'Transações' }).focus();
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Categorias' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('form', { name: 'Nova categoria' })).toBeInTheDocument();
    unmount();
    renderizarApp('/transacoes?aba=categorias', estado());
    expect(screen.getByRole('tab', { name: 'Categorias' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('redesenho de Transações: notificações com Desfazer', () => {
  it('critério 5: criar e editar avisam e o Desfazer restaura', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estado([t('Padaria')]));
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    const painel = screen.getByRole('dialog', { name: 'Nova transação' });
    await usuario.type(within(painel).getByLabelText('Valor'), '15,00');
    await usuario.type(within(painel).getByLabelText('Descrição'), 'Café');
    await usuario.selectOptions(within(painel).getByLabelText('Conta'), 'a');
    await usuario.selectOptions(within(painel).getByLabelText('Categoria'), 'cat-alimentacao');
    await usuario.click(within(painel).getByRole('button', { name: /Salvar|Adicionar|Registrar/ }));
    expect(notificacoes().getByText('Transação registrada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes).toHaveLength(2);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: 'Editar Padaria' }));
    const descricao = screen.getByLabelText('Descrição');
    await usuario.clear(descricao);
    await usuario.type(descricao, 'Padaria nova');
    await usuario.click(screen.getByRole('button', { name: /Salvar/ }));
    expect(notificacoes().getByText('Transação atualizada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes[0].descricao).toBe('Padaria nova');
  });

  it('critério 6: excluir avisa e o Desfazer da notificação traz a transação de volta', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estado([t('Padaria')]));
    await usuario.click(screen.getByRole('button', { name: 'Excluir Padaria' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('Transação excluída.')).toBeInTheDocument();
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(1);
  });

  it('critério 6: excluir uma parcela e a compra inteira têm mensagens próprias', async () => {
    const usuario = userEvent.setup();
    const parcelas = [1, 2].map((n) => t(`Notebook ${n}/2`, { parcela: { grupoId: 'g', numero: n, total: 2 } }));
    const { store } = renderizarApp('/transacoes', estado(parcelas));
    await usuario.click(screen.getByRole('button', { name: 'Excluir Notebook 1/2' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Só esta parcela|Apenas esta|Esta parcela/ }));
    expect(notificacoes().getByText('Parcela excluída.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes).toHaveLength(1);
  });

  it('critério 7: lote vira notificação com Desfazer do lote inteiro; erro é alert persistente', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estado([t('Padaria'), t('Feira')]));
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
    await usuario.click(screen.getByRole('button', { name: 'Excluir selecionadas' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(notificacoes().getByText('2 transações excluídas.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(2);
    expect(document.querySelector('.transacoes__painel > .ds-alerta')).toBeNull();
  });

  it('critério 8: lançamento rápido avisa com Desfazer e o erro fica na prévia', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estado());
    const campo = screen.getByRole('textbox', { name: 'Lançamento rápido' });
    await usuario.type(campo, 'cinema 30 /lazer{Enter}');
    expect(notificacoes().getByText(/Lançado: cinema/)).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes).toHaveLength(1);
    await usuario.click(notificacoes().getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
    await usuario.type(campo, 'pão @inter 5');
    expect(screen.getByText('Conta "inter" não encontrada.')).toBeInTheDocument();
  });
});

describe('redesenho de Transações: atalho n e estados vazios', () => {
  it('critério 9: n abre Nova transação na aba Transações, não na aba Categorias nem com diálogo aberto', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado([t('Padaria')]));
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(screen.getByRole('dialog', { name: 'Nova transação' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    await usuario.click(screen.getByRole('tab', { name: 'Categorias' }));
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('critério 10: sem transações o vazio convida a adicionar e abre a criação', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado());
    expect(screen.getByText('Nenhuma transação registrada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Adicione sua primeira transação' }));
    expect(screen.getByRole('dialog', { name: 'Nova transação' })).toBeInTheDocument();
  });

  it('critério 11: os totais do filtro continuam corretos', () => {
    renderizarApp('/transacoes', estado([t('Almoço', { valor: 4000 }), t('Salário', { tipo: 'receita', categoriaId: 'cat-salario', valor: 100000 })]));
    expect(screen.getByTestId('total-receitas')).toHaveTextContent('R$ 1.000,00');
    expect(screen.getByTestId('total-despesas')).toHaveTextContent('R$ 40,00');
    expect(screen.getByTestId('total-resultado')).toHaveTextContent('R$ 960,00');
  });
});
