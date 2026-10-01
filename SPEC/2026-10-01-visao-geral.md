# Visão geral

## O quê e por quê

App de finanças pessoais que roda só no navegador (React + TypeScript + Tailwind), sem backend e sem login. Todos os dados ficam no localStorage do usuário. O objetivo é registrar o dinheiro que entra e sai, acompanhar um orçamento mensal, perseguir metas e enxergar para onde o saldo caminha, sem entregar dados financeiros a nenhum servidor.

Esta spec fixa as decisões que valem para todas as outras partes:

- Valores monetários são armazenados como inteiros em centavos (BRL). Nunca como float.
- Datas são armazenadas como string ISO `AAAA-MM-DD`, sem horário nem fuso.
- Toda a persistência passa por uma única camada de armazenamento, que grava o estado sob chaves com prefixo e um número de versão do esquema.
- Navegação principal: Dashboard, Transações, Contas, Orçamento, Metas, Importar CSV.
- Idioma da interface: português do Brasil. Formatação de moeda e data via `Intl` com locale `pt-BR`.

As demais specs (contas, categorias-e-transacoes, orcamento, metas, importacao-csv, dashboard-e-projecao) detalham cada módulo e dependem desta.

## Critérios de aceitação

1. O app inicia com `npm run dev` e `npm run build` sem erros de TypeScript (`strict: true`) e sem requisições de rede a domínios externos em tempo de execução.
2. Todo o estado persistido fica em localStorage sob chaves iniciadas por um prefixo único do app; nenhuma outra chave é escrita.
3. O estado persistido inclui um campo `schemaVersion`. Ao carregar um estado com versão menor, uma função de migração o atualiza; com versão maior que a conhecida, o app mostra um aviso e não sobrescreve os dados.
4. Se o JSON no localStorage estiver corrompido, o app não quebra: exibe uma mensagem, oferece exportar o conteúdo bruto e só então permite iniciar vazio.
5. Nenhum valor monetário é guardado ou calculado com número de ponto flutuante; somas de 0,10 + 0,20 em centavos resultam exatamente em 30.
6. Valores são exibidos como `R$ 1.234,56` e datas como `dd/mm/aaaa`; um valor negativo aparece com sinal e cor distintos de um positivo.
7. Existe uma ação "Exportar dados" que baixa um arquivo JSON com todo o estado, e "Importar dados" que o restaura após confirmação explícita de que o conteúdo atual será substituído.
8. Existe uma ação "Apagar todos os dados" que exige confirmação digitada e deixa o app no estado inicial de primeiro uso.
9. No primeiro uso (sem dados), cada tela mostra um estado vazio com a ação sugerida (por exemplo, "Crie sua primeira conta"), sem erros no console.
10. O layout é utilizável em 360 px de largura e em 1280 px, sem rolagem horizontal da página.
11. Todos os controles interativos são acessíveis por teclado, têm rótulo acessível e o contraste de texto atende WCAG AA.
12. Cálculos de domínio (saldo, orçamento, projeção, parsing de CSV) ficam em funções puras fora dos componentes e têm testes unitários.

## Fora do escopo

- Backend, sincronização entre dispositivos, contas de usuário e autenticação.
- Criptografia dos dados em repouso ou senha de acesso ao app.
- Múltiplas moedas e conversão cambial.
- Integração bancária (Open Finance) e leitura automática de extratos por API.
- App mobile nativo, PWA offline com service worker e notificações push.
- Múltiplos perfis ou compartilhamento de dados entre pessoas.
