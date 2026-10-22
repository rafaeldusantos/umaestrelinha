# 72 — prova em navegador (T15)

Medida em 2026-10-22, Chromium (Chrome for Testing, build do cache 1228) dirigido por Playwright
1.64.1, contra o **build servido** (`vite build` + `vite preview` na porta 8095), não o dev server.
O build foi gerado com `VITE_SUPABASE_URL=http://127.0.0.1:54441`, uma chave de prova e
`VITE_BACKOFFICE_URL=http://localhost:8083`. O Supabase local **não** estava de pé: `**/auth/v1/**` e
`**/rest/v1/**` foram interceptados (registrados do geral para o específico, porque o Playwright avalia
rotas em ordem INVERSA). O papel admin vem da resposta a `user_roles` (a mesma consulta que
`checkAdmin` do `AuthProvider` faz). Script e screenshots ficam no scratchpad da sessão, fora do repo.

## O bundle servido foi conferido antes de medir

| O quê | Resultado |
| --- | --- |
| `index.html` aponta para o bundle novo e o bundle contém "Entrar no ateliê", "Ateliê · painel" e a frase de sem conexão | sim |
| `<link rel="manifest">` no HTML e `theme-color` | sim, `#283A4A` (`primary-strong`) |
| `/manifest.webmanifest` | `name` "Ateliê · Uma Estrelinha", `short_name` "Ateliê", `start_url`/`scope` "/", `standalone`, `portrait`, `pt-BR`, cores `#283A4A`, ícones 192 `any`, 512 `any`, 512 `maskable` |
| `/sw.js` | 200, `Cache-Control: no-cache`; **uma** rota registrada (a `NavigationRoute` do shell, com o denylist de `/api/`); nenhuma menção a `supabase` (`MAF-20`) |
| **Instalabilidade pelo próprio Chromium** (`Page.getInstallabilityErrors`, via CDP, num perfil persistente) | **`[]` — nenhum erro**. `Page.getAppManifest`: sem erros de parse |

Num contexto anônimo o mesmo comando devolve só `in-incognito`, que é do perfil, não do app.

## 390 × 844 e 1440 × 900

| Medida | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| Splash visível na abertura, lockup a **300 px**, barra a **120 px** | sim | sim |
| Tempo da abertura até o Login (sem sessão; inclui o piso de 600 ms) | ~884 ms | ~889 ms |
| `body.scrollWidth === innerWidth` — login, recuperação, as 4 abas, menu da conta, offline | sim em todas | sim em todas |
| Controles abaixo de 48 px na tela de entrar (botões, campos, links) | **nenhum** | nenhum |
| Senha errada: "E-mail ou senha inválidos" e e-mail mantido | sim | sim |
| Recuperação abre "Recuperar acesso", sem a palavra "link" | sim | sim |
| Admin entra ⇒ `/` | sim | sim |
| As 4 abas navegam, `aria-current` só na atual, cada aba com **64 px** de altura | sim | sim |
| Barra inferior × rodapé do Backoffice, rolado até o fim | fundo do rodapé 780 = topo da barra 780 | 836 = 836 |
| Voltar do navegador depois de trocar de aba | volta à aba anterior | idem |
| Menu da conta dentro da tela | 118 → 374 de 390 | 1168 → 1424 de 1440 |
| "Sair" ⇒ `/login` | sim | sim |
| Conta sem o papel ⇒ "Esta conta não tem acesso ao painel." + "Sair", em `/login` | sim | sim |

### Sem conexão

| Cenário | Resultado (nos dois viewports) |
| --- | --- |
| Service worker instalado e controlando a página depois de recarregar | sim |
| **A rede cai com o app aberto** (`context.setOffline(true)`) ⇒ "Sem conexão…" | sim |
| "Tentar de novo" sem rede ⇒ "Ainda sem conexão." | sim |
| **Abrir o app frio sem rede** ⇒ a casca vem do service worker e mostra a tela, com **0** requisições ao host do Supabase | sim — ver a ressalva abaixo |
| A rede volta ⇒ o app sai da tela sozinho (`MAF-21`) | sim |

**Ressalva medida**: na emulação do Playwright, um documento carregado **pelo service worker** depois
de `setOffline(true)` continua vendo `navigator.onLine === true` (a rede falha, o `fetch` rejeita, mas
a flag não acompanha). Para provar a abertura fria offline o teste força `navigator.onLine = false`
por `addInitScript`; o que essa linha prova é que **a casca carrega sem rede** e que, com o navegador
dizendo offline, a tela aparece e nada sai para o Supabase. Num Android em modo avião a flag é do
aparelho; confirmar no aparelho.

## Defeitos achados e consertados nesta prova

1. **A barra inferior cobria 1 px do rodapé.** A barra tinha `border-t` (64 + 1 px) e a reserva do
   layout é `4rem + inset`. O fio virou sombra (`shadow-[0_-1px_0_0_…]`), que não ocupa caixa; medido
   depois: rodapé 780 = barra 780. Teste novo em `TabBar.test.tsx` recusa `border`/`border-t` na barra.
2. **O link "Abrir o Backoffice" abria um vão no meio da frase** (alvo de 48 px inline). Foi para uma
   linha própria.
3. **A tela sem conexão repetia a notícia** ("Sem conexão" de título e uma frase que começa por "Sem
   conexão."). A frase da spec virou o próprio título.

## Defeito achado e NÃO consertado — a recusa falsa sem internet de verdade

Com sessão admin gravada e a rede caída **sem** o navegador saber (`navigator.onLine` verdadeiro —
Wi-Fi sem internet, o caso da ressalva acima), o app fica ~10 s na splash (o timeout do client) e
termina em `/login` dizendo **"Esta conta não tem acesso ao painel."** — uma frase confiante e errada,
a mesma classe do `BUG-20260802`. A causa é `checkAdmin` em `packages/auth/src/AuthContext.tsx`, que
devolve `false` também quando a consulta **falha**. O Backoffice tem o mesmo comportamento hoje.
Consertar exige distinguir "sem papel" de "não consegui perguntar" no `AuthProvider`, que é
compartilhado com o painel: fica fora desta feature e precisa de decisão (sugestão: uma entrada no
`BACKLOG.md`).

## O que NÃO foi medido

- **Instalação num Android de verdade** (Chrome, tela inicial, abertura em `standalone`, a splash do
  manifest antes do JS, a navegação por gestos e o `env(safe-area-inset-bottom)` real) — fica com o
  usuário. Em desktop o inset é 0, então a reserva medida é só os 64 px.
- **O voltar do Android na RAIZ de uma aba saindo do app** (metade de `MAF-17`): em navegador foi
  medido só o voltar do detalhe para a lista e entre abas. Sair do app pelo gesto do sistema só se
  prova no aparelho instalado — fica com o usuário.
- **Lighthouse**: não está instalado no repositório, e a versão atual (12) removeu a categoria PWA. A
  instalabilidade foi provada pelo próprio Chromium (`Page.getInstallabilityErrors` vazio).
- O fluxo de recuperação ponta a ponta (código real chegando por e-mail): só a copy e a navegação
  entre passos foram vistas no navegador; os passos estão provados na suíte.
- `prefers-reduced-motion` em navegador (provado por classe na suíte).
- O backend de verdade: tudo com o Supabase interceptado.
