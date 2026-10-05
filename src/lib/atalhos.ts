import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Atalho {
  teclas: string;
  descricao: string;
  /** Letra que segue o `g`; ausente para atalhos que não são de navegação. */
  letra?: string;
  rota?: string;
}

export const atalhos: Atalho[] = [
  { teclas: 'g d', letra: 'd', rota: '/', descricao: 'Ir para o Dashboard' },
  { teclas: 'g t', letra: 't', rota: '/transacoes', descricao: 'Ir para Transações' },
  { teclas: 'g c', letra: 'c', rota: '/contas', descricao: 'Ir para Contas' },
  { teclas: 'g o', letra: 'o', rota: '/orcamento', descricao: 'Ir para Orçamento' },
  { teclas: 'g m', letra: 'm', rota: '/metas', descricao: 'Ir para Metas' },
  { teclas: 'g i', letra: 'i', rota: '/importar', descricao: 'Ir para Importar CSV' },
  { teclas: 'g r', letra: 'r', rota: '/relatorios', descricao: 'Ir para Relatórios' },
  { teclas: '?', descricao: 'Mostrar a lista de atalhos' },
  { teclas: 'Ctrl+Z', descricao: 'Desfazer a última alteração' },
  { teclas: 'Ctrl+Shift+Z', descricao: 'Refazer a alteração desfeita (também Ctrl+Y)' },
];

const LIMITE_SEQUENCIA_MS = 1500;

/** Verdadeiro se o alvo do evento é um campo onde o usuário digita. */
export function emCampoDeEdicao(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName) || alvo.isContentEditable || alvo.getAttribute('contenteditable') === '' || alvo.getAttribute('contenteditable') === 'true';
}

/** Atalhos globais: `g` + letra navega, `?` chama `aoAjuda`. */
export function useAtalhos(aoAjuda: () => void) {
  const navegar = useNavigate();
  const aguardando = useRef<number | null>(null);

  useEffect(() => {
    const limpar = () => {
      if (aguardando.current !== null) window.clearTimeout(aguardando.current);
      aguardando.current = null;
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || emCampoDeEdicao(e.target)) return;
      if (aguardando.current !== null) {
        limpar();
        const destino = atalhos.find((a) => a.letra === e.key.toLowerCase());
        if (destino?.rota) {
          e.preventDefault();
          navegar(destino.rota);
        }
        return;
      }
      if (e.key === 'g') {
        aguardando.current = window.setTimeout(limpar, LIMITE_SEQUENCIA_MS);
      } else if (e.key === '?') {
        e.preventDefault();
        aoAjuda();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      limpar();
    };
  }, [navegar, aoAjuda]);
}
