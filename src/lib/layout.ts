import { PREFIXO } from '../storage/storage';

export const CHAVE_LAYOUT = `${PREFIXO}layout`;

export interface PreferenciasLayout {
  recolhida: boolean;
  /** Títulos dos grupos fechados na sidebar. */
  gruposFechados: string[];
}

export const LAYOUT_PADRAO: PreferenciasLayout = { recolhida: false, gruposFechados: [] };

/** Lê as preferências da sidebar; qualquer dado ausente ou malformado volta ao padrão. */
export function lerLayout(storage: Storage): PreferenciasLayout {
  try {
    const bruto: unknown = JSON.parse(storage.getItem(CHAVE_LAYOUT) ?? 'null');
    if (typeof bruto !== 'object' || bruto === null) return LAYOUT_PADRAO;
    const { recolhida, gruposFechados } = bruto as Partial<PreferenciasLayout>;
    return {
      recolhida: recolhida === true,
      gruposFechados: Array.isArray(gruposFechados) ? gruposFechados.filter((g): g is string => typeof g === 'string') : [],
    };
  } catch {
    return LAYOUT_PADRAO;
  }
}

/** Grava as preferências; sem armazenamento disponível elas valem só até recarregar. */
export function gravarLayout(prefs: PreferenciasLayout, storage: Storage): void {
  try {
    storage.setItem(CHAVE_LAYOUT, JSON.stringify(prefs));
  } catch {
    // Conveniência apenas: falha de gravação não deve atrapalhar a navegação.
  }
}
