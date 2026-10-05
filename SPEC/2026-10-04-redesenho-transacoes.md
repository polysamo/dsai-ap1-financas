# Redesenho: Transações (2026-10-04)

## O quê e por quê

É a tela mais usada e a mais carregada: filtros escondidos num `details`, abas feitas à mão, dois alertas fixos (erro e mensagem de lote) e um "desfazer" que só existe no topo. Esta parte a refaz com o kit de página: filtros sempre visíveis na barra comum com resumo anunciado, abas pela biblioteca, resultado das ações por notificação com "Desfazer" e atalho `n` para criar. A lista, a seleção e a edição em lote, o lançamento rápido, as parcelas e as regras de negócio das specs de categorias e transações, lote, lançamento rápido e cartões não mudam.

## Critérios de aceitação

1. O cabeçalho mostra a descrição "Receitas e despesas de todas as contas, com busca, filtros, categorias e edição em lote." e o botão "Nova transação" (só na aba Transações).
2. Os filtros ficam sempre visíveis numa `FilterBar` (`role="search"`, nome "Filtros"), sem `details`; o resumo `aria-live` diz "N de M transações".
3. "Limpar filtros" só aparece quando algum filtro difere do padrão (mês atual) e volta aos filtros padrão.
4. As abas "Transações" e "Categorias" usam o componente `Tabs` (setas, Home e End) e abrir `?aba=categorias` seleciona a segunda.
5. Criar mostra "Transação registrada." e editar "Transação atualizada.", ambas com "Desfazer" que restaura o estado anterior.
6. Excluir (com a confirmação existente) mostra "Transação excluída." com "Desfazer"; excluir uma parcela mostra "Parcela excluída." (uma) ou "Compra parcelada excluída." (todas), também com "Desfazer".
7. O resultado de uma operação em lote (ex.: "2 transações alteradas. 1 pulada (...).") aparece como notificação com "Desfazer" que desfaz o lote inteiro; erros viram notificação `role="alert"` persistente, e os dois alertas fixos do topo deixam de existir.
8. O lançamento rápido mostra "Lançado: <descrição> <valor>" como notificação com "Desfazer"; erro de interpretação continua na prévia, junto ao campo.
9. A tecla `n` abre "Nova transação" na aba Transações; na aba Categorias, em campos e com diálogo aberto, não faz nada.
10. Sem transações, o estado vazio traz o botão "Adicione sua primeira transação"; com filtros sem resultado, o estado vazio sugere limpar os filtros e traz o botão "Limpar filtros".
11. Os totais de receitas, despesas e resultado do filtro continuam iguais, e a lista continua em linhas que quebram em telas estreitas.
12. Os testes cobrem descrição, barra de filtros e resumo, limpar, abas, cada notificação com desfazer, lote, lançamento rápido, atalho `n` e estados vazios.

## Fora do escopo

- Trocar a lista por tabela com ordenação por coluna.
- Exportar a lista filtrada (está em Relatórios).
- Salvar filtros favoritos.
