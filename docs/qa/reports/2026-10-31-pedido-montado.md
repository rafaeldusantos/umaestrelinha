# QA Run Report — 2026-10-31 — pedido montado pelo painel (feature 89)

- **Scope:** feature `89` — montar a venda no painel (`/admin/pedidos/montar`), a proposta e a aba Montados, e o link que a cliente conclui na loja (`/pedido-montado#<token>`). Working tree sem commit sobre `e5fd174c`.
- **Cadence tier:** targeted
- **Build:** working tree sobre `e5fd174c` (sem commit) · **Environment:** dev servers loja `:8082` e painel `:8083`, Supabase local `:54441`, functions por `supabase functions serve --env-file` (Resend com chave inválida). `*.supabase.co` e `**/g/collect*` bloqueados por rota no Playwright (Chromium 1228).
- **Started:** 2026-10-31T21:55Z · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri montando uma venda | Power User | desktop 1440 / wifi / pt-BR | CH-montado-da-conversa-ao-pix, CH-montado-recusas-e-bordas-da-montagem, CH-montado-fonte-grande-teclado-e-privacidade |
| Cliente de luto pelo link | First-Time User | 390×844 / 4g / pt-BR | CH-montado-da-conversa-ao-pix, CH-montado-link-que-mudou-ou-morreu, CH-montado-fonte-grande-teclado-e-privacidade |
| Cliente com conta pelo link | Returning User | 390×844 / 4g / pt-BR | CH-montado-cliente-que-ja-tem-conta |

## Flows in Scope

- `J-montar-pedido-para-a-cliente` — a Adri monta a venda do WhatsApp e manda o link (`../journeys/J-montar-pedido-para-a-cliente.md`)
- `J-concluir-pedido-montado` — a cliente confere, escolhe entrega e pagamento e paga (`../journeys/J-concluir-pedido-montado.md`)
- `J-acompanhar-pedidos-montados` — a Adri acompanha, edita, renova e cancela (`../journeys/J-acompanhar-pedidos-montados.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| Adri montando uma venda | J-montar, Peças | "Prata 925 · Sim · 17 — Sim o quê?" (sem nome do eixo, 108 opções sem filtro) | sharp | deferred |
| Adri montando uma venda | J-montar, WhatsApp | "abriu outra aba e eu não sabia" | dull | deferred |
| Adri montando uma venda | J-montar, Cupom | "apliquei, e quanto ficou?" (só o código no campo) | dull | deferred |
| Adri montando uma venda | J-acompanhar, Editar | "o total pulou e o cupom sumiu" (avisado, mas fácil de esquecer) | sharp | deferred |
| Adri montando uma venda | J-montar, Desconto | "o resumo diz R$ 0,09 e não deixa criar" | dull | deferred |
| Cliente de luto pelo link | J-concluir, peça indisponível | "falar no WhatsApp onde? o botão ficou lá em cima" | sharp | deferred |
| Cliente de luto pelo link | J-concluir, WhatsApp da loja | a mensagem não diz qual pedido (sem P-NNNN) | dull | deferred |
| 1 | CH-montado-da-conversa-ao-pix | J-montar-pedido-para-a-cliente → J-concluir-pedido-montado | Adri → Cliente de luto | Money | Pass | | |
| 2 | CH-montado-link-que-mudou-ou-morreu | J-concluir-pedido-montado | Cliente de luto | Multi-Tab | Blocked (human decision) | BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo; BUG-20261031-frete-antigo-depois-que-a-adri-atualiza; BUG-20261031-ponto-final-depois-do-link-no-whatsapp | |
| 3 | CH-montado-cliente-que-ja-tem-conta | J-concluir-pedido-montado | Cliente com conta | Back-Button | Blocked (human decision) | BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior | |
| 4 | CH-montado-recusas-e-bordas-da-montagem | J-montar-pedido-para-a-cliente | Adri | Garbage | Pass | | |
| 5 | CH-montado-fonte-grande-teclado-e-privacidade | J-concluir-pedido-montado / J-montar-pedido-para-a-cliente | Cliente de luto / Adri | Feature | Blocked (human decision) | BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200; BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab; BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta | |

`Blocked (human decision)` aqui = a sessão achou defeito e esta rodada não conserta, por instrução: o conserto espera quem implementa.

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-montado-da-conversa-ao-pix — Adri montando uma venda → Cliente de luto pelo link

- **Ran:** 21:55 → 22:05 UTC (box respected: yes)
- **Findings:** o caminho de dinheiro fecha. Cliente nova "Marta Lúcia QA" (`marta.qa89@exemplo.invalid`), CEP 90010-000 completado, "Anel Afetivo Aliança com Coto Umbilical" `Prata 925 · Sim · 17` com gravação "Theo ♥ 2019" (R$ 866) + "Anel… coração cravejado" `Folheado a ouro · 17` (R$ 249), cupom `QA89` (10 %), R$ 20 combinados. Resumo: 1.115,00 − 111,50 − 20,00 = **983,50**, no PIX 914,65. Banco: `P-0002` `open`, `items_total 983.50`, ficha nova com `user_id` nulo. Copiar → área de transferência = o link; WhatsApp → `api.whatsapp.com/send?phone=5551988887777` com a mensagem da spec; histórico com dois "Link enviado" e o autor por e-mail. Link num contexto anônimo 390×844 com uma peça na sacola: "Seu pedido", prazo, peças travadas, "Desconto combinado" sem motivo, fragmento fora da barra, token só em `sessionStorage`. Trocado o número para 1240, CPF, SEDEX + PIX ⇒ `/pedido/13098d02…/pagamento`, `#0264`, **R$ 939,12** (983,50 + 24,47 − 68,85). Banco: `orders.total 939.12`, `manual_discount 20`, `proposal_id`, `address_number 1240`, gravação em `order_items`, a mesma ficha adotada (`user_id` preenchido), proposta `completed`, eventos `created → link_sent ×2 → viewed → completed`. `create-payment` real (Mercado Pago de teste) com o total travado. Sacola `estrelinha-cart` intacta (1 item). Reabrir o link no mesmo e em outro contexto ⇒ `/pedido/:id`. Painel: aba Montados `P-0002 · R$ 983,50 · Concluída · Pedido #0264`, sobrevive ao F5 (`?visao=montados`); pedido com "Montado pelo painel · P-0002" ligando à proposta, "Desconto combinado — motivo − R$ 20,00", Total R$ 939,12.
- **Bugs filed/updated:** nenhum nesta sessão.
- **Scenarios settled:** PNL-montado-venda-com-cupom-e-combinado → pass; PNL-montado-copiar-e-whatsapp → pass; LOJA-montado-concluir-sem-conta-pix → pass; PNL-montado-pedido-nascido-mostra-origem → pass; PNL-montado-aba-montados-estados → pass.
- **Paper cuts:** (1) a variação aparece sem o nome do eixo — "Prata 925 · Sim · 17": "Sim" o quê? — numa lista de 108 opções sem filtro por eixo antes da escolha; (2) "Enviar pelo WhatsApp" abre aba nova sem avisar; (3) no cupom aplicado só aparece o código, sem o valor; a Adri só vê o efeito no Resumo.
- **Surprises:** `/pedido-montado` (e `/checkout`) não têm landmark `main` — anterior à 89 no checkout, herdado pela página nova. O cartão "Cliente" do pedido no painel não mostra o telefone gravado em `orders.customer_phone` (anterior, não investigado).
- **Suggested next charter:** a sessão 2 (link editado/renovado/cancelado).

### CH-montado-link-que-mudou-ou-morreu — Cliente de luto pelo link (com a Adri no painel)

- **Ran:** 22:01 → 22:08 UTC (box respected: yes)
- **Findings:**
  - `CON-10` funciona: P-0003 aberta na loja (CEP 01310-100, PAC R$ 35,00), a Adri subiu a quantidade no painel (versão 2); "Pagar" ⇒ `create-order` 409 `proposal_changed`, região viva com "A Adri atualizou seu pedido. Confira de novo antes de concluir.", peças relidas. **Mas o frete ficou o da sacola antiga**: lista com PAC R$ 37,49, Resumo com "Frete · Correios PAC R$ 35,00"; o pedido #0265 nasceu com `shipping_cost 35.00` (BUG-20261031-frete-antigo-depois-que-a-adri-atualiza, Trust-Damage).
  - Renovar (P-0004) ⇒ link novo; a página com o link antigo, ao concluir, recebe 404 `unavailable` e mostra `CON-08` (certo). **Colar o link novo na mesma aba não funciona**: a página segue "não está mais disponível" e o token novo fica na barra; só o F5 resolve (BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo). Cancelar ⇒ o link novo diz `CON-08`, sem dado nenhum. Token inventado, `/pedido-montado` sem fragmento e `#` vazio: `CON-08`.
  - **O link com um ponto colado no fim** (a mensagem do WhatsApp termina "…#<token>. O link vale…") cai em `CON-08` (BUG-20261031-ponto-final-depois-do-link-no-whatsapp — depende de como o WhatsApp torna o link clicável).
  - `CON-09`: variação desativada no banco ⇒ "Indisponível no momento" na peça, "Uma peça do seu pedido está indisponível no momento. Fale comigo pelo WhatsApp." e "Pagar" desabilitado. Restaurada depois.
  - Duplo clique em "Pagar" ⇒ um `create-order`, um pedido (#0268).
- **Bugs filed/updated:** BUG-20261031-frete-antigo-depois-que-a-adri-atualiza; BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo; BUG-20261031-ponto-final-depois-do-link-no-whatsapp.
- **Scenarios settled:** LOJA-montado-link-morto-ou-mudou → fail; PNL-montado-editar-renovar-cancelar → fail (foco, sessão 5); LOJA-montado-peca-indisponivel → pass.
- **Paper cuts:** a frase de indisponível no rodapé não tem link — o único WhatsApp da página está lá em cima; a mensagem pronta desse WhatsApp ("Preciso de ajuda com o pedido que você montou para mim") não leva o número da proposta, e a Adri tem de adivinhar qual é; editar a proposta tira o cupom até a Adri reaplicar (avisado: "O cupom QA89 estava aplicado. Aplique de novo…"), e o total salta enquanto isso; no Editar o telefone aparece sem máscara (`51977776666`); renovar e cancelar usam `window.confirm` nativo.
- **Surprises:** Duplicar levou peças, gravação e desconto combinado, e avisou que o cupom precisa ser reaplicado (`DUP-01` ok).
- **Suggested next charter:** repetir com o cartão (Brick) depois da releitura por versão.

### CH-montado-cliente-que-ja-tem-conta — Cliente com conta pelo link

- **Ran:** 22:08 → 22:14 UTC (box respected: yes)
- **Findings:**
  - "Cliente nova" com `  Marta.QA89@Exemplo.invalid ` ⇒ "Este e-mail já tem cadastro: Marta Lúcia QA Oitenta e Nove. Use o cadastro dela em vez de criar outro." e "Usar este cadastro" preencheu telefone, CPF e o endereço "Casa · Padrão" já escolhido (`MON-02`, `MON-03`). Uma ficha só no banco.
  - Cupom de primeira compra recusado com o texto da loja ("Cupom válido apenas no primeiro pedido.").
  - Logada na loja como OUTRA cliente (Joana, por código do Mailpit), o link da Marta concluiu **sem pedir código** e o pedido #0267 foi para a conta da Marta (A-08); a conta da Joana não o mostra. E-mail só leitura com "Para trocar o e-mail, fale comigo pelo WhatsApp."
  - Voltar e avançar no link: reabre pelo `sessionStorage` (ok). **Defeito grave**: na mesma aba em que a Marta concluíra P-0002, o segundo link dela (P-0008, R$ 191,82) mostra o pedido novo, mas "Pagar" vai ao PIX do pedido ANTERIOR (#0264, R$ 939,12) sem criar pedido; voltar e tocar de novo repete (BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior, Blocks-Completion).
- **Bugs filed/updated:** BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior.
- **Scenarios settled:** LOJA-montado-cliente-com-conta → fail; PNL-montado-cliente-cadastrada-e-repetida → pass.
- **Paper cuts:** logada como outra pessoa, nada na página diz que o pedido vai para outra conta (o e-mail está visível, só isso).
- **Surprises:** o pedido da convidada leva a "Minha conta → Pedidos" numa conta que ela nunca abriu (entra por código; não é defeito).
- **Suggested next charter:** a mesma cliente com dois links abertos em abas diferentes.

### CH-montado-recusas-e-bordas-da-montagem — Adri montando uma venda

- **Ran:** 22:14 → 22:16 UTC (box respected: yes)
- **Findings:** o motivo ao lado de "Criar link" segue a ordem certa: "Escolha a cliente ou cadastre uma nova." → "Informe um e-mail válido." (vazio e `teste@`) → "Acrescente pelo menos uma peça." → "Escolha a variação de …". Desconto: 100 % ⇒ "O desconto em percentual vai de 0,01% a 99,99%."; 99,99 % e R$ 865,50 sobre R$ 866 ⇒ "O desconto não pode zerar o pedido."; 99,88 % (sobra R$ 1,04) aceito; negativo ⇒ "Informe o valor do desconto combinado."; motivo vazio ou só espaços ⇒ "Escreva o motivo do desconto combinado."; motivo corta em 120. Quantidade 0/−1/vazio ⇒ 1, 100/150 ⇒ 99. Gravação colada com 27 caracteres corta em 20 sem avisar. Cotação com 500 interceptado ⇒ "Não consegui cotar o frete agora. O link pode ser criado mesmo assim." e "Criar link" habilitado. Duplo clique em "Criar link" ⇒ uma proposta.
- **Bugs filed/updated:** nenhum.
- **Scenarios settled:** PNL-montado-recusas-e-motivo-ao-lado → pass; PNL-montado-frete-previa-e-falha → pass; PNL-montado-duplo-clique-criar-link → pass.
- **Paper cuts:** com 99,99 % o Resumo mostra "Total das peças R$ 0,09" ao lado da recusa — um total que não pode ser gravado; o campo de valor aceita "abc" e mantém a frase da tentativa anterior; a gravação cortada em 20 não avisa.
- **Surprises:** numa das duas rodadas de duplo clique o segundo `save` respondeu 500 (`rpc_failed`) e consumiu o número P-0006.

### CH-montado-fonte-grande-teclado-e-privacidade — Cliente de luto pelo link e Adri

- **Ran:** 22:16 → 22:20 UTC (box respected: yes)
- **Findings:**
  - `scrollWidth` a 390 com a fonte da raiz em 100/130/200 %: loja `/pedido-montado` aberta, com os blocos fechados, `/pedido/:id/pagamento` e a página indisponível — **390 em todos**. Painel: `/admin/pedidos/montar` (vazio e editando) e a aba Montados — 390; **`/admin/pedidos/montados/:id` de cliente sem telefone a 200 % ⇒ 526**, pelo botão "Sem telefone — copie o link" (BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200).
  - Loja só com teclado: Uma Estrelinha → WhatsApp → Alterar ×2 → envios → PIX/Cartão → CPF → "Pagar", com anel de foco visível em todos; "Pagar" fica fora da ordem até o CPF estar preenchido (desabilitado).
  - Painel só com teclado: busca de peça → Enter acrescenta, mas o foco fica na lista de resultados; **a lista de variações tem 108 paradas de Tab e as setas não andam** (BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab). Renovar e Cancelar soltam o foco no `<body>` sem anúncio (BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta).
  - Token: ver sessão 1 (só no corpo de `get-proposal`/`create-order`). `noindex`: configurado em `core/seo/pages.ts` para `PROPOSAL_PATH`; o HTML servido pela função `api/page` **não** foi medido (dev server não a executa).
- **Bugs filed/updated:** BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200; BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab; BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta.
- **Scenarios settled:** LOJA-montado-fonte-grande-e-teclado → pass; PNL-montado-fonte-grande-e-teclado → fail; LOJA-montado-token-fora-de-tudo → fail (pelo token novo na barra, sessão 2).
- **Paper cuts:** `/pedido-montado` (como `/checkout`) não tem landmark `main`.
- **Suggested next charter:** TalkBack real no link; o `<head>` servido de `/pedido-montado` por `vercel dev` ou preview.

## What Was Fixed

Nada — esta rodada é só de QA, por instrução (sem conserto, sem commit).

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|

## Runtime Errors Observed

- `order-proposals?action=save` 500 (`rpc_failed`) no segundo pedido de um duplo clique em "Criar link" (22:07:17 UTC), com a primeira gravação criada — a chave de idempotência protege o dado, mas a corrida responde 500 em vez da mesma proposta e queima um número da sequência (P-0006 não existe). Não registrado como bug: sem efeito na tela; vale olhar no conserto do duplo clique.
- `checkout?action=get-proposal` 404 nas páginas de link indisponível (esperado).
- Imagens de `home_sections` do hospedado bloqueadas (esperado, `*.supabase.co`).
- Ambiente: `order-proposals` e `mercado-pago` só sobem localmente com os `import type` de `core/pricing/index.ts` e `grid.ts` trocados (troca temporária, restaurada com SHA-256 conferido: `eadce25c…` e `c726dc02…`).

## Human Verifications Needed

- [ ] No WhatsApp de Android e de iOS, mandar a mensagem de "Enviar pelo WhatsApp" para si mesma e tocar no link: o ponto final entra no link? (BUG-20261031-ponto-final-depois-do-link-no-whatsapp; row #2)
- [ ] Abrir o link dentro do navegador interno do WhatsApp num Android real a 390 e com a fonte do sistema grande; concluir com PIX de teste.
- [ ] Concluir com cartão (Brick) — não percorrido nesta rodada.
- [ ] `/pedido-montado` servido pela função `api/page` (preview da Vercel): conferir `noindex` no HTML.

## Decisions for a Human

Nada foi consertado (instrução da rodada). Os sete bugs esperam quem implementa; dois pedem decisão de produto:

### O ponto depois do link (BUG-20261031-ponto-final-depois-do-link-no-whatsapp)
- Opções: (a) a loja ignora pontuação no fim do fragmento (o token nunca a contém); (b) a mensagem põe o link sozinho numa linha, sem ponto; (c) as duas.
- Recomendação: (c) — (b) resolve a origem, (a) protege o link já copiado à mão.

### O frete depois de "A Adri atualizou" (BUG-20261031-frete-antigo-depois-que-a-adri-atualiza)
- Opções: (a) desmarcar a entrega e pedir que a cliente escolha de novo; (b) recotar e manter o serviço, mostrando o preço novo antes de pagar.
- Recomendação: (a) — a frase já pede "confira de novo", e nenhum preço aparece sem ser cotado para o pacote atual.

## Final Status

**Not ready.** 5 sessões, 16 cenários: 10 pass, 6 fail. O caminho de dinheiro principal fecha (painel → link → PIX com o mesmo total nos três lugares e no `create-payment` real), mas dois caminhos realistas levam a cliente a pagar o pedido errado ou um frete que não é o da sacola.

| Impacto | Bugs |
|---|---|
| Blocks-Completion | 2 — BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior (High, P1); BUG-20261031-ponto-final-depois-do-link-no-whatsapp (Medium, decisão + verificação no WhatsApp real) |
| Data-Loss | 0 |
| Trust-Damage | 2 — BUG-20261031-frete-antigo-depois-que-a-adri-atualiza (Medium); BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo (Medium) |
| Friction | 3 — BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab (Medium); BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200 (Low); BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta (Low) |
| Cosmetic | 0 |

Lentes (sem uma re-caminhada separada de 45 min: os vereditos vêm das sessões 1 e 2, as de maior superfície — declarado): primeira impressão `pass` (o link abre com "Seu pedido", peças e prazo); clareza `friction` (eixos sem nome nas variações, motivo de indisponível longe do WhatsApp); confiança `fail` (segundo link paga o anterior; frete antigo depois da atualização); recuperação `friction` (link novo na mesma aba exige F5); tom memorial `pass` (nenhuma urgência, nenhum emoji; primeira pessoa da Adri); acesso `friction` (108 paradas de Tab; foco no body; 526 px a 200 %).

Exit gate (suítes completas, um workspace por vez, exit fora de pipe, `--testTimeout=20000`, código de `core/pricing` restaurado): **core 5129/202 exit 0 · store 6476/347 exit 0 · backoffice 4888/268 exit 0 · functions 1413/38 exit 0.** Mobile-adm e catalog-import não rodados (fora da superfície). Os números de core, store e functions passam da linha do `CLAUDE.md` (5126/202, 6475/347, 1390/37) — a árvore tem trabalho sem commit além da 89; registrado, não investigado.

Dados que ficaram no banco local: propostas P-0002..P-0009 (P-0006 não existe), pedidos #0264, #0265, #0267, #0268 (PIX de teste pendentes), as fichas e contas `*.qa89@exemplo.invalid` e os cupons `QA89`/`QA89PRIMEIRA` (desativados). Nenhum e-mail saiu (Resend com chave inválida); a cotação foi ao Melhor Envio de produção (só leitura) e os PIX ao Mercado Pago de teste. Nada foi consertado e nada foi commitado.

