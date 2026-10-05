# Dívidas: amortização extra que recalcula a tabela (2026-10-04)

Substitui o critério 8 e o primeiro item de "Fora do escopo" da spec `2026-10-01-dividas-e-emprestimos.md`. Os demais critérios daquela spec continuam valendo.

## O quê e por quê

Na versão 1, uma amortização extra só abatia o saldo devedor; a tabela continuava a contratual, então o usuário não via o efeito real de antecipar dinheiro. Num financiamento de verdade o banco pergunta: reduzir o prazo ou reduzir a parcela? Esta parte implementa as duas opções, recalcula a tabela a partir da data da amortização e mostra quanto de juros foi economizado. Era uma limitação conhecida citada no README.

Modelo: `PagamentoDivida` ganha `efeito?: 'prazo' | 'parcela'`, só nas amortizações extras. Extras antigas, sem `efeito`, são tratadas como redução de prazo. A tabela efetiva é construída em ordem: antes de calcular os juros da parcela `k`, aplicam-se as extras com data anterior ao vencimento de `k`. Com "prazo", a parcela (Price) ou a amortização (SAC) continuam as mesmas e o fim da tabela é antecipado; com "parcela", o número de parcelas continua o mesmo e o valor é recalculado sobre o saldo e as parcelas restantes. Tudo em centavos inteiros, nas funções de `src/domain/dividas.ts`, que passam a ter uma única rotina de construção de tabela usada pela tabela contratual, pela efetiva e pelo simulador.

## Critérios de aceitação

1. A amortização extra pede o efeito "Reduzir o prazo" ou "Reduzir a parcela" (padrão: prazo) e o grava em `efeito`; extras sem `efeito` gravadas antes desta parte são lidas como "prazo".
2. Uma extra com data anterior ao vencimento da parcela `k` reduz o saldo antes dos juros de `k`; as parcelas anteriores a `k` ficam iguais às da tabela contratual.
3. Price com redução de prazo: as parcelas seguintes mantêm o valor da parcela contratual (exceto a última, que absorve o arredondamento) e a tabela termina antes do prazo original.
4. Price com redução de parcela: a tabela mantém o número de parcelas e as seguintes passam a ter o valor de uma Price sobre o saldo restante e as parcelas restantes.
5. SAC com redução de prazo mantém a amortização mensal e termina antes; SAC com redução de parcela mantém o número de parcelas e divide o saldo restante igualmente entre elas.
6. Em qualquer combinação de extras: a soma das amortizações da tabela mais as extras aplicadas é exatamente o principal, a última linha tem saldo zero e a tabela nunca tem mais parcelas que o contrato.
7. Uma extra que quita todo o saldo encerra a tabela antes da próxima parcela e a dívida aparece como quitada.
8. Uma extra com data posterior ao último vencimento não altera a tabela; só reduz o saldo devedor, como na versão 1.
9. O resumo mostra a economia de juros (juros da tabela contratual menos juros da tabela efetiva) e quantas parcelas a menos a tabela tem, quando houver.
10. No formulário, ao escolher "Amortização extra" e digitar um valor válido, aparece uma prévia das duas opções lado a lado: nova parcela, número de parcelas restantes e juros economizados; valor inválido ou acima do saldo não mostra prévia. A prévia não grava nada.
11. A lista de pagamentos mostra "Amortização extra (reduz o prazo)" ou "(reduz a parcela)"; excluir a extra devolve a tabela ao cálculo sem ela.
12. A lista de dívidas mostra "pagas/total" usando o total de parcelas da tabela efetiva.

## Fora do escopo

- Escolher a data efetiva da amortização diferente da data do pagamento.
- Juros pro rata entre a data da extra e o vencimento seguinte (a extra vale a partir do próximo vencimento).
- Tarifas de antecipação, IOF e CET.
- Combinar prazo e parcela numa mesma extra.
