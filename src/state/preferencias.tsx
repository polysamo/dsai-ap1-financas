import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PREFERENCIAS_PADRAO,
  aplicarPreferencias,
  consultaEscuro,
  lerPreferencias,
  removerPreferencias,
  salvarPreferencias,
  type Preferencias,
} from '../lib/preferencias';

interface ContextoPreferencias {
  preferencias: Preferencias;
  /** Mensagem quando a última gravação falhou; some na próxima gravação bem-sucedida. */
  erro: string | null;
  alterar: (parcial: Partial<Preferencias>) => void;
  /** Volta aos padrões e remove a chave do armazenamento. */
  redefinir: () => void;
}

const Contexto = createContext<ContextoPreferencias | null>(null);

const MSG_GRAVACAO = 'Não foi possível salvar a preferência no navegador. Ela vale só até recarregar a página.';

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<Preferencias>(() => lerPreferencias(window.localStorage));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    aplicarPreferencias(preferencias);
    if (preferencias.tema !== 'sistema') return;
    const consulta = consultaEscuro();
    if (!consulta) return;
    const aoMudar = () => aplicarPreferencias(preferencias);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, [preferencias]);

  const alterar = useCallback(
    (parcial: Partial<Preferencias>) => {
      const novas = { ...preferencias, ...parcial };
      setPreferencias(novas);
      try {
        salvarPreferencias(novas, window.localStorage);
        setErro(null);
      } catch {
        setErro(MSG_GRAVACAO);
      }
    },
    [preferencias],
  );

  const redefinir = useCallback(() => {
    removerPreferencias(window.localStorage);
    setPreferencias({ ...PREFERENCIAS_PADRAO });
    setErro(null);
  }, []);

  const valor = useMemo(() => ({ preferencias, erro, alterar, redefinir }), [preferencias, erro, alterar, redefinir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePreferencias(): ContextoPreferencias {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('usePreferencias precisa estar dentro de PreferenciasProvider');
  return ctx;
}
