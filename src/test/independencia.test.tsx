import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { hojeISO, mesDe, nomeMes, somarMeses } from '../domain/date';
import {
  aporteNecessario,
  bpParaCampo,
  cenariosDeRetorno,
  excluirCenario,
  formatarPrazo,
  jurosDoMes,
  lerFormulario,
  listaCenarios,
  parsePercentualBp,
  patrimonioAlvo,
  salvarCenario,
  sensibilidadeAporte,
  simular,
  sugerirPremissas,
  taxaMensalPpb,
  type FormularioIndependencia,
  type ParametrosIndependencia,
} from '../domain/independencia';
import type { AppState, Ativo, Transacao } from '../domain/types';
import { estadoInicial, migrar } from '../storage/storage';
import { itensNavegacao } from '../navegacao';
import { construirEstado, lerEstadoSalvo, renderizarApp } from './helpers';

const HOJE = '2026-10-15';

/** R$ 3.000,00 por mês a 4% de retirada: alvo de R$ 900.000,00; R$ 1.000,00 por mês a 0% leva 900 meses. */
const BASE: ParametrosIndependencia = { patrimonio: 0, aporteMensal: 100000, retornoAnualBp: 0, gastoMensal: 300000, taxaRetiradaBp: 400 };

const FORM: FormularioIndependencia = {
  patrimonio: '0,00',
  aporteMensal: '1000,00',
  retornoAnual: '0',
  gastoMensal: '3000,00',
  taxaRetirada: '4',
  idadeAtual: '',
  idadeAlvo: '',
};

async function preencher(rotulo: string | RegExp, valor: string) {
  const campo = screen.getByLabelText(rotulo);
  await userEvent.clear(campo);
  if (valor) await userEvent.type(campo, valor);
}

async function preencherBase(extra: Partial<Record<string, string>> = {}) {
  await preencher(/Patrimônio investido atual/, extra.patrimonio ?? '0');
  await preencher(/Aporte mensal/, extra.aporte ?? '1000');
  await preencher(/Gasto mensal desejado/, extra.gasto ?? '3000');
  await preencher(/Retorno real anual/, extra.retorno ?? '0');
  await preencher(/Taxa de retirada/, extra.taxa ?? '4');
}

describe('independência: cálculo (critérios 1 a 3)', () => {
  it('1: alvo = gasto anual / taxa de retirada', () => {
    expect(patrimonioAlvo(300000, 400)).toBe(90000000);
    expect(patrimonioAlvo(500000, 500)).toBe(120000000);
    expect(patrimonioAlvo(100, 300)).toBe(40000);
  });

  it('2: retorno 0%, aporte R$ 1.000,00 e alvo R$ 900.000,00 levam 900 meses; patrimônio acima do alvo leva 0', () => {
    const s = simular(BASE, undefined, HOJE);
    expect(s.alvo).toBe(90000000);
    expect(s.meses).toBe(900);
    expect(s.mesAlvo).toBe(somarMeses('2026-10', 900));
    expect(s.anual).toHaveLength(75);
    expect(s.anual[74]).toEqual({ ano: 75, meses: 900, patrimonio: 90000000, aportado: 90000000, rendimento: 0 });
    const pronto = simular({ ...BASE, patrimonio: 90000000 }, undefined, HOJE);
    expect(pronto.meses).toBe(0);
    expect(pronto.mesAlvo).toBe('2026-10');
    expect(pronto.anual).toEqual([]);
    expect(formatarPrazo(900)).toBe('75 anos');
    expect(formatarPrazo(0)).toBe('0 mês');
    expect(formatarPrazo(13)).toBe('1 ano e 1 mês');
  });

  it('3: 6% ao ano equivale a 4.867.551 ppb ao mês e R$ 10.000,00 rendem R$ 48,68, em inteiros', () => {
    expect(taxaMensalPpb(600)).toBe(4867551);
    expect(taxaMensalPpb(0)).toBe(0);
    expect(jurosDoMes(1000000, 4867551)).toBe(4868);
    expect(jurosDoMes(100, 4867551)).toBe(0);
    expect(jurosDoMes(0, 4867551)).toBe(0);
    // Um mês, aporte zero: 1.000.000 + 4.868. Alvo 1.004.868 (gasto 100.486,8 não é inteiro; usa-se alvo por taxa 12%).
    const p: ParametrosIndependencia = { patrimonio: 1000000, aporteMensal: 0, retornoAnualBp: 600, gastoMensal: 83739, taxaRetiradaBp: 10000 };
    const s = simular(p, undefined, HOJE);
    expect(s.alvo).toBe(1004868);
    expect(s.meses).toBe(1);
    expect(s.anual[0].patrimonio).toBe(1004868);
    expect(simular(p, undefined, HOJE)).toEqual(s);
    const longo = simular({ ...BASE, patrimonio: 12345678, retornoAnualBp: 650 }, undefined, HOJE);
    expect(longo.anual.every((a) => Number.isInteger(a.patrimonio) && Number.isInteger(a.rendimento))).toBe(true);
    expect(longo.anual.every((a) => a.patrimonio === 12345678 + a.aportado + a.rendimento)).toBe(true);
  });

  it('4: sem chegar ao alvo em 100 anos devolve inalcançável', () => {
    const s = simular({ ...BASE, aporteMensal: 0 }, undefined, HOJE);
    expect(s.alcancavel).toBe(false);
    expect(s.meses).toBeNull();
    expect(s.mesAlvo).toBeNull();
    expect(s.anual).toHaveLength(100);
    // 899 aportes não bastam em 100 anos? 1200 meses de R$ 1.000,00 = R$ 1.200.000,00: basta; R$ 700,00 não.
    expect(simular({ ...BASE, aporteMensal: 70000 }).meses).toBeNull();
    expect(simular({ ...BASE, aporteMensal: 75000 }).meses).toBe(1200);
  });

  it('5: aporte necessário para a idade alvo (busca binária)', () => {
    // R$ 900.000,00 em 240 meses a 0%: exatamente R$ 3.750,00 por mês.
    expect(aporteNecessario(BASE, 240)).toBe(375000);
    expect(aporteNecessario({ ...BASE, patrimonio: 90000000 }, 240)).toBe(0);
  });

  it('6: último ano parcial entra na tabela anual', () => {
    const s = simular({ ...BASE, gastoMensal: 1000 }, undefined, HOJE);
    expect(s.alvo).toBe(300000);
    expect(s.anual).toEqual([{ ano: 1, meses: 3, patrimonio: 300000, aportado: 300000, rendimento: 0 }]);
    const dois = simular({ ...BASE, gastoMensal: 5000 }, undefined, HOJE);
    expect(dois.meses).toBe(15);
    expect(dois.anual.map((a) => [a.ano, a.meses])).toEqual([[1, 12], [2, 15]]);
  });

  it('7: retorno maior nunca aumenta o prazo; faixa de ± 2 p.p.', () => {
    const p = { ...BASE, patrimonio: 5000000, retornoAnualBp: 500 };
    const c = cenariosDeRetorno(p, HOJE);
    expect(c.map((x) => [x.nome, x.retornoAnualBp])).toEqual([['Pessimista', 300], ['Base', 500], ['Otimista', 700]]);
    const [pess, base, otim] = c.map((x) => x.simulacao.meses as number);
    expect(pess).toBeGreaterThanOrEqual(base);
    expect(base).toBeGreaterThanOrEqual(otim);
    expect(pess).toBeGreaterThan(otim);
  });

  it('8: aporte +10%, +25% e +50% antecipam a data', () => {
    const l = sensibilidadeAporte(BASE, HOJE);
    expect(l.map((x) => x.aporteMensal)).toEqual([110000, 125000, 150000]);
    expect(l.map((x) => x.simulacao.meses)).toEqual([819, 720, 600]);
    expect(l.map((x) => x.mesesAntecipados)).toEqual([81, 180, 300]);
  });
});

describe('independência: validação e sugestões (critérios 9 e 10)', () => {
  it('9: cada campo é validado', () => {
    expect(lerFormulario(FORM)).toEqual({ ok: true, valor: BASE });
    const r = lerFormulario({ ...FORM, patrimonio: '-1', aporteMensal: 'abc', gastoMensal: '0', retornoAnual: '31', taxaRetirada: '0,05', idadeAtual: '121' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['aporteMensal', 'gastoMensal', 'idadeAtual', 'patrimonio', 'retornoAnual', 'taxaRetirada']);
    const idades = (idadeAtual: string, idadeAlvo: string) => lerFormulario({ ...FORM, idadeAtual, idadeAlvo });
    expect(idades('', '60')).toMatchObject({ ok: false, erros: { idadeAtual: expect.any(String) } });
    expect(idades('40', '40')).toMatchObject({ ok: false, erros: { idadeAlvo: expect.any(String) } });
    expect(idades('40', '4,5')).toMatchObject({ ok: false, erros: { idadeAlvo: expect.any(String) } });
    expect(idades('40', '55')).toEqual({ ok: true, valor: { ...BASE, idadeAtual: 40, idadeAlvo: 55 } });
    expect(lerFormulario({ ...FORM, retornoAnual: '-5' }).ok).toBe(true);
    expect(parsePercentualBp('4,25')).toBe(425);
    expect(parsePercentualBp('4,255')).toBeNull();
    expect(bpParaCampo(425)).toBe('4,25');
    expect(bpParaCampo(400)).toBe('4');
  });

  it('10: sugestões vêm da carteira e das médias dos meses-base', () => {
    expect(sugerirPremissas(estadoInicial(), HOJE)).toEqual({ patrimonio: null, aporteMensal: null, gastoMensal: null });
    const estado = estadoComDados(HOJE);
    expect(sugerirPremissas(estado, HOJE)).toEqual({ patrimonio: 1000000, aporteMensal: 200000, gastoMensal: 300000 });
    const gastando = construirEstado({ transacoes: [tx('a', somarMeses(mesDe(HOJE), -1), 'despesa', 50000)] });
    expect(sugerirPremissas(gastando, HOJE).aporteMensal).toBe(0);
  });
});

describe('independência: cenários salvos (critérios 11 a 13)', () => {
  it('11: salva até 5 cenários com nome único', () => {
    let estado = estadoInicial();
    expect(salvarCenario(estado, '  ', BASE)).toMatchObject({ ok: false, campo: 'nome' });
    expect(salvarCenario(estado, 'x'.repeat(41), BASE)).toMatchObject({ ok: false });
    for (let i = 1; i <= 5; i++) {
      const r = salvarCenario(estado, `Plano ${i}`, BASE);
      expect(r.ok).toBe(true);
      if (r.ok) estado = r.valor;
    }
    expect(listaCenarios(estado)).toHaveLength(5);
    expect(salvarCenario(estado, 'plano 1', BASE)).toMatchObject({ ok: false, erro: 'Já existe um cenário com esse nome.' });
    expect(salvarCenario(estado, 'Plano 6', BASE)).toMatchObject({ ok: false });
    const sem = excluirCenario(estado, listaCenarios(estado)[0].id);
    expect(sem.ok && listaCenarios(sem.valor)).toHaveLength(4);
    expect(excluirCenario(estado, 'nao-existe').ok).toBe(false);
  });

  it('13: dados sem a chave carregam com lista vazia, sem mudar a versão do esquema', () => {
    const { cenariosIndependencia: _omitida, ...antigo } = estadoInicial();
    const r = migrar(antigo);
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(listaCenarios(r.estado)).toEqual([]);
      expect(r.estado.schemaVersion).toBe(estadoInicial().schemaVersion);
    }
  });
});

describe('independência: tela', () => {
  it('14: o item Independência da navegação leva a /independencia', async () => {
    expect(itensNavegacao).toContainEqual({ to: '/independencia', rotulo: 'Independência' });
    renderizarApp('/independencia');
    expect(await screen.findByRole('heading', { level: 1, name: 'Independência financeira' })).toBeInTheDocument();
  });

  it('1, 2 e 5: mostra alvo, prazo, data estimada e idade na tela', async () => {
    renderizarApp('/independencia');
    await preencherBase();
    expect(screen.getByTestId('indep-alvo')).toHaveTextContent(/900\.000,00/);
    expect(screen.getByTestId('indep-prazo')).toHaveTextContent('75 anos');
    expect(screen.getByTestId('indep-data')).toHaveTextContent(nomeMes(somarMeses(mesDe(hojeISO()), 900)));
    await preencher(/Idade atual/, '30');
    await preencher(/Idade alvo/, '50');
    expect(screen.getByText('Você terá 105 anos ao atingir a independência.')).toBeInTheDocument();
    expect(screen.getByText(/Fora da idade alvo de 50 anos: atraso de 55 anos\./)).toBeInTheDocument();
    expect(screen.getByText(/Aporte mensal necessário para chegar aos 50 anos: R\$\s3\.750,00\./)).toBeInTheDocument();
    await preencher(/Patrimônio investido atual/, '900000');
    expect(screen.getByTestId('indep-prazo')).toHaveTextContent('0 mês');
    expect(screen.getByText(/Independência já atingida/)).toBeInTheDocument();
  });

  it('4: mostra a mensagem de inalcançável e nenhuma data', async () => {
    renderizarApp('/independencia');
    await preencherBase({ aporte: '0' });
    expect(screen.getByText(/Não é alcançável em 100 anos com estas premissas/)).toBeInTheDocument();
    expect(screen.getByTestId('indep-data')).toHaveTextContent('—');
  });

  it('6: gráfico com rótulo e tabela anual com o mesmo conteúdo', async () => {
    renderizarApp('/independencia');
    await preencherBase({ gasto: '5000', aporte: '10000', retorno: '0' });
    // alvo R$ 1.500.000,00 / R$ 10.000,00 = 150 meses = 12 anos e 6 meses.
    expect(screen.getByTestId('indep-prazo')).toHaveTextContent('12 anos e 6 meses');
    expect(screen.getByRole('img', { name: /Gráfico de linhas da evolução anual/ })).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Evolução anual do patrimônio' });
    const linhas = within(tabela).getAllByRole('row');
    expect(linhas).toHaveLength(1 + 13);
    expect(within(linhas[13]).getByRole('rowheader')).toHaveTextContent('13 (parcial)');
    expect(within(linhas[13]).getAllByRole('cell')[0]).toHaveTextContent(/1\.500\.000,00/);
  });

  it('7 e 8: cenários de retorno e sensibilidade aparecem lado a lado', async () => {
    renderizarApp('/independencia');
    await preencherBase();
    const cen = within(screen.getByRole('table', { name: 'Cenários de retorno lado a lado' }));
    expect(cen.getAllByRole('row')).toHaveLength(4);
    expect(cen.getByRole('rowheader', { name: 'Pessimista' })).toBeInTheDocument();
    expect(cen.getByRole('rowheader', { name: 'Otimista' })).toBeInTheDocument();
    const sens = within(screen.getByRole('table', { name: 'Sensibilidade ao aporte mensal' }));
    const linhas = sens.getAllByRole('row');
    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toHaveTextContent('+10%');
    expect(linhas[1]).toHaveTextContent('68 anos e 3 meses');
    expect(linhas[1]).toHaveTextContent('81 meses');
    expect(linhas[3]).toHaveTextContent('50 anos');
    expect(linhas[3]).toHaveTextContent('300 meses');
  });

  it('9: valida cada campo junto a ele e esconde o resultado', async () => {
    renderizarApp('/independencia');
    await preencherBase({ gasto: '0', taxa: '30', retorno: '40' });
    expect(screen.getByLabelText(/Gasto mensal desejado/)).toBeInvalid();
    expect(screen.getByText('O gasto mensal deve ser maior que zero.')).toBeInTheDocument();
    expect(screen.getByText('Informe uma taxa entre 0,1% e 20% ao ano.')).toBeInTheDocument();
    expect(screen.getByText('Informe um retorno entre -5% e 30% ao ano.')).toBeInTheDocument();
    expect(screen.queryByTestId('indep-alvo')).not.toBeInTheDocument();
    expect(screen.getByText('Preencha as premissas para ver o resultado')).toBeInTheDocument();
  });

  it('10: sugestões vêm dos dados e podem ser usadas e editadas', async () => {
    renderizarApp('/independencia', estadoComDados(hojeISO()));
    expect(screen.getByLabelText(/Patrimônio investido atual/)).toHaveValue('10000,00');
    await userEvent.click(screen.getByRole('button', { name: /usar R\$\s3\.000,00/ }));
    expect(screen.getByLabelText(/Gasto mensal desejado/)).toHaveValue('3000,00');
    await userEvent.click(screen.getByRole('button', { name: /usar R\$\s2\.000,00/ }));
    expect(screen.getByLabelText(/Aporte mensal/)).toHaveValue('2000,00');
    await preencher(/Aporte mensal/, '2500');
    expect(screen.getByLabelText(/Aporte mensal/)).toHaveValue('2500');
  });

  it('10: sem dados avisa que não há sugestão', () => {
    renderizarApp('/independencia');
    expect(screen.getAllByText(/Sem dados para sugerir/)).toHaveLength(2 + 1);
  });

  it('11, 12: salva, compara, carrega e exclui cenários', async () => {
    const { store } = renderizarApp('/independencia');
    expect(screen.getByText('Nenhum cenário salvo')).toBeInTheDocument();
    await preencherBase();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cenário atual' }));
    expect(screen.getByText('Informe um nome para o cenário.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome do cenário'), 'Aporte atual');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cenário atual' }));
    await preencher(/Aporte mensal/, '1500');
    await userEvent.type(screen.getByLabelText('Nome do cenário'), 'Aporte maior');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cenário atual' }));
    expect(listaCenarios(lerEstadoSalvo()).map((c) => c.nome)).toEqual(['Aporte atual', 'Aporte maior']);
    expect(listaCenarios(store.getSnapshot().estado)[1].parametros.aporteMensal).toBe(150000);

    const comparacao = within(screen.getByRole('table', { name: 'Comparação dos cenários salvos' }));
    const linhas = comparacao.getAllByRole('row');
    expect(linhas).toHaveLength(3);
    expect(linhas[1]).toHaveTextContent('75 anos');
    expect(linhas[2]).toHaveTextContent('50 anos');
    expect(screen.getByText('2 de 5 cenários salvos.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Carregar cenário Aporte atual' }));
    expect(screen.getByLabelText(/Aporte mensal/)).toHaveValue('1000,00');
    expect(screen.getByTestId('indep-prazo')).toHaveTextContent('75 anos');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir cenário Aporte maior' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(listaCenarios(lerEstadoSalvo())).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir cenário Aporte maior' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    expect(listaCenarios(lerEstadoSalvo()).map((c) => c.nome)).toEqual(['Aporte atual']);
  });

  it('11: recusa o sexto cenário e nome repetido na tela', async () => {
    const estado = construirEstado();
    let atual: AppState = estado;
    for (let i = 1; i <= 5; i++) {
      const r = salvarCenario(atual, `Plano ${i}`, BASE);
      if (r.ok) atual = r.valor;
    }
    renderizarApp('/independencia', atual);
    await preencherBase();
    await userEvent.type(screen.getByLabelText('Nome do cenário'), 'Plano 1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cenário atual' }));
    expect(screen.getByText('Já existe um cenário com esse nome.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nome do cenário'));
    await userEvent.type(screen.getByLabelText('Nome do cenário'), 'Plano 6');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cenário atual' }));
    expect(screen.getByText(/no máximo 5 cenários/)).toBeInTheDocument();
    expect(listaCenarios(lerEstadoSalvo())).toHaveLength(5);
  });
});

// ------------------------------------------------------------------ fixtures

function tx(id: string, mes: string, tipo: 'receita' | 'despesa', valor: number): Transacao {
  return { id, contaId: 'c1', categoriaId: 'cat', tipo, valor, data: `${mes}-10`, descricao: id, criadaEm: 1 };
}

/** Carteira de R$ 10.000,00 e, nos três meses anteriores a `hoje`, receitas de R$ 5.000,00 e despesas de R$ 3.000,00. */
function estadoComDados(hoje: string): AppState {
  const atual = mesDe(hoje);
  const transacoes = [-3, -2, -1].flatMap((d, i) => [tx(`r${i}`, somarMeses(atual, d), 'receita', 500000), tx(`d${i}`, somarMeses(atual, d), 'despesa', 300000)]);
  const ativo: Ativo = {
    id: 'a1',
    nome: 'CDB',
    classe: 'renda-fixa',
    movimentos: [{ id: 'm1', tipo: 'aporte', data: '2026-01-10', valor: 1000000 }],
    marcacoes: [],
    criadoEm: 1,
  };
  return construirEstado({ transacoes, investimentos: [ativo] });
}
