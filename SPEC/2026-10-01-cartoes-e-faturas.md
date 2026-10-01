# Cartões e faturas

## O quê e por quê

Hoje um cartão de crédito é só uma conta com saldo negativo. Na vida real o que importa é a **fatura**: o ciclo entre dois fechamentos, a data de vencimento, o limite disponível e as compras parceladas, que se espalham por vários meses. Esta parte acrescenta isso sem mudar o modelo de transações: a fatura é calculada a partir das transações da conta do cartão, e as parcelas são transações comuns ligadas por um grupo.

Extensões ao modelo (esquema versão 2):

- Conta do tipo `cartao` ganha `cartao: { diaFechamento, diaVencimento, limite }`.
- Transação ganha `parcela?: { grupoId, numero, total }`.
- O estado ganha `pagamentosFatura`: `{ id, contaCartaoId, mesFatura, valor, data, contaOrigemId }`. Um pagamento move dinheiro entre contas e **não** é receita nem despesa.

Esta spec estende [categorias-e-transacoes](2026-10-01-categorias-e-transacoes.md), que deixava transações parceladas fora do escopo, e [contas](2026-10-01-contas.md). Regras: a fatura de `mesFatura` = M reúne as transações com data maior que o dia de fechamento de M−1 e até o dia de fechamento de M (inclusive). O vencimento é o `diaVencimento` do mês M se for maior que o dia de fechamento; caso contrário, do mês M+1.

## Critérios de aceitação

1. Ao criar ou editar uma conta do tipo cartão, o formulário pede dia de fechamento e dia de vencimento (inteiros de 1 a 28) e limite (maior que zero); valores inválidos são recusados junto ao campo. Contas de outros tipos não guardam esses dados.
2. A tela Cartões lista os cartões ativos e, sem nenhum, mostra estado vazio com link para Contas. Cartões sem configuração de ciclo pedem para configurá-la antes de mostrar a fatura.
3. A fatura de um mês mostra as transações do ciclo e o total, que é a soma exata delas; navegar entre meses troca a fatura sem alterar dados.
4. O vencimento da fatura é calculado pela regra acima, inclusive quando o vencimento cai no mês seguinte ao do fechamento e na virada do ano.
5. Cada fatura tem situação em texto: "Aberta" (hoje até o fechamento), "Fechada" (passou do fechamento e há saldo a pagar) ou "Paga" (pagamentos cobrem o total). A situação não depende só de cor.
6. Uma compra parcelada pede descrição, valor total, número de parcelas (2 a 48), data da primeira parcela e categoria de despesa, e cria uma transação de despesa por parcela na conta do cartão, uma em cada mês, no mesmo dia (limitado ao último dia do mês).
7. A soma das parcelas é exatamente o valor total em centavos: o resto da divisão vai para a primeira parcela. A descrição de cada parcela termina em "(k/n)".
8. Cada parcela cai na fatura correta de acordo com o ciclo do cartão, inclusive parcelas de datas próximas ao dia de fechamento.
9. Ao excluir uma parcela, o usuário escolhe entre excluir só aquela parcela ou todas as do mesmo grupo; a escolha se reflete nas faturas e nos saldos.
10. Pagar uma fatura exige valor maior que zero, data válida e uma conta de origem ativa que não seja cartão. O pagamento aumenta o saldo do cartão e reduz o da origem; não aparece nos totais de receitas e despesas do dashboard nem das transações.
11. Pagamentos parciais são aceitos; um pagamento maior que o restante da fatura é recusado. A fatura mostra total, pago e restante.
12. O limite mostra usado (dívida atual do cartão, nunca negativa), disponível (limite menos usado) e uma barra de progresso com texto; se o disponível for negativo, exibe "limite excedido".
13. Dados salvos na versão 1 do esquema carregam sem erro: a migração para a versão 2 acrescenta `pagamentosFatura` vazio e nenhuma conta ou transação existente muda.
14. Uma conta de cartão com pagamentos de fatura não pode ser excluída, assim como já ocorre com contas que têm transações.

## Fora do escopo

- Juros rotativos, multas e encargos por atraso.
- Parcelamento de fatura e cartões adicionais de titulares diferentes.
- Conciliação com o PDF ou o CSV da fatura do banco.
- Fatura em moeda estrangeira e pontos de fidelidade.
- Lembretes e notificações de vencimento (veja calendário financeiro, se vier a existir).
