# A busca de produto do painel, com dono único

> A feature `50` deixou isto escrito na própria tabela de *Out of Scope*: *"`useAdminProducts` já
> carrega o catálogo para os seletores de três telas. Trocar isso é a outra feature que o próprio
> `useAdminProducts` já declara em comentário."* Esta é essa feature.
>
> **Não há desenho no Paper.** Onde a forma não estiver escrita aqui, vale o que o `ProductPicker`
> da `50` já faz — ele é o mais novo dos cinco e o único com contrato de teste completo. Divergência
> vira correção nesta spec, nunca um segundo padrão.

## Problem Statement

Escolher um produto no painel é uma pergunta só — *"qual peça?"* — e o painel a responde de **cinco
maneiras diferentes**, nenhuma sabendo da outra. Duas são listas filtradas em memória com réguas
distintas, duas são `<select>` com o catálogo inteiro dentro e busca nenhuma, e uma busca no
servidor. É o "defeito 01" deste repositório na forma que ele mais custa: **as cópias não quebram
nada**, elas só discordam.

E já discordam, medido contra o banco hospedado em 2026-09-14:

- **`name ilike '%coracao%'` devolve 0 linhas. `'%coração%'` devolve 106.** Na Home a Adri digita
  "coracao" e acha as 106 peças, porque o `ProductPicker` dobra o acento no cliente; no menu ela
  digita a mesma coisa e a tela diz que não existe nenhuma, porque `useMenuProducts` manda o termo
  cru para o Postgres. `unaccent` e `pg_trgm` **não estão instalados** no projeto.
- **O catálogo inteiro desce a cada tela.** `useAdminProducts` faz `select('*, categories(name)')`
  sem cache nenhum — `useState` + `useEffect`, não React Query. São **3.217 KB de JSON**, dos quais
  876 KB são `description` em HTML, e isso desce em `/admin/home`, no formulário de produto e nas
  configurações. A projeção que os seletores realmente leem são **130 KB**: 25× menos.
- **O teto de 1.000 linhas do PostgREST está a 298 produtos de distância.** São **702** hoje. O
  PostgREST corta e **não avisa** — é o defeito que a feature `21` já pagou neste repositório e que
  `core/paging/readAll.ts` existe para impedir. `useAdminProducts` não tem `range` nem `count`:
  passando de mil, os quatro seletores em memória simplesmente param de achar parte das peças, sem
  erro em lugar nenhum.

O pedido do usuário foi pelo seletor do bloco **Produtos em destaque** — *"deveria ser uma busca com
auto complete inteligente"*, *"pode usar um componente de busca compartilhado para ser usado em todo
o Admin"*, *"vamos focar em não duplicar essa consulta"*. A resposta honesta é a de sempre neste
repositório: **um dono**, e um guarda que recuse o sexto.

## Goals

- [ ] **Uma** porta para "quais produtos casam com o que a dona digitou", em `entities/product`, e um
      guarda que recuse a segunda.
- [ ] A busca fica **melhor que `includes`**: palavras em qualquer ordem ("cinzas colar" acha "Colar
      de Cinzas"), acento e caixa ignorados nos dois sentidos, e quem casa **no começo do nome** vem
      antes de quem casa no meio.
- [ ] As **cinco** superfícies passam a usá-la — inclusive as duas que hoje não têm busca nenhuma.
- [ ] O painel para de baixar `description`: **130 KB no lugar de 3.217 KB**, uma vez por sessão,
      compartilhado entre as telas por React Query.
- [ ] Leitura truncada vira **falha visível**, não catálogo menor: `readAllPages` de
      `@estrelinha/core/paging` fecha o teto de 1.000 linhas.
- [ ] **Nenhuma migration**, nenhuma coluna nova e nenhum índice: a dobra de acento continua no
      cliente, que é onde ela já está certa.
- [ ] `packages/core/src/payment/**` fecha a feature sem uma linha alterada.

## Out of Scope

| Item | Por quê |
| --- | --- |
| **Busca no servidor** (coluna gerada `search_name` + índice trigram) | Decisão do usuário, com o custo apresentado. A 702 produtos o pool são 130 KB e o filtro é instantâneo; a alternativa custaria migration, debounce, mínimo de letras, estado de carga e hidratação à parte — e **regrediria a dobra de acento**, porque `unaccent` não está instalado e `unaccent()` não é imutável, logo não serve em coluna gerada. A porta fica desenhada para a troca: quem chama o hook não sabe de onde vem o resultado |
| Unificar as **três cópias de `slugify`** (`CategoryFormDialog`, `CsvImportDialog`, `AdminProductFormPage`) | São outra função — dobra **mais** recorte de caractere e junção por hífen. Unificá-las é decisão sobre geração de endereço, não sobre busca, e merece a própria feature. Fica registrado como dívida |
| Busca de **categoria**, de pedido ou de cliente | O pedido é sobre produto. `categoryTree.ts` cede a dobra de texto e nada mais |
| Trocar o padrão de dados do painel por React Query **em geral** | Só o pool entra. Migrar o painel inteiro é refatoração de infraestrutura, não o pedido — mesma fronteira que a `50` desenhou |
| **Imagem** da peça no resultado | `AD-019`: o painel não desenha a vitrine. Quem mostra como o bloco fica é a prévia, que é a loja num iframe. O seletor é uma **lista** |
| Busca por **SKU**, tag, categoria ou faixa de preço | A listagem de produtos (`useAdminProductList`) já faz isso, no servidor e paginado. O seletor responde "qual peça?", não "quais peças filtradas por quê?" |
| Histórico de busca / peças recentes | Nenhuma das cinco telas pediu, e guardá-lo criaria estado por dispositivo que ninguém sabe limpar |
| Criar produto de dentro do seletor | Atalho plausível e fora do pedido. A tela de produto é o dono de criar produto |

---

## Assumptions & Open Questions

| # | Ambiguidade | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | "Auto complete inteligente" — o que é *inteligente*? | **Palavras em qualquer ordem, dobra de acento nos dois sentidos, e prefixo do nome antes de miolo**; empate desempatado por nome, em pt-BR | É a diferença mensurável contra o `includes` de hoje, e cada metade é testável sozinha. Ranking por venda ou por acesso precisaria de dado que o pool não tem, e traria um segundo dono ("o que é relevante?") | y |
| A-02 | Onde mora o componente compartilhado? | `apps/backoffice/src/entities/product/` | `AD-033`: consumidores no **mesmo app** vão para `entities/`, não para `packages/core`. Os cinco são `features/` do painel, e `features/` pode importar de `entities/`. `core` custaria uma dependência de UI num pacote cuja pureza tem guarda | y |
| A-03 | O pool carrega quais colunas? | `id, name, slug, is_active, base_price` | As quatro primeiras são exatamente o `EditorProduct` que a `50` já declarou; `base_price` entra porque o seletor do order bump mostra o preço hoje e tirá-lo seria regressão de uma tela que esta feature não foi chamada para piorar. Medido: **~137 KB** contra 3.217 KB do `select('*')` | y |
| A-04 | `description` fica de fora do pool — e o banner do menu precisa dela | Sim, fica de fora; a **hidratação dos ids já escolhidos** é uma segunda leitura, pequena e no mesmo dono | `description` é 876 KB dos 3.217, e só é lida para os alvos **já apontados** por um banner (≤ 2 por superfície), nunca para resultado de busca. `useMenuProducts` já separava assim — `resultados` e `porId` —, e a separação sobrevive à mudança de dono | y |
| A-05 | Uma leitura truncada devolve o que veio, ou falha? | **Falha**, com mensagem em tela | `readAllPages` já existe e é o dono desta regra no repositório. Devolver parcial é publicar um catálogo menor, indistinguível de um catálogo que encolheu — e o seletor diria "nenhuma peça com X" sobre uma peça que existe | y |
| A-06 | Um componente com modo, ou dois componentes? | **Um componente**, com `modo: 'unico' \| 'multiplo'` | O que as cinco telas compartilham é a parte que erra em silêncio: a consulta, a dobra, a régua de ordenação, o vazio explicado. A diferença entre "escolher uma" e "acrescentar à lista" é onde o resultado é entregue, e cabe num parâmetro. Dois componentes teriam a lista de resultados escrita duas vezes, que é o defeito de novo | y |
| A-07 | O preço aparece no resultado? | **Não por padrão** — `mostrarPreco` opcional, ligado só no order bump | O `ProductPicker` tem hoje um teste dizendo *"nenhuma linha mostra preço — isto não é a vitrine"*, e ele continua valendo para a Home. O order bump mostra preço desde que existe, numa tela de configuração que não desenha Home nenhuma. **Imagem não tem parâmetro**: o componente nunca renderiza `<img>`, e há asserção disso | y |
| A-08 | O que acontece com o cache quando a dona grava um produto? | O pool é **invalidado** por quem grava, e `staleTime` de 5 minutos | O padrão de hoje é pior em frescor, não melhor: `useAdminProducts` não tem cache nenhum e também não tem invalidação — ele recarrega só na montagem, então uma peça criada noutra aba já não aparecia. Invalidar em `createProduct`/`updateProduct`/`deleteProduct` é o que torna a troca uma melhora de frescor, e não só de peso | y |
| A-09 | As três telas param de chamar `useAdminProducts()`? | **Sim**, e o hook para de carregar o catálogo | É a conclusão de "não duplicar essa consulta": com os cinco seletores no pool, o `products` de `useAdminProducts` fica **sem nenhum consumidor**. `getProduct` perde o atalho de cache e cai na consulta de uma linha que ele já tem. Fica em **P2**, separável de P1 | y |
| A-10 | A dobra de acento vira o quê? | `shared/lib/texto.ts`, e as **três cópias idênticas** passam a chamá-la | O próprio `ProductPicker` escreveu o motivo: *"importar de uma delas seria import feature→feature"*. `shared/` é a camada abaixo de todas e resolve isso. As três idênticas são `ProductPicker`, `MenuIconPicker` e `categoryTree` — as outras sete ocorrências de `normalize('NFD')` no painel são `slugify` ou normalização de tag, e ficam fora (A-02 da tabela acima) | y |
| A-11 | Quantas linhas de resultado a lista mostra? | **20**, com contador dizendo quantas ficaram de fora | É o teto que o `ProductPicker` já tem, e o motivo dele vale para as cinco: pintar 702 linhas não ajuda ninguém a achar nada. É teto de **desenho**, nunca de escolha | y |
| A-12 | O `<select>` do `DestinoDoItem` some inteiro? | **Não.** Ele continua escolhendo entre *coleção*, *produto* e *endereço livre*; só o ramo **produto** vira busca | O seletor responde três perguntas, e duas delas não são sobre produto. Trocar as três por uma busca de produto apagaria as coleções | y |
| A-13 | Termo mínimo para buscar? | **Nenhum** — sem termo, a lista mostra as 20 primeiras | O pool está em memória; não há requisição por tecla para poupar. `useMenuProducts` exigia 2 letras porque cada tecla era uma ida ao servidor, e essa razão deixa de existir. Sem termo o `ProductPicker` já mostra o começo do catálogo hoje | y |

**Open questions:** nenhuma — resolvidas ou registradas acima.

### Varredura das dimensões implícitas (escopo Large — todas)

| Dimensão | Requisito ou `N/A` |
| --- | --- |
| Validação e limites de entrada | `BUS-04` (termo vazio, só espaço, só acento), `BUS-06` (teto de 20 linhas), `BUS-11` (o termo não vai ao SQL — não há injeção possível, o filtro é em memória) |
| Falha e falha parcial | `BUS-12` (erro de rede vira texto na tela, com "tentar de novo"), `BUS-13` (leitura truncada **falha**, não devolve parcial) |
| Idempotência / repetição | `BUS-14` (escolher a mesma peça duas vezes não a duplica na lista; ela aparece desabilitada dizendo por quê) |
| Fronteira de autorização e limite de taxa | `N/A` — a leitura é a mesma que o painel já faz, sob a mesma policy `admin full products`. Não há endpoint novo, nem chamada por tecla a limitar |
| Concorrência / ordenação | `BUS-15` (o resultado é **determinístico**: mesmo termo, mesmo pool, mesma ordem — sem isso a asserção de ranking é verdadeira por acaso) |
| Ciclo de vida do dado / expiração | `BUS-16` (`staleTime` de 5 min e invalidação por quem grava produto) |
| Observabilidade | `N/A` — o painel não tem coleta de métrica, e acrescentar uma aqui seria a primeira do repositório, fora do pedido. A falha de leitura é observável **em tela**, que é o canal que existe |
| Falha de dependência externa | `BUS-12` cobre o Supabase fora do ar; não há outra dependência |
| Integridade de transição de estado | `N/A` — o seletor não tem máquina de estado. O que ele emite é entregue ao rascunho de quem chama, que já tem o dono do próprio estado |

---

## User Stories

### P1 · H1: Uma busca só, e melhor ⭐ MVP

**User Story**: Como Adri, quero achar uma peça digitando parte do nome dela — em qualquer ordem,
com ou sem acento — para não precisar rolar 702 linhas nem lembrar como escrevi o nome.

**Why P1**: É o pedido. E é o que torna as duas telas sem busca utilizáveis.

**Acceptance Criteria**:

1. `BUS-01` — WHEN a dona digita um termo THEN a busca SHALL casar **cada palavra do termo**
   separadamente, em qualquer ordem: `cinzas colar` acha `Colar de Cinzas`, e `colar cinzas`
   também.
2. `BUS-02` — WHEN o termo ou o nome tem acento THEN a busca SHALL ignorá-lo **nos dois sentidos**:
   `coracao` acha `Anel Coração` e `coração` acha `Anel Coracao`. Caixa idem.
3. `BUS-03` — WHEN duas peças casam e uma delas casa **no começo do nome** THEN a que casa no começo
   SHALL vir antes: para `colar`, `Colar de Cinzas` vem antes de `Pingente com Colar`.
4. `BUS-04` — WHEN o termo é vazio, só espaço ou só pontuação THEN a busca SHALL devolver o pool
   inteiro, na ordem alfabética, sem tratar isso como erro.
5. `BUS-05` — WHEN nenhuma peça casa THEN a tela SHALL dizer **o que aconteceu e o que fazer**,
   citando o termo, e a lista de resultados SHALL desaparecer — não ficar vazia ao lado do aviso.
6. `BUS-06` — WHEN mais de 20 peças casam THEN a lista SHALL mostrar 20 e dizer quantas ficaram de
   fora, e escrever mais do termo SHALL alcançar as que ficaram.
7. `BUS-15` — WHEN o mesmo termo é aplicado ao mesmo pool duas vezes THEN a ordem do resultado SHALL
   ser idêntica, incluindo os empates.

**Independent Test**: chamar a função pura de filtro com um pool de fixture e conferir os sete casos
sem montar tela nenhuma.

---

### P1 · H2: O componente compartilhado, nas cinco telas ⭐ MVP

**User Story**: Como quem mantém o painel, quero uma peça só respondendo "qual produto?" para que a
sexta tela que precisar disso nasça certa, e para que uma correção valha em todas.

**Why P1**: Sem isto a feature é um sexto dono.

**Acceptance Criteria**:

1. `BUS-07` — WHEN qualquer das cinco telas precisa escolher produto THEN ela SHALL renderizar
   `ProductSearchField` de `@/entities/product`, e **nenhuma** SHALL manter lista, filtro ou consulta
   própria.
2. `BUS-08` — WHEN o modo é `multiplo` THEN as peças já escolhidas SHALL aparecer **desabilitadas**
   na lista, dizendo por quê, e clicar numa delas SHALL não emitir nada.
3. `BUS-09` — WHEN o modo é `unico` THEN a peça escolhida SHALL aparecer nomeada no campo, com um
   controle de limpar, e escolher outra SHALL substituí-la.
4. `BUS-10` — WHEN uma peça do resultado está **fora do ar** (`is_active === false`) THEN ela SHALL
   ser marcada como tal **e continuar escolhível** — a marca informa, não bloqueia.
5. `BUS-17` — WHEN o componente renderiza THEN ele SHALL não conter nenhum `<img>`, e a lista SHALL
   ser `<ul>` de `<li>`, nunca uma grade (`AD-019`).
6. `BUS-18` — WHEN a lista renderiza THEN cada linha clicável SHALL ter ao menos 44px de altura.
7. `BUS-14` — WHEN a mesma peça é escolhida duas vezes em modo `multiplo` THEN a lista de quem chama
   SHALL continuar com uma ocorrência só.
8. `BUS-19` — WHEN o `DestinoDoItem` escolhe um produto THEN ele SHALL continuar congelando
   `product_slug` e `label_snapshot` junto com a escolha, e as coleções e o endereço livre SHALL
   continuar existindo como destino.

**Independent Test**: montar cada uma das cinco telas e escolher uma peça pela busca, conferindo que
o valor emitido é o mesmo de antes da troca.

---

### P1 · H3: Uma leitura, e ela não mente ⭐ MVP

**User Story**: Como quem mantém o painel, quero que o catálogo desça uma vez, enxuto, e que uma
leitura truncada grite — para que o painel não passe a mentir quando a loja crescer.

**Why P1**: O teto de 1.000 está a 298 produtos, e o defeito é silencioso.

**Acceptance Criteria**:

1. `BUS-11` — WHEN o pool é lido THEN ele SHALL pedir **apenas** `id, name, slug, is_active,
   base_price`, e `description` SHALL não estar na projeção.
2. `BUS-13` — WHEN a contagem exata e o total lido divergem THEN o hook SHALL **falhar**, e a tela
   SHALL mostrar o erro — nunca devolver o que veio.
3. `BUS-12` — WHEN a leitura falha por rede THEN a tela SHALL dizer que não conseguiu carregar e
   oferecer tentar de novo, e o campo de busca SHALL não sugerir que o catálogo está vazio.
4. `BUS-16` — WHEN um produto é criado, alterado ou apagado pelo painel THEN o pool SHALL ser
   invalidado, e a próxima busca SHALL enxergar a mudança.
5. `BUS-20` — WHEN duas telas do painel montam o seletor na mesma sessão THEN a leitura do pool SHALL
   acontecer **uma vez** — o cache é compartilhado por chave, não por componente.

**Independent Test**: dublê de client contando requisições e devolvendo contagem divergente do total.

---

### P1 · H4: O guarda ⭐ MVP

**User Story**: Como quem mantém o painel, quero que a sexta cópia não compile verde.

**Why P1**: As cinco de hoje nasceram uma a uma, cada uma razoável sozinha. Sem guarda, a próxima
feature repete exatamente isto.

**Acceptance Criteria**:

1. `BUS-21` — WHEN um arquivo de `apps/backoffice/src/**` fora de `entities/product/api/**` consulta
   `products` filtrando por nome (`ilike`, `like`, `textSearch`) THEN a suíte SHALL reprovar.
2. `BUS-22` — WHEN um arquivo fora de `shared/lib/texto.ts` declara a dobra de busca THEN a suíte
   SHALL reprovar — e a régua SHALL procurar **declaração**, nunca menção, para que a prosa que
   explica a regra não seja acusada.
3. `BUS-23` — WHEN um arquivo fora de `entities/product/**` mapeia o catálogo inteiro em `<option>`
   ou `<SelectItem>` THEN a suíte SHALL reprovar.
4. `BUS-24` — O guarda SHALL carregar **âncora de contagem dupla** (arquivos lidos **e** cada régua
   encontrada ao menos uma vez no dono), e SHALL remover comentário de linha e de bloco na **mesma**
   varredura, provado com CRLF **e** com LF.

**Independent Test**: reinjetar cada forma proibida num arquivo real e ver a suíte reprovar nomeando
arquivo e linha; e o inverso — o dono legítimo não é acusado.

---

### P2 · H5: O catálogo para de descer inteiro

**User Story**: Como Adri, quero que `/admin/home`, o formulário de produto e as configurações abram
sem baixar 3,2 MB que nenhuma delas usa.

**Why P2**: É a consequência de H1–H3, não um pré-requisito. Se der trabalho, H1–H4 valem sozinhas.

**Acceptance Criteria**:

1. `BUS-25` — WHEN `/admin/home` monta THEN ela SHALL não chamar `useAdminProducts()`, e
   `useAdminResolvedHome` SHALL receber o pool.
2. `BUS-26` — WHEN o formulário de produto monta THEN ele SHALL não usar o `products` de
   `useAdminProducts` para os dois seletores.
3. `BUS-27` — WHEN nenhuma tela lê mais o `products` de `useAdminProducts` THEN o hook SHALL parar de
   carregar o catálogo, e `getProduct` SHALL continuar devolvendo a peça pela consulta de uma linha.

**Independent Test**: dublê contando as colunas pedidas na montagem de cada uma das três telas.

---

## Edge Cases

- WHEN o pool está vazio (loja sem produto) THEN o seletor SHALL cair no mesmo vazio explicado de
  `BUS-05`, sem quebrar e sem dizer que a busca falhou.
- WHEN o pool ainda está carregando THEN o campo SHALL ficar utilizável e a lista SHALL mostrar
  estado de carga — não um vazio que parece "não achei".
- WHEN a peça escolhida foi **apagada** do catálogo depois de escolhida THEN o modo `unico` SHALL
  continuar mostrando o nome congelado pelo chamador, e não trocá-lo por vazio.
- WHEN o termo tem palavra repetida (`colar colar`) THEN o resultado SHALL ser o mesmo de `colar`.
- WHEN duas peças têm nome idêntico THEN as duas SHALL aparecer, distinguíveis pela marca de estado,
  e a ordem entre elas SHALL ser estável.
- WHEN o nome da peça tem `ç` ou `ñ` THEN a dobra SHALL alcançá-lo — `acai` acha `Açaí`.

---

## Requirement Traceability

| ID | História | Tasks | Status |
| --- | --- | --- | --- |
| BUS-01..06, BUS-15 | P1 · H1 | T01, T02 | **Verified** |
| BUS-07..10, BUS-14, BUS-17..19 | P1 · H2 | T04..T09 | **Verified** |
| BUS-11..13, BUS-16, BUS-20 | P1 · H3 | T03, T11 | **Verified** |
| BUS-21..24 | P1 · H4 | T10 | **Verified** |
| BUS-25..27 | P2 · H5 | T11 | **Verified** |

**Coverage:** 27 requisitos, 27 mapeados a tasks, **27 com evidência `file:line`** conferida por
verificação independente (autor ≠ verificador) — ver `validation.md`.

> **Duas correções entraram DEPOIS do veredito**, e as duas fecham buraco que o Verifier nomeou:
>
> - **`BUS-16` era mais larga que a implementação.** A AC diz "criado, alterado ou apagado **pelo
>   painel**", e os três caminhos de **lote** — import de CSV, edição em massa e grade rápida —
>   gravam em `products` sem passar por `createProduct`. Eles reliam a **listagem** e não o pool, e
>   por até `PRODUCT_POOL_STALE_TIME` as cinco telas de busca ficariam sem as peças novas, sem nada
>   em tela dizendo por quê. Os três passaram a invalidar, com quatro casos — e a régua é a **chave**
>   invalidada, nunca "`invalidateQueries` foi chamado": invalidar a chave errada chamaria o método
>   do mesmo jeito.
> - **`BUS-26` não tinha asserção própria**, e o comentário do dublê **afirmava** que tinha. O
>   Verifier devolveu o `products` à página do produto e a suíte ficou **14/14 verde**: aqueles casos
>   nunca abriam a aba *Relacionados*, então `products={undefined}` não chegava a renderizar. Quem
>   prendia a regressão era só o `tsc`. Três casos novos abrem a aba e semeiam o pool com uma peça
>   que o dublê **não** devolve — ver a peça é ver o pool —, e o comentário passou a dizer a verdade.

---

## Success Criteria

- [ ] `grep` por consulta de produto filtrada por nome em `apps/backoffice/src/**` devolve **um**
      arquivo, e ele é o dono.
- [ ] `coracao` e `coração` devolvem o mesmo conjunto nas **cinco** telas.
- [ ] A projeção do pool não contém `description`, provado por asserção sobre a string do `select`.
- [ ] Baseline sem regressão: backoffice parte de **2539/140** (medido 2026-09-14, árvore parada,
      exit 0), lint em **25/4** no painel, tipos em **0**.
- [ ] `packages/core/src/payment/**` sem uma linha alterada, conferido por `git diff --name-only`.
