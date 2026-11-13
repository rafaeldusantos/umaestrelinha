# Sessão CH-04 · Sacola e checkout com oferta

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-sacola-e-checkout-com-oferta.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-03 Helena · conta: anonima (convidada, `helena.ch04@exemplo.invalid` e `helena.ch04b@exemplo.invalid`) |
| Tour · modo | Money · por cenário (J-04)                                             |
| Rodada      | exploração                                                             |
| Orçamento   | 70 ações de browser de 70. Contei as ações da persona (abrir, tocar, preencher, tecla, recarregar, aba). As leituras de tela (snapshot, texto, screenshot) ficaram fora da conta |
| Ambiente    | http://localhost:8092 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 390 × 844 e 1440 × 900 |
| Paridade    | `*.supabase.co` e `**/g/collect*` bloqueados por rota (as requisições de imagem para o Storage hospedado saíram abortadas, sem status). O PIX não gera código no local, o que o charter já prevê. Pedidos criados sem pagamento |

## Missão

Como a cliente que confere o total antes de pagar, achar qualquer jeito de o pedido gravado ter um total diferente
do que a sacola e o checkout mostraram, ou de um desconto se somar a outro na peça de campanha.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Em 390 × 844, abrir M-A, fechar o aviso de cookies e tocar em "Adicionar à sacola" na barra fixa | Nada acontece: sem toast, sem gaveta, sem contador. A gaveta "Sua sacola" abre vazia. Console sem erro | — |
| 02 | Comparar com M-E (fora da campanha) em 390 × 844: tocar em "Adicionar à sacola" | O mesmo: nada entra. Em 1440 × 900, o mesmo toque na M-E abre a gaveta com a peça. De volta a 390, na M-A, focar o botão e apertar Enter **funciona**. Terceiro toque na M-A em 390 (com 2 itens na sacola): o contador fica em "Sacola, 2 itens" → A-1 | `screenshots/CH-04-02-toque-sem-efeito-390.png` |
| 03 | Sacola em 390 com M-E e M-A | M-E R$ 340,00. M-A "de R$ 385,00 por R$ 308,00", R$ 385,00 riscado, R$ 308,00, chip "BLACK FRIDAY −20%". Subtotal (2 itens) R$ 648,00. A faixa da promoção diz "Faltam 2 para cada peça sair a R$ 306,00", ou seja, conta só a M-E ✓ | `screenshots/CH-04-03-sacola-ma-me-390.png` |
| 04 | Aplicar `QA10` | "QA10 aplicado −R$ 34,00" (10 % de R$ 340,00, só a M-E ✓). Total R$ 614,00 | `screenshots/CH-04-04-qa10-sacola-390.png` |
| 05 | "Finalizar Pedido", trocar para 1440 × 900, ler o resumo | Item M-A com o selo e o de/por. Subtotal R$ 648,00 · Cupom QA10 −R$ 34,00 · Desconto PIX (7 %) −R$ 42,98 · Frete a calcular · Total R$ 571,02. **Nenhuma linha "Desconto de campanha"** no resumo → A-2 | `screenshots/CH-04-05-checkout-resumo-1440.png` |
| 06 | Preencher contato, CEP 90010-000, nº 100, Correios R$ 19,90, PIX | Total R$ 590,92 (614,00 − 42,98 + 19,90 ✓; o PIX de 7 % incide sobre as peças, não sobre o frete) | — |
| 07 | Recarregar o checkout no meio do preenchimento (edge case) | Mantém o contato, a entrega, o frete e o cupom. O mesmo Total R$ 590,92 ✓ | — |
| 08 | CPF de teste, duplo clique em "Pagar R$ 590,92 com PIX" (edge case) | Vai para `/pedido/…/pagamento` ("Carregando seu pedido..."). Abrindo `/pedido/:id`: **Pedido #0603**, "2 peças · R$ 590,92". Peças: M-E R$ 340,00 · M-A de R$ 385,00 por R$ 308,00. Subtotal **R$ 725,00** · **Desconto de campanha −R$ 77,00** · Cupom QA10 −R$ 34,00 · Desconto PIX −R$ 42,98 · Frete R$ 19,90 · Total **R$ 590,92** = checkout ✓. Mailpit sem e-mail para a convidada (pedido pendente) | `screenshots/CH-04-06-pedido-0603.png` |
| 09 | Voltar à sacola em 390 (a sacola **continua com os 2 itens** depois do pedido) e tocar no ícone de lixeira "Remover Pulseira … Oval … da sacola" | A gaveta fechou e a peça **não** saiu ("Sacola, 2 itens"). Reaberta a gaveta, focar e Enter no mesmo botão: a M-E sai → A-4 | — |
| 10 | Sacola só com M-A, com `QA10` aplicado antes (caminho de abandono) | "Este cupom não vale para peças da Black Friday." · "Não aplicado" · Subtotal (1 item) R$ 308,00 · Total R$ 308,00 ✓ | `screenshots/CH-04-07-tira-me-cupom-390.png` |
| 11 | Remover o cupom e digitar `qa10` em minúsculas | O campo passa o texto para "QA10". O primeiro toque em "Aplicar" chegou com o botão ainda desabilitado e não fez nada. No segundo, toast "Este cupom não vale para peças da Black Friday.", sem desconto, Total R$ 308,00 ✓ | `screenshots/CH-04-09-qa10-recusa-390.png` |
| 12 | Aplicar `QAFRETE` | "Cupom QAFRETE aplicado!", "Frete grátis" ✓ | — |
| 13 | Checkout em 1440 | M-A R$ 308,00 com o selo · Subtotal R$ 308,00 · PIX −R$ 21,56 · Frete Correios **Grátis** · Total R$ 286,44 ✓. De novo, sem a linha "Desconto de campanha" (A-2, 2 de 2) | `screenshots/CH-04-10-checkout-qafrete-1440.png` |
| 14 | Abrir M-C em 1440 | "BLACK FRIDAY −10%", **R$ 314,91**, "R$ 349,90 · 4x de R$ 78,73", R$ 292,87 no Pix. O "de" mostrado é o "por" (R$ 349,90), não R$ 374,00 → A-3 | — |
| 15 | Acrescentar M-C à sacola (com M-A e `QAFRETE`) | "de R$ 349,90 por R$ 314,91", "BLACK FRIDAY −10%". Subtotal (2 itens) R$ 622,91 | `screenshots/CH-04-11-mc-sacola-1440.png` |
| 16 | Checkout (dados lembrados) → "Pagar R$ 579,31 com PIX" | `POST /functions/v1/checkout?action=create-order → 409`, e a tela pede "Este e-mail já tem cadastro na loja. Um código foi enviado…" (o primeiro pedido criou o cadastro). Usei "Usar outro e-mail" com `helena.ch04b@exemplo.invalid` e paguei: pedido criado | — |
| 17 | Abrir `/pedido/:id` | **Pedido #0604**, R$ 579,31 = checkout. M-C "de R$ 349,90 por R$ 314,91". Subtotal R$ 734,90 · Desconto de campanha −R$ 111,99 (77,00 + 34,99) · PIX −R$ 43,60 · Frete Grátis · Total R$ 579,31. O servidor também grava M-C a R$ 314,91 (A-3) | `screenshots/CH-04-12-pedido-mc.png` |
| 18 | Acrescentar M-E2 (sacola: M-A, M-C, M-E2) | "Faltam 2 para cada peça sair a R$ 314,91": as 2 de campanha não contam ✓ | — |
| 19 | Na M-E, marcar "Levar junto: Pulseira … Lisa" (M-A, R$ 308,00) e tocar em "Levar o conjunto" | Nada entra. O bloco diz "Escolha o cor da pulseira." / "Falta uma escolha em 1 peça. Ela está marcada acima." e "Total do conjunto: R$ 340,00" (o adicional marcado fica fora do total até ter cor). Escolhida a cor, "Total do conjunto: R$ 648,00, R$ 602,64 no Pix" (M-A a R$ 308,00, sem desconto de conjunto em cima ✓) | `screenshots/CH-04-13-compre-junto-me.png`, `screenshots/CH-04-14-levar-conjunto-sem-efeito.png` |
| 20 | "Levar o conjunto" com a cor escolhida | M-A ×2 "Acompanha o Pulseira … Oval", R$ 770,00 riscado / **R$ 616,00** (2 × 308,00: desconto por unidade ✓). M-C R$ 314,91, M-E2 R$ 349,90, M-E R$ 340,00. "Falta 1 para cada peça sair a R$ 314,91": conta só as 2 comuns ✓. Nenhum desconto de promoção. Subtotal (5 itens) R$ 1.620,81 | `screenshots/CH-04-15-sacola-promo-conjunto.png` |

**Edge cases tentados:**

- Recarregar o checkout no meio do preenchimento (passo 07): o mesmo total ✓
- Duplo clique em "Pagar" (passo 08): um único pedido visível (#0603). O pedido seguinte desta sessão foi o #0604, o que indica que o duplo clique não gerou um segundo pedido, mas isso não é conclusivo com outros charters criando pedidos em paralelo
- Aplicar o cupom e depois tirar a peça comum (passo 10): o cupom sai com o nome da campanha ✓
- Cupom em minúsculas (passo 11): o campo normaliza, o mesmo motivo ✓
- Quantidade 2 de M-A (passo 20, pelo Compre Junto): 2 × o preço com desconto ✓
- Viewport estreita × larga para o mesmo toque (passos 01–02): isolou o A-1

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-005 | fail | 01–08, 13, 20 | `screenshots/CH-04-05-checkout-resumo-1440.png`, `screenshots/CH-04-06-pedido-0603.png` | Passo 1 ✓ na sacola (o toque falha em 390, A-1; entrou pelo teclado). Passo 2 ✓ (2 × R$ 308,00 = R$ 616,00). Passo 3 ✗: o checkout não tem a linha "Desconto de campanha" (A-2). Passos 4–5 ✓: o pedido #0603 tem "Desconto de campanha −R$ 77,00" e Total R$ 590,92 = checkout. Variações: recarregar ✓, duplo clique (um pedido visível), e-mail não chegou (pedido pendente), sacola reaberta não feita |
| TC-FUNC-008 | fail | 14, 15, 17 | `screenshots/CH-04-11-mc-sacola-1440.png`, `screenshots/CH-04-12-pedido-mc.png` | Cobra R$ 314,91 (o "por" com mais 10 %) na página, na sacola, no checkout e no pedido #0604, com "de" R$ 349,90. O esperado era R$ 336,60 com "De R$ 374,00" (A-3) |
| TC-FUNC-014 | pass | 03–08 | `screenshots/CH-04-04-qa10-sacola-390.png`, `screenshots/CH-04-06-pedido-0603.png` | O cupom desconta R$ 34,00 = 10 % da M-E, na sacola, no checkout e no pedido. O PIX da loja é de **7 %**, não os 5 % que o TC cita, e a loja aplica 7 % de forma coerente (banner da Home, página, checkout, pedido). Variações "cupom antes da peça" e "cartão" não feitas |
| TC-FUNC-015 | pass | 10–13 | `screenshots/CH-04-07-tira-me-cupom-390.png`, `screenshots/CH-04-09-qa10-recusa-390.png`, `screenshots/CH-04-10-checkout-qafrete-1440.png` | Recusa com "Este cupom não vale para peças da Black Friday." e nenhum desconto. `QAFRETE` aceito, frete "Grátis" no checkout, M-A a R$ 308,00. Variação em minúsculas ✓. Não finalizei esse pedido (orçamento) |
| TC-FUNC-016 | skip | 03, 18–20 | `screenshots/CH-04-15-sacola-promo-conjunto.png` | Parcial, por orçamento. Passos 1 e 3 ✓ na sacola: a faixa conta só as comuns ("Faltam 2", depois "Falta 1"), sem preço de faixa, e M-A no conjunto a R$ 308,00 sem desconto do conjunto. Passos 2 e 4 (checkout e `/pedido/:id` dessa sacola) **não feitos** |
| TC-JOURNEY-002 | fail | 01–08 | `screenshots/CH-04-02-toque-sem-efeito-390.png`, `screenshots/CH-04-06-pedido-0603.png` | Passo 1 em 390: o toque em "Adicionar à sacola" não faz nada (A-1). O resto da jornada fecha: o cupom só sobre a M-E e o pedido #0603 com o total do checkout. O PIX é de 7 % (o TC diz 5 %). A M-E entrou pela URL, não pela busca |

Contagem: pass 2 · fail 3 · blocked 0 · skip 1

## Achados

### A-1 · [Página do produto · celular] Tocar em "Adicionar à sacola" na barra fixa não faz nada, em qualquer peça

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-04, passo 1 (acrescentar a peça) · passos 01–02 do log              |
| TC                  | TC-JOURNEY-002 (passo 1), TC-FUNC-005 (passo 1)                        |
| Gravidade proposta  | critical: no celular, onde a Helena monta a sacola, nenhuma peça entra na sacola e ela não recebe nenhum aviso. Não é da peça de campanha: a M-E (comum) falha igual. A triagem decide se é da Mudança ou anterior a ela |
| Reproduziu          | sim (4 de 4 em 390 × 844: M-A duas vezes, M-E, M-A com a sacola já preenchida) |
| Viewport            | 390 × 844 (em 1440 × 900 o mesmo toque funciona)                     |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, sacola vazia, `*.supabase.co` e `**/g/collect*` bloqueados, viewport 390 × 844
2. Abrir `http://localhost:8092/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925` (ou a M-A), fechar o aviso de cookies, manter a cor padrão
3. Tocar em "Adicionar à sacola" na barra fixa de baixo e depois no ícone "Sacola"

**Esperado:** a peça entra na sacola (no caso da M-A, R$ 308,00 com R$ 385,00 riscado e o selo). **Fonte:** TC-FUNC-005 passo 1; TC-JOURNEY-002 passo 1; PRD CA-03.

**Observado:** nenhuma reação (sem toast, gaveta ou contador). A gaveta "Sua sacola" abre vazia, ou com os itens de antes. Na mesma página e no mesmo viewport, focar o botão e apertar Enter acrescenta a peça. Em 1440 × 900, o toque acrescenta.

**Evidência:**

- `screenshots/CH-04-02-toque-sem-efeito-390.png`: M-A em 390 depois do toque, com o contador ainda em "Sacola, 2 itens"
- console: nada (só os avisos do React Router e do Vite)
- rede: nada de anormal após o toque (nenhuma requisição falhou)

### A-2 · [Checkout · resumo] Sem a linha "Desconto de campanha", e o subtotal não bate com o do pedido

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-04, passo 5 (conferir o checkout) · passos 05 e 13 do log           |
| TC                  | TC-FUNC-005 (passo 3)                                                 |
| Gravidade proposta  | medium: o total bate, mas a Helena, que desconfia de desconto que some, vê no checkout "Subtotal R$ 648,00" sem linha de campanha e no pedido "Subtotal R$ 725,00 · Desconto de campanha −R$ 77,00". O desconto que ela aceitou aparece de um jeito diferente depois |
| Reproduziu          | sim (2 de 2: checkout com M-A + M-E + QA10; checkout com M-A + QAFRETE) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, acrescentar a M-A (Black Friday 20 %) e a M-E à sacola, aplicar `QA10`
2. "Finalizar Pedido" e ler o "Seu pedido" do checkout
3. Finalizar e abrir `/pedido/:id`

**Esperado:** o resumo do checkout tem a linha "Desconto de campanha", como o pedido. **Fonte:** TC-FUNC-005 passo 3; PRD CA-13; `spec.md` I-06.

**Observado:** checkout: "Subtotal R$ 648,00 · Cupom QA10 −R$ 34,00 · Desconto PIX (7%) −R$ 42,98 · Frete … · Total R$ 590,92", sem linha de campanha (o desconto aparece só no de/por do item). Pedido #0603: "Subtotal R$ 725,00 · Desconto de campanha −R$ 77,00 · Cupom QA10 −R$ 34,00 · Desconto PIX −R$ 42,98 · Frete R$ 19,90 · Total R$ 590,92".

**Evidência:**

- `screenshots/CH-04-05-checkout-resumo-1440.png`: o resumo do checkout sem a linha
- `screenshots/CH-04-06-pedido-0603.png`: o pedido com a linha e o subtotal de tabela
- `screenshots/CH-04-10-checkout-qafrete-1440.png`: a segunda ocorrência
- console: nada
- rede: nada

### A-3 · [Sacola, checkout e pedido · M-C] A peça que já tinha "de/por" recebe os 10 % em cima do "por" e grava R$ 314,91

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-04, passo 1 (acrescentar a peça) até o pedido · passos 14, 15 e 17 do log |
| TC                  | TC-FUNC-008                                                           |
| Gravidade proposta  | high: a regra de dinheiro da campanha (o menor preço, nunca os dois descontos) falha também no servidor. A loja cobra R$ 21,69 a menos por unidade, e o "de" exibido (R$ 349,90) não é o "de" da peça (R$ 374,00). Confirma, até o pedido gravado, o que o CH-03 viu no cartão |
| Reproduziu          | sim (2 de 2: na página e na sacola; o pedido #0604 grava o mesmo valor) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, abrir `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925`
2. "Adicionar à sacola", "Finalizar Pedido", preencher como convidada, PIX, "Pagar"
3. Abrir `/pedido/:id`

**Esperado:** min(R$ 349,90; R$ 374,00 × 0,9 = R$ 336,60) = **R$ 336,60**, com "De R$ 374,00". Nunca R$ 314,91. **Fonte:** TC-FUNC-008; PRD CA-06, RN-06; `spec.md` T7, I-03; a regra da massa M-C no briefing.

**Observado:** página: "BLACK FRIDAY −10%, R$ 314,91, R$ 349,90 · 4x de R$ 78,73". Sacola: "de R$ 349,90 por R$ 314,91". Pedido #0604: "de R$ 349,90 por R$ 314,91"; Subtotal R$ 734,90; Desconto de campanha −R$ 111,99 (= 77,00 da M-A + 34,99 da M-C); Total R$ 579,31, igual ao checkout.

**Evidência:**

- `screenshots/CH-04-11-mc-sacola-1440.png`: a linha da M-C na sacola
- `screenshots/CH-04-12-pedido-mc.png`: o pedido #0604 com R$ 314,91
- console: nada
- rede: nada

### A-4 · [Sacola · celular] Tocar na lixeira de uma peça fecha a gaveta sem tirar a peça

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-04a (tirar a peça comum) · passo 09 do log                          |
| TC                  | —                                                                     |
| Gravidade proposta  | medium: a Helena não consegue tirar a peça pelo toque no celular. Pode ter a mesma causa do A-1 (toque em 390) |
| Reproduziu          | intermitente (1 de 1, sem segunda tentativa por orçamento)            |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, em 390 × 844, sacola com a M-E e a M-A
2. Abrir a gaveta "Sua sacola"
3. Tocar no botão "Remover Pulseira Afetiva Oval com Leite Materno em Prata 925 da sacola" (a lixeira)

**Esperado:** a M-E sai da sacola. **Fonte:** TC-JOURNEY-002, caminho de abandono ("Tira M-E com o cupom aplicado").

**Observado:** a gaveta fechou e o ícone seguiu "Sacola, 2 itens". Pelo teclado (foco + Enter) no mesmo botão, a peça saiu.

**Evidência:**

- `screenshots/CH-04-07-tira-me-cupom-390.png`: a sacola depois da remoção pelo teclado (sem screenshot do toque sem efeito)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A sacola mantém as peças depois do pedido criado (pagamento pendente); na compra seguinte, os mesmos itens vão de novo | 09 | pré-existente |
| O primeiro pedido como convidada cria um cadastro para o e-mail. No pedido seguinte com o mesmo e-mail, "Pagar" responde 409 e o checkout pede um código de 6 dígitos | 16 | pré-existente |
| O PIX da loja é de 7 %, e os TC-FUNC-005/014 e TC-JOURNEY-002 falam em 5 % (o TC está desatualizado, não a loja) | 05 | polimento |
| No Compre Junto, com o adicional marcado e ainda sem cor, "Total do conjunto" fica em R$ 340,00 (sem o adicional) e "Levar o conjunto" não acrescenta nada. O aviso "Falta uma escolha em 1 peça" fica no bloco, não perto do botão | 19 | pré-existente |
| Depois da recusa do `QA10`, a gaveta fechou e a recusa veio só em toast. Na primeira recusa (ao tirar a M-E), ela apareceu dentro da gaveta, com "Não aplicado" | 10–11 | polimento |

## Fora da cobertura

- TC-FUNC-016, passos 2 e 4: o checkout e o `/pedido/:id` da sacola com a promoção e o Compre Junto. Orçamento esgotado; a sacola ficou montada, mas não houve pedido
- TC-FUNC-015, passo 3 até o pedido: só o checkout foi conferido, sem finalizar (orçamento)
- TC-FUNC-005, variações "sacola reaberta" (fechar e reabrir a aba) e "e-mail" (o e-mail do pedido não chega com o pagamento pendente)
- TC-FUNC-014, variações "cupom antes da peça" e "cartão"; TC-FUNC-008, outra variação de M-C sem "de"
- Edge cases do charter não tentados: mudar a quantidade de M-A voltando do checkout, a sacola em outra aba, fechar e reabrir a aba (orçamento)
- Rede lenta ao aplicar o cupom: o `agent-browser` não atrasa resposta (o guia de browser pede outro driver)
- TC-JOURNEY-002, passo 2 "pela busca": a M-E foi aberta pela URL
- Duplo clique em "Pagar": não dá para confirmar pela tela que só um pedido foi criado (a convidada não tem lista de pedidos sem login, e o Mailpit não recebe e-mail do pedido pendente)

## Debrief

- **Surpresas:** o A-1 não é da campanha, porque a peça comum também falha ao toque em 390. Toda a sessão em 390 dependeu do teclado para acrescentar e remover. O segundo pedido com o mesmo e-mail de convidada exigiu código, então usei um segundo e-mail
- **Próximo charter:** fechar o TC-FUNC-016 até o pedido (promoção e Compre Junto no servidor) e repetir o A-1 e o A-4 em celular com outro driver, para separar o defeito da interação de toque do agent-browser
- **Padrão novo:** comparar o toque e o teclado no mesmo botão, e a mesma peça em dois viewports, separa o defeito de layout (algo cobrindo o botão) do defeito de lógica
