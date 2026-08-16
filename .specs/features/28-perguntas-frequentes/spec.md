# Perguntas Frequentes — biblioteca, vínculo por produto e sugestão por categoria

**Feature 28** · escopo **Large** · loja (`apps/store`) + backoffice (`apps/backoffice`) +
`@estrelinha/core` + `supabase/migrations` + `tools/catalog-import`

## Problem Statement

A página do produto tem uma seção **"Perguntas Frequentes"** que não é do produto: são **duas
perguntas fixas em JSX** (`Em quanto tempo chega?` e `Dá para comprar em quantidade?`), iguais nos 691
produtos do catálogo, escritas em
[`ProductDetailsAccordion.tsx:94-110`](apps/store/src/entities/product/ui/ProductDetailsAccordion.tsx#L94-L110).
Nenhuma delas é a pergunta que a cliente tem.

**As perguntas de verdade existem — e estão presas dentro da descrição.** Medido no banco local
(2026-08-16): **687 dos 691 produtos (99,4%)** trazem um bloco `<h3>Perguntas frequentes</h3>` no
campo `products.description`, com **3.476 pares pergunta/resposta** (mediana de 5 por produto, máximo
8). São as perguntas que a Adri de fato responde: *"As joias são realmente feitas à mão?"* (483
produtos), *"Quais materiais posso usar nessa joia?"* (453), *"Como envio meu material de DNA?"*
(443), *"Quanto tempo leva para ficar pronta a joia?"* (421), *"A joia acompanha corrente ou
pulseira?"* (300). Elas chegam à tela, mas como **corpo de texto corrido dentro de "Detalhes do
Produto"** —
misturadas às especificações e às observações de prazo, num bloco de 2.271 caracteres de mediana, e
não na seção que existe justamente para respondê-las.

**A consequência para o cadastro é pior que a de tela.** Não existe campo: para trocar uma resposta
que vale para 443 produtos, a dona teria de editar 443 descrições à mão, em HTML, dentro do
`RichTextEditor` — e mesmo assim `Quais materiais posso usar nessa joia?` já tem **98 respostas
distintas** para 453 usos, várias delas divergentes entre si sem que nada acuse.

## Goals

- [ ] A seção "Perguntas Frequentes" da página do produto passa a mostrar **as perguntas daquele
      produto**, vindas do cadastro — e o `<dl>` de duas perguntas fixas deixa de existir no fonte.
- [ ] Existe uma **biblioteca de perguntas e respostas** em `/admin/perguntas`, e o formulário do
      produto ganha uma aba onde a dona **escolhe da biblioteca ou cria na hora**, com resposta própria
      quando aquela peça responde diferente.
- [ ] O catálogo **nasce preenchido**: o importador extrai os 3.476 pares das descrições e semeia
      **67 entradas** de biblioteca e **3.476 vínculos**, sem duplicata e sem apagar curadoria.
- [ ] Cadastrar um produto novo **oferece** as perguntas certas: sugestão determinística por categoria,
      medida no catálogo real em **84,0% de acerto** e **83,5% de cobertura** no top-5.
- [ ] Nenhuma pergunta aparece **duas vezes** na página — a descrição para de exibir o bloco que virou
      cadastro.

## O que foi medido

Tudo abaixo saiu do banco local com o catálogo real importado, em 2026-08-16.

| | |
| --- | ---: |
| Produtos | 691 |
| Produtos com bloco `<h3>Perguntas frequentes</h3>` | **687 (99,4%)** |
| Pares pergunta/resposta extraíveis | **3.476** |
| Pares por produto — média · mediana · máximo | 5,06 · 5 · **8** |
| Perguntas distintas (normalizadas) | **67** |
| Pares distintos (pergunta + resposta) | 263 |
| Vínculos que usam a resposta mais frequente | **2.498 (71,9%)** — medido com a normalização do extrator |
| Vínculos que precisam de resposta própria | **977 (28,1%)** — ver a emenda em P1-C |
| Comprimento da pergunta — mediana · máximo | 42 · **94** |
| Comprimento da resposta — mediana · máximo | 159 · **370** |
| Respostas que contêm alguma tag HTML | **0** |
| Respostas que contêm entidade (`&ccedil;`…) | 3.170 |

**A distribuição das respostas é o que decide o modelo de dado:**

| | perguntas | usos | entradas se cada par virasse uma |
| --- | ---: | ---: | ---: |
| 1 resposta só (idêntica em todo produto) | 53 | 542 | 53 |
| 2–3 respostas | 9 | 1.378 | 19 |
| 4–10 respostas | 3 | 914 | 23 |
| **>10 respostas (por produto)** | **2** | 642 | **168** |

As duas de cauda longa são `Quais materiais posso usar nessa joia?` (98 respostas / 453 usos) e
`Posso combinar mais de um material afetivo na mesma joia?` (70 / 189): **2 perguntas produzem 168 das
263 entradas** e enumeram os materiais que aquela peça aceita.

**A concentração por categoria é real, e é o que faz a sugestão funcionar sem IA:**

| categoria | pergunta | presente em |
| --- | --- | ---: |
| Anéis | `O anel é ajustável?` | 66% (0% fora de Anéis) |
| Coleção Código Morse | `O que está escrito em código Morse nesse colar?` | **100%** |
| Nomes | `Posso escolher o nome que será gravado na peça?` | **100%** |
| Linha Pet | `Quanto tempo leva para ficar pronta a joia?` | 88% |
| Linha Dente de Leite | `A joia acompanha corrente ou pulseira?` | **100%** |

Ranqueando por **maior proporção dentro das categorias do produto**, o top-5 acerta **84,0%** e cobre
**83,5%** das perguntas que o produto de fato tem, com **3 produtos** sem nenhum acerto. Ranqueando
por **contagem bruta** de vizinhos, cai para **61,1% / 56,1%** e 52 produtos sem acerto — as
categorias grandes (`Joias e acessórios`, 634 produtos) dominam a lista. A diferença de 23 pontos é a
razão de a fórmula ser proporção, e não contagem.

| top-N | precisão | cobertura | produtos sem acerto |
| ---: | ---: | ---: | ---: |
| 3 | 91,3% | 55,3% | 45 |
| 4 | 91,4% | 73,9% | 3 |
| **5** | **84,0%** | **83,5%** | **3** |
| 6 | 75,9% | 89,4% | 3 |
| 8 | 60,7% | 95,1% | 3 |

## Out of Scope

| Item | Motivo |
| --- | --- |
| **Geração de pergunta por IA** | Decisão do usuário em 2026-08-16: determinístico agora, IA depois. Abre o que a `AD-011` fechou e a `BL-001` registra com 6 perguntas em aberto (provedor, chave, custo por chamada, latência no save, fallback, rascunho × definitivo). Registrado como **`BL-014`**. |
| **Derivar `Quais materiais posso usar nessa joia?` de `material_kinds`** | A coluna e a descrição **discordam** hoje, e a descrição diz mais: há produto com `material_kinds = {cinzas}` cuja descrição enumera cinco materiais, e produto com `requires_material = false, material_kinds = {}` cuja descrição diz "aceita coto umbilical, cabelo". Derivar faria a loja dizer **menos** do que já diz. A resposta continua sendo texto por produto. A divergência é achado desta feature e vira **`BL-015`** — é curadoria do material (feature 22), não de FAQ. |
| **Dados estruturados `FAQPage` (schema.org)** | É `BL-007`, que já existe e cobre sitemap + dados estruturados juntos. Esta feature **torna possível** emitir `FAQPage` porque tira a pergunta de dentro de um blob de HTML; emitir é lá. |
| **Perguntas fixas da loja inteira** (uma lista global sempre exibida) | Seria um **segundo dono** do que aparece na seção — a lista global mais a lista do produto —, e a loja não saberia dizer qual venceu quando as duas trouxessem a mesma pergunta. O mesmo efeito se obtém pela aplicação em lote (**P2-B**), que grava vínculo de verdade e continua editável produto a produto. As duas perguntas fixas de hoje entram na biblioteca como entradas, então nenhum conteúdo se perde. |
| **Página `/perguntas-frequentes` na loja** | É rota nova de um segmento, e a `AD-018` faz disso decisão de namespace com lista de reservadas. Não é o problema desta feature, que é a pergunta **do produto**. |
| **Busca da loja indexar as respostas** | A busca lê `products`; incluir uma tabela ligada muda a consulta de catálogo, que já é a mais pesada da loja (`BL-00X`, 3,1 MB por página de categoria). |
| **Sanitizar ou reescrever a descrição na gravação** | Mesma regra da feature 27: sanitização é de **render**. E remover o bloco da descrição no importador foi **recusado pelo usuário** — quem remove é a dona, por clique explícito (**FAQ-28**). |
| **Traduzir / reescrever as 3.476 respostas** | O texto é o que a Adri escreveu. A feature move e estrutura; reescrever é curadoria dela. |

---

## Assumptions & Open Questions

| Assumption / decisão | Escolha | Racional | Confirmado? |
| --- | --- | --- | --- |
| O que acontece com o bloco de FAQ que continua na descrição | **A loja filtra na hora de renderizar** — a descrição fica intacta no banco | Nada é destruído, e a origem (Nuvemshop) segue sendo a fonte. O custo — o painel mostra um texto que a loja não exibe — é pago por **FAQ-27/FAQ-28**, que avisam e oferecem a remoção por clique da dona. | **sim** (usuário) |
| A "inteligência" da sugestão | **Determinística por co-ocorrência**, IA registrada como `BL-014` | 84,0% de acerto medido no catálogo real, sem provedor, sem chave, sem custo por chamada e sem latência no caminho do save. E é testável com dado real, que uma chamada a LLM não é. | **sim** (usuário) |
| Como a biblioteca representa a mesma pergunta com respostas diferentes | **67 entradas com resposta padrão + `product_faqs.answer_override` nullable** | 70% dos vínculos ficam no padrão. Mesmo padrão de `engraving_max_chars` e de `requires_material`: `null` cai no default, e **um leitor só** (`resolveFaqAnswer`). A alternativa de 263 entradas faria a dona escolher entre 98 linhas com o mesmo título. | **sim** (usuário) |
| Localizar o bloco de FAQ por **regex**, e não por árvore | Permitido **aqui**, e só aqui | A regra do projeto ("allowlist por árvore, nunca regex sobre HTML") é sobre **sanitizar**. Isto é **localizar um heading e partir pares** num corpus medido como extremamente regular (687/687 usam `<h3>Perguntas frequentes</h3>`), e a segurança continua vindo de onde sempre veio: o que sobra na descrição ainda passa por `sanitizeHtml`, e a resposta extraída é renderizada como **texto**, nunca como HTML. Além disso o importador roda em **Node**, onde não há `DOMParser` — uma implementação por árvore não serviria às duas pontas. | não |
| A resposta é texto puro, não HTML | **Texto** | Medido: **0 de 3.476** respostas contêm tag; 3.170 contêm entidade, que a extração decodifica. Guardar HTML abriria a mesma superfície da descrição em troca de nada. | não |
| Apagar entrada da biblioteca em uso | **O banco recusa** (`on delete restrict`), e o caminho normal é **desativar** | Apagar removeria a pergunta de até 453 páginas de produto em silêncio. Desativar é reversível, tira de todas as páginas de uma vez e preserva os vínculos. | não |
| Vínculo apontando para entrada inativa | A loja **pula** o vínculo | Mesma lição da feature 24: "saiu do ar" é resposta da RLS, e o vínculo volta com a entrada `null` e o `faq_id` intacto. A vaga que sobra fica vazia — não se substitui por outra pergunta. | não |
| Onde fica a aba no formulário do produto | **Logo depois de `Geral`** | A pergunta é a continuação da descrição, que está em `Geral`; separá-las por três abas de preço e mídia esconderia justamente a relação que **FAQ-27** precisa tornar visível. | não |
| Onde fica `/admin/perguntas` na sidebar | Grupo **Catálogo**, depois de Produtos e Categorias | É conteúdo de catálogo, não curadoria de vitrine (que é o grupo `Loja`). `navItems.test.ts` exige que a ordem das rotas em `App.tsx` acompanhe. | não |
| Quantas perguntas o produto pode ter | **Sem teto de banco**; o painel avisa acima de 8 | 8 é o máximo medido no catálogo real. Teto rígido recusaria dado que já existe; aviso não recusa nada. | não |
| Limites de campo | pergunta ≤ **160**, resposta ≤ **600** | Máximos medidos: 94 e 370. Folga de ~1,7× com teto de verdade — pelo mesmo motivo de `DEFAULT_ENGRAVING_MAX_CHARS` não ser "sem limite". | não |
| Categoria pequena demais para sugerir | Ignorada abaixo de **3** produtos com FAQ (`FAQ_MIN_CATEGORY_SAMPLE`) | Com 1 ou 2 vizinhos a proporção é 100% por acidente e a sugestão vira ruído com aparência de certeza. | não |
| Produto sem categoria qualificada | Cai na **frequência global** | Zero produtos do catálogo atual precisam disso, mas um produto novo sem categoria precisa — e lista vazia seria pior que as 5 perguntas mais comuns da loja. | não |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## Dimensões implícitas (varredura obrigatória — escopo Large)

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | **FAQ-12** (pergunta ≤160, resposta ≤600, nenhuma vazia, recusa legível), **FAQ-18** (duplicata por chave normalizada), **FAQ-08** (resposta é texto e é escapada no render) |
| Falha / falha parcial | **FAQ-07** (descrição que fica vazia depois da remoção do bloco se comporta como ausente), **FAQ-06** (bloco sem par extraível **não** é removido), **FAQ-02** (produto sem vínculo não monta a seção) |
| Idempotência / repetição / duplicata | **FAQ-21** (segunda execução do importador: zero duplicata, medido por contagem antes/depois), **FAQ-11** (`question_key` único é o que impede a duplicata na origem), **FAQ-35** (lote pula quem já tem o vínculo) |
| Fronteira de auth / rate limit | **FAQ-13** — leitura pública só de entrada ativa; escrita **só** admin por `has_role`, nas duas tabelas; nenhum `grant` alcança `anon`. Rate limit **N/A**: escrita é de painel autenticado, sem endpoint público |
| Concorrência / ordenação | **FAQ-16** (a ordem é `product_faqs.position`, dono único, e o upsert de reordenação manda a linha inteira — lição da feature 24: `{id, position}` devolve `23502`), **FAQ-15** (a contagem de uso é lida no momento da recusa, não em cache) |
| Ciclo de vida do dado / expiração | **FAQ-15** (`on delete restrict` em `faqs`; desativar é o caminho reversível), **FAQ-10** (`product_faqs.product_id` é `on delete cascade` — produto apagado leva os vínculos, nunca a entrada da biblioteca) |
| Observabilidade | **FAQ-26** — o relatório do importador ganha seção própria (entradas criadas, vínculos criados, respostas próprias, produtos pulados por já terem vínculo). A loja não tem camada de log, como nas features anteriores |
| Falha de dependência externa | **N/A** — nenhuma chamada externa nova. A decisão de não chamar LLM (`BL-014`) é o que mantém esta linha vazia |
| Integridade de transição de estado | **N/A** — não há máquina de estado. `is_active` é booleano de duas posições sem transição proibida, e `FAQ-03` garante que a leitura da resposta tem um caminho só |

---

## User Stories

### P1-A: A página do produto mostra as perguntas daquele produto ⭐ MVP

**User Story**: Como cliente decidindo sobre uma joia memorial, quero encontrar na seção "Perguntas
Frequentes" as perguntas sobre **esta peça** — que material ela aceita, quanto tempo leva, se vem com
corrente —, para não ter que garimpar isso no meio da descrição nem abrir o WhatsApp.

**Why P1**: A seção existe hoje e mente: mostra duas perguntas genéricas iguais em 691 produtos,
enquanto as 3.476 perguntas reais estão dentro do texto da descrição.

**Acceptance Criteria**:

1. WHEN a página do produto renderiza E o produto tem perguntas vinculadas THEN a seção
   `Perguntas Frequentes` SHALL renderizar um par por vínculo, na ordem de `product_faqs.position`,
   ascendente.
2. WHEN o produto **não** tem nenhuma pergunta vinculada visível THEN a seção `Perguntas Frequentes`
   SHALL NOT ser montada, e o `<dl>` de duas perguntas fixas SHALL NOT existir no fonte.
3. WHEN o vínculo tem `answer_override` não vazio THEN a resposta exibida SHALL ser ela; WHEN é `null`
   ou só espaço THEN SHALL ser `faqs.answer`. A decisão SHALL passar por `resolveFaqAnswer`, que SHALL
   ser o **único** leitor de `answer_override` fora dos testes.
4. WHEN um vínculo aponta para uma entrada inativa (a RLS devolve a entrada como `null` e o `faq_id`
   intacto) THEN a loja SHALL **pular** aquele vínculo, sem substituí-lo por outra pergunta e sem
   quebrar a página.
5. WHEN `ProductDescription` recebe uma descrição que contém o bloco de FAQ THEN SHALL remover o bloco
   **antes** de sanitizar, e o HTML renderizado SHALL NOT conter o heading `Perguntas frequentes` nem
   nenhuma das perguntas daquele produto.
6. WHEN a descrição fica vazia depois da remoção do bloco THEN a seção `Detalhes do Produto` SHALL se
   comportar exatamente como em `PDP-10` (só bullets; sem bullets, seção ausente e `Cuidados` aberta).
7. WHEN a resposta contém `<`, `&` ou qualquer caractere de marcação THEN SHALL ser renderizada como
   **texto escapado** — a seção SHALL NOT usar `dangerouslySetInnerHTML` em ponto nenhum.
8. WHEN a página do produto carrega THEN as perguntas SHALL vir de consulta própria
   (`useProductFaqs`), e `PRODUCT_SELECT` SHALL permanecer inalterado — a listagem de categoria não
   pode passar a baixar FAQ de 24 produtos por página.

**Independent Test**: abrir `/produtos/<slug>` de um produto da Linha Pet e ver na seção "Perguntas
Frequentes" as 5 perguntas dele, com a resposta de material específica daquela peça; conferir que
"Detalhes do Produto" não repete nenhuma delas.

---

### P1-B: A dona cadastra perguntas uma vez e reusa ⭐ MVP

**User Story**: Como dona da loja, quero uma biblioteca de perguntas e respostas e um lugar no
cadastro do produto para escolher quais valem para aquela peça — criando na hora quando for nova e
ajustando a resposta quando aquela peça responde diferente —, para não reescrever a mesma resposta em
443 produtos nem editar HTML à mão.

**Why P1**: É o pedido central. Sem a biblioteca, a extração não tem para onde ir.

**Acceptance Criteria**:

1. WHEN a migration roda THEN SHALL existir `public.faqs` (`id`, `question`, `answer`, `question_key`,
   `is_active`, `created_at`, `updated_at`) e `public.product_faqs` (`product_id`, `faq_id`,
   `position`, `answer_override`), com PK `(product_id, faq_id)`.
2. WHEN uma entrada é gravada THEN `question_key` SHALL ser produzido por `faqQuestionKey` — minúsculas,
   sem acento, espaços colapsados, entidades já decodificadas — e SHALL ser **único**; a mesma função
   SHALL ser usada pelo painel e pelo importador.
3. WHEN a pergunta excede 160 caracteres, a resposta excede 600, ou qualquer das duas fica vazia após
   `trim` THEN a gravação SHALL ser recusada com motivo legível, e o banco SHALL recusar também
   (`check`), não só a tela.
4. WHEN um visitante anônimo lê `faqs` THEN SHALL receber apenas entradas com `is_active = true`; WHEN
   tenta escrever em `faqs` ou `product_faqs` THEN SHALL ser recusado. Nenhum `grant` desta migration
   SHALL alcançar `anon`, e toda policy de escrita SHALL exigir `has_role(auth.uid(), 'admin')` no
   `using` **e** no `with check`.
5. WHEN a dona abre `/admin/perguntas` THEN SHALL ver a biblioteca com pergunta, início da resposta,
   **em quantos produtos está** e o estado (ativa/inativa), e SHALL poder criar, editar e ativar/desativar.
6. WHEN a dona tenta apagar uma entrada usada por ao menos um produto THEN a operação SHALL ser
   recusada, a tela SHALL dizer em quantos produtos ela está e SHALL oferecer **desativar**; WHEN a
   entrada não é usada por nenhum THEN o apagar SHALL concluir.
7. WHEN a dona abre a aba `Perguntas` do formulário do produto THEN SHALL ver as perguntas vinculadas
   na ordem gravada, e SHALL poder **adicionar da biblioteca** (com busca por texto), **criar uma nova**
   sem sair da tela, e **remover** um vínculo.
8. WHEN a dona edita a resposta de uma pergunta **dentro do produto** THEN SHALL gravar em
   `answer_override` e SHALL NOT alterar `faqs.answer`; a tela SHALL marcar a linha como resposta
   própria e oferecer **voltar ao padrão**, que SHALL gravar `null`.
9. WHEN a dona edita a resposta **na biblioteca** THEN a mudança SHALL valer para todos os produtos que
   usam o padrão, e SHALL NOT alterar nenhum `answer_override`.
10. WHEN a dona cria uma pergunta cuja `question_key` já existe THEN a criação SHALL ser recusada e a
    tela SHALL apontar a entrada existente, oferecendo vinculá-la.
11. WHEN a rota `/admin/perguntas` entra em `App.tsx` THEN SHALL entrar em `navGroups` no grupo
    `Catálogo`, e a ordem textual das rotas SHALL acompanhar a da lista (`navItems.test.ts`).

**Independent Test**: criar a pergunta "A peça vem em caixinha?" em `/admin/perguntas`, vinculá-la a
dois produtos, ajustar a resposta em um deles, e ver na loja os dois textos diferentes; editar a
resposta na biblioteca e ver só o produto sem ajuste acompanhar.

---

### P1-C: O catálogo nasce preenchido ⭐ MVP

**User Story**: Como dona da loja, quero que as perguntas que já escrevi nas 687 descrições apareçam
no cadastro sem eu digitar nada, para a feature não nascer inerte.

**Why P1**: Sem a semente, a biblioteca abre vazia e as 3.476 perguntas continuam presas no HTML — o
mesmo desfecho de `PRM-12` e de `collections`, que passaram meses sem ninguém notar.

**Acceptance Criteria**:

1. WHEN o importador roda com o catálogo real THEN SHALL criar **67 entradas** em `faqs` e **3.475
   vínculos** em `product_faqs`, cobrindo **687 produtos**.

> **Emenda (fase Execute, 2026-08-16).** Dois números desta história mudaram na execução real, e os
> dois são medição, não ajuste de conveniência:
>
> - **3.476 → 3.475 vínculos.** Um produto — `Anel Afetivo Aliança com Coto Umbilical em Prata 925` —
>   **repete a mesma pergunta** na descrição, e a PK `(product_id, faq_id)` recusa o lote inteiro. A
>   primeira execução real caiu com `duplicate key value violates unique constraint "product_faqs_pkey"`
>   **depois** de gravar 2.500 vínculos. O plano passou a deduplicar por produto (vence a primeira
>   aparição), e o descarte tem contador próprio no relatório.
> - **1.044 → 977 respostas próprias.** A medição da spec comparou a resposta **crua**; o extrator
>   compara a resposta **normalizada** (tag removida, entidade decodificada, espaço colapsado), o que
>   funde respostas que só diferiam na codificação. Confirmado replicando a normalização do extrator
>   em SQL: dá **978** sobre os 3.476 pares, e **977** sobre os 3.475 depois da deduplicação. O número
>   novo é melhor — 67 vínculos a menos guardando texto redundante.
2. WHEN o extrator lê uma descrição THEN SHALL reconhecer os **dois** arranjos medidos: um `<p>` por
   par (`<p><strong>P</strong><br />R</p>`) e **todos os pares num único `<p>`** separados por `<br />`.
   O segundo arranjo SHALL ser coberto por fixture — ele representa 70 produtos e a leitura ingênua
   perde 312 pares.
3. WHEN o bloco é localizado THEN SHALL começar no heading `Perguntas frequentes` (`h2` ou `h3`, sem
   distinguir caixa nem acento) e terminar no próximo heading de mesmo nível ou no fim do texto —
   medido: 685 terminam em outro `<h3>`, 2 são o último bloco.
4. WHEN a extração produz uma resposta THEN entidades HTML SHALL estar decodificadas (`&ccedil;` → `ç`)
   e a resposta SHALL ser texto sem tag.
5. WHEN a mesma pergunta aparece em mais de um produto THEN SHALL virar **uma** entrada, e
   `faqs.answer` SHALL ser a resposta **mais frequente** daquela pergunta no catálogo; os demais
   produtos SHALL receber `answer_override`. Medido na execução real: **2.498** vínculos no padrão,
   **977** com resposta própria.
6. WHEN a ordem dos vínculos é gravada THEN SHALL reproduzir a ordem em que os pares aparecem na
   descrição.
7. WHEN o importador roda uma segunda vez THEN SHALL criar **zero** entrada e **zero** vínculo novos, e
   as contagens antes e depois SHALL ser idênticas.
8. WHEN um produto já tem ao menos um vínculo THEN o importador SHALL **pular** aquele produto — a
   presença de vínculo é a curadoria da dona, pela mesma regra da feature 24.
9. WHEN uma entrada de biblioteca já existe pela `question_key` THEN o importador SHALL reusá-la e
   SHALL NOT reescrever `faqs.answer` — a dona pode tê-la editado.
10. WHEN o import termina THEN o relatório SHALL trazer seção própria com entradas criadas, vínculos
    criados, vínculos com resposta própria e produtos pulados por já terem vínculo.
11. WHEN o catálogo tem produto sem bloco de FAQ (4 medidos) THEN SHALL passar sem vínculo e sem erro.

**Independent Test**: `pnpm --filter @estrelinha/catalog-import run import`, conferir 67/3.476 no
banco, rodar de novo e conferir que os dois números não mudam.

---

### P1-D: O painel avisa sobre o bloco que a loja não mostra ⭐ MVP

**User Story**: Como dona da loja, quero saber que aquele trecho de perguntas dentro da descrição não
aparece mais na loja, para não editá-lo achando que vale — e quero poder tirá-lo dali quando eu
decidir.

**Why P1**: É a contrapartida obrigatória da decisão de **filtrar no render em vez de remover na
importação**. Sem ela, a dona edita um texto invisível e a loja não muda — defeito silencioso, do
mesmo tipo que este projeto já pagou caro três vezes.

**Acceptance Criteria**:

1. WHEN a aba `Geral` renderiza E a descrição contém um bloco de FAQ localizável THEN SHALL exibir um
   aviso abaixo do editor dizendo quantas perguntas há ali e que a loja **não** as exibe nesse ponto,
   com atalho para a aba `Perguntas`.
2. WHEN a descrição não contém bloco localizável THEN o aviso SHALL NOT ser exibido.
3. WHEN a dona aciona `Remover o bloco da descrição` THEN o editor SHALL passar a conter a descrição
   sem o bloco, a mudança SHALL entrar no rascunho como qualquer outra edição (não grava sozinha), e o
   aviso SHALL desaparecer.
4. WHEN a remoção acontece THEN SHALL usar **a mesma** função de fronteira que a loja usa para filtrar
   e que o importador usa para extrair — um bloco, três consumidores, uma definição.

**Independent Test**: abrir um produto importado na aba Geral, ver o aviso com a contagem certa,
clicar em remover, e ver o texto encurtar sem tocar em Especificações nem em Observações.

---

### P2-A: O cadastro sugere as perguntas certas

**User Story**: Como dona da loja cadastrando um produto novo, quero que o painel me ofereça as
perguntas que fazem sentido para a categoria dele, para eu montar o FAQ em um clique em vez de
procurar em 67 entradas.

**Why P2**: O catálogo já nasce preenchido pela `P1-C`; a sugestão é o que faz a feature continuar
útil no **produto 692** em diante. Não é MVP porque a biblioteca e o vínculo funcionam sem ela.

**Acceptance Criteria**:

1. WHEN a migration roda THEN SHALL existir a view `faq_category_usage` (`category_id`, `faq_id`,
   produtos da categoria que usam a pergunta, produtos da categoria com ao menos uma pergunta), com
   `security_invoker = true`, no mesmo molde de `category_product_counts`.
2. WHEN a aba `Perguntas` renderiza THEN SHALL exibir até **5** sugestões, ranqueadas pela **maior
   proporção** entre as categorias do produto — `usos na categoria ÷ produtos com FAQ na categoria` —,
   nunca pela contagem bruta.
3. WHEN uma categoria tem menos de **3** produtos com FAQ THEN SHALL ser ignorada no ranking.
4. WHEN o produto já está vinculado a uma pergunta THEN ela SHALL NOT aparecer entre as sugestões, e a
   contribuição do próprio produto SHALL ser descontada do numerador e do denominador.
5. WHEN nenhuma categoria do produto qualifica (produto novo, sem categoria, ou categorias pequenas
   demais) THEN as sugestões SHALL cair na **frequência global** da biblioteca.
6. WHEN a dona aciona `Adicionar todas` THEN as 5 sugestões SHALL virar vínculos na ordem exibida.
7. WHEN a função de ranking é medida contra a fixture do catálogo real THEN SHALL alcançar ao menos
   **80% de precisão** e **80% de cobertura** no top-5 — a medição de referência é 84,0% / 83,5%.
8. WHEN o ranking é calculado THEN SHALL ser **função pura** em `@estrelinha/core/faq`, sem React e sem
   Supabase, recebendo as linhas da view como parâmetro.

**Independent Test**: criar um produto novo em `Anéis`, abrir a aba Perguntas e ver `O anel é
ajustável?` entre as 5 sugeridas; criar um em `Coleção Código Morse` e ver as perguntas de Morse.

---

### P2-B: Aplicar uma pergunta a vários produtos de uma vez

**User Story**: Como dona da loja, quero aplicar uma pergunta da biblioteca a todos os produtos de uma
categoria de uma vez, para não abrir 155 cadastros quando a resposta passa a valer para a linha
inteira.

**Why P2**: É o que substitui, com dado de verdade, a ideia de "perguntas fixas da loja" que ficou
fora de escopo — e é o único caminho prático para levar as duas perguntas genéricas de hoje aos
produtos que a dona quiser.

**Acceptance Criteria**:

1. WHEN a dona escolhe uma entrada em `/admin/perguntas` e aciona `Aplicar a uma categoria` THEN SHALL
   escolher a categoria e ver, **antes de gravar**, quantos produtos receberão o vínculo e quantos
   serão pulados por já o terem.
2. WHEN a aplicação confirma THEN SHALL criar o vínculo para os produtos da categoria **e da
   descendência dela** (`descendantIds`, de `@estrelinha/core/menu`), no fim da ordem de cada produto.
3. WHEN um produto da categoria já tem aquele vínculo THEN SHALL ser pulado, sem alterar posição nem
   `answer_override`.
4. WHEN a aplicação termina THEN a tela SHALL informar quantos vínculos foram criados.

**Independent Test**: aplicar uma pergunta à categoria `Linha Pet`, ver a prévia com 155, confirmar, e
conferir a pergunta na página de um produto pet.

---

### P3: Reordenar as perguntas do produto por arrasto

**User Story**: Como dona da loja, quero arrastar as perguntas de um produto para escolher a ordem em
que a cliente as lê.

**Why P3**: A coluna `position` existe desde a `P1-B` e a semente já grava a ordem da origem; arrastar
é conforto. Adicionar e remover já bastam para uma ordem aceitável.

**Acceptance Criteria**:

1. WHEN a dona arrasta uma linha na aba `Perguntas` THEN a nova ordem SHALL ser gravada em
   `product_faqs.position` e SHALL ser a ordem exibida na loja.
2. WHEN a reordenação grava THEN o upsert SHALL enviar as colunas obrigatórias da linha, e não só
   `{ product_id, faq_id, position }` — o upsert do PostgREST é `insert … on conflict`.

---

## Edge Cases

- WHEN a descrição contém o heading `Perguntas frequentes` **sem nenhum par extraível** (prosa solta
  embaixo) THEN o bloco SHALL NOT ser removido da descrição e nada SHALL ser extraído — a remoção só
  age sobre bloco que produziu par.
- WHEN a dona escreve um bloco `<h3>Perguntas frequentes</h3>` novo na descrição THEN a loja SHALL
  filtrá-lo (é o preço declarado da decisão) e o aviso de **FAQ-27** SHALL aparecer, tornando o efeito
  visível em vez de silencioso.
- WHEN a mesma pergunta é vinculada duas vezes ao mesmo produto THEN a PK `(product_id, faq_id)` SHALL
  recusar, e a tela SHALL dizer que ela já está no produto.
- WHEN uma resposta própria é igual, caractere a caractere, à resposta padrão THEN SHALL ser gravada
  como `null` — resposta própria idêntica ao padrão é um segundo dono do mesmo texto.
- WHEN um produto tem 8 perguntas (o máximo medido) THEN a seção SHALL renderizar as 8 sem estourar a
  largura em 390px, e o painel SHALL avisar que passou de 8 sem recusar.
- WHEN a pergunta tem 94 caracteres (o máximo medido) THEN SHALL caber na linha do painel e na seção da
  loja em 390px, embrulhando em vez de truncar.
- WHEN `products.description` é `null` ou vazia THEN a extração SHALL devolver lista vazia e o filtro
  SHALL devolver a entrada inalterada, sem lançar.
- WHEN todas as entradas vinculadas a um produto estão inativas THEN a seção SHALL NOT ser montada —
  mesmo desfecho de produto sem vínculo, nunca uma seção aberta e vazia.
- WHEN a view `faq_category_usage` está vazia (banco recém-resetado, antes do import) THEN a sugestão
  SHALL cair na frequência global e, sem biblioteca nenhuma, SHALL exibir estado vazio declarado — nunca
  uma lista fantasma.
- WHEN dois admins reordenam o mesmo produto ao mesmo tempo THEN a última gravação vence, e nenhuma
  linha SHALL ficar sem `position`.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| FAQ-01 | P1-A Loja — seção renderiza os vínculos na ordem de `position` | Execute | Implemented |
| FAQ-02 | P1-A Loja — sem vínculo visível, seção não é montada; `<dl>` fixo some do fonte | Execute | Implemented |
| FAQ-03 | P1-A Loja — `resolveFaqAnswer` é o leitor único de `answer_override` | Execute | Implemented |
| FAQ-04 | P1-A Loja — vínculo para entrada inativa é pulado, sem substituição | Execute | Implemented |
| FAQ-05 | P1-A Loja — `ProductDescription` remove o bloco antes de sanitizar | Execute | Implemented |
| FAQ-06 | P1-A Loja — bloco sem par extraível não é removido | Execute | Implemented |
| FAQ-07 | P1-A Loja — descrição esvaziada pela remoção se comporta como `PDP-10` | Execute | Implemented |
| FAQ-08 | P1-A Loja — resposta é texto escapado; nenhum `dangerouslySetInnerHTML` | Execute | Implemented |
| FAQ-09 | P1-A Loja — consulta própria; `PRODUCT_SELECT` inalterado | Execute | Implemented |
| FAQ-10 | P1-B Dados — `faqs` + `product_faqs`, PK e FKs | Execute | Implemented |
| FAQ-11 | P1-B Dados — `question_key` único, com dono único `faqQuestionKey` | Execute | Implemented |
| FAQ-12 | P1-B Dados — limites 160/600 e não-vazio, na tela **e** no `check` | Execute | Implemented |
| FAQ-13 | P1-B Dados — RLS: leitura pública só de ativa, escrita só admin, `anon` sem `grant` | Execute | Implemented |
| FAQ-14 | P1-B Admin — `/admin/perguntas` lista, cria, edita, ativa/desativa, mostra uso | Execute | Implemented |
| FAQ-15 | P1-B Admin — apagar entrada em uso é recusado; desativar é o caminho | Execute | Implemented |
| FAQ-16 | P1-B Admin — aba `Perguntas`: adicionar da biblioteca, criar na hora, remover | Execute | Implemented |
| FAQ-17 | P1-B Admin — resposta própria por produto e "voltar ao padrão" | Execute | Implemented |
| FAQ-18 | P1-B Admin — duplicata por `question_key` recusada, apontando a existente | Execute | Implemented |
| FAQ-19 | P1-B Admin — rota em `App.tsx` e em `navGroups` na mesma ordem | Execute | Implemented |
| FAQ-20 | P1-C Semente — 67 entradas · 3.476 vínculos · 687 produtos | Execute | Implemented |
| FAQ-21 | P1-C Semente — extrator lê os dois arranjos de HTML medidos | Execute | Implemented |
| FAQ-22 | P1-C Semente — fronteira do bloco (heading até heading ou fim) | Execute | Implemented |
| FAQ-23 | P1-C Semente — entidades decodificadas; resposta sem tag | Execute | Implemented |
| FAQ-24 | P1-C Semente — resposta padrão é a mais frequente; divergente vira override | Execute | Implemented |
| FAQ-25 | P1-C Semente — idempotente: segunda execução não cria nada | Execute | Implemented |
| FAQ-26 | P1-C Semente — não sobrescreve curadoria (produto com vínculo é pulado) | Execute | Implemented |
| FAQ-27 | P1-D Admin — aviso do bloco de FAQ na descrição, com contagem | Execute | Implemented |
| FAQ-28 | P1-D Admin — `Remover o bloco da descrição`, pela mesma função de fronteira | Execute | Implemented |
| FAQ-29 | P2-A Sugestão — view `faq_category_usage` com `security_invoker` | Execute | Implemented |
| FAQ-30 | P2-A Sugestão — ranking por maior proporção; `FAQ_MIN_CATEGORY_SAMPLE = 3` | Execute | Implemented |
| FAQ-31 | P2-A Sugestão — limite 5; já vinculadas fora; próprio produto descontado | Execute | Implemented |
| FAQ-32 | P2-A Sugestão — sem categoria qualificada, cai na frequência global | Execute | Implemented |
| FAQ-33 | P2-A Sugestão — ≥80% de precisão e cobertura contra fixture do catálogo real | Execute | Implemented |
| FAQ-34 | P2-A Sugestão — `Adicionar todas` em um clique | Execute | Implemented |
| FAQ-35 | P2-B Lote — aplicar a categoria + descendência, pulando quem já tem | Execute | Implemented |
| FAQ-36 | P2-B Lote — prévia com contagem antes de gravar | Execute | Implemented |
| FAQ-37 | P3 Ordem — arrastar para reordenar, com upsert de linha inteira | Execute | Implemented |

**Coverage:** 37 requisitos · 37 mapeados a tasks · 37 **Implemented** — a verificação independente (`validation.md`) é o passo seguinte.

---

## Guardas que esta feature precisa deixar de pé

Pela regra do projeto: identidade e regra pura têm a propriedade ruim de **errar sem quebrar nada**.
Cada guarda abaixo lê o fonte ou o dado do disco e carrega **âncora de contagem**.

| Guarda | O que derruba a suíte |
| --- | --- |
| `faqExtraction.test.ts` | O extrator perder um dos **dois** arranjos de HTML medidos; a fixture deixar de conter os dois; a fronteira do bloco passar a comer `Observações importantes` |
| `faqSuggestion.test.ts` | A precisão do top-5 cair abaixo de 80% contra a fixture do catálogo real; o ranking voltar a ser contagem bruta (que mede 61%); `FAQ_MIN_CATEGORY_SAMPLE` sumir |
| `faqOneReader.test.ts` | `answer_override` ser lido fora de `resolveFaqAnswer`; um segundo desenho da seção de FAQ aparecer no backoffice (mesmo molde de `previaUnica.test.ts`) |
| `faqNoDuplicate.test.tsx` | A descrição renderizada voltar a conter uma pergunta que já está na seção de FAQ — medido sobre uma descrição real do catálogo |
| `faqSchema.test.ts` | A migration abrir escrita a `anon`; policy de escrita sem `has_role`; `faqs` perder o `on delete restrict`; os `check` de 160/600 sumirem; a view perder `security_invoker` |
| `navItems.test.ts` (existente) | A rota `/admin/perguntas` entrar em `App.tsx` fora da ordem de `navGroups` |

---

## Success Criteria

- [ ] Abrir 3 produtos de linhas diferentes (Pet, Nomes, Código Morse) e ver, na seção "Perguntas
      Frequentes", as perguntas daquele produto — e **nenhuma** delas repetida em "Detalhes do Produto".
- [x] `select count(*) from faqs` devolve **67** e `select count(*) from product_faqs` devolve
      **3.475**, com **977** vínculos carregando `answer_override`. ✅ medido em 2026-08-16.
- [x] Rodar o importador uma segunda vez e os três números **não mudam**. ✅ segunda execução: 0
      entradas, 0 vínculos, 687 produtos pulados.
- [ ] Criar um produto novo em `Anéis` e ver `O anel é ajustável?` entre as 5 sugestões, sem nenhuma
      chamada de rede a provedor externo.
- [ ] Editar uma resposta em `/admin/perguntas` e ver a mudança em todos os produtos que usam o padrão,
      sem tocar nos que têm resposta própria.
- [ ] QA em **390×844 antes de 1440**: sem scroll horizontal do `body` com a pergunta de 94 caracteres
      e o produto de 8 perguntas; alvo de toque ≥44px em toda linha acionável da aba `Perguntas`.
- [ ] Sem erro novo de lint (baseline **30/8**) nem de tipo (baseline store **0** · backoffice **0** ·
      catalog-import **0**).
- [ ] `git diff --name-only` mostra `packages/core/src/payment/**` **inalterado** — nona feature
      seguida. Nenhuma decisão de dinheiro depende de pergunta frequente.
