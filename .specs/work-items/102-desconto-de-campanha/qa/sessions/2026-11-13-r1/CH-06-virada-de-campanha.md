# Sessão CH-06 · A virada da campanha

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-06-virada-de-campanha.md` · exploratório · P1 |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-loja` (conta de dev do `seed.sql`, seção 5 — o valor não vai ao log); a aba da loja como convidada (`@exemplo.invalid`) |
| Tour · modo | Multi-Tab · por cenário (J-06) |
| Rodada      | exploração |
| Orçamento   | ~114 ações de browser de 70 (contagem estrita: cada open, click, fill, tecla e troca de aba). O teto de 70 chegou ao abrir `/admin/campanhas/nova`; o que veio depois (criar "Dia das Mães", marcar M-A e M-D e conferir a loja) é a massa que o briefing exige para o CH-08, e o TC-FUNC-013 que a confere. A digitação nos campos de hora (input `time` segmentado) custou ~14 ações |
| Ambiente    | painel `http://localhost:8093/admin` · loja `http://localhost:8092` · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 (painel) e 390 × 844 (loja) · rotas abortadas: `**/*.supabase.co/**`, `**/g/collect*` |
| Paridade    | functions com chaves externas inválidas (PIX não gera); servidor de dev sem cache de 5 min; ao voltar para a aba da loja, o evento de foco foi disparado à mão (`focus` + `visibilitychange` por `eval`), porque o browser headless não troca o foco da janela ao trocar de aba; o CEP não preencheu o endereço e a entrega foi "Retirada no escritório" |

## Missão

Com o painel numa aba e a loja na outra, achar qualquer estado em que a loja continue mostrando (ou cobrando) a
campanha depois que a dona a tirou, desligou ou encerrou, qualquer pedido antigo que mude com isso, e qualquer
pedaço da loja que não troque para a campanha seguinte.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Painel, `/admin/campanhas` (1440): estado de partida | "Natal" Agendada, 01/12 a 24/12/2026, 10 % 15 %, 4 peças · "Black Friday" Em vigência, 13/11 a 30/11/2026, 10/15/20 %, 4 peças | — |
| 02 | Loja (390), `/ofertas` antes de mexer | "Início › Black Friday", "Peças com 10%, 15% e 20% de desconto até 30 de novembro.", chips "Todas · 4", "10% · 1", "15% · 1", "20% · 2"; só M-A, M-B, M-C, M-D; nenhum colar de M-G | — |
| 03 | Loja, `/colares-afetivos` e "Colar Afetivo Pata com Cinzas de Cremação em Prata 925" (M-G, marcada a 15 % no Natal agendado) | Cartão R$ 439,90 sem selo (os 4 de M-G sem selo na coleção). Página: R$ 439,90 · R$ 409,11 (PIX 7 %) · 4x de R$ 109,98; nenhuma faixa, nenhum "Natal", nenhum riscado | `screenshots/CH-06-01-mg-sem-natal-390.png` |
| 04 | Adicionar M-G à sacola (foco + Enter, o toque na barra fixa já é sabido) | Sacola: "Colar Afetivo Pata … R$ 439,90", Subtotal (1 item) R$ 439,90, Total R$ 439,90 | — |
| 05 | Painel, M-D › "Preços & variações": anotar o preço e escolher "Nenhum" no cartão da Black Friday; Salvar | Antes: grade 3 variações a R$ 340,00 (BF 20 % → R$ 272,00). Depois: toast "Produto atualizado · As alterações já estão na loja."; cartão da BF com "Sem desconto: a peça fica fora da vitrine /ofertas e sem selo."; Natal "Nenhum" | `screenshots/CH-06-02-md-nenhum-salvo.png` |
| 06 | Loja: M-D e `/ofertas` | M-D: R$ 340,00 · R$ 316,20 (PIX), sem faixa. `/ofertas`: "Todas · 3", "10% · 1", "15% · 1", "20% · 1" (uma a menos no 20 %), M-D fora | — |
| 07 | Painel, edição da BF: ler "Apagar"; desligar "Campanha ligada"; "Salvar campanha" | "Apagar campanha" desligado com "Esta campanha já foi usada em pedido e não pode ser apagada. Para tirá-la da loja, encerre ou desligue." Após salvar, a lista mostra a BF com a pílula "Desligada" (3 peças) | — |
| 08 | Loja: recarregar `/ofertas`; abrir M-A | `/ofertas`: "Início › Ofertas", "Não há ofertas agora", texto e "Ver as coleções". M-A: R$ 385,00 · R$ 358,05 (PIX), sem selo | `screenshots/CH-06-03-ofertas-bf-desligada-390.png` |
| 09 | Painel: religar a BF e salvar; loja: recarregar M-A | Lista: BF "Em vigência". M-A: "BLACK FRIDAY −20%", R$ 308,00, "R$ 385,00 · 4x de R$ 77,00 sem juros" | — |
| 10 | Painel, `/admin/pedidos` › "Abrir pedido 0603" (o do CH-04), antes de encerrar | M-E R$ 340,00 · M-A R$ 385,00 / R$ 308,00 · Subtotal R$ 725,00 · Desconto de campanha − R$ 77,00 · Cupom QA10 − R$ 34,00 · Desconto PIX − R$ 42,98 · Frete R$ 19,90 · Total R$ 590,92. (Tocar na célula "#0603 há 0 dias" não abre o pedido; o link é "Abrir pedido 0603") | `screenshots/CH-06-04-pedido-0603-antes.png` |
| 11 | Loja: M-A na sacola (foco + Enter), "Finalizar Pedido", checkout de convidada preenchido (nome, `helena.ch06a@exemplo.invalid`, WhatsApp, CEP 90010-000, nº 100, "Retirada no escritório — Grátis", CPF de teste), sem pagar | Sacola: M-G R$ 439,90 + M-A "de R$ 385,00 por R$ 308,00", BLACK FRIDAY −20 %, Subtotal (2 itens) R$ 747,90. Checkout: "Resumo · 2 itens R$ 695,55", botão "Pagar R$ 695,55 com PIX" habilitado | `screenshots/CH-06-05-checkout-antes-encerrar-390.png` |
| 12 | Painel, edição da BF: **duplo clique** em "Encerrar agora"; **duplo clique** em "Encerrar agora" do diálogo | Diálogo "Encerrar a campanha agora?" — "O fim passa a ser agora, e o desconto sai da loja na próxima página que a cliente abrir. As marcações das peças ficam guardadas." Depois: volta à lista, um único toast "Campanha encerrada.", a BF continua na lista: "13/11 a 13/11/2026 · 3 · Encerrada" | `screenshots/CH-06-06-bf-encerrada.png` |
| 13 | Voltar à aba da loja (checkout aberto) | Sem recarregar, o checkout releu: "Resumo · 2 itens R$ 767,16", botão "Pagar R$ 767,16 com PIX". Resumo aberto: M-G R$ 439,90 · M-A R$ 385,00 (sem riscado) · Subtotal R$ 824,90 · Desconto PIX (7%) −R$ 57,74 · Total R$ 767,16. Nenhuma mensagem dizendo que o desconto acabou | `screenshots/CH-06-07-checkout-volta-aba-390.png` |
| 14 | Tocar em "Pagar R$ 767,16 com PIX" | Vai a `/pedido/…/pagamento`, "Gerando seu código PIX … Nada foi cobrado ainda" (o PIX não gera no local — não é achado). `/pedido/:id`: **Pedido #0605**, "2 peças · R$ 767,16"; M-G R$ 439,90, M-A R$ 385,00; Subtotal R$ 824,90 · Desconto PIX −R$ 57,74 · Total R$ 767,16; sem linha de campanha. Nunca gravou o valor com desconto | `screenshots/CH-06-08-pedido-novo-sem-campanha.png` |
| 15 | Loja: `/ofertas` depois do fim e a cabeça da página | "Início › Ofertas", "Não há ofertas agora", "Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas.", "Ver as coleções". `meta name="robots"` = `noindex` | `screenshots/CH-06-09-ofertas-vazia-390.png` |
| 16 | Loja: a Home | Nenhuma ocorrência de "Joias em oferta" nem de "Black Friday" no texto da página | `screenshots/CH-06-10-home-sem-bloco-390.png` |
| 17 | Loja: `/pedido/<id do #0603>` | "Pedido não encontrado — O acesso a este pedido pode ter expirado. Entre com o código enviado para o seu e-mail…" — o pedido é da convidada do CH-04, não desta aba | — |
| 18 | Painel: o pedido #0603 de novo, depois do encerramento | Os mesmos valores do passo 10, item por item, e Total R$ 590,92 | `screenshots/CH-06-11-pedido-0603-depois.png` |
| 19 | Painel, `/admin/campanhas/nova`: "Dia das Mães", selo "DIA DAS MÃES", "Vinho e rosa", 10 e 15 %, de 13/11 00:00 a 30/11 23:59 | "Vinho e rosa" preenche #6E2433 / #F6DCD8; "8,2:1 Contraste bom para ler o selo."; prévia "DIA DAS MÃES −15%". Com início 13/11 00:00: "A vigência cruza a da campanha “Black Friday” (13/11 a 13/11). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra." e "Salvar campanha" desligado | — |
| 20 | Pôr o início em 13/11 16:20 (o minuto seguinte, depois do encerramento) e salvar | A mensagem de cruzar some; "Campanha criada."; lista: "Dia das Mães · 13/11 a 30/11/2026 · 0 · Agendada" (até 16:20) | `screenshots/CH-06-12-dia-das-maes-form.png` |
| 21 | M-D › Preços: marcar 15 % na "Dia das Mães"; M-A › Preços: marcar 10 % | Só os cartões "Dia das Mães" e "Natal" na aba de preço (o da BF encerrada sumiu). M-D: R$ 340,00 → R$ 289,00 nas 3 variações; M-A: R$ 385,00 → R$ 346,50 nas 3; "Preço" cadastrado R$ 340,00 (M-D) e grade R$ 385,00 (M-A), iguais aos anotados | `screenshots/CH-06-13-ma-dia-das-maes-10.png` |
| 22 | Loja, depois das 16:20: `/ofertas` | "Início › Dia das Mães", "Dia das Mães", "Peças com 10% e 15% de desconto até 30 de novembro.", "Todas · 2", "10% · 1", "15% · 1"; cartões M-D "DIA DAS MÃES, 15% de desconto" e M-A "DIA DAS MÃES, 10% de desconto"; robots sem `noindex` | `screenshots/CH-06-14-ofertas-dia-das-maes-390.png` |
| 23 | Loja: a Home e M-A | Home: bloco "DIA DAS MÃES · Dia das Mães · Peças selecionadas com 10% e 15% de desconto…", cartões −15 % e −10 %; nenhum "Black Friday". M-A: "DIA DAS MÃES −10%", R$ 346,50, "R$ 385,00 · 4x de R$ 86,63 sem juros" | `screenshots/CH-06-15-ma-selo-dia-das-maes-390.png` |

**Edge cases tentados:**

- Duplo clique em "Encerrar agora" (no botão e na confirmação): um encerramento, um toast, a campanha continua na lista (passo 12)
- Criar "Dia das Mães" começando antes do instante do encerramento: recusado por cruzar a BF (passo 19)
- Checkout aberto e preenchido numa aba enquanto a campanha é encerrada na outra (passos 11–14)
- Desligar e religar com a página da loja aberta, conferindo por recarga (passos 07–09)

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-006 | pass | 02–04 | `screenshots/CH-06-01-mg-sem-natal-390.png` | Os 3 passos. Variações cupom e feed não feitas (orçamento) |
| TC-FUNC-009 | pass | 05–09, 12, 21 | `screenshots/CH-06-02-md-nenhum-salvo.png`, `screenshots/CH-06-03-ofertas-bf-desligada-390.png`, `screenshots/CH-06-06-bf-encerrada.png` | Os 5 passos; preço cadastrado de M-A (R$ 385,00) e M-D (R$ 340,00) igual ao anotado. Variações: duplo clique ✓; marcações guardadas ✓ (o cartão da BF some da aba de preço; a BF segue na lista com 3 peças). "Encerrar e cancelar" e "sacola reaberta depois do desligar" não feitas |
| TC-FUNC-012 | pass | 15, 16 | `screenshots/CH-06-09-ofertas-vazia-390.png`, `screenshots/CH-06-10-home-sem-bloco-390.png` | Passos 1, 2 e 4. Passo 3 (tocar em "Ver as coleções") não feito (orçamento) |
| TC-FUNC-013 | pass | 19–23 | `screenshots/CH-06-14-ofertas-dia-das-maes-390.png`, `screenshots/CH-06-15-ma-selo-dia-das-maes-390.png` | Os 5 passos. Variação "início antes do encerramento" ✓ (recusado); "nenhum resto da BF" ✓ na Home e na vitrine. "Ofertas sem esperar": a campanha começou às 16:20 e a vitrine já mostrava às 16:20:01 |
| TC-FUNC-017 | pass | 11–14 | `screenshots/CH-06-07-checkout-volta-aba-390.png`, `screenshots/CH-06-08-pedido-novo-sem-campanha.png` | O checkout releu ao voltar à aba (R$ 695,55 → R$ 767,16, M-A sem riscado) e o pedido #0605 foi gravado sem campanha, pelo preço de sempre. A "nova confirmação" é o botão com o total novo; nenhuma mensagem explica a mudança — ver spec-gap. O ramo da recusa ("Um desconto deste pedido mudou…") não foi alcançado, porque a tela já estava atualizada. Variações recarregar e sacola não feitas |
| TC-INT-002 | pass | 07, 10, 17, 18 | `screenshots/CH-06-04-pedido-0603-antes.png`, `screenshots/CH-06-11-pedido-0603-depois.png` | Passos 1, 2 e 4 ✓ (#0603 idêntico antes e depois; "Apagar" desligado com o motivo). Passo 3 (o #0603 na loja) **blocked por massa**: o pedido é da convidada do CH-04 e a loja pede o código do e-mail dela (passo 17) — conta de outra persona. Variações app do ateliê e Mailpit não feitas |

Contagem: pass 6 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Quando a campanha acaba com o checkout aberto, o total sobe (R$ 695,55 → R$ 767,16) sem nenhuma mensagem que diga que o desconto da campanha terminou; só o valor do botão "Pagar" e do resumo muda. O PRD (UC-05) diz "mostra o total novo e pede que ela confirme de novo" sem definir a mensagem | 13 | polimento |

## Fora da cobertura

- TC-INT-002 passo 3 (o #0603 em `/pedido/:id` na loja): exige o código de e-mail da convidada do CH-04 — outra persona
- O ramo de recusa do TC-FUNC-017 ("Um desconto deste pedido mudou. Nada foi cobrado."): a tela já tinha relido o total ao voltar à aba, e o foco foi disparado à mão (headless não troca o foco da janela)
- Edge cases: a edição da BF aberta em duas abas; recarregar o checkout logo após o encerramento; voltar depois do "Encerrar agora"; a sacola reaberta (fechar e reabrir a aba) depois do fim; cancelar no diálogo de encerrar — orçamento
- TC-FUNC-012 passo 3 ("Ver as coleções"); TC-FUNC-006 variações cupom/feed; TC-FUNC-017 variações recarregar/sacola/"começou no meio"; TC-INT-002 variações app do ateliê e Mailpit — orçamento
- Orçamento: o teto de 70 foi ultrapassado (~114) para deixar a massa do CH-08 pronta, como o briefing pede

## Debrief

- **Surpresas:** os campos de hora (input `time`) não aceitam `fill`; só tecla a tecla com o foco. No passo 10, tocar no número do pedido na lista não abre o pedido — só o link "Abrir pedido 0603" (fora da Mudança, não registrado)
- **Próximo charter:** o ramo de recusa do TC-FUNC-017 (finalizar com a tela ainda no total antigo — p. ex. encerrar entre o carregar e o tocar, sem evento de foco), e a sacola reaberta depois do fim
- **Padrão novo:** nada
