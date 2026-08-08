# Store Login UX Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/04-store-login-ux/design.md`
**Spec**: `.specs/features/04-store-login-ux/spec.md`
**Status**: Done — all 18 tasks implemented, gate exit-0 (101 tests), Verifier PASS (`validation.md`)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (stack/commands; `pnpm test` = vitest; lint tem erros pré-existentes → informativo, não-gate), existing tests `apps/store/src/pages/__tests__/*.test.tsx` (Vitest + React Testing Library, mocks de `@nanapin/auth` e `@nanapin/supabase/client`). Sem config de threshold de cobertura → aplica-se o forte default (toda AC + edge case).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Auth methods (`@nanapin/auth`, consumido como source no store) | unit | Branches success/error; `verifyOtp` → `isNewUser` true/false | `apps/store/src/features/auth/**/__tests__/*.test.tsx` (mock `@nanapin/supabase/client`) | `pnpm --filter @nanapin/store test` |
| UI state store (`authUiStore`, Zustand) | unit | Todas as ações + resolução de `returnTo` | `apps/store/src/features/auth/model/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Flow hook (`useAuthFlow`) | unit | 1:1 às ACs: transições entry→code→name/done, código inválido, cooldown, password, reset | `apps/store/src/features/auth/model/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Step/overlay components (RTL) | unit (component) | Render + interações: happy + edge (código inválido, cooldown, nome vazio, senha inválida, toggle) | `apps/store/src/features/auth/ui/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Integrations (Header, Checkout, Account, /entrar) | unit (component) | Gated deslogado → abre overlay; `returnTo`; carrinho preservado | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Supabase Auth config / dependências | none | Build gate apenas (config de painel + `.env.example`; instalação de dep) | — | build gate |

## Gate Check Commands

> Generated from codebase — confirm before Execute. `lint` tem falhas pré-existentes (CLAUDE.md) → informativo, não bloqueia.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks com testes unit/component | `pnpm --filter @nanapin/store test` |
| Full | Igual ao Quick (repo não tem suíte e2e separada) | `pnpm --filter @nanapin/store test` |
| Build | Após fase / tasks de config/dep | `pnpm --filter @nanapin/store build` |

---

## Execution Plan

### Phase 1: Foundation — auth methods, deps & config

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: UI foundation — store, overlay shell & flow

```
T7 → T8 → T9
```

### Phase 3: Step components

```
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Integrations & routing

```
T15 → T16 → T17 → T18
```

---

## Task Breakdown

### T1: Verificar/instalar dependência `input-otp` e confirmar primitivos de UI

**What**: Garantir que o pacote `input-otp` (base do `@nanapin/ui/input-otp`) está instalado no workspace e que `Dialog`/`Drawer`/`Sheet`/`InputOTP` importam sem erro.
**Where**: `package.json`/`pnpm-workspace.yaml` (raiz), `packages/ui/src/input-otp.tsx` (verificação)
**Depends on**: None
**Reuses**: `@nanapin/ui/{dialog,drawer,sheet,input-otp}`
**Requirement**: AUTH-11, AUTH-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `input-otp` presente em `node_modules` e declarado onde `@nanapin/ui` o requer
- [ ] Build gate passa: `pnpm --filter @nanapin/store build`

**Tests**: none · **Gate**: build

---

### T2: `signInWithOtp(email)` no AuthContext

**What**: Adicionar método que chama `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` e retorna `{ error }`; normaliza e-mail (trim/lowercase).
**Where**: `packages/auth/src/AuthContext.tsx` (+ tipo em `AuthContextType`)
**Depends on**: None
**Reuses**: padrão `{ error }` de `signIn`/`signUp`; `@nanapin/supabase/client`
**Requirement**: AUTH-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Método exposto no contexto e tipado
- [ ] Testes: sucesso (sem erro) e erro (mensagem) — mock supabase; e-mail normalizado
- [ ] Quick gate passa: `pnpm --filter @nanapin/store test`
- [ ] Test count: ~3 testes passam (sem deleções silenciosas)

**Tests**: unit · **Gate**: quick

---

### T3: `verifyOtp(email, token) → { error, isNewUser }`

**What**: Verificar código (`verifyOtp({ email, token, type: 'email' })`); ao sucesso, consultar `customers.name` para derivar `isNewUser` (name vazio ⇒ true).
**Where**: `packages/auth/src/AuthContext.tsx`
**Depends on**: T2
**Reuses**: `fetchCustomer` (padrão de consulta a `customers`)
**Requirement**: AUTH-03, AUTH-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Retorna `{ error }` em código inválido/expirado (sem lançar)
- [ ] Testes: código válido + name vazio ⇒ `isNewUser=true`; name preenchido ⇒ `false`; código inválido ⇒ erro
- [ ] Quick gate passa
- [ ] Test count: ~3 testes passam

**Tests**: unit · **Gate**: quick

---

### T4: `updateDisplayName(name)`

**What**: Persistir nome no 1º acesso: `update customers.name` (RLS do próprio usuário) + `auth.updateUser({ data: { full_name } })`; rejeitar nome só-espaços.
**Where**: `packages/auth/src/AuthContext.tsx`
**Depends on**: T3
**Reuses**: `@nanapin/supabase/client`; `customer` no contexto
**Requirement**: AUTH-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Nome vazio/só-espaços ⇒ erro de validação sem chamar backend
- [ ] Testes: nome válido persiste (customers + metadata); nome vazio rejeitado; falha de update retorna erro sem derrubar sessão
- [ ] Quick gate passa
- [ ] Test count: ~3 testes passam

**Tests**: unit · **Gate**: quick

---

### T5: `resetPassword(email)`

**What**: Adicionar `resetPasswordForEmail(email, { redirectTo })` retornando `{ error }`; validação de e-mail client-side.
**Where**: `packages/auth/src/AuthContext.tsx`
**Depends on**: T2
**Reuses**: padrão `{ error }`
**Requirement**: AUTH-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] E-mail inválido ⇒ erro sem chamada
- [ ] Testes: e-mail válido chama backend; inválido bloqueia
- [ ] Quick gate passa
- [ ] Test count: ~2 testes passam

**Tests**: unit · **Gate**: quick

---

### T6: Documentar configuração do Supabase Auth (OTP por código)

**What**: Documentar no `.env.example` (raiz) os passos de config: template de e-mail usando `{{ .Token }}`, expiração do OTP, rate limit/cooldown ~60s, redirect URLs (OAuth/reset).
**Where**: `.env.example` (raiz) + nota em `design.md`
**Depends on**: None
**Reuses**: seção "Supabase Auth — Configuração" do design
**Requirement**: AUTH-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `.env.example` lista os 5 itens de config (template, expiração, rate limit, redirect, provider Google)
- [ ] Build gate passa: `pnpm --filter @nanapin/store build`

**Tests**: none · **Gate**: build

---

### T7: `authUiStore` (Zustand)

**What**: Store global de UI de auth: `{ isOpen, step, email, returnTo, open(opts), close(), goTo(step), setEmail(v) }`.
**Where**: `apps/store/src/features/auth/model/authUiStore.ts`
**Depends on**: None
**Reuses**: padrão de `entities/cart/model/cartStore.ts`
**Requirement**: AUTH-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `open({returnTo})` seta `isOpen` + `step='entry'` + `returnTo`; `close()` reseta; `goTo`/`setEmail` funcionam
- [ ] Testes cobrindo todas as ações e `returnTo`
- [ ] Quick gate passa
- [ ] Test count: ~5 testes passam

**Tests**: unit · **Gate**: quick

---

### T8: `<AuthOverlay>` responsivo + montagem no StoreLayout

**What**: Shell que renderiza `Dialog` (desktop, modal 2 colunas com painel de marca/benefícios) ou `Drawer` (mobile, bottom sheet com handle) conforme viewport, exibindo o passo atual; montar 1× no StoreLayout.
**Where**: `apps/store/src/features/auth/ui/AuthOverlay.tsx`; `apps/store/src/widgets/store-layout/ui/StoreLayout.tsx` (montar)
**Depends on**: T7
**Reuses**: `@nanapin/ui/{dialog,drawer}`; `useIsMobile`; copy/tokens do Paper (painel de marca)
**Requirement**: AUTH-01, AUTH-09

**Tools**: MCP: `paper` (referência visual) · Skill: `frontend-design`

**Done when**:
- [ ] Desktop renderiza Dialog com painel de marca (benefícios); mobile renderiza Drawer com handle
- [ ] Fecha por ✕/backdrop/gesto preservando a página
- [ ] Testes (RTL): abre quando `isOpen`; fecha chama `close()`; painel de marca só no desktop
- [ ] Quick gate passa
- [ ] Test count: ~4 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T9: `useAuthFlow` (transições + onSuccess/returnTo)

**What**: Hook que liga ações dos passos aos métodos do AuthContext e implementa transições + conclusão (fecha overlay, resolve `returnTo` ou `/conta`; carrinho preservado por `cartStore` persist).
**Where**: `apps/store/src/features/auth/model/useAuthFlow.ts`
**Depends on**: T3, T4, T5, T7
**Reuses**: `useAuthContext`, `authUiStore`, `cartStore` (persist)
**Requirement**: AUTH-01, AUTH-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Transições: entry→code (envio ok), code→name (isNewUser) / code→done, code inválido mantém code, password→done, password→reset
- [ ] `onSuccess` fecha overlay e resolve `returnTo`
- [ ] Testes 1:1 às ACs de transição + edge (código inválido, sem returnTo → /conta)
- [ ] Quick gate passa
- [ ] Test count: ~7 testes passam

**Tests**: unit · **Gate**: quick

---

### T10: Step `AuthEntry`

**What**: Passo de entrada: botão Google, divisor, campo e-mail, CTA "Enviar código", link "Prefere usar senha? Clique aqui"; validação de e-mail.
**Where**: `apps/store/src/features/auth/ui/steps/AuthEntry.tsx`
**Depends on**: T8, T9
**Reuses**: `Input`/`Label`/`Button`; SVG do Google (de AuthPage); tokens do Paper
**Requirement**: AUTH-02, AUTH-10

**Tools**: MCP: `paper` · Skill: `frontend-design`

**Done when**:
- [ ] E-mail inválido bloqueia envio; válido chama `signInWithOtp` e vai para `code`
- [ ] Google aciona `signInWithGoogle`; link vai para `password`
- [ ] Testes (RTL): validação, envio, navegação para password
- [ ] Quick gate passa
- [ ] Test count: ~4 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T11: Step `AuthCodeStep` (OTP)

**What**: 6 dígitos via `InputOTP`, CTA "Verificar código", reenviar com cooldown 60s, "Usar outro e-mail", erro de código inválido/expirado.
**Where**: `apps/store/src/features/auth/ui/steps/AuthCodeStep.tsx`
**Depends on**: T8, T9
**Reuses**: `@nanapin/ui/input-otp`; tokens do Paper
**Requirement**: AUTH-03, AUTH-07

**Tools**: MCP: `paper` · Skill: `frontend-design`

**Done when**:
- [ ] Código completo aciona `verifyOtp`; inválido mostra erro e mantém passo/e-mail
- [ ] Reenviar desabilitado durante cooldown com contagem; habilita ao expirar
- [ ] "Usar outro e-mail" volta para `entry` mantendo e-mail
- [ ] Testes (RTL): verificar, erro inválido, cooldown ativo/expirado, trocar e-mail
- [ ] Quick gate passa
- [ ] Test count: ~5 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T12: Step `AuthNameStep` (1º acesso)

**What**: Campo nome + CTA "Concluir cadastro"; exibido só quando `isNewUser`; nome vazio rejeitado; ao salvar chama `updateDisplayName` e conclui.
**Where**: `apps/store/src/features/auth/ui/steps/AuthNameStep.tsx`
**Depends on**: T8, T9
**Reuses**: `Input`/`Label`/`Button`; tokens do Paper
**Requirement**: AUTH-04

**Tools**: MCP: `paper` · Skill: `frontend-design`

**Done when**:
- [ ] Nome vazio/só-espaços bloqueia; válido chama `updateDisplayName` e conclui
- [ ] Testes (RTL): validação, submit sucesso
- [ ] Quick gate passa
- [ ] Test count: ~3 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T13: Step `AuthPasswordStep`

**What**: E-mail + senha com toggle mostrar/ocultar, "Esqueceu a senha?" (→ reset), CTA "Entrar", "Sem senha? Receber código por e-mail" (→ code mantendo e-mail).
**Where**: `apps/store/src/features/auth/ui/steps/AuthPasswordStep.tsx`
**Depends on**: T8, T9
**Reuses**: `Input`/`Label`/`Button`; SVG olho (de AuthPage/25W-0); tokens do Paper
**Requirement**: AUTH-06

**Tools**: MCP: `paper` · Skill: `frontend-design`

**Done when**:
- [ ] Toggle alterna máscara; credenciais inválidas mostram "E-mail ou senha inválidos"
- [ ] "Esqueceu a senha?" vai para `reset`; "Receber código" vai para `code` com e-mail preservado
- [ ] Testes (RTL): toggle, login inválido, navegação reset/code
- [ ] Quick gate passa
- [ ] Test count: ~4 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T14: Step `AuthResetStep`

**What**: E-mail → `resetPassword` → estado de confirmação de envio; validação de e-mail; voltar para `password`.
**Where**: `apps/store/src/features/auth/ui/steps/AuthResetStep.tsx`
**Depends on**: T8, T9
**Reuses**: `Input`/`Label`/`Button`
**Requirement**: AUTH-08

**Tools**: MCP: NONE · Skill: `frontend-design`

**Done when**:
- [ ] E-mail inválido bloqueia; válido chama `resetPassword` e mostra confirmação
- [ ] Testes (RTL): validação + envio confirmado
- [ ] Quick gate passa
- [ ] Test count: ~2 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T15: Header → abrir overlay quando deslogado

**What**: Ícone de conta chama `openAuth()` quando deslogado; mantém `/conta` quando logado.
**Where**: `apps/store/src/widgets/header/ui/Header.tsx`
**Depends on**: T8
**Reuses**: `authUiStore.open`; `useAuthContext`
**Requirement**: AUTH-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Deslogado: clique abre overlay (não navega); logado: vai para `/conta`
- [ ] Testes (RTL): ambos os caminhos
- [ ] Quick gate passa
- [ ] Test count: ~2 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T16: CheckoutPage → login contextual + carrinho preservado

**What**: Substituir o bloco `if (!user)` (link para `/entrar`) por `openAuth({ returnTo: '/checkout' })`; ao concluir, retorna ao checkout com carrinho intacto.
**Where**: `apps/store/src/pages/CheckoutPage.tsx`
**Depends on**: T8, T9
**Reuses**: `authUiStore`; `cartStore` (persist)
**Requirement**: AUTH-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Deslogado no checkout: CTA abre overlay com `returnTo='/checkout'`
- [ ] Após sucesso, permanece/retorna ao checkout; itens do carrinho preservados
- [ ] Testes (RTL): abre overlay com returnTo; carrinho não é limpo
- [ ] Quick gate passa
- [ ] Test count: ~3 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T17: AccountPage → overlay em vez de navigate('/entrar')

**What**: Trocar `navigate('/entrar')` (deslogado em `/conta`) por `openAuth({ returnTo: '/conta' })`.
**Where**: `apps/store/src/pages/AccountPage.tsx` (linha ~131)
**Depends on**: T8
**Reuses**: `authUiStore`
**Requirement**: AUTH-01, AUTH-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Deslogado em `/conta` abre overlay com `returnTo='/conta'`
- [ ] Testes (RTL): abre overlay em vez de navegar
- [ ] Quick gate passa
- [ ] Test count: ~2 testes passam

**Tests**: unit (component) · **Gate**: quick

---

### T18: Rota `/entrar` (fallback/deep-link) + returnTo em OAuth/reset

**What**: `/entrar` monta o overlay já aberto (fallback); resolver `returnTo` no retorno de OAuth/reset via query em `redirectTo` (substitui `window.location.origin` fixo).
**Where**: `apps/store/src/pages/AuthPage.tsx` (repurpose), `apps/store/src/app/App.tsx` (rota), `packages/auth/src/AuthContext.tsx` (redirectTo com returnTo)
**Depends on**: T8, T9
**Reuses**: `authUiStore`; overlay
**Requirement**: AUTH-01, AUTH-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Acessar `/entrar` exibe o overlay aberto (mesmos passos)
- [ ] `signInWithGoogle`/`resetPassword` incluem `returnTo` no `redirectTo` e resolvem ao voltar
- [ ] Testes (RTL): `/entrar` renderiza overlay; redirectTo carrega returnTo
- [ ] Quick gate passa
- [ ] Test count: ~3 testes passam

**Tests**: unit (component) · **Gate**: quick

**Commit**: `feat(store): login OTP contextual (modal/sheet) + returnTo`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6
Phase 2:  T7 → T8 → T9
Phase 3:  T10 → T11 → T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18
```

Execução estritamente sequencial. Total: 18 tasks → no Execute, empacotam em ~4 batches (P1 / P2 / P3 / P4) → oferta de sub-agents será feita (>8 tasks).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 dep/infra | 1 verificação/dep | ✅ |
| T2–T5 métodos AuthContext | 1 método cada | ✅ |
| T6 config docs | 1 arquivo | ✅ |
| T7 store | 1 store | ✅ |
| T8 overlay | 1 componente (+montagem) | ✅ |
| T9 hook | 1 hook | ✅ |
| T10–T14 steps | 1 componente cada | ✅ |
| T15–T18 integrações | 1 arquivo/ponto cada | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (início P1) | ✅ |
| T2 | None | (P1) | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T2 | (P1, ramo de T2) | ✅ |
| T6 | None | (P1) | ✅ |
| T7 | None | (início P2) | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T3,T4,T5,T7 | P1→P2 (deps de fase anterior) + T7 | ✅ |
| T10 | T8,T9 | T9→T10 (P2→P3) | ✅ |
| T11 | T8,T9 | (P3, deps P2) | ✅ |
| T12 | T8,T9 | (P3, deps P2) | ✅ |
| T13 | T8,T9 | (P3, deps P2) | ✅ |
| T14 | T8,T9 | (P3, deps P2) | ✅ |
| T15 | T8 | P2→P4 | ✅ |
| T16 | T8,T9 | P2→P4 | ✅ |
| T17 | T8 | P2→P4 | ✅ |
| T18 | T8,T9 | P2→P4 | ✅ |

> Dependências apontam sempre para trás ou dentro da fase. Sem dependência de fase futura. ✅

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Dependência/infra | none | none | ✅ |
| T2 | Auth method | unit | unit | ✅ |
| T3 | Auth method | unit | unit | ✅ |
| T4 | Auth method | unit | unit | ✅ |
| T5 | Auth method | unit | unit | ✅ |
| T6 | Config | none | none | ✅ |
| T7 | UI state store | unit | unit | ✅ |
| T8 | Component | unit (component) | unit | ✅ |
| T9 | Flow hook | unit | unit | ✅ |
| T10–T14 | Step components | unit (component) | unit | ✅ |
| T15–T18 | Integrations | unit (component) | unit | ✅ |

> Nenhum `Tests: none` indevido — só em config/infra (T1, T6), conforme a matriz. ✅

---

## Requirement Traceability (tasks)

| Requirement | Tasks | Status |
| ----------- | ----- | ------ |
| AUTH-01 | T7, T8, T15, T17, T18 | Verified |
| AUTH-02 | T2, T10 | Verified |
| AUTH-03 | T1, T3, T11 | Verified |
| AUTH-04 | T3, T4, T12 | Verified |
| AUTH-05 | T9, T16, T17 | Verified |
| AUTH-06 | T13 | Verified |
| AUTH-07 | T11 | Verified |
| AUTH-08 | T5, T14 | Verified |
| AUTH-09 | T8 | Verified |
| AUTH-10 | T8, T10, T18 | Verified |
| AUTH-11 | T1, T6 | Verified |
| AUTH-12 (Paper) | — | ✅ Done (fase Design) |
