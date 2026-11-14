# Sessão CH-01 (continuação) · A prévia de frete na sacola, dentro da região da campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md` · exploratório · P0 |
| Status      | done (continuação da sessão `CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md`; orçamento esgotado antes do RS e do 1440 — ver Fora da cobertura) |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | Feature · por cenário (J-01) |
| Rodada      | exploração |
| Orçamento   | 49 ações de browser de 50 (inclui o `close`) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli 0.1.24, headless, `-s=CH-01c`) · viewport 390 × 844 |
| Paridade    | cotação interceptada com a fixture A (com `Access-Control-Allow-Origin/Headers: *`); `https://*.supabase.co/**` e `**/g/collect*` abortados (imagens do Storage hospedado não carregam — esperado); ViaCEP liberado; Contato com dado fictício (`qa99.anon@exemplo.invalid`) |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo — procurando qualquer promessa da gaveta
que o checkout desmente.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu direto "Pingente Afetivo Barquinho com Cabelo" (R$ 209,90; "R$ 195,21 com Pix"); aceitou os cookies | Página do produto; a faixa do frete diz "Frete grátis acima de R$ 450,00 · para Sul e Sudeste" | — |
| 02 | Rolou até a barra de baixo e tocou "Adicionar à sacola" | A gaveta abriu com a peça: "Faltam R$ 240,10 para o frete grátis", campo "CEP para calcular o frete" + "Calcular" | — |
| 03 | Digitou 0131010 e tocou "Calcular" | "01310-10" marcado inválido, alerta "CEP inválido" (o foco ficou no botão "Calcular") | — |
| 04 | **Reprodução de A-2, 1ª forma:** sem tocar no campo, teclou End e "0" | O dígito não entrou no campo (o foco estava no botão "Calcular"): continuou "01310-10", `invalid`, "CEP inválido" depois de 4 s de espera — é o que a 1ª sessão viu | — |
| 05 | **Reprodução de A-2, 2ª forma:** tocou no campo, End, digitou "0", esperou o alerta sumir | O campo virou "01310-100", sem `invalid`, e o alerta "CEP inválido" sumiu — A-2 não se reproduz quando o dígito entra no campo | — |
| 06 | Teclou Enter no campo | "Frete para 01310-100 · São Paulo/SP" + "Trocar CEP"; PAC (R$ 21,40, 25–27 nov) marcado, SEDEX (R$ 38,90, 19–20 nov) | — |
| 07 | Tocou "Aumentar" duas vezes (3 peças, R$ 629,70) | `status` "Frete grátis liberado" com o botão "Sobre o frete grátis"; rádio "PAC · Correios Chega entre 25 e 27 de novembro Grátis R$ 21,40" [marcado]; "SEDEX · Correios Chega entre 19 e 20 de novembro R$ 38,90"; Subtotal (3 itens) R$ 629,70; "Frete · PAC"; **Total R$ 629,70** | — |
| 08 | Tocou no ⓘ ("Sobre o frete grátis") do liberado | Tooltip "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo." | `screenshots/CH-01c-01-liberado-balao-sp.png` |
| 09 | Tocou "Finalizar Pedido" | `/checkout`: "Resumo · 3 itens · frete grátis R$ 585,62"; Contato aberto; Entrega fechada; "Pagar R$ 585,62 com PIX" (desabilitado) | — |
| 10 | Preencheu Nome "Luana Teste", e-mail qa99.anon@exemplo.invalid, WhatsApp 11988887777; tocou "Continuar" | Entrega aberta: CEP **01310-100**; `status` "**Trazido da sua sacola · Bela Vista — São Paulo/SP**"; Rua "Avenida Paulista", Bairro "Bela Vista", Cidade "São Paulo", UF "SP" (preenchidos, desabilitados); **foco no Número** (`active`); Forma de envio: "PAC · Correios — Chega entre 25 e 27 de novembro — Grátis R$ 21,40" [marcado] e "SEDEX · Correios — Chega entre 19 e 20 de novembro — R$ 38,90", na mesma ordem da gaveta | `screenshots/CH-01c-02-checkout-entrega-trazido.png` |
| 11 | Conferiu a rede da sessão | `GET viacep.com.br/ws/01310100/json/ → 200` uma vez; `POST /functions/v1/melhor-envio?action=quote → 200` três vezes — uma por estado da sacola (1, 2 e 3 peças); nenhuma chamada a mais ao abrir a Entrega | — |
| 12 | Digitou o Número 1000 e tocou "Continuar" | Pagamento aberto: "PIX −7% Aprovação na hora…" **já `pressed`** (sem toque dela); "Cartão de crédito Até 4x de R$ 157,43 sem juros"; "Pagar R$ 585,62 com PIX" | — |
| 13 | Tocou "Cartão de crédito" e abriu o Resumo | "Resumo · 3 itens · frete grátis R$ 629,70"; Subtotal R$ 629,70 · "Frete · Correios PAC" · **Total R$ 629,70** (sem a linha "Desconto PIX"); "Pagar R$ 629,70 no cartão" (desabilitado). Parou aqui — não digitou cartão nem pagou | `screenshots/CH-01c-03-checkout-resumo-cartao.png` |

**Edge cases tentados:** Enter no campo de CEP (calcula — ok); digitar o 8º dígito depois do "CEP inválido" com o foco fora do campo e dentro dele (A-2 não se reproduz com o foco no campo); trocar o meio de pagamento no checkout e reler o Total (A-1).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-001 | pass | 02–06 | — | passos 2–4 e a variação Enter: com o dígito digitado no campo, o "CEP inválido" some (passo 05). O passo 4 que a 1ª sessão deu como fail era o dígito indo ao botão "Calcular" (passo 04). Variações "colado com espaço" e "remove a última peça" não feitas |
| TC-FUNC-002 | pass | 06, 10, 11 | `screenshots/CH-01c-02-checkout-entrega-trazido.png` | mesmos nomes, prazos, valores e ordem (PAC, SEDEX) na gaveta e na Entrega. Passo 3: 3 cotações para 3 sacolas diferentes (1, 2, 3 peças) e nenhuma ao abrir o checkout; a sessão não cronometrou as chamadas, a atribuição é pela contagem. Variações não feitas |
| TC-FUNC-003 | fail | 07, 09, 12, 13 | `screenshots/CH-01c-03-checkout-resumo-cartao.png` | passo 2: ao chegar, o checkout mostra R$ 585,62 (PIX pré-marcado) × R$ 629,70 na gaveta ⇒ A-1; com o cartão, o Total bate centavo a centavo. Passo 3 (SEDEX nos dois lados) não feito |
| TC-FUNC-004 | skip | — | — | orçamento |
| TC-FUNC-006 | blocked | 07, 08, 10, 13 | `screenshots/CH-01c-01-liberado-balao-sp.png`, `screenshots/CH-01c-03-checkout-resumo-cartao.png` | passos 1–3 para SP ok: liberado, PAC "Grátis" com R$ 21,40 ao lado, SEDEX cobrado, Total sem frete; ⓘ com o texto exato do TC; Entrega com a mesma opção "Grátis R$ 21,40"; Total igual com o cartão (com PIX, A-1). Ouro e risco só na screenshot, não conferidos. Passo 4 (90010-000, RS) e 1440 × 900 não feitos — orçamento |
| TC-FUNC-007 | pass | 10 | `screenshots/CH-01c-02-checkout-entrega-trazido.png` | CEP 01310-100, rua/bairro/cidade/UF da busca, "Trazido da sua sacola · Bela Vista — São Paulo/SP", PAC marcado, foco no Número. Variações não feitas |
| TC-JOURNEY-001 | fail | 01–13 | `screenshots/CH-01c-03-checkout-resumo-cartao.png` | passo 4 (Entrega sem redigitar o CEP) ok; passo 5 ("o mesmo Total da gaveta") só com o cartão — com o PIX que o checkout pré-marca, diverge ⇒ A-1. 1440 × 900 não feito |

Contagem: pass 3 · fail 2 · blocked 1 · skip 1

## Achados

### A-1 · [Checkout · Resumo] O checkout já chega com o PIX marcado e um Total 7 % menor que o da sacola — para Luana, que desconfia de valor que muda no último passo

Reprodução do A-1 da primeira sessão, com a causa observável estreitada.

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 7 (conferir o Resumo) · passos 07, 09, 12, 13 do log      |
| TC                  | TC-FUNC-003 (passo 2), TC-JOURNEY-001 (passo 5)                        |
| Gravidade proposta  | medium — o Total muda entre a sacola e o checkout na jornada P0, mas a diferença é para menos, vem com a linha "Desconto PIX (7%)" e o Total com o cartão é o da gaveta; se a triagem entender que a gaveta deveria mostrar o mesmo Total do meio pré-marcado, sobe para high. Pode ser spec-gap (ver Spec-gaps) |
| Reproduziu          | sim (2 de 2 — 1ª sessão e esta)                                       |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Aba nova, anônima, `http://localhost:8082/produtos/pingente-afetivo-barquinho-com-cabelo`, cotação pela fixture A; frete grátis ligado, R$ 450, Sul + Sudeste
2. Adiciona à sacola; na gaveta, calcula 01310-100 (PAC marcado); "Aumentar" duas vezes → Total R$ 629,70, "Frete · PAC" Grátis
3. "Finalizar Pedido" → o resumo diz "Resumo · 3 itens · frete grátis R$ 585,62" e o botão "Pagar R$ 585,62 com PIX"
4. Preenche Contato e Número → em Pagamento, o PIX já está `pressed`; toca "Cartão de crédito" → Total R$ 629,70

**Esperado:** o Total do checkout igual ao da gaveta, centavo a centavo, com a mesma opção, cupom e promoção — **fonte:** TC-FUNC-003 passo 2; TC-JOURNEY-001 passo 5; PRD 97 CA-04, RN-04. Nenhuma fonte diz qual meio de pagamento o Total da gaveta pressupõe.

**Observado:** meio de pagamento marcado ao chegar no checkout: **PIX** (sem toque). Com PIX: Subtotal R$ 629,70 · "Desconto PIX (7%) −R$ 44,08" · Total **R$ 585,62**. Com **cartão**: Subtotal R$ 629,70 · "Frete · Correios PAC" · Total **R$ 629,70** — igual à gaveta. A gaveta não mostra o desconto PIX nem um Total "no PIX" (a página do produto mostra "R$ 195,21 com Pix").

**Evidência:**

- `screenshots/CH-01c-03-checkout-resumo-cartao.png` — Resumo com cartão: Total R$ 629,70
- checkout com PIX: lido no snapshot (passo 09/12): "Resumo · 3 itens · frete grátis R$ 585,62", "Pagar R$ 585,62 com PIX"
- console: nada além dos avisos de imagem do Storage bloqueado
- rede: nada

### A-2 · [Sacola · CEP] "CEP inválido" preso depois do 8º dígito — NÃO reproduziu

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 3, ramo J-01a · passos 03–05 do log                       |
| TC                  | TC-FUNC-001 (passo 4)                                                 |
| Gravidade proposta  | low (da 1ª sessão) — recomendação: descartar                          |
| Reproduziu          | intermitente (1 de 2 — e a ocorrência original se explica pelo condutor) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, uma peça na sacola, gaveta aberta
2. Digita 0131010 e toca "Calcular" → "CEP inválido"; o foco fica no botão "Calcular"
3. Toca no campo, vai ao fim e digita "0"

**Esperado:** o erro some ao digitar — **fonte:** TC-FUNC-001 passo 4.

**Observado:** com o dígito digitado **no campo** (passo 05), o campo vira "01310-100" e o alerta some — o esperado. Só com o foco no botão "Calcular" (passo 04) o dígito não entra e o erro fica — que é o que a 1ª sessão leu ("01310-10" ainda no campo). Uma pessoa no celular toca no campo para digitar; não há defeito observável.

**Evidência:**

- nenhuma screenshot nova (estado descrito pelo snapshot dos passos 04–05)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O Total da gaveta é o Total sem desconto de meio de pagamento, e o checkout chega com o PIX pré-marcado (−7 %); nenhuma fonte diz se a gaveta deve mostrar o Total "no PIX", nem se o "mesmo Total" do TC-FUNC-003/TC-JOURNEY-001 pressupõe o mesmo meio de pagamento — é o que decide se A-1 é bug ou ajuste de TC | 07, 09, 12, 13 | polimento |

## Fora da cobertura

- TC-FUNC-006 passo 4 (90010-000, RS liberado) e a comparação gaveta × checkout em 1440 × 900 (TC-FUNC-006 e TC-JOURNEY-001) — orçamento
- TC-FUNC-004 (recolher e reabrir a lista) e TC-FUNC-003 passo 3 (SEDEX nos dois lados) — orçamento
- Deve tentar 4 ("Trocar CEP") e os edge cases restantes do charter (CEP colado com espaço/hífen trocado, duplo toque em "Calcular", voltar do checkout e reabrir, recarregar com a gaveta aberta, esvaziar e pôr outra peça, 320 × 568) — orçamento
- TC-FUNC-002 passo 3: a contagem é por estado da sacola, sem marcar o momento de cada chamada
- Destaque em ouro e valor riscado — só nas screenshots, não conferidos (estilo é do CH-07/CH-08)
- Rede lenta da persona e o "calculando" — fora do alcance do `route`

## Debrief

- **Surpresas:** A-2 era do condutor (o dígito foi para o botão focado), não da tela; A-1 é o PIX pré-marcado no checkout — com o cartão, o Total bate
- **Próximo charter:** uma sessão curta para o RS (90010-000), "Trocar CEP", TC-FUNC-004 e 1440 × 900; a triagem decide se A-1 é bug ou ajuste do TC-FUNC-003/TC-JOURNEY-001
- **Padrão novo:** reler o Total do checkout com cada meio de pagamento antes de registrar divergência de Total
