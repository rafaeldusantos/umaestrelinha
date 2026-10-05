# 60 · A marca no cabeçalho dos e-mails — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto sobrepõe a da skill** (`CLAUDE.md`, `BL-012`): **nenhum** commit por
> task. Os commits completos da implementação saem de uma vez, ao fim da feature.

---

**Design**: [`design.md`](design.md)
**Status**: Done — 8 de 8 (2026-10-05), Verifier PASS (23 mutantes, 23 mortos)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `CLAUDE.md` (raiz: guardas que leem o disco com **âncora de contagem** e **sensor por mutação**;
> "descreva a forma proibida, não a escreva"; baselines), `supabase/CLAUDE.md` (`AD-004`: lógica
> testável fora do `index.ts`), `supabase/vitest.config.ts`, `apps/store/vitest.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Render puro (`render/layout.ts`, `render/email.ts`) | unit | 1:1 com `LOGO-01`…`LOGO-08`, nos **17** eventos; os dois ramos de `brandHeader` (com e sem origem) e a barra final | `supabase/functions/send-notification/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Handlers / dispatch (`handlers.ts`, `dispatch.ts`) | unit (dublês injetados) | `LOGO-09` na prévia; o envio passa a origem ao render | idem | idem |
| Templates de auth (`supabase/templates/*.html`) | guarda de disco | `LOGO-20`…`LOGO-22`; comparação de tag contra `brandHeader` **importado**; régua fora do comentário do topo; sensor | functions `__tests__` (comparação) + store `shared/lib/__tests__/authEmailTemplates.test.ts` (forma) | functions + `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Asset (`apps/store/public/email/*.png`) | guarda de disco | `LOGO-10`…`LOGO-14`; âncora (arquivo lido **e** `EMAIL_BRAND` achado em `layout.ts`); sensor de cada régua de pixel com um PNG sintético | `apps/store/src/shared/lib/__tests__/emailBrandImage.test.ts` | store |
| Config (`apps/store/vercel.json`) | guarda de disco | `LOGO-15` (forma); a entrega real é prova manual pós-deploy | `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts` | store |
| Script de raster (`.specs/brand/**/*.ps1`) | none | — (o produto dele é medido pelo guarda do asset) | — | — |

## Gate Check Commands

> Generated from codebase — confirm before Execute. Sempre com exit code capturado **fora de pipe**,
> um workspace por vez.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só em `supabase/` | `pnpm --filter @estrelinha/functions test` |
| Full | Tasks que tocam `apps/store` ou `supabase/templates` | `pnpm --filter @estrelinha/functions test` **e** `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Build | Fecho da feature | os 5 workspaces (baseline: store 4215/251 · backoffice 3024/166 · core 2546/102 · functions 677/14 (medido na entrada da `60`) · catalog-import 512/23) + `pnpm lint` (26/6) + `npx tsc --noEmit -p apps/store/tsconfig.app.json` (0) + `pnpm build` + `git diff --name-only -- packages/core/src/payment` (vazio) |

---

## Execution Plan

### Phase 1: O dono da tag e o arquivo

```
T01 → T02 → T03
```

### Phase 2: Os e-mails de pedido

```
T04 → T05
```

### Phase 3: Os e-mails de acesso

```
T06
```

### Phase 4: Fecho

```
T07 → T08
```

---

## Task Breakdown

### T01: `EMAIL_BRAND` e `brandHeader`

**What**: Constante `EMAIL_BRAND` e função pura `brandHeader(storeUrl)` em `layout.ts`, conforme o design (sem ainda ligar ao `emailShell`).
**Where**: `supabase/functions/send-notification/render/layout.ts`; testes em `supabase/functions/send-notification/__tests__/brandHeader.test.ts` (novo)
**Depends on**: None
**Reuses**: `storeLink`, `escapeHtml`, `ESTRELINHA`, `WORDMARK_FONT`
**Requirement**: LOGO-01, LOGO-02, LOGO-03, LOGO-04, LOGO-05, LOGO-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Com origem: um `<img>` só, `src` exato, `width="202"`, `height="44"`, `alt="Uma Estrelinha"`, e o `style` contendo **cada** declaração de `LOGO-01`/`LOGO-02` (uma asserção por declaração — `L-010`)
- [ ] `https://x.com` e `https://x.com/` ⇒ `src` idêntico
- [ ] `''`, `'   '`, `null`, `undefined` ⇒ exatamente o `<span>` de hoje (string inteira, `L-009`) e nenhum `<img`
- [ ] `src` sem `?` nem `#` para uma origem sem eles; origem com `"` sai escapada
- [ ] Nenhum `<svg` em nenhuma saída
- [ ] Quick gate verde; contagem functions = 674 + novos (sem queda)

**Tests**: unit · **Gate**: quick

---

### T02: O PNG da marca e o guarda do arquivo

**What**: Script `_raster-email.ps1`, o `assinatura-v1@3x.png` gerado por ele, e o guarda `emailBrandImage.test.ts`.
**Where**: `.specs/brand/uma-estrelinha/_raster-email.ps1` (novo), `apps/store/public/email/assinatura-v1@3x.png` (novo), `apps/store/src/shared/lib/__tests__/emailBrandImage.test.ts` (novo); uma linha em `.specs/brand/uma-estrelinha/README.md`
**Depends on**: T01 (o guarda lê `EMAIL_BRAND` de `layout.ts`)
**Reuses**: `_raster-icons.ps1` (toolchain WPF), `SIGNATURE_FLOOR`/`SIGNATURE` de `@/shared/ui/brand`, leitura de `layout.ts` como texto (`authEmailTemplates.test.ts`)
**Requirement**: LOGO-10, LOGO-11, LOGO-12, LOGO-13, LOGO-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] O script recusa sobrescrever um `v1` existente
- [ ] Guarda: assinatura PNG; 606 × 132 = **3 ×** `width`/`height` extraídos de `layout.ts` (extração que falha **lança**)
- [ ] Guarda: todos os pixels com alfa 255; quatro cantos #283A4A; ≥ 1 pixel a ±8 de #F7F3EC
- [ ] Guarda: ≤ 40 KB; `EMAIL_BRAND.width` ≥ `SIGNATURE_FLOOR` importado; SHA-256 fixado
- [ ] Decodificador **lança** para tipo de cor / profundidade não suportados
- [ ] Sensores: PNG sintético com canto transparente reprova; PNG sintético todo #283A4A (a arte positiva) reprova na régua do traço; dimensão 2× reprova
- [ ] Full gate verde

**Tests**: guarda de disco (unit) · **Gate**: full

---

### T03: Cache do `/email/*` na Vercel

**What**: Bloco de header `immutable` para `/email/(.*)` no `vercel.json`, com asserção no guarda existente.
**Where**: `apps/store/vercel.json`, `apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts`
**Depends on**: T02
**Reuses**: blocos de `/assets/(.*)` e `/fonts/(.*)`
**Requirement**: LOGO-15 (forma)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Asserção: `/email/(.*)` com `Cache-Control: public, max-age=31536000, immutable`, valor exato
- [ ] Asserção: nenhum `rewrite` tem `source` que comece por `/email` (o catch-all continua o único genérico, e as asserções de ordem existentes seguem verdes sem edição)
- [ ] Full gate verde

**Tests**: guarda de disco · **Gate**: full

---

### T04: O `emailShell` com a marca

**What**: `emailShell` e `renderEmail` recebem a origem e usam `brandHeader`; `render.test.ts` atualizado.
**Where**: `render/layout.ts`, `render/email.ts`, `__tests__/render.test.ts`
**Depends on**: T01
**Reuses**: `comPrefixo` (molde de `comCabecalho`)
**Requirement**: LOGO-01, LOGO-03, LOGO-05, LOGO-07, LOGO-08, LOGO-22

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Os **17** eventos (`it.each` sobre o catálogo, não lista escrita à mão) saem com o `<img>`, sem `UMA ESTRELINHA` no cabeçalho, sem `<svg`, com o fio dourado logo depois do `<img>`
- [ ] Os 17 com origem vazia saem com o `<span>` de hoje
- [ ] As asserções de `:192` e `:414` **invertidas**, não apagadas
- [ ] `comCabecalho`: a fixture recebe a troca da linha do `<span>` por `brandHeader(STORE)`; âncora de 1 ocorrência; sensor que acusa fixture sem a linha; os 4 HTML legados batem; assunto e texto inalterados
- [ ] Versão texto dos 17 sem `<img`, sem `email/assinatura`
- [ ] Quick gate verde; nenhuma asserção afrouxada

**Tests**: unit · **Gate**: quick

---

### T05: A origem chega ao render no envio e na prévia

**What**: `dispatch.ts` e `handlers.ts` passam `storePublicUrl` a `renderEmail`; testes deles.
**Where**: `supabase/functions/send-notification/dispatch.ts`, `handlers.ts`, `__tests__/dispatch.test.ts`, `__tests__/handlers.test.ts`
**Depends on**: T04
**Reuses**: dublês existentes de `deps.env`
**Requirement**: LOGO-09 (e o envio real de LOGO-01)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Prévia (`?action=preview`): o HTML devolvido contém o `src` com a origem do dublê de env
- [ ] Envio: o HTML entregue ao provedor (dublê do Resend) contém o mesmo `src`
- [ ] Os dois com origem **diferente** da usada em `render.test.ts` (senão a asserção é verdadeira por acidente — `L-013`)
- [ ] `wiringResolve.test.ts` verde sem edição
- [ ] Quick gate verde

**Tests**: unit · **Gate**: quick

---

### T06: A marca nos três templates de auth

**What**: A linha do wordmark dos três templates vira a tag de `brandHeader('{{ .SiteURL }}')`; os dois guardas.
**Where**: `supabase/templates/{magic_link,confirmation,recovery}.html`; `supabase/functions/send-notification/__tests__/brandHeader.test.ts` (comparação); `apps/store/src/shared/lib/__tests__/authEmailTemplates.test.ts` (forma)
**Depends on**: T01
**Reuses**: recorte "fora do comentário do topo" já existente em `authEmailTemplates.test.ts`
**Requirement**: LOGO-20, LOGO-21, LOGO-22

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Functions: cada template contém **exatamente uma** vez a string `brandHeader('{{ .SiteURL }}')` (importada, `L-015`); âncora: os 3 arquivos lidos
- [ ] Store: fora do comentário do topo, nenhum `<svg`, nenhum `UMA ESTRELINHA`; o fio #B8945F logo depois do `<img`; as asserções antigas (`{{ .Token }}`, sem `{{ .ConfirmationURL }}`, casco idêntico, paleta, preheader) verdes **sem edição**
- [ ] O comentário do topo de cada template ganha a linha "a tag da marca tem dono em `layout.ts`", sem escrever forma proibida por extenso
- [ ] Sensores: template com o `<span>` antigo reprova; template com `src` de URL fixa reprova a comparação
- [ ] Full gate verde

**Tests**: guarda de disco · **Gate**: full

---

### T07: Prova local no Mailpit

**What**: Disparar um transacional (prévia/envio local) e um código de acesso; abrir no Mailpit em 390 e 1440.
**Where**: — (registro em `validation.md`)
**Depends on**: T03, T05, T06
**Requirement**: LOGO-30

**Tools**: MCP: `Claude_Browser` · Skill: `anthropic-skills:built-in-browser`

**Done when**:

- [ ] Marca nítida e centrada nos dois e-mails, nos dois viewports, sem rolagem horizontal
- [ ] Com o arquivo inacessível (origem trocada), o `alt` estilizado aparece claro sobre escuro
- [ ] Se o Docker não subir: registrado como não feito, sem substituto fingido

**Tests**: none (prova manual) · **Gate**: —

---

### T08: Fecho — baselines, documentação e o que fica para depois do deploy

**What**: Build gate dos 5 workspaces; `CLAUDE.md` (raiz: baselines, linha da `60` na lista de features fechadas, guardas novos na tabela), `supabase/CLAUDE.md` (o cabeçalho de marca), handoff no `STATE.md`; checklist pós-deploy no `validation.md`.
**Where**: `CLAUDE.md`, `supabase/CLAUDE.md`, `.specs/STATE.md`, `.specs/features/60-logo-nos-emails/validation.md`
**Depends on**: T07
**Requirement**: LOGO-15 (entrega), LOGO-23, LOGO-31 (registrados como pendências de operação)

**Done when**:

- [ ] Build gate verde contra a baseline; `payment/**` intocado
- [ ] Checklist pós-deploy escrito: (1) `curl` → `image/png`; (2) `site_url` conferido sem barra final; (3) colar os 3 templates sem o comentário do topo; (4) Gmail web/app claro/escuro + Outlook + imagem bloqueada
- [ ] Commits completos da feature, de uma vez

**Tests**: none · **Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T01 ──→ T02 ──→ T03
Phase 2:  T04 ──→ T05
Phase 3:  T06
Phase 4:  T07 ──→ T08
```

8 tasks ⇒ um lote só ⇒ execução inline, sem sub-agentes. O Verifier independente roda ao fim.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T01 | 1 função + 1 constante, 1 arquivo | ✅ |
| T02 | script + seu produto + guarda do produto | ⚠️ coeso: o guarda não existe sem o arquivo, e o arquivo não existe sem o script |
| T03 | 1 bloco de config + asserção | ✅ |
| T04 | shell + assinatura do render | ⚠️ coeso: a mesma mudança em dois níveis da mesma cadeia |
| T05 | 2 chamadores da mesma função | ⚠️ coeso |
| T06 | 3 templates idênticos + guardas | ⚠️ coeso: a mesma linha nos três |
| T07 | prova | ✅ |
| T08 | fecho | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T01 | None | início da Phase 1 | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T02 | T02 → T03 | ✅ |
| T04 | T01 | Phase 1 antes da 2 | ✅ |
| T05 | T04 | T04 → T05 | ✅ |
| T06 | T01 | Phase 1 antes da 3 | ✅ |
| T07 | T03, T05, T06 | Phases 1–3 antes da 4 | ✅ |
| T08 | T07 | T07 → T08 | ✅ |

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T01 | render puro | unit | unit | ✅ |
| T02 | asset (+ script) | guarda de disco | guarda de disco | ✅ |
| T03 | config | guarda de disco | guarda de disco | ✅ |
| T04 | render puro | unit | unit | ✅ |
| T05 | handlers/dispatch | unit | unit | ✅ |
| T06 | templates de auth | guarda de disco | guarda de disco | ✅ |
| T07 | — | none | none | ✅ |
| T08 | docs | none | none | ✅ |

## Requirement coverage

LOGO-01 T01/T04/T05 · 02 T01 · 03 T01/T04 · 04 T01 · 05 T01/T04 · 06 T01 · 07 T04 · 08 T04 · 09 T05 ·
10–14 T02 · 15 T03 (+ pós-deploy) · 20–22 T06 · 23 T08 (pós-deploy) · 30 T07 · 31 T08 (pós-deploy).
**21 de 21 mapeados.**

---

## Registro da execução (2026-10-05)

- **Baseline de entrada medida com a árvore parada** (antes da primeira edição): functions
  **677/14** e store **4287/257** — as duas acima da tabela do `CLAUDE.md` (674/14 e 4215/251),
  pelos commits de parcelas do cartão que vieram depois dela. Os deltas desta feature são contra
  os números medidos.
- **Correção de contagem na spec**: o catálogo tem **17** eventos transacionais (a `57`
  acrescentou dois), não 15. Spec e tasks corrigidas; as réguas iteram `NOTIFICATION_EVENTS`.
- **T04 — uma asserção antiga foi REESCRITA, não afrouxada**: `TPL-03` recusava qualquer `<img`
  no HTML como prova de que o nome de produto `<img onerror>` não virou tag. Com a marca, o
  envelope passa a ter uma `<img>` legítima. A régua nova tira a marca (literal da spec) e exige
  zero `<img>` no resto, mais a marca exatamente uma vez — mesma força, sem o falso positivo.
- **T06 — a nota do comentário entrou só em `magic_link.html`**: `confirmation.html` e
  `recovery.html` já remetem ao comentário dele ("Paleta e restrições de e-mail: ver o comentário
  de magic_link.html"), e repetir a nota nos três seria o mesmo texto com três donos.
