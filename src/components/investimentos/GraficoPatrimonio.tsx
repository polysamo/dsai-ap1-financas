import { BarChart } from '../../charts';
import { nomeMesCurto } from '../../domain/date';
import type { PontoPatrimonio } from '../../domain/investimentos';
import { Cartao } from '../ui';

export function GraficoPatrimonio({ dados }: { dados: PontoPatrimonio[] }) {
  return (
    <Cartao titulo="Evolução do patrimônio">
      <BarChart
        descricao="Gráfico de barras da evolução mensal do patrimônio investido"
        rotuloTabela="Patrimônio por mês"
        dados={dados.map((d) => ({ mes: d.mes, patrimonio: d.valor }))}
        chaveX="mes"
        rotuloX="Mês"
        formatarX={(m) => nomeMesCurto(String(m))}
        series={[{ chave: 'patrimonio', nome: 'Patrimônio', cor: 1 }]}
      />
    </Cartao>
  );
}
