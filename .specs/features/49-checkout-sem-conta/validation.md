# Checkout sem conta — Verificação independente

**Feature**: `49-checkout-sem-conta`
**Intervalo coberto**: `f8609b6..HEAD` (`8058cca`, `d3087a3`, `9db6249`, `d72b93a`, `0f38fe1`, `38ad7b3`)
**Data**: 2026-09-13
**Verificador**: sessão independente — **autor ≠ verificador**. Nenhuma linha desta feature foi
escrita por quem assina este relatório.
**Árvore**: worktree `.claude/worktrees/49-checkout-sem-conta`, `git status` limpo na abertura e no
fecho (exceto este arquivo).

---

## Veredito: **FAIL**

**Nenhum defeito de produção foi encontrado.** O código lido está correto em todos os caminhos que
consegui exercer: a ordem das escritas, a recusa do 409, o hash do token, a dupla prova de posse do
`create-payment`, o recuo do pagador órfão e os cinco workspaces batem com a baseline anunciada.

O `FAIL` é de **cobertura**, e pela régua que este repositório escreveu para si depois das features
`41`, `44` e `47`: **as duas pontas estão provadas e o fio entre elas não.** Seis mutações de
comportamento sobreviveram, e duas delas apagam a feature inteira — a convidada não consegue pagar —
com **3260/3260 testes do store verdes**. Uma terceira deixa **todo pedido de quem tem sessão nascer
órfão** com 66/66 verdes na function.

Nenhuma delas se conserta afrouxando nada: são asserções que faltam, em lugares onde o repositório
já sabe que elas fazem falta.

---

## 1. Medição — cinco workspaces, um por vez, exit code fora de pipe

Medidos do disco com `git status` vazio, **depois** de toda mutação ser desfeita.

| Workspace | Anunciado no `CLAUDE.md` | **Medido** | Bate? |
| --- | --- | --- | --- |
| store (`--testTimeout=20000`) | 3260 / 212 | **3260 / 212** · exit 0 | ✅ |
| backoffice (`--testTimeout=20000`) | 2228 / 129 | **2228 / 129** · exit 0 | ✅ |
| core | 2235 / 87 | **2235 / 87** · exit 0 | ✅ |
| functions | 518 / 12 | **518 / 12** · exit 0 | ✅ |
| catalog-import | 512 / 23 | **512 / 23** · exit 0 | ✅ |

| Outras medidas | Baseline | Medido |
| --- | --- | --- |
| Lint | 27 erros / 6 warnings (backoffice 25/4 · store 2/2) | **27 / 6** — store 2/2, backoffice 25/4. Os 4 do store são pré-existentes (`ProductInfo.tsx`, `ShareButtons.tsx`, `ShippingCalc.tsx`) |
| Tipos | 0 · 0 · 0 | **0 · 0 · 0** (`tsconfig.app.json` de cada app + `tools/catalog-import`) |
| `packages/core/src/payment/**` | intocado | **intocado** — `git diff --name-only f8609b6..HEAD -- packages/core/src/payment` devolve vazio |

`supabase/functions/mercado-pago/handlers.ts` **foi** alterado, e isso é declarado no design: a
extração de `corsHeaders`/`json` para `_shared/http.ts`, o bloco de posse e o recuo do pagador. O
cálculo de preço, o `buildPayer` e o webhook não foram tocados.

---

## 2. Cobertura por AC — evidência ou zero

Cada linha cita `arquivo:linha` da asserção, não o nome do `it`. "Desfecho" é o que a spec exige.

### P1 — Comprar sem criar conta (CSC)

| AC | Evidência | Desfecho asserido | |
| --- | --- | --- | --- |
| CSC-01 | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx:412` + `:421` + `:429` | três blocos renderizados; `useAuthUiStore.getState().isOpen` **false**; texto "Faça login" ausente | ✅ |
| CSC-02 | `CheckoutPage.test.tsx:547` (`expect(cta()).toBeEnabled()` sem sessão) + `packages/core/src/checkout/__tests__/blocks.test.ts:470` (`'guest'` deixa a régua idêntica) | CTA habilita pelas regras de `resolveFlow`, sem condição extra | ✅ |
| CSC-03 | `CheckoutPage.test.tsx:1278` e `:1296` — pedido criado sem ficha, com `customer_id: null` no corpo | cria o pedido e segue sem autenticação | ✅ |
| CSC-04 | `supabase/functions/checkout/__tests__/createOrder.test.ts:103` (`customer_name`/`customer_phone`/`customer_document`) + `buildOrderPayload.test.ts:166` + `CheckoutPage.test.tsx:1243`/`:1266` | as quatro colunas gravadas com o digitado | ✅ |
| CSC-05 | `PixPayment.test.tsx:312`/`:323` (a convidada pergunta e o sucesso dispara) + `CheckoutPage.test.tsx:1445` (navega para `/pedido/<id>`) | aprovado ⇒ `/pedido/:id` com confirmação | ⚠️ — a navegação só é exercida **com** sessão (`authState.user` é o padrão do arquivo). As duas metades existem, a composição "sem sessão" não |
| CSC-06 | `apps/store/src/entities/order/api/__tests__/useOrder.test.tsx:80` (`invoke` com `{order_id, access_token}`, `from` não chamado) | recarregar mostra o pedido dentro da validade | ✅ |
| CSC-07 | `createOrder.test.ts:223` — `updates` contém `{table:'orders', values:{customer_id:'cus-1'}, eq:['id','ord-1']}` | conta criada e pedido ligado | ✅ |
| CSC-08 | `createOrder.test.ts:246` (GoTrue fora do ar ⇒ 200, token emitido, sem vínculo) + `mercado-pago/__tests__/handlers.test.ts:2848` (pagador do órfão vem de `orders.customer_document`) | pedido válido e **pagável** com `customer_id` nulo | ✅ |

### P1 — Entrar por dentro do checkout (ENT)

| AC | Evidência | Desfecho asserido | |
| --- | --- | --- | --- |
| ENT-01 | `CheckoutPage.test.tsx:465` — `compareDocumentPosition` prova que o convite vem **antes** do bloco Contato, na página real | convite acima do Contato | ✅ (fiação provada pela página, não pelo componente) |
| ENT-02 | `CheckoutPage.test.tsx:483` — `isOpen === true` e `returnTo === '/checkout'` | overlay com `returnTo=/checkout` | ✅ |
| ENT-03 | `features/auth/model/__tests__/useAuthFlow.test.tsx:240` ("does not navigate when returnTo equals the current route") + `SignInInvite.test.tsx:46` | fecha sem navegar | ⚠️ — o **mecanismo** é pré-existente e testado; a **composição** (rascunho intacto depois do login no checkout) não tem asserção |
| ENT-04 | `CheckoutPage.test.tsx:477` + `SignInInvite.test.tsx:36` | com sessão o convite não renderiza | ✅ |
| ENT-05 | `ContactBlock.test.tsx:79` (semeia de `customers`) | semeia o vazio | ❌ **a segunda metade não tem asserção** — "campos já digitados SHALL ser preservados" é mutável sem reprovar nada (ver M26) |
| ENT-06 | `SignInInvite.test.tsx:69` — ausência de `4285F4`/`EA4335` e de "google" | ícone não é marca de provedor | ✅ |
| ENT-07 | `SignInInvite.test.tsx:79` (`className.split(/\s+/)` contém `min-h-11`, token exato) + `:87` (`flex-wrap`, nenhum `w-[`/`min-w-[`) | 44px e sem estouro em 390 | ⚠️ proxy de forma — jsdom não mede. Dívida declarada |

### P1 — E-mail que já tem conta pede o código (IDN)

| AC | Evidência | Desfecho asserido | |
| --- | --- | --- | --- |
| IDN-01 | `useAccountLookup.test.tsx:54` (dois blur ⇒ uma requisição) + `:64` (maiúsculas são o mesmo e-mail) + `:86` (duas chamadas simultâneas compartilham a promessa) | uma vez por e-mail normalizado | ⚠️ **a metade "nunca a cada tecla" não tem asserção** (ver M24) |
| IDN-02 | `CheckoutPage.test.tsx:521` — `contato` **contém** o `auth-code-step` e o texto "Este e-mail já tem cadastro na loja" | aviso + pedido do código dentro do Contato | ✅ |
| IDN-03 | `CheckoutSignInChallenge.test.tsx:50`/`:56`/`:84` (envia uma vez, renderiza `AuthCodeStep`) + guarda `shared/lib/__tests__/desafioDeCodigoUnico.test.ts:289` (nenhum segundo `<InputOTP>` fora de `features/auth/ui/steps`) | reusa o passo, com o mesmo cooldown | ✅ |
| IDN-04 | `packages/core/src/checkout/__tests__/blocks.test.ts:466` (`isContactComplete(…, 'challenge') === false`) + `:493` (`complete.length` nunca chega a 3) + `CheckoutPage.test.tsx:531` (`expect(cta()).toBeDisabled()`) | bloco não completa, CTA desabilitado | ✅ |
| IDN-05 | `CheckoutPage.test.tsx:569` — com sessão, e-mail com conta **não** desafia e o CTA fica habilitado | tratada como logada, desafio some, fluxo segue | ✅ |
| IDN-06 | `CheckoutPage.test.tsx:561` — `change` no campo derruba o `auth-code-step` | desafio desaparece | ✅ |
| IDN-07 | `CheckoutPage.test.tsx:584` (`orderId` vira `null` na troca de identidade) + `:602` (`clientRequestId` também) + `:620` (**par inverso**: sem troca, o pedido sobrevive a dois re-renders) | pedido em curso invalidado | ✅ |
| IDN-08 | `createOrder.test.ts:333` (409 + `reason: needs_otp`) + `:343` (`inserts`, `adminCreateUsers` e `updates` **todos vazios**) + `CheckoutPage.test.tsx:635` (o 409 abre o desafio, `toast.error` não é chamado) | recusa legível, nenhuma linha gravada | ✅ |
| IDN-09 | `identify.test.ts:128`/`:141`/`:154`/`:168` (teto, por IP, janela deslizante, sem IP libera) + `useAccountLookup.test.tsx:112`/`:118` (erro e rede caindo ⇒ `false`) | 429 e a tela segue como convidada | ✅ |

### P1 — Um dono só para criar o pedido (PED)

| AC | Evidência | Desfecho asserido | |
| --- | --- | --- | --- |
| PED-01 | `useOrders.test.tsx:97` — `invoke('checkout?action=create-order', …)` | mesma edge function, service role | ✅ |
| PED-02 | `createOrder.test.ts:297` — `customer_id: 'cus-logada'` no insert; `adminCreateUsers` vazio; `useOrders.test.tsx:119` prova que o `Authorization` **não** é montado à mão | pedido ligado ao `customers` do JWT | ⚠️ o **filtro** dessa busca não é observado pelo dublê (ver M27) |
| PED-03 | `shared/lib/__tests__/pedidoComDonoUnico.test.ts:105` — `expect(gravadores).toEqual([])` para `orders` e `order_items`, com âncora dupla (`:91` ≥400 arquivos, `:97` ≥2 leitores) | zero gravação por `apps/**` | ✅ sensibilidade provada por injeção real (reintroduzi `from('orders').insert` em `useOrders.ts` ⇒ reprova) |
| PED-04 | `createOrder.test.ts:356` (mesmo pedido, `inserts` vazio) + `:369` (acesso **usável**) + `:387` (hash substituído) + `:403` (par inverso: pedido com sessão não reemite) + `:425` (não reavalia identidade) | mesmo pedido, sem segunda conta | ⚠️ o **filtro** da busca de idempotência não é observado (ver M20) |
| PED-05 | `createOrder.test.ts:84` — `linha.guest_access_hash === await hashAccessToken(token)` e `JSON.stringify(linha)` não contém o token; guarda `orderAccessSingleOwner.test.ts:209` (só `orderAccess.ts` cita a chave) | token devolvido, banco só com hash | ✅ (servidor) / ❌ (navegador — ver M19) |
| PED-06 | `mercado-pago/__tests__/handlers.test.ts:2839` (token certo sem JWT ⇒ 200, 1 chamada ao MP) + `:2909` (sem nenhum dos dois ⇒ 401) | aceita token **e** continua aceitando JWT | ❌ no lado da loja — nada assere que o corpo leva `access_token` (ver M18) |
| PED-07 | `handlers.test.ts:2877` (expirado ⇒ 403) + `:2887` (pedido com sessão não abre por token) + `:2899` (`RETRYABLE_STATUSES` intacto ⇒ 409) + `:2919` (JWT de outro + token errado ⇒ 403) + `getOrder.test.ts:78`/`:90`/`:116`/`:128` | 403 em token errado, expirado ou de outro pedido | ✅ |
| PED-08 | `createOrder.test.ts:473` — `customers` recebe `{cpf:'52998224725', phone:'11988887777'}` com `eq ['id','cus-1']`; `CheckoutPage.test.tsx:1253` prova que a **página** não grava mais | CPF gravado pelo servidor, `PGD-04` com um dono | ✅ |
| PED-09 | `createOrder.test.ts:271` — `createUser` responde "já existe", a ficha é lida e o vínculo acontece | segunda tentativa reaproveita, venda não falha | ✅ |

### P2 — Endereço para a próxima compra (ADR)

| AC | Evidência | | |
| --- | --- | --- | --- |
| ADR-G1 | `createOrder.test.ts:482` — insert em `addresses` com `customer_id` e `cep` | ✅ |
| ADR-G2 | — | ❌ **não localizado.** `grep -rn "ADR-G2"` só encontra o nome do `describe` (`createOrder.test.ts:471`) e prosa em `CheckoutPage.test.tsx:1237`. Nenhum caso faz a gravação do endereço **falhar** e assere que o pedido segue 200. A propriedade é verdadeira no código (o `insert` é ignorado e está dentro de `try`), mas não é medida |

### Edge Cases da spec

| Edge case | Evidência | |
| --- | --- | --- |
| carrinho vazio sem sessão | `CheckoutPage.test.tsx:451` | ✅ |
| entrar depois do pedido criado ⇒ invalida | `CheckoutPage.test.tsx:584` | ✅ |
| entrar com e-mail diferente ⇒ e-mail digitado preservado como contato | — | ❌ a metade "identidade da conta" é provada (`createOrder.test.ts:314`); a metade "o e-mail digitado é preservado" **não** — nem no servidor (`comSessao` não assere `customer_email`) nem na tela (é exatamente o que M26 quebra) |
| e-mail com maiúscula ⇒ `lower()` nos dois lados | `createOrder.test.ts:113` · `identify.test.ts:72` · `useAccountLookup.test.tsx:64` · `checkoutSchema.test.ts:190` | ✅ |
| rede cai entre criar e pagar | `createOrder.test.ts:369` | ✅ |
| `/pedido/:id` de outro, sem token | `getOrder.test.ts:116` (mesmo 403 de token errado) + `OrderConfirmationPage.test.tsx` (o "não encontrado") | ✅ |
| acesso expirado ⇒ entrar por código | `OrderConfirmationPage.test.tsx:31`/`:42`/`:60` (par inverso) /`:70` (erro de rede **não** oferece código) | ✅ |
| código errado ⇒ cooldown | comportamento pré-existente de `AuthCodeStep` | ✅ (herdado) |

### Dimensões implícitas

| Dimensão | |
| --- | --- |
| Observabilidade — "**nunca** registra o token nem o código" | ❌ **sem guarda nenhum.** Ver M9 |
| Ciclo de vida do dado — 7 dias | ✅ `guestAccess.test.ts:60` e `createOrder.test.ts:96` (`2026-09-20T12:00:00.000Z`) |
| Fronteiras de auth | ✅ `mercado-pago` + `getOrder` |
| Concorrência | ✅ `PED-09` |

---

## 3. Sensor de discriminação — 27 mutações, **21 mortas · 6 sobreviventes**

Toda mutação foi aplicada ao código **real**, medida, e desfeita na hora (`git checkout --`).
`git status --porcelain` vazio ao fim.

### Mortas (21)

| # | Arquivo | Mutação | Reprovou |
| --- | --- | --- | --- |
| M1 | `core/checkout/identity.ts` | e-mail vence a sessão | 1 (`identity.test.ts`) |
| M2 | idem | `challenge` vira `guest` | 1 |
| M3 | `core/checkout/guestAccess.ts` | remove o recorte de hash ausente | 1 |
| M4 | idem | ignora a expiração | 3 |
| M5 | `core/checkout/blocks.ts` | remove `if (identity === 'challenge') return false` | 3 |
| M6 | `functions/checkout/handlers.ts` | **cria a conta ANTES do pedido** | 5 |
| M7 | idem | remove a recusa 409 | 2 |
| M8 | idem | retentativa devolve `access_token: null` | 2 |
| M10 | `functions/mercado-pago/handlers.ts` | aceita qualquer `access_token` sem conferir | 4 |
| M11 | idem | remove o recuo para `order.customer_document` | 2 |
| M12 | `store PixPayment.tsx` | apaga o `setInterval` da espera da convidada | 2 |
| M13 | idem | remove o `clearInterval` do desmonte | 1 |
| M14 | `store CheckoutPage.tsx` | apaga `<SignInInvite />` | 2 |
| M15 | idem | apaga `challenging`/`onChallenge` | 5 |
| M16 | idem | apaga o efeito de `IDN-07` | 2 |
| M17 | `store useOrder.ts` | nunca esquece o token recusado | 1 |
| M21 | `functions/checkout/handlers.ts` | remove o teto por IP do `identify` | 3 |
| M22 | idem | `get-order` devolve o hash e a validade | 1 |
| M23 | `store ContactBlock.tsx` | troca o `blur` por evento de digitação | 6 |
| S1 | `store useOrders.ts` | reintroduz `from('orders').insert(...)` | 1 (guarda `PED-03`) |
| M25 | — | (o mesmo S1, contado uma vez) | — |

### Sobreviventes (6) — os achados

| # | Arquivo · linha | Mutação | Suíte verde | Consequência real |
| --- | --- | --- | --- | --- |
| **M19** | `apps/store/src/pages/CheckoutPage.tsx:368` | `if (order.access_token) rememberAccess(...)` ⇒ nunca chama | **store 3260/3260** | A convidada **não paga**: sem token guardado, `create-payment` recebe corpo sem `access_token` e sem JWT ⇒ **401**. `/pedido/:id` também quebra, e a espera do PIX nunca liga |
| **M18** | `apps/store/src/features/checkout/api/useCreatePayment.ts:60` | remove `access_token` do corpo | 419/419 no slice `features/checkout` — e **nenhum** teste do store cita `access_token` num corpo de `create-payment` | A convidada **não paga**: 403 `Pedido não pertence ao usuário autenticado` |
| **M27** | `supabase/functions/checkout/handlers.ts:174` | `.eq('user_id', user.id)` ⇒ `.eq('id', user.id)` | **functions 66/66** | **Todo pedido com sessão nasce órfão**; na sequência `create-payment` recusa a cliente logada com 403 |
| **M20** | `supabase/functions/checkout/handlers.ts:264` | `.eq('client_request_id', …)` ⇒ `.eq('customer_email', …)` | **functions 66/66** | A segunda compra da mesma pessoa devolve o **pedido anterior** — ela pagaria o pedido errado |
| **M26** | `apps/store/src/features/checkout/ui/ContactBlock.tsx:72-74` | a semeadura passa a sobrescrever o que já foi digitado | 419/419 | Quem digitou o e-mail do presenteado e depois clica em **Entrar** tem o campo trocado em silêncio — é o edge case que a spec nomeia |
| **M9** | `supabase/functions/checkout/handlers.ts:365` | o log de `create-order` passa a carregar `access_token` | **functions 518/518** | O segredo que dá acesso a ler e pagar o pedido vai para o log da function. A dimensão *Observabilidade* da spec diz "**nunca** registra o token" |

**M20 e M27 são a mesma falha estrutural**, e ela merece nome: o dublê
(`supabase/functions/_shared/testing/fakes.ts:212-222`) só enxerga o `.eq()` quando a fixture é
**função**. `createOrder.test.ts` usa fixtura de valor em todos os cenários, então **nenhum filtro de
coluna de `create-order` é observado por teste nenhum**. O próprio arquivo do dublê documenta o
mecanismo (`RowFixture`, linhas 118-136) — ele existe e não foi usado.

### Uma asserção verdadeira nos dois mundos

`supabase/functions/checkout/__tests__/createOrder.test.ts:198` — *"o pedido é gravado ANTES de a
conta ser criada"*, que o cabeçalho do arquivo chama de *"a asserção que separa esta implementação da
ingênua"*. Sob **M6** (conta criada antes do pedido) esse caso fica **verde**: `adminCreateUser` não
entra em `supabase.inserts`, então `tabelasGravadas[0] === 'orders'` e `adminCreateUsers.length === 1`
são verdadeiros nos dois mundos. Quem matou a M6 foram os vizinhos (`:223`, `:235`, `:271`, `:455`,
`:463`). O caso não é nocivo, mas não prova o que o nome promete.

---

## 4. Armadilhas conhecidas do repositório — o que procurei

| Armadilha | Achado |
| --- | --- |
| Teste que monta a própria árvore para provar fiação | **Não encontrada, e evitada por escrito.** `SignInInvite.test.tsx:9-13` e `CheckoutPage.test.tsx:460-464` declaram a divisão, e a página real reprova sob M14/M15 |
| Asserção verdadeira nos DOIS mundos | **1 ocorrência** — `createOrder.test.ts:198` (acima) |
| Guarda sem âncora / âncora que passa com zero arquivo | **Não encontrada.** `pedidoComDonoUnico:91,97` (dupla), `orderAccessSingleOwner:204` (dupla), `desafioDeCodigoUnico:284` (dupla), `checkoutSchema:124,133` (dupla), `denoReach:93` |
| Guarda que casa menção em vez de uso | **Não encontrada.** Os três guardas novos removem comentário de linha e de bloco na mesma varredura, com `[^\n\r]`, e carregam sensor CRLF/LF (`pedidoComDonoUnico:141`, `orderAccessSingleOwner:215`, `desafioDeCodigoUnico:308`) |
| Queda de contagem sem contrapartida | **Nenhuma.** Os cinco workspaces subiram ou ficaram iguais. As asserções que saíram de `useOrders.test.tsx` (o `insert` do PostgREST) reapareceram em `createOrder.test.ts:122`, declarado no próprio caso |
| Asserção sobre chamada de mock onde a AC pede estado | **2 ocorrências**, as duas em `create-order`: `:418` ("a busca é por `client_request_id`") assere a **linha inserida**, não o filtro da busca — ver M20 |

---

## 5. Achados fora da matriz

### 5.1 `BL-031` e o comentário de `handlers.ts:311-318` afirmam algo **falso** sobre o schema

Os dois dizem que `orders.order_number` é *"text **sem índice único**"* e que uma colisão de
milissegundo é *"silenciosa"*. Não é: `supabase/migrations/20260415090935_create_orders_and_order_items.sql:45-49`
cria `constraint orders_order_number_key unique (order_number)`, e nenhuma migration posterior a
derruba (`grep -rn "orders_order_number_key\|drop constraint"`).

O comportamento real da colisão é o **oposto** do registrado: o insert falha, `createOrder` cai no
ramo `insert_failed` e devolve **500** — a cliente vê "Não conseguimos criar seu pedido". É venda
perdida, não corrupção silenciosa. Quem pegar a `BL-031` vai desenhar a saída errada.

É `AD-012` na forma mais pura: **afirmação escrita à mão sobre o schema, sem verificação.**

### 5.2 O probe HTTP que a spec exige não é verificável a partir do repositório

O design e os Riscos exigem *"probe HTTP real contra o banco local: pedido criado com JWT e sem JWT,
e as linhas conferidas"*. O que existe no disco é `checkoutSchema.test.ts`, que lê o **arquivo `.sql`** —
prova sobre o texto da migration, não sobre o banco. Conferi estaticamente que todas as 26 colunas de
`COLUNAS_DO_PEDIDO` existem em alguma migration, e que as 8 colunas do insert em `addresses` existem
(`20260414121021…:69-82`). Isso reduz o risco de `PGRST204`; **não substitui o probe**, e o probe é o
único jeito de provar que `auth.admin.createUser` + `handle_new_customer` + o vínculo funcionam de
ponta a ponta.

Ponto específico que só o probe resolve: em produção `supabase.functions.invoke` anexa a **anon key**
como `Authorization` quando não há sessão. `resolveIdentity` chamaria `auth.getUser(<anon key>)`, que
deve falhar por `missing sub claim` e cair no ramo de convidada — que é o desejado. Os testes mandam
`Bearer lixo` e o dublê devolve `user: null`, o que **casa por construção**. Se o GoTrue respondesse
diferente, toda convidada seria tratada como sessão sem `customerId`.

### 5.3 `create-order` é criação de conta sem autenticação e sem teto

O teto por IP protege só o `identify`. `create-order` não tem nenhum, e cria uma linha em
`auth.users` (e, por trigger, em `customers`) por e-mail novo. Consequência: dá para pré-criar a
conta de terceiros em massa — e a vítima, ao comprar, cai no desafio de código por uma conta que ela
nunca pediu, com um pedido falso adotado por `handle_new_customer` visível em `/conta`.

Os *Riscos declarados* citam enumeração de e-mail e não citam isto. Não é bloqueador (não há tomada
de conta, e `create-payment` recalcula preço), mas é risco não registrado.

### 5.4 `client_request_id` virou credencial e não foi tratado como tal

`handlers.ts:267-292`: quem apresentar um `client_request_id` conhecido recebe um **token de acesso
novo e válido** para aquele pedido, **sem checagem de identidade, sem expiração e sem teto**. O
comentário justifica ("é a mesma prova que autorizou a criação"), e o valor é um UUID de navegador —
mas ele é um segredo com ciclo de vida diferente do token de 7 dias, e `get-order` o **devolve** no
corpo (o `select('*')` só remove `guest_access_hash` e `guest_access_expires_at`). Vale remover
`client_request_id` da resposta de `get-order` pelo mesmo argumento que removeu o hash.

### 5.5 Desvios pequenos de comportamento, não declarados

- `buildOrderPayload.ts:141` manda `address_complement: address.complement` (string vazia); o
  caminho antigo mandava `input.address_complement || null`. Idem `address_zip`. Colunas que antes
  ficavam `NULL` passam a ficar `''`. O caso `createOrder.test.ts:170` cobre `undefined`, não `''`.
- `persistirConveniencias` insere em `addresses` a cada compra, sem deduplicar: a cliente recorrente
  acumula endereços iguais. Fora do escopo da spec, mas é `ADR-G1` produzindo lixo.
- `estrelinha-order-access` cresce sem poda — nada apaga a entrada depois que o acesso expira, e
  `handlePaymentSuccess` não a remove.
- O guarda `pedidoComDonoUnico` varre `apps/store/src` e `apps/backoffice/src`; `PED-03` e o Success
  Criteria dizem `apps/**`. Diferença hoje inócua.

---

## 6. O que este relatório **não** cobre

- **Prova em navegador.** `ENT-07` (44px, 390px sem rolagem horizontal), o convite embrulhando, o
  desafio inline dentro do bloco e o QR do PIX em 390×844 são medidas, e jsdom devolve 0 para todas.
  Entra na fila declarada de `32`…`47`.
- **Probe HTTP contra o banco local** (§5.2) — não executado; nenhuma instância local foi ligada
  nesta sessão.
- **`identify`/`create-order` contra o GoTrue real** — `auth.admin.createUser` com
  `email_confirm: false` foi conferido contra os tipos, não contra o serviço.

---

## 7. Gaps ranqueados

| # | Severidade | Gap | Onde |
| --- | --- | --- | --- |
| 1 | **Alta** | O token de posse não tem **nenhuma** prova de fiação no navegador: guardá-lo (M19) e enviá-lo (M18) podem ser apagados com 3260/3260 verdes. É o caminho do dinheiro da convidada inteiro | `CheckoutPage.tsx:368` · `useCreatePayment.ts:60` |
| 2 | **Alta** | Nenhum filtro de coluna de `create-order` é observável pelo dublê ⇒ M20 e M27 sobrevivem; a segunda faz todo pedido com sessão nascer órfão | `createOrder.test.ts` × `fakes.ts:212` |
| 3 | **Média** | O log pode carregar o `access_token` com 518/518 verdes — a dimensão *Observabilidade* não tem guarda | `handlers.ts:365` |
| 4 | **Média** | `ENT-05` "campos digitados preservados" e o edge case "entrou com outro e-mail" não têm asserção (M26) | `ContactBlock.tsx:72` |
| 5 | **Média** | `BL-031` e o comentário do handler afirmam que `order_number` não tem índice único. **Tem.** A dívida foi aberta sobre premissa falsa | `.specs/BACKLOG.md:1300` · `handlers.ts:314` |
| 6 | **Média** | `ADR-G2` não tem nenhum caso — só o nome de um `describe` | `createOrder.test.ts:471` |
| 7 | **Baixa** | `IDN-01` "nunca a cada tecla" não tem asserção (M24 sobrevive) | `ContactBlock.tsx:158` |
| 8 | **Baixa** | `create-order` cria conta sem autenticação e sem teto; risco não declarado | `handlers.ts:355` |
| 9 | **Baixa** | `client_request_id` mina token novo sem identidade nem expiração, e `get-order` o devolve | `handlers.ts:279` · `:508` |
| 10 | **Baixa** | `createOrder.test.ts:198` é verdadeiro nos dois mundos apesar do nome | idem |
| 11 | **Baixa** | `CSC-05` sem sessão e `ENT-03` (rascunho intacto) provados por partes, nunca compostos | `CheckoutPage.test.tsx:1445` |
| 12 | **Baixa** | `''` no lugar de `NULL` em `address_complement`/`address_zip`; `addresses` duplicado a cada compra; `estrelinha-order-access` sem poda | `buildOrderPayload.ts:140` · `handlers.ts:447` |

---

## 8. O que o autor precisa fazer para virar PASS

Os itens 1 e 2 são bloqueadores; os demais são registro.

1. Uma asserção em `CheckoutPage.test.tsx` de que, criado o pedido com `access_token`, o token fica
   em `orderAccess` — **estado resultante**, lendo `accessFor(orderId)`, não chamada de mock.
2. Uma asserção em `useCreatePayment.test.tsx` de que o corpo enviado leva `access_token` quando há
   token guardado, com o **par inverso** (com sessão, a chave não entra no corpo).
3. Fixtura de **função** em `createOrder.test.ts` para `rows.orders` e `rows.customers`, asserindo o
   `eq` recebido — mata M20 e M27 de uma vez, com o mecanismo que o dublê já oferece.
4. Um caso de que o log de `create-order` não contém o token (`vi.spyOn(console, 'log')`).
5. Um caso em `ContactBlock.test.tsx`: com o campo já preenchido pela pessoa, a chegada do `customer`
   **não** o sobrescreve.
6. Um caso de `ADR-G2`: `insertError: { addresses: … }` ⇒ 200 e `order_id` devolvido.
7. Corrigir `BL-031` e o comentário de `handlers.ts` — `orders_order_number_key` existe desde
   `20260415090935`, e a colisão é 500 na cara da cliente, não silêncio.
