import { MODOS_PADRAO } from '../../domain/regras';
import { formatarTags } from '../../domain/tags';
import type { RegraCategoria } from '../../domain/types';
import { Botao } from '../ui';
import './regras.css';

interface Props {
  regra: RegraCategoria;
  posicao: number;
  total: number;
  categoriaNome: string;
  /** Quantas transações existentes a regra atingiria no escopo atual. */
  atingidas: number;
  onSubir: () => void;
  onDescer: () => void;
  onAlternar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onAplicar: () => void;
}

export function RegraItem({ regra, posicao, total, categoriaNome, atingidas, onSubir, onDescer, onAlternar, onEditar, onExcluir, onAplicar }: Props) {
  const rotulo = `regra ${posicao}: ${regra.padrao}`;
  const modo = MODOS_PADRAO.find((m) => m.valor === regra.modo)?.rotulo ?? regra.modo;
  return (
    <li className={`regras-item${regra.ativa ? '' : ' regras-item-inativa'}`}>
      <div className="regras-item-corpo">
        <div className="regras-item-texto">
          <p className="regras-item-titulo">
            <span className="regras-item-posicao">{posicao}.</span>
            Descrição {modo.toLocaleLowerCase('pt-BR')} &ldquo;{regra.padrao}&rdquo;
          </p>
          <p className="regras-item-detalhe">
            {regra.tipo === 'receita' ? 'Receita' : 'Despesa'} → {categoriaNome}
            {regra.tags.length > 0 ? ` · Tags: ${formatarTags(regra.tags)}` : ''}
            {regra.ativa ? '' : ' · Inativa'}
          </p>
          <p className="regras-item-previa" data-testid={`previa-regra-${posicao}`}>
            {!regra.ativa ? 'Regra inativa: não atinge transações.' : `Atingiria ${atingidas} ${atingidas === 1 ? 'transação existente' : 'transações existentes'}.`}
          </p>
        </div>
        <div className="regras-item-acoes">
          <Botao variante="secundario" aria-label={`Subir ${rotulo}`} disabled={posicao === 1} onClick={onSubir}>
            Subir
          </Botao>
          <Botao variante="secundario" aria-label={`Descer ${rotulo}`} disabled={posicao === total} onClick={onDescer}>
            Descer
          </Botao>
          <Botao variante="secundario" aria-label={`${regra.ativa ? 'Desativar' : 'Ativar'} ${rotulo}`} aria-pressed={regra.ativa} onClick={onAlternar}>
            {regra.ativa ? 'Desativar' : 'Ativar'}
          </Botao>
          <Botao variante="secundario" aria-label={`Aplicar às existentes: ${rotulo}`} disabled={!regra.ativa || atingidas === 0} onClick={onAplicar}>
            Aplicar às existentes
          </Botao>
          <Botao variante="secundario" aria-label={`Editar ${rotulo}`} onClick={onEditar}>
            Editar
          </Botao>
          <Botao variante="perigo" aria-label={`Excluir ${rotulo}`} onClick={onExcluir}>
            Excluir
          </Botao>
        </div>
      </div>
    </li>
  );
}
