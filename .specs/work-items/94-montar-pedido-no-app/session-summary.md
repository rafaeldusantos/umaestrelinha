# WI 94 — Montar pedido no app do ateliê · resumo da sessão

**Data**: 2026-11-07 a 2026-11-08
**Branch**: `feature/94` (local, worktree `store-worktrees/store__feature-94`, base `master`); nada foi enviado ao remoto
**Estado**: `fase: done` · Validation 1 PASS · QA real-user ainda não rodada

## O que o WI entrega

O app do ateliê (`apps/mobile-adm`) passa a montar o pedido que o painel já montava na feature 89: uma
proposta com preço travado e link de checkout. A montagem é em tela cheia, em 4 passos (Cliente, Peças,
Descontos, Revisar), e a Adri pode colar a mensagem da cliente para que uma IA (`claude-haiku-5-5`)
preencha o contato e o endereço. Em Pedidos nasce a visão **Montados**, com a tela do pedido montado:
o link fica sempre disponível enquanto a proposta está aberta. O painel passa a mostrar o link sempre
e a gravar o endereço pela function.

## Commits (`git log --oneline master..HEAD`)

| Commit | Tarefa | Repositório / workspaces |
| --- | --- | --- |
| `f2453712` | T01 · regras compartilhadas da montagem em `core` | packages/core, apps/backoffice, supabase (CLAUDE.md) |
| `e21ee56f` | T03 · a leitura do texto por IA (function `customer-parse`) | supabase/functions, packages/core, config.toml |
| `97a07acc` | T02 · Backoffice: o link sempre e o endereço salvo pela function | apps/backoffice, supabase (function, migration), packages/core, apps/store (guardas) |
| `e2b18e88` | T04 · App: a visão "Montados" e a tela do Pedido montado | apps/mobile-adm, supabase/functions (`list`) |
| `a94b675c` | T05 · App: a montagem em tela cheia e o passo 1 · Cliente | apps/mobile-adm |
| `afb23255` | T06 · App: a folha "Colar texto" | apps/mobile-adm |
| `efbef6f2` | T07 · App: o passo 2 · Peças e a folha da variação | apps/mobile-adm |
| `f9603923` | T08 · App: o passo 3 · Descontos, com o resumo pelo servidor | apps/mobile-adm, supabase/functions (`preview`), packages/core (`couponLabel`), apps/backoffice |
| `2771ae52` | T09 · App: o passo 4 · Revisar, Criar link e Editar | apps/mobile-adm |
| `d268ecb9` | T10 · App: o rascunho no celular e a folha de sair | apps/mobile-adm, CLAUDE.md |
| `35d427e5` | Validation · o lint do app volta a 0/0 e as baselines remedidas | apps/mobile-adm (teste), CLAUDE.md |
| `09b5b575` | Validation · a promoção vigente na folha e na sacola (UC-06) | supabase/functions (`preview`), apps/mobile-adm |

As tarefas correram em ondas: `01,03 | 02 | 04 | 05 | 06 | 07 | 08 | 09 | 10`. Cada uma foi implementada pelo
`wi-impl-task`, revisada pelo `wi-impl-review` e commitada só com os arquivos dela. A T01 e a T03 passaram
na revisão; as outras oito passaram com correção.

## O que foi feito, por tarefa

- **T01 (`core`)**: a busca de produto e a dobra de texto sobem para `core/product-search`, e o painel as
  reexporta por referência. A regra da foto da linha (`fotoDaLinha`/`capaDaLinha`) vai para
  `core/proposals/photo.ts`, e o mapeamento da peça (`mapearPecaParaProposta`) para `core/proposals/piece.ts`.
  `LINK_WITHOUT_STORE` também vai para `core`. O guarda `denoReach` passa a cobrir `pricing`, o boot local das três functions foi conferido e
  os dois CLAUDE.md, que diziam que `pricing` não subia no Deno, foram corrigidos.
- **T03 (`customer-parse`)**: function nova no molde da `seo-suggest`.
  - Usa `createClaudeJson` com dois schemas fixos, um por modo (`contact_and_address` e `address`).
  - A ordem das conferências é `requireAdmin` → 503 sem chave → 429 pelo teto de 30 leituras em 10 min → 413 acima de 2.000 caracteres.
  - Os desfechos de erro são 502 e 422.
  - A normalização mora em `core/customers/parse.ts`, e `mergeCep.ts` aplica a regra "o CEP manda".
- **T02 (painel e function)**: o link do pedido montado fica guardado.
  - Uma migration nova (`20261111120000_94-link-sempre-e-endereco.sql`) cria a coluna da cifra e recria a
    RPC `save_order_proposal`, que passa a gravar o endereço da ficha (`save_address`).
  - A cifra é AES-GCM, com o secret **opcional** `PROPOSAL_TOKEN_KEY`.
  - O `get` devolve o link e `actions.renewLabel`. O `renew` aceita a proposta aberta só quando ela não tem cifra (opção A do árbitro).
  - O painel mostra o link sempre e deixa de escrever em `addresses` pelo navegador.
  - A origem passa a se chamar "Pedido montado" nos dois apps.
- **T04 (app)**: a `list` passa a trazer as peças (`lines`, até 4) e o relógio do servidor (`agora`). No app:
  - o chip "Montados · N abertos" e a lista de cartões;
  - a tela do pedido montado: o link, WhatsApp e Copiar, a observação, Cancelar, Renovar e "Gerar link novo";
  - as portas `portaDePropostas` e `traduzir` em `shared/api`;
  - os guardas ampliados, e um guarda de tom próprio (`tomMemorialDosMontados`).
- **T05**: a montagem em tela cheia, com uma entrada de histórico por passo e uma sentinela para o voltar do Android.
  O passo 1 tem a cliente cadastrada (busca, ficha, endereços salvos) e a cliente nova (contato, CEP).
  As leituras de cliente ficam em `entities/customer/api/clientesDaMontagem.ts`, dentro de `lerComPapel`.
- **T06**: a folha "Colar texto" (`portaDeLeitura`). Os campos lidos levam a marca "Lido do texto — confira.",
  e o aviso diz "Preenchi N de M". A leitura tem "Desfazer", e "Preencher à mão" aparece depois de um erro.
- **T07**: o passo 2. O catálogo é lido uma vez (`readAllPages` dentro de `lerComPapel`, com a contagem).
  A folha da variação tem a foto por variação, o teto de estoque que soma a sacola e a gravação. A sacola vira
  `LinhaDaSacola[]`.
- **T08**: a ação nova `preview` na `order-proposals`, a mesma `precificar` do `save`, sem gravar. No passo 3:
  - o cupom, aplicado pela prévia;
  - o desconto combinado, com motivo;
  - a recusa de zerar o pedido;
  - o resumo vivo, com a requisição anterior cancelada, e o PIX.
  - `couponLabel` sobe para `core`.
- **T09**: o passo 4 traz a cotação, por porta própria dentro de `lerComPapel`, "Criar link" e a recusa do preço
  que mudou (PRC-02). "Editar um pedido montado" reabre a montagem a partir do `get`.
- **T10**: o rascunho no aparelho guarda só as peças e os descontos, sem nenhum dado da cliente. Ele fica em
  `localStorage`, na chave `estrelinha-montagem-rascunho`, com um dono único e preso à conta. A folha de sair
  oferece "Guardar rascunho" e "Descartar". O `apps/mobile-adm/CLAUDE.md` e as baselines foram atualizados.

## Decisões e premissas

As decisões do gate do PRD e do handoff estão em `spec.md`, de D-01 a D-30. As premissas de raio largo da
implementação foram levadas à costura como D-31 a D-42:

- **D-31**: o `get` devolve `token` e `actions` de `proposalActions(state, { linkAvailable })`. O link conta como
  disponível só quando existe a cifra e a chave consegue decifrá-la.
- **D-32**: a RPC grava o endereço só com `save_address` e com CEP e rua preenchidos. O endereço vira o padrão só
  quando a ficha ainda não tem padrão, e não duplica um endereço que já existe.
- **D-33**: os textos que app e painel leem moram em `core`: `proposalRenewText`, `PROPOSAL_ORIGIN_LABEL`,
  `PROPOSAL_SAVE_FAILED`, `LINK_WITHOUT_STORE` e `couponLabel`.
- **D-34**: a `list` traz `lines`, `lines_count` e `agora`. Se a leitura das peças falha, a resposta é 502.
- **D-39**: o desconto combinado que zera o pedido volta como 200 com `manual_refusal`, e não como 422.
- **D-40**: a cotação passa por `lerComPapel`, porque a `quote` é pública.
- **D-41**: Editar usa a mesma rota `/pedidos/montar`, com a marca em memória de módulo.
- **D-42**: o rascunho fica em `localStorage`, guarda só a identidade das peças e é refeito do catálogo ao voltar.

## Desvios do PRD e do desenho

| Ponto | O que o PRD ou o desenho diz | O que foi entregue | Por quê |
| --- | --- | --- | --- |
| Selo do estado (D-35) | "Vista pela cliente" | "Aberta — vista pela cliente" | o rótulo vem de `PROPOSAL_STATE_LABELS` (`core`), que é o dono |
| Observação interna (D-36) | editável "em qualquer estado" | editável em todo estado, menos na concluída | o servidor recusa com 409, pela regra da feature 95 (na concluída, a observação passa a ser a do pedido) |
| Busca de peças (D-37) | "Nome da joia ou SKU" | só por nome | `buscarProdutos` (`core`) não busca SKU, e uma segunda busca violaria o dono único |
| Textos do cupom (D-38) | "Cupom não encontrado." · "Este cupom vale só para a primeira compra." | "Cupom inválido." · "Cupom válido apenas no primeiro pedido." | os critérios pedem "o texto da loja" |
| Contrato do `preview` (D-39) | 422 para o combinado que zera | 200 com `manual_refusal` | para o resumo continuar sem o desconto |
| Tom e movimento (D-08) | as pastas novas entram em `tomMemorialDeClientes` | guarda próprio, `tomMemorialDosMontados` | a régua de lá reprova "Enviar pelo WhatsApp" |

## Gates executados

O detalhe está em `qa-report.md`. A Validation 1 deu PASS em 2026-11-08, depois das duas correções da própria rodada.

**Testes** (um workspace por vez, código de saída fora de pipe, todos com exit 0):

| Workspace | Testes / arquivos |
| --- | --- |
| core | 5510/229 |
| functions | 1566/41 |
| mobile-adm | 2655/167 |
| backoffice | 5183/288 |
| store | 7091/378 |

**Build:** 3/3. A primeira execução reprovou a loja com `URI malformed`: o worktree não tem o `.env` da loja,
então o placeholder do `index.html` fica cru. Com as envs locais no shell, o build passa.

**Lint:** store 2/2 · backoffice 23/5 · mobile-adm 0/0. A primeira medição deu 1/0 no app (da T07), e a
correção está em `35d427e5`.

**Tipos:** store, mobile-adm, o server da loja e o catalog-import em 0. O core segue nos 11 herdados. Os 7 do
backoffice estão em `ProposalStateBadge.test.tsx` e vêm do commit `4c6e9a16`, anterior ao WI.

**Cobertura:** 10 de 10 unidades de escopo. A UC-06 (a promoção vigente na folha e na sacola) deu MISSING na
primeira medição e foi corrigida em `09b5b575`.

**Probes no banco local:**
- `probes/01-link-e-endereco.sql`: a RPC e o endereço.
- `probes/02-foto-e-link-pela-function.mjs`: o `handlers.ts` real sobre o PostgREST local, apagando o que gravou.

## Pendências conhecidas

1. **Migration só no banco local.** A `20261111120000_94-link-sempre-e-endereco.sql` foi aplicada no local com
   `psql`, pela porta 54442.
   - O banco local tem as `20261107130000..160000`, de outro ramo, e não tem as `20261110*` deste ramo.
   - **Ordem de publicação:** a migration num push só dela → as functions (`order-proposals`, `customer-parse`
     nova) → os bundles do painel e do app.
   - Um push na `master` aplica a migration em produção: precisa de pedido explícito do humano.
2. **Secrets.**
   - `PROPOSAL_TOKEN_KEY` (32 bytes em base64) é opcional. Sem ele, tudo segue como antes: "Gerar link novo".
   - A `customer-parse` precisa de `ANTHROPIC_API_KEY`; sem a chave, responde 503.
   - `VITE_STORE_URL` precisa estar no projeto Vercel do app (não conferido). Sem ela, o cartão diz que o link não pôde ser montado.
   - Gravar secret sempre de um diretório sem `.env` (`BL-044`).
   - O `.env` local não tem `PROPOSAL_TOKEN_KEY`. Se o CLI reclamar do `env()` ausente, acrescente a linha vazia.
3. **Sem execução real:**
   - a `customer-parse` contra o modelo real e no edge runtime local (o prompt e o esforço `low` não foram medidos);
   - a nova leitura de peças da `list` contra o PostgREST;
   - a tipagem das functions, que nenhum `tsc` cobre.
4. **O que só o navegador ou o Android prova, para a QA:**
   - alvo de 44 px;
   - nenhuma rolagem lateral em 390 a 100, 130 e 200 %;
   - a barra fixa e as folhas com o teclado;
   - o gesto real de voltar;
   - o `localStorage` do rascunho no PWA instalado;
   - o chip longo "Montados · N abertos";
   - o cartão escuro do link.
5. **Lacunas de teste declaradas pelas tarefas:**
   - o CEP de cidade digitado à mão que não apaga a rua (T06);
   - o arnês do client real sem `Content-Range`, que deixa sem o "par" o catálogo e o passo 3 sobre o client real (T07 e T08);
   - a página da T05, da T06 e da T09 escrita antes dos testes, compensada por checks de mutação.
6. **Comportamento a observar:**
   - F5 durante o Editar recomeça a montagem como criação vazia (D-41);
   - o voltar do Android depois de "Criar link" cai na montagem vazia (T09, decisão 4).
7. **Herdados, fora do WI:** os 7 erros de tipo do backoffice em `ProposalStateBadge.test.tsx`
   (`4c6e9a16`) e o cabeçalho de `claudeSoNoServidor.test.ts` dizendo que há uma porta de IA só.
