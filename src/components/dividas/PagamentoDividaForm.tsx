import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import type { DadosPagamentoDivida, LinhaSituacao, PreviaAmortizacao } from '../../domain/dividas';
import { formatarMoeda, parseValor, valorParaCampo } from '../../domain/money';
import type { Centavos, DataISO, EfeitoAmortizacao, Resultado, TipoDivida } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import { rotulosTipo } from './rotulos';
import '../../styles/tabela-dados.css';
import './dividas.css';

type Erros = Partial<Record<'valor' | 'data' | 'parcela' | 'efeito' | 'geral', string>>;
const EXTRA = 'extra';

interface Props {
  tipo: TipoDivida;
  /** Parcelas ainda não quitadas. */
  abertas: LinhaSituacao[];
  onSalvar: (dados: DadosPagamentoDivida) => Resultado<void>;
  /** Efeito de uma amortização extra nas duas opções; null quando o valor não cabe. */
  previa: (valor: Centavos, data: DataISO) => Record<EfeitoAmortizacao, PreviaAmortizacao> | null;
}

const ROTULO_EFEITO: Record<EfeitoAmortizacao, string> = { prazo: 'Reduzir o prazo', parcela: 'Reduzir a parcela' };

function PreviaExtra({ previa }: { previa: Record<EfeitoAmortizacao, PreviaAmortizacao> }) {
  return (
    <table className="tabela-dados dividas-previa" aria-label="Prévia da amortização">
      <thead>
        <tr>
          <th scope="col">Opção</th>
          <th scope="col" className="tabela-dados__num">Próxima parcela</th>
          <th scope="col" className="tabela-dados__num">Parcelas restantes</th>
          <th scope="col" className="tabela-dados__num">Juros economizados</th>
        </tr>
      </thead>
      <tbody>
        {(['prazo', 'parcela'] as const).map((e) => (
          <tr key={e}>
            <th scope="row">{ROTULO_EFEITO[e]}</th>
            <td className="tabela-dados__num">{formatarMoeda(previa[e].novaParcela)}</td>
            <td className="tabela-dados__num">{previa[e].parcelasRestantes}</td>
            <td className="tabela-dados__num">{formatarMoeda(previa[e].economiaJuros)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PagamentoDividaForm({ tipo, abertas, onSalvar, previa }: Props) {
  const r = rotulosTipo(tipo);
  const [alvo, setAlvo] = useState(abertas[0] ? String(abertas[0].numero) : EXTRA);
  const [valor, setValor] = useState(abertas[0] ? valorParaCampo(abertas[0].restante) : '');
  const [data, setData] = useState(hojeISO());
  const [efeito, setEfeito] = useState<EfeitoAmortizacao>('prazo');
  const [erros, setErros] = useState<Erros>({});
  const centavosDigitados = parseValor(valor);
  const previaExtra = alvo === EXTRA && centavosDigitados !== null ? previa(centavosDigitados, data) : null;

  const escolher = (novo: string) => {
    setAlvo(novo);
    const linha = abertas.find((l) => String(l.numero) === novo);
    setValor(linha ? valorParaCampo(linha.restante) : '');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const centavos = parseValor(valor);
    if (centavos === null) return setErros({ valor: 'Informe um valor válido, como 350,00.' });
    const res = onSalvar({ data, valor: centavos, ...(alvo === EXTRA ? { efeito } : { parcela: Number(alvo) }) });
    if (!res.ok) return setErros(res.campo ? { [res.campo]: res.erro } : { geral: res.erro });
    setErros({});
  };

  return (
    <form onSubmit={enviar} noValidate aria-label={r.registrar} className="dividas-form dividas-form-3">
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
      {alvo === EXTRA ? (
        <fieldset className="dividas-form-linha dividas-efeito">
          <legend className="ui-campo__rotulo">Efeito da amortização</legend>
          {(['prazo', 'parcela'] as const).map((e) => (
            <label key={e} className="dividas-efeito__opcao">
              <input type="radio" name="efeito" value={e} checked={efeito === e} onChange={() => setEfeito(e)} />
              {ROTULO_EFEITO[e]}
            </label>
          ))}
          {previaExtra ? <PreviaExtra previa={previaExtra} /> : null}
        </fieldset>
      ) : null}
      {erros.geral ? (
        <div className="dividas-form-linha">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="dividas-form-linha">
        <Botao type="submit">{r.registrar}</Botao>
      </div>
    </form>
  );
}
