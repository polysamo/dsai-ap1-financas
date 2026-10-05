import { Button } from '../ds/Button';
import { EmptyState as EstadoVazio } from '../ds/EmptyState';

/** Estado vazio com um botão de ação; a aparência vem da biblioteca. */
export function EmptyState({ titulo, descricao, acaoRotulo, onAcao }: { titulo: string; descricao: string; acaoRotulo: string; onAcao: () => void }) {
  return (
    <EstadoVazio titulo={titulo} acao={<Button onClick={onAcao}>{acaoRotulo}</Button>}>
      {descricao}
    </EstadoVazio>
  );
}
