# Sessão CH-08 · design-check — bloco, barra fixa, sacola e telas do painel · Claude Design

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-design-check.md` · design-check · P1        |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` (painel) · `anonima` (loja)        |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 34 chamadas de browser de 50 (várias compostas por `browser_run_code_unsafe`, cada uma com alguns passos encadeados: marcar + escolher + capturar) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build `não exposto` (dev server) · Chromium (Playwright MCP) · viewports 390×844 · 1440×900 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; massa sintética QA-* (M-01, M-02, M-03, M-04, M-08) |

## Missão

Conferir, tela a tela, as telas entregues contra os protótipos do Claude Design do Work Item, registrando cada diferença com o valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler os protótipos pelo MCP do Claude Design: Loja (`cj-loja.jsx`, `cj-loja-bloco.jsx`, `cj-loja.css`, tokens `ds/tokens/*`) e Painel (`cj-admin-listas.jsx`, `cj-admin-produto.jsx`, `cj-admin-comum.jsx`) | arquivos listados e lidos; régua = código dos protótipos e tokens | — |
| 02 | Abrir M-01 em 390, bloco sem nada marcado | bloco "Compre junto" com as 3 linhas, sem cartão em volta, cada linha num cartão branco próprio, caixa nativa 20 px, foto 56×56, "a partir de R$ X" à direita do nome | `screenshots/CH-08-01-bloco-390-nada-marcado.png` |
| 03 | Marcar a lista e o berloque e tocar no botão de compra sem escolher | mensagem por linha ("Escolha a peça.", "Escolha o Cor da QA."); o total não traz a frase "Falta uma escolha em N peças…" | `screenshots/CH-08-02-bloco-390-falta.png` |
| 04 | Escolher Veneziana 40 cm e berloque Prata 925 | resumo "QA Corrente Veneziana · 40 cm" e "Prata 925", total R$ 419,70, PIX R$ 390,32; "Esconder opções" segue visível com a linha marcada | `screenshots/CH-08-03-bloco-390-completo.png` |
| 05 | Conferir a barra fixa com o conjunto | "R$ 419,70 · Conjunto · 3 peças · Levar o conjunto" (igual ao protótipo; o coração de favoritos é da página de antes) | `screenshots/CH-08-04-barra-390-com-conjunto.png` |
| 06 | Levar o conjunto e ver a gaveta | 3 linhas; "Acompanha o QA Pingente Estrela" com o nome completo; sem o traço dourado antes da frase; cabeçalho e rodapé da gaveta de antes ("Sua sacola 3", "Frete calculado no checkout, com o seu CEP.", "Finalizar Pedido") | `screenshots/CH-08-05-gaveta-390-acompanha.png` |
| 07 | M-01 em 1440, nada marcado e com o berloque | mesmas diferenças de forma; nota "A joia e 1 peça marcada · R$ 329,80" junto do botão, igual ao protótipo | `screenshots/CH-08-06-bloco-1440-nada-marcado.png` · `screenshots/CH-08-07-coluna-1440-conjunto.png` |
| 08 | Provocar "combinação indisponível" (Chaveiro · Sim) | não alcançável: com Chaveiro, "Sim" fica desabilitado; com Sim, "Chaveiro" fica desabilitado. O aviso do protótipo não aparece | `screenshots/CH-08-08-indisponivel-1440.png` |
| 09 | Entrar no painel e abrir `/admin/compre-junto` em 1440 | cabeçalho, abas Listas/Adesão (sem contagem na aba; contagem num título "Listas (2)" abaixo), cartão da forma (fora do escopo), tabela com as 5 colunas | `screenshots/CH-08-09-indice-1440.png` |
| 10 | Índice em 390 | cartões "QA Correntes · 5 peças · 2 joias" / "1 peça · Nenhuma joia" | `screenshots/CH-08-10-indice-390.png` |
| 11 | Editor de M-02 em 1440 | cartões Lista e Peças, "5 de 12", "12/40", busca com 20 resultados abertos sem digitar, "Variações: todas as ativas (N)", laterais "Em uso" e "Como a cliente vê" com textos diferentes do protótipo | `screenshots/CH-08-11-editor-m02-1440.png` |
| 12 | "Nova lista" e acrescentar 13 peças (sem salvar) | recusa "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista." (igual); motivo "Já está na lista" (igual). Saiu sem salvar | `screenshots/CH-08-12-nova-lista-1440.png` · `screenshots/CH-08-13-recusa-13a-1440.png` |
| 13 | Aba "Compre junto" de M-01 | "3 de 3 adicionais", 3 adicionais numerados, alternador, rádio das listas, "Some quando a cliente escolhe"; sem o cartão lateral "Na loja"; "Quando a peça sai do ar" abaixo do cartão | `screenshots/CH-08-14-aba-produto-m01-1440.png` |
| 14 | Acrescentar o 4º adicional | recusa "Uma joia leva até 3 adicionais. Tire um para acrescentar outro." | `screenshots/CH-08-15-recusa-4o-1440.png` |
| 15 | Aba "Compre junto" de M-04 (sem adicionais) | "0 de 3 adicionais" e "Sem Compre Junto. A página desta joia fica como hoje, sem o bloco." (igual ao protótipo) | `screenshots/CH-08-16-aba-produto-sem-adicionais.png` |
| 16 | Adesão em 1440, 30 dias, por joia e por lista (M-08) | 3 indicadores e linhas de apoio iguais; régua igual (sem o ícone ⓘ); cartão sem o título "Por joia principal"/"Por lista" à esquerda, alternador "Por joia principal / Por lista"; colunas iguais; linha extra "Peça escolhida direto no produto" no recorte por lista | `screenshots/CH-08-17-adesao-1440-por-joia.png` · `screenshots/CH-08-18-adesao-1440-por-lista.png` |
| 17 | Adesão em 390 | cartões "4 peças · R$ 379,60 / Peça que mais sai: …" | `screenshots/CH-08-19-adesao-390.png` |
| 18 | Trocar a forma para "Em folha" no painel e abrir M-01 em 390; marcar a lista | folha com o nome da lista, painel de escolhas, "Incluir no conjunto" desabilitado; "Escolha a peça." aparece duas vezes (no corpo e no rodapé) | `screenshots/CH-08-20-folha-390.png` |
| 19 | Em 1440, marcar o berloque na forma "Em folha" | diálogo de 512 px, raio 20; "Escolha o Cor da QA." duas vezes | `screenshots/CH-08-21-dialogo-1440.png` |
| 20 | Trocar para "Com fórmula" e abrir M-01 em 1440; marcar o berloque | faixa "Esta joia + QA Correntes + QA Berloque Coração + QA Medalha Afetiva" em pílulas de texto (sem fotos), a marcada preenchida; a mensagem de falta já aparece ao marcar, sem tentar comprar | `screenshots/CH-08-22-formula-1440.png` |
| 21 | Devolver a forma para "Na linha" e recarregar | "Na linha" marcada depois do reload. Obs.: antes da sessão a chave não existia (padrão "Na linha"); agora está gravada como "Na linha" — efeito igual | — |
| 22 | Sair da conta, limpar o armazenamento da loja e do painel, fechar o browser | feito | — |

**Edge cases tentados:**

- Estado vazio do índice (sem listas) — não tentado: exigiria apagar listas da massa (proibido)
- Peça "saiu do ar" no editor — não tentado: a massa atual não tem peça fora do ar na M-02 (todas ativas), e tirar uma do ar alteraria massa
- Relatório sem venda — a lista "QA Probe Sem Venda" aparece com "0 · R$ 0,00 · —" no recorte por lista; o estado vazio do relatório inteiro não tem frame (não comparado)
- Combinação indisponível do principal — inalcançável pela tela (passo 08)
- Recusa da 13ª peça e do 4º adicional — provocadas (passos 12 e 14)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | fail | 02–08 | `screenshots/CH-08-01…03`, `CH-08-06`, `CH-08-07` | A-1, A-2, A-3, A-4. Textos de título, frase, rótulo da escolha, nota do total e nota de 1440 iguais; "principal indisponível" inalcançável (spec-gap) |
| TC-UI-002 | fail | 05–06 | `screenshots/CH-08-04`, `CH-08-05` | barra igual; "Acompanha o <nome completo>" igual no texto; A-7 (traço). Cabeçalho/rodapé da gaveta são da gaveta de antes (spec-gap pré-existente). Variação "sacola vazia" não conferida |
| TC-UI-003 | fail | 18–20 | `screenshots/CH-08-20…22` | A-5, A-6, e a falta duplicada de A-3 |
| TC-UI-004 | fail | 09–12 | `screenshots/CH-08-09…13` | A-8, A-9. Recusa da 13ª igual. Peça fora do ar e índice vazio não conferidos |
| TC-UI-005 | fail | 13–15 | `screenshots/CH-08-14…16` | A-10. Estado "Sem Compre Junto" igual. Campo "Desconto ao levar junto" e faixa de conversão fora (desvio declarado) |
| TC-UI-006 | fail | 16–17 | `screenshots/CH-08-17…19` | A-11 (só diferenças leves); indicadores, régua, colunas e barra iguais. Vazio: sem frame |

Contagem: pass 0 · fail 6 · blocked 0 · skip 0

## Achados

### A-1 · [Loja · bloco "Na linha"] o bloco não tem a forma do protótipo — para a cliente e para a Adri, que aprovou o desenho

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passos 02, 04, 07 do log                                          |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — diferença visual sistemática; a cliente ainda marca, escolhe e leva |
| Reproduziu          | sim (2 de 2: 390 e 1440)                                              |
| Viewport            | 390×844 e 1440×900                                                    |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, abrir http://localhost:8082/produtos/qa-pingente-estrela em 390×844 (forma "Na linha")
2. Rolar até "Compre junto"

**Esperado:** protótipo da loja, `cj-loja.css` `.cj`/`.cj-item`/`.cj-linha` e `cj-loja-bloco.jsx` — ver linhas D1–D9.

**Observado:** bloco sem cartão, linhas em cartões próprios, caixa nativa, foto quadrada menor, preço "a partir de" à direita do nome, título 17 px/600 — ver D1–D9.

**Evidência:**

- `screenshots/CH-08-01-bloco-390-nada-marcado.png` — o bloco sem nada marcado
- `screenshots/CH-08-03-bloco-390-completo.png` — o bloco completo
- `screenshots/CH-08-06-bloco-1440-nada-marcado.png` — 1440
- console: nada · rede: nada

### A-2 · [Loja · bloco] falta a frase de resumo "Falta uma escolha em N peças…" no total — para a cliente que toca no botão com escolha pendente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passo 03                                                          |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | medium — estado de erro desenhado ausente; as mensagens por linha existem, mas quem está no rodapé do bloco (perto do botão) não lê o porquê |
| Reproduziu          | sim (2 de 2: 390 Na linha; 1440 Com fórmula, mesma ausência) |
| Viewport            | 390×844                                                               |

**Passos para reproduzir:**

1. Anônima, M-01 em 390, forma "Na linha"
2. Marcar "QA Correntes" e "QA Berloque Coração" sem escolher nada
3. Tocar em "Levar o conjunto" na barra fixa

**Esperado:** no rodapé do bloco, abaixo do PIX, `Falta uma escolha em 2 peças. Ela está marcada acima.` (role alert) — **fonte:** protótipo da loja, `cj-loja-bloco.jsx` (bloco `cj-total`, `tentou && faltas.length > 0`)

**Observado:** o rodapé mostra só "Total do conjunto R$ 259,90 · R$ 241,71 com Pix · O botão de compra leva…"; as mensagens aparecem só em cada linha ("Escolha a peça.", "Escolha o Cor da QA.").

**Evidência:**

- `screenshots/CH-08-02-bloco-390-falta.png`
- console: nada · rede: nada

### A-3 · [Loja · bloco] a mensagem de falta aparece cedo e em dobro — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passos 18, 19, 20                                                 |
| TC                  | TC-UI-001, TC-UI-003                                                  |
| Gravidade proposta  | low — ruído de texto, não impede escolher                             |
| Reproduziu          | sim (folha em 390 e diálogo em 1440: dobro; fórmula em 1440: cedo)    |
| Viewport            | 390×844 e 1440×900                                                    |

**Passos para reproduzir:**

1. Com a forma "Em folha", M-01 em 390, marcar "QA Correntes" → a folha abre
2. Com a forma "Com fórmula" (ou "Na linha"), M-01 em 1440, marcar "QA Berloque Coração" sem tocar no botão de compra

**Esperado:** na folha/diálogo, a frase do que falta só no rodapé, acima de "Incluir no conjunto"; no bloco, a mensagem por linha só depois de a cliente tentar comprar (`tentou`) — **fonte:** protótipo da loja, `cj-loja-bloco.jsx` (`Folha` e `falta = tentou && s.marcado ? …`)

**Observado:** folha e diálogo mostram "Escolha a peça." / "Escolha o Cor da QA." duas vezes (no corpo e no rodapé); na fórmula, "Escolha o Cor da QA." aparece logo ao marcar.

**Evidência:**

- `screenshots/CH-08-20-folha-390.png`, `screenshots/CH-08-21-dialogo-1440.png`, `screenshots/CH-08-22-formula-1440.png`

### A-4 · [Loja · bloco] textos fora do protótipo — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passos 03, 04                                                     |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — texto, sem mudar sentido (exceto a concordância "o Cor")        |
| Reproduziu          | sim (390 e 1440)                                                      |
| Viewport            | 390×844 e 1440×900                                                    |

**Passos para reproduzir:** M-01 anônima; marcar o berloque e tocar no botão; marcar a lista.

**Esperado / Observado:** ver D10–D13 (protótipo `cj-loja-bloco.jsx`).

**Evidência:** `screenshots/CH-08-02-bloco-390-falta.png`, `screenshots/CH-08-03-bloco-390-completo.png`

### A-5 · [Loja · "Com fórmula"] a faixa usa pílulas de texto no lugar das fotos — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passo 20                                                          |
| TC                  | TC-UI-003                                                             |
| Gravidade proposta  | low — visual; a faixa existe e reflete o marcado                      |
| Reproduziu          | sim (1 de 1 forma trocada; leitura estável)                           |
| Viewport            | 1440×900                                                              |

**Passos para reproduzir:** no painel, escolher "Com fórmula" e salvar; abrir M-01 em 1440.

**Esperado:** cada item da faixa é foto 64×80 (raio 12) com o nome em 11 px abaixo; o não marcado a 35 % de opacidade; "+" entre eles; sem fundo — **fonte:** `cj-loja.css` `.formula`.

**Observado:** faixa com fundo areia, itens em pílulas de texto brancas, o marcado preenchido em azul escuro; sem foto.

**Evidência:** `screenshots/CH-08-22-formula-1440.png`

### A-6 · [Loja · "Em folha"] diálogo e link da linha diferentes — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passos 18, 19                                                     |
| TC                  | TC-UI-003                                                             |
| Gravidade proposta  | low — visual/texto                                                    |
| Reproduziu          | sim                                                                   |
| Viewport            | 390×844 e 1440×900                                                    |

**Passos para reproduzir:** forma "Em folha"; M-01; ver as linhas e marcar o berloque em 1440.

**Esperado / Observado:** ver D14–D15 (protótipo `cj-loja.css` `.folha` em ≥1024 e `cj-loja-bloco.jsx`).

**Evidência:** `screenshots/CH-08-20-folha-390.png`, `screenshots/CH-08-21-dialogo-1440.png`

### A-7 · [Loja · gaveta] "Acompanha o …" sem o traço dourado — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri (conferindo a loja)                                       |
| Jornada e passo     | — · passo 06                                                          |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — visual                                                          |
| Reproduziu          | sim (2 linhas na mesma gaveta)                                        |
| Viewport            | 390×844                                                               |

**Passos para reproduzir:** M-01 em 390; levar pingente + Veneziana + berloque; ver a gaveta.

**Esperado:** frase em 12,5 px `ink-soft` precedida de um traço 10×1 px `accent` (#b8945f) — **fonte:** `cj-loja.css` `.acomp i`.

**Observado:** "Acompanha o QA Pingente Estrela" sem o traço. Texto e nome completo conferem (CA-05.1).

**Evidência:** `screenshots/CH-08-05-gaveta-390-acompanha.png`

### A-8 · [Painel · editor de lista] textos e ajuda diferentes, e uma frase que descreve a loja errado — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-03 (montar a lista) · passos 11–12                                  |
| TC                  | TC-UI-004                                                             |
| Gravidade proposta  | medium — "O nome da lista é o título do bloco" é falso na loja (o título do bloco é sempre "Compre junto"; o nome da lista é o nome da linha) e some a dica de como nomear a lista |
| Reproduziu          | sim (M-02 e Nova lista)                                               |
| Viewport            | 1440×900                                                              |

**Passos para reproduzir:** logada, abrir http://localhost:8083/admin/compre-junto/listas/318c6fb9-f851-4b50-8543-acb1413e3907.

**Esperado / Observado:** ver D16–D22 (protótipo `cj-admin-listas.jsx` › `EditorLista`, `cj-admin-comum.jsx` › `Variacoes`, `BuscaProduto`).

**Evidência:** `screenshots/CH-08-11-editor-m02-1440.png`, `screenshots/CH-08-12-nova-lista-1440.png`

### A-9 · [Painel · índice] subtítulo, contagem da aba e texto dos cartões diferentes — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-03 · passos 09–10                                                   |
| TC                  | TC-UI-004                                                             |
| Gravidade proposta  | low — texto/estrutura leve                                            |
| Reproduziu          | sim (1440 e 390)                                                      |
| Viewport            | 1440×900 e 390×844                                                    |

**Passos para reproduzir:** logada, http://localhost:8083/admin/compre-junto em 1440 e em 390.

**Esperado / Observado:** ver D23–D26 (protótipo `cj-admin-listas.jsx` › `Pagina`, `ListasIndex`).

**Evidência:** `screenshots/CH-08-09-indice-1440.png`, `screenshots/CH-08-10-indice-390.png`

### A-10 · [Painel · aba "Compre junto" do produto] falta o cartão "Na loja" e as dicas de nome — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-04 (oferecer no pingente) · passos 13–14                            |
| TC                  | TC-UI-005                                                             |
| Gravidade proposta  | medium — some o resumo "Na loja" (o que a cliente vai ver, na ordem) que o desenho dava para a Adri conferir sem abrir a loja; o resto é texto |
| Reproduziu          | sim (M-01 e M-04)                                                     |
| Viewport            | 1440×900                                                              |

**Passos para reproduzir:** logada, abrir http://localhost:8083/admin/produtos/180c5b2c-a679-4911-ac4a-6d6eb9b08005/editar, aba "Compre junto".

**Esperado / Observado:** ver D27–D33 (protótipo `cj-admin-produto.jsx`).

**Evidência:** `screenshots/CH-08-14-aba-produto-m01-1440.png`, `screenshots/CH-08-15-recusa-4o-1440.png`

### A-11 · [Painel · Adesão] cartão do recorte sem título e rótulos diferentes — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-06 · passos 16–17                                                   |
| TC                  | TC-UI-006                                                             |
| Gravidade proposta  | low — o relatório se lê igual                                         |
| Reproduziu          | sim (1440 e 390)                                                      |
| Viewport            | 1440×900 e 390×844                                                    |

**Passos para reproduzir:** logada, http://localhost:8083/admin/compre-junto/adesao, 30 dias.

**Esperado / Observado:** ver D34–D37 (protótipo `cj-admin-listas.jsx` › `Adesao`).

**Evidência:** `screenshots/CH-08-17-adesao-1440-por-joia.png`, `screenshots/CH-08-18-adesao-1440-por-lista.png`, `screenshots/CH-08-19-adesao-390.png`

## Design

**Protótipo:** `69224d8a-17ae-4b1f-a251-a8105b41edc2` · Uma Estrelinha - Loja · `Produto - Compre Junto.html` · `claude_design` · lido pelo MCP do Claude Design (`cj-loja*.jsx`, `cj-loja.css`, `ds/tokens/*`); `e3957c10-bd49-4f3d-9256-04d72a7d0f41` · Uma Estrelinha - Backoffice · `Compre Junto - Listas e adesão.html` e `Produto - Compre Junto.html` · `claude_design` · lido pelo MCP (`cj-admin-*.jsx`). Dados fictícios dos protótipos (nomes, preços, contagens) não foram usados como régua. A moldura do painel (sidebar, topbar, paleta do admin) é do app, não do protótipo — não comparada.

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/produtos/:slug` · forma A | contêiner do bloco | fundo · borda · raio · padding | `#ffffff` (surface) · 1px `#e6dfd4` em volta · 20 px (`--radius-lg`) · 18/16/16 px (22 px em ≥1024) | transparente · só `border-top` 1px `#e6dfd4` · 0 · `20px 0 0` · 390 e 1440 | `CH-08-01`, `CH-08-06` | A-1 |
| D2 | idem | título "Compre junto" | tamanho · peso | 20 px · 400 (Libre Baskerville, `letter-spacing -.02em`) | 17 px · 600 · 390 e 1440 | `CH-08-01` | A-1 |
| D3 | idem | frase "Peças que eu escolhi…" | peso | 300 | 400 · 390 | `CH-08-01` | A-1 |
| D4 | idem | cada linha | estrutura | linhas na mesma superfície, separadas por `border-top` 1px, sem cartão | cada linha é um cartão branco, borda 1px, raio 12 px, padding 12 px · 390 e 1440 | `CH-08-01` | A-1 |
| D5 | idem | caixa de marcar | componente · tamanho | caixa própria 24×24, borda 2px `#8c8073` (field), raio 6, alvo 44×44 | `input type=checkbox` nativo 20×20 com `accent-color` · 390 | `CH-08-01` | A-1 |
| D6 | idem | foto da linha | dimensão · raio | 64×80 · 12 px | 56×56 · 390 | `CH-08-01` | A-1 |
| D7 | idem | nome do adicional | peso · altura de linha | 400 · 1.3 (≈20 px) | 600 · 20 px · 390 | `CH-08-01` | A-1 |
| D8 | idem | preço do adicional | posição · texto | abaixo do nome e do resumo, na mesma coluna; preço da peça em foco (`R$ 89,90`) sem prefixo | à direita do nome, com "a partir de" acima do valor enquanto nada está escolhido · 390 e 1440 | `CH-08-01`, `CH-08-03` | A-1 |
| D9 | idem | rodapé "Total do conjunto" | fundo · borda | sem fundo, `border-top` 1px `#e6dfd4`, padding-top 14 | caixa com fundo areia (`ground-deep`) e raio · 390 e 1440 | `CH-08-03` | A-1 |
| D10 | idem | rodapé do total, estado "falta" | texto | `Falta uma escolha em 2 peças. Ela está marcada acima.` | ausente · 390 | `CH-08-02` | A-2 |
| D11 | idem | linha do PIX no total | texto | `R$ X no PIX` | `R$ X com Pix` · 390 e 1440 | `CH-08-03` | A-4 |
| D12 | idem | mensagem de falta do eixo | texto | `Escolha o cor da qa.` (eixo e 1ª palavra em minúscula, `toLowerCase`) | `Escolha o Cor da QA.` · 390 | `CH-08-02` | A-4 |
| D13 | idem | link da linha marcada | estado | o link "Ver opções"/"Ver os N modelos" some quando a linha está marcada | "Esconder opções" continua visível com a linha marcada · 390 e 1440 | `CH-08-03` | A-4 |
| D14 | `/produtos/:slug` · forma B (≥1024) | diálogo | largura | `min(520px, 100%)` = 520 | 512 · 1440 | `CH-08-21` | A-6 |
| D15 | idem · forma B | link da linha de peça só | texto | `Escolher` | `Ver opções` · 390 | `CH-08-20` | A-6 |
| D16 | `/admin/compre-junto/listas/:id` | lateral "Como a cliente vê" | texto | `Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma. Peças fora do ar, sem nenhuma variação à venda, ou que sejam a própria joia da página são puladas.` | `O nome da lista é o título do bloco na página da joia, e as peças aparecem nesta ordem.` · 1440 | `CH-08-11` | A-8 |
| D17 | idem | dica sob "Nome da lista" | presença | `É este nome que a cliente lê no Compre Junto, na página de cada joia que usa a lista. Escreva como você falaria com ela: “Correntes”, “Pingentes para a mesma corrente”.` | ausente · 1440 | `CH-08-11` | A-8 |
| D18 | idem | lateral "Em uso" | texto | `2 joias oferecem esta lista. Mudar aqui muda o Compre Junto de todas elas.` | `2 joias oferecem esta lista` · 1440 | `CH-08-11` | A-8 |
| D19 | idem | resumo das variações | texto | `Variações oferecidas: todas as ativas (3)` | `Variações: todas as ativas (3)` · 1440 | `CH-08-11` | A-8 |
| D20 | idem | contador do nome | texto | `12 / 40` | `12/40` · 1440 | `CH-08-11` | A-8 |
| D21 | idem | busca de peça | rótulo · estado | `Acrescentar uma peça`; resultados só depois de 2 letras, até 8 | `Acrescentar peça`; 20 resultados abertos sem digitar ("747 no catálogo", "Mostrando 20 de 747…") · 1440 | `CH-08-11` | A-8 |
| D22 | idem | trilha | texto | `Compre Junto › QA Correntes` | `Catálogo › Compre Junto › QA Correntes` · 1440 | `CH-08-11` | A-8 |
| D23 | `/admin/compre-junto` | subtítulo | texto | `As listas de peças que você oferece junto com outras joias, e como elas estão saindo. O Compre Junto de cada joia se monta na página dela.` | `As listas de peças que você oferece junto com as joias.` (e na Adesão: `Como as peças oferecidas junto com as joias estão saindo.`) · 1440 | `CH-08-09`, `CH-08-17` | A-9 |
| D24 | idem | aba "Listas" | estrutura | contagem dentro da aba (`Listas 2`) | aba sem contagem; título "Listas (2)" acima da tabela · 1440 | `CH-08-09` | A-9 |
| D25 | idem | tabela | estrutura | dentro de um cartão (`card flush`); botão "Editar" como botão pequeno com borda | tabela solta na página; "Editar" sem borda · 1440 | `CH-08-09` | A-9 |
| D26 | idem · cartões 390 | linha de apoio | texto | `5 peças · em uso em 2 joias` / `1 peça · em nenhuma joia` | `5 peças · 2 joias` / `1 peça · Nenhuma joia` · 390 | `CH-08-10` | A-9 |
| D27 | `/admin/produtos/:id/editar` · aba Compre junto | cartão lateral "Na loja" | presença | cartão "Na loja" com a lista ordenada dos adicionais ("a cliente escolhe uma peça" / "uma peça só" · "some com …") | ausente (a coluna lateral é o Resumo do produto) · 1440 | `CH-08-14` | A-10 |
| D28 | idem | frase do cartão | texto | `Até três peças que a cliente pode levar junto com esta joia, na ordem em que aparecem na loja. Nada vem marcado: ela escolhe o que quer.` | `O que a cliente pode levar junto desta joia. Cada adicional é uma peça só ou uma peça de uma lista.` · 1440 | `CH-08-14` | A-10 |
| D29 | idem | dicas de nome | presença | `O nome da lista é o que a cliente lê no bloco.` / `O nome do produto é o que a cliente lê no bloco.` | ausentes · 1440 | `CH-08-14` | A-10 |
| D30 | idem | peça só escolhida | texto | nome + `a partir de R$ X` + "Trocar" | nome + "Trocar", sem preço · 1440 | `CH-08-14` | A-10 |
| D31 | idem | variações oferecidas | estrutura · texto | linha-resumo `Variações oferecidas: todas as ativas (N)` / `k de N` com "Escolher quais"; chips só abertos; `Nenhuma marcada: a loja oferece todas as variações ativas, inclusive as que você criar depois.` | chips sempre abertos sob o rótulo "Variações oferecidas"; `Nenhuma marcada vale todas as ativas, inclusive as que você criar depois.` · 1440 (o editor de lista usa a forma do protótipo — as duas telas divergem entre si) | `CH-08-14` | A-10 |
| D32 | idem | recusa do 4º adicional | texto | `Cada joia leva até 3 adicionais. Tire um para acrescentar outro.` | `Uma joia leva até 3 adicionais. Tire um para acrescentar outro.` · 1440 | `CH-08-15` | A-10 |
| D33 | idem | "Quando a peça sai do ar" | texto · posição | lateral; `…e ele aparece marcado aqui. Se todas as variações que você escolheu deixarem de existir, ele também sai — nunca passa a oferecer todas.` | abaixo do cartão principal; `…e o painel o marca. Se todas as variações escolhidas deixarem de existir, ele também sai: nunca passa a oferecer todas.` · 1440 | `CH-08-14` | A-10 |
| D34 | `/admin/compre-junto/adesao` | cartão do recorte | estrutura | título à esquerda (`Por joia principal` / `Por lista`) e alternador à direita | sem título; só o alternador · 1440 | `CH-08-17` | A-11 |
| D35 | idem | alternador | texto | `Por joia` / `Por lista` | `Por joia principal` / `Por lista` · 1440 | `CH-08-17` | A-11 |
| D36 | idem | nota da régua | ícone | ícone ⓘ 14 px antes do texto | sem ícone · 1440 | `CH-08-17` | A-11 |
| D37 | idem · cartões 390 | última linha | texto | `Mais sai: X` | `Peça que mais sai: X` · 390 | `CH-08-19` | A-11 |

Conferidos e iguais (sem diferença): título e frase do bloco (texto), "Escolha a peça · N modelos", resumo "QA Corrente Veneziana · 40 cm", nota do total, nota de 1440 "A joia e N peça(s) marcada(s) · total", barra fixa sem e com conjunto, rótulo "Levar o conjunto", "Incluir no conjunto" desabilitado enquanto falta, raio 20 do diálogo, recusa da 13ª peça, "Já está na lista", "N de 12", "N de 3 adicionais", estado "Sem Compre Junto…", "Esta joia está na lista e é pulada aqui…", "Some quando a cliente escolhe" e as duas frases de apoio, "Editar a lista “…”" / "Criar uma lista nova", indicadores, linhas de apoio, régua e colunas da Adesão.

**Telas não conferidas:**

- `/produtos/:slug` — estado "principal indisponível": inalcançável (a loja desabilita a combinação antes)
- Gaveta — variação "sacola vazia": não provocada (orçamento)
- `/admin/compre-junto` — índice vazio: exigiria apagar listas da massa
- Editor — peça fora do ar e o selo "N peça(s) saiu/saíram do ar" no índice: a massa atual não tem peça fora do ar
- Escolha da forma no painel, selo "saiu do ar" em adicional do tipo peça, "acompanha" na confirmação/Minha Conta/painel, carregando e erro: sem frame
- Adesão vazia: sem frame

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com peça marcada e incompleta, o total do conjunto soma só o principal (R$ 259,90); o protótipo soma o preço da peça em foco mesmo sem a escolha completa. O PRD decide | 03 | polimento |
| O estado "Essa combinação está indisponível no momento." do protótipo não é alcançável: o seletor de variação da loja desabilita a combinação esgotada antes | 08 | pré-existente |
| A gaveta é a de antes: "Sua sacola" + selo, rodapé "Frete calculado no checkout, com o seu CEP." sem a linha do PIX, "Finalizar Pedido", lixeira no lugar de "Remover", sem "Continuar comprando" — o protótipo redesenha a gaveta inteira | 06 | pré-existente |
| O recorte "Por lista" da Adesão traz a linha "Peça escolhida direto no produto", que o protótipo não desenha | 16 | polimento |
| "Some quando a cliente escolhe" lista as combinações da joia ("Prata 925 · Não", …, 6 chips); o protótipo lista um eixo só (Tipo de elo, 3 chips) | 13 | polimento |
| A busca de peça do painel abre 20 resultados sem digitar (componente compartilhado); o protótipo só mostra depois de 2 letras | 11 | pré-existente |

## Fora da cobertura

- Medição fina de espaço/padding de todos os elementos — feita nos contêineres e nos elementos principais do bloco (D1–D9); o resto por screenshot
- Índice vazio e peça fora do ar — massa não permite sem alteração proibida
- Sacola vazia (TC-UI-002, variação) — orçamento priorizado para as formas B e C
- Estado "principal indisponível" — inalcançável pela tela (spec-gap)
- Hover/foco dos controles — não desenhados no protótipo além do `:focus-visible` genérico; não conferidos (do CH-06/CH-07)

## Debrief

- **Surpresas:** a forma da loja diverge do protótipo de modo sistemático (bloco sem cartão, linhas em cartão, caixa nativa), embora todos os textos principais batam; a tela "Como a cliente vê" do editor afirma algo que a loja não faz. Ao trocar a forma e voltar, a chave da forma passou a existir gravada como "Na linha" (antes ausente, mesmo efeito)
- **Próximo charter:** reteste visual do bloco depois da decisão de seguir ou não o protótipo; conferir "peça fora do ar" com massa própria
- **Padrão novo:** ler o CSS do protótipo e medir `getComputedStyle` só dos contêineres e da linha-modelo achou a maior parte das diferenças com poucas ações
