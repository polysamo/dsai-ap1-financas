import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { importarTransacoes, sugerirCategoria, sugerirTags } from '../domain/csv';
import {
  aplicarRegra,
  casaPadrao,
  criarRegra,
  editarRegra,
  moverRegra,
  primeiraRegra,
  transacoesAtingidas,
  validarRegra,
  type DadosRegra,
} from '../domain/regras';
import { listarTags, parseTags, validarTags } from '../domain/tags';
import { criarTransacao, editarTransacao, filtrarTransacoes } from '../domain/transacoes';
import type { Conta, MapeamentoCsv, RegraCategoria, Transacao } from '../domain/types';
import { migrar } from '../storage/storage';
import { hojeISO } from '../domain/date';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta: Conta = { id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };

const regra = (parcial: Partial<RegraCategoria> & { id: string }): RegraCategoria => ({
  padrao: 'mercado',
  modo: 'contem',
  tipo: 'despesa',
  categoriaId: 'cat-alimentacao',
  tags: [],
  ativa: true,
  ...parcial,
});

const trans = (parcial: Partial<Transacao> & { id: string }): Transacao => ({
  contaId: 'a',
  categoriaId: 'cat-outros-despesa',
  tipo: 'despesa',
  valor: 1000,
  data: '2026-10-01',
  descricao: 'Mercado Bom Preço',
  criadaEm: 1,
  ...parcial,
});

const dados = (parcial: Partial<DadosRegra> = {}): DadosRegra => ({ padrao: 'uber', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-transporte', tags: [], ...parcial });

const mapa: MapeamentoCsv = { colData: 0, colDescricao: 1, colValor: 2, colCredito: null, colDebito: null, formatoData: 'dd/mm/aaaa', temCabecalho: false };

describe('regras: casamento (critério 1)', () => {
  it('contém, começa com e igual comparam a descrição normalizada', () => {
    const d = '  PÃO de  Açúcar Centro ';
    expect(casaPadrao({ padrao: 'acucar', modo: 'contem' }, d)).toBe(true);
    expect(casaPadrao({ padrao: 'pao de', modo: 'comeca' }, d)).toBe(true);
    expect(casaPadrao({ padrao: 'acucar', modo: 'comeca' }, d)).toBe(false);
    expect(casaPadrao({ padrao: 'pao de acucar centro', modo: 'igual' }, d)).toBe(true);
    expect(casaPadrao({ padrao: 'pao de acucar', modo: 'igual' }, d)).toBe(false);
    expect(casaPadrao({ padrao: '  ', modo: 'contem' }, d)).toBe(false);
  });

  it('exige o mesmo tipo e ignora regras inativas', () => {
    const estado = construirEstado({ regras: [regra({ id: 'r1', ativa: false }), regra({ id: 'r2', tipo: 'receita', categoriaId: 'cat-salario' })] });
    expect(primeiraRegra(estado, 'Mercado', 'despesa')).toBeUndefined();
    expect(primeiraRegra(estado, 'Mercado', 'receita')?.id).toBe('r2');
  });
});

describe('regras: validação, tags e CRUD (critérios 2, 3, 5)', () => {
  const estado = construirEstado();

  it('critério 2: recusa padrão vazio ou longo, categoria inválida e tags inválidas, com o campo do erro', () => {
    expect(validarRegra(estado, dados({ padrao: '   ' }))).toMatchObject({ ok: false, campo: 'padrao' });
    expect(validarRegra(estado, dados({ padrao: 'x'.repeat(61) }))).toMatchObject({ ok: false, campo: 'padrao' });
    expect(validarRegra(estado, dados({ categoriaId: 'nao-existe' }))).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(validarRegra(estado, dados({ categoriaId: 'cat-salario' }))).toMatchObject({ ok: false, campo: 'categoriaId' });
    const arquivada = construirEstado({ categorias: estado.categorias.map((c) => (c.id === 'cat-transporte' ? { ...c, arquivada: true } : c)) });
    expect(validarRegra(arquivada, dados())).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(validarRegra(estado, dados({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toMatchObject({ ok: false, campo: 'tags' });
    const ok = validarRegra(estado, dados({ padrao: '  Uber ' }));
    expect(ok).toMatchObject({ ok: true, valor: { padrao: 'Uber' } });
  });

  it('critério 3: tags normalizadas, sem repetição, com máximo de 5 e 20 caracteres', () => {
    expect(parseTags(' Viagem ,  reembolsável,, VIAGEM ')).toEqual(['viagem', 'reembolsável', 'viagem']);
    expect(validarTags(parseTags('Viagem, viagem , Ferias'))).toEqual({ ok: true, valor: ['viagem', 'ferias'] });
    expect(validarTags(['a', 'b', 'c', 'd', 'e'])).toMatchObject({ ok: true });
    expect(validarTags(['a', 'b', 'c', 'd', 'e', 'f'])).toMatchObject({ ok: false, campo: 'tags' });
    expect(validarTags(['x'.repeat(20)]).ok).toBe(true);
    expect(validarTags(['x'.repeat(21)]).ok).toBe(false);
  });

  it('critério 5: criar, editar, reordenar e manter a ordem; a primeira ativa que casa vence', () => {
    let s = estado;
    const passo = (r: ReturnType<typeof criarRegra>) => {
      if (!r.ok) throw new Error(r.erro);
      s = r.valor;
    };
    passo(criarRegra(s, dados({ padrao: 'uber', categoriaId: 'cat-transporte' })));
    passo(criarRegra(s, dados({ padrao: 'uber eats', categoriaId: 'cat-alimentacao' })));
    const [r1, r2] = s.regras;
    expect(sugerirCategoria(s, 'Uber Eats Pedido', 'despesa')).toBe('cat-transporte');
    passo(moverRegra(s, r2.id, -1));
    expect(s.regras.map((r) => r.id)).toEqual([r2.id, r1.id]);
    expect(sugerirCategoria(s, 'Uber Eats Pedido', 'despesa')).toBe('cat-alimentacao');
    expect(moverRegra(s, r2.id, -1)).toEqual({ ok: true, valor: s });
    passo(editarRegra(s, r1.id, dados({ padrao: 'taxi', categoriaId: 'cat-transporte' })));
    expect(s.regras.find((r) => r.id === r1.id)?.padrao).toBe('taxi');
    expect(editarRegra(s, 'x', dados()).ok).toBe(false);
  });
});

describe('regras: pré-visualização e aplicação às existentes (critérios 6, 7, 12)', () => {
  const base = construirEstado({
    contas: [conta],
    regras: [regra({ id: 'r1', tags: ['mercado'] })],
    transacoes: [
      trans({ id: 't1' }),
      trans({ id: 't2', categoriaId: 'cat-lazer', tags: ['a', 'b', 'c', 'd'] }),
      trans({ id: 't3', descricao: 'Padaria' }),
      trans({ id: 't4', tipo: 'receita', categoriaId: 'cat-outros-receita' }),
    ],
  });

  it('critério 6: a contagem respeita o escopo e o tipo', () => {
    const r = base.regras[0];
    expect(transacoesAtingidas(base, r, 'outros').map((t) => t.id)).toEqual(['t1']);
    expect(transacoesAtingidas(base, r, 'todas').map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('critério 7: troca a categoria, soma tags até o máximo e não toca no resto', () => {
    const r = aplicarRegra(base, 'r1', 'todas');
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.alteradas).toBe(2);
    const por = new Map(r.valor.estado.transacoes.map((t) => [t.id, t]));
    expect(por.get('t1')).toMatchObject({ categoriaId: 'cat-alimentacao', tags: ['mercado'] });
    expect(por.get('t2')).toMatchObject({ categoriaId: 'cat-alimentacao', tags: ['a', 'b', 'c', 'd', 'mercado'] });
    expect(por.get('t3')).toEqual(base.transacoes[2]);
    expect(por.get('t4')).toEqual(base.transacoes[3]);
    const soOutros = aplicarRegra(base, 'r1', 'outros');
    if (!soOutros.ok) throw new Error(soOutros.erro);
    expect(soOutros.valor.estado.transacoes.find((t) => t.id === 't2')?.categoriaId).toBe('cat-lazer');
    expect(aplicarRegra(construirEstado({ regras: [regra({ id: 'r1', ativa: false })] }), 'r1', 'todas').ok).toBe(false);
  });

  it('critério 12: regra com categoria arquivada ou excluída é ignorada em sugestão, prévia e aplicação', () => {
    const arquivada = { ...base, categorias: base.categorias.map((c) => (c.id === 'cat-alimentacao' ? { ...c, arquivada: true } : c)) };
    const excluida = { ...base, categorias: base.categorias.filter((c) => c.id !== 'cat-alimentacao') };
    for (const s of [arquivada, excluida]) {
      expect(primeiraRegra(s, 'Mercado', 'despesa')).toBeUndefined();
      expect(sugerirCategoria(s, 'Mercado', 'despesa')).toBe('cat-outros-despesa');
      expect(transacoesAtingidas(s, s.regras[0], 'todas')).toEqual([]);
      const r = aplicarRegra(s, 'r1', 'todas');
      expect(r.ok && r.valor.estado.transacoes).toEqual(s.transacoes);
    }
  });
});

describe('tags nas transações (critérios 8 e 9)', () => {
  const dadosT = { contaId: 'a', categoriaId: 'cat-alimentacao', tipo: 'despesa' as const, valor: 500, data: '2026-10-02', descricao: 'Lanche' };
  const estado = construirEstado({ contas: [conta] });

  it('critério 8: grava tags normalizadas, valida limites e remove ao esvaziar', () => {
    const criada = criarTransacao(estado, { ...dadosT, tags: [' Viagem ', 'viagem', 'Trabalho'] });
    if (!criada.ok) throw new Error(criada.erro);
    const t = criada.valor.transacoes[0];
    expect(t.tags).toEqual(['viagem', 'trabalho']);
    expect(criarTransacao(estado, { ...dadosT, tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).toMatchObject({ ok: false, campo: 'tags' });
    const sem = criarTransacao(estado, dadosT);
    if (!sem.ok) throw new Error(sem.erro);
    expect('tags' in sem.valor.transacoes[0]).toBe(false);
    const editada = editarTransacao(criada.valor, t.id, { ...dadosT, tags: [] });
    if (!editada.ok) throw new Error(editada.erro);
    expect('tags' in editada.valor.transacoes[0]).toBe(false);
  });

  it('critério 8: dados antigos sem tags ou sem regras continuam carregando', () => {
    const antigo = { schemaVersion: 2, contas: [], categorias: [], transacoes: [{ ...trans({ id: 't' }) }], orcamentos: [], metas: [], recorrencias: [], mapeamentosCsv: {}, importacoes: [], pagamentosFatura: [] };
    const r = migrar(antigo);
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') expect(r.estado.regras).toEqual([]);
  });

  it('critério 9: filtra por tag combinada a outros filtros', () => {
    const lista = [trans({ id: '1', tags: ['viagem'] }), trans({ id: '2', tags: ['viagem'], tipo: 'receita' }), trans({ id: '3' })];
    expect(filtrarTransacoes(lista, { tag: 'Viagem' }).map((t) => t.id)).toEqual(['1', '2']);
    expect(filtrarTransacoes(lista, { tag: 'viagem', tipo: 'despesa' }).map((t) => t.id)).toEqual(['1']);
    expect(listarTags(lista)).toEqual(['viagem']);
  });

  it('critério 8 e 9 na tela: campo Tags no formulário, exibição na lista e filtro por tag', async () => {
    const usuario = userEvent.setup();
    const hoje = hojeISO();
    const { store } = renderizarApp('/transacoes', construirEstado({ contas: [conta], transacoes: [trans({ id: 'x', data: hoje, descricao: 'Sem tag' })] }));
    await usuario.click(screen.getByRole('button', { name: 'Nova transação' }));
    const form = screen.getByRole('form', { name: 'Nova transação' });
    await usuario.selectOptions(within(form).getByLabelText('Categoria'), 'Alimentação');
    await usuario.type(within(form).getByLabelText('Valor'), '12,00');
    await usuario.type(within(form).getByLabelText('Descrição'), 'Hotel');
    await usuario.type(within(form).getByLabelText('Tags'), 'a,b,c,d,e,f');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar transação' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('no máximo 5 tags');
    await usuario.clear(within(form).getByLabelText('Tags'));
    await usuario.type(within(form).getByLabelText('Tags'), 'Viagem, ferias');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar transação' }));
    expect(store.getSnapshot().estado.transacoes.find((t) => t.descricao === 'Hotel')?.tags).toEqual(['viagem', 'ferias']);

    const lista = screen.getByRole('list', { name: 'Lista de transações' });
    expect(within(lista).getByText('Tags: viagem, ferias')).toBeInTheDocument();
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    await usuario.selectOptions(screen.getByLabelText('Filtrar por tag'), 'viagem');
    expect(within(screen.getByRole('list', { name: 'Lista de transações' })).getAllByRole('listitem')).toHaveLength(1);
  }, 20000);
});

describe('importação com regras (critérios 10 e 11)', () => {
  const estado = construirEstado({
    contas: [conta],
    regras: [regra({ id: 'r1', padrao: 'mercado', tags: ['casa'] }), regra({ id: 'r2', padrao: 'padaria', categoriaId: 'cat-lazer', ativa: false })],
    transacoes: [trans({ id: 'h', descricao: 'Padaria', categoriaId: 'cat-saude' }), trans({ id: 'h2', descricao: 'Livraria', categoriaId: 'cat-educacao' })],
  });

  it('critério 10: regra antes do histórico; sem regra, histórico; sem histórico, "Outros"', () => {
    expect(sugerirCategoria(estado, 'Mercado Central', 'despesa')).toBe('cat-alimentacao');
    expect(sugerirCategoria(estado, 'Padaria', 'despesa')).toBe('cat-saude');
    expect(sugerirCategoria(estado, 'Livraria', 'despesa')).toBe('cat-educacao');
    expect(sugerirCategoria(estado, 'Loja nova', 'despesa')).toBe('cat-outros-despesa');
    expect(sugerirTags(estado, 'Mercado Central', 'despesa')).toEqual(['casa']);
    expect(sugerirTags(estado, 'Padaria', 'despesa')).toEqual([]);
  });

  it('critério 11: tags da regra são gravadas nas transações importadas', () => {
    const r = importarTransacoes(estado, 'a', [{ data: '2026-10-05', descricao: 'Mercado Central', valor: 5000, tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: ['casa'] }, { data: '2026-10-06', descricao: 'Loja', valor: 100, tipo: 'despesa', categoriaId: 'cat-outros-despesa', tags: [] }], mapa, '2026-10-10');
    if (!r.ok) throw new Error(r.erro);
    const novas = r.valor.estado.transacoes.slice(-2);
    expect(novas[0].tags).toEqual(['casa']);
    expect('tags' in novas[1]).toBe(false);
  });

  it('critérios 10 e 11 na tela: a prévia mostra categoria e tags, e o usuário ainda troca a categoria', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/importar', estado);
    const csv = 'Data;Descrição;Valor\n05/10/2026;Mercado Central;-50,00\n06/10/2026;Loja nova;-1,00\n';
    await usuario.upload(screen.getByLabelText('Arquivo CSV'), new File([csv], 'extrato.csv', { type: 'text/csv' }));
    await screen.findByTestId('contadores');
    expect(screen.getByLabelText('Categoria da linha 2')).toHaveValue('cat-alimentacao');
    expect(screen.getByTestId('tags-linha-2')).toHaveTextContent('Tags: casa');
    expect(screen.getByLabelText('Categoria da linha 3')).toHaveValue('cat-outros-despesa');
    expect(screen.queryByTestId('tags-linha-3')).not.toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText('Categoria da linha 2'), 'Lazer');
    await usuario.click(screen.getByRole('button', { name: 'Importar 2 transações' }));
    const importada = store.getSnapshot().estado.transacoes.find((t) => t.descricao === 'Mercado Central');
    expect(importada).toMatchObject({ categoriaId: 'cat-lazer', tags: ['casa'] });
    await usuario.click(screen.getByRole('button', { name: 'Desfazer importação' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(2);
  });
});

describe('tela Regras (critérios 4 a 7)', () => {
  it('critério 4: item no menu, estado vazio e criação com erros em role=alert', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/regras', construirEstado({ contas: [conta] }));
    expect(screen.getByRole('heading', { name: 'Regras' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Regras' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Nenhuma regra criada')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Criar a primeira regra' }));
    const form = screen.getByRole('form', { name: 'Nova regra' });
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar regra' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Informe o texto');
    await usuario.type(within(form).getByLabelText('Texto da descrição'), 'Mercado');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar regra' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Selecione uma categoria');
    await usuario.selectOptions(within(form).getByLabelText('Categoria de destino'), 'Alimentação');
    await usuario.type(within(form).getByLabelText('Tags da regra'), 'Casa');
    await usuario.click(within(form).getByRole('button', { name: 'Adicionar regra' }));
    expect(await screen.findByRole('list', { name: 'Lista de regras' })).toHaveTextContent('Se a descrição contém “Mercado”');
    expect(lerEstadoSalvo().regras).toMatchObject([{ padrao: 'Mercado', modo: 'contem', categoriaId: 'cat-alimentacao', tags: ['casa'], ativa: true }]);
  });

  const comRegras = () =>
    construirEstado({
      contas: [conta],
      regras: [regra({ id: 'r1', padrao: 'mercado', tags: ['casa'] }), regra({ id: 'r2', padrao: 'uber', categoriaId: 'cat-transporte' })],
      transacoes: [trans({ id: 't1' }), trans({ id: 't2', categoriaId: 'cat-lazer' })],
    });

  it('critério 5: reordenar, ativar/desativar e excluir, com persistência', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/regras', comRegras());
    expect(screen.getByRole('button', { name: 'Subir regra 1: mercado' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descer regra 2: uber' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Subir regra 2: uber' }));
    expect(lerEstadoSalvo().regras.map((r) => r.id)).toEqual(['r2', 'r1']);
    await usuario.click(screen.getByRole('button', { name: 'Desativar regra 1: uber' }));
    expect(store.getSnapshot().estado.regras[0].ativa).toBe(false);
    expect(screen.getByTestId('previa-regra-1')).toHaveTextContent('Regra inativa');
    await usuario.click(screen.getByRole('button', { name: 'Ativar regra 1: uber' }));
    await usuario.click(screen.getByRole('button', { name: 'Editar regra 2: mercado' }));
    await usuario.clear(screen.getByLabelText('Texto da descrição'));
    await usuario.type(screen.getByLabelText('Texto da descrição'), 'feira');
    await usuario.click(screen.getByRole('button', { name: 'Salvar regra' }));
    expect(store.getSnapshot().estado.regras[1].padrao).toBe('feira');
    await usuario.click(screen.getByRole('button', { name: 'Excluir regra 1: uber' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(lerEstadoSalvo().regras.map((r) => r.id)).toEqual(['r1']);
  });

  it('critérios 6 e 7: prévia por escopo e aplicação com confirmação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/regras', comRegras());
    expect(screen.getByTestId('previa-regra-1')).toHaveTextContent('Atingiria 1 transação existente.');
    await usuario.selectOptions(screen.getByLabelText('Escopo da pré-visualização e da aplicação'), 'Todas as categorias');
    expect(screen.getByTestId('previa-regra-1')).toHaveTextContent('Atingiria 2 transações existentes.');
    await usuario.selectOptions(screen.getByLabelText('Escopo da pré-visualização e da aplicação'), 'Somente em Outros');

    await usuario.click(screen.getByRole('button', { name: 'Aplicar às existentes: regra 1: mercado' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(store.getSnapshot().estado.transacoes[0].categoriaId).toBe('cat-outros-despesa');

    await usuario.click(screen.getByRole('button', { name: 'Aplicar às existentes: regra 1: mercado' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 transação atualizada'));
    expect(store.getSnapshot().estado.transacoes[0]).toMatchObject({ categoriaId: 'cat-alimentacao', tags: ['casa'] });
    expect(screen.getByTestId('previa-regra-1')).toHaveTextContent('Atingiria 0 transações existentes.');
  });
});
