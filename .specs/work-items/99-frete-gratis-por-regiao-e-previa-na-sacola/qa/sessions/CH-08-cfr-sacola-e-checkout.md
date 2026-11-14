# Sessão CH-08 · CFR — a sacola com frete e o checkout

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-08-cfr-sacola-e-checkout.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | — |
| Rodada      | confirmação (rodada 2) — TC-CFR-001 e o entorno do BUG-003 |
| Orçamento   | 18 ações de browser de 18 (a preparação — `open about:blank`, `resize`, as rotas — e o `close` final fora da conta) |
| Ambiente    | http://localhost:8092 (worktree do WI 99) · build não exposto (dev server) · Chromium headless do `playwright-cli` 0.1.24 · viewport 390 × 844 · fonte da raiz 16 px (100 %) e 32 px (200 %) |
| Paridade    | dev server, não build de produção · cotação do Melhor Envio interceptada com a fixture A (com CORS) · `*.supabase.co` e `/g/collect` bloqueados · configuração vigente: frete grátis ligado, R$ 450,00, Sul + Sudeste · 200 % simulado por `font-size` da raiz (px fixo não cresce) |

## Missão

Refazer J-01 e J-02 como auditoria e medir o que a Validation não pôde: o rodapé da gaveta cabendo na tela do
celular, os alvos de toque, o ⓘ acessível e o balão dentro da gaveta, e nada cortado com a fonte grande.

Nesta rodada de confirmação: só o TC-CFR-001 por inteiro e o entorno da correção do BUG-003 (rodapé
CartDrawer/CartShipping, faixa e ⓘ). TC-CFR-002/003 passaram na rodada 1 e não foram refeitos.

## Passos

Todas as medidas saem do DOM (`getBoundingClientRect`, `clientHeight`/`scrollHeight`, `scrollWidth`), não da
imagem. "Rodapé" = o bloco fixo da gaveta que vai da prévia de frete até "Finalizar Pedido". "Nota abaixo do
Total" = qualquer `p`/`small` com texto abaixo do termo "Total" no rodapé, fora do botão.

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Abrir o "Pingente afetivo bebê na barriga com cabelo" a 390 × 844, fechar o aviso de cookies, rolar ~700 px e tocar em "Adicionar à sacola" | A página do produto demorou a montar o conteúdo (o primeiro snapshot só tinha rodapé e cookies; esperei o botão); a gaveta "Sua sacola" abriu com 1 item, faixa "Faltam R$ 170,10 para o frete grátis", ⓘ "Sobre o frete grátis" com nome acessível, barra `progressbar` "Progresso para o frete grátis", "Complete o frete grátis" | — |
| 02 | Ver o rodapé sem CEP, a 100 % | Rodapé **245 px** (`clientHeight` 244; t 599, b 844) — na régua de apoio ~244; nenhuma nota abaixo do Total; `scrollWidth` do documento 390 e da gaveta 390; alvos: campo CEP 257×44, "Calcular" 85×44, "Tem um cupom?" 390×44, "Finalizar Pedido" 350×48 | `screenshots/CH-08-r2-01-sem-cep-100.png` |
| 03 | Digitar 01310-100 e tocar em "Calcular" | "Trocar CEP", grupo de rádio "Forma de envio" com PAC R$ 21,40 (marcado) e SEDEX R$ 38,90; faixa segue "Faltam R$ 170,10"; nos totais "Frete · PAC" | — |
| 04 | Com as opções abertas, medir a 100 % e a 200 % | **100 %:** rodapé 374 px (t 470, b 844), na tela, sem rolar por dentro (sh 373 = ch 373); nenhuma nota; nada cortado; `scrollWidth` 390/390; opções 350×56, cupom 390×44, Finalizar 350×48; "Trocar CEP" visível 66×20 (já conhecido da rodada 1, área ampliada por `::before`). **200 %:** rodapé 608 px (t 236, b 844), **rola por dentro** (sh 703 > ch 607, `overflow-y: auto`) — "Finalizar Pedido" fica abaixo da dobra do rodapé e é alcançado rolando o rodapé; nenhuma nota; nenhum texto com o CEP ou um valor `R$` com `scrollWidth > clientWidth`, reticências ou passando da borda da gaveta; gaveta sem rolagem lateral (sw 390); documento 435 (cabeçalho da loja, conhecido pelo charter); opções 310×120 e 310×138, cupom 390×88, Finalizar 310×96. Fonte voltou a 100 % | — |
| 05 | Tocar no PAC para recolher a lista e medir a 100 % e a 200 % | **100 %:** rodapé **266 px** (`clientHeight` 265; t 578, b 844) ≤ 270; nenhuma nota abaixo do Total; `scrollWidth` documento 390, gaveta 390; linha recolhida "Frete: PAC, R$ 21,…" 390×65, cupom 390×44, Finalizar 350×48. **200 %:** rodapé 442 px (t 402, b 844), dentro da tela sem precisar rolar (sh 441 = ch 441), Finalizar termina em y 820; nenhuma nota; CEP e valor sem corte nem reticências; gaveta sw 390; documento 435 (cabeçalho, conhecido); linha recolhida 390×97, cupom 390×88, Finalizar 310×96. Console: 0 erros | — |

**Edge cases tentados:** fonte da raiz a 200 % com as opções abertas (o que faltou na rodada 1) e com o frete
recolhido.

## Casos

| TC         | Veredito | Passo | Evidência | Nota |
| ---------- | -------- | ----- | --------- | ---- |
| TC-CFR-001 | pass     | 02, 04, 05 | `screenshots/CH-08-r2-01-sem-cep-100.png` · DOM (passos 04 e 05) | Passo 1: 245 px, sem nota. Passo 2: **266 px ≤ 270** (BUG-003 confirmado corrigido; rodada 1: 276), sem nota, `scrollWidth` 390. Passo 3: 374 px, na tela, sem nota. Passo 4 a 200 %: recolhido 442 px sem corte; aberto 608 px rolando por dentro sem corte; a gaveta não rola de lado. Alvos do rodapé ≥ 44 px em altura, exceto o "Trocar CEP" (20 px visíveis, área ampliada; conhecido). Variações 130 % e com cupom não rodadas |
| TC-CFR-002 | skip     | — | — | passou na rodada 1; fora da confirmação pelo briefing |
| TC-CFR-003 | skip     | — | — | passou na rodada 1; fora da confirmação pelo briefing |

Contagem: pass 1 · fail 0 · blocked 0 · skip 2

## Achados

nada

## CFR

| Jornada | Categoria             | Marca | Itens que não passaram | Achado |
| ------- | --------------------- | ----- | ---------------------- | ------ |
| J-01    | Compatibilidade       | pass  | rodapé 266 px a 100 %; 200 % sem corte, rolando por dentro só com as opções abertas; a gaveta não rola de lado (o documento rola 45 px a 200 % pelo cabeçalho da loja — pré-existente, conhecido pelo charter) | — |
| J-01    | Usabilidade           | pass  | nenhuma nota abaixo do Total em nenhum estado medido | — |
| J-01    | Acessibilidade        | pass  | ⓘ com nome "Sobre o frete grátis", faixa com `progressbar` nomeada, opções como `radio` num `radiogroup` "Forma de envio"; alvos do rodapé ≥ 44 px de altura, exceto o "Trocar CEP" (visível 20 px — o mesmo da rodada 1, área ampliada ≥ 37 px confirmada lá, 44 não confirmado; sem mudança) | — |

**Categorias fora:** Performance percebida, Recuperação de erro e J-02 — rodada de confirmação, só o TC-CFR-001
e o entorno do BUG-003; Paridade com produção vai no cabeçalho.

## Spec-gaps

nada

## Fora da cobertura

- TC-CFR-001, variações 130 % e "com cupom" — orçamento de 18 ações (a carga lenta da página do produto custou uma espera e um snapshot a mais).
- Screenshot dos estados recolhido (100 % e 200 %) e aberto a 200 % — orçamento; a prova é a medida do DOM nos passos 04 e 05.
- Balão do ⓘ (abrir, posição dentro da gaveta) no entorno — orçamento; o BUG-004 tem reteste próprio.
- A presença do CEP na linha recolhida não foi conferida à parte: a checagem de corte cobriu todo texto do rodapé com "01310" ou "R$", e nenhum estava cortado.
- Safari/Firefox e leitor de tela real — só o Chromium do driver.

## Debrief

- **Surpresas:** a página do produto no 8092 montou o conteúdo com atraso (o primeiro snapshot veio só com rodapé e cookies); a linha recolhida a 200 % caiu de 129 px (rodada 1) para 97 px, e o rodapé recolhido a 200 % de 460 para 442 px.
- **Próximo charter:** nada
- **Padrão novo:** nada
