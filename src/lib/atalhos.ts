import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Atalho {
  teclas: string;
  descricao: string;
  /** Letra que segue o `g`; ausente para atalhos que não são de navegação. */
  letra?: string;
  rota?: string;
  grupo: GrupoAtalho;
}

export type GrupoAtalho = 'Navegação' | 'Edição' | 'Busca e ajuda';

export const atalhos: Atalho[] = [
  { teclas: 'g d', letra: 'd', rota: '/', descricao: 'Ir para o Dashboard', grupo: 'Navegação' },
  { teclas: 'g t', letra: 't', rota: '/transacoes', descricao: 'Ir para Transações', grupo: 'Navegação' },
  { teclas: 'g c', letra: 'c', rota: '/contas', descricao: 'Ir para Contas', grupo: 'Navegação' },
  { teclas: 'g o', letra: 'o', rota: '/orcamento', descricao: 'Ir para Orçamento', grupo: 'Navegação' },
  { teclas: 'g m', letra: 'm', rota: '/metas', descricao: 'Ir para Metas', grupo: 'Navegação' },
  { teclas: 'g i', letra: 'i', rota: '/importar', descricao: 'Ir para Importar CSV', grupo: 'Navegação' },
  { teclas: 'g r', letra: 'r', rota: '/relatorios', descricao: 'Ir para Relatórios', grupo: 'Navegação' },
  { teclas: '?', descricao: 'Mostrar a lista de atalhos', grupo: 'Busca e ajuda' },
  { teclas: 'Ctrl+K', descricao: 'Abrir a busca global (também /)', grupo: 'Busca e ajuda' },
  { teclas: 'Ctrl+Z', descricao: 'Desfazer a última alteração', grupo: 'Edição' },
  { teclas: 'Ctrl+Shift+Z', descricao: 'Refazer a alteração desfeita (também Ctrl+Y)', grupo: 'Edição' },
];

const ORDEM_GRUPOS: GrupoAtalho[] = ['Navegação', 'Edição', 'Busca e ajuda'];

/** Atalhos agrupados na ordem de exibição, sem grupos vazios. */
export function atalhosPorGrupo(): { grupo: GrupoAtalho; atalhos: Atalho[] }[] {
  return ORDEM_GRUPOS.map((grupo) => ({ grupo, atalhos: atalhos.filter((a) => a.grupo === grupo) })).filter((g) => g.atalhos.length > 0);
}

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
