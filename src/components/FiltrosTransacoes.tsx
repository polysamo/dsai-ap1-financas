import { listarTags } from '../domain/tags';
import type { FiltrosTransacoes } from '../domain/transacoes';
import type { AppState, TipoMovimento } from '../domain/types';
import { Botao, CampoSelect, CampoTexto } from './ui';
import './FiltrosTransacoes.css';

interface Props {
  estado: AppState;
  filtros: FiltrosTransacoes;
  onChange: (filtros: FiltrosTransacoes) => void;
  onLimpar: () => void;
}

export function FiltrosTransacoesForm({ estado, filtros, onChange, onLimpar }: Props) {
  const atualizar = (parcial: Partial<FiltrosTransacoes>) => onChange({ ...filtros, ...parcial });
  return (
    <form
      aria-label="Filtros de transações"
      onSubmit={(e) => e.preventDefault()}
      className="transacoes-filtros"
    >
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
      <div className="transacoes-filtros__limpar">
        <Botao variante="secundario" onClick={onLimpar}>
          Limpar filtros
        </Botao>
      </div>
    </form>
  );
}
