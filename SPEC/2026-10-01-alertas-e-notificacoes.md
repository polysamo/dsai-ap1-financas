# Alertas e notificações

## O quê e por quê

Os sinais de que algo pede atenção estão espalhados: orçamento que estourou, fatura que vence, conta a pagar atrasada, saldo baixo. Esta parte reúne tudo numa **central de alertas** (rota `/alertas`, rótulo "Alertas"), calculada por funções puras a partir do estado e da data de hoje. Nada é gravado por alerta: eles são recalculados a cada abertura, então somem sozinhos quando o problema é resolvido.

Cada alerta tem `id` estável (o mesmo problema gera sempre o mesmo id), tipo, severidade (`critico`, `atencao` ou `info`), título, descrição e link para a tela relacionada. Tipos: orçamento do mês estourado ou a partir de 80% do limite; fatura de cartão fechando ou vencendo nos próximos N dias, ou vencida e não paga; lançamento agendado vencido ou vencendo em N dias; saldo de conta abaixo de um mínimo; meta ativa com prazo em N dias (ou vencido) e abaixo do ritmo; projeção de saldo que fica negativa.

O estado ganha `preferenciasAlertas: { limiares, dispensados }`. `limiares` guarda os dias de antecedência (1 a 30, padrão 7), o saldo mínimo (centavos, padrão 0) e quais tipos estão ligados (todos por padrão). `dispensados` guarda `{ id, ate? }`: sem `ate` o alerta fica dispensado de vez; com `ate` ele volta a aparecer nessa data. Dados antigos sem a chave recebem o valor padrão. O componente `ContadorAlertas` mostra a quantidade de alertas visíveis com link para a central e pode ser usado em qualquer tela; esta parte não altera o Layout.

Esta spec se apoia em [orçamento](2026-10-01-orcamento.md), [cartões e faturas](2026-10-01-cartoes-e-faturas.md), [calendário financeiro](2026-10-01-calendario-financeiro.md), [metas](2026-10-01-metas.md), [contas](2026-10-01-contas.md) e [dashboard e projeção](2026-10-01-dashboard-e-projecao-v2.md), e cumpre o que cartões deixou como lembretes fora do escopo.

## Critérios de aceitação

10. O cálculo de alertas é feito por funções puras (estado e data de hoje entram, lista sai) e cobre os seis tipos: orçamento (estourado é crítico, de 80% a 100% é atenção), fatura (vencida e não paga é crítica; vencendo ou fechando dentro de N dias gera atenção ou info), agendamento (vencido de despesa é crítico; vencendo em N dias é atenção), saldo abaixo do mínimo (negativo é crítico), meta (prazo vencido é crítico; prazo em até N dias e abaixo do ritmo é atenção) e projeção negativa. Cada alerta traz id estável, severidade, título, descrição e link para a tela relacionada, e a lista sai ordenada por severidade.
11. A central `/alertas` lista os alertas visíveis com a severidade escrita em texto (não só em cor), título, descrição e link "Ver detalhes". O filtro por severidade (Todos, Crítico, Atenção, Info) mostra a contagem de cada opção e indica qual está ativo. Sem nenhum alerta, mostra o estado vazio "Tudo em dia"; com filtro sem resultados, uma mensagem própria.
12. O usuário pode adiar um alerta até uma data futura válida (data passada ou inválida é recusada junto ao campo) ou dispensá-lo de vez, este último com confirmação. O alerta adiado volta na data escolhida; o dispensado de vez só volta se for restaurado. Uma seção "Dispensados" lista os alertas dispensados que ainda existem, com ação "Restaurar".
13. O usuário configura os limiares: dias de antecedência (inteiro de 1 a 30), saldo mínimo (valor não negativo) e quais tipos de alerta ficam ligados. Valores inválidos são recusados junto ao campo; tipos desligados não geram alertas. As preferências persistem em `preferenciasAlertas` e dados salvos sem essa chave carregam com os valores padrão.
14. O componente reutilizável `ContadorAlertas` mostra "N alertas" (ou "Sem alertas") com link para `/alertas`, descreve em texto quantos são críticos e ignora alertas adiados ou dispensados. O Layout não é alterado; o item "Alertas" entra na navegação principal.

## Fora do escopo

- Notificações do navegador, push, e-mail ou SMS.
- Alertas em segundo plano com o app fechado.
- Histórico de alertas já resolvidos.
- Limiares diferentes por conta, cartão ou categoria.
- Regras de alerta definidas pelo usuário.
