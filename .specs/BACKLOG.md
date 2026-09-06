# BACKLOG

Itens **deliberadamente adiados** — desenhados, discutidos ou descobertos, mas fora do escopo de
qualquer feature ativa. Cada item registra *o que é*, *por que ficou de fora* e *o que precisa ser
decidido* antes de virar feature.

Não é lista de ideias: só entra aqui o que já tem lastro (um artboard, um achado de código, uma
decisão de adiar registrada no [`STATE.md`](./STATE.md)).

---

## BL-001 — Geração de texto por IA no cadastro de produto

- **Status**: adiado · **Registrado em**: 2026-07-31 · **Decisão**: [`AD-011`](./STATE.md)
- **Origem**: desenho no Paper, arquivo **Nanapin**, página **Backoffice - Produtos**.

**O que é.** Dois botões desenhados e não implementados:

| Botão | Artboard | O que faria |
| ----- | -------- | ----------- |
| **Sugerir com IA** | *Produto — aba Geral* | Gerar a descrição do produto |
| **Gerar com IA** | *Produto — aba SEO* | Gerar título e descrição de SEO (respeitando os limites de 60 / 160 caracteres já exibidos na tela) |

**Os botões continuam no Paper de propósito** — a decisão foi não implementar agora, não descartar a
ideia. Quem for implementar a `11-product-form-v2` **não deve** implementá-los a partir do artboard;
está declarado no [`context.md` do programa](./features/07-product-catalog-admin/context.md).

**Não confundir com alt-text.** A geração de **alt-text** (`Gerar` na aba Mídia e "Gerar alt-text de
cada render" no estúdio) **está no escopo** da [`12-product-media-studio`](./features/12-product-media-studio/spec.md),
como template determinístico (`PMD-01`, A20). Os artboards nunca a rotulam como IA, e ela não precisa
de modelo nenhum.

**Por que ficou de fora.** Está desenhado sem uma única AC, não aparece em nenhum dos 22 itens que o
próprio desenho priorizou, e o projeto **não tem provedor de IA**. Entrar agora arrastaria escopo que
ninguém dimensionou.

**O que precisa ser decidido antes de virar feature:**

1. **Provedor e modelo** — a orientação do repositório (`CLAUDE.md` global) é usar os modelos Claude
   mais capazes em aplicações novas; para geração de copy curta, um modelo rápido tende a bastar. Falta
   escolher e medir.
2. **Onde roda** — edge function nova (mesmo molde de `send-email`: `index.ts` só wiring, lógica em
   `handlers.ts` com deps injetadas, testada em `@nanapin/functions`) ou chamada direta do backoffice?
   A primeira opção mantém a chave fora do bundle; é o padrão já estabelecido por `AD-004`/`AD-005`.
3. **Custo por chamada e teto** — quantas gerações por produto, com ou sem limite.
4. **Latência no caminho do save** — a lição de `AD-008` se aplica: chamada de saída no caminho de
   request é `await` limitado por `AbortController`, nunca trabalho em background. Aqui é ainda mais
   simples, porque a geração é acionada por botão, não pelo save — mas o teto de tempo continua valendo.
5. **Fallback quando a API cai** — o botão desabilita, avisa, ou o campo segue editável à mão? (A
   resposta óbvia é a terceira, mas precisa estar escrita.)
6. **O texto gerado é rascunho ou definitivo** — entra no campo para revisão do admin (provável) ou
   salva direto?

**Tamanho estimado**: feature pequena — 1 edge function, 2 botões, 2 campos. O custo real está nas
decisões acima, não no código.

---

## BL-002 — `packages/core` e `packages/supabase` estão fora do `pnpm lint`

- **Status**: aberto · **Registrado em**: 2026-08-03
- **Origem**: achado do lote 1 da [`17-promocoes-desconto-progressivo`](./features/17-promocoes-desconto-progressivo/tasks.md), medido durante o gate de fecho da Phase 2.

**O que é.** Nenhum dos dois pacotes tem script `lint`, e `pnpm lint` é `turbo run lint` — então o
Turbo nunca inspeciona nenhum dos dois. Consequência concreta: `packages/core/src/payment/pricing.ts`,
que é **o código de dinheiro do projeto** (soma do pedido, cupom, order bump e agora a faixa
progressiva), é type-checado por `tsc` e coberto por vitest, mas **não passa por ESLint nenhuma vez**.
O mesmo vale para os tipos de domínio em `packages/supabase`.

**Por que ficou de fora da 17.** Ligar o lint nos dois pacotes revela um número desconhecido de erros
pré-existentes, e isso **move a baseline de lint do projeto** (hoje 30 err / 9 warn) no meio de uma
feature cujo gate é exatamente *"sem erros novos"*. Fazer as duas coisas juntas deixaria o gate
ilegível: não daria para distinguir erro novo da feature de erro que sempre existiu e acabou de ficar
visível.

**O que precisa ser decidido antes de virar tarefa:**

1. **Medir primeiro.** Rodar `npx eslint packages/core packages/supabase` e anotar o número real, sem
   consertar nada. Sem essa medida não se sabe se é tarefa de 10 minutos ou de meio dia.
2. **As fronteiras FSD valem para pacotes?** `eslint.fsd.mjs` foi escrito para as camadas dos *apps*
   (`app → pages → widgets → features → entities → shared`). Pacote não tem essas camadas; aplicar a
   config dos apps produziria ruído. Provável resposta: config própria, só com as regras de TS.
3. **A baseline do `CLAUDE.md` passa a ter quatro números** (store, backoffice, core, supabase) em vez
   de dois — e o texto que descreve a dívida precisa acompanhar.

**Tamanho estimado**: desconhecido até o passo 1. O código é pequeno; o risco está no número de erros
que aparecem.

---

## BL-003 — O seed deixa as categorias planas: a árvore `Bottons › …` não sobrevive a `db reset`

- **Status**: aberto · **Registrado em**: 2026-08-03
- **Origem**: probes do lote 1 da [`17-promocoes-desconto-progressivo`](./features/17-promocoes-desconto-progressivo/tasks.md) (T2/T3), depois de um reset completo do banco local.

**O que é.** Depois de `db reset` + seed, as 8 categorias nascem **sem hierarquia**: todas com
`parent_id` nulo. A árvore `Bottons › {Academia, Anime, K-Pop, Filmes, Bandas, Games, Séries, Mangá,
Kawaii}` — que o Handoff da 16 descreve como "a árvore real" e que o `CLAUDE.md` documenta como *"no
banco real os universos são filhas de Bottons"* — foi montada **à mão** em algum momento e não está em
migration nem em seed.

**Por que isso importa mais do que parece.** Quatro consequências já visíveis:

1. A premissa **A9** da spec da 17 ("elegibilidade inclui descendentes, senão escopo `Bottons` não
   pega nada") descreve o banco de *uma máquina*, não o que um ambiente novo produz. Num ambiente
   recém-criado, uma promoção escopada em `Bottons` não pegaria produto nenhum — não por bug da
   feature, mas porque não existe filha.
2. `browseCategories` na loja "pula o guarda-chuva" justamente porque existe um guarda-chuva. Com
   árvore plana, a grade da home se comporta de outro jeito.
3. A **tela de kit da 18** assume que o escopo alcança produtos.
4. Qualquer QA "com dados reais" num ambiente novo está exercitando **outra taxonomia** que não a
   descrita na documentação.

**Está encavalado com um bug já conhecido.** `supabase db reset` ainda morre no `TEMP TABLE _pal` do
seed (`BUG-20260801-seed-temp-table-quebra-db-reset`) — ou seja, o caminho do seed já não roda limpo,
e foi preciso um contorno por `psql` para os probes da 17. Consertar a hierarquia sem consertar isso
antes é construir sobre um passo que falha.

**O que precisa ser decidido antes de virar tarefa:**

1. **O seed passa a ser a fonte da taxonomia pretendida?** Se sim, ele precisa escrever `parent_id` e
   os vínculos em `product_categories` — e aí a documentação para de mentir. Se não, a árvore é
   *fixture de ambiente* e isso tem de estar escrito onde hoje se afirma o contrário.
2. **Ordem**: o `_pal` primeiro. Sem seed que roda, nada do resto é verificável.
3. **Quem mais depende disso** — auditar o que no código assume raiz com filhas antes de mudar o seed,
   para não trocar um desalinhamento por outro.

**Tamanho estimado**: pequeno em código (um bloco de seed), médio em verificação — mexe na premissa de
navegação da loja.

---

## BL-004 — A vigência morre à meia-noite do dia prometido

**Descoberto em**: 2026-08-03, feature 18 (telas internas de Descontos), ao trocar
`<input type="date">` pelo seletor de calendário.

**O que é.** `valid_until` é gravado como **meia-noite local** do dia escolhido, e os dois leitores
comparam `new Date(coupon.valid_until) < now`. Logo, um cupom (ou promoção) configurado como
"válido até 30/09" **para de valer às 00:00 de 30/09** — o dia que a tela promete não vale.

**Onde.** A gravação é `isoFromDateOnly` (`apps/backoffice/src/shared/lib/dateOnly.ts`), usada pelas
duas telas de Descontos. A leitura acontece em dois lugares, os dois no caminho do dinheiro:

- `packages/core/src/hooks/useCoupons.ts` → `validateCoupon` (`'Cupom expirado.'`);
- `supabase/functions/mercado-pago/handlers.ts` → o filtro de vigência das promoções.

E há um terceiro leitor, de exibição: `couponStatus`/`promotionStatus` mostram `Expirado` um dia antes
do que a dona da loja esperaria.

**Por que ficou de fora da 18.** A 18 é conversão de moldura (modal ⇒ tela) e padronização de
listagem; o gate dela é "sem erro novo" e "regra intacta". Corrigir isto **muda semântica de
gravação** e exige AC própria com teste nas duas pontas — inclusive em `@nanapin/functions`, que é
onde o servidor decide se cobra o desconto. Mexer nisso no meio de uma feature de UI misturaria uma
mudança de comportamento de cobrança com uma troca de componente.

**O que precisa ser decidido antes de virar tarefa:**

1. **Onde mora o "fim do dia"** — na gravação (`valid_until` = 23:59:59.999 local) ou na comparação
   (`< startOfNextDay(valid_until)`). A segunda é mais segura para o que **já está gravado**: mudar só
   a escrita deixaria as linhas antigas com a semântica velha, e as duas conviveriam sem marca no dado.
2. **`valid_from` tem o problema simétrico?** Meia-noite local é o começo certo do dia — provavelmente
   não muda. Precisa ser verificado, não suposto.
3. **Migration de correção**, se a decisão for mudar a escrita: as linhas existentes precisariam de
   `+1 dia - 1ms`, e isso é escrita em dado de cobrança.

**Tamanho estimado**: pequeno em código (três leitores), médio-alto em verificação — é caminho de
dinheiro, e a prova precisa cobrir "o último dia ainda vale" nas duas pontas.

---

## BL-005 — Clientes e histórico de pedidos da Nuvemshop

- **Status**: adiado · **Registrado em**: 2026-08-08 · **Decisão**: [`AD-016`](./STATE.md)
- **Origem**: definição de escopo na abertura da conversão para Uma Estrelinha (`C-04`).

**O que é.** A [`21-catalogo-nuvemshop`](./features/21-catalogo-nuvemshop/spec.md) importa **só o
catálogo** — categorias, produtos, variantes, preços e imagens. A base de clientes e o histórico de
pedidos que a Uma Estrelinha acumulou na Nuvemshop ficam de fora.

**Por que ficou de fora.** Três coisas que o catálogo não tem:

1. **Dado pessoal.** Nome, e-mail, telefone, CPF e endereço de cliente real. Importar é tratamento de
   dado sob LGPD, com base legal, retenção e direito de eliminação — não é `INSERT`.
2. **Reconciliação de identidade.** A loja nova autentica por código de 6 dígitos e Google
   (`supabase.auth`); a Nuvemshop tem a própria conta. Um cliente importado **não tem login** até
   entrar pela primeira vez, e casar as duas identidades pelo e-mail é uma decisão, não um detalhe.
3. **Pedido é snapshot de um schema que não é o nosso.** `orders` daqui carrega `promotion_discount`,
   `mp_order_id`, snapshot de frete e itens com variação. Um pedido histórico não tem nada disso, e
   inventar valor para caber é pior que não ter o pedido.

**O que precisa ser decidido antes de virar feature:**

1. **Para que serve o histórico** — atendimento ("o que essa cliente já comprou") é caso diferente de
   relatório de faturamento. O primeiro talvez se resolva com uma tabela **somente-leitura** separada
   de `orders`, sem tentar caber no schema atual.
2. **Base legal e comunicação** — a cliente precisa saber que os dados dela mudaram de sistema.
3. **O que fazer com pedido em aberto** na hora do corte.

**Tamanho estimado**: médio em código, alto em decisão. Nada aqui é urgente enquanto as duas lojas
não trocarem de dono do tráfego.

---

## BL-006 — Re-skin do backoffice na identidade Uma Estrelinha

- **Status**: adiado · **Registrado em**: 2026-08-08 · **Decisão**: [`AD-016`](./STATE.md)
- **Origem**: definição de escopo na abertura da conversão (`C-05`).

**O que é.** Na [`20-rebrand-uma-estrelinha`](./features/20-rebrand-uma-estrelinha/spec.md) o
backoffice só tem os **tokens renomeados** (`--nana-*` → `--estrelinha-admin-*`), com os valores
roxo/rosa/navy inalterados. As ~30 telas do painel continuam vestindo a paleta herdada.

**Por que ficou de fora.** Painel interno não carrega marca — quem o usa é uma pessoa só, que sabe
onde está. E o re-skin tocaria `packages/ui`, que é o território estável do backoffice: a separação
entre os dois temas depende da **ordem de dois imports** em `main.tsx` e está travada por
`importOrder.test.ts`. Misturar isso com uma feature cujo gate é "sem erro novo" trocaria risco alto
por ganho estético.

**O que precisa ser decidido antes de virar feature:**

1. **Um tema ou dois.** Unificar significa a loja e o painel compartilharem `packages/ui`, e aí a
   proteção de ordem de import deixa de fazer sentido — é simplificação real, mas é decisão de
   arquitetura, não de cor.
2. **A paleta Uma Estrelinha serve para densidade de painel?** `ground #FAF8F4` com `primary #34495E`
   foi desenhada para página de marketing e vitrine. Tabela densa, badge de status e gráfico exigem
   uma escala de cinzas e um conjunto semântico (sucesso/aviso/erro) que o DS herdado não define.
3. **Vale o custo?** ~30 telas, com os testes de cada uma.

**Tamanho estimado**: grande e inteiramente opcional.

---

## BL-00X — Peso da listagem de produto (3,1 MB por página de categoria)

- **Status**: **aberto, com o item 2 resolvido** · **Registrado em**: 2026-08-09 · **Origem**: medição
  no conserto do `BUG-20260809`

> **O item 2 (a escolha de paginação) foi decidido e implementado pela feature
> [`32`](./features/32-rolagem-infinita-da-categoria/spec.md)**, em 2026-08-17: **rolagem infinita**,
> 24 por vez, com botão manual para teclado. **Isso NÃO fecha este item** — e a distinção é a parte
> que importa. A `32` corta **DOM**, não **rede**: a consulta continua trazendo a coleção inteira,
> os 3,1 MB continuam viajando e o teto de 1.000 do PostgREST continua de pé. Os itens **1**, **3**
> e **4** abaixo seguem intocados, e é neles que está o peso.

**O que é.** `/colecao/joias-afetivas` carrega **3,1 MB** para 503 produtos, e leva 7,3 s até
`networkidle` no local. Numa loja em que ~90% dos acessos vêm de celular, isso é problema por si.

Medido, por campo:

| campo | peso | o card renderiza? |
| --- | ---: | --- |
| `description` | **1.154 KB** | **não** |
| `product_variants` | 770 KB | sim (faixa de preço) |
| `images` | 532 KB | sim (a primeira) |
| resto + `seo_*` + vínculos | 623 KB | em parte |

**Por que o corte óbvio não serve.** Tirar `description` da listagem economizaria 37% — mas
**a busca pontua por ele** (`apps/store/src/features/search/lib/searchProducts.ts:76`, peso 5), e
`useAllProducts` alimenta a busca. Cortar degradaria a relevância **em silêncio**, que é a classe de
defeito que este projeto mais paga caro.

**O que precisa ser decidido antes de virar feature:**

1. **Busca no servidor ou no cliente?** Se a busca migrar para `websearch_to_tsquery` no Postgres, a
   listagem para de precisar de `description` e as duas coisas se resolvem juntas.
2. ~~**Paginação de categoria**: página numerada, "carregar mais" ou scroll infinito.~~ **Decidido e
   implementado pela `32`**: rolagem infinita sobre a lista já em memória. A URL não ganhou estado,
   então o SEO não mudou.
3. **`select` de listagem separado do de detalhe** — dois `PRODUCT_SELECT`, com o risco de divergirem.
4. **Filtros client-side**: hoje faixa de preço, tags e disponibilidade filtram sobre a lista já
   carregada. Com paginação, precisam ir para o servidor, senão passam a filtrar só a página atual —
   e o cliente vê "3 de 12" quando existem 400.

**Tamanho estimado**: feature média. O item 4 é o que dá o trabalho, e é o que ninguém lembra.

---

## BL-007 — Sitemap e dados estruturados

> **Duas de três partes FECHADAS.** Os **dados estruturados** de produto saíram na
> [`30-google-shopping`](./features/30-google-shopping/spec.md) (2026-08-16): `Product` + `Offer` em
> JSON-LD, servidos no HTML pela edge function `product-page` — e **não** injetados por JS,
> justamente porque o rastreador do Merchant Center compara o preço da landing page com o do feed.
> O **`sitemap.xml`** saiu na [`33-sitemap-da-loja`](./features/33-sitemap-da-loja/spec.md)
> (2026-08-29): edge function irmã, 719 URLs canônicas, `robots.txt` apontando para ela, e uma
> rotina diária provando a entrega. **Fica em aberto só o `BreadcrumbList`.**
>
> **O que a `33` respondeu dos itens abaixo**: (1) onde é gerado — edge function, decisão do usuário,
> pelo frescor: cadastro no painel entra na requisição seguinte, sem deploy; (2) sim, importa
> `productPath`/`categoryHref` — `categoryHref` é a **mesma** função que declara a canônica da
> página, então não há como divergir; (4) categoria inativa não entra **e não por código**: a
> function lê com a chave publicável e a RLS filtra; (5) redirects não entram, e há guarda.
> O item (3) — JSON-LD injetado por JS — continua valendo como está escrito, e é da parte que sobrou.

- **Status**: **parcialmente fechado** (dados estruturados ✓, sitemap ✓, `BreadcrumbList` em aberto) · **Registrado em**: 2026-08-09 · **Decisão**: [`AD-018`](./STATE.md), [`AD-022`](./STATE.md)
- **Origem**: `Out of Scope` da [`23-urls-e-seo`](./features/23-urls-e-seo/spec.md), que os adiou com
  motivo explícito: *"só fazem sentido depois de o endereçamento estar decidido"*.

**O que é.** Duas coisas que a loja não tem e que um e-commerce indexado precisa:

1. **`sitemap.xml`** — a lista das URLs canônicas de produto e de categoria, para o Google não
   depender de descobrir tudo por link. Hoje seria adivinhação: a loja publicava três formatos e
   nenhum era o indexado.
2. **Dados estruturados** (JSON-LD) — `Product` com preço, disponibilidade e imagem; `BreadcrumbList`
   com a trilha `raiz › filha`. É o que produz rich result na busca.

**Por que agora está destravado.** A `23` fechou o endereçamento: existe **uma** canônica por
conteúdo (`productPath`, `categoryHref`), ela é construída por função única, e o formato está
travado por teste. Sitemap é literalmente a enumeração dessas funções sobre o catálogo — antes da
`23` não havia o que enumerar.

**O que precisa ser decidido antes de virar feature:**

1. **Onde o sitemap é gerado.** A loja é SPA sem SSR: um arquivo estático no `public/` fica velho no
   primeiro produto novo. As opções reais são um passo de build que lê o Supabase, ou uma edge
   function que responde `/sitemap.xml` a partir do banco. A segunda não tem passo de deploy para
   esquecer; a primeira não paga cold start.
2. **A canônica é a mesma para o Googlebot e para a cliente?** Sim por construção — mas o sitemap
   precisa importar `productPath`/`categoryHref` em vez de montar string própria, senão nasce a
   quarta cópia da regra.
3. **JSON-LD com SPA tem o mesmo problema da tag canônica**: é injetado por JS, e `curl` não o vê. O
   Googlebot renderiza; validadores que não renderizam, não. Precisa estar escrito **antes** de
   alguém medir com a ferramenta errada e concluir que quebrou.
4. **Categoria inativa e produto sem estoque entram?** Categoria inativa não é servida (a RLS a
   esconde) e não pode entrar. Produto indisponível é decisão de produto, não técnica.
5. **`category_redirects` e `product_redirects` NUNCA entram no sitemap** — sitemap é lista de
   canônicas, e slug antigo é o oposto disso.

**Tamanho estimado**: pequeno-médio. O código é pouco; o item 1 é a decisão que dá o trabalho.

---

## BL-00Y — Quatro consultas de catálogo engolem erro

- **Status**: adiado · **Registrado em**: 2026-08-09 · **Origem**: `BUG-20260809`

`useAllProducts`, `useFeaturedProducts`, `useNewProducts` e `useProductById` fazem
`if (error || !data) return []`. A de categoria foi corrigida; estas quatro não.

**Não é cosmético.** Com `return []`, o React Query guarda o vazio como **sucesso** — e não repete a
tentativa. Um blip de rede na home deixa a loja vazia até o cliente recarregar à mão, sem nenhum sinal
de que algo falhou.

Terceira ocorrência do padrão no projeto (`AD-014` registrou a primeira em `useAdminCollections`;
`BUG-20260809` a segunda). Candidato a **decisão de projeto**: consulta de listagem não transforma
erro em lista vazia.

**O que falta para virar feature**: estado de erro na home, na gaveta do carrinho e na busca — três
superfícies, cada uma com desenho próprio. O código dos hooks é a parte fácil.

---

## BL-00Z — Endereço de envio do material pelo WhatsApp da cliente

- **Status**: adiado · **Registrado em**: 2026-08-09 · **Origem**: decisão do usuário na abertura da `22`

Depois da compra de uma peça que exige material afetivo, mandar o **endereço de envio pelo WhatsApp
da cliente**, além de ele estar na página de compra e na `/como-enviar-o-material` (que é o que a `22`
entrega).

**Por que fica fora da `22`**: o endereço na página resolve o problema declarado — a cliente saber
para onde mandar. O WhatsApp é um **canal novo**, e canal novo traz consigo tudo que a `22` não tem:
provedor (API oficial da Meta, ou intermediário), número verificado, template aprovado pela Meta,
consentimento explícito, e um caminho de falha que não existe hoje — mensagem não entregue não pode
travar pedido, pela mesma regra do `AD-008`.

**O que precisa de resposta antes de virar feature**:

1. Qual provedor, e quem paga a conversa. Template de utilidade é cobrado por janela.
2. O telefone já é coletado no checkout — mas **consentimento para receber mensagem** não é o mesmo
   que informar telefone para entrega. Onde a cliente aceita?
3. A mensagem sai no `create-payment` (pedido criado, ainda não pago) ou na aprovação? O material só
   faz sentido depois de pago, mas o PIX pode demorar.
4. Falha de envio é silenciosa como a de e-mail (`AD-008`), ou a Adri precisa ver que não entregou?
5. O e-mail transacional já tem motor, templates e idempotência por `order_emails` (`AD-006`).
   **Vale reusar `order_emails` para "mensagem já enviada"**, ou o canal pede tabela própria?

**Tamanho estimado**: médio, e quase todo ele fora do código — a aprovação de template pela Meta é o
caminho crítico.

---

## BL-008 — leituras do painel sem paginação (teto de 1.000 do PostgREST)

- **Status**: **REDUZIDA** em 2026-08-29 pela feature `34` · **Registrado em**: 2026-08-09 · **Origem**: feature `22`, ao acrescentar as contagens de material

> **O caso que dava nome a esta dívida está FECHADO.** `fetchStatusCounts` **deixou de existir**: as
> contagens de aba e de contador agora são `select('id', { count: 'exact', head: true })`, uma por
> eixo, com os filtros ativos aplicados. O PostgREST responde **só o cabeçalho `Content-Range`** — o
> servidor conta e nenhuma linha atravessa a rede, então não há teto a herdar. A listagem em si passou
> a usar `range` + `count: 'exact'`, e as leituras completas (CSV, "selecionar os N do filtro")
> passam por `readAllPages`, que **falha** quando o total lido não bate com a contagem.
>
> `useAdminCustomers.fetchCustomers` — o outro caso citado abaixo — também saiu do caminho da
> listagem: a tela de Clientes lê `customer_list` paginada. O hook continua existindo para a ficha.
>
> **O que mantém a dívida aberta**: as outras leituras sem `range` do painel, que ninguém enumerou
> ainda. A régua para fechá-la de vez é varrer `apps/backoffice/src/**` atrás de `.select(` sem
> `range` nem `head`, e decidir caso a caso.

### O registro original


`useAdminOrders.fetchStatusCounts` faz `supabase.from('orders').select('status, material_status')` —
**sem `range`**. O PostgREST devolve no máximo **1.000 linhas** por resposta, então a partir do
milésimo pedido as contagens da faixa de filtros (status **e** material) param de crescer e passam a
mentir, em silêncio.

**Não foi introduzido pela `22`**: a leitura de `status` já era assim. A feature só acrescentou
`material_status` à mesma consulta — de propósito, para não dobrar o tráfego com uma segunda ida ao
banco. O que a `22` acrescenta é **um segundo consumidor do mesmo teto**.

**É o mesmo defeito que quebrou o importador na `21`**, e lá custou caro: o `select` truncado fazia
toda variação além da 1.000ª parecer nova, e a idempotência quebrava justamente na segunda execução.
A correção lá foi `selectAll` (paginação por `range`), em `tools/catalog-import/src/write/db.ts`.

**A feature `33` não piorou isto, e mostrou a saída.** O sitemap lê `products` e `categories`
inteiras e **confere contra a contagem exata** (`readAllPages`, em `@estrelinha/core/paging`, extraído
da `google-feed`). É o mesmo mecanismo que falta aqui, agora disponível como função pura com
dependências injetadas — `fetchStatusCounts` pode consumi-lo sem inventar nada.

**O que falta**: ou paginar como o importador, ou — melhor — trocar a contagem no cliente por
`select('status', { count: 'exact', head: true })` por estado, ou uma view de agregação. A segunda
opção é uma consulta por estado (9 hoje); a terceira é uma migration.

**Urgência real**: baixa. A loja não tem 1.000 pedidos. Mas o dano é **silencioso** e aparece como
"a fila diz 40 e eu vejo 60" — o tipo de erro que se atribui a bug de tela por semanas.

---

## BL-009 — `SUPABASE_URL` com fallback hard-coded de OUTRO projeto

- **Status**: **FECHADO** em 2026-09-05 · **Registrado em**: 2026-08-15 · **Origem**: feature `24`,
  T26 (generalização do upload) · **Fechado por**: feature `39`, T19

> **Como fechou.** O editor de banner do menu precisava do mesmo motor de upload, e `features/` não
> importa de `features/`: `uploadImageBlob` (com `validateImageFile`, `uploadFailureMessage`,
> `MAX_FILE_BYTES` e `ACCEPTED_TYPES`) mudou de casa para
> `apps/backoffice/src/shared/lib/uploadImage.ts`. O `||` morreu na mudança — não foi "consertado
> depois", foi apagado no movimento que já tocava o arquivo. A saída escolhida é a **(b)** descrita
> abaixo pela razão mais simples possível: o client de `@estrelinha/supabase` **já lança** sem
> `VITE_SUPABASE_URL`, então o lado direito do `||` era inalcançável — e é exatamente assim que um
> fallback se parece **antes** de virar defeito: bastava alguém dar um default ao client para toda
> imagem enviada apontar para outro projeto, sem erro nenhum.
>
> `product-form` reexporta só os **tipos** (`UploadFailure`, `UploadRejectReason`), nunca as funções:
> reexportar a função daria dois caminhos para a mesma régua.

O registro original, preservado:

`apps/backoffice/src/features/product-form/lib/uploadProductImage.ts:12` monta a URL pública da
imagem com um `||` cujo lado direito é a URL literal de **um projeto Supabase hospedado que não é
este** (o `.env.example` deste repositório aponta para `http://127.0.0.1:54341`). A URL não é
transcrita aqui de propósito — copiá-la para a documentação a espalharia para um terceiro arquivo.

Enquanto a env estiver definida, nada acontece — e é exatamente por isso que o defeito é perigoso:
ele só aparece no dia em que a env faltar, e o sintoma não é um erro, é **imagem que não carrega**
apontando para a infraestrutura de outra loja. O upload em si funciona (quem grava é o client, que já tem a URL certa); o que sai errado
é a URL pública gravada em `products.image_url` — ou seja, o dano **fica no banco**.

**Por que ficou fora da `24`**: a T26 tinha um "done when" explícito de *nenhum chamador existente
muda*, e trocar o comportamento de um fallback é mudar o chamador. O arquivo foi tocado para ganhar
`{ bucket, folder }`, e o achado é dessa leitura.

**O que falta**: decidir entre (a) derivar a URL pública de `supabase.storage.from(b).getPublicUrl()`,
que é a forma que não tem fallback nenhum, ou (b) lançar erro na ausência da env, como
`@estrelinha/supabase` já faz para o client. A (a) é a correção certa e alcança os dois buckets.

---

## BL-010 — `reorderWithinParent` e `reorderSections` são a mesma função

- **Status**: aberto · **Registrado em**: 2026-08-15 · **Origem**: feature `24`, T4 (o design já previu)

Duas implementações de "mover um item de uma posição para outra e devolver só as linhas que mudaram":

| Onde | Quem usa |
| --- | --- |
| `apps/backoffice/src/features/category-list/model/categoryTree.ts:370` (`reorderWithinParent`) | arrastar categoria |
| `packages/core/src/home/order.ts` (`reorderSections`) | arrastar seção da Home |

A `24` **não** importou a primeira: ela vive em `apps/backoffice`, e `core/home` não pode importar de
um app — a mesma restrição que criou a T35. O design registrou a duplicação como conhecida e
deliberada, com o molde copiado e o porquê escrito.

**O que falta**: extrair um `reorderByIndex<T>(items, from, to)` genérico em `@estrelinha/core` e
fazer as duas lerem dele. É o mesmo movimento que a T35 fez com a derivação, e pela mesma razão —
com a diferença de que aqui as duas cópias **ainda não divergiram**, então a urgência é menor.

**Cuidado ao fazer**: as duas devolvem **posições absolutas só das linhas alteradas**, e é isso que
faz o upsert ser barato e idempotente. Um genérico que devolvesse a lista inteira reescreveria toda
categoria a cada arraste.

---

## BL-011 — Imagem órfã no Storage quando uma seção da Home é apagada

- **Status**: aberto · **Registrado em**: 2026-08-15 · **Origem**: dívida declarada na spec da `24`

Apagar uma seção da Home apaga a linha (e os itens, por `on delete cascade`), mas **não** apaga a
arte no bucket `home-images`. Trocar a foto do hero também deixa a anterior lá. O mesmo já vale para
`product-images`.

**Não é vazamento de dado** — o bucket é público de leitura e a arte é material de vitrine —, é
**custo de armazenamento que só cresce**.

**Por que não foi feito junto**: apagar arquivo no momento errado é pior que deixá-lo. A mesma URL
pode estar em duas seções (a dona duplicou um banner), e `home-images` foi separado de
`product-images` justamente porque a arte da Home **sobrevive** à coleção que ela apontava. Uma
limpeza ingênua no `delete` da seção apagaria a arte de um banner que outra seção ainda usa.

**O que falta**: decidir entre (a) varredura periódica que compara o bucket com as URLs referenciadas
(mais seguro, roda fora do caminho da dona), ou (b) contagem de referências na hora do delete (mais
imediato, e precisa considerar `config.image_url` **e** `home_section_items.image_url`). A (a) é a
que não tem como apagar arte viva.

---

## BL-012 — Convenção de commits: o `CLAUDE.md` e a Skill `tlc-spec-driven` discordam

- **Status**: **FECHADO em 2026-08-15** pela decisão do usuário na feature `25` — vale a saída **(2)**:
  o `CLAUDE.md` continua mandando, e a Skill passa a agrupar os commits no fim da implementação.
  A `25` foi a primeira feature executada assim. · **Registrado em**: 2026-08-15 · **Origem**: feature `24`, T34

> **Decisão registrada**: commits **agrupados no fim**, não um por task. O custo aceito está escrito
> abaixo e é real — perde-se a correspondência 1:1 entre commit e "done when", e o `git bisect` passa
> a apontar para um commit que contém várias tasks. Em troca, o histórico fica legível como unidade de
> trabalho, que é o que o usuário quer ler. **A recomendação abaixo era a (1); o usuário escolheu a
> (2) com a alternativa à vista.** O texto original fica preservado para quem reabrir o assunto.

As duas regras estão escritas, e são incompatíveis:

| Fonte | Regra |
| --- | --- |
| `CLAUDE.md`, seção *Workflow de specs* | *"**não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a conclusão e gerar os commits completos da implementação de uma vez"* — declarado explicitamente como sobreposição do comportamento padrão da Skill |
| Skill `tlc-spec-driven`, `implement.md` passo 7 | *"Each task gets its own commit immediately after verification. Never batch multiple tasks into one commit."* — e o gate por task depende disso |

**A feature `24` seguiu a Skill**: 35 commits, um por task, mais os de fecho de fase. As features
`20`..`23` também. Ou seja, **a regra do `CLAUDE.md` não vem sendo praticada há quatro features** —
e isso é pior que qualquer uma das duas regras isolada, porque quem ler o arquivo vai fazer o
contrário do que o repositório mostra.

**Não foi resolvido por conta própria de propósito.** Alterar a regra do `CLAUDE.md` é decisão do
usuário: ela foi escrita como sobreposição deliberada, e um worker apagá-la seria exatamente o tipo
de "while I'm here" que o guardrail de escopo proíbe.

**As duas saídas**:

1. **Manter a Skill e ajustar o `CLAUDE.md`** — reconhece a prática de quatro features. O commit
   atômico por task é o que torna o gate verificável e o `git bisect` útil; batelar tasks apaga a
   correspondência entre commit e "done when".
2. **Manter o `CLAUDE.md` e instruir a Skill** — exige um passo de squash no fim de cada fase, e o
   histórico perde a rastreabilidade task ⇄ commit que a `24` usou o tempo todo (cada fase fechou
   citando os hashes por task).

A recomendação, com o lastro das cinco features, é a **(1)**.

---

## BL-013 — A loja precisa autorizar ser embutida pelo painel (`frame-ancestors`)

- **Status**: **FECHADO em 2026-08-16** — os dois projetos Vercel existem, e o `vercel.json` da loja
  passou a mandar `Content-Security-Policy: frame-ancestors 'self'
  https://umaestrelinha-backoffice.vercel.app`. O `X-Frame-Options: SAMEORIGIN` foi **substituído**,
  não acompanhado: manter os dois deixaria a política com dois donos e um caminho em que o mais fraco
  vence. Preso por `vercelRedirects.test.ts`, que ganhou três asserções (origem exata, ausência de
  `X-Frame-Options`, e recusa de curinga). · **Registrado em**: 2026-08-15 · **Origem**: feature `25`, T13

> **Duas limitações declaradas, porque nenhuma delas dá erro visível.**
>
> 1. **Deploy de preview do painel não enquadra a loja.** A autorização é por origem exata, e as URLs
>    de preview da Vercel mudam a cada branch. A "correção" tentadora — `https://*.vercel.app` — libera
>    **qualquer** projeto hospedado em vercel.app a embutir a loja, inclusive o de um terceiro, e isso
>    é vetor de clickjacking sobre o checkout. O teste recusa curinga de propósito.
> 2. **Domínio próprio exige mexer aqui de novo.** No dia em que o painel deixar de ser
>    `umaestrelinha-backoffice.vercel.app`, a prévia volta a ser quadro branco sem erro até o
>    `vercel.json` **e** o literal do teste serem atualizados.

A prévia real de `/admin/home` carrega a loja num `<iframe>`. Em **dev isso já funciona**: o servidor
do Vite não manda `X-Frame-Options` nem `Content-Security-Policy`, então `localhost:8083` embute
`localhost:8082` sem nenhuma configuração.

**Em produção não vai funcionar sozinho.** Assim que a loja for implantada atrás de um host que mande
`X-Frame-Options: DENY` (ou um CSP sem `frame-ancestors`), o iframe fica em branco — e **em branco sem
erro visível**, porque a recusa é do navegador e não da aplicação. O sintoma para a dona vai ser "a
prévia sumiu", sem nada nos logs.

O que fazer quando o projeto Vercel existir:

```jsonc
// apps/store/vercel.json
{ "headers": [{ "source": "/(.*)", "headers": [
  { "key": "Content-Security-Policy", "value": "frame-ancestors 'self' https://<origem-do-painel>" }
]}]}
```

**`frame-ancestors` e não `X-Frame-Options: ALLOW-FROM`**: este último foi removido de todos os
navegadores modernos e é ignorado em silêncio, que é a pior forma de uma diretiva de segurança falhar.

Não foi implementado agora porque **não há projeto Vercel da Uma Estrelinha** (`C-08`): escrever o
header contra uma origem inventada seria configuração não verificável, e a origem do painel é
justamente o valor que ainda não existe.

**Como verificar no dia**: `curl -I https://<loja>` tem de mostrar o `frame-ancestors` com a origem do
painel, e `/admin/home` tem de mostrar a loja em vez do quadro branco.

---

## BL-014 — Geração de perguntas frequentes por IA

- **Status**: adiado · **Registrado em**: 2026-08-16 · **Origem**: feature `28`, decisão do usuário
- **Relacionado**: [`BL-001`](#bl-001--geração-de-texto-por-ia-no-cadastro-de-produto) (mesma natureza,
  mesmas 6 perguntas em aberto) · [`AD-011`](./STATE.md)

**O que é.** No cadastro do produto, um botão que gera perguntas e respostas novas — em vez de apenas
ranquear as que já existem na biblioteca.

**Por que ficou de fora.** Perguntado ao usuário em 2026-08-16, com as duas opções na mesa; a escolha
foi **"determinística agora, IA depois"**. A sugestão determinística que entrou na `28` ranqueia por
co-ocorrência de categoria e mede **84,0% de acerto / 83,5% de cobertura** no top-5 do catálogo real —
sem provedor, sem chave, sem custo por chamada, sem latência no caminho do save, e **testável com dado
real**, que uma chamada a LLM não é.

**O que a `28` deixa pronto para o dia em que isto virar feature:**

- a biblioteca (`faqs`) e o vínculo (`product_faqs`) já existem, então o texto gerado tem onde cair;
- `faqQuestionKey` já impede que a IA crie uma entrada que é a que já existe com outra grafia;
- `rankFaqSuggestions` continua sendo o piso — a IA seria uma **segunda fonte** de sugestão, não a
  substituição de uma que mede 84%.

**O que precisa ser decidido antes de virar feature.** As mesmas 6 perguntas da `BL-001` (provedor e
modelo, onde roda, custo e teto, latência, fallback quando a API cai, rascunho × definitivo), **mais
uma específica desta**: a pergunta gerada entra na biblioteca compartilhada — onde vai valer para
outros produtos — ou nasce como resposta própria do produto? A primeira polui a biblioteca de 67
entradas curadas; a segunda desperdiça o reuso que é o ponto da biblioteca.

**Tamanho estimado**: pequena depois que a `BL-001` decidir provedor e hospedagem — as duas devem ser
resolvidas juntas, porque a resposta de infraestrutura é a mesma.

---

## BL-015 — `material_kinds` diz menos que a descrição do produto

- **Status**: aberto · **Registrado em**: 2026-08-16 · **Origem**: feature `28`, medição do catálogo
- **Relacionado**: feature [`22-material-afetivo`](./features/22-material-afetivo/spec.md)

**O que é.** A `22` semeou `products.material_kinds` por **inferência do nome** do produto
(`inferMaterial`), e declarou desde o início que era "inferência, não verdade". A medição da `28`
mostra **de quanto** é a diferença: as descrições enumeram os materiais aceitos em texto, e o texto
diz mais que a coluna.

Amostra medida no banco local em 2026-08-16, comparando a resposta de `Quais materiais posso usar
nessa joia?` com a coluna:

| `requires_material` | `material_kinds` | o que a descrição diz |
| --- | --- | --- |
| `true` | `{cinzas}` | "aceita cinzas de cremação (humana ou pet), leite materno, cabelo, pelo ou coto umbilical" |
| `true` | `{cinzas}` | "aceita leite materno, cabelo, coto umbilical, pelo, ou cinzas de cremação" |
| `true` | `{pelo_pet}` | "aceita pelo, bigode e cinzas de cremação" |
| **`false`** | `{}` | "aceita coto umbilical, cabelo" |
| **`false`** | `{}` | "aceita sangue desidratado — do casal, da menarca…" |

A última linha traz um material que **não existe** em `MATERIAL_KINDS` (`sangue`), e as duas de
`requires_material = false` são peças que a loja hoje trata como "não exige material" enquanto a
própria descrição instrui a cliente a enviar material.

**Por que não foi corrigido na `28`.** Duas razões independentes. (1) É **curadoria de material**, do
domínio da `22`, e não de FAQ — a `28` não altera nenhuma decisão de material, e a resposta da
pergunta continua sendo texto por produto, exatamente como está escrito hoje. (2) A correção óbvia —
inferir `material_kinds` da descrição em vez do nome — **não é obviamente certa**: a descrição é texto
livre da dona, e uma segunda inferência automática por cima de uma curadoria que ela pode já ter feito
em `/admin/produtos` apagaria decisão humana com heurística. O `null` de `requires_material` protege a
curadoria da execução **do importador**, não de uma migração de correção.

**O que precisa ser decidido antes de virar feature:**

1. `sangue` entra em `MATERIAL_KINDS`? Precisa de ficha própria em `/como-enviar-o-material`, que é
   onde cada material ganha instrução de coleta e de envio.
2. A inferência pela descrição roda **uma vez** (migração de correção, revisável em tela) ou vira
   parte do importador? A primeira é reversível e auditável; a segunda reintroduz o risco de sobrescrever.
3. Quem ganha quando descrição e coluna discordam num produto que a dona **já editou**? Precisa de um
   marcador de "revisado por humano" que hoje não existe — `requires_material` deixou de ser `null` no
   primeiro save, mas isso não distingue "a Adri decidiu" de "o importador semeou e alguém salvou a tela".

**Como medir hoje**: comparar a resposta extraída de `Quais materiais posso usar nessa joia?` (453
produtos) com `material_kinds`. A `28` deixa esses textos em `product_faqs.answer_override`, o que
torna a comparação uma consulta em vez de um parser.

---

## BL-016 — O host das duas rotas do Google Shopping é um marcador

- **Status**: **FECHADO em 2026-08-16** — o projeto Supabase hospedado foi criado
  (`hgkrsfpupypxtygjgthf`) e as duas linhas do `apps/store/vercel.json` receberam o ref real. A
  asserção de marcador do `vercelRedirects.test.ts` se aposentou sozinha, como estava previsto: o host
  não tem mais maiúscula. · **Registrado em**: 2026-08-16 · **Origem**: feature
  [`30-google-shopping`](./features/30-google-shopping/spec.md), tarefa T14

> **Falta a metade da verificação, e ela não é opcional.** O ref estar escrito prova que o arquivo
> aponta para um projeto que existe — **não** prova que as duas rotas respondem. As edge functions
> `google-feed` e `product-page` ainda não foram implantadas no projeto hospedado. Enquanto não
> forem, `/produtos/:slug` continua fora do ar em produção pelo mesmo motivo descrito abaixo — o
> rewrite tira a rota do catch-all do SPA e o destino devolve erro. **Rodar o `curl -I` das duas
> antes de ligar o interruptor em `/admin/google-shopping`.**

O `apps/store/vercel.json` expõe as duas edge functions da `30` sob o domínio da loja:

| rota | destino |
| --- | --- |
| `/feeds/google-shopping.xml` | `https://PROJECT-REF.supabase.co/functions/v1/google-feed` |
| `/produtos/:slug` | `https://PROJECT-REF.supabase.co/functions/v1/product-page?slug=:slug` |

**`PROJECT-REF` é marcador, não configuração.** Não existe projeto Supabase hospedado da Uma
Estrelinha (`C-08`), então não há ref real a escrever. Inventar um plausível seria pior: o arquivo
pareceria configurado.

**O modo de falhar é caro e silencioso.** Com o marcador no ar, `/produtos/:slug` deixa de resolver —
e não é "a página fica sem JSON-LD": é a **página de produto inteira** fora do ar, porque o rewrite
tira a rota do catch-all do SPA. O feed responderia o mesmo erro, e o Merchant Center leria isso como
catálogo indisponível.

**O que fecha isto**: criar o projeto Supabase, trocar `PROJECT-REF` pelo ref real nas duas linhas, e
conferir com `curl -I` que as duas respondem antes de ligar o interruptor em `/admin/google-shopping`.

**Rastreado por teste**: `vercelRedirects.test.ts` exige que, enquanto o host tiver maiúscula (a
assinatura do marcador), este item exista no backlog com o host escrito. Substituído pelo ref real, a
asserção se aposenta sozinha.

**Irmão da `BL-013`**: as duas são pendências de implantação que só se resolvem quando a
infraestrutura existir, e as duas têm quadro branco como sintoma.

---

## BL-017 — Mover a injeção do JSON-LD para dentro do deploy da Vercel

- **Status**: aberto, **condicional** · **Registrado em**: 2026-08-29 · **Decisão**:
  [`AD-021`](./STATE.md) · **Origem**: [`BUG-20260829`](../docs/qa/bugs/BUG-20260829-product-page-servida-como-text-plain.md)

**O que é.** Hoje `/produtos/:slug` é um `rewrite` da Vercel para uma edge function da Supabase, que
busca o shell da loja por HTTP e injeta o JSON-LD. Este item é a alternativa: a injeção passa a ser
uma função **dentro do deploy da loja**, e o `rewrite` para host externo desaparece.

**Deixou de ser condicional, e a razão MUDOU.** A condição original era o override de
`Content-Type` falhar. **Ele não falhou** — foi medido em produção em 2026-08-29 e funciona
(`BUG-20260829`). O que segura este item agora é outra coisa, descoberta na mesma medição: **a
Vercel não cacheia `rewrite` para host externo.** Quatro batidas seguidas na mesma URL, quatro
`X-Vercel-Cache: MISS`, ~1s cada, apesar do `s-maxage=300` que a function manda.

Isto **atinge a condição que a `AD-020` pôs por escrito** — *"se não cachear, a decisão precisa ser
revista antes do cutover"*. Toda visita a produto paga ~1s e atravessa a edge function, que por sua
vez busca o shell e consulta o banco; não é só o rastreador. Uma função **da própria Vercel** é
cacheada nativamente.

**O que ele resolve, e são três coisas de uma vez:**

| Hoje | Depois |
| --- | --- |
| A Supabase troca `text/html` por `text/plain` — **já contornado** por um header no `vercel.json`, que é comportamento não documentado do qual o catálogo inteiro passou a depender | O tipo é nosso, sem depender de proxy |
| **A Vercel NÃO cacheia proxy para host externo — medido**: 4 batidas, 4 `MISS`, ~1s cada. Toda visita a produto atravessa a function | Função da própria Vercel, cacheada nativamente |
| O shell é buscado do deploy vivo, e um shell velho aponta para um `<script>` que já não existe | A função viaja **no mesmo build** do shell — envelhecer deixa de ser possível |

**O custo — e ele ENCOLHEU quando foi medido.** `@estrelinha/core` exporta **TypeScript-fonte**
(`"./shopping": "./src/shopping/index.ts"`, sem build step), e `apps/store` o consome por
`workspace:*`. A primeira redação deste item dizia que nada provava que aquilo fosse resolvível fora
do Vite. **Provou-se em 2026-08-29, e resolve**: `node` v24, rodando de dentro de `apps/store`,
importa `@estrelinha/core/shopping` direto do fonte e devolve os **20 exports** — `productJsonLd` e
`renderFeedXml` entre eles — por type-stripping nativo, sem bundler e sem build step.

**O que continua não provado é só a última milha**: o builder `@vercel/node` **compila e traceia** o
entrypoint em vez de apenas executá-lo, e ninguém verificou que ele siga um `exports` para `.ts`
dentro de `node_modules` (que, no pnpm, é link para `packages/core`). Se não seguir, as saídas são
conhecidas e baratas — fixar o runtime `nodejs22.x`/`nodejs24.x`, ou importar por caminho relativo
como as edge functions do Deno já fazem. **O risco deixou de ser estrutural e virou detalhe de
configuração.**

**O que NÃO muda.** O dono da oferta continua sendo `@estrelinha/core/shopping`, e as duas
serializações continuam partindo dele. Muda o **transporte**, não o domínio — `shoppingParity.test.ts`
segue valendo palavra por palavra.

**O que fecha isto**: `/produtos/:slug` entregando `Content-Type: text/html` com o JSON-LD no corpo,
verificado no deploy — nunca por status code (`AD-021`).

---

## BL-018 — Os 13 endereços que a Nuvemshop indexou e a loja nova não tem

- **Status**: aberto, **bloqueia o cutover** · **Registrado em**: 2026-08-30 · **Origem**: auditoria
  de SEO da feature [`36`](./features/36-metadados-e-dados-estruturados/spec.md), `Out of Scope`

**O que é.** Diferença dos dois sitemaps, medida em 2026-08-30: as 730 URLs únicas (sem query) da
Nuvemshop contra as 719 da loja nova. **681 de 681 produtos batem 1:1** e as categorias batem menos
duas — `AD-018` fez o trabalho e pagou. Sobram **13 endereços indexados que respondem 404** na loja
nova:

```
/sobre-a-loja-de-joias-afetivas     /politicas-de-trocas-e-devolucoes
/politicas-de-frete-e-entrega       /politica-de-privacidade
/como-comprar-uma-joia-afetiva      /cuidados-com-sua-joia-afetiva
/contato                            /rastreio        /rastrear
/black-friday                       /produtos
/personalizados/profissoes          /nanita
```

**Por que ninguém pegou antes.** `LEGACY_REDIRECTS` (`@estrelinha/core/routes`) cobre as formas da
loja **anterior (Nanita)** — `/produto/:slug`, `/colecao/:slug`, `/categoria/:slug` — e uma da
feature `31`. Nenhuma das 13 acima está lá, porque nenhuma delas jamais existiu neste repositório:
elas existem **só na Nuvemshop**, que é o site que ranqueia. A lista de legado foi montada olhando
para o código, e o que importa é o que o Google indexou.

**O que precisa ser decidido.** Cada uma das 13 precisa de destino, e três grupos têm respostas
diferentes:

1. **As institucionais com equivalente** (`/sobre-a-loja-de-joias-afetivas` → `/sobre`; as três de
   política → `/politicas` ou uma âncora dela). 301 direto.
2. **As que não têm equivalente** (`/contato`, `/rastreio`, `/rastrear`,
   `/como-comprar-uma-joia-afetiva`, `/cuidados-com-sua-joia-afetiva`). Ou a loja ganha a página, ou
   o 301 aponta para a mais próxima. **Redirecionar tudo para a home é a saída ruim** — o Google
   trata redirect em massa para a raiz como soft-404 e descarta o sinal.
3. **As de campanha e as órfãs** (`/black-friday`, `/nanita`, `/produtos`,
   `/personalizados/profissoes`). Precisam de decisão da Adri sobre se voltam a existir.

**O que fecha isto**: as 13 respondendo 301 (nunca 302, nunca 308 acidental) para um destino que
responde 200, conferido por `curl` uma a uma **depois** do cutover — e as entradas vivendo em
`LEGACY_REDIRECTS`, lidas pelo `vercel.json` e pelo roteador, como as quatro atuais.

---

## BL-019 — O domínio provisório é indexável e o sitemap convida o Google a indexá-lo

- **Status**: aberto, **bloqueia o cutover** · **Registrado em**: 2026-08-30 · **Origem**: auditoria
  de SEO da feature [`36`](./features/36-metadados-e-dados-estruturados/spec.md), `Out of Scope` ·
  **Decisão**: [`AD-022`](./STATE.md)

**O que é.** `umaestrelinha-store-five.vercel.app` não tem `noindex` em lugar nenhum, o
`public/robots.txt` declara `Sitemap: https://umaestrelinha-store-five.vercel.app/sitemap.xml`, e o
gerador emite as **719 `<loc>` naquele host** (medido em 2026-08-30, direto na edge function). Quando
o `rewrite` de `/sitemap.xml` subir, a loja passa a **convidar ativamente** o Google a indexar o
domínio provisório — que então concorre com o definitivo pelas mesmas 719 páginas.

**Por que não é o mesmo item que a BL-018.** Aquela é sobre endereços que morrem; esta é sobre
endereços que **nascem no host errado**. Uma some com 301, a outra some com `noindex` mais a troca
de origem.

**Os três valores mudam juntos, e a `AD-022` já avisou disso por escrito**: o secret
`STORE_PUBLIC_URL` (que a function do sitemap lê), a linha `Sitemap:` do `robots.txt` e o domínio da
Vercel. A `AD-022` aceitou o segundo dono da origem justamente porque a alternativa era
`robots.txt` em 5xx, que faz o Google parar de rastrear o site inteiro. **O custo desse aceite é
este item.**

**O que fecha isto**: `curl` no domínio provisório devolvendo `X-Robots-Tag: noindex`, o
`robots.txt` do domínio definitivo apontando para o sitemap **dele**, e uma `<loc>` do sitemap
respondendo 200 no host novo — a mesma prova que o `sitemap-check.yml` já roda todo dia, apontada
para o alvo certo.

---

## BL-020 — Curadoria de SEO das 35 categorias

- **Status**: aberto, **espera a Adri, não código** · **Registrado em**: 2026-08-30 · **Origem**:
  auditoria de SEO da feature [`36`](./features/36-metadados-e-dados-estruturados/spec.md)

**O que é.** Medido no banco hospedado em 2026-08-30: **676 dos 680 produtos** têm `seo_title` e
`seo_description` curados, importados da Nuvemshop. As **35 categorias não têm nem `description`
preenchida** — a coluna existe e é `null` em todas —, e não têm coluna de SEO nenhuma.

A feature `36` **deriva** o metadado da categoria do nome dela, de propósito: criar coluna que
ninguém preenche é dar um segundo dono a um dado que não existe. Este item é o passo seguinte —
copy própria para as 35 vitrines, que são as páginas que competem por termo genérico
("joia de leite materno", "pingente com cinzas") em vez de por nome de produto.

**Vira a quinta curadoria da fila** que espera a dona, ao lado de material por produto, vagas do
menu, arte da vitrine e perguntas frequentes (ver `CLAUDE.md`, *O que espera decisão da dona*).

**O que precisa ser decidido antes de virar feature**: se a copy vive em coluna nova
(`categories.seo_title`/`seo_description`, com editor no painel) ou se as 35 são poucas o bastante
para viver como dado em `@estrelinha/core`. A primeira dá autonomia à Adri; a segunda não cria
coluna que pode ficar vazia — e a `36` já provou que a derivação por nome funciona como piso.

---

## BL-021 — Image sitemap

- **Status**: aberto · **Registrado em**: 2026-08-30 · **Origem**: auditoria de SEO da feature
  [`36`](./features/36-metadados-e-dados-estruturados/spec.md), `Out of Scope` · **Decisão**:
  [`AD-022`](./STATE.md)

**O que é.** A Nuvemshop declara **3.618 `<image:loc>`** no sitemap dela (medido em 2026-08-30); a
loja nova, zero. Para um catálogo de joia — onde a decisão de compra é visual e a busca por imagem é
canal real — isso é tráfego que não está sendo pedido.

**Por que não entrou na `36`.** Aquela feature mexe no `<head>` das páginas; esta mexe no
`core/sitemap`, que a `33` acabou de fechar com guardas próprios (`urls.test.ts`, `render.test.ts`,
ambos com sensor embutido). Entrar de carona misturaria dois conjuntos de asserções sem necessidade.

**O que precisa ser decidido**: se a imagem declarada é a primária ou todas (o catálogo tem 5 por
produto em média, e 680 × 5 aproxima o teto de 50.000 do protocolo que `SITEMAP_MAX_URLS` já
guarda), e se a URL é a do Storage ou a transformada.

---

## BL-022 — Peso do bundle da loja: 1,17 MB num chunk só

- **Status**: aberto · **Registrado em**: 2026-08-30 · **Origem**: auditoria de SEO da feature
  [`36`](./features/36-metadados-e-dados-estruturados/spec.md), `Out of Scope`

**O que é.** `apps/store/dist/assets` emite **um** `index-*.js` de **1.167.848 bytes** e um
`index-*.css` de 121.536 — sem `React.lazy`, sem `Suspense` nas rotas, sem `manualChunks`. Toda
visita baixa o checkout, o Mercado Pago, o guia de material e o cálculo de frete para ver a home.

**Por que importa mais aqui do que na média dos projetos.** O `CLAUDE.md` registra que **~90% dos
acessos vêm de celular**, e isso é premissa de projeto. LCP e INP em 3G/4G são medidos com o bundle
inteiro no caminho crítico.

**O que já está bom e não precisa de trabalho**: as imagens de produto já são WebP e leves (~20 KB
medidos), já têm `loading="lazy"` abaixo da dobra, e o endpoint `storage/v1/render/image` responde
transformação (11 KB a 400px) — `srcset` está a um passo.

**O que precisa ser decidido**: onde cortar. O checkout é o candidato óbvio (rota própria, fora do
`StoreLayout`, e a maioria das visitas não chega lá). `@mercadopago/sdk-react` e `qrcode.react` só
existem para ele.

**Irmã da `BL-00X`** (peso da listagem de produto), que mede o outro lado do mesmo problema.

---

## BL-023 — O guarda do frete grátis tem um PONTO CEGO no removedor de comentário

- **Status**: aberto · **Registrado em**: 2026-09-05 · **Origem**: feature `39`, lote 4 — o defeito
  foi encontrado nos guardas novos do menu e corrigido lá; o arquivo da `37` **não foi tocado**.

> **O número.** O item pedido como `BL-018` recebeu `BL-023`: o `018` já estava ocupado pelos
> "13 endereços que a Nuvemshop indexou", e número de backlog é imutável pela mesma razão que número
> de feature é — dois donos do mesmo identificador é o "defeito 01" aplicado à documentação.

**O que é.** `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts` remove comentários
do fonte antes de varrê-lo — sem isso ele acusaria a prosa que **explica** a regra, e o conserto
óbvio viraria "apague o comentário" em vez de "conserte o código". O removedor roda em **duas
passadas**:

```
.replace(/\/\*[\s\S]*?\*\//g, …)   // 1ª: bloco
.replace(/\/\/.*$/gm, …)           // 2ª: linha
```

E aí está o defeito: um comentário de **linha** que cite um glob com dois asteriscos —
`// varre apps/**/*.tsx` — carrega um `/*` **dentro dele**. Para a primeira régua, aquilo abre um
bloco, e ela apaga tudo até o próximo `*/` que encontrar no arquivo — **inclusive código**.

**Por que é pior que um guarda ausente.** O efeito não é uma reprovação: é o guarda **deixar de
enxergar um trecho inteiro** e passar a **aprovar em silêncio** o que estiver ali dentro. Ele
continua verde, continua listado na tabela *Os guardas* do `CLAUDE.md`, e a asserção que ele mede é
uma **ausência** — que é exatamente o que passa sozinho quando o instrumento falha. Guarda com ponto
cego parece estar de pé.

O `freeShippingSingleOwner` é o guarda do **dinheiro**: ele existe porque sete superfícies liam
`free_shipping_threshold` em duas leituras que discordavam, e quatro delas **zeravam o frete**. É o
último lugar do repositório onde se pode aceitar um instrumento que aprova sem olhar.

**Onde está a forma corrigida, para copiar.** Os quatro guardas do menu (feature `39`) fazem linha e
bloco na **mesma varredura**, com alternação — quem começa primeiro consome:

```ts
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')                                   // CRLF PRIMEIRO
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, t => t.replace(/[^\n]/g, ' '))
    .split('\n')
```

Um comentário de linha engole o resto da linha (e o glob junto); um abre-bloco engole até o
fecha-bloco. O miolo vira espaço, **preservando as quebras** — o índice de cada linha não desliza, e
o guarda continua podendo apontar `arquivo:linha`.

Arquivos com a forma correta, em ordem de proximidade com o alvo:
`apps/store/src/shared/lib/__tests__/menuSemTeto.test.ts`,
`apps/store/src/shared/lib/__tests__/menuSemItemFixo.test.ts`,
`apps/store/src/shared/lib/__tests__/menuSurfaceSingleOwner.test.ts` e
`apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts`.

**A normalização de CRLF vem primeiro, e não é higiene.** Em JavaScript `.` **não casa `\r`** (é
terminador de linha), então num checkout Windows — que é a plataforma deste projeto — `// comentário\r`
faz `/\/\/.*$/` não casar nada e o stripper fica **inerte**. Esse defeito o `freeShippingSingleOwner`
já pagou uma vez e já corrigiu; o que falta nele é a segunda metade.

**O que precisa ser decidido**: nada de projeto — é substituição mecânica. O que **não** pode
acontecer é fechar isto sem os **sensores**: quem trocar o removedor tem de acrescentar, no mesmo
arquivo, (1) a prova de que o comentário some com CRLF **e** com LF, (2) a prova de que a numeração
das linhas não desliza, e (3) o caso do glob com dois asteriscos, asserindo que o código **abaixo
dele sobrevive**. Sem o (3) a troca não é verificável, e o próximo a ler não saberá que o ponto cego
existiu.

**Escopo mínimo sugerido**: só o removedor e os sensores. Nenhuma asserção de regra deve ser tocada —
se alguma passar a reprovar depois da troca, ela estava sendo aprovada pelo ponto cego, e isso é um
achado, não um efeito colateral a "consertar" afrouxando a régua.

## BL-024 — A barra cheia do computador não tem afordância de rolagem para quem usa mouse

**Origem**: UAT em navegador da feature `39`, 2026-09-06. Medido, não suposto.

A feature `39` **apagou o teto de itens do menu** (decisão do usuário: "não limitar a quantidade de
itens em 5"). Antes, o estouro da barra era impossível por construção; agora é um estado alcançável,
e a resposta desenhada para ele é a faixa **rolar na horizontal** dentro de si mesma.

O UAT provou que a rolagem funciona e que nada vaza: com 17 itens, `nav.scrollWidth` 2619 contra
`clientWidth` 1280, `body` 1440 × 1440, e o último item alcançável em `scrollLeft` 1339. **O problema
não é a rolagem — é a pista de que ela existe.**

Medido no Chromium:

- a barra de rolagem é **em sobreposição** (`offsetHeight` = `clientHeight` = 52), então não aparece
  parada;
- a roda **vertical** do mouse sobre a faixa rola a **página**, não a faixa;
- sobram `shift`+roda, trackpad horizontal e teclado — e o teclado funciona bem: o foco no último
  item rola a faixa sozinho.

Ou seja: quem usa mouse num monitor largo pode **não descobrir** que há itens além da dobra da faixa.
Não é violação de AC (nenhuma pede afordância) e não reprovou o UAT — é consequência de produto da
decisão de tirar o teto.

**Saídas possíveis, da mais barata para a mais cara**: (1) um degradê na borda direita enquanto
houver conteúdo à direita; (2) mapear a roda vertical para rolagem horizontal quando o ponteiro está
sobre a faixa; (3) setas de rolagem nas pontas; (4) avisar na tela `/admin/menu` quando a curadoria
não couber em 1440 — a prévia já mostra, mas em silêncio.

**Status**: aberto. Nada quebra sem isto; o que se perde é descoberta.
