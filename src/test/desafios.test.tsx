import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  abandonarDesafio,
  alternarSemana,
  criarDesafio,
  excluirDesafio,
  listaDesafios,
  progresso52,
  progressoSemGastos,
  progressoTeto,
  semanaAtual,
  separarDesafios,
  valorDaSemana,
  type DadosDesafio,
  type Desafio52,
  type DesafioSemGastos,
  type DesafioTeto,
} from '../domain/desafios';
import { hojeISO } from '../domain/date';
import type { AppState, Transacao } from '../domain/types';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

let seq = 0;
const t = (data: string, categoriaId: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'a',
  categoriaId,
  tipo: 'despesa',
  valor,
  data,
  descricao: `gasto ${seq}`,
  criadaEm: seq,
  ...parcial,
});

const base = (parcial: Partial<AppState> = {}): AppState => {
  const s = construirEstado(parcial);
  s.categorias = [...s.categorias, { id: 'delivery', nome: 'Delivery', tipo: 'despesa', arquivada: false, paiId: 'cat-alimentacao' }];
  return s;
};

const d52 = (parcial: Partial<Desafio52> = {}): Desafio52 => ({ id: 'd52', nome: '52 semanas', tipo: 'semanas52', inicio: '2026-01-01', criadoEm: 1, valorBase: 500, ordem: 'crescente', semanasFeitas: [], ...parcial });
const sg = (parcial: Partial<DesafioSemGastos> = {}): DesafioSemGastos => ({ id: 'sg', nome: 'Sem delivery', tipo: 'sem-gastos', inicio: '2026-10-01', criadoEm: 2, dias: 10, categoriaIds: ['cat-alimentacao'], ...parcial });
const teto = (parcial: Partial<DesafioTeto> = {}): DesafioTeto => ({ id: 'tt', nome: 'Lazer controlado', tipo: 'teto', inicio: '2026-10-01', criadoEm: 3, dias: 30, categoriaId: 'cat-lazer', limite: 30000, ...parcial });

describe('desafios: cadastro', () => {
  it('critério 1: valida campos de cada tipo', () => {
    const tenta = (dados: DadosDesafio) => criarDesafio(base(), dados);
    expect(tenta({ tipo: 'semanas52', nome: '', inicio: '2026-01-01', valorBase: 100, ordem: 'crescente' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ tipo: 'semanas52', nome: 'x', inicio: '2026-13-01', valorBase: 100, ordem: 'crescente' })).toMatchObject({ ok: false, campo: 'inicio' });
    expect(tenta({ tipo: 'semanas52', nome: 'x', inicio: '2026-01-01', valorBase: 0, ordem: 'crescente' })).toMatchObject({ ok: false, campo: 'valorBase' });
    expect(tenta({ tipo: 'sem-gastos', nome: 'x', inicio: '2026-01-01', dias: 0, categoriaIds: ['cat-lazer'] })).toMatchObject({ ok: false, campo: 'dias' });
    expect(tenta({ tipo: 'sem-gastos', nome: 'x', inicio: '2026-01-01', dias: 366, categoriaIds: ['cat-lazer'] })).toMatchObject({ ok: false, campo: 'dias' });
    expect(tenta({ tipo: 'sem-gastos', nome: 'x', inicio: '2026-01-01', dias: 7, categoriaIds: [] })).toMatchObject({ ok: false, campo: 'categoriaIds' });
    expect(tenta({ tipo: 'sem-gastos', nome: 'x', inicio: '2026-01-01', dias: 7, categoriaIds: ['cat-salario'] })).toMatchObject({ ok: false, campo: 'categoriaIds' });
    expect(tenta({ tipo: 'teto', nome: 'x', inicio: '2026-01-01', dias: 7, categoriaId: '', limite: 100 })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(tenta({ tipo: 'teto', nome: 'x', inicio: '2026-01-01', dias: 7, categoriaId: 'cat-lazer', limite: 0 })).toMatchObject({ ok: false, campo: 'limite' });
    const r = tenta({ tipo: 'semanas52', nome: ' Poupar ', inicio: '2026-01-01', valorBase: 100, ordem: 'crescente' });
    expect(r.ok && listaDesafios(r.valor)[0]).toMatchObject({ nome: 'Poupar', semanasFeitas: [] });
  });

  it('critério 11: dados antigos sem desafios carregam com lista vazia', () => {
    const { desafios: _sem, ...antigo } = estadoInicial();
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.desafios).toEqual([]);
  });
});

describe('desafios: 52 semanas', () => {
  it('critério 2: valor de cada semana e total de 1378 vezes o valor base', () => {
    expect([1, 2, 52].map((n) => valorDaSemana(d52(), n))).toEqual([500, 1000, 26000]);
    expect([1, 52].map((n) => valorDaSemana(d52({ ordem: 'decrescente' }), n))).toEqual([26000, 500]);
    expect(progresso52(d52(), '2026-01-01').total).toBe(1378 * 500);
  });

  it('critério 3: marcar e desmarcar atualiza o progresso; semana atual pela data', () => {
    const s = base({ desafios: [d52()] });
    const r1 = alternarSemana(s, 'd52', 3);
    const r2 = r1.ok ? alternarSemana(r1.valor, 'd52', 1) : r1;
    if (!r2.ok) throw new Error(r2.erro);
    const desafio = listaDesafios(r2.valor)[0] as Desafio52;
    expect(desafio.semanasFeitas).toEqual([1, 3]);
    expect(progresso52(desafio, '2026-01-20')).toMatchObject({ guardado: 2000, restante: 689000 - 2000, feitas: 2, percentual: 0, semanaAtual: 3, situacao: 'andamento' });
    const r3 = alternarSemana(r2.valor, 'd52', 3);
    expect(r3.ok && (listaDesafios(r3.valor)[0] as Desafio52).semanasFeitas).toEqual([1]);
    expect(alternarSemana(s, 'd52', 53).ok).toBe(false);
    expect([semanaAtual('2026-01-01', '2026-01-07'), semanaAtual('2026-01-01', '2026-01-08'), semanaAtual('2026-01-01', '2025-12-31'), semanaAtual('2026-01-01', '2027-01-01')]).toEqual([1, 2, null, null]);
  });

  it('critério 7: todas as semanas marcadas conclui', () => {
    const todas = Array.from({ length: 52 }, (_, i) => i + 1);
    expect(progresso52(d52({ semanasFeitas: todas }), '2026-03-01')).toMatchObject({ situacao: 'concluido', percentual: 100, restante: 0 });
    expect(progresso52(d52(), '2025-12-01').situacao).toBe('futuro');
  });
});

describe('desafios: verificados pelas transações', () => {
  it('critérios 4 e 5: dias sem gastar com subcategorias, quebras e situação', () => {
    const limpo = base({ transacoes: [t('2026-09-30', 'cat-alimentacao', 100), t('2026-10-03', 'cat-lazer', 100), t('2026-10-11', 'cat-alimentacao', 100)] });
    expect(progressoSemGastos(limpo, sg(), '2026-10-04')).toMatchObject({ fim: '2026-10-10', diasDecorridos: 4, diasLimpos: 4, percentual: 40, situacao: 'andamento', quebras: [] });
    expect(progressoSemGastos(limpo, sg(), '2026-10-20')).toMatchObject({ diasDecorridos: 10, diasLimpos: 10, situacao: 'concluido' });
    expect(progressoSemGastos(limpo, sg(), '2026-09-20')).toMatchObject({ diasDecorridos: 0, situacao: 'futuro' });
    const quebrado = base({ transacoes: [t('2026-10-02', 'delivery', 4500), t('2026-10-02', 'cat-alimentacao', 1000)] });
    const p = progressoSemGastos(quebrado, sg(), '2026-10-04');
    expect(p.situacao).toBe('falhou');
    expect(p.quebras).toHaveLength(2);
    expect(p.diasLimpos).toBe(3);
  });

  it('critério 6: teto soma subcategorias, mostra restante e quanto cabe por dia', () => {
    const s = base({ transacoes: [t('2026-10-02', 'cat-lazer', 10000), t('2026-10-05', 'cat-lazer', 5000), t('2026-11-05', 'cat-lazer', 99999)] });
    expect(progressoTeto(s, teto(), '2026-10-10')).toMatchObject({ fim: '2026-10-30', gasto: 15000, restante: 15000, porDia: 714, percentual: 50, situacao: 'andamento' });
    expect(progressoTeto(s, teto(), '2026-11-01')).toMatchObject({ situacao: 'concluido', porDia: null });
    expect(progressoTeto(s, teto({ limite: 12000 }), '2026-10-10')).toMatchObject({ situacao: 'falhou', restante: -3000, porDia: null });
    const comSub = base({ transacoes: [t('2026-10-02', 'delivery', 2000)] });
    expect(progressoTeto(comSub, teto({ categoriaId: 'cat-alimentacao' }), '2026-10-10').gasto).toBe(2000);
  });

  it('critérios 8 e 9: abandonar move para encerrados; excluir remove', () => {
    const s = base({ desafios: [d52(), sg(), teto()] });
    expect(separarDesafios(s, '2026-10-04').ativos.map((d) => d.id)).toEqual(['d52', 'sg', 'tt']);
    const abandonado = abandonarDesafio(s, 'sg', '2026-10-04');
    if (!abandonado.ok) throw new Error(abandonado.erro);
    const r = separarDesafios(abandonado.valor, '2026-10-04');
    expect(r.encerrados.map((d) => d.id)).toEqual(['sg']);
    expect(abandonarDesafio(abandonado.valor, 'sg', '2026-10-05').ok).toBe(false);
    const excluido = excluirDesafio(s, 'tt');
    expect(excluido.ok && listaDesafios(excluido.valor).map((d) => d.id)).toEqual(['d52', 'sg']);
    expect(excluido.ok && excluido.valor.transacoes).toBe(s.transacoes);
  });
});

describe('desafios: tela', () => {
  it('critério 10: navegação e estado vazio', () => {
    expect(itensNavegacao).toContainEqual({ to: '/desafios', rotulo: 'Desafios' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Planejamento')?.itens).toContain('/desafios');
    renderizarApp('/desafios', base());
    expect(screen.getByText('Nenhum desafio ainda')).toBeInTheDocument();
  });

  it('critérios 1 e 4: cria "dias sem gastar" pela tela e mostra a situação', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desafios', base());
    const form = within(screen.getByRole('form', { name: 'Novo desafio' }));
    await usuario.type(form.getByLabelText('Nome do desafio'), 'Sem iFood');
    await usuario.clear(form.getByLabelText('Duração (dias)'));
    await usuario.type(form.getByLabelText('Duração (dias)'), '7');
    await usuario.click(form.getByRole('checkbox', { name: 'Delivery' }));
    await usuario.click(form.getByRole('button', { name: 'Começar desafio' }));
    expect(lerEstadoSalvo().desafios?.[0]).toMatchObject({ tipo: 'sem-gastos', nome: 'Sem iFood', dias: 7, categoriaIds: ['delivery'], inicio: hojeISO() });
    const cartao = within(screen.getByRole('article', { name: 'Sem iFood' }));
    expect(cartao.getByText('Em andamento')).toBeInTheDocument();
    expect(cartao.getByRole('progressbar', { name: 'Progresso de Sem iFood' })).toBeInTheDocument();
  });

  it('critérios 3 e 8: marca semana pela tela e abandona com confirmação', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/desafios', base({ desafios: [d52({ inicio: hojeISO() })] }));
    const semana1 = screen.getByRole('checkbox', { name: /Semana 1, R\$\s5,00, semana atual/ });
    await usuario.click(semana1);
    expect((listaDesafios(store.getSnapshot().estado)[0] as Desafio52).semanasFeitas).toEqual([1]);
    expect(screen.getByText(/Guardado R\$\s5,00 de R\$\s6\.890,00/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Abandonar 52 semanas' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonar' }));
    const encerrados = within(screen.getByRole('region', { name: 'Encerrados' }));
    expect(encerrados.getByText('Abandonado')).toBeInTheDocument();
  });
});
