import { useMemo, useState } from 'react';
import { Botao, CampoSelect, CampoTexto, EstadoVazio } from '../ui';
import {
  FILTROS_VAZIOS,
  ROTULO_TIPO_DIVISAO,
  historicoDoGrupo,
  type AcertoDivisao,
  type DespesaDivisao,
  type FiltrosHistorico,
  type GrupoDivisao,
  type TipoItemHistorico,
} from '../../domain/divisao';
import { formatarData } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import './Historico.css';

interface Props {
  grupo: GrupoDivisao;
  onEditarDespesa: (d: DespesaDivisao) => void;
  onExcluirDespesa: (d: DespesaDivisao) => void;
  onExcluirAcerto: (a: AcertoDivisao) => void;
}

export function Historico({ grupo, onEditarDespesa, onExcluirDespesa, onExcluirAcerto }: Props) {
  const [filtros, setFiltros] = useState<FiltrosHistorico>(FILTROS_VAZIOS);
  const itens = useMemo(() => historicoDoGrupo(grupo, filtros), [grupo, filtros]);
  const nome = (id: string) => grupo.participantes.find((p) => p.id === id)?.nome ?? 'removido';
  const alterar = (parcial: Partial<FiltrosHistorico>) => setFiltros((f) => ({ ...f, ...parcial }));
  const total = grupo.despesas.length + grupo.acertos.length;

  if (total === 0) {
    return <EstadoVazio titulo="Nenhuma despesa ainda">Adicione a primeira despesa do grupo para ver o histórico.</EstadoVazio>;
  }

  return (
    <div className="divisao-historico">
      <div className="divisao-historico__filtros" role="search" aria-label="Filtros do histórico">
        <CampoTexto label="Buscar" value={filtros.texto} onChange={(e) => alterar({ texto: e.target.value })} />
        <CampoSelect label="Participante" value={filtros.participanteId} onChange={(e) => alterar({ participanteId: e.target.value })}>
          <option value="">Todos</option>
          {grupo.participantes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect label="Tipo" value={filtros.tipo} onChange={(e) => alterar({ tipo: e.target.value as TipoItemHistorico })}>
          <option value="todos">Despesas e acertos</option>
          <option value="despesa">Só despesas</option>
          <option value="acerto">Só acertos</option>
        </CampoSelect>
        <CampoTexto label="De" type="date" value={filtros.de} onChange={(e) => alterar({ de: e.target.value })} />
        <CampoTexto label="Até" type="date" value={filtros.ate} onChange={(e) => alterar({ ate: e.target.value })} />
      </div>

      {itens.length === 0 ? (
        <EstadoVazio titulo="Nada encontrado com esses filtros" acao={<Botao variante="secundario" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</Botao>} />
      ) : (
        <ul className="divisao-historico__lista" aria-label="Histórico do grupo">
          {itens.map((i) =>
            i.tipo === 'despesa' ? (
              <li key={i.despesa.id} className="divisao-historico__item">
                <div className="divisao-historico__texto">
                  <span className="divisao-historico__titulo">{i.despesa.descricao}</span>
                  <span className="divisao-historico__detalhe">
                    {formatarData(i.despesa.data)} · pago por {nome(i.despesa.pagadorId)} · divisão {ROTULO_TIPO_DIVISAO[i.despesa.tipo].toLowerCase()} entre {i.despesa.partes.length}
                  </span>
                </div>
                <span className="divisao-historico__valor">{formatarMoeda(i.despesa.valor)}</span>
                <div className="divisao-historico__acoes">
                  <Botao variante="secundario" aria-label={`Editar despesa ${i.despesa.descricao}`} onClick={() => onEditarDespesa(i.despesa)}>
                    Editar
                  </Botao>
                  <Botao variante="secundario" aria-label={`Excluir despesa ${i.despesa.descricao}`} onClick={() => onExcluirDespesa(i.despesa)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ) : (
              <li key={i.acerto.id} className="divisao-historico__item">
                <div className="divisao-historico__texto">
                  <span className="divisao-historico__titulo">
                    Acerto: {nome(i.acerto.deId)} pagou a {nome(i.acerto.paraId)}
                  </span>
                  <span className="divisao-historico__detalhe">{formatarData(i.acerto.data)}</span>
                </div>
                <span className="divisao-historico__valor">{formatarMoeda(i.acerto.valor)}</span>
                <div className="divisao-historico__acoes">
                  <Botao variante="secundario" aria-label={`Excluir acerto de ${nome(i.acerto.deId)} a ${nome(i.acerto.paraId)} em ${formatarData(i.acerto.data)}`} onClick={() => onExcluirAcerto(i.acerto)}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
