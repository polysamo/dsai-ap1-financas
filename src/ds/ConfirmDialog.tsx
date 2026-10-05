import { useState } from 'react';
import './ConfirmDialog.css';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';

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

/** Confirmação de ação. Renderize-o apenas quando estiver aberto. */
export function ConfirmDialog({ titulo, mensagem, rotuloConfirmar, perigo, textoDigitado, onConfirmar, onCancelar }: Props) {
  const [digitado, setDigitado] = useState('');
  const liberado = textoDigitado === undefined || digitado === textoDigitado;
  return (
    <Modal
      aberto
      titulo={titulo}
      tamanho="pequeno"
      semBotaoFechar
      onFechar={onCancelar}
      rodape={
        <>
          <Button variante="secundario" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variante={perigo ? 'perigo' : 'primario'} disabled={!liberado} onClick={onConfirmar}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <p className="ds-confirmar__mensagem">{mensagem}</p>
      {textoDigitado !== undefined ? <Input label={`Digite ${textoDigitado} para confirmar`} value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" /> : null}
    </Modal>
  );
}
