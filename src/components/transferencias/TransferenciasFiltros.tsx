import type { DataISO } from '../../domain/types';
import type { Conta } from '../../domain/types';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import './TransferenciasFiltros.css';

export interface ValoresFiltro {
  contaId: string;
  de: DataISO;
  ate: DataISO;
}

export const FILTRO_VAZIO: ValoresFiltro = { contaId: '', de: '', ate: '' };

interface Props {
  contas: Conta[];
  valores: ValoresFiltro;
  /** Mensagem de período inválido, mostrada junto à data final. */
  erroPeriodo?: string;
  onChange: (valores: ValoresFiltro) => void;
}

export function TransferenciasFiltros({ contas, valores, erroPeriodo, onChange }: Props) {
  const filtrando = valores.contaId !== '' || valores.de !== '' || valores.ate !== '';
  return (
    <form className="transf-filtros" aria-label="Filtros do histórico" onSubmit={(e) => e.preventDefault()}>
      <CampoSelect label="Conta" value={valores.contaId} onChange={(e) => onChange({ ...valores, contaId: e.target.value })}>
        <option value="">Todas as contas</option>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
            {c.arquivada ? ' (arquivada)' : ''}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="De" type="date" value={valores.de} onChange={(e) => onChange({ ...valores, de: e.target.value })} />
      <CampoTexto label="Até" type="date" value={valores.ate} onChange={(e) => onChange({ ...valores, ate: e.target.value })} erro={erroPeriodo} />
      <div className="transf-filtros-limpar">
        <Botao variante="secundario" disabled={!filtrando} onClick={() => onChange(FILTRO_VAZIO)}>
          Limpar
        </Botao>
      </div>
    </form>
  );
}
