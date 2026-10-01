import { useEffect, useId, useRef, useState } from 'react';
import { Botao, CampoTexto } from './ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div ref={raiz} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id={idTitulo} className="text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        <p className="mt-2 text-sm text-slate-700">{mensagem}</p>
        {textoDigitado !== undefined ? (
          <div className="mt-3">
            <CampoTexto label={`Digite ${textoDigitado} para confirmar`} value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
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
