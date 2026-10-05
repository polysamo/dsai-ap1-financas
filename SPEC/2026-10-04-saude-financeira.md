# Saúde financeira (2026-10-04)

## O quê e por quê

O app mostra muitos números, mas não responde "estou indo bem?". Esta parte cria a tela `/saude` com seis indicadores clássicos de finanças pessoais, cada um com valor, faixa (ótimo, bom, atenção, crítico), pontos de 0 a 100 e uma explicação, uma nota geral e recomendações concretas, com valores em reais, para os indicadores que estão mal.

Tudo é calculado por funções puras em `src/domain/saude.ts`, a partir do estado e da data de hoje, sem gravar nada. Os meses de referência são os mesmos da projeção: até 3 meses completos antes do mês atual (`mesesBase`). Valores em centavos inteiros; percentuais com uma casa.

## Critérios de aceitação

1. Taxa de poupança: (receitas − despesas) ÷ receitas dos meses de referência. Pontos: 100 a partir de 20%, 75 de 10% a 20%, 50 de 0% a 10%, 0 abaixo de 0%. Sem receitas no período, o indicador fica "sem dados".
2. Reserva de emergência: saldo das contas ativas do tipo corrente, poupança e dinheiro dividido pela despesa média mensal, em meses com uma casa. Pontos: 100 a partir de 6 meses, 75 de 3 a 6, 40 de 1 a 3, 0 abaixo de 1. Sem despesas, "sem dados".
3. Comprometimento com dívidas: soma das parcelas (tabela efetiva) das dívidas do tipo "devo" com vencimento no mês atual, dividida pela receita média mensal. Pontos: 100 até 15%, 70 até 30%, 35 até 40%, 0 acima. Sem dívidas "devo" em aberto o indicador vale 100 ("sem dívidas"); com dívidas e sem receita, "sem dados".
4. Uso do limite dos cartões: soma do usado dividida pela soma dos limites dos cartões ativos. Pontos: 100 até 30%, 70 até 50%, 35 até 80%, 0 acima. Sem cartões, "sem dados".
5. Orçamento respeitado: no último mês completo, percentual das categorias com limite cujo gasto (com subcategorias) ficou dentro do limite. Pontos: 100 com 100%, 75 a partir de 80%, 40 a partir de 50%, 0 abaixo. Sem limites naquele mês, "sem dados".
6. Tendência das despesas: variação da despesa média dos meses de referência sobre a média dos 3 meses anteriores a eles. Pontos: 100 se caiu ou ficou igual, 70 até +10%, 35 até +25%, 0 acima. Sem 6 meses completos de histórico, "sem dados".
7. A faixa segue os pontos: 100 é "Ótimo", 70 a 99 "Bom", 35 a 69 "Atenção" e abaixo de 35 "Crítico"; a faixa aparece em texto, não só por cor.
8. A nota geral é a média dos pontos dos indicadores com dados, arredondada, com a classificação: 80 ou mais "Saudável", 60 a 79 "Estável", 40 a 59 "Precisa de atenção", abaixo de 40 "Crítica". Sem nenhum indicador com dados, a tela mostra um estado vazio explicando o que registrar.
9. Cada indicador em "Atenção" ou "Crítico" gera uma recomendação com o valor que falta para chegar à faixa "Ótimo": quanto a mais poupar por mês, quanto falta para 6 meses de reserva, quanto reduzir do cartão para usar até 30% do limite, quais categorias estouraram o orçamento e de quanto as despesas subiram.
10. A tela `/saude` aparece na navegação (grupo Visão geral, rótulo "Saúde financeira"), mostra a nota numa barra de progresso acessível (`role="meter"` com valor de 0 a 100) e um cartão por indicador com valor, faixa, pontos e uma frase explicando o cálculo.
11. O Dashboard mostra um cartão "Saúde financeira" com a nota e a classificação, com link para `/saude`; sem dados suficientes o cartão não aparece.
12. Nada é gravado: abrir a tela não altera o estado salvo.

## Fora do escopo

- Histórico da nota ao longo do tempo.
- Pesos diferentes por indicador ou faixas configuráveis.
- Comparação com médias da população.
- Investimentos e patrimônio na reserva de emergência (só contas de liquidez imediata).
