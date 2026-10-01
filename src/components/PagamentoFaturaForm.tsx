import { useState, type FormEvent } from 'react';
import { hojeISO } from '../domain/date';
import { parseValor, valorParaCampo } from '../domain/money';
import type { DadosPagamento } from '../domain/cartoes';
import type { Conta, Mes, Resultado } from '../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from './ui';
import './PagamentoFaturaForm.css';

interface Props {
  contaCartaoId: string;
  mesFatura: Mes;
  restante: number;
  contasOrigem: Conta[];
  onSalvar: (dados: DadosPagamento) => Resultado<void>;
}

type Erros = Partial<Record<'valor' | 'data' | 'contaOrigemId' | 'geral', string>>;

export function PagamentoFaturaForm({ contaCartaoId, mesFatura, restante, contasOrigem, onSalvar }: Props) {
  const [valor, setValor] = useState(restante > 0 ? valorParaCampo(restante) : '');
  const [data, setData] = useState(hojeISO());
  const [origem, setOrigem] = useState(contasOrigem[0]?.id ?? '');
  const [erros, setErros] = useState<Erros>({});

  if (contasOrigem.length === 0) {
    return <Alerta tipo="aviso">Para pagar a fatura é preciso ter uma conta ativa que não seja cartão.</Alerta>;
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 350,00.' });
    const r = onSalvar({ contaCartaoId, mesFatura, valor: centavos, data, contaOrigemId: origem });
    if (!r.ok) return setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
    setErros({});
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Pagar fatura" className="pagamento-fatura">
      <CampoTexto label="Valor do pagamento" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Data do pagamento" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      <CampoSelect label="Pagar com a conta" value={origem} onChange={(e) => setOrigem(e.target.value)} erro={erros.contaOrigemId}>
        {contasOrigem.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelect>
      {erros.geral ? (
        <div className="pagamento-fatura__linha">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="pagamento-fatura__linha">
        <Botao type="submit">Registrar pagamento</Botao>
      </div>
    </form>
  );
}
