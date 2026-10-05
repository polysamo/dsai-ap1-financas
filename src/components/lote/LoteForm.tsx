import { useState, type FormEvent } from 'react';
import { ordenarContas } from '../../domain/contas';
import { hojeISO } from '../../domain/date';
import type { AlteracaoLote } from '../../domain/lote';
import { parseTags } from '../../domain/tags';
import type { AppState, Resultado } from '../../domain/types';
import { DateField } from '../novos';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import type { AcaoLote } from './BarraLote';

interface Props {
  acao: AcaoLote;
  estado: AppState;
  onAplicar: (alteracao: AlteracaoLote) => Resultado<unknown>;
  onCancelar: () => void;
}

/** Formulário de uma ação em lote; o erro de validação aparece junto ao campo. */
export function LoteForm({ acao, estado, onAplicar, onCancelar }: Props) {
  const [valor, setValor] = useState(acao === 'data' ? hojeISO() : '');
  const [erro, setErro] = useState<string | undefined>();

  const montar = (): AlteracaoLote => {
    switch (acao) {
      case 'categoria':
        return { tipo: 'categoria', categoriaId: valor };
      case 'conta':
        return { tipo: 'conta', contaId: valor };
      case 'data':
        return { tipo: 'data', data: valor };
      default:
        return { tipo: acao, tags: parseTags(valor) };
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onAplicar(montar());
    setErro(r.ok ? undefined : r.erro);
  };

  const categorias = estado.categorias.filter((c) => !c.arquivada);
  const contas = ordenarContas(estado.contas.filter((c) => !c.arquivada));

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      {acao === 'categoria' ? (
        <CampoSelect label="Nova categoria" value={valor} erro={erro} onChange={(e) => setValor(e.target.value)}>
          <option value="">Selecione…</option>
          {(['despesa', 'receita'] as const).map((tipo) => (
            <optgroup key={tipo} label={tipo === 'despesa' ? 'Despesas' : 'Receitas'}>
              {categorias
                .filter((c) => c.tipo === tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </optgroup>
          ))}
        </CampoSelect>
      ) : acao === 'conta' ? (
        <CampoSelect label="Conta de destino" value={valor} erro={erro} onChange={(e) => setValor(e.target.value)}>
          <option value="">Selecione…</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </CampoSelect>
      ) : acao === 'data' ? (
        <DateField label="Nova data" value={valor} erro={erro} onChange={setValor} />
      ) : (
        <CampoTexto label="Tags (separadas por vírgula)" value={valor} erro={erro} onChange={(e) => setValor(e.target.value)} />
      )}
      <div className="linha">
        <Botao type="submit">Aplicar</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
