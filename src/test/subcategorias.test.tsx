import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { linhasOrcamento, totaisOrcamento } from '../domain/orcamento';
import { relatorioMensal } from '../domain/relatorios';
import { arvoreCategorias, definirPai, nomeCompleto, raizDe, somarNaRaiz } from '../domain/subcategorias';
import { arquivarCategoria, criarCategoria, excluirCategoria } from '../domain/transacoes';
import type { AppState, Categoria, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

const cat = (id: string, nome: string, parcial: Partial<Categoria> = {}): Categoria => ({ id, nome, tipo: 'despesa', arquivada: false, ...parcial });

const alimentacao = cat('ali', 'Alimentação');
const restaurantes = cat('res', 'Restaurantes', { paiId: 'ali' });
const mercado = cat('mer', 'Mercado', { paiId: 'ali' });
const lazer = cat('laz', 'Lazer');
const salario = cat('sal', 'Salário', { tipo: 'receita' });

const trans = (id: string, categoriaId: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'a',
  categoriaId,
  tipo: 'despesa',
  valor,
  data: '2026-10-05',
  descricao: id,
  criadaEm: 1,
  ...parcial,
});

const base = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({
    contas: [{ id: 'a', nome: 'Conta', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 }],
    categorias: [alimentacao, restaurantes, mercado, lazer, salario],
    transacoes: [trans('t1', 'ali', 1000), trans('t2', 'res', 3000), trans('t3', 'mer', 6000), trans('t4', 'laz', 2000)],
    ...parcial,
  });

const valor = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('subcategorias: domínio', () => {
  it('critério 1: cria subcategoria com pai válido e recusa pais inválidos no campo paiId', () => {
    const s = valor(criarCategoria(base(), { nome: 'Delivery', tipo: 'despesa', paiId: 'ali' }));
    expect(s.categorias.find((c) => c.nome === 'Delivery')?.paiId).toBe('ali');
    const arquivado = base({ categorias: [{ ...alimentacao, arquivada: true }, lazer, salario] });
    for (const [estado, paiId] of [
      [base(), 'sal'],
      [arquivado, 'ali'],
      [base(), 'nada'],
      [base(), 'res'],
    ] as const) {
      expect(criarCategoria(estado, { nome: 'Nova', tipo: 'despesa', paiId })).toMatchObject({ ok: false, campo: 'paiId' });
    }
  });

  it('critério 2: mover, promover e recusar ciclos', () => {
    const movida = valor(definirPai(base(), 'laz', 'ali'));
    expect(movida.categorias.find((c) => c.id === 'laz')?.paiId).toBe('ali');
    const promovida = valor(definirPai(base(), 'res', null));
    expect('paiId' in promovida.categorias.find((c) => c.id === 'res')!).toBe(false);
    expect(definirPai(base(), 'ali', 'laz')).toMatchObject({ ok: false, erro: 'Esta categoria tem subcategorias e não pode virar subcategoria.' });
    expect(definirPai(base(), 'laz', 'laz')).toMatchObject({ ok: false, erro: 'Uma categoria não pode ser pai de si mesma.' });
    const igual = base();
    expect(valor(definirPai(igual, 'res', 'ali'))).toBe(igual);
  });

  it('critério 3: arquivar o pai arquiva as filhas; reativar filha com pai arquivado é recusado', () => {
    const arquivada = valor(arquivarCategoria(base(), 'ali'));
    expect(arquivada.categorias.filter((c) => c.arquivada).map((c) => c.id)).toEqual(['ali', 'res', 'mer']);
    expect(arquivarCategoria(arquivada, 'res', false)).toMatchObject({ ok: false, erro: 'Reative primeiro a categoria pai.' });
    const reativada = valor(arquivarCategoria(arquivada, 'ali', false));
    expect(reativada.categorias.find((c) => c.id === 'res')?.arquivada).toBe(true);
    expect(valor(arquivarCategoria(reativada, 'res', false)).categorias.find((c) => c.id === 'res')?.arquivada).toBe(false);
  });

  it('critério 4: excluir pai com filhas é recusado; filha em uso exige destino', () => {
    expect(excluirCategoria(base(), 'ali')).toMatchObject({ ok: false, erro: 'Mova ou exclua as subcategorias antes.' });
    expect(excluirCategoria(base(), 'res')).toMatchObject({ ok: false, campo: 'destino' });
    const s = valor(excluirCategoria(base(), 'res', 'ali'));
    expect(s.transacoes.find((t) => t.id === 't2')?.categoriaId).toBe('ali');
  });

  it('critérios 5, 6 e 11: árvore ordenada, nome completo e pai inexistente vira primeiro nível', () => {
    const orfa = cat('orf', 'Órfã', { paiId: 'sumiu' });
    const categorias = [lazer, mercado, alimentacao, restaurantes, orfa];
    expect(arvoreCategorias(categorias, 'despesa').map((n) => `${n.nivel}:${n.categoria.nome}`)).toEqual(['0:Alimentação', '1:Mercado', '1:Restaurantes', '0:Lazer', '0:Órfã']);
    expect(nomeCompleto(categorias, 'res')).toBe('Alimentação › Restaurantes');
    expect(nomeCompleto(categorias, 'orf')).toBe('Órfã');
    expect(raizDe(categorias, 'orf')).toBe('orf');
    expect(raizDe(categorias, 'mer')).toBe('ali');
    expect([...somarNaRaiz(new Map([['res', 10], ['ali', 5], ['laz', 1]]), categorias)]).toEqual([['ali', 15], ['laz', 1]]);
    const soAtivas = arvoreCategorias([alimentacao, { ...restaurantes, arquivada: true }, mercado], 'despesa', (c) => !c.arquivada);
    expect(soAtivas.map((n) => n.categoria.id)).toEqual(['ali', 'mer']);
  });

  it('critério 8: no orçamento o pai soma as filhas e a filha mostra só o próprio gasto', () => {
    const linhas = linhasOrcamento(base(), '2026-10');
    const porId = new Map(linhas.map((l) => [l.categoria.id, l]));
    expect(linhas.map((l) => l.categoria.id)).toEqual(['ali', 'mer', 'res', 'laz']);
    expect(porId.get('ali')).toMatchObject({ gasto: 10000, gastoProprio: 1000, nome: 'Alimentação' });
    expect(porId.get('res')).toMatchObject({ gasto: 3000, nome: 'Alimentação › Restaurantes' });
  });

  it('critério 9: totais do orçamento sem contagem dupla', () => {
    const orcamentos = [
      { categoriaId: 'ali', mes: '2026-10', limite: 20000 },
      { categoriaId: 'res', mes: '2026-10', limite: 5000 },
    ];
    expect(totaisOrcamento(linhasOrcamento(base({ orcamentos }), '2026-10'))).toEqual({ limites: 20000, gastoComLimite: 10000, gastoSemOrcamento: 2000 });
    const soFilha = [{ categoriaId: 'res', mes: '2026-10', limite: 5000 }];
    expect(totaisOrcamento(linhasOrcamento(base({ orcamentos: soFilha }), '2026-10'))).toEqual({ limites: 5000, gastoComLimite: 3000, gastoSemOrcamento: 9000 });
  });

  it('critério 10: relatório mensal agrupa ou separa as subcategorias', () => {
    const agrupado = relatorioMensal(base(), '2026-10');
    expect(agrupado.despesasPorCategoria.linhas.map((l) => [l.nome, l.valor, l.percentual])).toEqual([
      ['Alimentação', 10000, 83.3],
      ['Lazer', 2000, 16.7],
    ]);
    const separado = relatorioMensal(base(), '2026-10', false);
    expect(separado.despesasPorCategoria.linhas.map((l) => l.nome)).toEqual(['Alimentação › Mercado', 'Alimentação › Restaurantes', 'Lazer', 'Alimentação']);
    expect(separado.despesas).toBe(agrupado.despesas);
  });
});

describe('subcategorias: interface', () => {
  it('critério 7: cria subcategoria pelo painel e ela aparece recuada sob o pai', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes?aba=categorias', base());
    const form = screen.getByRole('form', { name: 'Nova categoria' });
    await usuario.type(within(form).getByLabelText('Nome da categoria'), 'Padaria');
    await usuario.selectOptions(within(form).getByLabelText('Categoria pai'), 'ali');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar categoria' }));
    const nova = store.getSnapshot().estado.categorias.find((c) => c.nome === 'Padaria');
    expect(nova?.paiId).toBe('ali');
    const item = screen.getByText('Padaria').closest('li');
    expect(item).toHaveClass('categorias__item--sub');
  });

  it('critério 7: o formulário de edição troca o pai', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes?aba=categorias', base());
    await usuario.click(screen.getByRole('button', { name: 'Renomear Lazer' }));
    await usuario.selectOptions(screen.getByLabelText('Categoria pai de Lazer'), 'ali');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(store.getSnapshot().estado.categorias.find((c) => c.id === 'laz')?.paiId).toBe('ali');
    expect(store.getSnapshot().historico.passado).toHaveLength(1);
  });

  it('critérios 5 e 6: formulário de transação recua filhas e a lista mostra o nome completo', async () => {
    const usuario = userEvent.setup();
    const hoje = new Date().toISOString().slice(0, 10);
    renderizarApp('/transacoes', base({ transacoes: [trans('t2', 'res', 3000, { data: hoje, descricao: 'Jantar' })] }));
    expect(screen.getByText(/Alimentação › Restaurantes/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    const opcoes = within(screen.getByLabelText('Categoria')).getAllByRole('option').map((o) => o.textContent);
    const iAli = opcoes.indexOf('Alimentação');
    expect(opcoes[iAli + 1]).toBe('   Mercado');
    expect(opcoes[iAli + 2]).toBe('   Restaurantes');
  });

  it('critério 10: relatório mostra a opção de agrupar quando há subcategorias', async () => {
    const usuario = userEvent.setup();
    const hoje = new Date().toISOString().slice(0, 10);
    renderizarApp('/relatorios', base({ transacoes: [trans('t2', 'res', 3000, { data: hoje }), trans('t1', 'ali', 1000, { data: hoje })] }));
    const opcao = screen.getByRole('checkbox', { name: 'Agrupar subcategorias' });
    expect(opcao).toBeChecked();
    expect(screen.queryByText('Alimentação › Restaurantes')).not.toBeInTheDocument();
    await usuario.click(opcao);
    expect(screen.getByText('Alimentação › Restaurantes')).toBeInTheDocument();
  });
});
