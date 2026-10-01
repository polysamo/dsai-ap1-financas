import { usePreferencias } from '../state/preferencias';

/** Atalho do cabeçalho para a preferência "ocultar valores". */
export function BotaoOcultarValores() {
  const { preferencias, alterar } = usePreferencias();
  const oculto = preferencias.ocultarValores;
  return (
    <button
      type="button"
      aria-pressed={oculto}
      onClick={() => alterar({ ocultarValores: !oculto })}
      className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
    >
      {oculto ? 'Mostrar valores' : 'Ocultar valores'}
    </button>
  );
}
