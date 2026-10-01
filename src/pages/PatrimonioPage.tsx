import { useMemo, useState } from 'react';
import { ComposicaoPatrimonio } from '../components/patrimonio/ComposicaoPatrimonio';
import { GraficoPatrimonio } from '../components/patrimonio/GraficoPatrimonio';
import { MetasPatrimonio } from '../components/patrimonio/MetasPatrimonio';
import { ResumoPatrimonio } from '../components/patrimonio/ResumoPatrimonio';
import { Alerta, Botao, Cartao, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import {
  composicaoEm,
  criarMetaPatrimonio,
  csvPatrimonio,
  editarMetaPatrimonio,
  evolucaoPatrimonioLiquido,
  excluirMetaPatrimonio,
  metasDoEstado,
  nomeArquivoPatrimonio,
  variacoesPatrimonio,
} from '../domain/patrimonio';
import { baixarArquivo } from '../lib/download';
import { useEstado, useStore } from '../state/store';
import './PatrimonioPage.css';

export function PatrimonioPage() {
  const store = useStore();
  const estado = useEstado();
  const [erro, setErro] = useState<string | null>(null);
  const hoje = hojeISO();

  const composicao = useMemo(() => composicaoEm(estado, hoje), [estado, hoje]);
  const evolucao = useMemo(() => evolucaoPatrimonioLiquido(estado, hoje), [estado, hoje]);
  const variacoes = useMemo(() => variacoesPatrimonio(estado, hoje), [estado, hoje]);
  const metas = metasDoEstado(estado);
  const vazio = estado.contas.length === 0 && estado.investimentos.length === 0 && estado.dividas.length === 0;

  const exportar = () => {
    try {
      baixarArquivo(nomeArquivoPatrimonio(hoje), csvPatrimonio(estado, hoje), 'text/csv');
      setErro(null);
    } catch {
      setErro('Não foi possível gerar o arquivo CSV.');
    }
  };

  return (
    <div>
      <TituloPagina
        acoes={
          <Botao variante="secundario" onClick={exportar}>
            Exportar CSV
          </Botao>
        }
      >
        Patrimônio
      </TituloPagina>
      <div className="patrim-pagina">
        {erro ? <Alerta>{erro}</Alerta> : null}
        {vazio ? (
          <Alerta tipo="aviso">Ainda não há contas, investimentos nem dívidas cadastrados; o patrimônio é zero até você registrá-los.</Alerta>
        ) : null}
        <ResumoPatrimonio liquido={composicao.liquido} mes={variacoes.mes} anual={variacoes.anual} />
        <Cartao titulo="Evolução nos últimos 12 meses">
          <GraficoPatrimonio pontos={evolucao} />
        </Cartao>
        <Cartao titulo="Composição atual">
          <ComposicaoPatrimonio composicao={composicao} />
        </Cartao>
        <Cartao titulo="Metas de patrimônio">
          <MetasPatrimonio
            metas={metas}
            patrimonio={composicao.liquido}
            onCriar={(dados) => store.aplicar((s) => criarMetaPatrimonio(s, dados))}
            onEditar={(id, dados) => store.aplicar((s) => editarMetaPatrimonio(s, id, dados))}
            onExcluir={(id) => {
              const r = store.aplicar((s) => excluirMetaPatrimonio(s, id));
              setErro(r.ok ? null : r.erro);
            }}
          />
        </Cartao>
      </div>
    </div>
  );
}
