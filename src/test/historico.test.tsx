import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarConta, excluirConta } from '../domain/contas';
import { descreverMudanca, desfazer, historicoVazio, refazer, registrar } from '../domain/historico';
import { criarTransacao } from '../domain/transacoes';
import { falha, ok, type AppState, type Conta, type Transacao } from '../domain/types';
import { atalhos } from '../lib/atalhos';
import { Store } from '../state/store';
import { DURACAO_AVISO_MS } from '../components/historico/ControlesHistorico';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta = (id: string, nome = id): Conta => ({ id, nome, tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 });
const transacao = (id: string): Transacao => ({ id, contaId: 'a', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 100, data: '2026-10-01', descricao: id, criadaEm: 1 });

const novaConta = (nome: string) => (s: AppState) => criarConta(s, { nome, tipo: 'corrente', saldoInicial: 0 });

function storeCom(estado?: AppState) {
  if (estado) localStorage.setItem('financas:estado', JSON.stringify(estado));
  return new Store(localStorage);
}

afterEach(() => vi.useRealTimers());

describe('histórico: descrição da mudança', () => {
  const base = construirEstado({ contas: [conta('a')], transacoes: [transacao('t1'), transacao('t2'), transacao('t3')] });

  it('critério 7: nomeia o item e a ação com concordância e plural', () => {
    expect(descreverMudanca(base, { ...base, transacoes: [...base.transacoes, transacao('t4')] })).toBe('transação criada');
    expect(descreverMudanca(base, { ...base, contas: [] })).toBe('conta excluída');
    expect(descreverMudanca(base, { ...base, transacoes: [] })).toBe('3 transações excluídas');
    const meta = { id: 'm', nome: 'Viagem', valorAlvo: 100, aportes: [], status: 'ativa' as const, criadaEm: 1 };
    const comMeta = { ...base, metas: [meta] };
    expect(descreverMudanca(comMeta, { ...comMeta, metas: [{ ...meta, nome: 'Carro' }] })).toBe('meta editada');
    expect(descreverMudanca(base, { ...base, investimentos: [{ id: 'x', nome: 'CDB', classe: 'renda-fixa', movimentos: [], marcacoes: [], criadoEm: 1 }] })).toBe('ativo criado');
  });

  it('critério 7: várias coleções viram "N alterações" e nenhuma diferença vira "alteração"', () => {
    expect(descreverMudanca(base, { ...base, contas: [], transacoes: [] })).toBe('2 alterações');
    expect(descreverMudanca(base, { ...base })).toBe('alteração');
    expect(descreverMudanca(base, { ...base, transacoes: [...base.transacoes] })).toBe('alteração');
  });

  it('critério 8: listas sem id e objetos contam como uma alteração da coleção', () => {
    expect(descreverMudanca(base, { ...base, orcamentos: [{ categoriaId: 'cat-lazer', mes: '2026-10', limite: 500 }] })).toBe('orçamentos alterados');
    expect(descreverMudanca(base, { ...base, conciliacoes: { fechadas: [], rascunhos: { a: {} as never } } })).toBe('configuração alterada');
  });
});

describe('histórico: pilhas puras', () => {
  const a = construirEstado();
  const b = { ...a, contas: [conta('x')] };
  const c = { ...b, contas: [] };

  it('critério 1 e 2: desfaz, refaz e uma nova operação limpa o futuro', () => {
    let h = registrar(historicoVazio(), a, b);
    h = registrar(h, b, c);
    const volta = desfazer(h, c)!;
    expect(volta.estado).toBe(b);
    expect(volta.descricao).toBe('conta excluída');
    const avanca = refazer(volta.historico, b)!;
    expect(avanca.estado).toBe(c);
    expect(registrar(volta.historico, b, a).futuro).toHaveLength(0);
    expect(desfazer(historicoVazio(), a)).toBeNull();
    expect(refazer(historicoVazio(), a)).toBeNull();
  });

  it('critério 3 e 4: estado idêntico não registra e o limite descarta o mais antigo', () => {
    expect(registrar(historicoVazio(), a, a)).toEqual(historicoVazio());
    let h = historicoVazio();
    let atual = a;
    for (let i = 0; i < 51; i++) {
      const prox = { ...atual, contas: [...atual.contas, conta(`c${i}`)] };
      h = registrar(h, atual, prox);
      atual = prox;
    }
    expect(h.passado).toHaveLength(50);
    expect(h.passado[0].estado.contas).toHaveLength(1);
  });
});

describe('histórico: Store', () => {
  it('critério 1: desfazer e refazer gravam no localStorage', () => {
    const store = storeCom();
    store.aplicar(novaConta('Banco'));
    expect(lerEstadoSalvo().contas).toHaveLength(1);
    expect(store.desfazer()).toEqual(ok('conta criada'));
    expect(lerEstadoSalvo().contas).toHaveLength(0);
    expect(store.refazer()).toEqual(ok('conta criada'));
    expect(lerEstadoSalvo().contas[0].nome).toBe('Banco');
  });

  it('critério 3: operação que falha ou devolve o mesmo estado não entra no histórico', () => {
    const store = storeCom();
    store.aplicar(() => falha('não'));
    store.aplicar((s) => ok(s));
    expect(store.getSnapshot().historico.passado).toHaveLength(0);
    expect(store.desfazer()).toMatchObject({ ok: false, erro: 'Nada para desfazer.' });
  });

  it('critério 5: substituir, iniciarVazio e apagarTudo limpam as pilhas', () => {
    const store = storeCom();
    store.aplicar(novaConta('A'));
    store.aplicar(novaConta('B'));
    store.desfazer();
    store.substituir(construirEstado());
    expect(store.getSnapshot().historico).toEqual(historicoVazio());
    store.aplicar(novaConta('C'));
    store.iniciarVazio();
    expect(store.getSnapshot().historico.passado).toHaveLength(0);
    store.aplicar(novaConta('D'));
    store.apagarTudo();
    expect(store.getSnapshot().historico.passado).toHaveLength(0);
  });

  it('critério 6: falha de gravação ao desfazer mantém estado e pilhas', () => {
    const store = storeCom(construirEstado({ contas: [conta('a')] }));
    store.aplicar((s) => excluirConta(s, 'a'));
    const antes = store.getSnapshot();
    const espiao = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    const r = store.desfazer();
    espiao.mockRestore();
    expect(r.ok).toBe(false);
    expect(store.getSnapshot()).toBe(antes);
  });

  it('uma transação criada pelo domínio é descrita corretamente', () => {
    const store = storeCom(construirEstado({ contas: [conta('a')] }));
    store.aplicar((s) => criarTransacao(s, { contaId: 'a', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 500, data: '2026-10-01', descricao: 'Cinema' }));
    expect(store.desfazer()).toEqual(ok('transação criada'));
  });
});

describe('histórico: interface', () => {
  it('critério 9: botões no topo desabilitados sem histórico e com a próxima ação no title', () => {
    const { store } = renderizarApp('/', construirEstado());
    const desfazerBtn = screen.getByRole('button', { name: 'Desfazer' });
    const refazerBtn = screen.getByRole('button', { name: 'Refazer' });
    expect(desfazerBtn).toBeDisabled();
    expect(refazerBtn).toBeDisabled();
    act(() => {
      store.aplicar(novaConta('Banco'));
    });
    expect(desfazerBtn).toBeEnabled();
    expect(desfazerBtn).toHaveAttribute('title', 'Desfazer: conta criada (Ctrl+Z)');
  });

  it('critério 10 e 11: atalhos de teclado, inclusive Meta, e aviso que some em 5 segundos', () => {
    vi.useFakeTimers();
    const { store } = renderizarApp('/', construirEstado());
    act(() => {
      store.aplicar(novaConta('Banco'));
    });
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(store.getSnapshot().estado.contas).toHaveLength(0);
    expect(screen.getByText('Desfeito: conta criada')).toHaveAttribute('role', 'status');
    fireEvent.keyDown(document, { key: 'Z', metaKey: true, shiftKey: true });
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
    expect(screen.getByText('Refeito: conta criada')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true });
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(DURACAO_AVISO_MS);
    });
    expect(screen.queryByText(/Refeito:/)).not.toBeInTheDocument();
  });

  it('critério 10: Ctrl+Z dentro de um campo não desfaz', async () => {
    const { store } = renderizarApp('/transacoes', construirEstado({ contas: [conta('a')] }));
    act(() => {
      store.aplicar(novaConta('Outra'));
    });
    const campo = screen.getAllByRole('textbox')[0];
    fireEvent.keyDown(campo, { key: 'z', ctrlKey: true });
    expect(store.getSnapshot().estado.contas).toHaveLength(2);
  });

  it('critério 11: o botão Desfazer também mostra o aviso', async () => {
    const { store } = renderizarApp('/', construirEstado({ contas: [conta('a')] }));
    act(() => {
      store.aplicar((s) => excluirConta(s, 'a'));
    });
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(screen.getByText('Desfeito: conta excluída')).toHaveAttribute('role', 'status');
    expect(store.getSnapshot().estado.contas).toHaveLength(1);
  });

  it('critério 12: a ajuda lista os atalhos de desfazer e refazer', () => {
    expect(atalhos.map((a) => a.teclas)).toEqual(expect.arrayContaining(['Ctrl+Z', 'Ctrl+Shift+Z']));
    renderizarApp('/ajuda', construirEstado());
    expect(screen.getAllByText('Desfazer a última alteração').length).toBeGreaterThan(0);
  });
});
