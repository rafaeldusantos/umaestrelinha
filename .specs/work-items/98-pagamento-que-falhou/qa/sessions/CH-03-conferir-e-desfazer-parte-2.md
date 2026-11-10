# Sessão CH-03 (parte 2) · Conferir e desfazer — os casos que ficaram de fora

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-conferir-e-desfazer.md` · exploratório · P0 |
| Continuação | de `sessions/CH-03-conferir-e-desfazer.md` (orçamento esgotado lá) — só TC-SEC-001, TC-FUNC-009, TC-FUNC-013, TC-INT-003 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri no computador · contas: `admin` (`QA_ADMIN_*`) e, no passo 9, `cliente` (`QA_CLIENTE_*`) |
| Tour · modo | Multi-Tab · com tour                                                   |
| Rodada      | exploração                                                             |
| Orçamento   | 35 ações de browser · usadas ~34 (inclui duas chamadas que travaram 30 min num diálogo "sair da página?" do cadastro do produto) |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · Storage local 127.0.0.1:54441 · Chromium (Playwright MCP) · 1440×900 |
| Paridade    | massa QA98 sintética; `*.supabase.co` e `**/g/collect*` abortados por rota; login preenchido lendo o arquivo de credenciais dentro do browser (valores nunca no log) |

## Missão

Fechar o que a parte 1 não alcançou: o comprovante que abre para quem não devia (M7 #0555), o "Desfazer" onde não
devia (M8, M9, aba desatualizada), os selos de M11 e o estoque que baixa e volta.

## Passos

Pedido usado para registrar e desfazer: **#0566** (M6c, 1× Joia Afetiva Árvore da Vida, variação **Prata 925**, sem cupom).
Registrado e desfeito **duas vezes** (Dinheiro, sem avisar a cliente). Ao fim: Pendente, como começou. #0555 só lido.

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar como admin e abrir #0555 (M7) | Bloco Pagamento: Registrado à mão · Transferência · 09/11/2026 às 14h30 · Admin Uma Estrelinha · observação · "Abrir comprovante 1 (JPG)", "Abrir comprovante 2 (PDF)", "Baixar comprovante 3 (HEIC)" · **"Desfazer registro" presente** | — |
| 02 | Abrir o JPG e o PDF; baixar o HEIC | JPG e PDF abrem em aba nova (`image/jpeg`, `application/pdf`) por `/storage/v1/object/sign/…?token=` — link assinado, **validade de 300 s** (iat→exp do token). O HEIC abre uma aba em branco e o arquivo baixa | — |
| 03 | Colar o link do JPG numa janela anônima (dentro da validade) | abre a imagem (200, image/jpeg) — é o link temporário, não o endereço público | `screenshots/CH-03b-02-link-assinado-anonimo-dentro-da-validade.png` |
| 04 | Montar o endereço público (`/object/public/…`), o "cru" (`/object/…`) e o autenticado (`/object/authenticated/…`) na janela anônima | público e cru: 400 "Bucket not found"; autenticado: 400/403 "Invalid Compact JWS". Não abre | — |
| 05 | Abrir #0573 (M8, Em Separação, registrado à mão) | Registrado à mão · PIX direto · **sem "Desfazer"** | — |
| 06 | Abrir #0575 (M9c, pago pela loja, Em Separação) e #0574 (M9b, já mudado por outra sessão para Enviado) | só "Pago em …", **sem "Desfazer"** e sem bloco de registro | — |
| 07 | Abrir #0576 (M11a) | Pago · "**Pago duas vezes — devolver um dos valores**" · Registrado à mão · Dinheiro · **e o botão "Desfazer registro"** | `screenshots/CH-03b-03-selo-0576.png` |
| 08 | Abrir #0577 (M11b) | **Cancelado** · "**Pago depois de cancelado — devolver o valor**" · sem "Pago em" · sem Desfazer nem Registrar · mas a lista do pagamento diz "**Situação: Expirado**" logo acima do selo | `screenshots/CH-03b-03-selo-0577.png` |
| 09 | Anotar o estoque da variação em Produtos (cadastro do produto, aba Preços & variações) | Prata 925: **99** | — |
| 10 | Registrar #0566 (Dinheiro, observação, desmarcar "Avisar a cliente") | vai para Pago, "Registrado à mão". Prata 925: **98** | — |
| 11 | Voltar (botão do browser) à tela de registrar | "Este pedido já está pago." + "Voltar ao pedido" — sem formulário, nada a confirmar | `screenshots/CH-03b-05-voltar-e-registrar-de-novo.png` |
| 12 | Aba B aberta em #0566 (Pago); na aba A, desfazer com motivo | aba A: Pendente. Prata 925: **99** (voltou) | — |
| 13 | Na aba B desatualizada (ainda "Pago"), "Desfazer registro" → motivo → confirmar | 1ª vez: depois de 3 s, aba B em Pendente, nenhuma mensagem lida (o aviso passou antes da leitura); **repetido** (novo registro + desfazer na A): a aba B mostra "**Este pedido não tem pagamento registrado à mão para desfazer.**" e passa a Pendente. Histórico: **um** "Pago → Pendente" por ciclo — o desfazer da aba B não grava | `screenshots/CH-03b-06-aba-b-desfazer-desatualizado.png`, `screenshots/CH-03b-07-aba-b-logo-apos-confirmar.png` |
| 14 | Em #0576, abrir "Desfazer registro" (sem confirmar; Esc) | diálogo normal: "O pedido volta a Pendente e o pagamento à situação de antes do registro… o pedido sai das vendas…" — nada diz que a loja também recebeu este pagamento. Fechado sem confirmar; continua Pago | `screenshots/CH-03b-08-desfazer-oferecido-no-pago-duas-vezes.png` |
| 15 | Depois de expirar (≈1h30 depois), reabrir o link copiado na janela anônima e na aba do admin | 400 "InvalidJWT — exp claim timestamp check failed" nos dois. No painel, tocar no JPG de novo gera link novo que abre (image/jpeg) | `screenshots/CH-03b-04-link-expirado-anonimo.png` |
| 16 | Entrar na loja como `cliente` (dona do #0555) e abrir os três endereços do comprovante e o link expirado | público 400 Bucket not found; autenticado 403 Invalid Compact JWS; expirado 400 InvalidJWT. Em `/pedido/#0555` da loja: sem a observação (NOTA-INTERNA-QA), sem "Registrado por", sem link de comprovante | `screenshots/CH-03b-09-cliente-link-expirado.png` |
| 17 | Sair da conta `cliente` na loja; sair do painel; fechar | `cliente`: "Sair da conta" ok. Painel: o "Sair" não foi achado pelo seletor (menu da conta) — o browser foi fechado com a sessão admin ainda ativa nele | — |

**Edge cases tentados:** link interno para deslogado (comprovante em janela anônima, dentro e fora da validade);
mesma URL em duas abas (desfazer na aba desatualizada, 2×); voltar depois do sucesso (tela de registrar depois de
registrado); outra conta (cliente) no endereço público, autenticado e assinado-expirado.

## Casos

| TC  | Veredito | Evidência |
| --- | -------- | --------- |
| TC-SEC-001 | pass | passos 02–04, 15, 16 · validade de 300 s; público/autenticado nunca abrem; expirado não abre para anônimo nem para a cliente; reabrir no painel gera link novo. Variação "pedido desfeito" não feita (sem M7 desfeito disponível) |
| TC-FUNC-009 | fail | passos 01, 05, 06, 13 passam (M7 tem; M8 e M9 em Separando não têm; aba desatualizada não desfaz de novo) — mas #0576, que **a loja também pagou**, oferece "Desfazer" (passo 07/14, achado A-1). O passo 4 foi feito na forma do briefing (desfazer duas vezes); o "avançar para Separando na aba B" não foi feito |
| TC-FUNC-013 | pass | passos 07–08 · os dois selos com o texto esperado; #0577 continua Cancelado e sem data de venda. "Situação: Expirado" ao lado do selo vira spec-gap. Estoque/cupom baixados uma vez e Mailpit: não verificáveis (peças sem controle de estoque; e-mail não chega ao Mailpit no local) |
| TC-INT-003 | pass | passos 09–13 · estoque 99 → 98 → 99; registrar de novo pela volta do browser não muda nada. **Cupom não coberto**: #0566 não tem cupom, #0564 (o único com cupom) é de outra sessão, #0548 tem só PIX sem cupom. A releitura de estoque depois do 2º ciclo não foi feita (travou) |

Contagem: pass 3 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Pedido · bloco Pagamento] "Desfazer registro" é oferecido no pedido pago duas vezes, em que a loja também recebeu o pagamento — para a dona

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri no computador |
| Jornada e passo     | J-02, ramo J-02a/J-02c · passos 07 e 14 do log |
| TC                  | TC-FUNC-009, TC-FUNC-013 |
| Gravidade proposta  | high — se a dona desfaz o registro manual (que é o engano típico quando a loja também recebeu), o pedido volta a Pendente e sai das vendas, embora a loja tenha de fato recebido; a peça paga deixa de ir para produção e a venda some do caixa |
| Reproduziu          | sim (2 de 2 — leitura do bloco e abertura do diálogo) |
| Viewport            | 1440 × 900 |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir `/admin/pedidos/0098a000-0000-4000-a000-00000000002c` (#0576, M11a: registrado à mão em Dinheiro e depois aprovado pela loja)
2. Ver no bloco Pagamento o selo "Pago duas vezes — devolver um dos valores" e, abaixo, o botão "Desfazer registro"
3. Tocar em "Desfazer registro": o diálogo diz que o pedido volta a Pendente e sai das vendas (não confirmado nesta sessão, para não destruir a massa)

**Esperado:** "Desfazer" nunca em pagamento da loja — **fonte:** PRD CA-03.13; TC-FUNC-009 ("nunca em pagamento da loja"); com a loja tendo aprovado, o pedido não tem por que voltar a Pendente.

**Observado:** o botão aparece e o diálogo promete voltar a Pendente e tirar das vendas, sem mencionar a aprovação da loja.

**Evidência:**

- `screenshots/CH-03b-03-selo-0576.png` — selo e botão juntos
- `screenshots/CH-03b-08-desfazer-oferecido-no-pago-duas-vezes.png` — o diálogo aberto
- console: nada · rede: nada (não confirmado)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| No pedido "Pago depois de cancelado" (#0577), a lista do pagamento diz "Situação: Expirado" logo acima do selo que diz que o valor foi pago | 08 | mudança |
| O HEIC "baixa" abrindo uma aba em branco que fica aberta depois do download | 02 | polimento |
| Na aba desatualizada, a recusa do desfazer ("Este pedido não tem pagamento registrado à mão para desfazer") some em menos de 3 s e a aba troca sozinha para Pendente; na 1ª tentativa a frase não foi lida | 13 | polimento |

## Fora da cobertura

- TC-INT-003, cupom: nenhum pedido M6 livre com cupom (#0564 é de outra sessão); estoque coberto pelo #0566
- TC-INT-003, releitura do estoque depois do 2º ciclo registrar/desfazer: a leitura travou num diálogo "sair da página?" do cadastro do produto (ver debrief)
- TC-FUNC-009 passo 4 na forma do TC (avançar M7 para Separando na aba B e desfazer na A): não feito — #0555 só leitura, #0556 reserva de outro charter; feito na forma do briefing (desfazer na aba desatualizada)
- TC-FUNC-009 variação Enviado/Entregue com registro manual: não havia massa
- TC-FUNC-013, estoque/cupom baixados uma vez e e-mail: peças de M11 sem controle de estoque; e-mails às clientes não chegam ao Mailpit no local
- TC-SEC-001, variações "depois de sair" e "pedido desfeito"
- A saída do painel (passo 17): o seletor do "Sair" falhou; o browser foi fechado com a sessão admin. Se o MCP usa perfil persistente, a próxima sessão abre logada como admin

## Debrief

- **Surpresas:** o cadastro do produto abre o diálogo nativo "sair da página?" mesmo sem nada editado (só trocar de aba), e o `browser_navigate` travou 30 min esperando por ele. O link do comprovante dura 5 min e é recusado com mensagem técnica (JSON) — para quem não é admin isso é o certo
- **Próximo charter:** desfazer em pedido com cupom (TC-INT-003 cupom) numa massa nova; o "Desfazer" do pago-duas-vezes depois da correção
- **Padrão novo:** selo de alerta da loja convivendo com ação manual que ignora o alerta (Desfazer no pago-duas-vezes)
