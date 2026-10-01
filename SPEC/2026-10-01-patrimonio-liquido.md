# Patrimônio líquido

## O quê e por quê

O app mostra saldos de contas, investimentos e dívidas em telas separadas, mas ninguém responde "quanto eu valho hoje e para onde isso vai". Esta parte soma tudo na rota `/patrimonio` (menu "Patrimônio"): **patrimônio líquido = ativos − passivos**, sempre derivado, sem nada armazenado além das metas.

- Ativos: saldo positivo de cada conta ativa (inclui cartão com crédito), valor dos investimentos e o saldo a receber das dívidas "emprestei".
- Passivos: saldo negativo de contas ativas (cartões ficam num grupo próprio), e o saldo devedor das dívidas "devo".
- Os valores são calculados "até uma data" reutilizando `saldosPorConta` (contas), `valorEm` (investimentos) e `resumoDivida` (dívidas), filtrando por data as transações, pagamentos de fatura, movimentos e pagamentos de dívida. Uma dívida entra no patrimônio no mês anterior ao da primeira parcela, ou no mês em que foi cadastrada, o que vier primeiro. Contas arquivadas ficam de fora, como em `saldoTotal`. A data de corte do valor atual é hoje.
- A evolução cobre os últimos 12 meses (mês corrente incluído), com o valor no fim de cada mês (hoje, no mês corrente).
- Metas de patrimônio opcionais: `metasPatrimonio: { id, nome, valor }[]` no estado (chave aditiva, sem mudar o esquema).

## Critérios de aceitação

1. O patrimônio atual é a soma dos saldos das contas ativas (cartões como saldo negativo) mais o valor dos investimentos, menos o saldo devedor das dívidas "devo", mais o saldo a receber das dívidas "emprestei", usando as funções de contas, investimentos e dívidas; com estado vazio é zero.
2. O patrimônio em uma data passada ignora transações, pagamentos de fatura, movimentos e marcações de investimento e pagamentos de dívida posteriores a ela; contas arquivadas e dívidas ainda não contratadas não contam.
3. A evolução tem 12 pontos mensais consecutivos terminando no mês corrente, cada um com o patrimônio no fim do mês; o último ponto é igual ao patrimônio atual.
4. O gráfico Recharts de área mostra a evolução e tem `role="img"` com descrição; uma tabela com os mesmos 12 meses e valores fica sempre visível como alternativa acessível.
5. A composição lista ativos e passivos por grupo (Contas, Investimentos, A receber; Cartões, Contas no negativo, Dívidas), com valor e percentual de uma casa decimal; os percentuais de cada lado somam exatamente 100,0 (maiores restos), e ativos menos passivos é o patrimônio líquido.
6. A composição mostra o total de ativos, o de passivos e o líquido; o grupo sem valor não aparece e, sem ativos ou sem passivos, o lado mostra "Nada por aqui".
7. A variação no mês compara o patrimônio de hoje com o do último dia do mês anterior; a variação em 12 meses compara com o último dia do mesmo mês um ano antes. Cada uma mostra valor com sinal e percentual com uma casa decimal (sobre o valor absoluto da base); com base zero o percentual é "—". O sinal aparece em texto, não só em cor.
8. É possível criar uma meta de patrimônio com nome (1 a 40 caracteres, único sem diferenciar maiúsculas) e valor maior que zero; entradas inválidas são recusadas junto ao campo com mensagem.
9. Cada meta mostra progresso (patrimônio atual ÷ valor da meta, de 0 a 100, uma casa decimal) em barra com `role="progressbar"` e texto, quanto falta e "Meta atingida" quando o patrimônio alcança o valor; patrimônio zero ou negativo dá 0,0%.
10. Metas podem ser editadas e excluídas (a exclusão pede confirmação); sem metas aparece um estado vazio que convida a criar a primeira.
11. O instantâneo em CSV tem BOM, separador `;`, vírgula decimal e quebras CRLF, e traz data, ativos e passivos por grupo com percentuais, patrimônio líquido, variações, a evolução de 12 meses e as metas; o botão "Exportar CSV" baixa o arquivo `patrimonio-AAAA-MM-DD.csv`.
12. Dados antigos sem `metasPatrimonio` carregam sem erro com lista vazia e o esquema não muda; as metas persistem no localStorage.
13. "Patrimônio" aparece no menu de navegação e a rota `/patrimonio` abre a página; os cálculos não alteram nenhum dado existente.
14. A página não usa Tailwind: o estilo vem de arquivos CSS próprios com classes prefixadas e variáveis dos tokens; formulários e botões têm rótulos acessíveis.

## Fora do escopo

- Imóveis, veículos e bens avaliados manualmente.
- Correção monetária, câmbio e projeção de patrimônio futuro.
- Histórico gravado de patrimônio (tudo é reconstruído) e metas com prazo.
- Metas por classe de ativo ou notificações de meta atingida.
