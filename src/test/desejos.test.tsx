import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  analisarDesejo,
  comprarDesejo,
  criarDesejo,
  desistirDesejo,
  editarDesejo,
  excluirDesejo,
  listaDesejos,
  metaDoDesejo,
  ordenarAtivos,
  textoVeredito,
  totaisDesejos,
  type DadosDesejo,
  type Desejo,
} from '../domain/desejos';
import type { AppState, Conta, Transacao } from '../domain/types';
import { gruposNavegacao, itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

const conta = (id: string, tipo: Conta['tipo'], saldoInicial = 0, parcial: Partial<Conta> = {}): Conta => ({ id, nome: id, tipo, saldoInicial, arquivada: false, criadaEm: 1, ...parcial });

let seq = 0;
const t = (data: string, tipo: Transacao['tipo'], valor: number): Transacao => ({
  id: `t${++seq}`,
  contaId: 'inv',
  categoriaId: tipo === 'receita' ? 'cat-salario' : 'cat-alimentacao',
  tipo,
  valor,
  data,
  descricao: '',
  criadaEm: seq,
});

/** Receita de R$ 10.000 e despesa de R$ 6.000 em cada um dos 3 meses de referência. */
const historico = () => ['2026-07', '2026-08', '2026-09'].flatMap((m) => [t(`${m}-05`, 'receita', 1000000), t(`${m}-05`, 'despesa', 600000)]);

const estado = (parcial: Partial<AppState> = {}): AppState =>
  construirEstado({ contas: [conta('cc', 'corrente', 3000000), conta('inv', 'investimento'), conta('velha', 'corrente', 0, { arquivada: true })], transacoes: historico(), ...parcial });

const dados = (parcial: Partial<DadosDesejo> = {}): DadosDesejo => ({ nome: 'Fone', preco: 200000, prioridade: 'media', categoriaId: 'cat-lazer', esperaDias: 0, ...parcial });

const valor = <T,>(r: { ok: true; valor: T } | { ok: false; erro: string }): T => {
  if (!r.ok) throw new Error(r.erro);
  return r.valor;
};

const comDesejo = (parcial: Partial<DadosDesejo> = {}, base = estado()) => {
  const s = valor(criarDesejo(base, dados(parcial), HOJE));
  return { s, d: listaDesejos(s)[listaDesejos(s).length - 1] };
};

describe('desejos: cadastro e lista', () => {
  it('critério 1: valida campos e calcula a data de espera', () => {
    const tenta = (p: Partial<DadosDesejo>) => criarDesejo(estado(), dados(p), HOJE);
    expect(tenta({ nome: ' ' })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ nome: 'x'.repeat(61) })).toMatchObject({ ok: false, campo: 'nome' });
    expect(tenta({ preco: 0 })).toMatchObject({ ok: false, campo: 'preco' });
    expect(tenta({ categoriaId: 'cat-salario' })).toMatchObject({ ok: false, campo: 'categoriaId' });
    expect(tenta({ esperaDias: 15 })).toMatchObject({ ok: false, campo: 'esperaDias' });
    expect(comDesejo({ esperaDias: 30 }).d).toMatchObject({ criadoEm: HOJE, esperarAte: '2026-11-14', situacao: 'ativo', nome: 'Fone' });
    expect(comDesejo({ esperaDias: undefined }).d.esperarAte).toBe('2026-11-14');
    expect(comDesejo({ esperaDias: 90 }).d.esperarAte).toBe('2027-01-13');
  });

  it('critério 2: ordena por prioridade e depois do mais antigo; total dos ativos', () => {
    const d = (id: string, prioridade: Desejo['prioridade'], criadoEm: string, preco = 100): Desejo => ({ id, nome: id, preco, prioridade, categoriaId: 'cat-lazer', criadoEm, esperarAte: criadoEm, situacao: 'ativo' });
    const lista = [d('b1', 'baixa', '2026-01-01'), d('a2', 'alta', '2026-05-01'), d('a1', 'alta', '2026-02-01'), d('m1', 'media', '2026-01-01'), { ...d('x', 'alta', '2026-01-01', 999), situacao: 'desistido' as const }];
    expect(ordenarAtivos(lista).map((x) => x.id)).toEqual(['a1', 'a2', 'm1', 'b1']);
    expect(totaisDesejos(lista)).toEqual({ ativos: 400, economia: 999 });
  });

  it('critério 9: edita só ativos e exclui', () => {
    const { s, d } = comDesejo();
    const editado = valor(editarDesejo(s, d.id, { nome: 'Fone bom', preco: 250000, prioridade: 'alta', categoriaId: 'cat-educacao' }));
    expect(listaDesejos(editado)[0]).toMatchObject({ nome: 'Fone bom', preco: 250000, prioridade: 'alta', categoriaId: 'cat-educacao', esperarAte: d.esperarAte });
    const desistido = valor(desistirDesejo(s, d.id, HOJE));
    expect(editarDesejo(desistido, d.id, dados()).ok).toBe(false);
    expect(listaDesejos(valor(excluirDesejo(s, d.id)))).toEqual([]);
    expect(excluirDesejo(s, 'nada').ok).toBe(false);
  });
});

describe('desejos: análise', () => {
  const analise = (parcial: Partial<DadosDesejo> = {}, base = estado()) => {
    const { s, d } = comDesejo(parcial, base);
    return analisarDesejo(s, d, HOJE);
  };

  it('critérios 3 e 4: tudo aprovado dá "Pode comprar", com textos de cada verificação', () => {
    const a = analise();
    expect(a.veredito).toEqual({ tipo: 'pode' });
    expect(textoVeredito(a.veredito)).toBe('Pode comprar');
    expect(a.verificacoes.map((v) => [v.id, v.aprovada])).toEqual([
      ['espera', true],
      ['reserva', true],
      ['orcamento', true],
      ['sobra', true],
    ]);
    expect(a.verificacoes[1].texto).toMatch(/^Sobram R\$\s28\.000,00, 4,7 meses de despesas \(mínimo 3\)\.$/);
    expect(a.verificacoes[2].texto).toBe('Sem limite definido neste mês.');
    expect(a.verificacoes[3].texto).toMatch(/^Custa 0,5 meses da sua sobra média \(R\$\s4\.000,00\)\.$/);
  });

  it('critério 4: só a espera faltando dá "Espere mais N dias"', () => {
    const a = analise({ esperaDias: 7 });
    expect(a.veredito).toEqual({ tipo: 'espere', dias: 7 });
    expect(textoVeredito(a.veredito)).toBe('Espere mais 7 dias');
    expect(a.verificacoes[0].texto).toBe('Faltam 7 dias.');
  });

  it('critério 3: reserva abaixo de 3 meses reprova e dá "Ainda não"', () => {
    const a = analise({ preco: 1500000, esperaDias: 7 });
    expect(a.verificacoes.find((v) => v.id === 'reserva')?.aprovada).toBe(false);
    expect(textoVeredito(a.veredito)).toBe('Ainda não');
  });

  it('critério 3: orçamento da categoria no mês atual', () => {
    const comLimite = estado({ orcamentos: [{ categoriaId: 'cat-lazer', mes: '2026-10', limite: 150000 }] });
    const v = analise({}, comLimite).verificacoes.find((x) => x.id === 'orcamento')!;
    expect(v.aprovada).toBe(false);
    expect(v.texto).toMatch(/^Restam R\$\s1\.500,00 de R\$\s1\.500,00 em Lazer\.$/);
    const folgado = estado({ orcamentos: [{ categoriaId: 'cat-lazer', mes: '2026-10', limite: 500000 }] });
    expect(analise({}, folgado).verificacoes.find((x) => x.id === 'orcamento')?.aprovada).toBe(true);
  });

  it('critério 3: sobra média não positiva reprova; sem histórico, reserva só precisa cobrir o preço', () => {
    const negativo = estado({ transacoes: ['2026-07', '2026-08', '2026-09'].flatMap((m) => [t(`${m}-05`, 'receita', 100), t(`${m}-05`, 'despesa', 200)]) });
    expect(analise({}, negativo).verificacoes.find((v) => v.id === 'sobra')).toMatchObject({ aprovada: false, texto: 'Seu resultado médio mensal não é positivo.' });
    const semHistorico = estado({ transacoes: [] });
    const a = analise({}, semHistorico);
    expect(a.verificacoes.find((v) => v.id === 'reserva')?.aprovada).toBe(true);
    expect(a.verificacoes.find((v) => v.id === 'sobra')?.texto).toBe('Sem meses completos para calcular a sobra.');
  });
});

describe('desejos: conclusão', () => {
  it('critério 5: comprar cria a despesa e marca o item', () => {
    const { s, d } = comDesejo();
    const comprado = valor(comprarDesejo(s, d.id, 'cc', '2026-10-16'));
    const transacao = comprado.transacoes[comprado.transacoes.length - 1];
    expect(transacao).toMatchObject({ contaId: 'cc', categoriaId: 'cat-lazer', tipo: 'despesa', valor: 200000, data: '2026-10-16', descricao: 'Fone' });
    expect(listaDesejos(comprado)[0]).toMatchObject({ situacao: 'comprado', concluidoEm: '2026-10-16', transacaoId: transacao.id });
    expect(comprarDesejo(s, d.id, 'velha', HOJE)).toMatchObject({ ok: false, campo: 'contaId' });
    expect(comprarDesejo(s, d.id, 'cc', '2026-13-01')).toMatchObject({ ok: false, campo: 'data' });
    expect(comprarDesejo(comprado, d.id, 'cc', HOJE).ok).toBe(false);
  });

  it('critérios 6 e 7: desistir soma na economia; excluir comprado mantém a transação', () => {
    const { s, d } = comDesejo();
    const desistido = valor(desistirDesejo(s, d.id, HOJE));
    expect(listaDesejos(desistido)[0]).toMatchObject({ situacao: 'desistido', concluidoEm: HOJE });
    expect(totaisDesejos(listaDesejos(desistido)).economia).toBe(200000);
    expect(desistido.transacoes).toHaveLength(s.transacoes.length);
    const comprado = valor(comprarDesejo(s, d.id, 'cc', HOJE));
    const semItem = valor(excluirDesejo(comprado, d.id));
    expect(semItem.transacoes).toHaveLength(comprado.transacoes.length);
  });

  it('critério 8: criar meta com nome e preço, mantendo o item', () => {
    const { s, d } = comDesejo();
    const comMeta = valor(metaDoDesejo(s, d.id, HOJE));
    expect(comMeta.metas[0]).toMatchObject({ nome: 'Fone', valorAlvo: 200000, status: 'ativa' });
    expect(comMeta.metas[0].prazo).toBeUndefined();
    expect(listaDesejos(comMeta)).toHaveLength(1);
  });

  it('critério 10: dados antigos sem desejos carregam com lista vazia', () => {
    const { desejos: _sem, ...antigo } = estadoInicial();
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.desejos).toEqual([]);
  });
});

describe('desejos: tela', () => {
  it('critério 11: navegação e estado vazio', () => {
    expect(itensNavegacao).toContainEqual({ to: '/desejos', rotulo: 'Desejos' });
    expect(gruposNavegacao.find((g) => g.titulo === 'Planejamento')?.itens).toContain('/desejos');
    renderizarApp('/desejos', estado());
    expect(screen.getByText('Nenhum desejo anotado')).toBeInTheDocument();
    expect(screen.getByText(/regra dos 30 dias/)).toBeInTheDocument();
  });

  it('critérios 1, 4 e 10: anota pela tela, mostra veredito e sobrevive a recarregar', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/desejos', estado());
    const form = within(screen.getByRole('form', { name: 'Novo desejo' }));
    await usuario.type(form.getByLabelText('O que você quer comprar'), 'Bicicleta');
    await usuario.type(form.getByLabelText('Preço'), '1.200,00');
    await usuario.selectOptions(form.getByLabelText('Categoria'), 'cat-lazer');
    await usuario.click(form.getByRole('button', { name: 'Adicionar desejo' }));
    const cartao = within(screen.getByRole('article', { name: 'Bicicleta' }));
    expect(cartao.getByText('Espere mais 30 dias')).toBeInTheDocument();
    expect(cartao.getByText(/Período de espera/)).toBeInTheDocument();
    expect(lerEstadoSalvo().desejos?.[0]).toMatchObject({ nome: 'Bicicleta', preco: 120000 });
    expect(screen.getByTestId('total-ativos')).toHaveTextContent('R$ 1.200,00');
  });

  it('critérios 5, 6 e 7: comprar pela tela, desistir e ver os concluídos', async () => {
    const usuario = userEvent.setup();
    const { s } = comDesejo({ nome: 'Tênis' });
    const { s: s2 } = comDesejo({ nome: 'Relógio', preco: 50000 }, s);
    const { store } = renderizarApp('/desejos', s2);
    await usuario.click(screen.getByRole('button', { name: 'Comprei Tênis' }));
    const compra = within(screen.getByRole('form', { name: 'Registrar compra' }));
    await usuario.selectOptions(compra.getByLabelText('Pago com'), 'cc');
    await usuario.click(compra.getByRole('button', { name: 'Confirmar compra' }));
    expect(store.getSnapshot().estado.transacoes.some((x) => x.descricao === 'Tênis')).toBe(true);
    expect(store.getSnapshot().historico.passado).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Desisti de Relógio' }));
    expect(screen.getByTestId('economia')).toHaveTextContent('R$ 500,00');
    await usuario.click(screen.getByText('Concluídos (2)'));
    const concluidos = within(screen.getByRole('list', { name: 'Desejos concluídos' }));
    expect(concluidos.getByText(/Tênis · R\$\s2\.000,00 · Comprado/)).toBeInTheDocument();
    expect(concluidos.getByText(/Relógio · R\$\s500,00 · Desisti/)).toBeInTheDocument();
  });

  it('critério 9: excluir pede confirmação', async () => {
    const usuario = userEvent.setup();
    const { s } = comDesejo({ nome: 'Câmera' });
    const { store } = renderizarApp('/desejos', s);
    await usuario.click(screen.getByRole('button', { name: 'Excluir Câmera' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(listaDesejos(store.getSnapshot().estado)).toHaveLength(0);
  });
});
