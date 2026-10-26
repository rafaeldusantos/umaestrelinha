# QA Run Report — 2026-10-24 — mobile-adm-pedidos

- **Scope:** branch `feat/74-mobile-adm-pedidos` (worktree `store-74-mobile-adm-pedidos`, sobre `775e407e`,
  sem commit): a aba Pedidos do ateliê — lista com as seis visões e os quatro blocos da Início, busca,
  rolagem por chave, detalhe só leitura, selo da aba, e o link de "Últimos pedidos". Canary: Início.
- **Cadence tier:** targeted (rodada 1)
- **Build:** working tree sem commit, `pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4376`
  · **Environment:** http://localhost:4376, Supabase local real (API :54441), conta `adri.qa@exemplo.invalid`
  (admin) e `cliente.qa@exemplo.invalid` (sem papel); `*.supabase.co` bloqueado e `**/g/collect*` interceptado.
- **Started:** 2026-10-24T05:40Z · **Status:** closed (2026-10-24T06:05Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | Mobile User | Android 390×844 (e 360/412), toque, pt-BR | CH-pedidos-numero-da-inicio-bate, CH-pedidos-achar-o-pedido-da-cliente, CH-pedidos-voltar-do-android, CH-pedidos-com-rede-ruim, CH-pedidos-ao-vivo-com-o-painel |
| Equipe com TalkBack | Accessibility-Reliant | 360/390/412, fonte 100/130/200 %, pt-BR | CH-pedidos-com-leitor-de-tela-e-fonte-grande |
| Cliente com conta da loja | First-Time Visitor | 360×800, pt-BR | CH-pedidos-conta-sem-acesso |

## Flows in Scope

- `J-achar-um-pedido` (`../journeys/J-achar-um-pedido.md`)
- `J-ver-um-pedido` (`../journeys/J-ver-um-pedido.md`)
- `J-acompanhar-a-loja` (canary, `../journeys/J-acompanhar-a-loja.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-pedidos-numero-da-inicio-bate | J-achar-um-pedido / blocos, visões, selo | Adri no celular | Money | Pass | | |
| 2 | CH-pedidos-achar-o-pedido-da-cliente | J-ver-um-pedido / busca, detalhe, WhatsApp, retirada | Adri no celular | Paste | Blocked (human decision) | BUG-20261024-pagamento-por-cartao-aparece-como-card | |
| 3 | CH-pedidos-voltar-do-android | J-ver-um-pedido / voltar, inexistente | Adri no celular | Back-Button | Blocked (human decision) | BUG-20261024-voltar-do-pedido-buscado-perde-a-busca | |
| 4 | CH-pedidos-com-rede-ruim | J-achar-um-pedido / falhas | Adri no celular | Network | Pass | | |
| 5 | CH-pedidos-ao-vivo-com-o-painel | J-ver-um-pedido / Realtime, selo | Adri no celular | Multi-Tab | Pass | | |
| 6 | CH-pedidos-com-leitor-de-tela-e-fonte-grande | J-achar-um-pedido / a11y, fonte | Equipe com TalkBack | Feature | Pass | | |
| 7 | CH-pedidos-conta-sem-acesso | J-achar-um-pedido / conta sem papel | Cliente com conta da loja | Garbage | Pass | | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

**Fixturas (Supabase local):** as 60 da prova (`.specs/features/74-mobile-adm-pedidos/prova/fixturas.sql`,
`P74-01`..`P74-60`) mais extras de QA com o mesmo prefixo de id (apagados pelo `prova/limpa.sql`):
`P74-04` material a caminho com rastreio do envelope, `P74-08` material recebido, `P74-12` em produção,
`P74-13` cupom + desconto de Pix + promoção, `P74-14` telefone inválido, `P74-15` estornado e cancelado,
uma nota interna em `P74-01`, `P74-61` (pedido da `cliente.qa`) e `P74-62` (inserido no meio da rolagem).
O papel da `adri.qa` foi tirado e devolvido (mesmo `id`) na sessão 7; a senha da `cliente.qa` foi
definida como `senha-cliente-qa` (conta de QA, não tinha senha conhecida).

### CH-pedidos-numero-da-inicio-bate — Adri no celular

- **Ran:** 390×844, Money Tour (box respeitado)
- **Walk:** Início → cada bloco de "Precisa de você" → lista; contagem lida contra SQL escrito à mão
  sobre as regras de `queue.ts`/`views.ts`, no mesmo instante:

  | Recorte | Número na Início | Lista | Banco |
  | --- | --- | --- | --- |
  | `?bloco=aguardando` | 31 | "31 pedidos", 25 + 2ª página | 31 |
  | `?bloco=a-separar` | 16 | "16 pedidos" | 16 |
  | `?bloco=sem-rastreio` | 5 | "5 pedidos" | 5 |
  | `?bloco=pix-aguardando` | 10 | "10 pedidos" | 10 |
  | selo da aba / "Precisa de ação" | 52 ("Pedidos, 52 precisam de você") | "52 pedidos precisam de você, do mais antigo para o mais novo." | 52 (união) |
  | Tudo · Fila de material · A separar · Em trânsito · Concluídos | — | 115 · 35 · 43 · 13 · 36 | 115 · 35 · 43 · 13 · 36 |

  Faixa "Filtro: …" com nenhum chip marcado; "Limpar filtro" 94×44 ⇒ `?visao=tudo`; chips por
  substituição (`history.length` parado em 10 depois de 6 trocas); `/pedidos`, `?visao=xyz` e
  `?bloco=xyz` ⇒ "Precisa de ação"; `?bloco=…&visao=tudo` ⇒ o bloco. `pass`
- **Bugs:** nenhum.

### CH-pedidos-achar-o-pedido-da-cliente — Adri no celular

- **Walk (busca):** `#P74-13`, ` P74-13 ⏎`, `p74-13`, e-mail em maiúsculas, rastreio de saída e do
  envelope, `#0176`/`0176`/`#0176⏎` ⇒ 1 pedido cada; `176` ⇒ 2 (`NS-176` e `0176`, correto);
  `a,b(c)` ⇒ "Nada por aqui. / Nenhum pedido com “a,b(c)”." sem erro; só espaços ⇒ lista inteira;
  digitação rápida trocando de termo ⇒ vence o último; busca vale dentro do chip ("Prova 2" em Em
  trânsito ⇒ 2). Campo 48 px, `type=search`, placeholder do protótipo. `pass`
- **Walk (detalhe):** `P74-01` (gravação "Helena", 2 × R$ 50,00, nota interna, "A cliente NÃO foi
  avisada"), `P74-13` (cupom, Pix e promoção em linhas próprias, total do pedido sem recalcular),
  `P74-04/08/12` (passos do material, "Material usado na joia" no entregue, "Rastreio do envelope"),
  `P74-14` (telefone inválido ⇒ nem telefone nem WhatsApp), `P74-15` (Cancelado, "Pedido cancelado",
  Estornado), `P74-17`/`P74-27` (retirada: "Retirada no escritório", sem rastreio). WhatsApp
  `https://wa.me/55519999900NN`, `_blank`, `noopener noreferrer`, 75×44. Sem "Ver cliente", sem botão
  de ação.
- **Finding:** **o meio de pagamento "card"** — todo pedido pago com cartão na loja nova (`0174`,
  `0178`–`0182`) mostra "card" em "Valores"; `core` não tem o rótulo (a loja tem, noutro mapa).
  Trust-Damage baixo ⇒ `BUG-20261024-pagamento-por-cartao-aparece-como-card`.
- **Evidence:** `390-detalhe-p01.png`, `390-detalhe-p13-valores.png`, `390-detalhe-0174-meio-card.png`.

### CH-pedidos-voltar-do-android — Adri no celular

- **Walk:** bloco "Aguardando material" → rolar até a 2ª página (31 linhas, `scrollY` 3426) → abrir a
  29ª → detalhe no topo, foco no `h1`, título "Pedido #P74-24 · Ateliê" → "Voltar" ⇒ mesmo recorte,
  `scrollY` 3426, 31 linhas, sem esqueleto; o mesmo pelo voltar do navegador. Cinco chips e voltar ⇒
  sai da lista de uma vez. Últimos pedidos → detalhe (aba Pedidos marcada) → Voltar ⇒ Início. Link
  colado + F5 → Voltar ⇒ `/pedidos`. `/pedidos/<uuid inexistente>` e `/pedidos/abc` ⇒ "Não encontrei
  este pedido." + "Voltar aos pedidos" (131×44). `pass`
- **Finding:** buscar `Prova 2` → abrir → Voltar ⇒ **a busca some** (campo vazio, 116 pedidos, topo).
  É o percurso de todo dia (conferir vários pedidos da mesma cliente). Friction ⇒
  `BUG-20261024-voltar-do-pedido-buscado-perde-a-busca` (o verificador r3 já o tinha deixado para o QA).

### CH-pedidos-com-rede-ruim — Adri no celular

- **Walk:** primeira leitura com 500 (lista) e com `atelie_clock` em 500 ⇒ "Não consegui carregar." +
  "Tentar de novo", nunca "Nada por aqui." nem recusa. Rede cortada só no `order_list` ⇒ esqueleto
  (`aria-busy`) por ~16 s (8 tentativas: as do React Query × as do cliente) e então a mesma falha.
  Próxima página em 500 ⇒ as 25 ficam, o fim oferece "Tentar de novo"; um pedido inserido no banco
  entre as páginas entrou pelo Realtime ("116 pedidos") e, rolado até o fim, 116 ids distintos. Volta
  ao primeiro plano com a leitura em 500 ⇒ "Não consegui atualizar agora." + "Atualizado às 02h52.",
  dado mantido, sem esqueleto. Itens e histórico em 500 no detalhe ⇒ só o bloco diz "Não consegui
  carregar." Offline ⇒ "Sem conexão" da `72`, e volta sozinho. `pass`
- **Paper cut:** os ~16 s de esqueleto com a rede cortada (abaixo).

### CH-pedidos-ao-vivo-com-o-painel — Adri no celular

- **Walk:** com o detalhe de `P74-24` aberto, `update` do material para recebido no banco (no lugar do
  painel, que não estava servido do worktree) ⇒ selo "Material recebido", "Material na bancada",
  "Recebido agora" sem recarregar; selo da aba 52 ⇒ 53 (o `P74-62` pago entrou); a Fila "Aguardando
  material" deixou de listar o pedido (30). `realtime.subscription`: 1 com o detalhe aberto, 0 depois
  de ir a Clientes. `pass` (o percurso com o painel de verdade numa segunda janela não foi feito.)

### CH-pedidos-com-leitor-de-tela-e-fonte-grande — Equipe com TalkBack

- **Walk:** 360×800, 390×844 e 412×915 × fonte 100/130/175/200 % × (lista "Tudo", detalhe de
  R$ 99.999,90, detalhe com nome longo e histórico, detalhe com descontos) = 48 medições:
  `scrollWidth == innerWidth` em todas, **zero** folhas de texto sobrepostas, nada cortado, nenhum alvo
  abaixo de 44 px; só os chips passam da viewport, dentro da faixa que rola. Início a 200 %: linhas de
  "Últimos pedidos" são links de 218 px de alto, `scrollWidth` 390. Nomes acessíveis "Pedido #P74-01,
  <cliente>", "Pedidos, 52 precisam de você", `aria-pressed` só no chip ativo, `aria-current` na aba
  Pedidos no detalhe, foco no `h1` na navegação dentro do app, títulos "Pedidos · Ateliê" e "Pedido
  #… · Ateliê". `prefers-reduced-motion: reduce` ⇒ esqueleto sem animação (`pulse` só sem a
  preferência). 1440×900 sem rolagem lateral. `pass` (TalkBack real: aparelho, fora desta rodada.)
- **Evidence:** `390-lista-fonte-200.png`, `390-detalhe-p01-fonte-200.png`, `1440-lista.png`,
  `1440-detalhe.png`.

### CH-pedidos-conta-sem-acesso — Cliente com conta da loja

- **Walk:** `cliente.qa` (dona do `P74-61`) em 360×800: `/login` com "Esta conta não tem acesso ao
  painel."; `/pedidos`, `?bloco=aguardando`, `/pedidos/<o dela>` e `/pedidos/<outro>` ⇒ todos voltam à
  recusa, `P74-61` nunca no HTML, **zero** leituras de `/rest/v1/` além de `user_roles`/`customers`.
  Admin com a lista aberta perdendo o papel no banco e voltando ao primeiro plano ⇒ recusa no primeiro
  quadro medido (500 ms), 0 linhas. `pass`

## What Was Fixed

Nada nesta rodada: os dois achados mudam comportamento além da tela da `74` (o mapa de `core` que o
painel também lê; o estado da busca contra a decisão A13) e foram para *Decisions for a Human*.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri no celular | J-achar-um-pedido, primeira leitura com a rede cortada | ~16 s de esqueleto antes de "Não consegui carregar." (8 tentativas: retry do React Query × retry do cliente) | medium | registrado; herdado do cliente/`retryUnlessDenied`, igual à Início |
| Adri no celular | J-ver-um-pedido, 1440 | lista e detalhe esticados na largura toda (linhas de 1.900 px) | low | registrado; o app é só Android |
| Adri no celular | detalhe de pedido com dado incoerente (entregue com material "a caminho") | "Pedido concluído" seguido de "Material a caminho" | low | dado de fixtura; regra herdada do painel (`rowSummary`) |

## Decisions for a Human

### BUG-20261024-pagamento-por-cartao-aparece-como-card
- Opções: (1) acrescentar `card: 'Cartão de crédito'` ao `PAYMENT_METHOD_LABELS` de `core` e trocar a
  queda do valor cru por um rótulo genérico ("Outra forma de pagamento"), com teste — o painel passa a
  mostrar o rótulo certo também; (2) só no app. **Recomendação: 1**, e a loja reexportar o de `core`
  (dono único) — muda o que o painel mostra para esses 6 pedidos, conserto e não regressão.

### BUG-20261024-voltar-do-pedido-buscado-perde-a-busca
- Opções: (1) guardar o termo em memória por entrada de histórico (sem endereço, respeitando A13) e
  restaurá-lo com a posição no voltar; (2) aceitar como está (A13 fala só do endereço). **Recomendação:
  1**.

## Final Status

- **Release readiness:** **não pronto** — 2 bugs abertos (Trust-Damage 1, Friction 1), 0 Blocks-
  Completion, 0 Data-Loss. 5 de 7 charters `Pass`; os 2 restantes aguardam decisão/conserto.
- **Exit gate (suítes, medidas uma vez nesta rodada, exit fora de pipe):**
  `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` ⇒ exit 0, **804 testes em 61
  arquivos**; `pnpm --filter @estrelinha/core test --testTimeout=20000` ⇒ exit 0, **3989 em 158**.
- **Fora desta rodada:** aparelho Android real (TalkBack, instalação, voltar na raiz) e o percurso
  com o painel servido numa segunda janela.
- **Limpeza:** `prova/limpa.sql` rodado ao fim (orders 54, order_items 82, user_roles de volta); o
  papel da `adri.qa` devolvido com o mesmo id. Para o reteste: `prova/fixturas.sql` e depois
  `evidence/2026-10-24-mobile-adm-pedidos/fixturas-extras-qa.sql`.
