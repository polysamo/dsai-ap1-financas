# Conciliação de contas

## O quê e por quê

O saldo calculado pelo app só vale se bater com o do banco. A conciliação confere uma conta com o extrato: o usuário informa a data e o saldo do extrato, marca quais transações já aparecem nele e vê a diferença que sobra. Quando a diferença é zero a conciliação é fechada e as transações conciliadas ficam protegidas contra edição e exclusão até que a conciliação seja reaberta.

Modelo: o estado ganha a chave `conciliacoes: { fechadas, rascunhos }`. `fechadas` guarda cada conciliação (conta, data e saldo do extrato, ids das transações conciliadas, ajuste); `rascunhos` guarda, por conta, a conciliação em andamento (data, saldo, marcadas). Os tipos vivem em `src/domain/conciliacao.ts`. A tela fica em `/conciliacao` ("Conciliação"). Contas de cartão não são conciliadas aqui (têm fatura, veja [cartoes-e-faturas](2026-10-01-cartoes-e-faturas.md)).

Definições: o **saldo conciliado** é o saldo inicial, mais os pagamentos de fatura já feitos a partir da conta até a data do extrato, mais o efeito das transações conciliadas (de conciliações fechadas e as marcadas no rascunho). O **saldo calculado** é o saldo atual da conta. A **diferença** é saldo do extrato menos saldo conciliado. **Pendentes** são as transações da conta com data até a do extrato que ainda não foram conciliadas nem marcadas.

Esta parte estende [contas](2026-10-01-contas.md) e [categorias-e-transacoes](2026-10-01-categorias-e-transacoes.md).

## Critérios de aceitação

10. A tela Conciliação lista as contas ativas que não são cartão e, sem nenhuma, mostra estado vazio com link para Contas. Para a conta escolhida pede data (válida) e saldo do extrato (número válido, pode ser negativo); valores inválidos são recusados junto ao campo. Lista as transações elegíveis (da conta, até a data do extrato, ainda não conciliadas) com caixa de marcação e mostra saldo conciliado, saldo calculado, diferença e quantidade de transações pendentes, todos recalculados a cada marcação. O rascunho persiste ao recarregar.
11. Fechar a conciliação só é permitido com diferença zero. Com diferença diferente de zero a tela oferece "Fechar com ajuste", que, após confirmação, cria uma transação de ajuste (receita se o extrato é maior, despesa se menor) no valor da diferença, na data do extrato, categoria "Outros", já conciliada; o saldo calculado passa a bater com o extrato. A data não pode ser anterior à da última conciliação da conta.
12. O histórico da conta mostra, da mais recente para a mais antiga, data, saldo do extrato, quantidade de transações e valor do ajuste. A função pura `transacaoBloqueada(estado, id)` retorna verdadeiro para transações de conciliações fechadas (inclusive o ajuste). "Reabrir última conciliação" (com confirmação) remove a conciliação mais recente da conta, apaga a transação de ajuste dela, se houver, e devolve data, saldo e marcações ao rascunho; é recusada se já existe rascunho com marcações.
13. O usuário pode colar linhas do extrato no formato `data;descrição;valor` (data AAAA-MM-DD ou DD/MM/AAAA, valor com sinal em formato brasileiro ou simples); linhas inválidas são listadas com o número da linha e o motivo, sem impedir as válidas. "Sugerir pares" casa cada linha com uma transação não conciliada de mesmo valor com sinal e data dentro da tolerância de dias informada (padrão 2), usando cada transação uma só vez e preferindo a data mais próxima; linhas sem par são listadas. Aceitar as sugestões marca as transações no rascunho.
14. Dados salvos sem a chave `conciliacoes` carregam com estado vazio, sem alterar nenhum outro dado; "Conciliação" aparece na navegação principal.

## Fora do escopo

- Conciliar cartões de crédito e faturas.
- Importar o extrato como transações (veja importação CSV).
- Integração automática com bancos (Open Finance) e leitura de OFX ou PDF.
- Bloqueio de edição e exclusão nas telas existentes; esta parte expõe `transacaoBloqueada` para integração posterior.
- Conciliar parcialmente várias contas de uma vez e dividir uma linha do extrato entre várias transações.
