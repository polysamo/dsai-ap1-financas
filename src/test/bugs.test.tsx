import { describe, expect, it } from 'vitest';
import { jurosCompostos, rendaFixa } from '../domain/calculadoras';
import { CHAVE_ESTADO, carregar } from '../storage/storage';

const estadoCom = (parcial: Record<string, unknown>) =>
  JSON.stringify({ schemaVersion: 2, contas: [], categorias: [], transacoes: [], orcamentos: [], metas: [], recorrencias: [], importacoes: [], pagamentosFatura: [], mapeamentosCsv: {}, ...parcial });

describe('BUG-001: localStorage com itens inválidos nas listas', () => {
  it.each([
    ['conta nula', { contas: [null] }],
    ['transação sem id', { transacoes: [{ valor: 1 }] }],
    ['categoria como texto', { categorias: ['x'] }],
    ['lista aninhada', { metas: [[]] }],
  ])('%s é tratado como dado corrompido', (_nome, parcial) => {
    localStorage.setItem(CHAVE_ESTADO, estadoCom(parcial));
    expect(carregar(localStorage).tipo).toBe('corrompido');
  });

  it('lista válida continua carregando', () => {
    localStorage.setItem(CHAVE_ESTADO, estadoCom({ contas: [{ id: 'a', nome: 'A' }] }));
    expect(carregar(localStorage).tipo).toBe('ok');
  });
});

describe('BUG-002: calculadoras com resultado fora do intervalo seguro', () => {
  it('juros compostos recusa resultado grande demais', () => {
    const r = jurosCompostos({ inicial: 100000000000, aporteMensal: 0, taxaMensal: 100, meses: 600 });
    expect(r).toMatchObject({ ok: false, erro: 'O resultado é grande demais para ser calculado. Reduza o prazo ou a taxa.' });
  });

  it('renda fixa recusa resultado grande demais', () => {
    const r = rendaFixa({ valor: 100000000000, dias: 36500, indexador: 'pre', taxaAnual: 1000, percentualCdi: 0, cdiAnual: 0, isento: false });
    expect(r).toMatchObject({ ok: false });
  });
});
