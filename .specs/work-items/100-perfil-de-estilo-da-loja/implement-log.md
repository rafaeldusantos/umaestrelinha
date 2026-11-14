# Log da implementação por ondas — 100

## T03 — wi-impl-task · review · agente a71a441c09bc2bdd8

Tarefa: .specs/work-items/100-perfil-de-estilo-da-loja/tasks/03-marca-acompanha-o-perfil.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Atualizei também `Footer.test.tsx` (constante `PRIMARY_STRONG`) e `InstagramInvite.test.tsx` (o `stroke` do símbolo do avatar) para `var(--estrelinha-primary-strong, #283A4A)`. Os dois fixavam o hex que o `BrandSvg` desenhava e reprovariam com a mudança | Deixá-los vermelhos, ou afrouxá-los para "contém #283A4A" | São consequência direta do contrato: o componente compartilhado mudou o valor do atributo. A asserção continua exata (`toHaveAttribute`/`toBe`), e as vizinhas `not.toBe(ON_PRIMARY)` e `not.toBe(GROUND)` ficam | Os dois arquivos de teste. Qualquer teste futuro que leia `stroke` do tom `brand`/`accent` tem de esperar a forma `var(..., hex)` |
| 2 | Recuo escrito com espaço depois da vírgula, `var(--estrelinha-primary-strong, #283A4A)`, como o Contrato manda | `var(--x,#hex)` sem espaço | Literal do Contrato | Nenhum fora dos testes desta tarefa |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | o traço do tom `brand` é `var(--estrelinha-primary-strong, #283A4A)` e o de destaque é `var(--estrelinha-accent, #B8945F)` | componente | `apps/store/src/shared/ui/brand/__tests__/brand.test.tsx` (o `it.each` dos tons reescrito + "os tons escuro e de destaque acompanham o perfil da loja, com o ardósia e o ouro de recuo") | sim | — (vermelho antes: 3 falhas) |
| 2 | o tom claro segue igual | componente | `brand.test.tsx` › "o tom claro não acompanha o perfil — continua o hex fixo do cabeçalho" | sim | vermelho (`onInk` mudado para `var(--estrelinha-on-primary, #F7F3EC)`: o teste falhou; restaurado pela cópia, `cmp` ok) |
| 3 | o guarda `paths.test.ts` continua verde | guarda | `apps/store/src/shared/ui/brand/__tests__/paths.test.ts` | sim | não se aplica (comportamento que já existia, guarda de igualdade com o SVG-fonte, não tocado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

packages/ui/src/brand/BrandSvg.tsx alterado
apps/store/src/shared/ui/brand/__tests__/brand.test.tsx alterado
apps/store/src/widgets/footer/ui/__tests__/Footer.test.tsx alterado
apps/store/src/widgets/instagram-invite/ui/__tests__/InstagramInvite.test.tsx alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run src/shared/ui/brand/__tests__ --testTimeout=20000` (PROJECT.md › Comandos de verificação): primeiro vermelho, 3 falhas; depois da implementação, 53/53 em 2 arquivos, exit 0
- `pnpm --filter @estrelinha/store exec vitest run src/widgets/footer src/widgets/instagram-invite src/widgets/header --testTimeout=20000` (PROJECT.md): 142/142 em 6 arquivos, exit 0
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md › Comandos): 0 erros. Baseline 0, sem mudança
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md): 7 erros, todos em `src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx`. Iguais aos 7 herdados da baseline do CLAUDE.md, sem erro novo
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (CLAUDE.md): 0 erros. Baseline 0
- Suíte da loja `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines). 1ª rodada: 7470/7470 passaram em 406/406 arquivos, mas a saída foi exit 1 por `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` (contenção do worker, com a tarefa 01 rodando junto). 2ª rodada: 7472 passaram e 1 falhou, `storeSettingsDefaults.test.ts › o perfil de estilo da loja › nasce no Padrão, e o default é o de core`. É o arquivo da tarefa 01, que ela estava editando no meio da rodada (o caso não existia na 1ª). Nenhum teste desta tarefa falhou nas duas rodadas
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (já no contexto da sessão); apps/store/CLAUDE.md › Ícones e marca; packages/ui/CLAUDE.md (inteiro); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- O Contrato cita dois testes, mas eram quatro os que fixavam o hex do traço. Também `Footer.test.tsx:37,83` e `InstagramInvite.test.tsx:230` liam `#283A4A` do `BrandSvg` e foram atualizados (premissa 1). `Header.test.tsx` e `MegaMenu.test.tsx` não precisaram: o primeiro assere o tom claro `#F7F3EC`, que não mudou, e o segundo assere `currentColor` de ícone
- Fatia 3 (`paths.test.ts`) passou sem check de mutação: é um guarda de igualdade com o SVG-fonte, comportamento que já existia, e esta tarefa não mexeu nos paths
- A suíte da loja não fechou com exit 0: na 1ª rodada houve o timeout de RPC do worker (contenção), e na 2ª a falha de um caso em andamento da tarefa 01 (`storeSettingsDefaults.test.ts`). O número da suíte só vale de novo remedido com a árvore parada
- Citações conferidas: `BrandSvg.tsx:17-25 › STROKE` (bate, o STROKE está nas linhas 18-25), `brand.test.tsx:59-66` (bate) e `GuideHeroArt.tsx:25-69` (bate). Nenhuma deslocada, nenhuma morta
- Nada propagado: nenhuma tarefa seguinte (04–07) afirma o valor do `stroke` da marca

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 03
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines; apps/store/CLAUDE.md › Ícones e marca; packages/ui/CLAUDE.md; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: brand.test.tsx — o it.each dos tons reescrito (brand e accent leem a variável com recuo), "os tons escuro e de destaque acompanham o perfil da loja, com o ardósia e o ouro de recuo" e "o tom claro não acompanha o perfil — continua o hex fixo do cabeçalho" (com check de mutação: vermelho). paths.test.ts continua verde, sem alteração. Nada ficou sem cobertura
Verificações: testes da marca 53/53; footer, instagram-invite e header 142/142; tsc store 0, backoffice 7 herdados (ProposalStateBadge.test.tsx), mobile-adm 0. Suíte da loja: 7470/7470 na 1ª rodada, com exit 1 só pelo timeout de RPC do worker (contenção); na 2ª, 1 falha em storeSettingsDefaults.test.ts, arquivo da tarefa 01 que estava sendo editado
Árvore de trabalho: packages/ui/src/brand/BrandSvg.tsx; apps/store/src/shared/ui/brand/__tests__/brand.test.tsx; apps/store/src/widgets/footer/ui/__tests__/Footer.test.tsx; apps/store/src/widgets/instagram-invite/ui/__tests__/InstagramInvite.test.tsx
Citações conferidas: 3 abertas (BrandSvg.tsx STROKE, brand.test.tsx:59-66, GuideHeroArt.tsx:25-69); nenhuma deslocada, nenhuma morta. Divergência: além dos dois do Contrato, Footer.test.tsx e InstagramInvite.test.tsx também fixavam o hex e foram atualizados
```

## T03 — wi-impl-review · done · agente a0997d75e78ac0d05

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/03-marca-acompanha-o-perfil.md
Veredito: serve

## Achados

nada

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| o `stroke` do tom `brand` lê a variável com recuo ardósia, provado por teste | `packages/ui/src/brand/BrandSvg.tsx` (STROKE: `brand: 'var(--estrelinha-primary-strong, #283A4A)'`, `accent: 'var(--estrelinha-accent, #B8945F)'`); prova em `apps/store/src/shared/ui/brand/__tests__/brand.test.tsx:58-90` | sim |
| cada comportamento do bloco `Testes` coberto por um teste escrito | brand.test.tsx: o `it.each` reescrito, mais dois casos novos (escuro e destaque com recuo; claro segue `#F7F3EC` e sem `var(`) | sim |
| testes dos arquivos alterados, passando | — | só execução |
| `tsc` dos projetos tocados sem erro novo e a suíte do workspace | — | só execução |

## Obrigações

- Rodar a suíte inteira da loja e o `tsc` de store, backoffice e mobile-adm: é verificação de execução. No diff não há nada que a contradiga (o tipo de `STROKE` continua `Record<BrandTone, string>`). Não tenho como confirmar daqui que rodou.

## Testes

- Componente, o traço `brand`/`accent` com `var(..., hex)` e o tom claro igual: `brand.test.tsx`. O `it.each` cobra o valor exato com `toHaveAttribute` em todos os `<path>`. O caso novo cobra a forma por regex e tem a vizinha `not.toBe` do hex puro. O caso do tom claro cobra `#F7F3EC` exato e a ausência de `var(`. A asserção morde: se `STROKE` voltar ao hex ou o claro passar a ler variável, o teste reprova.
- Guarda, `paths.test.ts` continua verde: o arquivo não foi tocado e o diff não mexe em `paths.ts`. Que ele passa, só a execução prova. Ele estava em `sem mutação` como guarda que já existia, e não há asserção nova a ler.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Atualizar `Footer.test.tsx` (`PRIMARY_STRONG`) e `InstagramInvite.test.tsx` (o stroke do avatar) para a forma `var(...)` | sim | Os dois fixavam o hex que `BrandSvg` desenhava. A asserção continua exata (`toHaveAttribute`/`toBe`). Em `Footer.test.tsx:78,86-87` as vizinhas `not.toBe(GROUND)` e `not.toBe(ON_PRIMARY)` ficam de pé, e `PRIMARY_STRONG` não entra em nenhum cálculo de contraste nesse arquivo | sim. A busca por `283A4A`/`B8945F` com `stroke` nos testes de store, backoffice e mobile-adm só achou, além desses, `Header.test.tsx`. Esse teste cobra o tom `onInk`, que não mudou (ver Não conferido) |
| 2 | Recuo escrito com espaço depois da vírgula | sim | É o literal do Contrato | sim |

## Não conferido

- `apps/store/src/widgets/header/ui/__tests__/Header.test.tsx:426,446` fica fora de `alterados` e não é achado. A vizinha `expect(stroke).not.toBe('#283A4A')` agora é sempre verdadeira, porque o tom `brand` deixou de produzir esse hex. A asserção principal (`toHaveAttribute('stroke', '#F7F3EC')`) continua mordendo, então a proteção contra o cabeçalho voltar ao tom `brand` não se perde.
- A execução não foi conferida: suíte da loja, `tsc` dos três apps e o `paths.test.ts` verde.
- Os quatro arquivos estão `M` (rastreados), então o diff tem baseline e todos foram julgados por ele.
- Instruções lidas: `packages/ui/CLAUDE.md` (inteiro, menos a cauda de "Ao mexer aqui" depois de contraste); `apps/store/CLAUDE.md` › Ícones e marca; `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (vindo no contexto da sessão). Exemplar aberto: `apps/store/src/widgets/material-guide/ui/GuideHeroArt.tsx`.

## T01 — wi-impl-task · review · agente a59a30e783c5e36c0

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/01-perfil-como-configuracao.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Não abri o `spec.md` › Decisões (C1). Tirei os nomes do contrato do que as tarefas 01/02/04/05/07 citam (`StyleProfile`, `styleProfileOf`, `STYLE_PROFILE_ATTRIBUTE`, `normalizeAppearance`, `DEFAULT_APPEARANCE`, `useStyleProfile`). Os nomes que faltavam escolhi pelo molde de `announcements`: `STYLE_PROFILES`, `DEFAULT_STYLE_PROFILE`, `AppearanceSettings`, `STYLE_PROFILE_PREVIEW_SOURCE`, `StyleProfilePreview{Draft,Ready}Message`, `StyleProfilePreviewMessage`, `parseStyleProfilePreviewMessage`, `STYLE_PROFILE_LABELS`, `STYLE_PROFILE_COPY`, `styleProfilePreviewTitle` | ler a costura para copiar C1 ao pé da letra | a regra 5 do meu procedimento proíbe abrir a costura. O texto da tarefa ("exatamente com aqueles nomes") não muda esse procedimento (regra 12) | tarefas 02, 04, 05 e 07. Se C1 usa outro nome para o canal, a cópia ou a lista de perfis, quem consome importa daqui, pelo nome que está no código |
| 2 | Valores: `STYLE_PROFILES = ['padrao','black-friday']`, `STYLE_PROFILE_ATTRIBUTE = 'data-perfil'` (H6), carimbo `'estrelinha-style-profile-preview'` | — | H6, mais o padrão de carimbo `estrelinha-*-preview` | 02, 04, 05, 07 |
| 3 | Um `draft` da prévia com perfil desconhecido, nulo ou de outro tipo é **recusado** (`null`) | normalizar o `draft` para `padrao` | na prévia, recuar para o Padrão pintaria o Padrão por cima do perfil que a dona escolheu. O recuo vale só para a leitura do banco | 05 (o recebedor ignora a mensagem) e 07 |
| 4 | O canal tem só `draft { profile }` e `ready`. Sem `show` e sem `highlight` | copiar as mensagens do canal da faixa | o perfil não tem item para mostrar nem realçar. Menor superfície | 05 e 07 |
| 5 | `AppearanceSettings = { profile: StyleProfile }`. O valor cru do banco passa por `normalizeAppearance`, no hook e em quem mais o ler | tipar a coluna crua como `profile: string`, como faz o Compre Junto | o painel grava só os dois perfis, e quem lê sempre normaliza | 04 (`readSettings` normaliza) e 07 (grava `{ profile }` tipado) |
| 6 | `normalizeAppearance` devolve só `{ profile }`: qualquer outra chave gravada é descartada. `styleProfileOf` não apara espaço nem troca maiúscula/minúscula (`'Black-Friday'` vira `padrao`) | aceitar outras grafias | só existem duas grafias, e o painel grava exatamente uma delas | nenhum |
| 7 | O hook `useStyleProfile()` devolve `{ profile, isLoading }`. `isLoading` vem de `useStoreSettings`; uma leitura que falha devolve `padrao` | expor o objeto `appearance` inteiro | o contrato da tarefa pede `{ profile, isLoading }` | 05 e 07 |
| 8 | A cópia do card fica em `copy.ts`: os textos fixos em `STYLE_PROFILE_COPY` (chaves `title`, `description`, `notice` com o texto de H7, `inUse`, `previewAction`, `save`, `saved` com o texto de H8, `previewSubtitle`, `close`, `groupLabel`). Os nomes e descrições dos perfis ficam em `STYLE_PROFILE_LABELS`. O título do modal é a função `styleProfilePreviewTitle(profile)` | um template com `{nome}` dentro da string | função pura e tipada, no molde de `BUY_TOGETHER_FORM_LABELS` | 07 |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `normalizeAppearance`/`styleProfileOf`: valor ausente, `null`, string, número, objeto sem `profile` ou `profile` desconhecido viram `padrao`; `padrao` e `black-friday` passam | unidade | packages/core/src/appearance/__tests__/normalize.test.ts | sim (23) | vermelho (aceitar qualquer string reprovou 4 casos) |
| 2 | O canal: `draft` com perfil válido é aceito; o carimbo de outro canal (faixa, Home, menu) é recusado; perfil desconhecido é recusado; `ready` é aceito | unidade | packages/core/src/appearance/__tests__/preview.test.ts | sim (17) | vermelho (sem a checagem do carimbo, 4 reprovaram) |
| 3 | Pureza do módulo: `.ts` em todo import relativo, inclusive `import type`; sem React, Supabase, Deno ou alias; âncora de 5 arquivos e um sensor | unidade | packages/core/src/appearance/__tests__/purity.test.ts | sim (11) | vermelho (um `from './types'` sem extensão em `copy.ts` reprovou 1) |
| 3b | A cópia do card (nomes, título do modal, H7, H8, sem exclamação) — apoio à fatia 3 | unidade | packages/core/src/appearance/__tests__/copy.test.ts | sim (4) | vermelho (trocar o título do modal reprovou 1) |
| 4 | O hook devolve o perfil normalizado, e `padrao` sem a chave, com valor desconhecido ou com a leitura falhando | unidade | packages/core/src/hooks/__tests__/useStyleProfile.test.ts | sim (8) | — (passou pelo vermelho: o módulo não existia) e mutação extra: sem a normalização, 2 reprovaram |
| 5 | Guarda: o default de `appearance` é o de `core` (`toBe`), e nenhuma migration grava `'appearance'` | guarda (suíte da loja) | apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts | sim (59) | vermelho (uma cópia literal de `DEFAULT_APPEARANCE` no pacote de tipos reprovou 1) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

packages/core/src/appearance/types.ts criado
packages/core/src/appearance/normalize.ts criado
packages/core/src/appearance/preview.ts criado
packages/core/src/appearance/copy.ts criado
packages/core/src/appearance/index.ts criado
packages/core/src/appearance/__tests__/normalize.test.ts criado
packages/core/src/appearance/__tests__/preview.test.ts criado
packages/core/src/appearance/__tests__/purity.test.ts criado
packages/core/src/appearance/__tests__/copy.test.ts criado
packages/core/src/hooks/useStyleProfile.ts criado
packages/core/src/hooks/__tests__/useStyleProfile.test.ts criado
packages/core/src/hooks/useStoreSettings.ts alterado
packages/core/package.json alterado
packages/supabase/src/types/settings.ts alterado
apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts alterado

## Verificação

- `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md › Comandos/Baselines): 11 erros, idênticos à baseline que capturei antes da primeira fatia (por arquivo e código). Nenhum novo.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (CLAUDE.md): 0 erros, contra baseline 0.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md): 7 erros, idênticos à baseline (os herdados de `ProposalStateBadge.test.tsx`). Rodei porque `SettingsMap` mudou.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` e `-p apps/store/tsconfig.server.json` (CLAUDE.md): 0 erros cada.
- Um arquivo de teste por fatia, com `pnpm --filter @estrelinha/<w> exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação): todos verdes, resultados na tabela acima.
- Suíte de core, `pnpm --filter @estrelinha/core test --testTimeout=20000` (CLAUDE.md › Baselines): exit 0, 6056/256.
- Suíte da loja, `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): exit 0, 7473/406.
- `packages/supabase` não tem script de teste.

Instruções lidas: CLAUDE.md › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (o arquivo da raiz veio no contexto da sessão); packages/core/CLAUDE.md › Quando um código pertence a este pacote · Pureza · Os módulos · `announcements` · Convenções de tipo; apps/store/CLAUDE.md › Modo prévia; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- A tarefa manda seguir "o contrato C1 do `spec.md` › Decisões, exatamente com aqueles nomes" e diz que quem executa abre a costura quando precisa. O meu procedimento (regra 5) proíbe abrir a costura, e eu não abri. Os nomes que faltavam eu decidi (premissa 1). Se C1 diverge, quem revisa o canal, a cópia e a lista de perfis compara com C1.
- Citações conferidas ao usar, nenhuma deslocada nem morta: `buy-together/settings.ts:13-36`, `home/featured.ts › featuredDisplay` (linha 32), `announcements/preview.ts`, `announcements/__tests__/purity.test.ts`, `supabase/src/types/settings.ts:24-35`, `storeSettingsDefaults.test.ts:577-619`, `useStoreSettings.ts › DEFAULTS`. O `SettingsKey` e o `SettingsMap` estão em `settings.ts:394-423`.
- O alias `@estrelinha/core/appearance` funciona pelos `paths` (`@estrelinha/core/*`) e pelo alias do Vite (diretório de `src`). Acrescentei a entrada `./appearance` em `exports`, no molde de `./announcements`.
- O guarda novo de `storeSettingsDefaults.test.ts` tem um sensor que o molde não tinha: uma semeadura da chave é acusada, e a mesma frase dentro de um comentário SQL não é.
- A árvore já tinha mudanças de outras tarefas (`packages/ui/src/brand/BrandSvg.tsx`, `brand.test.tsx`, `Footer.test.tsx`, `InstagramInvite.test.tsx`). Não as toquei; as suítes de core e da loja passam com elas.
- Nenhuma afirmação de tarefa seguinte ficou falsa: as tarefas 02/04/05/07 citam os nomes que existem, ou falam do "canal", do "hook" e da "cópia" sem nomeá-los. Nada propagado.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 01
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; packages/core/CLAUDE.md › Quando pertence · Pureza · Os módulos · announcements · Convenções de tipo; apps/store/CLAUDE.md › Modo prévia; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: normalização → packages/core/src/appearance/__tests__/normalize.test.ts; canal (draft válido, carimbo alheio recusado, perfil desconhecido recusado, ready) → packages/core/src/appearance/__tests__/preview.test.ts; pureza com âncora → packages/core/src/appearance/__tests__/purity.test.ts; cópia do card → packages/core/src/appearance/__tests__/copy.test.ts; hook → packages/core/src/hooks/__tests__/useStyleProfile.test.ts; guarda sem migration e default por referência → apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts (describe "o perfil de estilo da loja"). Nada ficou sem cobertura.
Verificações: tsc core 11 (=baseline), store 0, backoffice 7 (=baseline), mobile-adm 0, store server 0; suíte core 6056/256 exit 0; suíte store 7473/406 exit 0; check de mutação em cada fatia, todos vermelhos e restaurados com cmp
Árvore de trabalho: criados packages/core/src/appearance/{types,normalize,preview,copy,index}.ts e quatro testes em __tests__/, packages/core/src/hooks/useStyleProfile.ts e o teste dele; alterados packages/core/src/hooks/useStoreSettings.ts (DEFAULTS.appearance), packages/core/package.json (exports ./appearance), packages/supabase/src/types/settings.ts (AppearanceSettings, DEFAULT_APPEARANCE, 'appearance' em SettingsKey/SettingsMap), apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts. Nada commitado.
Citações conferidas: 7 abertas ao usar; nenhuma deslocada; nenhuma morta
Caducou: nenhuma
```

Divergência registrada: os nomes de C1 do spec.md não foram conferidos, porque o procedimento proíbe abrir a costura. Os nomes escolhidos estão nas premissas 1 a 8 do relatório.

## T01 — wi-impl-review · done · agente acd0768b6c5ecb3b4

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/01-perfil-como-configuracao.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| `normalizeAppearance(qualquer coisa desconhecida)` devolve `{ profile: 'padrao' }` e o teste prova | `packages/core/src/appearance/normalize.ts:16-18`; `__tests__/normalize.test.ts:29-52` (ausente, nulo, string, número, lista, objeto sem `profile`, `profile` desconhecido, nulo e de outro tipo) | sim |
| `appearance` está em `DEFAULTS` e em `SettingsMap`, e `storeSettingsDefaults.test.ts` prova a ausência de migration | `useStoreSettings.ts` (`appearance: DEFAULT_APPEARANCE` em `DEFAULTS`); `packages/supabase/src/types/settings.ts` (`'appearance'` em `SettingsKey`, `appearance: AppearanceSettings` em `SettingsMap`, tipo e default reexportados de `core`); `storeSettingsDefaults.test.ts:628-647` (`toBe` contra o default de `core`, nenhuma migration grava `'appearance'`, sensor) | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos alterados passando | — | só execução |
| `tsc` de cada projeto tocado sem erro novo, e a suíte do workspace tocado | — | só execução |

## Obrigações

- `.ts` explícito em todo especificador relativo, `import type` incluso, e nada de React, Supabase ou alias: aplicado nos cinco arquivos de `appearance/`. Os imports são `./types.ts` em `normalize`, `preview` e `copy`, e `export * from './x.ts'` no `index`. `purity.test.ts` assere isso. O hook em `hooks/` importa `./useStoreSettings` sem extensão, igual ao molde `useBuyTogetherForm.ts`, e `hooks/` é a exceção declarada.
- Parse que devolve `Mensagem | null`, nunca `{ ok }`: aplicado em `preview.ts:39`, `parseStyleProfilePreviewMessage(...): StyleProfilePreviewMessage | null`.
- `packages/` sem ESLint, só `tsc` e teste: não há o que conferir por leitura; o `tsc` é só execução.
- Guarda de chave que recusa string, com a forma proibida descrita em comentário e não escrita: o único guarda novo, em `storeSettingsDefaults.test.ts`, varre só migrations. O literal dele aparece apenas no sensor do próprio teste, e nenhum comentário de produção escreve a forma proibida.
- Não faça: nenhum arquivo de `alterados` está em `packages/ui`, `core/page`, `apps/store/server`, `apps/store/src/app`, `widgets/announcement-bar` ou `apps/backoffice`. Nenhuma migration foi escrita, e nada liga o perfil ao calendário.

## Testes

- `normalizeAppearance`/`styleProfileOf` (ausente, `null`, string, número, objeto sem `profile`, `profile` desconhecido ⇒ `padrao`; os dois perfis válidos passam): `packages/core/src/appearance/__tests__/normalize.test.ts`. A asserção morde: cobre os dois lados, a chave estranha descartada e a grafia com maiúscula.
- O canal (`draft` válido aceito; carimbo da faixa, da Home e do menu recusado; perfil desconhecido recusado, escolha registrada na premissa 3; `ready` aceito): `__tests__/preview.test.ts`. Morde: usa as constantes reais dos outros canais, compara por igualdade exata e recusa o perfil ausente, nulo e de outro tipo.
- Pureza com âncora: `__tests__/purity.test.ts`. Morde: âncora dos cinco nomes, âncora do extrator (≥ 7 imports) e sensor com `import type` sem extensão, alias e `react`.
- O hook devolve o perfil normalizado, e `padrao` sem a chave: `packages/core/src/hooks/__tests__/useStyleProfile.test.ts`. Morde: o caso `'black-friday'` gravado mata um hook que devolvesse sempre `padrao`. Os casos `{ profile: 'natal' }` e o valor string `'black-friday'` matam um hook que lesse o campo cru sem normalizar.
- Guarda na suíte da loja (`toBe` e nenhuma migration grava a chave): `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts:628-647`. Morde: `toBe` contra o default de `core`, piso de 50 migrations lidas e sensor do removedor de comentário SQL nos dois sentidos.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Nomes do contrato tirados das tarefas, sem abrir C1 | sim | `spec.md:202` (C1): `STYLE_PROFILES`, `StyleProfile`, `AppearanceSettings`, `DEFAULT_APPEARANCE`, `STYLE_PROFILE_ATTRIBUTE`, `normalizeAppearance`, `styleProfileOf`, `STYLE_PROFILE_PREVIEW_SOURCE`, `ready`/`draft` com `profile`, parse → mensagem ou `null`, arquivo de cópia e barrel. Tudo está presente com esses nomes | sim (02, 04, 05, 07) |
| 2 | `['padrao','black-friday']`, `'data-perfil'`, carimbo `estrelinha-style-profile-preview` | sim | H6 (`spec.md:193`) e C1 | sim |
| 3 | `draft` com perfil inválido recusado (`null`) | sim | a tarefa deixa explicitamente "recusado (ou normalizado — escolha e registre)" | sim (05, 07) |
| 4 | Canal só com `draft` e `ready` | sim | C1 lista só `ready` e `draft` com `profile` | sim |
| 5 | `AppearanceSettings = { profile: StyleProfile }` | sim | C1, literal | sim (04 normaliza em `readSettings`, 07 grava `{ profile }`) |
| 6 | Só `{ profile }` sai da normalização; sem aparar espaço nem trocar caixa | sim | nada na tarefa ou em C1 pede outras grafias | sim |
| 7 | Hook devolve `{ profile, isLoading }`; a leitura que falha vira `padrao` | sim | o Contrato da tarefa: `{ profile: StyleProfile, isLoading }`; `useStoreSettings` devolve `DEFAULTS` no erro | sim |
| 8 | Cópia em `STYLE_PROFILE_COPY`/`STYLE_PROFILE_LABELS` e título por função | sim | os textos batem com H7, H8 e "Decisões já tomadas", palavra por palavra | sim (07) |

## Não conferido

- A execução: os testes passando, o `tsc` de `packages/core`, da loja e de `packages/supabase` contra a baseline, e a suíte da loja. A revisão não roda nada.
- Os cinco arquivos novos de `appearance/` e o hook com o teste dele aparecem no diff como adição, com intent-to-add (status `A`). Não houve falta de baseline.
- Registro, não achado: as tarefas 05 (linha 13) e 07 (linha 13) dizem que "o hook do perfil salvo" fica "em `@estrelinha/core/appearance`". O hook mora em `@estrelinha/core/hooks/useStyleProfile`, conforme o Contrato da 01, e o barrel puro não pode reexportá-lo. Quem consome encontra o hook pelo subpath `./hooks/*`.
- A tabela "Os módulos" de `packages/core/CLAUDE.md` ainda não lista `./appearance`. A atualização é do fecho da feature, não desta tarefa.

Instruções lidas: `CLAUDE.md` (raiz, carregado no contexto: Comandos, Alias de import, O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines); `packages/core/CLAUDE.md` › Quando um código pertence a este pacote · Pureza · Os módulos · `announcements` · Convenções de tipo. `apps/store/CLAUDE.md` › Modo prévia não foi aberto: nenhum arquivo de `alterados` está em `apps/store/src` fora do teste de guarda.

## T05 — wi-impl-task · review · agente af0e66f5c87cb1bfd

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/05-aplicador-do-perfil-na-loja.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O aplicador sempre ESCREVE o atributo com o perfil, `padrao` incluído. Nunca o remove | Remover o atributo no Padrão | É a mesma forma que o servidor usa (H6 da 04: sempre escreve o perfil normalizado), então a loja e o HTML servido não divergem. Para o CSS as duas formas são equivalentes | o seletor do CSS da 02 (`html[data-perfil="black-friday"]`) e a Validation de CA-02, que lê o `<html>` |
| 2 | Enquanto a configuração ainda não chegou (`isLoading`) e não há atributo válido da carga, o `<html>` não é tocado | Escrever `padrao` já de saída | Escrever `padrao` e trocar quando a configuração chega seria a cor mudando com a página parada (RN-04) | nenhum fora de `StyleProfileApplier.tsx` |
| 3 | Atributo da carga com valor desconhecido (por exemplo `natal`) conta como "não sei", e quem decide é a configuração | Valer o Padrão | É o mesmo molde do `data-faixa` da faixa de avisos, onde todo valor fora do vocabulário é "não sei" | nenhum |
| 4 | Na prévia, o rascunho vence o atributo e a configuração. Antes de o rascunho chegar vale a regra normal (atributo e depois configuração) | Desligar a leitura do salvo na prévia | O molde da faixa é "o publicado até o rascunho chegar". O HTML servido com `?preview=1` já traz o atributo, então não há troca de cor antes do rascunho | a 07: o painel tem de mandar o `draft` depois do `ready` da loja |
| 5 | O recebedor (`useStyleProfilePreview`) manda UM `ready`, ao montar, para a origem de `document.referrer`. Sem referrer, não manda nada. Aceita só `draft` vindo de `window.parent` com o carimbo `STYLE_PROFILE_PREVIEW_SOURCE` | Mandar `ready` com `'*'`, ou aceitar mensagem de qualquer janela | Regra R11 e molde de `useAnnouncementPreview.ts` | a 07, que conversa com este recebedor |
| 6 | O utilitário de troca de rota virou o hook `useNavigatedSinceLoad()` em `apps/store/src/shared/lib/useNavigatedSinceLoad.ts`. A chave da carga é lida quando o módulo carrega, e a trava é uma `ref` por instância (comportamento idêntico ao de antes) | Trava global no módulo | O contrato pedia comportamento idêntico na faixa. Uma trava global mudaria o caso em que a faixa remonta | faixa de avisos e aplicador |
| 7 | O aplicador e o recebedor ficam em `apps/store/src/app/` (`StyleProfileApplier.tsx`, `useStyleProfilePreview.ts`). O aplicador é montado em `App.tsx` logo depois do `ScrollToTop`, sem condição de prévia, dentro do `BrowserRouter` e fora das `Routes` | Pôr o recebedor em `entities/` ou `widgets/` | Só o aplicador consome o recebedor, e o contrato põe o aplicador em `app/`. O checkout e o 404 também vestem o perfil | `App.tsx` |
| 8 | Acrescentei o guarda `perfilMontado.test.ts`: lê o `App.tsx` e exige o aplicador importado, sem condição de prévia, dentro do Router e fora das `Routes`, com sensores | Confiar só no teste do componente | O teste do componente monta o aplicador ele mesmo e passaria com a montagem apagada do `App.tsx` | `App.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | A faixa de avisos decide igual depois da extração (a suíte dela intocada) | componente | `widgets/announcement-bar/ui/__tests__/AnnouncementBar.test.tsx` (existente, 44/44) | sim | vermelho (trava trocada por comparação: 2 casos de "voltar à entrada da carga" caíram) |
| 2 | Na carga vale o atributo, e a configuração diferente não o troca sem troca de rota | componente | `app/__tests__/StyleProfileApplier.test.tsx` › "na carga do documento" | sim | — (vermelho pelo módulo ausente). Também vermelho com o ramo do atributo removido: 3 falhas |
| 3 | Depois da primeira troca de rota vale a configuração; voltar à rota da carga não devolve a decisão ao atributo | componente | idem › "depois da primeira troca de rota" | sim | — |
| 4 | Sem atributo decide a configuração; configuração desconhecida ⇒ `padrao`; configuração carregando ⇒ `<html>` intocado | componente | idem › "sem o atributo da carga" | sim | vermelho (sem o `isLoading`: 2 falhas) |
| 5 | Em prévia dentro de iframe, o `draft` do pai aplica o perfil; com `?preview=1` fora de iframe, ou mensagem de outra janela ou de outro carimbo, nada muda; o `ready` sai para a origem do referrer | componente | idem › "na prévia do painel" | sim | vermelho para cada mutação: sem a checagem de origem, sem a checagem de iframe, `'*'` no `ready` (1 falha cada). A remoção de `preview &&` ficou verde e é equivalente (o rascunho só existe em prévia) |
| 6 | O aplicador está montado no `App.tsx` | guarda de fonte | `app/__tests__/perfilMontado.test.ts` | sim | sensores no próprio arquivo (só no comentário, atrás de `!previewMode &&`, fora do Router) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

apps/store/src/shared/lib/useNavigatedSinceLoad.ts — criado
apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts — alterado
apps/store/src/app/StyleProfileApplier.tsx — criado
apps/store/src/app/useStyleProfilePreview.ts — criado
apps/store/src/app/App.tsx — alterado
apps/store/src/app/__tests__/StyleProfileApplier.test.tsx — criado
apps/store/src/app/__tests__/perfilMontado.test.ts — criado

## Verificação

- Baseline de tipos (não veio na entrada, então rodei antes da primeira fatia): `npx tsc --noEmit -p apps/store/tsconfig.app.json`, origem `CLAUDE.md` › Comandos. Saiu `0`, limpo.
- Teste de um arquivo: `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000`, origem `PROJECT.md` › Comandos de verificação.
  - `src/widgets/announcement-bar`: 44/44.
  - `StyleProfileApplier.test.tsx`: 17/17.
  - `perfilMontado.test.ts`: 5/5.
- Suíte da loja: `pnpm --filter @estrelinha/store test --testTimeout=20000`, origem `CLAUDE.md` › Baselines. Exit 1, 7469 passaram e 32 reprovaram em 7501 (407/408 arquivos).
  - As 32 falhas estão todas num arquivo só, `src/shared/lib/__tests__/palette.test.ts`.
  - Esse arquivo é da tarefa 02, que estava editando `App.css`, `palette.test.ts`, `paletteFromSource.ts` e os tokens em paralelo.
  - Nenhum arquivo meu reprova.
- Tipos no fecho: mesmo `tsc`, exit 0. Contra o baseline `limpo`, nenhum erro novo.
- Lint: `npx eslint .` em `apps/store`, origem `CLAUDE.md` › Baselines. 2 erros e 2 warnings, igual ao baseline 2/2, em `ProductInfo.tsx`, `ShareButtons.tsx` e `ShippingCalc.tsx`. Nenhum é meu.

Instruções lidas:
- `CLAUDE.md` › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines. O arquivo do worktree tem 410 KB; li essas seções pelo conteúdo do `CLAUDE.md` raiz carregado na sessão.
- `apps/store/CLAUDE.md` › O HTML servido — a função `api/page` · A faixa de avisos · Modo prévia · Quem pode enquadrar a loja.
- `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- `palette.test.ts` reprova 32 casos na suíte inteira da loja. É trabalho em curso da tarefa 02 (não toquei no arquivo), e a suíte só fica verde quando a 02 fechar.
- A tarefa diz que a 01 entrega "o hook do perfil salvo em `@estrelinha/core/appearance`". Na árvore ele está em `@estrelinha/core/hooks/useStyleProfile` e devolve `{ profile, isLoading }`. Usei de lá. Não é citação morta.
- As linhas citadas em `useAnnouncementBar.ts:45-49, :75-80` conferem com `CHAVE_DA_CARGA` e com a trava `navegou`. Extraí as duas para o utilitário.
- No check de mutação, tirar `preview &&` da condição do rascunho ficou verde. É mutante equivalente, porque o recebedor só guarda rascunho com `preview` ligado. Mantive o `preview &&` por clareza.
- Nos meus arquivos de produção, o nome do atributo vem sempre de `STYLE_PROFILE_ATTRIBUTE`, inclusive nos comentários, que só o descrevem. Os testes também usam a constante. O guarda de dono único da 02 ainda não existia quando rodei.
- CA-02 (sem pintura no Padrão antes, com rede lenta) e a prévia num iframe de verdade só se provam em navegador e ficam para a Validation. jsdom não mede pintura.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 05
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; apps/store/CLAUDE.md › O HTML servido — api/page · A faixa de avisos · Modo prévia · Quem pode enquadrar a loja; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - carga com atributo vs configuração diferente: apps/store/src/app/__tests__/StyleProfileApplier.test.tsx › "na carga do documento"
  - troca de rota e volta à rota da carga: idem › "depois da primeira troca de rota"
  - sem atributo / configuração desconhecida ⇒ padrao: idem › "sem o atributo da carga"
  - prévia em iframe (draft do pai), fora de iframe, outra janela, outro carimbo, ready para a origem: idem › "na prévia do painel"
  - a faixa decide igual depois da extração: suíte existente AnnouncementBar.test.tsx, intocada, 44/44, com mutação no utilitário derrubando 2 casos
  - extra: apps/store/src/app/__tests__/perfilMontado.test.ts (o aplicador montado no App.tsx)
  - sem cobertura: CA-02 em navegador (pintura com rede lenta), que é da Validation
Verificações: vitest dos arquivos tocados verde (44, 17, 5); suíte da loja 7469/7501, com as 32 falhas só em palette.test.ts (tarefa 02 em curso); tsc da loja 0 erros (baseline limpo); eslint da loja 2/2, igual ao baseline
Árvore de trabalho: criados apps/store/src/shared/lib/useNavigatedSinceLoad.ts, apps/store/src/app/StyleProfileApplier.tsx, apps/store/src/app/useStyleProfilePreview.ts e os testes StyleProfileApplier.test.tsx e perfilMontado.test.ts; alterados apps/store/src/app/App.tsx e apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts; nada commitado
Citações conferidas: 4 (useAnnouncementBar.ts:45-49/:75-80, useAnnouncementPreview.ts, RuntimeSettingsLoader no App.tsx, core/appearance da 01); nenhuma deslocada nem morta; o hook do perfil salvo está em core/hooks/useStyleProfile, não em core/appearance
```

## T05 — wi-impl-review · done · agente a473e3102720138d0

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/05-aplicador-do-perfil-na-loja.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| com o atributo `black-friday` na carga e a configuração `padrao`, a página não troca de cor até a primeira troca de rota (teste) | `StyleProfileApplier.tsx` (cadeia `!navegou && atributo`); teste "vale o perfil do atributo, e a configuração diferente não o troca…" e "depois da primeira troca de rota › vale a configuração" em `app/__tests__/StyleProfileApplier.test.tsx` | sim |
| em prévia, o rascunho aplica o perfil e fora da prévia não (teste) | `useStyleProfilePreview.ts` (`isPreviewWindow`, `event.source !== window.parent`); testes "a mensagem de rascunho do pai aplica o perfil", "mensagem de outra janela", "com ?preview=1 fora de iframe" | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver seção Testes | sim |
| testes dos arquivos alterados, passando — só deles | — | só execução |
| `tsc` de cada projeto tocado sem erro novo e a suíte do workspace tocado | — | só execução |

## Obrigações

- Rodar a suíte inteira da loja e `npx tsc --noEmit -p apps/store/tsconfig.app.json`: só execução. Não tenho como conferir aqui.
- `eslint` da loja sem erro novo (baseline 2/2): só execução. Na leitura do diff não vi nenhum construto que o lint costume acusar (sem `any`, deps do `useLayoutEffect`/`useEffect` completas).

## Testes

- Na carga, o atributo vale e a configuração diferente não o troca sem troca de rota: dois casos em `StyleProfileApplier.test.tsx` ("vale o perfil do atributo…", que faz rerender com `padrao` chegando, e "o atributo Padrão também segura a carga contra a configuração Black Friday"). A asserção morde: um aplicador que aplicasse o salvo de saída escreveria o perfil errado.
- Depois da primeira troca de rota vale a configuração, e voltar não devolve a decisão ao atributo: "vale a configuração" e "voltar à rota da carga não devolve a decisão ao atributo", com `navigate(-1)` de volta à entrada `default`. Morde: sem a trava, a volta reaplicaria `black-friday`.
- Sem atributo decide a configuração, e configuração desconhecida ⇒ `padrao`: "decide a configuração", "a configuração desconhecida vale Padrão também na carga sem atributo" (valor `42`) e a variante depois de navegar. Morde: escrever o valor cru reprovaria. Há dois casos a mais: o atributo `natal` é tratado como "não sei", e o `<html>` fica intocado enquanto a configuração carrega.
- Em prévia dentro de iframe, o `draft` do pai aplica; fora de iframe, ou de outra janela, nada muda: seis casos, entre eles o `ready` só para a origem do `referrer`, nenhum `ready` sem referrer, e a recusa de outro carimbo. A asserção morde: o caso "outra janela" passa `source = window` com `parent` dublado.
- A faixa de avisos decide igual depois da extração: a suíte dela ficou intocada (`git status` em `widgets/announcement-bar` mostra só `model/useAnnouncementBar.ts`). A extração preserva a constante da chave lida no carregamento do módulo e a trava por `ref` por instância.
- Além do pedido: `perfilMontado.test.ts` (importado, sem condição, dentro do `BrowserRouter`, fora das `Routes`), com âncora e sensores que chamam a própria régua.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Sempre escreve `data-perfil`, o `padrao` incluído; nunca o remove | sim | A tarefa: "escolha uma forma e registre". O comentário de cabeçalho do aplicador registra a escolha | sim |
| 2 | Com `isLoading` e sem atributo válido, o `<html>` não é tocado | sim | RN-04. O `useStyleProfile` de core separa `isLoading` justamente para isso (comentário do hook) | sim |
| 3 | Atributo desconhecido é "não sei" | sim | Mesmo molde do `lerAtributo` da faixa (`'1' \| '0'`, senão null) | sim |
| 4 | Na prévia o rascunho vence; antes de ele chegar vale a regra normal | sim | Molde da faixa ("o publicado até o rascunho chegar"), apps/store/CLAUDE.md › A faixa de avisos | sim. A 07 está listada. A 07 não fala em esperar o `ready`, mas a dependência está declarada no raio |
| 5 | Um `ready` ao montar para a origem do `referrer`; sem referrer, nada; só `draft` de `window.parent` com o carimbo | sim | R11 e o molde de `useAnnouncementPreview.ts` (mesmo `origemDoPai`) | sim |
| 6 | O utilitário como hook `useNavigatedSinceLoad`, com a chave no carregamento do módulo e a trava `ref` por instância | sim | Contrato: "comportamento idêntico". O código extraído é byte a byte o que estava em `useAnnouncementBar.ts` | sim |
| 7 | Aplicador e recebedor em `app/`; montado depois do `ScrollToTop`, sem condição, dentro do Router e fora das `Routes` | sim | O contrato põe o aplicador em `app/` dentro do `BrowserRouter`. Ninguém mais consome o recebedor | sim |
| 8 | O guarda `perfilMontado.test.ts` | sim | A lição "teste não monta a árvore que prova": o teste de componente monta o aplicador ele mesmo | sim |

## Não conferido

- O resultado de execução: suíte da loja, `tsc` e `eslint`. Só a execução prova.
- CA-02 (nenhuma pintura com a paleta Padrão em rede lenta) e a cor efetivamente renderizada: são de navegador e cabem à Validation.
- Todos os arquivos de `alterados` têm baseline: o diff mostrou os criados como `A` (intent-to-add) e os existentes como `M`.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/CLAUDE.md` (raiz, no contexto) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/store/CLAUDE.md` › O HTML servido — a função `api/page` · A faixa de avisos · Modo prévia (feature `25`) · Quem pode enquadrar a loja.

## T04 — wi-impl-task · review · agente a57cde5ecaa51c752

Tarefa: .specs/work-items/100-perfil-de-estilo-da-loja/tasks/04-html-servido-com-o-perfil.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | `PageSettings` ganhou `styleProfile: StyleProfile \| null` como campo obrigatório. `lerConfiguracoes` normaliza com `styleProfileOf(s?.styleProfile)` quando a leitura dá certo e devolve `null` quando falha | campo opcional; normalizar só em `server/page.ts` | H6 diz que o servidor sempre escreve o perfil normalizado. Normalizar dentro de `core` faz o valor desconhecido virar `padrao` (RN-07) mesmo que outro leitor passe o valor cru. Com o campo obrigatório, o `tsc` aponta cada dublê que ficou para trás | os dublês de `PageSettings` (serve, productHead, server/page). Uma tarefa seguinte que monte `PageDeps` precisa informar o campo |
| 2 | `marcarFaixa` virou `marcarHtml(resposta, config)`. Ela marca faixa e perfil, e põe `no-store` quando qualquer um dos dois é `null` | uma segunda função de pós-processamento só para o perfil | R9 manda reusar o caminho da faixa. Ler a configuração uma vez e marcar uma vez mantém o atributo e o cache com um dono só | serve.ts |
| 3 | `markStyleProfile(html, null)` também apaga um `data-perfil` que já esteja na tag, como `markAnnouncementBar` faz com `null` | só deixar de escrever e manter o que estava | o molde da faixa faz assim. "Leitura falhou" tem de produzir o atributo ausente, nunca um perfil herdado do shell | head.ts. A tarefa 05 lê o atributo ausente como "não sei" |
| 4 | Ordem dos atributos na tag: `lang`, depois `data-faixa`, depois `data-perfil` (o perfil é marcado por último) | outra ordem | nenhum leitor depende da ordem. Fica fácil de desfazer | as asserções exatas dos testes |
| 5 | Os testes antigos que comparavam o corpo exato (`<html data-faixa="0">` e parecidos) foram reescritos com ` data-perfil="padrao"` | trocar por `toContain` | a regra 7 proíbe afrouxar asserção. Com o servidor sempre escrevendo o perfil (H6), a régua continua de igualdade, agora com o atributo novo | serve.test.ts, productHead.test.ts, server/__tests__/page.test.ts |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | `markStyleProfile` substitui o atributo existente, preserva `lang` e `data-faixa`, `null` não escreve (e tira o que estava), HTML sem `<html>` sai intacto | unidade | packages/core/src/page/__tests__/head.test.ts (`markStyleProfile — …`, 8 casos) | sim | — |
| 2 | Produto, categoria, fixa, app, Home e 404 levam o perfil salvo (Black Friday e Padrão), com o cache de sempre | unidade | packages/core/src/page/__tests__/serve.test.ts (`servePage — o <html> chega com o perfil…`) | sim | — |
| 3 | Configuração que falha tira os dois atributos e põe `no-store` | unidade | idem, `it.each(RAMOS)` da falha | sim | vermelho (mutei o catch de `lerConfiguracoes` para devolver `'padrao'`: 15 casos caíram, restaurado e conferido com `cmp`) |
| 4 | O 301 passa intacto, também com a configuração falhando | unidade | idem, os dois casos do 301 | sim | vermelho (tirei o guarda de Content-Type de `marcarHtml`: o caso novo do 301 com falha caiu, restaurado e conferido com `cmp`) |
| 5 | Perfil desconhecido gravado sai `padrao`, sem erro | unidade | idem, `it.each` com `neon`, `''`, `Black-Friday` e `black-friday ` | sim | — |
| 6 | A leitura do servidor pede as quatro chaves numa consulta (lista comparada por igualdade), linha ausente ⇒ `padrao`, valor desconhecido ⇒ `padrao`, erro lança | servidor | apps/store/server/__tests__/page.test.ts (`readSettings: as quatro chaves…`, `…sem a do perfil ⇒ Padrão`, `aparência com %s ⇒ Padrão`, e o caso de erro que já existia) | sim | — |
| 7 | De ponta a ponta pelo handler: com `appearance = { profile: 'black-friday' }`, o HTML da Home sai com `data-perfil="black-friday"` e cache de 3600 s | servidor | idem, `com o perfil Black Friday salvo, o HTML servido já chega…` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

packages/core/src/page/head.ts alterado
packages/core/src/page/serve.ts alterado
packages/core/src/page/__tests__/head.test.ts alterado
packages/core/src/page/__tests__/serve.test.ts alterado
packages/core/src/page/__tests__/productHead.test.ts alterado
apps/store/server/page.ts alterado
apps/store/server/__tests__/page.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/core exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), por fatia, em head.test.ts, serve.test.ts e src/page: verde no fim (345 casos em src/page).
- `pnpm --filter @estrelinha/store exec vitest run server/__tests__/page.test.ts --testTimeout=20000` (PROJECT.md): 57 de 57 passaram.
- `npx tsc --noEmit -p packages/core/tsconfig.json` (CLAUDE.md › Comandos/Baselines): 11 erros, os mesmos 11 herdados da baseline (home/carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). O 12º, em productHead.test.ts e causado pelo campo novo, foi corrigido. Nenhum erro novo.
- `npx tsc --noEmit -p apps/store/tsconfig.server.json` (CLAUDE.md › Baselines): 0 erros (baseline 0).
- `pnpm --filter @estrelinha/core test --testTimeout=20000` (CLAUDE.md › Baselines): 6092 de 6092 passaram em 256 arquivos, exit 0.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 7611 de 7611 passaram em 408 arquivos. Mesmo assim o comando saiu com exit 1, por um `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` (contenção do worker, a mesma que o CLAUDE.md registra na nota de 2026-11-09). Nenhum teste reprovou. A árvore tinha as tarefas 02 e 05 rodando ao mesmo tempo.

Instruções lidas: CLAUDE.md (raiz; estava no contexto) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; apps/store/CLAUDE.md › O HTML servido — a função `api/page` · A faixa de avisos; packages/core/CLAUDE.md › Pureza · Os módulos; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- As citações de linha de `serve.ts` deslocaram. `marcarFaixa` estava em :255 e `lerConfiguracoes` em :401, mais ou menos como a tarefa dizia. Relocalizei pelos nomes.
- Mudar o comportamento de toda resposta HTML (o perfil sempre escrito, H6) quebrou asserções exatas antigas fora do bloco `Testes`: `serve.test.ts` (31 casos, inclusive o bloco da faixa do WI 101), `productHead.test.ts` (MTA-18) e dois casos do handler em `server/__tests__/page.test.ts`. Todas foram reescritas com o atributo novo e continuam comparando por igualdade.
- Os casos do 301 e da falha passaram de primeira antes da implementação, porque o perfil ainda nem era escrito. Por isso fiz o check de mutação depois de implementar (fatias 3 e 4: vermelho). Somei um caso, "o 301 com a leitura falhando não vira no-store": sem ele, apagar o guarda de Content-Type passaria despercebido.
- O arquivo temporário compartilhado (`$TMPDIR/wi-impl-saida.txt`) foi sobrescrito por uma tarefa paralela no meio de uma leitura. Passei a gravar a saída no scratchpad da sessão. Não afetou nenhum resultado.
- `apps/store/CLAUDE.md` (O HTML servido) só descreve o `data-faixa` no `<html>`. O `data-perfil` passou a sair em toda resposta HTML. Não alterei a documentação: atualizar o CLAUDE.md fica para o fecho do WI.
- Nenhuma tarefa seguinte (05, 06, 07) afirma algo que esta mudança torne falso. Não houve propagação.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 04
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines; apps/store/CLAUDE.md › O HTML servido — api/page · A faixa de avisos; packages/core/CLAUDE.md › Pureza · Os módulos; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: markStyleProfile (substitui, preserva lang/data-faixa, null não escreve e tira o que estava, sem <html> intacto) — packages/core/src/page/__tests__/head.test.ts; os ramos com o perfil salvo (Home, produto, categoria, fixa, app, 404), a falha sem os dois atributos e com no-store, o 301 intacto (também com a falha), o perfil desconhecido ⇒ padrao — packages/core/src/page/__tests__/serve.test.ts; as quatro chaves numa consulta (igualdade), linha ausente ⇒ padrao, valor desconhecido ⇒ padrao, erro lança (caso que já existia), e o handler com black-friday de ponta a ponta — apps/store/server/__tests__/page.test.ts. Nada ficou sem cobertura.
Verificações: tsc core 11 (= baseline herdada, nenhum novo); tsc tsconfig.server.json 0; suíte core 6092/256 exit 0; suíte store 7611/408, todos os testes verdes, exit 1 só por um "Timeout calling onTaskUpdate" do worker (contenção, nenhum teste reprovou); check de mutação: 2 mutantes, os 2 mortos por asserção.
Árvore de trabalho: packages/core/src/page/head.ts, packages/core/src/page/serve.ts, packages/core/src/page/__tests__/{head,serve,productHead}.test.ts, apps/store/server/page.ts, apps/store/server/__tests__/page.test.ts — nada commitado.
Citações conferidas: 6 abertas (head.ts:94-116, serve.ts PageSettings/:220/:255-262/:401-414, server/page.ts:203-219, page.test.ts:284-303); deslocaram levemente as de serve.ts (relocalizadas pelo nome); nenhuma morta.
```

## T04 — wi-impl-review · done · agente ab49a66e6feb13003

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/04-html-servido-com-o-perfil.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| com `appearance = { profile: 'black-friday' }`, todo HTML servido traz `data-perfil="black-friday"` no `<html>`, provado por teste | `serve.ts › marcarHtml` (chama `markStyleProfile` sobre toda resposta `text/html`); `server/page.ts › readSettings` (`'appearance'` no `.in`, `normalizeAppearance(...).profile`); testes: `serve.test.ts` it.each de 7 ramos com Black Friday, `server/__tests__/page.test.ts` "com o perfil Black Friday salvo, o HTML servido já chega com data-perfil=\"black-friday\"" | sim |
| com a leitura falhando, o HTML sai sem o atributo e com `no-store` | `serve.ts › lerConfiguracoes` (catch devolve `styleProfile: null`) + `marcarHtml` (`naoSei` ⇒ `PAGE_CACHE.error`); `head.ts › markStyleProfile(null)` remove o atributo; teste it.each de 7 ramos com `readSettings` lançando | sim |
| cada comportamento do bloco `Testes` coberto por um teste | ver seção Testes | sim |
| testes dos arquivos alterados, passando | — | só execução |
| `tsc` de cada projeto tocado sem erro novo e a suíte do workspace tocado | — | só execução |

## Obrigações

- `.ts` explícito em todo especificador relativo de `core/page/**`: aplicado — `head.ts` importa `'../appearance/types.ts'`, `serve.ts` importa `'../appearance/normalize.ts'` e `'../appearance/types.ts'`; o grafo de `appearance` (`types.ts`, `normalize.ts`, `preview.ts`, `copy.ts`, barril) também tem extensão em tudo.
- Lista do `.in` comparada por igualdade: aplicado — `page.test.ts` passou a `toEqual([['in', 'key', ['google_shopping', 'seo', 'announcements', 'appearance']]])`, sem `toContain`.
- Rodar as suítes de `core` e da loja e os dois `tsc`: não dá para conferir pelo diff (vai em Não conferido).

## Testes

- `head.test.ts` · `markStyleProfile`: substitui sem duplicar (igualdade exata mais contagem de `data-perfil=` igual a 1), mantém `lang` e `data-faixa`, `null` não escreve (e apaga o que já estava), texto `data-perfil` no corpo fica, HTML sem `<html>` volta intacto. A asserção morde: é igualdade byte a byte.
- `serve.test.ts` · Home, produto, categoria, fixa, app e dois 404 levam o perfil salvo: it.each com `tagHtml` exato, contagem e `Cache-Control` do ramo inalterado. Morde.
- `serve.test.ts` · configuração que falha ⇒ sem os dois atributos e `no-store`: `tagHtml === '<html>'`, `perfis === []`, `no-store`, o status do ramo. Morde.
- `serve.test.ts` · 301 intacto: dois casos (config boa e config falhando), com `headers` por `toEqual` exato. Morde.
- `serve.test.ts` · perfil desconhecido ⇒ `padrao`: `neon`, `''`, `Black-Friday`, `black-friday ` (sobre `lerConfiguracoes` → `styleProfileOf`), com o cache de sempre e sem log. Morde.
- `server/__tests__/page.test.ts` · quatro chaves numa consulta: lista por igualdade, `chamadas` com tamanho 1, retorno com `styleProfile: 'black-friday'`. Morde.
- `server/__tests__/page.test.ts` · linha ausente ⇒ `padrao`: o caso "sem a do perfil ⇒ Padrão" (igualdade) mais um it.each com valor desconhecido, nulo, de outro tipo e sem `profile`. Morde.
- `server/__tests__/page.test.ts` · erro lança: o caso `readSettings: erro do PostgREST LANÇA` (linha 362) já existia e vale para a consulta nova. Coberto.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `styleProfile: StyleProfile \| null` obrigatório em `PageSettings`; normalizado em `lerConfiguracoes`, `null` na falha | sim | H6 (`spec.md:193`) e R9 (`spec.md:184`) mandam o servidor sempre escrever o perfil normalizado. Fora de `core/page` e `server/`, nenhum arquivo monta `PageSettings` (grep de `announcementBar`) | sim |
| 2 | `marcarFaixa` → `marcarHtml(resposta, config)`, com `no-store` se qualquer um dos dois for `null` | sim | R9 pede "no mesmo pós-processamento". O cache por ramo não muda: só o caminho de falha, que já era `no-store` | sim |
| 3 | `markStyleProfile(html, null)` apaga um `data-perfil` que já esteja na tag | sim | É o mesmo que `markAnnouncementBar` faz (`head.ts:113-115`). A tarefa 05 (R2) trata o atributo ausente como "não sei" | sim |
| 4 | Ordem `lang`, `data-faixa`, `data-perfil` | sim | Nenhum leitor depende da ordem. A 05 lê o atributo pelo nome | sim |
| 5 | Asserções exatas antigas reescritas com ` data-perfil="padrao"`, sem afrouxar | sim | Todas seguem por igualdade (`toBe`/`toEqual`). Os poucos `toContain` de `serve.test.ts:1061` e `:1093` já eram `toContain` antes e ganharam o atributo novo | sim |

## Não conferido

- Não rodei testes nem `tsc` (`packages/core/tsconfig.json`, `apps/store/tsconfig.server.json`). A revisão não executa nada. Conferi por leitura um ponto de tipo: os `vi.fn(async () => ({ ..., styleProfile: 'padrao' }))` declarados soltos em `serve.test.ts` (~1057, ~1088, ~1393) só chegam ao `deps(...)` dentro de um spread de `as any`. Por isso o literal alargado para `string` não deve gerar erro, mas só o `tsc` prova.
- Os sete alterados aparecem em `git diff` como `M`. Há baseline, e nenhum arquivo precisou ser julgado inteiro.
- Não conferi se tarefas anteriores da corrida tocaram esses mesmos arquivos. Todo hunk lido é explicado por esta tarefa.
- Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz; ele chega no contexto, e leio as seções que a tarefa cita: Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines) › `apps/store/CLAUDE.md › O HTML servido — a função api/page` (lido no worktree). Não abri `apps/store/CLAUDE.md › A faixa de avisos` nem `packages/core/CLAUDE.md › Pureza · Os módulos`. A pureza do grafo novo, eu conferi direto nos imports de `appearance/*` (só relativos com `.ts`, sem pacote).

## T02 — wi-impl-task · review · agente a13b34a71c60555f2

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/02-paleta-por-perfil.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | A forma do contrato: `ESTRELINHA_PROFILES: Record<StyleProfile, Record<EstrelinhaColorToken, string>>`, em que `padrao` é a própria referência de `ESTRELINHA_COLORS` e `black-friday` é `{...ESTRELINHA_COLORS, <o que muda>}`. A sombra fica em `ESTRELINHA_PROFILE_SHADOW_RGB: Record<StyleProfile, string>` (`'52 73 94'` / `'22 21 20'`). Também exporto `EstrelinhaColorToken`, `ESTRELINHA_COLOR_VARIABLES` e `ESTRELINHA_SHADOW_VARIABLES`, que o Tailwind da loja lê. | Abrir o C2 do `spec.md` (proibido pela regra 5). Também descartei um objeto `{ colors, shadow }` por perfil. | Mapa plano é o mais simples de consumir. Com o Padrão sendo `ESTRELINHA_COLORS`, o ateliê e a loja não têm como divergir. | Tarefa 07, que lê as amostras de `ESTRELINHA_PROFILES`; propagado. Tarefa 06, que usa `--estrelinha-shadow-rgb` e `--estrelinha-ink-rgb`: os dois existem. |
| 2 | O bloco `html[data-perfil="black-friday"]` declara só o que muda (hex, `-rgb`, sombra, HSL). O leitor do Black Friday reproduz a cascata: `:root` e, por cima, o bloco do perfil. | Repetir a paleta inteira no bloco do Black Friday. | É exatamente o que o navegador faz. Repetir seria uma terceira cópia. | `apps/store/src/test/paletteFromSource.ts` e quem chama `paletteFromSource(perfil)`. |
| 3 | A camada HSL do Black Friday redefine todas as variáveis do shadcn cujo token muda: foreground, card/popover/secondary-foreground, primary, secondary, muted, accent, muted-foreground, accent-foreground, border, input e ring. O guarda confere as 17 variáveis contra o token de cada perfil, com até meio ponto de diferença. | Seguir só a lista do R5, que deixava secondary, muted, accent (ground-deep) e secondary-foreground no Padrão. | Sem isso, `<Dialog>`/`<Select>` ficariam com o ground-deep e o ink do Padrão no Black Friday, que é o "terceiro lugar" do DESIGN.md §2. | Só a aparência dos componentes do shadcn no Black Friday. O Padrão não muda (HSL de hoje fixado literal). |
| 4 | O guarda de dono único dos hex varre `apps/**` e `packages/ui/**`. `packages/core` fica fora, e o motivo está escrito no arquivo. | Varrer `packages/**`, ou incluir `core/campaigns/limits.ts` na lista de exceções. | `CAMPAIGN_DEFAULT_COLORS`/`CAMPAIGN_COLOR_PRESETS` têm `#161514` e `#C2A063`. São cores da faixa de campanha que a dona escolhe e o banco grava, iguais às do Black Friday por coincidência. Não posso tocar em `packages/core`. | Só o próprio guarda. Um hex do Black Friday escrito em `packages/core` não é acusado. |
| 5 | A sombra de peso (`estrelinha-ink`) lê `--estrelinha-ink-rgb`, e as duas suaves leem `--estrelinha-shadow-rgb`. | Uma variável única de sombra para as três. | No Padrão as três resolvem nos valores de hoje (o teste expande e compara com `ESTRELINHA_SHADOW`). No Black Friday o ink vale `22 21 20`, igual à sombra do desenho. | As sombras da loja. |
| 6 | O `-rgb` nasce para todos os 23 tokens de cor; os véus `on-ink` em rgba não ganham. | Criar o `-rgb` só para os tokens que mudam. | Toda classe `estrelinha-*` do Tailwind lê `-rgb`; faltando a variável, a classe fica sem cor. | `App.css`. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O `App.css`, bloco a bloco, é igual a `ESTRELINHA_PROFILES[perfil]` em hex, `-rgb`, HSL e sombra; sensor: hex, canal, HSL ou sombra do Black Friday trocados reprovam | guarda | `apps/store/src/shared/lib/__tests__/palette.test.ts` | sim | vermelho |
| 2 | O Padrão tem os mesmos hex e HSL de hoje (CA-01) | guarda | `palette.test.ts` | sim | vermelho |
| 3 | Os pisos de texto valem em cada perfil, os tetos só no Padrão, os pares de desconto passam; sensor de valor reprovado | guarda | `apps/store/src/shared/lib/__tests__/contrast.test.ts` | sim | vermelho |
| 4 | O piso de 3:1 da borda de campo vale em cada perfil, com sensor | guarda | `apps/store/src/shared/lib/__tests__/fieldBorder.test.ts` | sim | vermelho |
| 5 | O ateliê continua entregando `ESTRELINHA_COLORS` e `ESTRELINHA_SHADOW` por `toBe`; a loja entrega as variáveis do dono | guarda | `palette.test.ts` | sim | — |
| 6 | `importOrder.test.ts` segue verde; o `theme-color` é lido contra o dono, não contra o Black Friday | guarda | `apps/store/src/app/__tests__/brandAssets.test.ts`, `importOrder.test.ts` | sim | vermelho (theme-color trocado em `index.html`, depois restaurado) |
| 7 | Dono único dos hex do Black Friday e do literal do atributo (sensores e inversos) | guarda | `apps/store/src/shared/lib/__tests__/perfilDeEstiloComDonoUnico.test.ts` | sim | vermelho (hex injetado em `packages/ui/src/button.tsx`, depois restaurado) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

packages/ui/src/tokens/estrelinha.ts alterado
apps/store/tailwind.config.ts alterado
apps/store/src/app/App.css alterado
apps/store/src/test/paletteFromSource.ts alterado
apps/store/src/shared/lib/__tests__/palette.test.ts alterado
apps/store/src/shared/lib/__tests__/contrast.test.ts alterado
apps/store/src/shared/lib/__tests__/fieldBorder.test.ts alterado
apps/store/src/app/__tests__/brandAssets.test.ts alterado
apps/store/src/shared/lib/__tests__/perfilDeEstiloComDonoUnico.test.ts criado
.specs/work-items/100-perfil-de-estilo-da-loja/tasks/07-card-do-perfil-no-painel.md alterado

## Verificação

- Um arquivo de teste, `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000` (fonte: PROJECT.md › Comandos de verificação). Os 6 arquivos da tarefa (palette, contrast, fieldBorder, brandAssets, importOrder, perfilDeEstiloComDonoUnico) deram 318/318, exit 0. Os dois arquivos do ateliê que leem `ESTRELINHA_COLORS` (`manifest.test.ts`, `splashEstatica.test.tsx`) deram 24/24.
- Tipos, `npx tsc --noEmit -p …` (fonte: CLAUDE.md › Comandos/Baselines):
  - `apps/store/tsconfig.app.json`: 0 erros (baseline 0).
  - `apps/mobile-adm/tsconfig.app.json`: 0 erros (baseline 0).
  - `packages/core/tsconfig.json`: 11 erros, os mesmos herdados da baseline (carousel e outros); nenhum novo.
- Suíte da loja, `pnpm --filter @estrelinha/store test --testTimeout=20000` (fonte: CLAUDE.md › Baselines), rodada duas vezes. Nas duas: 409 arquivos e 7622/7622 testes verdes, mas exit 1 por um `Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. O CLAUDE.md registra esse erro como contenção, não como teste; as tarefas 04 e 05 rodavam na mesma árvore ao mesmo tempo.
- `pnpm --filter @estrelinha/store build` (fonte: CLAUDE.md › Comandos), item do `Pronto quando`. Sem env, falha: o worktree não tem `.env` e o `index.html` dá "URI malformed". Com `VITE_SUPABASE_URL=http://127.0.0.1:54441 VITE_SUPABASE_PUBLISHABLE_KEY=placeholder`, exit 0. No CSS gerado: `.text-estrelinha-ink{…color:rgb(var(--estrelinha-ink-rgb) / var(--tw-text-opacity, 1))}`, `.border-estrelinha-line\/70{border-color:rgb(var(--estrelinha-line-rgb) / .7)}` (a opacidade foi preservada), `html[data-perfil=black-friday]{--estrelinha-ink: #161514;…}` e a sombra lendo `--estrelinha-shadow-rgb`.

Instruções lidas: `CLAUDE.md` (o do worktree é idêntico ao da raiz principal; seções Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines) · `apps/store/CLAUDE.md` › Design system · `apps/store/CLAUDE.md` › Mobile · `apps/store/CLAUDE.md` › Ícones e marca · `packages/ui/CLAUDE.md` (inteiro) · `DESIGN.md` §1–§4 · `.specs/project/PROJECT.md` › Comandos de verificação · `.specs/project/PROJECT.md` › Ambiente local.

## Divergências e descobertas

- Divergência com o R5: a lista de variáveis HSL do Black Friday foi ampliada (premissa 3).
- Divergência com a decisão do guarda de dono único: os hex não são medidos em `packages/core`, por causa das cores de campanha que coincidem (premissa 4).
- Não abri o C2 do `spec.md`, que a tarefa cita no Contrato; a regra 5 proíbe abrir a costura. Decidi a forma (premissa 1).
- Propaguei a forma `ESTRELINHA_PROFILES[perfil][token]` e o import `@estrelinha/ui/tokens/estrelinha` para a tarefa 07. A tarefa 06 não precisou de correção: os tokens `sale`/`on-sale`/`sale-bar`, `--estrelinha-shadow-rgb` e `--estrelinha-ink-rgb` existem.
- O build da loja no worktree só passa com env de placeholder, porque falta `apps/store/.env`. É ambiente, não código.
- A suíte da loja fecha com 1 erro de RPC de worker (contenção) nas duas rodadas, com todos os testes verdes.
- O CA-01 por captura em 390 e 1440 não foi executado: é validação em navegador, da Validation e do QA. O guarda prova que no Padrão os hex, os HSL e a sombra (expandida) são os de hoje.
- Citações conferidas, todas no lugar:
  - `estrelinha.ts:38-81` (ESTRELINHA_COLORS) e `:115-119` (shadow)
  - `App.css:173-215` (shadcn, que vai de fato até a 212)
  - `contrast.test.ts:107-124` (tetos, na faixa 103–131)
  - `palette.test.ts:182-220`
  - `brandAssets.test.ts:523-532`
  - `freeShippingSingleOwner.test.ts`
  - `paletteFromSource.ts`
- Os seis checks de mutação foram restaurados pela cópia e conferidos com `cmp`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines); apps/store/CLAUDE.md › Design system · Ícones e marca; packages/ui/CLAUDE.md; DESIGN.md (§1–§4); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: paleta bloco a bloco × ESTRELINHA_PROFILES (hex, -rgb, HSL, sombra) com sensores — palette.test.ts; Padrão igual ao de hoje (hex e HSL literais) — palette.test.ts; pisos por perfil, tetos só no Padrão, pares de desconto e sensores — contrast.test.ts; borda de campo por perfil com sensor — fieldBorder.test.ts; ateliê por identidade e loja pelas variáveis do dono — palette.test.ts; theme-color contra o dono (e não o do BF) — brandAssets.test.ts, importOrder.test.ts intocado e verde; dono único dos hex do BF e do literal do atributo, com sensores e inversos — perfilDeEstiloComDonoUnico.test.ts. Sem cobertura: a captura de CA-01 em 390/1440 (navegador, fora desta tarefa).
Verificações: tsc store 0 · mobile-adm 0 · core 11 herdados; os 6 arquivos da tarefa 318/318; ateliê manifest+splash 24/24; suíte da loja 7622/7622 em 409 arquivos (exit 1 só pelo timeout de RPC do worker, contenção, duas rodadas); build da loja verde com env placeholder (sem .env no worktree).
Árvore de trabalho: packages/ui/src/tokens/estrelinha.ts, apps/store/tailwind.config.ts, apps/store/src/app/App.css, apps/store/src/test/paletteFromSource.ts, apps/store/src/shared/lib/__tests__/{palette,contrast,fieldBorder}.test.ts, apps/store/src/app/__tests__/brandAssets.test.ts, apps/store/src/shared/lib/__tests__/perfilDeEstiloComDonoUnico.test.ts (novo), tasks/07 (propagação). Nada commitado.
Citações conferidas: 9 abertas ao usar; nenhuma deslocada de forma relevante (App.css shadcn vai até a 212, contrast tetos na faixa 103–131); nenhuma morta.
Propagado: 07 — a linha "Depende de" ganhou a forma `ESTRELINHA_PROFILES[perfil][token]` e o import `@estrelinha/ui/tokens/estrelinha`.
```

## T02 — wi-impl-review · fixing · agente ada0a88e27f0cd938

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/02-paleta-por-perfil.md
Veredito: serve com correção

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| 1 | contrato torto | atrapalha | packages/ui/src/tokens/estrelinha.ts:22 | O `StyleProfile` é importado pelo alias `import type { StyleProfile } from "@estrelinha/core/appearance"`. O contrato pede caminho relativo com `.ts`. O cabeçalho do próprio arquivo (linhas 17-18) diz que ele é importado "por caminho RELATIVO nos `tailwind.config.ts` e no `vite.config.ts` do app do ateliê, porque arquivo de config não passa pelo alias do Vite". Hoje nada quebra, porque o `import type` some na transpilação. A forma, porém, é outra que a do contrato, e a premissa 1 não declara a troca. | spec.md C2 (a tarefa diz "Sai: o contrato C2 do `spec.md`"): "o tipo `StyleProfile` vem de `core` por `import type` relativo com `.ts`" |
| 2 | identificador de processo | atrapalha | apps/store/src/shared/lib/__tests__/palette.test.ts:130 | Comentário de código que cita um critério do Work Item: `/** Os HSL do Padrão como estão escritos hoje — CA-01: com o perfil Padrão, nada muda. */` | regra do workflow: identificador de processo não entra no código |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| Com `data-perfil` ausente ou `padrao`, o CSS gerado da loja tem os valores de hoje | `App.css` `:root`: o hex e o HSL de antes, intocados (conferido contra `git show HEAD`), mais as variáveis `-rgb` e `--estrelinha-shadow-rgb: 52 73 94`. Provado em `palette.test.ts`: `PALETA`, `HSL_DO_PADRAO_DE_HOJE` e as sombras resolvidas iguais a `ESTRELINHA_SHADOW` | sim |
| Com `html[data-perfil="black-friday"]`, as variáveis valem as do BF, e os guardas medem os dois perfis | Bloco BF em `App.css`; `paletteFromSource(perfil)` com a cascata; `describe.each(STYLE_PROFILES)` em `palette`, `contrast` e `fieldBorder` | sim |
| `pnpm --filter @estrelinha/store build` verde | — | só execução |
| Cada comportamento do bloco `Testes` coberto por um teste escrito | Ver seção Testes | sim |
| Testes dos arquivos alterados passando | — | só execução |
| `tsc` de cada projeto tocado e a suíte do workspace | — | só execução |

## Obrigações

- **Opacidade preservada:** cumprida. `ESTRELINHA_COLOR_VARIABLES` usa `rgb(var(--estrelinha-<t>-rgb) / <alpha-value>)`, e os 23 `-rgb` estão declarados no `:root` (`App.css`). Nenhum consumidor de `theme()` ou de `resolveConfig` lê as cores (grep vazio).
- **Tailwind só de `apps/store`:** cumprida. `apps/mobile-adm` e `apps/backoffice` estão sem modificação.
- **Guarda não se afrouxa:** cumprida. Os testes antigos de `contrast` e `fieldBorder` continuam, com vizinhas novas. O `toBe` da loja virou identidade com os objetos por variável, mais a vizinha "deixou de entregar hex". No ateliê, o `toBe` ganhou também o de `boxShadow`. Os comentários descrevem a forma proibida em vez de escrevê-la.
- **Rodar a suíte da loja e os três `tsc`:** só execução, não conferido.

## Testes

- **Bloco a bloco igual a `ESTRELINHA_PROFILES` (hex, `-rgb`, HSL) e sensor do hex BF trocado:** `palette.test.ts` (`divergenciasDoPerfil` e os sensores de hex, canal, HSL e sombra, com a mensagem exata). Morde.
- **O Padrão com os hex e o HSL de hoje:** `palette.test.ts` (`PALETA` escrita à mão e `HSL_DO_PADRAO_DE_HOJE` byte a byte). Morde.
- **Pisos por perfil, tetos só no Padrão, pares de desconto e sensor de valor reprovado:** `contrast.test.ts` (`PISOS` com `on-sale/sale` e `sale-bar/surface`, quatro sensores sobre o BF) e `fieldBorder.test.ts` (`describe.each` com sensor). Morde.
- **Ateliê por `toBe`; a loja com "as variáveis do dono":** `palette.test.ts`, bloco "o dono do objeto". Morde.
- **`importOrder` verde; `brandAssets` lendo o `theme-color` contra o dono:** `brandAssets.test.ts` lê `ESTRELINHA_PROFILES.padrao['primary-strong']` e tem o inverso contra o BF. Para o `importOrder` não há o que escrever, e o verde é só execução.
- **Dono único dos hex do BF e do atributo, com sensor e inverso:** `perfilDeEstiloComDonoUnico.test.ts`, com âncora dupla, a lista de hex conferida contra o dono, CRLF/LF e inversos. Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Mapa plano `ESTRELINHA_PROFILES`, com Padrão === `ESTRELINHA_COLORS`; sombra em `ESTRELINHA_PROFILE_SHADOW_RGB`; exportados `EstrelinhaColorToken`, `*_VARIABLES` | Sim na forma. A forma do import diverge do C2 (achado 1) | spec.md C2 | Sim. A tarefa 07 usa `ESTRELINHA_PROFILES[perfil][token]`, e a 06 usa `--estrelinha-shadow-rgb` e `--estrelinha-ink-rgb`, que existem |
| 2 | O bloco BF declara só o que muda; o leitor reproduz a cascata | Sim | `paletteFromSource.ts` lê `:root` e sobrepõe o bloco, com âncora mínima de 9 e sensor de vazamento | Sim |
| 3 | O HSL do BF redefine também secondary, muted, accent e secondary-foreground além da lista do R5; o guarda confere 17 variáveis | Sim. Estende o R5 sem contrariá-lo, e o Padrão não muda | R5; `HSL_DO_SHADCN` e HSL do Padrão conferido contra o HEAD | Sim |
| 4 | O guarda varre `apps` e `packages/ui`; `packages/core` fica fora, com o motivo escrito | Sim. A tarefa limita o atributo a `apps/**` e os hex aos donos; nada exige varrer `core` | Decisão "Guarda de dono único" da tarefa | Sim |
| 5 | A sombra de peso lê `--estrelinha-ink-rgb`; as suaves leem `--estrelinha-shadow-rgb` | Sim. No Padrão resolve igual a `ESTRELINHA_SHADOW` (teste expande e compara) | R6 | Sim |
| 6 | `-rgb` para os 23 tokens; os véus `on-ink` não ganham | Sim | 20 tokens + 3 de desconto = 23 declarados | Sim |

## Não conferido

- **Arquivo sem intent-to-add:** `.specs/work-items/100-perfil-de-estilo-da-loja/tasks/07-card-do-perfil-no-painel.md` aparece como `??`. Sem baseline, não há prova de que a propagação mexeu só na afirmação da 02 (linha 13, `ESTRELINHA_PROFILES[perfil][token]`). Ficou dependendo da palavra do implementador. O conteúdo atual bate com o contrato entregue.
- **Só execução:** build, `tsc` (store, mobile-adm, core, `tsconfig.node.json` do ateliê, que agora alcança `@estrelinha/core/appearance` pelo `paths` da base), suíte da loja, o guarda de dono único passando sobre a árvore real, e as capturas do CA-01 em 390/1440.
- **Fora da fronteira:** mudanças de outras tarefas na mesma árvore não foram julgadas.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (do contexto carregado); `packages/ui/CLAUDE.md` › ícones, marca, tokens do painel (linhas 20-60). Por inteiro: `spec.md`, nas linhas R5, R6 e C2. Não abri `apps/store/CLAUDE.md` › Design system · Ícones e marca nem `DESIGN.md`.

## T02 — wi-impl-task · done · agente a13b34a71c60555f2

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/02-paleta-por-perfil.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O formato de `ESTRELINHA_PROFILES`, `ESTRELINHA_PROFILE_SHADOW_RGB`, `ESTRELINHA_COLOR_VARIABLES` e `ESTRELINHA_SHADOW_VARIABLES` não mudou. O `StyleProfile` agora vem de `core` por `import type` relativo com `.ts` (`"../../../core/src/appearance/types.ts"`), como pede o contrato. | Importar pelo alias `@estrelinha/core/appearance`. | É o que o contrato C2 pede (achado 1). Além disso, o arquivo é lido pelos `tailwind.config.ts` e pelo `vite.config.ts` do ateliê, que não passam pelo alias do Vite. | Só `packages/ui/src/tokens/estrelinha.ts`. A tarefa 07 lê `ESTRELINHA_PROFILES`, e o formato do objeto não mudou. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O `App.css`, bloco a bloco, é igual a `ESTRELINHA_PROFILES[perfil]`, e o Padrão é o de hoje. Só o comentário foi reescrito. | guarda | `apps/store/src/shared/lib/__tests__/palette.test.ts` | sim | — |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

packages/ui/src/tokens/estrelinha.ts alterado
apps/store/src/shared/lib/__tests__/palette.test.ts alterado

## Verificação

- `npx tsc --noEmit -p apps/store/tsconfig.app.json`: 0 erros, igual à baseline. Fonte: CLAUDE.md › Comandos.
- `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json`: 0 erros, igual à baseline. Fonte: CLAUDE.md › Comandos.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json`: 7 erros. São os 7 que a baseline já tem, todos em `ProposalStateBadge.test.tsx`; nenhum novo. Rodei porque a tarefa 07 vai importar o arquivo de tokens. Fonte: CLAUDE.md › Comandos.
- `pnpm --filter @estrelinha/store exec vitest run` em `palette`, `contrast`, `perfilDeEstiloComDonoUnico` e `brandAssets` com `--testTimeout=20000`: 298/298, exit 0. Fonte: PROJECT.md › Comandos de verificação.
- `pnpm --filter @estrelinha/mobile-adm exec vitest run src/app/__tests__/manifest.test.ts`: exit 0.
- `pnpm --filter @estrelinha/store build`, com env de placeholder porque o worktree não tem `.env`: exit 0. Isso confirma que o Tailwind ainda carrega o arquivo de tokens com o import de tipo relativo.

Instruções lidas: as mesmas da implementação. A correção não leu nada novo.

## Divergências e descobertas

nada

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 02
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz; Comandos, Alias de import, O "defeito 01", Convenções, Os guardas, Baselines); apps/store/CLAUDE.md › Design system · Ícones e marca; packages/ui/CLAUDE.md; DESIGN.md (§1–§4); .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: paleta bloco a bloco × ESTRELINHA_PROFILES (hex, -rgb, HSL, sombra) com sensores — palette.test.ts; Padrão igual ao de hoje (hex e HSL literais) — palette.test.ts; pisos por perfil, tetos só no Padrão, pares de desconto e sensores — contrast.test.ts; borda de campo por perfil com sensor — fieldBorder.test.ts; ateliê por identidade e loja pelas variáveis do dono — palette.test.ts; theme-color contra o dono (e não o do BF) — brandAssets.test.ts, importOrder.test.ts intocado e verde; dono único dos hex do BF e do literal do atributo, com sensores e inversos — perfilDeEstiloComDonoUnico.test.ts. Sem cobertura: a captura de CA-01 em 390/1440 (navegador, fora desta tarefa).
Verificações: tsc store 0 · mobile-adm 0 · backoffice 7 herdados · core 11 herdados; os arquivos da tarefa verdes (318/318 na implementação, 298/298 nos quatro relidos na correção); ateliê manifest+splash verdes; suíte da loja 7622/7622 em 409 arquivos (exit 1 só pelo timeout de RPC do worker, contenção, duas rodadas); build da loja verde com env placeholder (sem .env no worktree), também depois da correção. Correção: import type do StyleProfile passou a relativo com .ts; comentário de palette.test.ts sem o identificador do critério.
Árvore de trabalho: packages/ui/src/tokens/estrelinha.ts, apps/store/tailwind.config.ts, apps/store/src/app/App.css, apps/store/src/test/paletteFromSource.ts, apps/store/src/shared/lib/__tests__/{palette,contrast,fieldBorder}.test.ts, apps/store/src/app/__tests__/brandAssets.test.ts, apps/store/src/shared/lib/__tests__/perfilDeEstiloComDonoUnico.test.ts (novo), tasks/07 (propagação). Nada commitado.
Citações conferidas: 9 abertas ao usar; nenhuma deslocada de forma relevante (App.css shadcn vai até a 212, contrast tetos na faixa 103–131); nenhuma morta.
Propagado: 07 — a linha "Depende de" ganhou a forma `ESTRELINHA_PROFILES[perfil][token]` e o import `@estrelinha/ui/tokens/estrelinha`.
```

## T06 — wi-impl-task · review · agente aea0bd54d9a3d99bd

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/06-excecoes-do-desconto-e-sombras.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | H4: nenhum "chip de desconto da sacola" com fundo `primary` existe. `CartDrawer.tsx:267` (convite da próxima faixa) é texto `primary` sobre `ground-deep`, e `CouponInput.tsx:80-93` (cupom aplicado na gaveta) é texto `primary` sem fundo. Pela regra de H4, nada muda | Trocar a pílula do contador de itens (`CartDrawer.tsx:141`, `bg-primary`), que tem fundo `primary` mas mostra a contagem e não um desconto | H4 diz que o chip mostra "o desconto aplicado com fundo primary". O contador não mostra desconto, e mudar o papel dele contraria RN-01 ("fora esses três, nenhum componente muda de papel") | nenhum (no BF, o chip de RN-01 continua sem um elemento que o represente; a decisão fica visível no protótipo/QA) |
| 2 | No `CardBadge`, a cor do texto foi para dentro de cada ramo do tom: `jam` → `bg-estrelinha-sale text-estrelinha-on-sale`, `ink` → `bg-estrelinha-ink text-white` | Manter um `text-white` comum e só pôr `text-estrelinha-on-sale` no ramo `jam` (duas classes de cor de texto disputando) | Fundo e texto do desconto ficam na mesma string, que é o que a régua por linha do guarda novo lê | `ProductCard.tsx` |
| 3 | As sombras ficam como valor arbitrário do Tailwind lendo a variável: `shadow-[0_-14px_28px_-10px_rgb(var(--estrelinha-shadow-rgb)_/_0.16)]` e `shadow-[0_-8px_24px_rgb(var(--estrelinha-ink-rgb)_/_0.08)]` | Criar token de sombra novo em `tailwind.config.ts` ou no dono | O bloco "Não faça" proíbe mexer em token e config. O CSS gerado foi conferido com o CLI do Tailwind sobre a config da loja | os dois arquivos |
| 4 | O guarda do papel de desconto foi para `accentText.test.ts` como uma régua por linha: toda linha com `bg-estrelinha-sale` (recorte `(?![-\w])`, para `sale-bar` não contar) leva `text-estrelinha-on-sale` sólido, e nenhum `on-sale/…` é aceito. Tem âncora (os dois selos encontrados) e sensores que chamam a mesma função | Arquivo de guarda separado | O bloco `Testes` nomeia `accentText.test.ts` | `accentText.test.ts`; uma superfície nova com fundo `sale` vai precisar do `on-sale` na mesma linha |
| 5 | O teste do selo da página do produto foi para `ProductPageCampanha.test.tsx` (bloco "fora da vigência"), com `peca()` ganhando um `extra` opcional | Criar um arquivo novo copiando todo o arranjo de mocks da página | É a menor superfície; a página real já está montada ali | `ProductPageCampanha.test.tsx` |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Selo "-X%" do cartão usa `bg-estrelinha-sale` + `text-estrelinha-on-sale`; "Novo", "Últimas" e "Destaque" não usam | componente | `apps/store/src/entities/product/ui/__tests__/ProductCardSurface.test.tsx` | sim | vermelho (3 mutantes: volta a `primary`/`white`; `sale` com `text-white`; `on-sale/80`) |
| 2 | Selo "-X%" da galeria da página do produto usa o papel de desconto; "Novo" não | componente | `apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx` | sim | vermelho (volta a `primary`/`white`) |
| 3 | Preenchimento da barra do frete grátis usa `bg-estrelinha-sale-bar` | componente | `apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx` | sim | vermelho (volta a `bg-estrelinha-primary`) |
| 4 | Chip de desconto da sacola usa o papel de desconto | — | — (não existe, H4 / premissa 1) | — | — |
| 5 | Guarda: texto sobre `sale` é `on-sale` sólido, nunca com opacidade | guarda de fonte | `apps/store/src/shared/lib/__tests__/accentText.test.ts` | sim | vermelho (os mutantes de `text-white` e `on-sale/80` derrubaram a régua; a volta a `primary` derrubou a âncora) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

apps/store/src/entities/product/ui/ProductCard.tsx alterado
apps/store/src/pages/ProductPage.tsx alterado
apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx alterado
apps/store/src/widgets/instagram-invite/ui/InstagramInviteSheet.tsx alterado
apps/store/src/widgets/cookie-notice/ui/CookieNotice.tsx alterado
apps/store/src/entities/product/ui/__tests__/ProductCardSurface.test.tsx alterado
apps/store/src/pages/__tests__/ProductPageCampanha.test.tsx alterado
apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx alterado
apps/store/src/shared/lib/__tests__/accentText.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/store exec vitest run <arquivo> --testTimeout=20000` (de `PROJECT.md` › Comandos de verificação), por fatia: ProductCardSurface + ProductPageCampanha 47/47, CartDrawer 35/35, accentText 13/13. Todos com exit 0.
- Checagem de mutação com o mesmo comando, restaurando pela cópia e conferindo com `cmp`: 6 mutantes, 6 mortos por asserção.
- `npx tsc --noEmit -p apps/store/tsconfig.app.json` (de `CLAUDE.md` › Comandos): exit 0, 0 erros. O baseline do CLAUDE.md é 0 na loja, então nenhum erro novo.
- `npx eslint .` em `apps/store` (de `CLAUDE.md` › Baselines): 2 erros e 2 warnings, igual ao baseline 2/2. Nenhum é em arquivo tocado (`ShareButtons`, `ShippingCalc`, `ProductInfo`).
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (de `CLAUDE.md` › Baselines), rodado duas vezes: 409/409 arquivos e 7630/7630 testes passaram nas duas, mas o exit foi 1. A causa nas duas foi um único `Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"`. É contenção de worker: a tarefa 07 roda em paralelo, e o CLAUDE.md registra o mesmo sintoma como contenção, não teste. Não houve asserção reprovada.
- CLI do Tailwind (`tailwindcss -c apps/store/tailwind.config.ts`) sobre os arquivos tocados, para conferir o CSS gerado: `bg-estrelinha-sale`, `bg-estrelinha-sale-bar` e `text-estrelinha-on-sale` saem como `rgb(var(--…-rgb) / var(--tw-…-opacity))`. As sombras saem `rgb(var(--estrelinha-shadow-rgb) / 0.16)` e `rgb(var(--estrelinha-ink-rgb) / 0.08)`. Com os valores do Padrão (52 73 94 e 35 48 58), isso é igual aos `rgba` de antes.
Instruções lidas: `CLAUDE.md` (raiz, já no contexto da sessão e idêntico ao do worktree, conferido com `diff`) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines; `apps/store/CLAUDE.md` › Design system · Carrinho, chrome e checkout (seção principal e "A sacola v4") · Frete grátis; `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- H4: não há chip de desconto com fundo `primary` na sacola, então nada mudou (premissa 1). No Black Friday, RN-01 fica com dois dos três elementos em ouro.
- Dependência da tarefa 02 conferida: `estrelinha-sale`, `on-sale` e `sale-bar` existem no dono, no `App.css` (os dois perfis) e no Tailwind; `--estrelinha-shadow-rgb` e `--estrelinha-ink-rgb` também.
- Citações: `ProductPage.tsx:249-253` está deslocada por cerca de uma linha (o selo fica em 248-251) e foi relocalizada pelo alvo. As demais batem.
- Fora do procedimento: dei um `grep` em `spec.md` para ler as linhas de H2, H3, H4 e R6. A regra 5 do meu procedimento proíbe abrir a costura, embora a tarefa remeta a ela. O que li bate com a tarefa e não mudou nenhuma decisão.
- A ordem não seguiu o TDD: implementei antes de escrever os testes, então nenhuma fatia passou pelo vermelho no próprio ciclo. Para compensar, rodei a mutação em todas as fatias, e todas deram vermelho (coluna `Mutação`).
- A suíte completa saiu com exit 1 pelo timeout de RPC do worker (contenção), com todos os testes verdes.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 06
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines; apps/store/CLAUDE.md › Design system · Carrinho, chrome e checkout · Frete grátis; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: selo do cartão → ProductCardSurface.test.tsx (reescrito, com os selos vizinhos "Novo"/"Últimas"/"Destaque"); selo da página → ProductPageCampanha.test.tsx; barra do frete → CartDrawer.test.tsx; guarda do texto on-sale sólido → accentText.test.ts (âncora, régua e 4 sensores). O chip de desconto da sacola ficou sem teste porque não existe chip com fundo primary (H4).
Verificações: testes por arquivo verdes; 6 mutantes, 6 mortos; tsc da loja 0 erros; eslint da loja 2/2 (= baseline); suíte da loja 409/409 arquivos e 7630/7630 testes, com exit 1 por um "Timeout calling onTaskUpdate" do worker (contenção, nas duas execuções); CSS gerado conferido no CLI do Tailwind
Árvore de trabalho: ProductCard.tsx, ProductPage.tsx, CartDrawer.tsx, InstagramInviteSheet.tsx, CookieNotice.tsx e os quatro testes (ProductCardSurface, ProductPageCampanha, CartDrawer, accentText); nada commitado
Citações conferidas: 8 abertas (ProductCard:39-47, ProductPage:249-253, CartDrawer:200-213, CartDrawer:267, CouponInput:80-93, InstagramInviteSheet:35, CookieNotice:59, ProductCardSurface:185-199); ProductPage deslocada por cerca de 1 linha; nenhuma morta
```

## T06 — wi-impl-review · done · agente aca13c92b15a60d67

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/06-excecoes-do-desconto-e-sombras.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| no Padrão o selo, o chip e a barra pintam exatamente como hoje (os tokens valem o primary e o branco) | `ProductCard.tsx` (CardBadge `jam` → `bg-estrelinha-sale text-estrelinha-on-sale`), `ProductPage.tsx:250` (mesmo par), `CartDrawer.tsx:209` (`bg-estrelinha-sale-bar`). No Padrão, `App.css:173-175` dá sale = #34495e, on-sale = #ffffff, sale-bar = #34495e, que é a ardósia e o branco de antes. Chip: nenhum elemento se qualifica (premissa 1) | sim. A igualdade dos pixels é `só execução` (captura CA-01) |
| no BF eles pintam ouro (garantido pelos valores da 02 e pela classe desta) | as classes acima, mais o bloco do perfil em `App.css:283-284` e `packages/ui/src/tokens/estrelinha.ts:130-131` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | ver a seção Testes | sim |
| testes dos arquivos alterados passando | — | só execução |
| tsc / suíte do workspace sem regressão | — | só execução |

## Obrigações

- **Texto sobre ouro é escuro sólido, sem opacidade:** cumprida. Os dois selos usam `text-estrelinha-on-sale` sólido, e a régua nova em `accentText.test.ts` recusa `on-sale/…`.
- **Sem cor arbitrária de texto:** cumprida. Só entraram tokens com nome. As duas sombras com valor arbitrário são `shadow-[…]`, não cor de texto.
- **Rodar a suíte da loja, o tsc e o eslint:** só execução, não confiro aqui.

## Testes

- **Selo "-X%" do cartão e da página com `sale`/`on-sale`, e os selos vizinhos não:**
  - `ProductCardSurface.test.tsx:185-206`, reescrito com vizinha. `toHaveClass` compara token exato. Para "Novo", "Últimas" e "Destaque" ele exige `bg-estrelinha-ink` e `text-white` e recusa `sale`/`on-sale`. Morde.
  - `ProductPageCampanha.test.tsx:131-144`, sobre a página real, com a galeria dublada recebendo `badges` e o "Novo" como vizinho. Morde.
- **Preenchimento da barra com `bg-estrelinha-sale-bar`:** `CartDrawer.test.tsx:467-479`, pelo progressbar real, recusando `primary` e `sale`. Morde.
- **Chip de desconto da sacola:** o elemento não existe (H4), então não há teste a escrever. A justificativa foi conferida: `CartDrawer.tsx:267` é texto `primary` sobre `ground-deep`, e `CouponInput.tsx:80-93` é texto `primary` sem fundo.
- **Guarda `accentText.test.ts`, texto `on-sale` sólido:**
  - Régua por linha com o recorte `(?![-\w])`.
  - Âncora nos dois selos.
  - Os sensores chamam a mesma `ofensoresDoDesconto`: `text-white` é acusado, `/80` é acusado, o par certo passa com LF e com CRLF, e `sale-bar` não é acusado.
  - `tsxFiles` exclui `__tests__`, então os testes que citam `bg-estrelinha-sale` sozinho não viram falso positivo.
  - Morde.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | H4: nenhum chip de desconto com fundo `primary`, nada muda | sim | `CartDrawer.tsx:267` (texto primary sobre ground-deep) e `CouponInput.tsx:80-93` (texto primary sem fundo). O único `bg-estrelinha-primary` com texto na gaveta é o contador de itens (`:141`), que não é desconto. H4 do spec.md:191 manda "nada muda e o retorno diz isso" | sim |
| 2 | Cor do texto dentro de cada ramo do CardBadge | sim | o padrão do próprio CardBadge; `ink` mantém `text-white` | sim |
| 3 | Sombras como `shadow-[…rgb(var(--…-rgb)_/_α)]` | sim | o "Não faça" proíbe tocar em token e config. `--estrelinha-shadow-rgb` (52 73 94) e `--estrelinha-ink-rgb` (35 48 58) existem em `App.css:188,210`, com a mesma opacidade de antes. O formato bate com o dono (`estrelinha.ts:205-207`) | sim |
| 4 | Guarda do desconto como régua por linha em `accentText.test.ts` | sim | o bloco `Testes` nomeia esse arquivo, e o guarda tem âncora e sensores | sim. Superfície nova com fundo `sale` precisa do `on-sale` na mesma linha, como ele declarou |
| 5 | Teste do selo da página em `ProductPageCampanha.test.tsx`, com `peca()` ganhando `extra` | sim | o parâmetro é opcional e as chamadas existentes não mudam | sim |

## Não conferido

- O resultado de execução (suíte, tsc, eslint) e a identidade visual por captura (CA-01): só a execução prova.
- No Black Friday, `--estrelinha-ink-rgb` vale 22 21 20 (`App.css:286`), então a sombra do aviso de cookies também muda de cor nesse perfil. É o que o contrato pede ("ler `--estrelinha-ink-rgb`"), e no Padrão o valor é idêntico ao de antes. Fica só como registro.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções · Os guardas · Baselines, pelo contexto da sessão. `apps/store/CLAUDE.md` › Design system · Carrinho, chrome e checkout · Frete grátis não foi aberto nesta revisão. Nenhum achado depende dele, mas essas seções não foram conferidas.

## T07 — wi-impl-task · review · agente a5cc0dec1b2450816

Tarefa: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/07-card-do-perfil-no-painel.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidi | O que descartei | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O botão de gravar é o `SettingsSaveButton`, com o rótulo dele, "Salvar alterações" | Um botão com o texto "Salvar" do Design | A Obrigação manda usar o `SettingsSaveButton` (a regra do arquivo de instruções vence o texto). O rótulo é fixo nele, e o guarda LEG-20 da página já procura por ele | O texto do botão no card; a Validation e o QA leem "Salvar alterações" |
| 2 | `useSettingsSave.salvar` ganhou um 3º argumento opcional `sucesso` (o aviso de sucesso). Sem ele, a frase de sempre continua | Copiar a mecânica de gravar e avisar dentro do card (molde do `BuyTogetherFormCard`); ou mudar a frase compartilhada | H8 pede uma mensagem própria. O parâmetro deixa um dono só para o aviso de erro. A frase compartilhada não mudou, e os três chamadores antigos não passam nada | `features/settings/model/useSettingsSave.ts`. Mudança aditiva, sem efeito nas outras seções |
| 3 | O aviso de sucesso vai como `toast({ title: STYLE_PROFILE_COPY.saved })`: a frase inteira no título, sem descrição | Partir a frase em título e descrição | `core` dá a frase como uma string só. Partir criaria um segundo texto | nenhum |
| 4 | O palco (`StyleProfileLivePreview`) não tem modo de tela cheia e não usa `useFullscreenStage` | Usar `useFullscreenStage` dentro do Dialog | O modal já é a vista ampliada. Além disso, `fixed inset-0` dentro do `DialogContent` (que tem `translate`) se prende ao modal, não à tela. Fica registrado porque o Contrato lista `useFullscreenStage` | O bloco FOCO-22 de `previaUnica` continua exigindo o hook só dos três palcos de antes. O quarto ganhou régua própria: sem `fixed inset-0` |
| 5 | A prévia abre em Celular, com a alternância Celular/Computador | Abrir em Computador porque o modal tem 960 px | Convenção dos palcos do painel ("o alternador abre em Celular"). A loja é usada sobretudo no celular | nenhum |
| 6 | O título do card é um `h2` escrito com os primitivos de `Card`, e não o `FormCard` | `FormCard` | O `FormCard` desenha `h3`, e o Design pede `h2` | nenhum |
| 7 | O card importa `useSettingsSave` pelo caminho fundo `@/features/settings/model/useSettingsSave`. O `StoreDataSection` importa o card pelo barrel `@/features/style-profile` | Pôr o card dentro de `features/settings` | O Contrato manda o card para `features/style-profile`. O caminho fundo evita ciclo de barrel. O import lateral entre features é tolerado pela régua FSD, e o lint ficou na baseline | O lint FSD; a ordem dos imports |
| 8 | O selo "Em uso" usa as classes emerald de `MaterialStatusBadge` (`bg-estrelinha-admin-emerald/10`, texto emerald, borda emerald/20) | Um selo novo | O painel não tem um componente "pago". Esse é o tom verde já provado por `adminTokens.test.ts` | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | O card mostra as duas opções com as amostras do dono, marca "Em uso" no salvo, mostra o valor desconhecido como Padrão e desabilita as opções enquanto carrega | componente | `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx` | sim | — (vermelho: o módulo não existia). Check extra: tirar `disabled={isLoading}` derruba 1 caso |
| 2 | Salvar grava `{ profile }` na chave `appearance` por igualdade exata, fica desabilitado sem mudança e mostra a mensagem de H8 | componente | idem | sim | — (vermelho). Check extra: gravar `{ profile, version: 1 }` sem o aviso próprio derruba 3 casos |
| 3 | O aviso diz 5 minutos, 1 hora e a frase de quem está com a loja aberta | componente | idem | sim | — (vermelho) |
| 4 | A prévia abre o modal com UM iframe de `previewSrc` e manda `draft` à origem exata (no load e no `ready`). Recusa outra origem ou outra janela. Fechar (botão ou Esc) não grava. O painel não ganha `data-perfil`. A alternância de dispositivo não troca o `src` | componente | idem | sim | — (vermelho). Check extra: tirar a conferência de origem da ponte derruba 1 caso |
| 5 | Sem `VITE_STORE_URL`, o passo de configuração aparece no lugar do palco | componente | idem | sim | — (vermelho) |
| 6 | O card aparece em Dados da loja, depois do SEO, e não nas outras seções. O inventário ganhou "Perfil de estilo". As réguas de `grid-cols` e do botão de salvar seguem verdes. O dublê sem `appearance` não quebra o card | página | `apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx` | sim | vermelho (tirar o `<StyleProfileCard />` do `StoreDataSection` derruba 3 casos) |
| 7 | `previaUnica` e `folgaDoPalco` reconhecem o quarto palco; `semAbaEmConfiguracoes` e `animacaoRespeitaMovimento` seguem verdes | guarda | `previaUnica.test.ts`, `folgaDoPalco.test.ts`, `semAbaEmConfiguracoes.test.ts`, `animacaoRespeitaMovimento.test.ts` | sim | não se aplica: guarda de fonte, com sensor embutido na régua nova `VESTE_O_PERFIL` |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

apps/backoffice/src/features/style-profile/index.ts criado
apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx criado
apps/backoffice/src/features/style-profile/ui/StyleProfileLivePreview.tsx criado
apps/backoffice/src/features/style-profile/model/useStyleProfilePreviewBridge.ts criado
apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx criado
apps/backoffice/src/features/settings/ui/StoreDataSection.tsx alterado
apps/backoffice/src/features/settings/model/useSettingsSave.ts alterado
apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx alterado
apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts alterado
apps/backoffice/src/shared/lib/__tests__/folgaDoPalco.test.ts alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000`, nos arquivos da tarefa (`PROJECT.md` › Comandos de verificação): o card deu 24/24, a página 98/98 e os quatro guardas 70/70.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (arquivo de instruções, `CLAUDE.md` › Comandos): 7 erros. São os mesmos 7 do baseline medido antes da primeira fatia, todos em `ProposalStateBadge.test.tsx` (TS2304 ×3, TS2593 ×4). Nenhum erro novo.
- `npx eslint .` em `apps/backoffice` (`CLAUDE.md` › Baselines): 23 erros e 5 avisos, igual à baseline. Nenhum aponta para arquivo tocado.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (`CLAUDE.md` › Baselines): 5396 passaram e 1 falhou, em 308 arquivos com 2 reprovados. As duas reprovações foram por tempo:
  - `AdminOrdersPage.aviso.test.tsx`, "lote de 60": levou 48,9 s, acima do teto próprio de 45 s.
  - `labels.test.ts`: o `beforeAll` passou de 10 s.
  Os dois arquivos passam isolados (105/105). A tarefa 06 rodava na mesma árvore ao mesmo tempo.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (`CLAUDE.md` › Baselines, porque os guardas da loja varrem `apps/**`): 7630/7630 testes em 409/409 arquivos. Saiu com código 1 por um único erro do worker, `Timeout calling "onTaskUpdate"`, que é contenção e não teste.
- `pnpm --filter @estrelinha/backoffice build`: verde.

Instruções lidas: `CLAUDE.md` (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; `apps/backoffice/CLAUDE.md` › Molde dos formulários · `/admin/home` · O movimento do painel · A ponte da prévia · Configurações › quatro seções · `/admin/faixa-de-avisos`; `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- O Design pede um botão "Salvar". O `SettingsSaveButton` obrigatório tem o rótulo fixo "Salvar alterações", e ficou ele (decisão 1).
- O Contrato lista `useFullscreenStage` entre o que se consome. O palco do modal não o usa (decisão 4).
- A dependência da tarefa 01 confere: o hook do perfil salvo é `useStyleProfile` em `packages/core/src/hooks/useStyleProfile.ts` (subpath `@estrelinha/core/hooks/useStyleProfile`), não um arquivo dentro de `core/appearance`. A frase do card e o canal da prévia estão em `@estrelinha/core/appearance`.
- A dependência da tarefa 02 confere: `ESTRELINHA_PROFILES` está em `@estrelinha/ui/tokens/estrelinha`.
- Citações conferidas: todas batem. O `useUpdateSettings` está em `useStoreSettings.ts:172-186`, perto das linhas 168-181 citadas, com o mesmo alvo. As linhas 399-445 e 1144-1169 de `AdminSettingsPage.test.tsx` deslocaram depois que inseri casos, e foram relocalizadas pelo `describe`.
- Escrevi o arquivo de teste do card de uma vez, antes da implementação, em vez de uma fatia por vez. O vermelho foi visto (módulo ausente), e os três checks de mutação acima provam que as asserções principais detectam a falha.
- As reprovações da suíte inteira foram por tempo, sob contenção com a tarefa 06 na mesma árvore: as duas do painel (os dois arquivos passam isolados) e o erro do worker na loja.
- Fica sem prova automatizada o que o jsdom não mede: as duas opções lado a lado a partir de 1024 px, o modal de 960 px, o quadro escalado e a loja vestindo o perfil dentro do iframe. Isso é da Validation e do QA.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 07
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; apps/backoffice/CLAUDE.md › Molde dos formulários · /admin/home · O movimento do painel · A ponte da prévia · Configurações · /admin/faixa-de-avisos; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos:
  - card com as duas opções, as amostras de ESTRELINHA_PROFILES, "Em uso" no salvo, o valor desconhecido como Padrão e o carregando desabilitado → apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx
  - Salvar grava { profile } em appearance (igualdade exata, Black Friday e Padrão), fica desabilitado sem mudança, mostra a mensagem de H8 e o erro → idem
  - aviso com 5 minutos, 1 hora e a frase de quem está com a loja aberta → idem
  - prévia: modal com UM iframe de previewSrc, draft à origem exata no load e no ready, ready de outra origem ou janela recusado, fechar e Esc sem gravar, o painel sem data-perfil, a troca de dispositivo sem trocar o src → idem
  - sem VITE_STORE_URL, o passo de configuração → idem
  - página: o card em Dados da loja depois do SEO e ausente nas outras seções, o inventário com "Perfil de estilo", o dublê sem appearance, as réguas de grid-cols e do botão de salvar verdes → apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx
  - guardas: previaUnica.test.ts (o quarto palco, mais o bloco novo "o painel não veste a paleta da loja", com sensor) e folgaDoPalco.test.ts (âncora dos quatro palcos); semAbaEmConfiguracoes verde
  - sem cobertura: o layout real (lado a lado a partir de 1024, o modal de 960, a escala) e a loja vestindo o perfil, porque o jsdom não mede layout nem carrega o iframe; isso é da Validation e do QA
Verificações: os testes da tarefa verdes (24 + 98 + 70); tsc do backoffice com 7 erros, iguais ao baseline; eslint 23/5, igual à baseline; suíte do backoffice com 1 reprovação e 1 arquivo reprovado por tempo, sob contenção com a tarefa 06 (os dois arquivos passam isolados); suíte da loja 7630/7630 com 1 erro de worker por tempo; build do backoffice verde
Árvore de trabalho: criados apps/backoffice/src/features/style-profile/{index.ts, ui/StyleProfileCard.tsx, ui/StyleProfileLivePreview.tsx, model/useStyleProfilePreviewBridge.ts, ui/__tests__/StyleProfileCard.test.tsx}; alterados features/settings/ui/StoreDataSection.tsx (monta o card por último), features/settings/model/useSettingsSave.ts (aviso de sucesso opcional; a frase compartilhada não muda), pages/admin/AdminSettingsPage.test.tsx, features/home-composition/__tests__/previaUnica.test.ts, shared/lib/__tests__/folgaDoPalco.test.ts; nada commitado
Citações conferidas: 9 abertas; deslocaram useStoreSettings.ts:168-181 (hoje 172-186) e AdminSettingsPage.test.tsx :399-445 e :1144-1169 (deslocaram ao inserir casos; relocalizadas pelo describe); nenhuma morta
```

## T07 — wi-impl-review · done · agente a808f799cce8ea985

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/07-card-do-perfil-no-painel.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   | —         | —             | —         | —                             |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| escolher Black Friday e salvar grava `appearance = { profile: 'black-friday' }`; Padrão grava `{ profile: 'padrao' }` (teste) | `StyleProfileCard.tsx:72-73` (`salvar('appearance', { profile: escolhido }, …)`); teste `StyleProfileCard.test.tsx:130-154` com `toStrictEqual({ key: 'appearance', value: { profile } })` e `toHaveBeenCalledTimes(1)` | sim |
| a prévia manda o rascunho sem gravar, e fechar não grava (teste) | `useStyleProfilePreviewBridge.ts:36-61` (postMessage com `origin` exato); testes `:201-213`, `:220-250`, `:278-297` | sim |
| `pnpm --filter @estrelinha/backoffice build` verde | — | só execução |
| cada comportamento do bloco `Testes` coberto por um teste escrito | ver seção Testes | sim |
| testes dos arquivos alterados passando | — | só execução |
| verificação mínima (tsc sem erro novo contra a baseline 7, suíte do workspace) | — | só execução |

## Obrigações

- Nada de `grid-cols-*` sem breakpoint: o card usa só `grid gap-3 lg:grid-cols-2` (`StyleProfileCard.tsx:85`), e a miniatura é flex. A régua de `AdminSettingsPage.test.tsx` já alcança o card, porque ele é montado dentro do painel de Dados da loja. Aplicada.
- `SettingsSaveButton` para o Salvar: `StyleProfileCard.tsx:151-156`. Aplicada.
- Alvo de toque ≥ 44 px: o cartão-rótulo tem `min-h-11` (`:95`), o botão da prévia tem `h-11` (`:145`), o "Fechar" tem `h-11` (`:169`) e as duas alternâncias de dispositivo têm `min-h-11` (`StyleProfileLivePreview.tsx:78`). Aplicada.
- `motion-reduce:` em toda transição nova: a única transição nova é `transition-colors motion-reduce:transition-none` (`StyleProfileCard.tsx:95`), e os botões de dispositivo não têm transição. Aplicada.
- Não chamar seção de "aba": nenhum literal novo fala em aba. Aplicada; a suíte que confirma só a execução prova.
- Rodar as suítes, o tsc e o eslint: só a execução prova; não conferido aqui.

## Testes

- Duas opções, amostras do dono, "Em uso" no salvo, desconhecido como Padrão: `StyleProfileCard.test.tsx:54-121`. Morde. Os hex estão escritos à mão e comparados também com `ESTRELINHA_PROFILES` na ordem dos quatro tokens. O teste do desconhecido cobre `'roxo'`, `42` e `undefined`.
- Salvar grava `{ profile }` em `appearance` por igualdade exata, só ela, desabilitado sem mudança, sucesso de H8: `:124-183`. Morde: `toStrictEqual`, uma única chamada, `toBeDisabled`, e o título do toast comparado com a frase do card, com o inverso contra a frase compartilhada.
- O aviso diz 5 minutos, 1 hora e a frase de quem está com a loja aberta: `:186-195`. Morde, com a frase literal.
- A prévia abre o modal com UM iframe de `previewSrc`, manda `draft` com o perfil para a origem exata e não grava; fechar não chama a mutação: `:197-297`. Morde. Confere a `src` exata `http://localhost:8082/?preview=1`, os argumentos do postMessage por igualdade, a recusa de `'*'`, e o `ready` vindo de outra origem ou de outra janela sem resposta. Fechar por "Fechar" e por Esc não chama `mutateAsync`.
- Sem `VITE_STORE_URL`, o passo de configuração aparece no lugar do palco: `:307-315`. Morde: não há iframe, e o passo `previa-perfil-sem-loja` aparece.
- Página: `AdminSettingsPage.test.tsx`. O card aparece depois do SEO (por `compareDocumentPosition`). O inventário ganhou `'Perfil de estilo'`, procurado por `getByLabelText`, que casa o `aria-label` do radiogroup. O dublê sem `appearance` mostra Padrão "Em uso", com a âncora `'appearance' in state.data === false`. As réguas de grade e de botão continuam valendo sobre a seção com o card. Morde.
- Guardas, a fatia `sem mutação`, conferida pela leitura da asserção:
  - `previaUnica.test.ts` exige `StyleProfileLivePreview.tsx` como única prévia da pasta, um `<iframe>` por palco e a lista exata dos arquivos com iframe.
  - O mesmo arquivo ganhou uma régua nova `VESTE_O_PERFIL`. Ela tem âncora de três arquivos e sensor nos dois sentidos, que chama a régua de verdade e testa CRLF e LF.
  - `folgaDoPalco.test.ts` tem a âncora `toEqual` reescrita com o quarto palco.
  - Todos mordem: a lista é exata, e o sensor prova que a régua acusa o que deve.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O botão é o `SettingsSaveButton`, com o rótulo fixo "Salvar alterações" | sim | A Obrigação diz "`SettingsSaveButton` para o Salvar", e o componente não aceita rótulo (`shared/ui/SettingsSaveButton.tsx:43-64`) | Em parte. `STYLE_PROFILE_COPY.save = 'Salvar'` (`packages/core/src/appearance/copy.ts:27`, da tarefa 01) fica sem leitor. O arquivo está fora de `alterados`, então isto fica como observação, não como achado. |
| 2 | `salvar` ganhou um 3º argumento opcional, o aviso de sucesso | sim | H8: "a frase compartilhada de `useSettingsSave.ts:30` não muda". A frase continua idêntica (`useSettingsSave.ts:39`), e os três chamadores antigos não passam o argumento | sim |
| 3 | O toast de sucesso leva só `title`, com a frase inteira de `core` | sim | `copy.ts:28` traz uma string única | sim |
| 4 | O palco não usa `useFullscreenStage` nem tem tela cheia | sim, com ressalva | O R11 do spec (`spec.md:186`) cita "`previewFrame`/`useFullscreenStage`". O R11 restado na tarefa só exige iframe, `previewSrc` e `previewFrame(`, e o Design não desenha tela cheia. O argumento técnico se sustenta: `fixed inset-0` dentro de um `DialogContent` com translate se prende ao modal. Nada da tarefa exige o modo de tela cheia. | sim; a régua própria do quarto palco recusa `fixed inset-0` |
| 5 | A prévia abre em Celular | sim | `apps/backoffice/CLAUDE.md` › A ponte da prévia: "O alternador abre em Celular" | sim |
| 6 | O título do card é um `h2` com os primitivos de `Card` | sim | O Design pede h2 | sim |
| 7 | O card importa `useSettingsSave` pelo caminho fundo, e `StoreDataSection` importa o card pelo barrel | sim | O barrel de `features/settings` exporta a seção que monta o card, então importá-lo daria um ciclo. As seções do arquivo de instruções indicadas pela tarefa não proíbem o caminho fundo | sim |
| 8 | O selo "Em uso" usa as classes emerald já existentes | sim | O Design pede o "estilo do selo verde de 'pago' do painel"; os tokens são guardados por `adminTokens.test.ts` | sim |

## Não conferido

- Build, tsc (baseline 7), eslint (baseline 23/5) e as suítes do painel e da loja: só a execução prova; nada foi rodado.
- Se o `vi.mock('@estrelinha/core/hooks/useStoreSettings')` do teste de página alcança o import relativo dentro de `core/hooks/useStyleProfile.ts`: depende da resolução do vitest, e só a execução mostra.
- O layout em 390 e 1440 (as opções empilhadas abaixo de 1024, o modal de 960, o palco de 60vh): é da Validation e do QA, porque o jsdom não mede layout.
- Todos os arquivos de `alterados` aparecem no diff: os novos com `A` (intent-to-add) e os existentes com `M`. Não faltou baseline para nenhum.
- Instruções lidas:
  - `CLAUDE.md` (raiz, carregado no contexto) › Comandos · Alias de import · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines
  - `apps/backoffice/CLAUDE.md` › Molde dos formulários · O movimento do painel · A ponte da prévia · Configurações › quatro seções · `/admin/faixa-de-avisos`
  - `apps/backoffice/CLAUDE.md` › `/admin/home`: só o trecho da ponte e do palco, lido pela subseção "A ponte da prévia"

## T08 — wi-impl-task · review · agente a2fdf63ca6f62f75c

Tarefa: .specs/work-items/100-perfil-de-estilo-da-loja/tasks/08-bugs-1-2-card-do-perfil-carga-e-salvar.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | Quando o `select` falha, `fetchAllSettings` (`packages/core/src/hooks/useStoreSettings.ts`) devolve os defaults como antes, mas com uma marca a mais, `readFailed: true`, tipada como `StoreSettingsData = SettingsMap & { readFailed?: true }`. A causa do BUG-001 é que a função engole o erro e devolve os defaults, então para o card "não consegui ler" e "está salvo o Padrão" eram a mesma coisa. | (a) Lançar o erro no `queryFn`: mudaria as outras seções de Configurações (elas esperam `data` para montar o formulário), o retry e o carregamento da loja. (b) Uma consulta só do card: seria consulta nova e um segundo leitor da mesma linha. (c) Marcar pela identidade do objeto `DEFAULTS`: o structural sharing do React Query confunde isso com uma leitura boa e vazia. | Mudança só aditiva. Quem lê `data?.x ?? DEFAULT` não vê diferença, e o structural sharing distingue as duas respostas porque a chave é diferente. | `packages/core/src/hooks/useStoreSettings.ts` é lido pela loja, pelo painel e pelo app. A forma de `data` ganhou uma chave opcional. Nada itera as chaves de `data` (conferido com grep), e o `tsc` dos três apps não acusou nada. |
| 2 | `useStyleProfile` passou a devolver também `readFailed` (`isError \|\| data?.readFailed === true`) e `retry` (que relê). O tipo exportado é `StyleProfileRead`. | Devolver o `error`/`refetch` crus do React Query. | Assim o hook cobre os dois jeitos de falhar (o `select` com erro e o `queryFn` rejeitando), e o card não precisa saber como a leitura falha. | Os leitores de `useStyleProfile` na loja só usam `profile`/`isLoading`, então nada muda para eles. As asserções `toEqual` de `useStyleProfile.test.ts` ganharam os dois campos. |
| 3 | O card trata "carregando" e "leitura falhou" do mesmo jeito: nenhum "Em uso", opções e Salvar desabilitados. Na falha aparece `role="alert"` com uma frase e um botão "Tentar de novo" (h-11), no molde de `AnalyticsSecretField`. | `EmptyState` (o molde das listas): ele trocaria o card inteiro, e as opções precisam continuar visíveis e desabilitadas, como a H9 pede. | É o esperado do BUG-001 e da H9. | Só o `StyleProfileCard.tsx`. |
| 4 | Para o BUG-002, `useSettingsSave` passou a expor também `semConexao: update.isPaused === true`. O card mostra um `InfoBanner` `role="status"`: "Sem conexão. O perfil ainda não foi salvo: ele é gravado quando a conexão voltar, com esta página aberta." Enquanto isso o botão para de girar e continua desabilitado. | `networkMode: 'always'` na mutação, que falharia na hora com "Erro ao salvar": exigiria mudar `useUpdateSettings`, e isso mudaria as outras seções. Também descartei reabilitar o botão, porque um segundo clique empilharia outra gravação na fila. | O React Query pausa a mutação sem rede e só a envia quando a conexão volta. O aviso diz a verdade (ainda não salvou, sai sozinho com a aba aberta) e aparece na hora. A frase de `useSettingsSave.ts:30` ficou intocada. | `apps/backoffice/src/features/settings/model/useSettingsSave.ts`. As outras três seções não leem `semConexao` e ficam como estavam. |
| 5 | As três frases novas (`readFailed`, `retry`, `offline`) foram para `STYLE_PROFILE_COPY`, em `packages/core/src/appearance/copy.ts`. | Escrevê-las no próprio card. | O cabeçalho do card diz que o vocabulário dele é de `core/appearance`. O teste de tom de `copy.test.ts` (sem exclamação, sem urgência) já cobre as três. | `packages/core/src/appearance/copy.ts`, só com chaves a mais. É o toque em `core/appearance` que o bug exigiu, e que o bloco "Não faça" manda registrar. |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Leitura em erro (o `select` com erro e o `queryFn` rejeitando): nenhum "Em uso", opções e Salvar desabilitados, aviso com "Tentar de novo"; "Tentar de novo" relê; o par com a leitura boa; a releitura boa devolve o card (BUG-001) | componente | `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx` › "a leitura da configuração que falha não afirma um perfil salvo" | sim | — |
| 1b | O hook diz `readFailed` nos dois jeitos de falhar, o par com a leitura boa, `retry` relê; a marca aparece em `fetchAllSettings` só no erro | unitário (hook) | `packages/core/src/hooks/__tests__/useStyleProfile.test.ts`, `packages/core/src/hooks/__tests__/useStoreSettings.test.ts` | sim | — |
| 2 | Com a leitura ainda carregando: nenhum "Em uso" e Salvar desabilitado (H9) | componente | `StyleProfileCard.test.tsx` › "enquanto a configuração carrega, nenhum perfil leva o selo…" | sim (passou de primeira) | vermelho |
| 3 | Salvar sem conexão (mutação parada): aviso `role="status"`, botão desabilitado e sem girar, nenhum toast, "Em uso" no perfil anterior; o par com rede (gira, sem aviso); com a rede, a frase de sucesso da H8 continua (BUG-002) | componente | `StyleProfileCard.test.tsx` › "salvar sem conexão" | sim | — (o caso principal passou pelo vermelho; o par e o do sucesso só fecham as duas pontas) |

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx alterado
apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx alterado
apps/backoffice/src/features/settings/model/useSettingsSave.ts alterado
packages/core/src/hooks/useStoreSettings.ts alterado
packages/core/src/hooks/useStyleProfile.ts alterado
packages/core/src/hooks/__tests__/useStoreSettings.test.ts alterado
packages/core/src/hooks/__tests__/useStyleProfile.test.ts alterado
packages/core/src/appearance/copy.ts alterado

## Verificação

- Um arquivo de teste (`PROJECT.md` › Comandos de verificação): `pnpm --filter @estrelinha/backoffice exec vitest run …/StyleProfileCard.test.tsx --testTimeout=20000`. Antes do conserto, 5 casos vermelhos; depois, 33/33. No core, `pnpm --filter @estrelinha/core exec vitest run src/hooks/__tests__/useStyleProfile.test.ts src/hooks/__tests__/useStoreSettings.test.ts src/appearance --testTimeout=20000`: antes, 7 vermelhos; depois, 88/88.
- Checks de mutação, restaurados pela cópia e conferidos com `cmp`:
  - tirei o `!semSalvo` da condição do selo e o caso do carregamento reprovou;
  - tirei o `data?.readFailed === true` do hook e 2 casos reprovaram.
- Suítes (`CLAUDE.md` › Baselines, um workspace por vez, exit 0 fora de pipe): backoffice 5431/308, store 7630/409, core 6098/256.
- Tipos (`CLAUDE.md` › Comandos), contra o baseline: backoffice 7 erros, todos em `ProposalStateBadge.test.tsx` (igual ao baseline); store 0; mobile-adm 0; `packages/core` 11, os mesmos herdados (carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2). Nenhum erro novo.
- Lint (`CLAUDE.md` › Baselines): `npx eslint .` em `apps/backoffice` deu 23 erros e 5 warnings, igual ao baseline.

Instruções lidas: `CLAUDE.md` › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (lidas na cópia do repositório principal, carregada no contexto); `apps/backoffice/CLAUDE.md` › Molde dos formulários · Configurações › quatro seções, não oito abas · O movimento do painel; `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- A raiz do BUG-001 está em `core`, não no card: `fetchAllSettings` converte qualquer erro do `select` nos defaults, e por isso o `isError` do React Query nunca acende nesse caminho. O mesmo vale para o `isError` que `AdminAnnouncementsPage` lê: hoje ele só acende se o `queryFn` rejeitar. Não mexi nele, porque está fora do escopo. A marca nova (`data.readFailed`) fica disponível para quem quiser.
- Fatia 2 (carregando ⇒ nenhum "Em uso") passou de primeira, porque o comportamento já existia. O check de mutação deu vermelho, então a asserção morde.
- Não rodei a suíte do mobile-adm. O app só recebeu a mudança aditiva de tipo em `core`, e o `tsc` dele deu 0.
- A "segunda aba desatualizada" (a sugestão de backlog da QA) não foi coberta: o `staleTime` e o refetch entre abas continuam como estavam.
- Fora do jsdom ficou o seguinte: o estado pausado foi provado com a mutação dublada (`isPending`/`isPaused`). A pausa de verdade do React Query sem rede, e o envio sozinho quando ela volta, só o reteste em navegador mostra.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 08
Caso: fechou limpo
Instruções lidas: CLAUDE.md (raiz) › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines; apps/backoffice/CLAUDE.md › Molde dos formulários · Configurações › quatro seções · O movimento do painel; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: BUG-001, leitura em erro (os dois jeitos de falhar, o par com a leitura boa, "Tentar de novo" relê, a releitura boa devolve o card) — apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx, mais packages/core/src/hooks/__tests__/useStyleProfile.test.ts e useStoreSettings.test.ts (a marca readFailed); H9, carregando sem "Em uso" e Salvar desabilitado — StyleProfileCard.test.tsx; BUG-002, salvar sem conexão (aviso role=status, botão sem girar, sem toast, "Em uso" no anterior; o par com rede; a frase de sucesso com a rede) — StyleProfileCard.test.tsx. Sem cobertura: a pausa real do React Query sem rede e o envio sozinho na volta dela (jsdom; fica para o reteste em navegador).
Verificações: arquivos tocados verdes (33/33 no card; 88/88 no core); suítes backoffice 5431/308, store 7630/409 e core 6098/256, as três com exit 0; tsc backoffice 7 (baseline, ProposalStateBadge), store 0, mobile-adm 0, core 11 herdados; eslint backoffice 23/5; dois checks de mutação mortos por asserção.
Árvore de trabalho: StyleProfileCard.tsx e o teste dele; useSettingsSave.ts (semConexao, aditivo); packages/core/src/hooks/useStoreSettings.ts (a marca readFailed no erro, aditiva), useStyleProfile.ts (readFailed e retry) e os testes dos dois; packages/core/src/appearance/copy.ts (três frases). Nada commitado.
Citações conferidas: 3 (o molde "Tentar de novo" em features/**, useSettingsSave.ts com a frase da linha 30 intocada, SettingsSaveButton); nenhuma deslocada nem morta.
```

## T08 — wi-impl-review · done · agente ada5ee813e5533b75

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/08-bugs-1-2-card-do-perfil-carga-e-salvar.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| cada passo de reprodução do BUG-001 e do BUG-002 dá o esperado do bug (teste de componente que reprovava antes) | BUG-001: `StyleProfileCard.tsx` (`semSalvo = isLoading \|\| readFailed`. Com ele: o selo "Em uso" só aparece com `!semSalvo`, os rádios e o Salvar ficam desabilitados, e há um `role="alert"` com "Tentar de novo" → `retry`). Além disso, `useStyleProfile.ts` (`readFailed: isError \|\| data?.readFailed === true`) e `useStoreSettings.ts` (que marca `readFailed: true` quando o `select` falha). BUG-002: `useSettingsSave.ts` (`semConexao: update.isPaused === true`) e, no card, `loading={salvando && !semConexao}` mais um `InfoBanner role="status"` com a frase de sem conexão. | sim. O "vermelho antes" só se prova executando |
| testes dos arquivos que você alterou, passando — só deles | `StyleProfileCard.test.tsx`, `useStyleProfile.test.ts`, `useStoreSettings.test.ts` | só execução |
| suíte do painel e da loja, `tsc` do painel sem erro novo contra a baseline (7) e `eslint` do painel em 23/5 | — | só execução |

## Obrigações

- Nada de `grid-cols-*` sem breakpoint: aplicada. O diff não acrescenta nenhuma grade, e a única que existe é `grid gap-3 lg:grid-cols-2`, de antes.
- Alvo de toque ≥ 44 px: aplicada. O "Tentar de novo" é `h-11`, e um teste confere isso por token exato. O Salvar segue no `SettingsSaveButton`.
- `motion-reduce:` em toda transição nova: aplicada. O diff não cria transição nova, e a classe de transição que já existia continua com o par.
- Não chamar seção de "aba": aplicada. Nenhuma frase nova fala em "aba".
- Rodar as suítes do painel e da loja, o `tsc` e o `eslint`: só se prova executando. Não conferi.

## Testes

- Leitura em erro ⇒ nenhum "Em uso", opções e Salvar desabilitados, aviso com "Tentar de novo" relendo, e o par com a leitura boa: `StyleProfileCard.test.tsx`, no describe "a leitura da configuração que falha…". A asserção morde. Cobre os dois jeitos de falhar (o select com erro e o queryFn rejeitando), começa com Black Friday salvo (é o cenário do bug: sem a correção, o Padrão sairia com "Em uso"), confere que o clique chama `refetch` e tem o par da leitura boa. O caso "a releitura que dá certo devolve o card" prova que o Padrão volta a poder ser salvo. Nos hooks, `useStyleProfile.test.ts` e `useStoreSettings.test.ts` conferem `readFailed` com o par e o `retry` de verdade sobre o React Query.
- Leitura carregando ⇒ nenhum "Em uso" e opções desabilitadas: há um caso novo para o "Em uso" e o Salvar, e um caso que já existia para os rádios desabilitados. A asserção morde.
- Salvar sem conexão ⇒ aviso, e o botão sem girar calado. Com a rede, a frase de sucesso continua: está em `StyleProfileCard.test.tsx`, no describe "salvar sem conexão". A asserção morde. O caso pausado confere o `role="status"`, o texto exato, a ausência de `.animate-spin`, a ausência de toast e o "Em uso" que continua no anterior. O par prova que, gravando com rede, o botão gira e o aviso não aparece. O terceiro caso confere o toast de sucesso de H8 pela frase exata.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | `fetchAllSettings` devolve os defaults com `readFailed: true`, e o tipo é `StoreSettingsData` | sim | Conferi todos os leitores de `useStoreSettings()` em apps/ e packages/ e as iterações `Object.entries/keys/values` sobre `data`/`settings`: nenhuma. `RuntimeSettingsLoader` só lê `data.shipping.*`. `AdminAnnouncementsPage` só lê `isError`, que não muda. | sim |
| 2 | `useStyleProfile` passa a devolver `readFailed` e `retry` | sim | Nenhuma tarefa seguinte (09) consome a forma do hook, e os `toEqual` dos testes foram atualizados. | sim |
| 3 | "Carregando" e "falhou" são tratados igual, e a falha leva `role="alert"` com "Tentar de novo" h-11 | sim | É o molde de `AnalyticsSecretField.tsx:81-92` (`text-destructive`, `role="alert"`, `variant="outline"`, `h-11`, refetch), que é o exemplar que a tarefa manda imitar. | sim |
| 4 | `semConexao: update.isPaused` em `useSettingsSave`, e o card mostra um `InfoBanner role="status"` | sim | A frase compartilhada de `useSettingsSave.ts` ficou intocada, e o campo novo é aditivo. `InfoBanner` é o aviso informativo único (backoffice CLAUDE.md › Configurações). | sim |
| 5 | As três frases novas vão para `STYLE_PROFILE_COPY` | sim | O "Não faça" permite tocar em `core/appearance` quando o bug exige, e a mudança foi registrada. O teste de tom em `copy.test.ts:26` usa `Object.values(STYLE_PROFILE_COPY)` e por isso pega as chaves novas. | sim |

## Não conferido

- Que os testes passam, que cada teste reprovava antes do conserto, e os números de `tsc` e `eslint`: tudo isso só se prova executando, e eu não executei nada.
- `apps/backoffice/CLAUDE.md:966-969` ainda diz que "`useStoreSettings` não devolve erro". Depois da premissa 1 isso ficou parcialmente desatualizado: a marca `readFailed` existe agora, embora `isError` continue inalcançável para o `select` com erro. A atualização dessa documentação é do fecho do WI (regra de baselines/CLAUDE.md no fechamento), não desta tarefa, por isso não registrei como achado.
- Todos os arquivos de `alterados` aparecem em `git status` como `M`, então tinham baseline no diff.

Instruções lidas: `/Users/rafael.santos/Projetos/uma-estrelinha/store/CLAUDE.md` (raiz, carregado no contexto; usei Comandos, O "defeito 01", Convenções que valem em todo o repositório, Os guardas e Baselines); `apps/backoffice/CLAUDE.md` › Molde dos formulários · O movimento do painel (feature 50) · Configurações › quatro seções (feature 55) · e o trecho da faixa de avisos em 960-970.

## T09 — wi-impl-task · review · agente ad57b1341214245df

Tarefa: .specs/work-items/100-perfil-de-estilo-da-loja/tasks/09-bugs-3-4-card-do-perfil-visual.md
Situação: fechou

## Aborto

nada

## Decisões e premissas

| # | O que decidiu | O que descartou | Por quê | Raio de alcance |
|---|---|---|---|---|
| 1 | O aviso neutro é uma prop nova e opcional do `InfoBanner`: `tone?: 'atencao' \| 'neutro'`, com `'atencao'` como padrão. O neutro é `rounded-[10px] bg-estrelinha-admin-elevated`, sem borda, texto `text-[12.5px] text-estrelinha-admin-text-secondary`, e o ícone na mesma cor | Escrever um aviso local dentro do card | A tarefa permite as duas saídas. Com a variante, o aviso continua tendo um dono só (`AD-038` / CFG-26), e uma segunda caixa ad hoc seria o "defeito 01" pequeno. Sem `tone`, a lista de classes é a mesma de antes, só em outra ordem, então o CSS é idêntico (há teste fixando isso) | `InfoBanner.tsx` e quem passar `tone` no futuro. Hoje só o aviso do prazo usa |
| 2 | O fundo da opção marcada é `bg-estrelinha-admin-violet/[0.03]` | Escrever `#fbf9fe` direto, ou criar um token novo no preset | O painel não tem token para `#fbf9fe`, e hex solto é proibido (`adminTokens.test.ts`). Violeta a 3 % sobre branco dá `#fbf9fe` na conta. Um token novo mexeria em `packages/ui`, fora do que a tarefa autoriza | `StyleProfileCard.tsx` apenas |
| 3 | A hachura dos blocos é uma classe só, `bg-[repeating-linear-gradient(135deg,var(--hachura)_0_2px,transparent_2px_6px)]`. A cor `--hachura` vem do `ground-deep` de cada perfil, pelo `style` do bloco. O traço tracejado saiu | Abrir `adm-bf.css` para copiar o desenho exato da hachura | A regra 5 me proíbe de abrir a fonte de design, e o bug não diz ângulo, cor nem espessura. Por isso ângulo, espessura e cor são escolha minha. A cor vem do dono dos perfis (`ESTRELINHA_PROFILES`), sem hex no código. O contraste de `ground-deep` sobre `ground` é baixo e pode sair discreto demais | `StyleProfileCard.tsx`. O reteste do QA pode pedir outro desenho |
| 4 | Usei raio arbitrário exato (`rounded-[6px]` nas amostras, `rounded-[10px]` no aviso) | `rounded-md` | No preset, `rounded-md` é `calc(var(--radius) - 2px)` e não 6 px fixos | nenhum |
| 5 | Quem não está marcada fica com `border-2 border-border`, e o rádio continua `accent-primary` | Trocar também a cor do rádio | O bug não fala do rádio, e a tarefa proíbe ampliar escopo | nenhum |

## Fatias

| # | Comportamento | Nível | Teste | Verde? | Mutação |
|---|---|---|---|---|---|
| 1 | Opção com borda de 2 px (marcada em violeta com fundo a 3 %), miniatura 22/12/34 px com hachura e botão de 14 px, amostras com raio de 6 px e gap de 4 px, nome em peso 600, conferidos por token exato (BUG-003) | componente | `apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx` › "as opções nas medidas do protótipo" (5 casos) | sim | — |
| 2 | Aviso do prazo no tom neutro (fundo `elevated`, sem borda, texto `text-secondary` a 12,5 px, relógio). O par: o aviso "sem conexão" do mesmo card continua âmbar, e o `InfoBanner` sem `tone` não muda (BUG-004) | componente | `StyleProfileCard.test.tsx` › "o aviso do prazo no tom neutro do protótipo" (2 casos); `apps/backoffice/src/shared/ui/__tests__/InfoBanner.test.tsx` › "o tom neutro é aditivo" (2 casos) | sim | — |

Antes do conserto, rodei o arquivo do card: 6 casos reprovaram e o par passou. Os 2 casos novos do `InfoBanner` foram escritos junto com a variante e não passaram pelo vermelho. Eles fixam o padrão de hoje e o tom novo.

## Repositórios tocados

/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100

## Arquivos alterados

apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx — alterado
apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx — alterado
apps/backoffice/src/shared/ui/InfoBanner.tsx — alterado
apps/backoffice/src/shared/ui/__tests__/InfoBanner.test.tsx — alterado

## Verificação

- `pnpm --filter @estrelinha/backoffice exec vitest run <arquivo> --testTimeout=20000` (PROJECT.md › Comandos de verificação), nos dois arquivos de teste: antes do conserto, 6 reprovados e 34 passando; depois, 50/50 passando.
- `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (CLAUDE.md › Comandos): 7 erros, todos em `ProposalStateBadge.test.tsx`. É o mesmo que a baseline (7, herdados), sem erro novo.
- `npx eslint .` em `apps/backoffice` (CLAUDE.md › Baselines): 23 erros e 5 warnings, igual à baseline. Nenhum aponta para arquivo que eu toquei.
- `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` (CLAUDE.md › Baselines): 5439 de 5440 passaram. O que reprovou foi `AdminOrdersPage.aviso.test.tsx` › "lote de 60 selecionados", por `Test timed out in 45000ms`. É o caso lento que o CLAUDE.md já registra como contenção. Rodei esse arquivo sozinho: 29/29 passando.
- `pnpm --filter @estrelinha/store test --testTimeout=20000` (CLAUDE.md › Baselines): 7630/7630 testes e 409/409 arquivos passaram. O comando saiu com código 1 por um único erro do próprio vitest, `[vitest-worker]: Timeout calling "onTaskUpdate"`, que também é contenção e não um teste reprovado.
- Um detalhe de execução: a suíte do painel passou dos 120 s padrão e a ferramenta a moveu para segundo plano. Esperei terminar em primeiro plano, lendo o arquivo de saída, sem rodar uma segunda cópia.

Instruções lidas: `CLAUDE.md` › Comandos · O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines (chegou carregado no contexto); `apps/backoffice/CLAUDE.md` › Molde dos formulários · O movimento do painel · Configurações › quatro seções, não oito abas (o arquivo tem 133 KB, então li pelo índice de títulos); `.specs/project/PROJECT.md` › Comandos de verificação · Ambiente local.

## Divergências e descobertas

- A tarefa manda imitar o protótipo (`adm-faixa-perfil.jsx`, `adm-base.css`). O arquivo `adm-bf.css` existe em `store/Claude outputs/bf-prototipos/`, mas não abri: a regra 5 me proíbe de ler fonte de design. Usei só os valores escritos no corpo dos bugs. O desenho exato da hachura ficou como decisão minha (premissa 3).
- O nome dos tokens no preset é outro: `violet`, `elevated` e `text-secondary`, onde os bugs dizem `violet`, `elev` e `text2`. Os hex batem: `#F3EFF8` e `#5A4E6F`.
- O `Depende de` confere: a T08 está commitada (`9f1d38c0`), e parti da árvore que ela deixou.
- Nenhuma citação com `caminho:linha` foi usada. `useSettingsSave.ts:30` não foi tocado.
- Duas medições saíram vermelhas por contenção, e nenhuma por teste meu. No painel, o caso de 45 s reprovou na suíte cheia e passou sozinho. Na loja, o `onTaskUpdate` saiu como erro do vitest com todos os testes passando.
- Não mexi em `packages/core/src/appearance/**` nem em `apps/store/**`.

## Ao humano

nada

## O que devolver no fim

```
Tarefa: 09
Caso: fechou com divergência
Instruções lidas: CLAUDE.md (raiz) › Comandos · O "defeito 01" · Convenções · Os guardas · Baselines; apps/backoffice/CLAUDE.md › Molde dos formulários · Configurações › quatro seções · O movimento do painel; .specs/project/PROJECT.md › Comandos de verificação · Ambiente local
Testes escritos: BUG-003 — StyleProfileCard.test.tsx › "as opções nas medidas do protótipo" (borda 2 px e marcada violeta/[0.03]; a marca segue a escolha; miniatura 22/12/34 com hachura e 14 px; amostras rounded-[6px] e gap-1; nome font-semibold). BUG-004 — StyleProfileCard.test.tsx › "o aviso do prazo no tom neutro" (elevated, sem borda, rounded-[10px], text-secondary a 12,5 px, relógio; o par: o aviso sem conexão continua âmbar) e InfoBanner.test.tsx › "o tom neutro é aditivo" (o neutro; o padrão sem tone com as classes de antes). Sem cobertura: a aparência visual da hachura (jsdom não pinta); fica para o reteste do QA em navegador
Verificações: os dois arquivos de teste: 50/50 passando (antes do conserto, 6 vermelhos); tsc do painel: 7 erros, iguais à baseline; eslint do painel: 23/5, igual à baseline; suíte do painel: 5439/5440, com o caso "lote de 60" estourando os 45 s por contenção e passando sozinho (29/29); suíte da loja: 7630/7630, com 1 erro de worker do vitest (onTaskUpdate, contenção)
Árvore de trabalho: apps/backoffice/src/features/style-profile/ui/StyleProfileCard.tsx, apps/backoffice/src/features/style-profile/ui/__tests__/StyleProfileCard.test.tsx, apps/backoffice/src/shared/ui/InfoBanner.tsx (prop aditiva tone), apps/backoffice/src/shared/ui/__tests__/InfoBanner.test.tsx
Citações conferidas: 2 (StyleProfileCard.tsx depois da T08; os tokens do preset, conferidos por adminTokens.test.ts); nenhuma deslocou; nenhuma morta. O protótipo citado não foi aberto (regra 5)
```

## T09 — wi-impl-review · done · agente a444fd3fe497c8921

Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-100/.specs/work-items/100-perfil-de-estilo-da-loja/tasks/09-bugs-3-4-card-do-perfil-visual.md
Veredito: serve

## Achados

| #   | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
| --- | ------ | --------- | ------------- | --------- | ----------------------------- |
| —   | nada   |           |               |           |                               |

## Cobertura da tarefa

| Asserção | Cumprida em | Bate? |
|---|---|---|
| cada passo de reprodução do BUG-003 e do BUG-004 dá o esperado do bug (teste que reprovava antes) | BUG-003: `StyleProfileCard.tsx`. O cartão ganhou `border-2`; o marcado ganhou `border-estrelinha-admin-violet bg-estrelinha-admin-violet/[0.03]` (violeta #6C3CE9 a 3 % sobre branco dá #fbf9fe na conta). A miniatura ficou com `h-[22px]` / `h-3` / `h-[34px]` com hachura / `h-3.5`. As amostras ficaram com `rounded-[6px]` e `gap-1`. O nome passou a `font-semibold`. BUG-004: o `InfoBanner` ganhou `tone="neutro"`, com `rounded-[10px] bg-estrelinha-admin-elevated`, sem borda, e `text-[12.5px] text-estrelinha-admin-text-secondary` | sim no código. O "vermelho antes" só se prova executando |
| testes dos arquivos alterados passando | `StyleProfileCard.test.tsx`, `InfoBanner.test.tsx` | só execução |
| suíte do painel e da loja, `tsc` (7) e `eslint` (23/5) | — | só execução |

## Obrigações

- **Nada de `grid-cols-*` sem breakpoint, alvo ≥ 44 px, `motion-reduce:`, "aba":** nenhum `grid-cols` novo. O cartão mantém `min-h-11`. Nenhuma transição nova: a `transition-colors` antiga já tem o par. Nenhum texto de "aba".
- **Rodar as suítes, `tsc` e `eslint`:** só execução, não conferido aqui.
- **`InfoBanner` só muda no card:** cumprida. A prop `tone` é opcional e vale `'atencao'` por padrão. Com o padrão, as classes são as mesmas de antes, em outra ordem, e `InfoBanner.test.tsx` fixa a string exata da caixa, do texto e do ícone. Nenhum outro chamador passa `tone`.

## Testes

- **BUG-003 (componente):** em `StyleProfileCard.test.tsx`, no bloco "as opções nas medidas do protótipo". A asserção morde:
  - casa por token exato e cobre as duas pontas: `border-2` presente e `border` ausente; violeta só no marcado;
  - mede as quatro alturas da miniatura, a classe da hachura e a variável `--hachura` igual a `ground-deep` do perfil;
  - confere o raio de 6 px (e que `rounded` saiu), `gap-1` (e que `gap-1.5` saiu) e `font-semibold` (e que `font-bold` saiu);
  - prova que a marca segue a escolha, e não o perfil salvo.
- **BUG-004 (componente):** em `StyleProfileCard.test.tsx`, no bloco "o aviso do prazo no tom neutro", e em `InfoBanner.test.tsx`, no bloco "o tom neutro é aditivo". A asserção morde:
  - confere o fundo `elevated`, a ausência de `border` e de âmbar, `text-[12.5px]` com `text-secondary` e o ícone do relógio;
  - prova o par de duas formas: o aviso de "sem conexão" do mesmo card continua âmbar, e o `InfoBanner` sem `tone` mantém a string de classes exata.

## Premissas

| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | O tom neutro entra como prop `tone` opcional no `InfoBanner` | sim | A tarefa autoriza "variante aditiva em `InfoBanner.tsx`". `apps/backoffice/CLAUDE.md` › Configurações diz que "`InfoBanner` … é o aviso informativo único", e a variante mantém um dono só. Os tokens `elevated` e `text-secondary` existem em `packages/ui/src/styles.css` | sim |
| 2 | O fundo do marcado é `bg-estrelinha-admin-violet/[0.03]` | sim | A conta dá #fbf9fe. O token violeta já é usado com modificador de opacidade em outras telas do painel (`/10`, `/15`). Não há hex literal | sim |
| 3 | A hachura é um gradiente arbitrário com a cor `ground-deep` vinda de `ESTRELINHA_PROFILES`, pela variável `--hachura` | sim | O bug não fixa ângulo nem espessura, e nada no arquivo de instruções decidia isso. A cor vem do dono dos perfis, sem hex. Ele mesmo declara que a hachura pode sair discreta demais, e isso só o reteste mostra | sim |
| 4 | Raio arbitrário exato: `rounded-[6px]` e `rounded-[10px]` | sim | O bug pede 6 px e 10 px literais | sim |
| 5 | O rádio continua com `accent-primary` | sim | Os bugs não citam o rádio, e a tarefa proíbe abrir escopo novo | sim |

## Não conferido

- O resultado de testes, `tsc`, `eslint` e as suítes: dependem de execução. Também não deu para provar que os testes estavam vermelhos antes do conserto.
- A aparência real da hachura, porque o contraste de `ground-deep` sobre `ground` é baixo, e as medidas renderizadas: jsdom devolve 0 para layout. Ficam para o reteste do QA.
- Os quatro arquivos aparecem como `M` no `git status`, com baseline. Nenhuma mudança fora do escopo desta tarefa apareceu no diff.

Instruções lidas: `CLAUDE.md` (raiz), carregado por inteiro no contexto; `apps/backoffice/CLAUDE.md` › Molde dos formulários · O movimento do painel (feature `50`) · Configurações › quatro seções (feature `55`), no trecho sobre o `InfoBanner`.
