# Independência financeira

## O quê e por quê

Saber quanto é preciso acumular para viver de renda, e em quanto tempo, é a pergunta que liga todos os outros módulos do app (investimentos, orçamento, metas). Esta parte acrescenta um simulador em `/independencia` (rótulo "Independência") que parte dos dados que o app já tem e deixa o usuário editar cada premissa.

Entradas: patrimônio investido atual (sugerido pela carteira de investimentos), aporte mensal (sugerido pela média de resultado, receitas menos despesas, dos meses-base da projeção, nunca negativa), retorno real anual em % (já descontada a inflação), gasto mensal desejado na independência (sugerido pela média de despesas dos mesmos meses), taxa de retirada anual em % e, opcionalmente, idade atual e idade alvo.

Regras de cálculo, todas em centavos inteiros:

- Patrimônio-alvo = gasto mensal × 12 ÷ taxa de retirada, arredondado ao centavo.
- Taxa mensal equivalente = (1 + retorno anual)^(1/12) − 1, calculada uma vez e guardada como inteiro em partes por bilhão. Cada mês: juros = saldo × taxa ÷ 10^9 (aritmética inteira, arredondando metade para cima), depois soma-se o aporte. Não há acúmulo de erro de ponto flutuante.
- A simulação para no primeiro mês em que o patrimônio chega ao alvo, ou em 100 anos (1.200 meses), quando o alvo é declarado inalcançável.
- Cenários: pessimista (retorno − 2 p.p.), base e otimista (+ 2 p.p.). Sensibilidade: aporte +10%, +25% e +50%.
- Cenários nomeados ficam em `cenariosIndependencia` no estado (no máximo 5, nomes únicos de até 40 caracteres) e guardam só as premissas; os resultados são recalculados na exibição.

Tipos e funções ficam em `src/domain/independencia.ts`; a tela em `src/pages/IndependenciaPage.tsx` com componentes em `src/components/independencia/`, estilizados com CSS puro e as variáveis de `src/styles/tokens.css`.

## Critérios de aceitação

1. O alvo é gasto anual ÷ taxa de retirada: gasto de R$ 3.000,00 por mês com retirada de 4% resulta em R$ 900.000,00.
2. Com retorno 0%, patrimônio zero e aporte de R$ 1.000,00, o prazo para R$ 900.000,00 é de exatamente 900 meses (75 anos); com patrimônio já igual ou acima do alvo o prazo é 0 mês e a tela diz que a independência já foi atingida.
3. Com retorno de 6% ao ano, a taxa mensal inteira é 4.867.551 partes por bilhão e um mês sobre R$ 10.000,00 rende R$ 48,68 (4.868 centavos); a simulação em centavos é reproduzível: mesmos dados, mesmo resultado, sem frações de centavo.
4. Quando o alvo não é atingido em 100 anos (por exemplo, aporte zero e patrimônio abaixo do alvo, ou retorno insuficiente), a tela mostra a mensagem "Não é alcançável em 100 anos com estas premissas" e nenhuma data.
5. O resultado mostra o prazo em anos e meses e a data estimada (mês e ano, a partir de hoje); com idade atual informada mostra a idade na independência e, com idade alvo, se está no prazo e o aporte mensal necessário para chegar na idade alvo.
6. A tabela anual lista, por ano, patrimônio final, total aportado e rendimento acumulado, com o último ano parcial incluído; o gráfico Recharts tem rótulo acessível e a mesma série aparece numa tabela alternativa ("Ver como tabela").
7. Os cenários pessimista, base e otimista aparecem lado a lado com retorno, prazo e data; um retorno maior nunca resulta em prazo maior.
8. A sensibilidade mostra o prazo com aporte +10%, +25% e +50% e quantos meses cada um antecipa em relação ao aporte atual.
9. Cada campo é validado junto a ele: patrimônio e aporte não negativos, gasto maior que zero, retorno entre −5% e 30%, taxa de retirada entre 0,1% e 20%, idades inteiras de 0 a 120, idade alvo maior que a atual e só aceita com a idade atual; com campo inválido o resultado não é exibido.
10. As sugestões vêm dos dados do app (patrimônio da carteira, médias dos meses-base) e o usuário pode editar; sem dados o campo parte vazio ou em zero e há dica explicando.
11. É possível salvar o cenário atual com nome (obrigatório, até 40 caracteres, único sem diferenciar maiúsculas); o sexto cenário é recusado com mensagem; os cenários persistem no localStorage em `cenariosIndependencia`.
12. Cenários salvos podem ser carregados no formulário e excluídos após confirmação; a tabela de comparação mostra alvo, prazo e data de cada um lado a lado, e sem nenhum cenário mostra estado vazio.
13. Dados salvos sem a chave `cenariosIndependencia` carregam sem erro com lista vazia, sem mudança de versão do esquema.
14. A navegação principal tem o item "Independência" que leva a `/independencia`.

## Fora do escopo

- Inflação explícita, imposto sobre rendimentos e sequência de retornos (simulação de Monte Carlo).
- Aposentadoria pública (INSS), previdência privada e renda de outras fontes.
- Variação do gasto ou do aporte ao longo do tempo (reajustes, filhos, mudança de carreira).
- Importar ou exportar cenários separadamente do backup geral.
