# 72 — Painel do ateliê no celular: a fundação (`apps/mobile-adm`)

> Primeira feature do programa **mobile-adm** (`AD-056`). O roteiro inteiro, com o que cada feature
> entrega e a ordem, está no fim deste arquivo.
>
> Telas de referência: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`
> (`Splash Screen.dc.html` e a tela `Login` de `Ateliê Admin.dc.html`).

## Problem Statement

A Adri acompanha a loja pelo celular, mas o único painel que existe é o Backoffice, desenhado para
computador. Para cada consulta rápida ("chegou pedido?", "esse cupom ainda vale?") ela precisa do
notebook. Antes de qualquer tela de negócio, o app precisa existir: instalável no Android, com a
marca, entrada só para quem administra a loja, a navegação das quatro áreas e um deploy próprio.

## Goals

- [ ] A Adri instala o app pela tela inicial do Android e o abre em tela cheia, sem barra do navegador.
- [ ] Só uma conta com `has_role(admin)` passa do login. As outras ficam numa tela de recusa, sem dado
      nenhum da loja.
- [ ] As quatro abas (Início, Pedidos, Clientes, Descontos) existem e navegam. O conteúdo de cada uma
      vem nas features `73`–`78`.
- [ ] Sem conexão, o app abre e diz que está sem conexão. Ele nunca mostra dado de cache.
- [ ] O deploy é independente: um projeto Vercel próprio, e o Backoffice não muda nem um byte.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Conteúdo das abas | features `73`–`78` |
| Notificação push | feature `79` (decisão do usuário, 2026-10-22) |
| iOS / Safari | pedido explícito: só Android. Não se testa e não se otimiza para iOS |
| Produtos, vitrine, configurações, Home, menu, filtros, perguntas, usuários | ficam só no Backoffice (pedido do usuário). O app aponta para lá |
| Leitura offline / cache de dados | decisão do usuário: só a casca é instalável (`AD-056`) |
| Troca de senha dentro do app | já existe em `/admin/conta` do Backoffice. Ver *Deferred* |
| Domínio próprio do app | operação: entra no dia do DNS, como a loja (`STORE_PUBLIC_URL`) |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Por quê | Confirmado? |
| --- | --- | --- | --- |
| Quem entra | **o mesmo acesso do Backoffice**: as mesmas contas de `auth.users`, o mesmo papel (`has_role(admin)`), o mesmo `RequireAdmin` de `@estrelinha/auth`, geridos em `/admin/usuarios`. Não existe papel, tabela nem convite próprio do app | pedido do usuário (2026-10-22): quem administra a loja administra pelo celular | **s** (usuário) |
| Onde o app mora | `apps/mobile-adm` no monorepo, pacote `@estrelinha/mobile-adm`, porta **8084** | regras compartilhadas com o painel sobem para `packages/core` em vez de serem copiadas (defeito 01) | **s** (usuário) |
| Deploy | projeto Vercel próprio, `vercel.json` no molde do Backoffice | manifest e service worker só dele | **s** (usuário) |
| Offline | o service worker pré-carrega **só** o shell (HTML, JS, CSS, fontes, ícones). `*.supabase.co` é sempre rede, nunca cache | dado de dinheiro desatualizado é pior que ausente | **s** (usuário) |
| Splash | o Android desenha a splash **do manifest** (ícone sobre `background_color`) antes do JS. Em seguida o app mostra a splash desenhada (logo negativo, barra de progresso, "Ateliê · painel"), **enquanto a sessão é resolvida**, com piso de 600 ms e **sem tempo fixo de 2,4 s** | o tempo do protótipo é ilustrativo. Segurar 2,4 s de propósito é espera fabricada | n |
| Recuperação de senha | **código de 6 dígitos** (`resetPassword` + `verifyRecoveryCode` do `@estrelinha/auth`), igual ao Backoffice | o template de auth em produção envia `{{ .Token }}`, não link. A copy do protótipo ("mando um link… vale por uma hora") está **errada** e é corrigida aqui | n |
| Paleta | o app usa a paleta **da loja** (`--estrelinha-ground`, `ink`, `primary`…), não os tokens `--estrelinha-admin-*` | é o que o protótipo usa | n |
| Dono da paleta | os tokens da loja passam a ter **um** dono em `packages/ui` (folha CSS), lida pela loja e pelo app. `palette.test.ts` passa a conferir os três leitores | a terceira cópia da paleta seria o defeito 01 (decisão de Design; alternativa: cópia deliberada com guarda) | n |
| Atualização do app | `registerType: 'autoUpdate'`: a versão nova vale na próxima abertura, sem perguntar | um bundle velho chamando RPC que mudou é o risco maior. Perguntar "atualizar?" a cada deploy é ruído | n |
| Nome instalado | `name`: "Ateliê · Uma Estrelinha", `short_name`: "Ateliê" | o rótulo da splash é "Ateliê · painel" | n |
| Orientação | `portrait` | o protótipo é só retrato | n |
| Link para o Backoffice | rodapé fixo nas abas: "Produtos, vitrine e configurações da loja seguem no Backoffice", com link para a URL pública do painel (env `VITE_BACKOFFICE_URL`) | copy do protótipo. A URL não fica cravada no código | n |

**Open questions:** nenhuma. Tudo resolvido ou registrado acima.

---

## User Stories

### P1: O app existe e se instala ⭐ MVP

**User Story**: Como Adri, quero instalar o painel do ateliê na tela inicial do celular para abri-lo
como um app.

**Acceptance Criteria**:

1. WHEN o Chrome do Android abre a URL do app THEN o app SHALL ser instalável: manifest com `name`,
   `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`,
   `theme_color` e `background_color` iguais ao token `primary-strong`, ícones 192 e 512 `any` e um
   512 `maskable`, e um service worker registrado. (`MAF-01`)
2. WHEN o app é aberto pelo ícone THEN ele SHALL abrir em `standalone`, sem barra de endereço. (`MAF-02`)
3. WHEN o build roda THEN `pnpm build` SHALL gerar `apps/mobile-adm/dist` com `manifest.webmanifest`
   e `sw.js`, e a raiz SHALL ganhar `pnpm dev:mobile-adm` (porta 8084). (`MAF-03`)
4. WHEN o Vercel serve `sw.js` THEN a resposta SHALL ter `Cache-Control: no-cache`, e `/assets/*` o
   `immutable` de um ano. Todas as respostas SHALL levar `X-Robots-Tag: noindex, nofollow`,
   `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy` iguais ao Backoffice. (`MAF-04`)

### P1: Splash ⭐ MVP

1. WHEN o app abre e a sessão ainda não foi resolvida THEN ele SHALL mostrar a splash desenhada: fundo
   `primary-strong`, logo negativo, barra de 120 px com o progresso em `accent` e o rótulo
   "Ateliê · painel". (`MAF-05`)
2. WHEN a sessão resolve THEN a splash SHALL sair depois de **no mínimo 600 ms** desde a montagem, e
   nunca por um tempo fixo além disso. (`MAF-06`)
3. WHEN `prefers-reduced-motion: reduce` THEN o logo SHALL aparecer sem deslocamento e a barra SHALL
   ficar parada. (`MAF-07`)

### P1: Entrar no ateliê ⭐ MVP

**User Story**: Como Adri, quero entrar com meu e-mail e senha, e recuperar o acesso se esquecer.

1. WHEN não há sessão THEN o app SHALL mostrar o Login ("Entrar no ateliê", e-mail, senha com
   mostrar/ocultar, "Esqueci minha senha", "Acesso restrito a quem cuida da loja."). (`MAF-08`)
2. WHEN a senha está certa e a conta tem `has_role(admin)` THEN o app SHALL ir para a aba Início.
   O destino SHALL esperar o `AuthProvider` saber que ela é admin, para nunca piscar a recusa (o
   defeito que `AdminLoginPage` já corrigiu). (`MAF-09`)
3. WHEN a senha está errada THEN o app SHALL mostrar a mensagem de `authErrorMessage`, sem limpar o
   e-mail. (`MAF-10`)
4. WHEN a conta entra mas **não** é admin THEN o app SHALL mostrar uma tela de recusa com "Sair", e
   SHALL não fazer nenhuma leitura de dado da loja. (`MAF-11`)
5. WHEN ela toca "Esqueci minha senha" THEN o app SHALL seguir o fluxo de **código**: e-mail → código
   de 6 dígitos (com reenvio e cooldown de 60 s) → senha nova, reusando a mesma regra de senha do
   Backoffice (`passwordChangeRefusal`). (`MAF-12`)
6. WHEN ela toca "Sair" (no menu da conta) THEN a sessão SHALL encerrar e o app SHALL voltar ao Login. (`MAF-13`)

### P1: As quatro abas ⭐ MVP

1. WHEN ela está logada THEN uma barra inferior fixa SHALL mostrar Início, Pedidos, Clientes e
   Descontos, **cada aba com o seu ícone** (do `lucide-react` quando ele já tem o desenho, e de
   `@estrelinha/ui/icons` só quando não tem: a regra de `apps/store/CLAUDE.md`, *Ícones e marca*) e
   rótulo **visível**, alvo de toque ≥ 48 px de altura
   e a aba atual marcada (`aria-current="page"`). (`MAF-14`)
2. WHEN o Android usa navegação por gestos THEN a barra SHALL respeitar
   `env(safe-area-inset-bottom)` e nada clicável SHALL ficar sob a barra do sistema. (`MAF-15`)
3. WHEN uma rota do app é aberta sem sessão admin THEN ela SHALL cair no Login. **Toda** rota fora de
   `/login` SHALL estar sob o `RequireAdmin` (guarda de posição no molde de `rotasSobGuarda.test.ts`). (`MAF-16`)
4. WHEN o botão voltar do Android é usado numa tela de detalhe THEN ele SHALL voltar à lista. Na raiz
   de uma aba, SHALL sair do app (comportamento do navegador, sem interceptar). (`MAF-17`)
5. WHEN cada aba abre nesta feature THEN ela SHALL mostrar o título e um estado "em construção" sem
   dado fictício. (`MAF-18`)

### P1: Sem conexão ⭐ MVP

1. WHEN o app abre offline THEN o shell SHALL carregar do service worker e mostrar "Sem conexão. Os
   dados da loja aparecem quando a internet voltar.", com "Tentar de novo". (`MAF-19`)
   - **SPEC_DEVIATION (2026-10-27, feature `82`, T18 — `docs/qa/bugs/BUG-20261026-queda-curta-de-rede-apaga-o-codigo.md`)**:
     com o app JÁ aberto, a tela só troca para "Sem conexão" depois de **5 s offline contínuos**
     (`CARENCIA_SEM_CONEXAO_MS`, `apps/mobile-adm/src/shared/lib/useOnline.ts`). Uma queda mais curta
     não desmonta a árvore (a folha aberta e o texto digitado ficam); a escrita que sai sem rede cai em
     "Não consegui salvar". Abrir já offline continua imediato, e passados os 5 s tudo é como acima.
2. WHEN qualquer requisição a `*.supabase.co` é feita THEN o service worker SHALL **não** interceptá-la
   nem cacheá-la. Um guarda lê a configuração do workbox e recusa qualquer `runtimeCaching` para esse
   host. (`MAF-20`)
3. WHEN a conexão volta THEN o app SHALL sair do estado offline sozinho (evento `online`). (`MAF-21`)

---

### P1: Rodada de conserto do QA (2026-10-22) ⭐ MVP

> Emenda de 2026-10-22, decisão do usuário: o ciclo de QA (`docs/qa/reports/2026-10-22-mobile-adm-fundacao.md`)
> achou três defeitos que pediam decisão e cinco paper cuts; todos são resolvidos dentro da `72`,
> antes de avançar. O primeiro fecha a `BL-048` e mexe no `@estrelinha/auth` compartilhado.

1. WHEN a consulta do papel admin falha ou não responde em **8 s** THEN o `AuthProvider` SHALL expor um
   terceiro estado (`adminStatus: 'admin' | 'not-admin' | 'unknown'`; `isAdmin` continua sendo
   `adminStatus === 'admin'`), e a leitura inicial da sessão também SHALL ter o mesmo teto. (`MAF-22`)
2. WHEN o estado é `unknown` THEN o app SHALL mostrar "Não consegui conferir seu acesso." com
   "Tentar de novo" (que refaz a consulta), SHALL nunca dizer "Esta conta não tem acesso ao painel." e
   SHALL nunca oferecer "Sair" como única saída nem apagar a sessão salva. A splash SHALL sair em no
   máximo 8 s nesse caminho. O Backoffice SHALL deixar de mostrar a recusa falsa no mesmo estado. (`MAF-23`)
3. WHEN ela toca "Esqueci minha senha" THEN a recuperação SHALL ter rota própria fora do guarda
   (`/recuperar`), e cada passo SHALL entrar no histórico: o voltar do Android SHALL voltar um passo, e
   do primeiro passo SHALL voltar ao Login, sem interceptar o gesto. (`MAF-24`)
4. WHEN o pedido de código responde 429 (já houve um envio há pouco) THEN o app SHALL ir ao passo do
   código mesmo assim, dizendo "Já enviamos um código há pouco para <e-mail>.", com o reenvio contando. (`MAF-25`)
5. WHEN ela toca "Entrar" com e-mail ou senha vazios THEN o app SHALL dizer "Informe o e-mail e a
   senha." sem ir à rede. (`MAF-26`)
6. WHEN o app é aberto no navegador THEN o `index.html` SHALL declarar o ícone da aba, e `/favicon.ico`
   ou o ícone declarado SHALL responder 200. (`MAF-27`)
7. WHEN o HTML chega e o JavaScript ainda não THEN a primeira pintura SHALL ser a splash (fundo
   `primary-strong`, o mesmo lockup, o rótulo), injetada no `index.html` no build a partir do MESMO
   arquivo do lockup, e SHALL ser substituída sem salto visível quando o React monta. (`MAF-28`)
8. WHEN ela troca de aba THEN o título do documento SHALL ser o da aba ("Pedidos · Ateliê") e o foco
   SHALL ir para o título da página, para o leitor de tela anunciar a tela nova. (`MAF-29`)
9. WHEN a rede cai com o app aberto THEN a tela "Sem conexão" SHALL ser anunciada ao leitor de tela
   (região viva assertiva). (`MAF-30`)

> **Precisões da verificação independente da Fase 6** (2026-10-22, decididas pelo orquestrador dentro
> do escopo das ACs acima):
> - `MAF-22`: "a consulta falha" inclui as três formas, `{ error }`, exceção lançada e promessa
>   rejeitada, tanto na consulta do papel quanto na leitura da sessão e na do cadastro. Uma resposta
>   que chega depois de a sessão mudar (logout, outra conta, outro "Tentar de novo") é **descartada**:
>   ela nunca promove a admin quem já saiu. A corrida existia antes desta feature e o painel também a tinha.
> - `MAF-23`: `unknown` nunca é guardado como resolvido; a próxima checagem sempre vai à rede.
> - `MAF-26`: e-mail ou senha **só com espaços** contam como vazios.
> - Mudanças de comportamento aceitas, fora do app: na loja, com a leitura da sessão pendurada, a tela
>   passa a se desenhar como deslogada aos 8 s, em vez de carregar para sempre; no painel, o guarda
>   desenha "Não consegui conferir seu acesso." no `unknown`, em vez de mandar ao login.

## Edge Cases

- WHEN a sessão expira com o app aberto THEN a próxima leitura com 401 SHALL levar ao Login, sem toast genérico.
- ~~WHEN a conta perde o papel admin com o app aberto THEN as gravações SHALL ser recusadas pelo banco
  (RLS) e a tela SHALL dizer que o acesso foi removido.~~ **Movido para a `73`** (emenda de
  2026-10-22, achado da verificação r1): a `72` não lê nem grava dado, então não há recusa para mostrar.
  A `73` é a primeira feature com leitura e herda este caso.
- WHEN a env `VITE_BACKOFFICE_URL` falta THEN o link do rodapé SHALL não ser desenhado, e o resto do app funciona.
- WHEN o usuário abre o app no navegador sem instalar THEN tudo SHALL funcionar igual, só sem `standalone`.

## Implicit-requirement dimensions

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada | e-mail e senha pelas regras do `@estrelinha/auth` (`MAF-10`, `MAF-12`) |
| Falha parcial | offline e 401 (`MAF-19`, edge cases) |
| Idempotência / retry | N/A: a fundação não grava dado de negócio |
| Auth e limites | `RequireAdmin` em toda rota (`MAF-16`). Nenhuma chave de servidor (`chaveDeServidorForaDoNavegador.test.ts` já varre `apps/**`) |
| Concorrência | N/A: sem gravação |
| Ciclo de vida do dado | cache só do shell (`MAF-20`). A sessão segue o `@estrelinha/auth` |
| Observabilidade | N/A nesta feature: o app não mede GA4 (é ferramenta interna, e `noindex`) |
| Dependência externa | Supabase Auth fora do ar ⇒ mensagem de erro do login, sem travar a splash além do timeout do client |
| Transição de estado | N/A: só a sessão |

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| MAF-01..04 | Instalável e deploy | Implemented (T04–T06) |
| MAF-05..07 | Splash | Implemented (T07–T08) |
| MAF-08..13 | Login | Implemented (T11–T13) |
| MAF-14..18 | Abas | Implemented (T08–T09) |
| MAF-19..21 | Offline | Implemented (T05, T10) |
| MAF-22..30 | Rodada de conserto do QA | Implemented (T16–T22), sem verificador independente ainda |

**Coverage:** 30 total (21 + 9 da rodada de QA); os 30 mapeados para tasks e implementados; prova em navegador em `prova-navegador.md`.

## Success Criteria

- [ ] Instalada num Android de verdade (Chrome) e aberta em standalone. **Prova em aparelho**, não em
      jsdom nem em emulação de viewport.
- [ ] Lighthouse "Installable" verde no build servido.
- [ ] Em 390×844: sem rolagem horizontal do body, barra inferior sem sobrepor conteúdo.
- [ ] `apps/backoffice/**` e `apps/store/**` sem uma linha alterada, exceto o que a decisão do dono da
      paleta exigir na loja (medido com `git diff --name-only`).
- [ ] As suítes da loja e do painel continuam verdes. Os guardas de lá varrem `apps/**` e vão ler o app novo.

## Deferred Ideas

- Troca de senha dentro do app (hoje: `/admin/conta` no Backoffice).
- Atalhos do manifest (`shortcuts`) para "Pedidos" e "Novo cupom".

---

## Programa mobile-adm — o roteiro (`AD-056`)

Cada feature é uma entrega que dá para usar sozinha, nesta ordem. **Toda feature que ler uma regra que
o Backoffice já tem começa subindo essa regra para `packages/core`**, com o painel passando a
importá-la de lá sem mudar comportamento (a suíte do painel continua verde **sem asserção tocada**).

| # | Feature | Entrega | Regras que sobem para `core` |
| --- | --- | --- | --- |
| **72** | fundação | app instalável, splash, login, abas, offline, deploy | dono da paleta da loja em `packages/ui` |
| **73** | início | o bloco "Movimento da loja", "Precisa de você", vendas dos 7 dias, o mês, clientes novas, joias mais pedidas, últimos pedidos | `storeMovement` (`entities/stats/model`) |
| **74** | pedidos | lista com os recortes, busca, e o detalhe do pedido (**só leitura**) | `rowSummary`, `filterChips`, `nextStep`, `history`, rótulos de status |
| **75** | ações do pedido | "Recebi o material", rastreio e "Marcar como enviado", cobrança do material por WhatsApp | `chargeMaterial`, as transições (`materialTransitions` já tem par TS × SQL) |
| **76** | clientes | lista com recortes, detalhe, WhatsApp | o que `AdminClientsPage`/`customer-detail` decidem |
| **77** | cupons | listar, criar, editar, duplicar, pausar, excluir | `couponSchema`, a regra da cópia (`DSC-08`), `couponStatus` |
| **78** | promoções | listar, criar e editar faixas, pausar | `promotion-form/model` |
| **79** | aviso de pedido | push no Android quando um pedido é pago | (novo) inscrições Web Push + o motor de notificações |
