# Design system próprio (2026-10-04)

## O quê e por quê

As telas foram criadas uma a uma e cada uma reinventou pedaços de interface: dois Drawers quase iguais, três variações de barra de progresso e tabelas diferentes em cada tela. Esta parte cria a biblioteca de componentes própria em `src/ds/` (um arquivo `.tsx` e um `.css` por componente, mais `index.ts`), a fundação de tokens em `src/styles/tokens.css` e a página interna `/design` com o catálogo vivo. Os componentes que já existiam (Botao, CampoTexto, CampoSelect, Alerta, EstadoVazio, ProgressBar, Drawer, ConfirmDialog) passam a ser implementados pela biblioteca e continuam exportados pelos nomes antigos; o código duplicado é removido.

Convenções: nomes de componentes em inglês (`Button`, `Modal`), textos e variantes em pt-BR; todo componente aceita `className`; nenhum usa cor fixa, só tokens; estados de foco, desabilitado, erro e carregamento são visuais e anunciados por aria.

## Critérios de aceitação

1. Os tokens cobrem: escalas de cor (neutra, primária, e as semânticas sucesso, aviso, perigo e info, de 50 a 900), tipografia (famílias, tamanhos, pesos, alturas de linha), espaçamento de 1 a 12, raios, sombras (sm, md, lg), durações e curvas de movimento e camadas de z-index; o tema claro e o escuro redefinem as mesmas variáveis semânticas.
2. Componentes de ação: `Button` (variantes primário, secundário, perigo, fantasma e link; tamanhos pequeno e médio; estados desabilitado e carregando, com `aria-busy` e sem disparar clique) e `IconButton` (exige `aria-label`).
3. Componentes de campo: `Input`, `Textarea`, `Select`, `CurrencyInput` (entrada e saída em centavos), `SearchInput` (limpar com o botão ou Esc), `Checkbox`, `Radio` (grupo com setas), `Switch` (`role="switch"`) e `Slider`; todos têm rótulo ligado por `htmlFor`, erro com `role="alert"` e `aria-invalid`, e dica ligada por `aria-describedby`.
4. `Combobox` filtra opções ao digitar, navega com setas, escolhe com Enter, fecha com Esc e usa `role="combobox"`, `aria-expanded`, `aria-activedescendant` e `role="listbox"`.
5. `DatePicker` e `DateRangePicker` entram e saem em `AAAA-MM-DD`, aceitam digitação `dd/mm/aaaa` com máscara e mostram erro para datas inexistentes; o intervalo recusa fim antes do início.
6. Sobreposições: `Modal` (foco preso, Esc fecha, foco volta a quem abriu, `aria-modal`), `Drawer` (mesmo comportamento, vindo da lateral ou de baixo no celular), `ConfirmDialog`, `Popover`, `Tooltip` (aparece no foco e no hover, `role="tooltip"`) e `Dropdown` (menu com `role="menu"`, setas, Enter, Esc e Home/End).
7. Navegação e organização: `Tabs` (setas, Home/End, `aria-selected`, painéis ligados), `Accordion` (botões com `aria-expanded`, um ou vários abertos), `Breadcrumb` (`aria-label`, último item com `aria-current="page"`), `Pagination` (anterior, próxima, páginas, `aria-current`) e `Stepper` (etapas com situação em texto).
8. Exibição: `Badge`, `Chip` (removível), `Avatar` (iniciais quando não há imagem), `Card`, `DataList` (pares rótulo e valor semânticos), `ProgressBar` (com situação em texto), `ProgressRing`, `Skeleton`, `Spinner` (`role="status"`), `EmptyState` (com ilustração SVG), `ErrorState` (com ação de tentar de novo), `Alert`, `Banner` (dispensável) e `Toast` (provedor com fila, `aria-live`, some sozinho e pode ser fechado).
9. `Table` tem colunas tipadas, ordenação por coluna (`aria-sort`, alternando crescente e decrescente), seleção de linhas com "selecionar todas", paginação opcional, legenda acessível, estado vazio e, em telas estreitas, as linhas viram cartões com o rótulo da coluna.
10. Todo componente tem teste de renderização, de teclado e de aria; os testes ficam em `src/test/ds-*.test.tsx`.
11. A rota `/design` mostra o catálogo com todos os componentes e variantes, com alternância entre tema claro e escuro.
12. `Botao`, `CampoTexto`, `CampoSelect`, `Alerta`, `EstadoVazio`, `ProgressBar`, `Drawer` e `ConfirmDialog` continuam exportados com a mesma API e agora vêm da biblioteca; os dois Drawers e as barras de progresso duplicadas deixam de existir, e os testes antigos continuam passando.
13. Nenhum componente da biblioteca usa cor, espaçamento ou raio fora dos tokens.

## Fora do escopo

- Publicar a biblioteca como pacote.
- Temas além do claro e do escuro.
- Internacionalização para outros idiomas.
- Editor de texto rico, upload de arquivos e tabelas virtualizadas.
