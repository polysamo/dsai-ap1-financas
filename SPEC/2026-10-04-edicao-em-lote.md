# Edição em lote de transações (2026-10-04)

## O quê e por quê

Corrigir a categoria de 30 lançamentos importados de um extrato hoje exige abrir 30 formulários. Esta parte permite selecionar várias transações na lista e alterar de uma vez a categoria, a conta, a data ou as tags, ou excluir todas, com um resumo do que foi selecionado. Era uma limitação conhecida citada no README.

As regras ficam em `src/domain/lote.ts`, em funções puras sobre o `AppState`. Uma operação em lote é uma única chamada a `Store.aplicar`, então o "Desfazer" global (spec `2026-10-04-desfazer-e-refazer`) desfaz o lote inteiro de uma vez. Transações que não podem receber a alteração são puladas e informadas, sem impedir as demais.

## Critérios de aceitação

1. Cada linha da lista de transações tem uma caixa de seleção com rótulo acessível "Selecionar <descrição>"; uma caixa "Selecionar todas" marca ou desmarca todas as transações do filtro atual, inclusive as que ainda não apareceram por paginação.
2. Com ao menos uma transação selecionada aparece uma barra com a quantidade ("3 selecionadas"), a soma das receitas, das despesas e o resultado da seleção.
3. Ao mudar os filtros, transações que saíram do filtro deixam de estar selecionadas.
4. "Alterar categoria" aplica a categoria escolhida às selecionadas do mesmo tipo (receita ou despesa) da categoria; as de outro tipo são puladas e a mensagem final diz quantas foram alteradas e quantas puladas, com o motivo.
5. Categorias arquivadas não são oferecidas e são recusadas pelo domínio.
6. "Mover para conta" troca a conta das selecionadas para uma conta ativa; parcelas de compra no cartão são puladas, porque pertencem à fatura do cartão de origem.
7. "Alterar data" exige data válida (AAAA-MM-DD) e também pula parcelas de cartão.
8. "Adicionar tags" junta as tags informadas às existentes sem duplicar, normalizando como no cadastro; uma transação que passaria do limite de tags é pulada. "Remover tags" retira as tags informadas e apaga o campo quando a lista fica vazia.
9. "Excluir selecionadas" pede confirmação informando a quantidade e remove todas numa única operação.
10. Cada operação em lote é uma única entrada do histórico: um "Desfazer" devolve todas as transações afetadas ao estado anterior.
11. Se nenhuma das selecionadas puder ser alterada, nada é gravado e aparece a mensagem de erro com o motivo.
12. Depois de uma operação concluída, a seleção é limpa e a mensagem de resultado aparece com `role="status"`.

## Fora do escopo

- Alterar valor ou descrição em lote.
- Seleção por intervalo com Shift+clique.
- Edição em lote em outras listas (agenda, investimentos, transferências).
- Converter despesas em receitas (trocar o tipo).
