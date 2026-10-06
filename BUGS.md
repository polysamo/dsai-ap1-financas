# Bugs encontrados e corrigidos

Cada bug tem teste em `src/test/bugs.test.tsx` que falhava antes da correção.

| ID | Tela | Passos | Esperado | Obtido | Status |
|----|------|--------|----------|--------|--------|
| BUG-001 | Todas | Gravar no `localStorage` um estado com `contas: [null]` (ou transação sem `id`, categoria como texto) e abrir o app | Aviso de dado corrompido com opção de recomeçar | O estado passava como válido e as telas quebravam ao ler campos do item nulo | Corrigido: `estruturaValida` confere que cada item é objeto com `id` |
| BUG-002 | Calculadoras (juros compostos, renda fixa) | Valor inicial de R$ 1 bilhão, 100% ao mês, 600 meses; ou 1000% ao ano por 36.500 dias | Erro "resultado grande demais" | Saldo fora do intervalo de inteiros seguros, exibido com centavos errados | Corrigido: `Number.isSafeInteger` no resultado |
| BUG-003 | Testes (fluxo de caixa) | Rodar a suíte repetidas vezes | Sempre verde | `fluxo.test` falhava de vez em quando: `includes('a4')` casava com ids aleatórios que continham "a4" | Corrigido: comparação exata e `startsWith` |
| BUG-004 | Configurações, Ajuda, Atalhos | Abrir qualquer rota do rodapé (`/configuracoes`, `/ajuda`, `/atalhos`) | Trilha e título do documento mostram o nome da tela | `tituloDaRota` só procurava em `itensNavegacao`; as três rotas do rodapé ficam só em `itensRodape`, então a trilha e o `<title>` mostravam "Página não encontrada" | Corrigido: `tituloDaRota` também procura em `itensRodape` (`src/navegacao.ts`) |
| BUG-005 | Todas | Carregar a build de produção | Ícone de aba próprio, sem requisição falha | Sem `<link rel="icon">` no `index.html`, o navegador pedia `/favicon.ico` e recebia 404 | Corrigido: favicon SVG inline e `theme-color` por esquema de cor em `index.html` |
| BUG-006 | Sidebar (todas as telas, menu expandido) | Rodar auditoria de acessibilidade (Lighthouse) na home | `aria-controls` do botão de grupo aponta para um id válido | `aria-controls={`grupo-${g.titulo}`}` gerava `"grupo-Visão geral"`, um id com espaço e acento, inválido como token ARIA | Corrigido: `idGrupo()` em `Sidebar.tsx` normaliza o título (sem acento, sem espaço) |
| BUG-007 | Todas | Rodar auditoria de SEO (Lighthouse) na home | `<meta name="description">` presente | Faltava a tag, SEO 82/100 | Corrigido: `<meta name="description">` em `index.html` |

## Verificado sem defeito

- Navegador automatizado (Chrome via playwright-core) em 31 rotas × 360, 768 e 1280 px: nenhum erro de console, requisição falha, estouro horizontal ou tela vazia.
- 5.000 transações: saúde financeira 5 ms, projeção 1 ms, beneficiários 43 ms, busca global 45 ms, lote 3 ms.
- Price e SAC: invariantes (soma das amortizações igual ao principal, saldo final zero, prazo respeitado) em 6 taxas × 5 prazos × 2 sistemas, com e sem amortizações extras.
- Desfazer/refazer após edição em lote seguida de edição manual.
- Saldo do Dashboard igual à soma das contas; o patrimônio separa contas negativas nos passivos (diferença esperada).

## Pendente

- Nenhum no momento.
