# Sessão CH-02 · Achar as joias escolhidas pelo celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-joias-escolhidas-pelo-celular.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Marina · conta: anonima                                         |
| Tour · modo | Feature · com tour                                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 52 ações de browser de 50 (contando cada comando do driver, inclusive `wait`, `get url` e as leituras; o teto foi atingido no passo 07 e a exploração parou ali) |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 390 × 844 |
| Paridade    | fotos do Storage hospedado bloqueadas (`**/*.supabase.co/**`) e GA4 bloqueado (`**/g/collect*`), como o ambiente manda; dado do Supabase local |

## Missão

Confirmar que quem nunca abriu a loja, pelo celular, encontra o bloco "Joias em oferta", entende pelo título, pela
descrição e pelo selo que há desconto, passa pelas peças que a dona escolheu — na ordem dela — e chega à página de
uma delas com o preço da campanha, sem a página pular nem rolar de lado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | abrir `/` em 390 × 844, sem login, e descer até o bloco | o bloco com o selo "DIA DAS MÃES" acima do título "Joias para guardar quem a gente ama", a descrição "Peças com leite materno e coto umbilical, feitas à mão no ateliê, com o desconto do Dia das Mães.", os cartões "Ver as peças com 10% de desconto" e "… 15% …", o subtítulo "Algumas das peças em oferta", "Ver todas", as setas e três cartões: P-3 (Colméia, 15 %, de R$ 339,90 por R$ 288,92), P-1 (6 Corações, 15 %, de R$ 329,90 por R$ 280,42), P-2 (Amor Mãe e Bebê, 10 %, de R$ 359,90 por R$ 323,91) — só esses três, nessa ordem. Nenhuma "QA103 Desligada" na Home. Tom memorial, sem urgência nem exclamação | `screenshots/CH-02-01-bloco-390.png` |
| 02 | (medição) a largura da página com o bloco carregado | o documento mede 504 px numa janela de 390: o corpo rola 114 px de lado. A sobra vem do texto oculto "De" (preço riscado, para leitor de tela) do 3º cartão da fileira (P-2), que fica fora do recorte da fileira, em x = 503. Recarregada a Home, a mesma coisa (2 de 2) → A-1 | `screenshots/CH-02-02-corpo-rola-de-lado-390.png` |
| 03 | passar a fileira de lado | com a roda horizontal sobre um cartão (o driver não tem swipe fora do perfil iOS), quem andou foi a página (114 px), não a fileira — sintoma do A-1. Pela seta "Próximo", a fileira andou (rolagem suave, 244 px de 350); a fileira tem `scroll-snap` horizontal | `screenshots/CH-02-03-fileira-passada-390.png` |
| 04 | tocar em P-1 | o toque no meio do cartão não abriu a peça (ver Debrief); o toque no nome abriu `/produtos/anel-afetivo-6-coracoes-leite-materno-prata-925`: selo "DIA DAS MÃES, 15% de desconto", R$ 280,42, "De R$ 329,90 · 4x de R$ 70,11 sem juros" | `screenshots/CH-02-04-peca-p1-390.png` |
| 05 | voltar | a Home volta no mesmo ponto (rolagem vertical 1224 antes e depois), sem deslocamento horizontal | — |
| 06 | tocar em "Ver todas" | `/ofertas` com o título "Dia das Mães" e as peças da campanha (P-1, P-2, M-A, P-AMBAS, P-10, P-TIRA, P-FORA…) | `screenshots/CH-02-05-ofertas-390.png` |
| 07 | — | teto do orçamento: exploração encerrada (1440 × 900, bloqueio de produtos e edge cases em Fora da cobertura) | — |

**Edge cases tentados:** recarregar a Home (passo 02, reprodução do A-1) · voltar depois de abrir a peça (passo 05: volta no ponto). Os demais da lista (320 × 568, girar, movimento reduzido, fonte a 200 %) não couberam no orçamento.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-002 | pass | 01, 03–06 | `screenshots/CH-02-01-bloco-390.png` · `CH-02-04-peca-p1-390.png` · `CH-02-05-ofertas-390.png` | os 4 passos em 390 × 844 e a variação "voltar"; a variação "computador" (1440 × 900) não coube no orçamento |
| TC-FUNC-008 | skip | 01 | `screenshots/CH-02-01-bloco-390.png` | passos 1–2 conferidos e conformes (selo acima do título, título, descrição, cartões, "Ver todas", P-3·P-1·P-2 e só elas); passos 3–4 (bloqueio de `**/rest/v1/products*`, RNF-02) e as variações não couberam no orçamento |
| TC-UI-001 | fail | 02, 03 | `screenshots/CH-02-02-corpo-rola-de-lado-390.png` | passo 2: o corpo rola 114 px na horizontal em 390 → A-1. Passo 1 (rede lenta) fora do alcance do driver; passo 3 (1440 × 900) não coube no orçamento |

Contagem: pass 1 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Home, bloco "Joias em oferta"] no celular a página inteira rola de lado — para quem passa as peças

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Marina                                                         |
| Jornada e passo     | J-02, passo 2 (passar as peças) · passos 02–03 do log                 |
| TC                  | TC-UI-001 (passo 2)                                                   |
| Gravidade proposta  | high — fricção numa jornada P0 (sobe um degrau): ao arrastar de lado, a Home desliza 114 px e deixa uma faixa vazia à direita, exatamente a hipótese de fricção 1 da persona; ela conclui, mas a página "solta" no celular |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Sem login, viewport 390 × 844, abrir `http://localhost:8082/` com B-1 como o CH-01 deixou (Dia das Mães, P-3, P-1, P-2)
2. Descer até "Algumas das peças em oferta"
3. Arrastar a página de lado (ou medir: `document.documentElement.scrollWidth` = 504 para `clientWidth` = 390; `scrollBy(200,0)` deixa `scrollX` = 114)

**Esperado:** a fileira rola de lado; o corpo da página não rola na horizontal (sem rolagem horizontal em 390) — **fonte:** TC-UI-001 passo 2 · PRD CA-03.3, RNF-04 · ambiente do test-plan ("nenhuma rolagem horizontal do corpo")

**Observado:** o documento tem 504 px de largura em 390; a página rola 114 px de lado. O elemento que estica é o texto oculto "De" do preço riscado (`span.sr-only`, posição absoluta) do 3º cartão da fileira (P-2, "Anel Afetivo Amor Mãe e Bebê…"), em x = 503 — ele escapa do recorte da fileira (`overflow-x-auto`). Os textos "De" dos cartões 1 e 2 ficam dentro da janela (x = 15 e 259), por isso só o 3º estica. Com a roda horizontal sobre um cartão, quem andou foi a página, não a fileira.

**Evidência:**

- `screenshots/CH-02-02-corpo-rola-de-lado-390.png` — a Home deslocada 114 px para a esquerda, com o bloco cortado
- `screenshots/CH-02-03-fileira-passada-390.png` — a tentativa de passar a fileira deslocou a página, a fileira ficou em 0
- console: não lido
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A faixa de avisos do topo da Home diz "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" (campanha encerrada em 13/11) enquanto o bloco logo abaixo diz "DIA DAS MÃES"; na página da peça a faixa diz "10%, 15% e 20% de desconto…". Para quem chega pela primeira vez, duas campanhas na mesma tela. A faixa é de outro WI (101) e fora do escopo deste charter | 01, 04 | pré-existente |

## Fora da cobertura

- Rede lenta no carregamento do bloco (TC-UI-001 passo 1, "Deve tentar" 1: vagas reservadas e salto ao chegar) — o `agent-browser` não atrasa resposta (só aborta ou responde fixo); pede o driver `cli`/`mcp` com `page.route` e atraso
- Bloqueio de `**/rest/v1/products*` e recarga (TC-FUNC-008 passos 3–4, RNF-02) — orçamento esgotado
- 1440 × 900: a mesma ordem, a fita com setas (TC-JOURNEY-002 variação computador, TC-FUNC-008 variação, TC-UI-001 passo 3) e 768 × 1024 — orçamento esgotado
- Edge cases 320 × 568, girar para 844 × 390, movimento reduzido nas setas, fonte a 200 % no título e na descrição — orçamento esgotado
- Swipe por toque real — o driver só tem gesto no perfil iOS; a fileira foi passada pela seta e pela roda horizontal

## Debrief

- **Surpresas:** o toque no meio do cartão de P-1 (clique no centro do link do cartão) não abriu a peça; o toque no nome abriu. Não reproduzido nem investigado (provável que o centro caia nos botões de cor sobre a foto, do cartão compartilhado) — merece um olhar no CFR. As setas da fileira medem 40 × 40 px em 390, abaixo do alvo de toque de 44 px do ambiente (medido uma vez, não reproduzido; as fileiras vizinhas usam as mesmas setas). A seta "Anterior" não fica desabilitada no início da fileira.
- **Próximo charter:** um charter curto com driver `cli` ou `mcp` para o carregamento lento (vagas por peça) e o bloqueio de produtos (RNF-02), mais 1440 × 900 — o que este não alcançou. Reconferir A-1 depois da correção também em 320 e com 4+ peças.
- **Padrão novo:** medir `scrollWidth` × `clientWidth` logo ao chegar a uma fileira com cartões de preço riscado: o texto oculto de leitor de tela em posição absoluta escapa do recorte da fileira.
