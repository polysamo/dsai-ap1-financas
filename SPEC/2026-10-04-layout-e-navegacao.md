# Layout e navegação (2026-10-04)

## O quê e por quê

O app já tem mais de trinta telas, e a barra lateral é uma lista longa. Esta parte reorganiza o casco da aplicação: sidebar recolhível com grupos que abrem e fecham, cabeçalho com trilha de navegação, busca global e atalhos, navegação inferior no celular, uma página de atalhos, carregamento e erro por rota, e uma página 404 de verdade. Usa a biblioteca `src/ds` e substitui a antiga barra do topo, que só tinha o botão de ocultar valores. Complementa a spec `2026-10-01-visao-geral.md` e a `2026-10-04-busca-global.md` (o botão de busca passa a morar no cabeçalho).

## Critérios de aceitação

1. A sidebar (a partir de 768 px) tem os grupos Visão geral, Movimentação, Planejamento e Automação; cada grupo é um botão com `aria-expanded` que abre e fecha a lista de telas, todos abertos no primeiro acesso, e o grupo da tela atual nunca fica fechado.
2. Um botão "Recolher menu" (e "Expandir menu") reduz a sidebar a uma coluna estreita em que cada item mostra uma sigla de duas letras com o nome completo em `aria-label` e `title`; o estado recolhido e os grupos fechados são lembrados em `localStorage` e valem após recarregar.
3. O item da tela atual tem `aria-current="page"`; a sidebar é um `nav` com nome acessível e os rodapés (Ajuda, Atalhos, Configurações) ficam separados.
4. O cabeçalho mostra a trilha "Início › Grupo › Tela" (componente `Breadcrumb`), com o nome da tela atual como última migalha e sem trilha no Dashboard.
5. O cabeçalho reúne: busca global (`Ctrl+K`), Desfazer e Refazer, ocultar valores e um link "Atalhos" para `/atalhos`; no celular, o cabeçalho mostra só o nome da tela, busca e desfazer.
6. A navegação inferior do celular (até 767 px) tem Dashboard, Transações, "+" (nova transação), Orçamento e "Mais"; "Mais" abre a gaveta com todos os grupos e rodapés.
7. A página `/atalhos` lista todos os atalhos de teclado agrupados por Navegação, Edição e Busca, com as teclas em `kbd`, e é alcançável por `?`-ajuda e pelo menu.
8. Cada rota fica dentro de um limite de erro: uma exceção ao desenhar a tela mostra o `ErrorState` "Esta tela falhou" com o botão "Tentar de novo" e o restante do casco (menu, cabeçalho) continua funcionando; trocar de rota limpa o erro.
9. A tela de Design system é carregada sob demanda e, enquanto carrega, mostra um esqueleto de página com `aria-busy`, anunciado como "Carregando tela".
10. Rotas desconhecidas mostram a página 404 ("Página não encontrada") com o caminho digitado, botão para o Dashboard e botão "Buscar" que abre a busca global; `/dados` continua redirecionando para `/configuracoes`.
11. Há um link "Pular para o conteúdo" como primeiro item focável, que leva o foco ao `main`; o título do documento muda para "<Tela> · Finanças Pessoais" a cada rota.
12. Os testes cobrem recolher/expandir e persistência, grupos, migalhas, atalhos, limite de erro, 404, carregamento sob demanda, link de pular e título do documento.

## Fora do escopo

- Menu configurável pelo usuário (reordenar ou esconder telas).
- Favoritos e telas recentes.
- Animações de transição entre rotas.
- Divisão do código de todas as telas (só o catálogo de design carrega sob demanda).
