import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO, somarMeses, mesDe } from '../domain/date';
import {
  aporteMensalNecessario,
  arquivarMeta,
  criarMeta,
  editarAporte,
  editarMeta,
  excluirAporte,
  ordenarMetas,
  reativarMeta,
  registrarAporte,
  ritmoReal,
  situacaoRitmo,
} from '../domain/metas';
import type { AppState, Meta } from '../domain/types';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

const meta = (parcial: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  nome: 'Viagem',
  valorAlvo: 120000,
  aportes: [],
  status: 'ativa',
  criadaEm: 1,
  ...parcial,
});

const com = (m: Meta): AppState => construirEstado({ metas: [m] });
const metaDe = (r: ReturnType<typeof registrarAporte>, id = 'm1') => {
  if (!r.ok) throw new Error(r.erro);
  return r.valor.metas.find((m) => m.id === id)!;
};

describe('metas: criação e edição (critérios 1, 2, 8)', () => {
  it('critério 1: nome obrigatório, até 40 caracteres e alvo maior que zero', () => {
    const e = construirEstado();
    expect(criarMeta(e, { nome: ' ', valorAlvo: 100 }, HOJE).ok).toBe(false);
    expect(criarMeta(e, { nome: 'x'.repeat(41), valorAlvo: 100 }, HOJE).ok).toBe(false);
    expect(criarMeta(e, { nome: 'Ok', valorAlvo: 0 }, HOJE).ok).toBe(false);
    const r = criarMeta(e, { nome: 'Ok', valorAlvo: 100 }, HOJE);
    expect(r.ok && r.valor.metas[0]).toMatchObject({ nome: 'Ok', status: 'ativa', aportes: [] });
  });

  it('critério 2: prazo anterior a hoje é recusado na criação, mas um prazo vencido já existente é mantido na edição', () => {
    expect(criarMeta(construirEstado(), { nome: 'A', valorAlvo: 100, prazo: '2026-10-14' }, HOJE)).toMatchObject({ ok: false, campo: 'prazo' });
    expect(criarMeta(construirEstado(), { nome: 'A', valorAlvo: 100, prazo: HOJE }, HOJE).ok).toBe(true);
    const vencida = com(meta({ prazo: '2026-01-01' }));
    expect(editarMeta(vencida, 'm1', { nome: 'Renomeada', valorAlvo: 120000, prazo: '2026-01-01' }, HOJE).ok).toBe(true);
    expect(editarMeta(vencida, 'm1', { nome: 'Renomeada', valorAlvo: 120000, prazo: '2026-02-01' }, HOJE).ok).toBe(false);
  });

  it('critério 8: reduzir o alvo abaixo do acumulado conclui a meta; aumentar reabre', () => {
    const estado = com(meta({ aportes: [{ id: 'a', data: '2026-09-01', valor: 50000 }] }));
    const concluida = editarMeta(estado, 'm1', { nome: 'Viagem', valorAlvo: 40000 }, HOJE);
    if (!concluida.ok) throw new Error(concluida.erro);
    expect(concluida.valor.metas[0]).toMatchObject({ status: 'concluida', concluidaEm: '2026-09-01' });
    const reaberta = editarMeta(concluida.valor, 'm1', { nome: 'Viagem', valorAlvo: 90000 }, HOJE);
    expect(reaberta.ok && reaberta.valor.metas[0].status).toBe('ativa');
  });
});

describe('metas: aportes e status (critérios 3, 5, 9)', () => {
  it('critério 3: aceita aporte e retirada, e recusa retirada que deixa o acumulado negativo', () => {
    let e = com(meta());
    e = (registrarAporte(e, 'm1', { data: '2026-10-01', valor: 10000 }) as { valor: AppState }).valor;
    expect(registrarAporte(e, 'm1', { data: '2026-10-02', valor: -3000 }).ok).toBe(true);
    expect(registrarAporte(e, 'm1', { data: '2026-10-02', valor: -10001 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(registrarAporte(e, 'm1', { data: '2026-13-02', valor: 100 })).toMatchObject({ ok: false, campo: 'data' });
    expect(registrarAporte(e, 'm1', { data: '2026-10-02', valor: 0 }).ok).toBe(false);
  });

  it('critério 5: conclui ao atingir o alvo, guarda a data do aporte e volta a ativa se uma retirada reduzir', () => {
    let e = com(meta({ valorAlvo: 10000 }));
    e = (registrarAporte(e, 'm1', { data: '2026-09-10', valor: 6000 }) as { valor: AppState }).valor;
    const completa = registrarAporte(e, 'm1', { data: '2026-10-05', valor: 4000 });
    expect(metaDe(completa)).toMatchObject({ status: 'concluida', concluidaEm: '2026-10-05' });
    if (!completa.ok) return;
    const retirada = registrarAporte(completa.valor, 'm1', { data: '2026-10-06', valor: -1 });
    const m = metaDe(retirada);
    expect(m.status).toBe('ativa');
    expect(m.concluidaEm).toBeUndefined();
  });

  it('critério 9: edita e exclui aportes individuais e recalcula a meta', () => {
    const base = com(meta({ valorAlvo: 10000, aportes: [{ id: 'a', data: '2026-09-01', valor: 10000 }] }));
    expect(base.metas[0].status).toBe('ativa');
    const editado = editarAporte(base, 'm1', 'a', { data: '2026-09-02', valor: 12000 });
    expect(metaDe(editado)).toMatchObject({ status: 'concluida', concluidaEm: '2026-09-02' });
    const excluido = excluirAporte(base, 'm1', 'a');
    expect(metaDe(excluido).aportes).toHaveLength(0);
    expect(editarAporte(base, 'm1', 'inexistente', { data: '2026-09-02', valor: 1 }).ok).toBe(false);
  });
});

describe('metas: ritmo e aporte necessário (critérios 6 e 7)', () => {
  it('critério 6: divide o restante pelos meses até o prazo, contando o mês corrente', () => {
    const m = meta({ prazo: '2027-01-20' });
    expect(aporteMensalNecessario(m, HOJE)).toEqual({ tipo: 'normal', valor: 30000, meses: 4 });
  });

  it('critério 6: arredonda para cima ao centavo', () => {
    const m = meta({ valorAlvo: 100001, prazo: '2026-12-31' });
    expect(aporteMensalNecessario(m, HOJE)).toEqual({ tipo: 'normal', valor: 33334, meses: 3 });
  });

  it('critério 6: último mês e prazo vencido mostram o valor restante', () => {
    const aportes = [{ id: 'a', data: '2026-09-01', valor: 20000 }];
    expect(aporteMensalNecessario(meta({ prazo: '2026-10-31', aportes }), HOJE)).toEqual({ tipo: 'ultimo-mes', valor: 100000, meses: 1 });
    expect(aporteMensalNecessario(meta({ prazo: '2026-08-31', aportes }), HOJE)).toEqual({ tipo: 'vencido', valor: 100000, meses: 0 });
    expect(aporteMensalNecessario(meta(), HOJE)).toEqual({ tipo: 'sem-prazo' });
    expect(aporteMensalNecessario(meta({ aportes: [{ id: 'a', data: '2026-09-01', valor: 120000 }] }), HOJE)).toEqual({ tipo: 'concluida' });
  });

  it('critério 7: compara a média dos 3 últimos meses completos com o necessário', () => {
    const aportes = [
      { id: '1', data: '2026-07-10', valor: 30000 },
      { id: '2', data: '2026-08-10', valor: 30000 },
      { id: '3', data: '2026-09-10', valor: 30000 },
      { id: '4', data: '2026-10-10', valor: 999999 },
      { id: '5', data: '2026-06-10', valor: 999999 },
    ];
    const noRitmo = meta({ valorAlvo: 1000000, prazo: '2027-01-20', aportes: aportes.slice(0, 3) });
    expect(ritmoReal(noRitmo, HOJE)).toBe(30000);
    expect(situacaoRitmo({ ...noRitmo, valorAlvo: 190000 }, HOJE)).toBe('no-ritmo');
    expect(situacaoRitmo({ ...noRitmo, valorAlvo: 400000 }, HOJE)).toBe('abaixo-do-ritmo');
    const comRuido = meta({ valorAlvo: 5000000, prazo: '2027-01-20', aportes });
    expect(ritmoReal(comRuido, HOJE)).toBe(30000);
  });

  it('critério 7: sem registros no período diz que não há dados, em vez de um número', () => {
    const m = meta({ prazo: '2027-01-20', aportes: [{ id: 'a', data: '2026-01-10', valor: 100 }] });
    expect(ritmoReal(m, HOJE)).toBeNull();
    expect(situacaoRitmo(m, HOJE)).toBe('sem-dados');
    expect(situacaoRitmo(meta(), HOJE)).toBeNull();
  });
});

describe('metas: arquivamento e ordem (critérios 10 e 11)', () => {
  it('critério 10: arquiva e reativa preservando o status calculado', () => {
    const concluida = com(meta({ valorAlvo: 100, aportes: [{ id: 'a', data: '2026-09-01', valor: 100 }], status: 'concluida', concluidaEm: '2026-09-01' }));
    const arq = arquivarMeta(concluida, 'm1');
    if (!arq.ok) throw new Error(arq.erro);
    expect(arq.valor.metas[0].status).toBe('arquivada');
    const rea = reativarMeta(arq.valor, 'm1');
    expect(rea.ok && rea.valor.metas[0].status).toBe('concluida');
  });

  it('critério 11: ativas por prazo mais próximo (sem prazo por último), depois concluídas', () => {
    const ordem = ordenarMetas([
      meta({ id: 'c', nome: 'C', status: 'concluida' }),
      meta({ id: 'sp', nome: 'Sem prazo' }),
      meta({ id: 'longe', nome: 'Longe', prazo: '2028-01-01' }),
      meta({ id: 'perto', nome: 'Perto', prazo: '2026-12-01' }),
    ]).map((m) => m.id);
    expect(ordem).toEqual(['perto', 'longe', 'sp', 'c']);
  });
});

describe('metas: tela', () => {
  it('estado vazio sugere criar a primeira meta', () => {
    renderizarApp('/metas');
    expect(screen.getByText('Nenhuma meta ainda')).toBeInTheDocument();
  });

  it('critério 1: cria meta pela tela e persiste', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas');
    await usuario.click(screen.getByRole('button', { name: 'Nova meta' }));
    await usuario.type(screen.getByLabelText('Nome da meta'), 'Reserva');
    await usuario.type(screen.getByLabelText('Valor alvo'), '5.000,00');
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }));
    expect(await screen.findByRole('article', { name: 'Meta Reserva' })).toBeInTheDocument();
    expect(lerEstadoSalvo().metas[0]).toMatchObject({ nome: 'Reserva', valorAlvo: 500000 });
  });

  it('critério 2: prazo no passado mostra erro junto ao campo', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas');
    await usuario.click(screen.getByRole('button', { name: 'Nova meta' }));
    await usuario.type(screen.getByLabelText('Nome da meta'), 'Velha');
    await usuario.type(screen.getByLabelText('Valor alvo'), '100');
    await usuario.type(screen.getByLabelText('Prazo (opcional)'), '2020-01-01');
    await usuario.click(screen.getByRole('button', { name: 'Criar meta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('anterior a hoje');
  });

  it('critérios 3, 4 e 5: registra aporte, mostra progresso e conclui', async () => {
    const usuario = userEvent.setup();
    const hoje = hojeISO();
    const { store } = renderizarApp('/metas', com(meta({ valorAlvo: 20000 })));
    const cartao = screen.getByRole('article', { name: 'Meta Viagem' });
    await usuario.click(within(cartao).getByRole('button', { name: 'Registrar lançamento em Viagem' }));
    await usuario.type(screen.getByLabelText('Valor do lançamento'), '50,00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
    expect(within(cartao).getByTestId('acumulado')).toHaveTextContent('R$ 50,00');
    expect(within(cartao).getByTestId('percentual')).toHaveTextContent('25% alcançado');
    expect(within(cartao).getByTestId('falta')).toHaveTextContent('R$ 150,00');
    expect(within(cartao).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

    await usuario.click(within(cartao).getByRole('button', { name: 'Registrar lançamento em Viagem' }));
    await usuario.type(screen.getByLabelText('Valor do lançamento'), '150');
    await usuario.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
    expect(within(cartao).getByTestId('status')).toHaveTextContent(`Concluída em ${hoje.split('-').reverse().join('/')}`);
    expect(store.getSnapshot().estado.metas[0].status).toBe('concluida');
  });

  it('critério 3: retirada acima do acumulado mostra erro', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas', com(meta()));
    await usuario.click(screen.getByRole('button', { name: 'Registrar lançamento em Viagem' }));
    await usuario.selectOptions(screen.getByLabelText('Tipo de lançamento'), 'Retirada');
    await usuario.type(screen.getByLabelText('Valor do lançamento'), '10');
    await usuario.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('negativo');
  });

  it('critério 6: mostra o aporte mensal necessário para metas com prazo', () => {
    const prazo = `${somarMeses(mesDe(hojeISO()), 3)}-28`;
    renderizarApp('/metas', com(meta({ prazo })));
    expect(screen.getByTestId('necessario')).toHaveTextContent('Aporte mensal necessário: R$ 300,00 (4 meses)');
    expect(screen.getByTestId('ritmo')).toHaveTextContent('Sem dados para estimar o ritmo');
  });

  it('critério 9: exclui um lançamento pelo histórico', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizarApp('/metas', com(meta({ aportes: [{ id: 'a', data: '2026-09-01', valor: 5000 }] })));
    await usuario.click(screen.getByRole('button', { name: 'Histórico de Viagem' }));
    await usuario.click(screen.getByRole('button', { name: 'Excluir lançamento de 01/09/2026' }));
    expect(store.getSnapshot().estado.metas[0].aportes).toHaveLength(0);
  });

  it('critério 10: arquivadas ficam fora da lista até marcar o filtro', async () => {
    const usuario = userEvent.setup();
    renderizarApp('/metas', com(meta({ status: 'arquivada' })));
    expect(screen.queryByRole('article', { name: 'Meta Viagem' })).not.toBeInTheDocument();
    await usuario.click(screen.getByLabelText(/Mostrar metas arquivadas/));
    expect(screen.getByRole('article', { name: 'Meta Viagem' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reativar meta Viagem' }));
    expect(screen.queryByLabelText(/Mostrar metas arquivadas/)).not.toBeInTheDocument();
  });
});
