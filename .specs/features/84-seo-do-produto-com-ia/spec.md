# 84 — SEO do produto: nunca bloqueia, cai no nome e na descrição, e pode ser sugerido por IA

> **Escopo: Large.** Toca o formulário do produto no painel (`apps/backoffice`), uma regra em
> `packages/core/src/seo`, e cria a **primeira integração com um modelo de linguagem** do projeto: uma
> edge function nova que chama a Claude API com **Claude Haiku 5.5** (`claude-haiku-5-5`).
> Responde as seis perguntas que a `BL-001` deixou abertas (ver *Decisões que esta spec toma*), e
> **revoga em parte o `AD-011`** — só o botão "Gerar com IA" da aba SEO; "Sugerir com IA" da descrição
> (aba Geral) e a `BL-014` continuam adiados.

## Problem Statement

Hoje o cadastro do produto **trava a publicação por SEO vazio**: o item `seo` do checklist
"Pronto para publicar" (`features/product-form/model/checklist.ts`) exige título **e** descrição de SEO
preenchidos, e `canPublish` recusa *Salvar e publicar* enquanto ele estiver pendente. Isso obriga a Adri
a escrever dois textos de marketing para cada peça antes de colocá-la na loja — e o bloqueio nem protege
nada: **a loja já sabe se virar sem eles**. `productPageMeta` (`@estrelinha/core/seo`) serve
`seo_title || nome` como título e `seo_description || descrição do produto resumida em 160` como
descrição, com a marca acrescentada por `brandedTitle`. A tela do painel não mostra isso: com os campos
vazios, a prévia do Google exibe "Título do produto" e "Descrição do produto para mecanismos de
busca...", textos que nunca vão ao ar.

Quando ela **quer** um SEO curado, não há ajuda: escrever 60 + 160 caracteres no registro da loja
(memorial, sem urgência, sem festa) para 700 peças é trabalho que se repete. Os produtos relacionados
que ela mesma escolheu já têm SEO curado (686 de 702 têm `seo_title`, medido na `62`) — é o melhor
exemplo de tom que existe, e hoje ninguém o aproveita.

## Goals

- [ ] **Zero** salvamentos ou publicações recusados por causa de SEO vazio — rascunho e publicação.
- [ ] Com os campos vazios, o painel mostra **exatamente** o título e a descrição que a loja vai servir
      (mesma função, `productPageMeta`), não um texto de exemplo.
- [ ] Um toque em "Sugerir com IA" preenche título e descrição de SEO em **até 15 s** (p95), dentro dos
      limites (título ≤ 43 sem a marca, descrição 140–160), no tom da loja, para revisão antes de salvar.
- [ ] A chave da Claude API **nunca** chega ao navegador, e só uma conta com papel admin consegue
      disparar uma geração.

## Out of Scope

| Item | Por quê |
| --- | --- |
| **Gravar no banco o SEO derivado** (copiar o nome para `seo_title` ao salvar) | Seria um **segundo dono** do título (`defeito 01`): o derivado já tem dono em `productPageMeta`, e uma cópia gravada envelhece calada quando o nome ou a descrição mudam. Ver A1. |
| "Sugerir com IA" da **descrição do produto** (aba Geral) | Continua na `BL-001`. Texto longo, sobre peça feita com material de alguém que morreu, pede revisão de produto que esta feature não fez. |
| Perguntas frequentes por IA (`BL-014`) | Continua adiada. A function desta feature fica pronta para ser reaproveitada (A9), mas a decisão "biblioteca × resposta própria" não é dela. |
| Geração **em massa** (preencher SEO dos 702 produtos de uma vez, ou pela edição em massa) | Custo, revisão humana impraticável e risco de tom em escala. Uma peça por vez, com a Adri lendo. |
| SEO por **variação** (título de opção, `68`) | Derivado por regra em `core/seo/variant.ts`; não há campo curado para sugerir. |
| SEO de **categoria** | Não há coluna curada (`Out of Scope` da `36`). |
| Imagem do produto como entrada do modelo | Aumenta custo e latência; o nome e a descrição já carregam o que o buscador lê. Candidata a evolução. |
| Avaliar qualidade por eval automatizado (LLM-juiz) | Fica para quando houver volume de uso; o gate desta feature é determinístico (A7). |

---

## Decisões que esta spec toma (as seis perguntas da `BL-001`)

| Pergunta da `BL-001` | Resposta |
| --- | --- |
| 1. Provedor e modelo | **Claude API**, modelo **`claude-haiku-5-5`** (pedido do usuário). Copy curta: Haiku basta, a US$ 0,10 / 0,50 por milhão de tokens. Thinking adaptativo (padrão do modelo) com `output_config.effort: "medium"` **escrito explicitamente** (pedido do usuário, 2026-10-27) — é o padrão do Haiku 5.5, e escrevê-lo impede que uma mudança de padrão do modelo troque o comportamento em silêncio. |
| 2. Onde roda | **Edge function nova `seo-suggest`** (Supabase, Deno), no molde do `AD-004`: `index.ts` só fiação, regra em `handlers.ts` com o client da Anthropic e o do Supabase **injetados**, testada sob vitest. A chave fica em secret do Supabase (`ANTHROPIC_API_KEY`), nunca no bundle. Chamada via **SDK oficial** (`@anthropic-ai/sdk`), nunca `fetch` cru nem shim compatível com OpenAI. |
| 3. Custo e teto | Teto de **30 gerações por conta a cada 10 min** (limitador de `_shared/rateLimit.ts`, já com dono). Uma geração ≈ 3k tokens de entrada + 0,5k de saída ≈ US$ 0,0006. |
| 4. Latência | Disparada por botão, **fora** do caminho do save. `await` limitado a **15 s** por `AbortController`/`timeout` do SDK, `maxRetries: 1` (`AD-008`). |
| 5. Fallback quando a API cai | Os campos **continuam editáveis à mão**, o salvar continua liberado, e a tela diz que a sugestão não veio. O derivado (nome + descrição) segue valendo na loja. |
| 6. Rascunho ou definitivo | **Rascunho**: a sugestão entra nos campos do formulário, sem gravar. Só *Salvar* grava, como qualquer edição. |

---

## Assumptions & Open Questions

| Assunção / decisão | Padrão escolhido | Motivo | Confirmado? |
| --- | --- | --- | --- |
| A1 — "Pegar o título do produto como Title SEO" | **Não gravar** a cópia: campos vazios gravam `null` (como hoje) e a loja deriva na hora por `productPageMeta`. O painel **mostra** o derivado (prévia e `placeholder`). | Mesmo resultado para o Google, sem segundo dono. Gravar faria o SEO ficar com o nome antigo depois de um renome. | **n — confirmar** |
| A2 — Teto do título sugerido | **≤ 43 caracteres sem a marca**, para que `brandedTitle` (que acrescenta ` \| Uma Estrelinha`, 17) sirva ≤ 60. A sugestão **não** traz a marca. | O buscador corta perto de 60; a marca é sempre acrescentada pela loja. | n — confirmar |
| A3 — Faixa da descrição sugerida | **140 a 160** caracteres (o prompt pede 150–160), sem cortar palavra. | Regra de SEO da loja (skill `seo-uma-estrelinha`: Description SEO 150–160, palavra-chave + benefício emocional + chamada sem urgência, "Envio para todo o Brasil"); a folga de 10 evita retentativa por um caractere. Revisto em 2026-10-27, era 70–160. | y |
| A4 — Campos já preenchidos | A sugestão **substitui** o que estiver nos dois campos, e um **"Desfazer"** devolve o texto anterior até a próxima edição ou o próximo save. | Um toque resolve; o risco de perder texto curado é coberto pelo desfazer. | n |
| A5 — De onde vêm os exemplos ("produtos relacionados") | 1º os **Produtos relacionados** do formulário (`related_product_ids`, mesmo os ainda não salvos) que tenham `seo_title` curado; se sobrarem menos de 3, completa com produtos **ativos da mesma categoria** com `seo_title` curado, mais recentes primeiro. **Até 5** exemplos. Sem nenhum, gera sem exemplos. | É o tom que a própria Adri já escreveu. 5 basta para tom e mantém o custo baixo. | n |
| A6 — O que vai para a Anthropic | Só dado **público do catálogo**: nome, descrição (texto, sem HTML e sem o bloco de FAQ), nomes das categorias, `requires_material`, e nome + SEO dos exemplos. **Nunca** custo, fornecedor (`AD-064`), estoque ou dado de cliente. | Mínimo necessário; tudo isso já é público na loja. | n |
| A7 — Gate de qualidade | **Determinístico, no servidor** (`core`): comprimentos, sem emoji, sem `!`, sem vocabulário de urgência ("últimas unidades", "corra", "só hoje", "promoção imperdível"…), título diferente de todos os exemplos. Falhou ⇒ **uma** nova tentativa; falhou de novo ⇒ erro legível, nada preenchido. | A régua do registro memorial (`CLAUDE.md`) não pode depender de o modelo obedecer. | n |
| A8 — Recusa do modelo (`stop_reason: "refusal"`) | Tratada como falha legível ("A IA não quis sugerir para esta peça."); **sem** fallback de modelo — o Haiku 5.5 não tem fallback do lado do servidor, e trocar de modelo foi decisão do usuário. | Pedido explícito pelo Haiku 5.5. | n |
| A9 — Reuso | O client e a montagem da chamada ficam em `supabase/functions/_shared/claude.ts` (um dono), para a `BL-001`/`BL-014` não abrirem uma segunda integração. | `defeito 01` aplicado à infraestrutura. | n |
| A10 — Saída estruturada | `output_config.format` com JSON Schema `{ title, description }`; sem prefill (removido nos modelos atuais). | Elimina parsing de texto livre. | n |
| A11 — Idioma | Português do Brasil, sempre. | A loja só fala pt-BR. | y |
| A12 — O material afetivo **pode e deve** ser nomeado | A sugestão nomeia o material ("leite materno", "cinzas de cremação") como palavra-chave; a régua **não** o recusa. | Decisão do usuário, 2026-10-27: medido no banco, 430 de 463 peças com material o nomeiam no nome e 432 de 460 com SEO curado o nomeiam no SEO — é o termo buscado. A proibição vinha da página do produto (`BL-015`), que é outra pergunta. | y |
| A13 — Título diferente do nome | O Title SEO sugerido não pode ser igual ao nome do produto (sem caixa e sem acento). Palavra-chave do material no início quando houver. | Regra de SEO da loja ("nunca repetir a mesma frase do título do produto palavra por palavra"). | y |

**Open questions:** nenhuma sem padrão — A1 e A2 mudam comportamento visível e pedem confirmação antes do Design.

---

## User Stories

### P1: Salvar e publicar sem SEO preenchido ⭐ MVP

**User Story**: Como Adri, quero salvar e publicar uma peça sem escrever o SEO, para que a loja use o
nome e a descrição dela até eu ter tempo de curar.

**Why P1**: É o bloqueio que motivou o pedido; sem ele nada mais importa.

**Acceptance Criteria**:

1. WHEN o título e a descrição de SEO estão vazios (ou só com espaços) e a Adri toca *Salvar e publicar*
   THEN o painel SHALL gravar o produto com `is_active = true` e `seo_title = null`,
   `seo_description = null`, sem toast de erro e sem levar o foco à aba SEO. (`SIA-01`)
2. WHEN o mesmo vale para *Salvar rascunho* THEN o painel SHALL gravar igual, com `is_active = false`. (`SIA-02`)
3. WHEN o checklist "Pronto para publicar" é montado THEN o item de SEO SHALL **não** contar para
   `canPublish` nem para `pendingCount`, e SHALL exibir "SEO automático (nome e descrição)" quando os dois
   campos estão vazios, "SEO curado" quando os dois estão preenchidos e "SEO parcial — o resto vem do
   nome e da descrição" quando só um está. (`SIA-03`)
4. WHEN só um dos dois campos está preenchido THEN o painel SHALL gravar o preenchido e `null` no outro,
   e a loja SHALL servir o curado junto do derivado (comportamento atual de `productPageMeta`, que esta
   feature não muda). (`SIA-04`)

**Independent Test**: criar um produto com nome, categoria, imagem, peso e preço, sem SEO, tocar
*Salvar e publicar*, e ver o produto ativo em `/produtos/:slug` com `<title>` = `{nome} | Uma Estrelinha`.

---

### P1: A prévia mostra o que a loja vai servir ⭐ MVP

**User Story**: Como Adri, quero ver na aba SEO o título e a descrição que vão aparecer no Google, mesmo
quando não escrevi nada, para saber se preciso curar.

**Why P1**: Sem isso, "não bloquear" vira "publicar às cegas".

**Acceptance Criteria**:

1. WHEN a aba SEO é aberta THEN a prévia do Google SHALL exibir `productPageMeta({ name, description,
   seo_title, seo_description }).title` e `.description`, calculados a partir do **estado atual do
   formulário** (inclusive edição não salva do nome e da descrição) — nunca os textos fixos "Título do
   produto" / "Descrição do produto para mecanismos de busca...". (`SIA-05`)
2. WHEN o campo de título está vazio THEN o `placeholder` dele SHALL ser o nome do produto (sem a marca);
   WHEN o de descrição está vazio THEN o `placeholder` SHALL ser `descriptionFromHtml(descrição)`. (`SIA-06`)
3. WHEN o nome e a descrição do produto também estão vazios THEN a prévia SHALL mostrar o piso da loja
   (`STORE_BRAND` e a descrição da loja/`STORE_DESCRIPTION_FLOOR`), que é o que `productPageMeta`
   devolve. (`SIA-07`)
4. WHEN a prévia exibe um texto derivado THEN ela SHALL marcá-lo com o rótulo "automático" ao lado do
   título e/ou da descrição; curado não leva rótulo. (`SIA-08`)
5. O contador do título SHALL mostrar o tamanho **servido** (com a marca, se `brandedTitle` a
   acrescentar) além do digitado: "38/60 · 55 com a marca". (`SIA-09`)

**Independent Test**: abrir um produto sem SEO, mudar o nome sem salvar, e ver a prévia mudar junto.

---

### P1: Sugerir título e descrição com IA ⭐ MVP

**User Story**: Como Adri, quero tocar "Sugerir com IA" na aba SEO e receber título e descrição no tom da
loja, baseados nas peças relacionadas, para curar SEO em segundos em vez de minutos.

**Why P1**: É a outra metade do pedido.

**Acceptance Criteria**:

1. WHEN a Adri toca "Sugerir com IA" com o nome do produto preenchido THEN o painel SHALL chamar a edge
   function `seo-suggest` com o nome, a descrição, os ids de categoria e os ids de produtos relacionados
   **do estado atual do formulário** (o produto pode não estar salvo), mostrar o botão em estado de
   carregamento ("Sugerindo…", desabilitado) e, ao receber `200`, preencher os dois campos com a
   sugestão **sem gravar**. (`SIA-10`)
2. WHEN o nome do produto está vazio THEN o botão SHALL estar desabilitado, com a dica "Preencha o nome
   do produto primeiro." (`SIA-11`)
3. WHEN a sugestão preenche campos que já tinham texto THEN o painel SHALL oferecer "Desfazer", que
   devolve exatamente os dois textos que estavam nos campos **antes da primeira sugestão da série** —
   sugestões seguidas não substituem esse ponto de volta (decisão do usuário, 2026-10-27, achado do QA:
   na letra anterior a 2ª sugestão apagava o texto escrito à mão). A série termina, e o "Desfazer" some,
   na próxima edição manual de qualquer um dos dois campos ou no save. (`SIA-12`)
4. WHEN a function recebe a chamada THEN ela SHALL montar até **5 exemplos** pela régua de A5, e o
   pedido à Anthropic SHALL usar `model: "claude-haiku-5-5"`, `output_config.effort: "medium"`,
   `output_config.format` com o schema `{ title: string, description: string }` (A10), e um `system` que
   carregue as regras de tom do `CLAUDE.md` (registro memorial, sem emoji, sem exclamação, sem urgência,
   sem trocadilho, pt-BR), os tetos de A2/A3 e a instrução de não copiar os exemplos. (`SIA-13`)
5. WHEN a resposta do modelo chega THEN a function SHALL validá-la pela régua de A7 (função pura em
   `packages/core/src/seo/suggestion.ts`, alcançável pelo Deno com `.ts` explícito) e, se reprovada,
   tentar **uma** vez mais; reprovada de novo ⇒ `422 { reason: 'off_rules' }`. (`SIA-14`)
6. WHEN a sugestão é válida THEN a function SHALL responder `200 { title, description, examples: n }`,
   com o título **sem** a marca e aparado, e a descrição aparada. (`SIA-15`)
7. WHEN a sugestão entra nos campos THEN a prévia (`SIA-05`) SHALL refletir o texto novo na hora. (`SIA-16`)

**Independent Test**: num produto com 3 relacionados curados, tocar "Sugerir com IA", ver os campos
preenchidos em menos de 15 s, conferir os tetos, tocar "Desfazer" e ver os textos antigos voltarem.

---

### P1: A chave e o acesso protegidos ⭐ MVP

**User Story**: Como dona da loja, quero que só quem administra o painel consiga gastar a chave da IA, e
que a chave nunca vaze.

**Why P1**: Uma chave no bundle ou uma function aberta é custo e abuso sem teto.

**Acceptance Criteria**:

1. WHEN a function é chamada sem JWT, com JWT de conta sem papel admin, ou quando `has_role` falha THEN
   ela SHALL responder 401 / 403 / 403 por `requireAdmin` (`_shared/auth.ts`), **sem** chamar a
   Anthropic. (`SIA-17`)
2. WHEN uma conta passa de 30 chamadas em 10 min THEN a function SHALL responder `429` sem chamar a
   Anthropic, e o painel SHALL dizer "Muitas sugestões seguidas. Tente de novo em alguns minutos." (`SIA-18`)
3. A string `ANTHROPIC_API_KEY` e o pacote `@anthropic-ai/sdk` SHALL aparecer só em
   `supabase/functions/**` — nenhum arquivo de `apps/**` ou `packages/**` os cita (guarda no molde de
   `chaveDeServidorForaDoNavegador.test.ts`). (`SIA-19`)
4. WHEN `ANTHROPIC_API_KEY` não está configurada THEN a function SHALL responder `503 { reason:
   'not_configured' }`, e o painel SHALL desabilitar o botão até recarregar a página, com a dica
   "Sugestão por IA não está configurada." — sem esconder o botão. (`SIA-20`)
5. A function SHALL enviar à Anthropic **somente** os campos de A6; nenhum `select` dela SHALL pedir
   `cost_price`, `supplier*`, `stock*` ou tabela de cliente. (`SIA-21`)

---

### P2: Falhas legíveis, nunca bloqueantes

**User Story**: Como Adri, quando a IA não responde, quero saber e continuar meu trabalho.

**Acceptance Criteria**:

1. WHEN a Anthropic demora mais de 15 s, responde 5xx/529 depois da retentativa do SDK, ou a rede cai
   THEN a function SHALL responder `502 { reason: 'upstream' }` e o painel SHALL dizer "A sugestão não
   veio desta vez. Os campos continuam editáveis." — campos intocados, salvar liberado. (`SIA-22`)
2. WHEN o modelo recusa (`stop_reason: "refusal"`) ou termina por `max_tokens` THEN a function SHALL
   responder `422 { reason: 'refusal' | 'truncated' }`, sem nova tentativa no caso de recusa, e o painel
   SHALL dizer a frase correspondente. (`SIA-23`)
3. WHEN a Adri toca "Sugerir com IA" de novo com uma sugestão em voo THEN o toque SHALL ser ignorado
   (botão desabilitado); WHEN ela troca de aba ou sai da página com a chamada em voo THEN a resposta
   que chegar depois SHALL ser descartada sem tocar nos campos. (`SIA-24`)
4. WHEN a Adri edita um dos campos de SEO enquanto a sugestão está em voo THEN a resposta SHALL ser
   descartada e o painel SHALL dizer "Você editou o SEO enquanto a sugestão chegava; mantive o seu
   texto." (`SIA-25`)

---

### P3: Observabilidade e custo

**Acceptance Criteria**:

1. Cada chamada SHALL registrar no log da function: conta (id), resultado (`ok`/`off_rules`/`refusal`/
   `truncated`/`upstream`/`limited`), número de exemplos, tentativas, `usage.input_tokens`,
   `usage.output_tokens` e duração — **nunca** o texto do produto nem a chave. (`SIA-26`)

---

## Edge Cases

- WHEN a descrição do produto é só o bloco de perguntas frequentes THEN a entrada ao modelo SHALL ser a
  descrição vazia (via `stripFaqBlock`), e a geração segue só com o nome e as categorias.
- WHEN a descrição tem mais de 4.000 caracteres de texto THEN a function SHALL enviar só os primeiros
  4.000, cortados em limite de palavra (custo e latência), declarado no log.
- WHEN um id relacionado não existe ou é do próprio produto THEN ele SHALL ser ignorado, sem erro.
- WHEN o corpo traz mais de 20 ids relacionados ou 10 de categoria, ou o nome passa de 200 caracteres
  THEN a function SHALL responder `400` sem chamar a Anthropic.
- WHEN o modelo devolve o título com a marca ("… | Uma Estrelinha" ou "| UE") THEN a régua de A7 SHALL
  removê-la antes de medir (é a loja quem a põe), e não reprovar por isso.
- WHEN o título sugerido é igual (sem caixa e sem acento) ao `seo_title` de um exemplo THEN a régua SHALL
  reprovar.
- WHEN a peça tem `requires_material = true` THEN o prompt SHALL dizer ao modelo que a joia é feita com
  material enviado pela cliente, e a sugestão PODE nomear o material (A12) — a régua não o recusa.
- WHEN o título sugerido é igual ao nome do produto (sem caixa e sem acento) THEN a régua SHALL reprovar (A13).

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| SIA-01..04 | P1: Salvar sem SEO | Design | Pending |
| SIA-05..09 | P1: Prévia servida | Design | Pending |
| SIA-10..16 | P1: Sugerir com IA | Design | Pending |
| SIA-17..21 | P1: Chave e acesso | Design | Pending |
| SIA-22..25 | P2: Falhas legíveis | Design | Pending |
| SIA-26 | P3: Observabilidade | Design | Pending |

**Coverage:** 26 total, 0 mapeados para tasks (Design ainda não feito).

## Dimensões implícitas (varredura)

| Dimensão | Onde está |
| --- | --- |
| Validação e limites de entrada | Edge cases (400), A2, A3, A7 |
| Falha / falha parcial | SIA-22, SIA-23; nada é gravado pela function, então não há save parcial |
| Idempotência / retentativa | SIA-14 (uma retentativa por régua), `maxRetries: 1` no SDK; a function não escreve, então repetir é seguro |
| Auth e limite de taxa | SIA-17, SIA-18 |
| Concorrência / ordem | SIA-24, SIA-25 |
| Ciclo de vida do dado | N/A — a function não persiste nada; a sugestão vive no estado do formulário |
| Observabilidade | SIA-26 |
| Dependência externa | SIA-20, SIA-22, SIA-23 |
| Transição de estado | SIA-01..03 (rascunho × publicado não muda de regra; só o checklist deixa de travar) |

## Success Criteria

- [ ] Nenhum guarda existente reprovando (os que leem o checklist e o formulário incluídos) e a suíte do
      backoffice, da loja, de `core` e de functions sem regressão contra a baseline do `CLAUDE.md`.
- [ ] Prova em navegador em **390×844** e **1440**: publicar sem SEO; prévia derivada; sugerir, desfazer,
      falha da API (interceptada) e limite (interceptado), sem rolagem horizontal.
- [ ] Probe contra a Anthropic real, com chave de dev, em 5 produtos do catálogo local: 5 sugestões dentro
      da régua de A7 e p95 ≤ 15 s, com `usage` registrado.
- [ ] Ordem de publicação escrita: **secret → function → bundle** (sem a function, o botão mostra 404 como
      falha legível; sem o secret, `SIA-20`). ⚠️ `ANTHROPIC_API_KEY` gravado de um diretório **sem `.env`**,
      conferindo `{"count":1}` (`BL-044`).
