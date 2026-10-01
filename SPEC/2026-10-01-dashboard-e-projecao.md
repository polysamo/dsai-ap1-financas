# Dashboard e projeção

## O quê e por quê

O dashboard é a tela inicial: responde em poucos segundos "como estou este mês?" e "para onde isso vai?". Reúne os números de contas, transações, orçamento e metas em um só lugar e projeta o saldo dos próximos meses com base no comportamento recente. A projeção é uma estimativa simples e transparente, não uma previsão.

Método da projeção: parte do saldo total atual e, para cada mês futuro, soma a média mensal de receitas e subtrai a média mensal de despesas dos últimos 3 meses completos. O resultado precisa ser reproduzível à mão a partir dos dados.

## Critérios de aceitação

1. O dashboard mostra, para o mês corrente, receitas, despesas, resultado (receitas menos despesas) e saldo total das contas; todos conferem com a soma das telas Transações e Contas para o mesmo período.
2. Um seletor de mês permite ver meses anteriores; os cartões e gráficos mudam de acordo, e o saldo total sempre reflete o saldo atual, identificado como tal.
3. Um gráfico de despesas por categoria no mês lista as categorias em ordem decrescente de valor, agrupa as demais em "Outras" a partir da sexta, e os valores somam exatamente o total de despesas do mês.
4. Um gráfico de receitas e despesas dos últimos 6 meses mostra, por mês, as duas séries lado a lado, com rótulos de eixo em português e valores acessíveis também por tabela alternativa ou tooltip.
5. Um resumo de orçamento destaca as categorias estouradas e as em atenção do mês corrente, com atalho para a tela Orçamento; sem limites definidos, mostra uma chamada para defini-los.
6. Um resumo de metas mostra as metas ativas com percentual e prazo, ordenadas como na tela Metas, com atalho para ela.
7. A projeção exibe o saldo estimado ao fim de cada um dos próximos 6 meses, calculado com o método descrito acima; a tela mostra as médias de receita e despesa usadas.
8. Com menos de 3 meses completos de transações, a projeção usa os meses disponíveis e informa quantos foram usados; sem nenhum mês completo, não exibe projeção e explica o motivo.
9. Se a projeção indicar saldo negativo em algum mês, o primeiro mês nessa situação é destacado em texto, e o aviso não depende só de cor.
10. A projeção não considera o mês corrente incompleto no cálculo das médias e deixa claro que é uma estimativa, não uma garantia.
11. Com dados de teste conhecidos (por exemplo, saldo 10.000,00, média de receitas 5.000,00 e de despesas 4.000,00), os saldos projetados são 11.000,00, 12.000,00 e assim por diante, verificado por teste unitário da função de projeção.
12. O dashboard carrega e calcula tudo em menos de 500 ms com 5.000 transações, e em estado vazio mostra chamadas para criar conta e primeira transação, sem gráficos quebrados.

## Fora do escopo

- Projeção com sazonalidade, inflação, juros ou modelos estatísticos.
- Inclusão de transações futuras recorrentes ou agendadas na projeção.
- Cenários "e se" editáveis pelo usuário.
- Exportação de gráficos como imagem ou relatório em PDF.
- Dashboard personalizável (arrastar, reordenar ou ocultar cartões).
- Comparação com outros usuários ou benchmarks.
