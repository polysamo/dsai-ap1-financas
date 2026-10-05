import { AreaChart } from '../../charts';
import { nomeMes, nomeMesCurto } from '../../domain/date';
import { formatarMoeda } from '../../domain/money';
import type { PontoEvolucao } from '../../domain/patrimonio';

export function GraficoPatrimonio({ pontos }: { pontos: PontoEvolucao[] }) {
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  return (
    <AreaChart
      descricao={`Gráfico de área do patrimônio líquido de ${nomeMes(primeiro.mes)} a ${nomeMes(ultimo.mes)}, de ${formatarMoeda(primeiro.valor)} para ${formatarMoeda(ultimo.valor)}.`}
      rotuloTabela="Patrimônio líquido por mês"
      dados={pontos.map((p) => ({ mes: p.mes, patrimonio: p.valor }))}
      chaveX="mes"
      rotuloX="Mês"
      formatarX={(m) => nomeMesCurto(String(m))}
      series={[{ chave: 'patrimonio', nome: 'Patrimônio líquido' }]}
    />
  );
}
