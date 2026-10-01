import { Cartao } from '../ui';
import { formatarMoeda } from '../../domain/money';
import { formatarPrazo, textoDataEstimada, type ParametrosIndependencia, type Simulacao, type SituacaoIdade } from '../../domain/independencia';
import './ResultadoIndependencia.css';

interface Props {
  parametros: ParametrosIndependencia;
  simulacao: Simulacao;
  idade: SituacaoIdade | null;
}

function linhasIdade(p: ParametrosIndependencia, idade: SituacaoIdade): string[] {
  const linhas: string[] = [];
  if (idade.idadeNaIndependencia !== null) linhas.push(`Você terá ${idade.idadeNaIndependencia} anos ao atingir a independência.`);
  if (p.idadeAlvo === undefined) return linhas;
  if (idade.folgaMeses === null) linhas.push(`Fora da idade alvo de ${p.idadeAlvo} anos.`);
  else if (idade.folgaMeses >= 0) linhas.push(`No prazo da idade alvo de ${p.idadeAlvo} anos, com ${formatarPrazo(idade.folgaMeses)} de folga.`);
  else linhas.push(`Fora da idade alvo de ${p.idadeAlvo} anos: atraso de ${formatarPrazo(-idade.folgaMeses)}.`);
  if (idade.aporteNecessario !== null) linhas.push(`Aporte mensal necessário para chegar aos ${p.idadeAlvo} anos: ${formatarMoeda(idade.aporteNecessario)}.`);
  return linhas;
}

export function ResultadoIndependencia({ parametros, simulacao, idade }: Props) {
  return (
    <Cartao titulo="Resultado">
      <dl className="indep-resultado__grade">
        <div className="indep-resultado__item">
          <dt>Patrimônio-alvo</dt>
          <dd data-testid="indep-alvo">{formatarMoeda(simulacao.alvo)}</dd>
        </div>
        <div className="indep-resultado__item">
          <dt>Tempo até atingir</dt>
          <dd data-testid="indep-prazo">{simulacao.meses === null ? '—' : formatarPrazo(simulacao.meses)}</dd>
        </div>
        <div className="indep-resultado__item">
          <dt>Data estimada</dt>
          <dd data-testid="indep-data">{textoDataEstimada(simulacao.mesAlvo)}</dd>
        </div>
      </dl>
      {simulacao.meses === null ? (
        <p className="indep-resultado__aviso" role="status">
          Não é alcançável em 100 anos com estas premissas. Aumente o aporte ou o retorno, ou reduza o gasto desejado.
        </p>
      ) : null}
      {simulacao.meses === 0 ? (
        <p className="indep-resultado__texto" role="status">
          Independência já atingida: o patrimônio atual cobre o patrimônio-alvo.
        </p>
      ) : null}
      {idade
        ? linhasIdade(parametros, idade).map((l) => (
            <p key={l} className="indep-resultado__texto">
              {l}
            </p>
          ))
        : null}
    </Cartao>
  );
}
