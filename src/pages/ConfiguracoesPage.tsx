import { Alerta, Cartao, TituloPagina } from '../components/ui';
import { SecaoDados } from '../components/SecaoDados';
import type { Tema } from '../lib/preferencias';
import { usePreferencias } from '../state/preferencias';

const OPCOES_TEMA: { valor: Tema; rotulo: string; descricao: string }[] = [
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo claro, sempre.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Fundo escuro, sempre.' },
  { valor: 'sistema', rotulo: 'Sistema', descricao: 'Segue a configuração do seu dispositivo.' },
];

export function ConfiguracoesPage() {
  const { preferencias, erro, alterar } = usePreferencias();
  const oculto = preferencias.ocultarValores;

  return (
    <div>
      <TituloPagina>Configurações</TituloPagina>
      <div className="space-y-8">
        {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}

        <section aria-labelledby="secao-aparencia">
          <h2 id="secao-aparencia" className="mb-3 text-xl font-semibold text-slate-900">
            Aparência
          </h2>
          <Cartao>
            <div role="radiogroup" aria-labelledby="rotulo-tema" className="space-y-2">
              <p id="rotulo-tema" className="text-sm font-medium text-slate-700">
                Tema
              </p>
              {OPCOES_TEMA.map((o) => (
                <label key={o.valor} className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="tema"
                    value={o.valor}
                    checked={preferencias.tema === o.valor}
                    onChange={() => alterar({ tema: o.valor })}
                    className="mt-0.5 h-4 w-4 accent-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <span>
                    <span className="font-medium">{o.rotulo}</span>
                    <span className="block text-xs text-slate-600">{o.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-700">Moeda: real brasileiro (BRL)</p>
          </Cartao>
        </section>

        <section aria-labelledby="secao-privacidade">
          <h2 id="secao-privacidade" className="mb-3 text-xl font-semibold text-slate-900">
            Privacidade
          </h2>
          <Cartao>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p id="rotulo-ocultar" className="text-sm font-medium text-slate-800">
                  Ocultar valores
                </p>
                <p id="dica-ocultar" className="text-xs text-slate-600">
                  Desfoca os valores em reais na tela, útil para usar o app em público.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={oculto}
                aria-labelledby="rotulo-ocultar"
                aria-describedby="dica-ocultar"
                onClick={() => alterar({ ocultarValores: !oculto })}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <span aria-hidden="true" className={`h-3 w-3 rounded-full ${oculto ? 'bg-emerald-700' : 'bg-slate-400'}`} />
                {oculto ? 'Ligado' : 'Desligado'}
              </button>
            </div>
          </Cartao>
        </section>

        <SecaoDados />
      </div>
    </div>
  );
}
