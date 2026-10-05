import { aporteParaMeta, jurosCompostos } from '../../domain/calculadoras';
import { ok } from '../../domain/types';
import { formatarMoeda } from '../../domain/money';
import { Botao, CampoTexto } from '../ui';
import { Resultados } from './Resultados';
import { useCalculadora } from './useCalculadora';

export function CalcMeta() {
  const calc = useCalculadora(
    { objetivo: '50.000,00', inicial: '0,00', taxaMensal: '0,8', meses: '36' },
    { objetivo: 'dinheiro', inicial: 'dinheiro', taxaMensal: 'taxa', meses: 'inteiro' },
    (v) => {
      const dados = { objetivo: v.objetivo, inicial: v.inicial, taxaMensal: v.taxaMensal, meses: v.meses };
      const aporte = aporteParaMeta(dados);
      if (!aporte.ok) return aporte;
      // Confere o aporte na própria calculadora de juros compostos.
      const conferencia = jurosCompostos({ inicial: v.inicial, aporteMensal: aporte.valor, taxaMensal: v.taxaMensal, meses: v.meses });
      if (!conferencia.ok) return conferencia;
      return ok({ aporte: aporte.valor, saldoFinal: conferencia.valor.saldoFinal, juros: conferencia.valor.totalJuros, meses: v.meses });
    },
  );
  const r = calc.resultado;
  return (
    <form onSubmit={calc.enviar} noValidate aria-label="Aporte para meta" className="calc-form">
      <div className="calc-campos">
        <CampoTexto label="Valor desejado" inputMode="decimal" value={calc.textos.objetivo} onChange={(e) => calc.alterar('objetivo')(e.target.value)} erro={calc.erroDe('objetivo')} />
        <CampoTexto label="Já tenho" inputMode="decimal" value={calc.textos.inicial} onChange={(e) => calc.alterar('inicial')(e.target.value)} erro={calc.erroDe('inicial')} />
        <CampoTexto label="Rendimento mensal (%)" inputMode="decimal" value={calc.textos.taxaMensal} onChange={(e) => calc.alterar('taxaMensal')(e.target.value)} erro={calc.erroDe('taxaMensal')} />
        <CampoTexto label="Em quantos meses" inputMode="numeric" value={calc.textos.meses} onChange={(e) => calc.alterar('meses')(e.target.value)} erro={calc.erroDe('meses')} />
      </div>
      <Botao type="submit">Calcular</Botao>
      <Resultados
        titulo="Resultado"
        erro={calc.erroGeral}
        itens={
          r && [
            { rotulo: 'Aporte mensal necessário', valor: r.aporte === 0 ? 'Nenhum: o valor inicial já basta' : formatarMoeda(r.aporte), destaque: true },
            { rotulo: `Saldo em ${r.meses} meses`, valor: formatarMoeda(r.saldoFinal) },
            { rotulo: 'Juros ganhos', valor: formatarMoeda(r.juros) },
          ]
        }
      />
    </form>
  );
}
