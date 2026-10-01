# Importação de OFX

## O quê e por quê

Bancos brasileiros oferecem o extrato em OFX/QFX além do CSV. O OFX traz um identificador único por lançamento (FITID), o tipo do movimento e o saldo final do extrato, o que permite importar sem duplicar e conferir o resultado. Esta parte acrescenta a tela **Importar OFX** (rota `/importar-ofx`), que reaproveita a mecânica de importações, de sugestão de categoria e de detecção de duplicatas da [importação de CSV](2026-10-01-importacao-csv.md).

O parser é uma função pura, em `src/domain/ofx.ts`. Aceita OFX 1.x (SGML, tags de dados sem fechamento) e OFX 2.x (XML). A transação ganha o campo opcional `fitid?: string`, gravado ao importar. Nenhum dado existente muda e a versão do esquema permanece a mesma.

Decisões:

- A decodificação segue o `CHARSET` do cabeçalho (1252 ou UTF-8); sem cabeçalho, tenta UTF-8 e cai para Windows-1252.
- `TRNAMT` aceita ponto ou vírgula decimal. Valor positivo é receita; negativo, despesa.
- Uma linha é duplicata se o FITID já existe em transação da mesma conta, ou se data, valor e descrição coincidem com uma transação da conta (mesma regra do CSV).
- A conferência compara o `LEDGERBAL` do arquivo (na data `DTASOF`) com o saldo calculado da conta após a importação; divergência gera apenas um aviso textual.

## Critérios de aceitação

1. O parser lê OFX SGML 1.x (tags sem fechamento, cabeçalho `KEY:VALUE`) e XML 2.x e devolve o mesmo resultado para o mesmo conteúdo: contas (`BANKID`, `ACCTID`), transações e saldo final.
2. Cada `STMTTRN` vira uma transação com tipo (`TRNTYPE`), valor em centavos inteiros, `FITID` e descrição vinda de `NAME` e `MEMO` (junta os dois quando diferem; usa o que existir).
3. `DTPOSTED` é aceito nos formatos `AAAAMMDD`, `AAAAMMDDHHMMSS`, `AAAAMMDDHHMMSS.XXX` e com fuso (`[-3:BRT]`), sempre resultando em data `AAAA-MM-DD` sem deslocar o dia; datas inexistentes tornam a linha inválida com motivo.
4. `TRNAMT` aceita ponto ou vírgula decimal (`-12.50`, `-12,50`, `1.234,56`); valor ausente, inválido ou zero torna a linha inválida com motivo. Positivo é receita e negativo é despesa.
5. O saldo final (`LEDGERBAL`: `BALAMT` e `DTASOF`) é extraído em centavos.
6. A decodificação respeita o `CHARSET` do cabeçalho: `1252` e `UTF-8` mostram os acentos corretamente; sem declaração, tenta UTF-8 e depois Windows-1252.
7. Arquivo inválido é recusado com mensagem clara e nada é carregado: extensão diferente de `.ofx`/`.qfx`, acima de 5 MB, vazio, sem `<OFX>` ou sem nenhum `STMTTRN`.
8. Arquivo com mais de uma conta (`STMTRS`) mostra a lista de contas lidas e a escolha de qual importar; a conta de destino é sempre escolhida pelo usuário entre as contas ativas do app.
9. A prévia mostra, por linha, data, descrição, tipo, valor e categoria sugerida (mesma sugestão do CSV, editável), com caixa de seleção por linha; linhas inválidas aparecem com o motivo e não são selecionáveis.
10. Linhas cujo FITID já foi importado na conta de destino aparecem como "Já importada (FITID)" e começam desmarcadas; linhas que coincidem em data, valor e descrição aparecem como "Possível duplicata" e começam desmarcadas; ambas podem ser marcadas manualmente.
11. Confirmar grava só as linhas selecionadas, em tudo ou nada, guardando o `fitid` na transação, e mostra o resumo "N importadas, N ignoradas, N com erro".
12. "Desfazer importação" remove exatamente as transações da importação, reutilizando `desfazerImportacao`, e some do resumo; reimportar o mesmo arquivo depois de desfazer volta a ofertar as linhas como novas.
13. Após importar, a tela compara o saldo final do arquivo com o saldo calculado da conta: se iguais, informa "Saldo conferido"; se diferentes, avisa em texto os dois valores e a diferença. A falta de `LEDGERBAL` mostra que a conferência não foi possível.
14. Estados vazios e de erro: sem contas ativas, a tela oferece link para Contas; a rota `/importar-ofx` existe e o item "Importar OFX" aparece na navegação; os controles têm rótulos acessíveis e a situação de cada linha é texto, não só cor.

## Fora do escopo

- Criar contas automaticamente a partir de `BANKID`/`ACCTID` e vincular o arquivo a uma conta por esses códigos.
- Extratos de cartão de crédito (`CCSTMTRS`) e investimentos (`INVSTMTRS`).
- Importar vários arquivos de uma vez.
- Lançamentos futuros, parcelas e transferências entre contas detectadas pelo OFX.
- Ajuste automático do saldo quando há divergência.
