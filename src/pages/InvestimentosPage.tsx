import { useState } from 'react';
import { AlocacaoCarteira } from '../components/investimentos/AlocacaoCarteira';
import { AtivoCard } from '../components/investimentos/AtivoCard';
import { AtivoForm } from '../components/investimentos/AtivoForm';
import { GraficoPatrimonio } from '../components/investimentos/GraficoPatrimonio';
import { ResumoCarteira } from '../components/investimentos/ResumoCarteira';
import { Botao, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import { alocacaoPorClasse, criarAtivo, desempenhoCarteira, evolucaoPatrimonio } from '../domain/investimentos';
import { useEstado, useStore } from '../state/store';
import '../components/investimentos/investimentos.css';

export function InvestimentosPage() {
  const store = useStore();
  const { investimentos: ativos } = useEstado();
  const [criando, setCriando] = useState(false);
  const hoje = hojeISO();
  const evolucao = evolucaoPatrimonio(ativos, hoje);

  return (
    <div>
      <TituloPagina acoes={!criando ? <Botao onClick={() => setCriando(true)}>Novo ativo</Botao> : undefined}>Investimentos</TituloPagina>
      <div className="invest-pagina">
        {criando ? (
          <Cartao titulo="Novo ativo">
            <AtivoForm
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarAtivo(s, dados));
                if (r.ok) setCriando(false);
                return r;
              }}
            />
          </Cartao>
        ) : null}

        {ativos.length === 0 ? (
          !criando && (
            <EstadoVazio titulo="Nenhum ativo ainda" acao={<Botao onClick={() => setCriando(true)}>Cadastre seu primeiro ativo</Botao>}>
              Registre seus investimentos manualmente, com aportes, resgates e o valor atual, para acompanhar rentabilidade e alocação.
            </EstadoVazio>
          )
        ) : (
          <>
            <ResumoCarteira desempenho={desempenhoCarteira(ativos)} />
            <div className="invest-duas-colunas">
              <AlocacaoCarteira fatias={alocacaoPorClasse(ativos)} />
              {evolucao.length > 0 ? (
                <GraficoPatrimonio dados={evolucao} />
              ) : (
                <Cartao titulo="Evolução do patrimônio">
                  <p className="invest-texto-suave">Registre um aporte para acompanhar a evolução mês a mês.</p>
                </Cartao>
              )}
            </div>
            {ativos.map((a) => (
              <AtivoCard key={a.id} ativo={a} hoje={hoje} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
