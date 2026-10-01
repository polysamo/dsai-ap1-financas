import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  alternarRollover,
  csvOrcamentoAnual,
  definirLimiteEmMeses,
  mesesAPartirDe,
  mesesDoAno,
  visaoAnual,
} from '../domain/orcamentoAnual';
import { gerarCsv } from '../domain/exportacao';
import type { AppState, Orcamento, Transacao } from '../domain/types';
import { baixarArquivo } from '../lib/download';
import { itensNavegacao } from '../navegacao';
import { migrar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

vi.mock('../lib/download', async (original) => ({
  ...(await original<typeof import('../lib/download')>()),
  baixarArquivo: vi.fn(),
}));

const desp = (id: string, valor: number, data: string, categoriaId = 'cat-lazer'): Transacao => ({
  id,
  contaId: 'a',
  categoriaId,
  tipo: 'despesa',
  valor,
  data,
  descricao: id,
  criadaEm: 1,
});

const lim = (mes: string, limite: number, categoriaId = 'cat-lazer'): Orcamento => ({ categoriaId, mes, limite });

const estadoCom = (parcial: Partial<AppState> = {}) => construirEstado(parcial);

const celulaLazer = (v: ReturnType<typeof visaoAnual>, mes: string) =>
  v.linhas.find((l) => l.categoria.id === 'cat-lazer')!.celulas.find((c) => c.mes === mes)!;

describe('orçamento anual: domínio', () => {
  it('critério 2: gasto da célula é a soma exata das despesas; totais por mês e por categoria', () => {
    const v = visaoAnual(
      estadoCom({
        transacoes: [desp('1', 1000, '2026-03-01'), desp('2', 2500, '2026-03-31'), desp('3', 999, '2025-12-31'), desp('4', 700, '2026-03-10', 'cat-saude')],
        orcamentos: [lim('2026-03', 5000), lim('2026-04', 1000)],
      }),
      2026,
    );
    expect(celulaLazer(v, '2026-03').gasto).toBe(3500);
    expect(v.totaisMes[2]).toEqual({ mes: '2026-03', limite: 5000, gasto: 4200 });
    const lazer = v.linhas.find((l) => l.categoria.id === 'cat-lazer')!;
    expect(lazer.orcado).toBe(6000);
    expect(lazer.realizado).toBe(3500);
    expect(v.meses).toHaveLength(12);
  });

  it('critério 2: arquivada só aparece se tiver limite ou gasto no ano', () => {
    const categorias = estadoCom().categorias.map((c) => (c.id === 'cat-lazer' || c.id === 'cat-saude' ? { ...c, arquivada: true } : c));
    const v = visaoAnual(estadoCom({ categorias, orcamentos: [lim('2026-05', 100, 'cat-saude')] }), 2026);
    const ids = v.linhas.map((l) => l.categoria.id);
    expect(ids).toContain('cat-saude');
    expect(ids).not.toContain('cat-lazer');
  });

  it('critério 4: aplicar a todos os meses e a partir de um mês', () => {
    const base = estadoCom({ orcamentos: [lim('2025-12', 1), lim('2026-02', 2), lim('2026-06', 3, 'cat-saude')] });
    const todos = definirLimiteEmMeses(base, 'cat-lazer', mesesDoAno(2026), 500);
    expect(todos.ok && todos.valor.orcamentos.filter((o) => o.categoriaId === 'cat-lazer' && o.mes.startsWith('2026-'))).toHaveLength(12);
    const apartir = definirLimiteEmMeses(base, 'cat-lazer', mesesAPartirDe('2026-10'), 800);
    expect(mesesAPartirDe('2026-10')).toEqual(['2026-10', '2026-11', '2026-12']);
    if (!apartir.ok) throw new Error('falhou');
    const o = apartir.valor.orcamentos;
    expect(o.find((x) => x.mes === '2026-09' && x.categoriaId === 'cat-lazer')).toBeUndefined();
    expect(o.find((x) => x.mes === '2026-02')?.limite).toBe(2);
    expect(o.find((x) => x.mes === '2026-12' && x.categoriaId === 'cat-lazer')?.limite).toBe(800);
    expect(o.find((x) => x.categoriaId === 'cat-saude')?.limite).toBe(3);
    expect(o.find((x) => x.mes === '2025-12')?.limite).toBe(1);
  });

  it('critério 3: limite negativo é recusado e nada é gravado', () => {
    const r = definirLimiteEmMeses(estadoCom(), 'cat-lazer', mesesDoAno(2026), -1);
    expect(r.ok).toBe(false);
  });

  it('critério 5: alternar rollover liga e desliga; dados sem a chave carregam com lista vazia', () => {
    const ligado = alternarRollover(estadoCom(), 'cat-lazer');
    expect(ligado.ok && ligado.valor.rolloverCategorias).toEqual(['cat-lazer']);
    if (!ligado.ok) throw new Error('falhou');
    const desligado = alternarRollover(ligado.valor, 'cat-lazer');
    expect(desligado.ok && desligado.valor.rolloverCategorias).toEqual([]);
    expect(alternarRollover(estadoCom(), 'cat-salario').ok).toBe(false);

    const { rolloverCategorias: _ignorada, ...semChave } = estadoCom();
    const migrado = migrar(semChave);
    expect(migrado.tipo === 'ok' && migrado.estado.rolloverCategorias).toEqual([]);
    expect(migrado.tipo === 'ok' && migrado.estado.schemaVersion).toBe(2);
  });

  it('critério 6: sobra soma e estouro subtrai do mês seguinte, em cadeia; sem rollover nada soma', () => {
    const dados = {
      orcamentos: [lim('2026-01', 10000), lim('2026-02', 10000), lim('2026-03', 10000)],
      transacoes: [desp('1', 3000, '2026-01-05'), desp('2', 20000, '2026-02-05')],
    };
    const com = visaoAnual(estadoCom({ ...dados, rolloverCategorias: ['cat-lazer'] }), 2026);
    expect(celulaLazer(com, '2026-01')).toMatchObject({ carry: 0, limite: 10000, restante: 7000 });
    expect(celulaLazer(com, '2026-02')).toMatchObject({ carry: 7000, limite: 17000, restante: -3000, estado: 'estourado' });
    expect(celulaLazer(com, '2026-03')).toMatchObject({ carry: -3000, limite: 7000, limiteBase: 10000 });
    const sem = visaoAnual(estadoCom(dados), 2026);
    expect(celulaLazer(sem, '2026-02')).toMatchObject({ carry: 0, limite: 10000 });
    expect(celulaLazer(sem, '2026-03').limite).toBe(10000);
    // O orçado anual não conta carries.
    expect(com.linhas.find((l) => l.categoria.id === 'cat-lazer')!.orcado).toBe(30000);
  });

  it('critério 7: o rollover é calculado e não altera os orçamentos do estado', () => {
    const base = estadoCom({ orcamentos: [lim('2026-01', 10000), lim('2026-02', 10000)] });
    const ligado = alternarRollover(base, 'cat-lazer');
    if (!ligado.ok) throw new Error('falhou');
    expect(ligado.valor.orcamentos).toBe(base.orcamentos);
    expect(celulaLazer(visaoAnual(ligado.valor, 2026), '2026-02').limite).toBe(20000);
    const comGasto = { ...ligado.valor, transacoes: [desp('1', 4000, '2026-01-02')] };
    expect(celulaLazer(visaoAnual(comGasto, 2026), '2026-02').limite).toBe(16000);
  });

  it('critério 8: mês sem limite interrompe a cadeia do rollover', () => {
    const v = visaoAnual(
      estadoCom({
        rolloverCategorias: ['cat-lazer'],
        orcamentos: [lim('2026-01', 10000), lim('2026-02', 10000), lim('2026-04', 10000)],
        transacoes: [desp('1', 5000, '2026-02-02')],
      }),
      2026,
    );
    expect(celulaLazer(v, '2026-02').limite).toBe(20000);
    expect(celulaLazer(v, '2026-03')).toMatchObject({ limite: null, carry: 0 });
    expect(celulaLazer(v, '2026-04')).toMatchObject({ limite: 10000, carry: 0 });
  });

  it('critério 9 e 10: faixas, orçado zero e gasto sem orçamento no resumo', () => {
    const v = visaoAnual(
      estadoCom({
        orcamentos: [lim('2026-01', 10000), lim('2026-01', 0, 'cat-saude'), lim('2026-02', 10000, 'cat-alimentacao'), lim('2026-02', 10000, 'cat-transporte')],
        transacoes: [
          desp('1', 7999, '2026-01-02'), // lazer 79,99% -> normal
          desp('2', 100, '2026-01-02', 'cat-saude'), // limite zero com gasto -> estourado
          desp('3', 8000, '2026-02-02', 'cat-alimentacao'), // 80% -> atenção
          desp('4', 10001, '2026-02-02', 'cat-transporte'), // acima -> estourado
          desp('5', 555, '2026-02-02', 'cat-educacao'), // sem orçamento
        ],
      }),
      2026,
    );
    const linha = (id: string) => v.linhas.find((l) => l.categoria.id === id)!;
    expect(linha('cat-lazer').estado).toBe('normal');
    expect(linha('cat-alimentacao').estado).toBe('atencao');
    expect(linha('cat-transporte').estado).toBe('estourado');
    expect(linha('cat-saude')).toMatchObject({ estado: 'estourado', percentual: null });
    expect(linha('cat-educacao')).toMatchObject({ estado: null, orcado: null });
    expect(v.resumo).toMatchObject({ orcado: 30000, realizadoComLimite: 7999 + 100 + 8000 + 10001, gastoSemOrcamento: 555 });
  });

  it('critério 11: CSV com separador ;, BOM e decimal com vírgula', () => {
    const v = visaoAnual(
      estadoCom({ rolloverCategorias: ['cat-lazer'], orcamentos: [lim('2026-01', 123456)], transacoes: [desp('1', 50, '2026-01-02'), desp('2', 1000, '2026-01-03', 'cat-saude')] }),
      2026,
    );
    const linhas = csvOrcamentoAnual(v);
    expect(linhas[0]).toHaveLength(2 + 24 + 4);
    expect(linhas.every((l) => l.length === linhas[0].length)).toBe(true);
    const texto = gerarCsv(linhas);
    expect(texto.startsWith('﻿Categoria;Rollover;Limite jan/26;Gasto jan/26')).toBe(true);
    const lazer = texto.split('\r\n').find((l) => l.startsWith('Lazer;'))!;
    expect(lazer.startsWith('Lazer;Sim;1234,56;0,50;')).toBe(true);
    expect(lazer.endsWith(';1234,56;0,50;0;Dentro do limite')).toBe(true);
    expect(texto.split('\r\n').find((l) => l.startsWith('Saúde;'))!.endsWith(';Sem limite')).toBe(true);
    expect(linhas[linhas.length - 1][0]).toBe('Total');
  });
});

describe('orçamento anual: tela', () => {
  beforeEach(() => vi.mocked(baixarArquivo).mockClear());

  it('critério 1: grade com 12 meses, ano da URL, navegação e item no menu', async () => {
    const u = userEvent.setup();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom({ orcamentos: [lim('2026-10', 50000)] }));
    expect(screen.getByRole('heading', { name: 'Orçamento anual' })).toBeInTheDocument();
    const grade = screen.getByRole('table');
    expect(within(grade).getAllByRole('columnheader')).toHaveLength(14);
    expect(screen.getByTestId('limite-cat-lazer-2026-10')).toHaveTextContent('R$ 500,00');
    expect(screen.getByTestId('limite-cat-lazer-2026-09')).toHaveTextContent('Sem limite');
    expect(itensNavegacao).toContainEqual({ to: '/orcamento-anual', rotulo: 'Orçamento anual' });

    await u.click(screen.getByRole('button', { name: 'Próximo ano' }));
    expect(screen.getByText('Orçamento de 2027')).toBeInTheDocument();
    expect(screen.getByTestId('limite-cat-lazer-2027-10')).toHaveTextContent('Sem limite');
    await u.click(screen.getByRole('button', { name: 'Ano anterior' }));
    await u.click(screen.getByRole('button', { name: 'Ano anterior' }));
    expect(screen.getByText('Orçamento de 2025')).toBeInTheDocument();
  });

  it('critério 1: ano inválido na URL usa o ano atual', () => {
    renderizarApp('/orcamento-anual?ano=abc', estadoCom());
    const ano = new Date().getFullYear();
    expect(screen.getByText(`Orçamento de ${ano}`)).toBeInTheDocument();
  });

  it('critério 2 e 3: gasto exibido por célula; editar limite persiste; zero é aceito', async () => {
    const u = userEvent.setup();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom({ transacoes: [desp('1', 1000, '2026-10-10'), desp('2', 2500, '2026-10-12')] }));
    expect(screen.getByTestId('gasto-cat-lazer-2026-10')).toHaveTextContent('Gasto R$ 35,00');
    expect(screen.getByTestId('total-2026-10')).toHaveTextContent('Gasto R$ 35,00');

    await u.click(screen.getByRole('button', { name: 'Editar limite de Lazer em outubro de 2026' }));
    const campo = screen.getByLabelText('Limite de Lazer em outubro de 2026');
    await u.type(campo, '300,50');
    await u.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getByTestId('limite-cat-lazer-2026-10')).toHaveTextContent('R$ 300,50');
    expect(lerEstadoSalvo().orcamentos).toEqual([lim('2026-10', 30050)]);

    await u.clear(campo);
    await u.type(campo, '0');
    await u.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(lerEstadoSalvo().orcamentos).toEqual([lim('2026-10', 0)]);
    expect(screen.getByTestId('situacao-cat-lazer')).toHaveTextContent('Estourado · —');

    await u.click(screen.getByRole('button', { name: 'Remover limite' }));
    expect(lerEstadoSalvo().orcamentos).toEqual([]);
    expect(lerEstadoSalvo().transacoes).toHaveLength(2);
  });

  it('critério 3: valor inválido ou negativo é recusado junto ao campo', async () => {
    const u = userEvent.setup();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom());
    await u.click(screen.getByRole('button', { name: 'Editar limite de Lazer em outubro de 2026' }));
    const campo = screen.getByLabelText('Limite de Lazer em outubro de 2026');
    await u.type(campo, 'abc');
    await u.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um valor válido');
    await u.clear(campo);
    await u.type(campo, '-5');
    await u.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getByRole('alert')).toHaveTextContent('não pode ser negativo');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(lerEstadoSalvo()?.orcamentos ?? []).toEqual([]);
  });

  it('critério 4: aplicar a todos os meses e a partir deste mês', async () => {
    const u = userEvent.setup();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom({ orcamentos: [lim('2026-02', 111)] }));
    await u.click(screen.getByRole('button', { name: 'Editar limite de Lazer em outubro de 2026' }));
    await u.type(screen.getByLabelText('Limite de Lazer em outubro de 2026'), '200');
    await u.click(screen.getByRole('button', { name: 'A partir deste mês' }));
    expect(screen.getByTestId('limite-cat-lazer-2026-12')).toHaveTextContent('R$ 200,00');
    expect(screen.getByTestId('limite-cat-lazer-2026-09')).toHaveTextContent('Sem limite');
    expect(screen.getByTestId('limite-cat-lazer-2026-02')).toHaveTextContent('R$ 1,11');

    await u.click(screen.getByRole('button', { name: 'Aplicar a todos os meses' }));
    for (const mes of mesesDoAno(2026)) expect(screen.getByTestId(`limite-cat-lazer-${mes}`)).toHaveTextContent('R$ 200,00');
    expect(lerEstadoSalvo().orcamentos).toHaveLength(12);
  });

  it('critérios 5, 6 e 7: rollover persiste, aparece em texto e não grava limites', async () => {
    const u = userEvent.setup();
    renderizarApp(
      '/orcamento-anual?ano=2026',
      estadoCom({ orcamentos: [lim('2026-01', 10000), lim('2026-02', 10000), lim('2026-03', 10000)], transacoes: [desp('1', 3000, '2026-01-05'), desp('2', 20000, '2026-02-05')] }),
    );
    expect(screen.queryByTestId('carry-cat-lazer-2026-02')).not.toBeInTheDocument();
    const antes = lerEstadoSalvo()?.orcamentos;
    await u.click(screen.getByRole('checkbox', { name: 'Rollover de Lazer' }));
    expect(screen.getByTestId('carry-cat-lazer-2026-02')).toHaveTextContent('Rollover +R$ 70,00');
    expect(screen.getByTestId('limite-cat-lazer-2026-02')).toHaveTextContent('R$ 170,00');
    expect(screen.getByTestId('carry-cat-lazer-2026-03')).toHaveTextContent('Rollover -R$ 30,00');
    expect(screen.getByTestId('limite-cat-lazer-2026-03')).toHaveTextContent('R$ 70,00');
    const salvo = lerEstadoSalvo();
    expect(salvo.rolloverCategorias).toEqual(['cat-lazer']);
    expect(salvo.orcamentos).toEqual(antes ?? salvo.orcamentos);
    expect(salvo.orcamentos.map((o) => o.limite)).toEqual([10000, 10000, 10000]);

    await u.click(screen.getByRole('checkbox', { name: 'Rollover de Lazer' }));
    expect(lerEstadoSalvo().rolloverCategorias).toEqual([]);
    expect(screen.queryByTestId('carry-cat-lazer-2026-02')).not.toBeInTheDocument();
  });

  it('critério 9 e 10: comparação anual com percentual, destaque textual e resumo', () => {
    renderizarApp(
      '/orcamento-anual?ano=2026',
      estadoCom({
        orcamentos: [lim('2026-01', 10000), lim('2026-02', 10000, 'cat-saude')],
        transacoes: [desp('1', 12000, '2026-01-02'), desp('2', 1000, '2026-02-02', 'cat-saude'), desp('3', 700, '2026-03-02', 'cat-educacao')],
      }),
    );
    expect(screen.getByTestId('situacao-cat-lazer')).toHaveTextContent('Estourado · 120,0%');
    expect(screen.getByTestId('situacao-cat-saude')).toHaveTextContent('Dentro do limite · 10,0%');
    expect(screen.getByTestId('anual-cat-educacao')).toHaveTextContent('Sem limite no ano');
    expect(screen.getByTestId('resumo-orcado')).toHaveTextContent('R$ 200,00');
    expect(screen.getByTestId('resumo-realizado')).toHaveTextContent('R$ 130,00');
    expect(screen.getByTestId('resumo-situacao')).toHaveTextContent('Dentro do limite · 65,0%');
    expect(screen.getByTestId('resumo-sem-orcamento')).toHaveTextContent('R$ 7,00');
  });

  it('critério 11: exportar CSV entrega arquivo do ano com BOM', async () => {
    const u = userEvent.setup();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom({ orcamentos: [lim('2026-01', 10000)] }));
    await u.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixarArquivo).toHaveBeenCalledTimes(1);
    const [nome, conteudo, tipo] = vi.mocked(baixarArquivo).mock.calls[0];
    expect(nome).toBe('orcamento-anual-2026.csv');
    expect(tipo).toBe('text/csv');
    expect(conteudo.charCodeAt(0)).toBe(0xfeff);
    expect(conteudo).toContain('Lazer;Não;100,00;0,00;');
  });

  it('critério 12: estados vazios e aviso sem limites', () => {
    const semDespesa = estadoCom().categorias.filter((c) => c.tipo === 'receita');
    const { unmount } = renderizarApp('/orcamento-anual?ano=2026', estadoCom({ categorias: semDespesa }));
    expect(screen.getByText('Nenhuma categoria de despesa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
    unmount();
    localStorage.clear();
    renderizarApp('/orcamento-anual?ano=2026', estadoCom());
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum limite definido em 2026');
  });

  it('critério 13: navegar entre anos não altera dados e /orcamento segue igual', async () => {
    const u = userEvent.setup();
    const estado = estadoCom({ orcamentos: [lim('2026-10', 50000)] });
    const { unmount } = renderizarApp('/orcamento-anual?ano=2026', estado);
    await u.click(screen.getByRole('button', { name: 'Próximo ano' }));
    expect(lerEstadoSalvo().orcamentos).toEqual(estado.orcamentos);
    unmount();
    renderizarApp('/orcamento?mes=2026-10', estado);
    expect(screen.getByRole('heading', { name: 'Orçamento' })).toBeInTheDocument();
    expect(screen.getByTestId('total-limites')).toHaveTextContent('R$ 500,00');
  });

  it('critério 14: tabela com cabeçalhos de linha, rótulos nas células e estado em texto', () => {
    renderizarApp('/orcamento-anual?ano=2026', estadoCom({ orcamentos: [lim('2026-10', 1000)], transacoes: [desp('1', 2000, '2026-10-02')] }));
    expect(screen.getByRole('rowheader', { name: /Lazer/ })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: /out\/26/i })).toHaveLength(1);
    const botao = screen.getByRole('button', { name: 'Editar limite de Lazer em outubro de 2026' });
    expect(botao).toHaveTextContent('Estourado');
  });
});
