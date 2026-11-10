# Sessão CH-03 · Conferir e desfazer registros em várias abas sem perder a conta da loja

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-conferir-e-desfazer.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri no computador · conta: `admin` — `QA_ADMIN_*`              |
| Tour · modo | Multi-Tab · com tour                                                   |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50 (+2 de limpeza: sair da conta e fechar)      |
| Ambiente    | http://localhost:8083 (painel) · Supabase local · build não exposto · Chromium (Playwright MCP) · viewport 1440×900 |
| Paridade    | dado sintético (massa QA98); `*.supabase.co` e `**/g/collect*` bloqueados; e-mails às clientes saem pelo Resend com chave inválida e não chegam ao Mailpit |

## Missão

Com o mesmo pedido aberto em duas ou três abas, conferir, registrar e desfazer, procurando o pagamento
que conta duas vezes, o estoque ou cupom que não volta, a venda que fica no Dashboard depois do desfazer
e o comprovante que abre para quem não devia.

## Passos

Pedido usado para registrar e desfazer: **#0564** (M6a, cupom QA98CUPOM, Corrente Veneziana Folheada a Ouro 50cm, total R$ 111,99). #0555 não foi tocado (continua registrado para o CH-06).

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel como admin | Dashboard, "Movimento da loja"            | — |
| 02 | Anotar a venda de ontem (09/11) no Dashboard | Ontem: 2 vendas, R$ 86,22 (hoje: 13, R$ 513,99) | — |
| 03 | Anotar os usos do cupom em Cupons | QA98CUPOM: 3 usos, Ativo | — |
| 04 | Anotar o estoque da corrente em Produtos | "Corrente Veneziana Folheada a Ouro": estoque 6 (a busca "Veneziana 50" não acha nada — o nome da variação não entra na busca) | — |
| 05 | Abrir `/admin/pedidos/#0564/pagamento` nas abas A e B | Formulário "Registrar pagamento", data padrão 10/11 03:04 | — |
| 06 | Na aba B, anexar um comprovante (PNG azul) | anexado | — |
| 07 | Na aba A: Transferência, data 09/11 15:00, observação "CH03 aba A — combinado no WhatsApp", comprovante PNG vermelho; Registrar; desmarcar "Avisar a cliente" e confirmar | Ao escolher o dia no calendário o popover fica aberto e cobre o campo de comprovantes (precisou de Esc). Registro feito; vai para o pedido em "Pago" | — |
| 08 | Na aba B (sem recarregar), Registrar → confirmar | Alerta: "O pagamento deste pedido foi aprovado enquanto você preenchia. Nada foi registrado, e os comprovantes não foram guardados." | `screenshots/CH-03-08-aba-b-recusada.png` |
| 09 | Ler o bloco Pagamento na aba A | "Registrado à mão" · Meio Transferência · Pago em 09/11/2026 às 15h00 · Registrado por admin@umaestrelinha.dev · a observação · **1** comprovante ("Abrir comprovante 1 (PNG)") · botão "Desfazer registro". Acima, na lista do pagamento, "Método: pix" e "Situação: Aprovado". Histórico: "Pendente → Pago · Pagamento registrado manualmente" e "Aviso à cliente não enviado: Pagamento aprovado — Você escolheu não avisar" | — |
| 10 | Conferir o Dashboard, Ontem | 3 vendas, R$ 198,21 (= 86,22 + 111,99); entrou pela data informada | — |
| 11 | Na aba A, "Desfazer registro"; tentar sem motivo | Diálogo "Desfazer o pagamento registrado": diz que volta a Pendente, o estoque e o cupom voltam, sai das vendas, "A observação e os comprovantes ficam guardados", "Nenhum e-mail sai para a cliente". Botão "Desfazer o registro" desabilitado com o motivo vazio, sem frase dizendo que falta o motivo | — |
| 12 | Colar motivo com travessão, aspas curvas e quebra de linha; **duplo clique** em "Desfazer o registro" | Pedido em "Pendente"; **uma** linha "Pago → Pendente · Registro de pagamento desfeito. Motivo: …" (aspas curvas preservadas, quebra de linha virou espaço); "Registrar pagamento" volta. **A observação e o comprovante do registro não aparecem em lugar nenhum da página.** A linha antiga "Aviso à cliente não enviado: Pagamento aprovado" continua com o botão "Enviar agora o e-mail “Pagamento aprovado” para a cliente". Situação do pagamento: "Expirado" | `screenshots/CH-03-12-depois-do-desfazer.png` |
| 13 | Voltar à aba do Dashboard (sem recarregar) | Ontem: 2 vendas, R$ 86,22 — voltou ao anotado, ao vivo | — |
| 14 | Sair da conta e fechar o browser | tela de login | — |

**Edge cases tentados:** mesma URL em duas abas (registro concorrente, passo 08); enviar vazio (desfazer sem motivo, passo 11); duplo clique no confirmar do desfazer (passo 12, um desfazer só); motivo colado com aspas curvas, travessão e quebra de linha (passo 12, preservado); data diferente de hoje (09/11) para separar data do pagamento da data do registro (passo 10).

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-006 | pass | 08, 09 | `screenshots/CH-03-08-aba-b-recusada.png` | Aba B não grava e diz que nada foi registrado; o bloco tem 1 comprovante só. Frase fala em "aprovado" quando foi outro registro manual (spec-gap de polimento). O recarregar do passo 3 não foi feito à parte — a aba A leu o pedido do servidor depois da tentativa da B |
| TC-FUNC-007 | pass | 09 | — | Feito sobre o registro novo de #0564, não sobre M7: meio pelo nome, data/hora em Brasília, quem, observação, comprovante, linha "Pagamento registrado manualmente" com hora. "Quem" aparece como e-mail e o histórico não diz quem; "Cartão de crédito" e "Outro" não conferidos (orçamento). Linha "Método: pix" ao lado do "Transferência" — A-3 |
| TC-FUNC-008 | fail | 11, 12 | `screenshots/CH-03-12-depois-do-desfazer.png` | Pendente, histórico com motivo e hora, "Registrar pagamento" volta, sem e-mail (o diálogo diz e o histórico não mostra aviso). Mas observação e comprovante somem — A-1. Motivo vazio: botão desabilitado sem frase (o plano assumiu "diz que falta") |
| TC-FUNC-009 | skip | — | — | M8, M9 e o desfazer em aba desatualizada não alcançados — orçamento |
| TC-FUNC-013 | skip | — | — | M11 não aberto — orçamento |
| TC-SEC-001 | skip | — | — | comprovantes de M7, janela anônima e expiração não alcançados — orçamento |
| TC-INT-002 | pass | 02, 10, 13 | — | Dashboard: ontem 2/R$ 86,22 → 3/R$ 198,21 → 2/R$ 86,22. Início do app do ateliê não conferida (orçamento) |
| TC-INT-003 | blocked | 03, 04 | — | Anotados (cupom 3 usos; estoque 6), mas não relidos depois do registro nem do desfazer — orçamento. Não é bloqueio do app: o motivo é o teto de ações |

Contagem: pass 3 · fail 1 · blocked 1 · skip 3

## Achados

### A-1 · [Pedido · bloco Pagamento] Depois de desfazer, a observação e os comprovantes do registro somem da tela — para a dona

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri no computador |
| Jornada e passo     | J-02, passos 3–4 (desfazer e conferir) · passo 12 do log |
| TC                  | TC-FUNC-008 |
| Gravidade proposta  | high — a prova do pagamento (print do PIX/transferência) e a nota interna ficam inalcançáveis depois de um desfazer, justamente quando a dona precisa entender o que aconteceu; o diálogo promete o contrário |
| Reproduziu          | sim (1 de 1 — a massa de registro M6 é consumida a cada tentativa; a página foi lida inteira pelo snapshot depois do desfazer) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, em `http://localhost:8083/admin/pedidos/<pedido pendente>/pagamento`, escolher Transferência, escrever uma observação, anexar um comprovante e registrar (sem avisar a cliente)
2. No pedido, conferir o bloco Pagamento: observação e "Abrir comprovante 1" aparecem
3. Tocar "Desfazer registro", escrever um motivo e confirmar
4. Procurar a observação e o comprovante no histórico ("Tudo") e no bloco Pagamento

**Esperado:** "a observação e os comprovantes do registro continuam consultáveis no histórico" — **fonte:** TC-FUNC-008 passo 3; PRD CA-03.14; o próprio diálogo do desfazer diz "A observação e os comprovantes ficam guardados".

**Observado:** o histórico mostra só "Pago → Pendente · Registro de pagamento desfeito. Motivo: …" e "Pendente → Pago · Pagamento registrado manualmente"; nem a observação ("CH03 aba A — combinado no WhatsApp") nem o comprovante aparecem em nenhum lugar da página. O bloco "Registrado à mão" sumiu inteiro.

**Evidência:**

- `screenshots/CH-03-12-depois-do-desfazer.png` — página inteira do #0564 depois do desfazer, sem observação nem comprovante
- console: nada
- rede: não inspecionada

### A-2 · [Pedido · Histórico] Depois de desfazer, o histórico ainda oferece "Enviar agora o e-mail “Pagamento aprovado”" num pedido Pendente — para a cliente

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri no computador |
| Jornada e passo     | J-02, passo 4 · passo 12 do log |
| TC                  | TC-FUNC-008 |
| Gravidade proposta  | high — um toque da dona manda à cliente "Pagamento aprovado" de um pedido que não está pago (o registro foi desfeito por engano de pedido); é exatamente o e-mail que o desfazer promete não mandar |
| Reproduziu          | sim (1 de 1 — mesma tentativa do A-1; botão não foi clicado para não disparar o envio) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, registrar o pagamento de um pedido pendente **desmarcando** "Avisar a cliente por e-mail"
2. No histórico aparece "Aviso à cliente não enviado: Pagamento aprovado · Você escolheu não avisar" com o botão "Enviar agora o e-mail “Pagamento aprovado” para a cliente"
3. Desfazer o registro com motivo
4. Olhar o histórico: o pedido está "Pendente" e o botão continua lá, habilitado

**Esperado:** depois do desfazer, nada no pedido leva a cliente a receber "Pagamento aprovado" — **fonte:** PRD CA-03.11 (desfazer sem e-mail); diálogo do desfazer "Nenhum e-mail sai para a cliente"; TC-FUNC-008 passo 4.

**Observado:** com o cabeçalho "Pedido #0564 · Pendente", a linha "Aviso à cliente não enviado: Pagamento aprovado" mantém o botão "Enviar agora o e-mail “Pagamento aprovado” para a cliente".

**Evidência:**

- `screenshots/CH-03-12-depois-do-desfazer.png` — histórico com "Pago → Pendente" no topo e o botão de envio logo abaixo
- console: nada
- rede: nada (botão não acionado)

### A-3 · [Pedido · bloco Pagamento] O bloco mostra "Método: pix" ao lado de "Meio: Transferência" no pagamento registrado à mão — para a dona

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri no computador |
| Jornada e passo     | J-02, passo 1 (ler como foi pago) · passo 09 do log |
| TC                  | TC-FUNC-007 |
| Gravidade proposta  | low — a dona lê dois meios diferentes para o mesmo pagamento, e um deles em valor técnico minúsculo; ela ainda acha o certo em "Registrado à mão" |
| Reproduziu          | sim (2 de 2 — passo 09 e de novo no passo 12, já Pendente) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, registrar à mão um pedido que nasceu PIX, escolhendo "Transferência"
2. Ler o bloco Pagamento do pedido

**Esperado:** o meio pelo nome, nunca o valor técnico — **fonte:** TC-FUNC-007 passo 1; PRD CA-04.1.

**Observado:** a lista do pagamento diz "Método: pix" (minúsculo, valor do banco) e, logo abaixo, "Registrado à mão · Meio: Transferência".

**Evidência:**

- `screenshots/CH-03-12-depois-do-desfazer.png` — "Método pix" no bloco (o screenshot é pós-desfazer; antes, o mesmo "pix" convivia com "Transferência", lido no snapshot do passo 09)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A recusa da aba B diz "O pagamento deste pedido foi **aprovado** enquanto você preenchia" quando quem pagou foi outro registro manual (não a loja) | 08 | polimento |
| Desfazer com motivo vazio: o botão fica desabilitado, sem frase dizendo que falta o motivo (o plano assumiu "diz que falta o motivo") | 11 | polimento |
| Depois do desfazer, a Situação do pagamento aparece "Expirado"; a massa descreve o #0564 como pagamento `pending` antes do registro (a situação antes do registro não foi lida no pedido) | 12 | mudança |
| "Registrado por" mostra o e-mail da conta (admin@umaestrelinha.dev) e a linha do histórico "Pagamento registrado manualmente" não diz quem; TC-FUNC-007 pede "o nome de quem registrou" e "com quem e quando" | 09 | polimento |
| No calendário da data do pagamento, escolher o dia não fecha o popover, que cobre o botão de Comprovantes até um Esc | 07 | polimento |
| A busca de Produtos não acha a variação ("Veneziana 50" → nenhum produto) | 04 | pré-existente |

## Fora da cobertura

- TC-FUNC-009 (Desfazer ausente em M8 #0573 / M9 #0561, e o desfazer na aba desatualizada depois de outra aba avançar o status) — orçamento de 50 ações esgotado
- TC-FUNC-013 (selos de M11 #0576/#0577) — orçamento
- TC-SEC-001 (abrir JPG/PDF/HEIC de M7, link numa janela anônima e na conta `cliente`, expiração) — orçamento; P0, merece sessão própria
- TC-INT-003: estoque (6) e usos do cupom (3) foram anotados, mas não relidos depois do registro nem do desfazer — orçamento
- Início do app do ateliê (TC-INT-002 passo 2) — orçamento
- Mailpit: os e-mails às clientes saem pelo Resend com chave inválida e não chegam ao Mailpit no local; a ausência de e-mail foi lida pelo diálogo e pelo histórico, não pela caixa
- Logout numa aba com o desfazer aberta na outra — orçamento
- O comprovante da aba B "não guardado" foi conferido só na tela (o bloco mostra 1 comprovante); se o arquivo ficou órfão no Storage, o browser não alcança

## Debrief

- **Surpresas:** o Dashboard atualiza sozinho (realtime) — o desfazer saiu da venda de ontem sem recarregar. O desfazer apaga da tela a observação e o comprovante que ele mesmo diz guardar
- **Próximo charter:** uma sessão curta só para TC-SEC-001 (comprovantes de M7) + TC-FUNC-013 + TC-FUNC-009, e uma releitura de estoque/cupom depois de registrar e desfazer (#0566 ou outro M6)
- **Padrão novo:** registrar desmarcando o aviso e depois desfazer — a ação "Enviar agora" da linha do aviso pulado sobrevive à mudança de status
