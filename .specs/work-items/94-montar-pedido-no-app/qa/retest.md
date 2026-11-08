# Reteste — WI 94 · Montar pedido no app do ateliê (rodada 2, confirmação)

| Campo      | Valor                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Rodada     | 2026-11-08 · início 12:50 · fim 13:00                                                          |
| Ambiente   | http://localhost:8084 (app do ateliê, feature/94 @ e8b20c6c) · build não exposto · Chromium headless (Playwright MCP) · Supabase e edge functions locais, `*.supabase.co` bloqueado por rota |
| Bugs lidos | 20 de `issues/` com status `open` (BUG-001 … BUG-020)                                          |

Contagem: resolved 20 · still-open 0 · cannot-reproduce 0 · blocked 0

Notas de método:

- Persona de todos os bugs: PER-01 Adri no WhatsApp (BUG-004 e BUG-014: PER-03 Adri com a fonte grande) · conta: `admin-atelie` (referência do briefing, nunca o valor).
- Viewport 390 × 844 em todos, salvo onde dito (BUG-004: 390 × 500 com a fonte a 200 %).
- Os valores esperados de design (BUG-010..020) são os das tabelas "Design × implementado" dos próprios bugs, lidos do protótipo `Montar Pedido.dc.html` na r1 e reconfirmados no CH-09 r2; o protótipo não foi relido nesta passada.
- Para os bugs já confirmados nas sessões da r2, a segunda tentativa é a da sessão (citada); a desta passada é 1 de 1. BUG-003 e as partes abertas de 013, 014, 016–020 tiveram as tentativas feitas aqui.
- Dado criado nesta passada: o pedido montado **P-0043** (Marta Lúcia QA, R$ 219,90, Aberta), para o reteste do BUG-001. Ficou aberto. Nenhum outro dado foi alterado (o "Cancelar este pedido" do P-0040 foi aberto e fechado com "Manter").

## BUG-003 · [Folha "Colar texto"] Cancelar durante a leitura não fecha, e a leitura troca o que a Adri digitou

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-003.md`                                      |
| Tentativas | 2 · 2 (1.ª com "Cancelar", 2.ª com Esc)                  |
| Viewport   | 390 × 844                                                |

**Passos seguidos** — de um estado limpo, como estão no bug, com a resposta de `functions/v1/customer-parse` segurada 7 s no browser:

1. `/pedidos/montar`, "Cliente nova"; Nome "Ju", E-mail "ju.manual@exemplo.invalid"
2. "Colar texto da conversa", colado o texto da Paula Lima, "Ler o texto" → a folha mostra "Lendo o texto…"
3. Toque em "Cancelar" (tentativa 1) / tecla Esc (tentativa 2) durante a leitura; espera de 8 s pela resposta

**Esperado:** "Cancelar" ligado e fecha a folha; os campos ficam como a Adri deixou.

**Observado:** nas duas tentativas, "Cancelar" ligado (sem `disabled`/`aria-disabled`) e a folha fechou na hora (0 diálogos 0,5 s depois); depois da resposta, Nome "Ju" e E-mail "ju.manual@exemplo.invalid" intactos, WhatsApp, CEP e Rua vazios, sem "Lido do texto — confira.". Na reabertura a folha vem com o texto vazio.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | digitar Nome e E-mail antes de abrir a folha |
| Passo seguinte da jornada | ok        | leitura sem atraso e sem cancelar: Nome "Paula Lima", e-mail, WhatsApp "(51) 98765-4321", CEP "90020-008", "Lido do texto", "Desfazer" presente, folha fechada |
| Mesma ação com outro dado | ok        | Esc no lugar de "Cancelar": mesmo resultado |

**Evidência:**

- `screenshots/RT-r2-BUG-003-cancelar-1.png` — os campos com "Ju" e o e-mail digitado depois de a leitura cancelada responder
- `screenshots/RT-r2-BUG-003-entorno-leitura.png` — a leitura normal preenchendo os campos
- console: nada · rede: `POST /functions/v1/customer-parse → 200` (atrasado de propósito)

## BUG-014 · [Campo de texto com erro] CEP não achado e cupom recusado não marcam o campo como erro

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-03 Adri com a fonte grande · conta: `admin-atelie`   |
| Passos de  | `issues/BUG-014.md`                                      |
| Tentativas | 2 · 3 (CEP 99999-999; cupons `naoexiste99` e `zz-nada-01`) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:**

1. "Cliente nova", CEP `99999-999`
2. Outra montagem (Marta Lúcia QA, QA Medalha Afetiva), passo 3, cupom `naoexiste99` → "Aplicar"; repetido com `zz-nada-01`

**Esperado:** o campo no estado de erro (texto e borda de erro).

**Observado:** CEP: borda `rgb(126,47,43)` (alerta), `aria-invalid="true"`, `aria-describedby` → "Não achei este CEP. Confira, ou preencha o endereço à mão." na cor de alerta. Cupom (2 de 2): borda de alerta, `aria-invalid="true"`, `aria-describedby` → "Cupom inválido." (`role=alert`, cor de alerta).

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | o CEP digitado aparece mascarado |
| Passo seguinte da jornada | ok        | CEP válido `90020-008` limpa o erro (borda normal, sem `aria-invalid`) e preenche Rua dos Andradas / Porto Alegre |
| Mesma ação com outro dado | ok        | segundo cupom inexistente: mesmo estado de erro. Observação: apagar o código do cupom não limpa o estado de erro (só um novo "Aplicar" o recalcula) — não é o bug, e não bloqueia |

**Evidência:**

- `screenshots/RT-r2-BUG-014-cep.png` — o CEP com borda e mensagem de erro
- `screenshots/RT-r2-BUG-014-cupom.png` — o cupom recusado com borda de erro
- console: `POST /functions/v1/order-proposals?action=preview → 422` (o cupom recusado, esperado) · rede: idem

## BUG-013 · [Montagem · barra fixa] Motivo sem a cor de espera, botão estreito e a recusa do combinado fora da barra

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-013.md`                                      |
| Tentativas | 2 · 2 (cor/tamanho/largura: CH-09 r2 passo 05 e esta passada; recusa na barra: esta passada, mais o "Continuar" do Revisar) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:**

1. Passo 1 sem cliente: barra "Escolha a cliente para continuar."
2. Cliente, peça, passo 3: "Desconto combinado", "Em %", 100 — olhar a barra **antes** de tocar em "Continuar"

**Esperado:** motivo em cor de espera, 13 px; "O desconto não pode zerar o pedido." logo na barra; botão 190 px.

**Observado:** com o combinado em 100 % a barra fixa já mostra "O desconto não pode zerar o pedido." em `rgb(107,79,36)` 13 px, sem toque; o erro sob o campo segue em cor de alerta; "Continuar" com 190 px, e tocar nele não avança (fica no passo 3). "Criar link" no Revisar: 190 px. Passo 1: motivo 13 px em `#6b4f24` (CH-09 r2).

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | passo 2: barra "Itens · 1 peça · frete à parte · R$ 164,90" |
| Passo seguinte da jornada | ok        | baixando para 10 % (motivo preenchido) o aviso some, a barra mostra R$ 148,41 e "Continuar" leva ao Revisar |
| Mesma ação com outro dado | ok        | 10 % no lugar de 100 %: sem motivo de bloqueio |

**Evidência:**

- `screenshots/RT-r2-BUG-013-combinado-zera.png` — o motivo na barra com o combinado em 100 %, antes de tocar em "Continuar"
- `screenshots/CH-09-r2-04-passo1.png` (sessão) — o motivo do passo 1 e o CTA de 190 px
- console: nada · rede: nada

## BUG-017 · [Montagem · Passo 1] Resultados da busca, convite de colar e formulário de endereço com outra estrutura

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-017.md`                                      |
| Tentativas | 2 · 2 (lista: CH-09 r2; Cliente nova: duas aberturas nesta passada) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:**

1. "Cliente cadastrada", busca "marta": lista em cartão (CH-09 r2: surface, borda, raio 20, inicial 44 px)
2. "Cliente nova": convite, campo E-mail, endereço em "Informar o endereço agora"

**Esperado:** tabela do bug (cartão da lista, inicial 44, convite 15 px 500 com ícone accent e padding 18, placeholder "nome@email.com", bloco "Endereço de entrega" depois do cartão Entrega).

**Observado:** título do convite Outfit 15 px 500; cartão do convite padding 18, raio 20; ícone em accent `rgb(184,148,95)`; E-mail com placeholder "nome@email.com"; bloco próprio "Endereço de entrega" (y 1014) depois das duas opções de Entrega (y 827–912), não mais aninhado entre elas.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | alternar "Cliente cadastrada" / "Cliente nova" |
| Passo seguinte da jornada | ok        | o CEP do bloco novo busca e preenche Rua/Cidade |
| Mesma ação com outro dado | ok        | cliente cadastrada (Marta): cartão com Entrega e as três opções, sem o bloco de cliente nova |

**Evidência:**

- `screenshots/RT-r2-BUG-017-cliente-nova.png` — página inteira da Cliente nova: convite, e-mail e "Endereço de entrega"
- `screenshots/CH-09-r2-04-passo1.png` (sessão) — a lista de clientes em cartão
- console: nada · rede: nada

## BUG-019 · [Textos da montagem e do pedido montado] Rótulos e sinais que divergem do protótipo

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-019.md`                                      |
| Tentativas | 2 · 2 (contador em duas aberturas da folha; sinal em dois pedidos montados) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:** folha "Colar texto" (contador); passo 3 com o combinado (rótulo do valor em R$ e em %); Revisar (última linha do resumo); pedidos montados com desconto (sinal).

**Esperado:** "Desconto (%)" / "Desconto (R$)", "Total", "− R$ …", "0 / 2000".

**Observado:** contador "100 / 2000" (com espaços); rótulos "Desconto (R$)" e "Desconto (%)"; Revisar com "Subtotal · 1 peça / Desconto combinado − R$ 16,49 / **Total** R$ 148,41"; sinal U+2212 em "− R$ 10,00" e "− R$ 47,19" (o pedido do bug) no pedido montado, e em "− R$ 16,49" no Revisar.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | passo 3: resumo "Subtotal / Itens" sem desconto |
| Passo seguinte da jornada | ok        | o Total do Revisar bate com a barra (R$ 148,41) |
| Mesma ação com outro dado | ok        | dois pedidos montados com desconto: o mesmo sinal |

**Evidência:**

- `screenshots/RT-r2-BUG-019-revisar.png` — o Revisar com "Total" e "− R$ 16,49"
- `screenshots/RT-r2-BUG-019-sinal-desconto.png` — "− R$ 10,00" no pedido montado
- `screenshots/RT-r2-BUG-013-combinado-zera.png` — "Desconto (%)"
- console: nada · rede: nada

## BUG-018 · [Folha da variação] Chip escolhido, aviso de material e linha de estoque diferentes do protótipo

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-018.md`                                      |
| Tentativas | 2 · 2 (Prata 925 e Folheado a ouro)                      |
| Viewport   | 390 × 844                                                |

**Passos seguidos:** passo 2, "QA Medalha" → "QA Medalha Afetiva"; olhar o chip e o aviso; subir a quantidade para 11.

**Esperado:** chip escolhido em primária com texto on-primary; aviso de material com ícone; acima do teto, "N em estoque" vira "Só há N em estoque.".

**Observado:** chip escolhido com fundo `rgb(52,73,94)` e textos em `rgb(247,243,236)`, `aria-pressed=true`; aviso de material com ícone em primária; com 11: só "Só há 10 em estoque." sob a quantidade (a linha "10 em estoque" sumiu), "Acrescentar · R$ 1.648,90" desligado. Na outra variação, o mesmo; voltando a 1, a linha "10 em estoque" volta.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | a busca lista a peça com "20 em estoque · pede material" |
| Passo seguinte da jornada | ok        | com 1 unidade, "Acrescentar" põe uma linha na sacola e a barra mostra R$ 164,90 |
| Mesma ação com outro dado | ok        | variação "Folheado a ouro" |

**Evidência:**

- `screenshots/RT-r2-BUG-018-acima-do-estoque.png` — a linha única "Só há 10 em estoque." e o chip preenchido
- `screenshots/CH-09-r2-05-folha-variacao.png` (sessão) — chip e ícone
- console: nada · rede: nada

## BUG-016 · [Valores em dinheiro e nome da cliente] Sem a tipografia de destaque do protótipo

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-016.md`                                      |
| Tentativas | 2 · 2 (cartão, total dos itens, preço da folha e nome: CH-09 r2; total da barra: duas montagens nesta passada) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:** a parte que faltava — acrescentar uma peça e medir o total da barra fixa.

**Esperado:** totais em Libre Baskerville 700, cor primária, 18 px na barra.

**Observado:** total da barra "R$ 164,90" em Libre Baskerville 700 18 px `rgb(52,73,94)`; o mesmo no passo 3 (R$ 148,41). As outras quatro linhas da tabela do bug já estavam conferidas no CH-09 r2 (serifa 700 primária; nome 17 px 700).

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | preço da folha da variação |
| Passo seguinte da jornada | ok        | barra no Revisar com o total |
| Mesma ação com outro dado | ok        | QA Pingente Lua, R$ 219,90 |

**Evidência:**

- `screenshots/RT-r2-BUG-016-total-barra.png` — o total da barra
- `screenshots/CH-09-r2-01-montados.png`, `CH-09-r2-03-aberta.png`, `CH-09-r2-05-folha-variacao.png` (sessão)
- console: nada · rede: nada

## BUG-020 · [Medidas] Foto da peça no pedido montado, raios, espaços e botões secundários fora do protótipo

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-020.md`                                      |
| Tentativas | 2 · 2 (foto: P-0014 no CH-09 r2 e P-0040 aqui; contorno: três folhas) |
| Viewport   | 390 × 844                                                |

**Passos seguidos:** Montados (gap do cartão); P-0040 (foto; "Cancelar este pedido" → olhar "Manter" → "Manter"); passo 3 ("Em reais / Em %"); "Fechar a montagem" com algo preenchido; folha "Colar texto".

**Esperado:** foto 48 × 60; raio do segmento 8; opção desligada com borda 2 px field; gap do cartão 10; botões secundários com contorno.

**Observado:** foto 48 × 60; segmentos com raio 8 — escolhido primária com borda 2 px, desligado com `2px solid rgb(140,128,115)`; cartão de Montados com `gap: 10px`; "Manter" (com o foco inicial), "Continuar montando", "Guardar rascunho" e o "Cancelar" da folha "Colar texto" com `1px solid` primária e fundo transparente. "Manter" fecha a folha e o pedido segue Aberto.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok        | lista de Montados |
| Passo seguinte da jornada | ok        | "Descartar" fecha a montagem; "Manter" mantém o pedido |
| Mesma ação com outro dado | ok        | três folhas diferentes com o mesmo botão secundário |

**Evidência:**

- `screenshots/RT-r2-BUG-020-manter.png` — "Manter" com contorno
- `screenshots/RT-r2-BUG-020-continuar-montando.png` — "Continuar montando" e "Guardar rascunho" com contorno
- `screenshots/RT-r2-BUG-020-montados.png` — o cartão de Montados
- console: nada · rede: nada

## BUG-001 · [Pedido montado] Voltar depois de "Criar link" reabre a montagem vazia em vez de Montados

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-001.md`                                      |
| Tentativas | 2 · 1 aqui + 2 no CH-01 r2 + 1 no CH-04 r2               |
| Viewport   | 390 × 844                                                |

**Passos seguidos:** montagem para Marta Lúcia QA, QA Pingente Lua, até o Revisar → "Criar link" (P-0043) → voltar → voltar → avançar → avançar.

**Esperado:** o primeiro voltar leva a Montados com o cartão novo; a montagem não reabre.

**Observado:** 1.º voltar: `/pedidos?visao=montados`, "Montados · 9 abertos", P-0043 no topo com R$ 219,90; 2.º voltar: o pedido montado anterior do histórico; avançar: Montados e depois o P-0043. A montagem não reabre em nenhum ponto.

**Entorno:** Revisar antes do link ok (SEDEX e Retirada); o link criado mostra "Link criado." ok; mesma ação partindo de rascunho retomado ok (CH-04 r2).

**Evidência:**

- `screenshots/RT-r2-BUG-001-voltar-montados.png` — Montados com P-0043 depois do voltar
- `screenshots/CH-01-r2-06-voltar-montados.png`, `CH-01-r2-09-voltar-montados-2.png`, `CH-04-r2-06-voltar-montados.png` (sessões)
- console: nada · rede: `POST order-proposals?action=save → 200`

## BUG-002 · [Montagem · Peças] Duplo toque em "Acrescentar" põe a mesma peça duas vezes na sacola

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-002.md`                                      |
| Tentativas | 2 · 1 aqui + 2 no CH-01 r2 + 1 no CH-03 r2               |
| Viewport   | 390 × 844                                                |

**Observado:** duplo clique em "Acrescentar · R$ 219,90" (QA Pingente Lua): "Sacola · 1 peça", uma linha, barra R$ 219,90, um toast. **Entorno:** o teto de estoque somando a sacola segue valendo (CH-03 r2).

**Evidência:** `screenshots/RT-r2-BUG-002-duplo-toque.png`; `screenshots/CH-01-r2-02-duplo-toque-sacola.png`, `CH-03-r2-01-teto-soma-sacola.png` (sessões) · console: nada

## BUG-004 · [Montagem] A 200 % de fonte, cabeçalho e barra fixos cobrem a tela e escondem o campo digitado — fonte grande

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-03 Adri com a fonte grande · conta: `admin-atelie`   |
| Passos de  | `issues/BUG-004.md`                                      |
| Tentativas | 2 · 1 aqui + CH-08 r2 (390 × 500 e 320 × 568)            |
| Viewport   | 390 × 500, `font-size: 200%`                             |

**Observado:** só a barra é fixa (240–500); tocando em Nome, E-mail e WhatsApp o campo focado fica em 0–96 ou 168–264, dentro da faixa livre; `scrollWidth` 390. **Entorno:** as ressalvas do CH-08 r2 (foco programático atrás da barra, S-1; rolagem lateral de 42 px a 320 × 568 pelo rótulo "ComplementoOpcional", S-2) seguem como sugestões de backlog daquela sessão; o rótulo "ComplementoOpcional" continua colado também a 390 (visto no texto da tela nesta passada) — não é o bug.

**Evidência:** `screenshots/RT-r2-BUG-004-200-teclado.png`; `screenshots/CH-08-r2-01-teclado-200-email-visivel.png` (sessão) · console: nada

## BUG-005 · [Montagem · barra fixa] O total fica "—" no passo das peças, com peças na sacola

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-005.md`                                      |
| Tentativas | 2 · 2 aqui (R$ 164,90 e R$ 219,90) + CH-01 r2            |
| Viewport   | 390 × 844                                                |

**Observado:** com uma peça no passo 2, "Itens · 1 peça · frete à parte · R$ 164,90" (e R$ 219,90 na outra montagem); sem peças, "—". **Evidência:** `screenshots/RT-r2-BUG-016-total-barra.png`, `RT-r2-BUG-002-duplo-toque.png`; `screenshots/CH-01-r2-02-duplo-toque-sacola.png` (sessão)

## BUG-006 · [Montagem · Passo 1] O cartão da cliente escolhida não mostra o telefone nem "N pedidos na loja"

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-006.md`                                      |
| Tentativas | 2 · 2 aqui + 2 no CH-01 r2                               |
| Viewport   | 390 × 844                                                |

**Observado:** cartão "Cliente" com "Trocar": "Marta Lúcia QA Oitenta e Nove", "4 pedidos na loja", e-mail e "(51) 98888-7777". **Evidência:** `screenshots/CH-01-r2-01-cartao-cliente.png` (sessão); texto da tela nesta passada (sem screenshot própria)

## BUG-007 · [Montagem] Voltar com a folha "Sair sem criar o link?" aberta sai da montagem em vez de fechar a folha

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-007.md`                                      |
| Tentativas | 2 · 1 aqui + 2 no CH-04 r2                               |
| Viewport   | 390 × 844                                                |

**Observado:** com a cliente e uma peça, voltar → passo 1; voltar → folha "Sair sem criar o link?"; voltar → a folha fecha, passo 1, Marta e a sacola mantidas; "Continuar" segue com "Sacola · 1 peça". **Evidência:** `screenshots/RT-r2-BUG-007-folha-sair.png`; `screenshots/CH-04-r2-03-voltar-fecha-folha.png` (sessão)

## BUG-008 · [Montagem · Revisar] A prévia de entrega para CEP de Porto Alegre não mostra a Retirada no escritório

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-008.md`                                      |
| Tentativas | 2 · 2 aqui (duas montagens para Marta, CEP 90010000) + CH-01 r2 |
| Viewport   | 390 × 844                                                |

**Observado:** Entrega com "SEDEX · 1 a 2 dias úteis · R$ 14,96" e "Retirada no escritório · … Porto Alegre/RS · grátis" e "Prévia. A cliente escolhe a entrega no link.". Sem PAC: a cotação local devolve só SEDEX (ambiente, como nas rodadas anteriores). **Evidência:** `screenshots/RT-r2-BUG-019-revisar.png`; `screenshots/CH-01-r2-04-revisar-entrega.png` (sessão)

## BUG-009 · [Pedido montado · Histórico] Renovar, cancelar e concluir gravam linhas sem o que aconteceu com o link

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-009.md`                                      |
| Tentativas | 2 · 1 aqui + CH-06 r2                                    |
| Viewport   | 390 × 844                                                |

**Observado:** P-0039: "Cancelado por você · 8 nov"; P-0014: "Concluído pela cliente · pedido #0366" e "Aberto pela cliente". A linha do renovar ("Prazo renovado · link novo, o anterior parou de funcionar") foi conferida no CH-06 r2 nas renovações gravadas de P-0009 — a massa não tem Expirada para renovar ao vivo. **Evidência:** `screenshots/RT-r2-BUG-009-cancelado.png`, `RT-r2-BUG-011-concluida.png`; `screenshots/CH-06-r2-01…03` (sessão)

## BUG-010 · [Montagem] A confirmação "Peça acrescentada." não some e segue no topo até o Revisar

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-010.md`                                      |
| Tentativas | 2 · 1 aqui + CH-09 r2 passo 07                           |
| Viewport   | 390 × 844                                                |

**Observado:** "Peça acrescentada." presente 0,6 s depois do toque e ausente 4,6 s depois; no Revisar não há confirmação no topo (texto da tela). **Evidência:** medição no `evaluate` desta passada; `screenshots/RT-r2-BUG-019-revisar.png` (Revisar sem o aviso)

## BUG-011 · [Pedido montado · Concluída] A faixa não tem o tom de concluído e "Ver o pedido" fica no fim da rolagem

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-011.md`                                      |
| Tentativas | 2 · 1 aqui + CH-09 r2                                    |
| Viewport   | 390 × 844                                                |

**Observado:** P-0014: "Ver o pedido #0366" num rodapé `fixed`, 784–832 em 844; faixa done-soft/done raio 12 (CH-09 r2). **Evidência:** `screenshots/RT-r2-BUG-011-concluida.png`; `screenshots/CH-09-r2-02-concluida.png` (sessão)

## BUG-012 · [Montagem · indicador de passos] Sem os nomes dos passos e sem o destaque do passo atual

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-012.md`                                      |
| Tentativas | 2 · 1 aqui (passos 1, 3 e 4) + CH-09 r2                  |
| Viewport   | 390 × 844                                                |

**Observado:** navegação "Passos da montagem" com os rótulos "Cliente / Peças / Descontos / Revisar" visíveis nos passos 1, 3 e 4; atual em accent 4 px, título 17 / subtítulo 12 (CH-09 r2). **Evidência:** `screenshots/RT-r2-BUG-013-combinado-zera.png`; `screenshots/CH-09-r2-04-passo1.png` (sessão)

## BUG-015 · [Pedido montado · Aberta] Cartão do link, mensagem, histórico e ações com outro desenho

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Resultado  | resolved                                                 |
| Persona    | PER-01 Adri no WhatsApp · conta: `admin-atelie`          |
| Passos de  | `issues/BUG-015.md`                                      |
| Tentativas | 2 · 1 aqui (P-0040) + CH-09 r2                           |
| Viewport   | 390 × 844                                                |

**Observado:** P-0040: sobretítulo "Link para Alana", "Enviar pelo WhatsApp" em `#25D366`, "Copiar link", "Mensagem do WhatsApp" em caixa, Histórico, "Editar" e "Cancelar este pedido" — conforme as medidas do CH-09 r2 passo 04. **Evidência:** `screenshots/RT-r2-BUG-015-aberta.png`; `screenshots/CH-09-r2-03-aberta.png` (sessão)

## Achados novos no entorno

nada — nenhuma quebra nova perto dos fixes. Observações sem gravidade, para a triagem decidir se viram backlog:

- Passo 3 · cupom: apagar o código depois de "Cupom inválido." mantém a borda de erro e o `aria-invalid` até um novo "Aplicar" (perto de BUG-014; não bloqueia nada).
- Passo 1 · Cliente nova: o rótulo "Complemento" + "Opcional" sai colado ("ComplementoOpcional") no texto da tela também a 390 × 844 — já registrado como S-2 no CH-08 r2 (a 320 × 568 / 200 % causa 42 px de rolagem lateral).
