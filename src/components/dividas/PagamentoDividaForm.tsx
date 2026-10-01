import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import type { DadosPagamentoDivida, LinhaSituacao } from '../../domain/dividas';
import { formatarMoeda, parseValor, valorParaCampo } from '../../domain/money';
import type { Resultado, TipoDivida } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import { rotulosTipo } from './rotulos';

type Erros = Partial<Record<'valor' | 'data' | 'parcela' | 'geral', string>>;
const EXTRA = 'extra';

interface Props {
  tipo: TipoDivida;
  /** Parcelas ainda não quitadas. */
  abertas: LinhaSituacao[];
  onSalvar: (dados: DadosPagamentoDivida) => Resultado<void>;
}

export function PagamentoDividaForm({ tipo, abertas, onSalvar }: Props) {
  const r = rotulosTipo(tipo);
  const [alvo, setAlvo] = useState(abertas[0] ? String(abertas[0].numero) : EXTRA);
  const [valor, setValor] = useState(abertas[0] ? valorParaCampo(abertas[0].restante) : '');
  const [data, setData] = useState(hojeISO());
  const [erros, setErros] = useState<Erros>({});

  const escolher = (novo: string) => {
    setAlvo(novo);
    const linha = abertas.find((l) => String(l.numero) === novo);
    setValor(linha ? valorParaCampo(linha.restante) : '');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 350,00.' });
    const res = onSalvar({ data, valor: centavos, ...(alvo === EXTRA ? {} : { parcela: Number(alvo) }) });
    if (!res.ok) return setErros(res.campo ? { [res.campo]: res.erro } : { geral: res.erro });
    setErros({});
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={r.registrar} className="grid gap-3 sm:grid-cols-3">
      <CampoSelect label={`${r.pagamento} de`} value={alvo} onChange={(e) => escolher(e.target.value)} erro={erros.parcela}>
        {abertas.map((l) => (
          <option key={l.numero} value={l.numero}>
            {`Parcela ${l.numero} (restam ${formatarMoeda(l.restante)})`}
          </option>
        ))}
        <option value={EXTRA}>Amortização extra</option>
      </CampoSelect>
      <CampoTexto label={`Valor do ${r.pagamento.toLowerCase()}`} value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valor} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label={`Data do ${r.pagamento.toLowerCase()}`} type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      {erros.geral ? (
        <div className="sm:col-span-3">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="sm:col-span-3">
        <Botao type="submit">{r.registrar}</Botao>
      </div>
    </form>
  );
}
