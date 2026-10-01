# Finanças Pessoais

Aplicativo de finanças pessoais que roda só no navegador, sem backend e sem login. Os dados ficam no `localStorage`. Atividade da UFPA.

- **URL pública:** https://dsai-ap1-financas.vercel.app
- **Repositório:** https://github.com/polysamo/dsai-ap1-financas
- **Dupla:** Antonio Roger Sousa de Morais e Polyana dos Santos Moraes

## O que o app faz

Contas com saldo calculado, categorias e transações com filtros, orçamento mensal e anual, metas de poupança, importação de CSV e OFX, dashboard com projeção de saldo, cartões com faturas e parcelamento, transferências, relatórios com exportação em CSV e PDF, calendário de contas a pagar e receber, fluxo de caixa diário, dívidas e empréstimos (Price e SAC), investimentos, patrimônio líquido, independência financeira, assinaturas, divisão de despesas, regras e tags, alertas, conciliação, configurações (tema escuro e ocultar valores) e ajuda com tour e atalhos de teclado.

Cada parte tem uma spec em [`SPEC/`](SPEC/) (`2026-10-01-<parte>.md`, 26 arquivos), escrita antes do código. O commit de cada parte cita a spec no trailer `Spec:`. A `dashboard-e-projecao-v2` substitui a v1, porque a projeção passou a incluir recorrências.

Decisões que valem para todo o app: valores em centavos inteiros, datas em `AAAA-MM-DD`, interface em pt-BR, saldo de conta sempre calculado, aportes de metas fora das transações e projeção pela média dos 3 últimos meses completos mais as recorrências.

## Stack

Vite, React 19, TypeScript, Recharts, React Router, Vitest e Testing Library. Os estilos são CSS puro, com variáveis de design em `src/styles/tokens.css`. O projeto começou em Tailwind e foi migrado para CSS puro no fim. Deploy na Vercel.

## Como rodar

```bash
npm i
npm run dev     # servidor de desenvolvimento
npm test        # testes (Vitest)
npm run build   # verificação de tipos e build de produção
```

Se o `npm test` estourar o tempo de inicialização dos workers (acontece em pastas com espaço no nome), use `npx vitest run --pool=forks --maxWorkers=2`.

## Ferramentas e modelos

- Claude Code (extensão do VS Code) com o modelo Claude Sonnet 5.5 (`claude-sonnet-5-5`): specs, código, testes e commits.
- Subagentes do Claude Code, cada um num worktree git separado, escreveram as partes de calendário, dívidas, investimentos, tags e regras, configurações, ajuda, transferências, orçamento anual, assinaturas, patrimônio, OFX, independência, divisão, alertas, conciliação e fluxo de caixa, além da migração para CSS puro. Os merges, a resolução de conflitos e a verificação de tipos, testes e build foram feitos na sessão principal.
- Git e GitHub CLI para versionamento; Vercel CLI para o deploy.
- Registro da sessão em [`prompts/sessoes/`](prompts/sessoes/).

## Tamanho do código (cloc)

A meta de 100.000 linhas **não foi atingida**. O número real, medido com o comando abaixo, é de **24.270 linhas**: 17.658 de aplicação e 6.612 de testes. O total não foi inflado com código gerado em loop, dados ou duplicação.

```bash
cloc . --vcs=git --exclude-dir=node_modules,vendor,dist,build,prompts --exclude-lang=Markdown,JSON,YAML,CSV,Text,SVG --not-match-f='(lock|\.min\.)'
```

Total (aplicação e testes):

```
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     176           2072            422          21272
CSS                             85            352             24           2986
HTML                             1              0              0             12
-------------------------------------------------------------------------------
SUM:                           262           2424            446          24270
-------------------------------------------------------------------------------
```

Só a aplicação (sem `src/test`):

```
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     149           1340            385          14660
CSS                             85            352             24           2986
HTML                             1              0              0             12
-------------------------------------------------------------------------------
SUM:                           235           1692            409          17658
-------------------------------------------------------------------------------
```

Só os testes (`src/test`):

```
github.com/AlDanial/cloc v 2.06  T=3.07 s (8.8 files/s, 2406.0 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      27            732             37           6612
-------------------------------------------------------------------------------
SUM:                            27            732             37           6612
-------------------------------------------------------------------------------
```

## Estado dos testes e do repositório

- 516 testes passando na última execução completa (`npm test`) e build de produção compilando (`npm run build`).
- 94 commits, com os trailers `Agent:` e, nas partes, `Spec:`.
- Limitações conhecidas: a amortização extra de dívidas abate só o saldo devedor e não recalcula a tabela; o PDF dos relatórios usa a impressão do navegador; subcategorias, edição em lote e busca global ficaram de fora.
