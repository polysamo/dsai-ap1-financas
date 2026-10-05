import type { ResumoSelecao } from '../../domain/lote';
import { formatarMoeda } from '../../domain/money';
import { Botao, Valor } from '../ui';
import './BarraLote.css';

export type AcaoLote = 'categoria' | 'conta' | 'data' | 'adicionar-tags' | 'remover-tags';

const ACOES: { acao: AcaoLote; rotulo: string }[] = [
  { acao: 'categoria', rotulo: 'Alterar categoria' },
  { acao: 'conta', rotulo: 'Mover para conta' },
  { acao: 'data', rotulo: 'Alterar data' },
  { acao: 'adicionar-tags', rotulo: 'Adicionar tags' },
  { acao: 'remover-tags', rotulo: 'Remover tags' },
];

export const ROTULO_ACAO_LOTE: Record<AcaoLote, string> = Object.fromEntries(ACOES.map((a) => [a.acao, a.rotulo])) as Record<AcaoLote, string>;

interface Props {
  resumo: ResumoSelecao;
  onAcao: (acao: AcaoLote) => void;
  onExcluir: () => void;
  onLimpar: () => void;
}

/** Resumo da seleção e ações em lote; só aparece com ao menos uma transação selecionada. */
export function BarraLote({ resumo, onAcao, onExcluir, onLimpar }: Props) {
  return (
    <section className="lote-barra" aria-label="Ações em lote">
      <div className="lote-barra__resumo">
        <strong>
          {resumo.quantidade} {resumo.quantidade === 1 ? 'selecionada' : 'selecionadas'}
        </strong>
        <span>Receitas {formatarMoeda(resumo.receitas)}</span>
        <span>Despesas {formatarMoeda(resumo.despesas)}</span>
        <span>
          Resultado <Valor centavos={resumo.resultado} texto={formatarMoeda(resumo.resultado)} />
        </span>
      </div>
      <div className="lote-barra__acoes">
        {ACOES.map((a) => (
          <Botao key={a.acao} variante="secundario" onClick={() => onAcao(a.acao)}>
            {a.rotulo}
          </Botao>
        ))}
        <Botao variante="perigo" onClick={onExcluir}>
          Excluir selecionadas
        </Botao>
        <Botao variante="link" onClick={onLimpar}>
          Limpar seleção
        </Botao>
      </div>
    </section>
  );
}
