import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { TipoAlerta } from './Alert';
import { IconButton } from './IconButton';
import './Toast.css';

export const DURACAO_TOAST_PADRAO = 5000;

interface Toast {
  id: number;
  tipo: TipoAlerta;
  texto: string;
}

interface Opcoes {
  tipo?: TipoAlerta;
  /** Milissegundos até sumir; 0 mantém até fechar. */
  duracao?: number;
}

interface Contexto {
  mostrar: (texto: string, opcoes?: Opcoes) => number;
  fechar: (id: number) => void;
}

const ToastContexto = createContext<Contexto | null>(null);

export function useToast(): Contexto {
  const c = useContext(ToastContexto);
  if (!c) throw new Error('useToast precisa estar dentro de ToastProvider');
  return c;
}

/** Fila de notificações temporárias numa região `aria-live`. */
export function ToastProvider({ children, maximo = 4 }: { children: ReactNode; maximo?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximo = useRef(1);
  const timers = useRef(new Map<number, number>());

  const fechar = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const mostrar = useCallback(
    (texto: string, { tipo = 'info', duracao = DURACAO_TOAST_PADRAO }: Opcoes = {}) => {
      const id = proximo.current++;
      setToasts((t) => [...t, { id, tipo, texto }].slice(-maximo));
      if (duracao > 0) timers.current.set(id, window.setTimeout(() => fechar(id), duracao));
      return id;
    },
    [fechar, maximo],
  );

  useEffect(() => {
    const ativos = timers.current;
    return () => ativos.forEach((t) => window.clearTimeout(t));
  }, []);

  const valor = useMemo(() => ({ mostrar, fechar }), [mostrar, fechar]);

  return (
    <ToastContexto.Provider value={valor}>
      {children}
      {createPortal(
        <div className="ds-toasts" role="region" aria-label="Notificações" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} role={t.tipo === 'erro' ? 'alert' : 'status'} className={`ds-toast ds-toast--${t.tipo}`}>
              <span className="ds-toast__texto">{t.texto}</span>
              <IconButton aria-label="Fechar notificação" icone="✕" tamanho="pequeno" onClick={() => fechar(t.id)} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContexto.Provider>
  );
}
