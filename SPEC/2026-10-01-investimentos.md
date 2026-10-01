# Investimentos

## O quê e por quê

O app mostra para onde vai o dinheiro do mês, mas não onde ele rende. Esta parte acrescenta uma **carteira manual**: o usuário cadastra ativos, registra aportes e resgates e, de tempos em tempos, anota o valor de mercado atual. Com isso o app calcula quanto foi investido, quanto vale hoje, a rentabilidade, a alocação por classe e a evolução do patrimônio mês a mês. Nada é buscado em corretoras ou cotações: tudo é digitado, como as metas.

Modelo (sem mudança de versão do esquema; a chave nova ausente em dados antigos recebe `[]`):

- `AppState.investimentos: Ativo[]`, com `Ativo = { id, nome, classe, movimentos, marcacoes, criadoEm }`.
- `classe` é `renda-fixa`, `acoes`, `fundos`, `cripto` ou `outros`.
- Movimento: `{ id, tipo: 'aporte' | 'resgate', data, valor }` (valor positivo, em centavos). Marcação: `{ id, data, valor }`, o valor de mercado do ativo naquela data.
- Investimentos **não** geram transações e **não** mexem em saldos de contas.

Regras de cálculo, para um ativo numa data D: o **investido líquido** é a soma dos aportes menos a soma dos resgates até D. O **valor atual** é o da última marcação até D mais os aportes e menos os resgates feitos depois dela; sem marcação, é o investido líquido. A **rentabilidade** é valor atual menos investido líquido; em percentual, é essa diferença sobre o investido líquido.

## Critérios de aceitação

1. Cadastrar um ativo exige nome (1 a 40 caracteres, sem repetir o nome de outro ativo, ignorando maiúsculas) e uma das cinco classes; erros aparecem junto ao campo.
2. A rota `/investimentos` aparece na navegação com o rótulo "Investimentos". Sem ativos, a tela mostra estado vazio com chamada para cadastrar o primeiro; o resumo, a alocação e o gráfico só aparecem quando há ativos.
3. Um aporte ou resgate exige valor inteiro em centavos maior que zero e data válida (AAAA-MM-DD existente) que não seja futura; valores e datas inválidos são recusados com mensagem junto ao campo.
4. Um resgate maior que a posição é recusado, inclusive quando a data informada é anterior a aportes posteriores (a posição nunca fica negativa em nenhuma data). Resgatar exatamente a posição inteira é aceito.
5. Uma marcação de valor atual exige valor maior que zero e data válida e não futura; marcar de novo na mesma data substitui a marcação anterior.
6. Cada ativo mostra total investido líquido e valor atual conforme as regras acima, inclusive aportes feitos depois da última marcação, e o resultado não depende da ordem em que os registros foram feitos.
7. A rentabilidade de cada ativo aparece em valor (com sinal) e em percentual com uma casa decimal; sem investido líquido o percentual é exibido como "—", sem divisão por zero. Perda aparece com sinal negativo no texto, não só em cor.
8. A alocação lista as classes com valor atual maior que zero, com percentual de uma casa decimal; a soma dos percentuais é exatamente 100,0% (o resto de arredondamento vai para as maiores partes).
9. O resumo da carteira mostra investido líquido, valor atual, rentabilidade em valor e % da carteira inteira, somando os ativos.
10. A evolução do patrimônio lista, para até os últimos 12 meses desde o primeiro movimento, o valor da carteira no fim de cada mês (no dia de hoje, para o mês corrente), usando as regras por data; meses anteriores ao primeiro aporte de um ativo não o contam.
11. A evolução é exibida num gráfico de barras Recharts com nome acessível e uma tabela alternativa com os mesmos valores mês a mês.
12. É possível excluir um movimento, uma marcação ou um ativo (este com confirmação); excluir um aporte que deixaria a posição negativa em alguma data é recusado com mensagem.
13. Os dados persistem no localStorage; dados salvos antes desta parte carregam sem erro com `investimentos` vazio, e nenhuma conta, transação ou saldo muda por causa de investimentos.
14. Os formulários têm campos rotulados, erros com `role="alert"` e botões com nome acessível; ações bem-sucedidas atualizam a tela sem recarregar.

## Fora do escopo

- Cotações automáticas, integração com corretoras e importação de notas de negociação.
- Imposto de renda, come-cotas, taxas de custódia e dividendos como fluxo separado.
- Preço médio, quantidade de cotas e lotes; a carteira trabalha só com valores em reais.
- Rentabilidade ponderada pelo tempo (TWR) ou taxa interna de retorno.
- Vínculo com contas do tipo investimento ou geração de transações a partir de aportes.
- Metas de alocação e rebalanceamento.
