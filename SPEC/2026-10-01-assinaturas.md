# Assinaturas

## O quê e por quê

Cobranças recorrentes (streaming, academia, software) somem no meio do extrato. Esta parte encontra essas despesas no histórico, mostra quanto custam por mês e por ano, deixa o usuário decidir o que é assinatura de verdade e avisa quando o preço sobe. Tudo é calculado por funções puras a partir das transações; nada nas transações é alterado.

Modelo: o estado ganha `assinaturasDecisoes: DecisaoAssinatura[]`, em que cada item é `{ chave, decisao: 'confirmada' | 'ignorada', canceladaEm?, manual? }`. A `chave` de uma detecção é `<descrição normalizada>|<frequência>`; assinaturas manuais usam `manual:<id>` e guardam seus dados em `manual` (descrição, valor, frequência, próxima cobrança). Uma assinatura cancelada continua `confirmada` e ganha `canceladaEm`. Os tipos ficam em `src/domain/assinaturas.ts`. Dados antigos sem a chave carregam com lista vazia.

A detecção usa só despesas, agrupadas pela descrição normalizada (sem acento, minúsculas, espaços colapsados). Frequências e tolerâncias de intervalo entre cobranças consecutivas: semanal 7 dias (±1), mensal 28 a 31 dias (±3, ou seja 25 a 34), anual 365 dias (±15). A variação de valor entre cobranças consecutivas deve ser de até 15% por padrão (parâmetro). Exigem-se pelo menos 3 ocorrências na sequência; vale a sequência mais recente.

## Critérios de aceitação

10. A detecção reconhece despesas recorrentes semanais, mensais e anuais com a mesma descrição normalizada, valor igual ou com variação de até o limite entre cobranças consecutivas e intervalos dentro da tolerância, com no mínimo 3 ocorrências. Receitas, grupos com 2 ocorrências, intervalos irregulares, valores muito diferentes e descrições vazias não são detectados. A mesma entrada sempre dá o mesmo resultado.
11. A tela `/assinaturas` (rótulo "Assinaturas" na navegação) lista cada assinatura com frequência, valor médio, última cobrança, próxima cobrança estimada (última mais um período; marcada "atrasada" se já passou), custo mensal e custo anual equivalentes (semanal x 52, anual / 12, com arredondamento), e mostra o total mensal e anual das ativas. Sem nenhuma detecção nem cadastro, mostra estado vazio explicativo.
12. Cada detecção nasce "Pendente" e pode ser confirmada ou ignorada; a decisão é gravada em `assinaturasDecisoes`, sobrevive a recarregar e pode ser desfeita. Pendentes e ignoradas não entram no total; ignoradas ficam numa seção recolhida. A situação aparece em texto, não só em cor.
13. O usuário cadastra assinaturas manuais (descrição de 1 a 100 caracteres, valor maior que zero, frequência, data válida da próxima cobrança), com erros junto ao campo, e pode excluí-las. Qualquer assinatura confirmada ou manual pode ser marcada como "cancelada" após confirmação: sai do total mensal e anual e seu custo anual soma na "economia anual"; pode ser reativada.
14. Quando a última cobrança de uma assinatura detectada é maior que a anterior, aparece o alerta "Aumento de preço" com valor anterior, valor novo e percentual. As operações não alteram `transacoes`, e os dados salvos sem `assinaturasDecisoes` carregam sem erro com lista vazia.

## Fora do escopo

- Cancelar a assinatura no serviço ou integrar com bancos.
- Detectar assinaturas em receitas ou em parcelas de cartão.
- Notificações de cobrança próxima (veja calendário).
- Gerar transações ou agendamentos a partir das assinaturas.
- Conversão de moeda e cobranças com periodicidade diferente de semanal, mensal ou anual.
