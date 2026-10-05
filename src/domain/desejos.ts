import { dataParaISO, dataValida, mesDe } from './date';
import { novoId } from './id';
import { criarMeta } from './metas';
import { formatarMoeda } from './money';
import { linhasOrcamento } from './orcamento';
import { mediasMensais, reservaLiquida } from './saude';
import { criarTransacao } from './transacoes';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado } from './types';

export type Prioridade = 'alta' | 'media' | 'baixa';
export type SituacaoDesejo = 'ativo' | 'comprado' | 'desistido';

export interface Desejo {
  id: string;
  nome: string;
  preco: Centavos;
  prioridade: Prioridade;
  categoriaId: string;
  criadoEm: DataISO;
  esperarAte: DataISO;
  situacao: SituacaoDesejo;
  concluidoEm?: DataISO;
  transacaoId?: string;
}

export const NOME_DESEJO_MAX = 60;
export const PERIODOS_ESPERA = [0, 7, 30, 90] as const;
export const ESPERA_PADRAO = 30;
export const MESES_RESERVA_MINIMA = 3;

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
export const ROTULO_SITUACAO_DESEJO: Record<SituacaoDesejo, string> = { ativo: 'Ativo', comprado: 'Comprado', desistido: 'Desisti' };
const ORDEM_PRIORIDADE: Prioridade[] = ['alta', 'media', 'baixa'];

export interface DadosDesejo {
  nome: string;
  preco: Centavos;
  prioridade: Prioridade;
  categoriaId: string;
  /** Dias de espera a partir do cadastro (só no cadastro). */
  esperaDias?: number;
}

export const listaDesejos = (estado: Pick<AppState, 'desejos'>): Desejo[] => estado.desejos ?? [];

function somarDias(iso: DataISO, dias: number): DataISO {
  const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + dias);
  return dataParaISO(d);
}

const diasEntre = (de: DataISO, ate: DataISO) => Math.round((Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86400000);

function validar(estado: AppState, dados: DadosDesejo, categoriaAtual?: string): Resultado<DadosDesejo> {
  const nome = dados.nome.trim();
  if (nome.length < 1 || nome.length > NOME_DESEJO_MAX) return falha(`Informe um nome de 1 a ${NOME_DESEJO_MAX} caracteres.`, 'nome');
  if (!Number.isSafeInteger(dados.preco) || dados.preco <= 0) return falha('Informe um preço maior que zero.', 'preco');
  if (!ORDEM_PRIORIDADE.includes(dados.prioridade)) return falha('Escolha a prioridade.', 'prioridade');
  const cat = estado.categorias.find((c) => c.id === dados.categoriaId);
  if (!cat || cat.tipo !== 'despesa' || (cat.arquivada && cat.id !== categoriaAtual)) return falha('Escolha uma categoria de despesa ativa.', 'categoriaId');
  if (dados.esperaDias !== undefined && !(PERIODOS_ESPERA as readonly number[]).includes(dados.esperaDias)) return falha('Escolha um período de espera válido.', 'esperaDias');
  return ok({ ...dados, nome });
}

export function criarDesejo(estado: AppState, dados: DadosDesejo, hoje: DataISO): Resultado<AppState> {
  const v = validar(estado, dados);
  if (!v.ok) return v;
  const desejo: Desejo = {
    id: novoId(),
    nome: v.valor.nome,
    preco: v.valor.preco,
    prioridade: v.valor.prioridade,
    categoriaId: v.valor.categoriaId,
    criadoEm: hoje,
    esperarAte: somarDias(hoje, dados.esperaDias ?? ESPERA_PADRAO),
    situacao: 'ativo',
  };
  return ok({ ...estado, desejos: [...listaDesejos(estado), desejo] });
}

function alterar(estado: AppState, id: string, f: (d: Desejo) => Resultado<Desejo>): Resultado<AppState> {
  const atual = listaDesejos(estado).find((d) => d.id === id);
  if (!atual) return falha('Desejo não encontrado.');
  const r = f(atual);
  if (!r.ok) return r;
  return ok({ ...estado, desejos: listaDesejos(estado).map((d) => (d.id === id ? r.valor : d)) });
}

export function editarDesejo(estado: AppState, id: string, dados: Omit<DadosDesejo, 'esperaDias'>): Resultado<AppState> {
  return alterar(estado, id, (d) => {
    if (d.situacao !== 'ativo') return falha('Só itens ativos podem ser editados.');
    const v = validar(estado, dados, d.categoriaId);
    if (!v.ok) return v;
    return ok({ ...d, nome: v.valor.nome, preco: v.valor.preco, prioridade: v.valor.prioridade, categoriaId: v.valor.categoriaId });
  });
}

export function excluirDesejo(estado: AppState, id: string): Resultado<AppState> {
  if (!listaDesejos(estado).some((d) => d.id === id)) return falha('Desejo não encontrado.');
  return ok({ ...estado, desejos: listaDesejos(estado).filter((d) => d.id !== id) });
}

export function desistirDesejo(estado: AppState, id: string, hoje: DataISO): Resultado<AppState> {
  return alterar(estado, id, (d) => (d.situacao === 'ativo' ? ok({ ...d, situacao: 'desistido', concluidoEm: hoje }) : falha('O item já foi concluído.')));
}

/** Registra a compra: cria a despesa e marca o item como comprado, numa operação só. */
export function comprarDesejo(estado: AppState, id: string, contaId: string, data: DataISO): Resultado<AppState> {
  const desejo = listaDesejos(estado).find((d) => d.id === id);
  if (!desejo) return falha('Desejo não encontrado.');
  if (desejo.situacao !== 'ativo') return falha('O item já foi concluído.');
  if (!dataValida(data)) return falha('Informe uma data válida.', 'data');
  const conta = estado.contas.find((c) => c.id === contaId);
  if (!conta || conta.arquivada) return falha('Escolha uma conta ativa.', 'contaId');
  const comTransacao = criarTransacao(estado, { contaId, categoriaId: desejo.categoriaId, tipo: 'despesa', valor: desejo.preco, data, descricao: desejo.nome, tags: [] });
  if (!comTransacao.ok) return comTransacao;
  const transacao = comTransacao.valor.transacoes[comTransacao.valor.transacoes.length - 1];
  return alterar(comTransacao.valor, id, (d) => ok({ ...d, situacao: 'comprado', concluidoEm: data, transacaoId: transacao.id }));
}

/** Cria uma meta de poupança com o nome e o preço do item. */
export function metaDoDesejo(estado: AppState, id: string, hoje: DataISO): Resultado<AppState> {
  const desejo = listaDesejos(estado).find((d) => d.id === id);
  if (!desejo) return falha('Desejo não encontrado.');
  return criarMeta(estado, { nome: desejo.nome.slice(0, 40), valorAlvo: desejo.preco }, hoje);
}

export function ordenarAtivos(desejos: Desejo[]): Desejo[] {
  return desejos
    .filter((d) => d.situacao === 'ativo')
    .sort((a, b) => ORDEM_PRIORIDADE.indexOf(a.prioridade) - ORDEM_PRIORIDADE.indexOf(b.prioridade) || a.criadoEm.localeCompare(b.criadoEm) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface TotaisDesejos {
  ativos: Centavos;
  economia: Centavos;
}

export function totaisDesejos(desejos: Desejo[]): TotaisDesejos {
  const soma = (s: SituacaoDesejo) => desejos.filter((d) => d.situacao === s).reduce((t, d) => t + d.preco, 0);
  return { ativos: soma('ativo'), economia: soma('desistido') };
}

// ----------------------------------------------------------------- análise

export interface Verificacao {
  id: 'espera' | 'reserva' | 'orcamento' | 'sobra';
  titulo: string;
  aprovada: boolean;
  texto: string;
}

export type Veredito = { tipo: 'pode' } | { tipo: 'espere'; dias: number } | { tipo: 'nao' };

export interface Analise {
  verificacoes: Verificacao[];
  veredito: Veredito;
}

const umaCasa = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const meses = (n: number) => `${umaCasa(n)} ${Math.round(n * 10) === 10 ? 'mês' : 'meses'}`;

/** As quatro verificações do "posso comprar?" e o veredito. */
export function analisarDesejo(estado: AppState, desejo: Desejo, hoje: DataISO): Analise {
  const medias = mediasMensais(estado, hoje);
  const faltamDias = Math.max(0, diasEntre(hoje, desejo.esperarAte));
  const espera: Verificacao = {
    id: 'espera',
    titulo: 'Período de espera',
    aprovada: faltamDias === 0,
    texto: faltamDias === 0 ? 'Cumprido.' : `Faltam ${faltamDias} ${faltamDias === 1 ? 'dia' : 'dias'}.`,
  };

  const depois = reservaLiquida(estado) - desejo.preco;
  const reserva: Verificacao =
    medias.despesaMedia === 0
      ? { id: 'reserva', titulo: 'Reserva depois da compra', aprovada: depois >= 0, texto: depois >= 0 ? `Sobram ${formatarMoeda(depois)} (sem despesas de referência).` : 'O saldo em conta não cobre o preço.' }
      : {
          id: 'reserva',
          titulo: 'Reserva depois da compra',
          aprovada: depois / medias.despesaMedia >= MESES_RESERVA_MINIMA,
          texto: `Sobram ${formatarMoeda(Math.max(depois, 0))}, ${meses(Math.max(depois, 0) / medias.despesaMedia)} de despesas (mínimo ${MESES_RESERVA_MINIMA}).`,
        };

  const linha = linhasOrcamento(estado, mesDe(hoje)).find((l) => l.categoria.id === desejo.categoriaId);
  const orcamento: Verificacao =
    !linha || linha.limite === null || linha.restante === null
      ? { id: 'orcamento', titulo: 'Orçamento da categoria', aprovada: true, texto: 'Sem limite definido neste mês.' }
      : {
          id: 'orcamento',
          titulo: 'Orçamento da categoria',
          aprovada: linha.restante >= desejo.preco,
          texto: `Restam ${formatarMoeda(Math.max(linha.restante, 0))} de ${formatarMoeda(linha.limite)} em ${linha.nome}.`,
        };

  const sobraMedia = medias.receitaMedia - medias.despesaMedia;
  const sobra: Verificacao =
    sobraMedia > 0
      ? { id: 'sobra', titulo: 'Sobra mensal', aprovada: true, texto: `Custa ${meses(desejo.preco / sobraMedia)} da sua sobra média (${formatarMoeda(sobraMedia)}).` }
      : { id: 'sobra', titulo: 'Sobra mensal', aprovada: false, texto: medias.meses.length ? 'Seu resultado médio mensal não é positivo.' : 'Sem meses completos para calcular a sobra.' };

  const verificacoes = [espera, reserva, orcamento, sobra];
  const outrasOk = verificacoes.filter((v) => v.id !== 'espera').every((v) => v.aprovada);
  const veredito: Veredito = outrasOk ? (espera.aprovada ? { tipo: 'pode' } : { tipo: 'espere', dias: faltamDias }) : { tipo: 'nao' };
  return { verificacoes, veredito };
}

export function textoVeredito(v: Veredito): string {
  if (v.tipo === 'pode') return 'Pode comprar';
  if (v.tipo === 'espere') return `Espere mais ${v.dias} ${v.dias === 1 ? 'dia' : 'dias'}`;
  return 'Ainda não';
}
