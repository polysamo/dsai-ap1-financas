# Fluxo de caixa diário

## O quê e por quê

A projeção mensal responde "para onde vou", mas não "em que dia o dinheiro acaba". Esta tela (`/fluxo`, rótulo "Fluxo de caixa") prevê o saldo **dia a dia** nos próximos 30, 60 ou 90 dias, para o usuário ver com antecedência o dia em que as contas a pagar passam o que há em caixa e decidir o que adiar. Tudo é **derivado** dos dados existentes (funções puras em `src/domain/fluxoCaixa.ts`); nenhum estado novo é salvo e o esquema não muda.

Convenções (a janela e as fontes):

- A janela começa **hoje** e tem N dias (hoje inclusive): de hoje até hoje + N − 1.
- **Saldo inicial** = saldo atual das contas ativas que não são cartão (a fatura entra só no vencimento, nunca como compra).
- **Agendamentos**: lançamentos não pagos, na data de vencimento. Os atrasados (vencimento antes de hoje) entram em hoje, marcados como atrasados. Agendamentos ligados a uma conta de cartão ou a uma conta arquivada ficam de fora.
- **Recorrências ativas** (valor mensal fixo): entram uma vez por mês, no dia do mês definido no cadastro da recorrência. O módulo de recorrências hoje não guarda dia; por convenção, se a recorrência não tiver o campo opcional `dia` (1 a 28), vale o **dia 1**. Só entram as ocorrências dentro da janela.
- **Faturas de cartão**: para cada cartão ativo com ciclo configurado, a fatura aberta ou fechada que ainda não foi paga entra pelo valor **restante** (total menos pagamentos) no dia do vencimento; vencidas e não pagas entram em hoje.
- **Dívidas "devo"**: cada parcela não paga entra pelo valor restante no vencimento; parcelas vencidas entram em hoje. Dívidas "emprestei" ficam de fora.
- Entradas somam e saídas subtraem; o saldo do dia é o saldo de fechamento (saldo anterior + entradas − saídas).
- Cada item guarda sua origem (`tipo` e `id`): `agendamento`, `recorrencia`, `fatura` (id `contaId@AAAA-MM`) ou `divida` (id da dívida e número da parcela).
- **O que fazer**: havendo dia negativo, a sugestão é adiar a saída que, até o primeiro dia negativo, cobre o rombo com o menor valor (ou a maior saída, se nenhuma cobrir sozinha); o cálculo repete com o item retirado até o saldo ficar sem dias negativos ou acabarem os candidatos (no máximo 3 sugestões).

## Critérios de aceitação

10. O usuário escolhe a janela de 30, 60 ou 90 dias (padrão 30) e a tela mostra saldo inicial, total de entradas, total de saídas, saldo final, o menor saldo do período com sua data e a quantidade de dias negativos. Sem nenhum item previsto e sem saldo, a tela mostra estado vazio explicando as fontes.
11. O saldo projetado de cada dia é exatamente o saldo inicial mais entradas menos saídas acumuladas até o dia, em centavos inteiros. As fontes seguem as convenções acima: agendamentos pendentes (atrasados em hoje), recorrências ativas no dia cadastrado ou dia 1, vencimento do restante das faturas de cartão não pagas e parcelas de dívidas "devo" não pagas; itens pagos, dívidas "emprestei" e recorrências inativas não entram.
12. Cada item da previsão informa descrição, valor, tipo (entrada ou saída) e a origem (tipo e id), visíveis na tabela diária. A tabela tem a opção "Somente dias com movimento" e a situação de cada dia aparece em texto ("Negativo" ou "Positivo"), não só em cor; dias negativos são destacados também com texto "saldo negativo".
13. Um gráfico de linha (Recharts) mostra o saldo diário, com descrição acessível, e uma tabela alternativa ("Ver como tabela") lista data e saldo de todos os dias da janela.
14. Quando há saldo negativo, a seção "O que fazer" lista sugestões em texto (por exemplo, adiar o item X, com valor, data e origem) e avisa se mesmo assim o saldo continua negativo; sem dias negativos, informa que nada precisa ser feito. As funções de cálculo são puras, sem alterar o estado, e têm casos numéricos conferidos nos testes.

## Fora do escopo

- Alterar o módulo de recorrências para guardar o dia do mês (a tela apenas lê um `dia` opcional, se existir).
- Prever gastos variáveis a partir da média histórica (isso é a projeção mensal).
- Efetivar o adiamento de um item pela tela; a sugestão é só textual.
- Juros, multas e encargos de atraso; saldo de contas de investimento ou resgates programados.
- Exportação do fluxo e notificações.
