# Redesenho: Lista de desejos (2026-10-04)

## O quê e por quê

A tela de desejos mostra o resultado de cada ação num alerta único que é trocado a cada clique, sem como desfazer e sem destacar a prioridade de cada item. Esta parte a refaz com o kit de página (`2026-10-04-redesenho-base.md`): descrição, notificações com "Desfazer", selos de prioridade e de veredito, atalho `n` que leva ao formulário e estado vazio com chamada para ação. As regras da spec `2026-10-04-lista-de-desejos.md` (cadastro, análise, compra, desistência, meta) não mudam.

## Critérios de aceitação

1. O cabeçalho tem a descrição "Anote o que quer comprar, espere e veja se a compra cabe na reserva, no orçamento e na sobra do mês." e o botão "Novo desejo".
2. "Novo desejo" e a tecla `n` levam o foco ao campo "O que você quer comprar".
3. Anotar um desejo mostra "Desejo anotado." com "Desfazer"; editar mostra "Desejo atualizado." com "Desfazer".
4. "Comprei" mostra "Compra de <nome> registrada como despesa." com "Desfazer", que remove a despesa criada e devolve o item à lista de ativos numa só ação.
5. "Desisti" mostra "Você desistiu de <nome>: <valor> economizados." com "Desfazer"; "Criar meta" mostra "Meta "<nome>" criada em Metas." com "Desfazer".
6. Excluir (com a confirmação existente) mostra "Desejo excluído." com "Desfazer".
7. Erros de qualquer ação aparecem como notificação `role="alert"` que não some sozinha; o alerta único do topo deixa de existir.
8. Cada item mostra a prioridade num selo em texto ("Prioridade alta", "média" ou "baixa") com tom diferente por prioridade.
9. O veredito do item ("Pode comprar", "Espere mais N dias", "Ainda não") aparece num selo com tom de sucesso, aviso e perigo, além do texto, e as quatro verificações continuam listadas.
10. Sem desejos, o estado vazio traz o botão "Anotar meu primeiro desejo", que leva o foco ao formulário.
11. Os totais "Total dos desejos ativos" e "Economia por desistência" continuam iguais.
12. Os testes cobrem descrição, foco por botão e por `n`, cada notificação com desfazer, erro, selos e estado vazio.

## Fora do escopo

- Editar o período de espera depois de anotado.
- Arrastar para reordenar a prioridade.
- Lembrete quando a espera acaba.
