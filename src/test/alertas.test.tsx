import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContadorAlertas } from '../components/ContadorAlertas';
import {
  alertasVisiveis,
  calcularAlertas,
  definirLimiares,
  dispensarAlerta,
  preferenciasDe,
  preferenciasPadrao,
  restaurarAlerta,
  type Alerta,
} from '../domain/alertas';
import type { Agendamento, AppState, Conta, Meta, Transacao } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { Store, StoreProvider } from '../state/store';
import { CHAVE_ESTADO, carregar, estadoInicial } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${HOJE}T12:00:00`));
});
afterEach(() => vi.useRealTimers());

const catDespesa = estadoInicial().categorias.find((c) => c.tipo === 'despesa')!;
const conta = (p: Partial<Conta> = {}): Conta => ({ id: 'c1', nome: 'Corrente', tipo: 'corrente', saldoInicial: 100000, arquivada: false, criadaEm: 1, ...p });
const tx = (p: Partial<Transacao>): Transacao => ({
  id: `t${Math.random()}`,
  contaId: 'c1',
  categoriaId: catDespesa.id,
  tipo: 'despesa',
  valor: 1000,
  data: '2026-10-10',
  descricao: 'Compra',
  criadaEm: 1,
  ...p,
});
const agenda = (p: Partial<Agendamento>): Agendamento => ({
  id: 'a1',
  descricao: 'Aluguel',
  tipo: 'despesa',
  valor: 50000,
  vencimento: '2026-10-18',
  categoriaId: catDespesa.id,
  criadoEm: 1,
  ...p,
});
const meta = (p: Partial<Meta> = {}): Meta => ({ id: 'm1', nome: 'Viagem', valorAlvo: 100000, aportes: [], status: 'ativa', criadaEm: 1, ...p });

const ids = (alertas: Alerta[]) => alertas.map((a) => a.id);
const achar = (alertas: Alerta[], prefixo: string) => alertas.find((a) => a.id.startsWith(prefixo));

describe('alertas: cálculo (critério 10)', () => {
  it('orçamento: estourado é crítico e de 80% a 100% é atenção', () => {
    const base = { contas: [conta()], orcamentos: [{ categoriaId: catDespesa.id, mes: '2026-10', limite: 10000 }] };
    const estourado = calcularAlertas(construirEstado({ ...base, transacoes: [tx({ valor: 12000 })] }), HOJE);
    expect(achar(estourado, 'orcamento:')).toMatchObject({ severidade: 'critico', tipo: 'orcamento', link: '/orcamento', id: `orcamento:${catDespesa.id}:2026-10` });
    const perto = calcularAlertas(construirEstado({ ...base, transacoes: [tx({ valor: 8500 })] }), HOJE);
    expect(achar(perto, 'orcamento:')?.severidade).toBe('atencao');
    const normal = calcularAlertas(construirEstado({ ...base, transacoes: [tx({ valor: 5000 })] }), HOJE);
    expect(achar(normal, 'orcamento:')).toBeUndefined();
  });

  it('fatura: fechando em até N dias é info, vencendo é atenção e vencida e não paga é crítica', () => {
    const cartao = (diaFechamento: number, diaVencimento: number): Conta =>
      conta({ id: 'k', nome: 'Visa', tipo: 'cartao', saldoInicial: 0, cartao: { diaFechamento, diaVencimento, limite: 500000 } });
    const fecha = calcularAlertas(construirEstado({ contas: [cartao(20, 27)], transacoes: [tx({ contaId: 'k', valor: 5000 })] }), HOJE);
    expect(fecha.find((a) => a.id === 'fatura:k:2026-10:fecha')).toMatchObject({ severidade: 'info', link: '/cartoes' });

    const longe = calcularAlertas(construirEstado({ contas: [cartao(28, 28)], transacoes: [tx({ contaId: 'k', valor: 5000 })] }), HOJE);
    expect(achar(longe, 'fatura:')).toBeUndefined();

    const vence = calcularAlertas(construirEstado({ contas: [cartao(5, 18)], transacoes: [tx({ contaId: 'k', valor: 5000, data: '2026-09-20' })] }), HOJE);
    expect(vence.find((a) => a.id === 'fatura:k:2026-10:vence')).toMatchObject({ severidade: 'atencao' });

    const vencida = calcularAlertas(construirEstado({ contas: [cartao(5, 10)], transacoes: [tx({ contaId: 'k', valor: 5000, data: '2026-09-20' })] }), HOJE);
    expect(vencida.find((a) => a.id === 'fatura:k:2026-10:vence')).toMatchObject({ severidade: 'critico' });

    const paga = calcularAlertas(
      construirEstado({
        contas: [cartao(5, 10), conta()],
        transacoes: [tx({ contaId: 'k', valor: 5000, data: '2026-09-20' })],
        pagamentosFatura: [{ id: 'p', contaCartaoId: 'k', mesFatura: '2026-10', valor: 5000, data: '2026-10-09', contaOrigemId: 'c1' }],
      }),
      HOJE,
    );
    expect(achar(paga, 'fatura:')).toBeUndefined();
  });

  it('agendamento: vencido de despesa é crítico, vencendo em N dias é atenção, longe e pago não alertam', () => {
    const a = calcularAlertas(
      construirEstado({
        agenda: [
          agenda({ id: 'atrasado', vencimento: '2026-10-10' }),
          agenda({ id: 'perto', vencimento: '2026-10-22' }),
          agenda({ id: 'longe', vencimento: '2026-10-23' }),
          agenda({ id: 'pago', vencimento: '2026-10-01', pagoEm: '2026-10-01' }),
        ],
      }),
      HOJE,
    );
    expect(a.find((x) => x.id === 'agenda:atrasado')).toMatchObject({ severidade: 'critico', link: '/calendario' });
    expect(a.find((x) => x.id === 'agenda:perto')?.severidade).toBe('atencao');
    expect(ids(a)).not.toContain('agenda:longe');
    expect(ids(a)).not.toContain('agenda:pago');
  });

  it('saldo: abaixo do mínimo configurado é atenção e negativo é crítico; arquivadas e cartões são ignorados', () => {
    const estado = construirEstado({
      contas: [conta({ id: 'neg', saldoInicial: -500 }), conta({ id: 'baixo', nome: 'Baixa', saldoInicial: 3000 }), conta({ id: 'arq', saldoInicial: -9, arquivada: true })],
    });
    const padrao = calcularAlertas(estado, HOJE);
    expect(padrao.find((a) => a.id === 'saldo:neg')).toMatchObject({ severidade: 'critico', link: '/contas' });
    expect(ids(padrao)).not.toContain('saldo:baixo');
    expect(ids(padrao)).not.toContain('saldo:arq');
    const r = definirLimiares(estado, { ...preferenciasPadrao().limiares, saldoMinimo: 5000 });
    if (!r.ok) throw new Error(r.erro);
    expect(calcularAlertas(r.valor, HOJE).find((a) => a.id === 'saldo:baixo')?.severidade).toBe('atencao');
  });

  it('meta: vencida é crítica; prazo próximo abaixo do ritmo é atenção; sem dados é info; no ritmo não alerta', () => {
    const aportes = [
      { id: '1', data: '2026-07-10', valor: 5000 },
      { id: '2', data: '2026-08-10', valor: 5000 },
      { id: '3', data: '2026-09-10', valor: 5000 },
    ];
    const estado = (m: Meta) => construirEstado({ metas: [m] });
    expect(calcularAlertas(estado(meta({ prazo: '2026-10-01' })), HOJE).find((a) => a.id === 'meta:m1')).toMatchObject({ severidade: 'critico', link: '/metas' });
    expect(calcularAlertas(estado(meta({ prazo: '2026-10-20', aportes })), HOJE).find((a) => a.id === 'meta:m1')?.severidade).toBe('atencao');
    expect(calcularAlertas(estado(meta({ prazo: '2026-10-20' })), HOJE).find((a) => a.id === 'meta:m1')?.severidade).toBe('info');
    expect(calcularAlertas(estado(meta({ prazo: '2026-10-20', valorAlvo: 20000, aportes })), HOJE).find((a) => a.id === 'meta:m1')).toBeUndefined();
    expect(calcularAlertas(estado(meta({ prazo: '2026-12-20' })), HOJE).find((a) => a.id === 'meta:m1')).toBeUndefined();
    expect(calcularAlertas(estado(meta({ prazo: '2026-10-20', status: 'arquivada' })), HOJE).find((a) => a.id === 'meta:m1')).toBeUndefined();
  });

  it('projeção: saldo que fica negativo gera alerta com o primeiro mês negativo no id', () => {
    const estado = construirEstado({ contas: [conta()], transacoes: [tx({ valor: 30000, data: '2026-09-10' })] });
    const a = calcularAlertas(estado, HOJE).find((x) => x.tipo === 'projecao');
    expect(a).toMatchObject({ id: 'projecao:2027-01', severidade: 'atencao', link: '/' });
    const proximo = construirEstado({ contas: [conta({ saldoInicial: 10000 })], transacoes: [tx({ valor: 30000, data: '2026-09-10' })] });
    expect(calcularAlertas(proximo, HOJE).find((x) => x.tipo === 'projecao')?.severidade).toBe('critico');
  });

  it('ids são estáveis, a lista sai ordenada por severidade e todo alerta tem texto e link', () => {
    const estado = construirEstado({
      contas: [conta({ saldoInicial: -100 })],
      agenda: [agenda({ id: 'perto', vencimento: '2026-10-20' }), agenda({ id: 'atrasado', vencimento: '2026-10-01' })],
      metas: [meta({ prazo: '2026-10-20' })],
    });
    const primeira = calcularAlertas(estado, HOJE);
    const segunda = calcularAlertas({ ...estado }, '2026-10-16');
    expect(ids(calcularAlertas(estado, HOJE))).toEqual(ids(primeira));
    expect(ids(segunda)).toEqual(expect.arrayContaining(['agenda:atrasado', 'agenda:perto', 'saldo:c1', 'meta:m1']));
    const peso = { critico: 0, atencao: 1, info: 2 };
    const pesos = primeira.map((a) => peso[a.severidade]);
    expect(pesos).toEqual([...pesos].sort((x, y) => x - y));
    for (const a of primeira) {
      expect(a.titulo && a.descricao && a.link.startsWith('/')).toBeTruthy();
    }
    expect(new Set(ids(primeira)).size).toBe(primeira.length);
  });

  it('o limiar de dias muda a janela e tipos desligados não geram alertas', () => {
    const estado = construirEstado({ agenda: [agenda({ id: 'x', vencimento: '2026-10-25' })], contas: [conta({ saldoInicial: -1 })] });
    expect(ids(calcularAlertas(estado, HOJE))).not.toContain('agenda:x');
    const r = definirLimiares(estado, { ...preferenciasPadrao().limiares, diasAntecedencia: 10, tiposAtivos: { ...preferenciasPadrao().limiares.tiposAtivos, saldo: false } });
    if (!r.ok) throw new Error(r.erro);
    const a = ids(calcularAlertas(r.valor, HOJE));
    expect(a).toContain('agenda:x');
    expect(a).not.toContain('saldo:c1');
  });
});

const estadoComAlertas = (extra: Partial<AppState> = {}) =>
  construirEstado({
    contas: [conta({ saldoInicial: -100 })],
    agenda: [agenda({ id: 'perto', descricao: 'Internet', vencimento: '2026-10-20' }), agenda({ id: 'atrasado', descricao: 'Luz', vencimento: '2026-10-01' })],
    metas: [meta({ prazo: '2026-10-20' })],
    ...extra,
  });

describe('alertas: central (critério 11)', () => {
  it('lista os alertas com severidade em texto, descrição e link, e mostra contagens nos filtros', () => {
    renderizarApp('/alertas', estadoComAlertas());
    expect(screen.getByRole('heading', { name: 'Alertas', level: 1 })).toBeInTheDocument();
    const lista = screen.getByRole('list', { name: 'Alertas' });
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(4);
    expect(within(itens[0]).getByText('Crítico')).toBeInTheDocument();
    expect(within(lista).getByText(/Atrasado: Luz/)).toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'Ver detalhes: Atrasado: Luz' })).toHaveAttribute('href', '/calendario');
    expect(screen.getByRole('button', { name: 'Todos (4)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Crítico (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atenção (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Info (1)' })).toBeInTheDocument();
  });

  it('o filtro por severidade restringe a lista e informa quando não há resultado', async () => {
    const u = userEvent.setup();
    renderizarApp('/alertas', estadoComAlertas({ metas: [] }));
    await u.click(screen.getByRole('button', { name: 'Atenção (1)' }));
    expect(screen.getByRole('button', { name: 'Atenção (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('list', { name: 'Alertas' })).getAllByRole('listitem')).toHaveLength(1);
    await u.click(screen.getByRole('button', { name: 'Info (0)' }));
    expect(screen.getByText('Nenhum alerta com esta severidade')).toBeInTheDocument();
  });

  it('sem alertas mostra o estado vazio "Tudo em dia"', () => {
    renderizarApp('/alertas', construirEstado({ contas: [conta()] }));
    expect(screen.getByText('Tudo em dia')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Alertas' })).not.toBeInTheDocument();
  });
});

describe('alertas: adiar e dispensar (critério 12)', () => {
  it('adiar recusa data passada ou vazia e, com data futura, esconde o alerta até a data', async () => {
    const u = userEvent.setup();
    renderizarApp('/alertas', estadoComAlertas());
    await u.click(screen.getByRole('button', { name: 'Adiar: Atrasado: Luz' }));
    await u.click(screen.getByRole('button', { name: 'Adiar até a data' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe uma data válida.');
    await u.type(screen.getByLabelText('Voltar a mostrar em'), '2026-10-10');
    await u.click(screen.getByRole('button', { name: 'Adiar até a data' }));
    expect(screen.getByRole('alert')).toHaveTextContent('depois de hoje');
    await u.clear(screen.getByLabelText('Voltar a mostrar em'));
    await u.type(screen.getByLabelText('Voltar a mostrar em'), '2026-10-20');
    await u.click(screen.getByRole('button', { name: 'Adiar até a data' }));
    expect(screen.queryByText(/Atrasado: Luz/, { selector: 'h3' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dispensados \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText(/volta em 20\/10\/2026/)).toBeInTheDocument();
    expect(preferenciasDe(lerEstadoSalvo()).dispensados).toEqual([{ id: 'agenda:atrasado', ate: '2026-10-20' }]);

    const salvo = lerEstadoSalvo();
    expect(ids(alertasVisiveis(salvo, '2026-10-19'))).not.toContain('agenda:atrasado');
    expect(ids(alertasVisiveis(salvo, '2026-10-20'))).toContain('agenda:atrasado');
  });

  it('dispensar de vez pede confirmação, some e só volta ao restaurar', async () => {
    const u = userEvent.setup();
    renderizarApp('/alertas', estadoComAlertas());
    await u.click(screen.getByRole('button', { name: 'Dispensar: Atrasado: Luz' }));
    const dialogo = screen.getByRole('dialog');
    await u.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: /Atrasado: Luz/ })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Dispensar: Atrasado: Luz' }));
    await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dispensar de vez' }));
    expect(screen.queryByRole('heading', { name: /Atrasado: Luz/ })).not.toBeInTheDocument();
    expect(screen.getByText(/dispensado de vez/)).toBeInTheDocument();
    expect(ids(alertasVisiveis(lerEstadoSalvo(), '2030-01-01'))).not.toContain('agenda:atrasado');

    await u.click(screen.getByRole('button', { name: 'Restaurar: Atrasado: Luz' }));
    expect(screen.getByRole('heading', { name: /Atrasado: Luz/ })).toBeInTheDocument();
    expect(preferenciasDe(lerEstadoSalvo()).dispensados).toEqual([]);
  });

  it('funções puras validam a data e recusam restaurar o que não está dispensado', () => {
    const e = estadoComAlertas();
    expect(dispensarAlerta(e, 'x', HOJE, '2026-02-30')).toMatchObject({ ok: false, campo: 'ate' });
    expect(dispensarAlerta(e, 'x', HOJE, HOJE)).toMatchObject({ ok: false, campo: 'ate' });
    expect(restaurarAlerta(e, 'x').ok).toBe(false);
    const r = dispensarAlerta(e, 'x', HOJE);
    expect(r.ok && preferenciasDe(r.valor).dispensados).toEqual([{ id: 'x' }]);
  });
});

describe('alertas: limiares (critério 13)', () => {
  it('valida dias e saldo mínimo junto ao campo e não grava valores inválidos', async () => {
    const u = userEvent.setup();
    renderizarApp('/alertas', construirEstado({ contas: [conta()] }));
    await u.click(screen.getByRole('button', { name: 'Configurar alertas' }));
    const dias = screen.getByLabelText('Dias de antecedência');
    await u.clear(dias);
    await u.type(dias, '31');
    await u.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    expect(dias).toHaveAccessibleDescription(/inteiro de 1 a 30/);
    await u.clear(dias);
    await u.type(dias, '5');
    const minimo = screen.getByLabelText('Saldo mínimo por conta (R$)');
    await u.clear(minimo);
    await u.type(minimo, '-10');
    await u.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    expect(minimo).toHaveAccessibleDescription(/não pode ser negativo/);
    expect(preferenciasDe(lerEstadoSalvoOuInicial()).limiares.diasAntecedencia).toBe(7);
  });

  it('salva dias, saldo mínimo e tipos ligados em preferenciasAlertas e passa a valer nos alertas', async () => {
    const u = userEvent.setup();
    renderizarApp('/alertas', construirEstado({ contas: [conta({ saldoInicial: 3000 })], agenda: [agenda({ id: 'x', vencimento: '2026-10-25' })] }));
    expect(screen.getByText('Tudo em dia')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Configurar alertas' }));
    await u.clear(screen.getByLabelText('Dias de antecedência'));
    await u.type(screen.getByLabelText('Dias de antecedência'), '10');
    await u.clear(screen.getByLabelText('Saldo mínimo por conta (R$)'));
    await u.type(screen.getByLabelText('Saldo mínimo por conta (R$)'), '50,00');
    await u.click(screen.getByRole('checkbox', { name: 'Metas com prazo' }));
    await u.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    expect(screen.getByText('Configuração salva.')).toBeInTheDocument();
    expect(preferenciasDe(lerEstadoSalvo()).limiares).toMatchObject({
      diasAntecedencia: 10,
      saldoMinimo: 5000,
      tiposAtivos: { meta: false, agenda: true },
    });
    expect(screen.getByRole('heading', { name: /Vence em 10 dias: Aluguel/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Saldo baixo: Corrente/ })).toBeInTheDocument();
  });

  it('dados salvos sem a chave carregam com os valores padrão', () => {
    const { preferenciasAlertas: _p, ...antigo } = estadoInicial();
    void _p;
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(antigo));
    const carga = carregar(localStorage);
    expect(carga.tipo).toBe('ok');
    if (carga.tipo === 'ok') expect(preferenciasDe(carga.estado)).toEqual(preferenciasPadrao());
    expect(estadoInicial().preferenciasAlertas).toEqual(preferenciasPadrao());
  });
});

function lerEstadoSalvoOuInicial(): AppState {
  return lerEstadoSalvo() ?? estadoInicial();
}

describe('alertas: ContadorAlertas e navegação (critério 14)', () => {
  const renderContador = (estado: AppState) => {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    return render(
      <StoreProvider store={new Store(localStorage)}>
        <MemoryRouter>
          <ContadorAlertas />
        </MemoryRouter>
      </StoreProvider>,
    );
  };

  it('mostra a quantidade, os críticos em texto e link para /alertas', () => {
    renderContador(estadoComAlertas());
    const link = screen.getByRole('link', { name: /4 alertas, 2 críticos/ });
    expect(link).toHaveAttribute('href', '/alertas');
    expect(link).toHaveTextContent('4 alertas');
    expect(link).toHaveTextContent('2 críticos');
  });

  it('sem alertas mostra "Sem alertas"', () => {
    renderContador(construirEstado({ contas: [conta()] }));
    expect(screen.getByRole('link', { name: /Sem alertas/ })).toHaveAttribute('href', '/alertas');
  });

  it('ignora alertas dispensados', () => {
    const r = dispensarAlerta(estadoComAlertas(), 'agenda:atrasado', HOJE);
    if (!r.ok) throw new Error(r.erro);
    renderContador(r.valor);
    expect(screen.getByRole('link', { name: /3 alertas, 1 crítico/ })).toBeInTheDocument();
  });

  it('o item Alertas está na navegação principal e leva à central', () => {
    expect(itensNavegacao).toContainEqual({ to: '/alertas', rotulo: 'Alertas' });
    renderizarApp('/alertas', construirEstado({ contas: [conta()] }));
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Alertas' })).toHaveAttribute('href', '/alertas');
  });
});
