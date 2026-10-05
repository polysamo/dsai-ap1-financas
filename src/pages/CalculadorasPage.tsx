import { useState, type KeyboardEvent } from 'react';
import { CalcEquivalencia } from '../components/calculadoras/CalcEquivalencia';
import { CalcJuros } from '../components/calculadoras/CalcJuros';
import { CalcMeta } from '../components/calculadoras/CalcMeta';
import { CalcParcelamento } from '../components/calculadoras/CalcParcelamento';
import { CalcRendaFixa } from '../components/calculadoras/CalcRendaFixa';
import { Cartao, TituloPagina } from '../components/ui';
import '../styles/tabela-dados.css';
import '../components/calculadoras/calculadoras.css';

const ABAS = [
  { id: 'juros', rotulo: 'Juros compostos', Componente: CalcJuros },
  { id: 'meta', rotulo: 'Aporte para meta', Componente: CalcMeta },
  { id: 'taxas', rotulo: 'Equivalência de taxas', Componente: CalcEquivalencia },
  { id: 'renda-fixa', rotulo: 'Renda fixa', Componente: CalcRendaFixa },
  { id: 'parcelamento', rotulo: 'À vista ou parcelado', Componente: CalcParcelamento },
] as const;

type IdAba = (typeof ABAS)[number]['id'];

export function CalculadorasPage() {
  const [ativa, setAtiva] = useState<IdAba>('juros');
  const indice = ABAS.findIndex((a) => a.id === ativa);
  const { Componente } = ABAS[indice];

  // Setas trocam de aba, como no padrão de abas do WAI-ARIA.
  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = ABAS[(indice + passo + ABAS.length) % ABAS.length];
    setAtiva(proxima.id);
    document.getElementById(`aba-calc-${proxima.id}`)?.focus();
  };

  return (
    <div>
      <TituloPagina>Calculadoras</TituloPagina>
      <p className="calc-aviso">Simulações que não alteram seus dados. As taxas são as que você informar.</p>
      <div role="tablist" aria-label="Calculadoras" className="calc-abas" onKeyDown={aoTeclar}>
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-calc-${a.id}`}
            role="tab"
            type="button"
            aria-selected={a.id === ativa}
            aria-controls={`painel-calc-${a.id}`}
            tabIndex={a.id === ativa ? 0 : -1}
            className={`calc-aba${a.id === ativa ? ' calc-aba--ativa' : ''}`}
            onClick={() => setAtiva(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`painel-calc-${ativa}`} aria-labelledby={`aba-calc-${ativa}`}>
        <Cartao>
          <Componente key={ativa} />
        </Cartao>
      </div>
    </div>
  );
}
