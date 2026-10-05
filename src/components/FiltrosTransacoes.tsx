import { FilterBar } from '../ds/FilterBar';
import { listarTags } from '../domain/tags';
import type { FiltrosTransacoes } from '../domain/transacoes';
import type { AppState, TipoMovimento } from '../domain/types';
import { CampoSelect, CampoTexto } from './ui';

interface Props {
  estado: AppState;
  filtros: FiltrosTransacoes;
  onChange: (filtros: FiltrosTransacoes) => void;
  onLimpar: () => void;
  /** Algum filtro difere do padrão. */
  ativo: boolean;
  resumo: string;
}

export function FiltrosTransacoesForm({ estado, filtros, onChange, onLimpar, ativo, resumo }: Props) {
  const atualizar = (parcial: Partial<FiltrosTransacoes>) => onChange({ ...filtros, ...parcial });
  return (
    <FilterBar ativo={ativo} aoLimpar={onLimpar} resumo={resumo}>
      <CampoTexto label="De" type="date" value={filtros.de ?? ''} onChange={(e) => atualizar({ de: e.target.value || undefined })} />
      <CampoTexto label="Até" type="date" value={filtros.ate ?? ''} onChange={(e) => atualizar({ ate: e.target.value || undefined })} />
      <CampoSelect label="Filtrar por conta" value={filtros.contaId ?? ''} onChange={(e) => atualizar({ contaId: e.target.value || undefined })}>
        <option value="">Todas</option>
        {estado.contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
            {c.arquivada ? ' (arquivada)' : ''}
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Filtrar por categoria" value={filtros.categoriaId ?? ''} onChange={(e) => atualizar({ categoriaId: e.target.value || undefined })}>
        <option value="">Todas</option>
        {estado.categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome} ({c.tipo})
          </option>
        ))}
      </CampoSelect>
      <CampoSelect label="Filtrar por tipo" value={filtros.tipo ?? ''} onChange={(e) => atualizar({ tipo: (e.target.value || undefined) as TipoMovimento | undefined })}>
        <option value="">Todos</option>
        <option value="receita">Receitas</option>
        <option value="despesa">Despesas</option>
      </CampoSelect>
      <CampoSelect label="Filtrar por tag" value={filtros.tag ?? ''} onChange={(e) => atualizar({ tag: e.target.value || undefined })}>
        <option value="">Todas</option>
        {listarTags(estado.transacoes).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Buscar na descrição" value={filtros.texto ?? ''} onChange={(e) => atualizar({ texto: e.target.value || undefined })} autoComplete="off" />
    </FilterBar>
  );
}
