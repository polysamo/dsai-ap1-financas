# Responsivo e acessibilidade em todas as rotas (2026-10-06)

## O quê e por quê

O app tem ~31 rotas construídas em momentos diferentes, com níveis distintos de cuidado com teclado, foco e telas estreitas. Esta spec varre todas as rotas em três larguras (360, 768, 1280px) e nos dois temas usando o Chrome DevTools (MCP) para achar e corrigir bugs de responsivo e acessibilidade, sem alterar comportamento ou criar telas novas. Bugs grandes demais para o prazo ficam registrados como pendentes em `BUGS.md`.

## Critérios de aceitação

1. Nenhuma rota gera erro no console do navegador ao carregar e interagir com os controles principais, nos dois temas.
2. Nenhuma rota dispara requisição de rede com falha (4xx/5xx) durante o carregamento normal.
3. Nenhuma rota tem rolagem horizontal em 360px, 768px ou 1280px de largura.
4. Todo elemento interativo (botão, link, campo) tem contorno de foco visível ao navegar por Tab, nos dois temas.
5. A ordem de tabulação em cada tela segue a ordem visual lógica (cabeçalho, filtros, conteúdo, ações), sem saltos para elementos fora de vista.
6. Modais, drawers e diálogos de confirmação prendem o foco (Tab e Shift+Tab não saem do diálogo) e devolvem o foco a quem abriu ao fechar com Esc.
7. Avisos e notificações (toasts, alertas de erro) são anunciados por `aria-live` ou `role="alert"`/`role="status"`.
8. Animações e transições respeitam `prefers-reduced-motion: reduce`, reduzindo ou removendo a duração quando ativado.
9. O documento declara `color-scheme` coerente com o tema ativo (claro ou escuro) via CSS ou meta tag.
10. O contraste de texto sobre fundo atinge AA (4.5:1 para texto normal, 3:1 para texto grande) nos dois temas, nos elementos principais de cada tela.
11. Nenhum texto é cortado ou sobreposto por outro elemento em nenhuma das três larguras testadas.
12. A rota inexistente (`/rota-que-nao-existe`) mostra a página 404 sem erro de console e com os mesmos cuidados de foco e contraste das demais rotas.
13. Cada bug encontrado e corrigido tem um teste em `src/test/` que falha antes da correção e passa depois.
14. A auditoria de performance e acessibilidade da ferramenta do navegador (Lighthouse via MCP) roda na home e no Dashboard, com as maiores pendências registradas em `BUGS.md`.

## Fora do escopo

- Corrigir bugs funcionais que não sejam de responsivo, foco, contraste ou acessibilidade.
- Suportar navegadores além de Chromium.
- Testes automatizados de contraste pixel-a-pixel; a verificação de contraste é por inspeção com a ferramenta do navegador.
- Internacionalização ou suporte a leitores de tela além dos atributos ARIA padrão.
