# Reteste — 98-pagamento-que-falhou

| Campo      | Valor                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Rodada     | 3 (confirmação) · 2026-11-10 · início 08:54 · fim 08:59 (BRT)                                                          |
| Ambiente   | loja http://localhost:8082 · painel http://localhost:8083 · Supabase local · `pnpm dev` (build não exposto) · Chromium headless (Playwright MCP) |
| Bloqueios  | `*.supabase.co`, `accounts.google.com` e `**/g/collect*` abortados por rota; nenhum cartão digitado; "Entrar com Google" não usado; WhatsApp não clicado |
| Bugs lidos | 2 de `issues/` com status `open` ou `still-open` (BUG-010 `still-open`, BUG-013 `open`)                                |

Contagem: resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0

## BUG-010 · [Registrar pagamento] Botão da data (40 px) e "Limpar data" (36 px) abaixo de 44 px no celular

| Campo       | Valor |
| ----------- | ----- |
| Resultado   | resolved |
| Persona     | PER-01 Adri no celular · conta: `admin` |
| Passos de   | `issues/BUG-010.md` |
| Tentativas  | 2 · 2 (#0579 e #0553, só a tela aberta — nada gravado nesta medição) |
| Viewport    | 390 × 844 e 320 × 568, fonte 100 % (e 130 %/200 % no entorno) |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Como `admin`, abrir `/admin/pedidos/<id>/pagamento` de um pedido Pendente não pago, em 390 × 844 e em 320 × 568
2. Medir largura e altura do botão "Data do pagamento (Brasília)" e do "Limpar Data do pagamento (Brasília)"

**Esperado:** todo controle tocável com pelo menos 44 px.

**Observado:** nas duas tentativas, "Limpar data" mede **44 × 44** em 390 e em 320 (classes `h-11 w-11 shrink-0`);
o botão da data mede 244 × 44 (390) e 174 × 44 (320). Nenhum botão da tela abaixo de 44 em 390 e 320 a 100 %. A
130 %: 57,2 × 57,2; a 200 %: 88 × 88.

**Entorno:**

| Onde                         | Resultado | Nota |
| ---------------------------- | --------- | ---- |
| Passo anterior da jornada    | ok        | a tela abre com a data de hoje e a hora atual |
| Passo seguinte da jornada    | ok        | tocar em "Limpar data" volta o botão para "Agora" e "Registrar pagamento" continua habilitado |
| Mesma ação com outro dado    | quebra (N-1) | 320 × 568 com a fonte a 200 %: `scrollWidth` 389 — o rótulo "Comprovantes" vai até x = 389 (fora do que o bug mede; ver N-1). 390 a 100/130/200 %: 390 |

**Evidência:**

- `screenshots/retest-BUG-010.png` — a tela em 320 × 568, fonte 100 %, com "Limpar data" ao lado do botão da data
- console: 0 erros · rede: nada relevante

## BUG-013 · [Pedido · bloco Pagamento e Histórico] O e-mail de quem registrou não quebra e faz o pedido rolar de lado em 390 com a fonte a 200 % — para a dona

| Campo       | Valor |
| ----------- | ----- |
| Resultado   | resolved |
| Persona     | PER-01 Adri no celular · conta: `admin` |
| Passos de   | `issues/BUG-013.md` |
| Tentativas  | 2 · 3 (#0549 e #0550, registrados à mão na rodada 2; #0579, registrado nesta rodada) |
| Viewport    | 390 × 844, fonte da raiz 100 % / 130 % (20,8 px) / 200 % (32 px) |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Como `admin`, abrir um pedido com pagamento registrado à mão
2. Em 390 × 844, subir a fonte da raiz para 200 % (32 px)
3. Olhar "Registrado por" no bloco "Registrado à mão" e a linha do Histórico "… · Registrado por …"; medir o documento

**Esperado:** a página cabe em 390 a 100/130/200 %; o e-mail quebra dentro da linha.

**Observado:** o e-mail quebra nos dois lugares. A 200 %, a linha do Histórico "Registrado por
admin@umaestrelinha.dev" termina em x = 309 com 200 px de altura (várias linhas) e o `DD` do bloco termina em
x = 309 com 80 px (duas linhas). Nenhum dos dois passa da viewport (eram 506 e 426 na rodada 2). Igual nos três
pedidos.

Porém o documento a 200 % mede **391**, não 390: um elemento **diferente** — o botão "Em Separação" (ação "Outro
status") — termina em x = 390,56. A página desliza 1 px de lado (`scrollX` chega a 1). O e-mail, que era o que o bug
descrevia, não causa mais rolagem; o 0,56 px restante vem de outra peça e está em N-2. A 100 % e a 130 %: 390.

**Entorno:**

| Onde                         | Resultado | Nota |
| ---------------------------- | --------- | ---- |
| Passo anterior da jornada    | ok        | registrar sem e-mail no #0579 (Dinheiro) leva ao pedido, foco no `H1` (ver BUG-011/006 no entorno) |
| Passo seguinte da jornada    | ok        | o Histórico do #0579 mostra "Aviso à cliente não enviado: Pagamento aprovado" e "Registrado por admin@…" |
| Mesma ação com outro dado    | quebra (N-2) | nos três pedidos, a 200 %, `scrollWidth` 391 pelo botão "Em Separação" |

**Evidência:**

- `screenshots/retest-BUG-013.png` — #0549 em 390 × 844 a 200 %, a linha "Registrado por" do histórico quebrada dentro da largura
- console: 0 erros · rede: nada relevante

## Entorno pedido nesta rodada (não são bugs abertos)

| O que | Resultado | Nota | Evidência |
| ----- | --------- | ---- | --------- |
| QA-P1 (tarefa 19) · `/conta` como `cliente`, #0563 | ok | Em "Precisa da sua atenção": "O pagamento deste pedido é combinado comigo · Pedido #0563. Fale comigo pelo WhatsApp que eu combino com você como concluir o pagamento." + "Conversar no WhatsApp". Sem valor na oferta e sem "Gerar novo PIX". Na lista "Seus pedidos" a linha do #0563 continua "PIX expirado · R$ 10,00" (o total do pedido, não oferta) | `screenshots/retest-r3-QA-P1-conta.png` |
| QA-P1 · `/pedido/<#0563>` como `cliente` | ok | Selo "PIX expirado", título "O pagamento deste pedido é combinado comigo", frase do WhatsApp, "Conversar no WhatsApp"; sem "Gerar novo PIX", sem "Pagar com PIX", sem bloco de valor. 390 sem rolagem lateral. Nenhuma chamada a functions | `screenshots/retest-r3-QA-P1-pedido-0563.png` |
| QA-P1 · o par (PIX vencido cobrado pela loja mantém "Gerar novo PIX") | ok, com ressalva de massa | #0560 (pedido montado, PIX vencido, valor de `proposalPricing`): em `/conta` "O código PIX expirou · R$ 40,27 · Gerar novo PIX"; em `/pedido/<id>` "Valor R$ 40,27 · Gerar novo PIX". Não há na conta `cliente` um PIX vencido de checkout comum dentro do prazo: #0549/#0550 estão pagos (rodada 2) e o #0551 está fora dos 7 dias ("Fale comigo para retomar") | `/conta` no mesmo screenshot acima |
| QA-P1 · rota direta `/pedido/<#0563>/pagamento` | quebra (N-3) | a rota não é oferecida por link, mas aberta pela URL chama `create-payment` → **409** `order_without_store_charge` (o servidor recusa, nada é cobrado) e a tela diz "falha do lado do banco", mostra R$ 10,00 e "Tentar gerar o código de novo" | `screenshots/retest-r3-novo-rota-pagamento-0563.png` |
| BUG-012 · `/pagar-com-cartao` (link vivo do #0578, do manifesto; nenhum link gerado nesta rodada) | ok | 320 × 568: `scrollWidth` 320 a 100 % e a 200 %; `h1` "Pagamento com cartão" e "Total no cartão" presentes. 390: 390 a 100 % e 200 %. O formulário do cartão não foi tocado | `screenshots/retest-r3-BUG-012-320-200.png` |
| BUG-011/BUG-006 · registro sem e-mail no #0579 (pedido livre), 390 × 844 | ok | meio Dinheiro, caixa "Avisar a cliente por e-mail" desmarcada, confirmar. Foco no `H1 "Pedido #0579"` da 2ª amostra (~0,8 s) até a 10ª (4 s); região viva: "Pagamento registrado · sem e-mail à cliente (anotado no histórico)", e o histórico tem a linha do aviso não enviado — frase coerente. O caminho com a rede cortada não foi refeito nesta rodada | `screenshots/retest-r3-BUG-011-0579.png` |

## Achados novos no entorno

### N-1 · [Registrar pagamento] O rótulo "Comprovantes" faz a tela rolar de lado em 320 com a fonte a 200 % — para a dona

| Campo               | Valor |
| ------------------- | ----- |
| Perto de            | BUG-010 |
| Persona             | PER-01 Adri no celular |
| Jornada e passo     | J-01, passo 3 (preencher o registro) |
| Gravidade proposta  | low — só em 320 com a fonte a 200 % (fora da meta de 390 do TC-CFR-003); o campo continua alcançável rolando 69 px |
| Reproduziu          | sim (1 de 1 medição, #0553; não repetido por orçamento) |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir `/admin/pedidos/<id>/pagamento` de um pedido Pendente em 320 × 568
2. Subir a fonte da raiz para 32 px e medir `document.documentElement.scrollWidth`

**Esperado:** 320, sem rolagem horizontal do documento — **fonte:** `CLAUDE.md` › Mobile ("scroll horizontal do body — nunca deve existir"); PRD RNF-04

**Observado:** 389. O `LABEL` "Comprovantes" (`inline-flex min-h-11 … border`) termina em x = 389. A 100 % e a
130 % em 320: 320. Em 390 a 200 %: 390. Também a 320/200 %, o botão "Abrir menu" do topo mede 40 × 88 (largura
abaixo de 44).

**Evidência:** `screenshots/retest-r3-registrar-320-200.png` — a tela em 320 × 568 a 200 %

### N-2 · [Pedido] O botão "Em Separação" passa 0,56 px da largura em 390 com a fonte a 200 % — para a dona

| Campo               | Valor |
| ------------------- | ----- |
| Perto de            | BUG-013 |
| Persona             | PER-01 Adri no celular |
| Jornada e passo     | J-01, passo 5 (ver o pedido pago) |
| Gravidade proposta  | low — a página desliza 1 px; nada fica escondido |
| Reproduziu          | sim (3 de 3: #0549, #0550, #0579) |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, abrir um pedido Pago (ex.: #0549) em 390 × 844
2. Subir a fonte da raiz para 32 px e medir `document.documentElement.scrollWidth`

**Esperado:** 390 — **fonte:** TC-CFR-003 ("nenhuma em 390 a 100/130/200 %"); PRD RNF-04

**Observado:** 391. O botão "Em Separação" (`whitespace-nowrap`, na linha "Outro status") mede 309,56 px de largura e
termina em x = 390,56; `scrollX` chega a 1. A 100 % e a 130 %: 390. Não confirmado se já existia antes do WI 98.

**Evidência:** medida por script (sem imagem própria; `screenshots/retest-BUG-013.png` é a mesma página a 200 %)

### N-3 · [Loja · pagamento do pedido] Pedido de pagamento combinado aberto pela rota de PIX diz "falha do banco", mostra o valor e oferece tentar de novo — para a cliente

| Campo               | Valor |
| ------------------- | ----- |
| Perto de            | QA-P1 (tarefa 19) |
| Persona             | cliente com pedido gravado fora da loja |
| Jornada e passo     | jornada da cliente que volta a pagar, passo de abrir o pagamento |
| Gravidade proposta  | low — a rota não é oferecida por link na conta nem no pedido; o servidor recusa (409) e nada é cobrado; mas a tela contradiz a decisão (mostra R$ 10,00, culpa o banco e convida a tentar de novo). Sobe para medium se algum e-mail ou link antigo levar a `/pedido/<id>/pagamento` |
| Reproduziu          | sim (1 de 1; o recarregamento seguinte não foi lido por tempo) |

**Passos para reproduzir** — de um estado limpo:

1. Como `cliente`, abrir `http://localhost:8082/pedido/<#0563>/pagamento`

**Esperado:** a mesma mensagem da decisão QA-P1 — "O pagamento deste pedido é combinado comigo" com o WhatsApp, sem
valor oferecido e sem gerar PIX; idealmente sem chamar `create-payment` — **fonte:** `decisoes-produto.md` QA-P1;
tarefa 19

**Observado:** a página chama `POST mercado-pago?action=create-payment` → 409 `{"code":"order_without_store_charge"}`
e mostra "Não foi possível gerar o código agora · A falha foi do lado do banco, não do seu pedido…", "R$ 10,00 ·
valor do pedido, ainda não cobrado", "O pagamento deste pedido é combinado com a loja…", "Tentar gerar o código de
novo" e "Falar comigo no WhatsApp". Console: 1 erro (a resposta 409).

**Evidência:** `screenshots/retest-r3-novo-rota-pagamento-0563.png` — a tela da rota de pagamento do #0563

## Massa usada

| Pedido | Uso | Estado final |
| ------ | --- | ------------ |
| #0579 | registrado à mão (Dinheiro, sem comprovante, sem e-mail à cliente) | `paid / approved`, com "Registrado por admin@…" e o aviso pulado no histórico; o link de cartão dele foi revogado pelo registro, se a regra o revoga (não conferido) |

Só lidos: #0553 (tela de registrar aberta, nada gravado), #0549, #0550, #0560, #0563 (inclusive a rota de
pagamento, que só recebeu a recusa 409) e o link de cartão do #0578 (formulário não tocado). Nenhum e-mail enviado à
cliente. As duas contas saíram (armazenamento e cookies limpos; o painel volta a `/admin/login` e `/conta` abre o
"Entrar ou criar conta"). Nenhum arquivo foi copiado para `.playwright-mcp/`.

## Rodada 2

2026-11-10 08:13–08:20 · resolved 10 · still-open 1 · cannot-reproduce 1 · blocked 0

| Bug | Resultado | Resumo |
| --- | --------- | ------ |
| BUG-001 | resolved | as escolhas de comprovante somam até 3 depois de mexer na tela (#0546, #0560) |
| BUG-002 | resolved | depois do desfazer, o bloco "Registro desfeito" mantém observação e comprovantes |
| BUG-003 | resolved | pedido desfeito sem "Enviar agora" no aviso pulado |
| BUG-004 | resolved | pedido pago duas vezes sem "Desfazer" (#0576) |
| BUG-005 | cannot-reproduce | sem massa de pedido Separando não pago da `cliente`; a rota volta ao pedido sem chamar functions |
| BUG-006 | resolved | rede cortada: a frase diz que a anotação não foi gravada (#0549, #0550) |
| BUG-007 | resolved | cartão em análise: "ainda não foi confirmado" (#0553) |
| BUG-008 | resolved | sem "Método: pix" ao lado do meio registrado |
| BUG-009 | resolved | histórico com "Registrado por …" (abriu o NOVO-01, hoje BUG-013) |
| BUG-010 | still-open | alturas 44, mas "Limpar data" com 40 de largura em 390 e 320 |
| BUG-011 | resolved | foco no `H1` do pedido depois de confirmar |
| BUG-012 | resolved | `/pagar-com-cartao` cabe em 320 a 200 % |

Achados novos da rodada 2: NOVO-01 (o e-mail de "Registrado por" fazia o pedido rolar a 390/200 % — virou BUG-013) e
NOVO-02 (arquivo recusado e excedente entravam na lista de comprovantes).
