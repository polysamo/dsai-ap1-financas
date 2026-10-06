# Refinamento visual do site inteiro (2026-10-06)

## O quê e por quê

O app já tem um design system próprio (`src/ds`, `src/styles/tokens.css`) e oito telas redesenhadas (Dashboard, Orçamento, Beneficiários, Desafios, Eventos, Desejos, Transações, Contas). As demais ~23 telas foram construídas antes do design system e usam CSS próprio, com hierarquia tipográfica, espaçamento e cores inconsistentes entre si e em relação às telas já redesenhadas. Esta spec eleva o site inteiro a um padrão visual único, sem criar telas ou funcionalidades novas e sem mudar comportamento: harmoniza cabeçalho, filtros, cartões, tabelas, estados vazios e números em todas as telas, e refina a camada compartilhada (tokens, `src/ds`, layout, `src/charts`) para que o ganho se propague.

## Critérios de aceitação

1. Toda página usa `PageHeader` (ou o componente de cabeçalho de página equivalente do `src/ds`) para título e descrição; nenhuma página define seu próprio `<h1>` com CSS solto.
2. Nenhuma cor hexadecimal aparece fora de `src/styles/tokens.css` — verificável com `readFileSync` sobre os arquivos `.css` e `.tsx` de `src/pages`, `src/components`, `src/ds` e `src/charts`, já que o vitest roda com `css: false`.
3. Espaçamentos, raios de borda e sombras usam somente variáveis de `tokens.css` (`var(--espaco-*)`, `var(--raio-*)`, `var(--sombra-*)`), sem valores fixos em `px`/`rem` para essas três propriedades nos arquivos de página.
4. Escala tipográfica única: cada página tem exatamente um `h1`, e a hierarquia de títulos dentro da página não pula nível (não há `h3` sem `h2` antes).
5. Valores monetários e percentuais são renderizados com `font-variant-numeric: tabular-nums` (diretamente ou por classe/componente que já aplica a regra).
6. Receita, despesa e saldo usam as cores semânticas de `tokens.css` (`--cor-receita`, `--cor-despesa`, etc.) de forma consistente entre todas as telas, e nunca comunicam o sinal só pela cor — sempre acompanhadas de sinal (+/-) ou ícone.
7. Toda lista ou tabela vazia mostra `EmptyState` com uma ação, nunca um texto solto como "nenhum item".
8. Toda tabela tem uma versão em cartões para telas estreitas (reaproveitando o comportamento de `Table` do `src/ds` ou um equivalente visual nas tabelas HTML simples que ainda existirem).
9. Todo gráfico é renderizado pela camada `src/charts`; nenhuma página chama `recharts` diretamente.
10. Cada área de tela (cabeçalho de página, cada cartão de formulário) tem no máximo um botão com variante primária visível ao mesmo tempo; ações secundárias usam variantes secundária, fantasma ou link.
11. O tema escuro e o tema claro têm o mesmo nível de contraste e acabamento — nenhuma página fixa cores que só funcionem em um dos dois temas.
12. As 8 telas já redesenhadas não perdem nenhum comportamento ou texto testado; os testes existentes para elas continuam passando sem alteração de asserção sobre comportamento.
13. Todas as páginas antes não redesenhadas (as ~23 restantes) passam a usar `PageHeader`, cartões (`Card`) e, quando houver filtros, a `FilterBar`/padrão de filtros comum — sem reescrever a lógica de estado ou cálculo de cada tela.
14. Cada critério verificável por teste tem um teste correspondente em `src/test/`.

## Fora do escopo

- Criar telas, rotas, campos ou fluxos novos.
- Mudar fórmulas de cálculo, textos de negócio ou comportamento de qualquer tela.
- Reescrever a lógica de estado das telas ainda não redesenhadas; nelas, só harmonizar cabeçalho, filtros, cartões, tabelas, vazios e números.
- Adicionar dependências novas, Tailwind ou componentes externos.
- Duplicar componentes: todo componente antigo substituído pelo novo é removido.
