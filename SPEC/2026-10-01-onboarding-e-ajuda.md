# Onboarding e ajuda

## O quê e por quê

Quem abre o app pela primeira vez vê várias telas e não sabe por onde começar. Esta parte acrescenta um **tour guiado** de primeiro uso, **atalhos de teclado** globais para quem navega muito e uma página de **Ajuda** com perguntas frequentes, tabela de atalhos e acesso ao tour.

A marca de "tour concluído" não faz parte do estado financeiro: fica numa chave própria do localStorage, `financas:onboarding`, para não alterar o esquema de dados nem entrar em exportações e backups. A leitura dessa chave tolera JSON inválido (nesse caso o tour é tratado como não concluído).

Atalhos: a sequência `g` seguida de uma letra navega (g d Dashboard, g t Transações, g c Contas, g o Orçamento, g m Metas, g i Importar CSV, g r Relatórios) e `?` abre a lista de atalhos. Eles ficam inativos enquanto o foco está em campo de edição ou quando há Ctrl, Alt ou Meta.

## Critérios de aceitação

1. No primeiro acesso (sem a chave `financas:onboarding`), o tour abre sozinho como diálogo modal (`role="dialog"`, `aria-modal`, rotulado pelo título), com o foco movido para dentro dele.
2. O tour tem 7 passos, nesta ordem: Contas, Transações, Orçamento, Metas, Importar CSV, Dashboard, Dados. Mostra o indicador "Passo X de 7".
3. "Próximo" e "Anterior" navegam entre os passos; "Anterior" fica desabilitado no primeiro passo e no último o "Próximo" vira "Concluir".
4. "Pular", "Concluir" e a tecla Esc fecham o tour e gravam `financas:onboarding` como concluído; ele não volta a abrir sozinho nas visitas seguintes.
5. A leitura de `financas:onboarding` tolera JSON inválido ou formato inesperado (tour não concluído, sem erro), e a gravação não toca na chave de estado do app.
6. A página `/ajuda` tem o botão "Rever o tour", que reabre o tour mesmo depois de concluído.
7. A FAQ tem pelo menos 10 perguntas em acordeão: cada pergunta é um botão com `aria-expanded` e `aria-controls` apontando para a resposta; abrir uma pergunta mostra a resposta e acionar de novo a oculta.
8. A busca por texto filtra as perguntas (pergunta e resposta, sem diferenciar maiúsculas e acentos) e, sem resultado, mostra um estado vazio com o termo buscado.
9. A página de Ajuda traz a tabela de atalhos com todos os atalhos acima, incluindo `?`.
10. A sequência `g` + letra navega para a rota correspondente; uma letra sem o `g` antes, ou uma letra desconhecida depois dele, não navega.
11. Os atalhos não disparam com o foco em input, textarea, select ou elemento contenteditable, nem com Ctrl, Alt ou Meta pressionados.
12. `?` abre um diálogo com a lista de atalhos, que fecha com Esc.
13. A navegação principal tem o item "Ajuda" apontando para `/ajuda`.
14. O tour não abre enquanto a flag estiver concluída, de modo que as telas existentes continuam testáveis sem ele.

## Fora do escopo

- Destacar elementos da tela por trás do tour (spotlight).
- Atalhos configuráveis pelo usuário e atalhos de ação (criar transação etc.).
- Sincronizar a flag do tour entre dispositivos.
- Ajuda contextual por tela e busca fora da FAQ.
