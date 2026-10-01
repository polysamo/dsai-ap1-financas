import { useSearchParams } from 'react-router-dom';
import { RelatorioAnualView } from '../components/relatorios/RelatorioAnualView';
import { RelatorioCategoriaView } from '../components/relatorios/RelatorioCategoriaView';
import { RelatorioComparativoView } from '../components/relatorios/RelatorioComparativoView';
import { RelatorioMensalView } from '../components/relatorios/RelatorioMensalView';
import { TituloPagina } from '../components/ui';
import './RelatoriosPage.css';

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
      <div className="relatorios-cabecalho">
        <TituloPagina>Relatórios</TituloPagina>
        <div role="tablist" aria-label="Tipo de relatório" className="relatorios-abas">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              type="button"
              id={`aba-${a.id}`}
              aria-selected={a.id === ativa.id}
              aria-controls="painel-relatorio"
              onClick={() => setParams({ aba: a.id }, { replace: true })}
              className={a.id === ativa.id ? 'relatorios-aba relatorios-aba--ativa' : 'relatorios-aba'}
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
