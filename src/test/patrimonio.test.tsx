import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatarMoeda } from '../domain/money';
import {
  composicaoEm,
  criarMetaPatrimonio,
  csvPatrimonio,
  editarMetaPatrimonio,
  evolucaoPatrimonioLiquido,
  excluirMetaPatrimonio,
  patrimonioEm,
  progressoMeta,
  variacoesPatrimonio,
} from '../domain/patrimonio';
import type { AppState } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { SCHEMA_ATUAL, estadoInicial, importarJson, migrar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const baixar = vi.hoisted(() => vi.fn());
vi.mock('../lib/download', async (original) => ({ ...(await original<typeof import('../lib/download')>()), baixarArquivo: baixar }));

const HOJE = '2026-10-01';

const tx = (id: string, contaId: string, tipo: 'receita' | 'despesa', valor: number, data: string) => ({
  id, contaId, categoriaId: 'cat', tipo, valor, data, descricao: id, criadaEm: 1,
});

/**
 * Cenário conferido à mão (centavos), hoje = 2026-10-01:
 * corrente 100000 + 50000 (15/09) - 20000 (10/08) - 10000 (01/10) = 120000; cartão -30000;
 * CDB 210000 (marcação de 30/09); dívida "devo" 120000 em 12x SAC com a 1ª parcela paga = 110000;
 * empréstimo "emprestei" 50000 sem pagamentos.
 * Ativos 380000, passivos 140000, líquido 240000.
 */
function cenario(): AppState {
  return construirEstado({
    contas: [
      { id: 'c1', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1 },
      { id: 'c2', nome: 'Cartão', tipo: 'cartao', saldoInicial: 0, arquivada: false, criadaEm: 2 },
      { id: 'c3', nome: 'Antiga', tipo: 'corrente', saldoInicial: 999900, arquivada: true, criadaEm: 3 },
    ],
    transacoes: [
      tx('t1', 'c1', 'receita', 50000, '2026-09-15'),
      tx('t2', 'c1', 'despesa', 20000, '2026-08-10'),
      tx('t3', 'c2', 'despesa', 30000, '2026-09-20'),
      tx('t4', 'c1', 'despesa', 10000, '2026-10-01'),
      tx('t5', 'c1', 'despesa', 77700, '2026-10-20'),
    ],
    investimentos: [
      {
        id: 'a1', nome: 'CDB', classe: 'renda-fixa', criadoEm: 1,
        movimentos: [{ id: 'm1', tipo: 'aporte', data: '2026-07-01', valor: 200000 }],
        marcacoes: [{ id: 'k1', data: '2026-09-30', valor: 210000 }],
      },
    ],
    dividas: [
      {
        id: 'd1', nome: 'Notebook', tipo: 'devo', principal: 120000, taxaBp: 0, parcelas: 12, primeiraParcela: '2026-09-10', sistema: 'sac',
        pagamentos: [{ id: 'p1', data: '2026-09-10', valor: 10000, parcela: 1 }], criadaEm: Date.parse('2026-09-01T12:00:00'),
      },
      {
        id: 'd2', nome: 'Empréstimo ao João', tipo: 'emprestei', principal: 50000, taxaBp: 0, parcelas: 5, primeiraParcela: '2026-09-20', sistema: 'sac',
        pagamentos: [], criadaEm: Date.parse('2026-09-01T12:00:00'),
      },
    ],
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00'));
  baixar.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('patrimônio líquido: domínio', () => {
  it('critério 1: soma contas, investimentos e dívidas; vazio é zero', () => {
    const c = composicaoEm(cenario(), HOJE);
    expect(c.totalAtivos).toBe(380000);
    expect(c.totalPassivos).toBe(140000);
    expect(c.liquido).toBe(240000);
    expect(patrimonioEm(estadoInicial(), HOJE)).toBe(0);
  });

  it('critério 2: data passada ignora o que veio depois e o que não existia', () => {
    const e = cenario();
    // 31/08: corrente 80000, CDB 200000 (sem marcação, investido), devo 120000, emprestei 50000.
    expect(patrimonioEm(e, '2026-08-31')).toBe(80000 + 200000 + 50000 - 120000);
    // 31/10/2025: só o saldo inicial da corrente; a conta arquivada nunca conta.
    expect(patrimonioEm(e, '2025-10-31')).toBe(100000);
    // A transação de 20/10 só entra a partir dessa data.
    expect(patrimonioEm(e, '2026-10-20')).toBe(240000 - 77700);
  });

  it('critério 3: 12 pontos consecutivos terminando no mês corrente, o último igual ao atual', () => {
    const pontos = evolucaoPatrimonioLiquido(cenario(), HOJE);
    expect(pontos).toHaveLength(12);
    expect(pontos[0]).toEqual({ mes: '2025-11', valor: 100000 });
    expect(pontos[8]).toEqual({ mes: '2026-07', valor: 300000 });
    expect(pontos[9]).toEqual({ mes: '2026-08', valor: 210000 });
    expect(pontos[10]).toEqual({ mes: '2026-09', valor: 250000 });
    expect(pontos[11]).toEqual({ mes: '2026-10', valor: 240000 });
    expect(pontos.map((p) => p.mes)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('critério 5: grupos com percentuais que somam 100,0 em cada lado', () => {
    const c = composicaoEm(cenario(), HOJE);
    expect(c.ativos.map((g) => [g.grupo, g.valor, g.pct])).toEqual([
      ['contas', 120000, 31.6],
      ['investimentos', 210000, 55.3],
      ['areceber', 50000, 13.1],
    ]);
    expect(c.passivos.map((g) => [g.grupo, g.valor, g.pct])).toEqual([
      ['cartoes', 30000, 21.4],
      ['dividas', 110000, 78.6],
    ]);
    for (const lado of [c.ativos, c.passivos]) {
      expect(Math.round(lado.reduce((s, g) => s + g.pct, 0) * 10) / 10).toBe(100);
    }
    expect(c.totalAtivos - c.totalPassivos).toBe(c.liquido);
  });

  it('critério 5: conta comum no negativo vira passivo próprio', () => {
    const e = construirEstado({ contas: [{ id: 'c', nome: 'Cheque', tipo: 'corrente', saldoInicial: -5000, arquivada: false, criadaEm: 1 }] });
    const c = composicaoEm(e, HOJE);
    expect(c.ativos).toEqual([]);
    expect(c.passivos.map((g) => [g.grupo, g.valor, g.pct])).toEqual([['contas-negativo', 5000, 100]]);
    expect(c.liquido).toBe(-5000);
  });

  it('critério 7: variação no mês e em 12 meses, com base zero sem percentual', () => {
    const v = variacoesPatrimonio(cenario(), HOJE);
    expect(v.mes).toEqual({ valor: -10000, pct: -4 });
    expect(v.anual).toEqual({ valor: 140000, pct: 140 });
    const vazio = variacoesPatrimonio(estadoInicial(), HOJE);
    expect(vazio.mes).toEqual({ valor: 0, pct: null });
  });

  it('critério 8 e 10: criar, validar, editar e excluir metas', () => {
    const base = construirEstado();
    expect(criarMetaPatrimonio(base, { nome: ' ', valor: 100 })).toMatchObject({ ok: false, campo: 'nome' });
    expect(criarMetaPatrimonio(base, { nome: 'x'.repeat(41), valor: 100 })).toMatchObject({ ok: false, campo: 'nome' });
    expect(criarMetaPatrimonio(base, { nome: 'Casa', valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    const r = criarMetaPatrimonio(base, { nome: ' Casa ', valor: 500000 });
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.metasPatrimonio).toEqual([{ id: expect.any(String), nome: 'Casa', valor: 500000 }]);
    expect(criarMetaPatrimonio(r.valor, { nome: 'CASA', valor: 1 })).toMatchObject({ ok: false, campo: 'nome' });
    const id = r.valor.metasPatrimonio![0].id;
    const ed = editarMetaPatrimonio(r.valor, id, { nome: 'Casa', valor: 600000 });
    expect(ed.ok && ed.valor.metasPatrimonio![0].valor).toBe(600000);
    expect(editarMetaPatrimonio(r.valor, 'nada', { nome: 'A', valor: 1 }).ok).toBe(false);
    const ex = excluirMetaPatrimonio(r.valor, id);
    expect(ex.ok && ex.valor.metasPatrimonio).toEqual([]);
    expect(excluirMetaPatrimonio(r.valor, 'nada').ok).toBe(false);
  });

  it('critério 9: progresso limitado a 0-100 com uma casa decimal', () => {
    const meta = { id: 'm', nome: 'M', valor: 300000 };
    expect(progressoMeta(meta, 100000)).toMatchObject({ pct: 33.3, falta: 200000, atingida: false });
    expect(progressoMeta(meta, 300000)).toMatchObject({ pct: 100, falta: 0, atingida: true });
    expect(progressoMeta(meta, 900000)).toMatchObject({ pct: 100, atingida: true });
    expect(progressoMeta(meta, 0).pct).toBe(0);
    expect(progressoMeta(meta, -5000)).toMatchObject({ pct: 0, falta: 305000 });
  });

  it('critério 11: CSV com BOM, ponto e vírgula e vírgula decimal', () => {
    const e = { ...cenario(), metasPatrimonio: [{ id: 'm', nome: 'Casa; própria', valor: 480000 }] };
    const csv = csvPatrimonio(e, HOJE);
    expect(csv.startsWith('﻿')).toBe(true);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[0]).toBe('Patrimônio líquido em;2026-10-01');
    expect(linhas).toContain('Contas;1200,00;31,6');
    expect(linhas).toContain('Total de ativos;3800,00;');
    expect(linhas).toContain('Total de passivos;1400,00;');
    expect(linhas).toContain('Patrimônio líquido;2400,00');
    expect(linhas).toContain('No mês;-100,00;-4');
    expect(linhas).toContain('Em 12 meses;1400,00;140');
    expect(linhas).toContain('2025-11;1000,00');
    expect(linhas).toContain('"Casa; própria";4800,00;50');
    expect(csv).not.toContain('1.200');
  });

  it('critério 12: dados sem metasPatrimonio carregam e o esquema não muda', () => {
    const { metasPatrimonio: _m, ...antigo } = estadoInicial();
    void _m;
    const r = migrar(antigo);
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') expect(r.estado.metasPatrimonio).toEqual([]);
    expect(importarJson(JSON.stringify(antigo)).ok).toBe(true);
    expect(SCHEMA_ATUAL).toBe(2);
  });
});

describe('patrimônio líquido: tela', () => {
  it('critério 13: o menu tem Patrimônio e a rota abre a página', () => {
    expect(itensNavegacao).toContainEqual({ to: '/patrimonio', rotulo: 'Patrimônio' });
    renderizarApp('/patrimonio');
    expect(screen.getByRole('heading', { level: 1, name: 'Patrimônio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Patrimônio' })).toBeInTheDocument();
  });

  it('critério 1 e 6: estado vazio mostra zero e "Nada por aqui"', () => {
    renderizarApp('/patrimonio');
    expect(screen.getByTestId('patrimonio-liquido')).toHaveTextContent(formatarMoeda(0));
    expect(screen.getAllByText('Nada por aqui.')).toHaveLength(2);
    expect(screen.getByText(/Ainda não há contas/)).toBeInTheDocument();
    expect(screen.getByText('Nenhuma meta de patrimônio')).toBeInTheDocument();
  });

  it('critérios 4 e 5: gráfico com descrição, tabela de 12 meses e composição', () => {
    renderizarApp('/patrimonio', cenario());
    expect(screen.getByTestId('patrimonio-liquido')).toHaveTextContent(formatarMoeda(240000));
    expect(screen.getByRole('img', { name: /Gráfico de área do patrimônio líquido/ })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Patrimônio líquido por mês' });
    const linhas = within(tabela).getAllByRole('row');
    expect(linhas).toHaveLength(13);
    expect(linhas[1]).toHaveTextContent(formatarMoeda(100000));
    expect(linhas[12]).toHaveTextContent(formatarMoeda(240000));
    const ativos = screen.getByRole('table', { name: 'Ativos' });
    expect(within(ativos).getByRole('row', { name: /Investimentos/ })).toHaveTextContent('55,3%');
    expect(within(ativos).getByRole('row', { name: /Contas/ })).toHaveTextContent('31,6%');
    expect(screen.getByTestId('total-ativos')).toHaveTextContent(formatarMoeda(380000));
    expect(screen.getByTestId('total-passivos')).toHaveTextContent(formatarMoeda(140000));
  });

  it('critério 7: variações com sinal em texto', () => {
    renderizarApp('/patrimonio', cenario());
    expect(screen.getByTestId('var-mes-valor')).toHaveTextContent(`-${formatarMoeda(10000).replace('-', '')}`.replace('--', '-'));
    expect(screen.getByTestId('var-mes-pct')).toHaveTextContent('(-4,0%)');
    expect(screen.getByTestId('var-ano-valor').textContent).toMatch(/^\+/);
    expect(screen.getByTestId('var-ano-pct')).toHaveTextContent('(+140,0%)');
    expect(screen.getByText('queda')).toBeInTheDocument();
    expect(screen.getByText('alta')).toBeInTheDocument();
  });

  it('critérios 8, 9 e 10: cria meta com validação, mostra progresso, edita e exclui com confirmação', async () => {
    const u = userEvent.setup();
    renderizarApp('/patrimonio', cenario());
    const form = screen.getByRole('form', { name: 'Nova meta de patrimônio' });

    await u.click(within(form).getByRole('button', { name: 'Adicionar meta' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Informe um valor válido');
    await u.type(within(form).getByLabelText('Valor da meta (R$)'), '4.800,00');
    await u.click(within(form).getByRole('button', { name: 'Adicionar meta' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Informe o nome da meta.');

    await u.type(within(form).getByLabelText('Nome da meta'), 'Casa');
    await u.click(within(form).getByRole('button', { name: 'Adicionar meta' }));
    expect(lerEstadoSalvo().metasPatrimonio).toEqual([{ id: expect.any(String), nome: 'Casa', valor: 480000 }]);

    const barra = screen.getByRole('progressbar', { name: 'Progresso da meta Casa' });
    expect(barra).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByTestId('meta-pct-Casa')).toHaveTextContent('50,0%');
    expect(screen.getByText(`Faltam ${formatarMoeda(240000)}`)).toBeInTheDocument();

    // Meta já atingida.
    await u.type(within(form).getByLabelText('Nome da meta'), 'Reserva');
    await u.type(within(form).getByLabelText('Valor da meta (R$)'), '1000');
    await u.click(within(form).getByRole('button', { name: 'Adicionar meta' }));
    expect(screen.getByText('Meta atingida')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da meta Reserva' })).toHaveAttribute('aria-valuenow', '100');

    // Nome duplicado é recusado junto ao campo.
    await u.type(within(form).getByLabelText('Nome da meta'), 'casa');
    await u.type(within(form).getByLabelText('Valor da meta (R$)'), '10');
    await u.click(within(form).getByRole('button', { name: 'Adicionar meta' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Já existe uma meta com esse nome.');

    // Edição.
    await u.click(screen.getByRole('button', { name: 'Editar meta Casa' }));
    const edicao = screen.getByRole('form', { name: 'Editar meta Casa' });
    const valor = within(edicao).getByLabelText('Valor da meta (R$)');
    await u.clear(valor);
    await u.type(valor, '2.400,00');
    await u.click(within(edicao).getByRole('button', { name: 'Salvar meta' }));
    expect(lerEstadoSalvo().metasPatrimonio?.find((m) => m.nome === 'Casa')?.valor).toBe(240000);

    // Exclusão com confirmação.
    await u.click(screen.getByRole('button', { name: 'Excluir meta Casa' }));
    const dialogo = screen.getByRole('dialog');
    await u.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(lerEstadoSalvo().metasPatrimonio).toHaveLength(2);
    await u.click(screen.getByRole('button', { name: 'Excluir meta Casa' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(lerEstadoSalvo().metasPatrimonio?.map((m) => m.nome)).toEqual(['Reserva']);
  });

  it('critério 11: o botão exporta o CSV com o nome do dia', async () => {
    renderizarApp('/patrimonio', cenario());
    await userEvent.setup().click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixar).toHaveBeenCalledTimes(1);
    const [nome, conteudo, tipo] = baixar.mock.calls[0];
    expect(nome).toBe('patrimonio-2026-10-01.csv');
    expect(conteudo).toBe(csvPatrimonio(cenario(), HOJE));
    expect(tipo).toBe('text/csv');
  });

  it('critério 13: abrir a página não altera os dados salvos', () => {
    const e = cenario();
    renderizarApp('/patrimonio', e);
    expect(lerEstadoSalvo()).toEqual(JSON.parse(JSON.stringify(e)));
  });

  it('critério 14: sem Tailwind, só classes patrim-* e arquivos CSS próprios', () => {
    const brutos = (padrao: Record<string, unknown>) => Object.entries(padrao).map(([nome, texto]) => [nome, String(texto)] as const);
    const fontes = [
      ...brutos(import.meta.glob('../components/patrimonio/*.tsx', { query: '?raw', import: 'default', eager: true })),
      ...brutos(import.meta.glob('../pages/PatrimonioPage.tsx', { query: '?raw', import: 'default', eager: true })),
    ];
    expect(fontes.length).toBeGreaterThanOrEqual(4);
    for (const [nome, codigo] of fontes) {
      for (const m of codigo.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        for (const classe of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) expect(classe, nome).toMatch(/^patrim-|^\$\{/);
      }
    }
    const css = brutos(import.meta.glob('../components/patrimonio/*.css', { query: '?raw', import: 'default', eager: true }));
    expect(css.length).toBeGreaterThanOrEqual(3);
    for (const [, texto] of css) {
      expect(texto).not.toMatch(/@apply|@import "tailwindcss"/);
      expect(texto).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
