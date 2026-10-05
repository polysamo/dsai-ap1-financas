# Redesenho: Beneficiários (2026-10-04)

## O quê e por quê

A tela de beneficiários usa uma lista própria sem barra de filtros padrão, mostra "Nome salvo." num alerta fixo e não oferece desfazer para mesclas. Esta parte a refaz com o kit de página (`2026-10-04-redesenho-base.md`): descrição, a barra de filtros comum com resumo, notificações com "Desfazer" e um selo para beneficiários que receberam mesclas. As regras da spec `2026-10-04-beneficiarios.md` não mudam.

## Critérios de aceitação

1. O cabeçalho tem a descrição "Para quem vai o seu dinheiro: despesas agrupadas pela descrição, com renomear e mesclar."
2. O período e a busca por nome ficam numa `FilterBar` (`role="search"`, nome "Filtros") com resumo `aria-live` "N beneficiários".
3. "Limpar filtros" aparece só quando há busca por nome ou período diferente de "Últimos 12 meses" e volta aos padrões.
4. Salvar o nome mostra "Nome salvo." com "Desfazer", que volta ao nome anterior.
5. Mesclar mostra "<nome> foi mesclado." com "Desfazer", que separa de novo os beneficiários; desfazer uma mescla mostra "Mescla desfeita." com "Desfazer".
6. Erros (por exemplo mesclar nele mesmo) aparecem junto ao campo e como notificação `role="alert"`; o alerta fixo deixa de existir.
7. Beneficiários que receberam mesclas mostram o selo "N mescladas" na lista, em texto.
8. Cada item da lista mostra o selo "Maior gasto" no primeiro lugar da lista quando o período tem mais de um beneficiário.
9. Sem despesas no período, o estado vazio continua com a explicação; com busca sem resultado, ele sugere limpar os filtros e traz o botão "Limpar filtros".
10. Os números do detalhe, a série mensal e o link "Ver transações" não mudam.
11. Os testes cobrem descrição, barra de filtros e limpar, cada notificação com desfazer, selos e estados vazios.

## Fora do escopo

- Agrupar por semelhança de texto.
- Receitas por pagador.
