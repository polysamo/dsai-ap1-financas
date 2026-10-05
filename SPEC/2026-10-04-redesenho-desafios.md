# Redesenho: Desafios de economia (2026-10-04)

## O quê e por quê

A tela de desafios mostra o resultado das ações num alerta único e a situação de cada desafio só numa palavra solta. Esta parte a refaz com o kit de página (`2026-10-04-redesenho-base.md`): descrição, notificações com "Desfazer", selos de situação, atalho `n` e estado vazio com ação. As regras da spec `2026-10-04-desafios-de-economia.md` não mudam.

## Critérios de aceitação

1. O cabeçalho tem a descrição "Metas curtas para criar o hábito de economizar: guarde semana a semana, passe dias sem gastar ou segure o teto de uma categoria." e o botão "Novo desafio".
2. "Novo desafio" e a tecla `n` levam o foco ao campo "Tipo de desafio" do formulário.
3. Criar um desafio mostra "Desafio criado. Boa sorte!" com "Desfazer", que remove o desafio.
4. Marcar uma semana do desafio das 52 semanas mostra "Semana <n> marcada: <valor> guardados." e desmarcar mostra "Semana <n> desmarcada.", ambas com "Desfazer" que restaura a marcação.
5. Abandonar (com confirmação) mostra "Desafio abandonado." e excluir mostra "Desafio excluído.", ambas com "Desfazer".
6. Erros aparecem como notificação `role="alert"` que não some sozinha; o alerta único do topo deixa de existir.
7. A situação de cada desafio é um selo em texto ("Em andamento", "Concluído", "Não cumprido", "Abandonado" ou "Ainda não começou") com tom por situação.
8. A barra de progresso do desafio vem da biblioteca (`ProgressBar`) e a do teto de gastos mostra o estado "Atenção" e "Estourado" em texto.
9. Sem desafios, o estado vazio traz o botão "Criar meu primeiro desafio", que leva o foco ao formulário.
10. As seções "Ativos" e "Encerrados" e a ordenação não mudam.
11. Os testes cobrem descrição, foco por botão e por `n`, cada notificação com desfazer, erro, selos e estado vazio.

## Fora do escopo

- Novos tipos de desafio.
- Lembretes semanais.
