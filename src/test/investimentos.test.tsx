import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO, somarMeses } from '../domain/date';
import {
  alocacaoPorClasse,
  criarAtivo,
  desempenhoAtivo,
  desempenhoCarteira,
  evolucaoPatrimonio,
  excluirAtivo,
  excluirMarcacao,
  excluirMovimento,
  registrarMarcacao,
  registrarMovimento,
  valorEm,
} from '../domain/investimentos';
import { resumoMes } from '../domain/projecao';
import { saldoConta } from '../domain/contas';
import type { AppState, Ativo, ClasseAtivo, Conta } from '../domain/types';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { itensNavegacao } from '../navegacao';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-04-15';

const ativo = (id: string, classe: ClasseAtivo, parcial: Partial<Ativo> = {}): Ativo => ({
  id,
  nome: id,
  classe,
  movimentos: [],
  marcacoes: [],
  criadoEm: 1,
  ...parcial,
});
const aporte = (id: string, data: string, valor: number) => ({ id, tipo: 'aporte' as const, data, valor });
const resgate = (id: string, data: string, valor: number) => ({ id, tipo: 'resgate' as const, data, valor });

/** 1.000 em 10/01, 500 em 10/03 e marcação de 1.100 em 15/02. */
const cdb = ativo('cdb', 'renda-fixa', {
  movimentos: [aporte('m1', '2026-01-10', 100000), aporte('m2', '2026-03-10', 50000)],
  marcacoes: [{ id: 'k1', data: '2026-02-15', valor: 110000 }],
});

const comAtivos = (investimentos: Ativo[]): AppState => construirEstado({ investimentos });

describe('investimentos: cadastro e navegação (critérios 1, 2)', () => {
  it('critério 1: valida nome, tamanho, classe e nome repetido', () => {
    const base = construirEstado();
    expect(criarAtivo(base, { nome: '  ', classe: 'acoes' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(criarAtivo(base, { nome: 'x'.repeat(41), classe: 'acoes' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(criarAtivo(base, { nome: 'PETR4', classe: '' as ClasseAtivo })).toMatchObject({ ok: false, campo: 'classe' });
    const r = criarAtivo(base, { nome: ' PETR4 ', classe: 'acoes' });
    expect(r.ok && r.valor.investimentos[0]).toMatchObject({ nome: 'PETR4', classe: 'acoes', movimentos: [], marcacoes: [] });
    if (!r.ok) return;
    expect(criarAtivo(r.valor, { nome: 'petr4', classe: 'fundos' })).toMatchObject({ ok: false, campo: 'nome' });
  });

  it('critério 2: a navegação tem o item Investimentos e a tela vazia convida ao cadastro', () => {
    expect(itensNavegacao).toContainEqual({ to: '/investimentos', rotulo: 'Investimentos' });
    renderizarApp('/investimentos');
    expect(screen.getByRole('heading', { name: 'Investimentos', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Nenhum ativo ainda')).toBeInTheDocument();
    expect(screen.queryByText('Resumo da carteira')).not.toBeInTheDocument();
    expect(screen.queryByText('Evolução do patrimônio')).not.toBeInTheDocument();
  });
});

describe('investimentos: movimentos e marcações (critérios 3, 4, 5, 12)', () => {
  const estado = comAtivos([ativo('a', 'acoes', { movimentos: [aporte('m1', '2026-02-01', 100000)] })]);

  it('critério 3: recusa valor não positivo, data inválida e data futura', () => {
    const tenta = (valor: number, data: string) => registrarMovimento(estado, 'a', { tipo: 'aporte', data, valor }, HOJE);
    expect(tenta(0, '2026-03-01')).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta(-5, '2026-03-01')).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta(10.5, '2026-03-01')).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta(100, '2026-02-30')).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta(100, '')).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta(100, '2026-04-16')).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta(100, HOJE).ok).toBe(true);
    expect(registrarMovimento(estado, 'zzz', { tipo: 'aporte', data: HOJE, valor: 1 }, HOJE).ok).toBe(false);
  });

  it('critério 4: resgate acima da posição é recusado, inclusive em data anterior a aportes', () => {
    const resg = (valor: number, data: string) => registrarMovimento(estado, 'a', { tipo: 'resgate', data, valor }, HOJE);
    expect(resg(100001, '2026-03-01')).toMatchObject({ ok: false, campo: 'valor' });
    expect(resg(1, '2026-01-15')).toMatchObject({ ok: false, campo: 'valor' });
    const total = resg(100000, '2026-03-01');
    expect(total.ok && investidoDe(total.valor)).toBe(0);
    const parcial = resg(30000, '2026-03-01');
    expect(parcial.ok && investidoDe(parcial.valor)).toBe(70000);
  });

  it('critério 5: valida a marcação e a substitui na mesma data', () => {
    const marca = (valor: number, data: string, s = estado) => registrarMarcacao(s, 'a', { valor, data }, HOJE);
    expect(marca(0, '2026-03-01')).toMatchObject({ ok: false, campo: 'valor' });
    expect(marca(100, '2026-13-01')).toMatchObject({ ok: false, campo: 'data' });
    expect(marca(100, '2026-05-01')).toMatchObject({ ok: false, campo: 'data' });
    const a = marca(120000, '2026-03-01');
    if (!a.ok) throw new Error(a.erro);
    const b = marca(130000, '2026-03-01', a.valor);
    expect(b.ok && b.valor.investimentos[0].marcacoes.map((m) => m.valor)).toEqual([130000]);
  });

  it('critério 12: exclui movimento, marcação e ativo; recusa excluir aporte que deixa posição negativa', () => {
    const e = comAtivos([
      ativo('a', 'acoes', {
        movimentos: [aporte('m1', '2026-01-01', 100000), resgate('m2', '2026-02-01', 80000), aporte('m3', '2026-03-01', 5000)],
        marcacoes: [{ id: 'k1', data: '2026-02-10', valor: 30000 }],
      }),
    ]);
    expect(excluirMovimento(e, 'a', 'm1')).toMatchObject({ ok: false });
    expect(excluirMovimento(e, 'a', 'nao-existe').ok).toBe(false);
    const semAporteTardio = excluirMovimento(e, 'a', 'm3');
    expect(semAporteTardio.ok && semAporteTardio.valor.investimentos[0].movimentos).toHaveLength(2);
    const semMarcacao = excluirMarcacao(e, 'a', 'k1');
    expect(semMarcacao.ok && semMarcacao.valor.investimentos[0].marcacoes).toHaveLength(0);
    expect(excluirMarcacao(e, 'a', 'x').ok).toBe(false);
    const semAtivo = excluirAtivo(e, 'a');
    expect(semAtivo.ok && semAtivo.valor.investimentos).toEqual([]);
    expect(excluirAtivo(e, 'x').ok).toBe(false);
  });
});

const investidoDe = (s: AppState) => desempenhoAtivo(s.investimentos[0]).investido;

describe('investimentos: cálculos (critérios 6, 7, 8, 9, 10)', () => {
  it('critério 6: valor atual é a última marcação mais o líquido movimentado depois dela', () => {
    expect(desempenhoAtivo(cdb)).toMatchObject({ investido: 150000, valorAtual: 160000 });
    expect(valorEm(cdb, '2026-02-14')).toBe(100000);
    expect(valorEm(cdb, '2026-02-15')).toBe(110000);
    expect(valorEm(ativo('sem', 'outros', { movimentos: [aporte('m', '2026-01-01', 700)] }))).toBe(700);
    const embaralhado = { ...cdb, movimentos: [...cdb.movimentos].reverse() };
    expect(desempenhoAtivo(embaralhado)).toEqual(desempenhoAtivo(cdb));
    const comResgate = { ...cdb, movimentos: [...cdb.movimentos, resgate('m3', '2026-03-20', 20000)] };
    expect(valorEm(comResgate)).toBe(140000);
  });

  it('critério 7: rentabilidade em valor e % com uma casa, e sem divisão por zero', () => {
    expect(desempenhoAtivo(cdb)).toMatchObject({ rentabilidade: 10000, rentabilidadePct: 6.7 });
    const perda = ativo('p', 'acoes', { movimentos: [aporte('m', '2026-01-01', 30000)], marcacoes: [{ id: 'k', data: '2026-02-01', valor: 20000 }] });
    expect(desempenhoAtivo(perda)).toMatchObject({ rentabilidade: -10000, rentabilidadePct: -33.3 });
    const zerado = ativo('z', 'acoes', { movimentos: [aporte('m', '2026-01-01', 100), resgate('r', '2026-01-02', 100)] });
    expect(desempenhoAtivo(zerado)).toEqual({ investido: 0, valorAtual: 0, rentabilidade: 0, rentabilidadePct: null });
    expect(desempenhoAtivo(ativo('vazio', 'outros')).rentabilidadePct).toBeNull();
  });

  it('critério 8: alocação por classe soma exatamente 100,0 e ignora classes sem valor', () => {
    const tres = ['renda-fixa', 'acoes', 'cripto'].map((c) => ativo(c, c as ClasseAtivo, { movimentos: [aporte(`m-${c}`, '2026-01-01', 100000)] }));
    const fatias = alocacaoPorClasse([...tres, ativo('fundo', 'fundos')]);
    expect(fatias.map((f) => f.classe).sort()).toEqual(['acoes', 'cripto', 'renda-fixa']);
    expect(fatias.map((f) => f.pct).sort()).toEqual([33.3, 33.3, 33.4]);
    expect(fatias.reduce((s, f) => s + Math.round(f.pct * 10), 0)).toBe(1000);
    const duas = alocacaoPorClasse([cdb, ativo('rf2', 'renda-fixa', { movimentos: [aporte('x', '2026-01-01', 40000)] }), ativo('a', 'acoes', { movimentos: [aporte('y', '2026-01-01', 1)] })]);
    expect(duas.find((f) => f.classe === 'renda-fixa')?.valor).toBe(200000);
    expect(duas.reduce((s, f) => s + Math.round(f.pct * 10), 0)).toBe(1000);
    expect(alocacaoPorClasse([])).toEqual([]);
  });

  it('critério 9: o resumo da carteira soma os ativos', () => {
    const outro = ativo('b', 'fundos', { movimentos: [aporte('x', '2026-01-01', 50000)], marcacoes: [{ id: 'y', data: '2026-02-01', valor: 40000 }] });
    expect(desempenhoCarteira([cdb, outro])).toEqual({ investido: 200000, valorAtual: 200000, rentabilidade: 0, rentabilidadePct: 0 });
  });

  it('critério 10: patrimônio no fim de cada mês, com hoje no mês corrente e sem contar ativos futuros', () => {
    const tardio = ativo('t', 'cripto', { movimentos: [aporte('t1', '2026-03-05', 10000)] });
    const serie = evolucaoPatrimonio([cdb, tardio], HOJE);
    expect(serie).toEqual([
      { mes: '2026-01', valor: 100000 },
      { mes: '2026-02', valor: 110000 },
      { mes: '2026-03', valor: 170000 },
      { mes: '2026-04', valor: 170000 },
    ]);
    expect(evolucaoPatrimonio([ativo('v', 'outros')], HOJE)).toEqual([]);
  });

  it('critério 10: limita a série aos últimos 12 meses', () => {
    const antigo = ativo('o', 'outros', { movimentos: [aporte('m', '2024-01-10', 100)] });
    const serie = evolucaoPatrimonio([antigo], HOJE);
    expect(serie).toHaveLength(12);
    expect(serie[0].mes).toBe('2025-05');
    expect(serie[11].mes).toBe('2026-04');
  });
});

describe('investimentos: persistência e isolamento (critério 13)', () => {
  it('dados antigos sem a chave carregam com investimentos vazio', () => {
    const { investimentos: _removido, ...antigo } = estadoInicial();
    void _removido;
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    expect(carga.tipo === 'ok' && carga.estado.investimentos).toEqual([]);
  });

  it('não altera contas, transações nem saldos', () => {
    const conta: Conta = { id: 'cc', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1 };
    const antes = construirEstado({ contas: [conta], investimentos: [cdb] });
    const r = registrarMovimento(antes, 'cdb', { tipo: 'aporte', data: HOJE, valor: 99999 }, HOJE);
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.contas).toEqual(antes.contas);
    expect(r.valor.transacoes).toEqual(antes.transacoes);
    expect(saldoConta(r.valor, 'cc')).toBe(saldoConta(antes, 'cc'));
    expect(resumoMes(r.valor.transacoes, '2026-04')).toEqual(resumoMes(antes.transacoes, '2026-04'));
  });
});

describe('investimentos: tela (critérios 2, 11, 14)', () => {
  const hoje = hojeISO();
  const mesPassado = (dia: string) => `${somarMeses(hoje.slice(0, 7), -2)}-${dia}`;
  const preparado = () =>
    comAtivos([
      ativo('Tesouro', 'renda-fixa', {
        nome: 'Tesouro Selic',
        movimentos: [aporte('m1', mesPassado('10'), 100000)],
        marcacoes: [{ id: 'k1', data: mesPassado('20'), valor: 110000 }],
      }),
    ]);

  it('critérios 2, 7, 9 e 11: mostra resumo, alocação, gráfico com tabela alternativa e ativo', () => {
    renderizarApp('/investimentos', preparado());
    expect(screen.getByTestId('resumo-investido')).toHaveTextContent('R$ 1.000,00');
    expect(screen.getByTestId('resumo-atual')).toHaveTextContent('R$ 1.100,00');
    expect(screen.getByTestId('resumo-rentabilidade')).toHaveTextContent('+R$ 100,00 (+10,0%)');
    expect(screen.getByTestId('alocacao-renda-fixa')).toHaveTextContent('100,0%');
    expect(screen.getByRole('img', { name: /evolução mensal do patrimônio/i })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Patrimônio por mês', hidden: true });
    expect(within(tabela).getAllByRole('row', { hidden: true })).toHaveLength(4);
    expect(within(tabela).getAllByText('R$ 1.100,00')).toHaveLength(3);
    expect(screen.getByText(/Tesouro Selic · Renda fixa/)).toBeInTheDocument();
  });

  it('critérios 1 e 14: cadastra um ativo, com erros em role=alert', async () => {
    const u = userEvent.setup();
    const { store } = renderizarApp('/investimentos');
    await u.click(screen.getByRole('button', { name: 'Cadastre seu primeiro ativo' }));
    await u.click(screen.getByRole('button', { name: 'Cadastrar ativo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome do ativo.');
    await u.type(screen.getByLabelText('Nome do ativo'), 'PETR4');
    await u.click(screen.getByRole('button', { name: 'Cadastrar ativo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha a classe do ativo.');
    await u.selectOptions(screen.getByLabelText('Classe'), 'acoes');
    await u.click(screen.getByRole('button', { name: 'Cadastrar ativo' }));
    expect(await screen.findByText(/PETR4 · Ações/)).toBeInTheDocument();
    expect(store.getSnapshot().estado.investimentos).toHaveLength(1);
    expect(lerEstadoSalvo().investimentos[0]).toMatchObject({ nome: 'PETR4', classe: 'acoes' });
  });

  it('critérios 3, 4 e 14: registra aporte e recusa resgate acima da posição', async () => {
    const u = userEvent.setup();
    renderizarApp('/investimentos', preparado());
    await u.click(screen.getByRole('button', { name: 'Registrar movimento de Tesouro Selic' }));
    await u.type(screen.getByLabelText('Valor'), 'abc');
    await u.click(screen.getByRole('button', { name: 'Salvar movimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um valor válido');
    await u.clear(screen.getByLabelText('Valor'));
    await u.type(screen.getByLabelText('Valor'), '500,00');
    await u.click(screen.getByRole('button', { name: 'Salvar movimento' }));
    expect(screen.getByTestId('ativo-investido')).toHaveTextContent('R$ 1.500,00');

    await u.click(screen.getByRole('button', { name: 'Registrar movimento de Tesouro Selic' }));
    await u.selectOptions(screen.getByLabelText('Tipo'), 'resgate');
    await u.type(screen.getByLabelText('Valor'), '9.000,00');
    await u.click(screen.getByRole('button', { name: 'Salvar movimento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O resgate é maior que a posição');
    expect(screen.getByTestId('ativo-investido')).toHaveTextContent('R$ 1.500,00');
  });

  it('critérios 5 e 7: marca o valor atual e mostra perda com sinal', async () => {
    const u = userEvent.setup();
    renderizarApp('/investimentos', preparado());
    await u.click(screen.getByRole('button', { name: 'Marcar valor atual de Tesouro Selic' }));
    await u.type(screen.getByLabelText('Valor de mercado'), '800,00');
    await u.click(screen.getByRole('button', { name: 'Salvar marcação' }));
    expect(screen.getByTestId('ativo-atual')).toHaveTextContent('R$ 800,00');
    expect(screen.getByTestId('ativo-rentabilidade')).toHaveTextContent('-R$ 200,00 (-20,0%)');
  });

  it('critério 12: exclui um movimento recusado, depois o ativo com confirmação', async () => {
    const u = userEvent.setup();
    const { store } = renderizarApp('/investimentos', preparado());
    await u.click(screen.getByText('Histórico de Tesouro Selic'));
    await u.click(screen.getByRole('button', { name: /^Excluir marcação de/ }));
    expect(screen.getByTestId('ativo-atual')).toHaveTextContent('R$ 1.000,00');
    await u.click(screen.getByRole('button', { name: 'Excluir ativo Tesouro Selic' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir ativo' }));
    expect(await screen.findByText('Nenhum ativo ainda')).toBeInTheDocument();
    expect(store.getSnapshot().estado.investimentos).toEqual([]);
  });
});
