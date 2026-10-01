import { MODOS_PADRAO } from '../../domain/regras';
import { formatarTags } from '../../domain/tags';
import type { RegraCategoria } from '../../domain/types';
import { Botao } from '../ui';

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
    <li className={`grid gap-2 py-3 ${regra.ativa ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">
            <span className="mr-2 text-slate-600">{posicao}.</span>
            Descrição {modo.toLocaleLowerCase('pt-BR')} &ldquo;{regra.padrao}&rdquo;
          </p>
          <p className="text-xs text-slate-600">
            {regra.tipo === 'receita' ? 'Receita' : 'Despesa'} → {categoriaNome}
            {regra.tags.length > 0 ? ` · Tags: ${formatarTags(regra.tags)}` : ''}
            {regra.ativa ? '' : ' · Inativa'}
          </p>
          <p className="text-xs font-medium text-slate-700" data-testid={`previa-regra-${posicao}`}>
            {!regra.ativa ? 'Regra inativa: não atinge transações.' : `Atingiria ${atingidas} ${atingidas === 1 ? 'transação existente' : 'transações existentes'}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
