import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { contaPadrao, interpretar, lerData } from '../domain/lancamentoRapido';
import type { AppState, Conta, RegraCategoria, Transacao } from '../domain/types';
import { construirEstado, renderizarApp } from './helpers';

// 2026-10-07 é uma quarta-feira.
const HOJE = '2026-10-07';

const conta = (id: string, nome: string, parcial: Partial<Conta> = {}): Conta => ({ id, nome, tipo: 'corrente', saldoInicial: 0, arquivada: false, criadaEm: 1, ...parcial });

const estado = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({
    contas: [conta('itau', 'Itaú'), conta('nu', 'Nubank'), conta('cc', 'Conta Conjunta'), conta('velha', 'Antiga', { arquivada: true }), conta('cart', 'Cartão Visa', { tipo: 'cartao' })],
    ...parcial,
  });

const ler = (texto: string, s = estado()) => {
  const r = interpretar(texto, s, HOJE);
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

describe('lançamento rápido: interpretação', () => {
  it('critério 1: o primeiro valor em reais vira o valor; sem valor é erro', () => {
    expect(ler('almoço 32,50').valor).toBe(3250);
    expect(ler('aluguel R$ 1.200').valor).toBe(120000);
    expect(ler('15 pão 3').valor).toBe(1500);
    expect(interpretar('almoço', estado(), HOJE)).toMatchObject({ ok: false, erro: 'Informe o valor.' });
    expect(interpretar('   ', estado(), HOJE)).toMatchObject({ ok: false });
  });

  it('critério 2: despesa por padrão; + ou "recebi"/"receita" fazem receita', () => {
    expect(ler('almoço 32,50').tipo).toBe('despesa');
    expect(ler('+3500 salário')).toMatchObject({ tipo: 'receita', valor: 350000, descricao: 'salário' });
    expect(ler('recebi 200 freela')).toMatchObject({ tipo: 'receita', descricao: 'freela' });
    expect(ler('Receita 10 venda').descricao).toBe('venda');
  });

  it('critério 3: palavras e formatos de data; data inválida é erro', () => {
    expect(ler('pão 5').data).toBe(HOJE);
    expect(ler('pão 5 ontem').data).toBe('2026-10-06');
    expect(ler('pão 5 anteontem').data).toBe('2026-10-05');
    expect(ler('pão 5 03/09').data).toBe('2026-09-03');
    expect(ler('pão 5 3/9/25').data).toBe('2025-09-03');
    expect(ler('pão 5 03/09/2024').data).toBe('2024-09-03');
    expect(interpretar('pão 5 31/02', estado(), HOJE)).toMatchObject({ ok: false, erro: 'Data "31/02" inválida.' });
    expect(lerData('ontem', '2026-03-01')).toBe('2026-02-28');
  });

  it('critério 4: dia da semana vale a data mais recente até hoje', () => {
    expect(ler('pão 5 quarta').data).toBe(HOJE);
    expect(ler('pão 5 terça').data).toBe('2026-10-06');
    expect(ler('pão 5 sexta-feira').data).toBe('2026-10-02');
    expect(ler('pão 5 Quinta').data).toBe('2026-10-01');
    expect(ler('pão 5 sabado').data).toBe('2026-10-03');
  });

  it('critério 5: conta por @, por nome inteiro (o mais longo vence) e padrão', () => {
    expect(ler('pão 5 @nubank').contaId).toBe('nu');
    expect(ler('pão 5 @itau').contaId).toBe('itau');
    expect(ler('pão 5 @contaconjunta').contaId).toBe('cc');
    expect(ler('mercado 50 conta conjunta')).toMatchObject({ contaId: 'cc', descricao: 'mercado' });
    expect(ler('mercado 50 no itaú')).toMatchObject({ contaId: 'itau', descricao: 'mercado no' });
    const recente: Transacao = { id: 't', contaId: 'nu', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 1, data: HOJE, descricao: '', criadaEm: 9 };
    expect(contaPadrao(estado({ transacoes: [recente] }))).toBe('nu');
    expect(contaPadrao(estado())).toBe('cc');
    expect(ler('pão 5').contaId).toBe('cc');
  });

  it('critério 9: conta ou categoria inexistente é erro com o nome', () => {
    expect(interpretar('pão 5 @inter', estado(), HOJE)).toMatchObject({ ok: false, erro: 'Conta "inter" não encontrada.' });
    expect(interpretar('pão 5 @antiga', estado(), HOJE)).toMatchObject({ ok: false, campo: 'contaId' });
    expect(interpretar('pão 5 /viagens', estado(), HOJE)).toMatchObject({ ok: false, erro: 'Categoria "viagens" de despesa não encontrada.' });
    expect(interpretar('recebi 5 /lazer', estado(), HOJE)).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(interpretar('pão 5', construirEstado(), HOJE)).toMatchObject({ ok: false, erro: 'Cadastre uma conta antes de lançar.' });
  });

  it('critério 6: categoria por /, inclusive subcategoria, ou sugestão', () => {
    expect(ler('cinema 30 /Lazer').categoriaId).toBe('cat-lazer');
    const comSub = estado();
    comSub.categorias = [...comSub.categorias, { id: 'rest', nome: 'Restaurantes', tipo: 'despesa', arquivada: false, paiId: 'cat-alimentacao' }];
    expect(ler('jantar 80 /restaurantes', comSub).categoriaId).toBe('rest');
    expect(ler('coisa 10').categoriaId).toBe('cat-outros-despesa');
    const historico: Transacao = { id: 'h', contaId: 'nu', categoriaId: 'cat-transporte', tipo: 'despesa', valor: 1, data: HOJE, descricao: 'Uber', criadaEm: 1 };
    expect(ler('uber 23', estado({ transacoes: [historico] })).categoriaId).toBe('cat-transporte');
  });

  it('critério 7: tags digitadas mais as da regra, sem repetir', () => {
    const regra: RegraCategoria = { id: 'r', padrao: 'ifood', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: ['delivery', 'casa'], ativa: true };
    const r = ler('ifood 45 #Casa #fds', estado({ regras: [regra] }));
    expect(r.categoriaId).toBe('cat-alimentacao');
    expect(r.tags).toEqual(['casa', 'fds', 'delivery']);
  });

  it('critério 8: descrição com as palavras restantes, na ordem e grafia digitadas', () => {
    expect(ler('Almoço com o Time 32,50 ontem @nubank #trabalho').descricao).toBe('Almoço com o Time');
    expect(ler('32,50').descricao).toBe('');
  });
});

describe('lançamento rápido: tela', () => {
  it('critérios 10 e 11: prévia ao digitar, Enter lança, limpa e mostra o aviso', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/transacoes', estado());
    const campo = screen.getByRole('textbox', { name: 'Lançamento rápido' });
    await usuario.type(campo, 'cinema 30 @nubank /lazer #fds');
    const pecas = within(screen.getByRole('list', { name: 'Interpretação' }));
    expect(pecas.getByText('Despesa')).toBeInTheDocument();
    expect(pecas.getByText(/R\$\s30,00/)).toBeInTheDocument();
    expect(pecas.getByText('Nubank')).toBeInTheDocument();
    expect(pecas.getByText('Lazer')).toBeInTheDocument();
    expect(pecas.getByText('#fds')).toBeInTheDocument();
    await usuario.keyboard('{Enter}');
    const transacoes = store.getSnapshot().estado.transacoes;
    expect(transacoes).toHaveLength(1);
    expect(transacoes[0]).toMatchObject({ contaId: 'nu', categoriaId: 'cat-lazer', valor: 3000, descricao: 'cinema', tags: ['fds'] });
    expect(campo).toHaveValue('');
    expect(screen.getByText(/Lançado: cinema R\$\s30,00/)).toHaveAttribute('role', 'status');
    expect(store.getSnapshot().historico.passado).toHaveLength(1);
  });

  it('critério 10: erro aparece na prévia e o botão fica desabilitado', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/transacoes', estado());
    await usuario.type(screen.getByRole('textbox', { name: 'Lançamento rápido' }), 'pão @inter 5');
    expect(screen.getByText('Conta "inter" não encontrada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lançar' })).toBeDisabled();
  });

  it('critério 12: ajuda com a sintaxe', () => {
    renderizarApp('/transacoes', estado());
    expect(screen.getByText('Como escrever')).toBeInTheDocument();
    expect(screen.getByText(/Sem data, vale hoje/)).toBeInTheDocument();
  });
});
