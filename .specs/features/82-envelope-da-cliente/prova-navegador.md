# 82 — prova em navegador (T15)

Medida em **2026-10-26** (~22h50–23h20 de Brasília), Chromium 1228 (Chrome for Testing) dirigido por
um script Node com Playwright 1.64.1, contra o **build servido** (`pnpm --filter @estrelinha/mobile-adm
build` + `vite preview --port 4382 --strictPort` — a 8084 era de outra sessão), apontando para o
**Supabase local** (`VITE_SUPABASE_URL=http://127.0.0.1:54441`, o `.env` do app). Nada do banco foi
interceptado: `atelie_clock`, `order_list`, `order_items`, as RPCs `set_material_tracking` e
`set_material_status`, o Realtime e a `send-notification` são os de verdade. `*.supabase.co`,
`g/collect`, `google-analytics` e `googletagmanager` abortados por rota; o link dos Correios foi
respondido por um stub local (a página externa nunca foi carregada). Service worker bloqueado no
contexto. Conta: a admin do `seed.sql`, sem tocar no papel dela.

**A `send-notification` local** não estava de pé (gateway `503`, sem container de edge runtime). Ela
foi servida por `supabase functions serve --env-file <scratchpad>/probe82.env` (o molde da `75`):
processo aditivo, sem `supabase stop`/`start`, **derrubado no fim** (o gateway voltou ao `503`). O
`.env` do serve tem `RESEND_API_KEY` **inválida de propósito** e **nenhuma chave VAPID** (o canal do
celular não existe): o evento é reivindicado em `order_notifications` e o envio falha com
`401 validation_error` — **nenhum e-mail e nenhum push saíram**.

**Bundle servido** conferido pelo `<script>` da página contra o único `index-*.js` do `dist/` depois
do rebuild do conserto (`index-DuzLbfZf.js`), e a classe nova presente no CSS servido.

Scripts e saídas brutas ficaram no scratchpad da sessão (não versionados); as capturas estão em
`prova/`.

## Fixturas e restauração do banco

`prova/fixturas.sql` — 5 pedidos `P82-A`..`P82-E` (ids `00000000-0000-4000-d082-…`, e-mails
`@exemplo.invalid`, datas relativas a `now()`), 6 itens com `requires_material` e `material_kinds`:

| Pedido | Estado | Código | Itens (kinds) | Para quê |
| --- | --- | --- | --- | --- |
| A | `paid` · `aguardando_material`, criado há 10 dias | — | cinzas; cabelo + cinzas | idade `stale`, "Informar", percurso de registro |
| B | `paid` · `material_enviado`, há 4 dias | `AN123456789BR`, `set_by = customer` há 2 dias | leite_materno | "Informado pela cliente", "Alterar" |
| C | `paid` · `material_recebido` há 1 dia | — | pelo_pet | "Chegou sem código", "Colocar em produção" |
| D | `cancelled` · `aguardando_material` | — | cinzas | frase do cancelado, sem ações |
| E | `paid` · `material_enviado`, há 1 dia | `QX12345678901234567890123456BR` (30), `set_by = admin` há 3 h | dente_leite | quebra do código longo |

Entre as rodadas o banco foi devolvido às fixturas (`limpa.sql` + `fixturas.sql`); no fim, só
`prova/limpa.sql`.

| | antes | depois |
| --- | --- | --- |
| `orders` · `order_items` | 78 · 106 | **78 · 106** |
| `order_status_history` · `order_notifications` · `order_notes` | 22 · 11 · 8 | **22 · 11 · 8** |
| `orders` com `material_tracking_set_at` | 0 | **0** |
| `orders_number_seq` | 183/true | **183/true** |

## 1 — medidas por viewport × fonte × estado

Fonte trocada em `html { font-size }` (método da `73`/`75`). **Limite do método**: só escala o que é
`rem`; o título "Envelope da cliente" (`text-[15px]`, `ENV-01`), a frase do "sem código"
(`text-[13px]`) e o eyebrow (`text-[11px]`) são `px` e ficam no mesmo tamanho — no aparelho, o ajuste
de fonte do sistema pode tratá-los diferente.

**45 combinações** (360×800, 390×844, 1440×900 × 100/130/200 % × A..E), medidas **depois** do
conserto, todas com:

- `documentElement.scrollWidth == innerWidth` (nenhuma rolagem horizontal do body);
- nenhum alvo do bloco abaixo de 44 px, nenhum com texto cortado (`scrollWidth/Height > client…`) nem
  fora da tela;
- o código cabe no cartão (`scrollWidth ≤ clientWidth`) e o cartão dentro da viewport;
- nenhuma palavra partida no título nem nos rótulos de "Copiar código"/"Ver nos Correios" (detector
  por caractere com `Range.getClientRects`; sensor: com o título forçado a 40 px ele acusa).

| Alvo (menor medida, L×A em px) | 360 · 100 | 360 · 130 | 360 · 200 | 390 · 100 | 390 · 130 | 390 · 200 | 1440 · 100 | 1440 · 200 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| "Informar código do envelope" (A) | 294×44 | 275×75 | 230×154 | 324×44 | 305×57 | 260×154 | 1374×44 | 1310×88 |
| "Alterar" (B, E) | 53×44 | 69×57 | 106×88 | 53×44 | 69×57 | 106×88 | 53×44 | 106×88 |
| "Copiar código" (B, E) | 143×44 | 275×57 | 230×88 | 158×44 | 147×75 | 260×88 | 683×44 | 647×88 |
| "Ver nos Correios" (B, E) | 143×44 | 275×57 | 230×114 | 158×44 | 147×75 | 260×88 | 683×44 | 647×88 |
| "Colocar em produção" (C) | 294×44 | 275×57 | 230×114 | 324×44 | 305×57 | 260×114 | 1374×44 | 1310×88 |
| "Lembrar do envio no WhatsApp" (A) | 294×44 | 275×73 | 230×152 | 324×44 | 305×57 | 260×152 | 1374×44 | 1310×88 |

| Medida | 360 · 100 | 360 · 130 | 360 · 200 | 390 · 100 | 390 · 130 | 390 · 200 | 1440 (todas) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Copiar/Correios lado a lado | sim | **não** (uma coluna) | não | sim | sim | não | sim |
| linhas do código longo (E) | 2 | 2 | 5 | 2 | 2 | 4 | 1 |
| linhas do código de 13 (B) | 1 | 1 | 2 | 1 | 1 | 2 | 1 |
| chips (A: cabelo, cinzas) em linhas | 1 | 1 | 2 | 1 | 1 | 2 | 1 |
| a idade de A na mesma linha dos chips | sim | não (desce, à direita) | não | sim | sim | não | sim (100/130) |

- **Ordem dos chips**: "Mecha de cabelo", "Cinzas" — a de `MATERIAL_KINDS`, um por material distinto
  (A tem cinzas em dois itens).
- **Cor da idade**: A (10 dias, `data-degrau="stale"`) em `rgb(107, 79, 36)` (`estrelinha-wait`); B
  (`warm`) e E (`fresh`) em `rgb(84, 97, 107)` (`ink-soft`); C, D sem idade. A frase é "há N dias" nos
  três degraus (A3).
- **Folha** (aberta por "Alterar" em E, código de 30): dentro da viewport em todas as 9 combinações
  (topo 557/422/131 em 360; 601/502/215 em 390), sem rolar por dentro; "Agora não" e "Salvar" com
  48/62/96 px de altura; campo 48/62/96 px. A 130/200 % o código de 30 rola **dentro do campo**
  (comportamento de `<input>`), nunca o body.

## 2 — percursos (390 × 844, contra o banco local)

| Percurso | Resultado |
| --- | --- |
| **A** · "Informar código do envelope" | folha "Código do envelope"; frase "Use quando Mariana mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail."; rótulo "Código de rastreio do envio da cliente"; placeholder "Ex.: AN123456789BR"; campo vazio; foco no campo |
| digitar `an 1234 5678 9br` | o campo mostra `AN123456789BR` |
| "Agora não" | folha fecha, foco volta a "Informar código do envelope"; reabrir começa vazio |
| `an12` → "Salvar" | "Confira o código — ele costuma ter 13 caracteres." no campo, `aria-invalid="true"`, foco no campo, **zero** requisições `set_material_tracking` |
| `an 1234 5678 9br` → "Salvar" | rede: `POST rpc/set_material_tracking {"p_order_id":"…0a","p_code":"AN123456789BR"}` → `POST send-notification?action=trigger {"trigger":"material_tracking_set"}` → releitura (`atelie_clock` ×2). Nenhuma outra escrita |
| o aviso | `role="status"`: **"Código do envelope registrado. O pedido #P82-A passou para "A caminho"."** |
| a página relida | cartão com `AN123456789BR` e **"Registrado por você agora"**; passo atual (`aria-current="step"`) **"A caminho"**; histórico com **"Você registrou o rastreio do envelope · AN123456789BR · 26 out · agora"** |
| foco depois do sucesso | o `h1` "Pedido #P82-A" (o botão que abriu sumiu — o fallback da `75`) |
| banco | `material_status = material_enviado`, `material_tracking_set_by = admin`, `material_tracking_set_at` preenchido |
| `order_notifications` | **uma** linha: `owner_material_incoming/email`, `failed` (401 da chave inválida). **Nenhuma** de `material_tracking_registered`: o evento está **desligado** no banco local (`enabled = false`, nasce assim pela `42`/`53`); `owner_material_incoming` está ligado (A7). O histórico mostra "Falha ao enviar o aviso: Material a caminho (E-mail)" |
| **B** · "Alterar" (nome acessível "Alterar o código do envelope") | folha "Alterar código do envelope", frase "Use quando Beatriz mandar o código pelo WhatsApp." (sem a promessa, `material_enviado`), campo com `AN123456789BR`. "Agora não" ⇒ foco volta a "Alterar" |
| `AN987654321BR` → "Salvar" | **"Código do envelope registrado. Pedido #P82-B atualizado."**; origem passa a "Registrado por você agora"; foco volta a "Alterar"; banco `set_by` de `customer` para `admin` |
| "Copiar código" (permissão concedida) | **"Código copiado."**; `navigator.clipboard.readText()` = `AN987654321BR` |
| "Copiar código" sem contexto seguro | servido por `http://192.168.1.102:4382` (`isSecureContext = false`, `navigator.clipboard` indefinido): **"Não consegui copiar. Toque e segure o código para copiar."** |
| "Copiar código" com a permissão negada | `writeText` rejeitando com `NotAllowedError` (por `addInitScript` — o `Browser.setPermission` do CDP não mudou o estado no headless): a mesma frase. O código tem `user-select: all` |
| "Ver nos Correios" | `href="https://rastreamento.correios.com.br/app/index.php?objetos=AN987654321BR"`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Ver nos Correios (abre em outra aba)"`; o toque abre uma aba nova nesse endereço, com `window.opener === null` |
| **C** · "Colocar em produção" | rede: `rpc/set_material_status {"p_status":"em_producao"}` → gatilho → releitura; aviso **"Pedido em produção. O material de Carla está na bancada."**; o botão sai; banco `em_producao`; nenhuma linha em `order_notifications` (`in_production` desligado) |
| foco depois de "Colocar em produção" — **antes do conserto** | **`<body>`** ⇒ defeito **D3** |
| — **depois do conserto** | o `h1` "Pedido #P82-C" |
| **D** · cancelado | "Nenhum código registrado." e "Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente."; **nenhum** botão nem link no bloco |
| folha aberta e a cliente grava pela loja (`update` no banco: código, `material_enviado`, `set_by = customer`) | o Realtime relê: a folha **continua aberta com o que foi digitado** (`QQ11112222BR`), o cartão atrás já diz "Informado pela cliente agora" (Edge Case) |
| folha aberta e o pedido vira `material_recebido` | a folha **fecha** (`ENV-13`), foco no `h1` |

## 3 — menos movimento (`getAnimations()`)

| | ao abrir a folha | ao fechar |
| --- | --- | --- |
| sem preferência | `enter` no fundo e na folha | `exit` ×2 |
| `prefers-reduced-motion: reduce` | **nenhuma** | **nenhuma** |

## Defeitos achados e consertados (teste antes do conserto, reteste no navegador)

Os três só aparecem com layout ou foco reais — jsdom os aprovava. Cada um ganhou teste em
`apps/mobile-adm/src/pages/__tests__/envelopeDaCliente.test.tsx` que **reprovou antes** do conserto
(medido: 3 `×` na mesma rodada) e passou depois.

- **D1 — os rótulos de "Copiar código"/"Ver nos Correios" se partiam no meio da palavra a 200 %**
  (360 e 390): com `grid-cols-2` fixo cada botão ficava com 107–122 px e saía "Cop/iar/códi/go",
  "Ver/nos/Cor/reio/s" em botões de 194–234 px de altura (`prova/antes-360-fonte200-envelope-E.png`).
  Conserto: a grade reflui com a fonte, piso em rem (a lição do QA da `73`, mesmo molde de
  `NumerosDaCliente`): `grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))]`. Lado a lado com a
  fonte padrão em 360/390/1440 e a 130 % em 390; uma coluna a 130 % em 360 e a 200 % no celular.
  **`SPEC_DEVIATION` de `ENV-17`** ("grade `1fr 1fr`"): continua `1fr 1fr` com a fonte padrão; com a
  fonte grande, empilha. **A asserção `grid-cols-2` do teste "Copiar e Correios lado a lado…" foi
  reescrita** para a régua da `73` (token `auto-fit` com piso em rem, e nenhum `grid-cols-N` fixo) —
  a confirmar pelo usuário.
- **D2 — o título "Envelope da cliente" se partia no meio da palavra ao lado de "Alterar" a 200 %**
  (360 e 390): o título ficava com ~52 px ("Envel/ope/da/client/e"). Conserto: ícone + título num
  grupo `flex-1 min-w-[min(100%,9rem)]` e a linha `flex-wrap`; "Alterar" (`ml-auto`) desce, à
  direita, quando não cabe. Nenhuma asserção antiga tocada.
- **D3 — o foco caía no `<body>` depois de "Colocar em produção"**: o botão sai da tela no sucesso
  (o material foi a `em_producao`) e nada recebia o foco — o mesmo sintoma do C03 da `75`. Conserto:
  `devolverFoco`/`tituloDaPagina` saíram de `FolhaDoRastreio.tsx` para
  `features/order-actions/model/foco.ts` (dois leitores), e `ColocarEmProducao` passa
  `{ aoConcluir: () => devolverFoco(null) }` à ação. Teste novo pela página real (o foco no `h1`) e a
  vizinha (na recusa o botão fica, e o foco com ele). `ColocarEmProducao.test.tsx` passou a exigir o
  terceiro argumento (`{ aoConcluir: expect.any(Function) }`) — a forma da chamada ficou mais
  estrita, não mais frouxa.

Depois do conserto: mobile-adm **2090/129** (era 2087/129: +3), exit 0, fora de pipe; `tsc` do app 0;
lint do app 0/0; build verde. Suíte da loja (os guardas que varrem `apps/**`) remedida: **6030/327**, exit 0, idêntica.

## O que NÃO foi provado

- **O teclado virtual**: não há como emulá-lo de verdade no Chromium de mesa. Não foi feito o
  `visualViewport` falso da `75` nesta rodada — a folha é a mesma `FolhaDoRastreio` (`useTecladoVirtual`
  não mudou), provada lá.
- **O Android real**: teclado, voltar do sistema com a folha aberta, área segura, a fonte do sistema
  pelo ajuste do aparelho (aqui emulada por `html { font-size }`, que não escala o que é `px`), e o
  TalkBack anunciando o aviso e o foco no `h1`.
- **A página dos Correios com o campo preenchido**: o link foi conferido e a aba aberta, mas a página
  externa não foi carregada (stub local). O `curl` da `A5` (2026-10-26) é a prova de que o parâmetro
  preenche o campo, e que ela pede captcha.
- **O e-mail de verdade**: a chave do Resend era inválida de propósito; a prova é a linha em
  `order_notifications`, não a caixa de entrada. `material_tracking_registered` estava desligado — o
  caminho dele (a promessa da frase de A6) não foi exercitado.
- **A cliente gravando pela loja**: simulada por `update` direto no banco (a RPC com sessão de cliente
  é provada pelo probe `01-rpc.sql`); a loja não foi aberta.
- **O voltar do Android (`history.back()`) com a folha do envelope**: não andado nesta rodada (é o
  `useFolhaNoHistorico` da `75`, com a chave `:material:editar`, provado na suíte).
