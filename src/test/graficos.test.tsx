import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AreaChart, BarChart, HorizontalBarChart, LineChart, PieChart, StackedBarChart } from '../charts';
import { ehCompacta, configuracaoDoGrafico, LARGURA_COMPACTA_PX } from '../charts/compacto';
import { formatarEixo, formatarParticipacao, formatarValor } from '../charts/formato';
import { TOTAL_CORES, corDaSerie, corDe } from '../charts/paleta';
import { MAX_FATIAS, NOME_OUTRAS, agruparFatias, tabelaDeFatias, tabelaDeSeries } from '../charts/tabela';
import { construirEstado, renderizarApp } from './helpers';

// `css: false` no Vitest esvazia imports de CSS, então os tokens são lidos direto do disco.
const tokens = readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf-8');

/** Luminância relativa de uma cor `#rrggbb` (WCAG 2.x). */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
};

/** Variáveis `--nome: #hex` de todos os blocos cujo seletor (sem espaços) está em `seletores`; blocos posteriores vencem. */
function variaveis(seletores: string[]): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const bloco of tokens.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const seletor = bloco[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
    if (!seletores.includes(seletor)) continue;
    for (const m of bloco[2].matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) resultado[m[1]] = m[2];
  }
  return resultado;
}

describe('gráficos: paleta e contraste', () => {
  const escuro = variaveis([':root,html.dark', ':root']);
  const claro = variaveis(['html.claro']);

  it('critério 1: as 8 cores existem nos dois temas e cada uma tem contraste mínimo de 3:1 com a superfície', () => {
    for (const [tema, vars] of [['escuro', escuro], ['claro', claro]] as const) {
      const superficie = vars['--cor-superficie'];
      expect(superficie, tema).toMatch(/^#/);
      for (let n = 1; n <= TOTAL_CORES; n++) {
        const cor = vars[`--grafico-${n}`];
        expect(cor, `${tema} --grafico-${n}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contraste(cor, superficie), `${tema} --grafico-${n}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('as cores de cada tema são todas diferentes', () => {
    for (const vars of [escuro, claro]) {
      const cores = Array.from({ length: TOTAL_CORES }, (_, i) => vars[`--grafico-${i + 1}`]);
      expect(new Set(cores).size).toBe(TOTAL_CORES);
    }
  });

  it('corDaSerie usa variáveis CSS e recomeça depois da oitava', () => {
    expect(corDaSerie(1)).toBe('var(--grafico-1)');
    expect(corDaSerie(8)).toBe('var(--grafico-8)');
    expect(corDaSerie(9)).toBe('var(--grafico-1)');
    expect(corDaSerie(0)).toBe('var(--grafico-8)');
    expect(corDe(undefined, 2)).toBe('var(--grafico-3)');
    expect(corDe(5, 0)).toBe('var(--grafico-5)');
  });
});

describe('gráficos: formatadores pt-BR', () => {
  it('critério 4: eixo monetário compacto, com sinal', () => {
    expect([15000, 150000, 1_500_000, 250_000_000, -150000, 0].map((c) => formatarEixo(c, 'moeda'))).toEqual(['R$ 150', 'R$ 1,5 mil', 'R$ 15 mil', 'R$ 2,5 mi', '-R$ 1,5 mil', 'R$ 0']);
  });

  it('valor completo de moeda, percentual e número', () => {
    expect(formatarValor(123456, 'moeda')).toMatch(/^R\$\s1\.234,56$/);
    expect(formatarValor(-5000, 'moeda')).toMatch(/^-R\$\s50,00$/);
    expect(formatarValor(12.34, 'percentual')).toBe('12,3%');
    expect(formatarValor(1234.5, 'numero')).toBe('1.234,5');
    expect(formatarEixo(42, 'percentual')).toBe('42%');
    expect(formatarEixo(1234.56, 'numero')).toBe('1.234,6');
  });

  it('participação com uma casa e total zero seguro', () => {
    expect([formatarParticipacao(1, 3), formatarParticipacao(1, 2), formatarParticipacao(5, 0)]).toEqual(['33,3%', '50%', '0%']);
  });
});

describe('gráficos: tabela alternativa', () => {
  const series = [
    { chave: 'r', nome: 'Receitas' },
    { chave: 'd', nome: 'Despesas' },
  ];
  const dados = [
    { mes: '2026-09', r: 100000, d: 60000 },
    { mes: '2026-10', r: 120000, d: 70000 },
  ];

  it('critério 3: categoria na primeira coluna, uma coluna por série e total opcional', () => {
    const t = tabelaDeSeries(dados, 'mes', 'Mês', series, 'moeda', (m) => `M${m}`, true);
    expect(t.colunas).toEqual(['Mês', 'Receitas', 'Despesas']);
    expect(t.linhas.map((l) => l.rotulo)).toEqual(['M2026-09', 'M2026-10']);
    expect(t.linhas[0].celulas[0]).toMatch(/^R\$\s1\.000,00$/);
    expect(t.total?.rotulo).toBe('Total');
    expect(t.total?.celulas[0]).toMatch(/^R\$\s2\.200,00$/);
    expect(tabelaDeSeries(dados, 'mes', 'Mês', series, 'moeda').total).toBeUndefined();
  });

  it('valores ausentes ou inválidos contam como zero', () => {
    const t = tabelaDeSeries([{ x: 'a', r: 'texto' }, { x: 'b' }], 'x', 'X', [{ chave: 'r', nome: 'R' }], 'numero', String, true);
    expect(t.linhas.map((l) => l.celulas[0])).toEqual(['0', '0']);
  });

  it('critério 8: tabela do pizza com valor, participação e total', () => {
    const t = tabelaDeFatias([{ nome: 'Aluguel', valor: 75000 }, { nome: 'Mercado', valor: 25000 }], 'Categoria', 'moeda');
    expect(t.colunas).toEqual(['Categoria', 'Valor', 'Participação']);
    expect(t.linhas[0].celulas[1]).toBe('75%');
    expect(t.total?.celulas).toEqual([expect.stringMatching(/R\$\s1\.000,00/), '100%']);
  });
});

describe('gráficos: agrupamento de fatias', () => {
  it('critério 8: até 6 fatias não agrupa e ignora zeros, ordenando do maior para o menor', () => {
    const r = agruparFatias([{ nome: 'a', valor: 1 }, { nome: 'b', valor: 5 }, { nome: 'z', valor: 0 }]);
    expect(r.map((f) => f.nome)).toEqual(['b', 'a']);
  });

  it('com mais de 6 fatias junta as menores que 3% em "Outras", por último', () => {
    const fatias = [
      { nome: 'A', valor: 4000 }, { nome: 'B', valor: 3000 }, { nome: 'C', valor: 2000 }, { nome: 'D', valor: 500 },
      { nome: 'E', valor: 100 }, { nome: 'F', valor: 150 }, { nome: 'G', valor: 250 },
    ];
    const r = agruparFatias(fatias);
    expect(r.map((f) => f.nome)).toEqual(['A', 'B', 'C', 'D', NOME_OUTRAS]);
    expect(r[r.length - 1].valor).toBe(500);
    expect(r.reduce((s, f) => s + f.valor, 0)).toBe(10000);
    expect(MAX_FATIAS).toBe(6);
  });

  it('com mais de 6 fatias todas grandes, nada é agrupado', () => {
    const r = agruparFatias(Array.from({ length: 7 }, (_, i) => ({ nome: `F${i}`, valor: 100 })));
    expect(r).toHaveLength(7);
  });
});

describe('gráficos: modo compacto', () => {
  it('critério 7: abaixo de 768 px é compacto; o modo compacto é menor, sem legenda e com menos marcas', () => {
    expect([ehCompacta(360), ehCompacta(767), ehCompacta(LARGURA_COMPACTA_PX), ehCompacta(1280)]).toEqual([true, true, false, false]);
    const c = configuracaoDoGrafico(true);
    const n = configuracaoDoGrafico(false);
    expect(c.altura).toBeLessThan(n.altura);
    expect(c.mostrarLegenda).toBe(false);
    expect(n.mostrarLegenda).toBe(true);
    expect(c.espacoMarcas).toBeGreaterThan(n.espacoMarcas);
    expect(c.larguraEixoY).toBeLessThan(n.larguraEixoY);
  });
});

describe('gráficos: componentes', () => {
  const dados = [
    { mes: 'jan', a: 100000, b: 50000 },
    { mes: 'fev', a: 120000, b: 70000 },
  ];
  const series = [
    { chave: 'a', nome: 'Receitas' },
    { chave: 'b', nome: 'Despesas' },
  ];
  const props = { descricao: 'Descrição do gráfico', rotuloTabela: 'Tabela do gráfico', dados, chaveX: 'mes', rotuloX: 'Mês', series };

  it.each([
    ['BarChart', BarChart],
    ['HorizontalBarChart', HorizontalBarChart],
    ['LineChart', LineChart],
    ['AreaChart', AreaChart],
    ['StackedBarChart', StackedBarChart],
  ])('critérios 2 e 6: %s tem role img, legenda por texto e tabela em "Ver como tabela"', async (_nome, Componente) => {
    render(<Componente {...props} titulo="Meu gráfico" />);
    expect(screen.getByRole('img', { name: 'Descrição do gráfico' })).toBeInTheDocument();
    expect(screen.getByText('Meu gráfico')).toBeInTheDocument();
    const legenda = screen.getByRole('list', { name: 'Legenda' });
    expect(within(legenda).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Receitas', 'Despesas']);
    await userEvent.click(screen.getByText('Ver como tabela'));
    const tabela = screen.getByRole('table', { name: 'Tabela do gráfico' });
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Mês', 'Receitas', 'Despesas']);
    expect(within(tabela).getAllByRole('row')).toHaveLength(dados.length + 1 + (Componente === StackedBarChart ? 1 : 0));
  });

  it('série única não mostra legenda e o formatador de X vale na tabela', () => {
    render(<BarChart {...props} series={[series[0]]} formatarX={(m) => String(m).toUpperCase()} />);
    expect(screen.queryByRole('list', { name: 'Legenda' })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'JAN', hidden: true })).toBeInTheDocument();
  });

  it('critério 2: sem dados mostra a mensagem no lugar do gráfico, sem img nem tabela', () => {
    const { rerender } = render(<BarChart {...props} dados={[]} vazio="Nenhuma despesa no mês." />);
    expect(screen.getByText('Nenhuma despesa no mês.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver como tabela')).not.toBeInTheDocument();
    rerender(<LineChart {...props} dados={[]} />);
    expect(screen.getByText('Sem dados para mostrar.')).toBeInTheDocument();
  });

  it('semTabela esconde a tabela automática e o desenho continua', () => {
    render(<LineChart {...props} semTabela referencia={{ valor: 80000, rotulo: 'Meta' }} eixoNumerico={false} />);
    expect(screen.getByRole('img', { name: 'Descrição do gráfico' })).toBeInTheDocument();
    expect(screen.queryByText('Ver como tabela')).not.toBeInTheDocument();
  });

  it('critério 8: PieChart agrupa e a tabela mostra valor e participação por texto', async () => {
    const fatias = [
      { nome: 'Aluguel', valor: 50000 }, { nome: 'Mercado', valor: 30000 }, { nome: 'Lazer', valor: 10000 }, { nome: 'Saúde', valor: 5000 },
      { nome: 'Transporte', valor: 2500 }, { nome: 'Café', valor: 1500 }, { nome: 'Doação', valor: 600 }, { nome: 'Taxas', valor: 400 },
    ];
    render(<PieChart descricao="Pizza" rotuloTabela="Despesas" fatias={fatias} rotuloX="Categoria" rosca />);
    expect(screen.getByRole('img', { name: 'Pizza' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Legenda' })).getByText('Outras')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Ver como tabela'));
    const tabela = screen.getByRole('table', { name: 'Despesas' });
    expect(within(tabela).getByRole('rowheader', { name: 'Outras' })).toBeInTheDocument();
    expect(within(tabela).getByRole('row', { name: /Aluguel/ })).toHaveTextContent('50%');
    expect(within(tabela).getByRole('row', { name: /Total/ })).toHaveTextContent('100%');
  });

  it('PieChart sem fatias positivas mostra o vazio', () => {
    render(<PieChart descricao="Pizza" rotuloTabela="T" fatias={[{ nome: 'x', valor: 0 }]} rotuloX="C" vazio="Nada a mostrar." />);
    expect(screen.getByText('Nada a mostrar.')).toBeInTheDocument();
  });
});

describe('gráficos: nas telas', () => {
  it('critério 10: o dashboard alterna entre barras e rosca mantendo a tabela das despesas', async () => {
    const hojeIso = new Date();
    const dia = `${hojeIso.getFullYear()}-${String(hojeIso.getMonth() + 1).padStart(2, '0')}-${String(hojeIso.getDate()).padStart(2, '0')}`;
    const estado = construirEstado({
      contas: [{ id: 'a', nome: 'Conta', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1 }],
      transacoes: [
        { id: 't1', contaId: 'a', categoriaId: 'cat-alimentacao', tipo: 'despesa', valor: 30000, data: dia, descricao: 'Mercado', criadaEm: 1 },
        { id: 't2', contaId: 'a', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 10000, data: dia, descricao: 'Cinema', criadaEm: 2 },
      ],
    });
    renderizarApp('/', estado);
    expect(screen.getByRole('img', { name: /Gráfico de barras das despesas por categoria/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Barras' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Rosca' }));
    expect(screen.getByRole('img', { name: /Gráfico de rosca das despesas por categoria/ })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Despesas por categoria', hidden: true });
    expect(within(tabela).getByRole('row', { name: /Alimentação/, hidden: true })).toHaveTextContent('75%');
  });
});
