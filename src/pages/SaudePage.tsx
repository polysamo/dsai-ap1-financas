import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartaoIndicador } from '../components/saude/CartaoIndicador';
import { MedidorNota } from '../components/saude/MedidorNota';
import { Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO, nomeMes } from '../domain/date';
import { saudeFinanceira } from '../domain/saude';
import { useEstado } from '../state/store';
import '../components/saude/saude.css';

export function SaudePage() {
  const estado = useEstado();
  const saude = useMemo(() => saudeFinanceira(estado, hojeISO()), [estado]);
  const recomendacoes = saude.indicadores.filter((i) => i.recomendacao);

  if (saude.nota === null || saude.classificacao === null) {
    return (
      <div>
        <TituloPagina>Saúde financeira</TituloPagina>
        <EstadoVazio titulo="Ainda não há dados suficientes" acao={<Link to="/transacoes">Registrar transações</Link>}>
          A nota usa os últimos meses completos. Registre receitas e despesas de pelo menos um mês inteiro, ou cadastre cartões e limites de orçamento, para ver os indicadores.
        </EstadoVazio>
      </div>
    );
  }

  const periodo = saude.mesesReferencia.length ? `Referência: ${saude.mesesReferencia.map(nomeMes).join(', ')}.` : 'Sem meses completos de referência.';

  return (
    <div className="saude-pagina">
      <TituloPagina>Saúde financeira</TituloPagina>
      <Cartao titulo="Nota geral">
        <MedidorNota nota={saude.nota} classificacao={saude.classificacao} />
        <p className="saude-periodo">{periodo} A nota é a média dos indicadores com dados.</p>
      </Cartao>

      {recomendacoes.length > 0 ? (
        <Cartao titulo="O que melhorar">
          <ul className="saude-recomendacoes">
            {recomendacoes.map((i) => (
              <li key={i.id}>
                <strong>{i.titulo}:</strong> {i.recomendacao}
              </li>
            ))}
          </ul>
        </Cartao>
      ) : null}

      <div className="saude-grade">
        {saude.indicadores.map((i) => (
          <CartaoIndicador key={i.id} indicador={i} />
        ))}
      </div>
    </div>
  );
}
