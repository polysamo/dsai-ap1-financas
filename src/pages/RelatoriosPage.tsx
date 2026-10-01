import { useSearchParams } from 'react-router-dom';
import { RelatorioAnualView } from '../components/relatorios/RelatorioAnualView';
import { RelatorioCategoriaView } from '../components/relatorios/RelatorioCategoriaView';
import { RelatorioComparativoView } from '../components/relatorios/RelatorioComparativoView';
import { RelatorioMensalView } from '../components/relatorios/RelatorioMensalView';
import { TituloPagina } from '../components/ui';

const ABAS = [
  { id: 'mensal', rotulo: 'Mensal', Vista: RelatorioMensalView },
  { id: 'anual', rotulo: 'Anual', Vista: RelatorioAnualView },
  { id: 'categoria', rotulo: 'Por categoria', Vista: RelatorioCategoriaView },
  { id: 'comparativo', rotulo: 'Comparativo', Vista: RelatorioComparativoView },
] as const;

export function RelatoriosPage() {
  const [params, setParams] = useSearchParams();
  const ativa = ABAS.find((a) => a.id === params.get('aba')) ?? ABAS[0];
  const { Vista } = ativa;

  return (
    <div>
      <div className="print:hidden">
        <TituloPagina>Relatórios</TituloPagina>
        <div role="tablist" aria-label="Tipo de relatório" className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              id={`aba-${a.id}`}
              aria-selected={a.id === ativa.id}
              aria-controls="painel-relatorio"
              onClick={() => setParams({ aba: a.id }, { replace: true })}
              className={`rounded-t-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                a.id === ativa.id ? 'border-b-2 border-emerald-700 text-emerald-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id="painel-relatorio" aria-labelledby={`aba-${ativa.id}`}>
        <Vista />
      </div>
    </div>
  );
}
