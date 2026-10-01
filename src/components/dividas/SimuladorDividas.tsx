import { useState, type FormEvent } from 'react';
import { parseTaxaBp, simular, validarTermos, type ResumoSimulacao } from '../../domain/dividas';
import { formatarMoeda, parseValor } from '../../domain/money';
import type { SistemaAmortizacao } from '../../domain/types';
import { Botao, CampoTexto } from '../ui';
import { NOME_SISTEMA } from './rotulos';
import './dividas.css';

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
      <form onSubmit={enviar} noValidate aria-label="Simulador" className="dividas-form dividas-form-3">
        <CampoTexto label="Principal a simular" value={principal} onChange={(e) => setPrincipal(e.target.value)} erro={erros.principal} inputMode="decimal" placeholder="0,00" />
        <CampoTexto label="Taxa mensal a simular (%)" value={taxa} onChange={(e) => setTaxa(e.target.value)} erro={erros.taxa} inputMode="decimal" placeholder="1,99" />
        <CampoTexto label="Prazo a simular (parcelas)" value={parcelas} onChange={(e) => setParcelas(e.target.value)} erro={erros.parcelas} inputMode="numeric" />
        <div className="dividas-form-linha">
          <Botao type="submit">Simular</Botao>
        </div>
      </form>
      {resultado ? (
        <div className="dividas-simulacao" aria-label="Resultado da simulação">
          {(['price', 'sac'] as const).map((s) => (
            <section key={s} aria-label={`Simulação ${NOME_SISTEMA[s]}`} className="dividas-simulacao-cartao">
              <h3 className="dividas-simulacao-titulo">{NOME_SISTEMA[s]}</h3>
              <dl className="dividas-simulacao-dados">
                <dt className="dividas-rotulo">Primeira parcela</dt>
                <dd className="dividas-num dividas-direita" data-testid={`sim-${s}-primeira`}>{formatarMoeda(resultado[s].primeiraParcela)}</dd>
                <dt className="dividas-rotulo">Última parcela</dt>
                <dd className="dividas-num dividas-direita" data-testid={`sim-${s}-ultima`}>{formatarMoeda(resultado[s].ultimaParcela)}</dd>
                <dt className="dividas-rotulo">Total de juros</dt>
                <dd className="dividas-num dividas-direita" data-testid={`sim-${s}-juros`}>{formatarMoeda(resultado[s].totalJuros)}</dd>
                <dt className="dividas-rotulo">Total pago</dt>
                <dd className="dividas-num dividas-direita" data-testid={`sim-${s}-total`}>{formatarMoeda(resultado[s].totalPago)}</dd>
              </dl>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
