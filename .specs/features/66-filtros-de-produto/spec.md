# 66 — Filtros de produto, curados no painel e aplicados na loja

## Problem Statement

A loja filtrava a categoria pelas **tags** do produto (seção "Universo"), e o filtro saiu em
`878ef19` porque a tag tem dois papéis que não convivem: etiqueta **interna** e atributo **público**.
Medido no banco local (2026-10-18): 635 de 702 produtos têm tag, e as mais usadas misturam atributo
real (`Prata925`, `Folheado a ouro`, `Pulseira`, `pet`), fornecedor (`Ali - Lancelot`, `Jamile`),
marcação de trabalho (`seo`, `Corrigir`, `dados`, `dados2`) e grafias duplicadas (`Afetivo` ×
`Afetivos`, `Aço Inoxidável` × `Aco inoxidavel`). As variações também não servem de fonte: `Cor` tem
`Folheado a Ouro` e `Prata 925 folheado a ouro` como valores distintos, e "tipo de elo" aparece com
cinco grafias de chave.

Hoje a categoria só filtra por preço, estoque, desconto e novidade. A cliente que procura "um
pingente em prata 925" não tem como pedir isso à loja.

## Goals

- [ ] A Adri cria e organiza **grupos de filtro** (ex.: *Tipo de joia*, *Acabamento*, *Para quem*) e
      os **valores** de cada grupo no painel, sem depender de tag nem de variação.
- [ ] A Adri marca os valores de um produto no formulário dele **e** em massa (um valor × muitos
      produtos), para curar o catálogo existente em horas, não em dias.
- [ ] A Adri esconde, por categoria, os grupos que não fazem sentido nela.
- [ ] A loja oferece os grupos na **categoria** e na **busca**, com o estado na **URL**.
- [ ] A tag volta a ser só etiqueta interna: nenhuma superfície da loja a exibe como filtro.

## Out of Scope

| Item | Razão |
| --- | --- |
| Derivar valores das variações (`option_values`) ou das tags automaticamente | o dado é sujo (medido acima); a curadoria é a fonte. A tag pode **ajudar a selecionar** produtos na marcação em massa (P2), nunca vira valor sozinha |
| Limpar, renomear ou apagar as tags existentes | tag é etiqueta interna da dona; esta feature só deixa de exibi-la |
| Filtro por `material_kinds` (cinzas, leite…) | `BL-015`: a coluna diz menos que a descrição, e a página do produto é proibida de anunciá-la. Se a Adri quiser um grupo "Material afetivo", ela cria e cura como qualquer outro |
| Filtro com seleção única, faixa numérica ou cor (amostra) | todos os grupos são multi-seleção de texto; o preço continua sendo o único filtro de faixa |
| Grupos diferentes por categoria (cada categoria com os seus) | decisão do usuário: grupos **globais**, com esconder por categoria |
| Herança do "esconder" para subcategorias | ver *Assumptions* |
| Evento de GA4 próprio para filtro | a URL já entra no `page_location` do `page_view`; evento dedicado é outra feature |
| Página filtrada indexável (landing de SEO por filtro) | a canônica continua sendo a categoria (`useCanonical`) |
| Filtros no menu, na Home ou no feed do Google | só categoria e busca |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem do valor | curado no painel, tabela própria | decisão do usuário (2026-10-18) | y |
| Escopo dos grupos | globais + esconder por categoria | decisão do usuário | y |
| Onde se marca | formulário do produto **e** em massa por valor | decisão do usuário | y |
| Superfícies | categoria, busca, estado na URL | decisão do usuário | y |
| Lógica de seleção | **OU** dentro do grupo, **E** entre grupos e com os filtros de sistema | é a regra que o "Universo" já usava, e a interseção dentro do grupo seria quase sempre vazia | n |
| Esconder por categoria é **presença** de linha (`hidden`), não flag `shown` | sem linha = grupo visível | regra 2 do "defeito 01": curadoria é presença; grupo novo aparece em toda categoria sem migração | n |
| Esconder **não herda** para subcategoria | cada categoria decide por si | a árvore tem dois níveis e a Adri vê as duas no painel; herança seria um segundo lugar para a mesma resposta | n |
| Contagem por valor | conta com os filtros dos **outros** grupos e os de sistema aplicados (faceta disjuntiva) | é o número que diz "se eu tocar aqui, sobra quanto" | n |
| Valor sem produto na base (categoria ou resultado da busca) | não aparece | chip que nunca devolve nada é ruído | n |
| Valor com produto na base mas zero com a seleção atual | aparece **desabilitado**, com `(0)` | sumir faria o painel pular a cada toque | n |
| Grupo inativo | some da loja; as marcações ficam | desligar não pode custar a curadoria | n |
| Chave da URL | o `slug` do grupo; valores pelo `slug`, separados por vírgula: `?acabamento=prata-925,ouro` | URL legível e compartilhável | n |
| Filtros de sistema e ordem também na URL | `preco=10-80`, `estoque=1`, `desconto=1`, `novidades=1`, `ordem=menor-preco` | metade do estado na URL e metade fora quebraria o "voltar" | n |
| Chaves reservadas | `q`, `ordem`, `preco`, `estoque`, `desconto`, `novidades`, `pagina`, e todo prefixo `utm_`, mais `gclid`, `fbclid` | o slug do grupo não pode colidir com elas; quem recusa é `core` | n |
| Parâmetro desconhecido ou valor inexistente na URL | ignorado em silêncio; a página nunca vira 404 por filtro | link velho (valor apagado, slug trocado) continua abrindo a categoria | n |
| Limites | nome de grupo e de valor ≤ 40 caracteres; ≤ 12 grupos; ≤ 60 valores por grupo | "Letra" A–Z cabe com folga; acima disso o painel do celular vira lista sem fim | n |
| Busca | os mesmos grupos, sem esconder por categoria (a busca atravessa categorias) | o esconder é decisão sobre uma categoria | n |
| Ordem | grupos e valores na ordem que a Adri arrastar (`sort_order`) | não alfabética: "P, M, G" não é ordem alfabética | n |
| Nome do slice da loja | `features/category-filters` continua com esse nome, agora usado também pela busca | renomear custa churn em 30+ imports sem mudar comportamento | n |

**Open questions:** nenhuma — as decisões estruturais foram respondidas; o resto está logado acima com
`Confirmed? n` e entra na revisão da spec.

---

## User Stories

### P1: Grupos e valores no painel ⭐ MVP

**User Story**: Como a Adri, quero criar grupos de filtro e os valores de cada um, para decidir o que a
cliente pode filtrar sem depender da bagunça das tags.

**Acceptance Criteria**:

1. WHEN a Adri abre `/admin/filtros` THEN o painel SHALL listar os grupos na ordem de `sort_order`,
   cada um com nome, quantidade de valores, quantidade de **marcações** (soma por valor) e o interruptor de ativo.
   *(Emenda de 2026-10-18, pela verificação: "produtos marcados" contaria duas vezes a peça com dois
   valores do mesmo grupo. A contagem exata por peça fica no VALOR — "N peças marcadas".)*
2. WHEN ela cria um grupo com nome THEN o sistema SHALL gerar o `slug` pelo nome (kebab-case, sem
   acento) e mostrá-lo editável como "Endereço no filtro".
3. WHEN o nome está vazio, passa de 40 caracteres, ou repete o de outro grupo (sem diferenciar
   maiúscula e acento) THEN o painel SHALL recusar antes de gravar, com o motivo em texto.
4. WHEN o `slug` é uma chave reservada (ver *Assumptions*) ou repete o de outro grupo THEN o painel
   SHALL recusar com "Este endereço já é usado pela loja" — e o banco SHALL recusar a mesma gravação
   (índice único + `check`).
5. WHEN ela já tem 12 grupos THEN "Novo grupo" SHALL ficar desabilitado com o motivo.
6. WHEN ela acrescenta, renomeia, reordena (arrastar) ou remove um valor THEN o sistema SHALL aplicar
   as mesmas regras de nome, slug único **dentro do grupo** e teto de 60.
7. WHEN ela remove um valor que tem produtos marcados THEN o painel SHALL pedir confirmação dizendo
   quantos produtos perdem a marcação, e a remoção SHALL apagar as marcações junto.
8. WHEN ela remove um grupo THEN o painel SHALL confirmar com o número de valores e de marcações, e a
   remoção SHALL apagar os dois junto.
9. WHEN ela desliga um grupo THEN ele SHALL sumir da loja e as marcações SHALL continuar no banco.
10. WHEN uma gravação falha THEN o painel SHALL manter o que ela digitou e mostrar o erro; nada SHALL
    aparecer como salvo.

**Independent Test**: criar "Acabamento" com "Prata 925" e "Folheado a ouro", reordenar, desligar e
religar, e ver tudo persistido depois de um F5.

---

### P1: Marcar valores em um produto ⭐ MVP

**User Story**: Como a Adri, quero marcar os filtros de uma peça enquanto a cadastro ou edito.

**Acceptance Criteria**:

1. WHEN ela abre um produto em `/admin/produtos/:id` THEN o formulário SHALL ter o bloco "Filtros da
   loja", com um grupo por linha e os valores como chips de seleção múltipla, na ordem do painel.
2. WHEN não existe grupo nenhum THEN o bloco SHALL dizer isso e linkar para `/admin/filtros`.
3. WHEN ela salva o produto THEN as marcações SHALL ser gravadas junto, e um produto novo SHALL
   receber as marcações depois de existir (nunca antes, nunca perdidas).
4. WHEN um grupo está desligado THEN o bloco SHALL mostrá-lo com o selo "Desligado na loja", e as
   marcações dele continuam editáveis.

**Independent Test**: marcar "Prata 925" num anel, salvar, recarregar e ver o chip marcado.

---

### P1: Marcar em massa por valor ⭐ MVP

**User Story**: Como a Adri, quero abrir um valor e marcar dezenas de produtos de uma vez, para curar
os 702 produtos que já existem.

**Acceptance Criteria**:

1. WHEN ela abre um valor THEN o painel SHALL listar os produtos com busca por nome (a dobra de busca
   da `51`, `dobrarTexto`), recorte por categoria, e o recorte "só os marcados" / "só os não marcados".
2. WHEN ela marca a caixa de vários produtos e toca "Marcar N produtos" THEN o sistema SHALL gravar as
   N marcações numa requisição só; produto que já estava marcado SHALL ser no-op, nunca erro.
3. WHEN ela desmarca e toca "Remover de N produtos" THEN o sistema SHALL apagar as N marcações numa
   requisição só.
4. WHEN a lista está recortada THEN "Selecionar todos" SHALL selecionar **só os visíveis** no recorte,
   e o botão SHALL dizer o número.
5. WHEN a gravação em massa falha THEN a seleção SHALL continuar como estava e nenhum produto SHALL
   aparecer como marcado.
6. WHEN a gravação dá certo THEN as contagens do valor e do grupo SHALL atualizar sem recarregar.

**Independent Test**: no valor "Prata 925", buscar "anel", selecionar todos (18), marcar, e ver o
contador ir a 18.

---

### P1: Os filtros na categoria da loja ⭐ MVP

**User Story**: Como cliente, quero filtrar a coleção pelo tipo de peça e pelo acabamento, para achar
a joia sem rolar a coleção inteira.

**Acceptance Criteria**:

1. WHEN a categoria abre THEN o painel de filtros (sidebar ≥ `md`, bottom sheet no celular) SHALL
   mostrar, depois de "Preço" e antes de "Disponibilidade", **um bloco por grupo** que esteja ativo,
   não escondido naquela categoria, e com ao menos um valor que algum produto da categoria tenha.
2. WHEN um bloco aparece THEN ele SHALL listar só os valores com ao menos um produto na categoria, na
   ordem do painel, cada um com a contagem entre parênteses.
3. WHEN a cliente marca valores do mesmo grupo THEN a lista SHALL mostrar produtos com **qualquer um**
   deles; marcando valores de grupos diferentes, produtos com **pelo menos um de cada grupo**; e
   sempre junto com preço, estoque, desconto e novidade.
4. WHEN um valor tem produtos na categoria mas zero com a seleção atual THEN ele SHALL aparecer
   desabilitado com `(0)`, a menos que esteja marcado.
5. WHEN há valores marcados THEN cada um SHALL virar chip removível acima da grade (como os de
   sistema), e "Limpar filtros" SHALL desmarcar tudo.
6. WHEN o catálogo de filtros não carrega THEN a categoria SHALL abrir com os filtros de sistema e sem
   erro na tela — os grupos simplesmente não aparecem.
7. WHEN um grupo tem mais de 8 valores no celular THEN o bloco SHALL mostrar os 8 primeiros e "Ver
   todos (N)", que abre o resto no mesmo bloco.
8. Todo chip de valor SHALL ter alvo de toque ≥ 44px no bottom sheet (`TAP_44` ou altura própria) e
   nunca quebrar em duas linhas dentro do chip.

**Independent Test**: em "Pingentes", marcar "Prata 925" e ver só os pingentes marcados assim, com o
chip acima da grade.

---

### P1: Estado na URL ⭐ MVP

**User Story**: Como cliente, quero mandar o link da coleção já filtrada e usar o voltar do celular.

**Acceptance Criteria**:

1. WHEN a cliente muda qualquer filtro ou a ordem THEN a URL SHALL refletir o estado
   (`?acabamento=prata-925,ouro&preco=10-80&estoque=1&ordem=menor-preco`), com `replace` para não
   empilhar uma entrada de histórico por toque.
2. WHEN a página abre com esses parâmetros THEN o estado SHALL nascer deles.
3. WHEN um parâmetro é desconhecido, um valor não existe, ou o preço está fora da faixa THEN ele SHALL
   ser ignorado (preço é recortado à faixa), sem 404 e sem erro.
4. WHEN o estado volta ao padrão THEN a URL SHALL ficar sem parâmetro de filtro nenhum.
5. A canônica SHALL continuar sendo a da categoria, sem query.
6. Parâmetros que não são de filtro (`utm_*`, `gclid`, `fbclid`) SHALL ser preservados.

---

### P2: Esconder grupos numa categoria

**User Story**: Como a Adri, quero tirar "Tamanho do anel" da categoria Chaveiros.

**Acceptance Criteria**:

1. WHEN ela abre uma categoria em `/admin/categorias` THEN SHALL haver a seção "Filtros nesta
   categoria", com cada grupo e um interruptor ligado por padrão.
2. WHEN ela desliga um grupo ali THEN ele SHALL sumir **só** daquela categoria na loja.
3. WHEN um grupo novo é criado THEN ele SHALL nascer visível em todas as categorias.
4. WHEN o grupo é apagado THEN as linhas de "escondido" dele SHALL sair junto.

---

### P2: Os filtros na busca

**User Story**: Como cliente, quero refinar o resultado da busca do mesmo jeito.

**Acceptance Criteria**:

1. WHEN a busca tem resultado THEN a página SHALL oferecer os mesmos blocos, com a base sendo o
   resultado da busca, e o mesmo bottom sheet no celular.
2. WHEN a cliente filtra THEN a URL SHALL manter o `q` e acrescentar os filtros.
3. O "esconder por categoria" SHALL não se aplicar na busca.

---

### P2: Selecionar em massa pela tag

**User Story**: Como a Adri, quero usar as tags que já tenho para achar os produtos a marcar.

**Acceptance Criteria**:

1. WHEN ela está na marcação em massa THEN SHALL haver o recorte "Com a tag…" listando as tags
   existentes com a contagem.
2. O recorte SHALL só **filtrar a lista**; nenhuma marcação SHALL acontecer sem ela tocar no botão.

---

## Edge Cases

- WHEN um produto é apagado THEN suas marcações SHALL sair junto (`on delete cascade`).
- WHEN um produto inativo tem marcações THEN ele não SHALL contar em nenhuma contagem da loja (a loja
  só recebe produto ativo).
- WHEN a categoria tem um produto só THEN os blocos seguem as mesmas regras (sem caso especial).
- WHEN a Adri troca o `slug` de um grupo ou valor THEN links antigos SHALL abrir a categoria sem
  aquele filtro (AC de URL 3); o painel SHALL avisar isso no campo antes de salvar.
- WHEN dois valores têm o mesmo nome em grupos diferentes ("Ouro" em Acabamento e em Cor da pedra)
  THEN são valores distintos e o chip acima da grade SHALL nomear só o valor.
- WHEN a cliente abre o sheet, mexe e fecha sem aplicar THEN o comportamento atual do sheet SHALL se
  manter (o CTA com "Ver N joias" é o que aplica — verificar no código antes de mudar).

---

## Implicit-requirement sweep

| Dimensão | Resolução |
| --- | --- |
| Validação e limites | P1 grupos 3–6; os limites de `core` são os mesmos do `check` do banco, com guarda que os compara |
| Falha / falha parcial | painel: P1 grupos 10 e massa 5; loja: categoria 6 |
| Idempotência / repetição | marcar de novo é no-op (PK composta + `on conflict do nothing`); massa 2 |
| Auth e limites de taxa | leitura pública só de grupo **ativo**, seus valores e as marcações; toda escrita por policy `has_role`; nenhum `grant` de escrita a `anon`. Taxa N/A: não há endpoint novo, é PostgREST com RLS |
| Concorrência / ordem | N/A because o painel tem uma ou duas pessoas; última gravação vence, e reordenar grava a lista inteira de `sort_order` numa chamada |
| Ciclo de vida | cascatas: produto → marcações; valor → marcações; grupo → valores, marcações e "escondido"; categoria → "escondido" |
| Observabilidade | N/A because a URL com o filtro já chega ao GA4 no `page_view`; evento próprio está fora |
| Dependência externa | N/A because não há serviço externo; a falha do catálogo de filtros é tratada como ausência (categoria 6) |
| Integridade de estado | grupo ativo/inativo é o único estado; sem transição guardada |

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| FLT-01..10 | P1: Grupos e valores no painel (AC 1–10) | Pending |
| FLT-11..14 | P1: Marcar no produto (AC 1–4) | Pending |
| FLT-15..20 | P1: Marcar em massa (AC 1–6) | Pending |
| FLT-21..28 | P1: Filtros na categoria (AC 1–8) | Pending |
| FLT-29..34 | P1: Estado na URL (AC 1–6) | Pending |
| FLT-35..38 | P2: Esconder por categoria (AC 1–4) | Pending |
| FLT-39..41 | P2: Filtros na busca (AC 1–3) | Pending |
| FLT-42..43 | P2: Selecionar pela tag (AC 1–2) | Pending |
| FLT-44 | Meta: nenhuma superfície da loja exibe `tags` como filtro | Pending |

**Coverage:** 44 total, 0 mapeados a tasks (o `tasks.md` mapeia).

---

## Success Criteria

- [ ] A Adri cura um valor para 50 produtos em menos de 2 minutos (busca + selecionar + marcar).
- [ ] Em 390×844, o bottom sheet com 4 grupos não rola na horizontal e nenhum chip quebra linha.
- [ ] O link de uma categoria filtrada, colado numa aba anônima, abre com o mesmo resultado.
- [ ] Zero ocorrência de `tags` lida por código de filtro da loja (guarda).
