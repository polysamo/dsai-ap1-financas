import { useEffect, useId } from 'react';
import type { EscopoExclusao } from '../domain/cartoes';
import type { Transacao } from '../domain/types';
import { Botao } from './ui';
import './ExclusaoParcelaDialog.css';

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
    <div className="exclusao-parcela">
      <div role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="exclusao-parcela__caixa">
        <h2 id={idTitulo} className="exclusao-parcela__titulo">
          Excluir parcela?
        </h2>
        <p className="exclusao-parcela__texto">
          "{transacao.descricao}" faz parte de uma compra em {transacao.parcela?.total} parcelas. O que você quer excluir?
        </p>
        <div className="exclusao-parcela__acoes">
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
