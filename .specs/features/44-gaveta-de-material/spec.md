# Gaveta de material na página do produto — Especificação

> Feature `44`. Desenho: página **"44 · Gaveta de material"** do arquivo Paper *Uma Estrelinha*
> (artboards `A · O gatilho`, `B · Gaveta pela direita · escolha`, `C · Gaveta pela direita ·
> escolhido`, `D · Estados de borda`, `E · Computador · painel lateral`).

## Problem Statement

A cliente decide a compra sem saber como vai enviar o material. O guia existe
(`/como-enviar-seu-material-de-dna`, feature `31`) mas exige **sair da página do produto** no meio da
decisão — e desde 2026-09-11 a página do produto não fala mais de material afetivo, porque
`material_kinds` **diz menos que a descrição** (`BL-015`) e anunciar um material só, na tela onde a
compra se decide, é dizer errado num registro memorial.

Falta o caminho do meio: responder *"como eu mando isso?"* sem sair da página **e sem a loja afirmar
qual é o material da cliente**.

## Goals

- [ ] A página do produto oferece o caminho quando a peça exige material, **sem nomear material nenhum**
- [ ] A gaveta responde a dúvida em **dois toques** — a cliente diz qual é o material dela e vê só aquilo
- [ ] O conteúdo do guia passa a ter **um dono só**, lido pela página e pela gaveta
- [ ] O guarda da página do produto é **estreitado, não revogado**: continua recusando *qual* material

## Out of Scope

| Feature | Reason |
| --- | --- |
| Substituir a página `/como-enviar-seu-material-de-dna` | A gaveta é o resumo acionável; a página continua sendo o documento completo, e a gaveta linka para ela |
| O endereço de envio (`MaterialAddress`) | O endereço chega por WhatsApp **depois do pagamento confirmado** — anunciá-lo antes convida a enviar material de um pedido que ainda não existe |
| Formas de envio comparadas (SEDEX × PAC × carta), declaração e checklist | São conteúdo de **depois da compra**; estão na página e na confirmação. Trazê-los faria a gaveta virar a página |
| Integração com o histórico do navegador (gesto de voltar fecha a gaveta) | Nenhuma das quatro superfícies sobrepostas da loja faz isso hoje (carrinho, busca, menu, filtros), e a gaveta abre em largura cheia no celular como elas. **É dívida da loja, não desta feature** — consertá-la aqui deixaria esta gaveta diferente das outras quatro, que é o oposto do que a consistência pede. Ver Assumptions |
| Corrigir a curadoria de `requires_material` / `material_kinds` | É `BL-015`, e é trabalho da dona, não de código — ver Assumptions |
| Telemetria de abertura da gaveta | A loja não emite evento de front em superfície nenhuma hoje; criar o primeiro aqui é infraestrutura fora do escopo |

---

## Assumptions & Open Questions

| Assumption / decisão | Escolha | Rationale | Confirmado? |
| --- | --- | --- | --- |
| Quem diz qual é o material | **A cliente escolhe**, por chips | Decisão do usuário em 2026-09-11. A loja afirmar seria repetir o defeito que a remoção de `MaterialNotice` acabou de apagar (`BL-015`) | **sim** |
| De que lado a gaveta entra | **Pela direita**, nos dois tamanhos | Decisão do usuário em 2026-09-11. É o lado em que a gaveta do carrinho já abre nesta loja | **sim** |
| Largura no celular | **Cheia**, sem faixa de véu | Decisão do usuário em 2026-09-11, depois de a primeira entrega usar `tela − 48px`. O carrinho, a busca e a folha do menu já são `w-full` no celular, e ser a única superfície com desenho próprio custa mais do que a faixa resolvia. **O custo foi levantado e aceito**: sem véu não há "toque fora" no celular, e o gesto de voltar do Android sai da página do produto — exatamente como já acontece nas outras três. Mitigação: o cabeçalho não rola, então o X de 44px é sempre alcançável (`GAV-21` AC 4) | **sim** |
| Peça com `requires_material = false` cuja descrição pede material | **O gatilho não aparece** | O interruptor tem a mesma dívida de curadoria da coluna (`BL-015`). Mostrar sempre poria o convite em ~500 peças que não pedem material. Registrado como dívida, não resolvido aqui | não |
| A escolha da cliente sobrevive ao fechar a gaveta? | **Sim, enquanto a aba estiver aberta** (memória do store, **sem** `localStorage`) | Reescolher a cada consulta é atrito puro. Sem `localStorage` porque não é preferência da pessoa, é contexto de uma visita — e a regra de chave nova volta a valer no primeiro cliente real (`CLAUDE.md`) | não |
| Rótulo dos chips | Campo **`rotuloCurto`** no mesmo registro, ao lado de `rotulo` | Medido no mock com o dado real: os títulos das fichas produzem **7 fileiras** de chips e empurram a ficha para fora da tela; com rótulo curto são 5. Uma segunda lista à mão seria o defeito 01 — o campo mora no mesmo registro e tem guarda (`GAV-14`) | não |
| Onde o vídeo toca | **Dentro da gaveta**, no lugar da capa | `VideoLightbox` é um `Dialog` do Radix; diálogo sobre gaveta empilha foco em duas camadas, e no celular a gaveta já ocupa quase a tela inteira | não |

**Open questions:** nenhuma — tudo acima está resolvido ou registrado como suposição.

---

## User Stories

### P1: A cliente descobre como enviar sem sair da página ⭐ MVP

**User Story**: Como cliente prestes a comprar uma joia que leva material meu, quero ver como se
envia sem perder a página do produto, para decidir a compra sabendo no que estou entrando.

**Why P1**: É a feature. Sem isto, a dúvida vira uma saída da página — ou uma mensagem no WhatsApp
que a Adri responde à mão, uma por uma.

**Acceptance Criteria**:

1. WHEN a página do produto renderiza uma peça com `requires_material = true` THEN a coluna de
   informação SHALL exibir uma linha acionável rotulada **"Como enviar seu material de DNA"**, com
   apoio **"Passo a passo, vídeo e quantidade certa"**, posicionada **depois do estado de estoque**
2. WHEN a peça tem `requires_material` `false` ou `null` THEN a linha **NÃO SHALL** ser renderizada
3. WHEN a linha é renderizada THEN ela **NÃO SHALL** conter nome de material algum — nem rótulo de
   `MATERIAL_KIND_LABELS`, nem valor de `material_kinds`
4. WHEN a linha é acionada THEN a gaveta SHALL abrir **entrando pela borda direita**, por cima da
   página, sem navegar
5. WHEN a linha é renderizada THEN ela SHALL ter altura mínima de **44px**

**Independent Test**: abrir `/produtos/<slug>` de peça que exige material, ver a linha, acionar, ver
a gaveta; repetir numa peça que não exige e não ver linha nenhuma.

---

### P1: O guarda é estreitado, não revogado ⭐ MVP

**User Story**: Como quem mantém a loja, quero que continue impossível a página do produto voltar a
dizer *qual* material, mesmo agora que ela pode dizer *que existe* material.

**Why P1**: A trava foi criada hoje, por um motivo que não mudou. Desligá-la para caber a feature é
exatamente o que a `41` custou: quando uma AC remove uma trava, o teste que a defendia tem de ser
**invertido**, nunca deixado de lado.

**Acceptance Criteria**:

1. WHEN `semMaterialNaPaginaDoProduto.test.ts` roda THEN ele SHALL continuar reprovando
   `MaterialNotice`, `material_kinds`, `materialKindsOf`, `materialKindLabel`,
   `MATERIAL_KIND_LABELS`, `materialSummary` e `materialAnchor` em `entities/product/ui`,
   `widgets/product-buy-bar` e `pages/ProductPage.tsx`
2. WHEN o mesmo guarda roda THEN ele **NÃO SHALL** mais reprovar `requiresMaterial`, e um sensor
   SHALL provar que a régua o aceita
3. WHEN o guarda roda THEN um sensor SHALL provar que a régua **ainda acusa** cada uma das sete
   formas do item 1, uma a uma
4. WHEN a gaveta é montada THEN os arquivos dela **NÃO SHALL** estar no escopo do guarda, e um teste
   SHALL provar que a gaveta de fato nomeia material — senão o escopo está errado, não a régua

**Independent Test**: injetar `materialKindsOf(product)` em `ProductInfo.tsx` e ver a suíte reprovar;
injetar `requiresMaterial(product)` no mesmo arquivo e ver a suíte passar.

---

### P2: A cliente vê só o material dela

**User Story**: Como cliente, quero dizer qual é o meu material e ver a quantidade, o recipiente e o
vídeo daquele material, sem ler o guia inteiro.

**Why P2**: É o que torna a gaveta mais simples que a página. Sem isto ela é a página numa caixa
menor.

**Acceptance Criteria**:

1. WHEN a gaveta abre sem material escolhido THEN ela SHALL exibir, **nesta ordem**: a nota de
   contexto ("Nada precisa ser enviado agora. Depois do pagamento confirmado, o endereço chega no seu
   WhatsApp."), a pergunta **"Qual é o seu material?"** com **um chip para cada entrada de
   `ATALHOS_DE_MATERIAL`**, e só então os quatro passos de `PASSOS_DO_ENVIO`
2. WHEN a cliente aciona um chip THEN a gaveta SHALL exibir o conteúdo daquele material **sem
   fechar** e **sem navegar**, e o chip escolhido SHALL ficar visualmente distinto dos demais
3. WHEN o material escolhido tem ficha rica (`FICHAS_DE_MATERIAL`) THEN a gaveta SHALL exibir
   quantidade (valor **e** nota), a lista de recipientes sob o título que a ficha declara
   (`listaTitulo`), **todos** os passos de preparo e **todos** os avisos, com `alerta` e `calma`
   visualmente distintos
4. WHEN o material escolhido é cartão simples (`CARTOES_DE_MATERIAL`) THEN a gaveta SHALL exibir os
   itens do cartão e **NÃO SHALL** renderizar bloco de quantidade nem de recipientes
5. WHEN o material escolhido é preparo em casa (`PREPARO_EM_CASA`) THEN a gaveta SHALL exibir o aviso
   do bloco e **todos** os seus passos, numerados
6. WHEN o material escolhido tem vídeo (`videoDoMaterial`) THEN a gaveta SHALL exibir a capa e, ao
   ser acionada, trocar a capa pelo player **dentro da própria gaveta**
7. WHEN o material escolhido **não** tem vídeo THEN nenhum bloco de vídeo SHALL ser renderizado
8. WHEN a cliente fecha e reabre a gaveta na mesma aba THEN o material escolhido antes SHALL
   continuar escolhido
9. WHEN a gaveta está aberta com material escolhido THEN o rodapé SHALL oferecer **"Ver o guia
   completo"** apontando para a âncora daquele material em `/como-enviar-seu-material-de-dna`

**Independent Test**: abrir a gaveta, tocar em "Cinzas", conferir os cinco blocos; tocar em "Dentes
de leite", conferir que quantidade e recipientes somem; tocar em "Unhas", conferir que não há vídeo.

---

### P2: O conteúdo do guia tem um dono só

**User Story**: Como quem mantém a loja, quero que a gaveta e a página do guia leiam o mesmo
conteúdo, para uma correção da Adri valer nas duas.

**Why P2**: É a regra do repositório (`defeito 01`) e o motivo de `model/fichas.ts` ter sido apagado
na `31`. Duas cópias do guia não quebram nada — divergem em silêncio.

**Acceptance Criteria**:

1. WHEN o código é compilado THEN o conteúdo do guia (passos, fichas, cartões, preparo em casa,
   atalhos, âncoras e vídeos) SHALL residir em **exatamente um** módulo, alcançável pela página e
   pela gaveta **sem import lateral entre widgets**
2. WHEN a página `/como-enviar-seu-material-de-dna` é renderizada THEN ela SHALL exibir o mesmo
   conteúdo de antes desta feature — nenhuma seção some, nenhum texto muda
3. WHEN um `MaterialKind` existe em `MATERIAL_KINDS` THEN ele SHALL ter destino no dono único
   (`MATERIAIS_SEM_ANCORA` continua vazio)
4. WHEN uma entrada de `ATALHOS_DE_MATERIAL` existe THEN ela SHALL ter `rotuloCurto` não vazio, com
   no máximo **20 caracteres**

**Independent Test**: uma busca no repositório acha **uma** definição de `FICHAS_DE_MATERIAL`; a
suíte da página do guia passa sem alteração de asserção.

---

### P3: O computador ganha o mesmo painel

**User Story**: Como cliente no computador, quero o mesmo conteúdo num painel lateral, sem a página
sumir.

**Why P3**: ~90% dos acessos são de celular; o computador é a adaptação. Mas o painel é o **mesmo
componente**, então o custo é de largura, não de código.

**Acceptance Criteria**:

1. WHEN a viewport é de computador THEN o painel SHALL ocupar **480px** à direita, com a página
   visível ao lado, e a borda esquerda SHALL existir
2. WHEN a viewport é de celular THEN o painel SHALL ocupar a **largura cheia** da tela, sem borda
   esquerda
3. WHEN o painel é renderizado em qualquer tamanho THEN o conteúdo SHALL ser o mesmo — nenhuma seção
   existe só num dos dois
4. WHEN a ficha é mais longa que a tela THEN o cabeçalho **NÃO SHALL** rolar com o conteúdo — o
   fecho de 44px permanece alcançável

---

## Edge Cases

- WHEN `ATALHOS_DE_MATERIAL` ganha uma entrada nova THEN o chip correspondente SHALL aparecer sem
  alteração na gaveta — a lista é derivada, não escrita
- WHEN o material escolhido é `Outro material` THEN a gaveta SHALL exibir o aviso do cartão e a saída
  para WhatsApp, e **NÃO SHALL** exibir quantidade, recipientes ou vídeo
- WHEN a capa do YouTube não carrega THEN o bloco de vídeo SHALL permanecer acionável e legível pelo
  título, sem imagem quebrada
- WHEN o player é bloqueado (extensão, rede corporativa) THEN a gaveta SHALL manter `videoUrl` como
  saída externa
- WHEN a gaveta é fechada THEN o foco SHALL voltar para a linha que a abriu
- WHEN a página do produto é renderizada em celular THEN a linha do gatilho **NÃO SHALL** ficar
  encoberta pela barra fixa de compra

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| GAV-01 | P1: a linha existe, com rótulo e posição declarados | Design | Pending |
| GAV-02 | P1: só quando `requires_material` é verdadeiro | Design | Pending |
| GAV-03 | P1: o gatilho não nomeia material | Design | Pending |
| GAV-04 | P1: aciona e a gaveta abre pela direita, sem navegar | Design | Pending |
| GAV-05 | P1: alvo de 44px | Design | Pending |
| GAV-06 | P1: o guarda continua recusando as sete formas | Design | Pending |
| GAV-07 | P1: o guarda passa a aceitar `requiresMaterial`, com sensor | Design | Pending |
| GAV-08 | P1: escopo do guarda não alcança a gaveta, e há prova | Design | Pending |
| GAV-09 | P2: ordem do corpo — nota, pergunta, chips, passos | Design | Pending |
| GAV-10 | P2: escolher troca o corpo sem fechar nem navegar | Design | Pending |
| GAV-11 | P2: ficha rica completa | Design | Pending |
| GAV-12 | P2: cartão simples sem blocos vazios | Design | Pending |
| GAV-13 | P2: preparo em casa | Design | Pending |
| GAV-14 | P2: vídeo dentro da gaveta, e ausência quando não há | Design | Pending |
| GAV-15 | P2: a escolha sobrevive ao fechar, na mesma aba | Design | Pending |
| GAV-16 | P2: rodapé linka para a âncora do material escolhido | Design | Pending |
| GAV-17 | P2: dono único do conteúdo do guia | Design | Pending |
| GAV-18 | P2: a página do guia não regride | Design | Pending |
| GAV-19 | P2: `MATERIAIS_SEM_ANCORA` continua vazio | Design | Pending |
| GAV-20 | P2: `rotuloCurto` existe e cabe em 20 caracteres | Design | Pending |
| GAV-21 | P3: 480px no computador, largura cheia no celular, cabeçalho não rola | Design | Pending |
| GAV-22 | Edge: foco volta para o gatilho ao fechar | Design | Pending |
| GAV-23 | Edge: saída externa do vídeo preservada | Design | Pending |

**Coverage:** 23 total, 0 mapeados para tasks, 23 não mapeados ⚠️ (preenchido na fase Tasks)

---

## Implicit-Requirement Dimensions — sweep

| Dimensão | Resolução |
| --- | --- |
| Input validation & bounds | `GAV-20` (teto de 20 caracteres) e `GAV-09` (a lista de chips é derivada, não digitada) |
| Failure / partial-failure | `GAV-23` e os Edge Cases do vídeo — capa e player degradam para o link externo |
| Idempotency / retry / duplicate | **N/A porque** a gaveta não escreve nada: nenhuma requisição, nenhuma mutação, nenhum estado no servidor |
| Auth boundaries & rate limits | **N/A porque** a página do produto é pública e a gaveta não chama endpoint algum da loja |
| Concurrency / ordering | **N/A porque** o único estado é local a uma aba e tem um escritor só — a própria cliente |
| Data lifecycle / expiry | `GAV-15` — vive na memória da aba e morre com ela; nada em `localStorage` |
| Observability | **N/A porque** a loja não emite evento de front em superfície nenhuma hoje; criar o primeiro aqui é infraestrutura fora do escopo |
| External-dependency failure | `GAV-23` — YouTube é a única dependência externa, e o iframe só nasce depois do toque |
| State-transition integrity | `GAV-10` e `GAV-15` — os estados são (fechada · aberta sem escolha · aberta com escolha), e escolher nunca fecha |

---

## Success Criteria

- [ ] Numa peça que exige material, a cliente vai de "quanto custa" a "quanto de cinzas eu mando" em
      **dois toques**, sem sair da página
- [ ] A suíte do store passa com o guarda estreitado, **e** a injeção de `materialKindsOf` em
      `ProductInfo.tsx` reprova
- [ ] Existe **uma** definição de `FICHAS_DE_MATERIAL` em todo o repositório
- [ ] A página `/como-enviar-seu-material-de-dna` renderiza idêntica — nenhuma asserção da suíte dela
      precisou ser enfraquecida
- [ ] Medido em 390×844: a pergunta "Qual é o seu material?" e **todos** os chips ficam acima da dobra
      ao abrir
