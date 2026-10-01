import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { excluirConta, saldoConta, saldoTotal } from '../domain/contas';
import { resumoMes } from '../domain/projecao';
import { totaisTransacoes } from '../domain/transacoes';
import {
  criarTransferencia,
  editarTransferencia,
  excluirTransferencia,
  filtrarTransferencias,
  totaisPorConta,
  validarPeriodo,
  type DadosTransferencia,
  type Transferencia,
} from '../domain/transferencias';
import type { AppState, Conta, Transacao } from '../domain/types';
import { CHAVE_ESTADO, carregar } from '../storage/storage';
import { itensNavegacao } from '../navegacao';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta = (id: string, nome: string, saldoInicial = 100000, parcial: Partial<Conta> = {}): Conta => ({
  id,
  nome,
  tipo: 'corrente',
  saldoInicial,
  arquivada: false,
  criadaEm: 1,
  ...parcial,
});

const A = conta('a', 'Corrente');
const B = conta('b', 'Poupança', 50000);
const C = conta('c', 'Carteira', 0);

const dados: DadosTransferencia = { contaOrigemId: 'a', contaDestinoId: 'b', valor: 25000, data: '2026-10-05', descricao: 'Reserva' };

const transf = (id: string, parcial: Partial<Transferencia> = {}): Transferencia => ({ id, criadaEm: 1, ...dados, ...parcial });

const despesa: Transacao = { id: 't1', contaId: 'a', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 1000, data: '2026-10-02', descricao: 'Cinema', criadaEm: 1 };

const base = (parcial: Partial<AppState> = {}): AppState => construirEstado({ contas: [A, B, C], ...parcial });

const criar = (estado: AppState, parcial: Partial<DadosTransferencia> = {}) => {
  const r = criarTransferencia(estado, { ...dados, ...parcial });
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('transferências: domínio', () => {
  it('critério 1: valida contas ativas distintas, valor, data e descrição, indicando o campo', () => {
    const tenta = (p: Partial<DadosTransferencia>, estado = base()) => criarTransferencia(estado, { ...dados, ...p });
    expect(tenta({ contaOrigemId: 'x' })).toMatchObject({ ok: false, campo: 'contaOrigemId' });
    expect(tenta({ contaDestinoId: 'x' })).toMatchObject({ ok: false, campo: 'contaDestinoId' });
    expect(tenta({ contaDestinoId: 'a' })).toMatchObject({ ok: false, campo: 'contaDestinoId' });
    const arquivada = base({ contas: [A, { ...B, arquivada: true }, C] });
    expect(tenta({}, arquivada)).toMatchObject({ ok: false, campo: 'contaDestinoId' });
    expect(tenta({ valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ valor: -5 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ valor: 10.5 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ data: '2026-02-30' })).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta({ descricao: 'x'.repeat(101) })).toMatchObject({ ok: false, campo: 'descricao' });
    const semDescricao = tenta({ descricao: '   ' });
    expect(semDescricao.ok && semDescricao.valor.transferencias![0].descricao).toBe('');
    expect(tenta({}).ok).toBe(true);
  });

  it('critério 2: debita a origem, credita o destino e mantém o saldo total', () => {
    const antes = base();
    const depois = criar(antes);
    expect(saldoConta(depois, 'a')).toBe(75000);
    expect(saldoConta(depois, 'b')).toBe(75000);
    expect(saldoConta(depois, 'c')).toBe(0);
    expect(saldoTotal(depois).total).toBe(saldoTotal(antes).total);
  });

  it('critério 3: não altera receitas e despesas dos resumos', () => {
    const antes = base({ transacoes: [despesa] });
    const depois = criar(antes);
    expect(depois.transacoes).toEqual(antes.transacoes);
    expect(totaisTransacoes(depois.transacoes)).toEqual(totaisTransacoes(antes.transacoes));
    expect(resumoMes(depois.transacoes, '2026-10')).toEqual(resumoMes(antes.transacoes, '2026-10'));
  });

  it('critério 4: ordena da mais recente para a mais antiga, desempatando pela criação', () => {
    const lista = [transf('1', { data: '2026-10-01' }), transf('2', { data: '2026-10-09' }), transf('3', { data: '2026-10-09', criadaEm: 5 })];
    expect(filtrarTransferencias(lista).map((t) => t.id)).toEqual(['3', '2', '1']);
  });

  it('critério 5: filtra por conta (origem ou destino) e por período inclusivo', () => {
    const lista = [
      transf('1', { data: '2026-09-30' }),
      transf('2', { data: '2026-10-01', contaOrigemId: 'b', contaDestinoId: 'c' }),
      transf('3', { data: '2026-10-31', contaOrigemId: 'c', contaDestinoId: 'a' }),
      transf('4', { data: '2026-11-01' }),
    ];
    const ids = (f: Parameters<typeof filtrarTransferencias>[1]) => filtrarTransferencias(lista, f).map((t) => t.id).sort();
    expect(ids({ contaId: 'c' })).toEqual(['2', '3']);
    expect(ids({ contaId: 'a' })).toEqual(['1', '3', '4']);
    expect(ids({ de: '2026-10-01', ate: '2026-10-31' })).toEqual(['2', '3']);
    expect(ids({ contaId: 'a', de: '2026-10-01', ate: '2026-10-31' })).toEqual(['3']);
    expect(validarPeriodo('2026-10-02', '2026-10-01')).toMatchObject({ ok: false, campo: 'ate' });
    expect(validarPeriodo('2026-10-01', '2026-10-01').ok).toBe(true);
    expect(validarPeriodo('2026-13-01', undefined)).toMatchObject({ ok: false, campo: 'de' });
  });

  it('critério 6: editar valida como criar e só aceita conta arquivada se ela já era usada', () => {
    const estado = criar(base());
    const id = estado.transferencias![0].id;
    const editada = editarTransferencia(estado, id, { ...dados, contaDestinoId: 'c', valor: 1000 });
    if (!editada.ok) throw new Error(editada.erro);
    expect(saldoConta(editada.valor, 'b')).toBe(50000);
    expect(saldoConta(editada.valor, 'c')).toBe(1000);
    expect(editarTransferencia(estado, id, { ...dados, valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(editarTransferencia(estado, 'nao-existe', dados).ok).toBe(false);

    const arquivando = { ...estado, contas: [A, { ...B, arquivada: true }, { ...C, arquivada: true }] };
    expect(editarTransferencia(arquivando, id, { ...dados, valor: 2000 }).ok).toBe(true);
    expect(editarTransferencia(arquivando, id, { ...dados, contaDestinoId: 'c' })).toMatchObject({ ok: false, campo: 'contaDestinoId' });
  });

  it('critério 7: excluir devolve os saldos ao que eram', () => {
    const antes = base();
    const depois = criar(antes);
    const sem = excluirTransferencia(depois, depois.transferencias![0].id);
    if (!sem.ok) throw new Error(sem.erro);
    expect(sem.valor.transferencias!).toEqual([]);
    expect(saldoConta(sem.valor, 'a')).toBe(saldoConta(antes, 'a'));
    expect(excluirTransferencia(depois, 'x').ok).toBe(false);
  });

  it('critério 8: conta com transferências (origem ou destino) não pode ser excluída', () => {
    const estado = criar(base());
    expect(excluirConta(estado, 'a').ok).toBe(false);
    expect(excluirConta(estado, 'b').ok).toBe(false);
    expect(excluirConta(estado, 'c').ok).toBe(true);
  });

  it('critério 9: soma enviado e recebido por conta em centavos exatos', () => {
    const totais = totaisPorConta([transf('1', { valor: 101 }), transf('2', { valor: 202, contaOrigemId: 'b', contaDestinoId: 'a' }), transf('3', { valor: 1 })]);
    expect(totais.find((t) => t.contaId === 'a')).toEqual({ contaId: 'a', enviado: 102, recebido: 202 });
    expect(totais.find((t) => t.contaId === 'b')).toEqual({ contaId: 'b', enviado: 202, recebido: 102 });
    expect(totais.find((t) => t.contaId === 'c')).toBeUndefined();
  });

  it('critério 11: a navegação principal aponta para /transferencias', () => {
    expect(itensNavegacao).toContainEqual({ to: '/transferencias', rotulo: 'Transferências' });
  });

  it('critério 12: dados salvos sem a chave carregam com lista vazia e nada mais muda', () => {
    const antigo = { schemaVersion: 2, contas: [A], categorias: [], transacoes: [despesa], orcamentos: [], metas: [], recorrencias: [], mapeamentosCsv: {}, importacoes: [], pagamentosFatura: [] };
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    if (carga.tipo !== 'ok') return;
    expect(carga.estado.transferencias!).toEqual([]);
    expect(carga.estado.contas).toEqual(antigo.contas);
    expect(carga.estado.transacoes).toEqual(antigo.transacoes);
  });
});

describe('transferências: tela', () => {
  it('critério 11: o link do menu leva à tela', async () => {
    renderizarApp('/transferencias');
    expect(screen.getByRole('heading', { level: 1, name: 'Transferências' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Transferências' })[0]).toHaveAttribute('href', '/transferencias');
  });

  it('critério 10: com menos de duas contas ativas mostra aviso com link para Contas', () => {
    renderizarApp('/transferencias', base({ contas: [A, { ...B, arquivada: true }] }));
    expect(screen.queryByRole('form', { name: 'Nova transferência' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Contas' })).toHaveAttribute('href', '/contas');
  });

  it('critérios 4 e 10: estado vazio, erro junto ao campo, dados mantidos e formulário limpo ao salvar', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transferencias', base());
    expect(screen.getByText('Nenhuma transferência registrada')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Valor'), 'abc');
    await usuario.click(screen.getByRole('button', { name: 'Registrar transferência' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valor válido');

    await usuario.clear(screen.getByLabelText('Valor'));
    await usuario.type(screen.getByLabelText('Valor'), '250,00');
    await usuario.selectOptions(screen.getByLabelText('Conta de destino'), 'Corrente');
    await usuario.selectOptions(screen.getByLabelText('Conta de origem'), 'Corrente');
    await usuario.click(screen.getByRole('button', { name: 'Registrar transferência' }));
    expect(screen.getByRole('alert')).toHaveTextContent('contas diferentes');
    expect(screen.getByLabelText('Valor')).toHaveValue('250,00');
    expect(store.getSnapshot().estado.transferencias!).toHaveLength(0);

    await usuario.selectOptions(screen.getByLabelText('Conta de destino'), 'Poupança');
    await usuario.type(screen.getByLabelText('Descrição (opcional)'), 'Reserva');
    await usuario.click(screen.getByRole('button', { name: 'Registrar transferência' }));
    expect(lerEstadoSalvo().transferencias![0]).toMatchObject({ contaOrigemId: 'a', contaDestinoId: 'b', valor: 25000, descricao: 'Reserva' });
    expect(screen.getByLabelText('Valor')).toHaveValue('');
    const historico = screen.getByRole('list', { name: 'Histórico de transferências' });
    expect(within(historico).getByText('R$ 250,00')).toBeInTheDocument();
    expect(within(historico).getByText(/Reserva/)).toBeInTheDocument();
  });

  it('critérios 5 e 9: filtra por conta e período, mostra totais e recusa período invertido', async () => {
    const usuario = userEvent.setup();
    const estado = base({
      transferencias: [
        transf('1', { data: '2026-09-10', valor: 1000, descricao: 'Antiga' }),
        transf('2', { data: '2026-10-10', valor: 2000, contaOrigemId: 'b', contaDestinoId: 'c', descricao: 'Saque' }),
      ],
    });
    renderizarApp('/transferencias', estado);
    const lista = () => screen.getByRole('list', { name: 'Histórico de transferências' });
    expect(within(lista()).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('totais-b')).toHaveTextContent('R$ 20,00R$ 10,00');

    await usuario.selectOptions(screen.getByLabelText('Conta'), 'Carteira');
    expect(within(lista()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista()).getByText(/Saque/)).toBeInTheDocument();
    expect(screen.queryByTestId('totais-a')).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText('De'), '2026-10-11');
    expect(screen.getByText('Nenhuma transferência encontrada com esses filtros.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(within(lista()).getAllByRole('listitem')).toHaveLength(2);

    await usuario.type(screen.getByLabelText('De'), '2026-10-20');
    await usuario.type(screen.getByLabelText('Até'), '2026-10-01');
    expect(screen.getByRole('alert')).toHaveTextContent('anterior ou igual');
    expect(within(lista()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('critério 6: edita pela tela, validando e refletindo no saldo', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transferencias', base({ transferencias: [transf('1')] }));
    await usuario.click(screen.getByRole('button', { name: /^Editar transferência/ }));
    const form = screen.getByRole('form', { name: 'Editar transferência' });
    expect(within(form).getByLabelText('Valor')).toHaveValue('250,00');
    await usuario.clear(within(form).getByLabelText('Valor'));
    await usuario.type(within(form).getByLabelText('Valor'), '0');
    await usuario.click(within(form).getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByRole('alert')).toHaveTextContent('maior que zero');
    await usuario.clear(within(form).getByLabelText('Valor'));
    await usuario.type(within(form).getByLabelText('Valor'), '30,00');
    await usuario.click(within(form).getByRole('button', { name: 'Salvar alterações' }));
    expect(store.getSnapshot().estado.transferencias![0].valor).toBe(3000);
    expect(saldoConta(store.getSnapshot().estado, 'a')).toBe(97000);
    expect(screen.getByRole('form', { name: 'Nova transferência' })).toBeInTheDocument();
  });

  it('critério 7: excluir pede confirmação; cancelar não muda nada e confirmar remove', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transferencias', base({ transferencias: [transf('1')] }));
    await usuario.click(screen.getByRole('button', { name: /^Excluir transferência/ }));
    let dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getSnapshot().estado.transferencias!).toHaveLength(1);

    await usuario.click(screen.getByRole('button', { name: /^Excluir transferência/ }));
    dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.transferencias!).toHaveLength(0);
    expect(screen.getByText('Nenhuma transferência registrada')).toBeInTheDocument();
  });
});
