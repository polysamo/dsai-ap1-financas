import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  copiarMesAnterior,
  definirLimite,
  estadoDoConsumo,
  gastoPorCategoria,
  linhasOrcamento,
  percentualConsumido,
  removerLimite,
  totaisOrcamento,
} from '../domain/orcamento';
import { arquivarCategoria } from '../domain/transacoes';
import type { Conta, Transacao } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const conta: Conta = { id: 'a', nome: 'Banco', tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1 };

const desp = (id: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id,
  contaId: 'a',
  categoriaId: 'cat-lazer',
  tipo: 'despesa',
  valor,
  data: '2026-10-10',
  descricao: id,
  criadaEm: 1,
  ...parcial,
});

const base = (transacoes: Transacao[] = []) => construirEstado({ contas: [conta], transacoes });

describe('orçamento: domínio', () => {
  it('critério 3: gasto é a soma exata das despesas da categoria no mês, em todas as contas', () => {
    const gastos = gastoPorCategoria(
      [
        desp('1', 1000),
        desp('2', 2500, { contaId: 'b' }),
        desp('3', 999, { data: '2026-09-30' }),
        desp('4', 700, { data: '2026-11-01' }),
        desp('5', 5000, { tipo: 'receita', categoriaId: 'cat-salario' }),
        desp('6', 300, { categoriaId: 'cat-saude' }),
      ],
      '2026-10',
    );
    expect(gastos.get('cat-lazer')).toBe(3500);
    expect(gastos.get('cat-saude')).toBe(300);
    expect(gastos.has('cat-salario')).toBe(false);
  });

  it('critério 4: três faixas, com 80% e 100% exatos em atenção', () => {
    expect(estadoDoConsumo(7999, 10000)).toBe('normal');
    expect(estadoDoConsumo(8000, 10000)).toBe('atencao');
    expect(estadoDoConsumo(10000, 10000)).toBe('atencao');
    expect(estadoDoConsumo(10001, 10000)).toBe('estourado');
  });

  it('critério 5: gasto acima do limite deixa o restante negativo', () => {
    const estado = definirLimite(base([desp('1', 15000)]), 'cat-lazer', '2026-10', 10000);
    if (!estado.ok) throw new Error(estado.erro);
    const linha = linhasOrcamento(estado.valor, '2026-10').find((l) => l.categoria.id === 'cat-lazer')!;
    expect(linha.restante).toBe(-5000);
    expect(linha.estado).toBe('estourado');
    expect(linha.percentual).toBe(150);
  });

  it('critério 6: totais separam limites, gasto com limite e gasto sem orçamento', () => {
    let estado = base([desp('1', 4000), desp('2', 1000, { categoriaId: 'cat-saude' })]);
    const r = definirLimite(estado, 'cat-lazer', '2026-10', 10000);
    if (!r.ok) throw new Error(r.erro);
    estado = r.valor;
    expect(totaisOrcamento(linhasOrcamento(estado, '2026-10'))).toEqual({ limites: 10000, gastoComLimite: 4000, gastoSemOrcamento: 1000 });
  });

  it('critério 7: copia o mês anterior sem sobrescrever limites existentes', () => {
    let estado = base();
    for (const [cat, mes, lim] of [['cat-lazer', '2026-09', 100], ['cat-saude', '2026-09', 200], ['cat-lazer', '2026-10', 999]] as const) {
      const r = definirLimite(estado, cat, mes, lim);
      if (!r.ok) throw new Error(r.erro);
      estado = r.valor;
    }
    const copiado = copiarMesAnterior(estado, '2026-10');
    expect(copiado.ok).toBe(true);
    if (copiado.ok) {
      const de = (cat: string) => copiado.valor.orcamentos.find((o) => o.categoriaId === cat && o.mes === '2026-10')?.limite;
      expect(de('cat-lazer')).toBe(999);
      expect(de('cat-saude')).toBe(200);
    }
    expect(copiarMesAnterior(base(), '2026-10').ok).toBe(false);
  });

  it('critério 8: remover o limite não apaga transações', () => {
    const r1 = definirLimite(base([desp('1', 100)]), 'cat-lazer', '2026-10', 500);
    if (!r1.ok) throw new Error(r1.erro);
    const r2 = removerLimite(r1.valor, 'cat-lazer', '2026-10');
    expect(r2.ok && r2.valor.orcamentos).toHaveLength(0);
    expect(r2.ok && r2.valor.transacoes).toHaveLength(1);
  });

  it('critério 9: limite zero é aceito e qualquer gasto estoura, sem divisão por zero', () => {
    expect(estadoDoConsumo(1, 0)).toBe('estourado');
    expect(estadoDoConsumo(0, 0)).toBe('normal');
    expect(percentualConsumido(100, 0)).toBeNull();
    expect(definirLimite(base(), 'cat-lazer', '2026-10', 0).ok).toBe(true);
  });

  it('critério 10: limite negativo ou fracionário é rejeitado', () => {
    expect(definirLimite(base(), 'cat-lazer', '2026-10', -1).ok).toBe(false);
    expect(definirLimite(base(), 'cat-lazer', '2026-10', 10.5).ok).toBe(false);
    expect(definirLimite(base(), 'cat-salario', '2026-10', 100).ok).toBe(false);
  });

  it('critério 12: categoria arquivada com limite ou gasto no mês continua aparecendo; sem nada, some', () => {
    const arq = arquivarCategoria(base([desp('1', 100, { categoriaId: 'cat-saude' })]), 'cat-saude');
    if (!arq.ok) throw new Error(arq.erro);
    const arq2 = arquivarCategoria(arq.valor, 'cat-educacao');
    if (!arq2.ok) throw new Error(arq2.erro);
    const ids = linhasOrcamento(arq2.valor, '2026-10').map((l) => l.categoria.id);
    expect(ids).toContain('cat-saude');
    expect(ids).not.toContain('cat-educacao');
    expect(linhasOrcamento(arq2.valor, '2026-08').map((l) => l.categoria.id)).not.toContain('cat-saude');
  });
});

describe('orçamento: tela', () => {
  it('critérios 1 e 2: define o limite e mostra gasto, restante e percentual; persiste', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/orcamento?mes=2026-10', base([desp('1', 8500)]));
    await usuario.click(screen.getByRole('button', { name: 'Definir limite de Lazer' }));
    await usuario.type(screen.getByLabelText('Limite mensal de Lazer'), '100,00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar limite' }));
    const linha = screen.getByTestId('orcamento-cat-lazer');
    expect(within(linha).getByTestId('limite')).toHaveTextContent('R$ 100,00');
    expect(within(linha).getByTestId('gasto')).toHaveTextContent('R$ 85,00');
    expect(within(linha).getByTestId('restante')).toHaveTextContent('R$ 15,00');
    expect(within(linha).getByTestId('estado')).toHaveTextContent('Atenção: perto do limite · 85%');
    expect(lerEstadoSalvo().orcamentos).toEqual([{ categoriaId: 'cat-lazer', mes: '2026-10', limite: 10000 }]);
  });

  it('critério 4: o estado também é indicado por texto, não só por cor', () => {
    let estado = base([desp('1', 20000)]);
    const r = definirLimite(estado, 'cat-lazer', '2026-10', 10000);
    if (!r.ok) throw new Error(r.erro);
    estado = r.valor;
    renderizarApp('/orcamento?mes=2026-10', estado);
    const linha = screen.getByTestId('orcamento-cat-lazer');
    expect(within(linha).getByTestId('estado')).toHaveTextContent('Estourado');
    expect(within(linha).getByTestId('excedente')).toHaveTextContent('R$ 100,00');
    expect(within(linha).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('critério 10: limite negativo ou inválido mostra erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/orcamento?mes=2026-10', base());
    await usuario.click(screen.getByRole('button', { name: 'Definir limite de Lazer' }));
    await usuario.type(screen.getByLabelText('Limite mensal de Lazer'), '-5');
    await usuario.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent?.includes('não pode ser negativo'))).toBe(true);
    await usuario.clear(screen.getByLabelText('Limite mensal de Lazer'));
    await usuario.type(screen.getByLabelText('Limite mensal de Lazer'), 'abc');
    await usuario.click(screen.getByRole('button', { name: 'Salvar limite' }));
    expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent?.includes('valor válido'))).toBe(true);
    expect(lerEstadoSalvo().orcamentos).toEqual([]);
  });

  it('critério 7: oferece copiar o mês anterior e só copia após o clique', async () => {
    const usuario = userEvent.setup();
    const r = definirLimite(base(), 'cat-lazer', '2026-09', 5000);
    if (!r.ok) throw new Error(r.erro);
    const { store } = renderizarApp('/orcamento?mes=2026-10', r.valor);
    expect(store.getSnapshot().estado.orcamentos).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Copiar limites do mês anterior' }));
    expect(store.getSnapshot().estado.orcamentos.map((o) => o.mes).sort()).toEqual(['2026-09', '2026-10']);
    expect(screen.queryByRole('button', { name: 'Copiar limites do mês anterior' })).not.toBeInTheDocument();
  });

  it('critério 11: navegar entre meses não altera dados e o mês fica na URL', async () => {
    const usuario = userEvent.setup();
    const estado = base([desp('1', 100, { data: '2026-09-05' })]);
    const { store } = renderizarApp('/orcamento?mes=2026-10', estado);
    const antes = store.getSnapshot().estado;
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('setembro de 2026')).toBeInTheDocument();
    expect(within(screen.getByTestId('orcamento-cat-lazer')).getByTestId('gasto')).toHaveTextContent('R$ 1,00');
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
    expect(store.getSnapshot().estado).toBe(antes);
  });

  it('critério 6: mostra os três totais do mês', () => {
    let estado = base([desp('1', 4000), desp('2', 1000, { categoriaId: 'cat-saude' })]);
    const r = definirLimite(estado, 'cat-lazer', '2026-10', 10000);
    if (!r.ok) throw new Error(r.erro);
    estado = r.valor;
    renderizarApp('/orcamento?mes=2026-10', estado);
    expect(screen.getByTestId('total-limites')).toHaveTextContent('R$ 100,00');
    expect(screen.getByTestId('total-gasto-com-limite')).toHaveTextContent('R$ 40,00');
    expect(screen.getByTestId('total-gasto-sem-orcamento')).toHaveTextContent('R$ 10,00');
  });
});
