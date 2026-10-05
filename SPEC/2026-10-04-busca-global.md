# Busca global (2026-10-04)

## O quê e por quê

Com mais de 20 telas, achar "aquela compra de setembro" ou a tela de dívidas exige saber onde cada coisa mora. Esta parte cria uma busca única, aberta por `Ctrl+K` (ou `/`) de qualquer tela, que procura ao mesmo tempo em páginas, transações, contas, categorias, metas, dívidas, investimentos e agendamentos, e leva direto ao lugar certo. Era uma limitação conhecida citada no README.

A busca é uma função pura (`src/domain/busca.ts`) sobre o `AppState` e a lista de navegação. O texto é comparado sem acento e sem diferença de maiúsculas; a consulta é dividida em palavras e todas precisam aparecer. Um termo que é um valor em reais ("45,90") também encontra transações com esse valor exato. As buscas recentes ficam no `localStorage` com o prefixo do app.

## Critérios de aceitação

1. `Ctrl+K` (ou `Meta+K`) abre a busca de qualquer tela, inclusive com o foco num campo; `/` abre a busca só fora de campos de edição. Há também um botão "Buscar" no topo e no menu "Mais" do celular.
2. A busca é um diálogo modal com um campo de rótulo "Buscar no app", foco automático no campo, e `Esc` fecha e devolve o foco a quem abriu.
3. A comparação ignora acentos e maiúsculas; com várias palavras, todas precisam aparecer no título ou no detalhe do resultado.
4. Os resultados vêm agrupados nesta ordem: Páginas, Transações, Contas, Categorias, Metas, Dívidas, Investimentos, Agendamentos; cada grupo mostra no máximo 5 itens e diz quantos ficaram de fora.
5. Dentro de um grupo, título que começa com a consulta vem antes de palavra que começa com ela, que vem antes de ocorrência no meio; empates de transações vão da mais recente para a mais antiga.
6. Uma consulta que é um valor válido em reais encontra também as transações com exatamente esse valor, mesmo sem coincidência de texto.
7. Transações mostram descrição, data, valor e conta; buscar por uma tag ("#viagem" ou "viagem") encontra as transações com essa tag.
8. Setas para cima e para baixo movem o item ativo (com `aria-activedescendant` no campo e `aria-selected` no item); `Enter` abre o item ativo; clique também abre.
9. Abrir uma transação navega para `/transacoes` filtrando pela descrição e pela data dela; a tela de transações passa a aceitar os filtros `texto`, `de` e `ate` pela URL.
10. Abrir uma página, conta, categoria, meta, dívida, investimento ou agendamento navega para a tela correspondente.
11. Consulta vazia mostra as até 5 buscas recentes (as que levaram a abrir um resultado), sem repetição e da mais nova para a mais antiga, com um botão para limpá-las.
12. Sem resultados, aparece "Nada encontrado para "<consulta>"." e o número de resultados é anunciado numa região `aria-live`.
13. Itens arquivados (contas e categorias) aparecem com a marca "(arquivada)".

## Fora do escopo

- Busca por intervalo de datas ou operadores (`>`, `<`, `categoria:`).
- Busca aproximada por erros de digitação.
- Indexação incremental: a busca percorre o estado a cada tecla, o que basta para os volumes de um uso pessoal.
- Buscar dentro de relatórios, de importações e da ajuda.
