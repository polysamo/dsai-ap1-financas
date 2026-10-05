import { useState, type FormEvent } from 'react';
import {
  CATEGORIA_NOME_MAX,
  arquivarCategoria,
  categoriaEmUso,
  criarCategoria,
  excluirCategoria,
  renomearCategoria,
} from '../domain/transacoes';
import { arvoreCategorias, definirPai, paiEfetivo } from '../domain/subcategorias';
import type { Categoria, TipoMovimento } from '../domain/types';
import { useEstado, useStore } from '../state/store';
import { Alerta, Botao, Cartao, CampoSelect, CampoTexto } from './ui';
import './CategoriasPanel.css';

/** Categorias que podem ser pai: ativas, de primeiro nível, do tipo, exceto a própria. */
function OpcoesPai({ categorias, tipo, exceto }: { categorias: Categoria[]; tipo: TipoMovimento; exceto?: string }) {
  const possiveis = categorias
    .filter((c) => c.tipo === tipo && !c.arquivada && c.id !== exceto && !paiEfetivo(categorias, c))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return (
    <>
      <option value="">Nenhuma (primeiro nível)</option>
      {possiveis.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </>
  );
}

function NovaCategoria() {
  const store = useStore();
  const { categorias } = useEstado();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMovimento>('despesa');
  const [paiId, setPaiId] = useState('');
  const [erro, setErro] = useState<{ texto: string; campo?: string } | undefined>();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = store.aplicar((s) => criarCategoria(s, { nome, tipo, ...(paiId ? { paiId } : {}) }));
    if (r.ok) {
      setNome('');
      setErro(undefined);
    } else setErro({ texto: r.erro, campo: r.campo });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Nova categoria" className="categorias__nova">
      <CampoTexto label="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} erro={erro?.campo !== 'paiId' ? erro?.texto : undefined} maxLength={60} autoComplete="off" />
      <CampoSelect
        label="Tipo da categoria"
        value={tipo}
        onChange={(e) => {
          setTipo(e.target.value as TipoMovimento);
          setPaiId('');
        }}
      >
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </CampoSelect>
      <CampoSelect label="Categoria pai" value={paiId} erro={erro?.campo === 'paiId' ? erro.texto : undefined} onChange={(e) => setPaiId(e.target.value)}>
        <OpcoesPai categorias={categorias} tipo={tipo} />
      </CampoSelect>
      <div className="categorias__nova-acao">
        <Botao type="submit">Adicionar categoria</Botao>
      </div>
    </form>
  );
}

function LinhaCategoria({ categoria, nivel }: { categoria: Categoria; nivel: 0 | 1 }) {
  const store = useStore();
  const estado = useEstado();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [paiId, setPaiId] = useState(categoria.paiId ?? '');
  const [erro, setErro] = useState<string | undefined>();
  const [excluindo, setExcluindo] = useState(false);
  const [destino, setDestino] = useState('');
  const emUso = categoriaEmUso(estado, categoria.id);
  const destinos = estado.categorias.filter((c) => c.tipo === categoria.tipo && c.id !== categoria.id && !c.arquivada);

  const salvarNome = (e: FormEvent) => {
    e.preventDefault();
    // Nome e pai numa operação só, para um único "Desfazer".
    const r = store.aplicar((s) => {
      const renomeada = renomearCategoria(s, categoria.id, nome);
      return renomeada.ok ? definirPai(renomeada.valor, categoria.id, paiId || null) : renomeada;
    });
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
          <div className="categorias__renomear-campo">
            <CampoSelect label={`Categoria pai de ${categoria.nome}`} value={paiId} onChange={(e) => setPaiId(e.target.value)}>
              <OpcoesPai categorias={estado.categorias} tipo={categoria.tipo} exceto={categoria.id} />
            </CampoSelect>
          </div>
          <div className="categorias__renomear-acoes">
            <Botao type="submit">Salvar</Botao>
            <Botao
              variante="secundario"
              onClick={() => {
                setEditando(false);
                setNome(categoria.nome);
                setPaiId(categoria.paiId ?? '');
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
    <li className={`categorias__item${nivel === 1 ? ' categorias__item--sub' : ''}`}>
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
  const grupos = [
    ['Despesas', arvoreCategorias(categorias, 'despesa')],
    ['Receitas', arvoreCategorias(categorias, 'receita')],
  ] as const;
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
              {lista.map(({ categoria, nivel }) => (
                <LinhaCategoria key={categoria.id} categoria={categoria} nivel={nivel} />
              ))}
            </ul>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
