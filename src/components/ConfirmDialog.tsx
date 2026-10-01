import { useEffect, useId, useRef, useState } from 'react';
import { Botao, CampoTexto } from './ui';
import './ConfirmDialog.css';

interface Props {
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  perigo?: boolean;
  /** Se informado, o usuário precisa digitar exatamente este texto para confirmar. */
  textoDigitado?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Diálogo modal de confirmação. Renderize-o apenas quando estiver aberto. */
export function ConfirmDialog({ titulo, mensagem, rotuloConfirmar, perigo, textoDigitado, onConfirmar, onCancelar }: Props) {
  const idTitulo = useId();
  const [digitado, setDigitado] = useState('');
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alvo = raiz.current?.querySelector<HTMLElement>('input, button');
    alvo?.focus();
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onCancelar]);

  const liberado = textoDigitado === undefined || digitado === textoDigitado;

  return (
    <div className="ui-modal-fundo">
      <div ref={raiz} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="ui-modal">
        <h2 id={idTitulo} className="ui-modal__titulo">
          {titulo}
        </h2>
        <p className="confirm-mensagem">{mensagem}</p>
        {textoDigitado !== undefined ? (
          <div className="confirm-campo">
            <CampoTexto label={`Digite ${textoDigitado} para confirmar`} value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </div>
        ) : null}
        <div className="confirm-acoes">
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} disabled={!liberado} onClick={onConfirmar}>
            {rotuloConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}
