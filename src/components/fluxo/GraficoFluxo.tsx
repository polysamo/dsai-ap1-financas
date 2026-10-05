import { LineChart } from '../../charts';
import { formatarData } from '../../domain/date';
import type { DiaFluxo } from '../../domain/fluxoCaixa';

export function GraficoFluxo({ dias }: { dias: DiaFluxo[] }) {
  return (
    <LineChart
      descricao={`Gráfico de linha do saldo projetado dia a dia nos próximos ${dias.length} dias`}
      rotuloTabela="Saldo projetado por dia (alternativa ao gráfico)"
      dados={dias.map((d) => ({ data: d.data, saldo: d.saldo }))}
      chaveX="data"
      rotuloX="Data"
      formatarX={(d) => formatarData(String(d))}
      series={[{ chave: 'saldo', nome: 'Saldo' }]}
      referencia={{ valor: 0, rotulo: 'Zero' }}
      pontos={false}
    />
  );
}
