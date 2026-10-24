# apps/mobile-adm — o painel do ateliê no celular

`@estrelinha/mobile-adm`, Vite na porta **8084** (`pnpm dev:mobile-adm`). É o painel da loja feito
para o celular da Adri, instalável no Android como app. Leia [`../../CLAUDE.md`](../../CLAUDE.md)
(regras do repositório) e [`../../DESIGN.md`](../../DESIGN.md) antes deste arquivo. O programa inteiro
(features `72` a `79`) está em `.specs/features/72-mobile-adm-fundacao/spec.md` e na decisão `AD-056`.

**Só Android.** iOS/Safari não é testado nem otimizado (pedido do usuário).

## O que existe hoje (feature `72`, a fundação, `73`, a Início, `74`, os Pedidos, e `75`, as ações)

| Rota | O quê |
| --- | --- |
| `/login` | entrar (e-mail e senha) |
| `/recuperar` · `/recuperar/codigo` · `/recuperar/senha` | recuperar o acesso por **código de 6 dígitos**, um passo por rota (`MAF-24`), fora do guarda |
| `/` | Início — o movimento, "Precisa de você", a semana, o mês, as joias e os últimos pedidos (feature `73`, abaixo) |
| `/pedidos` | Pedidos — a lista com os seis recortes, os quatro blocos da Início e a busca (feature `74`), e a ação primária no cartão (feature `75`, abaixo) |
| `/pedidos/:id` | o detalhe de um pedido (feature `74`), com o rodapé da ação, a folha do rastreio, "Informar/Alterar" na Entrega e o lembrete no WhatsApp (feature `75`); subrota da aba Pedidos, dentro do guarda |
| `/clientes` | Clientes — em construção (`76`) |
| `/descontos` | Descontos — em construção (`77`, `78`) |
| `*` | caminho desconhecido ⇒ `/` (dentro do guarda) |

Sem prefixo `/admin`: o app inteiro é o painel. Produtos, vitrine, configurações, Home, menu, filtros,
perguntas e usuários **ficam só no Backoffice**, e o rodapé das abas aponta para lá
(`VITE_BACKOFFICE_URL`; sem a env a frase fica e o link não é desenhado).

## O acesso é o MESMO do Backoffice (`AD-056`)

As mesmas contas de `auth.users`, o mesmo papel (`has_role(admin)`, lido de `user_roles` pelo
`AuthProvider`), o mesmo `RequireAdmin` de `@estrelinha/auth`, geridos em `/admin/usuarios` do painel.
Não existe papel, tabela nem convite próprio do app.

- **A sessão é separada por origem.** O app tem domínio próprio, então o `localStorage` da sessão é
  dele: entrar no Backoffice não entra no app, e vice-versa.
- **Toda rota fora de `/login` e de `/recuperar…` está dentro de UM `<Route element={<RequireAdmin …>}>`** em
  `src/app/App.tsx`. `src/app/__tests__/rotasSobGuarda.test.ts` mede a POSIÇÃO (molde do guarda do
  painel), com âncora tripla.
- **Quem navega depois de entrar é o efeito do `LoginPage`, quando o `AuthProvider` já sabe o papel**
  — a regra de `apps/backoffice/src/pages/admin/AdminLoginPage.tsx` (`BUG-20260802`). O teste dela
  segura a resposta do papel e prova que nem a recusa nem a navegação acontecem antes.
- Conta sem o papel recebe a frase do painel, palavra por palavra: "Esta conta não tem acesso ao
  painel.", com "Sair".
- **A recuperação é por CÓDIGO** (o template de produção envia `{{ .Token }}`). O protótipo falava em
  link e estava errado. Os passos usam `resetPassword`, `verifyRecoveryCode` e `updatePassword` do
  `@estrelinha/auth`, a senha nova passa por `passwordChangeRefusal` (`@estrelinha/core/admin-users`)
  antes da rede, e o reenvio espera 60 s (o `max_frequency` do GoTrue).
- **Cada passo da recuperação tem rota** (`features/recovery/model/passos.ts`, `MAF-24`): o voltar do
  Android volta um passo, e do primeiro volta ao Login. O que o passo precisa (o e-mail, o prazo do
  reenvio, o aviso) vai no **`history.state`** da entrada, nunca na URL — e-mail no endereço fica no
  histórico do navegador. Passo do meio aberto sem estado (direto, ou a aba morta e reaberta) volta
  ao primeiro. O código abre a sessão no passo 2, e o passo da senha nem monta o `LoginPage`; gravada
  a senha, a recuperação navega a `/login`, e quem decide o destino é o efeito de lá.
- **O 429 do reenvio cedo demais não é falha** (`MAF-25`): o app vai ao passo do código dizendo "Já
  enviamos um código há pouco para <e-mail>.", com o reenvio contando. É reconhecido pela frase do
  mapper (`AUTH_RATE_LIMITED`, `@estrelinha/core/auth`), não pelo erro cru.
- **Entrar vazio** diz "Informe o e-mail e a senha." sem ir à rede (`MAF-26`). Só espaços conta
  como vazio, nos dois campos.
- **O papel tem três estados** (`adminStatus`, `MAF-22`/`MAF-23`, fechou a `BL-048`). Com a consulta
  falhando ou sem resposta em 8 s (`ADMIN_CHECK_TIMEOUT_MS`; a leitura da sessão tem o mesmo teto, e
  na abertura é um só), o estado é `unknown`, e o app mostra "Não consegui conferir seu acesso." com
  "Tentar de novo" (`features/access-check`) — no Login e no `unknownFallback` do guarda. **Nunca** a
  recusa e **nunca** "Sair": sair apagaria a sessão salva. A splash nunca fica mais de 8 s.
  - **O "Tentar de novo" não volta para a splash.** Ele liga o `loading` do provider, e o
    `RequireAdmin` troca a tela pelo `fallback` enquanto isso. Por isso o `fallback` do guarda é
    `CarregandoAcesso`: com uma nova tentativa em curso (a marca de `access-check/model/tentativa.ts`,
    fora do React porque a tela que tinha o botão desmonta), ele desenha a mesma tela com
    "Conferindo…" travado; na abertura, a splash. Paper cut do reteste de QA da `72`.
  - **Gravada a senha, os passos da recuperação saem do histórico.** Cada passo guarda no
    `history.state` quantas entradas a recuperação empilhou sobre a do Login (`profundidade`), e
    gravar volta exatamente isso: o voltar da Início sai do app, sem reabrir um código já usado
    (`BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao`).
  - "Falha" são **três formas** — `{ error }`, exceção lançada na hora e promessa rejeitada —, na
    consulta do papel, na leitura da sessão e na do cadastro. Nenhuma vira `not-admin`. O cadastro
    também tem o teto: com o Wi-Fi sem saída, ele fica pendurado junto com o papel.
  - `unknown` **nunca** fica guardado como resolvido: o "Tentar de novo" e a próxima renovação de
    token do mesmo usuário voltam a perguntar à rede.
  - **Resposta velha é descartada** (conserto r1 da Fase 6): o `AuthProvider` numera cada resolução
    (`geracao`) e toda conclusão — sucesso, falha ou teto — só grava se ainda for a vigente. A
    resposta do papel que chega depois de a sessão cair não promove a admin quem saiu (P1, que o
    painel também tinha), e o teto de um "Tentar de novo" não apaga um `admin` que outra leitura já
    conferiu (P3). A leitura da sessão vale enquanto nenhuma identidade nova começou depois de ela
    sair (`identidade`): um retry não a torna velha, um login ou um logout tornam.
  - **`INITIAL_SESSION` sem sessão é ignorado** (conserto r2 da Fase 6). O supabase-js o emite com
    `null` nos dois casos — sessão ausente **e** leitura que falhou (`_emitInitialSession` cai no
    `catch`) —, e o evento não diz qual. Quem decide é a leitura do próprio provider (`lerSessao`):
    `{ error }` é `unknown`, sessão ausente é "sem sessão". Obedecer ao evento levava ao Login, ~40 s
    depois, quem tem a sessão salva e só estava sem rede. Logout de verdade continua chegando
    (`SIGNED_OUT`, ou `getSession` sem sessão). O `INITIAL_SESSION` **com** sessão vale pela mesma régua
    da leitura: velho se uma identidade nova começou depois da inscrição.
  - **`loading` só muda na primeira resolução e na troca de identidade** (conserto r2). Para o
    **mesmo** usuário já na tela, `SIGNED_IN` (o supabase-js o emite a **cada volta da aba**) e
    `TOKEN_REFRESHED` só **reperguntam o que falta** — o papel que ficou `unknown` (`papelDe`) e o
    cadastro que não chegou (`cadastroDe`) — sem tocar em `loading`. A loja depende disso: o checkout e
    a conta desenham "Carregando..." no lugar da página e se desmontariam. A única exceção é o "Tentar
    de novo", que põe `loading` de propósito e o devolve ao terminar. O papel conferido não é
    reperguntado.
  - **O dedupe `emVoo`**: um evento do mesmo usuário no meio da checagem não repete a consulta nem
    abre um segundo teto — sem ele, um `SIGNED_IN` no meio de um login empurrava a espera para além de
    8 s.

## A árvore

`main.tsx` monta só `<App />`. Dentro dele, nesta ordem:

1. **`useOnline`** — sem rede, `OfflineScreen` e mais nada: o `AuthProvider` nem monta, então
   nenhuma chamada ao Supabase sai (`MAF-19`). Quando a rede volta, tudo monta de novo e a sessão é
   relida.
   - ⚠️ **O `QueryClientProvider` fica ACIMA deste ramo** (achado da prova em navegador da `73`). O
     `onlineManager` do React Query só ouve `online`/`offline` enquanto há um `QueryClient` montado;
     com o provider dentro do ramo, o `offline` chegava, o provider desmontava e o `online` da volta
     não era ouvido — toda leitura ficava **pausada** e a Início nunca mais relia. O cliente é criado
     por `useState` no `<App />` (`criarQueryClient`), então o cache sobrevive à queda: ao voltar, a
     tela mostra o dado anterior com "Atualizado às" e relê (`MAI-18`).
2. **`AuthProvider`** e **`BootGate`** — a splash da abertura, até o piso de 600 ms passar **e** a
   sessão resolver pela primeira vez (no máximo 8 s: o teto do provider; no `unknown` a tela é da
   rota, não do portão, para a recuperação continuar alcançável). Ela trava na primeira resolução: o provider volta a `loading`
   a cada login, e reagir a isso desmontaria o formulário no meio da entrada.
3. **O router**, com o `RequireAdmin` usando a mesma `Splash` como `fallback` (o prop opcional que a
   `72` acrescentou; sem ele o painel continua vendo o esqueleto dele).
4. **`app/layout/MobileLayout`** — cabeçalho com o menu da conta, a aba, o rodapé do Backoffice e a
   barra inferior. Mora em `app/` porque compõe dois widgets (`tab-bar` e `account-menu`).

## A Início (feature `73`, `AD-057`)

`pages/InicioPage.tsx` compõe seis widgets (`movement-hero`, `queue-tiles`, `week-chart`,
`month-cards`, `top-jewels`, `recent-orders`), o `PullToRefresh` e o Realtime. **Nenhuma regra de
número mora no app.**

- **Só RPC admin, duas leituras** (`MAI-23`): o movimento por `useMovimento` e o resumo por `useResumo`
  (`entities/stats`), que chamam `store_movement` e `store_overview` **sem argumento** — o dia, a
  semana e o mês são do banco (`AD-055`). Nenhuma leitura de `orders` pelo PostgREST: a RLS devolveria
  à conta sem papel os pedidos DELA, e a contagem seria um número falso e plausível. A regra dos
  quatro blocos da fila mora em `core/orders/queue.ts`, e a cópia SQL na migration é guardada byte a
  byte (`filaComDonoUnico.test.ts`, suíte da loja).
- **`useMovimento` existe por causa do `retry`.** `useStoreMovement` (`core`) declara `retry: 1` no
  próprio hook (o painel depende disso), e opção de query vence a do `QueryClient`: sem passar
  `retryUnlessDenied`, um `42501` seria repetido antes da recusa. A Início lê o movimento SÓ por aqui.
- **Três estados por bloco** (`shared/ui/leitura.tsx`): esqueleto (`aria-busy`), falha sem dado (frase
  e "Tentar de novo", nunca um zero), e dado — inclusive com a releitura falhada (`MAI-18`). Cada
  leitura falha e pendura sozinha.
- **"Atualizado às 14h32"** é `formatStoreHour` do `lido_em` do SERVIDOR (o mais antigo dos dois na
  tela), nunca o relógio do aparelho; "Não consegui atualizar agora." entra na mesma linha quando uma
  releitura falhou com dado na tela.
- **Releem**: o aviso do Realtime (canal `atelie-orders-realtime`, **um** por montagem, fechado ao
  trocar de aba e ao sair), o puxar, a volta ao primeiro plano (`refetchOnWindowFocus`) e a virada do
  dia (o timer por duração do servidor, nos hooks). Resposta antiga que chega depois da nova é
  descartada (o React Query cancela por chave).
- **`42501` ⇒ a recusa da `72`.** `useRecusaDePapel` reconfere o papel (`retryAdminCheck`) e o
  `RequireAdmin` leva ao Login com "Esta conta não tem acesso ao painel.". Erro de rede (sem código,
  ou 500) **nunca** é recusa. Enquanto há recusa, nenhum bloco desenha número, nem o de antes.
  - ⚠️ **A reconferência é UMA por episódio, não por montagem**: `retryAdminCheck` põe `loading`, o
    `RequireAdmin` desmonta a página, e um `useRef` morria com ela — com o papel ainda `admin` (a
    recusa era da função), a tela entrava em laço. A marca mora fora do React, e se desfaz quando
    nenhuma leitura está mais recusada ou a conta muda (achado da T18).
- **Os endereços de `/pedidos`** (`?visao=` e `?bloco=`) são de `pedidosHref` (`entities/order`), o
  mesmo arquivo que a `74` vai ler. As linhas de "Últimos pedidos" são texto até a `75`.
- **O selo fala com o ateliê** (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`, reteste de
  2026-10-23). `SituacaoDoPedido` chama `orderSituation(pedido, 'atelie')`: a MESMA chave e o MESMO tom
  da loja, com as palavras de quem administra — "Aguardando material", "Material a caminho",
  "Material recebido", "Enviado", "Estornado" —, nunca o "seu material" da cliente. As palavras moram
  em `core` (`SITUATION_LABELS_BY_AUDIENCE`, de `MATERIAL_STATUS_LABELS` e dos rótulos do painel em
  `core/orders/labels.ts`). **Nenhuma tabela de rótulo no app**: `situacaoComDonoUnico.test.ts` (suíte
  da loja) varre `apps/mobile-adm/src` desde então, e acusa até a tabela "só para trocar a palavra".
  As telas da `74`/`75` que desenharem a situação usam o mesmo componente, ou o mesmo público.
- **A linha de Últimos pedidos quebra com a fonte grande**
  (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`): `flex-wrap`, o nome com piso em rem
  (`min-w-[min(100%,6rem)]`) e a coluna do total e do selo podendo ceder (`ml-auto min-w-0 max-w-full`,
  nunca `shrink-0`). E o rótulo do selo **não** é `truncate`: a 165 %+ em 360 a pílula sozinha é mais
  larga que a linha, e cortar viraria "Aguardando pag…"; o texto desce para uma segunda linha dentro
  dela. Medido de 100 a 200 % em 360 e 412: `scrollWidth` igual à tela, nada sobreposto, nada cortado.
- **Limitação declarada — o Realtime fica mudo quando o papel cai** (observação do QA, aceita em
  2026-10-23). Sem o papel de admin, a RLS de `orders` não entrega o aviso, e a Início mostra os números
  da última leitura boa, com o "Atualizado às" daquela hora, até o próximo foco, puxar ou virada do dia
  — quando a leitura é recusada (`42501`) e a recusa da `72` assume. É o mesmo limite do painel (`A-06`
  da `48`: revogar o acesso não derruba a sessão ativa). Reconferir o papel num intervalo foi
  recusado: a revogação é rara, e os números na tela são de quando a conta era admin.
- ⚠️ **A semântica de `store_overview` só é provada por probe, e o probe não roda no CI** (`BL-050`).
  Toda migration que recrie a função roda, antes do deploy:

  ```bash
  psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
    -f .specs/features/73-mobile-adm-inicio/probes/01-resumo.sql
  ```

  e confere exit 0 com só `ok —` (detalhe em `supabase/CLAUDE.md`). Os testes do app dublam a RPC: eles
  provam o desenho, nunca o número.
- **Relógio falso discorda do esperado** (`L-058`): prova de "pelo banco, não pelo aparelho" põe o
  aparelho no meio de outro mês e noutra faixa de hora (`MonthCards`, a saudação e a data do
  `MovementHero`). O relógio real do dia da suíte pode coincidir com a fixtura — durante o 22/10/2026
  em UTC, ler a data do aparelho passaria.

## Pedidos (feature `74`, `AD-058`)

`pages/PedidosPage.tsx` (lista) e `pages/PedidoPage.tsx` (detalhe) compõem; **nenhuma regra de
recorte, frase, rótulo ou número mora no app**. Tudo o que o painel também responde subiu para
`core/orders` (`views`, `search`, `row`, `rowSummary`, `nextStep`, `history`, `delivery`, `list`) e
`core/material/steps.ts`, byte a byte, e o painel reexporta por referência (`regrasDoPedidoNoCore`).

- **O endereço é a verdade** (`MAP-03`/`04`): `?visao=<id>` ou `?bloco=<id>`, lidos SÓ por
  `recorteDoEndereco` e escritos SÓ por `pedidosHref` (`entities/order/model/pedidosHref.ts`) — o mesmo
  dono que a Início usa. Valor fora do vocabulário ⇒ o padrão ("Precisa de ação"). Chip e "Limpar
  filtro" trocam o endereço por **substituição**. O termo da busca é estado da página (fora da URL).
- **Toda leitura passa por `lerComPapel`** (`entities/order/api/lerComPapel.ts`, `MAP-36`..`38`): a
  RPC `atelie_clock` (migration `20261024120000`, sem tabela) sai EM PARALELO com a consulta, e o dado
  só sai se ela respondeu. A RLS de `orders` devolve a uma conta SEM papel os pedidos DELA, sem erro —
  sem a RPC a lista os desenharia como a fila da loja. Ordem (E2): a recusa da RPC vence, depois o erro
  da consulta. `Promise.allSettled`, nunca `all`. O nome da RPC é **literal**, só ali
  (`marcacaoSoPorAcao` da loja). Com `42501`, a vigia (`useRecusaDePapel`) reconfere o papel e a
  recusa da `72` assume; enquanto isso, nenhuma linha, nem a do cache. Rede nunca é recusa. O
  `lido_em` da RPC é o relógio de "há N dias" (nada pelo relógio do aparelho).
- **A lista** (`useListaDePedidos`): janela de 25, `count: 'exact'` só na primeira; a próxima página
  pelo cursor `(created_at, id)` com as strings do servidor (µs); o anexar é descartado se a
  **geração** da chave mudou (E3); a sentinela (`IntersectionObserver`, `rootMargin` 600 px) se
  rearma a cada janela (E4). `staleTime: 0`, `refetchOnWindowFocus`, `retry: retryUnlessDenied`.
- **O detalhe** (`usePedido`): as cinco leituras (`order_list`, `order_items`, `order_status_history`,
  `order_notes`, `order_notifications`) dentro de UM `lerComPapel`; cada bloco falha sozinho, e o
  "Tentar de novo" de um bloco relê a query inteira sem trocar os bons por esqueleto (TE4). O
  "Voltar" volta por `navigate(-1)` só quando a entrada veio do app (`state.doApp`), senão `/pedidos`
  por substituição (E7). Total é `orders.total`, nunca a soma das linhas.
- **O canal do Realtime abre depois da primeira leitura com o papel CONFIRMADO** e fecha na recusa
  (`atelie-pedidos-realtime`, `atelie-pedido-realtime`); relê a lista/o pedido e o resumo da Início.
- **O selo da aba** (`widgets/tab-bar/model/selo.ts`) é `fila.precisa_acao` do resumo da Início
  (`useResumo`, a mesma consulta, deduplicada): `99+` acima de 99, nada com 0, erro ou sem dado; o
  número vai no `aria-label` do link, o selo é `aria-hidden`.
- **"Últimos pedidos" da Início viraram links** para o detalhe (`MAP-52`).
- **Troca de conta limpa o cache** (`LimparCacheNaTrocaDeConta` em `App.tsx`). ⚠️ `SPEC_DEVIATION`
  de E6, medida: logout (`id` → `null`) ⇒ `queryClient.clear()`; troca A → B ⇒ `resetQueries()`.
  `clear()` não avisa quem observa (a página de A seguia montada com o selo de A), e `resetQueries()`
  no logout relia as consultas montadas e reenchia o cache.
- **O `h1` existe em todo estado** (E5) — o foco da troca de aba vai a ele mesmo com a leitura
  pendente; o detalhe intitula o documento "Pedido · Ateliê" → "Pedido #0244 · Ateliê".

## Ações no pedido (feature `75`, `AD-059`)

O app passa a GRAVAR: "Recebi o material", "Iniciar separação", "Marcar como enviado"/"Salvar
rastreio" (a folha), "Marcar como retirado", "Informar/Alterar" o rastreio na Entrega, e o lembrete do
material no WhatsApp. **Nada disso tem regra no app.**

- **Quem decide a ação é `core`**: `appPrimaryAction(row)` (o rótulo e o PLANO, com a guarda de status
  de origem) e `trackingSheet(row, origem)` (`core/orders/appAction.ts`). O app nunca testa `status`
  (`regraDePedidoSoNoCore`). As frases fixas (falha, "mudou", parcial, confirmação) também são de
  `core` (`fraseDaAcaoSoNoCore`, sem allowlist).
- **Quem grava é o dono, `@estrelinha/core/order-actions`** (`runAppAction`) — o MESMO que o painel
  chama. O app entra por **uma porta**, `features/order-actions/api/gravarAcao.ts`, que só ENTREGA o
  client ao dono (nunca é receptor de `from`/`rpc`/`functions`, `escritaSoPelaPorta` pela AST) e traduz
  o desfecho: `sem-papel` ⇒ lança `{ code: '42501' }` (a recusa da `72`); **zero linhas é pergunta,
  nunca resultado** — `conferirPapel` (`atelie_clock`) responde: `42501` ⇒ a recusa, papel de pé ⇒
  "Este pedido mudou enquanto você olhava.", sem rede ⇒ falha (rede nunca é recusa). A prova é sobre o
  supabase-js REAL (`acoesComClientReal`): o PostgREST responde **200 com `[]`** ao `update` que a RLS
  filtra.
- **O estado da ação mora em MÓDULO** (`model/travas.ts`, `avisos.ts`, `erros.ts`): a trava por
  pedido (o segundo toque no mesmo tique não sai), a confirmação (`AvisoDaAcao` no `MobileLayout`,
  `role="status"`, 5 s, sem roubar o foco) e o erro (`role="alert"`, até a próxima ação), lidos igual
  pelo rodapé, pelo cartão e pela folha. A troca de conta os esquece (`esquecerAcoes`, pela geração).
  Depois de todo desfecho que chegou à rede, relê o pedido, todos os recortes da lista e o resumo do
  selo — nunca `setQueryData`.
- **A folha do rastreio mora no HISTÓRICO** (`useFolhaNoHistorico`): abrir empurra uma entrada com o
  MESMO endereço e o marcador só no `state` (nada na URL; `pedidosHref` segue o único dono); o voltar
  do Android a fecha sem sair do pedido. **F5 com a folha aberta** ⇒ `navigate(-1)` só pelo usuário da
  ORIGEM do marcador (B01: o `replace` da spec deixava um voltar morto, e os dois usuários do detalhe —
  rodapé e Entrega — voltavam duas vezes; no jsdom as duas voltas caem na mesma entrada, no Chromium
  se somam). O teclado virtual sobe a folha (`useTecladoVirtual`, `visualViewport`).
- **Menos movimento** (R2): o `SheetContent` anima por `data-[state=…]:animate-…`, e só o par NO MESMO
  seletor desliga (`motion-reduce:data-[state=open]:animate-none`). O FUNDO também: o
  `SheetContent` de `packages/ui` ganhou `overlayClassName?` (B02) — sem ele o `fade` do fundo animava
  com "menos movimento".
- **O rodapé** (`RodapeDaAcao`) é fixo acima da barra de abas, com a reserva no fim do conteúdo
  (`shared/ui/alturas.ts`, `--altura-do-rodape`); o **cartão** da lista leva o botão como IRMÃO do link
  (nunca botão dentro de `<a>`).
- **O lembrete no WhatsApp** só aparece com `canChargeMaterial` (aguardando material, não cancelado,
  `normalizeBrPhone(customer_phone)` válido); o texto é `chargeMaterialUrl` de `core/orders/charge.ts`,
  o MESMO do painel (byte a byte, provado em navegador), sem nomear o material (`BL-015`).
- **A retentativa diz o que reenvia** (C01 do QA): o "Tentar de novo" da falha parcial guarda
  `{ tipo: 'primaria', espera: 'separar' }`; se a linha relida já oferece OUTRA ação, `runAppAction`
  devolve `mudou` **sem ir à rede** ("Este pedido mudou enquanto você olhava.", sem novo "Tentar de
  novo"). Sem a `espera`, uma retirada relida em `separating` gravaria `delivered`. Rodapé **e** cartão
  repassam a retentativa — cada superfície tem a sua régua (`L-064`).
- **"Alterar rastreio" só afirma o aviso que saiu** (C02): a frase "já recebeu o aviso de postagem" exige
  `order_shipped` em `sent` (`shippedNoticeSent`, das mesmas linhas do histórico; leitura em erro ⇒
  `false`). `SPEC_DEVIATION` em A10.
- **O foco volta a quem abriu a folha** (C03): `onOpenAutoFocus` guarda o `activeElement` (nunca o
  `<body>`), `onCloseAutoFocus` o devolve com `preventScroll`; se ele saiu da tela, o `main h1`
  (`tabindex="-1"`).
- **O botão do cartão diz de qual pedido é** (C04): `aria-label` = o texto visível primeiro +
  `nomeDaLinha(linha)` (`entities/order/model/nomeDaLinha.ts`, o mesmo nome do link).
- **Prova**: o probe `.specs/features/75-mobile-adm-acoes-do-pedido/probes/01-paridade.*` (app × painel
  contra o banco local, e a conta sem papel), `prova-navegador.md` e o reteste do QA
  (`docs/qa/reports/2026-10-24-mobile-adm-acoes-do-pedido-reteste.md`). Pendente: o Android real
  (TalkBack, o gesto de voltar, o teclado).

## PWA — só a casca

- `pwa.config.ts` é um arquivo **separado** do `vite.config.ts` para os guardas lerem a configuração
  como dado: o plugin só resolve as opções dentro do ciclo do Vite. `manifest.test.ts` confere os
  campos **e** a fiação (que o `vite.config.ts` passa ESTE objeto ao `VitePWA`).
- O service worker pré-carrega HTML, JS, CSS, fontes e ícones, e **não tem `runtimeCaching`
  nenhum**: `*.supabase.co` é sempre rede (dado de dinheiro desatualizado é pior que ausente).
  `swSemDadosDaLoja.test.ts` recusa cache em tempo de execução e `json` no precache.
- `registerType: 'autoUpdate'`: a versão nova vale na próxima abertura. `sw.js` e o manifest saem com
  `no-cache` pelo `vercel.json` (`vercelConfig.test.ts`).
- `theme_color`/`background_color` vêm de `ESTRELINHA_COLORS['primary-strong']`, importado; o
  `theme-color` do `index.html` é escrito por um plugin a partir da MESMA constante.
- **O ícone da aba** é o `icons/icon-192.png`, declarado no `index.html` (`MAF-27`; antes o Chrome
  pedia `/favicon.ico` e recebia 404).
- **A splash estática** (`splashEstatica.ts`, `MAF-28`): no build, um plugin põe dentro de `#root` a
  splash com o lockup lido do MESMO arquivo que a `Splash` importa (nada de segunda cópia), cores de
  `ESTRELINHA_COLORS` e o primeiro quadro da animação do React (lockup 8 px abaixo, barra em 8%; o
  final com movimento reduzido). O `createRoot` a substitui ao montar; medido em 390 × 844 no build
  servido, as caixas do lockup, da barra e do rótulo são idênticas nos dois quadros, nos dois modos de
  movimento.
- **Prova de instalabilidade**: `Page.getInstallabilityErrors` vazio no Chromium (a `72`). A
  instalação num Android real fica com o usuário.

## Identidade

- **A paleta é a da LOJA** (`estrelinha-*`), não `estrelinha-admin-*`. Os objetos vêm do dono único,
  `packages/ui/src/tokens/estrelinha.ts`; o `tailwind.config.ts` daqui os importa, e
  `palette.test.ts` (suíte da loja) exige **identidade** (`toBe`) com o dono — uma cópia literal
  reprova. Este app não declara variável de paleta nenhuma; `app/app.css` lê cor por `theme()`.
- `@estrelinha/ui/styles.css` continua importado (os primitivos do shadcn leem as variáveis dele); a
  cor vem das classes passadas aos primitivos. As classes de campo e botão moram em
  `shared/ui/campo.ts`: borda de campo `field`, ação `rounded-sm`, alvo de 48 px.
- **As fontes são cópia deliberada** de `apps/store/public/fonts/`, com o mesmo `@font-face` e o
  mesmo `preload`. `fontesDoAteliePareadas.test.ts` (suíte da loja) compara o SHA-256 dos dois lados.
- **A splash usa o LOCKUP completo negativo a 300 px** — exceção declarada à escada da marca (piso de
  600 px), decisão do usuário em 2026-10-22, no molde do header do checkout a 180 px. É SVG **inline**
  (`?raw`), nunca `<img>`. A cópia em `features/splash/assets/` é comparada byte a byte com o
  SVG-fonte de `.specs/brand` por `lockupDaSplashPareado.test.ts`.
- **A splash não tem tempo próprio**: piso de 600 ms (`useMinimumDuration`), nunca os 2,4 s do
  protótipo. Toda animação tem `motion-reduce:animate-none` na mesma linha; com movimento reduzido o
  lockup fica no lugar e a barra, cheia e parada. O lockup nunca nasce com opacidade zero.

## Navegação

- `TABS` (`widgets/tab-bar/model/tabs.ts`) é o dono da lista de abas: a barra desenha dali, as
  páginas tiram o título dali, e `abasSaoAsRotas.test.ts` compara com as rotas do `App.tsx` nos dois
  sentidos.
- A barra é `fixed` com `pb-[env(safe-area-inset-bottom)]`, rótulo visível, alvo `min-h-12`. O fio de
  cima é **sombra**, não borda: borda somava 1 px e o rodapé entrava sob a barra (medido).
- A reserva da altura da barra vem **depois** do rodapé (a lição do `BOTTOM_BAR_H` da loja).
- O voltar do Android é o do navegador: as abas e os passos da recuperação empilham histórico, e
  nada é interceptado.
- **A troca de aba se anuncia** (`MAF-29`): o título do documento vira "<Aba> · Ateliê"
  (`tituloDaAba`, em `TABS`), e o foco vai ao `h1` da página (o `MobileLayout` põe `tabindex=-1`) —
  não na primeira montagem. Fora das abas, `TelaDeEntrada` devolve o título do `index.html`.
- **A tela Sem conexão nasce numa região viva assertiva** (`MAF-30`).
- Os ícones das abas são do `lucide-react` (`MAF-14` aceita; `@estrelinha/ui/icons` só quando o lucide
  não tiver o desenho).

## Os guardas do app

| Guarda | Onde | O que derruba |
| --- | --- | --- |
| `rotasSobGuarda.test.ts` | `src/app/__tests__` | rota fora do bloco do `RequireAdmin` (menos `/login` e os três de `/recuperar`, com a razão); o bloco sem `loginPath="/login"`, `fallback={<Splash />}` e o `unknownFallback`; mais de um `</Route>` |
| `passosSaoRotas.test.ts` | `src/features/recovery/__tests__` | passo da recuperação sem rota, rota sem passo, ou rota desenhando o passo errado |
| `splashEstatica.test.tsx` | `src/app/__tests__` | o ícone da aba ausente ou fora do disco; a splash estática sem o lockup idêntico ao asset, com cor digitada, sem o primeiro quadro do React, ou o plugin desligado |
| `papelEmTresEstados.test.tsx` | idem | o papel que falha ou não responde virando `not-admin`; a falha nas três formas (`{ error }`, lançada, rejeitada) no papel, na sessão e no cadastro; o teto de 8 s (7.999 ainda splash, 8.000 a frase) também com o cadastro e a sessão pendurados; `unknown` guardado como resolvido; a recusa ou o "Sair" no `unknown` |
| `contratoComClientReal.test.tsx` | idem | **sobre o supabase-js REAL** (`src/test/clientReal.ts`): o `INITIAL_SESSION` nulo de uma leitura que falhou desfazendo o `unknown` (com a sessão ainda salva), e as vizinhas (sessão ausente e `SIGNED_OUT` levam a "sem sessão"); a volta da aba piscando `loading` ao reperguntar o papel; o "Tentar de novo" sem `loading`; o dedupe `emVoo` (uma consulta na abertura, e o teto do login não reaberto por um `SIGNED_IN` no meio); o cadastro que estourou o teto não sendo pedido de novo |
| `reentradaComClientReal.test.tsx` | idem | **sobre o client real** (fecho da r3): sair com a checagem do papel em voo e entrar de novo com a mesma conta ficando deslogado (X06); o "Tentar de novo" com uma repergunta em voo preso no `loading` (X07) — os dois pelo provider e pelo `<App />`; e a reentrada da mesma conta sem a splash (X05). Mais, em `contratoComClientReal`, o `not-admin` conferido sendo reperguntado a cada volta da aba (X04) |
| `clientRealPareado.test.ts` | `src/test/__tests__` | as duas cópias do arnês do client real (`src/test/clientReal.ts` e `apps/store/src/test/clientReal.ts`) divergindo fora do comentário do topo. Âncora (os dois lidos, cada cabeçalho cita o guarda), dois sensores e o inverso (só o cabeçalho diferente passa) |
| `corridasDoPapel.test.tsx` | `src/app/__tests__` | a resposta do papel depois de a sessão cair promovendo a admin (P1, no provider e no `<App />`); o teto de um "Tentar de novo" apagando um `admin` conferido (P3); a leitura da sessão velha trocando a conta que entrou no meio dela. A metade do painel está em `apps/backoffice/src/app/__tests__/papelDaSessaoQueCaiu.test.tsx` |
| `abasSaoAsRotas.test.ts` | `src/widgets/tab-bar/__tests__` | aba sem rota ou rota sem aba |
| `swSemDadosDaLoja.test.ts` | `src/app/__tests__` | `runtimeCaching`, padrão casando o host do banco, `json` no precache |
| `manifest.test.ts` | idem | um campo de `MAF-01`, cor digitada em vez de importada, ícone com tamanho diferente do declarado, a fiação com o `VitePWA` |
| `vercelConfig.test.ts` | idem | os headers de `MAF-04`, `sw.js`/manifest em cache, o rewrite da SPA capturando os dois |
| `scaffold.test.ts` | idem | o script `dev:mobile-adm` da raiz filtrando outro workspace, a porta 8084 (dev e preview), a `VITE_BACKOFFICE_URL` fora do `env` do build do `turbo.json`. Que o build gera `manifest.webmanifest`/`sw.js` é provado executando o build, não por este guarda |
| `TabBar.test.tsx` | `src/widgets/tab-bar/__tests__` | (além do comportamento) a aba sem ícone, ou com o ícone de outra: o par aba → ícone (casa, sacola, pessoas, etiqueta) é escrito por extenso no teste, nunca derivado de `TABS` |
| `InicioPage.test.tsx` | `src/pages/__tests__` | (feature `73`, pelo `<App />` real) uma chamada de cada RPC, sem argumento, e nenhuma tabela lida; erro **e** pendura de cada leitura sozinha; a recusa (`42501`) de cada RPC ⇒ uma chamada e o Login, sem número; o laço da vigia; rede nunca vira recusa; um canal, fechado ao trocar de aba e ao sair; o aviso, o puxar, o foco, a virada e a volta da rede relendo as duas; resposta antiga descartada |
| `inicioComClientReal.test.tsx` | `src/app/__tests__` | (feature `73`, sobre o supabase-js REAL) o 403 `42501` do PostgREST levando à recusa; o 500 e a falha de rede levando à falha do bloco, nunca à recusa |
| `pedidosComClientReal.test.tsx` | `src/app/__tests__` | (feature `74`, sobre o client REAL) `/pedidos` e `/pedidos/<id>` com `order_list` devolvendo as linhas DA CLIENTE e `atelie_clock` em 403 `42501` ⇒ a recusa e nenhum texto delas em nenhum instante lido; com `order_list` em 500 a recusa ainda vence; RPC sem rede ⇒ falha de leitura |
| `leituraSoComPapel.test.ts` | `src/entities/order/api/__tests__` | (feature `74`, pela AST) o client importado fora de `lerComPapel.ts` e dos dois hooks; `.from(` alcançável fora de `lerComPapel(` |
| `enderecoDePedidosComDonoUnico.test.ts` | `src/entities/order/__tests__` | (feature `74`) o endereço de Pedidos lido ou escrito fora de `pedidosHref.ts` |
| `regraDePedidoSoNoCore.test.ts` | `src/shared/lib/__tests__` | (feature `74`) mapa ou `case` com vocabulário de visão/status/pagamento/meio (importado de `core`), ou predicado de recorte, fora de `core` |
| `movimentoDosPedidos.test.ts` | idem | (feature `74`) `transition-*`/`animate-*` sem par `motion-reduce:` que desligue, nos arquivos de UI da `74` e da `75` (28, escopo literal); desde a `75` vê a variante de estado (`data-[state=open]:`) e só a cobre com o par do MESMO estado, e exige os dois pares em todo arquivo que monta `SheetContent`. Âncora 8 tokens / 6 pares (B02) |
| `escritaSoPelaPorta.test.ts` | `src/entities/order/api/__tests__` | (feature `75`, pela AST) escrita de tabela, `functions.invoke` ou `rpc(` fora de `lerComPapel.ts`; o client importado fora dos quatro arquivos (os três da `74` e a porta), ou usado como receptor na porta |
| `fraseDaAcaoSoNoCore.test.ts` | `src/shared/lib/__tests__` | (feature `75`, pela AST, sem allowlist) as frases fixas da ação escritas no app |
| `acoesComClientReal.test.tsx` | `src/app/__tests__` | (feature `75`, sobre o client REAL) PATCH `[]` + `atelie_clock` 403 ⇒ a recusa e nenhuma confirmação (lida por passo e por `MutationObserver`); `not_admin` ⇒ recusa; 500 ⇒ falha; a conferência sem rede ⇒ nem recusa nem reconferência; o que vai no PATCH do rastreio |
| `escritaNoArnes.test.ts` | `src/test/__tests__` | (feature `75`) os dois arneses (`fakeSupabase` e `clientReal`) deixando de registrar a escrita (valores, cadeia, método, corpo) |
| `trocaDeContaLimpaCache.test.tsx` | `src/app/__tests__` | (feature `74`) nada da conta anterior desenhado depois de A → B ou de sair e voltar; a volta da aba do mesmo usuário piscando |
| `lockupDaSplashPareado.test.ts` | `src/features/splash/__tests__` | a cópia do lockup divergindo do SVG-fonte |
| `Splash.test.tsx` | idem | `<img>` na splash, a largura de 300/120, o rótulo, animação sem o par `motion-reduce:` |

Na suíte da **loja**, por ler a loja junto: `palette.test.ts` (o config daqui é o terceiro leitor),
`fontesDoAteliePareadas.test.ts` e `buttonShape.test.ts` (lê o raio do dono em `packages/ui`).

## Testes

- O `src/test/fakeSupabase.ts` é o dublê do client: o `AuthProvider` **real** roda sobre ele. Ele
  grava toda tabela lida (`leiturasDeDado()` exclui as do próprio provider) e sabe **segurar** a
  resposta do papel. `src/test/montarApp.tsx` monta o `<App />` inteiro e passa o piso da splash —
  teste de fiação monta a árvore real, nunca recria a composição.
- O dublê também sabe **falhar** o papel (`estado.erroDoPapel`), **pendurá-lo** para sempre
  (`pendurarPapel()`) e devolver erro no pedido de código (`estado.erroDoEnvio`, o 429). Desde o
  conserto r1 da Fase 6: falhar nas três formas (`estado.falhaDoPapel`, `falhaDaSessao`,
  `falhaDoCadastro`, com `'erro' | 'lanca' | 'rejeita'`), pendurar o cadastro e a sessão
  (`pendurarCadastro()`, `pendurarSessao()`) e renovar o token (`renovarToken()`).
- **O dublê já mentiu uma vez sobre a ordem de eventos** (`L-055`, a r2 da Fase 6): ele não emitia
  `INITIAL_SESSION` nem o `SIGNED_IN` da volta da aba, e dois defeitos passaram por isso. Hoje ele
  emite os dois — `INITIAL_SESSION` com o resultado da última `getSession` (o nulo na falha, nada na
  leitura pendurada) e `voltarAba()` —, e a regra de auth que depende da ordem de eventos se prova
  **também** em `src/test/clientReal.ts`: o `GoTrueClient` e o `PostgrestClient` reais, com `fetch` e
  `storage` nossos, relógio falso e o `Proxy` que dá a cada teste um client novo. Dentro de um único
  `act` o React só renderiza no fim: régua de "não pisca" anda o relógio em passos (`andarVigiando`),
  senão é verdadeira nos dois mundos. A loja tem a cópia deliberada do arnês
  (`apps/store/src/test/clientReal.ts`), **com guarda** (`clientRealPareado.test.ts`): mudou um, mude o
  outro no mesmo movimento. O arnês roda com `autoRefreshToken: false` (produção usa `true`) e o
  `fetchFalso` não confere o `Authorization` — por isso a armadilha do 401 (o `setTimeout(0)` do
  ouvinte) não tem régua; dívida em `BL-049`. Na volta da aba, conte os `SIGNED_IN`: o `visibilitychange`
  sem `bubbles` não chega ao client, e uma régua de "não pisca" passaria sobre um evento que não saiu.
- **Feature `73`**: o dublê ganhou `rpc()` (registra nome **e** argumentos; `responderRpc`,
  `falharRpc`, `pendurarRpc`, `aoChamarRpc` por chamada, `chamadasDe`) e o Realtime (`channel`,
  `removeChannel`, `canaisAbertos()` e `emitir()`). O arnês do client real ganhou `rpc` no cenário
  (`{ status, corpo }`, `rede`, `pendura`; RPC sem entrada responde `null` com 200, que a tela lê como
  "ainda sem dado") — nas **duas** cópias. O `onlineManager` do React Query é do MÓDULO: teste que
  derruba a rede o devolve a `online` no `afterEach`.
- **Feature `74`**: o dublê registra a **cadeia inteira** de cada tabela (`select` com opções, `or`,
  `eq`, `order`, `limit`, `maybeSingle`…; `responderTabela`, `falharTabela`, `pendurarTabela`,
  `cadeiasDe`) e **lança** para tabela sem resposta configurada; `src/test/intersecao.ts` instala um
  `IntersectionObserver` falso em todo teste (`dispararInterseccao`); `src/test/pedidos.ts` tem as
  fixturas (chaves de `COLUNAS_DA_LISTA`/`COLUNAS_DO_DETALHE`, conferidas contra o PostgREST pelo
  probe `02`). O arnês do client real ganhou `tabelas` (a mesma forma de `rpc`, para tabela ou view;
  `user_roles` e `customers` seguem com campo próprio) — nas **duas** cópias.
- `montarApp(caminho, { estado })` monta a entrada já com o `location.state` (o React Router o lê de
  `history.state.usr`). Gravar o estado antes com `replaceState` **não serve**: o `pushState` do
  `montarApp` cria uma entrada nova, sem ele — foi assim que um caso de `MAF-24` virou cópia do caso
  "sem estado" (V12).
- O histórico do jsdom é **um só por arquivo**: um teste de voltar que não empilha uma sentinela
  antes da própria entrada pode passar pela entrada que um teste anterior deixou (V16).
- Réguas de tempo exato (os 8 s) usam `vi.useFakeTimers()` **sem** `shouldAdvanceTime`: o relógio
  de verdade andando por baixo empurraria o 7.999 para depois do 8.000.
- Testes com o app inteiro usam `vi.useFakeTimers({ shouldAdvanceTime: true })` (o `BootGate` tem um
  temporizador, e o `findBy*` precisa do relógio andando).
- Gate de qualquer mudança aqui: a suíte deste app **e** as da loja e do painel (os guardas de lá
  varrem `apps/**`).
