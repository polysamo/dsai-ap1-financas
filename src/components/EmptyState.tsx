import { Botao } from './ui';
import './EmptyState.css';

export function EmptyState({ titulo, descricao, acaoRotulo, onAcao }: { titulo: string; descricao: string; acaoRotulo: string; onAcao: () => void }) {
  return (
    <div className="vazio">
      <span className="vazio__icone" aria-hidden="true">○</span>
      <p className="vazio__titulo">{titulo}</p>
      <p className="vazio__descricao">{descricao}</p>
      <Botao onClick={onAcao}>{acaoRotulo}</Botao>
    </div>
  );
}
