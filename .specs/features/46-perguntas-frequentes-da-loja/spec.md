# Perguntas frequentes da loja — Specification

> Feature `46`. Desenho no Paper: página **46 · Perguntas frequentes da loja** (quatro artboards —
> loja em 390 e 1440, painel em 1440, e o diálogo de adicionar pergunta).

## Problem Statement

A loja responde as mesmas 26 dúvidas uma a uma pelo WhatsApp, e **nenhuma delas tem endereço**. A
biblioteca da feature `28` (`faqs` + `product_faqs`) só alcança a página de um produto e só carrega o
que a descrição daquele produto trazia — mas quase toda dúvida de quem está decidindo é **anterior à
peça**: o que pode ser eternizado, quanta cinza enviar, se o leite vai amarelar, quanto tempo demora,
quem paga o envio. Hoje essa informação não existe em lugar nenhum que a cliente, o Google ou um
buscador de IA consiga ler.

O custo não é só de atendimento. Numa compra memorial, a dúvida não respondida **não vira pergunta**
— vira desistência silenciosa, e quem desistiu estava no pior dia da vida dela.

## Goals

- [ ] `/perguntas-frequentes` no ar, com busca, legível em 390px, respondendo as 26 perguntas.
- [ ] A Adri publica, edita, agrupa e reordena pergunta **sem deploy**.
- [ ] A página é indexável por rastreador clássico **e** extraível por buscador de IA — o que inclui a
      resposta estar no DOM mesmo com o acordeão fechado.
- [ ] **Um corpus só** de pergunta e resposta no projeto, pronto para o agente de IA ler depois.

## Out of Scope

| Feature | Reason |
| --- | --- |
| O agente de IA (chat, RAG, embeddings, `pgvector`) | Decisão do usuário: *"por enquanto planejar apenas as páginas"*. Esta feature prepara o corpus; não o consome. O caminho fica **documentado** em `FAQL-30`, não construído |
| Mudar o FAQ **do produto** (feature `28`) | A seção da página do produto continua como está. A única coisa que esta feature encosta lá é o teto de caracteres da resposta (`FAQL-26`), que é compartilhado |
| Edge function de prerender para esta rota | A loja é SPA sem SSR (`apps/store/CLAUDE.md`). O JSON-LD entra por JS, como a canônica já entra. Prerender é a resposta se a medição mostrar que não basta — vira item de backlog, não escopo daqui |
| "Esta resposta ajudou?" / telemetria de busca sem resultado | Informação valiosa, superfície nova, e nenhuma delas existe hoje na loja. Feature própria |
| Geração de pergunta por IA no painel | Já é `BL-014`, adiada por decisão do usuário em 2026-08-16. `AD-011` continua valendo |
| Segundo idioma | A loja é pt-BR inteira |

---

## Assumptions & Open Questions

Toda ambiguidade resolvida ou registrada aqui. Nada segue silenciosamente indefinido.

| Assunção / decisão | Padrão escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| Onde o conteúdo mora | **Reusa `faqs`** (a biblioteca da `28`) + tabela de colocação `faq_page_items` | Duas tabelas de Q&A seriam o "defeito 01" nascendo dentro do corpus que o agente de IA vai ler. `question_key` já é `unique`, então a dedup entre as duas superfícies vem de graça | **y** |
| Resposta na página quando a pergunta também está em produtos | A da biblioteca **por padrão**, com `answer_override` opcional por colocação | Molde exato de `product_faqs.answer_override`, que já existe e é usado por 30% dos vínculos. Override idêntico ao padrão grava `null` (`faqOverrideOf`), senão o mesmo texto teria dois donos | **y** |
| As 26 perguntas | **Semeadas pela migration**, aditiva e idempotente | O projeto já pagou três vezes por tela que nasce vazia (menu `39`, frete `37`, banner `41`), e as três viraram dívida escrita no `CLAUDE.md` | **y** |
| Painel | Tela nova `/admin/perguntas-frequentes` no grupo **Loja**; a `/admin/perguntas` atual passa a se chamar **"Biblioteca de perguntas"** | `Loja` é o que a cliente vê, `Catálogo` é o que se cadastra (`apps/backoffice/CLAUDE.md`). Sem o rename, dois itens quase homônimos em grupos diferentes | **y** |
| Slug | `/perguntas-frequentes` | Convenção da loja: kebab-case, português, descritivo (`como-enviar-seu-material-de-dna`, `politica-de-privacidade`). **Não é literal do site em produção** — a página não existe lá, então não há endereço indexado a preservar | n |
| Teto da resposta | 600 → **4000** caracteres | Medido: a resposta de *"Quais materiais são utilizados na fabricação"* tem ~1.400 caracteres e **não cabe** no `check` atual. 4000 cobre a maior com folga sem virar campo sem limite | n |
| Formato do texto da resposta | **Texto puro**, com linha em branco = parágrafo e `- ` no começo da linha = item de lista | Mantém o campo livre de HTML (nenhuma das 3.476 respostas do catálogo tem tag) — logo, sem sanitizador, sem `dangerouslySetInnerHTML`, e é a forma que um LLM ingere limpa. O leitor tem dono único em `@estrelinha/core/faq` | n |
| Estado inicial do acordeão | Tudo fechado | A página existe para ser **varrida**; 26 respostas abertas são um documento, não um índice. A exceção é chegar por âncora (`FAQL-07`) |  n |
| Busca | Filtro **no cliente**, por `faqQuestionKey` | São dezenas de entradas, não milhares, e já é o que `/admin/perguntas` faz. Busca no servidor exigiria índice de texto e um segundo dono da normalização | n |
| Chips (celular) × índice (computador) | **Navegam** (âncora), não filtram | Quem filtra é a busca. Dois filtros na mesma tela dão dois donos de "o que estou vendo agora" | n |
| Âncora de cada pergunta | Derivada do `faqs.id` | Slug por pergunta exigiria coluna única nova + segunda normalização, e mudaria de valor no dia em que a dona corrigisse uma vírgula do título — quebrando link já compartilhado |  n |
| Ordem quando duas admins reordenam junto | Última gravação vence | Mesmo molde do arraste do `/admin/menu`. Trava otimista aqui seria a única do painel |  n |
| Verde do WhatsApp | O CTA **não** usa `--estrelinha-whatsapp` (#25D366) como fundo de texto branco | Medido: branco sobre #25D366 dá ~1,9:1 e reprovaria em `contrast.test.ts`. O token continua sendo a cor da marca (ícone, detalhe); o botão usa um verde escuro que passa 4,5:1 | n |
| Onde o slice mora | `apps/store/src/entities/faq` | Um consumidor só na loja hoje (a página). `packages/core` ganha a **regra pura** (formato do texto, agrupamento, vocabulário de assuntos), porque o painel e o JSON-LD também a leem (`AD-033`) | n |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## Sweep de dimensões implícitas

Large ⇒ toda dimensão resolve em requisito ou em `N/A com motivo`.

| Dimensão | Resolução |
| --- | --- |
| Validação e limites | `FAQL-26` (resposta 4000, pergunta 160 mantido), `FAQL-27` (vocabulário fechado de assunto), `FAQL-18` (pergunta duplicada recusada com motivo) |
| Falha e falha parcial | `FAQL-09` (loja: carregando ≠ vazio ≠ falha), `FAQL-23` (painel: faixa de erro, nunca estado vazio) |
| Idempotência / repetição | `FAQL-28` (semeadura `on conflict do nothing`, sem `update`), `question_key` único já impede a segunda cópia da mesma pergunta |
| Fronteira de auth | `FAQL-25` (RLS: leitura pública do conteúdo ativo, escrita só `has_role('admin')`, nenhum `grant` a `anon`). **Rate limit: N/A** — não há endpoint novo; é leitura do PostgREST de conteúdo que já é público |
| Concorrência / ordenação | Ordem: última gravação vence (registrado acima). Posição é inteiro por assunto, e a loja ordena por ela |
| Ciclo de vida do dado | `FAQL-21` — tirar da página ≠ apagar da biblioteca; apagar entrada em uso segue recusado pelo banco (`on delete restrict`), e o caminho reversível é `is_active = false`. **TTL: N/A** — conteúdo institucional não expira |
| Observabilidade | **N/A** — a loja não tem telemetria de página hoje. Medir "buscou e não achou" seria a primeira, e está declarada fora de escopo acima |
| Falha de dependência externa | **N/A** — a página lê só o Supabase, e essa falha é `FAQL-09`. Nenhum terceiro no caminho |
| Integridade de transição de estado | `FAQL-22` — são **dois eixos** (`faqs.is_active` na biblioteca × presença em `faq_page_items`), e a tela precisa dizer o efeito combinado. Entrada presente na página mas inativa na biblioteca **não aparece** para a cliente e é marcada `FORA DO AR` no painel |

---

## User Stories

### P1-A: A cliente encontra a resposta sozinha ⭐ MVP

**User Story**: Como alguém pensando em eternizar um material que não tem segunda via, quero ler as
dúvidas já respondidas antes de decidir, para não precisar perguntar por WhatsApp o que já tem
resposta.

**Why P1**: É a feature. Sem a página pública, nada mais aqui tem consumidor.

**Acceptance Criteria**:

1. **`FAQL-01`** — WHEN a cliente abre `/perguntas-frequentes` THEN a loja SHALL renderizar a página
   com `<h1>Perguntas frequentes</h1>`, E o slug SHALL existir em `ROUTE_SLUGS`, em
   `SITEMAP_STATIC_PATHS` e como constante `FAQ_PATH` de `@estrelinha/core/routes` — nunca literal
   repetido em JSX.
2. **`FAQL-02`** — WHEN a página carrega THEN as perguntas SHALL sair **agrupadas por assunto**, na
   ordem cadastrada, com um `<h2>` por assunto e o título de cada pergunta como cabeçalho de nível
   abaixo dele.
3. **`FAQL-03`** — WHEN a cliente toca numa pergunta THEN a resposta SHALL abrir e fechar, E a
   resposta SHALL estar presente no DOM **também quando fechada** (escondida por estilo, nunca
   desmontada). Todas nascem fechadas.
4. **`FAQL-04`** — WHEN a cliente digita na busca THEN a lista SHALL filtrar por **pergunta e
   resposta**, sem acento e sem caixa (`faqQuestionKey`, o mesmo normalizador da biblioteca), E o
   cabeçalho SHALL dizer quantas casaram.
5. **`FAQL-05`** — WHEN a busca não casa nada THEN a página SHALL dizer "Nenhuma pergunta com esse
   texto" e oferecer o contato — nunca uma lista vazia sem explicação.
6. **`FAQL-06`** — WHEN a página renderiza em ≥1024px THEN SHALL exibir índice lateral de assuntos
   com a contagem de cada um; WHEN renderiza abaixo disso THEN SHALL exibir a faixa rolável de
   assuntos com a afordância de rolagem (o mesmo `useOverflowAffordance` da `BL-028`). Os dois
   **navegam** até o assunto; nenhum dos dois filtra.
7. **`FAQL-07`** — WHEN a URL traz `#<id da pergunta>` THEN aquela pergunta SHALL abrir e a página
   SHALL rolar até ela; WHEN o fragmento não casa nenhuma pergunta THEN SHALL abrir no topo, sem erro.
8. **`FAQL-08`** — WHEN a cliente chega ao fim da página THEN SHALL encontrar o bloco de contato com
   os canais lidos de `store_settings` — **nenhum número, e-mail ou link de WhatsApp cravado no JSX**
   (mesma regra que `PDP-24` e `POL-09` já fixaram).
9. **`FAQL-09`** — WHEN a leitura está em curso THEN a página SHALL mostrar estado de carregamento;
   WHEN a leitura falha THEN SHALL mostrar faixa de erro com "tentar de novo"; WHEN a leitura
   devolve zero perguntas THEN SHALL mostrar o bloco de contato e dizer que ainda não há perguntas
   publicadas. Os três estados são distintos.
10. **`FAQL-10`** — WHEN qualquer texto desta página é renderizado THEN SHALL estar livre de emoji e
    de urgência fabricada; os `✨` e `❤️` do texto de origem SHALL sair ou virar a estrela desenhada
    (`EstrelinhaStarIcon`), no mesmo desvio declarado de `POL-07`/`SOB-10`.
11. **`FAQL-11`** — WHEN a página renderiza em 390×844 THEN o `body` SHALL ter `scrollWidth` igual à
    viewport (zero rolagem horizontal), E a linha de cada pergunta e cada chip de assunto SHALL ter
    alvo de toque de no mínimo 44px (`TAP_ROW`/`TAP_44`).
12. **`FAQL-12`** — WHEN o rodapé renderiza THEN SHALL trazer o link "Perguntas frequentes" na coluna
    **Ajuda**, apontando para `FAQ_PATH`.

**Independent Test**: abrir `/perguntas-frequentes` com o banco semeado, buscar "cinzas", ver a
contagem cair e a resposta certa aparecer; abrir `#<id>` de uma pergunta e cair nela aberta.

---

### P1-B: A página é legível por buscador clássico e por buscador de IA ⭐ MVP

**User Story**: Como dona da loja, quero que quem perguntar "joia com cinzas de cremação amarela?" no
Google ou num assistente de IA encontre a **minha** resposta, para a loja ser achada por quem está
procurando exatamente isso.

**Why P1**: Metade do pedido. E é a metade que, se ficar para depois, exige refazer a marcação.

**Acceptance Criteria**:

1. **`FAQL-13`** — WHEN a página monta THEN SHALL injetar no `<head>` um `<script
   type="application/ld+json">` com um `FAQPage` contendo **todas** as perguntas publicadas e ativas
   (`Question` + `acceptedAnswer`), E SHALL removê-lo no unmount — a loja é SPA e o `<head>`
   sobrevive à navegação; tag deixada para trás declara o conteúdo errado (mesma razão do
   `useCanonical`).
2. **`FAQL-14`** — O texto de cada `acceptedAnswer` SHALL ser **exatamente** o texto que a cliente lê
   na tela, medido por teste de paridade entre a serialização do JSON-LD e o texto renderizado.
   Divergência aqui é a loja dizer uma coisa ao Google e outra a quem chega. *(Molde de
   `shoppingParity.test.ts`.)*
3. **`FAQL-15`** — WHEN a página monta THEN SHALL declarar `<link rel="canonical">` para `FAQ_PATH`,
   `<title>` próprio e `<meta name="description">`, e SHALL desfazer os três no unmount. O dono
   dessas tags é **um**, e não pode ser a página (senão a próxima repete a lógica).
4. **`FAQL-16`** — WHEN `sitemapRoutes.test.ts` roda THEN a rota nova SHALL estar classificada em
   `SITEMAP_STATIC_PATHS` (é conteúdo público e estável), E a bidirecionalidade do guarda SHALL
   continuar passando.
5. **`FAQL-17`** — WHEN a resposta contém quebra de parágrafo THEN o JSON-LD SHALL entregá-la como
   texto contínuo legível (sem tag, sem marcador `- ` cru virando ruído) — o que o rastreador recebe
   é prosa, não a nossa notação.

**Independent Test**: abrir a página em navegador, extrair o `application/ld+json` e validá-lo no
Rich Results Test; navegar para outra rota e conferir que a tag saiu do `<head>`.

---

### P1-C: A Adri publica e ordena sem deploy ⭐ MVP

**User Story**: Como dona, quero cadastrar, agrupar e reordenar as perguntas da minha loja sozinha,
para a página acompanhar o que as clientes estão perguntando de verdade.

**Why P1**: Sem isto, a página é um arquivo estático com cara de dinâmico — e a primeira dúvida nova
vira um commit.

**Acceptance Criteria**:

1. **`FAQL-18`** — WHEN a Adri clica em "Adicionar pergunta" THEN a tela SHALL oferecer **dois
   caminhos**: escolher da biblioteca (com busca, mostrando em quantos produtos cada uma já está) ou
   escrever uma nova. WHEN a nova repete uma `question_key` existente THEN SHALL ser recusada **com
   motivo**, nomeando a entrada que já existe.
2. **`FAQL-19`** — WHEN a Adri escolhe entradas da biblioteca THEN SHALL escolher o assunto delas na
   mesma ação, E as entradas SHALL entrar no fim daquele assunto.
3. **`FAQL-20`** — WHEN a Adri arrasta uma linha THEN a ordem SHALL ser gravada e SHALL ser a ordem
   que a loja renderiza. Arrastar entre assuntos muda o assunto da entrada.
4. **`FAQL-21`** — WHEN a Adri remove uma pergunta **da página** THEN a entrada SHALL sair de
   `faq_page_items` e **permanecer na biblioteca** (e nos produtos que a usam). A tela SHALL dizer
   isso antes de remover.
5. **`FAQL-22`** — WHEN uma entrada da página está com `is_active = false` na biblioteca THEN a linha
   SHALL ser marcada como fora do ar e SHALL explicar que ela não aparece nem na página nem em
   produto nenhum.
6. **`FAQL-23`** — WHEN a leitura falha THEN a tela SHALL mostrar faixa de erro com "tentar de novo";
   WHEN a página não tem nenhuma pergunta THEN SHALL mostrar estado vazio que explica o que fazer.
   Vazio e ilegível não são o mesmo estado (`AD-014`).
7. **`FAQL-24`** — WHEN a Adri edita a resposta de uma entrada que está em N produtos THEN a tela
   SHALL dizer, **antes de salvar**, quantos lugares aquela edição alcança; E WHEN ela escreve um
   texto só para a página que é idêntico ao padrão THEN o sistema SHALL gravar `null` (`faqOverrideOf`),
   nunca a cópia.
8. **`FAQL-25`** — WHEN a sidebar renderiza THEN "Página de perguntas" SHALL aparecer no grupo
   **Loja** e o item existente SHALL se chamar **"Biblioteca de perguntas"** no grupo Catálogo, E a
   ordem das rotas em `App.tsx` SHALL acompanhar `navGroups` (`navItems.test.ts` lê o arquivo do
   disco).

**Independent Test**: adicionar uma pergunta da biblioteca, arrastá-la para o topo do assunto, abrir
a loja e ver a mesma ordem; remover da página e conferir que o produto que a usa continua mostrando.

---

### P1-D: A base que sustenta as duas telas ⭐ MVP

**User Story**: Como projeto, quero que a página e o painel leiam **uma** origem de verdade, para não
nascer com a loja respondendo duas coisas para a mesma dúvida.

**Why P1**: É a decisão que não dá para trocar depois sem migrar dado.

**Acceptance Criteria**:

1. **`FAQL-26`** — WHEN a migration é aplicada THEN o `check` de `faqs.answer` SHALL aceitar até
   **4000** caracteres (era 600), E `FAQ_ANSWER_MAX` SHALL acompanhar, E `faqSchema.test.ts` — que lê
   o `.sql` do disco e compara os números — SHALL continuar guardando os dois lados. A alteração vem
   em **migration nova**: a da `28` já foi aplicada e é imutável (`AD-017`).
2. **`FAQL-27`** — WHEN a migration é aplicada THEN SHALL existir `faq_page_items` com `faq_id`
   (PK, → `faqs(id)` **`on delete restrict`**), `category`, `position`, `answer_override` (nullable) e
   `created_at`; E `category` SHALL ter `check` contra um vocabulário fechado, espelhado em
   `FAQ_PAGE_CATEGORIES` (`@estrelinha/core/faq`), com teste que lê a migration do disco e compara os
   dois lados — item a item.
3. **`FAQL-28`** — WHEN a semeadura roda THEN SHALL inserir as 26 perguntas de forma **aditiva e
   idempotente** (`on conflict (question_key) do nothing`), sem um `update` sequer sobre linha
   existente; rodar duas vezes SHALL não apagar edição da dona.
4. **`FAQL-29`** — WHEN a RLS é avaliada THEN `faqs` SHALL continuar como está, `faq_page_items`
   SHALL ser **lida publicamente sem condição** — de propósito, pelo mesmo motivo declarado de
   `product_faqs`: assim o vínculo a uma entrada inativa chega ao navegador com `faq: null` e o ramo
   de "pular" roda em produção — E toda escrita SHALL passar por `has_role(auth.uid(), 'admin')` no
   `using` **e** no `with check`, com nenhum `grant` alcançando `anon`.
5. **`FAQL-30`** — A resposta SHALL permanecer **texto puro**; o leitor que transforma linha em branco
   em parágrafo e `- ` em item de lista SHALL ter dono único em `@estrelinha/core/faq`, consumido
   pela página **e** pelo JSON-LD. Nenhum `dangerouslySetInnerHTML` nesta feature.
6. **`FAQL-31`** — WHEN a gravação do painel é exercitada THEN SHALL ser provada por **probe HTTP
   contra o banco local**, não por inspeção de tipo (`AD-012`: `DbCategory` declarava três colunas que
   o banco não tinha e toda gravação falhava com `PGRST204`, com a suíte verde).

**Independent Test**: `supabase db push` num banco com catálogo, rodar a semeadura duas vezes e
conferir por SQL que a contagem não mudou e nenhuma resposta foi sobrescrita.

---

### P2: Um corpus só, e pronto para o agente de IA

**User Story**: Como projeto, quero que o agente de IA que vier depois tenha **um** lugar para ler, e
que esse lugar já esteja no formato que ele precisa.

**Why P2**: Não bloqueia o lançamento da página, mas decide se o agente vai ser um `select` ou uma
migração de dados.

**Acceptance Criteria**:

1. **`FAQL-32`** — WHEN alguém declara uma segunda tabela ou constante de pergunta/resposta fora de
   `faqs` THEN um guarda SHALL reprovar, com **âncora dupla** (arquivos lidos **e** ocorrências
   encontradas) e sensor de mutação. A régua procura **declaração**, nunca menção.
2. **`FAQL-33`** — WHEN um arquivo fora de `entities/faq` (loja) ou do slice equivalente do painel
   abre `from('faq_page_items')` THEN o guarda SHALL reprovar — a colocação tem **um** leitor por app.
   Escopo da varredura SHALL incluir `apps/**` **e** `supabase/functions/**` (`L-035`: guarda com
   alcance menor que a regra é allowlist com outro nome).
3. **`FAQL-34`** — O caminho de embeddings SHALL ficar **documentado e não construído**: tabela futura
   chaveada por `faq_id`, sem copiar o texto da resposta — o dono do texto continua sendo
   `faqs.answer`, e um vetor desatualizado é um índice ruim, nunca uma resposta errada.

**Independent Test**: injetar um `from('faq_page_items')` num arquivo de `widgets/` e ver a suíte
reprovar; remover e ver passar.

---

### P3: Detalhes que a página pede depois de existir

1. **`FAQL-35`** — WHEN a página renderiza no computador THEN cada pergunta SHALL oferecer, no hover,
   um jeito de copiar o link direto dela.
2. **`FAQL-36`** — WHEN o cabeçalho renderiza THEN SHALL dizer quantas perguntas e quantos assuntos
   existem, derivado do dado — nunca número escrito à mão.

---

## Edge Cases

- WHEN uma entrada está na página mas `is_active = false` THEN a loja SHALL **pular** a vaga (sem
  buraco, sem placeholder) e o painel SHALL marcar `FORA DO AR`.
- WHEN um assunto fica sem nenhuma pergunta ativa THEN o assunto SHALL sumir do índice e da faixa —
  cabeçalho de seção vazia é pior que seção ausente.
- WHEN a resposta tem 4000 caracteres THEN a página SHALL renderizá-la inteira, sem truncar; WHEN tem
  4001 THEN o banco SHALL recusar a gravação e o painel SHALL dizer o limite antes de tentar.
- WHEN a cliente busca um termo que só aparece na **resposta** (ex.: "motoboy") THEN a pergunta SHALL
  aparecer no resultado, ainda fechada.
- WHEN a busca casa perguntas de assuntos diferentes THEN os cabeçalhos de assunto SHALL continuar
  visíveis, agrupando o resultado — a cliente precisa saber de onde veio cada resposta.
- WHEN a página é aberta com JavaScript desligado THEN SHALL entregar o shell da SPA (limitação
  conhecida e declarada, não regressão) — é o mesmo comportamento de toda rota da loja hoje.
- WHEN duas admins reordenam o mesmo assunto ao mesmo tempo THEN a última gravação vence, sem erro.

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| `FAQL-01`..`FAQL-12` | P1-A: página pública | Design | Pending |
| `FAQL-13`..`FAQL-17` | P1-B: SEO clássico e de IA | Design | Pending |
| `FAQL-18`..`FAQL-25` | P1-C: painel | Design | Pending |
| `FAQL-26`..`FAQL-31` | P1-D: base | Design | Pending |
| `FAQL-32`..`FAQL-34` | P2: corpus único | Design | Pending |
| `FAQL-35`..`FAQL-36` | P3: detalhes | — | Pending |

**Coverage:** 36 requisitos, 0 mapeados para tasks ⚠️ (a fase de Tasks ainda não rodou).

---

## Success Criteria

- [ ] `/perguntas-frequentes` responde 200 com as 26 perguntas, medido em navegador real a 390×844 e
      1440 — e não por teste de componente, que em jsdom mede 0 para todo layout.
- [ ] O `application/ld+json` da página valida como `FAQPage` no Rich Results Test, com 26 entradas.
- [ ] A Adri adiciona uma pergunta nova, arrasta, e a loja mostra a mudança **sem deploy**.
- [ ] Editar uma resposta da biblioteca alcança a página **e** os produtos que a usam — provado por
      leitura das duas telas, não por inspeção de código.
- [ ] Rodar a semeadura duas vezes não altera uma linha sequer.
- [ ] Gate do repositório sem regressão: lint 27/6, tipos 0·0·0, e a suíte medida por workspace com
      exit code capturado fora de pipe.
