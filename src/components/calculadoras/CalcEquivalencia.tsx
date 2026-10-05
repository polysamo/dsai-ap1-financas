import { useState } from 'react';
import { equivalencia, formatarTaxa, type PeriodoTaxa } from '../../domain/calculadoras';
import { Botao, CampoSelect, CampoTexto } from '../ui';
import { Resultados } from './Resultados';
import { useCalculadora } from './useCalculadora';

export function CalcEquivalencia() {
  const [periodo, setPeriodo] = useState<PeriodoTaxa>('mensal');
  const calc = useCalculadora({ taxa: '1', inflacaoAnual: '4,5' }, { taxa: 'taxa', inflacaoAnual: 'taxa' }, (v) =>
    equivalencia({ taxa: v.taxa, periodo, inflacaoAnual: v.inflacaoAnual }),
  );
  const r = calc.resultado;
  return (
    <form onSubmit={calc.enviar} noValidate aria-label="Equivalência de taxas" className="calc-form">
      <div className="calc-campos">
        <CampoTexto label="Taxa (%)" inputMode="decimal" value={calc.textos.taxa} onChange={(e) => calc.alterar('taxa')(e.target.value)} erro={calc.erroDe('taxa')} />
        <CampoSelect label="Período da taxa" value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoTaxa)}>
          <option value="mensal">Ao mês</option>
          <option value="anual">Ao ano</option>
        </CampoSelect>
        <CampoTexto label="Inflação anual (%)" inputMode="decimal" value={calc.textos.inflacaoAnual} onChange={(e) => calc.alterar('inflacaoAnual')(e.target.value)} erro={calc.erroDe('inflacaoAnual')} />
      </div>
      <Botao type="submit">Converter</Botao>
      <Resultados
        titulo="Taxas equivalentes"
        erro={calc.erroGeral}
        itens={
          r && [
            { rotulo: 'Ao mês', valor: formatarTaxa(r.mensal), destaque: periodo === 'anual' },
            { rotulo: 'Ao ano', valor: formatarTaxa(r.anual), destaque: periodo === 'mensal' },
            { rotulo: 'Real ao ano (descontada a inflação)', valor: formatarTaxa(r.realAnual) },
          ]
        }
      />
    </form>
  );
}
