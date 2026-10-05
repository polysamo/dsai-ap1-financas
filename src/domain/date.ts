import type { DataISO, Mes } from './types';

export function dataParaISO(d: Date): DataISO {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function hojeISO(): DataISO {
  return dataParaISO(new Date());
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Valida `AAAA-MM-DD` incluindo dias inexistentes como 31/02. */
export function dataValida(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 1900 || ano > 2200 || mes < 1 || mes > 12) return false;
  return dia >= 1 && dia <= diasNoMes(ano, mes);
}

export function mesDe(data: DataISO): Mes {
  return data.slice(0, 7);
}

export function somarMeses(mes: Mes, n: number): Mes {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Diferença em meses (b - a). */
export function diferencaMeses(a: Mes, b: Mes): number {
  const [aa, am] = a.split('-').map(Number);
  const [ba, bm] = b.split('-').map(Number);
  return (ba - aa) * 12 + (bm - am);
}

export function formatarData(iso: DataISO): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

const nomesMeses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function nomeMes(mes: Mes): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${nomesMeses[m - 1]} de ${ano}`;
}

export function nomeMesCurto(mes: Mes): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${nomesMeses[m - 1].slice(0, 3)}/${String(ano).slice(2)}`;
}

export function primeiroDia(mes: Mes): DataISO {
  return `${mes}-01`;
}

export function ultimoDia(mes: Mes): DataISO {
  const [ano, m] = mes.split('-').map(Number);
  return `${mes}-${String(diasNoMes(ano, m)).padStart(2, '0')}`;
}

const MS_DIA = 86_400_000;

/** Meia-noite UTC da data, para contar dias sem interferência de fuso ou horário de verão. */
function diaUTC(iso: DataISO): number {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Soma (ou subtrai) dias corridos. */
export function somarDias(data: DataISO, dias: number): DataISO {
  return new Date(diaUTC(data) + dias * MS_DIA).toISOString().slice(0, 10);
}

/** Dias de `de` até `ate` (negativo se `ate` vem antes). */
export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((diaUTC(ate) - diaUTC(de)) / MS_DIA);
}

/** Dia da semana da data (0 = domingo). */
export function diaDaSemana(data: DataISO): number {
  return new Date(diaUTC(data)).getUTCDay();
}
