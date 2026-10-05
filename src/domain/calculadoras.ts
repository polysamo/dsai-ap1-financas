import { falha, ok, type Centavos, type Resultado } from './types';

export const MESES_MAX = 600;
export const DIAS_MAX = 36500;
export const PARCELAS_MAX = 480;
export const TAXA_MENSAL_MAX = 100;
export const TAXA_ANUAL_MAX = 1000;

/** Texto em % (`1,5`, `12.6825`, `0`) para número; null se inválido ou com mais de 4 casas. */
export function parsePercentual(texto: string): number | null {
  const s = texto.trim().replace('%', '').trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,4})?$/.test(s)) return null;
  return Number(s);
}

/** Formata um percentual com até 4 casas, vírgula decimal (`12,6825%`). */
export function formatarTaxa(valor: number, casas = 4): string {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: casas })}%`;
}

const fator = (taxaPct: number) => 1 + taxaPct / 100;

type Campo<T> = Extract<keyof T, string>;

function validarDinheiro<T>(valor: Centavos, campo: Campo<T>, rotulo: string, positivo = false): Resultado<void> | null {
  if (!Number.isSafeInteger(valor) || valor < 0 || (positivo && valor === 0)) return falha(`${rotulo} deve ser ${positivo ? 'maior que zero' : 'zero ou mais'}.`, campo);
  return null;
}

function validarTaxa<T>(taxa: number, campo: Campo<T>, maximo: number, periodo: string): Resultado<void> | null {
  if (!Number.isFinite(taxa) || taxa < 0 || taxa > maximo) return falha(`Informe uma taxa ${periodo} de 0 a ${maximo}%.`, campo);
  return null;
}

function validarInteiro<T>(n: number, campo: Campo<T>, min: number, max: number, rotulo: string): Resultado<void> | null {
  if (!Number.isInteger(n) || n < min || n > max) return falha(`${rotulo} deve ser um número inteiro de ${min} a ${max}.`, campo);
  return null;
}

const primeiroErro = (...erros: (Resultado<void> | null)[]): Resultado<void> => erros.find((e) => e !== null) ?? ok(undefined);

// ------------------------------------------------------------ juros compostos

export interface DadosJuros {
  inicial: Centavos;
  aporteMensal: Centavos;
  taxaMensal: number;
  meses: number;
}

export interface MesJuros {
  mes: number;
  aportado: Centavos;
  juros: Centavos;
  saldo: Centavos;
}

export interface ResultadoJuros {
  linhas: MesJuros[];
  saldoFinal: Centavos;
  totalAportado: Centavos;
  totalJuros: Centavos;
}

export function validarJuros(d: DadosJuros): Resultado<void> {
  return primeiroErro(
    validarDinheiro<DadosJuros>(d.inicial, 'inicial', 'O valor inicial'),
    validarDinheiro<DadosJuros>(d.aporteMensal, 'aporteMensal', 'O aporte mensal'),
    validarTaxa<DadosJuros>(d.taxaMensal, 'taxaMensal', TAXA_MENSAL_MAX, 'mensal'),
    validarInteiro<DadosJuros>(d.meses, 'meses', 1, MESES_MAX, 'O prazo em meses'),
  );
}

/** Saldo exato após `k` meses (aporte no fim de cada mês), sem arredondar. */
function saldoExato(d: Pick<DadosJuros, 'inicial' | 'aporteMensal' | 'taxaMensal'>, k: number): number {
  const i = d.taxaMensal / 100;
  if (i === 0) return d.inicial + d.aporteMensal * k;
  const f = Math.pow(1 + i, k);
  return d.inicial * f + (d.aporteMensal * (f - 1)) / i;
}

/**
 * Evolução mês a mês. Cada saldo vem da fórmula fechada e é arredondado ao centavo, para não acumular
 * erro de arredondamento; os juros do mês são a diferença de saldo menos o aporte.
 */
export function jurosCompostos(d: DadosJuros): Resultado<ResultadoJuros> {
  const v = validarJuros(d);
  if (!v.ok) return v;
  const linhas: MesJuros[] = [];
  let anterior = d.inicial;
  for (let mes = 1; mes <= d.meses; mes++) {
    const saldo = Math.round(saldoExato(d, mes));
    linhas.push({ mes, aportado: d.inicial + d.aporteMensal * mes, juros: saldo - anterior - d.aporteMensal, saldo });
    anterior = saldo;
  }
  const saldoFinal = linhas[linhas.length - 1].saldo;
  const totalAportado = d.inicial + d.aporteMensal * d.meses;
  return ok({ linhas, saldoFinal, totalAportado, totalJuros: saldoFinal - totalAportado });
}

// --------------------------------------------------------- aporte para a meta

export interface DadosMeta {
  objetivo: Centavos;
  inicial: Centavos;
  taxaMensal: number;
  meses: number;
}

export function validarMeta(d: DadosMeta): Resultado<void> {
  return primeiroErro(
    validarDinheiro<DadosMeta>(d.objetivo, 'objetivo', 'O valor desejado', true),
    validarDinheiro<DadosMeta>(d.inicial, 'inicial', 'O valor inicial'),
    validarTaxa<DadosMeta>(d.taxaMensal, 'taxaMensal', TAXA_MENSAL_MAX, 'mensal'),
    validarInteiro<DadosMeta>(d.meses, 'meses', 1, MESES_MAX, 'O prazo em meses'),
  );
}

/** Aporte mensal (fim do mês) que leva `inicial` a `objetivo` em `meses`, arredondado para cima; 0 se já basta. */
export function aporteParaMeta(d: DadosMeta): Resultado<Centavos> {
  const v = validarMeta(d);
  if (!v.ok) return v;
  const i = d.taxaMensal / 100;
  const semAporte = saldoExato({ inicial: d.inicial, aporteMensal: 0, taxaMensal: d.taxaMensal }, d.meses);
  const falta = d.objetivo - semAporte;
  if (falta <= 0) return ok(0);
  const pmt = i === 0 ? falta / d.meses : (falta * i) / (Math.pow(1 + i, d.meses) - 1);
  // Margem contra erro de ponto flutuante antes do arredondamento para cima.
  return ok(Math.ceil(pmt - 1e-7));
}

// ------------------------------------------------------- equivalência de taxas

export interface Equivalencia {
  mensal: number;
  anual: number;
  /** Taxa real anual, descontada a inflação anual (Fisher). */
  realAnual: number;
}

export type PeriodoTaxa = 'mensal' | 'anual';

export interface DadosEquivalencia {
  taxa: number;
  periodo: PeriodoTaxa;
  inflacaoAnual: number;
}

export function equivalencia(d: DadosEquivalencia): Resultado<Equivalencia> {
  const maximo = d.periodo === 'mensal' ? TAXA_MENSAL_MAX : TAXA_ANUAL_MAX;
  const v = primeiroErro(
    validarTaxa<DadosEquivalencia>(d.taxa, 'taxa', maximo, d.periodo),
    validarTaxa<DadosEquivalencia>(d.inflacaoAnual, 'inflacaoAnual', TAXA_ANUAL_MAX, 'anual'),
  );
  if (!v.ok) return v;
  const anual = d.periodo === 'anual' ? d.taxa : (Math.pow(fator(d.taxa), 12) - 1) * 100;
  const mensal = d.periodo === 'mensal' ? d.taxa : (Math.pow(fator(d.taxa), 1 / 12) - 1) * 100;
  const realAnual = (fator(anual) / fator(d.inflacaoAnual) - 1) * 100;
  return ok({ mensal, anual, realAnual });
}

// ------------------------------------------------------------------ renda fixa

/** IOF regressivo sobre o rendimento, em % do rendimento, do 1º ao 29º dia; zero a partir do 30º. */
export const TABELA_IOF = [96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3];

export function aliquotaIof(dias: number): number {
  return dias >= 1 && dias <= TABELA_IOF.length ? TABELA_IOF[dias - 1] : 0;
}

/** Tabela regressiva do IR sobre aplicações de renda fixa, em %. */
export function aliquotaIr(dias: number): number {
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20;
  if (dias <= 720) return 17.5;
  return 15;
}

export type IndexadorRendaFixa = 'pre' | 'cdi';

export interface DadosRendaFixa {
  valor: Centavos;
  dias: number;
  indexador: IndexadorRendaFixa;
  /** Taxa anual pré-fixada, em %, quando `indexador` é 'pre'. */
  taxaAnual: number;
  /** Percentual do CDI (ex.: 110) e CDI anual em %, quando `indexador` é 'cdi'. */
  percentualCdi: number;
  cdiAnual: number;
  isento: boolean;
}

export interface ResultadoRendaFixa {
  taxaAnualBruta: number;
  bruto: Centavos;
  aliquotaIof: number;
  iof: Centavos;
  aliquotaIr: number;
  ir: Centavos;
  liquido: Centavos;
  valorFinal: Centavos;
  taxaAnualLiquida: number;
}

export function rendaFixa(d: DadosRendaFixa): Resultado<ResultadoRendaFixa> {
  const v = primeiroErro(
    validarDinheiro<DadosRendaFixa>(d.valor, 'valor', 'O valor aplicado', true),
    validarInteiro<DadosRendaFixa>(d.dias, 'dias', 1, DIAS_MAX, 'O prazo em dias'),
    d.indexador === 'pre' ? validarTaxa<DadosRendaFixa>(d.taxaAnual, 'taxaAnual', TAXA_ANUAL_MAX, 'anual') : null,
    d.indexador === 'cdi' ? validarTaxa<DadosRendaFixa>(d.percentualCdi, 'percentualCdi', TAXA_ANUAL_MAX, 'de percentual do CDI') : null,
    d.indexador === 'cdi' ? validarTaxa<DadosRendaFixa>(d.cdiAnual, 'cdiAnual', TAXA_ANUAL_MAX, 'anual') : null,
  );
  if (!v.ok) return v;
  const taxaAnualBruta = d.indexador === 'pre' ? d.taxaAnual : (d.cdiAnual * d.percentualCdi) / 100;
  const bruto = Math.round(d.valor * (Math.pow(fator(taxaAnualBruta), d.dias / 365) - 1));
  const aIof = aliquotaIof(d.dias);
  const iof = Math.round((bruto * aIof) / 100);
  const aIr = d.isento ? 0 : aliquotaIr(d.dias);
  const ir = Math.round(((bruto - iof) * aIr) / 100);
  const liquido = bruto - iof - ir;
  const valorFinal = d.valor + liquido;
  const taxaAnualLiquida = (Math.pow(valorFinal / d.valor, 365 / d.dias) - 1) * 100;
  return ok({ taxaAnualBruta, bruto, aliquotaIof: aIof, iof, aliquotaIr: aIr, ir, liquido, valorFinal, taxaAnualLiquida });
}

// ------------------------------------------------------ à vista ou parcelado

export interface DadosParcelamento {
  precoAvista: Centavos;
  parcelas: number;
  valorParcela: Centavos;
  /** Rendimento mensal do dinheiro que fica aplicado, em %. */
  rendimentoMensal: number;
  /** Primeira parcela paga no ato da compra. */
  entrada: boolean;
}

export interface ResultadoParcelamento {
  totalParcelado: Centavos;
  valorPresente: Centavos;
  melhor: 'avista' | 'parcelado' | 'empate';
  /** Quanto a melhor opção economiza, em valor presente. */
  diferenca: Centavos;
  /** Juros mensais embutidos no parcelamento, em %; null se não houver solução no intervalo. */
  taxaEmbutida: number | null;
}

/** Valor presente de `n` parcelas iguais à taxa `i` (fração), começando no mês 0 ou 1. */
function valorPresenteParcelas(parcela: number, n: number, i: number, entrada: boolean): number {
  let vp = 0;
  for (let k = 0; k < n; k++) vp += parcela / Math.pow(1 + i, entrada ? k : k + 1);
  return vp;
}

/** Taxa mensal (em %) que iguala as parcelas ao preço à vista, por bisseção entre -99% e 1000%. */
export function taxaEmbutida(precoAvista: Centavos, parcela: Centavos, n: number, entrada: boolean): number | null {
  if (parcela * n === precoAvista) return 0;
  const f = (i: number) => valorPresenteParcelas(parcela, n, i, entrada) - precoAvista;
  let baixo = -0.99;
  let alto = 10;
  if (f(baixo) * f(alto) > 0) return null;
  // O valor presente cai à medida que a taxa sobe: f é decrescente.
  for (let iter = 0; iter < 200 && alto - baixo > 1e-9; iter++) {
    const meio = (baixo + alto) / 2;
    if (f(meio) > 0) baixo = meio;
    else alto = meio;
  }
  return ((baixo + alto) / 2) * 100;
}

export function avistaOuParcelado(d: DadosParcelamento): Resultado<ResultadoParcelamento> {
  const v = primeiroErro(
    validarDinheiro<DadosParcelamento>(d.precoAvista, 'precoAvista', 'O preço à vista', true),
    validarInteiro<DadosParcelamento>(d.parcelas, 'parcelas', 1, PARCELAS_MAX, 'O número de parcelas'),
    validarDinheiro<DadosParcelamento>(d.valorParcela, 'valorParcela', 'O valor da parcela', true),
    validarTaxa<DadosParcelamento>(d.rendimentoMensal, 'rendimentoMensal', TAXA_MENSAL_MAX, 'mensal'),
  );
  if (!v.ok) return v;
  const totalParcelado = d.valorParcela * d.parcelas;
  const valorPresente = Math.round(valorPresenteParcelas(d.valorParcela, d.parcelas, d.rendimentoMensal / 100, d.entrada));
  const melhor = valorPresente < d.precoAvista ? 'parcelado' : valorPresente > d.precoAvista ? 'avista' : 'empate';
  return ok({
    totalParcelado,
    valorPresente,
    melhor,
    diferenca: Math.abs(d.precoAvista - valorPresente),
    taxaEmbutida: taxaEmbutida(d.precoAvista, d.valorParcela, d.parcelas, d.entrada),
  });
}
