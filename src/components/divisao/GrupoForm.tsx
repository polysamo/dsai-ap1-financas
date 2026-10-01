import { useRef, useState, type FormEvent } from 'react';
import { Botao, CampoTexto } from '../ui';
import { MAX_PARTICIPANTES, MIN_PARTICIPANTES, type DadosGrupo, type GrupoDivisao } from '../../domain/divisao';
import type { Resultado } from '../../domain/types';
import './GrupoForm.css';

interface Linha {
  chave: number;
  id?: string;
  nome: string;
}

interface Props {
  inicial?: GrupoDivisao;
  onSalvar: (dados: DadosGrupo) => Resultado<unknown>;
  onCancelar?: () => void;
}

export function GrupoForm({ inicial, onSalvar, onCancelar }: Props) {
  const proxima = useRef(0);
  const novaLinha = (nome = '', id?: string): Linha => ({ chave: proxima.current++, id, nome });
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [linhas, setLinhas] = useState<Linha[]>(() => (inicial ? inicial.participantes.map((p) => novaLinha(p.nome, p.id)) : [novaLinha(), novaLinha()]));
  const [erros, setErros] = useState<Record<string, string>>({});

  const alterar = (chave: number, valor: string) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, nome: valor } : l)));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = onSalvar({ id: inicial?.id, nome, participantes: linhas.map((l) => ({ id: l.id, nome: l.nome })) });
    if (!r.ok) setErros({ [r.campo ?? 'geral']: r.erro });
  };

  return (
    <form className="divisao-grupo-form" onSubmit={enviar} noValidate aria-label={inicial ? 'Editar grupo' : 'Novo grupo'}>
      <CampoTexto label="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} placeholder="Ex.: Viagem" />
      <fieldset className="divisao-grupo-form__participantes">
        <legend>
          Participantes ({MIN_PARTICIPANTES} a {MAX_PARTICIPANTES})
        </legend>
        {linhas.map((l, i) => (
          <div key={l.chave} className="divisao-grupo-form__linha">
            <CampoTexto label={`Participante ${i + 1}`} value={l.nome} onChange={(e) => alterar(l.chave, e.target.value)} autoComplete="off" />
            <Botao variante="secundario" disabled={linhas.length <= MIN_PARTICIPANTES} aria-label={`Remover participante ${i + 1}`} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}>
              Remover
            </Botao>
          </div>
        ))}
        {erros.participantes ? (
          <p role="alert" className="divisao-grupo-form__erro">
            {erros.participantes}
          </p>
        ) : null}
        <Botao variante="secundario" disabled={linhas.length >= MAX_PARTICIPANTES} onClick={() => setLinhas((ls) => [...ls, novaLinha()])}>
          Adicionar participante
        </Botao>
      </fieldset>
      {erros.geral ? (
        <p role="alert" className="divisao-grupo-form__erro">
          {erros.geral}
        </p>
      ) : null}
      <div className="divisao-grupo-form__acoes">
        <Botao type="submit">{inicial ? 'Salvar grupo' : 'Criar grupo'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}
