# 72 — Validação (rodada 1)

**Data**: 2026-10-22
**Spec**: `.specs/features/72-mobile-adm-fundacao/spec.md`
**Diff**: working tree contra `b6449bd2` (a feature não está commitada, regra do projeto): 11 arquivos
alterados + `apps/mobile-adm/**`, `packages/ui/src/tokens/**`,
`apps/store/src/shared/lib/__tests__/fontesDoAteliePareadas.test.ts`,
`.specs/brand/uma-estrelinha/_gen-atelie-icons.mjs`. `.playwright-mcp/` ignorado.
**Verificador**: sub-agente independente (autor ≠ verificador). Não editei código nem teste.

## Veredito: **FAIL ❌** (por cobertura; nenhum defeito de produto novo dentro da letra das ACs)

Dois mutantes sobreviveram em 25 válidos (M06 e M24) e há um desvio de spec **não declarado** em
`MAF-14`. O resto é sólido: 23 mortos, todos por asserção, nenhum por compilação.

---

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Exit |
| --- | --- | --- |
| `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | **118/17**, 0 falhas | 0 |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5743/313**, 0 falhas | 0 |
| `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **3648/207**, 0 falhas | 0 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | 0 · 0 · 0 erros (só os avisos de `npmrc` do npm) | 0 · 0 · 0 |
| `git diff --name-only b6449bd2 -- apps/backoffice packages/core/src/payment` | vazio; `git status` também vazio nos dois caminhos | — |
| `vite build --outDir <scratch>` do app | `manifest.webmanifest`, `sw.js`, `registerSW.js`, `workbox-*.js` gerados; `sw.js` com **uma** rota (`NavigationRoute`, denylist `/api/`) e **zero** menção a `supabase`; `theme-color #283A4A` no HTML | 0 |

Os números batem com os do autor (118/17 · 5743/313 · 3648/207 · 0·0·0). Baseline de entrada
(`baseline.md`): store 5733/312 → 5743/313 (+10/+1: `palette.test.ts` +5, `fontesDoAteliePareadas`
novo); backoffice idêntico. Nenhum teste removido; `buttonShape.test.ts` mudou de **endereço** (lê o
raio do dono em `packages/ui`), a régua é a mesma.

---

## Checagem ancorada na spec

Legenda: ✅ prova · ⚠️ prova parcial / lacuna de precisão · ❌ sem prova.

### Instalável e deploy

| AC | Resultado da spec | Prova (`file:line` — asserção) | |
| --- | --- | --- | --- |
| MAF-01 | manifest com os 9 campos, cores = `primary-strong`, ícones 192/512 any + 512 maskable, SW registrado | `apps/mobile-adm/src/app/__tests__/manifest.test.ts:33-48` — `toBe('Ateliê · Uma Estrelinha')`…`toBe(ESTRELINHA_COLORS['primary-strong'])`; `:57` ícones `toEqual([...])`; `:65-68` tamanho lido do IHDR; `:85-87` fiação `VitePWA(pwaOptions)`. SW registrado: só `injectRegister: 'auto'` + `prova-navegador.md` (`getInstallabilityErrors` `[]`) | ✅ (SW registrado: prova em navegador, não em teste) |
| MAF-02 | abre em `standalone` | `manifest.test.ts:41` — `display toBe('standalone')`. Abrir pelo ícone: Success Criterion pede **aparelho**, pendente com o usuário | ⚠️ config provada, aparelho não |
| MAF-03 | build gera `dist` com manifest e `sw.js`; `pnpm dev:mobile-adm` na 8084 | build medido nesta rodada (acima); `package.json` raiz `dev:mobile-adm`; `vite.config.ts` `port: 8084`. Nenhum teste automatizado | ⚠️ prova por execução, sem régua |
| MAF-04 | `sw.js` no-cache, `/assets/*` immutable 1 ano, 4 headers iguais ao painel | `vercelConfig.test.ts:39` `toBe('public, max-age=31536000, immutable')`; `:43` `toBe('no-cache')`; `:54-58` os 4 + `toEqual(headersDe(painel,…))`; `:65-68` rewrite não captura `sw.js`/manifest | ✅ |

### Splash

| AC | Resultado da spec | Prova | |
| --- | --- | --- | --- |
| MAF-05 | fundo `primary-strong`, logo negativo, barra 120 px com progresso `accent`, rótulo "Ateliê · painel" | `Splash.test.tsx:22-27` SVG inline, `aria-label 'Uma Estrelinha'`; `:38` `bg-estrelinha-primary-strong`; `:46-48` `w-[120px]`, `bg-estrelinha-accent`; `:53-55` rótulo; `App.routing.test.tsx:50-57` splash enquanto a sessão não resolve; `lockupDaSplashPareado.test.ts` cópia = fonte | ✅ |
| MAF-06 | sai com **≥ 600 ms** desde a montagem, nunca tempo fixo além | `App.routing.test.tsx:59-67` — aos 599 ms `toBeInTheDocument()`, aos 600 `not.toBeInTheDocument()` (pela árvore real); `useMinimumDuration.test.ts:24-29` `toEqual([600])` (um temporizador só) | ✅ (M02, M03 mortos) |
| MAF-07 | reduced-motion: logo sem deslocamento, barra parada | `Splash.test.tsx:63-70` cada nó animado com `motion-reduce:animate-none`; `:72-79` estado final `translateY(0)`, sem `opacity`, barra `w-full` | ✅ (M20 morto). Proxy de forma: jsdom não aplica a media query |

### Entrar no ateliê

| AC | Resultado da spec | Prova | |
| --- | --- | --- | --- |
| MAF-08 | Login com título, e-mail, senha com mostrar/ocultar, "Esqueci minha senha", "Acesso restrito…" | `LoginPage.test.tsx:30-51` | ✅ |
| MAF-09 | senha certa + admin ⇒ Início; o destino **espera** o `AuthProvider` saber o papel | `LoginPage.test.tsx:63-70`; `:72-90` papel segurado 2 s ⇒ `pathname toBe('/login')`, sem recusa; solto ⇒ `/` | ✅ (M04 morto) |
| MAF-10 | frase de `authErrorMessage`, e-mail mantido | `LoginPage.test.tsx:94-102` — `toHaveTextContent('E-mail ou senha inválidos')`, `toHaveValue(email)` | ✅ (M21 morto) |
| MAF-11 | recusa com "Sair" e **nenhuma** leitura de dado | `LoginPage.test.tsx:106-116` — frase, botão, `leiturasDeDado() toEqual([])` com âncora `tabelas.length > 0`; `App.routing.test.tsx:29-34` sessão sem papel numa aba ⇒ recusa em `/login` | ✅ (M05 morto). Ver lacuna 2 (o `!authLoading`) |
| MAF-12 | e-mail → código 6 dígitos (reenvio, 60 s) → senha nova com `passwordChangeRefusal` antes da rede | `RecoveryFlow.test.tsx:48-53`, `:66-79` (59 s travado / 60 s libera / recomeça), `:81-87`, `:98-101` `type: 'recovery'`, `:113-129` recusa com `updateUser not.toHaveBeenCalled()`, `:131-149` desfechos, `:153-165` sem "link" | ✅ (M07, M08 mortos) |
| MAF-13 | "Sair" encerra a sessão e volta ao Login | `AccountMenu.test.tsx:43-54` — `signOut toHaveBeenCalledTimes(1)`, `/login`, `sessao toBeNull()` | ✅ (M16 morto) |

### As quatro abas

| AC | Resultado da spec | Prova | |
| --- | --- | --- | --- |
| MAF-14 | barra fixa com Início/Pedidos/Clientes/Descontos, **ícone de `@estrelinha/ui/icons`**, rótulo visível, alvo ≥ 48 px, `aria-current="page"` | `TabBar.test.tsx:26-33` rótulos e ordem; `:35-39` `aria-current`; `:41-44` `min-h-12`; `abasSaoAsRotas.test.ts` lista × rotas | ❌ **parcial**: o ícone não tem asserção nenhuma (M24 sobrevive) e vem de `lucide-react`, não de `@estrelinha/ui/icons` — desvio **não** marcado na spec (ver lacuna 1) |
| MAF-15 | `env(safe-area-inset-bottom)`, nada clicável sob a barra do sistema | `TabBar.test.tsx:61-65` `pb-[env(safe-area-inset-bottom)]`; `:67-78` reserva `h-[calc(4rem+env(…))]` depois do rodapé, sem `border` | ✅ (M12, M13 mortos). Proxy de forma; medida em `prova-navegador.md` (780 = 780) |
| MAF-16 | sem sessão admin ⇒ Login; **toda** rota fora de `/login` sob o `RequireAdmin` (posição) | `rotasSobGuarda.test.ts:70-81` (posição, âncora tripla, 6 sensores); `App.routing.test.tsx:20-27` cinco caminhos ⇒ `/login` pela árvore real | ✅ (M01, M22 mortos) |
| MAF-17 | voltar no detalhe volta à lista; na raiz sai do app, sem interceptar | `TabBar.test.tsx:46-57` `history.back()` ⇒ `/` | ⚠️ não há tela de detalhe na `72`; a metade "na raiz sai do app" só se prova em aparelho |
| MAF-18 | título + "em construção", sem dado fictício | `TabBar.test.tsx:82-90` — `main.textContent toBe(\`${titulo}Esta parte do app chega em breve.\`)`, sem dígito, `leiturasDeDado() toEqual([])` | ✅ |

### Sem conexão

| AC | Resultado da spec | Prova | |
| --- | --- | --- | --- |
| MAF-19 | shell do SW + a frase + "Tentar de novo" | `semConexao.test.tsx:35-42`; `:44-49` `chamadasAoSupabase() toBe(0)`; `:51-57`; abertura fria pelo SW: `prova-navegador.md` (com `navigator.onLine` forçado) | ✅ (M14, M25 mortos). Ver a seção do `checkAdmin` |
| MAF-20 | SW não intercepta nem cacheia `*.supabase.co`; guarda recusa `runtimeCaching` | `swSemDadosDaLoja.test.ts:34-43` + 4 sensores; build: `sw.js` sem `supabase` | ✅ (M09 morto) |
| MAF-21 | evento `online` tira do estado offline sozinho | `semConexao.test.tsx:70-79` — sai da tela, volta à aba, `getSession` relido `+1`; `useOnline.test.ts:15-30` | ✅ (M15 morto) |

**Contagem: 17/21 com prova completa · 4 parciais (MAF-02, MAF-03, MAF-14, MAF-17) · 1 desvio não
declarado (MAF-14).**

### Edge cases

- [x] **Sessão expira com o app aberto ⇒ Login sem toast**: `AccountMenu.test.tsx:58-69`. ⚠️ Provado
  pelo evento `SIGNED_OUT` do client, não por uma leitura com **401** — a `72` não faz leitura de dado,
  então a letra ("a próxima leitura com 401") não tem como ser exercida. Fica para a `73`.
- [ ] **A conta perde o papel com o app aberto ⇒ a tela diz que o acesso foi removido**: **sem
  implementação e sem teste.** Não há gravação na `72`, e nenhuma tela diz "acesso removido".
  Lacuna de precisão: a spec põe nesta feature um comportamento que só existe quando houver leitura
  ou gravação (`73`+).
- [x] **`VITE_BACKOFFICE_URL` falta ⇒ sem link, resto funciona**: `TabBar.test.tsx:102-108` (M17 morto).
- [x] **Aberto no navegador sem instalar**: nada no código ramifica por `display-mode`; verdadeiro por construção.

---

## Sensor de discriminação

Arnês em Python sobre os arquivos REAIS: SHA-256 antes, substituição exata (alvo não encontrado ⇒
mutante inválido, não contado), suíte, restauração, SHA-256 depois. **Sem `git stash`/`checkout`.**
SHA conferido em todos os 25; árvore inteira conferida por hash de `git diff` + não rastreados antes e
depois (idêntica). Morte classificada por asserção × compilação pelo log de cada execução.

| # | Arquivo | Mutação | Resultado | Morte |
| --- | --- | --- | --- | --- |
| M01 | `src/app/App.tsx` | `/pedidos` movida para FORA do bloco do `RequireAdmin` | morto (9 casos, incl. `rotasSobGuarda`) | asserção |
| M02 | `src/app/BootGate.tsx` | portão ignora o piso de 600 ms | morto (`App.routing` MAF-06) | asserção |
| M03 | `src/app/BootGate.tsx` | piso fixo de 2400 ms | morto (51 casos) | asserção |
| M04 | `src/pages/LoginPage.tsx` | navega no sucesso do `signIn`, sem esperar o `authLoading` (BUG-20260802) | morto (`LoginPage` BUG-20260802) | asserção |
| M05 | `src/pages/LoginPage.tsx` | a tela de recusa lê `orders` | morto (MAF-11) | asserção |
| **M06** | `src/pages/LoginPage.tsx` | `recusada` sem o `!authLoading` | **SOBREVIVEU** (118/118) | — |
| M07 | `features/recovery/ui/RecoveryFlow.tsx` | `passwordChangeRefusal` removida antes de `updatePassword` | morto | asserção |
| M08 | idem | reenvio libera aos 30 s | morto | asserção |
| M09 | `pwa.config.ts` | `runtimeCaching` para `supabase.co` | morto (2) | asserção |
| M10 | `vercel.json` | `X-Frame-Options: SAMEORIGIN` | morto | asserção |
| M11 | `vercel.json` | `sw.js` com `max-age=3600` | morto | asserção |
| M12 | `widgets/tab-bar/ui/TabBar.tsx` | barra sem `pb-[env(safe-area-inset-bottom)]` | morto | asserção |
| M13 | `app/layout/MobileLayout.tsx` | reserva `h-16` sem o inset | morto | asserção |
| M14 | `src/app/App.tsx` | offline com o `AuthProvider` montado (chama `getSession`) | morto (`chamadasAoSupabase() toBe(0)`) | asserção |
| M15 | `shared/lib/useOnline.ts` | sem o ouvinte de `online` | morto (3) | asserção |
| M16 | `widgets/account-menu/ui/AccountMenu.tsx` | "Sair" não chama `signOut` | morto | asserção |
| M17 | `shared/config/backoffice.ts` | sem env, URL inventada | morto | asserção |
| M18 | `apps/mobile-adm/tailwind.config.ts` | `{ ...ESTRELINHA_COLORS }` (cópia, valores iguais) | morto (`palette.test.ts`, suíte da loja, `toBe`) | asserção |
| M19 | `packages/auth/src/RequireAdmin.tsx` | `fallback` ignorado | morto | asserção |
| M20 | `features/splash/ui/Splash.tsx` | barra sem `motion-reduce:animate-none` | morto | asserção |
| M21 | `src/pages/LoginPage.tsx` | erro de login limpa o e-mail | morto | asserção |
| M22 | `src/app/App.tsx` | `RequireAdmin` removido do bloco | morto (14) | asserção |
| M23 | `widgets/tab-bar/ui/TabBar.tsx` | aba `min-h-10` | morto | asserção |
| **M24** | `widgets/tab-bar/ui/TabBar.tsx` | o `<Icon>` da aba apagado | **SOBREVIVEU** (118/118) | — |
| M25 | `src/app/OfflineScreen.tsx` | a frase offline encurtada para "Sem conexão." | morto (3) | asserção |

**Resultado: 25 injetados, 23 mortos (23 por asserção, 0 por compilação), 2 sobreviventes.**

---

## Os desvios declarados pelo autor

| Desvio | Avaliação |
| --- | --- |
| `MobileLayout` em `app/layout/` | **Correto.** Ele compõe `tab-bar` e `account-menu`; em `widgets/` seria import lateral. É a regra de FSD do repositório. |
| Código de recuperação com `Input` simples em vez de `input-otp` | **Aceitável.** A spec pede "código de 6 dígitos com reenvio e cooldown de 60 s", não um componente; `inputMode="numeric"`, `maxLength={6}`, `autoComplete="one-time-code"` e a recusa de formato antes da rede estão provados. `desafioDeCodigoUnico.test.ts` só varre `apps/store/**`. |
| `BootGate` aplicando o piso | **Correto e provado** pela árvore real (M02, M03). A trava `resolvida` (não reagir ao `loading` de cada login) é coerente com o `fallback` do `RequireAdmin`. |
| `AuthProvider` movido para dentro do `App` | **Correto e necessário** para `MAF-19`: é o que torna "zero chamadas ao Supabase offline" verdade (M14 morto). `main.tsx` monta só `<App />`, e os testes montam o mesmo `<App />`. |
| Comentário: o `!authLoading` de `recusada` é "defesa, não régua medida", porque "com o papel em voo `user` ainda é o anterior (nulo)" | **Meio verdadeiro.** Que o `!authLoading` não é medido é verdade (M06 sobrevive, e o comentário o admite). Que `user` em voo é **nulo** só vale quando a identidade anterior era nula. `AuthContext.loadUserData` grava `user` só no fim, então numa troca de conta SEM `SIGNED_OUT` intermediário (outra aba da mesma origem entrando com outra conta; o supabase-js propaga pelo `storage`) o `user` em voo é a conta **anterior**, não-nula, e aí o `!authLoading` decide o que aparece. O código está certo; o parêntese "(nulo)" generaliza demais. Defeito de documentação de baixa gravidade, não de produto. |

## O defeito não consertado: `checkAdmin` devolvendo `false` na falha de rede

`packages/auth/src/AuthContext.tsx:40-53`: erro ou exceção na leitura de `user_roles` ⇒ `false`. Com a
sessão gravada no `localStorage` e a rede inútil mas `navigator.onLine === true` (o caso "lie-fi",
medido em `prova-navegador.md`), a Adri, **que é admin**, cai em "Esta conta não tem acesso ao painel."

- **Não viola a letra de nenhuma AC da `72`.** `MAF-19`/`MAF-21` são definidos pelo estado do
  navegador ("abre offline", evento `online`), e nesse estado a tela certa aparece. `MAF-11` é sobre
  conta que **não** é admin.
- **Contradiz, sim, a tabela de requisitos implícitos da própria spec**: a linha *Dependência externa*
  diz "Supabase Auth fora do ar ⇒ mensagem de erro do login". O que sai é uma recusa confiante e
  falsa, a mesma classe do `BUG-20260802` (frase confiante e errada sobre o papel). É uma **lacuna de
  precisão da spec** (ela nunca separou "sem rede" de "rede presente e inútil") e não um requisito
  numerado descumprido.
- **É dívida legítima fora do escopo da `72`**, com duas condições que já estão cumpridas: está
  registrada (`prova-navegador.md`, `apps/mobile-adm/CLAUDE.md`, `STATE.md:1437`, `CLAUDE.md:543`) e
  o conserto é no `AuthProvider`, compartilhado com o painel e a loja (o painel tem o mesmo
  comportamento hoje). **Não está no `BACKLOG.md`**: recomendo uma entrada `BL-` própria, e que a
  `73` (a primeira com leitura de dado) não comece sem decidir isso — com leitura de dado, o mesmo
  "lie-fi" passa a produzir erro de leitura numa aba, e a recusa falsa vira o caminho mais comum de
  falha no celular.

---

## Lacunas ranqueadas (viram tarefas de conserto)

1. **`MAF-14`, o ícone** — `widgets/tab-bar/ui/TabBar.tsx:38` / `widgets/tab-bar/model/tabs.ts:1,19-24`.
   (a) A spec diz "ícone de `@estrelinha/ui/icons`"; o código usa `lucide-react`. O `design.md:45`
   trocou a fonte, mas a spec não foi emendada nem ganhou `SPEC_DEVIATION`. Ou se emenda a AC (decisão
   do usuário), ou se troca a fonte. (b) **M24**: apagar o ícone deixa 118/118 verdes. Falta uma
   asserção de que cada link da barra carrega um `svg` com `aria-hidden` (e, se a AC ficar como está,
   que ele vem do vocabulário de `@estrelinha/ui/icons`).
2. **`MAF-09`/`MAF-11`, o `!authLoading` de `recusada`** — `src/pages/LoginPage.tsx:46-49`. M06
   sobrevive. Ou um caso que troque de conta sem `SIGNED_OUT` (o dublê já sabe emitir eventos e segurar
   o papel) e prove que a recusa da conta anterior não aparece com o papel da nova em voo, ou se
   apaga a cláusula e o comentário. Em qualquer caso, corrigir o "(nulo)" do comentário.
3. **Edge case "acesso removido"** — sem implementação nem teste. Emendar a spec para levá-lo à
   primeira feature com leitura/gravação (`73`), ou implementar.
4. **`MAF-03`** sem régua: o build e o `dev:mobile-adm` só são provados executando. Baixa prioridade
   (o CI roda `pnpm build`).
5. **`MAF-02`/`MAF-17` (raiz sai do app)** e o Success Criterion "instalada num Android de verdade":
   dependem de aparelho, pendentes com o usuário, como o próprio `prova-navegador.md` declara.
6. **Defeito do `checkAdmin`** — fora da letra da `72`; registrar em `BACKLOG.md` (ver acima).

## Qualidade

| Checagem | |
| --- | --- |
| Escopo mínimo / sem extras | ✅ |
| Mudanças cirúrgicas fora do app | ✅ `RequireAdmin` ganhou um prop opcional (painel inalterado: suíte idêntica, `RequireAdminFallback.test.tsx` prova o esqueleto sem o prop); a loja só no que o dono da paleta exige |
| Padrões do repositório (guardas com âncora e sensor, árvore real nos testes de fiação, token exato) | ✅ |
| Asserções sobre o resultado da spec | ✅ salvo as lacunas 1 e 2 |
| Testes sem dono na spec | nenhum achado |
| Diretrizes | `CLAUDE.md` da raiz e `apps/mobile-adm/CLAUDE.md` |

## Rastreabilidade sugerida

| ID | Antes | Depois |
| --- | --- | --- |
| MAF-01, 04..13, 15, 16, 18..21 | Implemented | ✅ Verified |
| MAF-02, MAF-03, MAF-17 | Implemented | ⚠️ Verified em parte (aparelho / sem régua) |
| MAF-14 | Implemented | ❌ Needs Fix (ícone sem prova; fonte do ícone diverge da AC) |

---

# Rodada 2

**Data**: 2026-10-22 · **Verificador**: sub-agente independente novo (não escreveu o código nem os
consertos). **Diff**: working tree contra `b6449bd2` (sem commit), `.playwright-mcp/` ignorado.
**Spec**: com as emendas de 2026-10-22 (`MAF-14` aceita `lucide-react`; edge case "acesso removido"
movido para a `73`; `checkAdmin` registrado como `BL-048`).

## Veredito: **FAIL ❌** (por cobertura, gravidade baixa; nenhum defeito de produto)

As três lacunas da r1 estão fechadas e os mutantes delas morrem por asserção. O sensor novo achou
**três sobreviventes não equivalentes** em 18 válidos, todos em bordas (o rodapé sem env e o guarda
de andaime que o próprio conserto criou). Iteração 2 de 3 do laço conserto → re-verificação.

## As lacunas da r1

| Lacuna | Reinjeção nesta rodada | Resultado |
| --- | --- | --- |
| **M24** — ícone da aba sem prova | R1: o `<Icon>` apagado de `TabBar.tsx`; R2: `Pedidos` com o ícone de `Clientes` em `tabs.ts` | **ambos mortos por asserção** (`TabBar.test.tsx` "cada aba desenha O SEU ícone"). A expectativa é escrita por extenso (aba → componente), não derivada de `TABS`, com âncora de quatro desenhos distintos. Comparar `innerHTML` contra o mesmo `lucide-react` renderizado à parte **não** quebra com upgrade do lucide (os dois lados mudam juntos); o que ele não mede é o desenho em si, e a AC emendada não pede desenho específico. ✅ |
| **M06** — o `!authLoading` de `recusada` | R3: a cláusula removida | **morto por asserção** (`LoginPage.test.tsx:118` "troca de conta SEM SIGNED_OUT"). O dublê segura o papel por **promessa** (`segurarPapel`), não por relógio: o `advanceTimersByTimeAsync(2000)` só dá tempo de assentar, então o caso não depende do temporizador. O cenário é real: `AuthContext.loadUserData` grava `user` só junto com o papel. Comentário de `LoginPage.tsx` corrigido (não generaliza mais o "nulo"). ✅ |
| **MAF-03** — andaime sem régua | N10: porta do `server` 8084 → 8085; N11: `VITE_BACKOFFICE_URL` fora do `env` do build | **ambos mortos por asserção** (`scaffold.test.ts`). O parse do `turbo.json` remove só linha que **começa** com `//`: um comentário no fim da linha ou de bloco faria `JSON.parse` lançar — a falha é ruidosa, não silenciosa. **Mas** o guarda tem um buraco: ver N12. ⚠️ |
| Edge "acesso removido" | — | movido para a `73` pela emenda; fora desta verificação. |
| `checkAdmin` | — | `BL-048` em `.specs/BACKLOG.md:1926`, com prazo antes da `73`. |

## Checagem pela spec (r2)

Sem mudança em relação à r1 para MAF-01, 04..13, 15, 16, 18..21 (✅, as provas citadas lá seguem
verdes). Mudanças:

| AC | r1 | r2 |
| --- | --- | --- |
| MAF-14 | ❌ | ✅ — `TabBar.test.tsx` (ícone por aba, `aria-hidden`, um `svg` por link) + rótulos, `min-h-12`, `aria-current`; a fonte do ícone casa com a AC emendada |
| MAF-03 | ⚠️ sem régua | ⚠️ régua nova (script, porta dev/preview, env do Turbo), com o buraco N12; o build gerando `manifest.webmanifest`/`sw.js` continua provado só executando (declarado no cabeçalho do guarda) |
| MAF-02 | ⚠️ | **pendente com o usuário** (aparelho) — declarado em `prova-navegador.md:81-83` |
| MAF-17 | ⚠️ | metade "voltar volta à aba anterior" ✅ (`TabBar.test.tsx`, `prova-navegador.md:36`); metade "na raiz sai do app" **pendente com o usuário**. ⚠️ `prova-navegador.md` declara a instalação e a navegação por gestos no aparelho, mas **não nomeia** o voltar na raiz: acrescentar a linha |

**Contagem: 18/21 com prova completa · 3 parciais (MAF-02 e MAF-17 por aparelho, MAF-03 pelo N12).**

Edge case `VITE_BACKOFFICE_URL` falta: ⚠️ — o código está certo, mas o teste é cego (N9).

## Sensor r2

Arnês em Python sobre os arquivos reais (SHA-256 antes/depois, substituição exata com contagem = 1,
senão inválido; suíte do `mobile-adm` por `vitest run --testTimeout=20000`; morte classificada pelo
log). Sem `git stash`/`checkout`. SHA conferido nos 18; hash de `git diff b6449bd2` + não rastreados
idêntico antes e depois (`67d39da8…`).

| # | Arquivo | Mutação | Resultado | Morte |
| --- | --- | --- | --- | --- |
| R1 | `widgets/tab-bar/ui/TabBar.tsx` | `<Icon>` apagado (M24) | morto | asserção |
| R2 | `widgets/tab-bar/model/tabs.ts` | Pedidos com o ícone `Users` (troca entre abas) | morto | asserção |
| R3 | `pages/LoginPage.tsx` | `recusada` sem `!authLoading` (M06) | morto | asserção |
| N1 | `app/BootGate.tsx` | sem a trava `resolvida` (portão volta a reagir ao `loading` de cada login) | morto (BUG-20260802) | asserção |
| N2 | `pages/LoginPage.tsx` | efeito navega durante a recuperação (sem `recuperando`) | morto (2) | asserção |
| N3 | `features/recovery/ui/RecoveryFlow.tsx` | código aceita 4–6 dígitos | morto | asserção |
| N4 | `app/OfflineScreen.tsx` | "Tentar de novo" sem rede não avisa | morto | asserção |
| **N5** | `shared/config/backoffice.ts` | sem o `.trim()` (env só com espaços desenha link) | **SOBREVIVEU** | — |
| N6 | `pwa.config.ts` | `orientation: "any"` | morto | asserção |
| N7 | `vercel.json` | rewrite passa a capturar `sw.js` | morto | asserção |
| N8 | `shared/lib/useOnline.ts` | sem o ouvinte de `offline` | morto (3) | asserção |
| **N9** | `app/layout/MobileLayout.tsx` | `{url && (` → `{(url ?? true) && (` — sem env, `<a>` sem `href` com "Abrir o Backoffice" | **SOBREVIVEU** | — |
| N10 | `vite.config.ts` | porta do `server` 8085 | morto | asserção |
| N11 | `turbo.json` | `VITE_BACKOFFICE_URL` fora do `env` do build | morto (2) | asserção |
| **N12** | `apps/mobile-adm/package.json` | `name` renomeado para `@estrelinha/atelie` | **SOBREVIVEU** | — |
| N13 | `widgets/account-menu/ui/AccountMenu.tsx` | "Sair" só fecha o menu | morto | asserção |
| N14 | `features/recovery/ui/RecoveryFlow.tsx` | `onEntrou()` → `onCancel()` | sobreviveu — **equivalente** (o único chamador, `LoginPage`, passa `setRecuperando(false)` nos dois) | — |
| N15 | `app/App.tsx` | `RequireAdmin` sem `fallback={<Splash />}` | morto | asserção |

**Resultado: 18 válidos (1 inválido refeito: N10 casava duas vezes), 14 mortos (14 por asserção, 0
por compilação), 1 equivalente, 3 sobreviventes (N5, N9, N12).**

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Exit |
| --- | --- | --- |
| `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | **126/18** | 0 |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5743/313** | 0 |
| `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **3648/207** | 0 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | 0 · 0 · 0 | 0 · 0 · 0 |
| `git diff --name-only b6449bd2 -- apps/backoffice packages/core/src/payment packages/auth` | só `packages/auth/src/RequireAdmin.tsx` | — |

Bate com os números do worker. mobile-adm 118/17 → 126/18 (+8/+1: o caso do ícone, o da troca de
conta e os 6 de `scaffold.test.ts`); store e backoffice idênticos à r1.

## Lacunas ranqueadas (r2)

1. **N9 — o teste do rodapé sem env é cego a um `<a>` sem `href`.** `TabBar.test.tsx` "SEM a env…"
   assere `within(rodape).queryByRole('link')` nulo; um `<a>` sem `href` não tem papel de link, então
   "Abrir o Backoffice" desenhado como CTA morto passa. Conserto: asserir
   `queryByText('Abrir o Backoffice')` nulo (ou nenhum `a` no rodapé). Lição `L-048`.
2. **N12 — o guarda de andaime não confere que o workspace existe.** `scaffold.test.ts` compara a
   string do script; com o pacote renomeado, `pnpm dev:mobile-adm` imprime "No projects matched" e
   **sai com 0** (medido). Conserto: ler `apps/mobile-adm/package.json` e asserir
   `name === '@estrelinha/mobile-adm'` e a presença do script `dev` (com sensor). Lição `L-049`.
3. **N5 — env só com espaços.** O `.trim()` de `backofficeUrl` não tem caso; `stubEnv('VITE_BACKOFFICE_URL', '   ')`
   com a mesma asserção do item 1 o prende. Baixa: a spec diz "falta", e espaço é a forma realista de
   "falta" num painel de env da Vercel.
4. **MAF-17 / documentação** — acrescentar a `prova-navegador.md`, em *O que NÃO foi medido*, o voltar
   do Android na raiz de uma aba (sair do app) como pendente com o usuário.

**Pendentes com o usuário (não FAIL)**: instalação num Android de verdade, abertura em `standalone`
(`MAF-02`), navegação por gestos e inset real (`MAF-15` em aparelho), voltar na raiz (`MAF-17`).

## Rastreabilidade sugerida (r2)

| ID | r1 | r2 |
| --- | --- | --- |
| MAF-14 | ❌ Needs Fix | ✅ Verified |
| MAF-03 | ⚠️ | ⚠️ Needs Fix (N12) |
| MAF-02, MAF-17 | ⚠️ | ⚠️ pendente de aparelho |
| demais | ✅ | ✅ |

---

# Rodada 3

**Data**: 2026-10-22 · **Verificador**: sub-agente independente novo (não escreveu o código, os
testes nem os consertos). **Diff**: working tree contra `b6449bd2` (sem commit), `.playwright-mcp/`
ignorado. Hash de `git diff b6449bd2` + não rastreados **idêntico antes e depois** do sensor e dos
gates (`2b0242c2…`). **Iteração 3 de 3** do laço conserto → re-verificação: o que sobra vai ao usuário.

## Veredito: **FAIL ❌** (por cobertura; nenhum defeito de produto no código de hoje)

As três lacunas da r2 estão fechadas, e os consertos não abriram buraco relevante. O sensor novo, em
pontos que r1 e r2 não tocaram, achou **um sobrevivente que esconde um caminho de erro real de
`MAF-12`** (S09) e quatro de gravidade menor, dois deles contra decisões escritas na própria spec
(S15, S21).

## As lacunas da r2 (reinjetadas por este verificador, nos arquivos reais, SHA conferido)

| Lacuna | Reinjeção | Resultado |
| --- | --- | --- |
| **N9** — `<a>` sem `href` no rodapé sem env | `{url && (` → `{(url ?? true) && (` em `MobileLayout.tsx` | **morto por asserção** (2 casos de `TabBar.test.tsx`: "SEM a env…" e "só com espaços") ✅ |
| **N5** — env só com espaços | `?.trim()` removido de `shared/config/backoffice.ts` | **morto por asserção** (`TabBar.test.tsx` "a env só com espaços conta como ausente") ✅ |
| **N12** — pacote renomeado | `"name"` → `@estrelinha/atelie` | **morto por asserção** (`scaffold.test.ts` "`pnpm dev:mobile-adm` sobe o workspace…": `expected false to be true`; o sensor da régua também cai, porque o `mutar` dele perde o alvo e lança) ✅ |
| `MAF-17` / documentação | — | `prova-navegador.md:84-85` nomeia o voltar do Android na raiz como pendente ✅ |

### Buracos que os consertos poderiam ter criado

- **Rodapé por tag × `<button>` com o mesmo texto**: não é buraco. A régua nova assere
  `queryByText('Abrir o Backoffice')` nulo, que pega qualquer elemento com o texto, e
  `querySelector('a')` nulo, que pega qualquer âncora. Sonda H2 (`{(url ?? '#') && (`, âncora com
  `href="#"`) **morta**. O que escapa é só um controle com **outro** texto (sonda H1: `<button>` "Abrir
  o painel" sem env) — **sobrevive**; fechar exigiria `rodape.textContent` igual à frase. Gravidade
  baixa: ninguém escreve um CTA morto com outro nome por acidente.
- **`workspaceDoApp` exige `dev === 'vite'` literal**: é rígido para o lado seguro (um `vite --host`
  reprovaria sem defeito), não cego. Falso positivo possível, falso negativo não. Aceitável.
- **Achado de método (N12)**: medir N12 pelo arnês das rodadas anteriores
  (`pnpm --filter @estrelinha/mobile-adm exec vitest …`) devolve **exit 0 sem linha de `Tests`** — com
  o pacote renomeado, o **próprio comando do gate** não acha o workspace e não roda nada. Medido de
  dentro do app (`node_modules/.bin/vitest run`) ele morre. O guarda está certo; o gate local por
  `--filter` é que fica mudo diante dessa mutação. Lição `L-051`.

## Checagem pela spec (r3)

Sem mudança para MAF-01, 04..16, 18..21 (✅; as provas da r1/r2 seguem verdes). `MAF-03` passa a ✅
(N12 fechado; o build gerando `manifest.webmanifest`/`sw.js` segue provado por execução, declarado).
`MAF-12` fica ⚠️: os três passos e as recusas estão provados, mas o desfecho de **falha** do último
passo não tem caso (S09, abaixo).

**Contagem: 18/21 com prova completa · 1 com lacuna de cobertura (`MAF-12`) · 2 pendentes de
aparelho (`MAF-02`; a metade "na raiz sai do app" de `MAF-17`).**

**Pendentes com o usuário (não FAIL)**: instalação num Android de verdade, abertura em `standalone`
(`MAF-02`), voltar na raiz saindo do app (`MAF-17`), inset real e navegação por gestos (`MAF-15`).

## Sensor r3

Arnês em Python sobre os arquivos reais (SHA-256 antes/depois, substituição exata com contagem = 1,
senão inválido; suíte do `mobile-adm` inteira, `--testTimeout=20000`; morte classificada pelo log —
nenhuma por compilação). Sem `git stash`/`checkout`. Nenhum mutante repete os da r1/r2.

| # | Arquivo | Mutação | Resultado | Morte |
| --- | --- | --- | --- | --- |
| S01 | `shared/lib/useOnline.ts` | leitura sempre `true` | morto (8) | asserção |
| S02 | `shared/lib/useOnline.ts` | a limpeza não remove o ouvinte de `online` | morto | asserção |
| S03 | `app/OfflineScreen.tsx` | "Tentar de novo" com rede de volta não dispara `online` | morto | asserção |
| **S04** | `app/OfflineScreen.tsx` | "Ainda sem conexão." sem `role="status"` | **sobreviveu** | — |
| **S05** | `app/BootGate.tsx` | o portão sai só pelo piso, ignorando a sessão (`if (!pisoCumprido)`) | **sobreviveu** | — |
| S06 | `features/recovery/ui/RecoveryFlow.tsx` | o código não remove espaços antes de validar | sobreviveu — **fora da letra** (a spec não pede aceitar "123 456"); não contado como lacuna | — |
| S07 | idem | o relógio do reenvio nunca roda (`if (liberaEm > 0) return`) | morto | asserção |
| S08 | idem | código recusado pelo servidor avança para a senha | morto | asserção |
| **S09** | idem | `updatePassword` falha e **mesmo assim** chama `onEntrou()` | **sobreviveu** | — |
| S10 | idem | o recado do código deixa de nomear o e-mail | morto | asserção |
| **S11** | `widgets/account-menu/ui/AccountMenu.tsx` | "Sair" sem `disabled={saindo}` (toque duplo chama `signOut` duas vezes) | **sobreviveu** | — |
| S12 | idem | o e-mail de quem entrou some do menu | morto | asserção |
| S13 | idem | `aria-expanded` sempre `false` | morto | asserção |
| S14 | `features/splash/model/useMinimumDuration.ts` | piso de 600 → 1000 ms | morto (40) | asserção |
| **S15** | `pwa.config.ts` | `navigateFallback` removido | **sobreviveu** | — |
| S16 | `pwa.config.ts` | `woff2` fora do `globPatterns` | morto | asserção |
| S17 | `pwa.config.ts` | `start_url: "/pedidos"` | morto | asserção |
| S18 | `vercel.json` | manifest com `Content-Type: application/json` | morto | asserção |
| S19 | `vercel.json` | manifest com `max-age=86400` | morto | asserção |
| S20 | `vercel.json` | `installCommand` sem `cd ../..` e sem `--frozen-lockfile` | morto | asserção |
| **S21** | `pwa.config.ts` | `registerType: "prompt"` | **sobreviveu** | — |

Mais as 3 reinjeções (N9, N5, N12: mortas) e as 2 sondas de buraco (H2 morta, H1 sobreviveu, acima).

**Resultado: 21 injetados no sensor, 14 mortos (14 por asserção, 0 por compilação), 1 fora da letra
(S06), 6 sobreviventes (S04, S05, S09, S11, S15, S21).**

## Gates (um workspace por vez, exit code fora de pipe)

| Gate | Resultado | Exit |
| --- | --- | --- |
| `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | **128/18** | 0 |
| `pnpm --filter @estrelinha/store test --testTimeout=20000` | **5743/313** | 0 |
| `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **3648/207** | 0 |
| `tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` | 0 · 0 · 0 | 0 · 0 · 0 |

Bate com o orquestrador (128/18 · 5743/313 · 3648/207 · 0·0·0). mobile-adm 126/18 → 128/18 (+2: o
caso da env com espaços e o `workspaceDoApp` no caso existente com o sensor dele).

## Lacunas ranqueadas (r3)

1. **S09 — `MAF-12`, a falha do último passo não tem caso, e o mutante tem consequência séria.**
   `RecoveryFlow.tsx`, `gravarSenha`. O código verifica o código ANTES (`verifyRecoveryCode` abre a
   sessão). Se `updatePassword` falhar e o fluxo seguir para `onEntrou()`, o efeito do `LoginPage`
   leva a admin à Início **sem a senha nova gravada**, e o aviso de erro some com a tela: na próxima
   abertura ela não sabe a senha. Os três casos de `gravarSenha` cobrem a recusa local e os dois
   desfechos de sucesso; nenhum faz `updateUser` devolver erro. Conserto: um caso com
   `updateUser` → `{ error }` que assere o `alert` com a frase, `pathname` `/login` e o formulário da
   senha ainda na tela.
2. **S15 — `navigateFallback` sem régua** (`pwa.config.ts`, decisão de `design.md:93`, serve
   `MAF-19`). Sem ele, abrir offline num endereço que não é `/` (o PWA reabrindo em `/pedidos`, um
   link) não recebe a casca. `swSemDadosDaLoja.test.ts`/`manifest.test.ts` leem a configuração como
   dado e podem asserir `navigateFallback === '/index.html'`.
3. **S21 — `registerType: 'autoUpdate'` sem régua** (decisão da spec, linha *Atualização do app*, e
   mitigação de risco em `design.md:162`). Um `'prompt'` faria o bundle velho continuar até a Adri
   aceitar — o risco que a spec nomeia como maior.
4. **S05 — o portão da abertura sem prova em `/login`.** `App.routing.test.tsx` prova a splash
   enquanto a sessão não resolve só em rota guardada, onde o `fallback` do `RequireAdmin` a desenha
   de qualquer jeito. Reabrir em `/login` com a sessão em voo mostraria o formulário (violando
   `MAF-05`) com a suíte verde.
5. **S11 — "Sair" aceitando toque duplo**: `AccountMenu.test.tsx` clica uma vez. Baixa (o segundo
   `signOut` é inócuo hoje).
6. **S04 — "Ainda sem conexão." sem `role="status"`**: o teste lê por texto. Baixa e fora da letra
   (a spec não pede anúncio), registrada por ser o elemento que diz algo depois de um toque.
7. **H1 — controle com outro texto no rodapé sem env**: baixa (ver acima).

## Rastreabilidade sugerida (r3)

| ID | r2 | r3 |
| --- | --- | --- |
| MAF-03 | ⚠️ Needs Fix (N12) | ✅ Verified |
| MAF-12 | ✅ | ⚠️ Needs Fix (S09: desfecho de falha sem caso) |
| MAF-19 | ✅ | ✅ (S15 é decisão de design sem régua; a AC segue provada pela abertura em `/`) |
| MAF-02, MAF-17 | ⚠️ | ⚠️ pendente de aparelho, com o usuário |
| demais | ✅ | ✅ |

**Fim do laço (3/3): escalar ao usuário.** Nenhuma das lacunas é defeito no código de hoje; S09 é a
única cuja ausência de caso esconde uma consequência grave se o código mudar.

---

## Conserto pós-rodada 3 (orquestrador, 2026-10-22)

As 3 iterações do laço conserto → verificação se esgotaram com a r3 em FAIL por cobertura. O usuário
decidiu: **ajustar as lacunas**. Sem quarta rodada do Verificador. Quem fez o conserto também
reinjetou os mutantes, então é **autor = verificador** neste trecho, e isso fica declarado.

| Lacuna | Caso novo | Mutante reinjetado | Resultado |
| --- | --- | --- | --- |
| S09 (`MAF-12`) | `RecoveryFlow.test.tsx`: `updateUser` com erro ⇒ `alert` com `AUTH_ERROR_FALLBACK`, o passo da senha na tela, sem Início, `pathname` `/login` | o `return` depois de `setErro(error)` removido | morto (asserção) |
| S15 (`MAF-19`) | `swSemDadosDaLoja.test.ts`: `navigateFallback` é `/index.html` e a denylist não nega nenhuma rota do app | a linha do `navigateFallback` removida | morto (asserção) |
| S21 | idem: `registerType` é `autoUpdate` | `prompt` | morto (asserção) |
| S05 (`MAF-05`) | `App.routing.test.tsx`: reabrir em `/login` com a sessão em voo ⇒ splash, sem formulário | o `BootGate` saindo só pelo piso | morto (asserção) |
| S11 | `AccountMenu.test.tsx`: dois toques em "Sair" ⇒ `signOut` uma vez | o `disabled` removido | morto (asserção) |
| S04 | `semConexao.test.tsx`: a frase dentro de `role="status"`, e a região existindo vazia antes do toque | o `role="status"` removido | morto (asserção) |
| H1 | `TabBar.test.tsx`: sem a env, o rodapé não tem controle nenhum e o texto é só a frase | um `<button>` com outro texto no rodapé | morto (asserção) |

SHA-256 conferido na restauração dos 7. Gates: mobile-adm **135/18**, store **5743/313**, backoffice
**3648/207**, todos exit 0; tsc 0 · 0 · 0; lint do app 0.

**Pendente com o usuário** (aparelho): instalação num Android real, abertura em `standalone`
(`MAF-02`), o voltar na raiz saindo do app (metade de `MAF-17`), o inset real e os gestos (`MAF-15`).
**Dívida fora do escopo**: `BL-048` (`checkAdmin`), antes da `73`.


---

# Fase 6 — verificação independente

**Data**: 2026-10-22 · **Escopo**: `MAF-22`..`MAF-30` (a rodada de conserto do QA) e a parte de `MAF-01`..`MAF-21` que ela podia quebrar (login, recuperação, `rotasSobGuarda`, `BootGate`, offline) · **Diff**: working tree contra `b6449bd2` (nada commitado) · **Verifier**: sub-agente independente (autor ≠ verificador), sem consertar nada.

## Veredito: **FAIL ❌** (por cobertura; nenhum AC com comportamento errado no código de hoje)

As nove ACs estão implementadas e o comportamento que testei passa, mas sete mutantes meus sobrevivem, e três deles moram em cima da letra de uma AC (`MAF-23` e `MAF-24`). Dois testes que o autor conta como prova são vazios por construção do arnês, e há uma corrida nova no `retryAdminCheck`.

## Gates (um workspace por vez, `--testTimeout=20000` sem `--`, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| mobile-adm | **204/22**, exit 0 |
| store | **5743/313**, exit 0 |
| backoffice | **3651/207**, exit 0 |
| core | **3507/138**, exit 0 |
| `tsc --noEmit` | `apps/mobile-adm/tsconfig.app.json` 0 · `apps/store/tsconfig.app.json` 0 · `apps/backoffice/tsconfig.app.json` 0 · `apps/mobile-adm/tsconfig.node.json` **0** (o autor citava 2 × TS6307 nele; com `--noEmit -p` saiu limpo) |
| build do app (`vite build --outDir` no scratchpad) | verde; `dist/index.html` traz `rel="icon"` e o SVG do lockup **byte a byte** (1 ocorrência), `dist/icons/icon-192.png` existe |

Bate com o que o autor mediu.

## `packages/auth` é aditivo?

**Sim, para quem só lê `isAdmin`.** `isAdmin = adminStatus === 'admin'`; antes a falha dava `false` e agora dá `unknown`, que também dá `isAdmin === false`. A loja não lê `isAdmin` nem `adminStatus` (`grep` em `apps/store/src`). Exportações novas: `ADMIN_CHECK_TIMEOUT_MS`, `AdminStatus`, `AUTH_RATE_LIMITED`, `ACCESS_UNCHECKED`. `RATE_LIMITED` continua com o mesmo literal.

- **A conta sem papel continua recusada**: no painel, pelo `AdminLoginPage.test.tsx` (a vizinha `not-admin`); no app, por `papelEmTresEstados.test.tsx:223` e `RequireAdminFallback.test.tsx:93`.
- **Asserções antigas do painel e da loja**: `git diff b6449bd2 -- apps/backoffice` só **acrescenta** um `describe` em `AdminLoginPage.test.tsx`, sem uma linha removida. Em `apps/store` mudaram `buttonShape.test.ts` (a régua passou a ler o dono da escala em `packages/ui/src/tokens`) e `palette.test.ts` (só acréscimos). As duas mudanças são das fases anteriores (o dono da paleta), não da Fase 6.
- **Duas mudanças de comportamento que a spec admite, mas que não estão escritas**: (1) na loja, com `getSession` pendurado, `loading` agora vira `false` aos 8 s com `user = null`, e a loja passa a se desenhar como deslogada em vez de ficar carregando para sempre. É o teto que `MAF-22` pede para o provider compartilhado. (2) No painel, `RequireAdmin` com `unknown` desenha a frase em vez do `Navigate` ao login, que é o que `MAF-23` pede.

## Checagem ancorada na spec

| AC | Resultado pedido pela spec | Prova (`file:line` — asserção) | Resultado |
| --- | --- | --- | --- |
| MAF-22 | três estados; `unknown` na falha ou com 8 s de silêncio; teto também na sessão | `papelEmTresEstados.test.tsx:46` `toBe(8000)`; `:69-74` falha ⇒ `unknown`; `:77-84` 7.999 carregando, 8.000 `unknown`; `:87-93` sessão pendurada; `:96-109` um teto só | ✅, com lacunas: o ramo `catch` de `checkAdmin` (V01), a rejeição de `getSession` (V03) e o teto do cadastro (V26) não têm régua |
| MAF-23 | a frase + "Tentar de novo"; nunca a recusa; nunca "Sair"; sessão não apagada; splash ≤ 8 s; painel sem a recusa falsa | `papelEmTresEstados.test.tsx:140-148` (frase, botão, sem recusa, sem Sair, `signOut` não chamado, sessão do dublê intacta); `:151-161` splash sai aos 8.000; `:189-203` o fallback do guarda; `AdminLoginPage.test.tsx` (`MAF-23`) | ✅, com uma lacuna: os 8 s só são provados com o **papel** pendurado. Com o **cadastro** (`customers`) pendurado junto, que é o caso real de Wi-Fi sem saída, o teto dele não tem régua (V26). Prova do `localStorage`: só por proxy (o dublê não usa armazenamento; a prova é `signOut` não chamado e V04 morto) |
| MAF-24 | rota própria fora do guarda; cada passo no histórico; o voltar volta um passo e, do primeiro, volta ao Login; e-mail fora da URL; passo do meio direto ⇒ primeiro | `rotasSobGuarda.test.ts:27,90`; `passosSaoRotas.test.ts`; `RecoveryFlow.test.tsx:235-251` (código⇒e-mail⇒login; senha⇒código); `:253-266` e-mail fora do endereço; `:267-276` sem estado ⇒ `/recuperar` | ⚠️ **duas provas vazias**: `:226-232` ("do primeiro passo volta ao Login") passa com o `navigate` de "Esqueci minha senha" trocado por `replace` (V16), porque o histórico do jsdom guarda um `/login` de um teste anterior. E `:279-283` ("só o e-mail, sem o código conferido") passa sem a exigência de `conferido` (V12), porque `montarApp` faz `pushState({}, …)` e apaga o estado que o teste tinha acabado de gravar. Na prática ele repete o caso "sem estado" |
| MAF-25 | 429 ⇒ passo do código, "Já enviamos um código há pouco para <e-mail>.", reenvio contando | `RecoveryFlow.test.tsx:305-321`; a vizinha 500 em `:322-328` | ✅ (V14 e V15 mortos) |
| MAF-26 | "Informe o e-mail e a senha." sem rede | `LoginPage.test.tsx` (CAMPOS_VAZIOS) | ✅ para os campos vazios. ⚠️ Lacuna de precisão na spec: um e-mail **só de espaços** não tem régua (V17 sobrevive) |
| MAF-27 | ícone declarado; ele responde 200 | o teste do `index.html` (V18 morto, porque confere o arquivo no disco); o build traz `dist/icons/icon-192.png` | ✅ (o 200 servido é do autor, em `prova-navegador.md`) |
| MAF-28 | splash no HTML, do MESMO arquivo, sem cor digitada, sem salto | `splashEstatica.test.tsx` (V19, V20 e V25 mortos); build: o lockup aparece byte a byte; `splashEstatica.ts` sem hex, as cores vêm de `ESTRELINHA_COLORS` | ✅ ("sem salto": as caixas medidas em navegador são do autor) |
| MAF-29 | título "Pedidos · Ateliê"; foco no título da página | `anuncios.test.tsx` (V21 e V22 mortos) | ✅ |
| MAF-30 | "Sem conexão" numa região viva assertiva | `semConexao.test.tsx` (V23 morto) | ✅ |

**9/9 ACs com prova, e 2 delas (`MAF-23`, `MAF-24`) com metade da prova vazia ou ausente.**

**Regressões em `MAF-01`..`21`**: nenhuma. Login, recusa, `rotasSobGuarda`, `BootGate` e offline passam inteiros. V24 (`/recuperar/codigo` movido para dentro do guarda) derruba 23 casos. As duas asserções de `RecoveryFlow.test.tsx` cujo `pathname` mudou (`:129` e `:176`, agora `/recuperar/senha`) continuam provando o que provavam ("fica no passo e ninguém entra"): ao lado delas seguem `getByLabelText('Senha nova')` e a ausência do título "Início".

## Sensor (28 mutantes meus, nos arquivos reais)

Arnês: `mut.py` no scratchpad. Cada troca tem de aparecer exatamente uma vez no arquivo, senão o mutante é inválido. Ele mede o SHA-256 antes, roda o vitest do workspace (e o do painel quando o arquivo é de `packages/auth`), restaura e confere o SHA. Sem `git stash` e sem `checkout`. Inválidos: 0. SHA conferido: 28/28.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| V01 | `packages/auth/src/AuthContext.tsx` | `checkAdmin`: exceção ⇒ `not-admin` | **SOBREVIVE** (app + painel verdes) |
| V02 | idem | o teto da sessão não marca `unknown` | morto, 2, asserção |
| V03 | idem | `getSession` rejeitado ⇒ `not-admin` | **SOBREVIVE** |
| V04 | idem | `retryAdminCheck` chama `signOut` antes de reler | morto, 4, asserção |
| V05 | idem | dois tetos na abertura | morto, 1, asserção |
| V06 | idem | `unknown` guardado como resolvido (`resolvedFor = u.id`) | **SOBREVIVE** (a spec não pede; comentário do código) |
| V07 | `packages/auth/src/RequireAdmin.tsx` | `unknownFallback` ignorado | morto, 1, asserção |
| V08 | `apps/mobile-adm/src/app/App.tsx` | sem `unknownFallback` (cai no padrão do painel) | morto, 1, asserção |
| V09 | `apps/backoffice/.../AdminLoginPage.tsx` | "Tentar de novo" sem `setEntrando` | morto, 1, asserção |
| V10 | idem | `unknown` só sem `user` | morto, 2, asserção |
| V11 | `apps/mobile-adm/src/pages/LoginPage.tsx` | `unknown` com `user` cai no formulário | morto, 1, asserção |
| V12 | `features/recovery/ui/RecoveryFlow.tsx` | passo da senha sem exigir `conferido` | **SOBREVIVE** |
| V13 | idem | e-mail na query do passo do código | morto, 1, asserção |
| V14 | idem | o 429 com o aviso de envio normal | morto, 1, asserção |
| V15 | idem | o 429 sem o reenvio contando | morto, 1, asserção |
| V16 | `pages/LoginPage.tsx` | "Esqueci minha senha" com `replace` (o voltar sai do app) | **SOBREVIVE** |
| V17 | idem | e-mail só de espaços vai à rede | **SOBREVIVE** (precisão da spec) |
| V18 | `apps/mobile-adm/index.html` | o ícone aponta para um arquivo que não existe | morto, 1, asserção |
| V19 | `splashEstatica.ts` | fundo `primary` em vez de `primary-strong` | morto, 1, asserção |
| V20 | idem | rótulo diferente do da `Splash` | morto, 1, asserção |
| V21 | `app/layout/MobileLayout.tsx` | o título do documento não muda | morto, 2, asserção |
| V22 | idem | o foco vai ao `<main>`, não ao `h1` | morto, 2, asserção |
| V23 | `app/OfflineScreen.tsx` | sem `role="alert"` | morto, 1, asserção |
| V24 | `app/App.tsx` | `/recuperar/codigo` dentro do guarda | morto, 23, asserção |
| V25 | `splashEstatica.ts` | sem o par de movimento reduzido | morto, 1, asserção |
| V26 | `AuthContext.tsx` | o cadastro (`fetchCustomer`) sem teto | **SOBREVIVE** |
| V27 | `AdminLoginPage.tsx` | "Tentar de novo" não refaz a consulta | morto, 1, asserção |
| V28 | `RecoveryFlow.tsx` | o passo do código com `replace` | morto, 1, asserção |

**28 injetados, 21 mortos (21 por asserção, 0 por compilação), 7 sobreviventes.**

## Corridas (sondas executadas sobre o `AuthProvider` real, arquivo temporário já removido)

| Sonda | Cenário | Medido | Leitura |
| --- | --- | --- | --- |
| P1 | a sessão cai (`SIGNED_OUT`) com a consulta do papel em voo, e a consulta responde depois | `admin\|true\|false\|a@x.invalid`: a conta deslogada **volta** como admin | **Já existia** em `b6449bd2` (o mesmo `await` sem conferir identidade). A Fase 6 não piorou e o teto limita a janela a 8 s. As gravações seguem barradas pela RLS. Baixa |
| P2 | o papel responde DEPOIS do teto | fica `unknown` até o "Tentar de novo" | correto: a resposta atrasada não mexe em nada |
| P3 | "Tentar de novo" enquanto a leitura de sessão anterior ainda está pendurada; a anterior responde `admin` e a do retry nunca responde | `unknown → admin → unknown` 8 s depois: o temporizador do retry **apaga** um `admin` já conferido | **Nova na Fase 6**: o temporizador de `lerSessao` marca `unknown` sem conferir se outra resolução já terminou. No supabase-js as duas `getSession` esperam o mesmo `initializePromise`, então é improvável na prática, e o "Tentar de novo" seguinte conserta. Baixa |
| P4 | dois toques seguidos em "Tentar de novo" | `admin`, 2 consultas | correto |

O login novo durante uma checagem pendurada não é alcançável pela interface: no app e no painel o botão fica desabilitado enquanto `loading` é verdadeiro. Só seria por outra aba, e aí cai no caso P1.

## Lacunas ranqueadas (viram tarefas de conserto)

1. **`MAF-24`, "do primeiro passo volta ao Login", tem prova vazia** (V16). `RecoveryFlow.test.tsx:226` passa por causa de um `/login` que um teste anterior deixou no histórico do jsdom. Conserto: começar o teste com o histórico conhecido (contar `history.length`, ou conferir que a entrada anterior é a do próprio teste) e exigir que o mutante `replace` morra.
2. **`MAF-23`, "a splash sai em no máximo 8 s", não alcança o cadastro** (V26). O dublê só sabe pendurar `user_roles`. Com Wi-Fi sem saída, `customers` também fica pendurado, e o teto dele (`comTeto(fetchCustomer…)`) pode sumir sem nada acusar. Conserto: um `pendurarCadastro()` no dublê e um caso com os dois pendurados.
3. **`MAF-24`, "só o e-mail, sem o código conferido", é um teste vazio** (V12). `montarApp` faz `pushState({}, …)` e apaga o `replaceState` que o teste gravou antes. Conserto: `montarApp` aceitar um estado, ou o teste montar com `pushState({ usr: { email } })`.
4. **`MAF-22`, "falha" só é provada na forma `{ error }`** (V01, V03). O `catch` de `checkAdmin` e a rejeição de `getSession` podem virar `not-admin` (a recusa falsa da `BL-048`, por outra porta) sem nada acusar. Conserto: o dublê lançar na consulta do papel e rejeitar em `getSession`, um caso cada.
5. **A corrida P3**: o temporizador de `lerSessao` não confere se outra resolução já terminou. Conserto de código, com o caso de P3 como régua.
6. Precisão da spec, baixa: V17 (e-mail só de espaços) e V06 (`unknown` não fica guardado como resolvido) não têm AC que os nomeie. Decidir se entram.

## Qualidade

As mudanças são cirúrgicas e seguem os padrões do repositório: a frase mora em `core/auth` como dona única, `RequireAdmin` ganhou só props opcionais, e o painel mudou só o ramo `unknown`. Os testes seguem as ACs e montam a árvore real (`<App />` sobre o `AuthProvider` de verdade). O defeito de método está nas duas provas vazias do item 1 e do item 3.

# Fase 6 — verificação r2

**Data**: 2026-10-22 · **Escopo**: o conserto r1 (`tasks.md`, "Fase 6 — conserto r1") e o impacto dele na loja e no painel · **Diff**: working tree contra `b6449bd2` · **Verifier**: sub-agente independente (autor ≠ verificador), sem consertar nada. Arnês: `mut.py` da r1 (troca casada exatamente uma vez, SHA-256 antes e depois, sem `git stash`/`checkout`); a árvore inteira (145 arquivos modificados ou novos) teve o SHA conferido depois do sensor, idêntica.

## Veredito: **FAIL ❌** — um AC falso contra o supabase-js de verdade, e uma regressão na loja

Os sete sobreviventes da r1 e as duas corridas morrem. A `geracao` está certa no que eu consegui alcançar. Mas o dublê não emite dois eventos que o supabase-js emite sozinho, e os dois mudam o resultado.

## Gates (um por vez, `--testTimeout=20000` sem `--`, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| mobile-adm | **237/23**, exit 0 |
| store | **5743/313**, exit 0 |
| backoffice | **3653/208**, exit 0 |
| core | **3507/138**, exit 0 |
| `tsc --noEmit` | mobile-adm `app` 0 · store `app` 0 · backoffice `app` 0 · mobile-adm `node` 0 |

Bate com o que o autor mediu.

## Sobreviventes da r1, reinjetados

| # | Resultado |
| --- | --- |
| V01 `checkAdmin` exceção ⇒ `not-admin` | morto, 4 (mobile-adm), asserção |
| V03 `getSession` rejeitado ⇒ `not-admin` | morto, 2, asserção |
| V06 `unknown` guardado como resolvido | morto, 1, asserção |
| V12 senha sem `conferido` | morto, 1, asserção |
| V16 "Esqueci" com `replace` | morto, 2, asserção |
| V17 e-mail só de espaços vai à rede | sobrevive, **equivalente confirmado**: no Chromium 1228 (Playwright), `type="email"` digitado com três espaços dispara três `input` com `value === ''`, `fill('   ')` lê `''` e `' a@b.co '` lê `'a@b.co'`. O WebKit instalado não bate com a versão do Playwright, então o Safari não foi medido; a sanitização é da especificação do HTML |
| V26 cadastro sem teto | morto, 2, asserção |
| P1 resposta velha do papel aceita | morto, 2 (mobile-adm) + 1 (backoffice), asserção |
| P3 teto da leitura sem conferir a geração | morto, 2, asserção |

## Impacto da sessão com erro ⇒ `unknown` na loja e no painel

Medido com **sondas sobre o supabase-js 2.110.7 de verdade** (`createClient` com `storage` em memória e `fetch` falso; arquivo temporário em `apps/mobile-adm/src/app/__tests__`, removido), não sobre o dublê.

1. **`MAF-22` "a leitura da sessão com `{ error }` é `unknown`, nunca 'sem sessão'" é falso no client real.** Com a sessão salva vencida e a renovação falhando por rede, a sequência medida foi `not-admin|true|ninguém` → `unknown|false|ninguém` (o teto, aos 8 s) → **`not-admin|false|ninguém`** cerca de 40 s depois. O supabase-js tenta renovar por ~30 s e, quando a leitura falha, o `_emitInitialSession` chama o ouvinte com **`INITIAL_SESSION` e sessão `null`** (`GoTrueClient.js:3603`). O ouvinte chama `loadUserData(null)`, que sobe a geração e grava "sem sessão". No app a tela sai sozinha de "Não consegui conferir seu acesso." para o Login, com a sessão ainda salva (o erro é retentável e o supabase-js não a apaga). No painel, `RequireAdmin` passa de "Não consegui conferir" para o `Navigate` ao login. O dublê (`fakeSupabase.ts`) não emite `INITIAL_SESSION`, então o caso `falhaDaSessao = 'erro'` prova uma ordem de eventos que não acontece. A mesma rota vale para `getSession` que lança ou rejeita: o `_emitInitialSession` cai no `catch` e emite `null`.
2. **Loja: o checkout se desmonta a cada volta da aba quando o papel não foi conferido.** Com a precisão "`unknown` nunca é guardado como resolvido" (V06 morto), quem tem `adminStatus === 'unknown'` paga `loading = true` em todo evento de auth. O supabase-js emite **`SIGNED_IN` a cada `visibilitychange` para visível** (`_recoverAndRefresh`, `GoTrueClient.js:4078`). Medido: papel com falha de rede ⇒ `unknown|false|adri@…`; disparar `visibilitychange` ⇒ `SIGNED_IN` ⇒ **`unknown|true|adri@…`**, e o `user_roles` volta a ser pedido (o PostgREST tenta 4 vezes, 1 + 2 + 4 s, ~7 s). Na loja, todo cliente passa por `checkAdmin`, e `CheckoutPage.tsx:293` desenha `Carregando...` enquanto `loading` é verdadeiro: a página inteira se desmonta e perde o estado local (`confirmed`, `editing`, o Brick do cartão). `AccountPage.tsx:131` faz o mesmo. Em `b6449bd2` a falha virava `false` e o `resolvedFor` era gravado, então isso não acontecia. A condição é que a consulta do papel de uma cliente tenha falhado ou estourado o teto uma vez, o que no 3G do celular é plausível. Essa mudança de comportamento **não está** na lista de "mudanças aceitas fora do app" da `spec.md`.
3. Sem regressão para a loja nas três formas de falha **na abertura**: lá ela lê só `user` e `loading`, e o resultado (`user = null`, `loading = false`) é o mesmo de antes para `{ error }`. Para a exceção síncrona fica melhor (antes ficava carregando para sempre). A loja não lê `adminStatus`, `isAdmin` nem `retryAdminCheck` (`grep` em `apps/store/src`).
4. Fora do conserto, mas medido junto: com a nova régua de 8 s, uma cliente cujo `customers` passa do teto fica com `customer = null` pelo resto da sessão (o papel `not-admin` é guardado como resolvido). Antes da `72` não havia teto e a resposta chegava. Baixa.

## O buraco do conserto (`geracao`/`identidade`)

- **`TOKEN_REFRESHED` do mesmo usuário com a checagem em voo**: cai no `emVoo === u.id` e volta sem subir a geração, então não invalida nada e o `loading` não fica preso. Li o código em todas as ordens que consegui montar (retry com papel em voo, retry com leitura pendurada, `SIGNED_OUT` + `SIGNED_IN` com a resposta velha em voo, leitura velha descartada pela identidade). Toda geração vigente termina por teto, por resposta ou pela saída. Não achei `loading` eterno.
- **`renovarToken` do dublê**: tem paridade com o `TOKEN_REFRESHED` (mesma sessão, mesmo usuário). O que falta ao dublê são os **dois eventos acima**, o `INITIAL_SESSION` (inclusive o nulo da falha) e o `SIGNED_IN` da volta da aba. São eles que produzem os achados 1 e 2.
- **Dedupe sem régua** (N04, abaixo): tirar o `emVoo` não derruba nada. Com o client real, `getSession` e `INITIAL_SESSION` chamam `loadUserData` com o mesmo usuário na abertura. Sem o dedupe as duas consultas saem em dobro, e depois da abertura um evento no meio da checagem reabre o teto inteiro, então a espera passa de 8 s.

## Sensor r2 (17 mutantes novos, pontos que a r1 não cobriu)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N01 | `AuthContext.tsx` | `fetchCustomer` relança a exceção | **sobrevive — equivalente**: `comTeto` resolve `null` na rejeição |
| N02 | idem | teto 0 depois da abertura | morto, 5 + 2, asserção |
| N03 | idem | a abertura nunca fecha (`inicioDaAbertura` não zera) | morto, 1, asserção |
| N04 | idem | sem o dedupe `emVoo` | **SOBREVIVE** |
| N05 | idem | "Tentar de novo" sem `loading` | morto, 2, asserção |
| N06 | idem | a identidade não sobe numa conta nova | morto, 1, asserção |
| N07 | idem | o teto do papel vira `not-admin` | morto, 5, asserção |
| N08 | idem | identidade nova sem `loading` | morto, 2, asserção |
| N09 | `RequireAdmin.tsx` | o ramo `unknown` inalcançável | morto, 9, asserção |
| N10 | idem | o "Tentar de novo" padrão do painel não refaz | morto, 1 (mobile-adm; o recorte do painel não o vê), asserção |
| N11 | `AcessoNaoConferido.tsx` | o botão não chama `retryAdminCheck` | morto, 3, asserção |
| N12 | `RecoveryFlow.tsx` | código conferido grava `conferido: false` | morto, 9, asserção |
| N13 | `OfflineScreen.tsx` | `aria-live="polite"` | morto, 1, asserção |
| N14 | `tabs.ts` | título com outro separador | morto, 2, asserção |
| N15 | `core/auth/errors.ts` | a frase do `unknown` trocada | morto, 15 + 1, asserção (core não tem caso; o painel e o app pegam) |
| N16 | `LoginPage.tsx` | Entrar habilitado com a checagem em voo | morto, 1, asserção |
| N17 | `AuthContext.tsx` | sessão com `{ error }` não destrava o `loading` | morto, 2, asserção |

**17 injetados: 15 mortos (15 por asserção, 0 por compilação), 1 equivalente (N01), 1 sobrevivente (N04).** Mais as 9 reinjeções da r1: 8 mortas, V17 equivalente. SHA conferido 26/26, nenhum inválido.

## Lacunas ranqueadas

1. **`MAF-22`/`MAF-23` contra o client real**: o `INITIAL_SESSION` nulo da leitura que falhou desfaz o `unknown` e manda ao Login (painel e app) quem tem a sessão salva. O dublê precisa emitir o `INITIAL_SESSION` como o supabase-js emite, o nulo na falha incluído, e a régua passa a ser essa ordem de eventos. *(defeito de produto + dublê sem paridade, L-055)*
2. **Loja: a precisão "`unknown` nunca resolvido" desmonta o checkout e a conta a cada volta da aba** quando o papel de uma cliente falhou uma vez. Decidir: ou o recarregamento do papel não pisca o `loading` de quem já tem `user` (a loja não depende do papel), ou a mudança entra explicitamente na lista de comportamentos aceitos. *(spec_precision_gap, L-056)*
3. **N04**: o dedupe `emVoo` não tem régua. Com o client real ele é o que impede a consulta em dobro na abertura e o teto reaberto no meio da checagem. *(baixa)*
4. Ficou só no Chromium: a equivalência do V17 no WebKit (Safari do iPhone). *(baixa)*

# Fase 6 — verificação r3

**Data**: 2026-10-22 · **Escopo**: o conserto r2 (`tasks.md`, "Fase 6 — conserto r2"), o logout de verdade, o checkout e a cópia do arnês · **Diff**: working tree contra `b6449bd2` · **Verifier**: sub-agente independente (autor ≠ verificador), rodada 3 de 3, sem consertar nada. Arnês: `mut.py` (troca casada exatamente uma vez, SHA-256 antes e depois, sem `git stash`/`checkout`). Sondas temporárias em `apps/*/src/**/__tests__/zz*`, todas removidas; SHA dos 147 arquivos modificados ou novos conferido antes e depois de tudo: **idêntico**.

## Veredito: **FAIL ❌** (por cobertura; nenhum defeito de produto no código de hoje)

Os dois defeitos da r2 sumiram contra o client real. O logout de verdade funciona nas três formas. O checkout não desmonta. Mas 4 dos meus 12 mutantes novos sobrevivem com consequência real: os resets das refs no logout e no "Tentar de novo" não têm régua. Mais 4 sobreviventes são equivalentes ou de baixo valor.

## Os defeitos da r2, contra o supabase-js 2.110.7 real

Sonda própria (`createClient` com `fetch` e `storage` meus, independente do `clientReal.ts` do autor), com `autoRefreshToken` **falso e verdadeiro**. Produção usa o padrão, que é `true` (`packages/supabase/src/client.ts`), e o arnês do autor usa `false`.

| Sonda | Medido | Leitura |
| --- | --- | --- |
| D1, sessão vencida e renovação sem rede, 70 s | `not-admin\|true` ⇒ `unknown\|false` aos 8 s, e **fica** `unknown`. Eventos: `INITIAL_SESSION:null`. Sessão salva: sim. Tela do `<App />`: "Não consegui conferir seu acesso." aos 9 s **e** aos 69 s | defeito 1 sumiu, nos dois modos |
| D2, papel `unknown`, `visibilitychange`, resposta com 700 ms | segundo `SIGNED_IN:com` emitido, `user_roles` de 4 para 8 pedidos, nenhuma transição no histórico (`loading` nunca `true`) | defeito 2 sumiu, nos dois modos |

Um achado de arnês meu: `visibilitychange` despachado **sem** `bubbles` não chega ao ouvinte do supabase-js (ele escuta em `window`). A primeira versão da D2 passava sem emitir o `SIGNED_IN`. Refeita com `bubbles: true` e exigindo **dois** `SIGNED_IN`.

**R1 a R6 do autor**, reescritos por mim (o autor não deixou as strings) e reinjetados: **6 mortos, todos por asserção**. R1 derruba 8 no app; R2 4 no app e 1 na loja; R3 2; R4 1; R5 2 no app e 1 na loja; R6 6. SHA ok.

## Logout de verdade (client real, `autoRefreshToken` falso e verdadeiro)

| Caso | Eventos | Estado | Tela do `<App />` |
| --- | --- | --- | --- |
| Refresh token revogado na abertura, `400 invalid_grant` | `SIGNED_OUT:null`, `INITIAL_SESSION:null` | `not-admin\|false\|ninguém` em 100 ms, sem passar por `unknown`; sessão apagada do storage | splash, depois `/login` com o formulário |
| O mesmo com `401` | idem | idem | idem |
| Revogado com o app ABERTO (`auto=true`, o ticker renova até o token vencer) | `SIGNED_OUT:null` | sai de `admin` para `not-admin\|false\|ninguém` | (mesmo estado da linha acima ⇒ Login) |
| Revogado, aba escondida, volta depois de vencer | `SIGNED_OUT:null` | idem | idem |
| Storage sem sessão | `INITIAL_SESSION:null` | `not-admin\|false\|ninguém`, nunca `unknown` | splash, depois `/login` |
| `signOut` de outra aba (dois clients, mesmo storage e mesma `storageKey`, `BroadcastChannel` do Node) | `SIGNED_OUT:null` chega pela difusão | `admin` ⇒ `not-admin\|false\|ninguém` | (mesmo estado ⇒ Login) |

Ignorar o `INITIAL_SESSION` nulo não prende ninguém no `unknown`: nos três casos de logout o client emite `SIGNED_OUT`, ou `getSession` devolve sessão ausente sem erro. No caso do `400`, `getSession` devolve `{ session: null, error }`. Isso daria `unknown`, mas o `SIGNED_OUT` vem antes (o `_removeSession` roda dentro da renovação) e o `setTimeout(0)` do ouvinte grava "sem sessão" por último. Medido: o histórico nem chega a mostrar o `unknown`.

Edge case da spec ("a sessão expira com o app aberto ⇒ a próxima leitura com 401 leva ao Login"): ✅ pelas linhas 3 e 4.

## Checkout

- **Leitura**: `CheckoutPage.tsx:115` lê `loading` do mesmo contexto, e `:293` desenha "Carregando..." com ele, igual à `AccountPage`. O efeito de `:236-242` depende de `user?.id`, que não muda num `SIGNED_IN` do mesmo usuário.
- **Sonda** (temporária, removida): o cabeçalho de `CheckoutPage.test.tsx`, com o dublê do client trocado pelo `clientReal` e o `AuthProvider` real em volta. Com o papel `falha` e com `admin`, depois de `voltarAba()` e 1,2 s em passos de 50 ms: nunca "Carregando...", e a região "Contato" é **o mesmo nó**. O papel `falha` repergunta (4 ⇒ 5 pedidos). **Discrimina**: com o `AuthContext.tsx` do conserto r1 a mesma sonda vê "Carregando..." e o nó muda.
- **Lacuna baixa**: não há régua permanente no checkout. Ele fica protegido só pela régua da conta, porque lê o mesmo `loading`.

## Cópia do arnês

`apps/mobile-adm/src/test/clientReal.ts` e `apps/store/src/test/clientReal.ts`: `diff` mostra **só** o comentário do cabeçalho (linhas 7 a 12), e o código é idêntico hoje. SHAs diferentes por causa do comentário. **Não há guarda que compare as duas**, e o `CLAUDE.md` da raiz (defeito 01, consequência 3) pede uma para cópia deliberada. Lacuna média-baixa: hoje elas não divergem, mas nada impede que divirjam. Uma divergência no `fetchFalso` ou no `voltarAba` faria a loja provar uma ordem de eventos diferente da do app. A régua seria: ler as duas do disco, tirar o comentário do topo, exigir igualdade, e ter um sensor que muda uma linha. A mais, as duas usam `autoRefreshToken: false` e produção usa `true`. Minhas sondas mostram que os defeitos e os logouts se comportam igual nos dois modos, mas o arnês não cobre o ticker.

## Gates (um por vez, `--testTimeout=20000` sem `--`, exit code fora de pipe)

| Medida | Resultado |
| --- | --- |
| mobile-adm | **249/24**, exit 0 |
| store | **5745/314**, exit 0 |
| backoffice | **3653/208**, exit 0 |
| core | **3507/138**, exit 0 |
| `tsc --noEmit` | store `app` 0 · backoffice `app` 0 · mobile-adm `app` 0 · mobile-adm `node` 0 |

Bate com o que o autor mediu.

## Sensor r3 (12 mutantes novos em `AuthContext.tsx` e no ouvinte)

Cada mutante rodou contra o app inteiro e contra **todos** os arquivos de teste com o `AuthProvider` real na loja (`authContext.test.tsx`, `contaSobreviveAVoltaDaAba.test.tsx`) e no painel (`papelDaSessaoQueCaiu.test.tsx`, `ChangePasswordCard.test.tsx`). Os outros testes desses dois workspaces dublam `@estrelinha/auth` e não alcançam o provider. Nenhum inválido, SHA ok 18/18 (contando R1 a R6).

| # | Mutação | Resultado |
| --- | --- | --- |
| X01 | o `INITIAL_SESSION` com sessão não confere a identidade | morto, 1, asserção |
| X02 | o caminho "já resolvido" não chama `setLoading(false)` | sobrevive, **equivalente** (lido: esse caminho só é alcançado com `loading` já falso; o "Tentar de novo" zera `papelDe`/`cadastroDe` e não passa por ele) |
| X03 | o mesmo caminho não chama `setUser(u)` | sobrevive, **equivalente na prática**: o objeto do usuário deixa de ser atualizado num `USER_UPDATED`, mas nenhum app lê `user_metadata` (`grep`). Já existia em `b6449bd2` |
| X04 | só `admin` fica guardado; `not-admin` é reperguntado a cada evento | **SOBREVIVE**. Toda cliente da loja pede `user_roles` a cada volta da aba e a cada renovação de token. No app, uma conta sem papel cuja repergunta falha passa da recusa para "Não consegui conferir". R5 só prova o caso `admin` |
| X05 | o logout não zera `presente` | **SOBREVIVE**. Sonda: sair e entrar com a mesma conta ⇒ `loading` não sobe, e por ~500 ms a tela fica `not-admin\|false\|ninguém` com a sessão já criada (a família do `BUG-20260802`) |
| X06 | o logout não zera `emVoo` | **SOBREVIVE**. Sonda: sair com a checagem em voo e entrar de novo com a mesma conta ⇒ **nenhuma** transição em 10 s: entrou e a tela segue deslogada |
| X07 | o "Tentar de novo" não zera `emVoo` | **SOBREVIVE**. Sonda: "Tentar de novo" com a repergunta da volta da aba em voo ⇒ `unknown\|true` por 20 s, **splash/spinner eterno** |
| X08 | `naoSei` não fecha a abertura | morto, 2, asserção |
| X09 | o ouvinte chama `loadUserData` na hora, sem `setTimeout(0)` | sobrevive. É a armadilha do 401 (`BUG-20260802`), anterior à `72`. O `fetch` falso do `clientReal` não confere o `Authorization`, então nenhum arnês vê o efeito (L-055/"dublê que não enxerga") |
| X10 | o logout grava `unknown` em vez de `not-admin` | morto, 55 (app) + 1 (painel), asserção |
| X11 | `lerSessao` não descarta a leitura velha pela identidade | morto, 1, asserção |
| X12 | a repergunta pede sempre o cadastro | sobrevive, baixa: um pedido a mais por evento quando só o papel falta, sem efeito na tela |

**12 injetados: 6 mortos (6 por asserção, 0 por compilação), 6 sobreviventes (X02 e X03 equivalentes; X04, X05, X06, X07 com consequência; X09 e X12 baixos).** Mais os 6 do autor reinjetados: 6 mortos. As consequências de X05, X06 e X07 foram medidas com sonda sobre o client real, com o código atual como controle (nos três o controle chega a `admin|false`).

## Lacunas ranqueadas (r3)

1. **X07 e X06, a re-entrada sem régua**: "Tentar de novo" com uma repergunta em voo, e logout com a checagem em voo seguido de login da mesma conta. Apagar o reset de `emVoo` prende o app (spinner eterno, ou a sessão nova ignorada) com a suíte verde. Um caso para cada um, sobre o client real (o molde da sonda está em `zzR3Sobrev.tsx.txt`, no scratchpad r3v). *(cobertura, L-057)*
2. **X05**: sair e entrar com a mesma conta sem `loading`. Um caso que exija `loading = true` entre o `SIGNED_IN` e a resposta do papel. *(cobertura, L-057)*
3. **X04**: `not-admin` conferido não é reperguntado. Vizinha de R5 com `papel: 'not-admin'`. *(cobertura)*
4. **A cópia do `clientReal.ts` sem guarda que leia os dois do disco** (defeito 01, consequência 3). *(média-baixa)*
5. **O checkout sem régua própria** para a volta da aba; a sonda desta rodada é o molde. *(baixa)*
6. **O arnês com `autoRefreshToken: false`** contra `true` em produção; e X09 (o `fetch` falso não confere o token, então a armadilha do 401 fica sem régua). *(baixa, anterior à `72` no caso de X09)*

Esta é a rodada 3 de 3. Pela regra do loop, as lacunas vão ao usuário em vez de a uma rodada 4.

# Fase 6 — fecho pós-r3 (autor = verificador, declarado)

**Data**: 2026-10-22 · **Escopo**: as lacunas 1 a 5 da r3 (`tasks.md`, "Fase 6 — fecho das lacunas da
r3"); a 6 virou `BL-049` · **Quem**: o worker do fecho, **sem** verificador independente — a r3 era a
rodada 3 de 3, e o fecho foi decisão do usuário. Isso reduz o viés pelos mutantes do próprio
verificador (os textos de X04–X07 são os do `muts.json` da r3, reinjetados sem edição), e não o elimina.

## Resultado: as cinco lacunas têm régua; nenhum código de produção mudou

| Lacuna | Régua | Mutante | Resultado |
| --- | --- | --- | --- |
| 1 · X06 | `reentradaComClientReal.test.tsx` › 1 (provider e `<App />`) | X06 | morto, 2, asserção |
| 1 · X07 | idem › 2 (provider e `<App />`), com os dois `SIGNED_IN` exigidos | X07 | morto, 2, asserção |
| 2 · X05 | idem › 3, a sequência exata `not-admin\|true` ⇒ `admin\|false` depois da reentrada | X05 | morto, 1, asserção |
| 3 · X04 | `contratoComClientReal.test.tsx` › 4, vizinha de R5 com `not-admin` | X04 | morto, 1, asserção |
| 4 · cópia do arnês | `clientRealPareado.test.ts` (âncora, 2 sensores, inverso) | A01 (loja), A02 (app) | mortos, 2 cada, asserção |
| 5 · checkout | `checkoutSobreviveAVoltaDaAba.test.tsx` (`falha` e `admin`, mais a vizinha da identidade nova) | R2 (o defeito da r2) | morto, 1 (o caso `falha`), asserção |
| 6 · `autoRefreshToken`, X09 | — | — | **dívida**, `BL-049` |

SHA-256 de `packages/auth/src/AuthContext.tsx`: `e1e2dbe2…` antes de tudo, depois de cada mutante e
no fim. Nenhum teste novo revelou defeito de produto.

**Limites declarados**: o caso `admin` do checkout não mata R2 (o papel conferido sai pelo caminho
"já resolvido", sem repergunta) — ele guarda esse caminho, não a repergunta. X05 é provado só pelo
provider; a tela do `<App />` na reentrada (splash entre o `SIGNED_IN` e o papel) não tem caso próprio.
X02, X03, X09 e X12 seguem como a r3 os classificou.

## Gates

| Medida | Resultado |
| --- | --- |
| mobile-adm | **261/26**, exit 0 (+12/+2) |
| store | **5748/315**, exit 0 (+3/+1) |
| backoffice | **3653/208**, exit 0 (o guarda `originZipNotRead` acusou a primeira escrita do mock do checkout; o campo saiu do mock) |
| core | **3507/138**, exit 0 |
| `tsc --noEmit` | store `app` 0 · backoffice `app` 0 · mobile-adm `app` 0 · mobile-adm `node` 0 |
| lint (`npx eslint .`) | app 0/0 · loja 2/2 · painel 23/5 (as baselines) |
