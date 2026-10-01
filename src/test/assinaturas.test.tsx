import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  cancelarAssinatura,
  criarAssinaturaManual,
  custoAnual,
  custoMensal,
  decidirAssinatura,
  desfazerDecisao,
  detectarAssinaturas,
  listarAssinaturas,
  reativarAssinatura,
  somarPeriodo,
  totaisAssinaturas,
  validarManual,
} from '../domain/assinaturas';
import { formatarMoeda } from '../domain/money';
import type { Transacao } from '../domain/types';
import { itensNavegacao } from '../navegacao';
import { migrar } from '../storage/storage';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

let seq = 0;
const t = (descricao: string, data: string, valor: number, parcial: Partial<Transacao> = {}): Transacao => ({
  id: `t${++seq}`,
  contaId: 'a',
  categoriaId: 'cat-outros-despesa',
  tipo: 'despesa',
  valor,
  data,
  descricao,
  criadaEm: seq,
  ...parcial,
});

const HOJE = '2026-10-01';
const netflix = (ultimo = 3990) => [t('Netflix', '2026-07-05', 3990), t('NETFLIX ', '2026-08-05', 3990), t('netflix', '2026-09-05', ultimo)];

describe('assinaturas: detecção (critério 10)', () => {
  it('detecta mensal com descrição normalizada e valor igual', () => {
    const [d] = detectarAssinaturas(construirEstado({ transacoes: netflix() }));
    expect(d).toMatchObject({ frequencia: 'mensal', ocorrencias: 3, valorMedio: 3990, ultimaCobranca: '2026-09-05', proximaCobranca: '2026-10-05' });
  });

  it('detecta semanal e anual', () => {
    const semanal = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((d) => t('Feira Orgânica', d, 2000));
    const anual = ['2024-03-10', '2025-03-10', '2026-03-11'].map((d) => t('Seguro Auto', d, 120000));
    const r = detectarAssinaturas(construirEstado({ transacoes: [...semanal, ...anual] }));
    expect(r.map((x) => x.frequencia).sort()).toEqual(['anual', 'semanal']);
  });

  it('aceita variação de valor até o limite e recusa acima dele', () => {
    const leve = [t('Spotify', '2026-07-10', 2000), t('Spotify', '2026-08-10', 2100), t('Spotify', '2026-09-10', 2200)];
    expect(detectarAssinaturas(construirEstado({ transacoes: leve }))).toHaveLength(1);
    const forte = [t('Spotify', '2026-07-10', 2000), t('Spotify', '2026-08-10', 3500), t('Spotify', '2026-09-10', 2000)];
    expect(detectarAssinaturas(construirEstado({ transacoes: forte }))).toHaveLength(0);
    expect(detectarAssinaturas(construirEstado({ transacoes: forte }), { variacaoMaxPct: 80 })).toHaveLength(1);
  });

  it('exige 3 ocorrências, intervalos regulares, despesas e descrição preenchida', () => {
    const duas = [t('Gym', '2026-08-01', 9000), t('Gym', '2026-09-01', 9000)];
    const irregular = [t('Cafe', '2026-07-01', 500), t('Cafe', '2026-07-12', 500), t('Cafe', '2026-09-20', 500)];
    const receitas = netflix().map((x) => ({ ...x, tipo: 'receita' as const }));
    const vazias = [t('  ', '2026-07-05', 100), t('', '2026-08-05', 100), t('', '2026-09-05', 100)];
    expect(detectarAssinaturas(construirEstado({ transacoes: [...duas, ...irregular, ...receitas, ...vazias] }))).toEqual([]);
  });

  it('é determinística e não altera as transações', () => {
    const estado = construirEstado({ transacoes: netflix() });
    const antes = JSON.stringify(estado.transacoes);
    expect(detectarAssinaturas(estado)).toEqual(detectarAssinaturas(estado));
    decidirAssinatura(estado, detectarAssinaturas(estado)[0].chave, 'ignorada');
    expect(JSON.stringify(estado.transacoes)).toBe(antes);
  });
});

describe('assinaturas: cálculos e listagem (critério 11)', () => {
  it('calcula custos mensal e anual por frequência', () => {
    expect(custoMensal(1200, 'semanal')).toBe(5200);
    expect(custoAnual(1200, 'semanal')).toBe(62400);
    expect(custoMensal(1000, 'mensal')).toBe(1000);
    expect(custoAnual(1000, 'mensal')).toBe(12000);
    expect(custoMensal(10000, 'anual')).toBe(833);
    expect(custoAnual(10000, 'anual')).toBe(10000);
  });

  it('próxima cobrança preserva o dia e limita ao fim do mês', () => {
    expect(somarPeriodo('2026-01-31', 'mensal')).toBe('2026-02-28');
    expect(somarPeriodo('2026-12-15', 'mensal')).toBe('2027-01-15');
    expect(somarPeriodo('2024-02-29', 'anual')).toBe('2025-02-28');
    expect(somarPeriodo('2026-12-28', 'semanal')).toBe('2027-01-04');
  });

  it('marca como atrasada a cobrança estimada no passado', () => {
    const [i] = listarAssinaturas(construirEstado({ transacoes: netflix() }), '2026-10-20');
    expect(i.atrasada).toBe(true);
    expect(listarAssinaturas(construirEstado({ transacoes: netflix() }), HOJE)[0].atrasada).toBe(false);
  });

  it('a tela mostra os dados de cada assinatura e navegação tem o item', async () => {
    expect(itensNavegacao).toContainEqual({ to: '/assinaturas', rotulo: 'Assinaturas' });
    renderizarApp('/assinaturas', construirEstado({ transacoes: netflix() }));
    expect(await screen.findByRole('heading', { name: 'Assinaturas', level: 1 })).toBeInTheDocument();
    const item = screen.getByTestId('assinatura-netflix|mensal');
    expect(within(item).getByText('Mensal')).toBeInTheDocument();
    expect(within(item).getAllByText(formatarMoeda(3990)).length).toBeGreaterThan(0);
    expect(within(item).getByText('05/09/2026')).toBeInTheDocument();
    expect(within(item).getByText(formatarMoeda(3990 * 12))).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há nada', () => {
    renderizarApp('/assinaturas', construirEstado());
    expect(screen.getByText('Nenhuma assinatura encontrada')).toBeInTheDocument();
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(0));
  });
});

describe('assinaturas: decisões (critério 12)', () => {
  it('confirmar e ignorar gravam em assinaturasDecisoes e podem ser desfeitos', () => {
    const e0 = construirEstado({ transacoes: netflix() });
    const chave = detectarAssinaturas(e0)[0].chave;
    const r = decidirAssinatura(e0, chave, 'confirmada');
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.assinaturasDecisoes).toEqual([{ chave, decisao: 'confirmada' }]);
    const i = decidirAssinatura(r.valor, chave, 'ignorada');
    if (!i.ok) throw new Error(i.erro);
    expect(i.valor.assinaturasDecisoes).toEqual([{ chave, decisao: 'ignorada' }]);
    const d = desfazerDecisao(i.valor, chave);
    if (!d.ok) throw new Error(d.erro);
    expect(d.valor.assinaturasDecisoes).toEqual([]);
    expect(decidirAssinatura(e0, 'inexistente|mensal', 'confirmada').ok).toBe(false);
  });

  it('só confirmadas entram no total', () => {
    const e0 = construirEstado({ transacoes: [...netflix(), ...['2026-07-01', '2026-08-01', '2026-09-01'].map((d) => t('Academia', d, 10000))] });
    const pend = totaisAssinaturas(listarAssinaturas(e0, HOJE));
    expect(pend).toMatchObject({ ativas: 0, pendentes: 2, mensal: 0 });
    const r = decidirAssinatura(e0, 'academia|mensal', 'confirmada');
    if (!r.ok) throw new Error(r.erro);
    const r2 = decidirAssinatura(r.valor, 'netflix|mensal', 'ignorada');
    if (!r2.ok) throw new Error(r2.erro);
    expect(totaisAssinaturas(listarAssinaturas(r2.valor, HOJE))).toMatchObject({ ativas: 1, pendentes: 0, mensal: 10000, anual: 120000 });
  });

  it('na tela, confirmar persiste, a situação aparece em texto e ignoradas ficam recolhidas', async () => {
    const user = userEvent.setup();
    const { unmount } = renderizarApp('/assinaturas', construirEstado({ transacoes: netflix() }));
    const item = screen.getByTestId('assinatura-netflix|mensal');
    expect(within(item).getByText('Pendente')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar netflix' }));
    expect(within(screen.getByTestId('assinatura-netflix|mensal')).getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(3990));
    expect(lerEstadoSalvo().assinaturasDecisoes).toEqual([{ chave: 'netflix|mensal', decisao: 'confirmada' }]);
    unmount();
    renderizarApp('/assinaturas');
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(3990));
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer decisão de netflix' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ignorar netflix' }));
    expect(screen.getByText('Ignoradas (1)')).toBeInTheDocument();
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(0));
  });
});

describe('assinaturas: manuais e cancelamento (critério 13)', () => {
  const dados = { descricao: '  iCloud ', valor: 1490, frequencia: 'mensal' as const, proximaCobranca: '2026-10-12' };

  it('valida descrição, valor, frequência e data', () => {
    expect(validarManual({ ...dados, descricao: '  ' })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(validarManual({ ...dados, descricao: 'x'.repeat(101) })).toMatchObject({ ok: false, campo: 'descricao' });
    expect(validarManual({ ...dados, valor: 0 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(validarManual({ ...dados, valor: 10.5 })).toMatchObject({ ok: false, campo: 'valor' });
    expect(validarManual({ ...dados, proximaCobranca: '2026-02-31' })).toMatchObject({ ok: false, campo: 'proximaCobranca' });
    expect(validarManual({ ...dados, frequencia: 'diaria' as never })).toMatchObject({ ok: false, campo: 'frequencia' });
    expect(validarManual(dados)).toMatchObject({ ok: true, valor: { descricao: 'iCloud' } });
  });

  it('cadastra manual, cancela, soma a economia anual e reativa', () => {
    const c = criarAssinaturaManual(construirEstado(), dados);
    if (!c.ok) throw new Error(c.erro);
    let itens = listarAssinaturas(c.valor, HOJE);
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ origem: 'manual', situacao: 'confirmada', custoMensal: 1490 });
    expect(totaisAssinaturas(itens)).toMatchObject({ mensal: 1490, anual: 17880, economiaAnual: 0 });
    const x = cancelarAssinatura(c.valor, itens[0].chave, HOJE);
    if (!x.ok) throw new Error(x.erro);
    itens = listarAssinaturas(x.valor, HOJE);
    expect(itens[0]).toMatchObject({ situacao: 'cancelada', canceladaEm: HOJE });
    expect(totaisAssinaturas(itens)).toMatchObject({ mensal: 0, anual: 0, economiaAnual: 17880 });
    const re = reativarAssinatura(x.valor, itens[0].chave);
    if (!re.ok) throw new Error(re.erro);
    expect(listarAssinaturas(re.valor, HOJE)[0].situacao).toBe('confirmada');
  });

  it('cancelar uma detecção a confirma e registra a data', () => {
    const e0 = construirEstado({ transacoes: netflix() });
    const r = cancelarAssinatura(e0, 'netflix|mensal', HOJE);
    if (!r.ok) throw new Error(r.erro);
    expect(r.valor.assinaturasDecisoes).toEqual([{ chave: 'netflix|mensal', decisao: 'confirmada', canceladaEm: HOJE }]);
    expect(cancelarAssinatura(e0, 'nada|mensal', HOJE).ok).toBe(false);
  });

  it('na tela: erro junto ao campo, cadastro, cancelamento com confirmação e economia anual', async () => {
    const user = userEvent.setup();
    renderizarApp('/assinaturas', construirEstado());
    await user.click(screen.getByRole('button', { name: 'Nova assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Salvar assinatura' }));
    expect(screen.getByText('Informe a descrição.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Descrição'), 'iCloud');
    await user.click(screen.getByRole('button', { name: 'Salvar assinatura' }));
    expect(screen.getByText('O valor deve ser maior que zero.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Valor (R$)'), '14,90');
    await user.click(screen.getByRole('button', { name: 'Salvar assinatura' }));
    expect(await screen.findByText('Manual')).toBeInTheDocument();
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(1490));

    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura iCloud' }));
    const dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Marcar como cancelada' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('economia-anual')).toHaveTextContent(formatarMoeda(17880));
    expect(screen.getByTestId('total-mensal')).toHaveTextContent(formatarMoeda(0));
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });
});

describe('assinaturas: aumento de preço e dados (critério 14)', () => {
  it('detecta aumento da última cobrança em relação à anterior', () => {
    const [d] = detectarAssinaturas(construirEstado({ transacoes: netflix(4490) }));
    expect(d.aumento).toEqual({ anterior: 3990, atual: 4490, pct: 12.5 });
    expect(detectarAssinaturas(construirEstado({ transacoes: netflix() }))[0].aumento).toBeUndefined();
    expect(detectarAssinaturas(construirEstado({ transacoes: netflix(3500) }))[0].aumento).toBeUndefined();
  });

  it('mostra o alerta de aumento na tela', () => {
    renderizarApp('/assinaturas', construirEstado({ transacoes: netflix(4490) }));
    const alerta = screen.getByText(/Aumento de preço/);
    expect(alerta).toHaveTextContent(`de ${formatarMoeda(3990)} para ${formatarMoeda(4490)}`);
    expect(alerta).toHaveTextContent('+12,5%');
  });

  it('dados sem a chave carregam com lista vazia e as operações não tocam nas transações', () => {
    const { assinaturasDecisoes: _a, ...antigo } = construirEstado({ transacoes: netflix() });
    void _a;
    const r = migrar(antigo);
    expect(r.tipo).toBe('ok');
    if (r.tipo !== 'ok') return;
    expect(r.estado.assinaturasDecisoes).toEqual([]);
    const c = criarAssinaturaManual(r.estado, { descricao: 'X', valor: 100, frequencia: 'anual', proximaCobranca: '2027-01-01' });
    if (!c.ok) throw new Error(c.erro);
    expect(c.valor.transacoes).toBe(r.estado.transacoes);
  });
});
