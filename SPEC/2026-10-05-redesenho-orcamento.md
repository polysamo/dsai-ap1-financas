# Redesenho: Orçamento (2026-10-05)

## O quê e por quê

A tela de Orçamento já calcula limites e gastos por categoria, mas ainda usa alertas locais para resultados, não oferece desfazer e apresenta situações com estilos próprios. O redesenho aplica o kit de página, torna as ações reversíveis e mantém os cálculos existentes.

## Critérios de aceitação

1. O cabeçalho explica que a tela compara limites mensais e gastos por categoria.
2. A ação principal "Definir limite" e a tecla `n` abrem e focam o primeiro formulário de categoria sem limite.
3. O seletor de mês continua sincronizado com a URL e atualiza totais e categorias.
4. Definir ou editar um limite mostra notificação de sucesso com "Desfazer".
5. Copiar os limites do mês anterior mostra notificação com "Desfazer".
6. Remover um limite exige confirmação e mostra notificação com "Desfazer" depois de confirmar.
7. Erros aparecem junto ao campo e como notificação persistente com `role="alert"`; o alerta de erro fixo no topo deixa de existir.
8. As situações "Dentro do limite", "Atenção: perto do limite" e "Estourado" usam `Badge` com texto, sem depender só de cor.
9. O resumo de categorias estouradas permanece em texto e com semântica de alerta.
10. Sem categorias de despesa, o estado vazio oferece ação para ir a Transações.
11. Totais, percentuais, barras de progresso, restante e excedente não mudam.
12. Os testes cobrem cabeçalho e foco, feedback e desfazer, confirmação, selos, estado vazio e cálculos preservados.

## Fora do escopo

- Alterar a fórmula de consumo do orçamento.
- Criar categorias dentro desta tela.
- Mudar o comportamento do orçamento anual.
