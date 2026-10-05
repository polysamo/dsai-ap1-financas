# Redesenho: Dashboard (2026-10-05)

## O quê e por quê

O Dashboard já reúne saldo, mês, gráficos, orçamento, metas e projeção, mas não explica seu papel no cabeçalho e as recorrências ainda alteram dados sem confirmação nem feedback. O redesenho aplica o kit de página à visão mais usada, deixa alertas legíveis sem depender de cor e torna as ações de recorrência reversíveis.

## Critérios de aceitação

1. O cabeçalho descreve o Dashboard como uma visão do saldo, do mês, do orçamento, das metas e da projeção.
2. O cabeçalho oferece a ação principal "Nova transação", com destino `/transacoes`.
3. A tecla `n`, fora de campos editáveis, também leva à tela de transações.
4. O seletor de mês continua atualizando KPIs, gráficos e orçamento, preservando o saldo total atual.
5. Categorias de orçamento em atenção e estouradas usam `Badge` com os textos "Atenção" e "Estourado".
6. Sem limites de orçamento, o cartão oferece uma ação explícita "Definir limites" para o mês selecionado.
7. Sem metas ativas, o cartão oferece a ação "Criar meta".
8. Criar, editar e ativar ou desativar uma recorrência mostra notificação de sucesso com "Desfazer".
9. Excluir recorrência exige confirmação e, depois de confirmar, mostra notificação com "Desfazer".
10. Erros ao salvar recorrência aparecem junto ao campo e como notificação persistente com `role="alert"`; o alerta genérico dentro do formulário deixa de existir.
11. O estado inicial sem contas e transações mantém os primeiros passos e seus destinos.
12. KPIs, gráficos com tabela alternativa, saúde financeira, projeção e seus cálculos não mudam.
13. Os testes cobrem cabeçalho e atalho, selos e ações vazias, feedback das recorrências, confirmação e conteúdo preservado.

## Fora do escopo

- Reordenar ou personalizar cartões.
- Alterar fórmulas de saldo, orçamento, saúde ou projeção.
- Criar a transação dentro do Dashboard.
