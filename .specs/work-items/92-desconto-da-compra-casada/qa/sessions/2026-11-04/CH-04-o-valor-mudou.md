# Sessão CH-04 · Quando o desconto muda no caminho, ninguém paga a mais e todos sabem como seguir

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-o-valor-mudou.md` · exploratório · P0        |
| Status      | done                                                                   |
| Persona     | PER-04 Helena · conta: `cliente-loja` (helena.qa@exemplo.com, código pelo Mailpit) · o painel em contexto isolado com `admin-painel` (usuário de dev do `supabase/seed.sql`, valor não registrado) |
| Tour · modo | Interrupt · por cenário                                                |
| Rodada      | exploração                                                             |
| Orçamento   | 49 ações de browser de 50                                              |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto · Chromium (Playwright MCP headless) · viewport 390 × 844 |
| Paridade    | Mercado Pago e Melhor Envio com chaves inválidas (create-payment passa a guarda e falha no MP com 400 "At least one policy returned UNAUTHORIZED."; frete padrão R$ 19,90); `*.supabase.co` e `**/g/collect*` bloqueados; o código de login lido pela API do Mailpit (caixa de e-mail, não o app) para poupar ações |

## Missão

Interromper a compra no meio — fechar a aba, voltar no dia seguinte pelo link ou por Minha conta — enquanto o
desconto muda, e confirmar que a cliente nunca é cobrada a mais, lê que nada foi cobrado e tem um próximo passo.

## Premissas

- O percentual mudado é o do adicional 2 de P ("QA Berloque Coração", avulso, 15 % na massa), pela aba **Compre junto** do produto no painel. Sequência aplicada: 15 → 5 → 25 → 30 → vazio. Cada valor foi conferido **relendo a aba depois de recarregar**. **Estado final: o Berloque de P está SEM percentual** — a thread reaplica a massa.
- O "pedido feito" do TC-FUNC-029 é o #0365, regravado pelo create-payment (D: o pedido pendente é recalculado a cada tentativa). Não havia pedido pago dela disponível.
- "Sair da conta": a loja não mostrou botão "Sair" em `/conta` na leitura feita; o browser era em memória (`--isolated`) e foi fechado.

## Pedidos criados nesta sessão

| Pedido | Como | Estado ao fim |
| --- | --- | --- |
| #0364 (`4583eef9…`) | P (Prata 925 · Não) + Berloque Prata 925 a 15 %, PIX, R$ 316,87; o create-payment recusou (422) depois de o Berloque cair para 5 % | pendente, R$ 316,87 (não recalculado) |
| #0365 (`4bc24dd6…`) | criado por "Confirmar com o novo total" (5 %), R$ 323,37; regravado pelo create-payment a 25 % (R$ 310,37) e depois a 30 % (R$ 307,11) | pendente, R$ 307,11, Berloque a 30 % |

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Na página de P, marcou o Berloque (15 %), escolheu Prata 925 e tocou "Levar o conjunto" | Primeiro toque: "Falta uma escolha em 1 peça" (variação do Berloque). Depois, gaveta: Berloque "R$ 69,90 R$ 59,42 · Acompanha o QA Pingente Estrela · 15% a menos", Desconto do Compre Junto −R$ 10,48, Total R$ 319,32 | — |
| 02 | Foi ao checkout, entrou por código (helena.qa), completou nome e WhatsApp, escolheu PIX | Resumo: Subtotal 329,80 · Frete 19,90 · Desconto do Compre Junto −10,48 · PIX −22,35 · Total R$ 316,87 | `screenshots/CH-04-02-checkout-15.png` |
| 03 | (painel, outro contexto) Berloque de P: 15 → 5 % e Salvar | Aba relida mostrou 5 | — |
| 04 | Tocou "Pagar R$ 316,87 com PIX" | `create-order 200` (#0364) e `create-payment 422 {"code":"buy_together_price_changed","displayed_total":316.87,"total":323.37,"piece":"QA Berloque Coração"}`. Na tela, `role="alert"`: "O valor do seu pedido mudou" / "Desde que você montou a sacola, o desconto do Compre Junto do QA Berloque Coração mudou. Por isso o pagamento não seguiu. Nada foi cobrado." / Antes R$ 316,87 / Agora R$ 323,37 / "Confirmar com o novo total" / "Voltar à sacola". O resumo do topo já dizia R$ 323,37 | `screenshots/CH-04-04-valor-mudou-checkout.png` |
| 05 | Duplo clique em "Confirmar com o novo total" | Um só `create-order` (#0365) e um `create-payment` que passou a guarda (falha 400 do MP local). `/pedido/…/pagamento`: "PEDIDO #0365 · AGUARDANDO PAGAMENTO", R$ 323,37, "nada foi cobrado" | `screenshots/CH-04-05-pedido-0365-novo-total.png` |
| 06 | Abriu Minha conta | "Pagamento pendente · Pedido #0364 · R$ 316,87 · Pagar com PIX" (e #0365 R$ 323,37, mais #0362/#0363 de CH-03) | — |
| 07 | Tocou "Pagar com PIX" no #0364 | `create-payment 422 buy_together_price_changed`. Tela: "PEDIDO #0364" / "O valor deste pedido mudou" / "Depois que este pedido foi feito, o desconto de uma das peças mudou, e o pagamento não pode seguir pelo valor de antes. Nada foi cobrado." / "Fale comigo para combinarmos como seguir com o seu pedido." / "Falar pelo WhatsApp" (wa.me com texto) e "Escrever por e-mail" (mailto). Recarregar: o mesmo aviso, de novo 422 | `screenshots/CH-04-07-pedido-0364-valor-mudou.png` |
| 08 | (painel) Berloque de P: 5 → 25 % | relido 25 | — |
| 09 | Voltou à página de P e abriu a sacola | Berloque "R$ 69,90 R$ 52,43 · 25% a menos", Desconto −R$ 17,47, Total R$ 312,33 (relido) | `screenshots/CH-04-09-sacola-25.png` |
| 10 | Abriu o link `/pedido/<#0365>/pagamento` direto (deep link) | `create-payment` sem 422 (passou a guarda; 400 do MP local). A tela mostrou **R$ 323,37** "valor do pedido, ainda não cobrado" | — |
| 11 | Abriu `/pedido/<#0365>` | Pedido regravado a 25 %: Berloque R$ 52,43, Desconto do Compre Junto −R$ 17,47, PIX −R$ 21,86, Total **R$ 310,37** — diferente dos R$ 323,37 do passo 10 (A-1) | — |
| 12 | (painel 25 → 30 %) e reabriu `/pedido/<#0365>/pagamento` | Sem 422; a tela mostrou **R$ 310,37**; o pedido em `/pedido/<#0365>` passou a R$ 307,11 (30 %). A-1 reproduziu | `screenshots/CH-04-12-pagamento-valor-velho.png` |
| 13 | (painel) apagou o percentual do Berloque de P | relido vazio | — |
| 14 | (painel) abriu o pedido #0365 | Berloque "R$ 69,90 R$ 48,93", Desconto do Compre Junto −R$ 20,97, Total R$ 307,11 — inalterado | — |
| 15 | Recarregou `/pedido/<#0365>` e Minha conta | "Acompanha o QA Pingente Estrela · 30% a menos", R$ 48,93, Total R$ 307,11; conta "Pedido #0365 · R$ 307,11" | `screenshots/CH-04-15-pedido-0365-apos-apagar.png` |

**Edge cases tentados:**

- Duplo clique em "Confirmar com o novo total" — um pedido só (#0365).
- Recarregar a tela do aviso do pedido (#0364) — mesmo aviso, sem cobrança.
- Deep link `/pedido/:id/pagamento` aberto direto (#0365) — passou a guarda quando ficou mais barato.
- Voltar depois do aviso / "Voltar à sacola" — **não** tentado (orçamento).
- Abrir o link do pedido deslogada (convidada com token) — **não** tentado.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-005 | pass | 02–05 | `screenshots/CH-04-04-valor-mudou-checkout.png`, `CH-04-05-pedido-0365-novo-total.png` | 15 % → 5 % entre o resumo e o pagamento; aviso com as frases, Antes/Agora e os dois botões; o duplo clique criou um pedido só, pelo "Agora". Caminho "Voltar à sacola" (J-04a) e a variação "percentual apagado" não exercidos |
| TC-JOURNEY-006 | pass | 06–07 | `screenshots/CH-04-07-pedido-0364-valor-mudou.png` | via Minha conta; recarregar repete o aviso. Variação convidada pelo link não exercida |
| TC-FUNC-023 | pass | 09 | `screenshots/CH-04-09-sacola-25.png` | reaberta a sacola, 25 % relido; o passo de 5 % na sacola não foi conferido isolado (no checkout o resumo foi recalculado para 5 % depois do 422) |
| TC-FUNC-025 | pass | 10–12 | `screenshots/CH-04-12-pagamento-valor-velho.png` | subir 5 → 25 → 30 %: o pagamento segue sem aviso e o pedido é regravado mais barato. Caminho 2 (promoção maior ligada) não exercido. A tela de pagamento mostra o valor anterior (A-1) |
| TC-FUNC-029 | pass | 13–15 | `screenshots/CH-04-15-pedido-0365-apos-apagar.png` | apagado o percentual, o pedido #0365 segue a 30 % / R$ 307,11 na loja, em Minha conta e no painel |
| TC-INT-003 | pass | 04, 07 | `screenshots/CH-04-04-valor-mudou-checkout.png` | 422 `buy_together_price_changed` na rede, "Nada foi cobrado." na tela; a ausência de order no MP é do probe 03 (não conferida aqui). Variação "promoção sai" não exercida |

Contagem: pass 6 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Pagamento do pedido] a tela mostra o valor de antes do recálculo quando o pedido ficou mais barato — para a cliente que paga depois

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Helena                                                         |
| Jornada e passo     | J-04, ramo J-04c (pagar depois de o desconto subir) · passos 10–12 do log |
| TC                  | TC-FUNC-025                                                           |
| Gravidade proposta  | low — ela nunca paga a mais (o pedido gravado é o menor), mas lê um valor maior do que o que vai ser cobrado e a frase "com o mesmo valor" |
| Reproduziu          | sim (2 de 2: 323,37 × 310,37 e 310,37 × 307,11)                       |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Como `cliente-loja`, montar P + "QA Berloque Coração" (adicional de P com percentual X) e criar um pedido PIX (ou usar um pendente).
2. No painel, subir o percentual do Berloque na aba Compre junto de P (ex.: 25 → 30 %) e salvar.
3. Abrir `/pedido/<id>/pagamento` desse pedido.
4. Abrir `/pedido/<id>`.

**Esperado:** a tela de pagamento mostra o valor pelo qual o pedido vai ser cobrado (o recalculado, igual ou menor) — **fonte:** `prd.md` CA-04.3 ("o pagamento segue" pelo valor recalculado); TC-FUNC-025 ("o pedido gravado pelo valor recalculado").

**Observado:** `/pedido/<id>/pagamento` mostra "R$ 310,37 · valor do pedido, ainda não cobrado" e "Você também pode pagar depois: o pedido fica em Minha conta → Pedidos, com o mesmo valor."; `/pedido/<id>` e o painel mostram o pedido regravado por R$ 307,11. Na 1ª vez: 323,37 na tela × 310,37 gravado. No local a tela é a de falha do MP; não foi possível ver se o QR do caminho feliz traz o valor certo.

**Evidência:**

- `screenshots/CH-04-12-pagamento-valor-velho.png` — a tela de pagamento com R$ 310,37 enquanto o pedido já está em R$ 307,11
- console: nada relevante
- rede: `POST /mercado-pago?action=create-payment → 400` (MP local), sem 422

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A tela "O valor deste pedido mudou" (link / Minha conta) só oferece WhatsApp e e-mail: não tem caminho de volta ao pedido, à conta nem à sacola, nem mostra o valor de antes/agora; e Minha conta segue listando o #0364 em "Precisa da sua atenção · Pagar com PIX", que leva sempre ao mesmo aviso | 07 | polimento |
| Depois do 422 no checkout, o resumo do topo já passa a mostrar o "Agora" (R$ 323,37) e o botão "Pagar R$ 323,37 com PIX" fica visível ao lado de "Confirmar com o novo total" — duas ações para a mesma coisa | 04 | polimento |
| O pedido recusado (#0364) fica pendente para sempre no valor antigo, ao lado do pedido novo (#0365) criado pelo "Confirmar com o novo total" — a cliente fica com dois pedidos pendentes do mesmo conjunto | 05–06 | pré-existente (D-34 decide criar outro pedido; o destino do antigo não é definido) |

## Fora da cobertura

- "Voltar à sacola" a partir do aviso e voltar (navegador) depois do aviso — orçamento.
- Variação "percentual apagado" no TC-JOURNEY-005 e "promoção maior" / "promoção sai" (TC-FUNC-025 caminho 2, TC-INT-003 variação) — orçamento.
- Fechar e reabrir a aba no checkout com o aviso; convidada abrindo o link do pedido deslogada (token) — orçamento.
- A ausência de order no Mercado Pago — fora do alcance do browser (probe `03` do Dev).
- O caminho feliz do QR com o valor recalculado — o MP local falha depois da guarda.

## Debrief

- **Surpresas:** "Entrar" no topo do checkout abriu o Google OAuth na primeira tentativa (o clique caiu em "Continuar com Google" do overlay); a conta da Helena pediu "Como posso te chamar?" ao entrar e o bloco Contato veio vazio. Não registrados como achado (fora da Mudança, não decidem a jornada).
- **Próximo charter:** o ramo "Voltar à sacola" e o da promoção que sai entre criação e pagamento (`promotion_no_longer_valid`) merecem uma sessão curta.
- **Padrão novo:** abrir `/pedido/:id/pagamento` e depois `/pedido/:id` em sequência, depois de mexer no desconto, compara o valor exibido com o gravado — foi o que achou A-1.
