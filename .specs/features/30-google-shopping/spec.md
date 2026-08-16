# Google Shopping — feed próprio para o Merchant Center

## Problem Statement

O catálogo da Uma Estrelinha está no Google Shopping há tempo suficiente para ter **3.235 ofertas
aprovadas** (100% do que é enviado) na conta Merchant Center `685367464`. Quem alimenta essa conta
hoje é o app `social-google` da Nuvemshop, por **Content API** (fonte de dados `10548587322`, rótulo
`BR`, Brasil/Português) — um push do servidor deles, com OAuth do app deles. **No dia em que o DNS de
`umaestrelinha.com.br` apontar para a loja nova, essa fonte para de fazer sentido e as 3.235 ofertas
morrem com ela.**

A loja nova não tem nada disso: não gera feed, não emite dado estruturado, e a página do produto
**ignora o parâmetro `?variant=`** que está em todos os links indexados hoje. Sem as três coisas, o
cutover troca um catálogo aprovado por um catálogo inexistente.

## Goals

- [ ] Servir um feed que reproduza as **mesmas ofertas** que hoje estão no Merchant Center — mesmo
      `id`, mesmo `item_group_id`, mesma URL de destino —, de modo que a virada seja troca de fonte
      de dados e não recriação de catálogo.
- [ ] Fazer a landing page **provar** o preço e a disponibilidade da variação anunciada, para um
      cliente HTTP que não executa JavaScript.
- [ ] Dar à dona um interruptor explícito, desligado por padrão, que só é ligado depois do cutover.

## Out of Scope

Explicitamente excluído. Documentado para impedir alargamento.

| Item | Motivo |
| --- | --- |
| `sitemap.xml` | É a **outra metade** da `BL-007`. O Shopping exige o dado estruturado, não o sitemap; a `BL-007` fica parcialmente aberta e o registro no `BACKLOG.md` é atualizado para dizer qual metade caiu aqui. |
| Push por Merchant API / Content API | Exige projeto GCP, service account e credencial rotacionável para ganhar latência que 690 produtos de baixa rotatividade não pedem. A busca agendada entrega o mesmo catálogo sem nenhum segredo novo. |
| Vincular Google Ads | Está desconectado hoje (print da aba *Minha conta*), e conectar é decisão comercial da dona, não código. |
| Criar a fonte de dados dentro do Merchant Center | É clique no painel do Google, feito uma vez, no cutover. A feature entrega a URL e o passo a passo. |
| Resolver os **2 itens recusados** | O motivo é da conta e vem junto no cutover; corrigi-los é curadoria da dona, como `show_in_menu` e as perguntas frequentes. |
| Configuração de frete e devolução no Merchant Center | Já está configurada na conta (`Entregas e devoluções` no print), é de conta e não de feed. O feed **não** emite `g:shipping`. |
| Instagram / Catálogo da Meta | O painel da Nuvemshop trata os dois na mesma tela. Aqui é só Google — a Meta tem outro contrato e outra conta. |
| Reescrever `payment/**` | Nenhuma decisão de dinheiro muda. O feed **lê** preço; não calcula nenhum. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assunção / decisão | Default escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| Formato do `offer_id` | `product_variants.nuvemshop_id`, cru, sem prefixo | Medido: `offerId=1259936246` na URL do Merchant Center → a linha `product_variants.nuvemshop_id = 1259936246`, produto `281745761`, slug `pulseira-7-nos-ajustavel-protecao-kabbalah`. Bate com o `?variant=` do link indexado. | **y** |
| `item_group_id` | `products.nuvemshop_id` | Medido: o campo *ID do grupo de itens* do print vale `281745761`, que é o `nuvemshop_id` do produto daquela variação. | **y** |
| Oferta de produto criado no admin (sem `nuvemshop_id`) | `offer_id` = o UUID da variação | Hoje são **zero** linhas (medido: `nuvemshop_id is null` devolve 0 em `products` e em `product_variants`), mas a regra precisa existir antes da primeira. UUID nunca colide com bigint da Nuvemshop. | n |
| Regra de inclusão | variação `is_active` de produto `is_active`, com `price not null` | Medido: **3.233** no banco contra **3.237** no Merchant Center (3.235 aprovadas + 2 recusadas). Diferença de 4, a reconciliar na implementação — não é divergência de regra. | n |
| Precedência quando **mais de um** motivo de exclusão se aplica | `produto_inativo` > `variacao_inativa` > `sem_preco` | Lacuna de precisão achada na T2 e resolvida ali. O critério é **o que a dona faria a seguir**: com o produto inteiro fora do ar, dizer "esta linha está sem preço" manda consertar a coisa errada — reativar o produto é o único passo que muda alguma coisa. | n |
| Desconto do Pix no feed | **não entra** | `g:price` é o preço sem condição. O Pix é condicional a meio de pagamento; anunciá-lo como `sale_price` faria a landing page mostrar um número e o feed outro — que é exatamente o que o Merchant Center reprova. | n |
| Promoção progressiva no feed | **não entra** | Condicional a quantidade. Mesmo raciocínio. | n |
| `sale_price` | emitido só quando `compare_price > price`; aí `g:price = compare_price` e `g:sale_price = price` | É o único par da nossa base que significa "de/por" sem condição. | n |
| Descrição enviada | a mesma que a loja mostra — `sanitizeHtml(stripFaqBlock(html))` reduzido a texto | Parear com a landing page. Mandar o bloco de FAQ que a loja filtra faria o feed descrever uma página que não existe. | n |
| `identifier_exists` | `no` por padrão, com sobrescrita por produto | O print mostra a Nuvemshop marcando *"produto único ou vintage sem identificador"*, e joia artesanal não tem GTIN. | **y** |
| `google_product_category` | default de loja `Apparel & Accessories > Jewelry`, sobrescrita por produto | Categoria de nível de conta erraria menos que deixar o Google inferir 3.233 vezes. | n |
| Conteúdo do texto enviado ao Google | **não muda** em relação ao que está aprovado hoje | 3.235 itens estão aprovados com a descrição da Nuvemshop. `material_kinds`, o resumo de material e as perguntas frequentes **não** entram no feed: são sinais novos numa conta cujo nicho já é sensível, e mudá-los no mesmo dia do cutover tornaria impossível saber o que causou uma reprovação. | n |
| O que o interruptor desligado faz | o endpoint responde **404** | Antes do cutover a fonte nem existe no Merchant Center, então 404 é inofensivo. Depois de ligado, desligar é destrutivo — e a tela precisa dizer isso (`GSH-16`). | n |
| Autenticação do feed | URL pública, sem segredo | O catálogo já é público. Exigir credencial acrescenta um segredo a rotacionar para proteger dado que qualquer pessoa lê na vitrine. | n |
| Onde o JSON-LD é gerado | decisão da fase de **Design** | A spec fixa o **resultado observável** (`GSH-09`: presente na resposta HTTP, sem executar JS). Como produzi-lo — função de edge que injeta no `index.html`, prerender no build, ou outra — é escolha de arquitetura. | n |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: O feed reproduz o catálogo já indexado ⭐ MVP

**User Story**: Como dona da loja, quero que o Google leia do nosso próprio endereço as mesmas
ofertas que ele já conhece, para que a virada de plataforma não apague 3.235 anúncios gratuitos.

**Why P1**: É a razão da feature existir. Sem isso, o cutover é uma perda.

**Acceptance Criteria**:

1. WHEN o feed é gerado THEN o sistema SHALL emitir **uma oferta por variação**, nunca por produto.
2. WHEN uma variação tem `nuvemshop_id` THEN o sistema SHALL usar esse valor, em decimal e sem
   prefixo, como `<g:id>`; WHEN não tem THEN SHALL usar o UUID da variação.
3. WHEN a oferta é emitida THEN o `<g:item_group_id>` SHALL ser o `nuvemshop_id` do produto, ou o
   UUID do produto quando aquele for nulo.
4. WHEN a oferta é emitida THEN o `<g:link>` SHALL ser
   `https://umaestrelinha.com.br/produtos/<slug>?variant=<o mesmo valor do g:id>`, **sem barra
   final** e **sem** `pf=mc`, construído por `productPath` e não por concatenação local.
5. WHEN uma variação está inativa, OU pertence a produto inativo, OU está sem preço THEN o sistema
   SHALL omiti-la do feed.
6. WHEN a leitura do catálogo no Supabase falha, OU devolve menos linhas do que a contagem exata da
   mesma consulta THEN o sistema SHALL responder **HTTP 5xx sem corpo de feed** — nunca um feed
   parcial e nunca um feed vazio.
7. WHEN o catálogo tem mais de 1.000 linhas THEN o sistema SHALL paginar a leitura e emitir todas —
   o teto do PostgREST não pode truncar em silêncio.
8. WHEN a oferta é emitida THEN o `<g:price>` SHALL ser o preço da **variação** (`product_variants.price`),
   nunca `products.base_price`; WHEN `compare_price > price` THEN SHALL emitir
   `<g:price>` = `compare_price` e `<g:sale_price>` = `price`.
9. WHEN a oferta é emitida THEN o `<g:availability>` SHALL derivar de `stock_policy` e do saldo da
   linha: `track` com saldo > 0 → `in_stock`; `track` com saldo 0 → `out_of_stock`;
   `backorder` → `backorder`; `none` → `in_stock`.
10. WHEN a variação tem `image_url` THEN o `<g:image_link>` SHALL ser essa imagem; WHEN não tem THEN
    SHALL ser a primeira imagem do produto (medido: 191 variações ativas caem neste ramo, e todo
    produto tem imagem).
11. WHEN a oferta é emitida THEN o feed SHALL declarar `<g:identifier_exists>no</g:identifier_exists>`,
    salvo sobrescrita do produto, e SHALL **não** emitir `<g:gtin>`.
12. WHEN o feed é servido THEN o `Content-Type` SHALL ser `application/xml` e o documento SHALL ser
    RSS 2.0 com o namespace `http://base.google.com/ns/1.0`.

**Independent Test**: `curl` no endpoint com o interruptor ligado e conferir que a oferta
`1259936246` existe, com `item_group_id` `281745761`, link
`/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246` e preço `19.90 BRL`.

---

### P1: A landing page prova o preço da variação ⭐ MVP

**User Story**: Como cliente que clicou num anúncio de uma variação específica, quero cair na página
já com aquela variação escolhida e aquele preço na tela, para não achar que o anúncio mentiu.

**Why P1**: Sem isto, o feed é tecnicamente correto e comercialmente inútil. O Merchant Center
verifica preço e disponibilidade **na landing page**: 3.233 ofertas apontando para uma página que
mostra outro preço é reprovação em massa, e a cliente que chega vê um valor diferente do anunciado.

**Acceptance Criteria**:

1. WHEN a URL do produto traz `?variant=<id>` e o id casa com uma variação **daquele** produto THEN a
   página SHALL abrir com os eixos daquela variação já selecionados, e o preço exibido SHALL ser o
   dela.
2. WHEN o `?variant=` casa por `nuvemshop_id` THEN o sistema SHALL aceitá-lo; WHEN casa por UUID
   THEN SHALL aceitá-lo também — as duas formas resolvem a mesma linha.
3. WHEN o `?variant=` é desconhecido, malformado, ou pertence a outro produto THEN a página SHALL
   abrir na seleção padrão de sempre, **sem erro visível e sem página em branco**.
4. WHEN a variação indicada está inativa THEN a página SHALL tratá-la como desconhecida (AC 3).
5. WHEN a página do produto é buscada por um cliente HTTP que **não executa JavaScript** THEN a
   resposta SHALL conter um bloco `application/ld+json` com `@type: Product`, contendo `name`,
   `image`, `sku`, e um `offers` com `price`, `priceCurrency: BRL`, `availability` e `url`.
6. WHEN a URL traz `?variant=<id>` válido THEN o `price` e o `availability` do JSON-LD SHALL ser os
   **daquela variação** — os mesmos valores que o feed anuncia para aquele `offer_id`.
7. WHEN a página traz `?variant=` THEN a tag `<link rel="canonical">` SHALL continuar apontando para
   a URL **sem** o parâmetro — a canônica do produto tem um formato só (`AD-018`).
8. WHEN o produto não tem grade vendável THEN o JSON-LD SHALL usar o preço do produto e o `?variant=`
   SHALL ser ignorado sem efeito.

**Independent Test**: `curl -s '<origem>/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246' | grep -A5 'ld+json'` mostra `"price":"19.90"`; a mesma URL no navegador abre com
`Tamanho: G` selecionado.

---

### P1: A dona liga o feed depois do cutover ⭐ MVP

**User Story**: Como dona da loja, quero ligar a integração num clique, depois de trocar o DNS, e
quero que a tela me diga o que fazer no Google e o que acontece se eu desligar.

**Why P1**: O feed não pode responder antes da virada, e a ordem do cutover é a parte que erra fácil
e machuca muito.

**Acceptance Criteria**:

1. WHEN a dona abre `/admin/google-shopping` THEN o sistema SHALL exibir o estado da integração, o ID
   do Merchant Center configurado e a URL do feed.
2. WHEN a integração nunca foi ligada THEN o estado inicial SHALL ser **desligada** — o default de
   `store_settings` nasce assim, e o guarda `storeSettingsDefaults.test.ts` cobre a divergência entre
   o TypeScript e a migration.
3. WHEN a integração está desligada THEN o endpoint do feed SHALL responder **404**.
4. WHEN a dona liga a integração THEN o endpoint SHALL passar a responder o feed, sem novo deploy.
5. WHEN a dona tenta desligar uma integração **que já esteve ligada** THEN o sistema SHALL exigir
   confirmação explícita e SHALL dizer, no próprio aviso, que os produtos saem do Google — desligar
   não é neutro.
6. WHEN a tela é exibida THEN o sistema SHALL apresentar a **ordem do cutover** como passos numerados:
   virar o DNS → ligar aqui → desconectar o app Google na Nuvemshop → excluir a fonte `Content API`
   no Merchant Center → criar a busca agendada apontando para a URL do feed.
7. WHEN a dona copia a URL do feed THEN o sistema SHALL entregá-la absoluta e pronta para colar no
   Merchant Center.
8. WHEN um usuário sem papel `admin` chama a escrita da configuração THEN o sistema SHALL recusar —
   a policy de `store_settings` já é `has_role(admin)`, e nenhuma rota nova pode contorná-la.

**Independent Test**: com a integração desligada, `curl -i` no feed devolve 404; ligar em
`/admin/google-shopping` e repetir devolve 200 com XML.

---

### P2: Os identificadores de produto ficam no cadastro

**User Story**: Como dona da loja, quero preencher marca, MPN, faixa etária e sexo no formulário do
produto, como eu fazia na Nuvemshop, para que o anúncio continue tão completo quanto é hoje.

**Why P2**: O feed funciona sem eles — mas o painel da Nuvemshop expõe exatamente esses campos, e
perdê-los é regressão de cadastro, não de código.

**Acceptance Criteria**:

1. WHEN a dona abre a aba de um produto THEN o sistema SHALL oferecer os campos `brand`, `mpn`,
   `age_group`, `gender`, `google_product_category` e `identifier_exists`.
2. WHEN um desses campos está preenchido THEN o feed SHALL emitir a tag correspondente; WHEN está
   vazio THEN SHALL **omitir a tag**, nunca emitir string vazia.
3. WHEN `google_product_category` do produto está vazio THEN o feed SHALL usar o default de loja.
4. WHEN `age_group` ou `gender` recebe valor THEN o sistema SHALL aceitar **apenas** os valores do
   vocabulário do Google (`age_group`: `newborn`, `infant`, `toddler`, `kids`, `adult`;
   `gender`: `male`, `female`, `unisex`) — campo de escolha, não texto livre.
5. WHEN o importador roda de novo THEN SHALL semear `brand` a partir de `RawProduct.brand` **somente
   onde a coluna ainda é nula** — mesma regra de `requires_material` (`22`), para não apagar
   curadoria da dona.

**Independent Test**: preencher `brand` num produto, regerar o feed e ver `<g:brand>` só naquela
oferta.

---

### P2: A tela diz o que o feed publica e o que ficou de fora

**User Story**: Como dona da loja, quero ver quantas ofertas o feed publica e quantas ficaram de
fora, com o motivo, para conferir contra o número que o Google mostra.

**Why P2**: `3.233` contra `3.235` é a única medida honesta de "deu certo". Sem ela, o sucesso é
opinião.

**Acceptance Criteria**:

1. WHEN a dona abre a tela THEN o sistema SHALL exibir a contagem de ofertas que o feed publica.
2. WHEN há variação excluída THEN o sistema SHALL exibir a contagem por motivo — produto inativo,
   variação inativa, sem preço.
3. WHEN a dona pede THEN o sistema SHALL listar as excluídas com link para o produto, para que a
   exclusão seja acionável e não só um número.
4. WHEN o endpoint do feed é servido com sucesso THEN o sistema SHALL registrar o instante, e a tela
   SHALL exibir **quando o Google buscou o feed pela última vez** — é o único sinal, do nosso lado,
   de que a busca agendada está de pé.
5. WHEN o feed nunca foi buscado desde que a integração foi ligada THEN a tela SHALL dizer isso
   explicitamente, em vez de mostrar campo vazio.

**Independent Test**: desativar uma variação, recarregar a tela e ver a contagem cair em 1 e o motivo
subir em 1.

---

### P3: O mapa de categoria do Google

**User Story**: Como dona da loja, quero associar a taxonomia do Google às minhas categorias, para
não repetir a escolha em 690 produtos.

**Acceptance Criteria**:

1. WHEN uma categoria tem `google_product_category` THEN o feed SHALL usá-la para os produtos dela,
   com precedência **produto > categoria > default de loja**.

---

## Edge Cases

- WHEN o catálogo está vazio THEN o feed SHALL responder 5xx, **não** um RSS com zero itens — feed
  vazio é a instrução "apague tudo" para o Merchant Center.
- WHEN duas variações do mesmo produto resolvem o mesmo `offer_id` THEN o sistema SHALL falhar a
  geração com erro explícito: id duplicado num feed é item descartado sem aviso do lado do Google.
- WHEN a descrição do produto é vazia THEN o feed SHALL emitir o nome do produto como descrição —
  `<g:description>` é obrigatório.
- WHEN o texto da descrição contém caractere inválido para XML THEN o sistema SHALL escapá-lo ou
  removê-lo, e o documento SHALL permanecer bem-formado.
- WHEN o `?variant=` aparece numa URL de categoria ou em qualquer rota que não seja de produto THEN
  SHALL ser ignorado.
- WHEN a variação anunciada esgota entre a geração do feed e o clique da cliente THEN a página SHALL
  abrir naquela variação, mostrando-a como indisponível — nunca redirecionar para outra.
- WHEN o feed é buscado com a integração ligada mas `VITE`/env de origem da loja ausente THEN o
  sistema SHALL responder 5xx em vez de emitir `<g:link>` relativo ou com host errado.

---

## Varredura de requisitos implícitos

Escopo Large: cada dimensão resolve num requisito ou num `N/A porque…` explícito. Sem célula em
branco.

| Dimensão | Onde resolve |
| --- | --- |
| Validação de entrada e limites | `GSH-11` (`?variant=` malformado, desconhecido ou de outro produto), `GSH-20` (vocabulário fechado de `age_group`/`gender`), *Edge Cases* (caractere inválido para XML) |
| Falha e falha parcial | `GSH-05` — leitura incompleta ou com erro responde 5xx. **Feed parcial é pior que feed ausente**: o Google interpreta a ausência de um item como pedido de remoção |
| Idempotência / repetição / duplicata | O feed é `GET` puro sem efeito colateral, então repetir é grátis. A duplicata que importa é de `offer_id` dentro do mesmo documento, e ela **falha a geração** (*Edge Cases*) em vez de sair calada |
| Fronteiras de auth e limite de taxa | `GSH-18` (escrita da configuração só com `has_role(admin)`). Limite de taxa: **N/A porque** o consumidor é uma busca agendada diária e o conteúdo servido já é público na vitrine — throttle protegeria dado que qualquer pessoa lê de graça |
| Concorrência / ordenação | **N/A porque** a geração é leitura sem estado: não há escrita a serializar nem ordem entre requisições. A única escrita da feature é o interruptor, que é uma linha de `store_settings` |
| Ciclo de vida do dado | O feed não persiste nada. O ciclo que existe é do lado do Google — item deixa de ser reenviado, item expira — e é o que `GSH-16` obriga a tela a dizer antes de a dona desligar |
| Observabilidade | `GSH-22` (contagem publicada e contagem excluída por motivo; instante da última busca do Google). É o que transforma "deu certo" de opinião em medida |
| Falha de dependência externa | `GSH-05` para o Supabase. Para o Google: **N/A porque** não há chamada de saída — quem inicia é ele, e a nossa ponta é só um documento |
| Integridade de transição de estado | `GSH-15` e `GSH-16`. São dois estados, e a transição perigosa é uma só: ligado → desligado, que é destrutiva e por isso exige confirmação com o efeito escrito |

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| GSH-01 | P1-A: uma oferta por variação, `id` = `nuvemshop_id` | Execute | **Verified** |
| GSH-02 | P1-A: `item_group_id` = produto | Execute | **Verified** |
| GSH-03 | P1-A: `link` canônico com `?variant=`, por `productPath` | Execute | **Verified** |
| GSH-04 | P1-A: regra de inclusão (ativa, produto ativo, com preço) | Execute | **Verified** |
| GSH-05 | P1-A: leitura completa ou 5xx — nunca feed parcial nem vazio | Execute | **Verified** |
| GSH-06 | P1-A: preço da variação, `sale_price` só por `compare_price` | Execute | **Verified** |
| GSH-07 | P1-A: `availability` derivado de `stock_policy` | Execute | **Verified** |
| GSH-08 | P1-A: imagem da variação com recuo para a do produto | Execute | **Verified** |
| GSH-09 | P1-A: `identifier_exists`, sem `gtin`; RSS 2.0 bem-formado | Execute | **Verified** |
| GSH-10 | P1-B: `?variant=` seleciona a variação na página | Execute | **Verified** |
| GSH-11 | P1-B: `?variant=` desconhecido cai na seleção padrão, sem erro | Execute | **Verified** |
| GSH-12 | P1-B: JSON-LD `Product`/`Offer` na resposta HTTP, sem JS | Execute | **Verified** |
| GSH-13 | P1-B: JSON-LD reflete a variação do `?variant=` | Execute | **Verified** |
| GSH-14 | P1-B: canônica permanece sem o parâmetro | Execute | **Verified** |
| GSH-15 | P1-C: interruptor, desligado por default; 404 quando desligado | Execute | **Verified** |
| GSH-16 | P1-C: desligar depois de ligado exige confirmação e avisa o efeito | Execute | **Verified** |
| GSH-17 | P1-C: a tela ensina a ordem do cutover e entrega a URL | Execute | **Verified** |
| GSH-18 | P1-C: escrita só admin | Execute | **Verified** |
| GSH-19 | P2-D: campos de identificação no formulário do produto | Execute | **Verified** |
| GSH-20 | P2-D: tag omitida quando vazia; vocabulário fechado | Execute | **Verified** |
| GSH-21 | P2-D: importador semeia `brand` só onde é nulo | Execute | **Verified** |
| GSH-22 | P2-E: contagem do que publica e do que ficou de fora, por motivo | Execute | **Verified** |
| GSH-23 | P3-F: `google_product_category` por categoria, com precedência | Execute | **Verified** |

**Coverage:** 23 total, **23 mapeados a tasks** (T0–T25), 0 não mapeados ✅ — ver a tabela
*Requirement Coverage* em `tasks.md`.

---

## Success Criteria

- [ ] O feed publica **3.233 ± 4** ofertas, e a diferença contra as 3.237 do Merchant Center está
      explicada item a item — não estimada.
- [ ] A oferta `1259936246` sai do nosso feed com o mesmo `id`, o mesmo `item_group_id` e uma URL que
      resolve com **200** e mostra `Tamanho: G` a R$ 19,90.
- [ ] `curl` na URL de qualquer produto devolve JSON-LD com preço e disponibilidade — sem navegador.
- [ ] Ligar e desligar a integração muda a resposta do endpoint sem deploy.
- [ ] Baseline preservada: zero erro novo de lint, zero erro de tipo, `packages/core/src/payment/**`
      sem uma linha alterada.
