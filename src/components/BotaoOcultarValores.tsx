import { usePreferencias } from '../state/preferencias';
import './BotaoOcultarValores.css';

/** Atalho do cabeçalho para a preferência "ocultar valores". */
export function BotaoOcultarValores() {
  const { preferencias, alterar } = usePreferencias();
  const oculto = preferencias.ocultarValores;
  return (
    <button
      type="button"
      aria-pressed={oculto}
      onClick={() => alterar({ ocultarValores: !oculto })}
      className="botao-ocultar"
    >
      {oculto ? 'Mostrar valores' : 'Ocultar valores'}
    </button>
  );
}
