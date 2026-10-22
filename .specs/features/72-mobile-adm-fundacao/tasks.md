# 72 — mobile-adm: fundação — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits da implementação saem juntos no fim, **no branch `feat/72-mobile-adm-fundacao`**, e
> só quando o usuário pedir. Sub-agentes não fazem commit nem `git stash`.
>
> **Merge** (`AD-056`): finalizada e testada (tasks concluídas, Verificador com PASS, gates sem
> regressão, prova em navegador escrita), a branch é mergeada em **`feature/mobile-adm`**, nunca
> direto na `master`.

---

**Design**: `.specs/features/72-mobile-adm-fundacao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado do código, do `CLAUDE.md` raiz (seções *Baselines*, *Os guardas*, *Mobile é o caso
> principal*) e dos `vitest.config.ts` dos apps. Guias encontrados: `CLAUDE.md`,
> `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `apps/*/vitest.config.ts`.

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura / hook (`useMinimumDuration`, `useOnline`, `TABS`) | unit (vitest) | todo ramo; 1:1 com as ACs; cada edge case | `apps/mobile-adm/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/mobile-adm test` |
| Tela / widget (Splash, Login, Recovery, TabBar, Offline, layout) | componente (RTL + jsdom) | caminho feliz + cada edge case + falha, **montando a árvore real** (a página monta, não o teste) | `apps/mobile-adm/src/**/__tests__/*.test.tsx` | idem |
| Guarda de fonte (rotas, SW, abas, paleta, fontes) | unit lendo o disco | âncora de contagem + sensor por mutação + inverso | `__tests__` do app, ou `apps/store/src/shared/lib/__tests__` para o que compara com a loja | idem / `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| `packages/auth` (`RequireAdmin` com `fallback`) | componente, **na suíte do app novo** | os dois ramos (com e sem `fallback`) | `apps/mobile-adm/src/app/__tests__` | idem |
| Config (manifest, `vercel.json`, `turbo.json`) | guarda de fonte | os campos que as ACs nomeiam | idem | idem |
| Layout em 390×844 / instalação | navegador real | **não alcançável por jsdom** | prova em `prova-navegador.md` | Playwright + Lighthouse no build servido |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task com teste só do app | `pnpm --filter @estrelinha/mobile-adm test` |
| Full | **toda task que cria arquivo em `apps/**` ou `packages/**`** (os guardas da loja e do painel varrem `apps/**`) | Quick + `pnpm --filter @estrelinha/store test --testTimeout=20000` + `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`, **um por vez, exit code fora de pipe** |
| Build | fim de fase | Full + `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` + o mesmo para store e backoffice + `pnpm build` + `pnpm lint` |

Baseline de entrada: **medir com a árvore parada antes da T01** e registrar em `baseline.md`.

---

## Execution Plan

```
Fase 1 (base compartilhada): T01 → T02 → T03
Fase 2 (o app existe):        T04 → T05 → T06
Fase 3 (casca):               T07 → T08 → T09 → T10
Fase 4 (entrada):             T11 → T12 → T13
Fase 5 (fecho):               T14 → T15
```

### Fase 1 — base compartilhada

**T01 · `01-paleta-com-dono-em-ui`**
- **Status**: ✅ concluída (lote 1)
- **What**: criar `packages/ui/src/tokens/estrelinha.ts` com `ESTRELINHA_COLORS`, `ESTRELINHA_RADIUS`,
  `ESTRELINHA_SHADOW` e `ESTRELINHA_FONTS` (valores e comentários de papel movidos da loja).
  `apps/store/tailwind.config.ts` passa a importá-los. Nenhum valor muda.
- **Where**: `packages/ui/src/tokens/estrelinha.ts`, `apps/store/tailwind.config.ts`,
  `apps/store/src/shared/lib/__tests__/palette.test.ts`.
- **Depends on**: —
- **Reuses**: o objeto atual da loja.
- **Tests**: `palette.test.ts` sem asserção tocada, mais a vizinha: o objeto da loja **é** `ESTRELINHA_COLORS` (`toBe`). Sensor: um config com cópia literal reprova.
- **Done when**: suíte da loja verde, com `contrast.test.ts` intacto; `tsc` da loja 0.
- **Requirements**: suporte a `MAF-05`, `MAF-14`.

**T02 · `02-fontes-copiadas-com-guarda`**
- **Status**: ✅ concluída (lote 1)
- **What**: copiar os três `woff2` de `apps/store/public/fonts/` para `apps/mobile-adm/public/fonts/` e
  criar `fontesDoAteliePareadas.test.ts` comparando o SHA-256 arquivo a arquivo.
- **Where**: `apps/mobile-adm/public/fonts/*`, `apps/store/src/shared/lib/__tests__/fontesDoAteliePareadas.test.ts`.
- **Depends on**: T01
- **Tests**: âncora (3 arquivos dos dois lados) + sensor com um buffer alterado.
- **Done when**: Full gate.

**T03 · `03-require-admin-com-fallback`**
- **Status**: ✅ concluída (lote 1)
- **What**: prop opcional `fallback?: ReactNode` em `RequireAdmin`. Sem ele, o esqueleto atual.
- **Where**: `packages/auth/src/RequireAdmin.tsx`.
- **Depends on**: —
- **Tests**: na T08 (o app ainda não tem runner). Aqui: Full gate prova que o painel não mudou.
- **Done when**: suíte do painel verde **sem asserção tocada**; `tsc` 0 nos dois apps.

### Fase 2 — o app existe

**T04 · `04-scaffold-mobile-adm`**
- **Status**: ✅ concluída (lote 1)
- **What**: o app vazio que compila, testa e builda (ver *Components → scaffold* no design). Script
  `dev:mobile-adm` na raiz, `VITE_BACKOFFICE_URL` no `turbo.json` e no `.env.example` do app.
- **Where**: `apps/mobile-adm/**`, `package.json`, `turbo.json`.
- **Depends on**: T01, T02
- **Tests**: um smoke test que monta `App` sem sessão e acha o Login (placeholder).
- **Done when**: Build gate do app (tsc 0, test, build), e Full gate.
- **Requirements**: `MAF-03` (parte).

**T05 · `05-pwa-manifest-e-service-worker`**
- **Status**: ✅ concluída (lote 1)
- **What**: `vite-plugin-pwa@0.21.2` + `workbox-window`; manifest e workbox do design; ícones 192, 512
  e 512 maskable gerados do SVG-fonte (`magick`), fundo `primary-strong`; `theme-color` no `index.html`.
- **Where**: `apps/mobile-adm/vite.config.ts`, `apps/mobile-adm/public/icons/*`, `apps/mobile-adm/index.html`,
  `apps/mobile-adm/src/app/__tests__/swSemDadosDaLoja.test.ts`, `.../manifest.test.ts`.
- **Depends on**: T04
- **Tests**: o guarda do SW (sem `runtimeCaching`, nenhum padrão casando `supabase.co`, sem `json` no
  precache) com sensor; o manifest com cada campo de `MAF-01`, cores **importadas** de `ESTRELINHA_COLORS`,
  e os ícones existindo no disco com o tamanho declarado (lido do cabeçalho PNG).
- **Done when**: `pnpm --filter @estrelinha/mobile-adm build` gera `manifest.webmanifest` e `sw.js`; Full gate.
- **Requirements**: `MAF-01`, `MAF-02`, `MAF-03`, `MAF-20`.

**T06 · `06-vercel-json`**
- **Status**: ✅ concluída (lote 1)
- **What**: `apps/mobile-adm/vercel.json` no molde do painel: SPA rewrite, `assets` imutável, `sw.js` e
  `manifest.webmanifest` sem cache, os headers de segurança e `noindex`.
- **Where**: `apps/mobile-adm/vercel.json`, `apps/mobile-adm/src/app/__tests__/vercelConfig.test.ts`.
- **Depends on**: T05
- **Tests**: cada header de `MAF-04` + o rewrite **não** capturando `sw.js` nem o manifest.
- **Done when**: Quick gate.
- **Requirements**: `MAF-04`.

### Fase 3 — casca

**T07 · `07-splash`**
- **Status**: ✅ concluída (lote 2)
- **What**: `Splash` + `useMinimumDuration(600)`.
- **Where**: `apps/mobile-adm/src/features/splash/**`.
- **Depends on**: T04
- **Tests**: a assinatura em SVG inline (sem `<img>`), o rótulo, o piso de 600 ms com relógio falso
  (599 ainda splash, 600 sai), nenhum temporizador maior, e o par `motion-reduce:` em cada transição.
- **Done when**: Quick gate.
- **Requirements**: `MAF-05`, `MAF-06`, `MAF-07`.

**T08 · `08-rotas-sob-guarda`**
- **Status**: ✅ concluída (lote 2)
- **What**: `App`/`AppRoutes` com `/login` fora e as quatro abas dentro de `RequireAdmin
  fallback={<Splash/>} loginPath="/login"`.
- **Where**: `apps/mobile-adm/src/app/**`.
- **Depends on**: T03, T07
- **Tests**: `rotasSobGuarda.test.ts` do app (posição, âncora tripla, sensores); `RequireAdmin` com e
  sem `fallback` (o painel continua vendo o esqueleto); sem sessão, qualquer rota ⇒ Login; carregando ⇒ Splash.
- **Done when**: Full gate.
- **Requirements**: `MAF-16`.

**T09 · `09-abas-e-layout`**
- **Status**: ✅ concluída (lote 2)
- **What**: `TABS`, `TabBar`, `MobileLayout`, as quatro páginas "em construção" e o rodapé do Backoffice.
- **Where**: `apps/mobile-adm/src/widgets/tab-bar/**`, `apps/mobile-adm/src/app/layout/MobileLayout.tsx` (em `app/`, não em `widgets/`: compõe dois widgets, e widget importando widget seria import lateral), `apps/mobile-adm/src/pages/*`.
- **Depends on**: T08
- **Tests**: as quatro abas na ordem de `TABS`, com rótulo visível; `aria-current` só na atual; alvo
  `min-h-12` por token exato; `pb-[env(safe-area-inset-bottom)]`; guarda bidirecional `TABS` × rotas;
  link do Backoffice com env e ausente sem env; nenhuma página com número ou nome fictício.
- **Done when**: Full gate.
- **Requirements**: `MAF-14`, `MAF-15`, `MAF-17`, `MAF-18`.

**T10 · `10-sem-conexao`**
- **Status**: ✅ concluída (lote 2)
- **What**: `useOnline` + `OfflineScreen` acima do router.
- **Where**: `apps/mobile-adm/src/shared/lib/useOnline.ts`, `apps/mobile-adm/src/app/OfflineScreen.tsx`.
- **Depends on**: T08
- **Tests**: offline na montagem ⇒ tela, sem router; evento `offline` com o app aberto ⇒ tela; `online` ⇒ volta
  sozinho; "Tentar de novo" offline ⇒ continua; nenhuma chamada ao client do Supabase enquanto offline.
- **Done when**: Full gate.
- **Requirements**: `MAF-19`, `MAF-21`.

### Fase 4 — entrada

**T11 · `11-login`**
- **Status**: ✅ concluída (lote 2)
- **What**: `LoginPage` (desenho da tela Login do protótipo).
- **Where**: `apps/mobile-adm/src/pages/LoginPage.tsx`.
- **Depends on**: T08
- **Tests**: navega **só depois** de `authLoading` fechar (o `BUG-20260802` reproduzido: admin resolvido
  depois do `signIn` não pisca a recusa); senha errada mantém o e-mail; conta sem papel ⇒ frase +
  "Sair", e **nenhuma** leitura de tabela; mostrar/ocultar senha com alvo de 48 px.
- **Done when**: Full gate.
- **Requirements**: `MAF-08`, `MAF-09`, `MAF-10`, `MAF-11`.

**T12 · `12-recuperacao-por-codigo`**
- **Status**: ✅ concluída (lote 2)
- **What**: `RecoveryFlow` (e-mail → código → senha nova), com a copy corrigida (código, não link).
- **Where**: `apps/mobile-adm/src/features/recovery/**`.
- **Depends on**: T11
- **Tests**: cada passo e cada recusa; cooldown de 60 s com relógio falso; `passwordChangeRefusal`
  chamada **antes** de `updatePassword`; o fim cai no mesmo efeito do login; a palavra "link" não
  aparece na tela.
- **Done when**: Full gate.
- **Requirements**: `MAF-12`.

**T13 · `13-sair-e-sessao-expirada`**
- **Status**: ✅ concluída (lote 2)
- **What**: `AccountMenu` (e-mail + "Sair") no cabeçalho das abas; sessão perdida com o app aberto ⇒ Login.
- **Where**: `apps/mobile-adm/src/widgets/account-menu/**`.
- **Depends on**: T09, T11
- **Tests**: "Sair" chama `signOut` e cai em `/login`; o `AuthProvider` perdendo a sessão leva ao Login sem toast.
- **Done when**: Build gate (fim da Fase 4).
- **Requirements**: `MAF-13`, edge case de sessão.

### Fase 5 — fecho

**T14 · `14-documentacao`**
- **Status**: ✅ concluída (lote 2)
- **What**: `apps/mobile-adm/CLAUDE.md`; na raiz: mapa da documentação, layout do monorepo, comandos,
  a porta 8084, a tabela de guardas e as baselines; `.env.example` do app.
- **Depends on**: T13
- **Done when**: Build gate, com as baselines **medidas** e registradas.

**T15 · `15-prova-em-navegador`**
- **Status**: ✅ concluída (lote 2)
- **What**: build servido (`vite preview`), Playwright em **390×844** e 1440: splash, login, abas, sem
  rolagem horizontal, barra inferior sem sobrepor; offline (`context.setOffline`) mostrando a tela;
  Lighthouse com "installable"; manifest e SW conferidos no `Application` do DevTools.
- **Where**: `.specs/features/72-mobile-adm-fundacao/prova-navegador.md`.
- **Depends on**: T14
- **Done when**: o relatório escrito, com o que **não** foi medido declarado (a instalação num Android
  real fica com o usuário).

---

## Validação antes de apresentar

### Granularidade

| Task | Uma entrega? | OK |
| --- | --- | --- |
| T01 | um objeto de tokens + seu leitor | ✅ |
| T02 | três arquivos copiados + o guarda deles | ✅ |
| T03 | um prop | ✅ |
| T04 | o scaffold (um app vazio; é uma unidade de configuração) | ✅ |
| T05 | o plugin e seus artefatos | ✅ |
| T06 | um arquivo | ✅ |
| T07 | um componente + um hook dele | ✅ |
| T08 | o router | ✅ |
| T09 | a navegação (lista + barra + layout) | ✅ |
| T10 | um hook + uma tela | ✅ |
| T11 | uma tela | ✅ |
| T12 | um fluxo | ✅ |
| T13 | um widget | ✅ |
| T14 | documentação | ✅ |
| T15 | uma prova | ✅ |

### Diagrama × dependências

| Task | Depends on (definição) | No diagrama | OK |
| --- | --- | --- | --- |
| T01 | — | início da Fase 1 | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | — | Fase 1 (sequencial) | ✅ |
| T04 | T01, T02 | Fase 2 depois da 1 | ✅ |
| T05 | T04 | T04 → T05 | ✅ |
| T06 | T05 | T05 → T06 | ✅ |
| T07 | T04 | Fase 3 depois da 2 | ✅ |
| T08 | T03, T07 | T07 → T08 | ✅ |
| T09 | T08 | T08 → T09 | ✅ |
| T10 | T08 | Fase 3 | ✅ |
| T11 | T08 | Fase 4 depois da 3 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T09, T11 | T12 → T13 | ✅ |
| T14 | T13 | Fase 5 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |

### Testes co-localizados

| Task | Camada | Exigido pela matriz | Na task | OK |
| --- | --- | --- | --- | --- |
| T01 | guarda de fonte | âncora + sensor | `palette.test` + vizinha + sensor | ✅ |
| T02 | guarda de fonte | âncora + sensor | SHA + sensor | ✅ |
| T03 | `packages/auth` | componente na suíte do app | adiado para T08, declarado | ✅ |
| T04 | config | build gate + smoke | smoke + Build gate | ✅ |
| T05 | config + guarda | campos das ACs + sensor | manifest + SW + sensor | ✅ |
| T06 | config | campos das ACs | headers | ✅ |
| T07 | componente + hook | ramos + edge | relógio falso + reduced motion | ✅ |
| T08 | guarda + componente | âncora + sensores | `rotasSobGuarda` + ramos | ✅ |
| T09 | widget + guarda | ramos + bidirecional | idem | ✅ |
| T10 | hook + tela | ramos + falha | idem | ✅ |
| T11 | tela | feliz + edge + falha | idem | ✅ |
| T12 | fluxo | feliz + edge + falha | idem | ✅ |
| T13 | widget | feliz + falha | idem | ✅ |
| T14 | docs | build gate | baselines medidas | ✅ |
| T15 | navegador | prova escrita | relatório | ✅ |

**Requisitos cobertos**: `MAF-01`..`MAF-21`, os 21, com os edge cases de sessão em T13 e de env em T09.

---

### Fase 6 — rodada de conserto do QA (`MAF-22`..`MAF-30`, emenda de 2026-10-22)

Origem: `docs/qa/reports/2026-10-22-mobile-adm-fundacao.md` (Decisions for a Human + Paper Cuts),
decisão do usuário de resolver tudo antes de avançar. Gate de toda task: Full (app + loja + painel).

**T16 · `16-papel-em-tres-estados`** · ✅ concluída (Fase 6) — `packages/auth/src/AuthContext.tsx` e `RequireAdmin.tsx`: `adminStatus`
(`admin` · `not-admin` · `unknown`), teto de 8 s na consulta do papel e na leitura inicial da sessão,
`retryAdminCheck()`, `isAdmin` derivado. `RequireAdmin` com estado `unknown` próprio (prop opcional
`unknownFallback`; o padrão do painel diz a mesma frase). `AdminLoginPage` do painel deixa de dizer a
recusa no `unknown`. Testes: app (sobre o `AuthProvider` real, com o papel falhando e pendurado) e
painel (a recusa falsa sumiu, sem asserção antiga afrouxada). Fecha `BL-048`. (`MAF-22`, `MAF-23`)

**T17 · `17-nao-consegui-conferir`** · ✅ concluída (Fase 6) — no app: a tela "Não consegui conferir seu acesso." + "Tentar de
novo" no Login, no `BootGate` e no fallback do guarda; nenhum "Sair" nesse estado; a sessão salva
continua no `localStorage`. (`MAF-23`)

**T18 · `18-recuperacao-com-rota`** · ✅ concluída (Fase 6) — `/recuperar` fora do guarda, passos no histórico, `rotasSobGuarda`
atualizado para o novo de-fora-por-desenho. (`MAF-24`)

**T19 · `19-codigo-ja-enviado`** · ✅ concluída (Fase 6) — 429 no envio ⇒ passo do código com "Já enviamos um código há pouco
para <e-mail>.". (`MAF-25`)

**T20 · `20-entrar-vazio`** · ✅ concluída (Fase 6) — "Informe o e-mail e a senha." sem rede. (`MAF-26`)

**T21 · `21-favicon-e-splash-no-html`** · ✅ concluída (Fase 6) — ícone de aba declarado; a splash estática injetada no
`index.html` no build, do MESMO arquivo do lockup (guarda), trocada pelo React sem salto. (`MAF-27`, `MAF-28`)

**T22 · `22-anuncios-ao-leitor-de-tela`** · ✅ concluída (Fase 6) — título do documento por aba, foco no título da página ao
trocar de aba, a tela Sem conexão em região viva assertiva. (`MAF-29`, `MAF-30`)

**T23 · `23-fecho-da-rodada`** · ✅ concluída (Fase 6) — `apps/mobile-adm/CLAUDE.md`, `packages/auth` no `CLAUDE.md` da raiz,
baselines medidas, os 4 BUG da rodada com `## Fix`, e a `BL-048` marcada fechada no `BACKLOG.md`.

#### Fase 6 — o que foi feito, e onde

- **T16/T17** — `packages/auth/src/AuthContext.tsx` (`adminStatus`, `retryAdminCheck`, `ADMIN_CHECK_TIMEOUT_MS`,
  `comTeto`, o teto único da abertura, o `emVoo` que impede um segundo teto para o mesmo id),
  `packages/auth/src/RequireAdmin.tsx` (`unknownFallback`, o padrão do painel), `packages/core/src/auth/errors.ts`
  (`ACCESS_UNCHECKED`, `AUTH_RATE_LIMITED`, só exportações novas), `apps/backoffice/src/pages/admin/AdminLoginPage.tsx`,
  `apps/mobile-adm/src/features/access-check/**`, `LoginPage.tsx`, `App.tsx`. O `BootGate` não mudou: o teto do
  provider é o que o limita a 8 s, e no `unknown` a tela é da rota (Login ou o `unknownFallback`), para a
  recuperação continuar alcançável.
- **T18/T19** — `features/recovery/model/passos.ts`, `RecoveryFlow.tsx` (passo por prop, estado no `history.state`),
  `pages/RecuperarPage.tsx`, `shared/ui/TelaDeEntrada.tsx` (a moldura que saiu do `LoginPage`).
- **T20** — `LoginPage.tsx` (`CAMPOS_VAZIOS`).
- **T21** — `index.html` (o ícone), `splashEstatica.ts` + o plugin no `vite.config.ts`, `tsconfig.node.json`.
  Prova no build servido, 390 × 844, sem service worker: as caixas do lockup, da barra, do progresso e do rótulo
  são **idênticas** entre a splash estática (JS bloqueado) e a do React, com movimento reduzido e sem; `/icons/icon-192.png` 200.
- **T22** — `app/layout/MobileLayout.tsx` (título e foco), `widgets/tab-bar/model/tabs.ts` (`tituloDaAba`, `abaDoCaminho`),
  `app/OfflineScreen.tsx` (região assertiva).
- **Asserções antigas que mudaram de verdade** (app, não loja nem painel): duas de `RecoveryFlow.test.tsx` esperavam
  `pathname === '/login'` no passo da senha; com `MAF-24` o passo tem rota, e passaram a esperar `/recuperar/senha`
  (o que elas provam — ficar no passo, ninguém entra — não mudou). `rotasSobGuarda.test.ts` e `abasSaoAsRotas.test.ts`
  ganharam as três rotas na lista de fora-por-desenho, com a razão. No painel, nenhuma asserção antiga foi tocada.

#### Fase 6 — sensor do autor

Arnês: `mutar.py` no scratchpad da sessão. Cada mutante troca um trecho que aparece **exatamente uma vez** no arquivo
real (senão é inválido e não roda), roda as suítes que o cobrem, restaura e confere o SHA-256. Morte por asserção =
`Tests N failed` sem erro de transformação. Autor = verificador: reduz o viés, não o elimina.

| # | AC | Arquivo real | Mutação | Resultado |
| --- | --- | --- | --- | --- |
| M01 | MAF-22 | `packages/auth/src/AuthContext.tsx` | erro da consulta do papel ⇒ `not-admin` | morto, 9 casos, asserção, SHA ok |
| M02 | MAF-22 | idem | o papel sem teto | morto, 4 casos, asserção, SHA ok |
| M03 | MAF-22 | idem | o teto da sessão +5 s | morto, 2 casos, asserção, SHA ok |
| M04 | MAF-23 | `packages/auth/src/RequireAdmin.tsx` | o ramo `unknown` nunca casa | morto, 6 casos, asserção, SHA ok |
| M05 | MAF-23 | `apps/backoffice/src/pages/admin/AdminLoginPage.tsx` | o ramo `unknown` nunca casa | morto, 2 casos, asserção, SHA ok |
| M06 | MAF-23 | `apps/mobile-adm/src/pages/LoginPage.tsx` | `naoConferido = false` | morto, 2 casos, asserção, SHA ok |
| M07 | MAF-23 | `features/access-check/ui/AcessoNaoConferido.tsx` | "Tentar de novo" não refaz | morto, 2 casos, asserção, SHA ok |
| M08 | MAF-24 | `features/recovery/ui/RecoveryFlow.tsx` | o passo do código com `replace` (sai do histórico) | morto, 1 caso, asserção, SHA ok |
| M09 | MAF-24 | idem | o e-mail na URL do passo da senha | morto, 1 caso, asserção, SHA ok |
| M10 | MAF-24 | idem | passo do meio sem estado não volta ao primeiro | morto, 1 caso, asserção, SHA ok |
| M11 | MAF-25 | idem | o 429 tratado como falha | morto, 2 casos, asserção, SHA ok |
| M12 | MAF-26 | `pages/LoginPage.tsx` | só recusa os dois vazios | morto, 3 casos, asserção, SHA ok |
| M13 | MAF-27 | `index.html` | o `rel="icon"` trocado | morto, 2 casos, asserção, SHA ok |
| M14 | MAF-28 | `splashEstatica.ts` | o lockup alterado na injeção | morto, 1 caso, asserção, SHA ok |
| M15 | MAF-28 | `vite.config.ts` | o plugin desligado | morto, 1 caso, asserção, SHA ok |
| M16 | MAF-28 | `splashEstatica.ts` | o lockup sem o primeiro quadro (salto) | morto, 1 caso, asserção, SHA ok |
| M17 | MAF-29 | `widgets/tab-bar/model/tabs.ts` | o título sem o nome da aba | morto, 2 casos, asserção, SHA ok |
| M18 | MAF-29 | `app/layout/MobileLayout.tsx` | o foco não vai ao título | morto, 2 casos, asserção, SHA ok |
| M19 | MAF-30 | `app/OfflineScreen.tsx` | a região vira `status`/`polite` | morto, 3 casos, asserção, SHA ok |

**19 mutantes, 19 mortos por asserção, 0 por compilação, 0 sobreviventes, 0 inválidos.**

**Gate da fase** (2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--`):
mobile-adm **204/22** (entrada 140/18), store **5743/313** (idêntico), backoffice **3651/207** (entrada 3648/207),
core 3507/138 (idêntico). `tsc` 0 nos três apps. Lint: mobile-adm 0/0, backoffice 23/5 (baseline). Build do app
verde, com o ícone e a splash estática no `dist/index.html` (o lockup idêntico ao asset dentro de `#root`).
`apps/mobile-adm/tsconfig.node.json` continua com os 2 erros TS6307 que já tinha (tokens e preset fora da lista do
projeto composto); não está no gate e a Fase 6 não os mudou de natureza.

### Fase 6 — conserto r1

Conserto da rodada 1 da verificação independente da Fase 6 (`validation.md`, "Fase 6 — verificação
independente"), dentro das precisões que a `spec.md` registrou antes de "Edge Cases". Sem commit.

**O que mudou no código (não só no teste)**:

- `packages/auth/src/AuthContext.tsx` — a **geração da resolução** (`geracao`): toda resolução que começa
  (a leitura da sessão, o papel de uma identidade nova, a saída) ganha um número, e toda conclusão
  (sucesso, falha, teto) só grava se ainda for a vigente. Fecha P1 (a resposta do papel depois de a
  sessão cair promovia a admin quem saiu — existia antes da `72`, e o painel também a tinha) e P3 (o teto
  de um "Tentar de novo" apagava um `admin` conferido). A leitura da sessão é descartada quando uma
  **identidade** nova começou depois de ela sair (`identidade`), e um retry não a torna velha.
- No mesmo arquivo, **dois defeitos que o sensor do conserto achou** no código de antes: a leitura da
  sessão que respondia `{ error }` virava "sem sessão" (`not-admin`, e o Login para quem tem a sessão
  salva), e a que **lançava na hora** derrubava o efeito sem gravar estado nenhum. As duas agora são
  `unknown` (`MAF-22`, as três formas).
- `apps/mobile-adm/src/pages/LoginPage.tsx` — senha só com espaços conta como vazia (`MAF-26`).

**Arnês**: `apps/mobile-adm/src/test/fakeSupabase.ts` aprendeu a falhar nas três formas
(`falhaDoPapel`/`falhaDaSessao`/`falhaDoCadastro`), a pendurar o cadastro e a sessão e a renovar o token;
`montarApp` aceita `{ estado }` na própria entrada. Testes novos: `corridasDoPapel.test.tsx` (app, 7) e
`apps/backoffice/src/app/__tests__/papelDaSessaoQueCaiu.test.tsx` (painel, 2, `AuthProvider` +
`AdminLoginPage` + `RequireAdmin` reais); casos novos em `papelEmTresEstados`, `RecoveryFlow` e `LoginPage`.

**Mutantes reinjetados nos arquivos reais** (arnês `mut.py` do verificador; troca casada exatamente uma
vez, SHA-256 conferido na restauração, workspace inteiro):

| # | Mutação | Resultado |
| --- | --- | --- |
| V01 | `checkAdmin`: exceção ⇒ `not-admin` | morto, 4 (mobile-adm), asserção, SHA ok |
| V03 | `getSession` rejeitado ⇒ `not-admin` | morto, 2, asserção, SHA ok |
| V03b | `getSession` com `{ error }` tratado como sem sessão | morto, 2, asserção, SHA ok |
| V03c | `getSession` que lança ⇒ `not-admin` | morto, 2, asserção, SHA ok |
| V06 | `unknown` guardado como resolvido | morto, 1, asserção, SHA ok |
| V12 | passo da senha sem exigir `conferido` | morto, 1, asserção, SHA ok |
| V16 | "Esqueci minha senha" com `replace` | morto, 2, asserção, SHA ok |
| V17 | e-mail só de espaços vai à rede | **sobrevive — equivalente**: o campo é `type="email"`, e a sanitização de valor do HTML (jsdom e navegador) apaga os espaços antes do `onChange`; medido: `value = '   '` lê `''`. Não há caminho pela tela |
| V17b | senha só de espaços vai à rede | morto, 1, asserção, SHA ok |
| V26 | o cadastro sem teto | morto, 2, asserção, SHA ok |
| P1a | a resposta do papel sem conferir a geração | morto, 2 (mobile-adm) + 1 (backoffice), asserção, SHA ok |
| P1b | a saída sem mudar a geração | morto, 2 + 1, asserção, SHA ok |
| P3 | o teto da leitura sem conferir a geração | morto, 2, asserção, SHA ok |
| P3b | a leitura velha da sessão aceita depois de outra identidade | morto, 1, asserção, SHA ok |
| M0 | o `AuthContext.tsx` inteiro de antes do conserto | morto, 9 (mobile-adm) + 1 (backoffice), asserção, SHA ok |

**14 mutantes + o arquivo de antes: 14 mortos por asserção, 0 por compilação, 1 equivalente declarado (V17).**

### Fase 6 — conserto r2

Conserto da rodada 2 da verificação independente da Fase 6 (`validation.md`, "Fase 6 — verificação r2"):
as lacunas 1 a 3 e o achado 4. Sem commit. Lição de fundo: `L-055` — o dublê provava uma ordem de
eventos que o supabase-js não produz, e por isso os consertos 1 e 2 se provam **contra o client real**.

**O que mudou no código** (`packages/auth/src/AuthContext.tsx`, aditivo para a loja e o painel):

1. **`INITIAL_SESSION` sem sessão é ignorado** pelo ouvinte. O client o emite com `null` também quando a
   leitura da sessão FALHA, e o evento não distingue isso da sessão ausente; quem decide é `lerSessao`
   (`{ error }` ⇒ `unknown`, sessão ausente ⇒ "sem sessão"). O `INITIAL_SESSION` **com** sessão segue a
   régua da leitura: é descartado se uma identidade nova começou depois da inscrição.
2. **`loading` só muda na primeira resolução e na troca de identidade.** `resolvedFor` deu lugar a três
   refs: `presente` (quem está na tela), `papelDe` (papel conferido) e `cadastroDe` (cadastro lido). O
   evento do mesmo usuário já presente só **repergunta o que falta**, sem `setLoading`; o papel
   conferido não é reperguntado. O "Tentar de novo" põe `loading` e a repergunta o devolve a `false`.
3. **`emVoo`** sem mudança de código, agora com régua.
4. **O cadastro `null`** (falhou, estourou o teto) não é guardado como lido: o próximo evento do mesmo
   usuário o pede de novo, pela regra do item 2.

**Arnês**: `apps/mobile-adm/src/test/clientReal.ts` (e a cópia deliberada `apps/store/src/test/clientReal.ts`)
— `createClient` do supabase-js 2.110.7 com `fetch` e `storage` nossos, relógio falso, um client novo por
teste via `Proxy`, e o cenário mutável no meio do teste. O `fakeSupabase.ts` passou a emitir
`INITIAL_SESSION` com o resultado da última `getSession` (o nulo na falha; nada na leitura pendurada) e
ganhou `voltarAba()` (o `SIGNED_IN` do mesmo usuário).

**Testes novos**: `apps/mobile-adm/src/app/__tests__/contratoComClientReal.test.tsx` (10, client real),
2 casos em `corridasDoPapel.test.tsx` (dublê com paridade) e
`apps/store/src/pages/__tests__/contaSobreviveAVoltaDaAba.test.tsx` (2: a `AccountPage` real sob o
`AuthProvider` real e o client real, com a edição em curso preservada através da volta da aba — o
mesmo nó do campo e o texto digitado —, e a vizinha do `SIGNED_OUT`).

Achado de arnês: dentro de **um** `act` o React só renderiza no fim, então "`loading` não pisca" medido
com um `andar(600)` era verdadeiro nos dois mundos (o mutante R2 sobreviveu assim na primeira escrita).
A régua anda o relógio em passos de 50 ms (`andarVigiando`) e a resposta da repergunta demora 500 ms.

**Mutantes reinjetados nos arquivos reais** (troca casada exatamente uma vez, SHA-256 conferido na
restauração):

| # | Mutação | Resultado |
| --- | --- | --- |
| R1 | o `INITIAL_SESSION` nulo volta a ser obedecido | morto, 1 (contrato) e 7 na suíte do app, asserção, SHA ok |
| R2 | a repergunta do mesmo usuário põe `loading` | morto, 3 (contrato) + 1 (loja: "Carregando..." na tela), asserção, SHA ok |
| R3 | sem o dedupe `emVoo` (N04) | morto, 2: a consulta em dobro na abertura **e** o teto do login reaberto por um `SIGNED_IN` no meio, asserção, SHA ok |
| R4 | o cadastro `null` guardado como lido | morto, 1, asserção, SHA ok |
| R5 | a repergunta pede também o papel já conferido | morto, 1, asserção, SHA ok |
| R6 | a repergunta não devolve o `loading` do "Tentar de novo" | morto, 7, asserção, SHA ok |
| M-r1 | o `AuthContext.tsx` inteiro do conserto r1 | morto: 4 no contrato (lacunas 1, 2 e 4) + 1 na loja ("Carregando..."), SHA ok |
| M-b64 | o `AuthContext.tsx` de `b6449bd2` | na loja a página **continua montada** (a regressão não existia), e reprova só a asserção de que a repergunta acontece — comportamento novo da `72`. SHA ok |

**6 mutantes + 2 arquivos inteiros: 6 mortos por asserção, 0 por compilação, 0 sobreviventes.**

**Gate** (um workspace por vez, `--testTimeout=20000` sem `--`, exit code fora de pipe): mobile-adm
**249/24** exit 0 · store **5745/314** exit 0 · backoffice **3653/208** exit 0 · core **3507/138** exit 0.
`tsc --noEmit` 0 nos `tsconfig.app.json` dos três apps e no `tsconfig.node.json` do app. Lint por
`npx eslint .`: app 0/0 · painel 23/5 · loja 2/2.

### Fase 6 — fecho das lacunas da r3

Fecho da rodada 3 da verificação independente (`validation.md`, "Fase 6 — verificação r3"), por
decisão do usuário: **as lacunas 1 a 5 fechadas, a 6 registrada como dívida (`BL-049`)**. Só testes e
guarda; **nenhuma linha de código de produção mudou** (`packages/auth/src/AuthContext.tsx` com o
mesmo SHA-256 antes e depois, `e1e2dbe2…`). Sem commit.

1. **X06/X07, a reentrada** — `apps/mobile-adm/src/app/__tests__/reentradaComClientReal.test.tsx`
   (novo, client real): sair com a checagem do papel em voo e entrar de novo com a mesma conta chega a
   `admin` (provider) e à Início sem o formulário de login (`<App />`); "Tentar de novo" com a
   repergunta da volta da aba em voo sai do `loading` e chega a `admin` (provider) e à Início sem a
   splash (`<App />`). A volta da aba exige os dois `SIGNED_IN`.
2. **X05** — no mesmo arquivo: sair e entrar com a mesma conta produz, depois da entrada, exatamente
   `['not-admin|true|ninguém', 'admin|false|…']` (a splash primeiro), com a vizinha de que a volta da
   aba sem sair não produz transição nenhuma.
3. **X04** — vizinha de R5 em `contratoComClientReal.test.tsx` (grupo 4): o `not-admin` conferido não
   é reperguntado em duas voltas da aba com a rede do papel caída (`user_roles` fica em 1, o estado não
   muda, os dois `SIGNED_IN` contados).
4. **Guarda da cópia do arnês** — `apps/mobile-adm/src/test/__tests__/clientRealPareado.test.ts`
   (novo): lê os dois `clientReal.ts` do disco, tira o primeiro comentário de bloco e exige o código
   idêntico; âncora (os dois lidos, são o arnês, o corte não apaga demais, e cada cabeçalho cita o
   guarda), dois sensores (uma linha do `fetchFalso` e o `bubbles` do `voltarAba`) e o inverso (só o
   cabeçalho diferente passa, com CRLF também). Os dois cabeçalhos citam o guarda.
5. **Checkout** — `apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx` (novo): o
   `CheckoutPage` real sob o `AuthProvider` e o client reais; com o papel `falha` e com `admin`, a
   volta da aba (500 ms de resposta, vigiada em passos de 50 ms) não mostra "Carregando..." e a região
   "Contato" é o mesmo nó; vizinha: uma identidade nova (entrar no meio do checkout) mostra
   "Carregando..." na mesma vigia — a régua enxerga o que proíbe. O mock de `useShippingSettings` não
   carrega `origin_zip` (o guarda `originZipNotRead` do painel acusou a primeira escrita).
6. **`BL-049`** — o arnês com `autoRefreshToken: false` e o `fetchFalso` que não confere o
   `Authorization` (X09); o custo de cobrir está na entrada.

**Mutantes reinjetados nos arquivos reais** (`mut.py` do verificador: troca casada exatamente uma vez,
SHA-256 antes e depois):

| # | Mutação | Contra | Resultado |
| --- | --- | --- | --- |
| X04 | só `admin` fica guardado; `not-admin` é reperguntado | contrato + reentrada | **morto**, 1, asserção, SHA ok |
| X05 | o logout não zera `presente` | idem | **morto**, 1, asserção, SHA ok |
| X06 | o logout não zera `emVoo` | idem | **morto**, 2 (provider e `<App />`), asserção, SHA ok |
| X07 | o "Tentar de novo" não zera `emVoo` | idem | **morto**, 2 (provider e `<App />`), asserção, SHA ok |
| R2 | a repergunta do mesmo usuário põe `loading` (o defeito da r2) | checkout | **morto**, 1 (o caso `falha`), asserção, SHA ok. O caso `admin` não o mata, e é esperado: com o papel conferido a volta da aba sai pelo caminho "já resolvido", que não passa pela repergunta |
| A01 | a cópia da loja com o `/auth/v1/logout` respondendo 200 | guarda do arnês | **morto**, 2, asserção, SHA ok |
| A02 | a cópia do app com `autoRefreshToken: true` | guarda do arnês | **morto**, 2, asserção, SHA ok |

**7 injetados: 7 mortos, todos por asserção, 0 por compilação, 0 sobreviventes.**

**Gate** (um workspace por vez, `--testTimeout=20000` sem `--`, exit code fora de pipe): mobile-adm
**261/26** exit 0 · store **5748/315** exit 0 · backoffice **3653/208** exit 0 · core **3507/138**
exit 0. `tsc --noEmit` 0 nos `tsconfig.app.json` dos três apps e no `tsconfig.node.json` do app. Lint
por `npx eslint .`: app 0/0 · loja 2/2 · painel 23/5.

### Fase 6 — conserto do reteste de QA (orquestrador, 2026-10-22; autor = verificador, declarado)

Origem: `docs/qa/reports/2026-10-22-mobile-adm-fundacao-reteste.md` (um bug e dois paper cuts). Decisão
do usuário: resolver tudo antes de avançar, pela recomendação.

| # | O quê | Mudança | Mutante reinjetado | Resultado |
| --- | --- | --- | --- | --- |
| Q1 | o voltar depois de salvar reabria a recuperação | `profundidade` no `history.state` de cada passo; gravar volta `-profundidade` | gravar volta só a própria entrada | morto (asserção) |
| Q1b | idem | "Trocar o e-mail" conta a entrada que empilha | sem contar | morto (asserção) |
| Q1c | idem | "Esqueci minha senha" começa a conta em 1 | sem a conta | morto (asserção) |
| Q2 | "Tentar de novo" trocava a tela pela splash por até 8 s | `features/access-check/model/tentativa.ts` (marca fora do React) + `CarregandoAcesso` como `fallback` do guarda | o fallback só splash | morto (asserção) |
| Q2b | idem | idem | a tentativa sem marcar | morto (asserção) |
| Q3 | o título seguia o da aba com a tela Sem conexão na frente | `TITULO_SEM_CONEXAO` ao montar | sem trocar | morto (asserção) |
| Q3b | idem | a restauração ao desmontar SAIU: era código morto (o app remonta e cada tela escreve o seu título) | sem restaurar | sobreviveu ⇒ código removido |

O teste antigo "o fallback do guarda no 'Tentar de novo' pendurado também sai em 8 s" exigia a splash na
nova tentativa (o paper cut). Ele virou a régua nova (a mesma tela com "Conferindo…" até 7.999 ms,
o botão de volta aos 8.000), com a vizinha de que a ABERTURA continua com a splash. O guarda
`rotasSobGuarda.test.ts` passou a exigir `fallback={<CarregandoAcesso />}`.

Gates: mobile-adm **267/26**, store **5748/315**, backoffice **3653/208** (exit 0, um por vez); tsc 0 nos
três `tsconfig.app.json` e no `tsconfig.node.json` do app; lint do app 0.

