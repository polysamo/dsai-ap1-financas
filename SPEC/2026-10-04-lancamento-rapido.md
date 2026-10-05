# Lançamento rápido por texto (2026-10-04)

## O quê e por quê

Registrar um gasto no formulário pede seis campos. No dia a dia, o usuário pensa numa frase: "almoço 32,50 ontem @nubank #trabalho". Esta parte cria, no topo da tela de Transações, um campo de lançamento rápido que interpreta a frase, mostra a interpretação peça por peça enquanto se digita e cria a transação com Enter, passando pela mesma validação do formulário.

O interpretador é uma função pura (`src/domain/lancamentoRapido.ts`) que recebe o texto, o estado e a data de hoje. A categoria, quando não é dita, vem da mesma sugestão usada na importação (regras, depois histórico da descrição, depois "Outros"), e as tags das regras são somadas às digitadas.

## Critérios de aceitação

1. O primeiro termo que é um valor em reais ("32,50", "1.200", "R$ 15") vira o valor; sem valor, a interpretação traz o erro "Informe o valor.".
2. A transação é despesa por padrão; um valor com "+" na frente ou as palavras "recebi" ou "receita" a tornam receita (as palavras não entram na descrição).
3. Datas: "hoje", "ontem", "anteontem", "dd/mm" (ano atual), "dd/mm/aa" e "dd/mm/aaaa"; sem data, vale hoje. Data inexistente ("31/02") é erro.
4. Um dia da semana ("segunda", "terça", ..., "domingo", com ou sem acento e sem o "-feira") vale a data mais recente até hoje com aquele dia.
5. Conta: "@nome" ou o nome de uma conta ativa escrito por inteiro (ignorando acento e maiúsculas; se mais de uma casar, vale a de nome mais longo). Sem conta, vale a conta da transação mais recente ou, sem histórico, a primeira conta ativa que não é cartão.
6. Categoria: "/nome" escolhe a categoria ativa do tipo com esse nome (inclusive subcategorias); sem "/", vale a sugestão de regras, histórico e "Outros".
7. Tags: palavras com "#" viram tags normalizadas; as tags da regra que casar com a descrição são somadas, sem repetir.
8. As palavras restantes formam a descrição, na ordem e com a grafia digitadas.
9. "@conta" ou "/categoria" que não existem geram erro dizendo o nome não encontrado.
10. Enquanto se digita, uma prévia mostra tipo, valor, data, conta, categoria, tags e descrição interpretados, ou o erro, numa região `aria-live`.
11. Enter (ou o botão "Lançar") cria a transação pela validação de `criarTransacao`, limpa o campo e mostra "Lançado: <descrição> <valor>"; o lançamento é uma única entrada do "Desfazer".
12. Uma ajuda recolhível junto ao campo mostra a sintaxe com exemplos.

## Fora do escopo

- Parcelamento ("3x") e transferências por texto.
- Interpretar valores por extenso ("trinta reais").
- Aprender sinônimos de categoria além das regras existentes.
- Lançamento por voz.
