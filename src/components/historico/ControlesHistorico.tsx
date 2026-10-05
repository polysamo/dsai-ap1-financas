import { useCallback, useEffect, useRef, useState } from 'react';
import { proximoDesfazer, proximoRefazer } from '../../domain/historico';
import { emCampoDeEdicao } from '../../lib/atalhos';
import { useSnapshot, useStore } from '../../state/store';
import { Botao } from '../ui';
import './ControlesHistorico.css';

export const DURACAO_AVISO_MS = 5000;

interface Aviso {
  texto: string;
  erro: boolean;
}

/** Desfazer/refazer com atalhos de teclado e aviso temporário do que aconteceu. */
export function useHistoricoUI() {
  const store = useStore();
  const { historico } = useSnapshot();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<number | null>(null);

  const mostrar = useCallback((a: Aviso) => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    setAviso(a);
    temporizador.current = window.setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
  }, []);

  useEffect(() => () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
  }, []);

  const desfazer = useCallback(() => {
    const r = store.desfazer();
    mostrar(r.ok ? { texto: `Desfeito: ${r.valor}`, erro: false } : { texto: r.erro, erro: true });
  }, [store, mostrar]);

  const refazer = useCallback(() => {
    const r = store.refazer();
    mostrar(r.ok ? { texto: `Refeito: ${r.valor}`, erro: false } : { texto: r.erro, erro: true });
  }, [store, mostrar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || emCampoDeEdicao(e.target)) return;
      const tecla = e.key.toLowerCase();
      if (tecla === 'z' && !e.shiftKey) {
        e.preventDefault();
        desfazer();
      } else if ((tecla === 'z' && e.shiftKey) || tecla === 'y') {
        e.preventDefault();
        refazer();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [desfazer, refazer]);

  return { aviso, desfazer, refazer, proximoDesfazer: proximoDesfazer(historico), proximoRefazer: proximoRefazer(historico) };
}

export function BotoesHistorico({ ui }: { ui: ReturnType<typeof useHistoricoUI> }) {
  return (
    <div className="historico-botoes">
      <Botao variante="secundario" disabled={ui.proximoDesfazer === null} title={ui.proximoDesfazer ? `Desfazer: ${ui.proximoDesfazer} (Ctrl+Z)` : 'Nada para desfazer'} onClick={ui.desfazer}>
        Desfazer
      </Botao>
      <Botao variante="secundario" disabled={ui.proximoRefazer === null} title={ui.proximoRefazer ? `Refazer: ${ui.proximoRefazer} (Ctrl+Shift+Z)` : 'Nada para refazer'} onClick={ui.refazer}>
        Refazer
      </Botao>
    </div>
  );
}

export function AvisoHistorico({ ui }: { ui: ReturnType<typeof useHistoricoUI> }) {
  if (!ui.aviso) return null;
  return (
    <div role="status" className={`historico-aviso${ui.aviso.erro ? ' historico-aviso--erro' : ''}`}>
      {ui.aviso.texto}
    </div>
  );
}
