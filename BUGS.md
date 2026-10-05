# Bugs encontrados e corrigidos

Cada bug tem teste em `src/test/bugs.test.tsx` que falhava antes da correção.

| ID | Tela | Passos | Esperado | Obtido | Status |
|----|------|--------|----------|--------|--------|
| BUG-001 | Todas | Gravar no `localStorage` um estado com `contas: [null]` (ou transação sem `id`, categoria como texto) e abrir o app | Aviso de dado corrompido com opção de recomeçar | O estado passava como válido e as telas quebravam ao ler campos do item nulo | Corrigido: `estruturaValida` confere que cada item é objeto com `id` |
| BUG-002 | Calculadoras (juros compostos, renda fixa) | Valor inicial de R$ 1 bilhão, 100% ao mês, 600 meses; ou 1000% ao ano por 36.500 dias | Erro "resultado grande demais" | Saldo fora do intervalo de inteiros seguros, exibido com centavos errados | Corrigido: `Number.isSafeInteger` no resultado |

## Verificado sem defeito

- Navegador automatizado (Chrome via playwright-core) em 31 rotas × 360, 768 e 1280 px: nenhum erro de console, requisição falha, estouro horizontal ou tela vazia.
- 5.000 transações: saúde financeira 5 ms, projeção 1 ms, beneficiários 43 ms, busca global 45 ms, lote 3 ms.
- Price e SAC: invariantes (soma das amortizações igual ao principal, saldo final zero, prazo respeitado) em 6 taxas × 5 prazos × 2 sistemas, com e sem amortizações extras.
- Desfazer/refazer após edição em lote seguida de edição manual.
- Saldo do Dashboard igual à soma das contas; o patrimônio separa contas negativas nos passivos (diferença esperada).

## Pendente

- Nenhum no momento.
