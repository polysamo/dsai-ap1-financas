# Importação de CSV

## O quê e por quê

Digitar transações uma a uma não escala. Bancos permitem baixar o extrato em CSV, então o app importa esse arquivo, mostra uma prévia e só grava o que o usuário confirmar. Tudo é processado no navegador; o arquivo nunca sai da máquina.

Fluxo: escolher arquivo, escolher conta de destino, mapear colunas, revisar prévia (com categorias e duplicatas), confirmar.

## Critérios de aceitação

1. O usuário seleciona um arquivo `.csv` pelo seletor ou arrastando-o; arquivos de outro tipo ou acima de 5 MB são recusados com mensagem clara.
2. O parser detecta o separador (`,` ou `;`) e lida com campos entre aspas, aspas escapadas e quebras de linha dentro de campo; a codificação UTF-8 e Windows-1252 é tratada de forma que acentos apareçam corretamente.
3. O usuário mapeia as colunas do arquivo para data, descrição e valor; também é aceito o formato com colunas separadas de crédito e débito. O mapeamento usado é lembrado para a próxima importação na mesma conta.
4. O formato de data é reconhecido entre `dd/mm/aaaa`, `aaaa-mm-dd` e `dd-mm-aaaa`; o usuário pode corrigir a escolha, e uma data ambígua ou inválida marca a linha com erro em vez de adivinhar.
5. Valores em formato brasileiro (`1.234,56`) e internacional (`1234.56`) são convertidos para centavos; o sinal negativo, parênteses ou a coluna de débito definem a despesa, e a ausência deles define a receita.
6. A prévia exibe todas as linhas com data, descrição, valor, tipo e categoria sugerida, e destaca linhas com erro e linhas suspeitas de duplicata; o contador mostra quantas serão importadas, ignoradas e com erro.
7. Uma linha é considerada duplicata quando já existe transação na mesma conta com mesma data, mesmo valor e mesma descrição normalizada (sem acentos, caixa e espaços extras); duplicatas vêm desmarcadas por padrão, mas o usuário pode marcá-las.
8. A categoria sugerida vem de regras simples: se uma descrição normalizada igual já foi categorizada antes, reutiliza essa categoria; caso contrário, usa "Outros" do tipo correspondente. O usuário pode trocar a categoria de cada linha antes de confirmar.
9. Linhas com erro não são importadas e ficam listadas com o motivo (data inválida, valor ausente); o usuário pode importar as demais.
10. Ao confirmar, todas as linhas marcadas são gravadas de uma só vez: se a gravação falhar (por exemplo, limite do localStorage), nada é gravado e o usuário vê o erro.
11. Após a importação, o app mostra um resumo (importadas, ignoradas, com erro) e oferece desfazer a importação inteira, que remove exatamente as transações criadas por ela.
12. Importar o mesmo arquivo duas vezes seguidas não cria transações duplicadas com as opções padrão.

## Fora do escopo

- Formatos OFX, QIF, PDF e planilhas XLSX.
- Download automático de extratos e integração com bancos.
- Importação de contas, categorias, orçamentos ou metas por CSV.
- Aprendizado de máquina ou serviço externo para categorização.
- Importação de transações parceladas ou de múltiplas contas em um só arquivo.
- Exportação de transações em CSV (pode virar spec própria).
