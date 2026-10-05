import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { criarDivida } from '../domain/dividas';
import { classificar, faixaDe, saudeFinanceira, type IdIndicador } from '../domain/saude';
import type { AppState, Conta, Divida, Orcamento, Transacao } from '../domain/types';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO } from '../storage/storage';
import { construirEstado, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

const conta = (id: string, tipo: Conta['tipo'], saldoInicial = 0, parcial: Partial<Conta> = {}): Conta => ({ id, nome: id, tipo, saldoInicial, arquivada: false, criadaEm: 1, ...parcial });

let seq = 0;
const t = (data: string, tipo: Transacao['tipo'], valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'inv',
  categoriaId: tipo === 'receita' ? 'cat-salario' : 'cat-alimentacao',
  tipo,
  valor,
  data,
  descricao: '',
  criadaEm: seq,
  ...parcial,
});

/** Receita e despesa no dia 5 de cada mês informado, na conta de investimento (fora da reserva). */
const meses = (lista: string[], receita: number, despesa: number) => lista.flatMap((m) => [t(`${m}-05`, 'receita', receita), t(`${m}-05`, 'despesa', despesa)]);

const TRIMESTRE = ['2026-07', '2026-08', '2026-09'];

/** Os 3 meses completos anteriores ao mês corrente real (as telas usam a data de hoje). */
function mesesRecentes(): string[] {
  const hoje = new Date();
  return [3, 2, 1].map((n) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

const estado = (parcial: Partial<AppState> = {}): AppState => construirEstado({ contas: [conta('inv', 'investimento')], transacoes: meses(TRIMESTRE, 1000000, 700000), ...parcial });

const indicador = (s: AppState, id: IdIndicador) => saudeFinanceira(s, HOJE).indicadores.find((i) => i.id === id)!;

const divida = (principal: number, parcelas = 12): Divida => {
  const r = criarDivida(construirEstado(), { nome: 'Empréstimo', tipo: 'devo', principal, taxaBp: 0, parcelas, primeiraParcela: '2026-10-10', sistema: 'price' });
  if (!r.ok) throw new Error(r.erro);
  return r.valor.dividas[0];
};

describe('saúde: faixas e nota', () => {
  it('critério 7: faixas pelos pontos', () => {
    expect([100, 99, 70, 69, 35, 34, 0].map(faixaDe)).toEqual(['otimo', 'bom', 'bom', 'atencao', 'atencao', 'critico', 'critico']);
  });

  it('critério 8: classificação pela nota', () => {
    expect([80, 79, 60, 59, 40, 39].map(classificar)).toEqual(['saudavel', 'estavel', 'estavel', 'atencao', 'atencao', 'critica']);
  });

  it('critério 8: nota é a média dos indicadores com dados; sem dados, nula', () => {
    const s = saudeFinanceira(estado(), HOJE);
    const comDados = s.indicadores.filter((i) => i.pontos !== null);
    expect(comDados.map((i) => i.id)).toEqual(['poupanca', 'reserva', 'dividas']);
    expect(s.nota).toBe(Math.round((100 + 0 + 100) / 3));
    expect(s.mesesReferencia).toEqual(TRIMESTRE);
    const vazio = saudeFinanceira(construirEstado(), HOJE);
    expect(vazio).toMatchObject({ nota: null, classificacao: null });
  });
});

describe('saúde: indicadores', () => {
  it('critério 1: taxa de poupança em cada faixa, com recomendação', () => {
    const com = (despesa: number) => indicador(estado({ transacoes: meses(TRIMESTRE, 1000000, despesa) }), 'poupanca');
    expect(com(700000)).toMatchObject({ valor: '30,0%', pontos: 100, faixa: 'otimo' });
    expect(com(850000)).toMatchObject({ valor: '15,0%', pontos: 75, faixa: 'bom' });
    expect(com(950000)).toMatchObject({ pontos: 50, faixa: 'atencao', recomendacao: 'Para poupar 20% da renda, o resultado mensal precisa melhorar R$ 1.500,00.' });
    expect(com(1100000)).toMatchObject({ valor: '-10,0%', pontos: 0, faixa: 'critico' });
    expect(com(700000).recomendacao).toBeUndefined();
    expect(indicador(estado({ transacoes: meses(TRIMESTRE, 0, 1000) }), 'poupanca').pontos).toBeNull();
  });

  it('critério 2: reserva só com contas líquidas ativas e saldo positivo', () => {
    const com = (...contas: Conta[]) => indicador(estado({ contas: [conta('inv', 'investimento'), ...contas] }), 'reserva');
    expect(com(conta('pp', 'poupanca', 4200000))).toMatchObject({ valor: '6,0 meses', pontos: 100 });
    expect(com(conta('cc', 'corrente', 1500000), conta('din', 'dinheiro', 600000))).toMatchObject({ valor: '3,0 meses', pontos: 75 });
    expect(com(conta('pp', 'poupanca', 700000))).toMatchObject({ valor: '1,0 mês', pontos: 40, recomendacao: 'Faltam R$ 35.000,00 para a reserva cobrir 6 meses de despesas.' });
    expect(com(conta('pp', 'poupanca', 9000000, { arquivada: true }), conta('neg', 'corrente', -500000))).toMatchObject({ valor: '0,0 meses', pontos: 0 });
    expect(indicador(estado({ transacoes: meses(TRIMESTRE, 1000, 0) }), 'reserva').pontos).toBeNull();
  });

  it('critério 3: comprometimento pelas parcelas do mês atual', () => {
    const com = (...dividas: Divida[]) => indicador(estado({ dividas }), 'dividas');
    expect(com()).toMatchObject({ valor: 'Sem dívidas', pontos: 100 });
    expect(com(divida(1200000))).toMatchObject({ valor: '10,0%', pontos: 100 });
    expect(com(divida(3000000))).toMatchObject({ valor: '25,0%', pontos: 70 });
    expect(com(divida(4200000))).toMatchObject({ valor: '35,0%', pontos: 35 });
    const critico = com(divida(3000000), divida(3000000));
    expect(critico).toMatchObject({ valor: '50,0%', pontos: 0 });
    expect(critico.recomendacao).toContain('reduzir R$ 3.500,00 por mês');
    const emprestei = { ...divida(9000000), tipo: 'emprestei' as const };
    expect(com(emprestei)).toMatchObject({ valor: 'Sem dívidas' });
    expect(indicador(estado({ transacoes: [], dividas: [divida(1200000)] }), 'dividas').pontos).toBeNull();
  });

  it('critério 4: uso do limite dos cartões ativos', () => {
    const cartao = (id: string, limite: number, parcial: Partial<Conta> = {}) => conta(id, 'cartao', 0, { cartao: { diaFechamento: 5, diaVencimento: 12, limite }, ...parcial });
    const com = (usado: number, extras: Conta[] = []) =>
      indicador(estado({ contas: [conta('inv', 'investimento'), cartao('c1', 100000), ...extras], transacoes: [...meses(TRIMESTRE, 1000000, 700000), t('2026-10-01', 'despesa', usado, { contaId: 'c1' })] }), 'cartoes');
    expect(com(20000)).toMatchObject({ valor: '20,0%', pontos: 100 });
    expect(com(40000)).toMatchObject({ pontos: 70 });
    expect(com(60000)).toMatchObject({ pontos: 35, faixa: 'atencao' });
    expect(com(90000)).toMatchObject({ pontos: 0, recomendacao: 'Pagar R$ 600,00 das faturas deixaria o uso em 30% do limite.' });
    expect(com(20000, [cartao('c2', 900000, { arquivada: true })])).toMatchObject({ valor: '20,0%' });
    expect(indicador(estado(), 'cartoes').pontos).toBeNull();
  });

  it('critério 5: orçamento do último mês completo, com subcategorias somadas', () => {
    const orcamentos: Orcamento[] = [
      { categoriaId: 'cat-alimentacao', mes: '2026-09', limite: 600000 },
      { categoriaId: 'cat-lazer', mes: '2026-09', limite: 100000 },
    ];
    const ok = indicador(estado({ orcamentos: [{ categoriaId: 'cat-alimentacao', mes: '2026-09', limite: 800000 }] }), 'orcamento');
    expect(ok).toMatchObject({ valor: '100,0%', pontos: 100 });
    const metade = indicador(estado({ orcamentos }), 'orcamento');
    expect(metade).toMatchObject({ valor: '50,0%', pontos: 40, faixa: 'atencao', recomendacao: 'Estouraram o orçamento: Alimentação (R$ 1.000,00 acima).' });
    const sub = { id: 'sub', nome: 'Restaurantes', tipo: 'despesa' as const, arquivada: false, paiId: 'cat-lazer' };
    const s = estado({ orcamentos, transacoes: [...meses(TRIMESTRE, 1000000, 500000), t('2026-09-20', 'despesa', 150000, { categoriaId: 'sub' })] });
    s.categorias = [...s.categorias, sub];
    expect(indicador(s, 'orcamento')).toMatchObject({ pontos: 40 });
    expect(indicador(s, 'orcamento').recomendacao).toContain('Lazer (R$ 500,00 acima)');
    expect(indicador(estado(), 'orcamento').pontos).toBeNull();
  });

  it('critério 6: tendência exige 6 meses e compara as médias', () => {
    const anteriores = ['2026-04', '2026-05', '2026-06'];
    const com = (antes: number, depois: number) => indicador(estado({ transacoes: [...meses(anteriores, 1000000, antes), ...meses(TRIMESTRE, 1000000, depois)] }), 'tendencia');
    expect(com(700000, 600000)).toMatchObject({ valor: '-14,3%', pontos: 100 });
    expect(com(600000, 650000)).toMatchObject({ valor: '+8,3%', pontos: 70 });
    expect(com(600000, 700000)).toMatchObject({ valor: '+16,7%', pontos: 35, recomendacao: 'As despesas médias subiram R$ 1.000,00 por mês em relação ao trimestre anterior.' });
    expect(com(500000, 700000)).toMatchObject({ pontos: 0 });
    expect(indicador(estado(), 'tendencia').pontos).toBeNull();
  });
});

describe('saúde: telas', () => {
  it('critério 10: navegação, medidor e cartões por indicador', () => {
    expect(itensNavegacao).toContainEqual({ to: '/saude', rotulo: 'Saúde financeira' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Visão geral')?.itens).toContain('/saude');
    const s = estado({ contas: [conta('inv', 'investimento'), conta('pp', 'poupanca', 700000)], transacoes: meses(mesesRecentes(), 1000000, 700000) });
    renderizarApp('/saude', s);
    // Poupança 30% (100), reserva de 1 mês (40) e sem dívidas (100).
    const medidor = screen.getByRole('meter', { name: 'Nota de saúde financeira' });
    expect(medidor).toHaveAttribute('aria-valuenow', '80');
    expect(medidor).toHaveAttribute('aria-valuetext', '80 de 100, Saudável');
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(within(screen.getByRole('article', { name: 'Uso do limite dos cartões' })).getByText('Sem dados')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Reserva de emergência' })).getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText(/Faltam R\$\s35\.000,00 para a reserva/)).toBeInTheDocument();
  });

  it('critério 8: sem dados mostra estado vazio; critério 12: não grava nada', () => {
    renderizarApp('/saude', construirEstado());
    const antes = localStorage.getItem(CHAVE_ESTADO);
    expect(screen.getByText('Ainda não há dados suficientes')).toBeInTheDocument();
    expect(localStorage.getItem(CHAVE_ESTADO)).toBe(antes);
  });

  it('critério 11: cartão no Dashboard com link, só quando há nota', () => {
    renderizarApp('/', estado({ transacoes: meses(mesesRecentes(), 1000000, 700000) }));
    const cartao = screen.getByRole('heading', { name: 'Saúde financeira' }).closest('section')!;
    expect(within(cartao).getByRole('meter')).toBeInTheDocument();
    expect(within(cartao).getByRole('link', { name: 'Ver indicadores' })).toHaveAttribute('href', '/saude');
  });

  it('critério 11: sem dados o Dashboard não mostra o cartão', () => {
    renderizarApp('/', construirEstado());
    expect(screen.queryByRole('heading', { name: 'Saúde financeira' })).not.toBeInTheDocument();
  });
});
