# Sessão CH-07 · No app do ateliê, o pedido diz que houve desconto do Compre Junto e quanto

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-app-do-atelie.md` · exploratório · P1       |
| Status      | done                                                                   |
| Persona     | PER-03 Adri (ateliê) · conta: `admin-painel` — `QA_ADMIN_PAINEL_*` não definidas; premissa da thread: o usuário de desenvolvimento de `supabase/seed.sql` (seção 5, só local). Senha não registrada aqui |
| Tour · modo | Feature · livre (confirmação: só os TC e o entorno das correções)      |
| Rodada      | confirmação (rodada 2)                                                 |
| Orçamento   | 9 ações de browser de 13 (duas foram tentativas que falharam: a primeira por erro no script, a segunda porque a busca procurava só em "Precisa de ação"; os passos de voltar, buscar e abrir foram agrupados em `run_code`) |
| Ambiente    | ateliê http://localhost:8084 · painel http://localhost:8083 (só para comparar) · build não exposto · Chromium (Playwright MCP, headless) · viewport 390×844 |
| Paridade    | fonte do sistema simulada pelo `font-size` da raiz (200 %); `*.supabase.co` e `**/g/collect*` bloqueados por rota; pedidos sintéticos do banco local |

## Missão

Abrir no celular os pedidos com desconto e confirmar que a Adri reconhece cada peça, vê o desconto e o mesmo Total
do painel, na mesma ordem, sem nada estourando a tela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no app e abriu a aba Pedidos; buscou "0373" | Em "Precisa de ação": "Nenhum pedido com “0373”" (o pedido está aguardando pagamento); na visão "Tudo" ele aparece | — |
| 02 | Abriu o #0373 (Compre Junto + oferta, PIX) | Itens: Pingente 1 × R$ 259,90; Berloque 1 × R$ 59,42 "De R$ 69,90, por R$ 59,42"; Veneziana 1 × R$ 71,92 "De R$ 89,90, por R$ 71,92". Valores: Subtotal R$ 419,70 · Compre Junto − R$ 10,48 · Oferta − R$ 17,98 · PIX − R$ 27,39 · Frete · Frete padrão R$ 19,90 · Total R$ 383,75. Soma confere. `scrollWidth` 390 | `screenshots/CH-07-r2-0373-390.png` |
| 03 | Voltou e abriu o #0375 (Cartier ×2, progressivo, oferta) | Subtotal R$ 589,60 · Compre Junto − R$ 11,99 · Progressivo − R$ 59,95 · Oferta − R$ 17,98 · PIX − R$ 34,98 · Frete R$ 19,90 · Total R$ 484,60. Soma confere | `screenshots/CH-07-r2-0375-390.png` |
| 04 | Voltou e abriu o #0376 (Compre Junto + cupom) | Subtotal R$ 329,80 · Compre Junto − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · PIX − R$ 19,00 · Frete R$ 19,90 · Total R$ 272,32. Soma confere | `screenshots/CH-07-r2-0376-390.png` |
| 05 | Entorno de BUG-007: abriu o #0220 (montado pelo painel, desconto combinado) | Subtotal R$ 1.071,00 · Cupom PROVA89 − R$ 107,10 · **Desconto combinado − R$ 20,00** · PIX − R$ 66,07 · Frete · SEDEX R$ 24,03 · Total R$ 901,86. Soma confere (1.071,00 − 107,10 − 20,00 − 66,07 + 24,03 = 901,86) | `screenshots/CH-07-r2-0220-390.png` |
| 06 | Fonte a 200 % no #0375 (o resumo mais longo) | `scrollWidth` 390; nenhum elemento do `main` passa da borda | `screenshots/CH-07-r2-0375-fonte-200.png` |
| 07 | Abriu os quatro pedidos no painel (390) para comparar | Painel, mesmos valores, linhas e ordem nos quatro (Subtotal · descontos · PIX · Frete · Total). Única diferença de texto: no #0220 o painel diz "Desconto combinado — Cliente antiga", o app diz só "Desconto combinado" | `screenshots/CH-07-r2-painel-0375-390.png` |
| 08 | Saiu das duas contas e fechou o browser | `/pedidos` → `/login`; `/admin/pedidos` → `/admin/login` | — |

**Edge cases tentados:** fonte a 200 % (#0375); voltar à lista e reabrir (três vezes). Nenhum edge case novo (rodada de confirmação).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-031 | pass | 02–04, 07 | `screenshots/CH-07-r2-0373-390.png` · `screenshots/CH-07-r2-0376-390.png` · `screenshots/CH-07-r2-painel-0375-390.png` | A ordem agora é a do painel (D-38): Subtotal · descontos · PIX · Frete · Total. Itens com "De/por" e valores iguais aos do painel. Variação com cupom (#0376): o cupom fica entre o Compre Junto e o PIX |
| TC-JOURNEY-008 | pass | 01–07 | `screenshots/CH-07-r2-0375-390.png` · `screenshots/CH-07-r2-0375-fonte-200.png` | Chega ao pedido, vê o desconto do Compre Junto, o mesmo Total e a mesma ordem do painel; a 200 % sem rolagem horizontal |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

Sugestão de backlog (não é regressão nem critical/high): no #0220 o app mostra "Desconto combinado" sem o motivo que o painel mostra ("— Cliente antiga"). O valor e o Total batem; só falta o nome do desconto para a Adri reconhecer qual foi. Passo 05 e 07, `screenshots/CH-07-r2-0220-390.png`.

## Spec-gaps

nada

## Fora da cobertura

- A pesquisa na visão padrão "Precisa de ação" não acha pedido aguardando pagamento; usei "Tudo". Comportamento anterior, não explorado (rodada de confirmação).
- Fonte a 130 %, giro do celular e rede caindo: passaram na rodada 1 e não foram repetidos (confirmação; orçamento).
- Pedido antigo (M-06): coberto na rodada 1, não repetido.
- Fonte do sistema de verdade (Android) e TalkBack — fora do alcance do browser.

## Debrief

- **Surpresas:** nada.
- **Próximo charter:** nada.
- **Padrão novo:** nada.
