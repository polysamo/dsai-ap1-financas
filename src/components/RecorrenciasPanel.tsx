import { useState, type FormEvent } from 'react';
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
  const categorias = estado.categorias.filter((c) => c.tipo === tipo && (!c.arquivada || c.id === inicial?.categoriaId));

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
    <form onSubmit={enviar} noValidate aria-label={inicial ? 'Editar recorrência' : 'Nova recorrência'} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      <CampoTexto label="Valor mensal" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      {erros.geral ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
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
      <p className="mb-3 text-sm text-slate-700">
        Valores fixos que se repetem todo mês, como salário e aluguel. Eles entram só na projeção: não criam transações nem mudam saldos. O histórico das categorias com recorrência ativa sai do cálculo das médias para não contar duas vezes.
      </p>
      {estado.recorrencias.length === 0 ? (
        <p className="mb-3 text-sm text-slate-600">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-200" aria-label="Recorrências">
          {estado.recorrencias.map((r) =>
            editandoId === r.id ? (
              <li key={r.id} className="py-3">
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
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className={`font-medium ${r.ativa ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{r.descricao}</p>
                  <p className="text-xs text-slate-600">
                    {r.tipo === 'receita' ? 'Receita' : 'Despesa'} · {nomeCategoria.get(r.categoriaId) ?? 'Sem categoria'} · {formatarMoeda(r.valor)} por mês
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={r.ativa}
                      aria-label={`Recorrência ${r.descricao} ativa`}
                      onChange={(e) => store.aplicar((s) => alternarRecorrencia(s, r.id, e.target.checked))}
                      className="h-4 w-4 accent-emerald-700"
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
