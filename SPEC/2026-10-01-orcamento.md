# Orçamento

## O quê e por quê

O orçamento define quanto o usuário pretende gastar por categoria de despesa em cada mês e compara com o gasto real. Serve para avisar cedo quando uma categoria está estourando, antes de o mês acabar.

Modelo: um limite mensal (`limite`, centavos) por par `categoriaId` + mês (`AAAA-MM`). O gasto realizado é derivado das transações de despesa da categoria no mês; não é armazenado.

## Critérios de aceitação

1. Na tela Orçamento o usuário escolhe um mês e define um limite para cada categoria de despesa ativa; o valor persiste após recarregar.
2. Para cada categoria com limite, a tela mostra limite, gasto realizado, saldo restante (limite menos gasto) e percentual consumido.
3. O gasto realizado de uma categoria no mês é a soma exata das transações de despesa dessa categoria com data dentro do mês, em todas as contas; criar, editar ou excluir uma transação atualiza o valor sem recarregar.
4. A barra de progresso muda de estado em três faixas: abaixo de 80% (normal), de 80% a 100% (atenção) e acima de 100% (estourado); o estado também é indicado por texto ou ícone, não só por cor.
5. Quando o gasto passa do limite, o saldo restante aparece negativo e o excedente é exibido em valor absoluto.
6. A tela mostra totais do mês: soma dos limites, soma dos gastos das categorias com limite e gasto sem orçamento (despesas em categorias sem limite), em linhas separadas.
7. Ao abrir um mês que não tem limites definidos, o app oferece copiar os limites do mês anterior; a cópia só ocorre após confirmação e não sobrescreve limites já existentes.
8. É possível alterar ou remover o limite de uma categoria; remover não apaga transações.
9. Limite igual a zero é aceito e significa "não gastar nada"; qualquer gasto nessa categoria é exibido como estourado, sem divisão por zero no percentual.
10. Limite negativo ou não numérico é rejeitado com mensagem junto ao campo.
11. Navegar entre meses (anterior, seguinte, escolher mês) não altera nenhum dado e mantém o mês escolhido na URL ou no estado da tela ao recarregar.
12. Categorias arquivadas com limite ou gasto no mês continuam aparecendo naquele mês, marcadas como arquivadas.

## Fora do escopo

- Orçamento para receitas.
- Orçamento anual, semanal ou por período personalizado.
- Rollover de saldo não gasto para o mês seguinte.
- Notificações e alertas fora da tela (e-mail, push).
- Sugestão automática de limites a partir do histórico.
- Orçamento por conta ou por pessoa.
