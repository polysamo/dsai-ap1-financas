import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import { parseValor } from '../../domain/money';
import type { DadosMarcacao, DadosMovimento } from '../../domain/investimentos';
import type { Resultado } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import './investimentos.css';

type Props =
  | { modo: 'movimento'; onSalvar: (d: DadosMovimento) => Resultado<void>; onCancelar: () => void }
  | { modo: 'marcacao'; onSalvar: (d: DadosMarcacao) => Resultado<void>; onCancelar: () => void };

type Erros = Partial<Record<'tipo' | 'valor' | 'data' | 'geral', string>>;

/** Formulário de aporte/resgate ou de marcação de valor atual de um ativo. */
export function LancamentoForm(props: Props) {
  const marcacao = props.modo === 'marcacao';
  const [tipo, setTipo] = useState<'aporte' | 'resgate'>('aporte');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeISO());
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 1.500,00.' });
    const r = props.modo === 'marcacao' ? props.onSalvar({ data, valor: centavos }) : props.onSalvar({ tipo, data, valor: centavos });
    if (!r.ok) setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={marcacao ? 'Marcar valor atual' : 'Registrar movimento'} className="invest-form invest-form-3">
      {marcacao ? null : (
        <CampoSelect label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'aporte' | 'resgate')} erro={erros.tipo}>
          <option value="aporte">Aporte</option>
          <option value="resgate">Resgate</option>
        </CampoSelect>
      )}
      <CampoTexto label={marcacao ? 'Valor de mercado' : 'Valor'} value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      {erros.geral ? <div className="invest-form-linha"><Alerta>{erros.geral}</Alerta></div> : null}
      <div className="invest-form-linha invest-form-botoes">
        <Botao type="submit">{marcacao ? 'Salvar marcação' : 'Salvar movimento'}</Botao>
        <Botao variante="secundario" onClick={props.onCancelar}>Cancelar</Botao>
      </div>
    </form>
  );
}
