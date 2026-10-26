# 79 — Prova em navegador (T28)

> **Estado**: a **metade de layout** está feita (2026-10-25, abaixo). A metade do **aviso chegando no
> Chrome real** (inscrição de verdade no FCM, `payment_approved` disparado duas vezes, o toque levando a
> `/pedidos/<id>`, o teste e o "Parar avisos") fica com o orquestrador (TQ5), e o **Android real**
> segue pendente do usuário (TQ6).

## Layout

**Como**: `pnpm --filter @estrelinha/mobile-adm build` e `vite preview --port 8191` (porta livre; as
8082–8084 são de outras sessões), medido por um script Playwright (Chromium headless 1228) guardado em
`probes/04-layout.mjs`. Cada combinação é um contexto novo, com:

- **o bundle SERVIDO conferido antes**: o JS entregue pela porta 8191 contém a frase
  "Não consegui conferir os avisos deste celular" (`{"scripts":2,"achou":true}`);
- **rede interceptada**: `/rest/v1/**` (o papel admin, o cadastro, `atelie_clock` com o instante, e as
  outras RPCs com `null`, "ainda sem dado"), `/functions/v1/**` (as respostas da porta de cada estado),
  `/auth/v1/**` e **`**/g/collect*` por caminho** (0 chamadas interceptadas: o app não mede);
- **a sessão** semeada no `localStorage` por `addInitScript`, e **o navegador dublado** antes de
  qualquer script da página: `Navigator.prototype.serviceWorker` (com `ready`, `getRegistration` e um
  `pushManager` com `getSubscription`/`subscribe`), `Notification` (`permission` e
  `requestPermission`) e `PushManager` — removido no estado `sem-suporte`. O worker real foi bloqueado
  (`serviceWorkers: 'block'`), para não haver dois;
- **a fonte do documento** em `document.documentElement.style.fontSize` = 100 %, 130 % e 200 %, também
  por `addInitScript` (vale desde o primeiro quadro).

Cada estado é alcançado como a Adri o alcança: o dado da porta ao abrir, ou o **toque** (o
interruptor, "Enviar um aviso de teste", "Parar avisos", "Sua conta" → "Sair"). A combinação só
é medida depois de a frase ou o controle do estado aparecer.

**O que se mede** em cada uma das 144 combinações (12 estados × 4 larguras × 3 fontes):

1. `document.body.scrollWidth` e `documentElement.scrollWidth` ≤ `innerWidth` (sem rolagem
   horizontal);
2. a **altura** (`getBoundingClientRect`) de todo controle do `<main>` — e, nos dois estados do menu,
   de todo controle do painel `#menu-da-conta` e do botão "Sua conta" — ≥ 44 px; no interruptor, o alvo
   medido é o `<label>` da linha inteira (o `<input>` é `sr-only`);
3. o **rótulo de cada interruptor**: sem transbordar a caixa (`scrollWidth`/`scrollHeight`), sem o
   retângulo do TEXTO (o `Range`, não a caixa) cruzar o trilho do interruptor, e dentro da linha;
4. nenhum texto de bloco (`p`, `h1`, botão, link, `label`) fora da janela ou transbordando; o corte
   **de propósito** por `truncate` (reticências) é registrado à parte;
5. nenhum par de blocos irmãos (frase × botão × linha) sobreposto.

### Resultado: 144 de 144 combinações limpas (depois do conserto abaixo)

Cada célula: `body scrollWidth / innerWidth · menor alvo (px)`. `—` = o estado não tem controle
(`bloqueado` e `sem-suporte` só têm a frase, `MAN-12`/`MAN-13`).

| Estado | 360 · 100% | 360 · 130% | 360 · 200% | 390 · 100% | 390 · 130% | 390 · 200% | 412 · 100% | 412 · 130% | 412 · 200% | 1440 · 100% | 1440 · 130% | 1440 · 200% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `desligado` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `ligado` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `bloqueado` | ok 360/360 · — | ok 360/360 · — | ok 360/360 · — | ok 390/390 · — | ok 390/390 · — | ok 390/390 · — | ok 412/412 · — | ok 412/412 · — | ok 412/412 · — | ok 1440/1440 · — | ok 1440/1440 · — | ok 1440/1440 · — |
| `sem-suporte` | ok 360/360 · — | ok 360/360 · — | ok 360/360 · — | ok 390/390 · — | ok 390/390 · — | ok 390/390 · — | ok 412/412 · — | ok 412/412 · — | ok 412/412 · — | ok 1440/1440 · — | ok 1440/1440 · — | ok 1440/1440 · — |
| `erro-ativar` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `erro-ler` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `erro-interruptor` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `erro-teste` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `teste-aguarde` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `erro-parar` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `menu-aberto` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |
| `menu-pergunta-MAN-30` | ok 360/360 · 48 | ok 360/360 · 62 | ok 360/360 · 96 | ok 390/390 · 48 | ok 390/390 · 62 | ok 390/390 · 96 | ok 412/412 · 48 | ok 412/412 · 62 | ok 412/412 · 96 | ok 1440/1440 · 48 | ok 1440/1440 · 62 | ok 1440/1440 · 96 |

controles medidos por estado (em 390 · 100%):
- desligado : Avisar neste celular 48
- ligado : Pedido novo 48, Pedido pago 48, Pagamento recusado da cliente 48, Material a caminho 48, Enviar um aviso de teste 48, Parar avisos neste celular 48
- bloqueado : nenhum
- sem-suporte : nenhum
- erro-ativar : Avisar neste celular 48
- erro-ler : Tentar de novo 48
- erro-interruptor : Pedido novo 48, Pedido pago 48, Pagamento recusado da cliente 48, Material a caminho 48, Enviar um aviso de teste 48, Parar avisos neste celular 48
- erro-teste : Pedido novo 48, Pedido pago 48, Pagamento recusado da cliente 48, Material a caminho 48, Enviar um aviso de teste 48, Parar avisos neste celular 48
- teste-aguarde : Pedido novo 48, Pedido pago 48, Pagamento recusado da cliente 48, Material a caminho 48, Enviar um aviso de teste 48, Parar avisos neste celular 48
- erro-parar : Pedido novo 48, Pedido pago 48, Pagamento recusado da cliente 48, Material a caminho 48, Enviar um aviso de teste 48, Parar avisos neste celular 48
- menu-aberto : Avisos neste celular 48, Sair 48, Sua conta 48
- menu-pergunta-MAN-30 : Avisos neste celular 48, Tentar de novo 48, Sair mesmo assim 48, Sua conta 48

O menor alvo cresce com a fonte (48 → 62 → 96 px), porque `h-12`/`min-h-12` são `rem`. **Corte de
propósito**: o e-mail no topo do menu (`truncate`) aparece com reticências em 360 px a 200 %
(`menu-aberto` e `menu-pergunta-MAN-30`); é a forma desenhada para um e-mail longo, não um defeito.

### Defeito achado e consertado: o rótulo do interruptor passava por baixo do trilho

| | 360 × 800 · 200 % | 390 × 844 · 200 % | 412 × 915 · 200 % |
| --- | --- | --- | --- |
| **Antes** — "Pagamento recusado da cliente" | a palavra "Pagamento" mede **166 px** numa caixa de **110**; o texto termina em **231 px** e o trilho começa em **207**: **por baixo do interruptor** | 166 em 140, fim em 231, trilho em 237 (transborda, encosta) | 166 em 162 (transborda) |
| **Antes** — "Material a caminho" | "Material" 122 px em 110 (transborda; fim em 187, trilho em 207) | — | — |
| **Depois** | todos os quatro: `scrollWidth` = `clientWidth` = 110; o texto termina em 163–174 px, trilho em 207; "Pagamento recusado da cliente" em 5 linhas, "Material a caminho" em 4 | limpo | limpo |

A caixa do rótulo é `min-w-0 flex-1`, então encolhe; mas uma palavra maior que a caixa não quebra
sozinha e transborda — a 200 % em 360 px, por cima do trilho. **Conserto** em
`apps/mobile-adm/src/pages/AvisosPage.tsx`: o texto ganhou `break-words hyphens-auto` (o documento é
`lang="pt-BR"`, e o Chromium hifeniza: "recusa-/do", "Materi-/al", "cami-/nho" — captura
`prova/depois-ligado-360-200-recorte.png`). **Teste antes do conserto**: o jsdom não mede layout, então
a régua é o token exato no texto de cada uma das quatro linhas (`avisosPage.test.tsx`, "o rótulo de
cada linha pode quebrar a palavra"), que **reprovou antes** do conserto e passa depois; dois mutantes
(sem `break-words`, sem `hyphens-auto`) reinjetados no arquivo real, os dois mortos por asserção,
SHA-256 restaurado. A medida antes/depois acima é a do navegador, remedida no build novo (144/144).

**Gate depois do conserto** (Build): seis workspaces um por vez, exit 0 — core 4451/176, functions
1099/26, **mobile-adm 1982/124** (+1, o caso acima), store 5966/323, backoffice 3710/214, catalog
512/23; `tsc` 0 nos seis projetos e os 11 herdados em `core`; lint 0/0 · 23/5 · 2/2; builds do
mobile-adm e do backoffice exit 0; `packages/core/src/payment` sem diff.

### Capturas

`prova/` — `<estado>-<largura>-<fonte>.png`, página inteira: os 12 estados em 390 px nas três fontes,
em 360 px a 200 % e em 1440 px a 100 %; e `depois-ligado-360-200-recorte.png`. Nas capturas de página
inteira a barra de abas (fixa) aparece no meio da imagem: é como o Playwright compõe um elemento fixo
numa captura `fullPage`, não sobreposição na tela.

### O que esta metade NÃO mede

- A barra de abas e o cabeçalho fora do botão "Sua conta" (são da `72`, medidos lá).
- O aviso chegando, a inscrição de verdade e o toque no aviso (Chrome real com FCM — o orquestrador).
- O Android real: a fonte do sistema do aparelho (aqui ela é simulada pelo `font-size` do documento),
  o teclado, a área segura e a tela de bloqueio (TQ6, pendente do usuário).

## Chrome real (a chegada do aviso) — NÃO feita, pendente com o usuário

Em 2026-10-25 o ambiente ficou pronto: o build servido em `vite preview` na 8191, a `send-notification`
e a `atelie-avisos` por `supabase functions serve --env-file .env`, e um pedido de fixtura `P79-0001`
(pago, PIX, R$ 189,00), com os três e-mails já marcados `sent` para nenhum e-mail real sair (o `.env`
local tem chave do Resend sem desvio para o Mailpit). A extensão `claude-in-chrome` não estava
conectada, e a permissão de notificação só aceita clique humano. O usuário mandou seguir sem fazer a
prova: o banco não chegou a ter linha em `push_subscriptions`.

**O que fica sem prova de ponta a ponta**: a inscrição real com host `fcm.googleapis.com`, o aviso
"Pedido #P79-0001 pago" / "R$ 189,00" chegando **uma vez** com dois disparos de `payment_approved`, o
toque abrindo `/pedidos/<id>`, o evento desligado não avisando, o aviso de teste e "Parar avisos".
O que existe no lugar: a biblioteca provada contra o FCM de verdade (`probes/01-biblioteca`, 410 para
endpoint sintético e a linha apagada), o motor com o dedupe por `(order_id, event, channel)` provado no
banco local (`probes/02-banco`, `probes/03-porta`) e o SW (`sw-avisos.js`) por teste de unidade.

**Roteiro para o usuário** (o mesmo para o Android real, TQ6): o script
`scratchpad/disparar.sh` desta sessão (`criar` · `disparar <id>` · `limpar <id>`) reproduz a fixtura;
ativar em "Sua conta" → "Avisos neste celular" → "Avisar neste celular" → Permitir; disparar; contar os
avisos; tocar; apagar a fixtura e a linha de `push_subscriptions`.

**Limpeza conferida**: fixtura apagada; `orders` 78, `order_notifications` 11, `push_subscriptions` 0,
`push_test_claims` 0 — as contagens da T01. Os dois servidores parados.
