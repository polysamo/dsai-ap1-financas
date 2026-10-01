# Dashboard e projeção (v2: projeção com recorrências)

> **Substitui:** [SPEC/2026-10-01-dashboard-e-projecao.md](2026-10-01-dashboard-e-projecao.md).
> A spec antiga permanece como registro. Esta versão muda o método da projeção: além da média dos 3 últimos meses completos, a projeção passa a somar **recorrências** mensais cadastradas pelo usuário. Na spec antiga, recorrências estavam fora do escopo.

## O quê e por quê

O dashboard é a tela inicial: responde em poucos segundos "como estou este mês?" e "para onde isso vai?". Reúne os números de contas, transações, orçamento e metas e projeta o saldo dos próximos meses.

A média dos últimos meses sozinha erra quando há valores fixos importantes, como salário e aluguel, que entram em meses irregulares ou foram cadastrados há pouco tempo. Por isso o usuário cadastra **recorrências**: valores mensais fixos (receita ou despesa, com categoria) usados só na projeção. Uma recorrência não gera transações e não altera saldos.

Método da projeção, reproduzível à mão:

1. Meses-base: os até 3 últimos meses completos anteriores ao mês corrente, desde o mês da primeira transação.
2. Categorias cobertas: categorias com ao menos uma recorrência ativa do mesmo tipo. Suas transações **não entram** nas médias, para não contar o mesmo valor duas vezes.
3. Média de receitas e média de despesas: soma das transações não cobertas nos meses-base, dividida pelo número de meses-base (arredondada ao centavo).
4. Efeito mensal = média de receitas − média de despesas + receitas recorrentes − despesas recorrentes.
5. Saldo projetado ao fim do mês k (k = 1 a 6, a partir do mês seguinte ao corrente) = saldo total atual + k × efeito mensal.

## Critérios de aceitação

1. O dashboard mostra, para o mês selecionado (corrente por padrão), receitas, despesas, resultado (receitas menos despesas) e saldo total das contas; os valores conferem com a soma das telas Transações e Contas para o mesmo período.
2. Um seletor de mês permite ver meses anteriores; cartões e gráficos mudam de acordo, e o saldo total sempre reflete o saldo atual, identificado como tal.
3. Um gráfico de despesas por categoria mostra as 5 maiores em ordem decrescente e agrupa o restante em "Outras"; os valores somam exatamente o total de despesas do mês.
4. Um gráfico de receitas e despesas dos 6 meses terminando no mês selecionado mostra as duas séries por mês, com rótulos em português e uma tabela alternativa com os mesmos valores para leitores de tela.
5. Um resumo de orçamento destaca categorias estouradas e em atenção no mês selecionado, com atalho para Orçamento; sem limites, mostra chamada para defini-los.
6. Um resumo de metas mostra as metas ativas (nunca as arquivadas) com percentual e prazo, na ordem da tela Metas, com atalho para ela.
7. Um painel de recorrências permite criar, editar, ativar/desativar e excluir recorrências com descrição, tipo, valor maior que zero e categoria do mesmo tipo; elas persistem após recarregar.
8. A projeção exibe o saldo estimado ao fim de cada um dos próximos 6 meses pelo método acima, junto com as médias usadas, o total mensal de recorrências e a lista das categorias cobertas.
9. Com menos de 3 meses completos de histórico, a projeção usa os meses disponíveis e informa quantos; sem nenhum mês completo e sem recorrências ativas, não exibe projeção e explica o motivo; só com recorrências, projeta apenas com elas.
10. Se algum mês projetado ficar com saldo negativo, o primeiro mês nessa situação é destacado em texto, sem depender só de cor. A projeção é identificada como estimativa.
11. Dados de teste conhecidos geram saldos exatos, verificados por teste unitário: saldo 10.000,00, média de receitas 5.000,00 e de despesas 4.000,00, sem recorrências, dá 11.000,00, 12.000,00 e assim por diante; com uma recorrência de despesa de 500,00 cuja categoria não tem histórico, dá 10.500,00, 11.000,00 e assim por diante; com recorrência na categoria que tem histórico, o histórico dela sai das médias.
12. O dashboard calcula tudo em menos de 500 ms com 5.000 transações e, em estado vazio, mostra chamadas para criar conta e primeira transação, sem gráficos quebrados.

## Fora do escopo

- Recorrências que gerem transações automaticamente, com dia de vencimento, parcelas ou fim programado.
- Projeção por dia ou por semana; a granularidade é mensal.
- Sazonalidade, inflação, juros ou modelos estatísticos.
- Cenários "e se" editáveis além de ativar e desativar recorrências.
- Exportação de gráficos como imagem ou PDF.
- Dashboard personalizável (arrastar, reordenar, ocultar cartões).
