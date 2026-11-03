# Sessão CH-07 · CFR — montar o conjunto (J-01) e fechar o pedido (J-02)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1                          |
| Status      | done                                                                   |
| Persona     | PER-03 Helena · conta: anonima                                         |
| Tour · modo | —                                                                      |
| Rodada      | exploração                                                             |
| Orçamento   | 28 ações de browser de 40                                              |
| Ambiente    | http://localhost:8082 · build não exposto (dev server Vite) · Chromium (Playwright MCP headless) · viewports 390×844 (fonte 100/130/200 %), 320×568, 844×390, 768×1024, 720×450 (=1440 a 200 %), 1440×900 |
| Paridade    | dev server, não build de produção; Supabase local (:54441); `*.supabase.co` e `**/g/collect*` bloqueados por rota; fonte do sistema a 130/200 % simulada pelo `font-size` da raiz (`html`), não por configuração do aparelho; zoom 200 % em 1440 simulado por viewport 720×450; rede lenta simulada atrasando 1,8 s cada requisição a `/rest/v1/` (não é perfil Slow 4G); foco inicial de algumas rodadas de teclado posto por script na primeira caixa, dali em diante só teclado; medições de layout e anúncio por `evaluate`/scripts curtos de leitura |

## Missão

Refazer J-01 e J-02 como auditoria das qualidades que a cliente percebe no bloco — largura em 390, alvo de toque, teclado, anúncio, salto de layout, movimento e tom —, só sobre o que o Work Item mudou.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir M-06 (três adicionais de nome longo) em 390×844, sacola vazia | Bloco "Compre junto" com as três caixas "Levar junto: <nome>" e "Ver opções"; barra fixa "Adicionar à sacola" | — |
| 02 | Marcar os três adicionais, escolher só o comprimento da corrente | Opções abertas nas três; status "Escolha o Cor da QA." / "Escolha o Tamanho da QA."; nome da caixa vira "Levar junto: <nome>, Setenta centímetros de comprimento"; barra "R$ 399,80 · Conjunto · 4 peças · Levar o conjunto" | — |
| 03 | Mesma tela a fonte 100 %, 130 %, 200 % | `scrollWidth` 390 / 390 / 435. A 200 % quem passa da tela é a galeria (miniaturas 3 e 4, até 516 px), o botão "Compartilhar" (423) e o cabeçalho (392) — nada dentro do bloco (0 elementos fora). Nenhum controle do bloco abaixo de 44 px (caixa = rótulo inteiro, 56 px de altura). Barra fixa: 89 px de altura a 100 %, 177 px a 200 %, sem rolagem interna; "Levar o conjunto" 306×44 a 100 %, 222×88 a 200 % | `screenshots/CH-07-01-bloco-390-100.png` · `-130` · `-200` · `CH-07-01-barra-390-200.png` |
| 04 | 320×568, girar para 844×390, 768×1024, 1440×900 (fonte 100 %) | 320: sw 320, bloco 288 px, nada sobrando, CTA 236×44. 1440: sw 1440, bloco 616 px, CTA 420×48. 844×390 e 768×1024: página rola de lado (sw 943) e a coluna de informação fica com 180 / 104 px, o "R$ 399,80" do total sai do bloco. Estado (marcas e escolhas) mantido ao girar | `screenshots/CH-07-02-320x568.png` · `-844x390` · `-768x1024` · `-1440x900` · `CH-07-03-768-bloco-visivel.png` |
| 05 | Conferir se o 768 é do bloco: medir M-04 (sem Compre Junto) e M-01 sem nada marcado a 768 | M-04 sw 950, M-01 sw 950: a página do produto já rola de lado nessa largura sem o bloco | — |
| 06 | 720×450 (1440 a 200 %), Tab a partir da primeira caixa de M-01 | Ordem: caixa "Levar junto: QA Correntes" → "Ver os 2 modelos" → caixa Berloque → "Ver opções" → caixa Medalha → "Ver opções" → Compartilhar… Igual à ordem visual; anel de foco do navegador (outline auto) em cada controle; caixa 20×20 dentro de rótulo 662×56. sw 720, bloco sem nada sobrando | `screenshots/CH-07-04-foco-caixa-720.png` |
| 07 | Marcar a lista com Espaço e acionar "Levar o conjunto" com Enter sem escolher a peça | Aparece `alert` "Falta uma escolha em 1 peça. Ela está marcada acima." e `status` "Escolha a peça."; o foco vai ao botão "Esconder opções" do adicional incompleto | `screenshots/CH-07-05-falta-escolha-720.png` |
| 08 | Escolher a peça e o comprimento pelo teclado (Tab, Espaço) | Nome da caixa: "Levar junto: QA Correntes, QA Corrente Veneziana, 40 cm". O total do bloco muda para R$ 349,80, mas nenhum `status`/`alert`/região viva o contém — o único nó vivo com texto na página é um contador "1" | — |
| 09 | Repetir com o Berloque (Prata 925) e a Medalha, observando as regiões vivas | Total R$ 419,70 e depois R$ 569,60; barra fixa "R$ 419,70 · Conjunto · 3 peças"; nenhuma mutação em região viva durante as duas trocas | `screenshots/CH-07-06-total-sem-anuncio-720.png` |
| 10 | Abrir M-01 com rede lenta em 390 e observar a coluna | FCP 168 ms. ~2,0 s: página aparece com "Em estoque" em y 978, **sem esqueleto do bloco**. ~3,9 s: surge o esqueleto (`aria-busy`, 320 px) e empurra "Em estoque" para 1322. ~5,7 s: o bloco real (517 px) chega e empurra para 1518 | `screenshots/CH-07-07-esqueleto-390-rede-lenta.png` |
| 11 | Mesma coisa com M-04 (sem Compre Junto) | Nenhum esqueleto do bloco; "Em estoque" fica em 836 de vez | — |
| 12 | Repetir M-01 com rede lenta em 390 e em 1440 medindo o botão de compra e o CLS | 390: o botão "Adicionar à sacola" da coluna fica em 882 (acima do bloco); conteúdo abaixo salta duas vezes; CLS da carga 0,929. 1440: o botão "Adicionar à sacola" da coluna anda 584 → 928 → 1104 (dois saltos, +520 px), CLS 0,843 | — |
| 13 | Marcar, escolher, esconder opções e desmarcar com e sem "reduzir movimento" | Sem redução: transições de `transform` (barra fixa entrando) e `opacity`. Com redução: só uma transição de `opacity`, sem movimento; estados finais iguais nas duas rodadas | — |
| 14 | Montar o conjunto em M-01 (Veneziana 40 cm + Berloque Prata 925) e "Levar o conjunto" em 390 | Gaveta com três linhas; "Acompanha o QA Pingente Estrela" sob as duas peças; subtotal R$ 419,70 = total do bloco; PIX do bloco R$ 390,32; sw 390 | `screenshots/CH-07-08-gaveta-390.png` |
| 15 | `/carrinho` e `/checkout` em 390 a 100 % e 200 % | `/carrinho`: linha "Acompanha…" cabe (104–370 a 100 %, 136–350 a 200 %); a 200 % a página rola de lado (434) por causa das fileiras de recomendação, não da linha. `/checkout`: sw 390 a 100 e 200 % | `screenshots/CH-07-09-carrinho-390-200.png` · `CH-07-09-checkout-390-200.png` |
| 16 | `colorScheme: dark` no bloco de M-06 | A loja não tem tema escuro: fundo claro (250,248,244) e texto escuro mantidos, sem metade escura/metade clara | `screenshots/CH-07-10-dark-bloco-390.png` |
| 17 | Ler todo texto do bloco, mensagens, barra fixa e gaveta | "Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar." · "a partir de" · "Escolha a peça · 2 modelos" · "Escolha o <eixo> da QA." · "Falta uma escolha em 1 peça. Ela está marcada acima." · "Total do conjunto" · "com Pix" · "O botão de compra leva a joia e as peças marcadas…" · "Conjunto · N peças" · "Levar o conjunto" · "Acompanha o <joia>". Nenhuma urgência, escassez, contagem regressiva, prova social, emoji ou exclamação | — |

**Edge cases tentados:** fonte 130/200 % em 390 (passo 03); 320×568 (04); girar com escolhas abertas (04); zoom 200 % em 1440 (06); `reducedMotion: reduce` (13); `colorScheme: dark` (16); rede lenta (10–12).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | pass | 03, 04 | `screenshots/CH-07-01-bloco-390-200.png` | Em 390 o bloco não causa rolagem; a 200 % o sw 435 vem da galeria/compartilhar/cabeçalho (pré-existente). Alvos ≥ 44 px no bloco e na barra. A variação "girar para 844×390" rola de lado (943), mas M-04 sem o bloco também rola em 768 (950): pré-existente da página |
| TC-CFR-002 | fail | 06–09 | `screenshots/CH-07-06-total-sem-anuncio-720.png` | Nome da caixa, ordem, foco visível e anúncio da falta passam; o total não é anunciado ⇒ A-1 |
| TC-CFR-003 | fail | 10–12 | `screenshots/CH-07-07-esqueleto-390-rede-lenta.png` | Esqueleto chega depois da página e é menor que o bloco; botão de compra salta em 1440 ⇒ A-2 |
| TC-CFR-004 | pass | 13 | — | Forma "Na linha" (a única configurada); "Em folha" não exercitada — ver Fora da cobertura |
| TC-CFR-005 | pass | 17 | — | Estado "recusa de gravação" e "peça com estoque baixo" não exercitados (ver Fora da cobertura) |

Contagem: pass 3 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Bloco Compre Junto] O novo total do conjunto não é anunciado ao marcar ou escolher — para quem usa leitor de tela

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena                                                         |
| Jornada e passo     | J-01, passo 3 (escolher a variação do adicional) · passos 08–09 do log |
| TC                  | TC-CFR-002                                                            |
| Gravidade proposta  | medium — Helena monta o conjunto mas só descobre quanto vai pagar se navegar de volta até o total; não bloqueia a compra |
| Reproduziu          | sim (3 de 3: Correntes, Berloque, Medalha)                            |
| Viewport            | 720 × 450 (1440 a 200 %)                                              |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, abrir http://localhost:8082/produtos/qa-pingente-estrela
2. Pelo teclado, marcar "Levar junto: QA Berloque Coração" (Espaço), Tab até "Prata 925", Espaço
3. Observar as regiões vivas da página (`aria-live`, `role=status`, `role=alert`)

**Esperado:** o total muda num elemento anunciado (`status`/região viva) — **fonte:** TC-CFR-002 passo 3 e meta "mensagem de falta e total: anunciados"; PRD RNF-06

**Observado:** "Total do conjunto" passa de R$ 349,80 para R$ 419,70 (e a barra fixa para "R$ 419,70 · Conjunto · 3 peças"), mas o valor está num `<p>` sem `aria-live` nem papel de status; nenhuma região viva recebeu mutação durante a troca. O único nó vivo com texto na página é um contador "1". A mensagem de falta, em contraste, é anunciada (`alert` "Falta uma escolha em 1 peça. Ela está marcada acima.").

**Evidência:**

- `screenshots/CH-07-06-total-sem-anuncio-720.png` — total R$ 419,70 com o Berloque marcado
- console: nada
- rede: nada

### A-2 · [Bloco Compre Junto] Com rede lenta, o esqueleto do bloco só aparece depois da página e é menor que o bloco — o conteúdo e o botão de compra saltam duas vezes

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-03 Helena (e qualquer cliente em rede móvel lenta)                |
| Jornada e passo     | J-01, passo 1 (abrir a página do produto) · passos 10–12 do log       |
| TC                  | TC-CFR-003                                                            |
| Gravidade proposta  | medium — no computador o botão "Adicionar à sacola" anda ~520 px debaixo do cursor/foco em dois saltos; no celular o texto que a cliente lê (estoque, frete) pula ~540 px. Atrapalha e pode causar toque errado, mas não impede a compra |
| Reproduziu          | sim (2 de 2 em 390; 1 de 1 em 1440)                                   |
| Viewport            | 390 × 844 e 1440 × 900                                                |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia; rede lenta (na sessão: cada requisição a `/rest/v1/` atrasada 1,8 s)
2. Abrir http://localhost:8082/produtos/qa-pingente-estrela em 1440×900
3. Acompanhar a posição do botão "Adicionar à sacola" da coluna de informação e o espaço do bloco

**Esperado:** esqueleto no lugar do bloco desde que a coluna aparece, com altura reservada; o botão e a linha de estoque não mudam de posição quando o bloco chega — **fonte:** TC-CFR-003 passo 1; PRD RNF-02; protótipo (carregando: `aria-busy`, altura mínima reservada)

**Observado:** ~2,0 s: produto renderizado, sem esqueleto do bloco ("Adicionar à sacola" em y 584; em 390, "Em estoque" em y 978). ~3,9 s: aparece o esqueleto `aria-busy` de 320 px e empurra o botão para 928 (390: "Em estoque" → 1322). ~5,7 s: o bloco real (497 px em 1440, 517 px em 390, nada marcado) substitui o esqueleto e empurra de novo para 1104 (390: → 1518). CLS da carga: 0,843 (1440) e 0,929 (390), contando a página inteira. Com M-04 (sem Compre Junto) não há esqueleto e "Em estoque" fica parado em 836 — o salto é só do bloco.

**Evidência:**

- `screenshots/CH-07-07-esqueleto-390-rede-lenta.png` — o esqueleto que surge depois de a página já estar pintada
- console: nada
- rede: as leituras de `/rest/v1/` chegam em sequência (a dos adicionais começa depois da do produto)

## CFR

| Jornada | Categoria             | Marca     | Itens que não passaram | Achado |
| ------- | --------------------- | --------- | ---------------------- | ------ |
| J-01    | Usabilidade           | pass      | —  (status imediato a cada marca; linguagem da cliente; falta explicada com próximo passo) | — |
| J-01    | Acessibilidade        | friction  | mudança do total não anunciada | A-1 |
| J-01    | Performance percebida | friction  | esqueleto tardio e menor que o bloco; botão de compra salta em 1440 | A-2 |
| J-01    | Compatibilidade       | pass      | — (390 a 100/130/200 %, 320, 1440, 720; movimento reduzido; tema escuro sem quebra). 768/844 rolam de lado pela página, não pelo bloco | — |
| J-01    | Recuperação de erro   | pass      | — (falta de escolha: alert em linguagem simples, foco levado ao adicional incompleto, marcas preservadas) | — |
| J-02    | Usabilidade           | pass      | — ("Acompanha o <joia>" sob cada peça; subtotal = total do bloco) | — |
| J-02    | Acessibilidade        | pass      | — no que a mudança tocou (a frase "acompanha"); botões da gaveta com área medida abaixo de 44 px são pré-existentes | — |
| J-02    | Performance percebida | pass      | — (gaveta abre com as três linhas em ~1 s) | — |
| J-02    | Compatibilidade       | pass      | — (gaveta e `/checkout` sem rolagem em 390 a 100 e 200 %; "Acompanha…" cabe a 200 % em `/carrinho`) | — |
| J-02    | Recuperação de erro   | pass      | — (nenhum caminho de falha encontrado no trecho percorrido) | — |
| J-01/J-02 | Paridade com produção | —      | dev server; Supabase local; fonte e zoom simulados; rede lenta por atraso de rota | — |

**Categorias fora:** nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Ao acionar "Levar o conjunto" com escolha faltando, o foco vai ao botão "Esconder opções" do adicional incompleto (não à primeira opção a escolher). Enter ali esconde justamente as opções que faltam. A fonte diz só "o foco vai ao primeiro adicional incompleto" | 07 | polimento |

## Fora da cobertura

- Forma "Em folha" e "Com fórmula" sob movimento reduzido e fonte 200 % em 390 — a massa só tem "Na linha" configurada e o charter não manda alterar a forma no painel
- TC-CFR-005 nos estados "recusa de gravação" e "peça com estoque baixo" — nenhuma peça da massa tem estoque baixo (todas 10 ou 0); a recusa de gravação foi exercitada em CH-02
- J-02 até o pedido gravado (pagamento e confirmação) — não foi criado pedido nesta sessão; o caminho foi coberto por CH-02 (pedido 0327)
- Rede Slow 4G real (perfil de throttling) — o browser da sessão não tem throttling nativo; simulado por atraso de 1,8 s por requisição REST
- Leitor de tela real (VoiceOver/TalkBack), Safari, Firefox — só o Chromium do driver
- Fonte do sistema real no celular (a 130/200 % foi simulada pelo `font-size` da raiz; o que é `px` fixo não cresce nessa simulação)

## Debrief

- **Surpresas:** a página do produto rola de lado em 768–1023 px mesmo sem o bloco (M-04 sw 950) e a coluna de informação fica com ~104 px — o bloco é espremido ali, mas a causa é anterior ao Work Item. Vale um item de backlog.
- **Próximo charter:** reteste de A-2 com o perfil Slow 4G real, e "Em folha" a 390/200 % se a forma for ativada.
- **Padrão novo:** amostrar a posição do botão de compra a cada 100 ms durante a carga lenta (achou A-2).
