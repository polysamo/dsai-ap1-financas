import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { gerarExemplo } from '../data/exemplo';
import { saldoTotal } from '../domain/contas';
import { hojeISO, mesDe, nomeMes, somarMeses } from '../domain/date';
import { definirLimite } from '../domain/orcamento';
import {
  alternarRecorrencia,
  calcularProjecao,
  criarRecorrencia,
  despesasPorCategoria,
  editarRecorrencia,
  excluirRecorrencia,
  mesesBase,
  resumoMes,
  serieMensal,
} from '../domain/projecao';
import type { AppState, Conta, Transacao } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

const conta = (saldoInicial: number): Conta => ({ id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial, arquivada: false, criadaEm: 1 });

let seq = 0;
const t = (parcial: Partial<Transacao>): Transacao => {
  seq += 1;
  return { id: `t${seq}`, contaId: 'a', categoriaId: 'cat-moradia', tipo: 'despesa', valor: 100, data: '2026-09-10', descricao: 'x', criadaEm: seq, ...parcial };
};

/** Três meses (jul a set) com receitas de 5.000,00 e despesas de 4.000,00; saldo atual de 10.000,00. */
function cenarioBase(): AppState {
  const transacoes = ['2026-07', '2026-08', '2026-09'].flatMap((mes) => [
    t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 500000, data: `${mes}-05` }),
    t({ tipo: 'despesa', categoriaId: 'cat-moradia', valor: 400000, data: `${mes}-10` }),
  ]);
  return construirEstado({ contas: [conta(700000)], transacoes });
}

describe('projeção: domínio (critérios 7 a 11)', () => {
  it('critério 11: sem recorrências, o saldo cresce pela diferença das médias', () => {
    const estado = cenarioBase();
    expect(saldoTotal(estado).total).toBe(1000000);
    const p = calcularProjecao(estado, HOJE);
    if (p.tipo !== 'ok') throw new Error('esperava projeção');
    expect(p.mesesBase).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(p.mediaReceitas).toBe(500000);
    expect(p.mediaDespesas).toBe(400000);
    expect(p.efeitoMensal).toBe(100000);
    expect(p.meses.map((m) => m.mes)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
    expect(p.meses.map((m) => m.saldo)).toEqual([1100000, 1200000, 1300000, 1400000, 1500000, 1600000]);
  });

  it('critério 11: recorrência de despesa numa categoria sem histórico é somada às médias', () => {
    const r = criarRecorrencia(cenarioBase(), { descricao: 'Curso', tipo: 'despesa', valor: 50000, categoriaId: 'cat-educacao' });
    if (!r.ok) throw new Error(r.erro);
    const p = calcularProjecao(r.valor, HOJE);
    if (p.tipo !== 'ok') throw new Error('esperava projeção');
    expect(p.efeitoMensal).toBe(50000);
    expect(p.meses.slice(0, 2).map((m) => m.saldo)).toEqual([1050000, 1100000]);
  });

  it('critério 11: recorrência numa categoria com histórico tira esse histórico das médias', () => {
    const r = criarRecorrencia(cenarioBase(), { descricao: 'Aluguel', tipo: 'despesa', valor: 150000, categoriaId: 'cat-moradia' });
    if (!r.ok) throw new Error(r.erro);
    const p = calcularProjecao(r.valor, HOJE);
    if (p.tipo !== 'ok') throw new Error('esperava projeção');
    expect(p.mediaDespesas).toBe(0);
    expect(p.categoriasCobertas).toEqual(['cat-moradia']);
    expect(p.efeitoMensal).toBe(500000 - 150000);
  });

  it('critério 11: recorrência de receita não tira o histórico de despesas da mesma categoria', () => {
    const r = criarRecorrencia(cenarioBase(), { descricao: 'Freela', tipo: 'receita', valor: 20000, categoriaId: 'cat-moradia' });
    expect(r.ok).toBe(false);
    const ok = criarRecorrencia(cenarioBase(), { descricao: 'Bônus', tipo: 'receita', valor: 20000, categoriaId: 'cat-rendimentos' });
    if (!ok.ok) throw new Error(ok.erro);
    const p = calcularProjecao(ok.valor, HOJE);
    expect(p.tipo === 'ok' && p.mediaDespesas).toBe(400000);
  });

  it('critério 9: com menos de 3 meses completos usa os disponíveis; sem nenhum, explica', () => {
    const umMes = construirEstado({
      contas: [conta(0)],
      transacoes: [t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 300000, data: '2026-09-05' }), t({ valor: 100000, data: '2026-09-20' })],
    });
    expect(mesesBase(umMes.transacoes, HOJE)).toEqual(['2026-09']);
    const p = calcularProjecao(umMes, HOJE);
    expect(p.tipo === 'ok' && p.mesesBase).toEqual(['2026-09']);
    expect(p.tipo === 'ok' && p.efeitoMensal).toBe(200000);

    const soMesAtual = construirEstado({ contas: [conta(0)], transacoes: [t({ data: '2026-10-02' })] });
    expect(calcularProjecao(soMesAtual, HOJE)).toEqual({ tipo: 'sem-dados' });
    expect(calcularProjecao(construirEstado(), HOJE)).toEqual({ tipo: 'sem-dados' });
  });

  it('critério 9: só com recorrências, projeta apenas com elas', () => {
    const r = criarRecorrencia(construirEstado({ contas: [conta(100000)] }), { descricao: 'Salário', tipo: 'receita', valor: 300000, categoriaId: 'cat-salario' });
    if (!r.ok) throw new Error(r.erro);
    const p = calcularProjecao(r.valor, HOJE);
    expect(p.tipo === 'ok' && p.mesesBase).toEqual([]);
    expect(p.tipo === 'ok' && p.meses[0].saldo).toBe(400000);
  });

  it('critério 7: valida, edita, desativa e exclui recorrências', () => {
    const base = construirEstado();
    expect(criarRecorrencia(base, { descricao: ' ', tipo: 'despesa', valor: 100, categoriaId: 'cat-moradia' })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(criarRecorrencia(base, { descricao: 'A', tipo: 'despesa', valor: 0, categoriaId: 'cat-moradia' })).toMatchObject({ ok: false, campo: 'valor' });
    expect(criarRecorrencia(base, { descricao: 'A', tipo: 'despesa', valor: 100, categoriaId: 'cat-salario' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    const criada = criarRecorrencia(base, { descricao: 'A', tipo: 'despesa', valor: 100, categoriaId: 'cat-moradia' });
    if (!criada.ok) throw new Error(criada.erro);
    const id = criada.valor.recorrencias[0].id;
    const editada = editarRecorrencia(criada.valor, id, { descricao: 'B', tipo: 'despesa', valor: 200, categoriaId: 'cat-lazer' });
    expect(editada.ok && editada.valor.recorrencias[0]).toMatchObject({ descricao: 'B', valor: 200, categoriaId: 'cat-lazer', ativa: true });
    const desativada = alternarRecorrencia(criada.valor, id, false);
    expect(desativada.ok && desativada.valor.recorrencias[0].ativa).toBe(false);
    expect(calcularProjecao(desativada.ok ? desativada.valor : base, HOJE)).toEqual({ tipo: 'sem-dados' });
    const excluida = excluirRecorrencia(criada.valor, id);
    expect(excluida.ok && excluida.valor.recorrencias).toHaveLength(0);
  });

  it('critério 10: destaca o primeiro mês com saldo negativo', () => {
    const estado = construirEstado({
      contas: [conta(100000)],
      transacoes: [t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 100000, data: '2026-08-05' }), t({ valor: 300000, data: '2026-08-10' })],
    });
    const p = calcularProjecao(estado, HOJE);
    if (p.tipo !== 'ok') throw new Error('esperava projeção');
    expect(p.saldoAtual).toBe(-100000);
    expect(p.primeiroNegativo).toBe('2026-11');
    expect(calcularProjecao(cenarioBase(), HOJE).tipo === 'ok' && (calcularProjecao(cenarioBase(), HOJE) as { primeiroNegativo: string | null }).primeiroNegativo).toBeNull();
  });
});

describe('dashboard: agregações (critérios 1, 3, 4, 12)', () => {
  const estado = construirEstado({
    contas: [conta(0)],
    transacoes: [
      t({ tipo: 'receita', categoriaId: 'cat-salario', valor: 500000, data: '2026-10-05' }),
      t({ categoriaId: 'cat-moradia', valor: 150000, data: '2026-10-06' }),
      t({ categoriaId: 'cat-alimentacao', valor: 90000, data: '2026-10-07' }),
      t({ categoriaId: 'cat-transporte', valor: 80000, data: '2026-10-08' }),
      t({ categoriaId: 'cat-saude', valor: 70000, data: '2026-10-09' }),
      t({ categoriaId: 'cat-lazer', valor: 60000, data: '2026-10-10' }),
      t({ categoriaId: 'cat-educacao', valor: 5000, data: '2026-10-11' }),
      t({ categoriaId: 'cat-outros-despesa', valor: 2500, data: '2026-10-12' }),
      t({ categoriaId: 'cat-lazer', valor: 99999, data: '2026-09-30' }),
    ],
  });

  it('critério 1: resumo do mês', () => {
    expect(resumoMes(estado.transacoes, '2026-10')).toEqual({ receitas: 500000, despesas: 457500, resultado: 42500 });
    expect(resumoMes(estado.transacoes, '2026-09').despesas).toBe(99999);
  });

  it('critério 3: top 5 em ordem decrescente, o resto em "Outras", e a soma bate com o total', () => {
    const fatias = despesasPorCategoria(estado, '2026-10');
    expect(fatias.map((f) => f.nome)).toEqual(['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Outras']);
    expect(fatias[5].valor).toBe(7500);
    expect(fatias.reduce((s, f) => s + f.valor, 0)).toBe(resumoMes(estado.transacoes, '2026-10').despesas);
    expect(despesasPorCategoria(estado, '2026-01')).toEqual([]);
  });

  it('critério 4: série de 6 meses terminando no mês escolhido, atravessando o ano', () => {
    const serie = serieMensal(estado.transacoes, '2026-10');
    expect(serie.map((p) => p.mes)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(serie[5]).toEqual({ mes: '2026-10', receitas: 500000, despesas: 457500 });
    expect(serie[4].despesas).toBe(99999);
    expect(serieMensal([], '2026-02').map((p) => p.mes)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('critério 12: calcula as agregações e a projeção de 5.000 transações em menos de 500 ms', () => {
    const muitas = Array.from({ length: 5000 }, (_, i) => t({ data: `2026-${String((i % 9) + 1).padStart(2, '0')}-10`, valor: 100 + i, tipo: i % 5 === 0 ? 'receita' : 'despesa', categoriaId: i % 5 === 0 ? 'cat-salario' : 'cat-moradia' }));
    const grande = construirEstado({ contas: [conta(0)], transacoes: muitas });
    const inicio = performance.now();
    resumoMes(grande.transacoes, '2026-09');
    despesasPorCategoria(grande, '2026-09');
    serieMensal(grande.transacoes, '2026-09');
    calcularProjecao(grande, HOJE);
    saldoTotal(grande);
    expect(performance.now() - inicio).toBeLessThan(500);
  });
});

describe('dashboard: tela', () => {
  const hoje = hojeISO();
  const mes = mesDe(hoje);

  /** Garante despesa de Moradia no mês corrente, independentemente do dia em que o teste roda. */
  const comGastoHoje = (estado: AppState): AppState => ({
    ...estado,
    transacoes: [...estado.transacoes, t({ contaId: estado.contas[0].id, categoriaId: 'cat-moradia', valor: 5000, data: hoje })],
  });

  it('critério 12: em estado vazio mostra chamadas para criar conta e transação, sem erros no console', () => {
    renderizarApp('/');
    expect(screen.getByText('Bem-vindo! Comece criando uma conta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/contas');
    expect(screen.getByRole('link', { name: 'Registrar transação' })).toHaveAttribute('href', '/transacoes');
    expect(screen.getByTestId('projecao-vazia')).toBeInTheDocument();
  });

  it('critérios 1 e 2: os cartões conferem com os dados e o seletor troca o mês', async () => {
    const usuario = userEvent.setup();
    const exemplo = gerarExemplo(hoje);
    renderizarApp('/', exemplo);
    const r = resumoMes(exemplo.transacoes, mes);
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100).replace(/ /g, ' ');
    expect(screen.getByTestId('receitas')).toHaveTextContent(fmt(r.receitas));
    expect(screen.getByTestId('despesas')).toHaveTextContent(fmt(r.despesas));
    expect(screen.getByTestId('resultado')).toHaveTextContent(fmt(r.resultado));
    expect(screen.getByTestId('saldo-total')).toHaveTextContent(fmt(saldoTotal(exemplo).total));

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    const anterior = somarMeses(mes, -1);
    expect(screen.getByText(nomeMes(anterior))).toBeInTheDocument();
    expect(screen.getByTestId('despesas')).toHaveTextContent(fmt(resumoMes(exemplo.transacoes, anterior).despesas));
    expect(screen.getByTestId('saldo-total')).toHaveTextContent(fmt(saldoTotal(exemplo).total));
  });

  it('critérios 3 e 4: os gráficos têm descrição e uma tabela alternativa com os mesmos valores', () => {
    const exemplo = comGastoHoje(gerarExemplo(hoje));
    renderizarApp('/', exemplo);
    expect(screen.getByRole('img', { name: /despesas por categoria/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /receitas e despesas dos últimos 6 meses/i })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Receitas e despesas por mês', hidden: true });
    expect(within(tabela).getAllByRole('row', { hidden: true })).toHaveLength(7);
    const categorias = screen.getByRole('table', { name: 'Despesas por categoria', hidden: true });
    expect(within(categorias).getByRole('row', { name: /Total/, hidden: true })).toHaveTextContent(/R\$/);
  });

  it('critério 5: destaca categorias estouradas e em atenção; sem limites, convida a defini-los', () => {
    const exemplo = comGastoHoje(gerarExemplo(hoje));
    const semLimites: AppState = { ...exemplo, orcamentos: [] };
    const { unmount } = renderizarApp('/', semLimites);
    expect(screen.getByText(/Nenhum limite definido/)).toBeInTheDocument();
    unmount();
    const r = definirLimite(exemplo, 'cat-moradia', mes, 1000);
    if (!r.ok) throw new Error(r.erro);
    renderizarApp('/', r.valor);
    const lista = screen.getByRole('list', { name: 'Categorias em alerta' });
    expect(within(lista).getByText('Moradia')).toBeInTheDocument();
    expect(within(lista).getByText(/Estourado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir orçamento' })).toHaveAttribute('href', `/orcamento?mes=${mes}`);
  });

  it('critério 6: lista só metas ativas', () => {
    const exemplo = gerarExemplo(hoje);
    const arquivada = { ...exemplo, metas: exemplo.metas.map((m, i) => (i === 0 ? { ...m, status: 'arquivada' as const } : m)) };
    renderizarApp('/', arquivada);
    const lista = screen.getByRole('list', { name: 'Metas ativas' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText('Viagem de férias')).toBeInTheDocument();
    expect(within(lista).queryByText('Reserva de emergência')).not.toBeInTheDocument();
  });

  it('critérios 7 e 8: cria, desativa e exclui recorrência pela tela; a projeção mostra 6 meses e as médias', async () => {
    const usuario = userEvent.setup();
    const exemplo = { ...gerarExemplo(hoje), recorrencias: [] };
    const { store } = renderizarApp('/', exemplo);
    expect(screen.getAllByTestId(/^projecao-\d{4}-\d{2}$/)).toHaveLength(6);
    const antes = screen.getByTestId('efeito-mensal').textContent;

    await usuario.type(screen.getByLabelText('Descrição da recorrência'), 'Curso');
    await usuario.selectOptions(screen.getByLabelText('Categoria da recorrência'), 'Educação');
    await usuario.type(screen.getByLabelText('Valor mensal'), '500,00');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar recorrência' }));
    expect(lerEstadoSalvo().recorrencias[0]).toMatchObject({ descricao: 'Curso', valor: 50000, ativa: true });
    expect(screen.getByTestId('efeito-mensal').textContent).not.toBe(antes);
    expect(screen.getByTestId('recorrencias-liquido')).toHaveTextContent('-R$ 500,00');

    await usuario.click(screen.getByLabelText('Recorrência Curso ativa'));
    expect(screen.getByTestId('efeito-mensal').textContent).toBe(antes);
    await usuario.click(screen.getByRole('button', { name: 'Excluir recorrência Curso' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(store.getSnapshot().estado.recorrencias).toHaveLength(0);
  });

  it('critério 7: valor inválido mostra erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/', gerarExemplo(hoje));
    await usuario.type(screen.getByLabelText('Descrição da recorrência'), 'X');
    await usuario.selectOptions(screen.getByLabelText('Categoria da recorrência'), 'Lazer');
    await usuario.type(screen.getByLabelText('Valor mensal'), '0');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar recorrência' }));
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent?.includes('maior que zero'))).toBe(true);
  });

  it('critério 10: avisa em texto quando o saldo projetado fica negativo', () => {
    const estado = construirEstado({
      contas: [conta(0)],
      transacoes: [t({ valor: 100000, data: `${somarMeses(mes, -1)}-10` })],
    });
    renderizarApp('/', estado);
    expect(screen.getByTestId('aviso-negativo')).toHaveTextContent('fica negativo a partir de');
    expect(screen.getByText(/não uma garantia/)).toBeInTheDocument();
  });
});
