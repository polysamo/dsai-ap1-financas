import { Link } from 'react-router-dom';
import { alertasVisiveis, contarPorSeveridade } from '../domain/alertas';
import { hojeISO } from '../domain/date';
import { useEstado } from '../state/store';
import './ContadorAlertas.css';

/**
 * Contador reutilizável de alertas visíveis (não adiados nem dispensados), com link para a central.
 * Pode ser colocado em qualquer tela.
 */
export function ContadorAlertas({ className = '' }: { className?: string }) {
  const estado = useEstado();
  const alertas = alertasVisiveis(estado, hojeISO());
  const total = alertas.length;
  const criticos = contarPorSeveridade(alertas).critico;

  const texto = total === 0 ? 'Sem alertas' : total === 1 ? '1 alerta' : `${total} alertas`;
  const detalhe =
    total === 0 ? 'Nenhum alerta ativo' : criticos === 0 ? 'nenhum crítico' : criticos === 1 ? '1 crítico' : `${criticos} críticos`;
  const nivel = total === 0 ? 'vazio' : criticos > 0 ? 'critico' : 'atencao';

  return (
    <Link
      to="/alertas"
      className={`alertas-contador alertas-contador--${nivel} ${className}`.trim()}
      aria-label={`${texto}${total === 0 ? '' : `, ${detalhe}`}. Abrir central de alertas`}
    >
      <span className="alertas-contador__numero" aria-hidden="true">
        {total}
      </span>
      <span className="alertas-contador__texto">{texto}</span>
      {criticos > 0 ? <span className="alertas-contador__detalhe">{detalhe}</span> : null}
    </Link>
  );
}
