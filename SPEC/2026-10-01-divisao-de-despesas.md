# Divisão de despesas

## O quê e por quê

Gastos em grupo (uma viagem, a casa dividida) hoje acabam em planilha ou em conversa de mensageiro, e ninguém sabe ao certo quem deve quanto a quem. Esta parte traz um racha de despesas no estilo Splitwise, totalmente local: o usuário cria **grupos** com 2 a 12 participantes (só nomes), lança as despesas do grupo dizendo quem pagou e como dividir, e o app mostra o **saldo** de cada pessoa e o menor conjunto de transferências que zera as dívidas.

Modelo (chave nova `gruposDivisao` no estado, tipos em `src/domain/divisao.ts`):

- Grupo: `{ id, nome, participantes: {id, nome}[], despesas, acertos, criadoEm }`.
- Despesa: `{ id, descricao, valor, data, pagadorId, tipo, partes: {participanteId, peso}[], criadaEm }`. O `tipo` é `igual`, `percentual`, `exata` ou `cotas`. O `peso` é 1 (igual), centésimos de ponto percentual (percentual, 10000 = 100%), centavos (exata) ou número de cotas (cotas).
- Acerto: pagamento efetivado entre participantes, `{ id, deId, paraId, valor, data, criadoEm }`.

Regras: a divisão é exata em centavos; nas divisões proporcionais cada parte é o piso do valor proporcional e os centavos que sobram vão, de 1 em 1, aos primeiros participantes na ordem do grupo. O saldo de um participante é `pagou − deve + acertos enviados − acertos recebidos`; a soma dos saldos do grupo é sempre zero. As sugestões usam o algoritmo guloso: o maior devedor paga ao maior credor até zerar um dos dois. Nada aqui gera transações do app nem altera saldos de contas.

## Critérios de aceitação

1. Criar ou editar grupo exige nome (1 a 60 caracteres) e de 2 a 12 participantes com nomes não vazios e distintos (sem diferenciar maiúsculas); dados inválidos são recusados com mensagem junto ao campo. Na edição é possível renomear e acrescentar participantes, mas remover quem consta em despesa ou acerto é recusado.
2. Sem grupos, a tela Divisão mostra estado vazio com o formulário de criação. A rota é `/divisao`, o item de navegação se chama "Divisão", `gruposDivisao` é gravada no localStorage e dados salvos sem essa chave carregam com lista vazia, sem alterar contas nem transações.
3. Uma despesa exige descrição (1 a 80 caracteres), valor maior que zero, data válida e pagador do grupo; valores inválidos são recusados junto ao campo.
4. Divisão igual: R$ 100,00 entre 3 pessoas resulta em 33,34, 33,33 e 33,33 (o resto vai para os primeiros); participantes desmarcados não entram na divisão; a soma das partes é sempre o valor.
5. Divisão por percentuais: só é aceita se somar exatamente 100%; R$ 100,01 com 50%, 30% e 20% resulta em 50,01, 30,00 e 20,00; senão a mensagem informa o total informado.
6. Divisão por valores exatos: só é aceita se a soma for igual ao valor da despesa; a mensagem informa a soma e o valor esperado.
7. Divisão por cotas: proporcional às cotas inteiras informadas (R$ 10,00 em cotas 1, 1 e 1 dá 3,34, 3,33 e 3,33; cotas 2 e 1 sobre R$ 10,00 dá 6,67 e 3,33); participantes com cotas vazias ou zero ficam de fora.
8. O saldo de cada participante mostra pagou, deve e saldo, com texto "recebe" ou "deve" além da cor; a soma dos saldos é zero e, sem despesas, todos aparecem como quitados.
9. "Acertar contas" lista as transferências sugeridas pelo algoritmo guloso, no máximo participantes − 1; A pagou R$ 90,00 dividido igualmente entre A, B e C gera "B paga R$ 30,00 a A" e "C paga R$ 30,00 a A"; com saldos zerados mostra "Todas as contas estão acertadas".
10. Registrar um acerto exige valor maior que zero, data válida e pagador diferente do recebedor, tanto pelo botão de cada sugestão quanto pelo formulário manual; ele altera os saldos e some das sugestões quando quita a dívida. Excluir um acerto pede confirmação.
11. O histórico reúne despesas e acertos, do mais recente para o mais antigo, e filtra por texto, participante, tipo (despesas ou acertos) e período; sem resultados mostra estado vazio com opção de limpar filtros.
12. Editar uma despesa reabre o formulário preenchido e recalcula saldos; excluir uma despesa pede confirmação e, ao cancelar, nada muda.
13. O resumo do grupo mostra total gasto, número de despesas, total acertado e, por participante, quanto pagou e quanto deve.
14. A exportação CSV do grupo usa `;` como separador, BOM UTF-8, vírgula decimal e `\r\n`, e inclui despesas (com a parte de cada participante), acertos e saldos; o arquivo se chama `divisao-<nome do grupo>.csv`.

## Fora do escopo

- Sincronização entre dispositivos, contas de usuários, convites ou qualquer backend.
- Geração de transações do app, vínculo com contas ou alteração de saldos de contas.
- Moedas diferentes, conversão cambial e despesas recorrentes.
- Anexos de comprovantes, comentários e notificações.
- Pagamentos reais (Pix, boleto): o acerto é apenas um registro.
