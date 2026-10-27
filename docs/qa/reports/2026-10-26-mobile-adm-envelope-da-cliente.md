# QA Run Report — 2026-10-26 — mobile-adm-envelope-da-cliente

- **Scope:** feature `82` (sem commit, sobre `744da7ea`): o "Envelope da cliente" no bloco Material afetivo do detalhe do pedido do app do ateliê — registrar/alterar o código do envelope (folha `origem="material"`), o cartão com quem informou e quando, "Copiar código", "Ver nos Correios", os chips de material e a idade da espera, "Colocar em produção", a frase do cancelado; e o card de material do painel (que agora grava pelo `core`).
- **Cadence tier:** targeted
- **Build:** working tree (`744da7ea` + a `82` sem commit) · `apps/mobile-adm/dist` servido por `vite preview` em http://127.0.0.1:4482; o painel num build em pasta do scratchpad servido em :4483 · **Environment:** Supabase local real (:54441, migration `20261028120000` aplicada), `supabase functions serve --env-file` com `RESEND_API_KEY` **inválida de propósito** e sem VAPID, conta `adri.qa@exemplo.invalid` (admin) e `cliente.qa@exemplo.invalid` (sem papel).
- **Started:** 2026-10-26T23:40-03:00 · **Status:** closed (2026-10-27T00:20-03:00)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | 390×844 toque · 4g/flaky simulado · pt-BR | CH-envelope-registrar-o-codigo-da-cliente, CH-envelope-com-rede-ruim, CH-envelope-voltar-e-outra-aba |
| Cliente com conta da loja | Casual User | 390×844 · wifi · pt-BR | CH-envelope-conta-sem-acesso |
| Equipe com TalkBack | Accessibility-Reliant | 390×844 · árvore de acessibilidade + teclado · pt-BR | CH-envelope-com-leitor-de-tela |

## Flows in Scope

- `J-registrar-envelope-da-cliente` — a Adri registra pelo celular o código do envelope que a cliente mandou, e o confere (`../journeys/J-registrar-envelope-da-cliente.md`, nova)
- Canário: `J-registrar-material-e-envio` (a folha do rastreio de saída usa a mesma `FolhaDoRastreio` e a mesma `normalizeTrackingCode`, que o conserto mudou)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-envelope-registrar-o-codigo-da-cliente | MAD-envelope-informar-codigo | Adri no celular | Paste | Pass | | |
| 2 | CH-envelope-registrar-o-codigo-da-cliente | MAD-envelope-colar-do-whatsapp | Adri no celular | Paste | Fixed | BUG-20261026-codigo-colado-leva-caractere-invisivel (e decisão BUG-20261026-codigo-com-hifen-ou-espaco-gravado) | sem commit (pedido do usuário) |
| 3 | CH-envelope-registrar-o-codigo-da-cliente | MAD-envelope-alterar-duas-vezes | Adri no celular | Paste | Blocked (human decision) | BUG-20261026-codigo-corrigido-nao-reavisa | |
| 4 | CH-envelope-registrar-o-codigo-da-cliente | MAD-envelope-copiar-e-ver-nos-correios | Adri no celular | Paste | Pass | | |
| 5 | CH-envelope-registrar-o-codigo-da-cliente | MAD-envelope-painel-grava-o-mesmo | Adri no celular | Paste | Fixed (reteste 2026-10-27) | BUG-20261026-codigo-com-hifen-ou-espaco-gravado | sem commit (pedido do usuário) |
| 6 | CH-envelope-com-rede-ruim | MAD-envelope-rede-cai-ao-salvar | Adri no celular | Network | Fixed (reteste 2026-10-27) | BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou | sem commit (pedido do usuário) |
| 7 | CH-envelope-com-rede-ruim | MAD-envelope-erro-fica-na-acao-certa | Adri no celular | Network | Fixed (reteste 2026-10-27) | BUG-20261026-erro-de-uma-acao-aparece-em-outra | sem commit (pedido do usuário) |
| 8 | CH-envelope-com-rede-ruim | MAD-envelope-queda-curta-com-folha-aberta | Adri no celular | Network | Fixed (reteste 2026-10-27) | BUG-20261026-queda-curta-de-rede-apaga-o-codigo | sem commit (pedido do usuário) |
| 9 | CH-envelope-com-rede-ruim | MAD-envelope-colocar-em-producao | Adri no celular | Network | Fixed (reteste 2026-10-27) | BUG-20261026-erro-de-uma-acao-aparece-em-outra | sem commit (pedido do usuário) |
| 10 | CH-envelope-voltar-e-outra-aba | MAD-envelope-voltar-e-f5-com-folha | Adri no celular | Back-Button | Pass | | |
| 11 | CH-envelope-voltar-e-outra-aba | MAD-envelope-outra-aba-com-folha-aberta | Adri no celular | Back-Button | Pass | | |
| 12 | CH-envelope-voltar-e-outra-aba | MAD-envelope-cancelado | Adri no celular | Back-Button | Pass | | |
| 13 | CH-envelope-conta-sem-acesso | MAD-envelope-conta-sem-papel | Cliente com conta da loja | Garbage | Pass | | |
| 14 | CH-envelope-com-leitor-de-tela | MAD-envelope-com-leitor-de-tela | Equipe com TalkBack | Feature | Fixed (reteste 2026-10-27) | BUG-20261026-idade-da-espera-sem-contexto | sem commit (pedido do usuário) |
| 15 | CH-envelope-com-leitor-de-tela | MAD-envelope-varios-materiais-e-espera | Equipe com TalkBack | Feature | Fixed (reteste 2026-10-27) | BUG-20261026-idade-da-espera-sem-contexto | sem commit (pedido do usuário) |
| 16 | CH-envelope-com-leitor-de-tela | MAD-envelope-sem-nome-e-sem-materiais | Equipe com TalkBack | Feature | Fixed (reteste 2026-10-27) | BUG-20261026-a-cliente-no-meio-da-frase | sem commit (pedido do usuário) |
| 17 | canário (folha do rastreio de saída) | J-registrar-material-e-envio | Adri no celular | — | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

**Paridade e fixturas.** Build de produção do app (não o dev da 8084, que é de outra sessão), auth real, banco
real, Realtime real, `send-notification` real (o envio falha com 401 pela chave inválida: nenhum e-mail saiu).
Interceptados por rota: `*.supabase.co`, GA, e a página dos Correios (stub local — a de verdade pede captcha).
Service worker bloqueado. Falhas de rede injetadas por rota (`abort`), a perda da resposta com
`route.fetch()` + `context.setOffline(true)`. Fixturas: `.specs/features/82-envelope-da-cliente/prova/fixturas.sql`
(P82-A..E) mais duas desta sessão (P82-F, nome vazio e item com `material_kinds = {}`; P82-G, três itens, um sem
material) com os mesmos prefixos de id, apagadas por `limpa.sql`. O papel da `adri.qa` foi tirado e devolvido
com o mesmo `id` na sessão 13. A layout por viewport × fonte **não** foi remedida: a prova da feature já mediu
45 combinações; esta rodada andou percursos e bordas.

**Banco restaurado** (contagens idênticas às de antes da sessão): `orders` 78 · `order_items` 106 ·
`order_status_history` 22 · `order_notifications` 11 · `order_notes` 8 · `set_at` preenchido 0 ·
`orders_number_seq` 183/true · `auth.users` 9 · `user_roles` 3 (o da `adri.qa` com o id `94c422dd…`). Os
processos desta sessão (`vite preview` :4482 e :4483, `functions serve`) foram derrubados; o gateway voltou ao 503.

## Session Debriefs

### CH-envelope-registrar-o-codigo-da-cliente — Adri no celular (390, 4g)

- **Ran:** 23:42 → 23:58 (caixa respeitada)
- **Findings:**
  - Happy path (P82-A): folha "Código do envelope", frase com "Mariana", foco no campo; Salvar ⇒ RPC → gatilho
    → releitura; aviso "Código do envelope registrado. O pedido #P82-A passou para "A caminho"." em 1,7 s; foco
    no `h1`; cartão "Registrado por você agora"; histórico "Você registrou o rastreio do envelope · …".
  - Paste Tour: espaços, NBSP, quebra de linha e minúsculas saem limpos. **Espaço de largura zero e as marcas
    de direção do WhatsApp ficavam** — gravadas no banco, no link dos Correios (`%E2%80%8B`) e na cópia, sem
    nada visível (bug, consertado). Hífen e ponto passam e são gravados; a frase inteira colada ("O código é
    AN…") vira `OCÓDIGOÉAN123456789BR` e é aceita (decisão).
  - Alterar duas vezes seguidas (o mesmo código e outro): cada uma vai à RPC, aviso "Pedido #P82-A atualizado.",
    foco volta a "Alterar". Só a primeira gravação gerou linha em `order_notifications` (decisão).
  - Copiar: `Código copiado.` em `role=status`, área de transferência com o código exato, foco fica no botão.
    "Ver nos Correios": aba nova, `opener === null`; voltar ao app mantém rolagem (400) e foco.
  - Painel (1440): o card grava pelo `core` — toast "Código de rastreio do material registrado", `set_by =
    admin`, e o app relido diz "Registrado por você agora". O painel grava `PN 1234 5678 9BR` com espaços, e o
    app mostra assim e abre os Correios com `%20` (decisão). Frase do cancelado no painel e no app: a mesma.
- **Bugs filed/updated:** BUG-20261026-codigo-colado-leva-caractere-invisivel (consertado), BUG-20261026-codigo-com-hifen-ou-espaco-gravado, BUG-20261026-codigo-corrigido-nao-reavisa
- **Scenarios settled:** informar-codigo → pass · colar-do-whatsapp → fixed · copiar-e-ver-nos-correios → pass · alterar-duas-vezes, painel-grava-o-mesmo → blocked-decision
- **Paper cuts:** a linha "Rastreio do envelope: CÓDIGO" acima dos passos repete o cartão logo abaixo (A11, dull).
- **Surprises:** a folha promete "ela recebe a confirmação por e-mail", e no banco local `material_tracking_registered` está **desligado** — a promessa é falsa enquanto ele estiver (A6, decisão já tomada; conferir o interruptor de produção).
- **Suggested next charter:** o colar a partir do WhatsApp de verdade, no teclado do Android.

### CH-envelope-com-rede-ruim — Adri no celular (390, flaky simulado)

- **Ran:** 23:58 → 00:08 (caixa respeitada)
- **Findings:**
  - Falha pura da RPC: a folha fica, "Não consegui salvar. Tente de novo." em `role=alert`, foco em Salvar, nada gravado (ok).
  - **Resposta perdida com o servidor tendo gravado** (P82-G): tela "Sem conexão"; na volta, o cartão diz
    "Registrado por você agora" e um alerta diz "Não consegui salvar. Tente de novo." sem botão; o gatilho
    nunca saiu (zero linhas em `order_notifications`).
  - **Erro na ação errada**: a falha de "Recebi o material" aparece dentro da folha do envelope recém-aberta;
    a falha do envelope, depois de "Agora não", vai para o rodapé em cima de "Recebi o material"; a falha de
    "Colocar em produção" aparece só no rodapé, em cima de "Iniciar separação".
  - "Colocar em produção" com dois toques e a rede falhando: uma chamada só (trava ok).
  - **Um segundo sem rede** com o código digitado: a folha some, o digitado se perde, foco no `<body>` (`MAF-19`).
- **Bugs filed/updated:** BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou, BUG-20261026-erro-de-uma-acao-aparece-em-outra, BUG-20261026-queda-curta-de-rede-apaga-o-codigo
- **Scenarios settled:** rede-cai-ao-salvar, erro-fica-na-acao-certa, queda-curta-com-folha-aberta, colocar-em-producao → blocked-decision
- **Paper cuts:** —
- **Surprises:** o "Tentar de novo" da falha do envelope não existe (a retentativa é `null`), embora a RPC seja idempotente.
- **Suggested next charter:** a mesma sessão num Android real com o modo avião.

### CH-envelope-voltar-e-outra-aba — Adri no celular (390)

- **Ran:** 00:08 → 00:12
- **Findings:** voltar com a folha aberta e o campo preenchido ⇒ folha fechada, mesma URL, foco em "Alterar",
  nada gravado. F5 com a folha aberta ⇒ fechada, e o voltar seguinte sai para `/pedidos` (sem voltar morto).
  Outra aba registra "Recebi o material" ⇒ a folha fecha, "Este pedido mudou enquanto você olhava.", foco no
  `h1`, cartão "Informado pela cliente há 2 dias · chegou agora". O painel grava o código com a folha do app
  aberta ⇒ a folha fica com o que ela digitou (Edge Case). Cancelado: sem botão nem link, as duas frases.
- **Bugs filed/updated:** —
- **Scenarios settled:** voltar-e-f5-com-folha, outra-aba-com-folha-aberta, cancelado → pass
- **Paper cuts:** avançar depois do voltar não reabre a folha e deixa um voltar que não muda nada (herança da `75`) — dull.
- **Suggested next charter:** o gesto de voltar do Android.

### CH-envelope-conta-sem-acesso — Cliente com conta da loja

- **Ran:** 00:12 → 00:14
- **Findings:** `cliente.qa` em `/pedidos/<P82-A>` ⇒ "Esta conta não tem acesso ao painel." e "Sair", nada do
  pedido, zero escritas. A `adri.qa` perdendo o papel com a folha aberta e salvando ⇒ RPC `not_allowed` →
  `atelie_clock` 42501 → Login com a recusa; nenhuma confirmação em ~80 leituras de 60 ms; banco intacto.
- **Scenarios settled:** conta-sem-papel → pass

### CH-envelope-com-leitor-de-tela — Equipe com TalkBack (árvore + teclado)

- **Ran:** 00:14 → 00:18
- **Findings:** nomes certos ("Alterar o código do envelope", "Ver nos Correios (abre em outra aba)", diálogo
  "Código do envelope" com descrição, campo rotulado); aviso em `role=status`, recusa e falha em `role=alert`;
  foco no campo ao abrir, de volta a quem abriu ao fechar, no `h1` quando o botão some. **A espera é lida "há 10
  dias" solta** depois dos chips, abaixo de "Pedido feito há 10 dias", e com código convive com "Informado pela
  cliente há 2 dias" (A3). Sem nome: "Use quando A cliente mandar…" e "O material de A cliente está na bancada.".
  Material sem tipo (P82-F): nenhum chip, só a espera (ok). Três itens (P82-G): "Leite materno", "Flores"; o
  item sem material não entra (ok). Tom: nada de festa, emoji, urgência.
- **Bugs filed/updated:** BUG-20261026-idade-da-espera-sem-contexto, BUG-20261026-a-cliente-no-meio-da-frase
- **Scenarios settled:** com-leitor-de-tela, varios-materiais-e-espera, sem-nome-e-sem-materiais → blocked-decision
- **Suggested next charter:** TalkBack real.

### Canário — folha do rastreio de saída (`J-registrar-material-e-envio`)

- No pedido entregue `P76-L03`, a folha da Entrega com `‪jd 0001​2345‬` colado ⇒ `JD00012345`
  (o conserto vale ali também; nada gravado). → pass.

## What Was Fixed

### BUG-20261026-codigo-colado-leva-caractere-invisivel: o código colado do WhatsApp leva um caractere invisível
- **Symptom:** o código parece certo, mas o gravado, o link dos Correios e a cópia carregam U+200B / U+202A–U+202C.
- **Root cause:** `normalizeTrackingCode` (`packages/core/src/orders/tracking.ts`) tirava só `\s`; caracteres de formatação Unicode (`\p{Cf}`) não são espaço.
- **Fix:** `code.replace(/[\s\p{Cf}]+/gu, '')`. Sem commit (pedido do usuário).
- **Regression test:** `packages/core/src/orders/__tests__/tracking.test.ts` (+5) e `apps/mobile-adm/src/features/order-actions/ui/__tests__/FolhaDoEnvelope.test.tsx` (+1). Os 6 reprovaram antes do conserto; o do app reprovou de novo com o conserto revertido e passou restaurado (SHA-256 conferido).
- **Retested:** build refeito; os quatro colados de novo (13 caracteres, link e cópia limpos, banco com 13); vizinhos: a folha do rastreio de saída, o voltar/F5/outra aba (re-andados, pass).

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-registrar-envelope step 1 | "o código aparece duas vezes, em cima e no cartão" | dull | watching (A11) |
| Adri no celular | step 2 | avançar depois do voltar não reabre a folha | dull | watching (herança `75`) |
| Adri no celular | step 2 | com uma ação no ar, tocar "Informar código do envelope" não faz nada e não diz por quê | dull | watching (`M34`: a trava é a regra) |

## Runtime Errors Observed

- Só os `net::ERR_*` das falhas injetadas e o aviso do service worker bloqueado pelo Playwright. Nenhum `pageerror`.

## Human Verifications Needed

- [ ] **Android real**: colar do WhatsApp de verdade no teclado; "toque e segure" o código quando a cópia falhar; "Ver nos Correios" no app instalado (aba do Chrome) e voltar; o gesto de voltar do sistema com a folha aberta; o TalkBack lendo o bloco e o aviso.
- [ ] **A página dos Correios** com o código no campo (aqui foi stub; ela pede captcha).
- [ ] **O interruptor `material_tracking_registered` em produção**: se desligado, a frase da folha promete um e-mail que não sai (A6).

## Decisions for a Human

### O mesmo código gravado de três jeitos (BUG-20261026-codigo-com-hifen-ou-espaco-gravado)
- What's broken: o app aceita hífen/ponto e a frase colada; o painel grava com espaços; os Correios só acham um. `evidence/…/s7-app-depois-do-painel.png`
- Why not auto-fixed: muda o que o painel grava (A8 da `75`) e há uma regra cravada ("hífen fica").
- Options: 1. normalizar em `writeMaterialTracking` (um escritor, uma forma) 2. para o envelope, só a forma dos Correios 3. manter
- Recommendation: 1 agora; 2 se a Adri confirmar que o envelope é sempre Correios.

### Rede cai no meio: gravou, a tela diz que não, e o aviso se perde (BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou)
- What's broken: alerta de falha ao lado do código gravado; nenhum aviso. `evidence/…/s3-volta-da-rede.png`
- Why not auto-fixed: escolher entre retentativa, reconciliação na releitura ou gatilho no banco é de produto/arquitetura.
- Options: 1. retentativa `{ tipo: 'rastreio-do-material', codigo }` (como o rastreio de saída) 2. reconciliar na releitura 3. gatilho no banco (`BL-051`)
- Recommendation: 1 já; 3 como dívida.

### O erro de uma ação aparece em outra (BUG-20261026-erro-de-uma-acao-aparece-em-outra)
- What's broken: a folha nasce com o erro do rodapé; o erro do envelope e o de "Colocar em produção" vão para o rodapé.
- Why not auto-fixed: muda o modelo de erro da `75` (um por pedido).
- Options: 1. marcar o erro com a ação de origem e cada superfície desenhar só o seu 2. limpar ao abrir a folha
- Recommendation: 1.

### "A cliente" no meio da frase (BUG-20261026-a-cliente-no-meio-da-frase)
- What's broken: "Use quando A cliente mandar…", "O material de A cliente está na bancada.".
- Why not auto-fixed: a `ENV-05` escreve "A cliente" e o teste a crava.
- Options: 1. forma minúscula / "da cliente" em `core` 2. manter
- Recommendation: 1.

### "há N dias" sem contexto (BUG-20261026-idade-da-espera-sem-contexto)
- What's broken: o número solto ao lado dos chips (repetido acima, ambíguo com a origem do código, lido sem contexto).
- Why not auto-fixed: é o desvio A3 (decisão do usuário de tirar "parado").
- Options: 1. "Esperando há N dias" 2. só `sr-only` 3. tirar a idade e manter a cor
- Recommendation: 1 se a Adri aceitar a palavra; senão 2.

### Um piscar da rede apaga o código digitado (BUG-20261026-queda-curta-de-rede-apaga-o-codigo)
- What's broken: 1 s offline desmonta o app (`MAF-19`) e leva a folha e o digitado.
- Why not auto-fixed: muda a regra de conexão da `72`.
- Options: 1. só mostrar "Sem conexão" depois de alguns segundos 2. rascunho em memória de módulo
- Recommendation: 1.

### O código corrigido não reavisa (BUG-20261026-codigo-corrigido-nao-reavisa)
- What's broken: só a primeira gravação gera aviso; com o e-mail ligado, a cliente fica com o código errado.
- Options: 1. manter, registrado 2. evento "código corrigido"
- Recommendation: 1, a menos que a dona peça.

### Os desvios da spec, do lado de quem usa
- **A3** ("há N dias" nos três degraus): ver a decisão acima — o número sem a palavra perde o sentido.
- **ENV-17** (grade que empilha com a fonte grande): do ponto de vista de quem usa, melhor que `1fr 1fr` (rótulos inteiros); recomendo confirmar.
- **ENV-20** (`em_producao` conta como recebido; sem data, sem idade): em P82-F, "Chegou sem código registrado. Recebido agora." — correto e sem inventar; recomendo confirmar.

## Learnings

- `\s` não pega os invisíveis do WhatsApp: todo campo que recebe texto colado de mensagem precisa tirar `\p{Cf}`.
- Um erro "por pedido" deixa de bastar quando o mesmo pedido ganha várias superfícies de ação.
- A perda da resposta (servidor gravou, app não soube) só aparece com `route.fetch()` + `setOffline` — o `abort` puro testa só metade.

## Final Status

- **Exit gate (full automated suite):** `pnpm --filter @estrelinha/core test --testTimeout=20000` → 4575 passed / 180 files, exit 0 · `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → 2096 passed / 129 files, exit 0 · `pnpm --filter @estrelinha/store test --testTimeout=20000` → 6031 passed / 327 files, exit 0 (exit fora de pipe). `tsc` mobile-adm 0; `tsc` core 11 (herdados, igual à baseline); `eslint .` mobile-adm 0/0. Backoffice não tocado nesta rodada.
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 5 (1 consertado) · Friction 2 · Cosmetic 1
- **Coverage:** 1 jornada nova + 1 canário, 5 charters, 16 cenários andados; layout por viewport × fonte não remedido (prova da feature); Android real fora.
- **Verdict:** ready with blocked items — o registro e a consulta do envelope funcionam e gravam o mesmo que o painel; sete decisões esperam a dona, das quais a mais urgente é a resposta perdida na rede (alerta falso e aviso que não sai).

## Reteste — 2026-10-27 (consertos da Fase 5 da `82`, decididos pelo usuário)

- **Build:** working tree (`744da7ea` + a `82` sem commit, com o conserto da rodada 2 do Verificador) ·
  `apps/mobile-adm/dist` servido por `vite preview` em http://127.0.0.1:4582 (bundle `index-D3v4wZjc.js`,
  conferido pelo `<script>` da página contra o `dist/`); o painel num build em pasta do scratchpad servido em
  :4583. **Environment:** Supabase local real (:54441), `supabase functions serve --env-file` com
  `RESEND_API_KEY` **inválida de propósito** e sem VAPID, conta `adri.qa@exemplo.invalid` (admin), 390×844 toque
  (360/390 na medida de fonte, 1440 no painel). Mesmo isolamento da rodada: `*.supabase.co`, GA e os Correios
  por rota; service worker bloqueado. Fixturas P82-A..G, devolvidas ao estado inicial antes de cada percurso.
- **Banco restaurado:** `orders` 78 · `order_items` 106 · `order_status_history` 22 · `order_notifications` 11 ·
  `order_notes` 8 · `set_at` preenchido 0 · `orders_number_seq` 183/true · `auth.users` 9 · `user_roles` 3 —
  idênticos aos de antes. Os três processos desta sessão (`vite preview` :4582 e :4583, `functions serve`)
  foram derrubados; o gateway voltou ao 503. As portas 8083/8084 (outras sessões) não foram tocadas.
- **Evidência:** `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/`.

| Bug | Resultado | O que foi andado |
| --- | --- | --- |
| BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou | **passou** (depois de um conserto de foco, abaixo) | servidor grava e a resposta se perde (`route.fetch` + `setOffline` + `abort`), 2 s (folha fica, "Tentar de novo" na folha) e 6,5 s ("Sem conexão", erro e botão no bloco). A retentativa regrava o mesmo código, o gatilho sai, `order_notifications` ganha a linha (`owner_material_incoming`, `failed` pela chave inválida) |
| BUG-20261026-erro-de-uma-acao-aparece-em-outra | **passou** (15/15) | rodapé × folha do envelope × bloco × "Colocar em produção" × folha de saída × **cartão da lista**, este navegando dentro do app (o erro mora em módulo: `page.goto` recarregaria e daria um falso verde — o par "a falha da primária aparece no cartão" prova que a navegação preserva o erro) |
| BUG-20261026-queda-curta-de-rede-apaga-o-codigo | **passou** | 1, 3 e 4,5 s offline: folha, digitado e foco ficam; 6 s: "Sem conexão" aos ~5,08 s |
| BUG-20261026-codigo-com-hifen-ou-espaco-gravado | **passou** | app, colando de verdade: `AN-123.456.789-BR`, `an 1234 5678 9br`, com espaço de largura zero e com marcas de direção ⇒ `AN123456789BR` (13 bytes) e link sem `%20`; painel: digitado `pn 1234 5678 9br` e colados ⇒ gravados sem espaço, hífen, ponto nem invisível; o app relido mostra igual |
| BUG-20261026-a-cliente-no-meio-da-frase | **passou** | P82-F: "Use quando a cliente mandar…", "O material da cliente está na bancada."; começo de frase "A cliente ainda não informou…" |
| BUG-20261026-idade-da-espera-sem-contexto | **passou** | "Esperando há N dias" (10, 5, 2) em 360/390 × 100/130/200 %: 18/18 numa linha, dentro do bloco, sem rolagem horizontal |
| BUG-20261026-codigo-colado-leva-caractere-invisivel (vizinhança) | **passou** | o invisível sai também com a normalização nova, no app e no painel |

### Achado no reteste — consertado e retestado

- **O foco caía no `<body>` depois do "Tentar de novo" do bloco do envelope** (o caminho de 6,5 s acima): o
  botão sai da tela com o sucesso (o alerta some) e no `mudou` (a frase fica, sem botão). É a classe de C03
  (`75`) e D3 (`82`), numa superfície nova que o conserto do T16 criou. Conserto mínimo em
  `features/order-actions/ui/EnvelopeDaCliente.tsx` (o foco vai ao título da página, com `devolverFoco`),
  teste que reprovou antes pela página real (o botão focado antes do toque — sem isso o jsdom aprovava o
  defeito), mutantes F1/F2 mortos por asserção. Retestado no build refeito: foco no `h1` "Pedido #P82-A".
  Registrado no `validation.md` da `82` (*Conserto da rodada 2*), sem arquivo de bug próprio (achado e
  consertado na mesma rodada, sob o bug-pai).

### Observações (não bugs)

- Na retentativa depois da resposta perdida, a confirmação diz "Pedido #NNNN atualizado." (a 1ª gravação, perdida,
  já tinha levado o pedido a "A caminho"), não "passou para "A caminho"".
- O campo do painel mostra o que foi digitado (`PN 1234 5678 9BR`) até a releitura; o gravado é o normalizado.

### Gate depois do reteste

`pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` → 2132 / 129, exit 0 · store 6035 / 327, exit 0 ·
backoffice 3926 / 225, exit 0 (exit fora de pipe). `tsc` mobile-adm 0; `eslint .` mobile-adm 0/0;
`pnpm --filter @estrelinha/mobile-adm build` verde.

**Veredito do reteste:** os seis bugs consertados passam no build servido; resta só o
`BUG-20261026-codigo-corrigido-nao-reavisa` (mantido por decisão, `BL-055`) e as verificações humanas de antes
(Android real, TalkBack, a caixa de e-mail).
