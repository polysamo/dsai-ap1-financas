import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EditorCelula, type EscopoLimite } from '../components/orcamentoAnual/EditorCelula';
import { GradeAnual, type CelulaSelecionada } from '../components/orcamentoAnual/GradeAnual';
import { ResumoAnual } from '../components/orcamentoAnual/ResumoAnual';
import { Alerta, Botao, CampoTexto, EstadoVazio, TituloPagina } from '../components/ui';
import { hojeISO } from '../domain/date';
import { gerarCsv } from '../domain/exportacao';
import { definirLimite, removerLimite } from '../domain/orcamento';
import {
  alternarRollover,
  anoValido,
  csvOrcamentoAnual,
  definirLimiteEmMeses,
  mesesAPartirDe,
  mesesDoAno,
  nomeArquivoOrcamentoAnual,
  visaoAnual,
} from '../domain/orcamentoAnual';
import { baixarArquivo } from '../lib/download';
import { useEstado, useStore } from '../state/store';
import './OrcamentoAnualPage.css';

export function OrcamentoAnualPage() {
  const store = useStore();
  const estado = useEstado();
  const [params, setParams] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CelulaSelecionada | null>(null);

  const anoParam = params.get('ano') ?? '';
  const ano = anoValido(anoParam) ? Number(anoParam) : Number(hojeISO().slice(0, 4));
  const irPara = (novo: number) => {
    setSelecionada(null);
    setParams({ ano: String(novo) }, { replace: true });
  };

  const visao = useMemo(() => visaoAnual(estado, ano), [estado, ano]);
  const temLimites = visao.linhas.some((l) => l.orcado !== null);
  const linhaSelecionada = selecionada ? visao.linhas.find((l) => l.categoria.id === selecionada.categoriaId) : undefined;
  const celula = linhaSelecionada?.celulas.find((c) => c.mes === selecionada?.mes);

  const salvarLimite = (cel: CelulaSelecionada, escopo: EscopoLimite, limite: number) => {
    const r = store.aplicar((s) => {
      if (escopo === 'todos') return definirLimiteEmMeses(s, cel.categoriaId, mesesDoAno(ano), limite);
      if (escopo === 'apartir') return definirLimiteEmMeses(s, cel.categoriaId, mesesAPartirDe(cel.mes), limite);
      return definirLimite(s, cel.categoriaId, cel.mes, limite);
    });
    setErro(r.ok ? null : r.erro);
    return r;
  };

  return (
    <div>
      <TituloPagina
        acoes={
          <Botao
            variante="secundario"
            disabled={visao.linhas.length === 0}
            onClick={() => baixarArquivo(nomeArquivoOrcamentoAnual(ano), gerarCsv(csvOrcamentoAnual(visao)), 'text/csv')}
          >
            Exportar CSV
          </Botao>
        }
      >
        Orçamento anual
      </TituloPagina>
      <div className="orcanual-pagina">
        <div className="orcanual-navegacao">
          <Botao variante="secundario" onClick={() => irPara(ano - 1)}>
            Ano anterior
          </Botao>
          <div className="orcanual-ano-campo">
            <CampoTexto label="Ano" type="number" min={2000} max={9999} value={ano} onChange={(e) => anoValido(e.target.value) && irPara(Number(e.target.value))} />
          </div>
          <Botao variante="secundario" onClick={() => irPara(ano + 1)}>
            Próximo ano
          </Botao>
          <p className="orcanual-ano-titulo" aria-live="polite">
            Orçamento de {ano}
          </p>
        </div>

        {erro ? <Alerta>{erro}</Alerta> : null}

        {visao.linhas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma categoria de despesa">Crie categorias de despesa na tela Transações para planejar o ano.</EstadoVazio>
        ) : (
          <>
            {!temLimites ? <Alerta tipo="aviso">Nenhum limite definido em {ano}. Clique numa célula da grade para definir um limite.</Alerta> : null}
            <ResumoAnual resumo={visao.resumo} />
            <p className="orcanual-dica">
              Com Rollover ligado, a sobra ou o estouro do mês anterior soma ao limite do mês seguinte (dentro do ano). O valor é calculado e não altera os limites salvos.
            </p>
            <GradeAnual
              visao={visao}
              selecionada={selecionada}
              onSelecionar={setSelecionada}
              onAlternarRollover={(id) => {
                const r = store.aplicar((s) => alternarRollover(s, id));
                setErro(r.ok ? null : r.erro);
              }}
            />
            {selecionada && linhaSelecionada && celula ? (
              <EditorCelula
                key={`${selecionada.categoriaId}-${selecionada.mes}`}
                categoriaNome={linhaSelecionada.categoria.nome}
                mes={selecionada.mes}
                limiteAtual={celula.limiteBase}
                onSalvar={(escopo, limite) => salvarLimite(selecionada, escopo, limite)}
                onRemover={() => {
                  const r = store.aplicar((s) => removerLimite(s, selecionada.categoriaId, selecionada.mes));
                  setErro(r.ok ? null : r.erro);
                  return r;
                }}
                onFechar={() => setSelecionada(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
