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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-3px' }}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {oculto ? <path d="M3 3l18 18" /> : null}
      </svg>
      {oculto ? 'Mostrar valores' : 'Ocultar valores'}
    </button>
  );
}
