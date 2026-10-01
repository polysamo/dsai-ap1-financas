import { useState, type FormEvent } from 'react';
import { valorParaCampo, parseValor } from '../domain/money';
import { META_NOME_MAX, type DadosMeta } from '../domain/metas';
import type { Meta, Resultado } from '../domain/types';
import { Alerta, Botao, CampoTexto } from './ui';

interface Props {
  inicial?: Meta;
  onSalvar: (dados: DadosMeta) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'nome' | 'valorAlvo' | 'prazo' | 'geral', string>>;

export function MetaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [alvo, setAlvo] = useState(inicial ? valorParaCampo(inicial.valorAlvo) : '');
  const [prazo, setPrazo] = useState(inicial?.prazo ?? '');
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const valorAlvo = parseValor(alvo);
    if (valorAlvo === null) return setErros({ valorAlvo: 'Informe um valor válido, como 5.000,00.' });
    const r = onSalvar({ nome, valorAlvo, prazo: prazo || undefined });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? 'Editar meta' : 'Nova meta'} className="grid gap-3 sm:grid-cols-3">
      <CampoTexto label="Nome da meta" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={META_NOME_MAX + 20} autoComplete="off" />
      <CampoTexto label="Valor alvo" value={alvo} onChange={(e) => setAlvo(e.target.value)} erro={erros.valorAlvo} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Prazo (opcional)" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} erro={erros.prazo} />
      {erros.geral ? (
        <div className="sm:col-span-3">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-3">
        <Botao type="submit">{inicial ? 'Salvar meta' : 'Criar meta'}</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
