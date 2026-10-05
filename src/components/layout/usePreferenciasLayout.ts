import { useCallback, useState } from 'react';
import { gravarLayout, lerLayout, type PreferenciasLayout } from '../../lib/layout';

/** Estado da sidebar (recolhida e grupos fechados), lembrado em `localStorage`. */
export function usePreferenciasLayout() {
  const [prefs, setPrefs] = useState<PreferenciasLayout>(() => lerLayout(window.localStorage));

  const atualizar = useCallback((f: (p: PreferenciasLayout) => PreferenciasLayout) => {
    setPrefs((atual) => {
      const nova = f(atual);
      gravarLayout(nova, window.localStorage);
      return nova;
    });
  }, []);

  const alternarRecolhida = useCallback(() => atualizar((p) => ({ ...p, recolhida: !p.recolhida })), [atualizar]);
  const alternarGrupo = useCallback(
    (titulo: string) => atualizar((p) => ({ ...p, gruposFechados: p.gruposFechados.includes(titulo) ? p.gruposFechados.filter((g) => g !== titulo) : [...p.gruposFechados, titulo] })),
    [atualizar],
  );

  return { ...prefs, alternarRecolhida, alternarGrupo };
}
