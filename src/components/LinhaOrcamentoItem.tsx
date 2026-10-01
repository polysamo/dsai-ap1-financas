import { useState, type FormEvent } from 'react';
import type { EstadoOrcamento, LinhaOrcamento } from '../domain/orcamento';
import { formatarMoeda, parseValor, valorParaCampo } from '../domain/money';
import type { Resultado } from '../domain/types';
import { Botao, CampoTexto, Valor } from './ui';
import './LinhaOrcamentoItem.css';

const ROTULO_ESTADO: Record<EstadoOrcamento, string> = {
  normal: 'Dentro do limite',
  atencao: 'Atenção: perto do limite',
  estourado: 'Estourado',
};

const ICONE_ESTADO: Record<EstadoOrcamento, string> = { normal: '✓', atencao: '!', estourado: '✕' };

const COR_BARRA: Record<EstadoOrcamento, string> = {
  normal: 'orcamento-barra--normal',
  atencao: 'orcamento-barra--atencao',
  estourado: 'orcamento-barra--estourado',
};

const COR_TEXTO: Record<EstadoOrcamento, string> = {
  normal: 'orcamento-estado--normal',
  atencao: 'orcamento-estado--atencao',
  estourado: 'orcamento-estado--estourado',
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
    <li className="orcamento-linha" data-testid={`orcamento-${categoria.id}`}>
      <div className="orcamento-cabecalho">
        <p className="orcamento-nome">
          {categoria.nome}
          {categoria.arquivada ? <span className="orcamento-selo">arquivada</span> : null}
        </p>
        <div className="orcamento-acoes">
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
        <form onSubmit={salvar} noValidate aria-label={`Limite de ${categoria.nome}`} className="orcamento-form">
          <div className="orcamento-form-campo">
            <CampoTexto label={`Limite mensal de ${categoria.nome}`} value={texto} onChange={(e) => setTexto(e.target.value)} erro={erro} inputMode="decimal" placeholder="0,00" />
          </div>
          <div className="orcamento-form-acoes">
            <Botao type="submit">Salvar limite</Botao>
            <Botao variante="secundario" onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : null}

      {limite === null ? (
        <p className="orcamento-sem-limite">
          Sem limite definido · Gasto: <span data-testid="gasto">{formatarMoeda(gasto)}</span>
        </p>
      ) : (
        <div className="orcamento-detalhe">
          <div
            role="progressbar"
            aria-label={`Consumo do orçamento de ${categoria.nome}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percentual ?? (gasto > 0 ? 100 : 0), 100)}
            className="orcamento-trilho"
          >
            <div className={`orcamento-barra ${COR_BARRA[estado!]}`} style={{ width: `${Math.min(percentual ?? (gasto > 0 ? 100 : 0), 100)}%` }} />
          </div>
          <div className="orcamento-resumo">
            <span className={`orcamento-estado ${COR_TEXTO[estado!]}`} data-testid="estado">
              <span aria-hidden="true">{ICONE_ESTADO[estado!]} </span>
              {ROTULO_ESTADO[estado!]}
              {percentual !== null ? ` · ${percentual}%` : ''}
            </span>
            <span className="orcamento-texto">
              Gasto <span data-testid="gasto">{formatarMoeda(gasto)}</span> de <span data-testid="limite">{formatarMoeda(limite)}</span>
            </span>
            <span className="orcamento-texto">
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
