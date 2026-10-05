# Subcategorias (2026-10-04)

## O quê e por quê

Com categorias planas, "Alimentação" mistura mercado, restaurante e delivery, e criar três categorias soltas perde a visão do total. Esta parte permite um nível de subcategoria: "Restaurantes" pode ficar dentro de "Alimentação". O orçamento e o relatório mensal somam as subcategorias na categoria pai. Era uma limitação conhecida citada no README.

Modelo: `Categoria` ganha `paiId?: string`. Só há um nível: uma subcategoria não pode ter filhas. Pai e filha têm o mesmo tipo. A unicidade de nome continua por tipo (como na spec de categorias e transações). Dados antigos não mudam: sem `paiId`, toda categoria é de primeiro nível. As regras ficam em `src/domain/subcategorias.ts`; criar, arquivar e excluir continuam em `src/domain/transacoes.ts`, ajustados para a hierarquia.

## Critérios de aceitação

1. Ao criar uma categoria pode-se escolher uma categoria pai do mesmo tipo, ativa e de primeiro nível; pai de outro tipo, arquivada, inexistente ou que já é subcategoria é recusado com erro no campo `paiId`.
2. Uma categoria existente pode ser movida para dentro de outra ou promovida a primeiro nível; uma categoria que tem subcategorias não pode virar subcategoria, e uma categoria não pode ser pai de si mesma.
3. Arquivar uma categoria pai arquiva também as subcategorias; reativar uma subcategoria cujo pai está arquivado é recusado com mensagem.
4. Excluir uma categoria que tem subcategorias é recusado com a mensagem "Mova ou exclua as subcategorias antes."; excluir uma subcategoria em uso continua exigindo a categoria de destino.
5. Em todas as listas de escolha de categoria (transação, agendamento, baixa, recorrência, regra, prévia de CSV e OFX, edição em lote), as subcategorias aparecem logo abaixo do pai, recuadas, e os pais e filhas ficam em ordem alfabética.
6. O nome completo de uma subcategoria é "Pai › Filha" e aparece na lista de transações e no orçamento.
7. No painel de categorias, cada pai lista suas subcategorias recuadas, e o formulário de edição permite renomear e trocar o pai.
8. No orçamento do mês, o gasto da linha do pai inclui o das subcategorias; a linha da subcategoria mostra só o próprio gasto.
9. Os totais do orçamento não contam o mesmo gasto duas vezes: o limite de uma subcategoria cujo pai tem limite não entra no total de limites, e o gasto de uma subcategoria conta como "com limite" se ela ou o pai tiverem limite.
10. No relatório mensal, a opção "Agrupar subcategorias" (ligada por padrão) soma as linhas das subcategorias na do pai e recalcula os percentuais; desligada, mostra cada subcategoria com o nome completo.
11. Uma categoria cujo `paiId` aponta para uma categoria que não existe mais é tratada como de primeiro nível em listas, nomes e somas.

## Fora do escopo

- Mais de um nível de hierarquia.
- Somar subcategorias no orçamento anual, nos alertas e no comparativo de relatórios (continuam por categoria).
- Arrastar e soltar para reorganizar.
- Converter uma categoria de receita em despesa.
