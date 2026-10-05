import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  aliquotaIof,
  aliquotaIr,
  aporteParaMeta,
  avistaOuParcelado,
  equivalencia,
  formatarTaxa,
  jurosCompostos,
  parsePercentual,
  rendaFixa,
  taxaEmbutida,
  type DadosRendaFixa,
} from '../domain/calculadoras';
import { lerFormulario } from '../components/calculadoras/useCalculadora';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO } from '../storage/storage';
import { construirEstado, renderizarApp } from './helpers';

const valor = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('calculadoras: juros compostos e meta', () => {
  it('critério 2: R$ 1.000,00 a 1% por 12 meses dá R$ 1.126,83, com totais coerentes', () => {
    const r = valor(jurosCompostos({ inicial: 100000, aporteMensal: 0, taxaMensal: 1, meses: 12 }));
    expect(r.saldoFinal).toBe(112683);
    expect(r.totalJuros).toBe(12683);
    expect(r.linhas).toHaveLength(12);
    expect(r.linhas[0]).toEqual({ mes: 1, aportado: 100000, juros: 1000, saldo: 101000 });
    expect(r.linhas.reduce((s, l) => s + l.juros, 0)).toBe(r.totalJuros);
  });

  it('critério 2: sem taxa o saldo é a soma dos aportes', () => {
    const r = valor(jurosCompostos({ inicial: 5000, aporteMensal: 20000, taxaMensal: 0, meses: 6 }));
    expect(r).toMatchObject({ saldoFinal: 125000, totalAportado: 125000, totalJuros: 0 });
  });

  it('critério 9: valida campos de juros compostos', () => {
    expect(jurosCompostos({ inicial: -1, aporteMensal: 0, taxaMensal: 1, meses: 12 })).toMatchObject({ ok: false, campo: 'inicial' });
    expect(jurosCompostos({ inicial: 0, aporteMensal: 0, taxaMensal: 101, meses: 12 })).toMatchObject({ ok: false, campo: 'taxaMensal' });
    expect(jurosCompostos({ inicial: 0, aporteMensal: 0, taxaMensal: 1, meses: 0 })).toMatchObject({ ok: false, campo: 'meses' });
    expect(jurosCompostos({ inicial: 0, aporteMensal: 0, taxaMensal: 1, meses: 601 })).toMatchObject({ ok: false, campo: 'meses' });
    expect(jurosCompostos({ inicial: 0, aporteMensal: 0, taxaMensal: 1, meses: 1.5 })).toMatchObject({ ok: false, campo: 'meses' });
  });

  it('critério 3: o aporte calculado alcança a meta e um centavo a menos não alcança', () => {
    for (const [objetivo, inicial, taxaMensal, meses] of [
      [5000000, 0, 0.8, 36],
      [1234567, 10000, 1.25, 7],
      [100000, 0, 0, 3],
    ]) {
      const aporte = valor(aporteParaMeta({ objetivo, inicial, taxaMensal, meses }));
      const com = valor(jurosCompostos({ inicial, aporteMensal: aporte, taxaMensal, meses }));
      const menos = valor(jurosCompostos({ inicial, aporteMensal: aporte - 1, taxaMensal, meses }));
      expect(com.saldoFinal).toBeGreaterThanOrEqual(objetivo);
      expect(menos.saldoFinal).toBeLessThan(objetivo);
    }
    expect(valor(aporteParaMeta({ objetivo: 100000, inicial: 0, taxaMensal: 0, meses: 3 }))).toBe(33334);
  });

  it('critério 3: valor inicial suficiente dispensa aporte; objetivo zero é recusado', () => {
    expect(valor(aporteParaMeta({ objetivo: 100000, inicial: 95000, taxaMensal: 1, meses: 12 }))).toBe(0);
    expect(aporteParaMeta({ objetivo: 0, inicial: 0, taxaMensal: 1, meses: 12 })).toMatchObject({ ok: false, campo: 'objetivo' });
  });
});

describe('calculadoras: taxas', () => {
  it('critério 4: 1% ao mês equivale a 12,6825% ao ano e volta', () => {
    const m = valor(equivalencia({ taxa: 1, periodo: 'mensal', inflacaoAnual: 0 }));
    expect(formatarTaxa(m.anual)).toBe('12,6825%');
    const a = valor(equivalencia({ taxa: m.anual, periodo: 'anual', inflacaoAnual: 0 }));
    expect(a.mensal).toBeCloseTo(1, 10);
  });

  it('critério 4: taxa real pela fórmula de Fisher', () => {
    const r = valor(equivalencia({ taxa: 12, periodo: 'anual', inflacaoAnual: 4.5 }));
    expect(r.realAnual).toBeCloseTo((1.12 / 1.045 - 1) * 100, 10);
    expect(r.realAnual).toBeLessThan(12 - 4.5);
    expect(equivalencia({ taxa: 1001, periodo: 'anual', inflacaoAnual: 0 })).toMatchObject({ ok: false, campo: 'taxa' });
    expect(equivalencia({ taxa: 1, periodo: 'mensal', inflacaoAnual: -1 })).toMatchObject({ ok: false, campo: 'inflacaoAnual' });
  });

  it('parsePercentual aceita vírgula, ponto e %, até 4 casas', () => {
    expect(parsePercentual('1,5')).toBe(1.5);
    expect(parsePercentual(' 12.6825 % ')).toBe(12.6825);
    expect(parsePercentual('1,23456')).toBeNull();
    expect(parsePercentual('abc')).toBeNull();
    expect(lerFormulario({ a: '10,00', b: 'x' }, { a: 'dinheiro', b: 'inteiro' })).toEqual({ ok: false, campo: 'b', erro: 'Informe um número inteiro.' });
    expect(lerFormulario({ a: '10,00', b: '3' }, { a: 'dinheiro', b: 'inteiro' })).toEqual({ ok: true, valores: { a: 1000, b: 3 } });
  });
});

describe('calculadoras: renda fixa', () => {
  const base: DadosRendaFixa = { valor: 1000000, dias: 365, indexador: 'pre', taxaAnual: 12, percentualCdi: 100, cdiAnual: 10, isento: false };

  it('critério 6: tabelas regressivas de IR e IOF nos limites', () => {
    expect([180, 181, 360, 361, 720, 721].map(aliquotaIr)).toEqual([22.5, 20, 20, 17.5, 17.5, 15]);
    expect([1, 10, 29, 30, 400].map(aliquotaIof)).toEqual([96, 66, 3, 0, 0]);
  });

  it('critério 5: um ano pré a 12% rende R$ 1.200,00 brutos e 17,5% de IR', () => {
    const r = valor(rendaFixa(base));
    expect(r).toMatchObject({ bruto: 120000, iof: 0, aliquotaIr: 17.5, ir: 21000, liquido: 99000, valorFinal: 1099000 });
    expect(r.taxaAnualLiquida).toBeCloseTo(9.9, 8);
  });

  it('critério 6: IR incide sobre o rendimento já sem o IOF', () => {
    const r = valor(rendaFixa({ ...base, dias: 10 }));
    expect(r.aliquotaIof).toBe(66);
    expect(r.iof).toBe(Math.round((r.bruto * 66) / 100));
    expect(r.ir).toBe(Math.round(((r.bruto - r.iof) * 22.5) / 100));
    expect(r.liquido).toBe(r.bruto - r.iof - r.ir);
  });

  it('critério 5: percentual do CDI e isenção', () => {
    const cdi = valor(rendaFixa({ ...base, indexador: 'cdi', percentualCdi: 120, cdiAnual: 10 }));
    expect(cdi.taxaAnualBruta).toBeCloseTo(12, 10);
    expect(cdi.bruto).toBe(120000);
    const isento = valor(rendaFixa({ ...base, isento: true }));
    expect(isento).toMatchObject({ ir: 0, aliquotaIr: 0, liquido: 120000 });
    expect(rendaFixa({ ...base, valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(rendaFixa({ ...base, indexador: 'cdi', cdiAnual: -2 })).toMatchObject({ ok: false, campo: 'cdiAnual' });
    expect(rendaFixa({ ...base, taxaAnual: -2, indexador: 'cdi' }).ok).toBe(true);
  });
});

describe('calculadoras: à vista ou parcelado', () => {
  it('critério 7: compara pelo valor presente e aponta a melhor opção', () => {
    const r = valor(avistaOuParcelado({ precoAvista: 90000, parcelas: 10, valorParcela: 10000, rendimentoMensal: 0.8, entrada: false }));
    expect(r.totalParcelado).toBe(100000);
    expect(r.valorPresente).toBe(Math.round(10000 * ((1 - Math.pow(1.008, -10)) / 0.008)));
    expect(r.melhor).toBe('avista');
    expect(r.diferenca).toBe(r.valorPresente - 90000);
    const caro = valor(avistaOuParcelado({ precoAvista: 99000, parcelas: 10, valorParcela: 10000, rendimentoMensal: 1, entrada: false }));
    expect(caro.melhor).toBe('parcelado');
  });

  it('critério 8: a taxa embutida iguala as parcelas ao preço à vista', () => {
    const taxa = taxaEmbutida(90000, 10000, 10, false)!;
    const vp = Array.from({ length: 10 }, (_, k) => 10000 / Math.pow(1 + taxa / 100, k + 1)).reduce((a, b) => a + b, 0);
    expect(Math.abs(vp - 90000)).toBeLessThan(1);
    expect(taxa).toBeGreaterThan(1.9);
    expect(taxa).toBeLessThan(2);
    expect(taxaEmbutida(100000, 10000, 10, false)).toBe(0);
    expect(taxaEmbutida(90000, 10000, 10, true)!).toBeGreaterThan(taxa);
    expect(taxaEmbutida(90000, 10000, 1, true)).toBeNull();
  });

  it('critério 9: valida parcelas e valores', () => {
    const d = { precoAvista: 90000, parcelas: 10, valorParcela: 10000, rendimentoMensal: 1, entrada: false };
    expect(avistaOuParcelado({ ...d, parcelas: 0 })).toMatchObject({ ok: false, campo: 'parcelas' });
    expect(avistaOuParcelado({ ...d, valorParcela: 0 })).toMatchObject({ ok: false, campo: 'valorParcela' });
    expect(avistaOuParcelado({ ...d, precoAvista: 0 })).toMatchObject({ ok: false, campo: 'precoAvista' });
  });
});

describe('calculadoras: tela', () => {
  it('critério 1: rota na navegação, grupo Planejamento e abas com a primeira selecionada', () => {
    expect(itensNavegacao).toContainEqual({ to: '/calculadoras', rotulo: 'Calculadoras' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Planejamento')?.itens).toContain('/calculadoras');
    renderizarApp('/calculadoras', construirEstado());
    const abas = within(screen.getByRole('tablist', { name: 'Calculadoras' })).getAllByRole('tab');
    expect(abas).toHaveLength(5);
    expect(abas[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('critérios 2, 10, 11 e 12: calcula, anuncia, mostra gráfico e tabela, sem gravar nada', async () => {
    const user = userEvent.setup();
    renderizarApp('/calculadoras', construirEstado());
    const antes = localStorage.getItem(CHAVE_ESTADO);
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    const form = screen.getByRole('form', { name: 'Juros compostos' });
    expect(within(form).getByText('Saldo final').nextSibling).toHaveTextContent('R$ 1.126,83');
    expect(within(form).getByText('Saldo final').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    expect(within(form).getByRole('img', { name: /Gráfico da evolução do saldo/ })).toBeInTheDocument();
    expect(within(form).getByRole('table', { name: 'Evolução mês a mês' }).querySelectorAll('tbody tr')).toHaveLength(12);
    expect(localStorage.getItem(CHAVE_ESTADO)).toBe(antes);
  });

  it('critério 9: erro junto ao campo e sem resultado', async () => {
    const user = userEvent.setup();
    renderizarApp('/calculadoras', construirEstado());
    const prazo = screen.getByLabelText('Prazo (meses)');
    await user.clear(prazo);
    await user.type(prazo, '700');
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(screen.getByRole('alert')).toHaveTextContent('O prazo em meses deve ser um número inteiro de 1 a 600.');
    expect(prazo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Saldo final')).not.toBeInTheDocument();
  });

  it('critérios 1 e 7: troca de aba pelo teclado e veredito do parcelamento', async () => {
    const user = userEvent.setup();
    renderizarApp('/calculadoras', construirEstado());
    screen.getByRole('tab', { name: 'Juros compostos' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'À vista ou parcelado' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByRole('heading', { name: 'À vista é mais barato' })).toBeInTheDocument();
  });

  it('critério 5: renda fixa pré-fixada pela tela', async () => {
    const user = userEvent.setup();
    renderizarApp('/calculadoras', construirEstado());
    await user.click(screen.getByRole('tab', { name: 'Renda fixa' }));
    await user.selectOptions(screen.getByLabelText('Rentabilidade'), 'pre');
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(screen.getByText('Valor final líquido').nextSibling).toHaveTextContent('R$ 10.990,00');
    expect(screen.getByText('IR (17,5%)')).toBeInTheDocument();
  });
});
