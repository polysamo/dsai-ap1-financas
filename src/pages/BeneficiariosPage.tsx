import { useMemo, useState } from 'react';
import { DetalheBeneficiario } from '../components/beneficiarios/DetalheBeneficiario';
import { Botao, CampoSelect, CampoTexto, Cartao, EstadoVazio, TituloPagina } from '../components/ui';
import { Badge } from '../ds';
import { FilterBar } from '../ds/FilterBar';
import {
  desfazerMescla,
  listarBeneficiarios,
  mesclarBeneficiario,
  PERIODOS_BENEFICIARIOS,
  renomearBeneficiario,
  type PeriodoBeneficiarios,
} from '../domain/beneficiarios';
import { hojeISO } from '../domain/date';
import { formatarMoeda, formatarPercentual } from '../domain/money';
import { normalizarTexto } from '../domain/transacoes';
import type { Resultado } from '../domain/types';
import { useEstado } from '../state/store';
import { useFeedback } from '../state/useFeedback';
import '../components/beneficiarios/beneficiarios.css';

const ROTULO_PERIODO: Record<string, string> = { '1': 'Mês atual', '3': 'Últimos 3 meses', '6': 'Últimos 6 meses', '12': 'Últimos 12 meses', tudo: 'Todo o histórico' };

export function BeneficiariosPage() {
  const estado = useEstado();
  const hoje = hojeISO();
  const [periodo, setPeriodo] = useState<PeriodoBeneficiarios>(12);
  const [filtro, setFiltro] = useState('');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const { executar } = useFeedback();

  const todos = useMemo(() => listarBeneficiarios(estado, periodo, hoje), [estado, periodo, hoje]);
  const visiveis = filtro.trim() ? todos.filter((b) => normalizarTexto(b.nome).includes(normalizarTexto(filtro))) : todos;
  const atual = todos.find((b) => b.chave === selecionada) ?? null;

  const filtrosAtivos = periodo !== 12 || filtro.trim().length > 0;
  const limparFiltros = () => {
    setPeriodo(12);
    setFiltro('');
  };

  return (
    <div className="benef-pagina">
      <TituloPagina descricao="Para quem vai o seu dinheiro: despesas agrupadas pela descrição, com renomear e mesclar.">Beneficiários</TituloPagina>
      <Cartao>
        <FilterBar ativo={filtrosAtivos} aoLimpar={limparFiltros} resumo={`${visiveis.length} ${visiveis.length === 1 ? 'beneficiário' : 'beneficiários'}`}>
          <CampoSelect label="Período" value={String(periodo)} onChange={(e) => setPeriodo(e.target.value === 'tudo' ? 'tudo' : (Number(e.target.value) as PeriodoBeneficiarios))}>
            {PERIODOS_BENEFICIARIOS.map((p) => (
              <option key={p} value={String(p)}>
                {ROTULO_PERIODO[String(p)]}
              </option>
            ))}
          </CampoSelect>
          <CampoTexto label="Filtrar pelo nome" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </FilterBar>
      </Cartao>

      {todos.length === 0 ? (
        <EstadoVazio titulo="Nenhuma despesa com descrição no período">Os beneficiários são formados pela descrição das despesas. Registre ou importe despesas com descrição para ver para onde vai o dinheiro.</EstadoVazio>
      ) : visiveis.length === 0 ? (
        <EstadoVazio titulo="Nenhum beneficiário encontrado" acao={<Botao onClick={limparFiltros}>Limpar filtros</Botao>}>
          Tente outro nome ou limpe os filtros para ver todos os beneficiários.
        </EstadoVazio>
      ) : (
        <div className="benef-colunas">
          <Cartao titulo={`${visiveis.length} ${visiveis.length === 1 ? 'beneficiário' : 'beneficiários'}`}>
            <ol className="benef-lista" aria-label="Beneficiários por total gasto">
              {visiveis.map((b) => (
                <li key={b.chave}>
                  <button type="button" className={`benef-item${atual?.chave === b.chave ? ' benef-item--ativo' : ''}`} aria-pressed={atual?.chave === b.chave} onClick={() => setSelecionada(b.chave)}>
                    <span className="benef-item__cabecalho">
                      <span className="benef-item__nome">{b.nome}</span>
                      <span className="benef-item__selos">
                        {todos.length > 1 && b.chave === todos[0]?.chave ? <Badge tom="primario">Maior gasto</Badge> : null}
                        {b.mesclados.length > 0 ? <Badge tom="info">{b.mesclados.length} {b.mesclados.length === 1 ? 'mesclada' : 'mescladas'}</Badge> : null}
                      </span>
                    </span>
                    <span className="benef-item__total tabular-nums">{formatarMoeda(b.total)}</span>
                    <span className="benef-item__meta">
                      {b.quantidade} {b.quantidade === 1 ? 'compra' : 'compras'} · {formatarPercentual(b.participacao)} das despesas
                    </span>
                    <span className="benef-item__barra" aria-hidden="true">
                      <span style={{ width: `${b.participacao ?? 0}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Cartao>
          {atual ? (
            <Cartao titulo={atual.nome}>
              <DetalheBeneficiario
                key={atual.chave}
                beneficiario={atual}
                outros={todos.filter((o) => o.chave !== atual.chave)}
                estado={estado}
                hoje={hoje}
                onRenomear={(nome): Resultado<void> => executar((s) => renomearBeneficiario(s, atual.chave, nome), 'Nome salvo.')}
                onMesclar={(destino) => {
                  const r = executar((s) => mesclarBeneficiario(s, atual.chave, destino), `${atual.nome} foi mesclado.`);
                  if (r.ok) setSelecionada(destino);
                  return r;
                }}
                onDesfazerMescla={(origem) => executar((s) => desfazerMescla(s, origem), 'Mescla desfeita.')}
              />
            </Cartao>
          ) : (
            <p className="benef-dica">Escolha um beneficiário para ver o detalhe, renomear ou mesclar.</p>
          )}
        </div>
      )}
    </div>
  );
}
