import { useState, type FormEvent } from 'react';
import { hojeISO } from '../../domain/date';
import { parseTaxaBp, type DadosDivida } from '../../domain/dividas';
import { parseValor } from '../../domain/money';
import type { Resultado, SistemaAmortizacao, TipoDivida } from '../../domain/types';
import { Alerta, Botao, CampoSelect, CampoTexto } from '../ui';
import { ROTULO_SISTEMA } from './rotulos';

type Erros = Partial<Record<'nome' | 'tipo' | 'principal' | 'taxa' | 'parcelas' | 'primeiraParcela' | 'sistema' | 'geral', string>>;

export function DividaForm({ onSalvar }: { onSalvar: (dados: DadosDivida) => Resultado<void> }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoDivida>('devo');
  const [principal, setPrincipal] = useState('');
  const [taxa, setTaxa] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [primeira, setPrimeira] = useState(hojeISO());
  const [sistema, setSistema] = useState<SistemaAmortizacao>('price');
  const [erros, setErros] = useState<Erros>({});

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const valor = parseValor(principal);
    const taxaBp = parseTaxaBp(taxa);
    // Valores ilegíveis viram NaN para que a validação do domínio aponte o campo certo.
    const r = onSalvar({
      nome,
      tipo,
      principal: valor ?? Number.NaN,
      taxaBp: taxaBp ?? Number.NaN,
      parcelas: parcelas.trim() === '' ? Number.NaN : Number(parcelas),
      primeiraParcela: primeira,
      sistema,
    });
    if (!r.ok) return setErros(r.campo ? { [r.campo]: r.erro } : { geral: r.erro });
    setErros({});
    setNome('');
    setPrincipal('');
    setTaxa('');
    setParcelas('');
  };

  return (
    <form onSubmit={enviar} noValidate aria-label="Nova dívida" className="grid gap-3 sm:grid-cols-2">
      <CampoTexto label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={80} />
      <CampoSelect label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDivida)} erro={erros.tipo}>
        <option value="devo">Eu devo</option>
        <option value="emprestei">Eu emprestei</option>
      </CampoSelect>
      <CampoTexto label="Valor principal" value={principal} onChange={(e) => setPrincipal(e.target.value)} erro={erros.principal} inputMode="decimal" placeholder="0,00" />
      <CampoTexto label="Taxa de juros mensal (%)" value={taxa} onChange={(e) => setTaxa(e.target.value)} erro={erros.taxa} inputMode="decimal" placeholder="1,99" />
      <CampoTexto label="Número de parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} erro={erros.parcelas} inputMode="numeric" />
      <CampoTexto label="Data da primeira parcela" type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} erro={erros.primeiraParcela} />
      <CampoSelect label="Sistema de amortização" value={sistema} onChange={(e) => setSistema(e.target.value as SistemaAmortizacao)} erro={erros.sistema}>
        {(Object.keys(ROTULO_SISTEMA) as SistemaAmortizacao[]).map((s) => (
          <option key={s} value={s}>
            {ROTULO_SISTEMA[s]}
          </option>
        ))}
      </CampoSelect>
      {erros.geral ? (
        <div className="sm:col-span-2">
          <Alerta>{erros.geral}</Alerta>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Botao type="submit">Cadastrar dívida</Botao>
      </div>
    </form>
  );
}
