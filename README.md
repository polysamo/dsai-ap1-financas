# Finanças Pessoais

Aplicativo de finanças pessoais que roda só no navegador, sem backend e sem login. Os dados ficam no `localStorage`. Atividade da UFPA.

- **URL pública:** https://dsai-ap1-financas.vercel.app
- **Repositório:** https://github.com/polysamo/dsai-ap1-financas
- **Dupla:** Antonio Roger Sousa de Morais e Polyana dos Santos Moraes

## O que o app faz

Desfazer e refazer global, edição em lote, busca global (Ctrl+K), subcategorias, lançamento rápido por texto, calculadoras, saúde financeira, lista de desejos, eventos e viagens, beneficiários e desafios de economia, além de: contas com saldo calculado, categorias e transações com filtros, orçamento mensal e anual, metas de poupança, importação de CSV e OFX, dashboard com projeção de saldo, cartões com faturas e parcelamento, transferências, relatórios com exportação em CSV e PDF, calendário de contas a pagar e receber, fluxo de caixa diário, dívidas e empréstimos (Price e SAC), investimentos, patrimônio líquido, independência financeira, assinaturas, divisão de despesas, regras e tags, alertas, conciliação, configurações (tema escuro e ocultar valores) e ajuda com tour e atalhos de teclado.

Cada parte tem uma spec em [`SPEC/`](SPEC/) (`2026-10-01-<parte>.md`, 38 arquivos), escrita antes do código. O commit de cada parte cita a spec no trailer `Spec:`. A `dashboard-e-projecao-v2` substitui a v1, porque a projeção passou a incluir recorrências, e a `dividas-amortizacao-v2` substitui o critério 8 da spec de dívidas, porque a amortização extra passou a recalcular a tabela.

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

A meta de 100.000 linhas **não foi atingida**. O número real, medido com o comando abaixo em 2026-10-06, é de **35.572 linhas**: 24.517 de aplicação e 11.026 de testes. O total não foi inflado com código gerado em loop, dados ou duplicação; a rodada de refinamento visual desta data só poliu e corrigiu, sem inflar linhas.

```bash
cloc . --vcs=git --exclude-dir=node_modules,vendor,dist,build,prompts --exclude-lang=Markdown,JSON,YAML,CSV,Text,SVG --not-match-f='(lock|\.min\.)'
```

Total (aplicação e testes):

```
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     317           3160            745          31937
CSS                             130            369             37           3619
HTML                              1             0              0             16
-------------------------------------------------------------------------------
SUM:                           448           3529            782          35572
-------------------------------------------------------------------------------
```

Só a aplicação (sem `src/test`):

```
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                     259           1952            698          20898
CSS                             130            369             37           3619
-------------------------------------------------------------------------------
SUM:                           389           2321            735          24517
-------------------------------------------------------------------------------
```

Só os testes (`src/test`):

```
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
TypeScript                      57           1207             47          11026
-------------------------------------------------------------------------------
SUM:                            57           1207             47          11026
-------------------------------------------------------------------------------
```

## Estado dos testes e do repositório

- 890 testes passando na última execução completa (`npx vitest run --pool=forks --maxWorkers=4`), `npx tsc --noEmit` limpo e build de produção compilando.
- 165 commits, com os trailers `Agent:` e, nas partes, `Spec:`.
- Limitações conhecidas: o PDF dos relatórios usa a impressão do navegador; as subcategorias têm só um nível.

## Refinamento visual e responsivo (2026-10-06)

Rodada de polimento guiada pelas specs [`2026-10-06-refinamento-visual.md`](SPEC/2026-10-06-refinamento-visual.md) e [`2026-10-06-responsivo-e-acessibilidade.md`](SPEC/2026-10-06-responsivo-e-acessibilidade.md), sem telas, campos ou comportamentos novos.

**Diagnóstico:** o app já tinha uma camada compartilhada consistente (`src/ds`, `src/styles/tokens.css`, `TituloPagina`/`PageHeader`, `EmptyState`, `Valor` com `tabular-nums` e cor semântica) usada nas 33 rotas, não só nas 8 com spec de redesenho dedicada. A varredura técnica com o Chrome DevTools MCP (console, rede, rolagem horizontal, foco e `aria-*`) em 1280/768/360px e nos dois temas, numa amostra de 14 rotas (Dashboard, Transações, Contas, Orçamento, Metas, Relatórios, Configurações, Design, Cartões, Dívidas, Investimentos, Assinaturas, Conciliação e a rota inexistente) mais o teste de foco preso em modal e a auditoria Lighthouse na home, não achou problema visual grave fora dos já corrigidos abaixo — a varredura completa das 31 rotas não foi refeita byte a byte nesta sessão porque uma sessão anterior já a tinha verificado limpa (ver "Verificado sem defeito" em `BUGS.md`).

**Telas redesenhadas por completo** (spec própria de redesenho, sessões anteriores): Dashboard, Orçamento, Beneficiários, Desafios, Eventos, Desejos, Transações, Contas.

**Telas com correção visual nesta rodada**: Cartões e Importar CSV — removidas as duas últimas cores hexadecimais fixas do app fora de `tokens.css`. As demais ~21 rotas (Conciliação, Transferências, Calendário, Fluxo, Saúde, Alertas, Orçamento anual, Regras, Investimentos, Independência, Calculadoras, Dívidas, Divisão, Patrimônio, Importar OFX, Relatórios, Configurações, Ajuda, Atalhos, Design) já estavam alinhadas aos tokens e componentes do design system na inspeção desta rodada e não precisaram de mudança visual.

**Bugs achados e corrigidos** (detalhe em `BUGS.md`): trilha e `<title>` mostravam "Página não encontrada" em Configurações/Ajuda/Atalhos (`tituloDaRota` não olhava o rodapé da navegação); `aria-controls` da sidebar gerava um id ARIA inválido com espaço e acento; favicon ausente gerava 404 em toda rota; faltava `<meta name="description">`. Lighthouse na home depois das correções: Acessibilidade 100, Boas práticas 100, SEO 100 (antes: Acessibilidade 95, SEO 82).

**Fora do escopo desta rodada** (pendente, ver `BUGS.md`): varredura de 360/768px em todas as 31 rotas com screenshot individual nesta sessão; checagem de contraste AA ponto a ponto em cada tela; revisão completa com a skill `web-design-guidelines` em todas as páginas (aplicada à camada compartilhada e a uma amostra).

## Atualização de 2026-10-06: deploy final

Nota acrescentada depois do texto acima, sem alterá-lo. Os números abaixo valem para o commit publicado.

- **Commit em produção:** `d628259` (`fix: barra de rolagem nativa da sidebar aparecia como borda preta`), publicado em https://dsai-ap1-financas.vercel.app com `vercel deploy --prod`. A produção serve a `<meta name="description">` do build novo.
- **Testes:** 893 passando em 56 arquivos (`npx vitest run --pool=forks --maxWorkers=4`), com `npx tsc --noEmit` limpo e `npm run build` compilando. É a contagem mais recente e substitui o "890" citado na seção "Estado dos testes e do repositório".
- **Commits:** 168 no repositório até este deploy. O "165" da mesma seção ficou desatualizado.
- **Correções incluídas neste deploy:** a sidebar deixava espaço vazio ao rolar telas com conteúdo longo, e a barra de rolagem nativa do Windows aparecia sem estilo, como uma borda preta entre o menu e o conteúdo.
- **Rodar a suíte em máquina lenta:** com muitos workers, o Vitest pode estourar o tempo de início dos workers e reportar falhas que não são de lógica. Numa máquina sobrecarregada, `--maxWorkers=2` fechou os 890 testes (então vigentes) em cerca de 2 minutos, sem falhas.
