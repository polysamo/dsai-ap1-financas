# Desafios de economia (2026-10-04)

## O quê e por quê

Metas grandes desanimam; desafios curtos e verificáveis criam hábito. Esta parte cria a tela `/desafios` com três tipos de desafio: o "desafio das 52 semanas" (guardar um valor crescente a cada semana, marcado à mão), "dias sem gastar" em categorias escolhidas e "teto de gastos" numa categoria por um período. Os dois últimos são verificados automaticamente pelas transações, sem o usuário precisar marcar nada.

Modelo: o estado ganha `desafios?: Desafio[]`. Todo desafio tem `{ id, nome, tipo, inicio, criadoEm, abandonadoEm? }`; o das 52 semanas tem `valorBase`, `ordem: 'crescente' | 'decrescente'` e `semanasFeitas: number[]`; o de dias sem gastar tem `dias` e `categoriaIds`; o de teto tem `categoriaId`, `dias` e `limite`. Dados antigos sem a chave carregam com lista vazia. As regras ficam em `src/domain/desafios.ts`.

## Critérios de aceitação

1. Criar exige nome (1 a 60 caracteres) e data de início válida; 52 semanas exige valor base maior que zero; dias sem gastar exige de 1 a 365 dias e ao menos uma categoria de despesa; teto exige categoria de despesa, de 1 a 365 dias e limite maior que zero. Erros aparecem junto ao campo.
2. Nas 52 semanas, a semana `n` vale `n × valorBase` na ordem crescente e `(53 − n) × valorBase` na decrescente; o total do desafio é `1378 × valorBase`.
3. Marcar e desmarcar uma semana atualiza o valor guardado, o restante, o percentual e a quantidade de semanas feitas; a semana esperada para hoje é a que contém a data (semana 1 começa no início) e aparece destacada.
4. Dias sem gastar: o período vai do início até início + dias − 1; uma despesa em qualquer das categorias (ou em subcategorias delas) dentro do período quebra o desafio. A tela lista as despesas que quebraram.
5. A situação dos desafios automáticos é "Em andamento" (período ainda aberto e sem quebra), "Concluído" (período encerrado sem quebra), "Não cumprido" (houve quebra) ou "Ainda não começou"; os dias limpos são contados até hoje ou até o fim, sem passar do fim.
6. Teto de gastos: soma as despesas da categoria (com subcategorias) no período; mostra gasto, limite, restante e o gasto diário que ainda cabe até o fim; passou do limite, "Não cumprido"; período encerrado dentro do limite, "Concluído".
7. As 52 semanas ficam "Concluído" com todas as semanas marcadas; senão, "Em andamento".
8. Abandonar um desafio pede confirmação, grava `abandonadoEm` e o move para "Encerrados"; abandonados aparecem com a situação "Abandonado". Excluir pede confirmação.
9. A lista separa "Ativos" de "Encerrados" (concluídos, não cumpridos e abandonados), e cada cartão mostra a situação em texto e uma barra de progresso.
10. A tela aparece na navegação (grupo Planejamento, rótulo "Desafios"); sem desafios, mostra um estado vazio com os três tipos explicados.
11. Os desafios não criam nem alteram transações; dados salvos sem `desafios` carregam sem erro.

## Fora do escopo

- Ligar o desafio das 52 semanas a uma meta ou a transferências reais.
- Desafios em grupo e ranking.
- Notificações e lembretes semanais.
- Outros tipos de desafio.
