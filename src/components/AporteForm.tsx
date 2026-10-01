import { useState, type FormEvent } from 'react';
import { hojeISO } from '../domain/date';
import { parseValor, valorParaCampo } from '../domain/money';
import type { DadosAporte } from '../domain/metas';
import type { Aporte, Resultado } from '../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from './ui';

interface Props {
  inicial?: Aporte;
  rotulo: string;
  onSalvar: (dados: DadosAporte) => Resultado<void>;
  onCancelar: () => void;
}

type Erros = Partial<Record<'data' | 'valor' | 'geral', string>>;

export function AporteForm({ inicial, rotulo, onSalvar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<'aporte' | 'retirada'>(inicial && inicial.valor < 0 ? 'retirada' : 'aporte');
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [valor, setValor] = useState(inicial ? valorParaCampo(Math.abs(inicial.valor)) : '');
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null || centavos <= 0) return setErros({ valor: 'O valor deve ser maior que zero.' });
    const r = onSalvar({ data, valor: tipo === 'retirada' ? -centavos : centavos });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={rotulo} className="grid gap-3 sm:grid-cols-3">
      <CampoSelect label="Tipo de lançamento" value={tipo} onChange={(e) => setTipo(e.target.value as 'aporte' | 'retirada')}>
        <option value="aporte">Aporte</option>
        <option value="retirada">Retirada</option>
      </CampoSelect>
      <CampoTexto label="Data do lançamento" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      <CampoTexto label="Valor do lançamento" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      {erros.geral ? (
        <div className="sm:col-span-3">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="flex gap-2 sm:col-span-3">
        <Botao type="submit">Salvar lançamento</Botao>
        <Botao variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
