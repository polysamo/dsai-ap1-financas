# Categorias e transações

## O quê e por quê

Transações são o dado central do app: cada receita ou despesa, com data, valor, conta e categoria. Categorias classificam as transações e alimentam orçamento, dashboard e importação. Sem categorias consistentes, os relatórios perdem valor; por isso as duas partes andam juntas.

Transação: `id`, `contaId`, `categoriaId`, `tipo` (`receita` ou `despesa`), `valor` (centavos, sempre positivo; o sinal vem do tipo), `data` (`AAAA-MM-DD`), `descricao`, `criadaEm`.

Categoria: `id`, `nome`, `tipo` (`receita` ou `despesa`), `arquivada`. O app vem com um conjunto inicial (por exemplo Moradia, Alimentação, Transporte, Saúde, Lazer, Salário, Outros) que o usuário pode editar.

## Critérios de aceitação

1. É possível criar, editar e excluir transações; a lista reflete a mudança imediatamente e após recarregar a página.
2. Valor, data, conta e categoria são obrigatórios; o valor deve ser maior que zero e a data deve ser válida (rejeita `31/02`).
3. A categoria oferecida no formulário é filtrada pelo tipo da transação: uma despesa só pode usar categorias de despesa, e vice-versa.
4. A lista de transações é ordenada por data decrescente e, em empate, pela criação mais recente.
5. A lista pode ser filtrada por período (mês atual por padrão), conta, categoria, tipo e texto na descrição; filtros combinam com E lógico e podem ser limpos com uma ação única.
6. A lista mostra o total de receitas, o total de despesas e o resultado (receitas menos despesas) do conjunto filtrado, e os três valores batem com a soma das linhas visíveis.
7. É possível criar, renomear e arquivar categorias; o nome é obrigatório, único dentro do mesmo tipo e tem no máximo 30 caracteres.
8. Uma categoria em uso não pode ser excluída. O usuário pode arquivá-la, ou excluí-la escolhendo uma categoria de destino para reatribuir as transações; nenhuma transação fica sem categoria.
9. Editar uma transação para outra conta ou categoria atualiza imediatamente o saldo das contas envolvidas e os totais por categoria.
10. Excluir uma transação pede confirmação e permite desfazer por alguns segundos antes da remoção definitiva.
11. A lista suporta ao menos 5.000 transações sem travar a interface (paginação ou virtualização; rolar e filtrar respondem em menos de 200 ms em um notebook comum).
12. Uma transação cuja categoria foi arquivada continua exibindo o nome da categoria, marcada como arquivada.

## Fora do escopo

- Transferências entre contas e divisão de uma transação entre várias categorias.
- Transações recorrentes e parceladas com geração automática.
- Subcategorias e tags.
- Anexos, fotos de recibo e notas longas.
- Edição em lote de várias transações.
- Pesquisa por faixa de valor.
