import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { aplicarLote, excluirLote, mensagemLote, restringirSelecao, resumoSelecao } from '../domain/lote';
import type { AppState, Conta, Transacao } from '../domain/types';
import { hojeISO } from '../domain/date';
import { construirEstado, renderizarApp } from './helpers';

const conta = (id: string, parcial: Partial<Conta> = {}): Conta => ({ id, nome: id, tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1, ...parcial });

const trans = (id: string, parcial: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'a',
  categoriaId: 'cat-alimentacao',
  tipo: 'despesa',
  valor: 1000,
  data: '2026-10-02',
  descricao: id,
  criadaEm: 1,
  ...parcial,
});

const cartao = conta('cc', { tipo: 'cartao', cartao: { diaFechamento: 5, diaVencimento: 12, limite: 100000 } });
const parcela = trans('p1', { contaId: 'cc', parcela: { grupoId: 'g', numero: 1, total: 3 } });
const salario = trans('s1', { tipo: 'receita', categoriaId: 'cat-salario', valor: 500000 });

const base = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({ contas: [conta('a'), conta('b'), conta('x', { arquivada: true }), cartao], transacoes: [trans('t1'), trans('t2', { tags: ['casa'] }), salario, parcela], ...parcial });

const ids = (...lista: string[]) => new Set(lista);

const lote = (estado: AppState, sel: Set<string>, alteracao: Parameters<typeof aplicarLote>[2]) => {
  const r = aplicarLote(estado, sel, alteracao);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

const doEstado = (estado: AppState, id: string) => estado.transacoes.find((t) => t.id === id)!;

describe('lote: domínio', () => {
  it('critério 2: resumo soma receitas, despesas e resultado só das selecionadas', () => {
    const r = resumoSelecao(base().transacoes, ids('t1', 's1'));
    expect(r).toEqual({ quantidade: 2, receitas: 500000, despesas: 1000, resultado: 499000 });
  });

  it('critério 3: restringir a seleção descarta o que saiu do filtro', () => {
    expect([...restringirSelecao(ids('t1', 't2', 'zz'), [trans('t1')])]).toEqual(['t1']);
  });

  it('critério 4: categoria só vale para o mesmo tipo; as demais são puladas com motivo', () => {
    const r = lote(base(), ids('t1', 's1'), { tipo: 'categoria', categoriaId: 'cat-lazer' });
    expect(r.alteradas).toBe(1);
    expect(doEstado(r.estado, 't1').categoriaId).toBe('cat-lazer');
    expect(doEstado(r.estado, 's1').categoriaId).toBe('cat-salario');
    expect(r.puladas).toEqual([{ id: 's1', motivo: 'a categoria é de despesa e a transação é receita' }]);
    expect(mensagemLote(r)).toBe('1 transação alterada. 1 pulada (a categoria é de despesa e a transação é receita).');
  });

  it('critério 5: categoria arquivada ou inexistente é recusada', () => {
    const estado = base();
    const arquivada = { ...estado, categorias: estado.categorias.map((c) => (c.id === 'cat-lazer' ? { ...c, arquivada: true } : c)) };
    expect(aplicarLote(arquivada, ids('t1'), { tipo: 'categoria', categoriaId: 'cat-lazer' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(aplicarLote(estado, ids('t1'), { tipo: 'categoria', categoriaId: '' })).toMatchObject({ ok: false, campo: 'categoriaId' });
  });

  it('critério 6: mover para conta ativa pula parcelas de cartão e recusa conta arquivada', () => {
    const r = lote(base(), ids('t1', 'p1'), { tipo: 'conta', contaId: 'b' });
    expect(doEstado(r.estado, 't1').contaId).toBe('b');
    expect(doEstado(r.estado, 'p1').contaId).toBe('cc');
    expect(r.puladas[0].motivo).toMatch(/parcela de cartão/);
    expect(aplicarLote(base(), ids('t1'), { tipo: 'conta', contaId: 'x' })).toMatchObject({ ok: false, campo: 'contaId' });
  });

  it('critério 7: data exige formato válido e pula parcelas', () => {
    expect(aplicarLote(base(), ids('t1'), { tipo: 'data', data: '2026-02-30' })).toMatchObject({ ok: false, campo: 'data' });
    const r = lote(base(), ids('t1', 'p1'), { tipo: 'data', data: '2026-09-15' });
    expect(doEstado(r.estado, 't1').data).toBe('2026-09-15');
    expect(doEstado(r.estado, 'p1').data).toBe('2026-10-02');
  });

  it('critério 8: adicionar tags normaliza e não duplica; acima do limite pula', () => {
    const r = lote(base(), ids('t1', 't2'), { tipo: 'adicionar-tags', tags: [' Casa ', 'Mercado'] });
    expect(doEstado(r.estado, 't1').tags).toEqual(['casa', 'mercado']);
    expect(doEstado(r.estado, 't2').tags).toEqual(['casa', 'mercado']);
    const cheia = base({ transacoes: [trans('t1', { tags: ['a', 'b', 'c', 'd', 'e'] }), trans('t2')] });
    const r2 = lote(cheia, ids('t1', 't2'), { tipo: 'adicionar-tags', tags: ['f'] });
    expect(r2.alteradas).toBe(1);
    expect(r2.puladas[0]).toEqual({ id: 't1', motivo: 'passaria de 5 tags' });
    expect(aplicarLote(base(), ids('t1'), { tipo: 'adicionar-tags', tags: [] })).toMatchObject({ ok: false, campo: 'tags' });
  });

  it('critério 8: remover tags apaga o campo quando a lista fica vazia', () => {
    const estado = base({ transacoes: [trans('t1', { tags: ['casa', 'mercado'] }), trans('t2', { tags: ['casa'] })] });
    const r = lote(estado, ids('t1', 't2'), { tipo: 'remover-tags', tags: ['CASA'] });
    expect(doEstado(r.estado, 't1').tags).toEqual(['mercado']);
    expect('tags' in doEstado(r.estado, 't2')).toBe(false);
  });

  it('critério 9 e 11: excluir remove todas; nada alterável não grava', () => {
    const r = excluirLote(base(), ids('t1', 't2'));
    expect(r.ok && r.valor.estado.transacoes.map((t) => t.id)).toEqual(['s1', 'p1']);
    expect(r.ok && mensagemLote(r.valor, 'excluída')).toBe('2 transações excluídas.');
    expect(excluirLote(base(), ids('nada')).ok).toBe(false);
    const nenhuma = aplicarLote(base(), ids('s1'), { tipo: 'categoria', categoriaId: 'cat-lazer' });
    expect(nenhuma).toMatchObject({ ok: false, erro: 'Nenhuma transação pôde ser alterada: a categoria é de despesa e a transação é receita.' });
    expect(aplicarLote(base(), ids(), { tipo: 'data', data: '2026-10-01' }).ok).toBe(false);
  });
});

describe('lote: tela de transações', () => {
  const hoje = hojeISO();
  const estadoTela = () =>
    base({
      transacoes: [trans('t1', { data: hoje, descricao: 'Padaria' }), trans('t2', { data: hoje, descricao: 'Feira' }), trans('s1', { data: hoje, tipo: 'receita', categoriaId: 'cat-salario', descricao: 'Salário', valor: 300000 })],
    });

  it('critério 1 e 2: caixas por linha, selecionar todas e barra com resumo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estadoTela());
    expect(screen.queryByRole('region', { name: 'Ações em lote' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar Padaria' }));
    const barra = screen.getByRole('region', { name: 'Ações em lote' });
    expect(within(barra).getByText('1 selecionada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
    expect(within(barra).getByText('3 selecionadas')).toBeInTheDocument();
    expect(within(barra).getByText(/Despesas R\$\s20,00/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
    expect(screen.queryByRole('region', { name: 'Ações em lote' })).not.toBeInTheDocument();
  });

  it('critério 3: mudar o filtro tira da seleção o que saiu dele', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estadoTela());
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
    await usuario.type(screen.getByLabelText('Buscar na descrição'), 'pada');
    expect(within(screen.getByRole('region', { name: 'Ações em lote' })).getByText('1 selecionada')).toBeInTheDocument();
  });

  it('critérios 4, 10 e 12: alterar categoria pela barra, mensagem e desfazer do lote inteiro', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estadoTela());
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
    await usuario.click(screen.getByRole('button', { name: 'Alterar categoria' }));
    const painel = screen.getByRole('dialog');
    await usuario.selectOptions(within(painel).getByLabelText('Nova categoria'), 'cat-lazer');
    await usuario.click(within(painel).getByRole('button', { name: 'Aplicar' }));
    expect(screen.getByText(/2 transações alteradas\. 1 pulada/)).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes.filter((t) => t.categoriaId === 'cat-lazer')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: 'Ações em lote' })).not.toBeInTheDocument();
    await usuario.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Desfazer' }));
    expect(store.getSnapshot().estado.transacoes.filter((t) => t.categoriaId === 'cat-lazer')).toHaveLength(0);
  });

  it('critério 9: excluir selecionadas pede confirmação com a quantidade', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estadoTela());
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar Padaria' }));
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar Feira' }));
    await usuario.click(screen.getByRole('button', { name: 'Excluir selecionadas' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/Excluir 2 transações\?/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.transacoes.map((t) => t.id)).toEqual(['s1']);
    expect(screen.getByText('2 transações excluídas.')).toBeInTheDocument();
  });

  it('critério 11: erro de validação aparece no campo e nada muda', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estadoTela());
    await usuario.click(screen.getByRole('checkbox', { name: 'Selecionar Salário' }));
    await usuario.click(screen.getByRole('button', { name: 'Alterar categoria' }));
    const painel = screen.getByRole('dialog');
    await usuario.selectOptions(within(painel).getByLabelText('Nova categoria'), 'cat-lazer');
    await usuario.click(within(painel).getByRole('button', { name: 'Aplicar' }));
    expect(within(painel).getByRole('alert')).toHaveTextContent('Nenhuma transação pôde ser alterada');
    expect(store.getSnapshot().historico.passado).toHaveLength(0);
  });
});
