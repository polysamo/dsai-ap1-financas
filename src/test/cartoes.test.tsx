import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  cicloFatura,
  criarCompraParcelada,
  dataDaParcela,
  dividirParcelas,
  excluirParcela,
  limiteCartao,
  mesFaturaAberta,
  registrarPagamento,
  resumoFatura,
  vencimentoFatura,
} from '../domain/cartoes';
import { criarConta, editarConta, excluirConta, saldoConta, saldoTotal } from '../domain/contas';
import { hojeISO } from '../domain/date';
import { resumoMes } from '../domain/projecao';
import { totaisTransacoes } from '../domain/transacoes';
import type { AppState, CartaoConfig, Conta, Transacao } from '../domain/types';
import { CHAVE_ESTADO, SCHEMA_ATUAL, carregar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const CFG: CartaoConfig = { diaFechamento: 20, diaVencimento: 27, limite: 500000 };

const corrente: Conta = { id: 'cc', nome: 'Corrente', tipo: 'corrente', saldoInicial: 1000000, arquivada: false, criadaEm: 1 };
const cartao: Conta = { id: 'cartao', nome: 'Visa', tipo: 'cartao', saldoInicial: 0, arquivada: false, criadaEm: 2, cartao: CFG };

const compra = (id: string, data: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'cartao',
  categoriaId: 'cat-lazer',
  tipo: 'despesa',
  valor,
  data,
  descricao: id,
  criadaEm: 1,
  ...parcial,
});

const base = (transacoes: Transacao[] = []): AppState => construirEstado({ contas: [corrente, cartao], transacoes });

describe('cartões: configuração (critérios 1, 13, 14)', () => {
  it('critério 1: valida dias de 1 a 28 e limite maior que zero, indicando o campo', () => {
    const tenta = (cartao: CartaoConfig) => criarConta(construirEstado(), { nome: 'X', tipo: 'cartao', saldoInicial: 0, cartao });
    expect(tenta({ ...CFG, diaFechamento: 0 })).toMatchObject({ ok: false, campo: 'diaFechamento' });
    expect(tenta({ ...CFG, diaFechamento: 29 })).toMatchObject({ ok: false, campo: 'diaFechamento' });
    expect(tenta({ ...CFG, diaVencimento: 1.5 })).toMatchObject({ ok: false, campo: 'diaVencimento' });
    expect(tenta({ ...CFG, limite: 0 })).toMatchObject({ ok: false, campo: 'limite' });
    expect(tenta({ ...CFG, limite: Number.NaN })).toMatchObject({ ok: false, campo: 'limite' });
    const ok = tenta(CFG);
    expect(ok.ok && ok.valor.contas[0].cartao).toEqual(CFG);
  });

  it('critério 1: contas de outro tipo não guardam o ciclo, e trocar o tipo o descarta', () => {
    const corr = criarConta(construirEstado(), { nome: 'Banco', tipo: 'corrente', saldoInicial: 0, cartao: CFG });
    expect(corr.ok && corr.valor.contas[0].cartao).toBeUndefined();
    const estado = base();
    const trocada = editarConta(estado, 'cartao', { nome: 'Visa', tipo: 'poupanca', saldoInicial: 0, cartao: CFG });
    expect(trocada.ok && trocada.valor.contas.find((c) => c.id === 'cartao')?.cartao).toBeUndefined();
    const semCiclo = criarConta(construirEstado(), { nome: 'Sem ciclo', tipo: 'cartao', saldoInicial: 0 });
    expect(semCiclo.ok && semCiclo.valor.contas[0].cartao).toBeUndefined();
  });

  it('critério 13: o esquema 1 migra para o 2 sem alterar contas nem transações', () => {
    const v1 = { schemaVersion: 1, contas: [corrente], categorias: [], transacoes: [compra('a', '2026-10-01', 100)], orcamentos: [], metas: [], recorrencias: [], mapeamentosCsv: {}, importacoes: [] };
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(v1));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    if (carga.tipo !== 'ok') return;
    expect(carga.estado.schemaVersion).toBe(SCHEMA_ATUAL);
    expect(carga.estado.pagamentosFatura).toEqual([]);
    expect(carga.estado.contas).toEqual(v1.contas);
    expect(carga.estado.transacoes).toEqual(v1.transacoes);
  });

  it('critério 14: conta de cartão (ou de origem) com pagamentos não pode ser excluída', () => {
    const r = registrarPagamento(base([compra('a', '2026-10-05', 10000)]), { contaCartaoId: 'cartao', mesFatura: '2026-10', valor: 5000, data: '2026-10-25', contaOrigemId: 'cc' }, '2026-10-25');
    if (!r.ok) throw new Error(r.erro);
    expect(excluirConta(r.valor, 'cartao').ok).toBe(false);
    expect(excluirConta(r.valor, 'cc').ok).toBe(false);
  });
});

describe('cartões: ciclo, vencimento e situação (critérios 3, 4, 5, 8)', () => {
  it('critério 3: a fatura reúne o ciclo do dia seguinte ao fechamento anterior até o fechamento, inclusive', () => {
    expect(cicloFatura(CFG, '2026-10')).toEqual({ inicio: '2026-09-21', fim: '2026-10-20' });
    expect(cicloFatura({ ...CFG, diaFechamento: 28 }, '2026-03')).toEqual({ inicio: '2026-03-01', fim: '2026-03-28' });
    expect(cicloFatura(CFG, '2026-01')).toEqual({ inicio: '2025-12-21', fim: '2026-01-20' });
  });

  it('critério 3 e 8: cada compra cai na fatura certa, inclusive nas bordas do fechamento', () => {
    const estado = base([
      compra('antes', '2026-09-20', 1000),
      compra('inicio', '2026-09-21', 2000),
      compra('meio', '2026-10-05', 3000),
      compra('fechamento', '2026-10-20', 4000),
      compra('depois', '2026-10-21', 5000),
      compra('outra-conta', '2026-10-05', 9999, { contaId: 'cc' }),
    ]);
    const out = resumoFatura(estado, cartao, '2026-10', '2026-10-01')!;
    expect(out.transacoes.map((t) => t.id).sort()).toEqual(['fechamento', 'inicio', 'meio']);
    expect(out.total).toBe(9000);
    expect(resumoFatura(estado, cartao, '2026-11', '2026-10-01')!.transacoes.map((t) => t.id)).toEqual(['depois']);
  });

  it('critério 3: estorno (receita) no cartão reduz o total da fatura', () => {
    const estado = base([compra('a', '2026-10-05', 5000), compra('estorno', '2026-10-06', 1500, { tipo: 'receita', categoriaId: 'cat-outros-receita' })]);
    expect(resumoFatura(estado, cartao, '2026-10', '2026-10-01')!.total).toBe(3500);
  });

  it('critério 4: vencimento no mesmo mês ou no seguinte, inclusive na virada do ano', () => {
    expect(vencimentoFatura(CFG, '2026-10')).toBe('2026-10-27');
    expect(vencimentoFatura({ diaFechamento: 25, diaVencimento: 5, limite: 1 }, '2026-10')).toBe('2026-11-05');
    expect(vencimentoFatura({ diaFechamento: 25, diaVencimento: 5, limite: 1 }, '2026-12')).toBe('2027-01-05');
    expect(vencimentoFatura({ diaFechamento: 10, diaVencimento: 10, limite: 1 }, '2026-12')).toBe('2027-01-10');
  });

  it('a fatura aberta é a do mês corrente até o fechamento e a do seguinte depois dele', () => {
    expect(mesFaturaAberta(CFG, '2026-10-20')).toBe('2026-10');
    expect(mesFaturaAberta(CFG, '2026-10-21')).toBe('2026-11');
    expect(mesFaturaAberta(CFG, '2026-12-25')).toBe('2027-01');
  });

  it('critério 5: aberta, fechada e paga', () => {
    const estado = base([compra('a', '2026-10-05', 10000)]);
    expect(resumoFatura(estado, cartao, '2026-10', '2026-10-20')!.situacao).toBe('aberta');
    expect(resumoFatura(estado, cartao, '2026-10', '2026-10-21')!.situacao).toBe('fechada');
    const paga = registrarPagamento(estado, { contaCartaoId: 'cartao', mesFatura: '2026-10', valor: 10000, data: '2026-10-25', contaOrigemId: 'cc' }, '2026-10-25');
    if (!paga.ok) throw new Error(paga.erro);
    expect(resumoFatura(paga.valor, cartao, '2026-10', '2026-10-26')!.situacao).toBe('paga');
    expect(resumoFatura(estado, { ...cartao, cartao: undefined }, '2026-10', '2026-10-26')).toBeNull();
  });
});

describe('cartões: parcelamento (critérios 6, 7, 9)', () => {
  const dados = { contaId: 'cartao', descricao: 'Notebook', valorTotal: 100000, parcelas: 3, data: '2026-10-31', categoriaId: 'cat-educacao' };

  it('critério 7: a divisão é exata em centavos, com o resto na primeira parcela', () => {
    expect(dividirParcelas(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(dividirParcelas(10, 4)).toEqual([4, 2, 2, 2]);
    expect(dividirParcelas(900, 3).reduce((a, b) => a + b, 0)).toBe(900);
  });

  it('critério 6: cria uma despesa por parcela, uma por mês, com o dia limitado ao fim do mês', () => {
    expect(dataDaParcela('2026-10-31', 1)).toBe('2026-11-30');
    expect(dataDaParcela('2026-12-31', 2)).toBe('2027-02-28');
    expect(dataDaParcela('2028-01-31', 1)).toBe('2028-02-29');
    const r = criarCompraParcelada(base(), dados);
    if (!r.ok) throw new Error(r.erro);
    const parcelas = r.valor.transacoes;
    expect(parcelas.map((t) => t.data)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
    expect(parcelas.map((t) => t.descricao)).toEqual(['Notebook (1/3)', 'Notebook (2/3)', 'Notebook (3/3)']);
    expect(parcelas.every((t) => t.tipo === 'despesa' && t.contaId === 'cartao' && t.categoriaId === 'cat-educacao')).toBe(true);
    expect(new Set(parcelas.map((t) => t.parcela?.grupoId)).size).toBe(1);
    expect(parcelas.reduce((s, t) => s + t.valor, 0)).toBe(100000);
  });

  it('critério 6: valida cartão, descrição, número de parcelas, valor, data e categoria', () => {
    const tenta = (parcial: Partial<typeof dados>) => criarCompraParcelada(base(), { ...dados, ...parcial });
    expect(tenta({ contaId: 'cc' })).toMatchObject({ ok: false, campo: 'contaId' });
    expect(tenta({ descricao: ' ' })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(tenta({ parcelas: 1 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(tenta({ parcelas: 49 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(tenta({ parcelas: 48, valorTotal: 47 })).toMatchObject({ ok: false, campo: 'valorTotal' });
    expect(tenta({ data: '2026-02-31' })).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta({ categoriaId: 'cat-salario' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(tenta({ parcelas: 48, valorTotal: 48 }).ok).toBe(true);
  });

  it('critério 6: descrições longas são cortadas para caber o sufixo', () => {
    const r = criarCompraParcelada(base(), { ...dados, descricao: 'x'.repeat(150) });
    expect(r.ok && r.valor.transacoes.every((t) => t.descricao.length <= 100 && t.descricao.endsWith('/3)'))).toBe(true);
  });

  it('critério 8: as parcelas aparecem em faturas sucessivas conforme o ciclo', () => {
    const r = criarCompraParcelada(base(), { ...dados, data: '2026-10-20', parcelas: 2, valorTotal: 20000 });
    if (!r.ok) throw new Error(r.erro);
    expect(resumoFatura(r.valor, cartao, '2026-10', '2026-10-01')!.total).toBe(10000);
    expect(resumoFatura(r.valor, cartao, '2026-11', '2026-10-01')!.total).toBe(10000);
    const tarde = criarCompraParcelada(base(), { ...dados, data: '2026-10-21', parcelas: 2, valorTotal: 20000 });
    if (!tarde.ok) throw new Error(tarde.erro);
    expect(resumoFatura(tarde.valor, cartao, '2026-10', '2026-10-01')!.total).toBe(0);
    expect(resumoFatura(tarde.valor, cartao, '2026-11', '2026-10-01')!.total).toBe(10000);
  });

  it('critério 9: exclui só uma parcela ou todas do grupo', () => {
    const r = criarCompraParcelada(base([compra('avulsa', '2026-10-01', 500)]), dados);
    if (!r.ok) throw new Error(r.erro);
    const parcela = r.valor.transacoes.find((t) => t.parcela?.numero === 2)!;
    const uma = excluirParcela(r.valor, parcela.id, 'uma');
    expect(uma.ok && uma.valor.transacoes).toHaveLength(3);
    const todas = excluirParcela(r.valor, parcela.id, 'todas');
    expect(todas.ok && todas.valor.transacoes.map((t) => t.id)).toEqual(['avulsa']);
    const avulsa = excluirParcela(r.valor, 'avulsa', 'todas');
    expect(avulsa.ok && avulsa.valor.transacoes).toHaveLength(3);
    expect(excluirParcela(r.valor, 'x', 'uma').ok).toBe(false);
  });
});

describe('cartões: pagamento e limite (critérios 10, 11, 12)', () => {
  const estado = base([compra('a', '2026-10-05', 30000)]);
  const pagar = (e: AppState, valor: number, parcial = {}) =>
    registrarPagamento(e, { contaCartaoId: 'cartao', mesFatura: '2026-10', valor, data: '2026-10-25', contaOrigemId: 'cc', ...parcial }, '2026-10-25');

  it('critério 10: o pagamento sobe o saldo do cartão e reduz o da origem, sem virar receita nem despesa', () => {
    expect(saldoConta(estado, 'cartao')).toBe(-30000);
    const r = pagar(estado, 30000);
    if (!r.ok) throw new Error(r.erro);
    expect(saldoConta(r.valor, 'cartao')).toBe(0);
    expect(saldoConta(r.valor, 'cc')).toBe(970000);
    expect(saldoTotal(r.valor).total).toBe(saldoTotal(estado).total);
    expect(resumoMes(r.valor.transacoes, '2026-10')).toEqual(resumoMes(estado.transacoes, '2026-10'));
    expect(totaisTransacoes(r.valor.transacoes)).toEqual(totaisTransacoes(estado.transacoes));
  });

  it('critério 10: exige valor positivo, data válida e origem ativa que não seja cartão', () => {
    expect(pagar(estado, 0)).toMatchObject({ ok: false, campo: 'valor' });
    expect(pagar(estado, 100, { data: '2026-13-01' })).toMatchObject({ ok: false, campo: 'data' });
    expect(pagar(estado, 100, { contaOrigemId: 'cartao' })).toMatchObject({ ok: false, campo: 'contaOrigemId' });
    expect(pagar(estado, 100, { contaOrigemId: 'nao-existe' })).toMatchObject({ ok: false, campo: 'contaOrigemId' });
    const arquivada = { ...estado, contas: estado.contas.map((c) => (c.id === 'cc' ? { ...c, arquivada: true } : c)) };
    expect(pagar(arquivada, 100)).toMatchObject({ ok: false, campo: 'contaOrigemId' });
  });

  it('critério 11: aceita pagamento parcial e recusa o que passa do restante', () => {
    const parcial = pagar(estado, 10000);
    if (!parcial.ok) throw new Error(parcial.erro);
    const resumo = resumoFatura(parcial.valor, cartao, '2026-10', '2026-10-25')!;
    expect(resumo).toMatchObject({ total: 30000, pago: 10000, restante: 20000 });
    expect(pagar(parcial.valor, 20001)).toMatchObject({ ok: false, campo: 'valor' });
    expect(pagar(parcial.valor, 20000).ok).toBe(true);
  });

  it('critério 12: limite usado, disponível e excedido', () => {
    expect(limiteCartao(estado, cartao)).toEqual({ usado: 30000, disponivel: 470000, excedido: false });
    const estourado = base([compra('a', '2026-10-05', 600000)]);
    expect(limiteCartao(estourado, cartao)).toEqual({ usado: 600000, disponivel: -100000, excedido: true });
    const credito = base([compra('a', '2026-10-05', 1000, { tipo: 'receita', categoriaId: 'cat-outros-receita' })]);
    expect(limiteCartao(credito, cartao)?.usado).toBe(0);
    expect(limiteCartao(estado, { ...cartao, cartao: undefined })).toBeNull();
  });
});

describe('cartões: tela', () => {
  const hoje = hojeISO();

  it('critério 2: sem cartão, mostra estado vazio com link para Contas', () => {
    renderizarApp('/cartoes');
    expect(screen.getByText('Nenhum cartão de crédito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar cartão de crédito' })).toBeInTheDocument();
  });

  it('critério 2: cartão sem ciclo pede configuração', () => {
    renderizarApp('/cartoes', construirEstado({ contas: [{ ...cartao, cartao: undefined }] }));
    expect(screen.getByText('Cartão sem ciclo configurado')).toBeInTheDocument();
  });

  it('critério 1: o formulário de conta pede o ciclo do cartão e mostra o erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/contas');
    await usuario.click(screen.getByRole('button', { name: 'Nova conta' }));
    expect(screen.queryByLabelText('Dia de fechamento')).not.toBeInTheDocument();
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Cartão de crédito');
    await usuario.type(screen.getByLabelText('Nome'), 'Visa');
    await usuario.type(screen.getByLabelText('Dia de fechamento'), '40');
    await usuario.type(screen.getByLabelText('Dia de vencimento'), '10');
    await usuario.type(screen.getByLabelText('Limite do cartão'), '2.000,00');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('1 a 28');
    await usuario.clear(screen.getByLabelText('Dia de fechamento'));
    await usuario.type(screen.getByLabelText('Dia de fechamento'), '20');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(lerEstadoSalvo().contas[0].cartao).toEqual({ diaFechamento: 20, diaVencimento: 10, limite: 200000 });
  });

  it('critérios 3, 5, 11 e 12: mostra a fatura, o limite e registra pagamento parcial pela tela', async () => {
    const usuario = userEvent.setup();
    const estado = base([compra('Mercado', hoje, 30000)]);
    const { store } = renderizarApp('/cartoes', estado);
    expect(screen.getByTestId('fatura-total')).toHaveTextContent('R$ 300,00');
    expect(screen.getByTestId('limite-usado')).toHaveTextContent('R$ 300,00');
    expect(screen.getByTestId('limite-disponivel')).toHaveTextContent('R$ 4.700,00');
    expect(screen.getByRole('progressbar', { name: 'Limite usado do cartão' })).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByTestId('situacao')).toHaveTextContent(/Aberta|Fechada/);
    const compras = screen.getByRole('list', { name: 'Compras da fatura' });
    expect(within(compras).getByText('Mercado')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Pagar fatura' }));
    const campo = screen.getByLabelText('Valor do pagamento');
    await usuario.clear(campo);
    await usuario.type(campo, '100,00');
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(store.getSnapshot().estado.pagamentosFatura[0]).toMatchObject({ valor: 10000, contaOrigemId: 'cc' });
    expect(screen.getByTestId('fatura-pago')).toHaveTextContent('R$ 100,00');
    expect(screen.getByTestId('fatura-restante')).toHaveTextContent('R$ 200,00');
    await usuario.click(screen.getByRole('button', { name: 'Pagar fatura' }));

    const campo2 = screen.getByLabelText('Valor do pagamento');
    await usuario.clear(campo2);
    await usuario.type(campo2, '999,00');
    await usuario.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('maior que o restante');
    await usuario.click(screen.getByRole('button', { name: /Excluir pagamento de/ }));
    expect(store.getSnapshot().estado.pagamentosFatura).toHaveLength(0);
  });

  it('critério 6: lança uma compra parcelada pela tela e mostra a prévia da divisão', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/cartoes', base());
    await usuario.click(screen.getByRole('button', { name: 'Compra parcelada' }));
    await usuario.type(screen.getByLabelText('Descrição da compra'), 'Geladeira');
    await usuario.type(screen.getByLabelText('Valor total'), '1.000,00');
    await usuario.type(screen.getByLabelText('Número de parcelas'), '3');
    expect(screen.getByTestId('previa-parcelas')).toHaveTextContent('1ª de R$ 333,34, demais de R$ 333,33');
    await usuario.selectOptions(screen.getByLabelText('Categoria da compra'), 'Educação');
    await usuario.click(screen.getByRole('button', { name: 'Lançar compra parcelada' }));
    const parcelas = store.getSnapshot().estado.transacoes;
    expect(parcelas.map((t) => t.valor)).toEqual([33334, 33333, 33333]);
    expect(screen.queryByLabelText('Descrição da compra')).not.toBeInTheDocument();
  });

  it('critério 9: excluir uma parcela pergunta se vale para só uma ou todas', async () => {
    const usuario = userEvent.setup();
    const criada = criarCompraParcelada(base(), { contaId: 'cartao', descricao: 'TV', valorTotal: 30000, parcelas: 3, data: hoje, categoriaId: 'cat-lazer' });
    if (!criada.ok) throw new Error(criada.erro);
    const { store } = renderizarApp('/transacoes?', { ...criada.valor, transacoes: criada.valor.transacoes });
    await usuario.click(screen.getByRole('button', { name: 'Excluir TV (1/3)' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('button', { name: 'Só esta parcela' })).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Todas as 3 parcelas' }));
    expect(store.getSnapshot().estado.transacoes).toHaveLength(0);
  });
});
