import { useState } from 'react';
import { AlocacaoCarteira } from '../components/investimentos/AlocacaoCarteira';
import { AtivoCard } from '../components/investimentos/AtivoCard';
import { AtivoForm } from '../components/investimentos/AtivoForm';
import { GraficoPatrimonio } from '../components/investimentos/GraficoPatrimonio';
import { ResumoCarteira } from '../components/investimentos/ResumoCarteira';
import { Drawer } from '../ds/Drawer';
import { EmptyState } from '../components/EmptyState';
import { Botao, Cartao, TituloPagina } from '../components/ui';
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
      <TituloPagina acoes={<Botao onClick={() => setCriando(true)}>Novo ativo</Botao>}>Investimentos</TituloPagina>
      <div className="invest-pagina">
        <Drawer aberto={criando} titulo="Novo ativo" onFechar={() => setCriando(false)}>
            <AtivoForm
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarAtivo(s, dados));
                if (r.ok) setCriando(false);
                return r;
              }}
            />
        </Drawer>

        {ativos.length === 0 ? (
          <EmptyState titulo="Nenhum ativo ainda" descricao="Registre seus investimentos para acompanhar rentabilidade e alocação." acaoRotulo="Cadastre seu primeiro ativo" onAcao={() => setCriando(true)} />
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
