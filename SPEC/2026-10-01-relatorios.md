# Relatórios

## O quê e por quê

O dashboard responde "como estou agora?". Relatórios respondem perguntas de revisão: como foi o mês, como foi o ano, quanto gastei em cada categoria num período e o que mudou de um mês para outro. Também permitem levar os números para fora do app, em CSV para planilhas e em PDF para guardar ou enviar.

Todos os relatórios são calculados a partir das transações, sem estado novo. Pagamentos de fatura de cartão não são receita nem despesa e ficam de fora; as parcelas de compras no cartão contam na data de cada parcela. O PDF é gerado pelo recurso de impressão do navegador ("Salvar como PDF"), com estilos próprios para impressão, para não depender de biblioteca externa.

## Critérios de aceitação

1. A tela Relatórios tem quatro abas: Mensal, Anual, Por categoria e Comparativo. A aba ativa fica na URL (`?aba=`) e sobrevive a recarregar a página.
2. No relatório mensal, o usuário escolhe o mês e vê receitas, despesas, resultado e taxa de poupança (resultado dividido por receitas; "—" quando não há receitas). Os valores conferem com os do dashboard para o mesmo mês.
3. O mensal traz duas tabelas, de despesas e de receitas por categoria, em ordem decrescente de valor, com valor e percentual do total (uma casa decimal). A soma dos valores de cada tabela é exatamente o total do tipo.
4. No relatório anual, o usuário escolhe o ano e vê 12 linhas (janeiro a dezembro) com receitas, despesas e resultado, uma linha de total do ano e a média mensal calculada só sobre os meses com ao menos uma transação.
5. O anual mostra um gráfico de barras de receitas e despesas por mês, com tabela alternativa, e destaca em texto o melhor e o pior mês pelo resultado (nenhum destaque se houver menos de dois meses com movimento).
6. No relatório por categoria, o usuário define período (de e até), tipo (despesa ou receita) e, opcionalmente, conta. A lista mostra, por categoria, total, quantidade de transações e valor médio (total dividido pela quantidade, arredondado ao centavo), em ordem decrescente de total.
7. Se a data inicial for posterior à final, ou qualquer data for inválida, a aba mostra o erro junto ao campo e nenhum resultado.
8. No comparativo, o usuário escolhe dois meses. Para cada categoria de despesa aparecem os valores dos dois meses, a diferença absoluta e a variação percentual; a variação é "—" quando o mês-base é zero. A ordem é pela maior diferença absoluta.
9. O comparativo também mostra receitas, despesas e resultado dos dois meses com a diferença de cada um.
10. Nenhum relatório conta pagamentos de fatura como receita ou despesa, e todos incluem as parcelas de compras no cartão na data de cada parcela.
11. Cada relatório tem "Exportar CSV": arquivo com separador `;`, BOM UTF-8, decimais com vírgula, campos com `;`, aspas ou quebra de linha escapados entre aspas, e nome que indica o relatório e o período.
12. Cada relatório tem "Exportar PDF", que abre a impressão do navegador. Em modo de impressão, a navegação e os controles ficam ocultos e o relatório exibe título e período.
13. Períodos sem transações mostram mensagem de estado vazio, valores zerados e a exportação CSV desabilitada.
14. Os cálculos ficam em funções puras com testes, e gerar todos os relatórios de 5.000 transações leva menos de 300 ms.

## Fora do escopo

- Geração de PDF por biblioteca própria (usa-se a impressão do navegador).
- Exportação para XLSX, OFX ou outros formatos.
- Agendamento, envio por e-mail e relatórios compartilháveis por link.
- Gráficos configuráveis e relatórios personalizados salvos.
- Comparativos entre anos inteiros ou entre contas.
