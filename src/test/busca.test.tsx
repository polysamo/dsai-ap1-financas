import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { buscar, indexar, lembrarBusca, totalResultados, type ItemBusca } from '../domain/busca';
import type { AppState, Conta, Transacao } from '../domain/types';
import { CHAVE_BUSCAS_RECENTES, gravarBuscasRecentes, lerBuscasRecentes } from '../lib/buscasRecentes';
import { filtrosDaUrl } from '../pages/TransacoesPage';
import { construirEstado, renderizarApp } from './helpers';

const conta = (id: string, nome: string, parcial: Partial<Conta> = {}): Conta => ({ id, nome, tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1, ...parcial });

let seq = 0;
const trans = (descricao: string, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'nu',
  categoriaId: 'cat-alimentacao',
  tipo: 'despesa',
  valor: 1000,
  data: '2026-09-10',
  descricao,
  criadaEm: seq,
  ...parcial,
});

const estado = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({
    contas: [conta('nu', 'Nubank'), conta('velha', 'Conta Antiga', { arquivada: true })],
    transacoes: [
      trans('Padaria Pão Quente', { data: '2026-09-01' }),
      trans('Pão de Açúcar mercado', { data: '2026-09-20', valor: 4590 }),
      trans('Passagem aérea', { tags: ['viagem'], valor: 120000 }),
      trans('Hotel', { tags: ['viagem'] }),
    ],
    metas: [{ id: 'm1', nome: 'Viagem ao Chile', valorAlvo: 800000, aportes: [], status: 'ativa', criadaEm: 1 }],
    ...parcial,
  });

const paginas = [
  { to: '/dividas', rotulo: 'Dívidas' },
  { to: '/divisao', rotulo: 'Divisão' },
];

const itens = (s = estado()) => indexar(s, paginas);
const titulos = (consulta: string, s?: AppState) => buscar(itens(s), consulta).flatMap((g) => g.itens.map((i) => i.titulo));

describe('busca: domínio', () => {
  it('critério 3: ignora acento e maiúsculas e exige todas as palavras', () => {
    expect(titulos('PAO')).toEqual(['Pão de Açúcar mercado', 'Padaria Pão Quente']);
    expect(titulos('pao mercado')).toEqual(['Pão de Açúcar mercado']);
    expect(titulos('divida')).toContain('Dívidas');
    expect(titulos('pao inexistente')).toEqual([]);
    expect(buscar(itens(), '   ')).toEqual([]);
  });

  it('critério 4: grupos na ordem fixa, no máximo 5 por grupo, com restantes', () => {
    const muitas = estado({ transacoes: Array.from({ length: 8 }, (_, i) => trans(`Uber ${i}`)) });
    const grupos = buscar(itens(muitas), 'uber');
    expect(grupos[0].itens).toHaveLength(5);
    expect(grupos[0].restantes).toBe(3);
    expect(totalResultados(grupos)).toBe(8);
    const viagem = buscar(itens(), 'viagem').map((g) => g.rotulo);
    expect(viagem).toEqual(['Transações', 'Metas']);
  });

  it('critério 5: começo do título, depois começo de palavra, depois meio; empate pela data mais recente', () => {
    const s = estado({ transacoes: [trans('Supermercado', { data: '2026-09-30' }), trans('Mercado livre', { data: '2026-09-01' }), trans('Ida ao mercado', { data: '2026-09-15' }), trans('Mercadinho', { data: '2026-09-29' })] });
    expect(titulos('merc', s)).toEqual(['Mercadinho', 'Mercado livre', 'Ida ao mercado', 'Supermercado']);
  });

  it('critério 6: valor em reais encontra a transação com o valor exato', () => {
    expect(titulos('45,90')).toEqual(['Pão de Açúcar mercado']);
    expect(titulos('R$ 1.200,00')).toEqual(['Passagem aérea']);
  });

  it('critério 7: detalhe com data, valor e conta; busca por tag com ou sem #', () => {
    const passagem = buscar(itens(), 'passagem')[0].itens[0];
    expect(passagem.detalhe).toMatch(/^10\/09\/2026 · -R\$\s1\.200,00 · Nubank$/);
    expect(titulos('#viagem')).toEqual(['Hotel', 'Passagem aérea', 'Viagem ao Chile']);
    expect(titulos('viagem')).toEqual(['Hotel', 'Passagem aérea', 'Viagem ao Chile']);
  });

  it('critérios 9, 10 e 13: rotas de destino e marca de arquivada', () => {
    const porId = new Map(itens().map((i): [string, ItemBusca] => [i.id, i]));
    const t = itens().find((i) => i.titulo === 'Hotel')!;
    expect(t.rota).toBe('/transacoes?texto=Hotel&de=2026-09-10&ate=2026-09-10');
    expect(porId.get('conta:velha')?.titulo).toBe('Conta Antiga (arquivada)');
    expect(porId.get('meta:m1')?.rota).toBe('/metas');
    expect(porId.get('pagina:/dividas')?.rota).toBe('/dividas');
    expect(porId.get('categoria:cat-lazer')?.rota).toBe('/transacoes?aba=categorias');
  });

  it('critério 11: recentes sem repetição, mais nova primeiro, no máximo 5', () => {
    let r: string[] = [];
    for (const c of ['a', 'b', 'Pão', 'c', 'd', 'e', 'pao']) r = lembrarBusca(r, c);
    expect(r).toEqual(['pao', 'e', 'd', 'c', 'b']);
    expect(lembrarBusca(r, '  ')).toBe(r);
    gravarBuscasRecentes(localStorage, ['x']);
    expect(lerBuscasRecentes(localStorage)).toEqual(['x']);
    localStorage.setItem(CHAVE_BUSCAS_RECENTES, '{quebrado');
    expect(lerBuscasRecentes(localStorage)).toEqual([]);
  });

  it('critério 9: filtros da URL na tela de transações', () => {
    expect(filtrosDaUrl(new URLSearchParams('texto=Hotel&de=2026-09-10&ate=2026-09-10'))).toEqual({ texto: 'Hotel', de: '2026-09-10', ate: '2026-09-10' });
    expect(filtrosDaUrl(new URLSearchParams('de=2026-02-31'))).toHaveProperty('de');
    expect(filtrosDaUrl(new URLSearchParams('de=2026-02-31')).de).not.toBe('2026-02-31');
  });
});

describe('busca: interface', () => {
  it('critérios 1 e 2: Ctrl+K abre mesmo num campo, / só fora de campo, Esc fecha', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado());
    fireEvent.keyDown(document, { key: '/' });
    const campo = screen.getByRole('combobox', { name: 'Buscar no app' });
    expect(campo).toHaveFocus();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Busca global' })).not.toBeInTheDocument();
    const filtro = screen.getByLabelText('Buscar na descrição');
    fireEvent.keyDown(filtro, { key: '/' });
    expect(screen.queryByRole('dialog', { name: 'Busca global' })).not.toBeInTheDocument();
    fireEvent.keyDown(filtro, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Busca global' })).toBeInTheDocument();
  });

  it('critério 1: botão Buscar no topo abre a busca', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', estado());
    await usuario.click(screen.getByRole('button', { name: /Buscar/ }));
    expect(screen.getByRole('combobox', { name: 'Buscar no app' })).toBeInTheDocument();
  });

  it('critérios 8 e 9: setas mudam o ativo e Enter abre a transação filtrada', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', estado());
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar no app' }), 'pao');
    const opcoes = within(screen.getByRole('listbox', { name: 'Resultados' })).getAllByRole('option');
    expect(opcoes[0]).toHaveAttribute('aria-selected', 'true');
    await usuario.keyboard('{ArrowDown}');
    expect(opcoes[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: 'Buscar no app' })).toHaveAttribute('aria-activedescendant', opcoes[1].id);
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Transações', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar na descrição')).toHaveValue('Padaria Pão Quente');
    const lista = screen.getByRole('list', { name: 'Lista de transações' });
    expect(within(lista).getByText('Padaria Pão Quente')).toBeInTheDocument();
    expect(within(lista).queryByText('Hotel')).not.toBeInTheDocument();
  });

  it('critério 10: clicar numa página navega para ela', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', estado());
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar no app' }), 'investimentos');
    await usuario.click(screen.getByRole('option', { name: /Investimentos/ }));
    expect(screen.getByRole('heading', { name: 'Investimentos', level: 1 })).toBeInTheDocument();
  });

  it('critérios 11 e 12: sem resultados avisa; recentes aparecem e podem ser limpas', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', estado());
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar no app' }), 'zzz');
    expect(screen.getByText('Nada encontrado para "zzz".')).toBeInTheDocument();
    expect(screen.getByText('0 resultados')).toBeInTheDocument();
    await usuario.clear(screen.getByRole('combobox', { name: 'Buscar no app' }));
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar no app' }), 'hotel');
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
    await usuario.keyboard('{Enter}');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'hotel' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Limpar recentes' }));
    expect(screen.queryByText('Buscas recentes')).not.toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_BUSCAS_RECENTES)).toBeNull();
  });
});
