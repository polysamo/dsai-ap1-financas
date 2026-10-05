import { useId, useMemo, useState, type FormEvent } from 'react';
import { formatarData, hojeISO } from '../domain/date';
import { interpretar, paraDadosTransacao } from '../domain/lancamentoRapido';
import { formatarMoeda } from '../domain/money';
import { nomeCompleto } from '../domain/subcategorias';
import { formatarTags } from '../domain/tags';
import { criarTransacao } from '../domain/transacoes';
import { useEstado, useStore } from '../state/store';
import { useFeedback } from '../state/useFeedback';
import { Botao } from './ui';
import './LancamentoRapido.css';

export function LancamentoRapido() {
  const store = useStore();
  const estado = useEstado();
  const id = useId();
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const { sucesso, erro } = useFeedback();
  const hoje = hojeISO();
  const leitura = useMemo(() => (texto.trim() ? interpretar(texto, estado, hoje) : null), [texto, estado, hoje]);
  const nomeConta = (contaId: string) => estado.contas.find((c) => c.id === contaId)?.nome ?? '';

  const lancar = (e: FormEvent) => {
    e.preventDefault();
    if (!leitura) return;
    if (!leitura.ok) {
      setAviso(leitura.erro);
      return;
    }
    const i = leitura.valor;
    const r = store.aplicar((s) => criarTransacao(s, paraDadosTransacao(i)));
    if (!r.ok) {
      erro(r.erro);
      return;
    }
    sucesso(`Lançado: ${i.descricao || 'transação'} ${formatarMoeda(i.valor)}`, true);
    setAviso(null);
    setTexto('');
  };

  return (
    <form onSubmit={lancar} className="rapido" aria-label="Lançamento rápido">
      <label htmlFor={id} className="rapido__rotulo">
        Lançamento rápido
      </label>
      <div className="rapido__linha">
        <input
          id={id}
          className="ds-controle rapido__campo"
          value={texto}
          placeholder="almoço 32,50 ontem @nubank #trabalho"
          autoComplete="off"
          aria-describedby={`${id}-previa`}
          onChange={(e) => {
            setTexto(e.target.value);
            setAviso(null);
          }}
        />
        <Botao type="submit" disabled={!leitura?.ok}>
          Lançar
        </Botao>
      </div>
      <div id={`${id}-previa`} aria-live="polite" className="rapido__previa">
        {leitura && !leitura.ok ? <p className="rapido__erro">{leitura.erro}</p> : null}
        {leitura?.ok ? (
          <ul className="rapido__pecas" aria-label="Interpretação">
            <li>{leitura.valor.tipo === 'receita' ? 'Receita' : 'Despesa'}</li>
            <li>{formatarMoeda(leitura.valor.valor)}</li>
            <li>{formatarData(leitura.valor.data)}</li>
            <li>{nomeConta(leitura.valor.contaId)}</li>
            <li>{nomeCompleto(estado.categorias, leitura.valor.categoriaId)}</li>
            {leitura.valor.tags.length ? <li>#{formatarTags(leitura.valor.tags).replace(/, /g, ' #')}</li> : null}
            {leitura.valor.descricao ? <li>"{leitura.valor.descricao}"</li> : null}
          </ul>
        ) : null}
        {aviso ? <p role="alert" className="rapido__erro">{aviso}</p> : null}
      </div>
      <details className="rapido__ajuda">
        <summary>Como escrever</summary>
        <ul>
          <li>Valor: <code>32,50</code> ou <code>R$ 1.200</code>. Receita: <code>+3500</code> ou a palavra <code>recebi</code>.</li>
          <li>Data: <code>hoje</code>, <code>ontem</code>, <code>anteontem</code>, <code>sexta</code>, <code>05/10</code> ou <code>05/10/2026</code>. Sem data, vale hoje.</li>
          <li>Conta: <code>@nubank</code> ou o nome da conta. Categoria: <code>/lazer</code>. Tags: <code>#viagem</code>.</li>
          <li>O resto vira a descrição. Exemplo: <code>recebi 3500 salário @itaú</code>.</li>
        </ul>
      </details>
    </form>
  );
}
