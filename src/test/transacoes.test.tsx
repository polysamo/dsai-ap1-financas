import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saldoConta } from '../domain/contas';
import { hojeISO } from '../domain/date';
import {
  arquivarCategoria,
  criarCategoria,
  criarTransacao,
  editarTransacao,
  excluirCategoria,
  excluirTransacao,
  filtrarTransacoes,
  ordenarTransacoes,
  renomearCategoria,
  totaisTransacoes,
  validarTransacao,
  type DadosTransacao,
} from '../domain/transacoes';
import type { Conta, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const hoje = hojeISO();

const conta = (id: string, parcial: Partial<Conta> = {}): Conta => ({
  id,
  nome: id,
  tipo: 'corrente',
  saldoInicial: 0,
  arquivada: false,
  criadaEm: 1,
  ...parcial,
});

const dados = (parcial: Partial<DadosTransacao> = {}): DadosTransacao => ({
  contaId: 'a',
  categoriaId: 'cat-moradia',
  tipo: 'despesa',
  valor: 5000,
  data: '2026-10-01',
  descricao: 'Aluguel',
  ...parcial,
});

const trans = (id: string, parcial: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'a',
  categoriaId: 'cat-moradia',
  tipo: 'despesa',
  valor: 1000,
  data: '2026-10-01',
  descricao: id,
  criadaEm: 1,
  ...parcial,
});

const base = () => construirEstado({ contas: [conta('a'), conta('b')] });

describe('transações: validação e CRUD (critérios 1, 2, 3, 9, 10)', () => {
  it('cria, edita e exclui', () => {
    const c = criarTransacao(base(), dados());
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const id = c.valor.transacoes[0].id;
    const e = editarTransacao(c.valor, id, dados({ valor: 7000, descricao: ' Novo ' }));
    expect(e.ok && e.valor.transacoes[0]).toMatchObject({ valor: 7000, descricao: 'Novo' });
    const x = excluirTransacao(c.valor, id);
    expect(x.ok && x.valor.transacoes).toHaveLength(0);
  });

  it('critério 2: valor, data, conta e categoria são obrigatórios e válidos', () => {
    const estado = base();
    expect(validarTransacao(estado, dados({ valor: 0 }))).toMatchObject({ ok: false, campo: 'valor' });
    expect(validarTransacao(estado, dados({ valor: -5 }))).toMatchObject({ ok: false, campo: 'valor' });
    expect(validarTransacao(estado, dados({ valor: 10.5 }))).toMatchObject({ ok: false, campo: 'valor' });
    expect(validarTransacao(estado, dados({ data: '2026-02-31' }))).toMatchObject({ ok: false, campo: 'data' });
    expect(validarTransacao(estado, dados({ data: '' }))).toMatchObject({ ok: false, campo: 'data' });
    expect(validarTransacao(estado, dados({ contaId: '' }))).toMatchObject({ ok: false, campo: 'contaId' });
    expect(validarTransacao(estado, dados({ categoriaId: '' }))).toMatchObject({ ok: false, campo: 'categoriaId' });
  });

  it('critério 3: a categoria precisa ser do mesmo tipo da transação', () => {
    expect(validarTransacao(base(), dados({ tipo: 'receita' }))).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(validarTransacao(base(), dados({ tipo: 'receita', categoriaId: 'cat-salario' })).ok).toBe(true);
  });

  it('não aceita conta ou categoria arquivada em nova transação, mas mantém as já usadas ao editar', () => {
    const estado = construirEstado({ contas: [conta('a', { arquivada: true })] });
    expect(validarTransacao(estado, dados()).ok).toBe(false);
    const comTransacao = { ...estado, transacoes: [trans('t1')] };
    expect(editarTransacao(comTransacao, 't1', dados({ valor: 99 })).ok).toBe(true);
    const catArquivada = arquivarCategoria(base(), 'cat-moradia');
    expect(catArquivada.ok && validarTransacao(catArquivada.valor, dados()).ok).toBe(false);
  });

  it('critério 9: editar conta e categoria atualiza saldos e totais por categoria', () => {
    const estado = { ...base(), transacoes: [trans('t1', { valor: 3000 })] };
    expect(saldoConta(estado, 'a')).toBe(-3000);
    const r = editarTransacao(estado, 't1', dados({ contaId: 'b', categoriaId: 'cat-lazer', valor: 3000 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(saldoConta(r.valor, 'a')).toBe(0);
      expect(saldoConta(r.valor, 'b')).toBe(-3000);
      expect(r.valor.transacoes[0].categoriaId).toBe('cat-lazer');
    }
  });

});

describe('transações: lista, filtros e totais (critérios 4, 5, 6, 11)', () => {
  const lista = [
    trans('1', { data: '2026-09-30', criadaEm: 1 }),
    trans('2', { data: '2026-10-02', criadaEm: 2 }),
    trans('3', { data: '2026-10-02', criadaEm: 3 }),
    trans('4', { data: '2026-10-01', tipo: 'receita', categoriaId: 'cat-salario', valor: 9000, descricao: 'Salário de Outubro', contaId: 'b' }),
  ];

  it('critério 4: ordena por data decrescente e, em empate, pela criação mais recente', () => {
    expect(ordenarTransacoes(lista).map((t) => t.id)).toEqual(['3', '2', '4', '1']);
  });

  it('critério 5: filtros combinam com E lógico', () => {
    expect(filtrarTransacoes(lista, { de: '2026-10-01', ate: '2026-10-31' }).map((t) => t.id)).toEqual(['2', '3', '4']);
    expect(filtrarTransacoes(lista, { de: '2026-10-01', tipo: 'despesa' }).map((t) => t.id)).toEqual(['2', '3']);
    expect(filtrarTransacoes(lista, { contaId: 'b' }).map((t) => t.id)).toEqual(['4']);
    expect(filtrarTransacoes(lista, { categoriaId: 'cat-salario', contaId: 'a' })).toEqual([]);
    expect(filtrarTransacoes(lista, { texto: 'salario' }).map((t) => t.id)).toEqual(['4']);
    expect(filtrarTransacoes(lista, {})).toHaveLength(4);
  });

  it('critério 6: totais batem com a soma das linhas filtradas', () => {
    const f = filtrarTransacoes(lista, { de: '2026-10-01' });
    expect(totaisTransacoes(f)).toEqual({ receitas: 9000, despesas: 2000, resultado: 7000 });
  });

  it('critério 11: filtra e ordena 5.000 transações em menos de 200 ms', () => {
    const muitas = Array.from({ length: 5000 }, (_, i) => trans(`t${i}`, { data: `2026-${String((i % 12) + 1).padStart(2, '0')}-10`, criadaEm: i, descricao: `Compra ${i}` }));
    const inicio = performance.now();
    ordenarTransacoes(filtrarTransacoes(muitas, { de: '2026-03-01', texto: 'compra 4' }));
    expect(performance.now() - inicio).toBeLessThan(200);
  });
});

describe('categorias (critérios 7, 8, 12)', () => {
  it('critério 7: nome obrigatório, até 30 caracteres e único dentro do tipo', () => {
    const estado = base();
    expect(criarCategoria(estado, { nome: ' ', tipo: 'despesa' }).ok).toBe(false);
    expect(criarCategoria(estado, { nome: 'x'.repeat(31), tipo: 'despesa' }).ok).toBe(false);
    expect(criarCategoria(estado, { nome: 'moradia', tipo: 'despesa' }).ok).toBe(false);
    expect(criarCategoria(estado, { nome: 'Moradia', tipo: 'receita' }).ok).toBe(true);
    const renomeada = renomearCategoria(estado, 'cat-lazer', 'Diversão');
    expect(renomeada.ok && renomeada.valor.categorias.find((c) => c.id === 'cat-lazer')?.nome).toBe('Diversão');
    expect(renomearCategoria(estado, 'cat-lazer', 'Moradia').ok).toBe(false);
  });

  it('critério 8: categoria em uso só é excluída com destino, e nenhuma transação fica órfã', () => {
    const estado = { ...base(), transacoes: [trans('t1'), trans('t2', { categoriaId: 'cat-lazer' })] };
    expect(excluirCategoria(estado, 'cat-moradia').ok).toBe(false);
    expect(excluirCategoria(estado, 'cat-moradia', 'cat-salario').ok).toBe(false);
    expect(excluirCategoria(estado, 'cat-moradia', 'cat-moradia').ok).toBe(false);
    const r = excluirCategoria(estado, 'cat-moradia', 'cat-lazer');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.categorias.some((c) => c.id === 'cat-moradia')).toBe(false);
      const ids = new Set(r.valor.categorias.map((c) => c.id));
      expect(r.valor.transacoes.every((t) => ids.has(t.categoriaId))).toBe(true);
    }
    expect(excluirCategoria(base(), 'cat-saude').ok).toBe(true);
  });
});

describe('transações: tela', () => {
  const estadoComConta = () => construirEstado({ contas: [conta('a', { nome: 'Banco' })] });

  it('critério 11 (contas): sem conta ativa, não permite salvar e direciona para criar conta', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes');
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    expect(screen.getByRole('link', { name: 'Criar uma conta' })).toHaveAttribute('href', '/contas');
    expect(screen.queryByRole('button', { name: 'Adicionar transação' })).not.toBeInTheDocument();
  });

  it('estado vazio sugere adicionar a primeira transação', () => {
    renderizarApp('/transacoes', estadoComConta());
    expect(screen.getByText('Nenhuma transação registrada')).toBeInTheDocument();
  });

  it('critérios 1 e 3: cria uma despesa filtrando categorias pelo tipo e persiste', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estadoComConta());
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    const form = screen.getByRole('form', { name: 'Nova transação' });
    const categorias = within(form).getByLabelText('Categoria');
    expect(within(categorias).queryByRole('option', { name: 'Salário' })).not.toBeInTheDocument();
    await usuario.selectOptions(categorias, 'Moradia');
    await usuario.type(within(form).getByLabelText('Valor'), '150,50');
    await usuario.type(within(form).getByLabelText('Descrição'), 'Aluguel');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar transação' }));
    expect(store.getSnapshot().estado.transacoes[0]).toMatchObject({ valor: 15050, tipo: 'despesa', data: hoje, descricao: 'Aluguel' });
    expect(await within(await screen.findByRole('list', { name: 'Lista de transações' })).findByText('-R$ 150,50')).toBeInTheDocument();
    expect(screen.getByTestId('total-despesas')).toHaveTextContent('R$ 150,50');
  });

  it('critério 2: mostra erros de valor e data junto aos campos', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estadoComConta());
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    const form = screen.getByRole('form', { name: 'Nova transação' });
    await usuario.selectOptions(within(form).getByLabelText('Categoria'), 'Moradia');
    await usuario.type(within(form).getByLabelText('Valor'), '0');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar transação' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('maior que zero');
    await usuario.clear(within(form).getByLabelText('Valor'));
    await usuario.type(within(form).getByLabelText('Valor'), '10');
    fireEvent.change(within(form).getByLabelText('Data'), { target: { value: '' } });
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar transação' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('data válida');
  });

  it('critério 10: excluir pede confirmação e permite desfazer', async () => {
    const usuario = userEvent.setup();
    const estado = { ...estadoComConta(), transacoes: [trans('t1', { data: hoje, descricao: 'Padaria' })] };
    const { store } = renderizarApp('/transacoes', estado);
    await usuario.click(screen.getByRole('button', { name: 'Excluir Padaria' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
    await usuario.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(1);
    expect(screen.getByText('Desfeito: transação excluída')).toBeInTheDocument();
    expect(screen.getByText('Padaria')).toBeInTheDocument();
  });

  it('critério 5: filtros por texto e botão de limpar', async () => {
    const usuario = userEvent.setup();
    const estado = {
      ...estadoComConta(),
      transacoes: [trans('t1', { data: hoje, descricao: 'Padaria' }), trans('t2', { data: hoje, descricao: 'Farmácia' }), trans('t3', { data: '2020-01-01', descricao: 'Antiga' })],
    };
    renderizarApp('/transacoes', estado);
    expect(screen.queryByText('Antiga')).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Buscar na descrição'), 'farm');
    expect(screen.queryByText('Padaria')).not.toBeInTheDocument();
    expect(screen.getByText('Farmácia')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Padaria')).toBeInTheDocument();
    expect(screen.getByText('Farmácia')).toBeInTheDocument();
  });

  it('critério 11: mostra 50 por vez com botão para mostrar mais', async () => {
    const usuario = userEvent.setup();
    const muitas = Array.from({ length: 120 }, (_, i) => trans(`t${i}`, { data: hoje, descricao: `Item ${i}`, criadaEm: i }));
    renderizarApp('/transacoes', { ...estadoComConta(), transacoes: muitas });
    const lista = screen.getByRole('list', { name: 'Lista de transações' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(50);
    await usuario.click(screen.getByRole('button', { name: /Mostrar mais/ }));
    expect(within(lista).getAllByRole('listitem')).toHaveLength(100);
  });

  it('critério 12: transação com categoria arquivada mostra o nome marcado como arquivada', () => {
    const arq = arquivarCategoria(estadoComConta(), 'cat-lazer');
    if (!arq.ok) throw new Error('falhou');
    renderizarApp('/transacoes', { ...arq.valor, transacoes: [trans('t1', { data: hoje, categoriaId: 'cat-lazer' })] });
    expect(screen.getByText(/Lazer \(arquivada\)/)).toBeInTheDocument();
  });

  it('critério 7 e 8: aba de categorias cria, e exclusão em uso exige destino', async () => {
    const usuario = userEvent.setup();
    const estado = { ...estadoComConta(), transacoes: [trans('t1', { data: hoje })] };
    const { store } = renderizarApp('/transacoes', estado);
    await usuario.click(screen.getByRole('tab', { name: 'Categorias' }));
    await usuario.type(screen.getByLabelText('Nome da categoria'), 'Pets');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar categoria' }));
    expect(screen.getByText('Pets', { selector: '.categorias__nome' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Excluir Moradia' }));
    const grupo = screen.getByRole('group', { name: 'Excluir Moradia' });
    const confirmar = within(grupo).getByRole('button', { name: 'Mover e excluir' });
    expect(confirmar).toBeDisabled();
    await usuario.selectOptions(within(grupo).getByLabelText('Categoria de destino'), 'Lazer');
    await usuario.click(confirmar);
    expect(store.getSnapshot().estado.transacoes[0].categoriaId).toBe('cat-lazer');
    expect(store.getSnapshot().estado.categorias.some((c) => c.id === 'cat-moradia')).toBe(false);
  });
});
