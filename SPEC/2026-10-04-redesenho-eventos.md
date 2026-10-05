# Redesenho: Eventos e viagens (2026-10-04)

## O quê e por quê

A tela de eventos mostra o resultado das ações num alerta único e a situação do orçamento só dentro do detalhe. Esta parte a refaz com o kit de página (`2026-10-04-redesenho-base.md`): descrição, notificações com "Desfazer", selos de situação em cada evento da lista, atalho `n` que leva ao formulário e estado vazio com ação. As regras da spec `2026-10-04-eventos-e-viagens.md` não mudam.

## Critérios de aceitação

1. O cabeçalho tem a descrição "Acompanhe viagens, festas e reformas: toda despesa com a tag do evento conta no orçamento dele." e o botão "Novo evento".
2. "Novo evento" e a tecla `n` levam o foco ao campo "Nome do evento".
3. Criar mostra "Evento criado." e editar mostra "Evento atualizado.", ambas com "Desfazer".
4. Excluir (com a confirmação existente) mostra "Evento excluído. As transações e as tags continuam como estavam." com "Desfazer".
5. Etiquetar as despesas do período mostra a mensagem de lote (ex.: "2 transações etiquetadas.") com "Desfazer" que remove a tag de todas de uma vez.
6. Erros aparecem como notificação `role="alert"` que não some sozinha; o alerta único do topo deixa de existir.
7. Cada evento da lista mostra um selo com a situação em texto ("Dentro do orçamento", "Atenção" ou "Estourado") em tom de sucesso, aviso ou perigo.
8. O detalhe mostra o mesmo selo ao lado do percentual, e o texto de situação do resumo continua igual.
9. Sem eventos, o estado vazio traz o botão "Criar meu primeiro evento", que leva o foco ao formulário.
10. A seleção de um evento na lista continua marcando o item com `aria-pressed` e os números do detalhe não mudam.
11. Os testes cobrem descrição, foco por botão e por `n`, cada notificação com desfazer, erro, selos e estado vazio.

## Fora do escopo

- Ordenar ou filtrar a lista de eventos.
- Anexar comprovantes ou fotos.
