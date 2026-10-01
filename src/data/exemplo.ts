import { SCHEMA_ATUAL } from '../storage/storage';
import { dataValida, diasNoMes, mesDe, somarMeses } from '../domain/date';
import type { Aporte, Ativo, AppState, Conta, Meta, Mes, Orcamento, Recorrencia, Transacao } from '../domain/types';
import { categoriasPadrao } from './categoriasPadrao';

const ID_CORRENTE = 'ex-conta-corrente';
const ID_POUPANCA = 'ex-conta-poupanca';
const ID_CARTAO = 'ex-conta-cartao';
const ID_CARTEIRA = 'ex-conta-carteira';

type Modelo = [dia: number, descricao: string, valor: number, categoriaId: string, contaId: string];

const despesasMensais: Modelo[] = [
  [10, 'Aluguel', 150000, 'cat-moradia', ID_CORRENTE],
  [12, 'Conta de luz', 18990, 'cat-moradia', ID_CORRENTE],
  [14, 'Internet', 9990, 'cat-moradia', ID_CORRENTE],
  [3, 'Supermercado', 42000, 'cat-alimentacao', ID_CARTAO],
  [11, 'Supermercado', 38550, 'cat-alimentacao', ID_CARTAO],
  [19, 'Feira e padaria', 16400, 'cat-alimentacao', ID_CARTEIRA],
  [25, 'Supermercado', 35200, 'cat-alimentacao', ID_CARTAO],
  [6, 'Combustível', 22000, 'cat-transporte', ID_CARTAO],
  [20, 'Aplicativo de transporte', 8700, 'cat-transporte', ID_CARTAO],
  [8, 'Farmácia', 9650, 'cat-saude', ID_CORRENTE],
  [16, 'Cinema e jantar', 21500, 'cat-lazer', ID_CARTAO],
  [22, 'Streaming', 5590, 'cat-lazer', ID_CARTAO],
  [18, 'Curso online', 12900, 'cat-educacao', ID_CORRENTE],
];

function dataNoMes(mes: Mes, dia: number): string {
  const [ano, m] = mes.split('-').map(Number);
  const d = Math.min(dia, diasNoMes(ano, m));
  return `${mes}-${String(d).padStart(2, '0')}`;
}

/**
 * Gera um conjunto de dados de exemplo relativo à data informada: quatro meses
 * completos de histórico mais o mês corrente até o dia de hoje.
 */
export function gerarExemplo(hoje: string): AppState {
  if (!dataValida(hoje)) throw new Error(`Data inválida: ${hoje}`);
  const mesAtual = mesDe(hoje);
  const criadaEm = 1;

  const contas: Conta[] = [
    { id: ID_CORRENTE, nome: 'Conta corrente', tipo: 'corrente', saldoInicial: 250000, arquivada: false, criadaEm },
    { id: ID_POUPANCA, nome: 'Poupança', tipo: 'poupanca', saldoInicial: 1200000, arquivada: false, criadaEm: criadaEm + 1 },
    { id: ID_CARTAO, nome: 'Cartão de crédito', tipo: 'cartao', saldoInicial: 0, arquivada: false, criadaEm: criadaEm + 2, cartao: { diaFechamento: 20, diaVencimento: 27, limite: 500000 } },
    { id: ID_CARTEIRA, nome: 'Carteira', tipo: 'dinheiro', saldoInicial: 15000, arquivada: false, criadaEm: criadaEm + 3 },
  ];

  const transacoes: Transacao[] = [];
  let sequencia = 0;
  const adicionar = (t: Omit<Transacao, 'id' | 'criadaEm'>) => {
    sequencia += 1;
    transacoes.push({ ...t, id: `ex-t-${sequencia}`, criadaEm: sequencia });
  };

  for (let delta = -4; delta <= 0; delta++) {
    const mes = somarMeses(mesAtual, delta);
    const variacao = (delta + 5) * 1300;
    const lancamentos: Modelo[] = [
      [5, 'Salário', 550000, 'cat-salario', ID_CORRENTE],
      [28, 'Rendimento da poupança', 6800 + variacao / 10, 'cat-rendimentos', ID_POUPANCA],
      ...despesasMensais.map((m): Modelo => [m[0], m[1], m[2] + (m[4] === ID_CARTAO ? variacao % 5000 : 0), m[3], m[4]]),
    ];
    for (const [dia, descricao, valor, categoriaId, contaId] of lancamentos) {
      const data = dataNoMes(mes, dia);
      if (data > hoje) continue;
      adicionar({
        contaId,
        categoriaId,
        tipo: categoriaId === 'cat-salario' || categoriaId === 'cat-rendimentos' ? 'receita' : 'despesa',
        valor: Math.round(valor),
        data,
        descricao,
      });
    }
  }

  const orcamentos: Orcamento[] = (
    [
      ['cat-moradia', 190000],
      ['cat-alimentacao', 140000],
      ['cat-transporte', 35000],
      ['cat-saude', 20000],
      ['cat-lazer', 25000],
    ] as const
  ).map(([categoriaId, limite]) => ({ categoriaId, mes: mesAtual, limite }));

  const aportes = (valores: number[], idMeta: string): Aporte[] =>
    valores.map((valor, i) => ({
      id: `${idMeta}-a${i}`,
      data: dataNoMes(somarMeses(mesAtual, i - valores.length), 15),
      valor,
    }));

  const metas: Meta[] = [
    {
      id: 'ex-meta-reserva',
      nome: 'Reserva de emergência',
      valorAlvo: 3000000,
      aportes: aportes([200000, 200000, 150000, 200000], 'ex-meta-reserva'),
      status: 'ativa',
      criadaEm: 1,
    },
    {
      id: 'ex-meta-viagem',
      nome: 'Viagem de férias',
      valorAlvo: 800000,
      prazo: dataNoMes(somarMeses(mesAtual, 8), 10),
      aportes: aportes([60000, 50000, 70000], 'ex-meta-viagem'),
      status: 'ativa',
      criadaEm: 2,
    },
  ];

  const recorrencias: Recorrencia[] = [
    { id: 'ex-rec-salario', descricao: 'Salário', tipo: 'receita', valor: 550000, categoriaId: 'cat-salario', ativa: true },
    { id: 'ex-rec-aluguel', descricao: 'Aluguel', tipo: 'despesa', valor: 150000, categoriaId: 'cat-moradia', ativa: true },
  ];

  const investimentos: Ativo[] = [
    {
      id: 'ex-ativo-cdb',
      nome: 'CDB 110% CDI',
      classe: 'renda-fixa',
      movimentos: [
        { id: 'ex-mov-cdb-1', tipo: 'aporte', data: dataNoMes(somarMeses(mesAtual, -4), 5), valor: 500000 },
        { id: 'ex-mov-cdb-2', tipo: 'aporte', data: dataNoMes(somarMeses(mesAtual, -2), 5), valor: 200000 },
      ],
      marcacoes: [{ id: 'ex-marc-cdb-1', data: dataNoMes(somarMeses(mesAtual, -1), 1), valor: 722000 }],
      criadoEm: 1,
    },
  ];

  return {
    schemaVersion: SCHEMA_ATUAL,
    contas,
    categorias: categoriasPadrao(),
    transacoes,
    orcamentos,
    metas,
    recorrencias,
    mapeamentosCsv: {},
    importacoes: [],
    pagamentosFatura: [],
    agenda: [
      { id: 'ex-ag-luz', descricao: 'Conta de luz', tipo: 'despesa', valor: 18990, vencimento: dataNoMes(somarMeses(mesAtual, 1), 12), categoriaId: 'cat-moradia', contaId: ID_CORRENTE, criadoEm: 1 },
      { id: 'ex-ag-salario', descricao: 'Salário', tipo: 'receita', valor: 550000, vencimento: dataNoMes(somarMeses(mesAtual, 1), 5), categoriaId: 'cat-salario', contaId: ID_CORRENTE, criadoEm: 2 },
    ],
    regras: [
      { id: 'ex-regra-mercado', padrao: 'supermercado', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: ['mercado'], ativa: true },
      { id: 'ex-regra-streaming', padrao: 'streaming', modo: 'igual', tipo: 'despesa', categoriaId: 'cat-lazer', tags: [], ativa: true },
    ],
    investimentos,
    dividas: [
      {
        id: 'ex-divida-notebook',
        nome: 'Financiamento do notebook',
        tipo: 'devo',
        principal: 360000,
        taxaBp: 199,
        parcelas: 12,
        primeiraParcela: dataNoMes(somarMeses(mesAtual, -2), 10),
        sistema: 'price',
        pagamentos: [],
        criadaEm: 1,
      },
    ],
  };
}
