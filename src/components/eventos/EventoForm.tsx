import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import { tagSugerida, type DadosEvento, type Evento } from '../../domain/eventos';
import { parseValor, valorParaCampo } from '../../domain/money';
import type { Resultado } from '../../domain/types';
import { DateField } from '../novos';
import { Botao, CampoTexto } from '../ui';

interface Props {
  inicial?: Evento;
  onSalvar: (dados: DadosEvento) => Resultado<void>;
  onCancelar?: () => void;
}

export function EventoForm({ inicial, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [inicio, setInicio] = useState(inicial?.inicio ?? hojeISO());
  const [fim, setFim] = useState(inicial?.fim ?? hojeISO());
  const [orcamento, setOrcamento] = useState(inicial ? valorParaCampo(inicial.orcamento) : '');
  const [tag, setTag] = useState(inicial?.tag ?? '');
  // Enquanto o usuário não mexe na tag, ela acompanha o nome.
  const [tagManual, setTagManual] = useState(inicial !== undefined);
  const [erro, setErro] = useState<{ campo?: string; texto: string } | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(orcamento);
    if (centavos === null) return setErro({ campo: 'orcamento', texto: 'Informe o orçamento, como 5.000,00.' });
    const r = onSalvar({ nome, inicio, fim, orcamento: centavos, tag: tagManual ? tag : tagSugerida(nome) });
    if (!r.ok) return setErro({ campo: r.campo, texto: r.erro });
    setErro(null);
    if (!inicial) {
      setNome('');
      setOrcamento('');
      setTag('');
      setTagManual(false);
    }
  };

  const erroDe = (campo: string) => (erro?.campo === campo ? erro.texto : undefined);

  return (
    <form onSubmit={enviar} noValidate aria-label={inicial ? `Editar ${inicial.nome}` : 'Novo evento'} className="eventos-form">
      <CampoTexto label="Nome do evento" value={nome} onChange={(e) => setNome(e.target.value)} erro={erroDe('nome')} maxLength={80} placeholder="Viagem a Salvador" />
      <DateField label="Início" value={inicio} onChange={setInicio} erro={erroDe('inicio')} />
      <DateField label="Fim" value={fim} onChange={setFim} erro={erroDe('fim')} />
      <CampoTexto label="Orçamento" inputMode="decimal" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} erro={erroDe('orcamento')} placeholder="0,00" />
      <CampoTexto
        label="Tag das despesas"
        value={tagManual ? tag : tagSugerida(nome)}
        onChange={(e) => {
          setTagManual(true);
          setTag(e.target.value);
        }}
        erro={erroDe('tag')}
        dica="Despesas com esta tag contam no evento."
      />
      <div className="eventos-form__acoes">
        <Botao type="submit">{inicial ? 'Salvar' : 'Criar evento'}</Botao>
        {onCancelar ? (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        ) : null}
      </div>
    </form>
  );
}
