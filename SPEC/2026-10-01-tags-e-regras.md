# Tags e regras de categorização

## O quê e por quê

Categorizar à mão cada linha de um extrato importado é repetitivo. O app passa a ter regras simples ("se a descrição contém X, categoria Y") que sugerem a categoria na importação de CSV e podem ser aplicadas às transações já registradas. As transações também ganham tags livres, que cruzam categorias (por exemplo "viagem" ou "reembolsável") e servem de filtro na lista. Tudo continua local, no navegador.

Uma regra tem padrão de texto (contém, começa com ou igual), tipo (receita ou despesa), categoria de destino, tags opcionais e estado ativa/inativa. A prioridade é a ordem da lista: vale a primeira regra ativa que casar.

## Critérios de aceitação

1. Uma regra casa quando o padrão, comparado à descrição normalizada (sem acentos, caixa e espaços extras), satisfaz o modo escolhido (contém, começa com ou igual) e o tipo da transação é o da regra; regras inativas nunca casam.
2. Ao validar uma regra, o app recusa com mensagem por campo: padrão vazio ou acima de 60 caracteres, categoria inexistente, arquivada ou de tipo diferente do da regra, e tags inválidas.
3. As tags são normalizadas (espaços e caixa), sem repetição, com no máximo 5 por transação ou regra e 20 caracteres cada; vírgulas separam tags na digitação.
4. A tela Regras (rota `/regras`, item "Regras" no menu) lista as regras em ordem de prioridade, com estado vazio quando não há nenhuma, e permite criar e editar por formulário validado, com erros em `role="alert"`.
5. É possível reordenar (subir e descer), ativar/desativar e excluir regras; a ordem é persistida e, quando várias casam, vence a primeira regra ativa; o primeiro item não sobe e o último não desce.
6. Cada regra mostra uma pré-visualização de quantas transações existentes ela atingiria, segundo o escopo escolhido ("Somente em Outros" ou "Todas as categorias"), e a contagem se atualiza ao trocar o escopo.
7. "Aplicar às existentes" pede confirmação e, ao confirmar, troca a categoria das transações atingidas e soma as tags da regra às que já tinham, respeitando o máximo de 5; transações fora do escopo ou de outro tipo não mudam, e a tela informa quantas foram alteradas.
8. A transação aceita o campo opcional `tags`; o formulário de transação tem o campo "Tags" (separadas por vírgula), valida os limites com erro visível, e esvaziar o campo ao editar remove as tags; dados antigos sem `tags` ou sem `regras` continuam carregando.
9. A lista de transações exibe as tags de cada transação e oferece o filtro "Filtrar por tag" com as tags existentes, combinado aos demais filtros.
10. Na importação de CSV, a categoria sugerida vem da primeira regra ativa que casar; sem regra, vale o histórico da mesma descrição; sem histórico, "Outros". O usuário ainda pode trocar a categoria de cada linha.
11. As tags da regra que casou são gravadas nas transações importadas e aparecem na prévia; desfazer a importação continua removendo exatamente as transações criadas.
12. Uma regra cuja categoria foi arquivada ou excluída é ignorada na sugestão, na pré-visualização e na aplicação, sem erro, e nunca deixa transação sem categoria.

## Fora do escopo

- Expressões regulares, condições por valor, conta ou data, e regras com várias condições.
- Regras que criam categorias ou alteram descrição, valor ou conta.
- Aplicação automática de regras a transações digitadas manualmente.
- Renomear ou excluir uma tag em lote, e tags em orçamentos, metas ou relatórios.
- Importação e exportação de regras separadamente do backup geral.
- Desfazer a aplicação às existentes.
