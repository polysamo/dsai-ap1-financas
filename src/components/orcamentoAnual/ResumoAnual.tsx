import { formatarMoeda, formatarPercentual } from '../../domain/money';
import { ROTULO_ESTADO_ANUAL, type ResumoAnual as Resumo } from '../../domain/orcamentoAnual';
import './ResumoAnual.css';

export function ResumoAnual({ resumo }: { resumo: Resumo }) {
  return (
    <div className="orcanual-resumo" role="group" aria-label="Resumo do ano">
      <div className="orcanual-resumo-item">
        <p className="orcanual-resumo-rotulo">Orçado no ano</p>
        <p className="orcanual-resumo-valor" data-testid="resumo-orcado">
          {formatarMoeda(resumo.orcado)}
        </p>
      </div>
      <div className="orcanual-resumo-item">
        <p className="orcanual-resumo-rotulo">Realizado nas categorias com limite</p>
        <p className="orcanual-resumo-valor" data-testid="resumo-realizado">
          {formatarMoeda(resumo.realizadoComLimite)}
        </p>
      </div>
      <div className={`orcanual-resumo-item${resumo.estado ? ` orcanual-resumo-item--${resumo.estado}` : ''}`}>
        <p className="orcanual-resumo-rotulo">Consumo do orçado</p>
        <p className="orcanual-resumo-valor" data-testid="resumo-situacao">
          {resumo.estado ? `${ROTULO_ESTADO_ANUAL[resumo.estado]} · ${formatarPercentual(resumo.percentual)}` : 'Sem limites no ano'}
        </p>
      </div>
      <div className="orcanual-resumo-item">
        <p className="orcanual-resumo-rotulo">Gasto sem orçamento</p>
        <p className="orcanual-resumo-valor" data-testid="resumo-sem-orcamento">
          {formatarMoeda(resumo.gastoSemOrcamento)}
        </p>
      </div>
    </div>
  );
}
