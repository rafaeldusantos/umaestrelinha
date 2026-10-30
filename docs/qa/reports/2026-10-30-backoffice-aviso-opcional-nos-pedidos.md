# QA Run Report — 2026-10-30 — aviso opcional nas ações do pedido (feature 88)

- **Scope:** feature `88` (não commitada sobre `358334d6`): a caixa "Avisar a cliente por e-mail" nos dez gestos do pedido, a linha "não enviado" com o avião no Histórico, e os estados de carregamento da página do pedido e da lista.
- **Cadence tier:** targeted
- **Build:** árvore de trabalho sobre `358334d6` · **Environment:** painel `pnpm dev:backoffice` :8083, Supabase local :54441 com a migration `20261102120000_88-aviso-pulado` aplicada, `send-notification` servida por `supabase functions serve` com o desvio do probe 02 (chave do Resend inválida, destinatário desviado para `@exemplo.invalid`, `HTTPS_PROXY` inexistente). `*.supabase.co` e analytics bloqueados por rota.
- **Started:** 2026-10-30 · **Status:** closed

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-aviso-acertar-o-registro-sem-reavisar | J-mudar-pedido-com-ou-sem-aviso / PNL-aviso-* | Adri despachando pedidos | Money Tour | Pass (com 2 bugs abertos) | BUG-20261030-aviao-que-falha-apaga-a-escolha; BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido | |
| 2 | CH-aviso-rede-lenta-e-falhas | J-mudar-pedido-com-ou-sem-aviso / PNL-carregar-*, PNL-aviso-leitura-de-envios-falha | Adri despachando pedidos | Network Tour | Blocked (human decision) | BUG-20261030-leitura-de-envios-falha-em-silencio; BUG-20261030-lista-diz-nada-esperando-enquanto-carrega | |
| 3 | CH-aviso-lote-do-dia | J-avancar-pedidos-em-lote / PNL-lote-* | Adri despachando pedidos | Money Tour | Pass (com 2 bugs abertos) | BUG-20261030-resumo-do-lote-some-em-quatro-segundos; BUG-20261030-recebi-o-material-sem-o-pedido-no-nome | |
| 4 | CH-aviso-fonte-grande-e-leitor | J-mudar-pedido-com-ou-sem-aviso / PNL-aviso-fonte-grande-e-telas, -teclado-e-leitor | Adri despachando pedidos | Feature Tour | Pass (com bugs abertos) | BUG-20261030-pedido-rola-de-lado-com-fonte-200; BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido; BUG-20261026-fechar-do-modal-em-ingles (re-found) | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

"Pass (com bugs abertos)" quer dizer: o caminho principal da sessão chegou ao fim verdadeiro (banco, resposta
do motor e tela concordam); os bugs são de acessibilidade, de borda ou anteriores à 88. Os cenários
com bug estão `fail` no tracker. Nenhum conserto foi feito neste ciclo (pedido do usuário: o QA só registra).

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri despachando pedidos | Power User | 1440×900 mouse e 390×844 toque · wifi e respostas do Supabase atrasadas 2 s · fonte 100/130/200 % · pt-BR | os quatro |

## Flows in Scope

- `J-mudar-pedido-com-ou-sem-aviso` (`../journeys/J-mudar-pedido-com-ou-sem-aviso.md`)
- `J-avancar-pedidos-em-lote` (`../journeys/J-avancar-pedidos-em-lote.md`)
- Canário `J-ver-um-pedido` (app do ateliê lendo a linha `skipped`): **não andado** — ver *Não provado*.

## Dados e contenção do e-mail

- 67 pedidos de teste (`id` `00000000-0000-4000-c188-…`, `order_number` `QA88-…`, e-mails `@exemplo.invalid`):
  Em Separação com rastreio (01, 02, 09, L01..L52), Enviado sem rastreio (03), material a caminho (04, 10, M1..M5),
  já com `order_shipped` `sent` (05, L01..L03), retirada (06), sem e-mail (07, `customer_email = ''`, a coluna é
  NOT NULL), aguardando material (08). `store_settings.notifications` guardado byte a byte antes e devolvido no fim
  (ligados durante a sessão: `material_tracking_registered`, `order_cancelled`; `material_received` desligado por
  um momento para A-13).
- `send-notification` servida com o desvio do probe 02 (chave inválida, `RESEND_DEV_REDIRECT_TO` em
  `@exemplo.invalid`, `HTTPS_PROXY=http://127.0.0.1:9`). Todo envio terminou `failed` com "Connection refused" —
  inclusive os avisos à dona (que iriam para o `general.email` real). **Nenhum e-mail saiu.** Por isso o desfecho
  "a cliente foi avisada" (`emailSent === true`) não foi visto: só "o e-mail não saiu — o pedido foi alterado".
- Nada dublado no motor: todas as respostas `{sent, customer_sent, results}` vieram da função real. Dublados por
  rota no navegador só os casos de falha forçada (PATCH 500, releitura 500, `order_notifications` 500) e o atraso
  de 2 s.

## Session Debriefs

### CH-aviso-acertar-o-registro-sem-reavisar — Adri despachando pedidos

- **Ran:** 1440×900, ~45 min (box respeitado)
- **Findings:**
  - Gesto 1 (Próximo passo "Enviado", QA88-01): o diálogo abre antes de qualquer escrita (zero PATCH com ele
    aberto), mostra "O pedido #QA88-01 passa de Em Separação para Enviado.", a caixa marcada, o destinatário,
    "Pedido postado" (nome do catálogo) e "Mudar para Enviado". Confirmar: o botão vira "Marcando como
    enviado…" com `aria-busy`, Voltar desabilitado, a região viva anuncia o gerúndio e depois "Status: Enviado —
    o e-mail não saiu — o pedido foi alterado" (verdadeiro: o provedor estava inalcançável). Banco:
    `shipped`, `order_shipped` `failed`. AVS-01/02/03/07, CRG-01/07/09 ✓.
  - Desmarcar (QA88-02): o texto do diálogo troca para "A cliente não recebe e-mail. Fica anotado no histórico…";
    a chamada leva `"customer":false`; o Histórico mostra "Aviso à cliente não enviado: Pedido postado · Você
    escolheu não avisar" com o avião (44×44, nome "Enviar agora o e-mail “Pedido postado” para a cliente").
    AVS-04/10/12 ✓.
  - Avião: "Enviando…" só naquele botão, depois "O e-mail “Pedido postado” não saiu. Tente de novo." — mas a
    linha vira "Falha ao enviar…" (failed) em vez de continuar "não enviado" → **BUG aviao-que-falha-apaga-a-escolha**
    (AVS-13). Com o evento desligado (A-13): "Este e-mail está desligado em Configurações → Notificações." e a
    linha continua skipped ✓.
  - Fechar sem gravar: Esc, Voltar e clique fora não gravam (zero escrita na rede) e devolvem o foco ao "Enviado";
    pelo "Outro status", o seletor volta ao vazio ✓, **mas o foco cai no `<body>`** → BUG foco-cai-no-body.
  - Sem e-mail previsto: Em Separação → Pago, cliente sem e-mail, retirada → Entregue (`order_delivered`
    desligado): grava direto, "· nenhum aviso sai nesta mudança" ✓. Já enviado (QA88-05): sem diálogo,
    "“Pedido postado” já tinha sido enviado, não sai de novo" ✓ (AVS-06/07, A-01).
  - Material: "Marcar material como recebido" pergunta por "Material recebido no ateliê"; desmarcado grava
    `customer:false` e a linha "não enviado". Código do envelope (evento ligado para o teste): o diálogo nomeia
    "Rastreio do material registrado" e diz que o aviso "Material a caminho", para você, não depende da caixa;
    desmarcado, a dona foi reivindicada mesmo assim (A-04 ✓).
  - Cancelar (evento ligado): caixa dentro do diálogo, "Confirmar cancelamento" desabilitado sem motivo; com o
    PATCH falhando o diálogo fica aberto, o motivo fica, "O pedido não foi cancelado. O motivo continua aqui —
    tente de novo." (CRG-07 ✓); de verdade: "O e-mail não saiu — o pedido foi cancelado".
  - Salvar rastreio num Enviado sem rastreio: o diálogo "Salvar o rastreio da joia" nomeia "Pedido postado";
    a nota interna digitada continua no campo depois de gravar.
  - "Ver o e-mail" abre a prévia numa aba nova (título da aba = assunto do e-mail) sem fechar o diálogo nem
    gravar (AVS-22 ✓).
- **Bugs filed/updated:** BUG-20261030-aviao-que-falha-apaga-a-escolha, BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido, BUG-20261026-fechar-do-modal-em-ingles (re-found)
- **Scenarios settled:** PNL-aviso-marcar-enviado-com-aviso → pass; -desmarcar-e-gravar → pass; -aviao-envia-depois → fail; -fechar-sem-gravar → fail (foco); -sem-email-previsto → pass; -ja-enviado-nao-pergunta → pass; -material-e-envelope → pass; -cancelar-com-caixa → pass; -retirada → pass (só o ramo "Marcar como retirado" sem e-mail; o próximo passo da retirada pula o Enviado)
- **Paper cuts:** ver a tabela abaixo.
- **Surprises:** o Histórico mostra o erro técnico cru do provedor ("error sending request for url…") — anterior à 88.
- **Suggested next charter:** o mesmo percurso com o envio real chegando (Resend de teste), para ver "a cliente foi avisada" e o avião virando "E-mail enviado".

### CH-aviso-rede-lenta-e-falhas — Adri despachando pedidos

- **Ran:** 390×844, respostas do Supabase atrasadas 2 s por rota (o Slow 3G do CDP travou o Vite de dev, que
  serve centenas de módulos; o atraso por rota mede o que a 88 controla, os dados), ~35 min
- **Findings:**
  - Primeira abertura do pedido: esqueleto (`aria-busy`, "Carregando o pedido" só como nome acessível), nunca o
    texto "Carregando..." (CRG-06 ✓). Lista: linhas-esqueleto (CRG-13 ✓), **mas o subtítulo diz "Nada esperando
    você agora" e os cartões mostram 0 por 2–4 s** → BUG lista-diz-nada-esperando-enquanto-carrega.
  - Gravar com a página rolada (967 px) e uma nota pela metade: em 12 s de gravação lenta a página nunca virou
    "Carregando", a nota ficou, a rolagem não voltou ao topo (terminou em 1153: o conteúdo acima cresceu com o
    próximo passo). CRG-03 ✓. Foco no `<body>` ao terminar (o botão "Enviado" deixa de existir) → mesmo bug do foco.
  - Releitura falhando depois da escrita: o pedido fica, "Não consegui atualizar o pedido. O que está na tela pode
    estar desatualizado." com "Tentar de novo"; ao tentar com a rede de volta, o estado novo aparece (CRG-04 ✓).
  - PATCH do rastreio falhando: "O rastreio não foi salvo. Nada foi alterado — tente de novo.", código e
    transportadora continuam digitados (CRG-05 ✓). Duplo clique em "Salvar rastreio": um PATCH só (CRG-02 ✓).
  - **Decisão aberta** (leitura de `order_notifications` falhando): ver BUG leitura-de-envios-falha-em-silencio
    e *Decisions for a Human*.
- **Bugs filed/updated:** BUG-20261030-leitura-de-envios-falha-em-silencio, BUG-20261030-lista-diz-nada-esperando-enquanto-carrega
- **Scenarios settled:** PNL-carregar-sem-piscar → pass; -releitura-falha → pass; -esqueleto → fail; PNL-aviso-leitura-de-envios-falha → blocked-decision

### CH-aviso-lote-do-dia — Adri despachando pedidos

- **Ran:** 1440×900 (tabela) e 390×844 (cartões), ~30 min
- **Findings:**
  - Lote de 5 (2 já avisados): "5 mudam", por linha "· já avisada" / "· e-mail", "Avisar as 3 clientes por
    e-mail", "2 pedidos já receberam “Pedido postado” antes e não recebem de novo." Confirmar: o diálogo fecha,
    a barra diz "Avançando 1 de 5… Não feche a página" com `progressbar` 1/5, ações desabilitadas; "Atualizando…"
    na releitura; a tabela não some. Resultado "5 avançaram · nenhum e-mail saiu" — verdadeiro (3 failed, 2 sent
    intocados). AVS-19, CRG-10/12 ✓.
  - 67 selecionados: aviso do teto antes ("O lote age sobre os primeiros 50…"), o diálogo conta 50 (48 mudam ·
    2 ficam), caixa "Avisar as 34 clientes". Desmarcado: 34 linhas `skipped` no banco, resumo "48 avançaram · 2
    ficaram como estavam · sem e-mail às clientes — anotado no histórico de 34 pedidos" — **toast de ~4 s, sem o
    motivo dos 2** → BUG resumo-do-lote-some-em-quatro-segundos.
  - Material em lote (5): "Registrar 5 recebimentos", "Registrando 1 de 5…", "5 marcadas · nenhum e-mail saiu".
  - Cartão do celular "Recebi o material": diálogo (incluindo "(#QA88-M1)"), "Registrando…" só no cartão, resultado
    na região viva. AVS-21 ✓; os botões dos cartões não têm o pedido no nome → BUG recebi-o-material-sem-o-pedido-no-nome.
- **Scenarios settled:** PNL-lote-avancar-com-progresso → fail (resumo); PNL-lote-cartao-do-celular → fail (nome acessível)

### CH-aviso-fonte-grande-e-leitor — Adri despachando pedidos

- **Ran:** 390 e 1440 a 130 % e 200 % (font-size do `html`), árvore de acessibilidade e teclado, ~25 min
- **Findings:**
  - Diálogo de aviso: cabe em todos; a 390/200 % rola por dentro (1270 de 758), sem estourar a tela. Botões
    57 px (130 %) e 88 px (200 %). O X "Close" 21 × 21 → re-found BUG-20261026-fechar-do-modal-em-ingles.
  - Foco ao abrir o diálogo vai ao título; Tab percorre caixa → Ver o e-mail → Voltar → confirmar → X; clicar no
    texto do rótulo alterna a caixa (rótulo 249 × 40).
  - Avião: 57 × 57 e 88 × 88, dentro da linha em todos os tamanhos.
  - Página do pedido a 390/200 %: `scrollWidth` 589 (fileira de filtros do Histórico) → BUG pedido-rola-de-lado-com-fonte-200 (anterior à 88).
  - Barra de lote a 1440/200 % embrulha, sem rolagem lateral. Em 390 não há seleção em lote (só os cartões).
  - Região viva: anuncia o gerúndio e o resultado (CRG-09 ✓); o mesmo texto vai também ao aviso flutuante, que
    tem região viva própria — o leitor pode ouvir duas vezes (paper cut).
- **Scenarios settled:** PNL-aviso-fonte-grande-e-telas → fail; PNL-aviso-teclado-e-leitor → fail

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri despachando pedidos | diálogo de aviso | "Para qa88…@exemplo.invalid:" termina em dois-pontos dentro da caixa e a lista de e-mails fica fora dela | dull | watching |
| Adri despachando pedidos | diálogo do lote | título "Avançar 50 pedidos", botão "Avançar 48 pedidos" | dull | watching |
| Adri despachando pedidos | Histórico | a linha "não enviado" tem um avião decorativo à esquerda e o avião-botão à direita | dull | watching |
| Adri despachando pedidos | Histórico | erro técnico cru do provedor de e-mail na linha de falha (anterior à 88) | sharp | watching |
| Adri despachando pedidos | Entrega | a dica diz "O e-mail “sua joia foi postada”…", o diálogo chama o mesmo e-mail de "Pedido postado" | dull | watching |
| Adri despachando pedidos | "Ver o e-mail" | abre aba nova sem avisar (nome acessível "Ver o e-mail") | dull | watching |
| Adri despachando pedidos | lote de material | um pedido já "material recebido" (pela tela do cartão) entra como "muda" e o e-mail é tentado de novo | dull | watching |
| Equipe com leitor | resultado das ações | o mesmo resultado em duas regiões vivas (sr-only + toast) | dull | watching |

## Runtime Errors Observed

- Só os erros das falhas forçadas (PATCH 500, releitura 500, `order_notifications` 500). Nenhum outro erro de console.

## Decisions for a Human

1. **Leitura de envios falhando na página do pedido** (decisão aberta do `tasks.md`): hoje a página segue com a
   lista vazia em silêncio, pergunta por e-mail já enviado e promete "anotado no histórico" sem anotar.
   Opções: (a) manter; (b) recusar o gesto com aviso, como o lote e o cartão ("Não consegui conferir os e-mails
   deste pedido. Nada foi alterado."); (c) gravar, mas sem diálogo e com a frase "não consegui conferir se a
   cliente já foi avisada". **Recomendação: (b)** — é o que as outras duas superfícies já fazem e evita as duas
   frases falsas; o Histórico também deveria dizer que não conseguiu ler os e-mails em vez de "Nada por aqui ainda".
2. **Avião que falha** (AVS-13 × design): a linha deve continuar "não enviado" (spec) ou virar "Falha ao enviar"
   com Reenviar (motor de hoje)? **Recomendação:** manter o motor, mas o Histórico continuar mostrando que a
   cliente não foi avisada por escolha e que a tentativa posterior falhou (ou ajustar a letra de AVS-13).

## Human Verifications Needed

- Envio real chegando (uma conta de teste do Resend): "a cliente foi avisada por e-mail" e o avião virando
  "E-mail “…” enviado". Aqui todo envio terminou `failed` de propósito.
- Fonte do sistema de verdade (Android/iOS) no painel em 390 — aqui foi o `font-size` do `html`.

## Não provado

- O app do ateliê lendo a linha "não enviado" (canário): não subido neste ciclo.
- Slow 3G de verdade no bundle: o Vite de dev não carrega sob o perfil do CDP; foi usado atraso de 2 s por rota nos dados.
- Retirada com e-mail: o próximo passo da retirada vai direto a "Retirado" e `order_delivered` está desligado; o ramo
  "retirada + Enviado" não foi andado.
- Página e tamanho da página mantidos depois do lote (CRG-12): não medido com página > 1.
- `prefers-reduced-motion` não conferido.

## Final Status

Pronto com ressalvas. O núcleo da 88 funciona como prometido no banco local: a pergunta só aparece quando um
e-mail sairia, a escolha vira `customer:false` e linha `skipped`, a dona continua avisada, as frases dizem o
desfecho real, e nenhuma gravação troca a página por "Carregando...". Bugs: **Trust-Damage 3** (2 Medium, 1 Low),
**Friction 4** (1 Medium, 3 Low), **re-found 1** (Cosmetic/Friction). Nenhum Blocks-Completion ou Data-Loss.
Uma decisão aberta (leitura de envios) e uma divergência spec × design (avião).

**Exit gate:** `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` → **4715/257 passed, exit 0**
(2026-10-30, fora de pipe). As outras suítes (core, store, functions) não foram rodadas neste ciclo.

**Limpeza:** os 67 pedidos `QA88-…`, os itens, o histórico e as linhas de `order_notifications` apagados
(conferido: 0 linhas); `store_settings.notifications` devolvido byte a byte; dev server :8083 e
`functions serve` encerrados (edge runtime do Supabase local parado, como estava).
