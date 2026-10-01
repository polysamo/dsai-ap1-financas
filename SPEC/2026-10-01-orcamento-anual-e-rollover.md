# Orçamento anual e rollover

## O quê e por quê

A tela [Orçamento](2026-10-01-orcamento.md) mostra um mês por vez. Para planejar o ano é preciso ver os 12 meses lado a lado, ajustar limites em bloco e saber se o realizado do ano cabe no orçado. Esta parte acrescenta a rota `/orcamento-anual` (rótulo "Orçamento anual") sem alterar a tela `/orcamento`.

Modelo: os limites continuam sendo os `orcamentos` existentes (`categoriaId` + mês + `limite`); a visão anual só os lê e grava no mesmo formato. O gasto de cada célula (categoria × mês) é a soma das despesas da categoria no mês, em todas as contas, como no orçamento mensal.

Rollover opcional por categoria: a sobra (ou o estouro) do mês anterior soma ao limite do mês seguinte. O valor do rollover é sempre **calculado**, nunca armazenado. O que se guarda é só a preferência: o estado ganha `rolloverCategorias` (lista de ids de categorias com rollover ligado). Regras do cálculo, dentro do ano exibido:

- Limite efetivo do mês = limite definido + carry. Carry de janeiro é zero (a cadeia recomeça a cada ano).
- Carry do mês seguinte = limite efetivo do mês menos o gasto do mês (positivo é sobra, negativo é estouro), só quando o rollover está ligado e o mês tem limite definido.
- Mês sem limite definido não tem limite efetivo e interrompe a cadeia (o carry seguinte é zero).
- O orçado anual de uma categoria é a soma dos limites definidos, sem os carries (o rollover só desloca valor entre meses, não cria orçamento novo).

## Critérios de aceitação

1. Em `/orcamento-anual` o usuário vê uma grade com uma linha por categoria de despesa e uma coluna por mês do ano escolhido (janeiro a dezembro), mostrando limite e gasto de cada célula; o ano vem de `?ano=AAAA`, tem botões de ano anterior e seguinte e, se inválido, vale o ano atual. O item "Orçamento anual" aparece na navegação.
2. O gasto de cada célula é a soma exata das despesas da categoria no mês; há uma linha de totais por mês (soma dos limites efetivos e dos gastos de todas as categorias) e, em cada categoria, totais anuais de orçado e realizado. Categorias arquivadas aparecem só se tiverem limite ou gasto no ano, marcadas como arquivadas.
3. Clicar numa célula abre um editor para o limite daquela categoria e mês; salvar persiste após recarregar. Valor não numérico ou negativo é recusado com mensagem junto ao campo; zero é aceito. Há também "Remover limite", que não apaga transações.
4. O editor tem "Aplicar a todos os meses" (define o mesmo limite em janeiro a dezembro do ano exibido) e "A partir deste mês" (define o limite no mês da célula e nos seguintes até dezembro); os meses anteriores não mudam e outras categorias e outros anos não são tocados.
5. Cada categoria tem um controle "Rollover" (caixa de seleção) que grava ou remove o id em `rolloverCategorias`; a preferência persiste após recarregar e dados salvos sem a chave carregam com lista vazia, sem mudar `schemaVersion`.
6. Com rollover ligado, a sobra do mês anterior soma ao limite efetivo do mês seguinte e o estouro subtrai dele, em cadeia dentro do ano; a célula mostra o valor do rollover em texto ("Rollover +R$ ..."/"Rollover -R$ ..."). Com rollover desligado nenhum valor é somado.
7. O rollover nunca é gravado: após ligar o rollover, a lista `orcamentos` salva é idêntica à de antes, e mudar uma transação ou um limite recalcula os carries sem recarregar.
8. Mês sem limite definido interrompe o rollover: o mês seguinte não recebe carry daquele mês nem de meses anteriores à lacuna.
9. A comparação orçado × realizado anual mostra, por categoria com limite, orçado, realizado, percentual consumido e destaque textual ("Dentro do limite", "Atenção: perto do limite" ou "Estourado") nas mesmas faixas do orçamento mensal (abaixo de 80%, de 80% a 100%, acima de 100%); orçado zero com gasto positivo é "Estourado" sem divisão por zero (percentual exibido como "—").
10. O resumo do ano mostra orçado total, realizado nas categorias com limite, percentual consumido com destaque textual e, em linha separada, gasto sem orçamento (categorias sem nenhum limite no ano).
11. "Exportar CSV" baixa a visão anual com separador `;`, BOM UTF-8 e decimal com vírgula: cabeçalho, uma linha por categoria (rollover, limite e gasto de cada mês, orçado e realizado anuais, percentual, situação) e uma linha de totais; o nome do arquivo inclui o ano.
12. Sem categorias de despesa a tela mostra estado vazio com orientação; sem nenhum limite no ano mostra aviso sugerindo definir limites. Erros de gravação aparecem em alerta.
13. Navegar entre anos não altera dados; a tela `/orcamento` continua se comportando como antes.
14. Acessibilidade: a grade é uma tabela com cabeçalhos de linha e coluna, cada botão de célula tem rótulo com categoria e mês, o estado nunca depende só de cor e erros de campo são anunciados.

## Fora do escopo

- Rollover entre anos (a cadeia recomeça em janeiro).
- Orçamento de receitas e períodos personalizados.
- Sugestão automática de limites a partir do histórico.
- Gráficos; edição de várias categorias de uma vez; importação de limites por CSV.
- Alertas fora da tela.
