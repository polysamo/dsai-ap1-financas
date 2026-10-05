import { useState } from 'react';
import { formatarTaxa, rendaFixa, type IndexadorRendaFixa } from '../../domain/calculadoras';
import { formatarMoeda } from '../../domain/money';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import { Resultados } from './Resultados';
import { useCalculadora } from './useCalculadora';

const casas = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function CalcRendaFixa() {
  const [indexador, setIndexador] = useState<IndexadorRendaFixa>('cdi');
  const [isento, setIsento] = useState(false);
  const calc = useCalculadora(
    { valor: '10.000,00', dias: '365', taxaAnual: '12', percentualCdi: '100', cdiAnual: '10,65' },
    { valor: 'dinheiro', dias: 'inteiro', taxaAnual: 'taxa', percentualCdi: 'taxa', cdiAnual: 'taxa' },
    (v) => rendaFixa({ valor: v.valor, dias: v.dias, indexador, taxaAnual: v.taxaAnual, percentualCdi: v.percentualCdi, cdiAnual: v.cdiAnual, isento }),
  );
  const r = calc.resultado;
  return (
    <form onSubmit={calc.enviar} noValidate aria-label="Renda fixa" className="calc-form">
      <div className="calc-campos">
        <CampoTexto label="Valor aplicado" inputMode="decimal" value={calc.textos.valor} onChange={(e) => calc.alterar('valor')(e.target.value)} erro={calc.erroDe('valor')} />
        <CampoTexto label="Prazo (dias corridos)" inputMode="numeric" value={calc.textos.dias} onChange={(e) => calc.alterar('dias')(e.target.value)} erro={calc.erroDe('dias')} />
        <CampoSelect label="Rentabilidade" value={indexador} onChange={(e) => setIndexador(e.target.value as IndexadorRendaFixa)}>
          <option value="cdi">Percentual do CDI</option>
          <option value="pre">Pré-fixada</option>
        </CampoSelect>
        {indexador === 'pre' ? (
          <CampoTexto label="Taxa anual (%)" inputMode="decimal" value={calc.textos.taxaAnual} onChange={(e) => calc.alterar('taxaAnual')(e.target.value)} erro={calc.erroDe('taxaAnual')} />
        ) : (
          <>
            <CampoTexto label="Percentual do CDI (%)" inputMode="decimal" value={calc.textos.percentualCdi} onChange={(e) => calc.alterar('percentualCdi')(e.target.value)} erro={calc.erroDe('percentualCdi')} />
            <CampoTexto label="CDI anual (%)" inputMode="decimal" value={calc.textos.cdiAnual} onChange={(e) => calc.alterar('cdiAnual')(e.target.value)} erro={calc.erroDe('cdiAnual')} />
          </>
        )}
      </div>
      <label className="calc-opcao">
        <input type="checkbox" checked={isento} onChange={(e) => setIsento(e.target.checked)} />
        Isento de IR (LCI, LCA)
      </label>
      <Botao type="submit">Calcular</Botao>
      <Resultados
        titulo="Rendimento"
        erro={calc.erroGeral}
        itens={
          r && [
            { rotulo: 'Valor final líquido', valor: formatarMoeda(r.valorFinal), destaque: true },
            { rotulo: 'Rendimento bruto', valor: formatarMoeda(r.bruto) },
            { rotulo: `IOF (${casas(r.aliquotaIof)}% do rendimento)`, valor: formatarMoeda(r.iof) },
            { rotulo: `IR (${casas(r.aliquotaIr)}%)`, valor: formatarMoeda(r.ir) },
            { rotulo: 'Rendimento líquido', valor: formatarMoeda(r.liquido) },
            { rotulo: 'Taxa bruta ao ano', valor: formatarTaxa(r.taxaAnualBruta) },
            { rotulo: 'Taxa líquida ao ano', valor: formatarTaxa(r.taxaAnualLiquida) },
          ]
        }
      />
    </form>
  );
}
