import { useState } from 'react';
import { avistaOuParcelado, formatarTaxa } from '../../domain/calculadoras';
import { formatarMoeda } from '../../domain/money';
import { Botao, CampoTexto } from '../ui';
import { Resultados } from './Resultados';
import { useCalculadora } from './useCalculadora';

const VEREDITO = { avista: 'À vista é mais barato', parcelado: 'Parcelado é mais barato', empate: 'As duas opções custam o mesmo' } as const;

export function CalcParcelamento() {
  const [entrada, setEntrada] = useState(false);
  const calc = useCalculadora(
    { precoAvista: '900,00', parcelas: '10', valorParcela: '100,00', rendimentoMensal: '0,8' },
    { precoAvista: 'dinheiro', parcelas: 'inteiro', valorParcela: 'dinheiro', rendimentoMensal: 'taxa' },
    (v) => avistaOuParcelado({ precoAvista: v.precoAvista, parcelas: v.parcelas, valorParcela: v.valorParcela, rendimentoMensal: v.rendimentoMensal, entrada }),
  );
  const r = calc.resultado;
  return (
    <form onSubmit={calc.enviar} noValidate aria-label="À vista ou parcelado" className="calc-form">
      <div className="calc-campos">
        <CampoTexto label="Preço à vista" inputMode="decimal" value={calc.textos.precoAvista} onChange={(e) => calc.alterar('precoAvista')(e.target.value)} erro={calc.erroDe('precoAvista')} />
        <CampoTexto label="Número de parcelas" inputMode="numeric" value={calc.textos.parcelas} onChange={(e) => calc.alterar('parcelas')(e.target.value)} erro={calc.erroDe('parcelas')} />
        <CampoTexto label="Valor da parcela" inputMode="decimal" value={calc.textos.valorParcela} onChange={(e) => calc.alterar('valorParcela')(e.target.value)} erro={calc.erroDe('valorParcela')} />
        <CampoTexto
          label="Rendimento mensal do dinheiro (%)"
          dica="Quanto o dinheiro renderia aplicado enquanto as parcelas são pagas."
          inputMode="decimal"
          value={calc.textos.rendimentoMensal}
          onChange={(e) => calc.alterar('rendimentoMensal')(e.target.value)}
          erro={calc.erroDe('rendimentoMensal')}
        />
      </div>
      <label className="calc-opcao">
        <input type="checkbox" checked={entrada} onChange={(e) => setEntrada(e.target.checked)} />
        Primeira parcela paga no ato
      </label>
      <Botao type="submit">Comparar</Botao>
      <Resultados
        titulo={r ? VEREDITO[r.melhor] : ''}
        erro={calc.erroGeral}
        itens={
          r && [
            { rotulo: 'Economia da melhor opção (valor de hoje)', valor: formatarMoeda(r.diferenca), destaque: true },
            { rotulo: 'Total parcelado', valor: formatarMoeda(r.totalParcelado) },
            { rotulo: 'Valor presente das parcelas', valor: formatarMoeda(r.valorPresente) },
            { rotulo: 'Juros embutidos ao mês', valor: r.taxaEmbutida === null ? 'Não foi possível calcular' : formatarTaxa(r.taxaEmbutida) },
          ]
        }
      />
    </form>
  );
}
