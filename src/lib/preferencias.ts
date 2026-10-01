import { PREFIXO } from '../storage/storage';

export const CHAVE_PREFERENCIAS = `${PREFIXO}preferencias`;

export type Tema = 'claro' | 'escuro' | 'sistema';
export const TEMAS: readonly Tema[] = ['claro', 'escuro', 'sistema'];

export interface Preferencias {
  tema: Tema;
  ocultarValores: boolean;
}

export const PREFERENCIAS_PADRAO: Preferencias = { tema: 'escuro', ocultarValores: false };

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

/** Lê as preferências; JSON inválido ou campos com tipo errado caem nos padrões, campo a campo. */
export function lerPreferencias(storage: Storage): Preferencias {
  let bruto: unknown;
  try {
    const texto = storage.getItem(CHAVE_PREFERENCIAS);
    bruto = texto === null ? null : JSON.parse(texto);
  } catch {
    return { ...PREFERENCIAS_PADRAO };
  }
  const dados = typeof bruto === 'object' && bruto !== null ? (bruto as Record<string, unknown>) : {};
  return {
    tema: TEMAS.includes(dados.tema as Tema) ? (dados.tema as Tema) : PREFERENCIAS_PADRAO.tema,
    ocultarValores: typeof dados.ocultarValores === 'boolean' ? dados.ocultarValores : PREFERENCIAS_PADRAO.ocultarValores,
  };
}

/** Grava as preferências; lança se o armazenamento recusar. */
export function salvarPreferencias(prefs: Preferencias, storage: Storage): void {
  storage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs));
}

export function removerPreferencias(storage: Storage): void {
  try {
    storage.removeItem(CHAVE_PREFERENCIAS);
  } catch {
    /* sem armazenamento: nada a remover */
  }
}

export function consultaEscuro(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_ESCURO) : null;
}

/** Aplica tema e privacidade às classes do <html>. */
export function aplicarPreferencias(prefs: Preferencias, raiz: HTMLElement = document.documentElement): void {
  const escuro = prefs.tema === 'escuro' || (prefs.tema === 'sistema' && consultaEscuro()?.matches === true);
  raiz.classList.toggle('dark', escuro);
  raiz.classList.toggle('claro', !escuro);
  raiz.classList.toggle('ocultar-valores', prefs.ocultarValores);
}
