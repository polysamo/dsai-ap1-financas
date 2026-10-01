# Calendário financeiro

## O quê e por quê

Transações registram o que já aconteceu; falta um lugar para o que **vai** acontecer: o boleto que vence na sexta, o aluguel que se repete todo mês, o salário que cai no dia 5. Esta parte acrescenta **lançamentos agendados** (contas a pagar e a receber) com vencimento, uma visão de calendário mensal e a ação de dar baixa, que cria a transação real. Agendar não mexe em saldos nem em relatórios; só a baixa o faz.

Extensões ao modelo (sem mudança de versão do esquema; dados antigos sem a chave recebem lista vazia):

- O estado ganha `agenda`: lista de `{ id, descricao, tipo, valor, vencimento, categoriaId, contaId?, serie?, pagoEm?, transacaoId? }`.
- `serie?: { grupoId, numero, total }` liga os lançamentos gerados por uma recorrência mensal.
- `pagoEm` e `transacaoId` só existem em lançamentos pagos; `transacaoId` aponta para a transação criada na baixa.

Esta parte complementa [categorias-e-transacoes](2026-10-01-categorias-e-transacoes.md) e [contas](2026-10-01-contas.md) e atende ao que [cartões e faturas](2026-10-01-cartoes-e-faturas.md) deixou de fora (lembretes de vencimento). Regras: um lançamento é **pago** se tem `pagoEm`; **atrasado** se não é pago e o vencimento é anterior a hoje; **pendente** nos demais casos (vencer hoje ainda é pendente).

## Critérios de aceitação

1. Criar um lançamento exige descrição, valor maior que zero, vencimento válido e categoria ativa do mesmo tipo (pagar = despesa, receber = receita); a conta é opcional, mas, se informada, deve estar ativa. Cada erro é recusado junto ao campo.
2. A recorrência mensal aceita de 1 a 60 repetições e cria um lançamento por mês, no mesmo dia (limitado ao último dia do mês), todos no mesmo grupo e com valor igual. Com mais de uma repetição a descrição termina em "(k/n)".
3. A situação é calculada por data: "Pago" se há `pagoEm`, "Atrasado" se o vencimento é anterior a hoje e não foi pago, "Pendente" caso contrário, inclusive no próprio dia do vencimento. Na tela a situação aparece em texto, não só em cor.
4. O calendário mensal mostra uma grade de semanas (domingo a sábado) com os dias do mês na coluna correta e, em cada dia, os lançamentos que vencem nele; os botões de mês anterior e próximo trocam o mês sem alterar dados.
5. A lista do mês traz os mesmos lançamentos da grade, ordenados por vencimento e, no mesmo dia, por ordem de criação; mês sem lançamentos mostra estado vazio, e sem nenhum lançamento a tela convida a criar o primeiro.
6. Os totais do mês mostram "A pagar" e "A receber" (somas exatas dos lançamentos ainda não pagos, atrasados inclusos) e "Já pago" e "Já recebido" (somas dos pagos); lançamentos de outros meses não entram.
7. Marcar como pago pede conta, categoria e data do pagamento (padrão: conta e categoria do lançamento e hoje) e cria uma transação do mesmo tipo, valor e descrição, nessa conta, categoria e data; o saldo da conta muda de acordo, e o lançamento passa a "Pago" ligado à transação.
8. Um lançamento já pago não pode ser pago de novo: a segunda tentativa é recusada e nenhuma transação extra é criada.
9. A baixa exige conta ativa, categoria ativa do mesmo tipo do lançamento e data válida; cada erro é recusado junto ao campo, sem alterar nada.
10. Reabrir um lançamento pago remove a transação criada por ele, limpa `pagoEm` e `transacaoId` e devolve a situação calculada por data (pendente ou atrasado); reabrir um lançamento não pago é recusado.
11. Excluir um lançamento remove só ele, depois de confirmação, e não apaga a transação gerada por uma baixa já feita nem os demais lançamentos da série.
12. O alerta de vencimentos lista os lançamentos não pagos que vencem de hoje até 7 dias à frente (inclusive os dois extremos), em ordem de data, e informa à parte quantos estão atrasados; sem nenhum, mostra mensagem de que não há vencimentos próximos.
13. Dados salvos antes desta parte (sem `agenda`) carregam sem erro, com a agenda vazia, e a rota `/calendario` aparece na navegação com o rótulo "Calendário".

## Fora do escopo

- Pagamento parcial de um lançamento e baixa em lote.
- Recorrência sem fim, por semana ou por ano, e edição em série.
- Edição de um lançamento já criado (exclua e crie de novo).
- Notificações fora da tela, e-mail ou integração com agenda do sistema.
- Juros, multa e desconto por atraso ou antecipação.
- Vínculo de faturas de cartão com a agenda.
