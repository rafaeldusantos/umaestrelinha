# 72 — mobile-adm: fundação — Design

**Spec**: `.specs/features/72-mobile-adm-fundacao/spec.md`
**Status**: Draft
**Decisões ativas que este design segue**: `AD-056` (o programa), `AD-016` (identificador `estrelinha`),
`AD-012` (tipo escrito à mão é afirmação), `AD-034` (nenhuma chave de servidor em `apps/**`).

---

## Architecture Overview

O app é um terceiro app Vite do monorepo, no molde do Backoffice: React 18, Tailwind com o preset
compartilhado, React Router, React Query, e os pacotes `@estrelinha/*` consumidos como fonte por alias.
O que ele traz de novo é o **service worker**, a **paleta da loja** e a **navegação por abas**.

```mermaid
graph TD
  SW[sw.js — workbox: só o shell] -.precache.-> Shell
  Shell[index.html + bundle] --> Main[main.tsx: AuthProvider → App]
  Main --> Online{online?}
  Online -- não --> Offline[OfflineScreen]
  Online -- sim --> Router
  Router --> Login[/login — LoginPage + RecoveryFlow/]
  Router --> Guard[RequireAdmin fallback=Splash]
  Guard --> Layout[MobileLayout: conteúdo + TabBar + rodapé Backoffice]
  Layout --> Inicio[/ — Início] & Pedidos[/pedidos] & Clientes[/clientes] & Descontos[/descontos]
  Login & Guard --> Auth[@estrelinha/auth → Supabase Auth]
  Inicio -. features 73–78 .-> Core[@estrelinha/core]
```

- **Rotas** (sem prefixo `/admin`: o app inteiro é o painel): `/login`, `/`, `/pedidos`, `/clientes`,
  `/descontos`. Todas, menos `/login`, ficam dentro de **um** `<Route element={<RequireAdmin …>}>`.
- **A splash é o fallback de carregamento do `RequireAdmin`**, com piso de 600 ms. Não existe tela de
  splash própria, nem rota, nem temporizador de 2,4 s.
- **Offline fica acima do router**: sem rede não há Login nem abas, e por isso nenhuma leitura sai.

## Code Reuse Analysis

| O quê | Onde | Como |
| --- | --- | --- |
| Sessão, papel admin, `resetPassword`, `verifyRecoveryCode`, `updatePassword`, `signOut` | `packages/auth/src/AuthContext.tsx` | importado. Nada de auth novo |
| `RequireAdmin` | `packages/auth/src/RequireAdmin.tsx` | ganha o prop **opcional** `fallback`. O default (esqueleto do painel) não muda, e o Backoffice não é tocado |
| A regra de destino depois do login (esperar `authLoading`) | `apps/backoffice/src/pages/admin/AdminLoginPage.tsx:30-44` | **replicada na tela nova**, porque é React local, não regra de domínio. O bug que ela corrige (`BUG-20260802`) é citado no teste |
| `passwordChangeRefusal` | `packages/core/src/admin-users` | importado no passo "senha nova" |
| Ícones | `@estrelinha/ui/icons` + `lucide-react` | o lucide cobre casa, sacola, pessoas e etiqueta. Ícone novo só entra em `packages/ui/src/icons` se o lucide não tiver |
| Primitivos | `@estrelinha/ui/button`, `input`, `label`, `sonner` | importados; o visual vem da paleta da loja por classe |
| Ícones do app (PWA) | `.specs/brand/uma-estrelinha/uma-estrelinha-simbolo.svg`, `apps/store/public/icon-maskable.svg`, `_gen-favicon.mjs` | o mesmo SVG-fonte gera 192, 512 e 512 maskable, com fundo `primary-strong` |
| Logo negativo da splash | `.specs/brand/uma-estrelinha/uma-estrelinha-lockup-negativo.svg` | **o LOCKUP completo a 300 px, como no protótipo**: exceção declarada à escada da marca (piso de 600), **decisão do usuário em 2026-10-22**, no molde do header de 180 px do checkout. **SVG inline**, nunca `<img>` de PNG: a splash não pode ter estado de carregamento. O arquivo é copiado para `features/splash/assets/` e importado com `?raw`; um guarda compara a cópia byte a byte com o SVG-fonte (`.specs/brand`), como `paths.test.ts` faz na loja |
| Guarda de rotas | `apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts` | molde do guarda novo, com o recorte por bloco e a âncora tripla |
| `vercel.json` | `apps/backoffice/vercel.json` | molde, com dois acréscimos: `sw.js` sem cache e `manifest.webmanifest` com o tipo certo |
| `vitest.config` com env fixada | `apps/backoffice/vitest.config.ts` | copiado: o client lança sem env |

### A paleta: um dono em `packages/ui`

Hoje a paleta da loja mora em `apps/store/src/app/App.css` (variáveis) e `apps/store/tailwind.config.ts`
(objeto `colors.estrelinha`), e `palette.test.ts` compara os dois. O app novo seria o **terceiro
leitor**. Ele só usa classes Tailwind, nunca `var(--estrelinha-*)`, então precisa só do objeto.

- O objeto sai de `apps/store/tailwind.config.ts` para **`packages/ui/src/tokens/estrelinha.ts`**
  (`ESTRELINHA_COLORS`, mesmos valores e comentários de papel). A loja passa a fazer
  `colors: { estrelinha: ESTRELINHA_COLORS }`, e o app também.
- `palette.test.ts` **não perde asserção**: ele continua lendo `tailwindConfig.theme.extend.colors.estrelinha`
  da loja, e ganha uma vizinha que exige que esse objeto **seja** `ESTRELINHA_COLORS` (`toBe`), mais
  outra que exige o mesmo do config do app novo. Valor divergente no `App.css` continua reprovando.
- Raio, sombra e famílias também sobem (`ESTRELINHA_RADIUS`, `ESTRELINHA_SHADOW`, `ESTRELINHA_FONTS`),
  pela mesma razão.

### As fontes: cópia deliberada com guarda

A loja serve `public/fonts/*.woff2` com `preload` de caminho estável, e esse caminho não pode mudar
(o `@font-face` e o `index.html` dependem dele). O app novo precisa dos mesmos três arquivos. Um
`publicDir` não se compartilha entre apps, e ler `../store/public` seria um app importando de outro.
Os três arquivos são **copiados** para `apps/mobile-adm/public/fonts/`, e um guarda na suíte da loja
compara o SHA-256 dos dois lados (consequência 3 do defeito 01: cópia deliberada com guarda que lê os
dois do disco).

## Components

### `apps/mobile-adm` (scaffold)
- `package.json` (`@estrelinha/mobile-adm`, scripts `dev`/`build`/`test`/`lint` iguais aos do painel),
  `vite.config.ts` (porta **8084**, aliases e `dedupe` do painel, mais `VitePWA`), `vitest.config.ts`,
  `tsconfig.json` (solution-style) + `tsconfig.app.json` + `tsconfig.node.json`, `tailwind.config.ts`,
  `postcss.config.js`, `eslint.config.js`, `index.html`, `src/main.tsx`.
- Raiz: `pnpm dev:mobile-adm`; `turbo.json` ganha `VITE_BACKOFFICE_URL` no `env` do build.
- FSD igual ao dos outros apps: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`.

### PWA (`vite.config.ts` → `VitePWA`)
- `registerType: 'autoUpdate'`, `injectRegister: 'auto'`.
- `manifest`: `name` "Ateliê · Uma Estrelinha", `short_name` "Ateliê", `lang` "pt-BR",
  `start_url` "/", `scope` "/", `display` "standalone", `orientation` "portrait",
  `theme_color` = `background_color` = `ESTRELINHA_COLORS['primary-strong']` (**importado**, não
  digitado), ícones `icon-192.png`, `icon-512.png` (`any`) e `icon-maskable-512.png` (`maskable`).
- `workbox`: `globPatterns` do shell (`**/*.{js,css,html,woff2,png,svg}`), `navigateFallback: '/index.html'`,
  **sem `runtimeCaching`**. `navigateFallbackDenylist` para `/^\/api\//` por precaução.
- Guarda **`swSemDadosDaLoja.test.ts`** (no próprio app): importa o config do Vite, acha o plugin e
  recusa `runtimeCaching` com qualquer padrão, um `urlPattern` que case `supabase.co`, e `globPatterns`
  que inclua `json`. Sensor: um config sintético com `runtimeCaching` para `*.supabase.co` reprova
  pela mesma função.

### `features/splash` — `Splash`
- Fundo `primary-strong`, a **assinatura negativa** em SVG inline a 300 px, a barra de 120 px (trilho
  `on-primary/20`, progresso `accent`), o rótulo "Ateliê · painel" em `on-primary`.
- `useMinimumDuration(600)`: devolve `true` quando passaram 600 ms desde a montagem.
- `motion-reduce:` em toda transição; com movimento reduzido, a barra fica cheia e parada.
- **Contraste**: o rótulo é `on-primary` sobre `primary-strong` (11,03:1 invertido). `accent` só no
  preenchimento da barra, nunca em texto (`accentText.test.ts` é da loja, mas a regra é do DS).

### `app/` — `App`, `AppRoutes`, `AdminGate`
- `AdminGate`: `RequireAdmin` com `fallback={<Splash/>}` e `loginPath="/login"`, embrulhado no
  `useMinimumDuration` para a splash não piscar.
- Guarda **`rotasSobGuarda.test.ts`** (do app): toda rota fora de `/login` dentro do bloco do
  `RequireAdmin`; o `loginPath` presente; e o recorte que falha devolve `null` e **reprova**.

### `widgets/tab-bar` — `TabBar` e `widgets/mobile-layout` — `MobileLayout`
- `TABS` (dado: rota, rótulo, ícone) é o **único** dono da lista de abas. O router e a barra a leem,
  e um guarda bidirecional compara `TABS` com as rotas do `App.tsx` (molde de `navItems.test.ts`).
- Barra `fixed bottom-0`, `pb-[env(safe-area-inset-bottom)]`, quatro alvos de `min-h-12` (48 px),
  rótulo visível, `aria-current="page"` pelo `NavLink`.
- O conteúdo reserva a altura da barra + o inset **depois** do rodapé do Backoffice (lição do
  `BOTTOM_BAR_H` da loja: reservar antes esconde a última linha atrás da barra).
- Rodapé: "Produtos, vitrine e configurações da loja seguem no Backoffice.", com link para
  `import.meta.env.VITE_BACKOFFICE_URL`; sem env, o link não é desenhado e a frase fica.

### `pages/` — `InicioPage`, `PedidosPage`, `ClientesPage`, `DescontosPage`
- Título da aba e "Esta parte do app chega em breve." — **sem dado fictício** (`MAF-18`). Cada
  feature `73`–`78` substitui a sua.

### `shared/lib/useOnline` e `app/OfflineScreen`
- `useSyncExternalStore` sobre `navigator.onLine` + eventos `online`/`offline` (o padrão de
  `useCompactViewport` da loja: sem flash de estado errado na montagem).
- "Tentar de novo" relê `navigator.onLine` e, se continuar offline, mantém a tela.

### `pages/LoginPage` + `features/recovery/RecoveryFlow`
- Login: e-mail, senha com mostrar/ocultar (alvo de 48 px), "Entrar", "Esqueci minha senha". A
  navegação acontece **no efeito**, depois de `authLoading` fechar (o `BUG-20260802`). Conta sem
  papel: a mesma frase do painel ("Esta conta não tem acesso ao painel.") e o botão "Sair".
- Recuperação: três passos, num componente, sem rota (`USR-39` do painel): e-mail → código de 6
  dígitos (`input-otp`, reenvio com cooldown de 60 s) → senha nova (`passwordChangeRefusal`). Termina
  com sessão aberta e cai no mesmo efeito do login.

### `widgets/account-menu`
- Botão no cabeçalho da Início (e de toda aba) com o e-mail e "Sair" → `signOut()` → `/login`.

## Error Handling Strategy

| Cenário | Tratamento | O que ela vê |
| --- | --- | --- |
| Sem rede ao abrir | `OfflineScreen` acima do router | "Sem conexão…" + "Tentar de novo" |
| Rede cai com o app aberto | `useOnline` troca para a tela offline | a mesma tela, sem dado na frente |
| Senha errada | erro do `signInWithPassword` | "E-mail ou senha inválidos", e-mail mantido |
| Conta sem papel admin | efeito pós-`authLoading` | frase de recusa + "Sair", zero leitura de dado |
| Código de recuperação errado ou expirado | `authErrorMessage` | a frase do `@estrelinha/auth`, com reenvio |
| Supabase Auth fora do ar | o `AuthProvider` fecha `loading` com erro | Login com a mensagem de erro, sem splash infinita |

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Os guardas da loja e do painel varrem `apps/**` e vão ler o app novo: `brandScan`, `chaveDeServidorForaDoNavegador`, `pedidoComDonoUnico`, `fusoComDonoUnico`, `visitanteComDonoUnico`, `marcacaoSoPorAcao` (RPCs), `alvoDeToqueNaoRoubaPosicao`… | `apps/store/src/shared/lib/__tests__/*` | um guarda pode reprovar por um arquivo do app, **ou pior, ter âncora de contagem que muda** | o gate de **toda** task do app roda as suítes da loja e do painel, não só a dele. Guarda com âncora cravada que mudar é atualizado para o número medido, nunca afrouxado |
| `RequireAdmin` desenha o esqueleto com `estrelinha-admin-*` | `packages/auth/src/RequireAdmin.tsx:13` | o app mostraria o esqueleto roxo do painel no lugar da splash | prop `fallback` opcional, com teste dos dois ramos (com e sem prop) |
| O `@estrelinha/ui/styles.css` declara os tokens do painel e o tema do shadcn | `packages/ui/src/styles.css` | os primitivos (`Button`, `Input`) saem com as cores do painel | o app importa `styles.css` (precisa das variáveis do shadcn) e passa as classes da paleta da loja nos primitivos. Sem `App.css` próprio e sem segunda folha de tokens |
| Service worker de deploy antigo servindo bundle velho | Vercel + `autoUpdate` | um bundle velho chamando RPC que mudou | `sw.js` com `no-cache` (`MAF-04`) e `autoUpdate`. O pior caso é uma abertura com a versão anterior |
| Auth com sessão em `localStorage` compartilhada? | domínio próprio do app | nenhum: o app tem origem própria, então a sessão é própria | registrar no `CLAUDE.md` do app: entrar no Backoffice não entra no app, e vice-versa |
| Prova de PWA não existe em jsdom | — | "instalável" é afirmação até alguém instalar | Lighthouse no build servido + instalação num Android real (Success Criteria) |
| `pnpm lint` não olha `packages/` (`BL-002`) | `packages/ui/src/tokens/estrelinha.ts` | o arquivo novo de tokens nunca passa por ESLint | aceito, mesma dívida do resto de `packages/` |

## Tech Decisions

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Plugin de PWA | `vite-plugin-pwa@0.21.2` (+ `workbox-window`) | é o padrão do ecossistema Vite, suporta Vite 5 (`peerDependencies` conferido no npm) e gera manifest + SW com precache por hash |
| Rotas sem `/admin` | `/`, `/pedidos`, … | o app inteiro é o painel. O prefixo só faria sentido dividindo domínio com a loja |
| Splash = fallback do guarda | sem rota de splash | a splash existe para cobrir a resolução da sessão. Com tempo próprio ela vira espera fabricada |
| Paleta em `packages/ui/src/tokens` | objeto TS, não CSS | o app só usa classes, e a loja continua dona das variáveis CSS que o `App.css` usa |
| Fontes copiadas | `public/fonts` do app + guarda SHA | o caminho da loja é contrato com o `preload` e o `@font-face` |
| Sem GA4 | — | ferramenta interna, `noindex` |
