import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  calcularConciliacao,
  fecharConciliacao,
  historicoConta,
  interpretarExtrato,
  marcarSugestoes,
  rascunhoDaConta,
  reabrirUltima,
  salvarRascunho,
  sugerirPares,
  transacaoBloqueada,
} from '../domain/conciliacao';
import { saldoConta } from '../domain/contas';
import { itensNavegacao } from '../navegacao';
import type { AppState, Conta, Transacao } from '../domain/types';
import { CHAVE_ESTADO, SCHEMA_ATUAL, carregar, estadoInicial } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const cc: Conta = { id: 'cc', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1 };
const cartao: Conta = { id: 'cartao', nome: 'Visa', tipo: 'cartao', saldoInicial: 0, arquivada: false, criadaEm: 2 };

const tx = (id: string, tipo: 'receita' | 'despesa', valor: number, data: string, descricao: string, extra: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'cc',
  categoriaId: tipo === 'receita' ? 'cat-salario' : 'cat-alimentacao',
  tipo,
  valor,
  data,
  descricao,
  criadaEm: Number(id.replace(/\D/g, '')) || 1,
  ...extra,
});

const t1 = tx('t1', 'receita', 300000, '2026-09-05', 'Salário');
const t2 = tx('t2', 'despesa', 15000, '2026-09-10', 'Mercado');
const t3 = tx('t3', 'despesa', 5000, '2026-09-20', 'Padaria');

function base(extra: Partial<AppState> = {}): AppState {
  return construirEstado({ contas: [cc, cartao], transacoes: [t1, t2, t3], ...extra });
}

/** Rascunho com extrato de 30/09 em R$ 3.850,00 e t1 e t2 marcadas: bate com o conciliado. */
function comRascunho(estado: AppState, parcial: Partial<{ data: string; saldoExtrato: number | null; marcadas: string[] }> = {}): AppState {
  const r = salvarRascunho(estado, 'cc', { data: '2026-09-30', saldoExtrato: 385000, marcadas: ['t1', 't2'], ...parcial });
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
}

const aplicar = (r: { ok: boolean } & Record<string, unknown>): AppState => {
  if (!r.ok) throw new Error(String(r.erro));
  return r.valor as AppState;
};

describe('critério 10: tela, validação, marcação e resumo', () => {
  it('sem contas conciliáveis mostra estado vazio com link para Contas', () => {
    renderizarApp('/conciliacao', construirEstado({ contas: [cartao] }));
    expect(screen.getByText('Nenhuma conta para conciliar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Contas' })).toHaveAttribute('href', '/contas');
  });

  it('lista só contas ativas que não são cartão', () => {
    renderizarApp('/conciliacao', base({ contas: [cc, cartao, { ...cc, id: 'velha', nome: 'Velha', arquivada: true }] }));
    const opcoes = within(screen.getByLabelText('Conta')).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Corrente']);
  });

  it('recusa data e saldo inválidos junto ao campo', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', base());
    await u.type(screen.getByLabelText('Saldo do extrato'), 'abc');
    expect(screen.getByText('Informe um valor válido, como 1.234,56.')).toBeInTheDocument();
    await u.clear(screen.getByLabelText('Saldo do extrato'));
    await u.type(screen.getByLabelText('Saldo do extrato'), '3850,00');
    await u.click(screen.getByRole('button', { name: 'Fechar com ajuste' }));
    expect(screen.getByText('Informe uma data válida para o extrato.')).toBeInTheDocument();
  });

  it('marcar transações recalcula conciliado, calculado, diferença e pendentes', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', base());
    fireEvent.change(screen.getByLabelText('Data do extrato'), { target: { value: '2026-09-30' } });
    await u.type(screen.getByLabelText('Saldo do extrato'), '3850,00');
    expect(screen.getByTestId('saldo-calculado')).toHaveTextContent('R$ 3.800,00');
    expect(screen.getByTestId('saldo-conciliado')).toHaveTextContent('R$ 1.000,00');
    expect(screen.getByTestId('pendentes')).toHaveTextContent('3');
    await u.click(screen.getByRole('checkbox', { name: 'Conciliar Salário' }));
    await u.click(screen.getByRole('checkbox', { name: 'Conciliar Mercado' }));
    expect(screen.getByTestId('saldo-conciliado')).toHaveTextContent('R$ 3.850,00');
    expect(screen.getByTestId('diferenca')).toHaveTextContent('R$ 0,00 (confere)');
    expect(screen.getByTestId('pendentes')).toHaveTextContent('1');
  });

  it('só lista transações até a data do extrato e persiste o rascunho ao recarregar', async () => {
    const u = userEvent.setup();
    const { unmount } = renderizarApp('/conciliacao', base());
    fireEvent.change(screen.getByLabelText('Data do extrato'), { target: { value: '2026-09-12' } });
    expect(screen.queryByRole('checkbox', { name: 'Conciliar Padaria' })).not.toBeInTheDocument();
    await u.click(screen.getByRole('checkbox', { name: 'Conciliar Salário' }));
    expect(lerEstadoSalvo().conciliacoes?.rascunhos.cc.marcadas).toEqual(['t1']);
    unmount();
    renderizarApp('/conciliacao');
    expect(screen.getByRole('checkbox', { name: 'Conciliar Salário' })).toBeChecked();
    expect(screen.getByLabelText('Data do extrato')).toHaveValue('2026-09-12');
  });
});

describe('critério 11: fechamento e ajuste', () => {
  it('só fecha com diferença zero', () => {
    const r = fecharConciliacao(comRascunho(base(), { saldoExtrato: 380000 }), 'cc');
    expect(r.ok).toBe(false);
    const ok = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    expect(historicoConta(ok, 'cc')).toHaveLength(1);
    expect(historicoConta(ok, 'cc')[0]).toMatchObject({ data: '2026-09-30', saldoExtrato: 385000, ajuste: 0, transacaoIds: ['t1', 't2'] });
    expect(rascunhoDaConta(ok, 'cc').marcadas).toEqual([]);
  });

  it('com ajuste cria transação em Outros, conciliada, e o saldo passa a bater com o extrato', () => {
    const e = aplicar(fecharConciliacao(comRascunho(base(), { saldoExtrato: 390000 }), 'cc', { ajustar: true }));
    const ajuste = e.transacoes.find((t) => t.descricao === 'Ajuste de conciliação')!;
    expect(ajuste).toMatchObject({ tipo: 'receita', valor: 5000, data: '2026-09-30', categoriaId: 'cat-outros-receita', contaId: 'cc' });
    expect(transacaoBloqueada(e, ajuste.id)).toBe(true);
    expect(historicoConta(e, 'cc')[0].ajuste).toBe(5000);
    const negativo = aplicar(fecharConciliacao(comRascunho(base(), { saldoExtrato: 380000 }), 'cc', { ajustar: true }));
    expect(negativo.transacoes.find((t) => t.descricao === 'Ajuste de conciliação')).toMatchObject({ tipo: 'despesa', valor: 5000, categoriaId: 'cat-outros-despesa' });
  });

  it('recusa data anterior à da última conciliação', () => {
    const e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    const r = fecharConciliacao(comRascunho(e, { data: '2026-09-15', marcadas: ['t3'], saldoExtrato: 380000 }), 'cc', { ajustar: true });
    expect(r).toMatchObject({ ok: false, campo: 'data' });
  });

  it('na tela o botão fecha só com diferença zero e o ajuste pede confirmação', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', comRascunho(base(), { saldoExtrato: 390000 }));
    expect(screen.getByRole('button', { name: 'Fechar conciliação' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'Fechar com ajuste' }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('receita de R$ 50,00 na categoria Outros');
    await u.click(within(dialogo).getByRole('button', { name: 'Confirmar ajuste' }));
    expect(lerEstadoSalvo().conciliacoes?.fechadas).toHaveLength(1);
    expect(saldoConta(lerEstadoSalvo(), 'cc')).toBe(385000 - 5000 + 5000);
    expect(screen.getByText(/Ajuste: R\$ 50,00/)).toBeInTheDocument();
  });

  it('com diferença zero fecha direto e o histórico mostra o resultado', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', comRascunho(base()));
    await u.click(screen.getByRole('button', { name: 'Fechar conciliação' }));
    const historico = screen.getByRole('list', { name: 'Histórico' });
    expect(historico).toHaveTextContent('30/09/2026');
    expect(historico).toHaveTextContent('Saldo do extrato: R$ 3.850,00');
    expect(historico).toHaveTextContent('2 transações');
    expect(historico).toHaveTextContent('Sem ajuste');
  });
});

describe('critério 12: histórico, bloqueio e reabertura', () => {
  it('transacaoBloqueada vale para as conciliadas e some ao reabrir', () => {
    const e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    expect(transacaoBloqueada(e, 't1')).toBe(true);
    expect(transacaoBloqueada(e, 't3')).toBe(false);
    expect(transacaoBloqueada(estadoInicial(), 'x')).toBe(false);
    const r = aplicar(reabrirUltima(e, 'cc'));
    expect(transacaoBloqueada(r, 't1')).toBe(false);
    expect(rascunhoDaConta(r, 'cc')).toEqual({ data: '2026-09-30', saldoExtrato: 385000, marcadas: ['t1', 't2'] });
  });

  it('reabrir apaga o ajuste e lista do mais recente ao mais antigo', () => {
    let e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    e = aplicar(fecharConciliacao(comRascunho(e, { data: '2026-10-05', saldoExtrato: 390000, marcadas: [] }), 'cc', { ajustar: true }));
    expect(historicoConta(e, 'cc').map((h) => h.data)).toEqual(['2026-10-05', '2026-09-30']);
    const r = aplicar(reabrirUltima(e, 'cc'));
    expect(r.transacoes.some((t) => t.descricao === 'Ajuste de conciliação')).toBe(false);
    expect(historicoConta(r, 'cc')).toHaveLength(1);
  });

  it('recusa reabrir sem histórico ou com rascunho marcado', () => {
    expect(reabrirUltima(base(), 'cc').ok).toBe(false);
    const e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    expect(reabrirUltima(comRascunho(e, { marcadas: ['t3'] }), 'cc').ok).toBe(false);
  });

  it('conciliadas deixam de ser elegíveis para nova conciliação', () => {
    const e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    const r = calcularConciliacao(e, 'cc', { data: '2026-10-31', saldoExtrato: 380000, marcadas: ['t1', 't3'] });
    expect(r.elegiveis.map((t) => t.id)).toEqual(['t3']);
    expect(r.saldoConciliado).toBe(385000 - 5000);
    expect(r.diferenca).toBe(0);
  });

  it('na tela reabrir pede confirmação e devolve as marcações', async () => {
    const u = userEvent.setup();
    const e = aplicar(fecharConciliacao(comRascunho(base()), 'cc'));
    renderizarApp('/conciliacao', e);
    await u.click(screen.getByRole('button', { name: 'Reabrir última conciliação' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reabrir' }));
    expect(lerEstadoSalvo().conciliacoes?.fechadas).toHaveLength(0);
    expect(screen.getByRole('checkbox', { name: 'Conciliar Salário' })).toBeChecked();
    expect(screen.getByText('Nenhuma conciliação fechada')).toBeInTheDocument();
  });
});

describe('critério 13: extrato colado e pares', () => {
  it('lê linhas válidas e aponta as inválidas com número e motivo', () => {
    const { linhas, erros } = interpretarExtrato('2026-09-05;Salário;3.000,00\n\n10/09/2026;Mercado;-150,00\nfoo;x;1\n2026-09-11;Teste\n2026-09-12;Zero;abc');
    expect(linhas.map((l) => [l.data, l.descricao, l.valor])).toEqual([
      ['2026-09-05', 'Salário', 300000],
      ['2026-09-10', 'Mercado', -15000],
    ]);
    expect(erros).toEqual([
      { linha: 4, motivo: 'Data inválida.' },
      { linha: 5, motivo: 'Use o formato data;descrição;valor.' },
      { linha: 6, motivo: 'Valor inválido.' },
    ]);
  });

  it('casa por valor com sinal e tolerância de dias, usando cada transação uma vez', () => {
    const a = tx('t4', 'despesa', 15000, '2026-09-11', 'Mercado B');
    const { linhas } = interpretarExtrato('2026-09-10;Mercado;-150,00\n2026-09-10;Outro mercado;-150,00\n2026-09-05;Entrada indevida;-3.000,00\n2026-09-05;Fora;99,99');
    const { pares, semPar } = sugerirPares(linhas, [t1, t2, a], 2);
    expect(pares.map((p) => [p.linha.linha, p.transacao.id, p.dias])).toEqual([
      [1, 't2', 0],
      [2, 't4', 1],
    ]);
    expect(semPar.map((l) => l.linha)).toEqual([3, 4]);
    expect(sugerirPares(linhas, [a], 0).pares).toHaveLength(0);
    expect(sugerirPares(linhas, [a], 1).pares).toHaveLength(1);
  });

  it('marcarSugestoes não duplica', () => {
    expect(marcarSugestoes({ data: '', saldoExtrato: null, marcadas: ['a'] }, ['a', 'b']).marcadas).toEqual(['a', 'b']);
  });

  it('na tela sugere, lista linhas sem par e inválidas, e aceitar marca as transações', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', comRascunho(base(), { marcadas: [], saldoExtrato: 385000 }));
    fireEvent.change(screen.getByLabelText('Uma linha por lançamento: data;descrição;valor'), {
      target: { value: '2026-09-06;Salário;3.000,00\n2026-09-10;Mercado;-150,00\n2026-09-25;Desconhecido;-77,00\nruim' },
    });
    await u.click(screen.getByRole('button', { name: 'Sugerir pares' }));
    expect(within(screen.getByRole('list', { name: 'Pares sugeridos' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'Linhas sem par' })).toHaveTextContent('Desconhecido');
    expect(screen.getByRole('list', { name: 'Linhas inválidas' })).toHaveTextContent('Linha 4');
    await u.click(screen.getByRole('button', { name: 'Aceitar sugestões' }));
    expect(screen.getByRole('checkbox', { name: 'Conciliar Salário' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Conciliar Mercado' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Conciliar Padaria' })).not.toBeChecked();
    expect(screen.getByTestId('diferenca')).toHaveTextContent('(confere)');
  });

  it('recusa tolerância inválida', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', base());
    await u.clear(screen.getByLabelText('Tolerância em dias'));
    await u.type(screen.getByLabelText('Tolerância em dias'), 'x');
    expect(screen.getByText('Use um número inteiro de 0 a 30.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sugerir pares' })).toBeDisabled();
  });
});

describe('critério 14: persistência, migração e navegação', () => {
  it('estado novo tem conciliacoes vazio e dados antigos sem a chave carregam sem alterar o resto', () => {
    expect(estadoInicial().conciliacoes).toEqual({ fechadas: [], rascunhos: {} });
    const antigo: Record<string, unknown> = { ...base(), schemaVersion: SCHEMA_ATUAL };
    delete antigo.conciliacoes;
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    if (carga.tipo === 'ok') {
      expect(carga.estado.conciliacoes).toEqual({ fechadas: [], rascunhos: {} });
      expect(carga.estado.transacoes).toEqual(base().transacoes);
      expect(carga.estado.contas).toEqual(base().contas);
    }
  });

  it('o item Conciliação está na navegação e a rota abre a tela', () => {
    expect(itensNavegacao).toContainEqual({ to: '/conciliacao', rotulo: 'Conciliação' });
    renderizarApp('/conciliacao', base());
    expect(screen.getByRole('heading', { level: 1, name: 'Conciliação' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Conciliação' }).length).toBeGreaterThan(0);
  });

  it('fechar persiste no armazenamento', async () => {
    const u = userEvent.setup();
    renderizarApp('/conciliacao', comRascunho(base()));
    await u.click(screen.getByRole('button', { name: 'Fechar conciliação' }));
    expect(lerEstadoSalvo().conciliacoes?.fechadas[0]).toMatchObject({ contaId: 'cc', transacaoIds: ['t1', 't2'] });
  });
});
