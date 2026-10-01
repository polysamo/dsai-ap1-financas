import { useState, type FormEvent } from 'react';
import { parseTaxaBp, simular, validarTermos, type ResumoSimulacao } from '../../domain/dividas';
import { formatarMoeda, parseValor } from '../../domain/money';
import type { SistemaAmortizacao } from '../../domain/types';
import { Botao, CampoTexto } from '../ui';
import { NOME_SISTEMA } from './rotulos';

type Erros = Partial<Record<'principal' | 'taxa' | 'parcelas', string>>;
type Resultado = Record<SistemaAmortizacao, ResumoSimulacao>;

/** Compara Price e SAC lado a lado; nada é salvo. */
export function SimuladorDividas() {
  const [principal, setPrincipal] = useState('');
  const [taxa, setTaxa] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const termos = {
      principal: parseValor(principal) ?? Number.NaN,
      taxaBp: parseTaxaBp(taxa) ?? Number.NaN,
      parcelas: parcelas.trim() === '' ? Number.NaN : Number(parcelas),
    };
    const v = validarTermos(termos);
    if (!v.ok) {
      setResultado(null);
      return setErros({ [v.campo ?? 'principal']: v.erro });
    }
    setErros({});
    setResultado(simular(termos));
  };

  return (
    <div>
      <form onSubmit={enviar} noValidate aria-label="Simulador" className="grid gap-3 sm:grid-cols-3">
        <CampoTexto label="Principal a simular" value={principal} onChange={(e) => setPrincipal(e.target.value)} erro={erros.principal} inputMode="decimal" placeholder="0,00" />
        <CampoTexto label="Taxa mensal a simular (%)" value={taxa} onChange={(e) => setTaxa(e.target.value)} erro={erros.taxa} inputMode="decimal" placeholder="1,99" />
        <CampoTexto label="Prazo a simular (parcelas)" value={parcelas} onChange={(e) => setParcelas(e.target.value)} erro={erros.parcelas} inputMode="numeric" />
        <div className="sm:col-span-3">
          <Botao type="submit">Simular</Botao>
        </div>
      </form>
      {resultado ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Resultado da simulação">
          {(['price', 'sac'] as const).map((s) => (
            <section key={s} aria-label={`Simulação ${NOME_SISTEMA[s]}`} className="rounded-md border border-slate-200 p-3">
              <h3 className="mb-2 font-semibold text-slate-900">{NOME_SISTEMA[s]}</h3>
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt className="text-slate-600">Primeira parcela</dt>
                <dd className="text-right tabular-nums" data-testid={`sim-${s}-primeira`}>{formatarMoeda(resultado[s].primeiraParcela)}</dd>
                <dt className="text-slate-600">Última parcela</dt>
                <dd className="text-right tabular-nums" data-testid={`sim-${s}-ultima`}>{formatarMoeda(resultado[s].ultimaParcela)}</dd>
                <dt className="text-slate-600">Total de juros</dt>
                <dd className="text-right tabular-nums" data-testid={`sim-${s}-juros`}>{formatarMoeda(resultado[s].totalJuros)}</dd>
                <dt className="text-slate-600">Total pago</dt>
                <dd className="text-right tabular-nums" data-testid={`sim-${s}-total`}>{formatarMoeda(resultado[s].totalPago)}</dd>
              </dl>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
