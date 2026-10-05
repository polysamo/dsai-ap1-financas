import { ROTULO_FAIXA, type Indicador } from '../../domain/saude';
import './saude.css';

export function CartaoIndicador({ indicador }: { indicador: Indicador }) {
  const { titulo, valor, pontos, faixa, explicacao } = indicador;
  return (
    <article className={`saude-indicador${faixa ? ` saude-indicador--${faixa}` : ''}`} aria-label={titulo}>
      <header className="saude-indicador__cabecalho">
        <h2 className="saude-indicador__titulo">{titulo}</h2>
        <span className="saude-indicador__faixa">{faixa ? ROTULO_FAIXA[faixa] : 'Sem dados'}</span>
      </header>
      <p className="saude-indicador__valor tabular-nums">{valor ?? '—'}</p>
      <p className="saude-indicador__pontos">{pontos === null ? 'Fora da nota por falta de dados' : `${pontos} pontos`}</p>
      <p className="saude-indicador__explicacao">{explicacao}</p>
    </article>
  );
}
