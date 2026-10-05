# Beneficiários (2026-10-04)

## O quê e por quê

As categorias dizem "em quê" o dinheiro foi gasto, mas não "com quem": quanto vai para o iFood, para o mesmo posto de gasolina, para a farmácia da esquina. Esta parte cria a tela `/beneficiarios`, que agrupa as despesas pela descrição normalizada, ordena por total gasto e mostra, para cada beneficiário, número de compras, ticket médio, última compra, categoria mais usada e intervalo médio entre compras. O usuário pode dar um nome melhor a um beneficiário e mesclar descrições diferentes que são o mesmo lugar ("UBER *TRIP" e "Uber do Brasil").

Modelo: o estado ganha `beneficiarios?: { nomes: Record<string, string>; mesclas: Record<string, string> }`, em que as chaves são descrições normalizadas: `nomes[chave]` é o nome exibido e `mesclas[origem] = destino` junta a origem ao destino. Dados antigos sem a chave carregam vazios. As regras ficam em `src/domain/beneficiarios.ts`; as transações nunca são alteradas.

## Critérios de aceitação

1. A chave de um beneficiário é a descrição sem acento, em minúsculas, sem números e sem símbolos, com espaços colapsados ("UBER *TRIP 8812" e "Uber Trip" têm a chave "uber trip"); despesas sem descrição ficam fora.
2. Só despesas entram; o período pode ser o mês atual, os últimos 3, 6 ou 12 meses (padrão 12, contando o mês atual) ou todo o histórico.
3. Cada beneficiário mostra total, quantidade, ticket médio (total ÷ quantidade, arredondado), data da última compra, categoria mais frequente (empate: a de maior valor) e intervalo médio em dias entre compras consecutivas (só com 2 ou mais compras em datas diferentes).
4. A lista vem do maior para o menor total; a tela mostra a participação de cada beneficiário no total de despesas do período e permite filtrar pelo nome.
5. O nome exibido é o nome dado pelo usuário ou, sem ele, a descrição original mais recente do grupo.
6. Renomear grava `nomes[chave]` com 1 a 60 caracteres; nome vazio volta ao nome automático.
7. Mesclar um beneficiário em outro grava `mesclas[origem] = destino`; a origem some da lista e seus valores passam ao destino. Mesclas encadeadas são seguidas até o fim, e mesclar um beneficiário nele mesmo (direta ou indiretamente) é recusado.
8. A lista de mesclas do destino aparece no detalhe, e cada uma pode ser desfeita, voltando a origem para a lista.
9. O detalhe de um beneficiário mostra o total mês a mês dos últimos 12 meses numa tabela e o link "Ver transações", que abre `/transacoes` filtrando pela descrição mais recente.
10. A tela aparece na navegação (grupo Visão geral, rótulo "Beneficiários"); sem despesas com descrição no período, mostra um estado vazio.
11. Renomear e mesclar não alteram nenhuma transação; dados salvos sem `beneficiarios` carregam sem erro.

## Fora do escopo

- Agrupamento aproximado por semelhança de texto (só a chave normalizada).
- Receitas por pagador.
- Cadastro de beneficiários sem transação, CNPJ, endereço ou mapa.
- Regras de categoria criadas a partir do beneficiário.
