# Sessão CH-01 · A montagem de ponta a ponta no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-montagem-ponta-a-ponta.md` · exploratório · P0 |
| Status      | done (orçamento esgotado antes de J-01 chegar ao "Criar link") |
| Persona     | PER-01 Adri no WhatsApp · conta: `admin-atelie` (arquivo local de credenciais; as `QA_*` não existem nesta máquina) |
| Tour · modo | Feature · por cenário (J-02 primeiro, depois J-01 sem a IA) |
| Rodada      | exploração |
| Orçamento   | 75 ações de browser de 70 (estourou em 5 — a última foi a segunda reprodução do A-1) |
| Ambiente    | app `http://localhost:8084` · build não exposto · Chromium (Playwright MCP, headless) · viewport 390 × 844 |
| Paridade    | Supabase local (54441), requisições a `*.supabase.co` abortadas; Mercado Pago não configurado; massa sintética; cotação do Melhor Envio servida localmente |

## Missão

Confirmar que a Adri, só com o celular, monta um pedido para uma cliente nova (digitando) e outro para uma
cliente cadastrada, do toque em "Montar pedido" ao pedido montado com o link, sem parar sem saber por quê —
e que a ficha e o endereço só existem depois de "Criar link".

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou e abriu Pedidos | "Pedidos" com "Montar pedido" ao lado; o último chip é "Montados" (sem contagem: nenhum montado aberto naquele momento) | — |
| 02 | Tocou em "Montados" | `/pedidos?visao=montados`, "13 pedidos montados · os mais recentes primeiro", cartões com número, selo, cliente, meta e total | — |
| 03 | Abriu a montagem | "Passo 1 de 4 · Cliente"; barra "Escolha a cliente para continuar.", "Nenhuma peça ainda", "—", "Continuar" desligado | — |
| 04 | Buscou a cliente: "marta lucia" (sem acento), depois "marta" | Sem acento: "Ninguém com “marta lucia”. Se for a primeira compra, use Cliente nova." Com "marta": a cliente Marta Lúcia | — |
| 05 | Escolheu Marta | Cartão "Cliente" com "Trocar", "e-mail · 3 pedidos" (sem telefone nem "N pedidos na loja"); Entrega em "Endereço padrão". "Endereço salvo" abre dois endereços salvos (iguais ao padrão, na massa). CEP mostrado sem hífen (`90010000`) | — |
| 06 | Escolheu o segundo salvo e seguiu | "Passo 2 de 4 · Peças"; barra "Acrescente ao menos uma peça."; lista de joias com "a partir de R$ X · Estoque livre/N em estoque · pede material" | — |
| 07 | Buscou "qa pingente", abriu a peça de nome longo, tocou duas vezes rápido em "Acrescentar · R$ 269,90" | **Duas linhas** iguais na sacola ("Sacola · 2 peças"); barra "Itens · 2 peças · frete à parte" com o total **"—"** | `screenshots/CH-01-05-duplo-toque-duas-linhas.png` |
| 08 | Removeu uma linha pela lixeira | "Peça removida.", "Sacola · 1 peça"; o total da barra continua "—" | — |
| 09 | Acrescentou "Anel Afetivo Coração com Cabelo" | Folha com "Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja."; na sacola a etiqueta "Pede material da cliente". Nenhuma das duas peças abriu campo de gravação. Barra ainda "—" | — |
| 10 | Seguiu ao passo 3 | O resumo aparece (Subtotal R$ 459,80, "No PIX: R$ 427,61…") e só agora a barra mostra o total | — |
| 11 | Ligou "Desconto combinado" (tocando no rótulo), "Em %", 10, sem motivo, e tocou em "Continuar" | O combinado entra na conta (− R$ 45,98, Itens R$ 413,82); só depois do toque aparece "Escreva o motivo do desconto combinado." na barra e no campo | — |
| 12 | Escreveu o motivo e seguiu | "Passo 4 de 4 · Revisar": sacola primeiro (sem miniaturas no snapshot de texto), Cliente com telefone (51) 98888-7777, Entrega com o endereço e a prévia **só "SEDEX · 1 a 2 dias úteis · R$ 17,91"**, observação interna opcional, nota "Os preços ficam travados… até 15/11. Nada é gravado antes de você criar o link." | `screenshots/CH-01-08-revisar-j02.png` |
| 13 | Tocou duas vezes rápido em "Criar link" | Pedido montado P-0033, toast "Link criado." / "Agora é só mandar para Marta.", link, WhatsApp, total dos itens | `screenshots/CH-01-09-link-criado-j02.png` |
| 14 | Voltou uma vez (`history.back`) | **Caiu na montagem vazia** ("Passo 1 de 4 · Cliente", sem cliente), não em Montados | `screenshots/CH-01-10-voltar-cai-na-montagem.png` |
| 15 | Abriu Montados | "Montados · 1 aberto", 14 pedidos; **um** cartão novo só (P-0033, Aberta, "Montado agora · vale até 15/11", R$ 413,82 = Itens da revisão) | — |
| 16 | Pelo "Montar pedido", "Cliente nova": nome sintético, e-mail de Marta em MAIÚSCULAS, WhatsApp, CEP 90020008 | Máscara "(51) 99123-4567" e "90020-008"; "Procurando o CEP…" e depois "Porto Alegre/RS · endereço completado pelo CEP." com a Rua dos Andradas; o aviso "MARTA.QA89@… já é de Marta Lúcia QA Oitenta e Nove · 3 pedidos…" com "Usar a ficha dela" / "Corrigir o e-mail", e a barra "Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail." (aparece cerca de 1 a 3 s depois de digitar) | — |
| 17 | Trocou para um e-mail novo, número 500, e seguiu | Passo 2 | — |
| 18 | Abriu "QA Pingente Lua" e tocou duas vezes em "Acrescentar" | De novo **duas linhas** ("Sacola · 2 peças") e o total "—" (2.ª reprodução de A-1 e A-2). Orçamento esgotado aqui | — |

**Edge cases tentados:** duplo toque em "Acrescentar" (2×, falha); duplo toque em "Criar link" (passa: um cartão só); busca de cliente sem acento (não acha); e-mail com ficha em maiúsculas (o aviso aparece); o combinado sem motivo (motivo só depois do toque); nome de joia longo em 390 (quebra sem rolagem aparente no snapshot); `history.back` depois do link (falha).

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-SMOKE-001 | pass | 01–03 | — | o chip mostra só "Montados" quando não há aberto; com um aberto, "Montados · 1 aberto" (passo 15) |
| TC-SMOKE-002 | pass | 05–13 | `screenshots/CH-01-09-link-criado-j02.png` | — |
| TC-JOURNEY-002 | fail | 04–14 | `screenshots/CH-01-10-voltar-cai-na-montagem.png` | o pedido chegou ao link com o total certo, mas o voltar cai na montagem (A-3); busca por telefone não feita (não sei o número da massa antes de escolher); gravação não exercitada (nenhuma das peças abertas aceita) |
| TC-FUNC-001 | pass | 02, 15 | — | parcial: selos Concluída, Cancelada, Expirada, Aberta vistos; "vista pela cliente" e F5 não exercitados |
| TC-FUNC-002 | fail | 03, 06–12, 16 | `screenshots/CH-01-05-duplo-toque-duas-linhas.png` | passos 1, 4, 5, 6 e a variação "e-mail com ficha" passam; o passo 7 falha — com peça na sacola o total da barra fica "—" no passo 2 (A-2); nome/e-mail vazios e inválido não exercitados um a um |
| TC-FUNC-006 | fail | 04–05 | — | acha por nome com acento; não acha "marta lucia" sem acento (spec-gap); o cartão escolhido não mostra telefone nem "N pedidos na loja" (mostra "e-mail · 3 pedidos") — A-4; telefone e convidada não exercitados |
| TC-FUNC-007 | pass | 05, 12 | `screenshots/CH-01-08-revisar-j02.png` | as quatro opções aparecem e o salvo escolhido chega à revisão; "Outro endereço" e "preenche no link" não exercitados |
| TC-FUNC-008 | pass | 16–17 | — | parcial: o formulário bate; "Continuar" ligou sem CPF; e-mail inválido e rua vazia não exercitados |
| TC-FUNC-009 | skip | 16 | — | o aviso e a barra aparecem (também em maiúsculas); "Corrigir o e-mail", "Usar a ficha dela" e a conferência no painel ficaram de fora por orçamento |
| TC-FUNC-010 | pass | 16 | — | parcial: o CEP real completou; o CEP inexistente não exercitado |
| TC-FUNC-016 | pass | 06–07 | — | parcial: "a partir de", estoque e "pede material"; sem acento acha ("coracao com cabelo"); capas não conferidas (snapshot de texto); "Nenhuma joia" não exercitado |
| TC-FUNC-017 | fail | 07, 18 | `screenshots/CH-01-05-duplo-toque-duas-linhas.png` | a variação "duplo toque em Acrescentar → uma linha só" falha (A-1); fora disso, a folha abre na primeira variação com estoque e "A foto troca…" |
| TC-FUNC-018 | skip | 09 | — | o aviso de material passa; a gravação não foi achada nas peças abertas e ficou de fora |
| TC-FUNC-019 | pass | 07–08 | — | parcial: "Editar"/lixeira e "Peça removida." com a contagem recalculada; a foto da linha não conferida |
| TC-FUNC-024 | fail | 12 | `screenshots/CH-01-08-revisar-j02.png` | ordem, nota, observação e "Alterar" presentes; a prévia mostra só SEDEX, sem PAC e sem "Retirada no escritório" para CEP do RS (A-5); feito com a cadastrada, não com a cliente nova |
| TC-FUNC-025 | fail | 13–15 | `screenshots/CH-01-10-voltar-cai-na-montagem.png` | duplo toque cria um cartão só e com o total da revisão (passa); a variação P1 "voltar depois do link" falha (A-3) |
| TC-INT-001 | skip | — | — | orçamento esgotou antes do "Criar link" da cliente nova e da conferência no painel |
| TC-PERSONA-001 | fail | 03–14 | — | J-02 cabe no tempo, mas confirmou fricção: a barra sem total no passo das peças, o duplo toque dobrando a peça, e o voltar que reabre a montagem vazia |

Contagem: pass 8 · fail 7 · blocked 0 · skip 3

## Achados

### A-1 · [Montagem · Peças] Duplo toque em "Acrescentar" põe a mesma peça duas vezes na sacola — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | J-02, passo 3 (acrescentar) · passos 07 e 18 do log |
| TC                  | TC-FUNC-017 (variação "duplo toque em Acrescentar") |
| Gravidade proposta  | medium — com o dedo nervoso ela manda à cliente um pedido com a peça em dobro se não notar a sacola |
| Reproduziu          | sim (2 de 2, peças diferentes, cliente cadastrada e nova) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie` em `http://localhost:8084/pedidos`, "Montar pedido", escolha qualquer cliente e "Continuar"
2. Busque "qa pingente", abra uma peça com estoque
3. Toque duas vezes rápido em "Acrescentar · R$ X"

**Esperado:** uma linha só na sacola — **fonte:** TC-FUNC-017, variação "duplo toque em 'Acrescentar' → uma linha só"

**Observado:** "Sacola · 2 peças" com duas linhas idênticas ("QA Pingente Estrela Guia… · Prata 925 · 1 × R$ 269,90"); barra "Itens · 2 peças · frete à parte".

**Evidência:**

- `screenshots/CH-01-05-duplo-toque-duas-linhas.png` — as duas linhas iguais
- console: nada
- rede: nada

### A-2 · [Montagem · barra] O total da barra fica "—" no passo das peças, com peças na sacola — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | J-01/J-02, passo de peças · passos 07–09 e 18 do log |
| TC                  | TC-FUNC-002 (passo 7) |
| Gravidade proposta  | low — ela não vê quanto está dando enquanto monta a sacola; o valor aparece no passo 3 |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, "Montar pedido", escolha a cliente e "Continuar"
2. Acrescente uma peça
3. Olhe a barra fixa

**Esperado:** "Itens · 1 peça · frete à parte" e o total — **fonte:** TC-FUNC-002 passo 7 (spec Design › casca)

**Observado:** "Itens · 1 peça · frete à parte" com o valor "—"; o total só aparece ao chegar em "Passo 3 de 4 · Descontos" (R$ 459,80 com duas peças).

**Evidência:**

- `screenshots/CH-01-05-duplo-toque-duas-linhas.png` — a barra com "—" e duas peças
- console: nada
- rede: nada

### A-3 · [Pedido montado] Voltar depois de "Criar link" reabre a montagem vazia, não Montados — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | J-02, passo 5 (criar o link) · passo 14 do log |
| TC                  | TC-FUNC-025 (variação P1), TC-JOURNEY-002 |
| Gravidade proposta  | high — P1 decidido (Q-01, D-43): ela volta para conferir a lista e cai numa montagem nova, sem ver o cartão que acabou de criar |
| Reproduziu          | sim (1 de 1 — a segunda jornada não chegou ao link por orçamento; esperado pelo plano como falha do código atual) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, `/pedidos` → "Montados" → "Montar pedido"
2. Monte um pedido mínimo (cliente cadastrada, uma peça) e toque em "Criar link"
3. Já no pedido montado, use o voltar do navegador

**Esperado:** `/pedidos?visao=montados` com o cartão novo; um segundo voltar não reabre a montagem — **fonte:** spec D-43, Q-01 (2026-11-08), TC-FUNC-025

**Observado:** URL `/pedidos/montar`, "Montar pedido · Passo 1 de 4 · Cliente", vazia ("Escolha a cliente para continuar."). Nessa tela os botões "Passo 2: Peças" e "Passo 3: Descontos" aparecem habilitados sem cliente.

**Evidência:**

- `screenshots/CH-01-10-voltar-cai-na-montagem.png` — a montagem vazia depois do voltar
- console: nada
- rede: nada

### A-4 · [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja" — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | J-02, passo 1 (escolher a cliente) · passo 05 do log |
| TC                  | TC-FUNC-006 (passo 4) |
| Gravidade proposta  | low — ela confere a cliente pelo número do WhatsApp e não o vê ali; o telefone aparece na revisão |
| Reproduziu          | sim (1 de 1, observação estática) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, "Montar pedido", busque "marta" e escolha Marta Lúcia QA Oitenta e Nove

**Esperado:** cartão "Cliente" com "Trocar" (nome, "N pedidos na loja", e-mail, telefone) — **fonte:** TC-FUNC-006 passo 4 (spec Design › Passo 1)

**Observado:** nome e "marta.qa89@exemplo.invalid · 3 pedidos", sem telefone; a mesma cliente tem "(51) 98888-7777" na revisão.

**Evidência:**

- console: nada
- rede: nada

### A-5 · [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre mostra só SEDEX — Adri

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-01 Adri no WhatsApp |
| Jornada e passo     | J-02, passo 5 (revisar) · passo 12 do log |
| TC                  | TC-FUNC-024 (passo 2) |
| Gravidade proposta  | low — prévia; a cliente escolhe no link. Pode ser do ambiente (cotação local, endereço do escritório não configurado) |
| Reproduziu          | sim (1 de 1) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. `admin-atelie`, monte para Marta Lúcia (endereço salvo, CEP 90010-000) com duas peças, siga até "Revisar"

**Esperado:** PAC · Correios, SEDEX · Correios e "Retirada no escritório" (CEP do RS) — **fonte:** TC-FUNC-024 passo 2

**Observado:** "SEDEX · 1 a 2 dias úteis · R$ 17,91" e "Prévia. A cliente escolhe a entrega no link." Sem PAC e sem Retirada.

**Evidência:**

- `screenshots/CH-01-08-revisar-j02.png` — o bloco Entrega
- console: nada
- rede: não inspecionada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| A busca de cliente não acha "marta lucia" sem acento (acha "marta"); a busca de joias acha "coracao" sem acento | 04 | pré-existente |
| O número do pedido montado pulou de P-0014 para P-0033 na lista (os intermediários não aparecem em Montados) | 13, 15 | polimento |
| O CEP dos endereços salvos aparece sem hífen ("90010000") no passo 1 e na revisão; no pedido montado, com hífen | 05, 12 | polimento |
| O rótulo do complemento é lido como "ComplementoOpcional" (sem separação) | 16 | polimento |
| O switch "Desconto combinado" não responde ao toque no próprio controle (o texto auxiliar cobre); responde tocando no rótulo | 11 | polimento |
| O aviso "já é de …" leva de 1 a 3 s para aparecer depois de digitar | 16 | polimento |

## Fora da cobertura

- J-01 até "Criar link", "Usar a ficha dela" / "Corrigir o e-mail" e a conferência no painel (1440) de que a ficha e o endereço não existem antes e existem uma vez depois (TC-INT-001, TC-FUNC-009) — orçamento esgotado
- Segundo voltar depois do link (D-43) — orçamento; e a reprodução de A-3 numa segunda jornada
- CEP inexistente e de cidade sem rua, busca por telefone (puro e colado com espaços), cliente sem endereço, variação esgotada e teto de estoque somando a sacola, gravação no teto, "Alterar" da revisão trocando a cliente — orçamento
- Fotos (capa em retrato, foto da variação na sacola e na revisão) — o snapshot não mostra imagem e as screenshots não foram relidas
- Rede lenta e cotação fora do ar — não exercitados

## Debrief

- **Surpresas:** o duplo toque em "Acrescentar" duplica a linha, enquanto o de "Criar link" está protegido; o total da barra só aparece no passo 3.
- **Próximo charter:** fechar J-01 com a cliente nova até o link e a conferência no painel (TC-INT-001, TC-FUNC-009), e o segundo voltar de D-43.
- **Padrão novo:** duplo toque em todo botão que acrescenta à lista, não só no de gravar.
