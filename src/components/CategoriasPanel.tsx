import { useState, type FormEvent } from 'react';
import {
  CATEGORIA_NOME_MAX,
  arquivarCategoria,
  categoriaEmUso,
  criarCategoria,
  excluirCategoria,
  renomearCategoria,
} from '../domain/transacoes';
import type { Categoria, TipoMovimento } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import { Alerta, Botao, Cartao, CampoSelect, CampoTexto } from './ui';

function NovaCategoria() {
  const store = useStore();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMovimento>('despesa');
  const [erro, setErro] = useState<string | undefined>();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = store.aplicar((s) => criarCategoria(s, { nome, tipo }));
    if (r.ok) {
      setNome('');
      setErro(undefined);
    } else setErro(r.erro);
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Nova categoria" className="grid gap-3 sm:grid-cols-3 sm:items-start">
      <CampoTexto label="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} maxLength={60} autoComplete="off" />
      <CampoSelect label="Tipo da categoria" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <div className="sm:pt-6">
        <Botao type="submit">Adicionar categoria</Botao>
      </div>
    </form>
  );
}

function LinhaCategoria({ categoria }: { categoria: Categoria }) {
  const store = useStore();
  const estado = useEstado();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [erro, setErro] = useState<string | undefined>();
  const [excluindo, setExcluindo] = useState(false);
  const [destino, setDestino] = useState('');
  const emUso = categoriaEmUso(estado, categoria.id);
  const destinos = estado.categorias.filter((c) => c.tipo === categoria.tipo && c.id !== categoria.id && !c.arquivada);

  const salvarNome = (e: FormEvent) => {
    e.preventDefault();
    const r = store.aplicar((s) => renomearCategoria(s, categoria.id, nome));
    if (r.ok) {
      setEditando(false);
      setErro(undefined);
    } else setErro(r.erro);
  };

  const confirmarExclusao = () => {
    const r = store.aplicar((s) => excluirCategoria(s, categoria.id, emUso ? destino : undefined));
    if (!r.ok) setErro(r.erro);
  };

  if (editando) {
    return (
      <li className="py-3">
        <form onSubmit={salvarNome} noValidate aria-label={`Renomear ${categoria.nome}`} className="flex flex-wrap items-start gap-2">
          <div className="min-w-[12rem] flex-1">
            <CampoTexto label={`Novo nome de ${categoria.nome}`} value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} maxLength={60} />
          </div>
          <div className="flex gap-2 pt-6">
            <Botao type="submit">Salvar nome</Botao>
            <Botao
              variante="secundario"
              onClick={() => {
                setEditando(false);
                setNome(categoria.nome);
                setErro(undefined);
              }}
            >
              Cancelar
            </Botao>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-slate-900">
          {categoria.nome}
          {categoria.arquivada ? <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal text-slate-700">arquivada</span> : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" aria-label={`Renomear ${categoria.nome}`} onClick={() => setEditando(true)}>
            Renomear
          </Botao>
          <Botao
            variante="secundario"
            aria-label={`${categoria.arquivada ? 'Reativar' : 'Arquivar'} ${categoria.nome}`}
            onClick={() => store.aplicar((s) => arquivarCategoria(s, categoria.id, !categoria.arquivada))}
          >
            {categoria.arquivada ? 'Reativar' : 'Arquivar'}
          </Botao>
          <Botao variante="perigo" aria-label={`Excluir ${categoria.nome}`} onClick={() => setExcluindo(true)}>
            Excluir
          </Botao>
        </div>
      </div>
      {excluindo ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3" role="group" aria-label={`Excluir ${categoria.nome}`}>
          {emUso ? (
            <>
              <p className="mb-2 text-sm text-slate-800">
                Esta categoria está em uso. Escolha para qual categoria mover as transações, ou arquive-a em vez de excluir.
              </p>
              <CampoSelect label="Categoria de destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Selecione…</option>
                {destinos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </CampoSelect>
            </>
          ) : (
            <p className="text-sm text-slate-800">Excluir a categoria "{categoria.nome}"? Os limites de orçamento dela também serão removidos.</p>
          )}
          {erro ? <div className="mt-2"><Alerta>{erro}</Alerta></div> : null}
          <div className="mt-3 flex gap-2">
            <Botao variante="perigo" disabled={emUso && !destino} onClick={confirmarExclusao}>
              {emUso ? 'Mover e excluir' : 'Confirmar exclusão'}
            </Botao>
            <Botao
              variante="secundario"
              onClick={() => {
                setExcluindo(false);
                setErro(undefined);
              }}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function CategoriasPanel() {
  const { categorias } = useEstado();
  const ordenar = (lista: Categoria[]) => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const grupos: Array<[string, Categoria[]]> = [
    ['Despesas', ordenar(categorias.filter((c) => c.tipo === 'despesa'))],
    ['Receitas', ordenar(categorias.filter((c) => c.tipo === 'receita'))],
  ];
  return (
    <div className="space-y-4">
      <Cartao titulo="Nova categoria">
        <NovaCategoria />
        <p className="mt-2 text-xs text-slate-600">Nomes com até {CATEGORIA_NOME_MAX} caracteres, únicos dentro de cada tipo.</p>
      </Cartao>
      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map(([titulo, lista]) => (
          <Cartao key={titulo} titulo={titulo}>
            <ul className="divide-y divide-slate-200">
              {lista.map((c) => (
                <LinhaCategoria key={c.id} categoria={c} />
              ))}
            </ul>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
