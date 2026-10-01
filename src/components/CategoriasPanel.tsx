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
import './CategoriasPanel.css';

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
    <form onSubmit={enviar} noValidate aria-label="Nova categoria" className="categorias__nova">
      <CampoTexto label="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} maxLength={60} autoComplete="off" />
      <CampoSelect label="Tipo da categoria" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <div className="categorias__nova-acao">
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
      <li className="categorias__item">
        <form onSubmit={salvarNome} noValidate aria-label={`Renomear ${categoria.nome}`} className="categorias__renomear">
          <div className="categorias__renomear-campo">
            <CampoTexto label={`Novo nome de ${categoria.nome}`} value={nome} onChange={(e) => setNome(e.target.value)} erro={erro} maxLength={60} />
          </div>
          <div className="categorias__renomear-acoes">
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
    <li className="categorias__item">
      <div className="categorias__linha">
        <p className="categorias__nome">
          {categoria.nome}
          {categoria.arquivada ? <span className="categorias__selo">arquivada</span> : null}
        </p>
        <div className="categorias__botoes">
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
        <div className="categorias__exclusao" role="group" aria-label={`Excluir ${categoria.nome}`}>
          {emUso ? (
            <>
              <p className="categorias__exclusao-texto">
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
            <p className="categorias__exclusao-texto categorias__exclusao-texto--so">Excluir a categoria "{categoria.nome}"? Os limites de orçamento dela também serão removidos.</p>
          )}
          {erro ? <div className="categorias__exclusao-erro"><Alerta>{erro}</Alerta></div> : null}
          <div className="categorias__exclusao-acoes">
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
    <div className="categorias">
      <Cartao titulo="Nova categoria">
        <NovaCategoria />
        <p className="categorias__dica">Nomes com até {CATEGORIA_NOME_MAX} caracteres, únicos dentro de cada tipo.</p>
      </Cartao>
      <div className="categorias__grupos">
        {grupos.map(([titulo, lista]) => (
          <Cartao key={titulo} titulo={titulo}>
            <ul className="categorias__lista">
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
