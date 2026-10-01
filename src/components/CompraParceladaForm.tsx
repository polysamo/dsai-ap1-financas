import { useState, type FormEvent } from 'react';
import { PARCELAS_MAX, PARCELAS_MIN, dividirParcelas, type DadosCompraParcelada } from '../domain/cartoes';
import { hojeISO } from '../domain/date';
import { formatarMoeda, parseValor } from '../domain/money';
import type { Categoria, Resultado } from '../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from './ui';

interface Props {
  contaId: string;
  categorias: Categoria[];
  onSalvar: (dados: DadosCompraParcelada) => Resultado<void>;
}

type Erros = Partial<Record<'descricao' | 'valorTotal' | 'parcelas' | 'data' | 'categoriaId' | 'geral', string>>;

export function CompraParceladaForm({ contaId, categorias, onSalvar }: Props) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [data, setData] = useState(hojeISO());
  const [categoriaId, setCategoriaId] = useState('');
  const [erros, setErros] = useState<Erros>({});

  const total = parseValor(valor);
  const n = Number(parcelas);
  const previa = total !== null && total > 0 && Number.isInteger(n) && n >= PARCELAS_MIN && n <= PARCELAS_MAX && total >= n ? dividirParcelas(total, n) : null;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (total === null) return setErros({ valorTotal: 'Informe um valor válido, como 1.200,00.' });
    const r = onSalvar({ contaId, descricao, valorTotal: total, parcelas: n, data, categoriaId });
    if (!r.ok) return setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
    setErros({});
    setDescricao('');
    setValor('');
    setParcelas('');
    setCategoriaId('');
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Compra parcelada" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <CampoTexto label="Descrição da compra" value={descricao} onChange={(e) => setDescricao(e.target.value)} erro={erros.descricao} autoComplete="off" />
      <CampoTexto label="Valor total" value={valor} onChange={(e) => setValor(e.target.value)} erro={erros.valorTotal} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Número de parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} erro={erros.parcelas} inputMode="numeric" placeholder={`${PARCELAS_MIN} a ${PARCELAS_MAX}`} />
      <CampoTexto label="Data da primeira parcela" type="date" value={data} onChange={(e) => setData(e.target.value)} erro={erros.data} />
      <CampoSelect label="Categoria da compra" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} erro={erros.categoriaId}>
        <option value="">Selecione…</option>
        {categorias
          .filter((c) => c.tipo === 'despesa' && !c.arquivada)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
      </CampoSelect>
      <p className="self-end pb-2 text-sm text-slate-700" aria-live="polite" data-testid="previa-parcelas">
        {previa ? `${n} parcelas: 1ª de ${formatarMoeda(previa[0])}, demais de ${formatarMoeda(previa[1] ?? previa[0])}` : 'Informe valor e parcelas para ver a divisão.'}
      </p>
      {erros.geral ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <Botao type="submit">Lançar compra parcelada</Botao>
      </div>
    </form>
  );
}
