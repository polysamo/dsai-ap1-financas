# Desfazer e refazer (2026-10-04)

## O quê e por quê

Hoje uma exclusão errada só se corrige refazendo o cadastro à mão (a única exceção é a transação, que tem "desfazer" próprio). Esta parte dá ao app inteiro um histórico de alterações em memória: qualquer operação que passe por `Store.aplicar` pode ser desfeita e refeita, com um texto que diz o que foi desfeito ("Desfeito: transação excluída").

O histórico é uma pilha de estados anteriores (`passado`) e uma de estados desfeitos (`futuro`), guardadas só em memória, com no máximo 50 entradas. A descrição de cada entrada é calculada comparando o estado antes e depois da operação, coleção por coleção, pelo `id` dos itens (`src/domain/historico.ts`, funções puras). Desfazer e refazer gravam no `localStorage` como qualquer outra alteração.

## Critérios de aceitação

1. Depois de uma operação bem-sucedida via `Store.aplicar`, `desfazer()` volta ao estado anterior, grava no `localStorage` e coloca a entrada em `futuro`; `refazer()` reaplica o estado desfeito.
2. Uma nova operação depois de um desfazer limpa a pilha `futuro`.
3. Operações que falham (resultado `ok: false`) ou que devolvem o mesmo objeto de estado não entram no histórico.
4. O histórico guarda no máximo 50 entradas; a 51ª descarta a mais antiga.
5. `substituir` (importar JSON, dados de exemplo), `iniciarVazio` e `apagarTudo` limpam as duas pilhas.
6. Se a gravação no `localStorage` falhar ao desfazer ou refazer, o estado em memória e as pilhas não mudam e o erro é devolvido.
7. `descreverMudanca(antes, depois)` diz o tipo de item e a ação com concordância: "transação criada", "conta excluída", "3 transações excluídas", "meta editada"; mudanças em mais de uma coleção viram "N alterações"; sem diferença, "alteração".
8. Itens com o mesmo `id` mas conteúdo diferente contam como editados; listas sem `id` (como orçamentos) e objetos (como `conciliacoes`) contam como uma alteração da coleção.
9. O topo da página (desktop) mostra os botões "Desfazer" e "Refazer", desabilitados quando a pilha correspondente está vazia, com `title` contendo a descrição da próxima ação.
10. `Ctrl+Z` desfaz e `Ctrl+Shift+Z` ou `Ctrl+Y` refazem, inclusive com `Meta` no lugar de `Ctrl`; os atalhos são ignorados dentro de campos de edição, para não roubar o desfazer do texto.
11. Depois de desfazer ou refazer aparece um aviso com `role="status"` ("Desfeito: conta excluída" / "Refeito: conta excluída") que some sozinho em 5 segundos.
12. A página de Ajuda lista os novos atalhos junto com os existentes.

## Fora do escopo

- Persistir o histórico entre recarregamentos ou abas.
- Desfazer seletivo (escolher uma entrada do meio da pilha) e lista visual do histórico.
- Agrupar várias operações numa entrada só (cada `aplicar` é uma entrada).
- Desfazer mudanças de preferências que não passam pelo `Store` (tema, ocultar valores).
