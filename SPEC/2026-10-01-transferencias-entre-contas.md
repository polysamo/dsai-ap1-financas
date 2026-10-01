# Transferências entre contas

## O quê e por quê

Mover dinheiro da corrente para a poupança, ou sacar para a carteira, não é receita nem despesa: o patrimônio total não muda. Hoje o único jeito de registrar isso é lançar uma despesa e uma receita, o que distorce os resumos. Esta parte acrescenta a **transferência**: um lançamento que debita uma conta e credita outra, com histórico próprio na rota `/transferencias` (rótulo "Transferências").

Extensão ao modelo (sem mudar a versão do esquema; dados antigos recebem `transferencias: []` automaticamente):

- O estado ganha `transferencias`: `{ id, contaOrigemId, contaDestinoId, valor, data, descricao, criadaEm }`, com `valor` em centavos inteiros positivos e `data` em AAAA-MM-DD.
- O saldo calculado de cada conta passa a considerar as transferências, como já faz com `pagamentosFatura`. Transferências não são transações: não entram nos totais de receitas e despesas de nenhuma tela.

Esta parte complementa [contas](2026-10-01-contas.md) e [cartoes-e-faturas](2026-10-01-cartoes-e-faturas.md).

## Critérios de aceitação

1. Criar uma transferência exige duas contas ativas distintas, valor maior que zero em centavos inteiros, data válida e descrição opcional (até 100 caracteres, vazia aceita); cada violação é recusada com mensagem e indicação do campo (`contaOrigemId`, `contaDestinoId`, `valor`, `data`, `descricao`).
2. O saldo da origem diminui e o do destino aumenta exatamente o valor transferido; o saldo total (contas mais cartões) não muda.
3. Transferências não aparecem nos totais de receitas e despesas do dashboard, das transações nem do resumo mensal.
4. O histórico lista as transferências da mais recente para a mais antiga (empate pela ordem de criação), mostrando data, origem, destino, descrição e valor; sem nenhuma, exibe estado vazio com orientação.
5. O histórico filtra por conta (origem ou destino) e por período (data inicial e final, inclusive); período invertido é recusado com mensagem e o filtro "Limpar" restaura a lista completa; filtros sem resultado mostram mensagem própria.
6. Editar uma transferência aplica as mesmas validações da criação; contas que não mudaram podem estar arquivadas, mas trocar para uma conta arquivada é recusado. O saldo reflete a edição.
7. Excluir uma transferência pede confirmação em diálogo; ao cancelar nada muda, ao confirmar o registro some e os saldos voltam ao que eram.
8. Uma conta que tenha transferências (como origem ou destino) não pode ser excluída; a mensagem orienta a arquivá-la.
9. Para o período filtrado, cada conta com movimentação mostra o total enviado e o total recebido em transferências, com a soma exata em centavos.
10. O formulário da tela mostra o erro junto ao campo (`role="alert"`), mantém os dados digitados ao falhar e limpa o formulário depois de salvar; sem pelo menos duas contas ativas ele é substituído por um aviso com link para Contas.
11. A navegação principal tem o item "Transferências" que leva a `/transferencias`.
12. Dados salvos sem a chave `transferencias` carregam sem erro, com lista vazia, sem alterar contas nem transações.

## Fora do escopo

- Transferências entre moedas ou com tarifa/IOF.
- Transferências agendadas ou recorrentes.
- Conciliação com extratos e importação de transferências por CSV.
- Vincular a transferência a pagamentos de fatura (que seguem em Cartões).
