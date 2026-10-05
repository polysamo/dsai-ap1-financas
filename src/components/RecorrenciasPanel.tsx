import { useState, type FormEvent } from 'react';
import { OpcoesCategorias } from './OpcoesCategorias';
import { formatarMoeda, parseValor, valorParaCampo } from '../domain/money';
import {
  RECORRENCIA_DESCRICAO_MAX,
  alternarRecorrencia,
  criarRecorrencia,
  editarRecorrencia,
  excluirRecorrencia,
} from '../domain/projecao';
import type { AppState, Recorrencia, Resultado, TipoMovimento } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import { Alerta, Botao, CampoSelect, CampoTexto, Cartao } from './ui';
import './RecorrenciasPanel.css';

interface FormProps {
  estado: AppState;
  inicial?: Recorrencia;
  onSalvar: (dados: { descricao: string; tipo: TipoMovimento; valor: number; categoriaId: string }) => Resultado<void>;
  onCancelar?: () => void;
}

type Erros = Partial<Record<'descricao' | 'valor' | 'categoriaId' | 'geral', string>>;

function RecorrenciaForm({ estado, inicial, onSalvar, onCancelar }: FormProps) {
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [tipo, setTipo] = useState<TipoMovimento>(inicial?.tipo ?? 'despesa');
  const [valor, setValor] = useState(inicial ? valorParaCampo(inicial.valor) : '');
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 1.500,00.' });
    const r = onSalvar({ descricao, tipo, valor: centavos, categoriaId });
    if (!r.ok) return setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
    setErros({});
    if (!inicial) {
      setDescricao('');
      setValor('');
      setCategoriaId('');
    }
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? 'Editar recorrência' : 'Nova recorrência'} className="recorrencias__form">
      <CampoTexto label="Descrição da recorrência" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} maxLength={RECORRENCIA_DESCRICAO_MAX + 20} autoComplete="off" />
      <CampoSelect
        label="Tipo da recorrência"
        value={tipo}
        onChange={(e) => {
          setTipo(e.target.value as TipoMovimento);
          setCategoriaId('');
        }}
      >
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <CampoSelect label="Categoria da recorrência" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione…</option>
        <OpcoesCategorias categorias={estado.categorias} tipo={tipo} manterId={inicial?.categoriaId} />
      </CampoSelect>
      <CampoTexto label="Valor mensal" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      {erros.geral ? (
        <div className="recorrencias__form-linha">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="recorrencias__acoes-form">
        <Botao type="submit">{inicial ? 'Salvar recorrência' : 'Adicionar recorrência'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}

export function RecorrenciasPanel() {
  const store = useStore();
  const estado = useEstado();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const nomeCategoria = new Map(estado.categorias.map((c) => [c.id, c.nome]));

  return (
    <Cartao titulo="Recorrências usadas na projeção">
      <p className="recorrencias__intro">
        Valores fixos que se repetem todo mês, como salário e aluguel. Eles entram só na projeção: não criam transações nem mudam saldos. O histórico das categorias com recorrência ativa sai do cálculo das médias para não contar duas vezes.
      </p>
      {estado.recorrencias.length === 0 ? (
        <p className="recorrencias__vazio">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="recorrencias__lista" aria-label="Recorrências">
          {estado.recorrencias.map((r) =>
            editandoId === r.id ? (
              <li key={r.id} className="recorrencias__item">
                <RecorrenciaForm
                  estado={estado}
                  inicial={r}
                  onCancelar={() => setEditandoId(null)}
                  onSalvar={(dados) => {
                    const res = store.aplicar((s) => editarRecorrencia(s, r.id, dados));
                    if (res.ok) setEditandoId(null);
                    return res;
                  }}
                />
              </li>
            ) : (
              <li key={r.id} className="recorrencias__item recorrencias__item--linha">
                <div className="recorrencias__texto">
                  <p className={r.ativa ? 'recorrencias__nome' : 'recorrencias__nome recorrencias__nome--inativa'}>{r.descricao}</p>
                  <p className="recorrencias__detalhe">
                    {r.tipo === 'receita' ? 'Receita' : 'Despesa'} · {nomeCategoria.get(r.categoriaId) ?? 'Sem categoria'} · {formatarMoeda(r.valor)} por mês
                  </p>
                </div>
                <div className="recorrencias__acoes">
                  <label className="recorrencias__ativa">
                    <input
                      type="checkbox"
                      checked={r.ativa}
                      aria-label={`Recorrência ${r.descricao} ativa`}
                      onChange={(e) => store.aplicar((s) => alternarRecorrencia(s, r.id, e.target.checked))}
                      className="recorrencias__checkbox"
                    />
                    Ativa
                  </label>
                  <Botao variante="secundario" aria-label={`Editar recorrência ${r.descricao}`} onClick={() => setEditandoId(r.id)}>
                    Editar
                  </Botao>
                  <Botao variante="perigo" aria-label={`Excluir recorrência ${r.descricao}`} onClick={() => store.aplicar((s) => excluirRecorrencia(s, r.id))}>
                    Excluir
                  </Botao>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      <RecorrenciaForm estado={estado} onSalvar={(dados) => store.aplicar((s) => criarRecorrencia(s, dados))} />
    </Cartao>
  );
}
