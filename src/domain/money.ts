import type { Centavos } from './types';

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como `R$ 1.234,56` (negativos com sinal). */
export function formatarMoeda(valor: Centavos): string {
  return formatadorMoeda.format(valor / 100).replace(/ /g, ' ');
}

/** Formata em valor absoluto, útil quando o sinal já vem do contexto. */
export function formatarMoedaAbs(valor: Centavos): string {
  return formatarMoeda(Math.abs(valor));
}

/** Percentual inteiro de `parte` sobre `total`. */
export function percentual(parte: Centavos, total: Centavos): number {
  if (total === 0) return 0;
  return Math.round((parte * 100) / total);
}

/**
 * Converte texto em centavos. Aceita `1.234,56`, `-50,00`, `1234.56`, `R$ 10`.
 * Retorna null se não for um número válido com no máximo 2 casas decimais.
 */
export function parseValor(texto: string): Centavos | null {
  let s = texto.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return null;
  let negativo = false;
  if (s.startsWith('-')) {
    negativo = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;

  const ultimaVirgula = s.lastIndexOf(',');
  const ultimoPonto = s.lastIndexOf('.');
  let inteira: string;
  let decimal = '';

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    const sepDecimal = ultimaVirgula > ultimoPonto ? ',' : '.';
    const sepMilhar = sepDecimal === ',' ? '.' : ',';
    const partes = s.split(sepDecimal);
    if (partes.length !== 2) return null;
    inteira = partes[0].split(sepMilhar).join('');
    decimal = partes[1];
  } else if (ultimaVirgula >= 0) {
    const partes = s.split(',');
    if (partes.length !== 2) return null;
    [inteira, decimal] = partes;
  } else if (ultimoPonto >= 0) {
    const partes = s.split('.');
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      inteira = partes.join('');
    } else if (partes.length === 2) {
      [inteira, decimal] = partes;
    } else {
      return null;
    }
  } else {
    inteira = s;
  }

  if (!/^\d*$/.test(inteira) || !/^\d*$/.test(decimal)) return null;
  if (inteira === '' && decimal === '') return null;
  if (decimal.length > 2) return null;
  const centavos = Number(inteira || '0') * 100 + Number((decimal + '00').slice(0, 2));
  if (!Number.isSafeInteger(centavos)) return null;
  return negativo ? -centavos : centavos;
}

/** Texto para preencher um campo de edição (`1234,56`). */
export function valorParaCampo(valor: Centavos): string {
  const abs = Math.abs(valor);
  const texto = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
  return valor < 0 ? `-${texto}` : texto;
}

/** Percentual com uma casa decimal e vírgula (`12,3%`); `—` quando não se aplica. */
export function formatarPercentual(valor: number | null): string {
  if (valor === null) return '—';
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
