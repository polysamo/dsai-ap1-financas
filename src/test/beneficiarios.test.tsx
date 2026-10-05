import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  chaveBeneficiario,
  dadosBeneficiarios,
  desfazerMescla,
  destinoFinal,
  inicioDoPeriodo,
  listarBeneficiarios,
  mesclarBeneficiario,
  renomearBeneficiario,
  serieMensalBeneficiario,
} from '../domain/beneficiarios';
import type { AppState, Transacao } from '../domain/types';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { hojeISO } from '../domain/date';
import { construirEstado, renderizarApp } from './helpers';

const HOJE = '2026-10-20';

let seq = 0;
const t = (descricao: string, data: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'a',
  categoriaId: 'cat-transporte',
  tipo: 'despesa',
  valor,
  data,
  descricao,
  criadaEm: seq,
  ...parcial,
});

const estado = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({
    transacoes: [
      t('UBER *TRIP 8812', '2026-10-01', 2000),
      t('Uber Trip', '2026-10-11', 3000),
      t('uber trip', '2026-10-11', 1000, { categoriaId: 'cat-lazer' }),
      t('Uber do Brasil', '2026-09-15', 4000),
      t('Farmácia Pague Menos', '2026-08-03', 9000, { categoriaId: 'cat-saude' }),
      t('Salário', '2026-10-05', 500000, { tipo: 'receita', categoriaId: 'cat-salario' }),
      t('', '2026-10-05', 777),
      t('Posto Antigo', '2025-01-10', 5000),
      t('Compra futura', '2026-11-10', 5000),
    ],
    ...parcial,
  });

const lista = (s = estado(), periodo: Parameters<typeof listarBeneficiarios>[1] = 12) => listarBeneficiarios(s, periodo, HOJE);

const valor = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('beneficiários: agrupamento', () => {
  it('critério 1: chave sem acento, números e símbolos', () => {
    expect(chaveBeneficiario('UBER *TRIP 8812')).toBe('uber trip');
    expect(chaveBeneficiario('  Uber   Trip ')).toBe('uber trip');
    expect(chaveBeneficiario('Farmácia São João-123')).toBe('farmacia sao joao');
    expect(chaveBeneficiario('1234 *')).toBe('');
  });

  it('critério 2: só despesas com descrição, dentro do período e até hoje', () => {
    expect(lista().map((b) => b.chave)).toEqual(['farmacia pague menos', 'uber trip', 'uber do brasil']);
    expect(lista(estado(), 1).map((b) => b.chave)).toEqual(['uber trip']);
    expect(lista(estado(), 'tudo').map((b) => b.chave)).toContain('posto antigo');
    expect(inicioDoPeriodo(3, HOJE)).toBe('2026-08-01');
    expect(inicioDoPeriodo('tudo', HOJE)).toBeNull();
  });

  it('critério 3: totais, ticket, última compra, categoria e intervalo', () => {
    const uber = lista().find((b) => b.chave === 'uber trip')!;
    expect(uber).toMatchObject({ total: 6000, quantidade: 3, ticketMedio: 2000, ultima: '2026-10-11', categoriaId: 'cat-transporte', intervaloMedio: 10 });
    const farmacia = lista().find((b) => b.chave === 'farmacia pague menos')!;
    expect(farmacia.intervaloMedio).toBeNull();
  });

  it('critério 3: empate de frequência na categoria vale a de maior valor', () => {
    const s = construirEstado({ transacoes: [t('Loja', '2026-10-01', 100, { categoriaId: 'cat-lazer' }), t('Loja', '2026-10-02', 900, { categoriaId: 'cat-saude' })] });
    expect(lista(s)[0].categoriaId).toBe('cat-saude');
  });

  it('critérios 4 e 5: participação e nome automático pela descrição mais recente', () => {
    const r = lista();
    expect(r.map((b) => b.participacao)).toEqual([47.4, 31.6, 21.1]);
    expect(r.find((b) => b.chave === 'uber trip')?.nome).toBe('uber trip');
  });
});

describe('beneficiários: nomes e mesclas', () => {
  it('critério 6: renomear e voltar ao automático; limite de tamanho', () => {
    const s = valor(renomearBeneficiario(estado(), 'uber trip', '  Uber  '));
    expect(lista(s).find((b) => b.chave === 'uber trip')?.nome).toBe('Uber');
    const volta = valor(renomearBeneficiario(s, 'uber trip', ''));
    expect(dadosBeneficiarios(volta).nomes).toEqual({});
    expect(renomearBeneficiario(s, 'uber trip', 'x'.repeat(61))).toMatchObject({ ok: false, campo: 'nome' });
  });

  it('critério 7: mesclar soma no destino; cadeias seguem até o fim e ciclos são recusados', () => {
    const s = valor(mesclarBeneficiario(estado(), 'uber do brasil', 'uber trip'));
    const uber = lista(s).find((b) => b.chave === 'uber trip')!;
    expect(uber).toMatchObject({ total: 10000, quantidade: 4, mesclados: ['uber do brasil'] });
    expect(lista(s).some((b) => b.chave === 'uber do brasil')).toBe(false);
    expect(mesclarBeneficiario(s, 'uber trip', 'uber do brasil')).toMatchObject({ ok: false, erro: 'Não é possível mesclar um beneficiário nele mesmo.' });
    expect(mesclarBeneficiario(s, 'uber trip', 'uber trip').ok).toBe(false);
    const cadeia = valor(mesclarBeneficiario(s, 'uber trip', 'farmacia pague menos'));
    expect(destinoFinal(dadosBeneficiarios(cadeia).mesclas, 'uber do brasil')).toBe('farmacia pague menos');
    expect(lista(cadeia)[0]).toMatchObject({ chave: 'farmacia pague menos', total: 19000, mesclados: ['uber do brasil', 'uber trip'] });
    expect(destinoFinal({ a: 'b', b: 'a' }, 'a')).toBe('a');
  });

  it('critério 8: desfazer mescla devolve a origem à lista', () => {
    const s = valor(mesclarBeneficiario(estado(), 'uber do brasil', 'uber trip'));
    const volta = valor(desfazerMescla(s, 'uber do brasil'));
    expect(lista(volta).map((b) => b.chave)).toContain('uber do brasil');
    expect(desfazerMescla(volta, 'uber do brasil').ok).toBe(false);
  });

  it('critério 9: série mensal dos últimos 12 meses, com mesclas', () => {
    const s = valor(mesclarBeneficiario(estado(), 'uber do brasil', 'uber trip'));
    const serie = serieMensalBeneficiario(s, 'uber trip', HOJE);
    expect(serie).toHaveLength(12);
    expect(serie[0].mes).toBe('2025-11');
    expect(serie.slice(-2)).toEqual([
      { mes: '2026-09', total: 4000 },
      { mes: '2026-10', total: 6000 },
    ]);
  });

  it('critério 11: transações intactas e dados antigos sem beneficiarios carregam', () => {
    const antes = estado();
    const depois = valor(mesclarBeneficiario(valor(renomearBeneficiario(antes, 'uber trip', 'Uber')), 'uber do brasil', 'uber trip'));
    expect(depois.transacoes).toBe(antes.transacoes);
    const { beneficiarios: _sem, ...antigo } = estadoInicial();
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.beneficiarios).toEqual({ nomes: {}, mesclas: {} });
  });
});

describe('beneficiários: tela', () => {
  const recentes = () => {
    const hoje = hojeISO();
    return construirEstado({ transacoes: [t('iFood', hoje, 5000), t('IFOOD 123', hoje, 3000), t('Padaria', hoje, 1000)] });
  };

  it('critério 10: navegação e estado vazio', () => {
    expect(itensNavegacao).toContainEqual({ to: '/beneficiarios', rotulo: 'Beneficiários' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Visão geral')?.itens).toContain('/beneficiarios');
    renderizarApp('/beneficiarios', construirEstado());
    expect(screen.getByText('Nenhuma despesa com descrição no período')).toBeInTheDocument();
  });

  it('critérios 4, 6 e 9: lista ordenada, filtro, detalhe com link e renomear', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/beneficiarios', recentes());
    const itens = within(screen.getByRole('list', { name: 'Beneficiários por total gasto' })).getAllByRole('button');
    expect(itens.map((b) => b.querySelector('.benef-item__nome')?.textContent)).toEqual(['IFOOD 123', 'Padaria']);
    await usuario.type(screen.getByLabelText('Filtrar pelo nome'), 'pada');
    expect(within(screen.getByRole('list', { name: 'Beneficiários por total gasto' })).getAllByRole('button')).toHaveLength(1);
    await usuario.clear(screen.getByLabelText('Filtrar pelo nome'));
    await usuario.click(screen.getByRole('button', { name: /IFOOD 123/ }));
    expect(screen.getByRole('link', { name: 'Ver transações' })).toHaveAttribute('href', '/transacoes?texto=IFOOD+123');
    expect(screen.getByRole('table', { name: 'Total mensal de IFOOD 123' })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Nome exibido'), 'iFood');
    await usuario.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).nomes).toEqual({ ifood: 'iFood' });
  });

  it('critérios 7 e 8: mesclar pela tela e desfazer', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/beneficiarios', recentes());
    await usuario.click(screen.getByRole('button', { name: /Padaria/ }));
    await usuario.selectOptions(screen.getByLabelText('Mesclar em'), 'ifood');
    await usuario.click(screen.getByRole('button', { name: 'Mesclar' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).mesclas).toEqual({ padaria: 'ifood' });
    expect(screen.getByText('Descrições mescladas aqui')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Desfazer mescla de padaria' }));
    expect(dadosBeneficiarios(store.getSnapshot().estado).mesclas).toEqual({});
  });
});
