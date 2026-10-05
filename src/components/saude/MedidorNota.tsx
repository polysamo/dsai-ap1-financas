import { ROTULO_CLASSIFICACAO, type Classificacao } from '../../domain/saude';
import './saude.css';

/** Nota de 0 a 100 numa barra acessível (`role="meter"`), com a classificação em texto. */
export function MedidorNota({ nota, classificacao, compacto = false }: { nota: number; classificacao: Classificacao; compacto?: boolean }) {
  const rotulo = ROTULO_CLASSIFICACAO[classificacao];
  return (
    <div className={`saude-medidor saude-medidor--${classificacao}${compacto ? ' saude-medidor--compacto' : ''}`}>
      <p className="saude-medidor__nota">
        <span className="saude-medidor__numero tabular-nums">{nota}</span>
        <span className="saude-medidor__de">/100</span>
        <span className="saude-medidor__classe">{rotulo}</span>
      </p>
      <div role="meter" aria-label="Nota de saúde financeira" aria-valuemin={0} aria-valuemax={100} aria-valuenow={nota} aria-valuetext={`${nota} de 100, ${rotulo}`} className="saude-medidor__trilho">
        <div className="saude-medidor__barra" style={{ width: `${nota}%` }} />
      </div>
    </div>
  );
}
