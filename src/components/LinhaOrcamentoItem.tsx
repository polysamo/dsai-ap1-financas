import { useState, type FormEvent } from 'react';
import type { EstadoOrcamento, LinhaOrcamento } from '../domain/orcamento';
import { formatarMoeda, parseValor, valorParaCampo } from '../domain/money';
import type { Resultado } from '../domain/types';
import { Botao, CampoTexto, Valor } from './ui';

const ROTULO_ESTADO: Record<EstadoOrcamento, string> = {
  normal: 'Dentro do limite',
  atencao: 'Atenção: perto do limite',
  estourado: 'Estourado',
};

const ICONE_ESTADO: Record<EstadoOrcamento, string> = { normal: '✓', atencao: '!', estourado: '✕' };

const COR_BARRA: Record<EstadoOrcamento, string> = {
  normal: 'bg-emerald-600',
  atencao: 'bg-amber-500',
  estourado: 'bg-red-600',
};

const COR_TEXTO: Record<EstadoOrcamento, string> = {
  normal: 'text-emerald-800',
  atencao: 'text-amber-800',
  estourado: 'text-red-800',
};

interface Props {
  linha: LinhaOrcamento;
  onDefinir: (limite: number) => Resultado<void>;
  onRemover: () => void;
}

export function LinhaOrcamentoItem({ linha, onDefinir, onRemover }: Props) {
  const { categoria, limite, gasto, restante, percentual, estado } = linha;
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(limite === null ? '' : valorParaCampo(limite));
  const [erro, setErro] = useState<string | undefined>();

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const valor = parseValor(texto);
    if (valor === null) return setErro('Informe um valor válido, como 500,00.');
    if (valor < 0) return setErro('O limite não pode ser negativo.');
    const r = onDefinir(valor);
    if (!r.ok) return setErro(r.erro);
    setErro(undefined);
    setEditando(false);
  };

  return (
    <li className="py-3" data-testid={`orcamento-${categoria.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 font-medium text-slate-900">
          {categoria.nome}
          {categoria.arquivada ? <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal text-slate-700">arquivada</span> : null}
        </p>
        <div className="flex gap-2">
          <Botao
            variante="secundario"
            aria-label={`${limite === null ? 'Definir limite de' : 'Editar limite de'} ${categoria.nome}`}
            onClick={() => {
              setTexto(limite === null ? '' : valorParaCampo(limite));
              setErro(undefined);
              setEditando(true);
            }}
          >
            {limite === null ? 'Definir limite' : 'Editar limite'}
          </Botao>
          {limite !== null ? (
            <Botao variante="secundario" aria-label={`Remover limite de ${categoria.nome}`} onClick={onRemover}>
              Remover limite
            </Botao>
          ) : null}
        </div>
      </div>

      {editando ? (
        <form onSubmit={salvar} noValidate aria-label={`Limite de ${categoria.nome}`} className="mt-2 flex flex-wrap items-start gap-2">
          <div className="min-w-[10rem] flex-1">
            <CampoTexto label={`Limite mensal de ${categoria.nome}`} value={texto} onChange={(e) => setTexto(e.target.value)} erro={erro} inputMode="decimal" placeholder="0,00" />
          </div>
          <div className="flex gap-2 pt-6">
            <Botao type="submit">Salvar limite</Botao>
            <Botao variante="secundario" onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : null}

      {limite === null ? (
        <p className="mt-1 text-sm text-slate-600">
          Sem limite definido · Gasto: <span data-testid="gasto">{formatarMoeda(gasto)}</span>
        </p>
      ) : (
        <div className="mt-2 space-y-1">
          <div
            role="progressbar"
            aria-label={`Consumo do orçamento de ${categoria.nome}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percentual ?? (gasto > 0 ? 100 : 0), 100)}
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div className={`h-full ${COR_BARRA[estado!]}`} style={{ width: `${Math.min(percentual ?? (gasto > 0 ? 100 : 0), 100)}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className={`font-medium ${COR_TEXTO[estado!]}`} data-testid="estado">
              <span aria-hidden="true">{ICONE_ESTADO[estado!]} </span>
              {ROTULO_ESTADO[estado!]}
              {percentual !== null ? ` · ${percentual}%` : ''}
            </span>
            <span className="text-slate-700">
              Gasto <span data-testid="gasto">{formatarMoeda(gasto)}</span> de <span data-testid="limite">{formatarMoeda(limite)}</span>
            </span>
            <span className="text-slate-700">
              {restante! >= 0 ? 'Restante ' : 'Restante '}
              <Valor centavos={restante!} texto={formatarMoeda(restante!)} data-testid="restante" />
              {restante! < 0 ? (
                <>
                  {' '}
                  · Excedente <span data-testid="excedente">{formatarMoeda(-restante!)}</span>
                </>
              ) : null}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
