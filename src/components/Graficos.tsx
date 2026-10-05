import { useState } from 'react';
import { BarChart, HorizontalBarChart, PieChart } from '../charts';
import { nomeMesCurto } from '../domain/date';
import type { FatiaCategoria, PontoMensal } from '../domain/projecao';
import { RadioGroup } from '../ds/Radio';

type TipoGrafico = 'barras' | 'rosca';

export function GraficoDespesasPorCategoria({ dados }: { dados: FatiaCategoria[] }) {
  const [tipo, setTipo] = useState<TipoGrafico>('barras');
  return (
    <div className="grafico-categorias">
      <RadioGroup
        legenda="Tipo de gráfico"
        horizontal
        value={tipo}
        onChange={(v) => setTipo(v as TipoGrafico)}
        opcoes={[
          { valor: 'barras', rotulo: 'Barras' },
          { valor: 'rosca', rotulo: 'Rosca' },
        ]}
      />
      {tipo === 'barras' ? (
        <HorizontalBarChart
          descricao="Gráfico de barras das despesas por categoria no mês"
          rotuloTabela="Despesas por categoria"
          dados={dados.map((d) => ({ categoria: d.nome, valor: d.valor }))}
          chaveX="categoria"
          rotuloX="Categoria"
          series={[{ chave: 'valor', nome: 'Despesas', cor: 2 }]}
          comTotal
        />
      ) : (
        <PieChart descricao="Gráfico de rosca das despesas por categoria no mês" rotuloTabela="Despesas por categoria" fatias={dados.map((d) => ({ nome: d.nome, valor: d.valor }))} rotuloX="Categoria" rosca />
      )}
    </div>
  );
}

export function GraficoReceitasDespesas({ dados }: { dados: PontoMensal[] }) {
  return (
    <BarChart
      descricao="Gráfico de barras de receitas e despesas dos últimos 6 meses"
      rotuloTabela="Receitas e despesas por mês"
      dados={dados.map((d) => ({ mes: d.mes, receitas: d.receitas, despesas: d.despesas }))}
      chaveX="mes"
      rotuloX="Mês"
      formatarX={(m) => nomeMesCurto(String(m))}
      series={[
        { chave: 'receitas', nome: 'Receitas', cor: 1 },
        { chave: 'despesas', nome: 'Despesas', cor: 2 },
      ]}
    />
  );
}
