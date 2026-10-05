import { cartoesAtivos, mesFaturaAberta, resumoFatura } from './cartoes';
import { saldoTotal } from './contas';
import { diasNoMes, formatarData, mesDe, somarDias, somarMeses } from './date';
import { resumoDivida } from './dividas';
import { formatarMoeda } from './money';
import type { AppState, Centavos, DataISO, Recorrencia } from './types';

export const JANELAS_FLUXO = [30, 60, 90] as const;
export type JanelaFluxo = (typeof JANELAS_FLUXO)[number];
export const MAX_SUGESTOES = 3;

export type TipoOrigem = 'agendamento' | 'recorrencia' | 'fatura' | 'divida';

export interface OrigemItem {
  tipo: TipoOrigem;
  id: string;
}

export interface ItemFluxo {
  /** Chave única do item na previsão. */
  chave: string;
  origem: OrigemItem;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: Centavos;
  /** Dia em que o item pesa no saldo (itens vencidos caem em hoje). */
  data: DataISO;
  dataOriginal: DataISO;
  atrasado: boolean;
}

export interface DiaFluxo {
  data: DataISO;
  entradas: Centavos;
  saidas: Centavos;
  /** Saldo de fechamento do dia. */
  saldo: Centavos;
  itens: ItemFluxo[];
  negativo: boolean;
}

export interface FluxoCaixa {
  janela: number;
  saldoInicial: Centavos;
  dias: DiaFluxo[];
  totalEntradas: Centavos;
  totalSaidas: Centavos;
  saldoFinal: Centavos;
  menorSaldo: { saldo: Centavos; data: DataISO };
  diasNegativos: number;
  itens: ItemFluxo[];
}

export interface Sugestao {
  item: ItemFluxo;
  /** Dia sugerido para depois do qual o item deve ser pago, ou null se nenhuma entrada vem depois. */
  depoisDe: DataISO | null;
  texto: string;
}

export interface OQueFazer {
  sugestoes: Sugestao[];
  /** Verdadeiro se, mesmo adiando as sugestões, ainda restam dias negativos. */
  continuaNegativo: boolean;
}

const dia2 = (n: number) => String(n).padStart(2, '0');

/** Dia do mês de uma recorrência: o campo opcional `dia` (1 a 28) ou, por convenção, o dia 1. */
export function diaDaRecorrencia(r: Recorrencia): number {
  const dia = (r as Recorrencia & { dia?: unknown }).dia;
  return typeof dia === 'number' && Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : 1;
}

/** Itens com data anterior a hoje pesam em hoje e ficam marcados como atrasados. */
function criarItem(base: Omit<ItemFluxo, 'data' | 'dataOriginal' | 'atrasado'>, vencimento: DataISO, hoje: DataISO): ItemFluxo {
  const atrasado = vencimento < hoje;
  return { ...base, data: atrasado ? hoje : vencimento, dataOriginal: vencimento, atrasado };
}

/** Todos os itens previstos entre hoje e o último dia da janela, por data e depois por chave. */
export function itensPrevistos(estado: AppState, hoje: DataISO, janela: number): ItemFluxo[] {
  const fim = somarDias(hoje, janela - 1);
  const itens: ItemFluxo[] = [];
  const naJanela = (data: DataISO) => data <= fim;
  const contasPorId = new Map(estado.contas.map((c) => [c.id, c]));

  for (const a of estado.agenda) {
    if (a.pagoEm || !naJanela(a.vencimento)) continue;
    const conta = a.contaId ? contasPorId.get(a.contaId) : undefined;
    if (a.contaId && (!conta || conta.arquivada || conta.tipo === 'cartao')) continue;
    itens.push(
      criarItem(
        { chave: `agendamento:${a.id}`, origem: { tipo: 'agendamento', id: a.id }, descricao: a.descricao, tipo: a.tipo === 'receita' ? 'entrada' : 'saida', valor: a.valor },
        a.vencimento,
        hoje,
      ),
    );
  }

  for (const r of estado.recorrencias) {
    if (!r.ativa) continue;
    for (let mes = mesDe(hoje); mes <= mesDe(fim); mes = somarMeses(mes, 1)) {
      const [ano, m] = mes.split('-').map(Number);
      const data = `${mes}-${dia2(Math.min(diaDaRecorrencia(r), diasNoMes(ano, m)))}`;
      if (data < hoje || data > fim) continue;
      itens.push({
        chave: `recorrencia:${r.id}:${mes}`,
        origem: { tipo: 'recorrencia', id: r.id },
        descricao: r.descricao,
        tipo: r.tipo === 'receita' ? 'entrada' : 'saida',
        valor: r.valor,
        data,
        dataOriginal: data,
        atrasado: false,
      });
    }
  }

  for (const conta of cartoesAtivos(estado.contas)) {
    if (!conta.cartao) continue;
    const aberta = mesFaturaAberta(conta.cartao, hoje);
    // Faturas já fechadas e vencidas há mais de 6 meses não entram; as demais são avaliadas uma a uma.
    for (let mes = somarMeses(aberta, -6); mes <= somarMeses(mesDe(fim), 1); mes = somarMeses(mes, 1)) {
      const resumo = resumoFatura(estado, conta, mes, hoje);
      if (!resumo || resumo.restante <= 0 || resumo.situacao === 'paga' || !naJanela(resumo.vencimento)) continue;
      itens.push(
        criarItem(
          { chave: `fatura:${conta.id}@${mes}`, origem: { tipo: 'fatura', id: `${conta.id}@${mes}` }, descricao: `Fatura ${conta.nome} (${mes})`, tipo: 'saida', valor: resumo.restante },
          resumo.vencimento,
          hoje,
        ),
      );
    }
  }

  for (const d of estado.dividas) {
    if (d.tipo !== 'devo') continue;
    const resumo = resumoDivida(d, hoje);
    if (resumo.quitada) continue;
    for (const l of resumo.linhas) {
      if (l.situacao === 'paga' || l.restante <= 0 || !naJanela(l.vencimento)) continue;
      itens.push(
        criarItem(
          {
            chave: `divida:${d.id}#${l.numero}`,
            origem: { tipo: 'divida', id: d.id },
            descricao: `${d.nome} (parcela ${l.numero}/${d.parcelas})`,
            tipo: 'saida',
            valor: l.restante,
          },
          l.vencimento,
          hoje,
        ),
      );
    }
  }

  return itens.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.chave.localeCompare(b.chave)));
}

/** Saldo dia a dia a partir do saldo inicial e dos itens (já ordenados ou não). */
export function montarDias(saldoInicial: Centavos, itens: ItemFluxo[], hoje: DataISO, janela: number): DiaFluxo[] {
  const porDia = new Map<DataISO, ItemFluxo[]>();
  for (const i of itens) porDia.set(i.data, [...(porDia.get(i.data) ?? []), i]);
  let saldo = saldoInicial;
  return Array.from({ length: janela }, (_, k): DiaFluxo => {
    const data = somarDias(hoje, k);
    const doDia = porDia.get(data) ?? [];
    const entradas = doDia.filter((i) => i.tipo === 'entrada').reduce((s, i) => s + i.valor, 0);
    const saidas = doDia.filter((i) => i.tipo === 'saida').reduce((s, i) => s + i.valor, 0);
    saldo += entradas - saidas;
    return { data, entradas, saidas, saldo, itens: doDia, negativo: saldo < 0 };
  });
}

export function calcularFluxo(estado: AppState, hoje: DataISO, janela: number = 30): FluxoCaixa {
  const saldoInicial = saldoTotal(estado).contas;
  const itens = itensPrevistos(estado, hoje, janela);
  const dias = montarDias(saldoInicial, itens, hoje, janela);
  const menor = dias.reduce((m, d) => (d.saldo < m.saldo ? d : m), dias[0]);
  return {
    janela,
    saldoInicial,
    dias,
    totalEntradas: dias.reduce((s, d) => s + d.entradas, 0),
    totalSaidas: dias.reduce((s, d) => s + d.saidas, 0),
    saldoFinal: dias[dias.length - 1].saldo,
    menorSaldo: { saldo: menor.saldo, data: menor.data },
    diasNegativos: dias.filter((d) => d.negativo).length,
    itens,
  };
}

const ROTULO_ORIGEM: Record<TipoOrigem, string> = {
  agendamento: 'Agendamento',
  recorrencia: 'Recorrência',
  fatura: 'Fatura de cartão',
  divida: 'Dívida',
};
export const rotuloOrigem = (tipo: TipoOrigem) => ROTULO_ORIGEM[tipo];

/**
 * Sugere quais saídas adiar para eliminar os dias negativos. A cada passo olha o primeiro dia negativo,
 * escolhe entre as saídas até ele a de menor valor que cobre o rombo (ou a maior, se nenhuma cobrir
 * sozinha), retira-a da previsão e recalcula.
 */
export function oQueFazer(fluxo: FluxoCaixa, hoje: DataISO): OQueFazer {
  let restantes = fluxo.itens;
  let dias = fluxo.dias;
  const sugestoes: Sugestao[] = [];

  while (sugestoes.length < MAX_SUGESTOES) {
    const primeiro = dias.find((d) => d.negativo);
    if (!primeiro) break;
    const rombo = -primeiro.saldo;
    const candidatos = restantes.filter((i) => i.tipo === 'saida' && i.data <= primeiro.data);
    if (candidatos.length === 0) break;
    const ordem = (a: ItemFluxo, b: ItemFluxo) => a.valor - b.valor || (a.data < b.data ? -1 : a.data > b.data ? 1 : a.chave.localeCompare(b.chave));
    const cobrem = candidatos.filter((i) => i.valor >= rombo).sort(ordem);
    const escolhido = cobrem[0] ?? [...candidatos].sort((a, b) => ordem(b, a))[0];
    restantes = restantes.filter((i) => i.chave !== escolhido.chave);
    const proximaEntrada = restantes.filter((i) => i.tipo === 'entrada' && i.data > primeiro.data).sort((a, b) => (a.data < b.data ? -1 : 1))[0];
    const depoisDe = proximaEntrada?.data ?? null;
    const vence = escolhido.atrasado ? `vencido em ${formatarData(escolhido.dataOriginal)}` : `com vencimento em ${formatarData(escolhido.dataOriginal)}`;
    const quando = depoisDe ? `para depois de ${formatarData(depoisDe)}, quando entra dinheiro` : 'para depois do fim do período';
    sugestoes.push({
      item: escolhido,
      depoisDe,
      texto: `Adiar "${escolhido.descricao}" (${formatarMoeda(escolhido.valor)}, ${vence}, ${ROTULO_ORIGEM[escolhido.origem.tipo]}) ${quando}: o saldo negativo de ${formatarData(primeiro.data)} (${formatarMoeda(primeiro.saldo)}) diminui.`,
    });
    dias = montarDias(fluxo.saldoInicial, restantes, hoje, fluxo.janela);
  }

  return { sugestoes, continuaNegativo: dias.some((d) => d.negativo) };
}
