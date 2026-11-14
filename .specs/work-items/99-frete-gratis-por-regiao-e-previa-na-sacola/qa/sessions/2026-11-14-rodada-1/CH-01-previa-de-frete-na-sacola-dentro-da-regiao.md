# Sessão CH-01 · A prévia de frete na sacola, dentro da região da campanha

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-previa-de-frete-na-sacola-dentro-da-regiao.md` · exploratório · P0 |
| Status      | done (orçamento esgotado antes do fim da jornada — ver Fora da cobertura) |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | Feature · por cenário (J-01) |
| Rodada      | exploração |
| Orçamento   | 50 ações de browser de 50 |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli 0.1.24, headless, `-s=CH-01`) · viewport 390 × 844 |
| Paridade    | cotação interceptada com a fixture A (com cabeçalhos CORS); `https://*.supabase.co/**` e `**/g/collect*` bloqueados (imagens do Storage hospedado não carregam — esperado); ViaCEP liberado |

## Missão

Como Luana, no celular, confirmar que dá para saber o frete de São Paulo e se o frete grátis vale para ela ainda na
sacola, e chegar ao checkout com o mesmo Total e sem digitar o CEP de novo — procurando qualquer promessa da gaveta
que o checkout desmente.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abriu a loja; aceitou cookies; tocou na Sacola | Um convite do Instagram ("Acompanhe de perto o meu trabalho") abriu por cima e engoliu o toque na Sacola; fechou com "Agora não" | — |
| 02 | Abriu a gaveta com a sacola vazia | "Sua sacola está vazia", "Explorar joias"; nenhum campo de CEP | — |
| 03 | Abriu "Pingente Afetivo Dois Corações com Leite Materno" (R$ 209,90) e tocou "Adicionar à sacola" | No topo da página, sem rolar, o botão de adicionar fica fora da tela (barra de baixo); só depois de rolar o toque adicionou. A gaveta abriu com a peça | — |
| 04 | Olhou o topo da gaveta | "Faltam R$ 240,10 para o frete grátis" com o ⓘ, "R$ 209,90 / R$ 450,00", a barra de progresso; nenhum "liberado". No rodapé: campo "CEP para calcular o frete" + "Calcular", acima de "Tem um cupom?"; Subtotal e Total R$ 209,90 | `screenshots/CH-01-01-faltam.png` |
| 05 | Tocou no ⓘ | Balão: "Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." | `screenshots/CH-01-02-balao-regra.png` |
| 06 | Tocou fora do balão (no título da gaveta) | O balão fechou | — |
| 07 | Digitou 0131010 (7 dígitos) e tocou "Calcular" | Campo "01310-10" marcado como inválido e o alerta "CEP inválido"; na rede, nenhuma chamada a `melhor-envio` | `screenshots/CH-01-03-cep-invalido.png` |
| 08 | Pôs o cursor no fim e digitou mais um dígito ("0") | No snapshot seguinte o campo ainda mostrava "01310-10", `invalid`, e o alerta "CEP inválido" continuava (ver A-2) | — |
| 09 | Teclou Enter no campo | Calculou: "Frete para 01310-100 · São Paulo/SP" + "Trocar CEP"; rádios "PAC · Correios — Chega entre 25 e 27 de novembro — R$ 21,40" (marcado sem toque) e "SEDEX · Correios — Chega entre 19 e 20 de novembro — R$ 38,90"; resumo "Frete · PAC R$ 21,40", Total R$ 231,30 (= 209,90 + 21,40) | — |
| 10 | Tocou "Aumentar" duas vezes (3 peças, R$ 629,70) | A faixa virou `status` "Frete grátis liberado" com o ⓘ, sem barra; PAC "Grátis" com "R$ 21,40" ao lado; SEDEX R$ 38,90; "Frete · PAC Grátis"; Total R$ 629,70 | `screenshots/CH-01-04-liberado-sp.png` |
| 11 | Tocou "Finalizar Pedido" | `/checkout`: botão do resumo "Resumo · 3 itens · frete grátis R$ 585,62"; Contato (Nome, E-mail, WhatsApp) com "Continuar" desabilitado; Entrega ainda fechada ("Informe seu CEP e escolha o envio"); botão "Pagar R$ 585,62 com PIX" | — |
| 12 | Abriu o resumo | Subtotal R$ 629,70 · "Desconto PIX (7%) −R$ 44,08" · "Frete · Correios PAC Grátis" · Total **R$ 585,62** · "no cartão: 4x de R$ 157,43 sem juros" (ver A-1). Orçamento esgotado aqui | — (snapshot; sem screenshot por orçamento) |

**Edge cases tentados:** Enter no campo de CEP em vez do botão (calcula — ok); CEP com 7 dígitos (recusa sem consultar — ok); digitar depois do erro (A-2). Os demais do charter não couberam no orçamento.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-001 | fail | 02, 04, 07–09 | `screenshots/CH-01-03-cep-invalido.png` | passos 1–3 e a variação Enter ok; passo 4 (o erro some ao digitar) não observado ⇒ A-2 (intermitente, 1 tentativa). Variações "colado com espaço" e "remove a última peça" não feitas |
| TC-FUNC-002 | blocked | 09 | — | passo 1 ok (cabeçalho, rádios PAC/SEDEX com prazo e valor); a comparação com o bloco Entrega e a contagem de chamadas no checkout não couberam no orçamento (a Entrega exige o Contato preenchido) |
| TC-FUNC-003 | fail | 09, 12 | — | passo 1 ok (PAC marcado sem toque, Total = produtos + frete); passo 2: Total do checkout R$ 585,62 × gaveta R$ 629,70 ⇒ A-1. Passo 3 não feito |
| TC-FUNC-004 | skip | — | — | não tocado na opção para recolher a lista — orçamento |
| TC-FUNC-005 | pass | 04–06 | `screenshots/CH-01-01-faltam.png`, `screenshots/CH-01-02-balao-regra.png` | "Faltam R$ 240,10" (= 450 − 209,90), "R$ 209,90 / R$ 450,00", barra, balão com a regra e as regiões, fecha ao tocar fora; variações não feitas |
| TC-FUNC-006 | blocked | 10–12 | `screenshots/CH-01-04-liberado-sp.png` | passo 1 ok para SP (liberado, PAC Grátis com o valor ao lado, SEDEX cobrado, Total sem frete; o ouro e o risco só na screenshot, não conferidos); ⓘ do liberado, Entrega do checkout, RS 90010-000 e 1440 × 900 não couberam no orçamento. O Total do checkout diverge (A-1) |
| TC-FUNC-007 | blocked | 11 | — | a Entrega só abre depois do Contato; preencher o Contato não coube no orçamento |
| TC-JOURNEY-001 | fail | 04–12 | `screenshots/CH-01-04-liberado-sp.png` | passos 1–3 ok; passo 5 ("o mesmo Total da gaveta") diverge no resumo do checkout ⇒ A-1; passo 4 (Entrega) não alcançado |

Contagem: pass 1 · fail 3 · blocked 3 · skip 1

## Achados

### A-1 · [Checkout · Resumo] O Total do checkout não é o Total que a sacola mostrou — para Luana, que desconfia de valor que muda no último passo

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 7 (conferir o Resumo) · passos 10–12 do log               |
| TC                  | TC-FUNC-003 (passo 2), TC-JOURNEY-001 (passo 5)                        |
| Gravidade proposta  | high — dois "Total" diferentes para a mesma sacola, na jornada P0, é exatamente o modo de falha previsto ("Total diferente"); a diferença é para menos, o que pode descer um degrau na triagem |
| Reproduziu          | 1 de 1 — segunda tentativa não feita (orçamento esgotado); a leitura é de valores estáticos do resumo, não de tempo |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Aba nova, anônima, em `http://localhost:8082/`, com a cotação interceptada pela fixture A; configuração ligada, R$ 450, Sul + Sudeste
2. Põe "Pingente Afetivo Dois Corações com Leite Materno" (R$ 209,90) na sacola; na gaveta, calcula 01310-100 (PAC marcado)
3. Aumenta a quantidade para 3: gaveta mostra Subtotal R$ 629,70, "Frete · PAC Grátis", **Total R$ 629,70**
4. Toca "Finalizar Pedido" e abre o Resumo do checkout

**Esperado:** "Frete · PAC" com o mesmo valor, e o Total do checkout igual ao da gaveta, centavo a centavo (com a mesma opção, cupom e promoção) — **fonte:** TC-FUNC-003 passo 2; TC-JOURNEY-001 passo 5; J-01 passo 7 e Modos de falha; PRD 97 CA-04, RN-04.

**Observado:** o Resumo do checkout, antes de qualquer escolha de pagamento, traz "Desconto PIX (7%) −R$ 44,08" e **Total R$ 585,62**; o botão de resumo diz "Resumo · 3 itens · frete grátis R$ 585,62" e o botão de pagar "Pagar R$ 585,62 com PIX". A gaveta nunca mostrou desconto PIX nem esse Total. ("no cartão: 4x de R$ 157,43" ≈ R$ 629,70.) Hipótese para a triagem, não verificada: o checkout pré-seleciona PIX e a gaveta mostra o Total sem o desconto do meio de pagamento — se for o comportamento definido, o TC precisa dizer "com o mesmo meio de pagamento".

**Evidência:**

- `screenshots/CH-01-04-liberado-sp.png` — a gaveta com Total R$ 629,70 e "Frete · PAC Grátis"
- checkout: lido no snapshot (sem screenshot — orçamento): Subtotal R$ 629,70 · Desconto PIX (7%) −R$ 44,08 · Frete · Correios PAC Grátis · Total R$ 585,62
- console: só `net::ERR_FAILED` das imagens do Storage hospedado (bloqueio do ambiente)
- rede: nada

### A-2 · [Sacola · CEP] O "CEP inválido" continuou depois de digitar o oitavo dígito — para Luana, que não sabe se o CEP agora vale

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 3, ramo J-01a · passo 08 do log                           |
| TC                  | TC-FUNC-001 (passo 4)                                                 |
| Gravidade proposta  | low — o Enter seguinte calculou normalmente, e o erro preso só confunde por um instante |
| Reproduziu          | intermitente (1 de 1 — sem segunda tentativa; o mesmo snapshot ainda mostrava o valor antigo "01310-10", então pode ser leitura antes da re-renderização) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, `http://localhost:8082/`, uma peça na sacola, gaveta aberta
2. Digita 0131010 no "CEP para calcular o frete" e toca "Calcular" → "CEP inválido"
3. Põe o cursor no fim do campo e digita "0"

**Esperado:** o erro some ao digitar — **fonte:** TC-FUNC-001 passo 4.

**Observado:** logo depois de digitar, o campo continuava `invalid` com o alerta "CEP inválido" (e o texto ainda "01310-10"); ao teclar Enter, calculou 01310-100.

**Evidência:**

- `screenshots/CH-01-03-cep-invalido.png` — o estado de erro antes do oitavo dígito
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Um convite do Instagram abre por cima da loja logo na entrada e o primeiro toque na Sacola não chega a ela | 01 | pré-existente |
| Na página do produto, a 390 × 844 sem rolar, o "Adicionar à sacola" está fora da tela; só aparece ao rolar | 03 | pré-existente |

## Fora da cobertura

- TC-FUNC-002 passos 2–3, TC-FUNC-007, TC-JOURNEY-001 passo 4, TC-FUNC-006 passos 2–4 — o bloco Entrega só abre depois de preencher o Contato, e o orçamento de 50 ações acabou no Resumo do checkout (gastei ações demais para chegar à peça: convite do Instagram e o botão de adicionar fora da tela)
- TC-FUNC-004 (recolher e reabrir a lista), TC-FUNC-003 passo 3 (SEDEX nos dois lados) — orçamento
- Deve tentar 3 (90010-000, RS liberado) e 4 ("Trocar CEP") — orçamento
- Edge cases: CEP colado com espaço/hífen trocado, duplo toque em "Calcular", voltar do checkout e reabrir, recarregar com a gaveta aberta, esvaziar e pôr outra peça, 320 × 568 — orçamento
- 1440 × 900 (comparação gaveta × checkout do TC-FUNC-006 e a variação do TC-JOURNEY-001) — orçamento
- Destaque em ouro e valor riscado — só na screenshot `CH-01-04-liberado-sp.png`, não conferidos (sem reler a imagem; estilo é do CH-07/CH-08)
- Segunda reprodução de A-1 e A-2 — orçamento
- Rede lenta da persona e o "calculando" — fora do alcance do `route` (Ambiente da execução)

## Debrief

- **Surpresas:** o Total do checkout já vem com o desconto PIX aplicado, enquanto a gaveta não mostra desconto PIX; e o caminho até a primeira peça na sacola custou ~15 ações (convite do Instagram, botão de adicionar fora da tela no celular)
- **Próximo charter:** repetir o CH-01 a partir do passo 11 (Contato → Entrega → Resumo), com o orçamento dedicado à comparação gaveta × checkout, ao RS e ao "Trocar CEP"; reproduzir A-1 e A-2
- **Padrão novo:** nada
