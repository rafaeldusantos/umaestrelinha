# QA Run Report — 2026-10-22 — mobile-adm-inicio

- **Scope:** branch `feat/73-mobile-adm-inicio` — a aba Início do app do ateliê deixa de ser "chega em breve" e passa a mostrar o movimento (Hoje · Ontem · Semana), Precisa de você, os 7 dias, o mês, clientes novas, joias mais pedidas e últimos pedidos, com puxar para atualizar, Realtime, virada do dia e a recusa por papel (feature `73`, `AD-057`). Canary adjacente: `J-entrar-no-atelie` / navegar pelas abas (o canal Realtime fecha ao trocar de aba; a barra de abas mudou de teste).
- **Cadence tier:** targeted
- **Build:** working tree sobre `e9e68ed0` (sem commit da `73`), `vite build` + `vite preview --port 4373` · **Environment:** http://localhost:4373, Supabase **local real** (API :54441, Postgres :54442), auth, RPC e Realtime reais, sem interceptação salvo onde a sessão diz (falha provocada de uma RPC). Conta de QA `adri.qa@exemplo.invalid` (admin, da `72`); `admin@umaestrelinha.dev` não tocada.
- **Started:** 2026-10-23T02:06Z (22/10, 23h06 de Brasília) · **Status:** closed (2026-10-23T03:25Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | Android 412×915 e 360×800, toque, 4g/flaky, pt-BR | CH-inicio-numeros-certos-do-dia, CH-inicio-ao-vivo-e-atualizado, CH-inicio-perder-o-acesso-aberto, CH-inicio-com-rede-ruim, CH-voltar-do-android-no-atelie |
| Equipe com TalkBack | Accessibility-Reliant | Android 412×915, árvore de acessibilidade, pt-BR | CH-inicio-com-leitor-de-tela |

## Flows in Scope

- `J-acompanhar-a-loja` — ao abrir o app, a Adri sabe em uma tela quanto a loja vendeu e o que espera por ela (`../journeys/J-acompanhar-a-loja.md`) — **novo**
- `J-entrar-no-atelie` — canary (`../journeys/J-entrar-no-atelie.md`)

## Session Matrix & Results

Ordem por risco: a virada do dia está em 1º lugar no tempo por ser às 03:00Z desta mesma noite.

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| Adri no celular | J-acompanhar-a-loja step 3 | "toquei em Pago, a separar e caiu numa tela que diz que chega em breve" | dull | decidido pela spec (a `74` obedece ao endereço) |
| Adri no celular | J-acompanhar-a-loja step 4 | "puxei e não vi nada mudar" (rede rápida: o "Atualizando…" não pinta e a hora é a mesma) | dull | watching |
| Adri no celular | J-acompanhar-a-loja step 1 (rede ruim) | "uma coisa falhou e apareceram cinco Tentar de novo" | dull | watching |
| Adri no celular | J-acompanhar-a-loja step 3 | em 360 o segundo bloco da fila aparece cortado na borda ("Material já recebido / exigido"): é a dica de rolagem, mas lê como frase errada | dull | watching |
| Equipe com TalkBack | J-acompanhar-a-loja step 3 | os links da fila saem com nome em caixa alta (o Chromium aplica o `text-transform` ao nome) | dull | TalkBack real decide |
| 1 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-abrir-e-entender-o-dia | Adri no celular | Money | Pass | BUG-20261022-situacao-fala-com-a-cliente-no-atelie (decisão, não bloqueia os números) | |
| 2 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-trocar-periodo | Adri no celular | Money | Pass | | |
| 3 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-precisa-de-voce-leva-a-pedidos | Adri no celular | Money | Pass | | |
| 4 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-numeros-grandes | Adri no celular | Money | Fixed | BUG-20261022-numeros-se-sobrepoem-com-fonte-grande | working tree (sem commit) |
| 5 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-loja-sem-venda | Adri no celular | Money | Pass | | |
| 6 | CH-inicio-ao-vivo-e-atualizado | J-acompanhar-a-loja / MAD-inicio-virada-do-dia | Adri no celular | Interrupt | Pass | | |
| 7 | CH-inicio-ao-vivo-e-atualizado | J-acompanhar-a-loja / MAD-inicio-pedido-novo-ao-vivo | Adri no celular | Interrupt | Pass | | |
| 8 | CH-inicio-ao-vivo-e-atualizado | J-acompanhar-a-loja / MAD-inicio-puxar-para-atualizar | Adri no celular | Interrupt | Pass | | |
| 9 | CH-inicio-perder-o-acesso-aberto | J-acompanhar-a-loja / MAD-inicio-perder-acesso-com-app-aberto | Adri no celular | Multi-Tab | Pass | (Realtime silencia sem o papel: Learnings) | |
| 10 | CH-inicio-com-rede-ruim | J-acompanhar-a-loja / MAD-inicio-rede-cai-e-volta | Adri no celular | Network | Pass | | |
| 11 | CH-inicio-com-rede-ruim | J-acompanhar-a-loja / MAD-inicio-leitura-falha-sem-numero | Adri no celular | Network | Pass | | |
| 12 | CH-inicio-com-leitor-de-tela | J-acompanhar-a-loja / MAD-inicio-com-leitor-de-tela | Equipe com TalkBack | Feature | Fixed | BUG-20261022-numeros-se-sobrepoem-com-fonte-grande (fixed); BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima (decisão, reteste) | working tree (sem commit) |
| 13 | CH-voltar-do-android-no-atelie | J-entrar-no-atelie / MAD-navegar-pelas-quatro-abas (canary) | Adri no celular | Back-Button | Pass | | |
| 14 | — (aparelho) | J-acompanhar-a-loja / puxar e voltar ao app no Android instalado; TalkBack real | Adri no celular · Equipe com TalkBack | — | Blocked (needs human verify) | instruções em Human Verifications | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

> **Driver e paridade.** Playwright (Chromium 156) dirigindo contextos próprios com emulação Android
> (`isMobile`, `hasTouch`, UA Chrome 130 Android 14, pt-BR): **412×915** com o fuso do aparelho em
> **UTC** (o pior caso para "dia de Brasília": depois das 21h o aparelho já está no dia seguinte) e
> **360×800** em `America/Sao_Paulo`. Toques reais (`tap`) e o gesto de puxar por
> `Input.dispatchTouchEvent`. Rede local sem throttle salvo onde a sessão diz (3G emulado por CDP).
> O oráculo dos números é `store_movement()`/`store_overview()` chamados no Postgres local **como a
> conta de QA** (`set role authenticated` + `request.jwt.claims`, dentro de `begin … rollback`): o painel
> desktop não foi subido (a 8083 é de outra sessão). Fixturas de pedido por SQL, com número
> explícito `Q73-…` (a sequência não anda), apagadas no fim.

### CH-inicio-numeros-certos-do-dia — Adri no celular (Money Tour)

- **Ran:** 02:06Z → 02:16Z (box de 60 min respeitado).
- **Walk (412, aparelho em UTC — 23/10 no relógio do aparelho, 22/10 em Brasília):**
  1. login ⇒ Início em ~1,5 s, sem esqueleto visível na amostra de 100 ms (rede local). "Boa noite,
     Adri." / "quinta-feira, 22 de outubro" / "Atualizado às 23h06." — **o dia de Brasília, não o do
     aparelho**. Hoje R$ 0 · 0 · — · 0 (a loja não tinha venda no dia: **o vazio real**). `pass`
  2. os quatro números contra `store_movement()` como a conta, no mesmo instante: iguais. A fila
     (18 · 0 · 1 · 0, "o mais antigo parado há 101 dias") igual a `store_overview().fila`; o mês
     (R$ 1.056, 5 pedidos pagos, 5 clientes novas) e as quatro joias iguais. `pass`
  3. Hoje → Ontem → Semana: os números trocam, `aria-pressed` só no tocado, **zero** requisições;
     os três botões 44×119. `pass`
  4. cada bloco de "Precisa de você" é link para `/pedidos?bloco=<id>`; "Ver pedidos" →
     `?visao=precisa-acao`; "Ver todos" → `?visao=tudo`; o voltar devolve à Início. `pass` (o destino
     é o "chega em breve" da `74`, por decisão da spec)
  5. **pago e depois cancelado**: dois pedidos pagos hoje (R$ 289,90 e R$ 1.500) entraram em Hoje, nos
     7 dias e em "Pago, a separar"; cancelados no banco com a tela aberta, saíram de Hoje, dos 7 dias,
     da fila e do mês (R$ 1.056 → continuou R$ 1.056), e o selo virou "Cancelado". `pass`
  6. **números grandes**: 10 vendas de R$ 9.999,90 ⇒ R$ 99.999 · 10 · R$ 9.999,90; mês R$ 101.055,
     15 pedidos pagos, 15 clientes novas. Em 360 e 412: uma linha cada, `scrollWidth` = largura, a
     faixa da fila rola dentro de si (868 de conteúdo). `pass`
  7. **loja sem venda no mês e sem pedido** (resposta das RPCs reescrita no navegador — parity
     deviation declarada): zeros, ticket —, "Ainda não houve venda neste mês.", "Ainda não há
     pedidos.", a fila visível com zeros, nenhuma frase festiva. `pass`
- **Edge cases tentados:** aparelho em UTC depois das 21h de Brasília; ticket nulo; cancelamento com a
  tela aberta; seis dígitos no card do mês; fila zerada; os três links com o voltar.
- **Findings:** `BUG-20261022-situacao-fala-com-a-cliente-no-atelie` (Friction, decisão humana). Paper
  cuts na tabela.
- **Scenarios settled:** MAD-inicio-abrir-e-entender-o-dia → pass · MAD-inicio-trocar-periodo → pass ·
  MAD-inicio-precisa-de-voce-leva-a-pedidos → pass · MAD-inicio-numeros-grandes → pass (no tamanho de
  fonte padrão; ver o bug da fonte grande) · MAD-inicio-loja-sem-venda → pass
- **Evidence:** `CH-numeros-01-inicio-412-utc.png`, `CH-numeros-02-ontem.png`,
  `CH-numeros-03-grandes-412.png`, `CH-numeros-04-grandes-360.png`, `CH-numeros-05-loja-sem-venda-360.png`

### CH-inicio-com-rede-ruim — Adri no celular (Network Tour)

- **Ran:** 02:12Z → 02:15Z (box de 45 min respeitado). 360×800.
- **Walk:**
  1. `store_overview` respondendo 500 na abertura ⇒ o movimento aparece; os **cinco** blocos do resumo
     dizem "Não consegui carregar." com "Tentar de novo", **nenhum número**, sem `aria-busy` preso.
     "Tentar de novo" (com a RPC de volta) ⇒ os cinco blocos voltam. `pass`
  2. `store_movement` respondendo 500 numa **releitura** (puxar) ⇒ "Atualizando…" e depois "Não
     consegui atualizar agora." acima de "Atualizado às 23h12.", com os números de antes. Duas chamadas
     (o `retry` de 1). `pass`
  3. a rede cai (`setOffline` + evento) ⇒ "Sem conexão. Os dados da loja aparecem quando a internet
     voltar." em < 1,5 s, **zero** requisições durante 65 s offline. A rede volta ⇒ as duas RPCs saem na
     hora, "Atualizado às 23h13.", e o aviso de falha anterior some. `pass` (o D1 da prova não voltou)
  4. depois da volta, um Pix novo no banco entrou em "Últimos pedidos" e em "Pix aguardando" (0 → 1) em
     0,57 s — o Realtime voltou a avisar. `pass`
  5. 3G emulado (400 ms, 50 kB/s): esqueletos `aria-busy` por ~1 s (a casca vem do service worker);
     tocar "Semana" durante a carga fica marcado e vale quando os números chegam. `pass`
- **Scenarios settled:** MAD-inicio-rede-cai-e-volta → pass · MAD-inicio-leitura-falha-sem-numero → pass
- **Paper cut:** uma RPC que falha produz cinco frases e cinco botões "Tentar de novo" iguais (dull).
- **Evidence:** `CH-rede-01-resumo-falhou-360.png`, `CH-rede-02-releitura-falhou-360.png`,
  `CH-rede-03-sem-conexao-360.png`, `CH-rede-04-3g-esqueleto-360.png`

### CH-inicio-com-leitor-de-tela — Equipe com TalkBack (Feature Tour)

- **Ran:** 02:14Z → 02:16Z (box de 30 min respeitado). Árvore do Chromium (`Accessibility.getFullAXTree`).
- **Walk:** um `h1` ("Boa noite, Adri."), `h2` Precisa de você / A semana e o mês / Últimos pedidos, `h3`
  dos cards; regiões nomeadas (Movimento da loja, Precisa de você, Vendas · 7 dias, O mês, Joias mais
  pedidas no mês, Últimos pedidos); os períodos com `pressed`; grupos "Faturamento, hoje, R$ 99.999",
  "Vendas, hoje, 10", "Ticket médio, hoje, R$ 9.999,90", "Visitas, hoje, 0"; as barras do gráfico como
  itens "sex: sem venda" … "Hoje: R$ 99.999,00"; os blocos da fila como links com o texto inteiro;
  "Atualizado às" em `aria-live=polite`. Movimento reduzido: **zero** animações no esqueleto e na troca
  de período; sem a preferência, `pulse` nos esqueletos. `pass` com uma falha:
- **Finding:** com a **fonte do sistema aumentada** (130 %+), o faturamento é pintado por cima das
  vendas ("R$ 99.1099") e o card do mês encobre as clientes novas —
  `BUG-20261022-numeros-se-sobrepoem-com-fonte-grande` (Trust-Damage). Medido: 115 % ok; 130 % +17 px;
  150 % +47; 175 % +85; 200 % +123 (o vão é 16 px).
- **Scenarios settled:** MAD-inicio-com-leitor-de-tela → fail na sessão, consertado (ver *What Was Fixed*)
- **Paper cuts:** os nomes dos links da fila saem em caixa alta ("AGUARDANDO MATERIAL") porque o
  Chromium aplica o `text-transform` ao nome acessível (dull; TalkBack real decide).
- **Evidence:** `CH-leitor-01-texto-200-360.png`, `CH-leitor-02-texto-150-360-pagina.png`

### CH-voltar-do-android-no-atelie — Adri no celular (Back-Button Tour, canary)

- **Ran:** 02:15Z → 02:16Z. 360×800.
- **Walk:** Início → Pedidos → Clientes → Descontos pela barra (cada uma com `aria-current` certo); o
  canal `atelie-orders-realtime` desta aba saiu de `realtime.subscription` (2 → 1, ficou só o da 412);
  voltar ×3 ⇒ `/clientes`, `/pedidos`, `/`; na volta à Início as duas RPCs relêem. `pass`
- **Scenarios settled:** MAD-navegar-pelas-quatro-abas → pass (canary)

### CH-inicio-ao-vivo-e-atualizado — Adri no celular (Interrupt Tour)

- **Ran:** 02:07Z → 03:01:30Z (box de 60 min respeitado: a espera pela meia-noite correu com a página
  intocada, e outras sessões andaram em outros contextos no meio).
- **Walk (412, aparelho em UTC):**
  1. **pedido novo ao vivo**: um pedido pago inserido no banco às 02:09:40.277 ⇒ as duas RPCs saíram
     às 40.408 e "Cliente QA 2 · #Q73-02 · agora" estava na tela às 40.434 (**~160 ms**); Hoje passou a
     R$ 1.790 · 2 · R$ 894,95, e "Atualizado às 23h09." `pass`
  2. **puxar**: "Solte para atualizar" durante o gesto; ao soltar, as duas RPCs; a marca posta em
     `window` sobreviveu (não recarregou). Puxar com a página rolada 400 px **não** dispara. `pass`
  3. **voltar ao app** (`visibilitychange` com o estado `hidden` → `visible`): as duas RPCs relidas na
     volta. `pass`
  4. **a meia-noite de Brasília**, sem tocar, página aberta desde 23h06 (marca em `window` intacta):
     às **03:00:00.027Z** as duas RPCs saíram sozinhas; no mesmo segundo a data virou "sexta-feira, 23
     de outubro", Hoje foi a R$ 0 · 0 · —, "Atualizado às 00h00.", e o gráfico andou um dia (a barra
     "100" passou de HOJE para QUI, HOJE "—"). Ontem = R$ 99.999 · 10 · R$ 9.999,90 e Semana igual (a
     semana começa na segunda). `pass` — com o aparelho em **UTC**, onde o relógio local já era 23/10
     desde as 21h de Brasília: nada virou antes da hora.
- **Scenarios settled:** MAD-inicio-pedido-novo-ao-vivo → pass · MAD-inicio-puxar-para-atualizar → pass
  · MAD-inicio-virada-do-dia → pass
- **Paper cut:** numa rede rápida o "Atualizando…" não chega a aparecer (amostra a cada 60 ms) e, no
  mesmo minuto, "Atualizado às" não muda: o puxar não dá sinal nenhum de que funcionou (dull).
- **Evidence:** `CH-ao-vivo-02-depois-da-meia-noite-412.png`

### CH-inicio-perder-o-acesso-aberto — Adri no celular (Multi-Tab Tour)

- **Ran:** 03:02Z → 03:06Z (box de 30 min respeitado). Conta de QA `adri.qa` aberta em dois contextos
  (412 e 360). O papel foi tirado apagando a linha dela de `user_roles` (o equivalente a outra admin
  revogar em `/admin/usuarios`) e devolvido com o **mesmo** `id`.
- **Walk:**
  1. 412, volta ao app ⇒ `store_movement 403` e `store_overview 403` (uma chamada cada), `user_roles`
     relido, e em **72 ms** o Login com "Esta conta não tem acesso ao painel." e "Sair". O único quadro
     com número é o de antes da resposta (dado da última leitura boa). `pass`
  2. 360, um pedido muda no banco ⇒ **nada acontece** em 12 s: sem o papel, a RLS de `orders` não
     entrega o aviso do Realtime, e a tela fica com os números de antes e a hora deles. Não contradiz
     `MAI-22` (não houve leitura recusada) nem o critério "nenhum número que não veio de uma leitura
     boa daquela conta"; ver *Learnings*.
  3. 360, puxar ⇒ "Atualizando…", 403 nas duas, e em **81 ms** a recusa. `pass`
  4. papel devolvido, "Sair" e entrar de novo ⇒ a Início com os números. `pass`
- **Scenarios settled:** MAD-inicio-perder-acesso-com-app-aberto → pass
- **Evidence:** `CH-acesso-01-recusa-412.png`, `CH-acesso-02-recusa-ao-puxar-360.png`

## What Was Fixed

### BUG-20261022-numeros-se-sobrepoem-com-fonte-grande: com a fonte do celular maior, o faturamento é pintado por cima das vendas
- **Symptom:** a 130 %+ de fonte, "R$ 99.999" e o "10" das vendas viram "R$ 99.1099"; o card do mês
  encobre as clientes novas.
- **Root cause:** `grid-cols-2` em `MovementHero.tsx` e `MonthCards.tsx`: trilhas em px que não
  acompanham a fonte, com o número `whitespace-nowrap` transbordando por cima da vizinha.
- **Fix:** working tree, sem commit (pedido do usuário). As duas grades viraram
  `grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]` (`8.75rem` no mês): duas colunas com a fonte
  padrão, uma quando a fonte cresce.
- **Regression test:** `apps/mobile-adm/src/widgets/movement-hero/__tests__/MovementHero.test.tsx`
  (caso novo) e `apps/mobile-adm/src/widgets/month-cards/__tests__/MonthCards.test.tsx` (a régua de
  `MAI-28` reescrita com o sentido que faltava e sensor da forma antiga): os dois reprovaram antes (2 ✗)
  e passam depois. 3 mutantes reinjetados no arquivo real (`grid-cols-2` de volta nos dois; piso em px
  no lugar de rem), SHA-256 igual na restauração: **3 mortos por asserção**.
- **Retested:** `reports/2026-10-22-mobile-adm-inicio-reteste.md` — o bug e as jornadas vizinhas.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-acompanhar-a-loja step 3 | "toquei em Pago, a separar e caiu numa tela que diz que chega em breve" | dull | decidido pela spec (a `74` obedece ao endereço) |
| Adri no celular | J-acompanhar-a-loja step 4 | "puxei e não vi nada mudar" (rede rápida: o "Atualizando…" não pinta e a hora é a mesma) | dull | watching |
| Adri no celular | J-acompanhar-a-loja step 1 (rede ruim) | "uma coisa falhou e apareceram cinco Tentar de novo" | dull | watching |
| Adri no celular | J-acompanhar-a-loja step 3 | em 360 o segundo bloco da fila aparece cortado na borda ("Material já recebido / exigido"): é a dica de rolagem, mas lê como frase errada | dull | watching |
| Equipe com TalkBack | J-acompanhar-a-loja step 3 | os links da fila saem com nome em caixa alta (o Chromium aplica o `text-transform` ao nome) | dull | TalkBack real decide |

## Runtime Errors Observed

- Nenhum erro de console nas sessões com rede. Com a rede derrubada, o client do Supabase tenta reabrir
  o websocket do Realtime (`ERR_INTERNET_DISCONNECTED`), já registrado pela prova da `73` como não
  sendo leitura de dado.

## Human Verifications Needed

- [ ] **Android real, app instalado** (linha 14): abrir o Ateliê pela tela inicial, puxar a Início para
  baixo no topo — deve aparecer "Solte para atualizar" e depois "Atualizando…", **sem** o Chrome
  recarregar a página (o splash não pode voltar); com a tela rolada, puxar não faz nada.
- [ ] **Voltar ao primeiro plano de verdade** (linha 14): com a Início aberta, apertar Home, esperar
  1 min, voltar pelo seletor de apps — "Atualizado às" deve mostrar a hora da volta.
- [ ] **TalkBack** (linha 14): deslizar pela Início de cima a baixo; cada número deve ser falado com o
  rótulo e o período ("Faturamento, hoje, R$ …"), Hoje/Ontem/Semana como "selecionado/não
  selecionado", e os blocos de "Precisa de você" como links com a contagem. Com a fonte do sistema no
  máximo, os quatro números ficam um embaixo do outro, sem nenhum número sobre outro.

## Decisions for a Human

### O selo dos últimos pedidos fala com a cliente (BUG-20261022-situacao-fala-com-a-cliente-no-atelie)
- What's broken: na Início da Adri, "Aguardando seu material" (texto da loja, "seu" = da cliente), e
  o mesmo selo para material ainda não enviado e já a caminho (#0181 × #0182). Evidência:
  `CH-numeros-01-inicio-412-utc.png`.
- Why not auto-fixed: a spec decidiu (confirmado) usar `orderSituation` "o mesmo da loja", com guarda de
  dono único (`situacaoComDonoUnico`); trocar o texto é decisão de produto e criaria um segundo dono se
  feito no app.
- Options:
  1. Manter — custo: a Adri lê a voz da cliente e não distingue "a caminho" de "não enviado".
  2. Dar a `orderSituation` (em `core`) um parâmetro de público (`'cliente' | 'atelie'`) com os rótulos
     do ateliê ("Aguardando material", "Material a caminho"…) — um dono, duas vozes; a `75` (detalhe do
     pedido) vai precisar do mesmo.
  3. Tirar o selo das linhas e deixar a situação para a `75`.
- Recommendation: 2, decidido antes da `74`/`75`, que vão desenhar a situação em mais telas.

### O Realtime silencia quando o papel cai (observação, sem bug)
- What happens: sem o papel, o aviso de `orders` não chega (RLS), e a Início fica com os números da
  última leitura boa até o próximo foco, puxar ou virada do dia.
- Options: 1. aceitar (os números são de quando a conta era admin, com a hora); 2. reconferir o papel
  num intervalo.
- Recommendation: 1 — é o mesmo limite que o painel tem (`A-06` da `48`) e a revogação é rara.

## Learnings

- **A meia-noite real é a melhor prova de virada**: com o QA começando às 23h de Brasília, a página
  ficou aberta até 03:00Z e virou no milissegundo 27, sem toque. Rodar o charter de virada na hora
  certa vale mais que relógio falso.
- **Fonte do sistema é um eixo que a `73` não tinha**: `MAI-28` foi escrita e provada na fonte padrão;
  a fonte maior quebrou a mesma régua em duas grades. Toda tela nova do programa deve ser andada a 130 %
  e 200 %.
- **`visibilitychange` sem `bubbles` não chega ao React Query** (o `focusManager` ouve na `window`): a
  primeira tentativa desta sessão mediu "não relê" por erro do arnês. Mesma lição que o `CLAUDE.md` do
  app registra para o client de auth.
- **O Realtime respeita a RLS**: perder o papel desliga o aviso em silêncio. Quem testar "perder o
  acesso" precisa de um gatilho que leia (foco, puxar), não de um pedido novo.

## Final Status

- **Exit gate (full automated suite, depois do conserto, um workspace por vez, exit fora de pipe):**
  - `pnpm --filter @estrelinha/core test` → `Test Files 146 passed (146) · Tests 3826 passed (3826)`, exit 0
  - `pnpm --filter @estrelinha/mobile-adm test` → `Test Files 39 passed (39) · Tests 400 passed (400)`, exit 0 (399 → 400: o caso novo do `MovementHero`)
  - `pnpm --filter @estrelinha/store test --testTimeout=20000` → `Test Files 317 passed (317) · Tests 5812 passed (5812)`, exit 0
  - `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → `Test Files 208 passed (208) · Tests 3645 passed (3645)`, exit 0
  - `npx tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` → exit 0 · 0 · 0
  - `npx eslint .` em `apps/mobile-adm` → 0/0 (exit 0); em `apps/backoffice` → `✖ 28 problems (23 errors, 5 warnings)` = a baseline 23/5
- **Issues by user impact:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 1 (fixed, verified) · Friction 2 (decisão humana: o selo na voz da cliente; o estouro de Últimos pedidos a 175 %+, achado no reteste) · Cosmetic 0
- **Coverage:** 1 jornada nova (`J-acompanhar-a-loja`) andada por 2 personas em 5 charters + o canary `J-entrar-no-atelie`; 12 cenários `MAD-inicio-*` com veredito, 0 skipped. Parity gaps: oráculo pelo Postgres como a conta (o painel desktop não subiu); "mês sem venda" por resposta reescrita no navegador; fonte do sistema emulada pela fonte raiz; o app instalado, o gesto nativo e o TalkBack real são de aparelho (linha 14).
- **Verdict:** ready with blocked items — os números da Início estão certos no dia de Brasília, ao vivo, na virada, sem rede e sem papel; decidir o selo dos últimos pedidos antes da `74`/`75` e andar a linha 14 num Android.
