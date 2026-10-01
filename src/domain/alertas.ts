import { cartoesAtivos, cicloFatura, mesFaturaAberta, resumoFatura } from './cartoes';
import { saldosPorConta } from './contas';
import { dataValida, formatarData, mesDe, nomeMes, somarMeses } from './date';
import { somarDias } from './agenda';
import { aporteMensalNecessario, acumulado, situacaoRitmo } from './metas';
import { formatarMoeda } from './money';
import { linhasOrcamento } from './orcamento';
import { calcularProjecao } from './projecao';
import { falha, ok, type AppState, type Centavos, type DataISO, type Resultado } from './types';

export type Severidade = 'critico' | 'atencao' | 'info';
export type TipoAlerta = 'orcamento' | 'fatura' | 'agenda' | 'saldo' | 'meta' | 'projecao';

export const TIPOS_ALERTA: TipoAlerta[] = ['orcamento', 'fatura', 'agenda', 'saldo', 'meta', 'projecao'];

export const ROTULO_TIPO_ALERTA: Record<TipoAlerta, string> = {
  orcamento: 'Orçamento do mês',
  fatura: 'Faturas de cartão',
  agenda: 'Lançamentos agendados',
  saldo: 'Saldo mínimo de conta',
  meta: 'Metas com prazo',
  projecao: 'Projeção negativa',
};

export const ROTULO_SEVERIDADE: Record<Severidade, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  info: 'Info',
};

export const DIAS_ANTECEDENCIA_MIN = 1;
export const DIAS_ANTECEDENCIA_MAX = 30;

export interface Alerta {
  /** Estável: o mesmo problema gera sempre o mesmo id. */
  id: string;
  tipo: TipoAlerta;
  severidade: Severidade;
  titulo: string;
  descricao: string;
  /** Rota da tela relacionada. */
  link: string;
}

export interface LimiaresAlertas {
  diasAntecedencia: number;
  saldoMinimo: Centavos;
  tiposAtivos: Record<TipoAlerta, boolean>;
}

/** Sem `ate` o alerta está dispensado de vez; com `ate` ele volta a aparecer nessa data. */
export interface Dispensa {
  id: string;
  ate?: DataISO;
}

export interface PreferenciasAlertas {
  limiares: LimiaresAlertas;
  dispensados: Dispensa[];
}

export function preferenciasPadrao(): PreferenciasAlertas {
  return {
    limiares: {
      diasAntecedencia: 7,
      saldoMinimo: 0,
      tiposAtivos: { orcamento: true, fatura: true, agenda: true, saldo: true, meta: true, projecao: true },
    },
    dispensados: [],
  };
}

/** Preferências do estado, tolerando dados antigos ou incompletos. */
export function preferenciasDe(estado: AppState): PreferenciasAlertas {
  const padrao = preferenciasPadrao();
  const p = estado.preferenciasAlertas as Partial<PreferenciasAlertas> | undefined;
  return {
    limiares: {
      ...padrao.limiares,
      ...p?.limiares,
      tiposAtivos: { ...padrao.limiares.tiposAtivos, ...p?.limiares?.tiposAtivos },
    },
    dispensados: p?.dispensados ?? [],
  };
}

// ------------------------------------------------------------------- cálculo

const PESO: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

function diasEntre(de: DataISO, ate: DataISO): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

function emDias(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

function haDias(dias: number): string {
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

function alertasOrcamento(estado: AppState, hoje: DataISO): Alerta[] {
  const mes = mesDe(hoje);
  const saida: Alerta[] = [];
  for (const l of linhasOrcamento(estado, mes)) {
    if (l.limite === null || l.estado === null || l.estado === 'normal') continue;
    const estourado = l.estado === 'estourado';
    saida.push({
      id: `orcamento:${l.categoria.id}:${mes}`,
      tipo: 'orcamento',
      severidade: estourado ? 'critico' : 'atencao',
      titulo: estourado ? `Orçamento estourado: ${l.categoria.nome}` : `Orçamento perto do limite: ${l.categoria.nome}`,
      descricao: `Em ${nomeMes(mes)} você gastou ${formatarMoeda(l.gasto)} de ${formatarMoeda(l.limite)}${
        l.percentual === null ? '' : ` (${l.percentual}%)`
      }.`,
      link: '/orcamento',
    });
  }
  return saida;
}

function alertasFatura(estado: AppState, hoje: DataISO, dias: number): Alerta[] {
  const saida: Alerta[] = [];
  for (const conta of cartoesAtivos(estado.contas)) {
    if (!conta.cartao) continue;
    const aberta = mesFaturaAberta(conta.cartao, hoje);
    for (const mes of [somarMeses(aberta, -2), somarMeses(aberta, -1), aberta]) {
      const r = resumoFatura(estado, conta, mes, hoje);
      if (!r || r.restante <= 0) continue;
      const { fim } = cicloFatura(conta.cartao, mes);
      if (r.situacao === 'aberta') {
        const faltam = diasEntre(hoje, fim);
        if (faltam > dias) continue;
        saida.push({
          id: `fatura:${conta.id}:${mes}:fecha`,
          tipo: 'fatura',
          severidade: 'info',
          titulo: `Fatura de ${conta.nome} fecha ${emDias(faltam)}`,
          descricao: `Fechamento em ${formatarData(fim)}; total parcial de ${formatarMoeda(r.total)}.`,
          link: '/cartoes',
        });
        continue;
      }
      const faltam = diasEntre(hoje, r.vencimento);
      if (faltam < 0) {
        saida.push({
          id: `fatura:${conta.id}:${mes}:vence`,
          tipo: 'fatura',
          severidade: 'critico',
          titulo: `Fatura de ${conta.nome} vencida`,
          descricao: `Venceu em ${formatarData(r.vencimento)} (${haDias(-faltam)}); restam ${formatarMoeda(r.restante)} a pagar.`,
          link: '/cartoes',
        });
      } else if (faltam <= dias) {
        saida.push({
          id: `fatura:${conta.id}:${mes}:vence`,
          tipo: 'fatura',
          severidade: 'atencao',
          titulo: `Fatura de ${conta.nome} vence ${emDias(faltam)}`,
          descricao: `Vencimento em ${formatarData(r.vencimento)}; restam ${formatarMoeda(r.restante)} a pagar.`,
          link: '/cartoes',
        });
      }
    }
  }
  return saida;
}

function alertasAgenda(estado: AppState, hoje: DataISO, dias: number): Alerta[] {
  const saida: Alerta[] = [];
  const limite = somarDias(hoje, dias);
  for (const a of estado.agenda) {
    if (a.pagoEm) continue;
    const tipoTexto = a.tipo === 'despesa' ? 'a pagar' : 'a receber';
    if (a.vencimento < hoje) {
      const atraso = diasEntre(a.vencimento, hoje);
      saida.push({
        id: `agenda:${a.id}`,
        tipo: 'agenda',
        severidade: a.tipo === 'despesa' ? 'critico' : 'atencao',
        titulo: `Atrasado: ${a.descricao}`,
        descricao: `Lançamento ${tipoTexto} de ${formatarMoeda(a.valor)} venceu em ${formatarData(a.vencimento)} (${haDias(atraso)}).`,
        link: '/calendario',
      });
    } else if (a.vencimento <= limite) {
      saida.push({
        id: `agenda:${a.id}`,
        tipo: 'agenda',
        severidade: 'atencao',
        titulo: `Vence ${emDias(diasEntre(hoje, a.vencimento))}: ${a.descricao}`,
        descricao: `Lançamento ${tipoTexto} de ${formatarMoeda(a.valor)} com vencimento em ${formatarData(a.vencimento)}.`,
        link: '/calendario',
      });
    }
  }
  return saida;
}

function alertasSaldo(estado: AppState, minimo: Centavos): Alerta[] {
  const saldos = saldosPorConta(estado);
  const saida: Alerta[] = [];
  for (const c of estado.contas) {
    if (c.arquivada || c.tipo === 'cartao') continue;
    const saldo = saldos.get(c.id) ?? 0;
    if (saldo >= minimo) continue;
    saida.push({
      id: `saldo:${c.id}`,
      tipo: 'saldo',
      severidade: saldo < 0 ? 'critico' : 'atencao',
      titulo: saldo < 0 ? `Saldo negativo: ${c.nome}` : `Saldo baixo: ${c.nome}`,
      descricao: `O saldo é ${formatarMoeda(saldo)}, abaixo do mínimo de ${formatarMoeda(minimo)}.`,
      link: '/contas',
    });
  }
  return saida;
}

function alertasMeta(estado: AppState, hoje: DataISO, dias: number): Alerta[] {
  const saida: Alerta[] = [];
  for (const m of estado.metas) {
    if (m.status !== 'ativa' || !m.prazo) continue;
    const necessario = aporteMensalNecessario(m, hoje);
    if (necessario.tipo === 'concluida' || necessario.tipo === 'sem-prazo') continue;
    const faltam = diasEntre(hoje, m.prazo);
    const restante = m.valorAlvo - acumulado(m);
    if (faltam < 0) {
      saida.push({
        id: `meta:${m.id}`,
        tipo: 'meta',
        severidade: 'critico',
        titulo: `Prazo vencido: ${m.nome}`,
        descricao: `O prazo era ${formatarData(m.prazo)} e ainda faltam ${formatarMoeda(restante)} para o alvo.`,
        link: '/metas',
      });
      continue;
    }
    if (faltam > dias) continue;
    const ritmo = situacaoRitmo(m, hoje);
    if (ritmo === 'no-ritmo') continue;
    saida.push({
      id: `meta:${m.id}`,
      tipo: 'meta',
      severidade: ritmo === 'abaixo-do-ritmo' ? 'atencao' : 'info',
      titulo: `Meta com prazo ${emDias(faltam)}: ${m.nome}`,
      descricao:
        ritmo === 'abaixo-do-ritmo'
          ? `Faltam ${formatarMoeda(restante)} e o ritmo de aportes está abaixo do necessário (${formatarMoeda(necessario.valor)} por mês).`
          : `Faltam ${formatarMoeda(restante)} e ainda não há aportes recentes para medir o ritmo.`,
      link: '/metas',
    });
  }
  return saida;
}

function alertasProjecao(estado: AppState, hoje: DataISO): Alerta[] {
  const p = calcularProjecao(estado, hoje);
  if (p.tipo !== 'ok' || p.primeiroNegativo === null) return [];
  const proximo = p.primeiroNegativo === p.meses[0]?.mes;
  return [
    {
      id: `projecao:${p.primeiroNegativo}`,
      tipo: 'projecao',
      severidade: proximo ? 'critico' : 'atencao',
      titulo: `Saldo projetado negativo em ${nomeMes(p.primeiroNegativo)}`,
      descricao: `Com o ritmo atual (${formatarMoeda(p.efeitoMensal)} por mês), o saldo de ${formatarMoeda(p.saldoAtual)} fica negativo.`,
      link: '/',
    },
  ];
}

/** Todos os alertas dos tipos ligados, por severidade e depois por tipo e id; ignora dispensas. */
export function calcularAlertas(estado: AppState, hoje: DataISO): Alerta[] {
  const { limiares } = preferenciasDe(estado);
  const dias = limiares.diasAntecedencia;
  const on = limiares.tiposAtivos;
  const todos = [
    ...(on.orcamento ? alertasOrcamento(estado, hoje) : []),
    ...(on.fatura ? alertasFatura(estado, hoje, dias) : []),
    ...(on.agenda ? alertasAgenda(estado, hoje, dias) : []),
    ...(on.saldo ? alertasSaldo(estado, limiares.saldoMinimo) : []),
    ...(on.meta ? alertasMeta(estado, hoje, dias) : []),
    ...(on.projecao ? alertasProjecao(estado, hoje) : []),
  ];
  const ordem = (t: TipoAlerta) => TIPOS_ALERTA.indexOf(t);
  return todos.sort(
    (a, b) => PESO[a.severidade] - PESO[b.severidade] || ordem(a.tipo) - ordem(b.tipo) || a.id.localeCompare(b.id),
  );
}

// ------------------------------------------------------------------ dispensas

/** Uma dispensa vale de vez (sem `ate`) ou enquanto hoje for anterior à data `ate`. */
export function dispensaVigente(d: Dispensa, hoje: DataISO): boolean {
  return d.ate === undefined || hoje < d.ate;
}

export interface AlertasSeparados {
  visiveis: Alerta[];
  dispensados: { alerta: Alerta; ate?: DataISO }[];
}

export function separarAlertas(alertas: Alerta[], prefs: PreferenciasAlertas, hoje: DataISO): AlertasSeparados {
  const vigentes = new Map(prefs.dispensados.filter((d) => dispensaVigente(d, hoje)).map((d) => [d.id, d]));
  const visiveis: Alerta[] = [];
  const dispensados: AlertasSeparados['dispensados'] = [];
  for (const alerta of alertas) {
    const d = vigentes.get(alerta.id);
    if (d) dispensados.push({ alerta, ate: d.ate });
    else visiveis.push(alerta);
  }
  return { visiveis, dispensados };
}

/** Alertas visíveis hoje (calculados e não dispensados). */
export function alertasVisiveis(estado: AppState, hoje: DataISO): Alerta[] {
  return separarAlertas(calcularAlertas(estado, hoje), preferenciasDe(estado), hoje).visiveis;
}

export function contarPorSeveridade(alertas: Alerta[]): Record<Severidade, number> {
  const c: Record<Severidade, number> = { critico: 0, atencao: 0, info: 0 };
  for (const a of alertas) c[a.severidade] += 1;
  return c;
}

function comPreferencias(estado: AppState, prefs: PreferenciasAlertas): AppState {
  return { ...estado, preferenciasAlertas: prefs };
}

/** Dispensa de vez (sem `ate`) ou adia até `ate`, que deve ser uma data válida posterior a hoje. */
export function dispensarAlerta(estado: AppState, id: string, hoje: DataISO, ate?: DataISO): Resultado<AppState> {
  if (!id) return falha('Alerta não encontrado.');
  if (ate !== undefined) {
    if (!dataValida(ate)) return falha('Informe uma data válida.', 'ate');
    if (ate <= hoje) return falha('A data para voltar a ver o alerta deve ser depois de hoje.', 'ate');
  }
  const prefs = preferenciasDe(estado);
  const resto = prefs.dispensados.filter((d) => d.id !== id && dispensaVigente(d, hoje));
  return ok(comPreferencias(estado, { ...prefs, dispensados: [...resto, ate === undefined ? { id } : { id, ate }] }));
}

export function restaurarAlerta(estado: AppState, id: string): Resultado<AppState> {
  const prefs = preferenciasDe(estado);
  if (!prefs.dispensados.some((d) => d.id === id)) return falha('Este alerta não está dispensado.');
  return ok(comPreferencias(estado, { ...prefs, dispensados: prefs.dispensados.filter((d) => d.id !== id) }));
}

// ------------------------------------------------------------------- limiares

export function validarLimiares(l: LimiaresAlertas): Resultado<LimiaresAlertas> {
  if (!Number.isInteger(l.diasAntecedencia) || l.diasAntecedencia < DIAS_ANTECEDENCIA_MIN || l.diasAntecedencia > DIAS_ANTECEDENCIA_MAX) {
    return falha(`Os dias de antecedência devem ser um inteiro de ${DIAS_ANTECEDENCIA_MIN} a ${DIAS_ANTECEDENCIA_MAX}.`, 'diasAntecedencia');
  }
  if (!Number.isSafeInteger(l.saldoMinimo) || l.saldoMinimo < 0) return falha('O saldo mínimo não pode ser negativo.', 'saldoMinimo');
  return ok(l);
}

export function definirLimiares(estado: AppState, limiares: LimiaresAlertas): Resultado<AppState> {
  const v = validarLimiares(limiares);
  if (!v.ok) return v;
  return ok(comPreferencias(estado, { ...preferenciasDe(estado), limiares: v.valor }));
}
