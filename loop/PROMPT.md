# Loop: regras padrão de categorização

Você está numa sessão nova e não lembra de nenhuma volta anterior. Tudo o que
importa está neste arquivo, em `loop/ESTADO.md` e em `loop/TODO.md`. Faça uma
volta, registre e encerre.

## 1. Contexto

Este é um app de finanças pessoais em React 19 + TypeScript + Vite, testado com
Vitest, que guarda tudo no `localStorage` do navegador e não envia nada a
servidor nenhum. O CSV do banco é lido em `src/pages/ImportarCsvPage.tsx`
(linhas 74-75: `lerArquivoBuffer` → `decodificar` → `parseCsv`) e virado em
linhas por `interpretarLinhas` em `src/domain/csv.ts` (linha 172); as
transações são gravadas por `importarTransacoes` no mesmo arquivo (linha 267).
A categoria de cada linha é sugerida por `sugerirCategoria` em
`src/domain/csv.ts` (linha 239, chamada em `ImportarCsvPage.tsx:105`), que tenta
nesta ordem: a primeira regra ativa que casar, a categoria de uma transação
anterior com a mesma descrição, e por fim "Outros". O motor de regras fica em
`src/domain/regras.ts` (`casaPadrao` na linha 35, `primeiraRegra` na linha 50),
compara só a descrição normalizada (sem acento, minúsculas) nos modos
`'contem'`, `'comeca'` e `'igual'`, e a prioridade é a posição da regra na
lista. O tipo `RegraCategoria` está em `src/domain/types.ts:157`. As categorias
de fábrica ficam em `src/data/categoriasPadrao.ts` (função `categoriasPadrao()`,
ids `cat-moradia`, `cat-alimentacao`, `cat-transporte`, `cat-saude`,
`cat-lazer`, `cat-educacao`, `cat-outros-despesa`, `cat-salario`,
`cat-rendimentos`, `cat-outros-receita`). O app nasce com `regras: []`
(`estadoInicial` em `src/storage/storage.ts`), por isso o primeiro CSV
importado cai quase todo em "Outros". O seu trabalho é escrever o conjunto de
regras de fábrica em `src/data/regrasPadrao.ts`, exportado como
`REGRAS_PADRAO`, e fazer passar os casos de `src/test/casos-categorizacao.json`,
verificados por `src/test/categorizacao.casos.test.ts`.

## 2. Uma volta, passo a passo

1. **Leia o estado.** Leia `loop/ESTADO.md` e `loop/TODO.md` inteiros. O número
   desta volta é o da última linha da tabela de `ESTADO.md` mais 1 (a primeira
   volta é 1). Se a última linha da tabela começa com `escalou`, não faça nada:
   um humano ainda não respondeu. Encerre.

2. **Confira as pré-condições.** Rode:
   ```
   git status --porcelain -- src/test loop/TODO.md
   npx vitest run src/test/categorizacao.casos.test.ts
   ```
   - Se `src/test/categorizacao.casos.test.ts` ou
     `src/test/casos-categorizacao.json` aparecerem como `??` (fora do git) ou
     modificados, escale com `escalou: arquivos de teste não estão commitados`.
   - Se o teste de casos falhar por um motivo que não seja um caso
     `expected 'X' to be 'Y'` (por exemplo, import que não existe, erro de
     tipo, `MINIMO_DE_CASOS` maior que o número de casos no JSON, ou o próprio
     teste quebrar antes de rodar os casos), escale com a mensagem do erro.
     A única exceção é a primeira volta, quando `src/data/regrasPadrao.ts`
     ainda não existe: aí o erro `Failed to resolve import
     "../data/regrasPadrao"` é esperado e você segue.

3. **Faça UM item.** Pegue o primeiro item de `loop/TODO.md` ainda marcado
   com `- [ ]`. Faça só ele. Não adiante o próximo, mesmo que pareça fácil.
   Fazer um item significa acrescentar ou ajustar regras em
   `src/data/regrasPadrao.ts`, e só nesse arquivo. Formato do arquivo:
   ```ts
   import type { RegraCategoria } from '../domain/types';

   /** Regras de fábrica; a ordem é a prioridade (a primeira que casa vence). */
   export const REGRAS_PADRAO: RegraCategoria[] = [
     { id: 'regra-padrao-ifood', padrao: 'ifood', modo: 'contem', tipo: 'despesa', categoriaId: 'cat-alimentacao', tags: [], ativa: true },
   ];
   ```
   - O arquivo é só dados. Ele pode importar apenas `type` de
     `../domain/types` e as constantes de `./categoriasPadrao`. Nenhum outro
     import, nenhuma função, nenhum efeito colateral.
   - Ids estáveis, no formato `regra-padrao-<palavra>`, sem repetir. Não
     renomeie o id de uma regra que já existe: um dia esses ids vão para o
     estado salvo do usuário.
   - `categoriaId` tem que ser um dos ids listados no Contexto, e do mesmo
     `tipo` da regra (`despesa` ou `receita`), senão o motor ignora a regra.
   - Escreva a regra para o estabelecimento, não para a linha do caso de
     teste. `{ padrao: 'ifood', modo: 'contem' }` pega os vários formatos de
     iFood; `{ padrao: 'pag*ifood', modo: 'igual' }` só resolve um caso e
     será revertida. Uma regra `igual` cujo padrão é a descrição literal de
     um caso do JSON conta como falha da volta.
   - Prefira o padrão mais curto que ainda distingue. `posto` pega Ipiranga e
     Shell; `auto posto shell belem` pega um posto só.
   - Cuidado com padrão largo demais. `pag` casaria com `PAGUE MENOS`
     (farmácia) e com `PAGAMENTO SALARIO` (receita). Antes de fechar o item,
     confira a regra nova contra os 46 casos do JSON, não só contra os da
     categoria do item: os casos que esperam `cat-outros-despesa` ou
     `cat-outros-receita` têm que continuar indo para "Outros".
   - Se duas regras disputam a mesma descrição, resolva com a ordem na
     lista ou com um padrão mais específico, e diga qual foi a escolha na
     linha do `ESTADO.md`.

4. **Rode as verificações**, nesta ordem:
   ```
   npx vitest run src/test/categorizacao.casos.test.ts
   npx tsc --noEmit
   npm test
   ```
   Um item está pronto quando os casos da categoria do item passam, nenhum
   caso que passava antes passou a falhar, `tsc` não dá erro e `npm test` não
   tem falha fora de `categorizacao.casos.test.ts`. Casos de categorias de
   itens futuros podem continuar falhando.
   Se algo falhar, você tem no máximo duas tentativas de correção, sempre
   mexendo só em `src/data/regrasPadrao.ts`. Depois da segunda, vá para o
   passo 6.

5. **Registre o sucesso.**
   - Troque `- [ ]` por `- [x]` no item, em `loop/TODO.md`.
   - Acrescente uma linha na tabela de `loop/ESTADO.md`:
     `| <volta> | <item> | <quantas regras criou ou mudou, e quais padrões> | <"N falham, M passam" ou "tudo passa"> | concluído |`
   - Se todos os itens do TODO estão `[x]` mas ainda há casos falhando numa
     categoria que nenhum item cobre (por exemplo, receitas: `cat-salario` e
     `cat-rendimentos`), acrescente um item novo no fim do `TODO.md` para
     ela. Isso é a única mudança permitida no TODO além de marcar `[x]`.
   - Faça um commit local só com os arquivos do loop:
     ```
     git add src/data/regrasPadrao.ts loop/TODO.md loop/ESTADO.md
     git commit -m "loop: volta <n> - <item>" -- src/data/regrasPadrao.ts loop/TODO.md loop/ESTADO.md
     ```
     Esse commit é o ponto de retorno da próxima volta. Nunca faça
     `git push`.
   - Encerre a sessão. Não comece outro item.

6. **Se não conseguiu.**
   - Desfaça só o que você mexeu em `src/data/regrasPadrao.ts`:
     `git checkout HEAD -- src/data/regrasPadrao.ts` se o arquivo já estava
     no último commit, ou apague o arquivo se foi você que o criou nesta
     volta. Não use `git checkout -- .`, `git reset --hard`, `git clean` nem
     `git stash`: eles apagam trabalho do humano que não é seu.
   - Não marque o item no TODO.
   - Acrescente a linha no `ESTADO.md` com
     `falhou: <motivo em uma frase>` na coluna Decisão, citando o caso que
     não passou.
   - Se a linha anterior do `ESTADO.md` já era uma falha neste mesmo item,
     escreva `escalou: <item> falhou duas vezes - <motivo>` em vez de
     `falhou`. Não pule para o próximo item.
   - Encerre.

## 3. Critério de parada

O loop terminou quando os três primeiros comandos abaixo saem com código 0
(sem erro) e os dois últimos imprimem `0`. Atenção: `grep -c` sai com código
1 quando a contagem é zero, e isso é o resultado certo aqui. Rode-os e cole a saída resumida na
última linha do `ESTADO.md`, com `FIM` na coluna Decisão.

```
npx vitest run src/test/categorizacao.casos.test.ts   # todos os 46 casos e os 4 testes de integridade passam
npx tsc --noEmit                                     # sem erro de tipo
npm test                                             # a suíte inteira passa (é "vitest run", do package.json)
grep -c '^- \[ \]' loop/TODO.md                      # imprime 0: nenhum item aberto
git diff --name-only HEAD~$(grep -c '| concluído |' loop/ESTADO.md) HEAD | grep -cvE '^(src/data/regrasPadrao\.ts|loop/(TODO|ESTADO)\.md)$'   # imprime 0: os commits do loop só tocaram arquivos permitidos
```

"Está bom", "a maioria passa" ou "os que faltam são casos difíceis" não
param o loop. Se um caso parece impossível de satisfazer sem quebrar outro,
isso é motivo para escalar (seção 5), não para parar.

Se o critério já é atendido quando você chega, escreva a linha `FIM` e
encerre sem mexer em nada.

## 4. Zona proibida

Você não pode criar, editar, renomear nem apagar nada destes caminhos. Se o
item exige mexer em algum deles, não mexa: escale com
`escalou: <item> exige <caminho>`.

**Testes.** Mudar teste para ele passar esconde o problema em vez de
resolver.
- `src/test/` inteiro, incluindo `src/test/categorizacao.casos.test.ts`,
  `src/test/casos-categorizacao.json`, `src/test/regras.test.tsx`,
  `src/test/importacao-csv.test.tsx`, `src/test/helpers.tsx` e
  `src/test/setup.ts`. Você não acrescenta, não tira e não muda casos no
  JSON, nem o campo `esperado`, nem `MINIMO_DE_CASOS`. Também não use
  `.skip`, `.only`, `.todo` nem comente testes em lugar nenhum.

**Persistência.** O app já está em produção. Mudar o formato do estado
salvo, ou o que o app grava no `localStorage`, apaga ou corrompe os dados de
quem já usa.
- `src/storage/storage.ts` (`estadoInicial`, migrações, `SCHEMA_ATUAL`)
- `src/state/store.tsx` e `src/state/preferencias.tsx`
- `src/main.tsx` (cria o `Store` em cima do `localStorage`)
- `src/lib/preferencias.ts`, `src/lib/layout.ts`, `src/lib/onboarding.ts`,
  `src/lib/buscasRecentes.ts`
- `src/domain/types.ts` (o formato de `AppState` é o formato do que fica
  salvo)
- `src/data/categoriasPadrao.ts` (os ids de categoria já estão gravados no
  estado dos usuários; renomear ou remover quebra as transações deles)

**Lógica que já funciona.** O trabalho é de dados, não de código.
- `src/domain/csv.ts` e `src/domain/regras.ts`
- `src/pages/ImportarCsvPage.tsx` e `src/pages/RegrasPage.tsx`

**Configuração, dependências e deploy.**
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
  `vercel.json`, `index.html`, `.gitignore`, `.claude/`, `dist/`
- Não rode `npm install <pacote>`, `npm update`, `npm publish`, `vercel`,
  `git push`, `git merge`, `git rebase` nem nada que publique o app.
- Não existe pasta `.github/` neste repositório. Não crie uma.

**Rede: proibida em qualquer forma.** O app não envia dados a lugar nenhum
e essa é uma promessa feita ao usuário (`src/pages/AjudaPage.tsx:13`:
"Nada é enviado a servidores"). Você não pode escrever, nem propor no
`ESTADO.md` como próximo passo:
- `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`,
  `navigator.sendBeacon`, `import()` de URL, `<script>` ou fonte externa;
- categorização por LLM, por API de terceiros ou por qualquer serviço
  remoto, mesmo "só para sugerir";
- dependência nova que faça qualquer uma dessas coisas.

## 5. Quando parar e chamar um humano

Nestes casos você não decide. Escreva no `ESTADO.md` uma linha com
`escalou: <motivo em uma frase>` na coluna Decisão, desfaça o que mexeu
nesta volta (passo 6) e encerre. A próxima volta não anda até um humano
responder.

- **Pré-condição quebrada:** arquivos de teste fora do git ou modificados,
  ou o teste de casos falhando por motivo que não é um caso (passo 2).
- **O item exige mexer na zona proibida** (seção 4).
- **A ideia exige rede**, LLM ou API externa: `escalou: proposta exige rede`.
- **A categoria certa é discutível.** "LIVRARIA CULTURA" é Educação ou
  Lazer? Plano de saúde da família é Saúde ou Moradia? Se o caso admite duas
  leituras defensáveis, ou se você acha que o `esperado` de um caso do JSON
  está errado, é decisão de produto. Escale e cite o caso.
- **A regra precisa de dado que o motor não usa.** O motor só olha
  descrição e tipo. Se resolver o caso exige valor, data ou conta, isso é
  mudança de arquitetura.
- **Dois casos brigam:** uma regra que acerta um caso derruba outro e nem
  a ordem nem um padrão mais específico resolvem.
- **O mesmo item falhou duas vezes** (passo 6).
- **O critério de parada foi atingido.** Avise que as regras existem mas
  ainda não chegam ao usuário: `estadoInicial` em `src/storage/storage.ts`
  continua com `regras: []` e `REGRAS_PADRAO` não é usado pelo app, só pelo
  teste. Ligar as regras ao app (só para instalações novas, ou também para
  quem já usa, e se elas devem vencer o histórico do usuário em
  `sugerirCategoria`) mexe em persistência e é decisão humana.
