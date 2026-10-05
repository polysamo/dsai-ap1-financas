# Lista de desejos (2026-10-04)

## O quê e por quê

Compras por impulso desequilibram o orçamento. Esta parte cria a tela `/desejos`: o usuário anota o que quer comprar, com preço, prioridade e um período de espera (a "regra dos 30 dias"), e o app responde "posso comprar?" olhando os dados reais: a reserva que sobraria, o orçamento da categoria no mês e quanto tempo de sobra mensal o item custa. Ao comprar, o item vira uma transação; ao desistir, o valor entra na "economia por desistência".

Modelo: o estado ganha `desejos?: Desejo[]` (`{ id, nome, preco, prioridade: 'alta' | 'media' | 'baixa', categoriaId, criadoEm: DataISO, esperarAte: DataISO, situacao: 'ativo' | 'comprado' | 'desistido', concluidoEm?, transacaoId? }`). Dados antigos sem a chave carregam com lista vazia. As regras ficam em `src/domain/desejos.ts`; a reserva líquida e as médias mensais passam a ser exportadas por `src/domain/saude.ts` e reutilizadas aqui.

## Critérios de aceitação

1. O cadastro pede nome (1 a 60 caracteres), preço maior que zero, prioridade, categoria de despesa ativa e período de espera (0, 7, 30 ou 90 dias, padrão 30); `esperarAte` é a data de cadastro mais o período. Erros aparecem junto ao campo.
2. Itens ativos são listados por prioridade (alta, média, baixa) e, dentro dela, do mais antigo para o mais novo; a tela mostra o total dos ativos.
3. A análise de cada item ativo tem quatro verificações, cada uma com resultado em texto: espera cumprida (hoje ≥ `esperarAte`, ou quantos dias faltam); reserva depois da compra (saldo das contas líquidas menos o preço, em meses de despesa média, aprovada a partir de 3 meses); orçamento da categoria no mês atual (aprovado se o restante cobre o preço; "sem limite" não reprova); e sobra mensal (preço dividido pelo resultado médio mensal, em meses; reprovada se o resultado médio não é positivo).
4. O veredito é "Pode comprar" quando todas as verificações passam, "Espere mais N dias" quando só a espera falta e "Ainda não" nos demais casos, sempre em texto.
5. "Comprei" pede a conta (ativa) e a data, cria uma despesa com o nome, o preço e a categoria do item, marca o item como comprado com `transacaoId` e `concluidoEm`; tudo numa única operação do histórico.
6. "Desisti" marca o item como desistido com `concluidoEm`, sem criar transação; a tela mostra a "Economia por desistência", soma dos preços dos desistidos.
7. Itens comprados e desistidos ficam numa seção recolhida "Concluídos", com a situação em texto, e podem ser excluídos; excluir um item comprado não exclui a transação.
8. "Criar meta" cria uma meta de poupança com o nome e o preço do item, sem prazo, e avisa; o item continua na lista.
9. Um item ativo pode ser editado (nome, preço, prioridade, categoria) e excluído com confirmação.
10. Dados salvos sem `desejos` carregam sem erro, com a lista vazia; os desejos sobrevivem a recarregar a página.
11. A tela aparece na navegação (grupo Planejamento, rótulo "Desejos") e, sem itens, mostra um estado vazio explicando a regra dos 30 dias.
12. `reservaLiquida` e `mediasMensais` de `saude.ts` são as mesmas usadas pelo indicador de reserva de emergência, sem cálculo duplicado.

## Fora do escopo

- Acompanhar o preço do item em lojas, links e imagens.
- Parcelar a compra ou lançá-la no cartão em parcelas.
- Notificar quando a espera termina.
- Desejos compartilhados entre pessoas.
