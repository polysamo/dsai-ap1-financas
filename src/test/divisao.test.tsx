import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcularSaldos,
  csvGrupo,
  historicoDoGrupo,
  nomeArquivoGrupo,
  ratearDespesa,
  ratearProporcional,
  registrarAcerto,
  resumoGrupo,
  salvarDespesa,
  salvarGrupo,
  sugerirTransferencias,
  FILTROS_VAZIOS,
  type DadosDespesa,
  type GrupoDivisao,
} from '../domain/divisao';
import type { AppState } from '../domain/types';
import { baixarArquivo } from '../lib/download';
import { itensNavegacao } from '../navegacao';
import { CHAVE_ESTADO, carregar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

vi.mock('../lib/download', async (original) => ({ ...(await original<typeof import('../lib/download')>()), baixarArquivo: vi.fn() }));

const HOJE = '2026-10-01';

function grupoBase(parcial: Partial<GrupoDivisao> = {}): GrupoDivisao {
  return {
    id: 'g1',
    nome: 'Casa',
    participantes: [
      { id: 'a', nome: 'Ana' },
      { id: 'b', nome: 'Beto' },
      { id: 'c', nome: 'Carla' },
    ],
    despesas: [],
    acertos: [],
    criadoEm: 1,
    ...parcial,
  };
}

const estadoCom = (g: GrupoDivisao = grupoBase()): AppState => construirEstado({ gruposDivisao: [g] });

const despesa = (parcial: Partial<DadosDespesa> = {}): DadosDespesa => ({
  descricao: 'Mercado',
  valor: 9000,
  data: '2026-09-20',
  pagadorId: 'a',
  tipo: 'igual',
  partes: [
    { participanteId: 'a', peso: 1 },
    { participanteId: 'b', peso: 1 },
    { participanteId: 'c', peso: 1 },
  ],
  ...parcial,
});

function comDespesa(g: GrupoDivisao, d: DadosDespesa): GrupoDivisao {
  const r = salvarDespesa(estadoCom(g), g.id, d);
  if (!r.ok) throw new Error(r.erro);
  return r.valor.gruposDivisao[0];
}

const grupoSalvo = () => lerEstadoSalvo().gruposDivisao[0];

beforeEach(() => {
  localStorage.clear();
  vi.mocked(baixarArquivo).mockClear();
});

describe('critério 1: grupos e participantes', () => {
  it('valida nome, quantidade e unicidade dos participantes', () => {
    const base = construirEstado();
    const part = (...nomes: string[]) => nomes.map((nome) => ({ nome }));
    expect(salvarGrupo(base, { nome: ' ', participantes: part('A', 'B') })).toMatchObject({ ok: false, campo: 'nome' });
    expect(salvarGrupo(base, { nome: 'x'.repeat(61), participantes: part('A', 'B') })).toMatchObject({ ok: false, campo: 'nome' });
    expect(salvarGrupo(base, { nome: 'V', participantes: part('A') })).toMatchObject({ ok: false, campo: 'participantes' });
    expect(salvarGrupo(base, { nome: 'V', participantes: part('A', '') })).toMatchObject({ ok: false, campo: 'participantes' });
    expect(salvarGrupo(base, { nome: 'V', participantes: part('Ana', 'ana') })).toMatchObject({ ok: false, campo: 'participantes' });
    const treze = Array.from({ length: 13 }, (_, i) => `P${i}`);
    expect(salvarGrupo(base, { nome: 'V', participantes: part(...treze) })).toMatchObject({ ok: false, campo: 'participantes' });
    const doze = salvarGrupo(base, { nome: 'V', participantes: part(...treze.slice(0, 12)) });
    expect(doze.ok && doze.valor.estado.gruposDivisao[0].participantes).toHaveLength(12);
  });

  it('edita renomeando e acrescentando, mas recusa remover quem consta em despesa', () => {
    const g = comDespesa(grupoBase(), despesa());
    const estado = estadoCom(g);
    const mantendo = [{ id: 'a', nome: 'Ana Maria' }, { id: 'b', nome: 'Beto' }, { id: 'c', nome: 'Carla' }, { nome: 'Davi' }];
    const ed = salvarGrupo(estado, { id: 'g1', nome: 'Casa 2', participantes: mantendo });
    expect(ed.ok && ed.valor.estado.gruposDivisao[0].participantes.map((p) => p.nome)).toEqual(['Ana Maria', 'Beto', 'Carla', 'Davi']);
    const rem = salvarGrupo(estado, { id: 'g1', nome: 'Casa', participantes: [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Beto' }] });
    expect(rem).toMatchObject({ ok: false, campo: 'participantes' });
  });

  it('pelo formulário: recusa dados inválidos junto ao campo e cria o grupo', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Informe o nome do grupo.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome do grupo'), 'Viagem');
    await user.type(screen.getByLabelText('Participante 1'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Preencha o nome de todos os participantes.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Participante 2'), 'Beto');
    await user.click(screen.getByRole('button', { name: 'Adicionar participante' }));
    await user.type(screen.getByLabelText('Participante 3'), 'ana');
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByText('Os nomes dos participantes devem ser diferentes.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover participante 3' }));
    await user.click(screen.getByRole('button', { name: 'Criar grupo' }));
    expect(await screen.findByRole('heading', { name: 'Resumo de Viagem' })).toBeInTheDocument();
    expect(grupoSalvo().participantes.map((p) => p.nome)).toEqual(['Ana', 'Beto']);
  });
});

describe('critério 2: estado vazio, rota, persistência e migração', () => {
  it('mostra estado vazio com formulário, tem item de navegação e persiste a chave', async () => {
    renderizarApp('/divisao');
    expect(screen.getByText('Nenhum grupo de divisão')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Novo grupo' })).toBeInTheDocument();
    expect(itensNavegacao).toContainEqual({ to: '/divisao', rotulo: 'Divisão' });
  });

  it('carrega dados antigos sem a chave com lista vazia e não toca contas nem transações', () => {
    const { gruposDivisao: _ignorada, ...antigo } = construirEstado();
    const conta = { id: 'c1', nome: 'Banco', tipo: 'corrente', saldoInicial: 100, arquivada: false, criadaEm: 1 };
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify({ ...antigo, contas: [conta] }));
    const carga = carregar(localStorage);
    expect(carga.tipo === 'ok' && carga.estado.gruposDivisao).toEqual([]);
    expect(carga.tipo === 'ok' && carga.estado.contas).toEqual([conta]);
  });

  it('operações de divisão não geram transações nem alteram contas', () => {
    const g = comDespesa(grupoBase(), despesa());
    const antes = construirEstado();
    const r = salvarDespesa({ ...antes, gruposDivisao: [grupoBase()] }, 'g1', despesa());
    expect(r.ok && r.valor.transacoes).toBe(antes.transacoes);
    expect(r.ok && r.valor.contas).toBe(antes.contas);
    expect(g.despesas).toHaveLength(1);
  });
});

describe('critério 3: validação da despesa', () => {
  it('recusa descrição, valor, data e pagador inválidos com o campo certo', () => {
    const e = estadoCom();
    const tenta = (d: Partial<DadosDespesa>) => salvarDespesa(e, 'g1', despesa(d));
    expect(tenta({ descricao: '  ' })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(tenta({ descricao: 'x'.repeat(81) })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(tenta({ valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ valor: -5 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ data: '2026-02-30' })).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta({ pagadorId: 'zzz' })).toMatchObject({ ok: false, campo: 'pagadorId' });
    expect(tenta({ partes: [] })).toMatchObject({ ok: false, campo: 'partes' });
  });

  it('pelo formulário mostra os erros junto aos campos', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Informe um valor válido, como 25,90.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Valor (R$)'), '0');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Informe a descrição da despesa.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Descrição'), 'Luz');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Informe um valor maior que zero.')).toBeInTheDocument();
  });
});

describe('critério 4: divisão igual', () => {
  it('R$ 100,00 entre 3 dá 33,34, 33,33 e 33,33 e a soma é exata', () => {
    expect(ratearProporcional(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
    const r = ratearDespesa(10000, 'igual', [{ participanteId: 'a', peso: 1 }, { participanteId: 'b', peso: 1 }, { participanteId: 'c', peso: 1 }]);
    expect(r.ok && Object.values(r.valor)).toEqual([3334, 3333, 3333]);
  });

  it('participantes fora da divisão não pagam nada e o resto segue a ordem do grupo', () => {
    const g = comDespesa(grupoBase(), despesa({ valor: 1001, partes: [{ participanteId: 'c', peso: 1 }, { participanteId: 'a', peso: 1 }] }));
    const s = calcularSaldos(g);
    expect(s.map((x) => x.deve)).toEqual([501, 0, 500]);
    expect(g.despesas[0].partes.map((p) => p.participanteId)).toEqual(['a', 'c']);
  });

  it('pelo formulário desmarcar um participante o exclui', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.type(screen.getByLabelText('Descrição'), 'Pizza');
    await user.type(screen.getByLabelText('Valor (R$)'), '100,00');
    await user.click(screen.getByRole('checkbox', { name: 'Carla' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    const d = grupoSalvo().despesas[0];
    expect(d.partes).toEqual([{ participanteId: 'a', peso: 1 }, { participanteId: 'b', peso: 1 }]);
    const saldos = within(await screen.findByRole('list', { name: 'Saldo por participante' }));
    expect(saldos.getByText(/Carla/).closest('li')).toHaveTextContent('quitado');
  });
});

describe('critério 5: percentuais', () => {
  it('R$ 100,01 com 50/30/20 dá 50,01, 30,00 e 20,00', () => {
    const r = ratearDespesa(10001, 'percentual', [{ participanteId: 'a', peso: 5000 }, { participanteId: 'b', peso: 3000 }, { participanteId: 'c', peso: 2000 }]);
    expect(r.ok && Object.values(r.valor)).toEqual([5001, 3000, 2000]);
  });

  it('recusa quando a soma não é 100% informando o total', () => {
    const r = ratearDespesa(10000, 'percentual', [{ participanteId: 'a', peso: 5000 }, { participanteId: 'b', peso: 3000 }]);
    expect(r).toMatchObject({ ok: false, campo: 'partes', erro: 'Os percentuais somam 80,00%; devem somar 100,00%.' });
  });

  it('pelo formulário aceita 33,33 + 33,33 + 33,34 e recusa 50 + 40', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.type(screen.getByLabelText('Descrição'), 'Aluguel');
    await user.type(screen.getByLabelText('Valor (R$)'), '100,00');
    await user.selectOptions(screen.getByLabelText('Tipo de divisão'), 'percentual');
    await user.type(screen.getByLabelText('Percentual (%) de Ana'), '50');
    await user.type(screen.getByLabelText('Percentual (%) de Beto'), '40');
    expect(screen.getByText('Soma dos percentuais: 90,00% de 100,00%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Os percentuais somam 90,00%; devem somar 100,00%.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Percentual (%) de Carla'), '10');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(grupoSalvo().despesas[0].partes.map((p) => p.peso)).toEqual([5000, 4000, 1000]);
  });
});

describe('critério 6: valores exatos', () => {
  it('só aceita se a soma for o valor da despesa', () => {
    const partes = [{ participanteId: 'a', peso: 6000 }, { participanteId: 'b', peso: 3000 }];
    const r = ratearDespesa(10000, 'exata', partes);
    expect(r).toMatchObject({ ok: false, campo: 'partes', erro: 'Os valores somam R$ 90,00, mas a despesa é de R$ 100,00.' });
    const ok = ratearDespesa(9000, 'exata', partes);
    expect(ok.ok && ok.valor).toEqual({ a: 6000, b: 3000 });
  });

  it('pelo formulário mostra a soma informada e a mensagem de erro', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.type(screen.getByLabelText('Descrição'), 'Jantar');
    await user.type(screen.getByLabelText('Valor (R$)'), '100,00');
    await user.selectOptions(screen.getByLabelText('Tipo de divisão'), 'exata');
    await user.type(screen.getByLabelText('Valor (R$) de Ana'), '60,00');
    await user.type(screen.getByLabelText('Valor (R$) de Beto'), '30,00');
    expect(screen.getByText('Soma dos valores: R$ 90,00 de R$ 100,00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Os valores somam R$ 90,00, mas a despesa é de R$ 100,00.')).toBeInTheDocument();
    expect(grupoSalvo().despesas).toHaveLength(0);
  });
});

describe('critério 7: cotas', () => {
  it('divide proporcionalmente e o resto é determinístico', () => {
    expect(ratearProporcional(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(ratearProporcional(1000, [2, 1])).toEqual([667, 333]);
    const r = ratearDespesa(1000, 'cotas', [{ participanteId: 'a', peso: 2 }, { participanteId: 'c', peso: 1 }]);
    expect(r.ok && r.valor).toEqual({ a: 667, c: 333 });
  });

  it('pelo formulário cotas vazias ficam de fora e texto inválido é recusado', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.type(screen.getByLabelText('Descrição'), 'Gasolina');
    await user.type(screen.getByLabelText('Valor (R$)'), '10,00');
    await user.selectOptions(screen.getByLabelText('Tipo de divisão'), 'cotas');
    await user.type(screen.getByLabelText('Cotas de Ana'), '2');
    await user.type(screen.getByLabelText('Cotas de Beto'), 'x');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(await screen.findByText('Valor inválido para Beto.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Cotas de Beto'));
    await user.type(screen.getByLabelText('Cotas de Carla'), '1');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(grupoSalvo().despesas[0].partes).toEqual([{ participanteId: 'a', peso: 2 }, { participanteId: 'c', peso: 1 }]);
    expect(calcularSaldos(grupoSalvo()).map((s) => s.deve)).toEqual([667, 0, 333]);
  });
});

describe('critério 8: saldos', () => {
  it('saldo é pagou menos deve, soma zero, e os acertos entram', () => {
    const g = comDespesa(grupoBase(), despesa());
    const s = calcularSaldos(g);
    expect(s.map((x) => x.saldo)).toEqual([6000, -3000, -3000]);
    expect(s.reduce((a, x) => a + x.saldo, 0)).toBe(0);
    const r = registrarAcerto(estadoCom(g), 'g1', { deId: 'b', paraId: 'a', valor: 1000, data: HOJE });
    expect(r.ok && calcularSaldos(r.valor.gruposDivisao[0]).map((x) => x.saldo)).toEqual([5000, -2000, -3000]);
  });

  it('mostra recebe, deve e quitado em texto', () => {
    renderizarApp('/divisao', estadoCom(comDespesa(grupoBase(), despesa({ partes: [{ participanteId: 'a', peso: 1 }, { participanteId: 'b', peso: 1 }] }))));
    const lista = within(screen.getByRole('list', { name: 'Saldo por participante' }));
    expect(lista.getByText(/Ana/).closest('li')).toHaveTextContent('recebe R$ 45,00');
    expect(lista.getByText(/Beto/).closest('li')).toHaveTextContent('deve R$ 45,00');
    expect(lista.getByText(/Carla/).closest('li')).toHaveTextContent('quitado');
  });
});

describe('critério 9: acertar contas', () => {
  it('A pagou 90 dividido por 3 gera B e C pagando 30 a A', async () => {
    const g = comDespesa(grupoBase(), despesa());
    expect(sugerirTransferencias(calcularSaldos(g))).toEqual([
      { deId: 'b', paraId: 'a', valor: 3000 },
      { deId: 'c', paraId: 'a', valor: 3000 },
    ]);
    renderizarApp('/divisao', estadoCom(g));
    const lista = within(screen.getByRole('list', { name: 'Transferências sugeridas' }));
    expect(lista.getByText('Beto paga R$ 30,00 a Ana')).toBeInTheDocument();
    expect(lista.getByText('Carla paga R$ 30,00 a Ana')).toBeInTheDocument();
  });

  it('usa no máximo n-1 transferências, casando maior devedor com maior credor', () => {
    const saldos = [100, 50, -30, -70, -50].map((saldo, i) => ({ participanteId: `p${i}`, nome: `P${i}`, pagou: 0, deve: 0, saldo }));
    const t = sugerirTransferencias(saldos);
    expect(t.length).toBeLessThanOrEqual(4);
    expect(t[0]).toEqual({ deId: 'p3', paraId: 'p0', valor: 70 });
    const liquido = new Map<string, number>();
    for (const x of t) {
      liquido.set(x.deId, (liquido.get(x.deId) ?? 0) + x.valor);
      liquido.set(x.paraId, (liquido.get(x.paraId) ?? 0) - x.valor);
    }
    expect([...liquido.entries()].every(([id, v]) => v === -saldos.find((s) => s.participanteId === id)!.saldo)).toBe(true);
  });

  it('sem pendências mostra que todas as contas estão acertadas', () => {
    renderizarApp('/divisao', estadoCom());
    expect(screen.getByText('Todas as contas estão acertadas.')).toBeInTheDocument();
  });
});

describe('critério 10: acertos efetivados', () => {
  it('valida valor, data e pessoas diferentes', () => {
    const e = estadoCom();
    const tenta = (p: Partial<{ deId: string; paraId: string; valor: number; data: string }>) => registrarAcerto(e, 'g1', { deId: 'a', paraId: 'b', valor: 100, data: HOJE, ...p });
    expect(tenta({ valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(tenta({ data: 'x' })).toMatchObject({ ok: false, campo: 'data' });
    expect(tenta({ paraId: 'a' })).toMatchObject({ ok: false, campo: 'paraId' });
    expect(tenta({})).toMatchObject({ ok: true });
  });

  it('o botão de uma sugestão registra o acerto, atualiza saldos e some da lista', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom(comDespesa(grupoBase(), despesa())));
    await user.click(screen.getByRole('button', { name: 'Registrar acerto: Beto paga R$ 30,00 a Ana' }));
    expect(grupoSalvo().acertos).toMatchObject([{ deId: 'b', paraId: 'a', valor: 3000 }]);
    const sugestoes = within(screen.getByRole('list', { name: 'Transferências sugeridas' }));
    expect(sugestoes.queryByText('Beto paga R$ 30,00 a Ana')).not.toBeInTheDocument();
    expect(sugestoes.getByText('Carla paga R$ 30,00 a Ana')).toBeInTheDocument();
  });

  it('o formulário manual recusa pessoas iguais e valor vazio, e registra o pagamento', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    const form = within(screen.getByRole('form', { name: 'Registrar pagamento entre participantes' }));
    await user.click(form.getByRole('button', { name: 'Registrar pagamento' }));
    expect(await form.findByText('Informe um valor válido, como 25,90.')).toBeInTheDocument();
    await user.type(form.getByLabelText('Valor do acerto (R$)'), '15,50');
    await user.selectOptions(form.getByLabelText('Quem recebeu'), 'a');
    await user.click(form.getByRole('button', { name: 'Registrar pagamento' }));
    expect(await form.findByText('Quem paga e quem recebe devem ser pessoas diferentes.')).toBeInTheDocument();
    await user.selectOptions(form.getByLabelText('Quem recebeu'), 'c');
    await user.click(form.getByRole('button', { name: 'Registrar pagamento' }));
    expect(grupoSalvo().acertos).toMatchObject([{ deId: 'a', paraId: 'c', valor: 1550 }]);
  });

  it('excluir um acerto pede confirmação', async () => {
    const user = userEvent.setup();
    const g = grupoBase({ acertos: [{ id: 'x1', deId: 'a', paraId: 'b', valor: 500, data: '2026-09-25', criadoEm: 2 }] });
    renderizarApp('/divisao', estadoCom(g));
    await user.click(screen.getByRole('button', { name: /Excluir acerto de Ana a Beto/ }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(grupoSalvo().acertos).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Excluir acerto de Ana a Beto/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(grupoSalvo().acertos).toHaveLength(0);
  });
});

describe('critério 11: histórico filtrável', () => {
  const g = (() => {
    let x = comDespesa(grupoBase(), despesa({ descricao: 'Mercado', data: '2026-09-10' }));
    x = comDespesa(x, despesa({ descricao: 'Cinema', data: '2026-09-20', pagadorId: 'b', partes: [{ participanteId: 'b', peso: 1 }, { participanteId: 'c', peso: 1 }] }));
    return { ...x, acertos: [{ id: 'x1', deId: 'c', paraId: 'a', valor: 500, data: '2026-09-25', criadoEm: 9 }] };
  })();

  it('ordena do mais recente ao mais antigo e filtra por texto, participante, tipo e período', () => {
    const desc = (f: Partial<typeof FILTROS_VAZIOS>) =>
      historicoDoGrupo(g, { ...FILTROS_VAZIOS, ...f }).map((i) => (i.tipo === 'despesa' ? i.despesa.descricao : 'acerto'));
    expect(desc({})).toEqual(['acerto', 'Cinema', 'Mercado']);
    expect(desc({ texto: 'cine' })).toEqual(['Cinema']);
    expect(desc({ participanteId: 'a' })).toEqual(['acerto', 'Mercado']);
    expect(desc({ tipo: 'acerto' })).toEqual(['acerto']);
    expect(desc({ tipo: 'despesa' })).toEqual(['Cinema', 'Mercado']);
    expect(desc({ de: '2026-09-15', ate: '2026-09-22' })).toEqual(['Cinema']);
  });

  it('na tela filtra, mostra estado vazio e limpa os filtros', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom(g));
    const historico = () => within(screen.getByRole('list', { name: 'Histórico do grupo' }));
    expect(historico().getAllByRole('listitem')).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText('Tipo'), 'acerto');
    expect(historico().getAllByRole('listitem')).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText('Tipo'), 'todos');
    await user.type(screen.getByLabelText('Buscar'), 'cine');
    expect(historico().getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-09-22' } });
    expect(screen.getByText('Nada encontrado com esses filtros')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(historico().getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('critério 12: editar e excluir despesas', () => {
  it('editar reabre o formulário preenchido e recalcula os saldos', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom(comDespesa(grupoBase(), despesa())));
    await user.click(screen.getByRole('button', { name: 'Editar despesa Mercado' }));
    const form = within(screen.getByRole('form', { name: 'Editar despesa' }));
    expect(form.getByLabelText('Descrição')).toHaveValue('Mercado');
    expect(form.getByLabelText('Valor (R$)')).toHaveValue('90,00');
    await user.clear(form.getByLabelText('Valor (R$)'));
    await user.type(form.getByLabelText('Valor (R$)'), '60,00');
    await user.click(form.getByRole('button', { name: 'Salvar despesa' }));
    expect(grupoSalvo().despesas).toHaveLength(1);
    expect(grupoSalvo().despesas[0].valor).toBe(6000);
    expect(calcularSaldos(grupoSalvo()).map((s) => s.saldo)).toEqual([4000, -2000, -2000]);
    expect(screen.getByRole('form', { name: 'Nova despesa' })).toBeInTheDocument();
  });

  it('excluir pede confirmação e cancelar não altera nada', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom(comDespesa(grupoBase(), despesa())));
    await user.click(screen.getByRole('button', { name: 'Excluir despesa Mercado' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(grupoSalvo().despesas).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Excluir despesa Mercado' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(grupoSalvo().despesas).toHaveLength(0);
    expect(screen.getByText('Nenhuma despesa ainda')).toBeInTheDocument();
  });

  it('excluir o grupo também pede confirmação', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom());
    await user.click(screen.getByRole('button', { name: 'Excluir grupo' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(lerEstadoSalvo().gruposDivisao).toEqual([]);
    expect(screen.getByText('Nenhum grupo de divisão')).toBeInTheDocument();
  });
});

describe('critério 13: resumo do grupo', () => {
  it('mostra total gasto, número de despesas, total acertado e pagou/deve por participante', () => {
    const g = comDespesa(grupoBase({ acertos: [{ id: 'x1', deId: 'b', paraId: 'a', valor: 1000, data: HOJE, criadoEm: 3 }] }), despesa());
    const r = resumoGrupo(g);
    expect(r).toMatchObject({ totalGasto: 9000, qtdDespesas: 1, totalAcertado: 1000, qtdAcertos: 1 });
    renderizarApp('/divisao', estadoCom(g));
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 90,00');
    expect(screen.getByTestId('resumo-qtd')).toHaveTextContent('1');
    expect(screen.getByTestId('resumo-acertado')).toHaveTextContent('R$ 10,00');
    const linha = screen.getByRole('row', { name: /Ana/ });
    expect(linha).toHaveTextContent('R$ 90,00');
    expect(linha).toHaveTextContent('R$ 30,00');
  });
});

describe('critério 14: exportação CSV', () => {
  const g = comDespesa(grupoBase({ nome: 'Viagem: SP/RJ' }), despesa({ descricao: 'Jantar; "bom"', valor: 10001 }));

  it('usa ; BOM, vírgula decimal e \\r\\n, com partes, acertos e saldos', () => {
    const csv = csvGrupo({ ...g, acertos: [{ id: 'x1', deId: 'b', paraId: 'a', valor: 1234, data: '2026-09-30', criadoEm: 5 }] });
    expect(csv.startsWith('﻿')).toBe(true);
    const linhas = csv.slice(0, -2).split('\r\n');
    expect(linhas[0]).toBe('﻿Data;Tipo;Descrição;Pagou;Valor;Divisão;Parte de Ana;Parte de Beto;Parte de Carla');
    expect(linhas).toContain('2026-09-30;Acerto;Para Ana;Beto;12,34;;;;');
    expect(linhas).toContain('2026-09-20;Despesa;"Jantar; ""bom""";Ana;100,01;Igual;33,34;33,34;33,33');
    expect(linhas).toContain('Participante;Pagou;Deve;Saldo');
    expect(linhas).toContain('Ana;100,01;33,34;54,33');
    expect(nomeArquivoGrupo(g)).toBe('divisao-Viagem-SPRJ.csv');
  });

  it('o botão Exportar CSV baixa o arquivo com o conteúdo do grupo', async () => {
    const user = userEvent.setup();
    renderizarApp('/divisao', estadoCom(g));
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(baixarArquivo).toHaveBeenCalledWith('divisao-Viagem-SPRJ.csv', csvGrupo(g), 'text/csv');
  });
});
