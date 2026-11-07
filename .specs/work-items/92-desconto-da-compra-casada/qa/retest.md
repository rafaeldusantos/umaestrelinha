# Reteste — WI 92 · Desconto da compra casada (rodada 3, confirmação)

| Campo     | Valor                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Rodada    | 2026-11-07 · início 16:18 · fim 16:32 (BRT)                               |
| Ambiente  | loja http://localhost:8082 · painel http://localhost:8083 · ateliê http://localhost:8084 · Supabase local :54441 · branch `feature/92`, HEAD `17ef0715` (fixes `0dfb0847` T19 e `17ef0715` T20) · Chromium headless (Playwright MCP), `*.supabase.co` e `**/g/collect*` bloqueados |
| Bugs lidos | 2 de `issues/`: BUG-006 (`still-open`) e BUG-014 (`open`)                |

Contagem: resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0

## BUG-006 · [Painel · aba Compre junto] A prévia da faixa de uma lista inclui o preço de uma peça que a loja não oferece nessa lista — para a dona

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved                                                               |
| Persona     | PER-02 Adri · conta: `admin-painel` (admin de desenvolvimento do `seed.sql`) · loja anônima num contexto isolado |
| Passos de   | `issues/BUG-006.md`                                                    |
| Tentativas  | 2 · 3 leituras da prévia a 10 % (abertura, depois de recarregar, depois de digitar 20 % e voltar a 10 %) |
| Viewport    | 1440 × 900                                                             |

**Passos seguidos:**

1. Painel, `/admin/produtos/<id de QA Pingente Estrela>/editar`, aba "Compre junto". O adicional 1 é a lista "QA Correntes" a 10 %, o adicional 2 é o QA Berloque Coração avulso a 15 %
2. Ler a prévia do adicional 1
3. Loja anônima, `/produtos/qa-pingente-estrela`, "Ver os 3 modelos" de QA Correntes, e abrir as opções da Banhada (70 e 80 cm) e da Cartier

**Esperado:** a faixa da prévia é a das peças que a loja oferece dentro dessa lista com essa joia, e o preço levando junto na loja é o da prévia.

**Observado:** a prévia diz **"As peças de QA Correntes saem de R$ 80,91 a R$ 125,91 com esta joia."** nas três leituras. Na loja a lista tem 3 modelos: QA Corrente Veneziana "de R$ 89,90 por R$ 80,91" (o piso), QA Corrente Cartier "de R$ 119,90 por R$ 107,91" (a loja só oferece "Com gravação · Não", 45 e 60 cm) e QA Corrente Veneziana Banhada "de R$ 129,90 por R$ 116,91" em 70 cm e "de R$ 139,90 por R$ 125,91" em 80 cm (o teto). A QA Corrente Esgotada (R$ 71,91) e o Berloque avulso (R$ 62,91) não entram mais no piso. Com 20 % digitado e não salvo, a prévia passa a "de R$ 71,92 a R$ 111,92" (89,90 × 0,8 e 139,90 × 0,8), a mesma faixa. Nada foi salvo nessa leitura, e no banco o adicional seguiu em 10 %.

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | a lista e os percentuais carregam gravados (10 % e 15 %) |
| Passo seguinte da jornada    | ok                 | o bloco da loja mostra os preços da faixa: piso R$ 80,91 e teto R$ 125,91 |
| Mesma ação com outro dado    | ok                 | QA Pingente Lua, mesma lista, 10 % digitado e não salvo: "de R$ 80,91 a R$ 278,91". Na loja da Lua a lista tem 4 modelos (Veneziana, Cartier, QA Pingente Estrela, Banhada). O Berloque é avulso lá também e fica fora da lista, e o teto é o QA Pingente Estrela de R$ 309,90 × 0,9. O campo voltou a vazio sem salvar. A peça avulsa (Berloque) a 15 %: "R$ 59,42 a R$ 63,67", e a loja mostra R$ 59,42 |

**Evidência:**

- `screenshots/RT3-retest-BUG-006-previa-10.png`: a prévia "de R$ 80,91 a R$ 125,91" da lista QA Correntes
- `screenshots/RT3-retest-BUG-006-loja-lista.png`: a lista na loja com 3 modelos, o menor por R$ 80,91, sem a Esgotada
- `screenshots/RT3-retest-BUG-006-previa-20-nao-salvo.png`: a prévia com 20 % digitado, "de R$ 71,92 a R$ 111,92"
- `screenshots/RT3-retest-BUG-006-lua-10-nao-salvo.png` e `screenshots/RT3-retest-BUG-006-lua-loja.png`: o mesmo adicional na QA Pingente Lua, no painel e na loja
- console: nada (só os avisos de future flag do React Router) · rede: nada

## BUG-014 · [Pedido recalculado] Com cupom, depois de o desconto subir, a linha do cupom fica no valor antigo e o resumo não fecha com o Total

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved                                                               |
| Persona     | PER-04 Helena · conta: `cliente-loja` (código pelo Mailpit) · PER-02/PER-03 Adri · conta: `admin-painel` |
| Passos de   | `issues/BUG-014.md`                                                    |
| Tentativas  | 2 · 2 pedidos: #0386 (15 % → 25 %) e #0387 (25 % → 30 %)               |
| Viewport    | 390 × 844 (loja e app do ateliê) · 1440 × 900 (painel e e-mail)        |

**Passos seguidos:**

1. Com a conta `cliente-loja`, sacola vazia, abrir `/produtos/qa-pingente-estrela`, marcar o QA Berloque Coração (Prata 925) no bloco e "Levar o conjunto"
2. Aplicar o cupom QA92CUPOM15, ir ao checkout (frete padrão, PIX) e criar o pedido. **#0386**: Subtotal R$ 329,80 · Compre Junto −R$ 10,48 · Cupom −R$ 47,90 · PIX −R$ 19,00 · Frete R$ 19,90 · Total R$ 272,32, como no bug
3. No painel, aba Compre junto do QA Pingente Estrela, Berloque de 15 % para 25 % e salvar
4. Na loja, abrir `/pedido/<id>/pagamento`. O valor passa a R$ 266,80
5. Abrir `/pedido/<id>`, o painel do pedido, o app do ateliê e a prévia do e-mail "Pedido recebido" com o ID do pedido, e somar as linhas

**Esperado:** o cupom é recalculado sobre o subtotal já com o novo desconto do Compre Junto, e as linhas fecham com o Total em todas as telas. Com 25 %: Cupom −R$ 46,85 e Total R$ 266,80.

**Observado:** nas quatro superfícies do #0386, o resumo é "Subtotal R$ 329,80 · Desconto do Compre Junto −R$ 17,47 · Cupom QA92CUPOM15 −R$ 46,85 · Desconto PIX −R$ 18,58 · Frete R$ 19,90 · Total R$ 266,80", e 329,80 − 17,47 − 46,85 − 18,58 + 19,90 = 266,80. O e-mail traz "QA Berloque Coração · Compre Junto · 25% a menos R$ 69,90 → R$ 52,43" e "Cupom −R$ 46,85", com os dados reais do pedido. O banco local passou de `discount 47.90 · buy_together_discount 10.48 · total 272.32` para `discount 46.85 · buy_together_discount 17.47 · total 266.80`.
Na segunda tentativa, o **#0387** foi criado a 25 % (R$ 266,80) e o Berloque subiu para 30 %. O pagamento mostrou R$ 264,03. `/pedido/<id>` e o painel mostram "−R$ 20,97 · Cupom −R$ 46,32 · PIX −R$ 18,38 · Frete R$ 19,90 · Total R$ 264,03", e 329,80 − 20,97 − 46,32 − 18,38 + 19,90 = 264,03. O cupom é 15 % de 308,83 e o PIX é 7 % de 262,51. O banco tem `discount 46.32` e `total 264.03`.

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok                 | a sacola (cupom −R$ 47,90 = 15 % de 319,32) e o checkout (R$ 272,32) batem antes do recálculo. A 25 %, a sacola nova dá −R$ 46,85 e o checkout R$ 266,80 |
| Passo seguinte da jornada    | ok                 | o painel, o app do ateliê (`scrollWidth` 390) e a prévia do e-mail repetem as linhas da loja. `/pedido/:id` sem rolagem horizontal em 390 |
| Mesma ação com outro dado    | ok                 | #0387, de 25 % para 30 %: as linhas fecham com R$ 264,03 na loja e no painel |

**Evidência:**

- `screenshots/RT3-retest-BUG-014-loja-0386-390.png`: `/pedido/:id` do #0386 com Cupom −R$ 46,85 e Total R$ 266,80
- `screenshots/RT3-retest-BUG-014-painel-0386.png`: o painel do mesmo pedido, com as mesmas linhas
- `screenshots/RT3-retest-BUG-014-atelie-0386-390.png`: o app do ateliê, com o mesmo resumo
- `screenshots/RT3-retest-BUG-014-email-0386.png`: a prévia do e-mail "Pedido recebido" do #0386
- `screenshots/RT3-retest-BUG-014-loja-0387-30-390.png`: `/pedido/:id` do #0387 depois de 30 %, fechando com R$ 264,03
- console: o erro esperado do PIX ("At least one policy returned UNAUTHORIZED", chave do Mercado Pago inválida de propósito) e um 429 em `/auth/v1/otp` ao pedir o código duas vezes seguidas · rede: nada além disso

## Achados novos no entorno

nada

Observações que não viraram achado:

- O **#0381** da rodada anterior (de outra conta, recalculado antes do fix) continua gravado com `discount 47.90` e `total 266.80`. É um dado anterior ao fix. Pela conta da Helena a loja diz "Pedido não encontrado", e por isso não foi reaberto. Pedidos recalculados depois do fix fecham.
- Ao sair das páginas de edição de QA Pingente Estrela Guia e QA Medalha Afetiva sem mexer em nada, o painel abriu o aviso "alterações não salvas" (`beforeunload`). Já está registrado no `CLAUDE.md` como anterior à feature 85 ("Alterações não salvas" ao abrir) e não tem relação com os fixes.
