# Sessão CH-08 · CFR da campanha na loja

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-08-cfr.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-04 Rosa · conta: anonima |
| Tour · modo | — |
| Rodada      | exploração |
| Orçamento   | 40 ações de browser de 40 (mais o `close` de saída) |
| Ambiente    | http://localhost:8092 · build não exposto (`pnpm dev`) · Chromium headless (agent-browser 0.39.1) · viewports 390 × 844 (fonte 100 % e 200 %) · 1440 × 900 (100 % e 200 %, teclado) |
| Paridade    | build de dev (`pnpm dev`); banco e functions locais com chaves externas inválidas; `*.supabase.co` e `**/g/collect*` bloqueados por rota (fotos podem faltar); campanha vigente "Dia das Mães" (a "Black Friday" do charter foi encerrada no CH-06); fonte a 200 % simulada dobrando o `font-size` da raiz, não a fonte do sistema |

## Missão

Refazer J-03 e J-04 como auditoria, pela Rosa — fonte grande, teclado e a árvore de acessibilidade —, procurando
o que impede ou engana quem não enxerga bem: percentual cortado, preço riscado lido como o que vale, chip sem
estado, conteúdo pulando quando o bloco da Home aparece.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Abrir `/ofertas` no celular (390 × 844) e ler pela árvore de acessibilidade | h1 "Dia das Mães", "Peças com 10% e 15% de desconto até 30 de novembro." (sem exclamação, sem contagem); grupo "Filtrar por desconto" com "Todas · 2", "10% · 1", "15% · 1"; cartões com a faixa como imagem de nome "DIA DAS MÃES, 15% de desconto" / "DIA DAS MÃES, 10% de desconto" e o preço lido "De R$ 340,00 R$ 289,00" / "De R$ 385,00 R$ 346,50" | — |
| 02 | Medir o selo nos cartões de 390 e repetir com a fonte da raiz a 200 % | 100 %: cartão 171 px, "DIA DAS MÃES" 121/121 px (inteiro), "−15%" 50 px e "−10%" 52 px inteiros; corpo 390 = tela. 200 %: cartão 147 px, o texto da campanha corta no fim (107 px de conteúdo em 97 px, sem reticências — o que a spec admite), o percentual inteiro; o corpo vai a 552 px por causa do botão "Abrir menu" do cabeçalho (até 426 px) e da barra Ordenar/colunas/"Filtros" (até 552 px), nada da campanha. Chips com `aria-pressed` (Todas=true). Contraste do selo #F6DCD8 sobre #6E2433 ≈ 8,2:1 | `screenshots/CH-08-02-ofertas-200-390.png` |
| 03 | Repetir em 1440 × 900 (100 % e 200 %) | 100 %: cartão 224 px, "DIA DAS MÃES" 174/174 e o percentual 50/52 inteiros; 200 %: cartão 193 px, tudo inteiro; corpo 1440 nos dois | — |
| 04 | Só teclado em 1440: do título, Tab até os chips | Tab 1 "Todas", Tab 2 "10%", Tab 3 "15%" — a ordem visual; foco visível (anel do navegador, `outline: auto`) | `screenshots/CH-08-03-chip-15-foco-1440.png` |
| 05 | Enter no chip "15%" | Na hora: "15%" `aria-pressed=true`, os outros `false`; URL `?percentual=15`; a grade fica com 1 cartão ("DIA DAS MÃES, 15% de desconto"); "Mostrando 1 de 1 peças"; o foco continua no chip | — |
| 06 | Abrir a Home no celular e medir a carga | first-contentful-paint 184 ms; nenhuma entrada `layout-shift` até a rede assentar (CLS 0); o bloco "Dia das Mães" começa em ~6.140 px de uma página de ~8.350 px — bem abaixo da dobra | — |
| 07 | Ler o bloco da Home pela árvore e conferir o tom | cartões do bloco com nome "Ver as peças com 10% de desconto" (→ `/ofertas?percentual=10`) e "Ver as peças com 15% de desconto", 120 px de altura; fileira "Algumas das peças em oferta" com os dois cartões de faixa; nenhum texto com "!", "últimas", "restam", "corra", "só hoje" ou contagem; corpo 390 | — |
| 08 | Home com a fonte a 200 % | faixas da fileira inteiras ("DIA DAS MÃES" 170/170, percentual 50/52); cartões do bloco sem texto cortado (326 px); corpo 434 px — o mesmo botão "Abrir menu" do cabeçalho | — |
| 09 | Abrir a peça M-A no celular, ler o selo em linha e o preço, e dobrar a fonte | selo em linha `role=img` "DIA DAS MÃES, 10% de desconto", inteiro a 200 % ("DIA DAS MÃES" 106/106, "−10%" 46/46); preço "R$ 346,50" seguido de "R$ 385,00" riscado e "R$ 322,24 no Pix" — no texto do bloco de preço não há "De" antes do riscado (nos cartões há); corpo 435 px a 200 % | `screenshots/CH-08-04-pdp-ma-200-390.png` |

**Edge cases tentados:** fonte a 200 % em 390 e 1440 (/ofertas, Home, peça); só teclado nos chips; leitura da árvore nos cartões, no bloco e no selo em linha; tom dos textos; contraste do selo.

## Casos

| TC         | Veredito | Passo        | Evidência | Nota |
| ---------- | -------- | ------------ | --------- | ---- |
| TC-UI-003  | pass     | 02, 03, 08, 09 | `screenshots/CH-08-02-ofertas-200-390.png` · `screenshots/CH-08-04-pdp-ma-200-390.png` | selo e percentual inteiros em 173 e 220 px a 100 %; a 200 % só o texto corta, o percentual nunca. A rolagem horizontal a 200 % vem do cabeçalho e da barra de ordenação (fora da Mudança: pré-existente, sem achado). 768 × 1024 e 320 × 568 não feitos (orçamento) |
| TC-CFR-001 | pass     | 01, 04, 05, 07, 09 | `screenshots/CH-08-03-chip-15-foco-1440.png` | passos 1–3 e a variação "página do produto" (selo) passam. **Passo 4 (recusa do cupom na sacola) não executado** — orçamento esgotado; ver Fora da cobertura. Na peça, o riscado sem "De": A-1 |
| TC-CFR-002 | pass     | 05, 06       | — | FCP 184 ms; CLS 0 na Home, bloco abaixo da dobra; troca de chip imediata, sem a grade piscar vazia. Rede lenta não alcançável no driver; o tempo até os cartões de `/ofertas` não foi cronometrado à parte |

Contagem: pass 3 · fail 0 · blocked 0 · skip 0

## Achados

### A-1 · [Página do produto] O preço riscado não é anunciado com "De" — quem usa leitor de tela ouve dois preços seguidos

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-04 Rosa |
| Jornada e passo     | J-03, página da peça · passo 09 do log |
| TC                  | — (TC-CFR-001 pede "De R$ X" no riscado; a leitura do TC é nos cartões, onde passa) |
| Gravidade proposta  | high — a Rosa ouve "R$ 346,50, R$ 385,00, R$ 322,24 no Pix" e não sabe qual é o preço que vale; é exatamente o risco 2 da persona |
| Reproduziu          | intermitente (1 de 1) — sem segunda leitura: o orçamento acabou nessa ação. A leitura é do DOM, não de tempo; confirmar no reteste |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Sem login, abrir `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925` (M-A, 10 % na "Dia das Mães")
2. Esperar o preço "R$ 346,50"
3. Ler o bloco de preço pela árvore de acessibilidade (ou leitor de tela)

**Esperado:** o riscado lido como "De R$ 385,00", como nos cartões de `/ofertas` e da Home — **fonte:** TC-CFR-001 (meta "preço riscado lido com 'De R$ X'"); `spec.md` › Selo · a faixa ("'De R$' só para leitor de tela"); personas.md, PER-04, risco 2

**Observado:** o texto do bloco de preço é "R$ 346,50R$ 385,00R$ 322,24no Pix"; o "R$ 385,00" tem `text-decoration: line-through` e não há "De" antes dele (nem visível nem só para leitor de tela, pelo texto do bloco). Não conferi `aria-label` no contêiner do preço

**Evidência:**

- `screenshots/CH-08-04-pdp-ma-200-390.png` — a peça M-A com o preço e o riscado (fonte a 200 %)
- console: nada
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-03    | Usabilidade           | pass     | — (tom sem pressa nem exclamação; estado do filtro visível e na URL) | — |
| J-03    | Acessibilidade        | friction | riscado sem "De" na página da peça | A-1 |
| J-03    | Performance percebida | pass     | — | — |
| J-03    | Compatibilidade       | pass     | rolagem horizontal a 200 % só por elementos fora da Mudança (pré-existente) | — |
| J-03    | Recuperação de erro   | pass     | nenhum caminho de falha na superfície percorrida | — |
| J-04    | Usabilidade           | —        | não alcançada (sacola e checkout) | — |
| J-04    | Acessibilidade        | —        | não alcançada | — |
| J-04    | Performance percebida | —        | não alcançada | — |
| J-04    | Compatibilidade       | —        | não alcançada | — |
| J-04    | Recuperação de erro   | —        | não alcançada (recusa do cupom) | — |

Paridade com produção: desvios no cabeçalho.

**Categorias fora:** J-04 inteira — orçamento esgotado em J-03 (a navegação só-teclado pelos chips custou 13 ações).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Com a fonte da raiz a 200 %, o botão "Abrir menu" do cabeçalho e a barra Ordenar/colunas/"Filtros" de `/ofertas` passam da tela (corpo 552 px em 390; 434–435 px na Home e na peça) — rolagem horizontal | 02, 08, 09 | pré-existente |
| O foco dos chips é o anel padrão do navegador (`outline: auto 1px`), fino sobre o chip | 04 | polimento |

## Fora da cobertura

- TC-CFR-001 passo 4 — M-A na sacola só por teclado, cupom recusado anunciado como alerta e o foco — orçamento esgotado
- J-04 só teclado: sacola e checkout até o resumo (a linha "Desconto de campanha" no checkout já é sabida como ausente) — orçamento
- 768 × 1024 de passagem e a variação 320 × 568 do TC-UI-003 — orçamento
- Movimento reduzido (variação do TC-CFR-001) — orçamento
- Rede lenta (Slow 4G) do TC-CFR-002 — o `agent-browser` não atrasa resposta
- Leitor de tela real (VoiceOver, TalkBack) e a fonte do sistema de um Android real — fora do browser da sessão (simulados pela árvore e pelo `font-size` da raiz)
- Safari, Firefox e browsers móveis reais — só Chromium
- Segunda reprodução do A-1 — orçamento

## Debrief

- **Surpresas:** os cartões leem "De" antes do riscado, a página da peça não — a mesma informação com dois anúncios
- **Próximo charter:** J-04 por teclado (sacola com M-A, cupom recusado, checkout) com a Rosa; e reler o preço da peça M-C (de/por cadastrado) para ver se o "De" falta também fora da campanha
- **Padrão novo:** nada
