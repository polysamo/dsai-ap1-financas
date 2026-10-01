# Configurações

## O quê e por quê

O app tinha uma página "Dados" solta no cabeçalho e nenhum lugar para preferências de uso. Esta parte cria a página **Configurações** (`/configuracoes`) com três seções: **Aparência** (tema claro, escuro ou do sistema), **Privacidade** (ocultar valores monetários, útil ao usar o app em público) e **Dados** (exportar, importar, exemplo e apagar tudo, que passam a viver aqui). A rota antiga `/dados` redireciona para `/configuracoes`.

As preferências ficam numa chave própria do localStorage, `financas:preferencias`, fora do `AppState` (não entram na exportação nem mudam a versão do esquema), e são aplicadas à tag `<html>` já na inicialização, antes da primeira renderização, para evitar flash de tema errado. O tema escuro redefine as variáveis de cor do Tailwind v4 (`--color-slate-*`, `--color-white` etc.) sob a classe `dark`, de modo que nenhum componente precisa ser editado. A moeda continua fixa em BRL (decisão da spec [visão geral](2026-10-01-visao-geral.md)) e aparece apenas como informação.

## Critérios de aceitação

1. `/configuracoes` mostra o título "Configurações" e as seções "Aparência", "Privacidade" e "Dados", cada uma com título de nível 2.
2. O cabeçalho tem o item "Configurações" (link para `/configuracoes`) no lugar do antigo link "Dados"; abrir `/dados` leva a `/configuracoes`.
3. A seção Aparência tem um grupo de rádio (`radiogroup`) "Tema" com as opções "Claro", "Escuro" e "Sistema"; o padrão é "Sistema".
4. Escolher "Escuro" adiciona a classe `dark` ao `<html>`; "Claro" a remove; "Sistema" aplica `dark` somente se `prefers-color-scheme: dark` casar e reage a mudanças desse sinal enquanto o app está aberto.
5. O tema escuro é definido em `src/index.css` sob `html.dark`, redefinindo as variáveis de cor do Tailwind (fundo, texto, bordas, verde, vermelho e âmbar) com pares de contraste legível, sem editar componentes.
6. A seção Privacidade tem a chave "Ocultar valores" (`switch`, com `aria-checked`); ligada, o `<html>` recebe a classe `ocultar-valores`, que desfoca o componente `Valor` e os elementos `.tabular-nums`; desligada, a classe é removida.
7. O cabeçalho tem um botão rápido "Ocultar valores"/"Mostrar valores" (com `aria-pressed`) que alterna a mesma preferência, mantida sincronizada com a chave da página.
8. As preferências são gravadas em `financas:preferencias` (JSON `{ tema, ocultarValores }`) a cada mudança; nenhuma delas é gravada em `financas:estado`.
9. A leitura tolera JSON inválido, valores de tipo errado e tema desconhecido, caindo para os padrões campo a campo, sem lançar erro; uma falha ao gravar no navegador mostra um alerta e não quebra a página.
10. Na inicialização (`src/main.tsx`) as preferências salvas são aplicadas ao `<html>` antes da renderização do React.
11. A seção Dados reúne exportar, importar (com confirmação), carregar exemplo e apagar tudo (confirmação digitando APAGAR), com o mesmo comportamento da antiga página Dados, reutilizando a mesma lógica.
12. "Apagar tudo" também restaura as preferências padrão: remove `financas:preferencias`, tira as classes `dark` e `ocultar-valores` do `<html>` e volta os controles ao padrão.
13. A seção Aparência (ou Privacidade) informa "Moeda: real brasileiro (BRL)" como texto fixo, sem controle de escolha.
14. O botão do cabeçalho e os controles têm nomes acessíveis, são operáveis por teclado e o estado não depende só de cor.

## Fora do escopo

- Outras moedas, formatos de data e idiomas.
- Sincronização das preferências entre abas ou dispositivos.
- Incluir preferências na exportação/importação de dados.
- Temas personalizados além de claro, escuro e sistema, e cor de destaque configurável.
- Bloqueio do app por senha ou PIN.
