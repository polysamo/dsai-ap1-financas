import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RegraForm } from '../components/regras/RegraForm';
import { RegraItem } from '../components/regras/RegraItem';
import { Alerta, Botao, Cartao, CampoSelect, EstadoVazio, TituloPagina } from '../components/ui';
import {
  aplicarRegra,
  alternarRegra,
  criarRegra,
  editarRegra,
  excluirRegra,
  moverRegra,
  transacoesAtingidas,
  type EscopoAplicacao,
} from '../domain/regras';
import type { RegraCategoria, Resultado } from '../domain/types';
import { useEstado, useStore } from '../state/store';

type Mensagem = { tipo: 'erro' | 'sucesso'; texto: string };

export function RegrasPage() {
  const store = useStore();
  const estado = useEstado();
  const [escopo, setEscopo] = useState<EscopoAplicacao>('outros');
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState<RegraCategoria | null>(null);
  const [excluindo, setExcluindo] = useState<RegraCategoria | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const nomeCategoria = new Map(estado.categorias.map((c) => [c.id, c.nome]));

  /** Aplica a operação e mostra o erro, se houver. */
  const executar = (operacao: Parameters<typeof store.aplicar>[0]): Resultado<void> => {
    const r = store.aplicar(operacao);
    setMensagem(r.ok ? null : { tipo: 'erro', texto: r.erro });
    return r;
  };

  const aplicarExistentes = (regra: RegraCategoria) => {
    let alteradas = 0;
    const r = store.aplicar((s) => {
      const a = aplicarRegra(s, regra.id, escopo);
      if (!a.ok) return a;
      alteradas = a.valor.alteradas;
      return { ok: true, valor: a.valor.estado };
    });
    setMensagem(r.ok ? { tipo: 'sucesso', texto: `${alteradas} ${alteradas === 1 ? 'transação atualizada' : 'transações atualizadas'}.` } : { tipo: 'erro', texto: r.erro });
    setAplicando(null);
  };

  return (
    <div>
      <TituloPagina acoes={!criando ? <Botao onClick={() => { setCriando(true); setEditandoId(null); }}>Nova regra</Botao> : undefined}>Regras</TituloPagina>
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Regras sugerem a categoria (e tags) de transações importadas. A primeira regra ativa da lista que casar com a descrição vence.
        </p>
        {mensagem ? <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta> : null}

        {criando ? (
          <Cartao titulo="Nova regra">
            <RegraForm
              estado={estado}
              onCancelar={() => setCriando(false)}
              onSalvar={(dados) => {
                const r = store.aplicar((s) => criarRegra(s, dados));
                if (r.ok) {
                  setCriando(false);
                  setMensagem(null);
                }
                return r;
              }}
            />
          </Cartao>
        ) : null}

        {estado.regras.length === 0 ? (
          !criando && (
            <EstadoVazio titulo="Nenhuma regra criada" acao={<Botao onClick={() => setCriando(true)}>Criar a primeira regra</Botao>}>
              Crie regras como &ldquo;descrição contém mercado → Alimentação&rdquo; para categorizar importações automaticamente.
            </EstadoVazio>
          )
        ) : (
          <Cartao
            titulo="Regras em ordem de prioridade"
            acoes={
              <div className="w-64">
                <CampoSelect label="Escopo da pré-visualização e da aplicação" value={escopo} onChange={(e) => setEscopo(e.target.value as EscopoAplicacao)}>
                  <option value="outros">Somente em Outros</option>
                  <option value="todas">Todas as categorias</option>
                </CampoSelect>
              </div>
            }
          >
            <ul className="divide-y divide-slate-200" aria-label="Lista de regras">
              {estado.regras.map((r, i) =>
                editandoId === r.id ? (
                  <li key={r.id} className="py-3">
                    <RegraForm
                      estado={estado}
                      inicial={r}
                      onCancelar={() => setEditandoId(null)}
                      onSalvar={(dados) => {
                        const res = store.aplicar((s) => editarRegra(s, r.id, dados));
                        if (res.ok) setEditandoId(null);
                        return res;
                      }}
                    />
                  </li>
                ) : (
                  <RegraItem
                    key={r.id}
                    regra={r}
                    posicao={i + 1}
                    total={estado.regras.length}
                    categoriaNome={nomeCategoria.get(r.categoriaId) ?? 'Categoria removida'}
                    atingidas={transacoesAtingidas(estado, r, escopo).length}
                    onSubir={() => executar((s) => moverRegra(s, r.id, -1))}
                    onDescer={() => executar((s) => moverRegra(s, r.id, 1))}
                    onAlternar={() => executar((s) => alternarRegra(s, r.id, !r.ativa))}
                    onEditar={() => { setEditandoId(r.id); setCriando(false); }}
                    onExcluir={() => setExcluindo(r)}
                    onAplicar={() => setAplicando(r)}
                  />
                ),
              )}
            </ul>
          </Cartao>
        )}
      </div>

      {aplicando ? (
        <ConfirmDialog
          titulo="Aplicar regra às transações existentes?"
          mensagem={`${transacoesAtingidas(estado, aplicando, escopo).length} transações (${escopo === 'outros' ? 'somente as que estão em Outros' : 'de todas as categorias'}) terão a categoria trocada para ${nomeCategoria.get(aplicando.categoriaId) ?? ''}${aplicando.tags.length > 0 ? ' e receberão as tags da regra' : ''}. Esta ação não pode ser desfeita.`}
          rotuloConfirmar="Aplicar"
          onCancelar={() => setAplicando(null)}
          onConfirmar={() => aplicarExistentes(aplicando)}
        />
      ) : null}
      {excluindo ? (
        <ConfirmDialog
          titulo="Excluir regra?"
          mensagem={`Excluir a regra "${excluindo.padrao}"? As transações já categorizadas por ela não mudam.`}
          rotuloConfirmar="Excluir"
          perigo
          onCancelar={() => setExcluindo(null)}
          onConfirmar={() => {
            executar((s) => excluirRegra(s, excluindo.id));
            setExcluindo(null);
          }}
        />
      ) : null}
    </div>
  );
}
