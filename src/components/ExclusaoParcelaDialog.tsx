import { useEffect, useId } from 'react';
import type { EscopoExclusao } from '../domain/cartoes';
import type { Transacao } from '../domain/types';
import { Botao } from './ui';

interface Props {
  transacao: Transacao;
  onEscolher: (escopo: EscopoExclusao) => void;
  onCancelar: () => void;
}

/** Pergunta se a exclusão vale só para a parcela ou para todas as parcelas da compra. */
export function ExclusaoParcelaDialog({ transacao, onEscolher, onCancelar }: Props) {
  const idTitulo = useId();
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
          Excluir parcela?
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          "{transacao.descricao}" faz parte de uma compra em {transacao.parcela?.total} parcelas. O que você quer excluir?
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={() => onEscolher('uma')}>
            Só esta parcela
          </Botao>
          <Botao variante="perigo" onClick={() => onEscolher('todas')}>
            Todas as {transacao.parcela?.total} parcelas
          </Botao>
        </div>
      </div>
    </div>
  );
}
