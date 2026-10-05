import { LineChart } from '../../charts';
import { jurosCompostos, type MesJuros } from '../../domain/calculadoras';
import { formatarMoeda } from '../../domain/money';
import { Botao, CampoTexto } from '../ui';
import { Resultados } from './Resultados';
import { useCalculadora } from './useCalculadora';

function GraficoJuros({ linhas }: { linhas: MesJuros[] }) {
  return (
    <div className="calc-grafico">
      <LineChart
        descricao={`Gráfico da evolução do saldo e do total aportado em ${linhas.length} meses`}
        rotuloTabela="Saldo e total aportado por mês"
        dados={linhas.map((l) => ({ mes: l.mes, saldo: l.saldo, aportado: l.aportado }))}
        chaveX="mes"
        rotuloX="Mês"
        formatarX={(m) => `Mês ${m}`}
        series={[
          { chave: 'saldo', nome: 'Saldo', cor: 1 },
          { chave: 'aportado', nome: 'Aportado', cor: 2 },
        ]}
        pontos={false}
        semTabela
      />
      <details className="calc-detalhes">
        <summary>Ver mês a mês</summary>
        <div className="calc-tabela-rolagem">
          <table className="tabela-dados" aria-label="Evolução mês a mês">
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col" className="tabela-dados__num">Total aportado</th>
                <th scope="col" className="tabela-dados__num">Juros do mês</th>
                <th scope="col" className="tabela-dados__num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.mes}>
                  <th scope="row">{l.mes}</th>
                  <td className="tabela-dados__num">{formatarMoeda(l.aportado)}</td>
                  <td className="tabela-dados__num">{formatarMoeda(l.juros)}</td>
                  <td className="tabela-dados__num">{formatarMoeda(l.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function CalcJuros() {
  const calc = useCalculadora(
    { inicial: '1.000,00', aporteMensal: '0,00', taxaMensal: '1', meses: '12' },
    { inicial: 'dinheiro', aporteMensal: 'dinheiro', taxaMensal: 'taxa', meses: 'inteiro' },
    (v) => jurosCompostos({ inicial: v.inicial, aporteMensal: v.aporteMensal, taxaMensal: v.taxaMensal, meses: v.meses }),
  );
  const r = calc.resultado;
  return (
    <form onSubmit={calc.enviar} noValidate aria-label="Juros compostos" className="calc-form">
      <div className="calc-campos">
        <CampoTexto label="Valor inicial" inputMode="decimal" value={calc.textos.inicial} onChange={(e) => calc.alterar('inicial')(e.target.value)} erro={calc.erroDe('inicial')} />
        <CampoTexto label="Aporte mensal" inputMode="decimal" value={calc.textos.aporteMensal} onChange={(e) => calc.alterar('aporteMensal')(e.target.value)} erro={calc.erroDe('aporteMensal')} />
        <CampoTexto label="Taxa mensal (%)" inputMode="decimal" value={calc.textos.taxaMensal} onChange={(e) => calc.alterar('taxaMensal')(e.target.value)} erro={calc.erroDe('taxaMensal')} />
        <CampoTexto label="Prazo (meses)" inputMode="numeric" value={calc.textos.meses} onChange={(e) => calc.alterar('meses')(e.target.value)} erro={calc.erroDe('meses')} />
      </div>
      <Botao type="submit">Calcular</Botao>
      <Resultados
        titulo="Resultado"
        erro={calc.erroGeral}
        itens={
          r && [
            { rotulo: 'Saldo final', valor: formatarMoeda(r.saldoFinal), destaque: true },
            { rotulo: 'Total aportado', valor: formatarMoeda(r.totalAportado) },
            { rotulo: 'Total de juros', valor: formatarMoeda(r.totalJuros) },
          ]
        }
      >
        {r ? <GraficoJuros linhas={r.linhas} /> : null}
      </Resultados>
    </form>
  );
}
