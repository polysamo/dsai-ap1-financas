import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  criarEvento,
  despesasSemTag,
  editarEvento,
  etiquetarPeriodo,
  excluirEvento,
  listaEventos,
  resumoEvento,
  separarEventos,
  tagSugerida,
  type DadosEvento,
  type Evento,
} from '../domain/eventos';
import type { AppState, Transacao } from '../domain/types';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { hojeISO } from '../domain/date';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

let seq = 0;
const t = (data: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'a',
  categoriaId: 'cat-alimentacao',
  tipo: 'despesa',
  valor,
  data,
  descricao: `gasto ${seq}`,
  criadaEm: seq,
  tags: ['salvador'],
  ...parcial,
});

const evento = (parcial: Partial<Evento> = {}): Evento => ({ id: 'ev', nome: 'Salvador', inicio: '2026-10-01', fim: '2026-10-10', orcamento: 500000, tag: 'salvador', criadoEm: 1, ...parcial });

const base = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({ contas: [{ id: 'a', nome: 'Conta', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 }], ...parcial });

const dados = (parcial: Partial<DadosEvento> = {}): DadosEvento => ({ nome: 'Salvador', inicio: '2026-10-01', fim: '2026-10-10', orcamento: 500000, tag: 'salvador', ...parcial });

describe('eventos: cadastro', () => {
  it('critério 1: valida campos e tag única; sugere a tag pelo nome', () => {
    const tenta = (p: Partial<DadosEvento>, estado = base()) => criarEvento(estado, dados(p));
    expect(tenta({ nome: '' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ inicio: '2026-02-30' })).toMatchObject({ ok: false, campo: 'inicio' });
    expect(tenta({ fim: '2026-09-30' })).toMatchObject({ ok: false, campo: 'fim', erro: 'O fim não pode ser antes do início.' });
    expect(tenta({ orcamento: 0 })).toMatchObject({ ok: false, campo: 'orcamento' });
    expect(tenta({ tag: '  ' })).toMatchObject({ ok: false, campo: 'tag' });
    expect(tenta({ tag: 'x'.repeat(21) })).toMatchObject({ ok: false, campo: 'tag' });
    const comUm = base({ eventos: [evento()] });
    expect(tenta({ tag: 'Salvador' }, comUm)).toMatchObject({ ok: false, erro: 'Outro evento já usa essa tag.' });
    expect(tagSugerida('Viagem a São Paulo 2026!')).toBe('viagemasaopaulo2026');
    const r = criarEvento(base(), dados({ tag: ' Salvador ' }));
    expect(r.ok && listaEventos(r.valor)[0].tag).toBe('salvador');
  });

  it('critério 10: editar mantém a tag própria e excluir não mexe nas transações', () => {
    const estado = base({ eventos: [evento()], transacoes: [t('2026-10-02', 1000)] });
    const editado = editarEvento(estado, 'ev', dados({ orcamento: 100000, tag: 'salvador' }));
    expect(editado.ok && listaEventos(editado.valor)[0].orcamento).toBe(100000);
    const excluido = excluirEvento(estado, 'ev');
    expect(excluido.ok && excluido.valor.transacoes).toEqual(estado.transacoes);
    expect(excluido.ok && listaEventos(excluido.valor)).toEqual([]);
  });

  it('critério 12: dados antigos sem eventos carregam com lista vazia', () => {
    const { eventos: _sem, ...antigo } = estadoInicial();
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.eventos).toEqual([]);
  });
});

describe('eventos: resumo', () => {
  const transacoes = () => [
    t('2026-10-02', 100000),
    t('2026-10-03', 150000, { categoriaId: 'rest' }),
    t('2026-10-04', 50000, { categoriaId: 'cat-transporte' }),
    t('2026-10-04', 20000, { tipo: 'receita', categoriaId: 'cat-outros-receita' }),
    t('2026-10-05', 999999, { tags: ['outra'] }),
  ];
  const estado = () => {
    const s = base({ transacoes: transacoes() });
    s.categorias = [...s.categorias, { id: 'rest', nome: 'Restaurantes', tipo: 'despesa', arquivada: false, paiId: 'cat-alimentacao' }];
    return s;
  };

  it('critérios 2 e 3: soma despesas com a tag e abate reembolsos; situação em texto', () => {
    const r = resumoEvento(estado(), evento(), '2026-10-05');
    expect(r).toMatchObject({ despesas: 300000, reembolsos: 20000, gasto: 280000, restante: 220000, percentual: 56, situacao: 'dentro', quantidade: 4 });
    expect(resumoEvento(estado(), evento({ orcamento: 340000 }), '2026-10-05').situacao).toBe('atencao');
    const estourado = resumoEvento(estado(), evento({ orcamento: 200000 }), '2026-10-05');
    expect(estourado).toMatchObject({ situacao: 'estourado', restante: -80000 });
  });

  it('critério 4: quebra por categoria com subcategorias no pai', () => {
    const r = resumoEvento(estado(), evento(), '2026-10-05');
    expect(r.porCategoria.map((l) => [l.nome, l.valor, l.percentual])).toEqual([
      ['Alimentação', 250000, 83.3],
      ['Transporte', 50000, 16.7],
    ]);
  });

  it('critérios 5 e 6: média diária, projeção e evento encerrado ou futuro', () => {
    const andamento = resumoEvento(estado(), evento(), '2026-10-04');
    expect(andamento).toMatchObject({ diasDecorridos: 4, duracao: 10, mediaDiaria: 70000, projecao: 700000, encerrado: false });
    const encerrado = resumoEvento(estado(), evento(), '2026-10-20');
    expect(encerrado).toMatchObject({ diasDecorridos: 10, mediaDiaria: 28000, projecao: null, encerrado: true });
    const futuro = resumoEvento(estado(), evento({ inicio: '2026-11-01', fim: '2026-11-05' }), '2026-10-20');
    expect(futuro).toMatchObject({ diasDecorridos: 0, mediaDiaria: null, projecao: null });
  });

  it('critério 7: as 5 maiores despesas', () => {
    const muitas = base({ transacoes: [1, 9, 3, 7, 5, 8].map((v, i) => t(`2026-10-0${i + 1}`, v * 1000)) });
    expect(resumoEvento(muitas, evento(), '2026-10-05').maiores.map((x) => x.valor)).toEqual([9000, 8000, 7000, 5000, 3000]);
  });

  it('critério 8: etiquetar despesas do período, pulando quem já tem 5 tags', () => {
    const s = base({
      eventos: [evento()],
      transacoes: [
        t('2026-10-02', 100, { tags: [] }),
        t('2026-10-03', 100, { tags: undefined }),
        t('2026-10-04', 100, { tags: ['a', 'b', 'c', 'd', 'e'] }),
        t('2026-10-05', 100),
        t('2026-10-11', 100, { tags: [] }),
        t('2026-10-06', 100, { tipo: 'receita', tags: [] }),
      ],
    });
    expect(despesasSemTag(s.transacoes, evento()).length).toBe(3);
    const r = etiquetarPeriodo(s, 'ev');
    expect(r.ok && r.valor.alteradas).toBe(2);
    expect(r.ok && r.valor.puladas).toHaveLength(1);
    expect(r.ok && r.valor.estado.transacoes.filter((x) => x.tags?.includes('salvador'))).toHaveLength(3);
    expect(etiquetarPeriodo(base({ eventos: [evento()] }), 'ev')).toMatchObject({ ok: false, erro: 'Todas as despesas do período já têm a tag.' });
  });

  it('critério 9: separa em andamento e futuros de encerrados', () => {
    const lista = [evento({ id: 'velho', fim: '2026-09-01', inicio: '2026-08-01' }), evento({ id: 'futuro', inicio: '2026-12-01', fim: '2026-12-10' }), evento({ id: 'agora' })];
    const r = separarEventos(lista, '2026-10-05');
    expect(r.ativos.map((e) => e.id)).toEqual(['agora', 'futuro']);
    expect(r.encerrados.map((e) => e.id)).toEqual(['velho']);
  });
});

describe('eventos: tela', () => {
  it('critério 11: navegação e estado vazio', () => {
    expect(itensNavegacao).toContainEqual({ to: '/eventos', rotulo: 'Eventos' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Planejamento')?.itens).toContain('/eventos');
    renderizarApp('/eventos', base());
    expect(screen.getByText('Nenhum evento cadastrado')).toBeInTheDocument();
  });

  it('critérios 1 e 3: cria pela tela com tag sugerida e mostra o resumo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/eventos', base({ transacoes: [t('2026-10-02', 120000, { tags: ['ferias'] })] }));
    const form = within(screen.getByRole('form', { name: 'Novo evento' }));
    await usuario.type(form.getByLabelText('Nome do evento'), 'Férias');
    expect(form.getByLabelText('Tag das despesas')).toHaveValue('ferias');
    await usuario.type(form.getByLabelText('Orçamento'), '1.000,00');
    await usuario.click(form.getByRole('button', { name: 'Criar evento' }));
    expect(lerEstadoSalvo().eventos?.[0]).toMatchObject({ nome: 'Férias', tag: 'ferias', orcamento: 100000 });
    expect(screen.getByTestId('evento-gasto')).toHaveTextContent('R$ 1.200,00');
    expect(screen.getByTestId('evento-situacao')).toHaveTextContent('Estourado');
  });

  it('critérios 8 e 10: etiquetar com confirmação e excluir', async () => {
    const usuario = userEvent.setup();
    const hoje = hojeISO();
    const { store } = renderizarApp('/eventos', base({ eventos: [evento({ inicio: hoje, fim: hoje })], transacoes: [t(hoje, 5000, { tags: [] })] }));
    await usuario.click(screen.getByRole('button', { name: 'Etiquetar despesas do período (1)' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Etiquetar' }));
    expect(screen.getByText('1 transação etiquetada.')).toBeInTheDocument();
    expect(store.getSnapshot().estado.transacoes[0].tags).toEqual(['salvador']);
    await usuario.click(screen.getByRole('button', { name: 'Excluir evento' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(listaEventos(store.getSnapshot().estado)).toEqual([]);
    expect(store.getSnapshot().estado.transacoes[0].tags).toEqual(['salvador']);
  });
});
