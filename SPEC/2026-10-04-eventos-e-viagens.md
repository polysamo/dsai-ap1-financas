# Eventos e viagens (2026-10-04)

## O quê e por quê

Uma viagem, um casamento ou uma reforma têm orçamento próprio, que atravessa meses e categorias; o orçamento mensal não mostra "quanto já gastei na viagem". Esta parte cria a tela `/eventos`: cada evento tem nome, período, orçamento e uma tag, e o gasto real é a soma das despesas com essa tag. A tela mostra o consumo do orçamento, a quebra por categoria, a média diária, as maiores despesas e, para eventos em andamento, uma projeção do total.

Modelo: o estado ganha `eventos?: Evento[]` (`{ id, nome, inicio, fim, orcamento, tag, criadoEm }`). A tag é normalizada como as demais tags (minúsculas, até 20 caracteres) e é única entre os eventos. Dados antigos sem a chave carregam com lista vazia. As regras ficam em `src/domain/eventos.ts`.

## Critérios de aceitação

1. O cadastro pede nome (1 a 60 caracteres), data de início e de fim válidas (fim não anterior ao início), orçamento maior que zero e tag; a tag sugerida é o nome normalizado sem espaços (até 20 caracteres) e não pode repetir a de outro evento. Erros aparecem junto ao campo.
2. O gasto do evento é a soma das despesas com a tag, em qualquer data; receitas com a tag (reembolsos) são somadas à parte e abatidas no gasto líquido.
3. O resumo mostra orçamento, gasto líquido, restante (negativo se estourou) e percentual consumido; a situação aparece em texto: "Dentro do orçamento", "Atenção" (a partir de 80%) ou "Estourado".
4. A quebra por categoria soma as subcategorias no pai, ordena do maior para o menor e mostra o percentual de cada uma sobre o gasto.
5. A média diária é o gasto dividido pelos dias decorridos do evento (de início até hoje ou até o fim, o que vier antes, contando os dois extremos); antes do início, não há média.
6. Para evento em andamento, a projeção é a média diária vezes a duração total, e a tela diz se a projeção passa do orçamento; eventos encerrados mostram o total final.
7. As 5 maiores despesas do evento aparecem com data, descrição e valor.
8. "Etiquetar despesas do período" mostra quantas despesas entre início e fim ainda não têm a tag e, após confirmação, adiciona a tag a todas numa única operação; transações que já têm 5 tags são puladas e contadas na mensagem.
9. A lista de eventos separa "Em andamento e futuros" de "Encerrados" (fim antes de hoje) e mostra em cada um o período, o gasto e o percentual.
10. Editar um evento recalcula tudo; excluir pede confirmação e não altera as transações nem as tags delas.
11. A tela aparece na navegação (grupo Planejamento, rótulo "Eventos"); sem eventos, mostra um estado vazio explicando o uso da tag.
12. Dados salvos sem `eventos` carregam sem erro com a lista vazia.

## Fora do escopo

- Moeda estrangeira e câmbio.
- Dividir o evento entre pessoas (use a tela Divisão).
- Orçamento por categoria dentro do evento.
- Associar transações ao evento sem usar tag.
