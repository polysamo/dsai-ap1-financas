import { Botao } from './ui';

interface Props {
  titulo: string;
  descricao?: string;
  acaoRotulo?: string;
  onAcao?: () => void;
}

export function EmptyState({ titulo, descricao, acaoRotulo, onAcao }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--esp-6, 2rem) var(--esp-4, 1rem)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--texto-lg)' }}>{titulo}</h2>
      {descricao ? <p style={{ color: 'var(--cor-texto-mudo)', margin: '0.5rem 0 1rem' }}>{descricao}</p> : null}
      {acaoRotulo && onAcao ? <Botao onClick={onAcao}>{acaoRotulo}</Botao> : null}
    </div>
  );
}
