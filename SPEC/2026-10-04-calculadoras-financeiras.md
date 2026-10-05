# Calculadoras financeiras (2026-10-04)

## O quê e por quê

Decisões do dia a dia ("vale pagar à vista com desconto?", "quanto rende esse CDB depois do IR?", "quanto guardar por mês para chegar a R$ 50 mil?") pedem contas que o usuário hoje faz numa planilha à parte. Esta parte cria a tela `/calculadoras` com cinco calculadoras que não gravam nada no estado: juros compostos com aportes, aporte necessário para uma meta, equivalência de taxas, renda fixa com IR e IOF, e à vista contra parcelado.

As contas ficam em `src/domain/calculadoras.ts`, como funções puras. Valores de dinheiro entram e saem em centavos inteiros; o saldo de cada mês é calculado pela fórmula fechada e só então arredondado ao centavo, para o arredondamento não se acumular. Os aportes acontecem no fim de cada mês. Taxas são números em % com até 4 casas. Os prazos de renda fixa são em dias corridos, com ano de 365 dias.

## Critérios de aceitação

1. A tela `/calculadoras` aparece na navegação (grupo Planejamento, rótulo "Calculadoras") e mostra as cinco calculadoras em abas acessíveis (`role="tab"`), com a primeira selecionada.
2. Juros compostos: com valor inicial, aporte mensal, taxa mensal e número de meses (1 a 600), mostra saldo final, total aportado e total de juros, e uma tabela mês a mês. R$ 1.000,00 a 1% ao mês por 12 meses sem aportes dá R$ 1.126,83; sem taxa, o saldo é a soma dos aportes.
3. Aporte para meta: com valor desejado, valor inicial, taxa mensal e prazo em meses, mostra o aporte mensal necessário (arredondado para cima ao centavo) e que esse aporte, aplicado na calculadora de juros compostos, alcança a meta; se o valor inicial já basta, diz que nenhum aporte é necessário.
4. Equivalência de taxas: converte taxa mensal em anual e anual em mensal por capitalização composta (1% ao mês equivale a 12,6825% ao ano) e mostra também a taxa real descontada uma inflação informada, pela fórmula de Fisher.
5. Renda fixa: com valor aplicado, prazo em dias, taxa anual pré-fixada ou percentual do CDI (com o CDI anual informado) e a opção "isento de IR" (LCI/LCA), calcula rendimento bruto, IOF, IR, rendimento líquido e a taxa líquida anual equivalente.
6. O IR segue a tabela regressiva: 22,5% até 180 dias, 20% de 181 a 360, 17,5% de 361 a 720 e 15% acima de 720; o IOF segue a tabela regressiva de 96% (1 dia) a 3% (29 dias) do rendimento e é zero a partir de 30 dias; o IR incide sobre o rendimento já descontado o IOF.
7. À vista contra parcelado: com preço à vista, número de parcelas, valor da parcela, rendimento mensal do dinheiro parado e se a primeira parcela é paga no ato, calcula o valor presente das parcelas, diz qual opção é mais barata e por quanto, e a taxa de juros mensal embutida no parcelamento.
8. A taxa embutida é encontrada numericamente (bisseção entre -99% e 1000% ao mês) com erro menor que 0,0001 ponto percentual; quando o total parcelado é igual ao preço à vista a taxa é 0%; sem solução no intervalo, a tela diz que não foi possível calcular.
9. Cada calculadora valida os campos (valores maiores ou iguais a zero, prazos inteiros dentro dos limites, taxas de 0 a 100% ao mês ou 0 a 1000% ao ano) e mostra o erro junto ao campo com `role="alert"`, sem mostrar resultado.
10. Os resultados são recalculados ao enviar o formulário e anunciados numa região `aria-live`.
11. Nenhuma calculadora altera o estado salvo nem o `localStorage`.
12. A calculadora de juros compostos mostra um gráfico da evolução do saldo e do total aportado, com a tabela mês a mês como alternativa acessível.

## Fora do escopo

- Dias úteis (base 252) e feriados.
- Come-cotas, fundos, tributação de ações e previdência.
- Buscar CDI, Selic ou inflação na internet: o usuário digita as taxas.
- Salvar simulações.
