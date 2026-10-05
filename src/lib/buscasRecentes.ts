import { PREFIXO } from '../storage/storage';

export const CHAVE_BUSCAS_RECENTES = `${PREFIXO}buscas-recentes`;

/** Lê as buscas recentes; dado ausente ou inválido vira lista vazia. */
export function lerBuscasRecentes(storage: Storage): string[] {
  try {
    const bruto: unknown = JSON.parse(storage.getItem(CHAVE_BUSCAS_RECENTES) ?? '[]');
    return Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Grava as buscas recentes; falha de gravação é ignorada (é só uma conveniência). */
export function gravarBuscasRecentes(storage: Storage, recentes: string[]): void {
  try {
    if (recentes.length === 0) storage.removeItem(CHAVE_BUSCAS_RECENTES);
    else storage.setItem(CHAVE_BUSCAS_RECENTES, JSON.stringify(recentes));
  } catch {
    // Sem armazenamento disponível a busca continua funcionando, só não lembra o histórico.
  }
}
