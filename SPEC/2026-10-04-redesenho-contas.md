# Redesenho: Contas (2026-10-04)

## O quê e por quê

A tela de Contas mostra erros de arquivar ou excluir num alerta fixo no topo e não avisa quando uma ação deu certo. Esta parte a refaz com o kit de página (`2026-10-04-redesenho-base.md`): descrição do que a tela faz, ações como notificações com "Desfazer", o selo de situação em cada conta, atalho `n` para criar e confirmação em ações destrutivas. As regras de negócio da spec `2026-10-01-contas.md` não mudam.

## Critérios de aceitação

1. O cabeçalho tem o título "Contas", a descrição "Onde seu dinheiro está: bancos, carteira, cartões e investimentos. O saldo é sempre calculado pelas transações." e o botão "Nova conta".
2. Criar uma conta mostra a notificação "Conta criada." com o botão "Desfazer"; desfazer remove a conta.
3. Editar mostra "Conta atualizada." com "Desfazer"; arquivar mostra "Conta arquivada." e reativar mostra "Conta reativada.", ambas com "Desfazer".
4. Excluir continua pedindo confirmação ("Excluir conta?"); depois de confirmar aparece "Conta excluída." com "Desfazer", que traz a conta de volta.
5. Erros de arquivar, excluir ou reativar aparecem como notificação de erro (`role="alert"`) que não some sozinha; o alerta fixo do topo deixa de existir.
6. Cada conta mostra o tipo e, quando arquivada, o selo "Arquivada" em texto; contas ativas de cartão mostram o selo "Cartão".
7. A tecla `n` abre o painel "Nova conta"; com o painel aberto ou dentro de um campo ela não faz nada.
8. Sem contas, o estado vazio mostra a ilustração, o texto explicativo e o botão "Crie sua primeira conta", que abre o painel de criação.
9. O saldo total e o detalhe de contas e cartões continuam iguais, e o valor de cada conta respeita a opção de ocultar valores.
10. Os testes cobrem descrição, cada notificação com desfazer, o erro por notificação, selos, atalho `n` e estado vazio.

## Fora do escopo

- Reordenar contas e ícones ou cores por conta.
- Importar saldo inicial de arquivo.
- Editar várias contas de uma vez.
