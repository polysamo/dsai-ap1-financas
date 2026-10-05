# Redesenho das telas: kit de página (2026-10-04)

## O quê e por quê

As telas são fiéis às specs de cada parte, mas cada uma monta o próprio cabeçalho, mostra o resultado das ações como um alerta fixo que fica na tela e não oferece como desfazer um erro. Antes de redesenhar uma a uma, esta parte cria o kit comum que todas passam a usar: `PageHeader` (título, descrição e ações), `FilterBar` (barra de filtros consistente), o hook `useFeedback` (resultado de cada ação como notificação, com "Desfazer" quando a ação altera dados) e o atalho `n` para criar. Cada tela redesenhada tem a própria spec (`2026-10-04-redesenho-<tela>.md`) e usa este kit.

`TituloPagina` continua existindo com a mesma API e agora é o `PageHeader`; telas ainda não redesenhadas ganham o novo visual sem mudar de código.

## Critérios de aceitação

1. `PageHeader` mostra o título como `h1`, uma descrição opcional em um parágrafo ligado ao título por `aria-describedby`, e as ações à direita; em telas estreitas as ações descem para baixo do título e ocupam a largura toda.
2. `TituloPagina` aceita a nova propriedade `descricao` e as antigas (`children`, `acoes`) sem alteração de comportamento.
3. `FilterBar` é um `form` com `role="search"`, rótulo acessível "Filtros", campos em grade que quebra linha, botão "Limpar filtros" (só aparece quando há filtro ativo) e um resumo `aria-live` opcional ("12 de 140 transações").
4. `useFeedback().executar(operacao, mensagem)` aplica a operação pelo `Store`, mostra a mensagem como notificação de sucesso quando dá certo e como notificação de erro (`role="alert"`, sem sumir sozinha) quando falha, e devolve o resultado.
5. Quando a operação altera dados e `desfazivel` é verdadeiro (padrão), a notificação de sucesso traz o botão "Desfazer", que chama `Store.desfazer` e mostra "Desfeito: <descrição>".
6. `Toast` aceita uma ação (`{ rotulo, aoClicar }`): o botão aparece dentro da notificação, ao clicar executa a ação e fecha a notificação.
7. O atalho `n` (fora de campos de edição e sem modificadoras) chama a função de criar da tela atual; telas sem criação ignoram a tecla; a página de atalhos e a ajuda listam "n: criar um novo item".
8. O atalho `n` não dispara com modais abertos nem dentro de campos de edição.
9. Nenhuma tela perde funcionalidade: todos os testes anteriores continuam passando, exceto os que liam o alerta fixo de sucesso, que passam a ler a notificação.
10. Os testes cobrem `PageHeader`, `FilterBar`, `useFeedback` (sucesso, erro, desfazer), `Toast` com ação e o atalho `n`.

## Fora do escopo

- Histórico visual de notificações.
- Agrupar várias notificações iguais numa só.
- Atalhos de teclado específicos de cada tela além do `n` (ficam em cada spec de tela).
