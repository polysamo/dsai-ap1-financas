# Dívidas e empréstimos

## O quê e por quê

Quem deve (financiamento, empréstimo pessoal) ou emprestou dinheiro a alguém precisa saber quanto ainda falta, quanto de juros está embutido e qual é a próxima parcela. Esta parte acrescenta o cadastro de dívidas com **tabela de amortização** (sistemas Price e SAC), registro de pagamentos e um **simulador** independente. Dívidas não geram transações nem alteram saldos de contas: são um acompanhamento à parte.

Extensões ao modelo (sem mudança de versão de esquema):

- O estado ganha `dividas`: `{ id, nome, tipo ('devo' | 'emprestei'), principal, taxaBp, parcelas, primeiraParcela, sistema ('price' | 'sac'), pagamentos, criadaEm }`.
- `taxaBp` é a taxa mensal em centésimos de ponto percentual (1,99% ao mês = 199), inteira, para evitar erro de ponto flutuante.
- Um pagamento é `{ id, data, valor, parcela? }`; sem `parcela`, é uma amortização extra.

Regras de cálculo, tudo em centavos inteiros: os juros de cada parcela são `saldo × taxa` arredondados para o centavo mais próximo (meio para cima). Price: parcela fixa calculada uma vez e arredondada; amortização = parcela − juros. SAC: amortização fixa de `principal ÷ prazo` (parte inteira). Em ambos, a **última parcela absorve o resto**: sua amortização é o saldo restante, de modo que a soma das amortizações é exatamente o principal. A parcela k vence k−1 meses após a primeira, no mesmo dia, limitado ao último dia do mês.

Uma parcela está quitada quando os pagamentos a ela somam pelo menos o seu valor; pagamentos parciais reduzem só o restante da parcela. O saldo devedor atual é o principal menos as amortizações das parcelas quitadas e menos as amortizações extras. Uma extra abate o saldo, mas a tabela contratual não é recalculada. Esta spec é independente das demais; usa só valores em centavos e datas AAAA-MM-DD já existentes.

## Critérios de aceitação

1. O cadastro pede nome (1 a 60 caracteres), tipo, principal (maior que zero), taxa mensal em % (de 0 a 100, até 2 casas), número de parcelas (inteiro de 1 a 480), data da primeira parcela válida e sistema; cada valor inválido é recusado junto ao campo, com mensagem em `role="alert"`.
2. Price com principal R$ 1.000,00, 1% ao mês e 3 parcelas gera parcelas de R$ 340,02, R$ 340,02 e R$ 340,03, juros de R$ 10,00, R$ 6,70 e R$ 3,37 e saldo final zero.
3. SAC com os mesmos dados gera amortizações de R$ 333,33, R$ 333,33 e R$ 333,34, parcelas de R$ 343,33, R$ 340,00 e R$ 336,67 e total de juros de R$ 20,00.
4. Em qualquer combinação, a soma das amortizações é exatamente o principal, o saldo da última linha é zero e a soma dos juros mais o principal é a soma das parcelas. Com taxa zero, não há juros e o resto vai na última parcela.
5. As datas de vencimento avançam um mês por parcela, no mesmo dia, limitado ao último dia do mês (31/01 gera 28/02) e atravessam a virada do ano.
6. Registrar o pagamento de uma parcela exige data válida, valor maior que zero e parcela existente ainda não quitada; um valor menor que o da parcela é pagamento parcial e a tabela mostra a situação "Parcial" com o restante; um valor acima do restante da parcela é recusado.
7. Parcela quitada aparece como "Paga", parcela não quitada com vencimento anterior a hoje aparece como "Atrasada", e as demais como "Pendente"; a situação é sempre dita em texto, não só por cor.
8. A amortização extra exige data válida e valor maior que zero e no máximo o saldo devedor atual; reduz o saldo devedor atual pelo valor informado; um valor maior que o saldo é recusado.
9. O resumo da dívida mostra saldo devedor atual, total de juros da tabela, total já pago, a próxima parcela a vencer (número, data, restante) e a quantidade e o valor das parcelas atrasadas; sem parcelas pendentes, mostra "Quitada".
10. Dívidas do tipo "emprestei" usam o mesmo cálculo, mas a tela troca os rótulos para "a receber" (saldo a receber, parcela a receber, recebimento).
11. O simulador recebe principal, taxa e prazo, mostra Price e SAC lado a lado (primeira e última parcela, total de juros e total pago), recusa valores inválidos junto ao campo e não grava nada no estado nem no armazenamento.
12. A tela Dívidas, sem nenhuma cadastrada, mostra estado vazio e o simulador; com dívidas, permite escolher uma, ver tabela e resumo, registrar pagamentos, excluir pagamento e excluir a dívida mediante confirmação.
13. Dados salvos sem a chave `dividas` carregam sem erro com `dividas` vazio e sem alterar nada do restante; as dívidas sobrevivem a recarregar a página.
14. O item "Dívidas" aparece na navegação e leva à rota `/dividas`.

## Fora do escopo

- Recalcular a tabela após amortização extra (redução de prazo ou de parcela) e calcular a economia de juros.
- Juros de mora, multa por atraso, IOF, seguros, CET e taxas anuais ou capitalizações diferentes da mensal.
- Gerar transações ou movimentar saldos de contas a partir das parcelas.
- Carência, parcelas de valor variável e indexadores (IPCA, TR, CDI).
- Lembretes de vencimento e exportação da tabela.
