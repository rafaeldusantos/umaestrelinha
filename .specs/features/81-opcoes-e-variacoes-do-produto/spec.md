# 81 — Opções e variações do produto: sugestões, grade automática e imagem na linha

## Problem Statement

Na aba **Preços & variações** do cadastro de produto do Backoffice, montar a grade de uma peça é
trabalho repetido e em três passos soltos: a Adri digita o nome do eixo e os valores do zero em todo
produto (mesmo quando 200 outros já usam "Tamanho: 3,5 cm, 4,5 cm, 5,5 cm"), depois precisa lembrar de
clicar **Regerar do cruzamento**, e as linhas nascem **pausadas e sem preço** — cada uma precisa ser
preenchida e ligada à mão. A imagem da variação é escolhida num terceiro card, longe da linha, numa
fileira de miniaturas de 40px que só conhece fotos já enviadas na aba Mídia.

## Goals

- [ ] Cadastrar as opções de uma peça que repete um padrão do catálogo em **≤ 3 cliques por opção**
      (escolher o nome sugerido, usar os valores sugeridos), sem digitar.
- [ ] A grade acompanha as opções **sem nenhum clique**: a variação nasce no mesmo gesto em que o valor
      é acrescentado, **ativa** e com o preço, o preço "de" e o peso padrão do produto.
- [ ] Escolher a imagem de uma variação acontece **na própria linha**, com a opção de enviar uma foto
      nova sem sair da aba.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Tabela ou tela de "modelos de opção" | Decisão do usuário: as sugestões são **derivadas** do que o catálogo já tem (sem segundo dono; `CLAUDE.md`, consequência 2 do "defeito 01") |
| Preencher os valores sozinho, sem um clique | Ver assunção A1 — a sugestão aparece; quem decide acrescentar é a Adri |
| Geração automática na **Grade rápida** (`/admin/produtos/grade-rapida`) | Ela monta a grade de cada produto do lote no salvar, por outro caminho. A grade rápida **ganha** o novo rótulo e as sugestões, porque usa o mesmo `OptionsEditor` |
| Sincronizar linhas já geradas quando o preço padrão muda depois | Os padrões são copiados **no momento da geração**; a grade já tem **Preencher coluna** para propagar |
| Renomear um valor (chip) | O editor só acrescenta e remove valores hoje; renomear valor fica como está |
| Recorte/edição de imagem | Mesma exclusão da aba Mídia (PMD) |
| Mudanças na loja | A loja já lê `product_variants.image_url`, `price`, `is_active`; nada muda lá |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rótulo do campo "Eixo" | **"Nome da opção"**; valores = **"Valores"**; botão **"Adicionar opção"**; contador **"N de 3 opções"** | Vocabulário de mercado e casa com o título do card ("Opções") | y (usuário, 2026-10-26) |
| Origem das sugestões | **Derivadas** de `products.options` de todo o catálogo, sem tabela nova | Nada para manter, nunca diverge do que existe | y |
| Variação que sobra ao remover valor/opção | **Sai da grade**; a que já tem pedido **fica, pausada**, e a tela nomeia quais | `order_items.variant_id` é FK `NO ACTION`; histórico não pode quebrar | y |
| Preço padrão vazio na geração | Linha nasce **ativa e sem preço**, marcada "sem preço a variação não entra na loja"; publicar continua bloqueado por `validateProduct` | Respeita "nasce ativa" sem deixar vender sem preço | y |
| A1 — "valores já venham auto preenchidos" | Ao escolher um nome conhecido, aparecem até **3 conjuntos** de valores mais usados daquele nome (o conjunto de cada produto, agrupado pela dobra, ordenado pelo nº de produtos), cada um como um botão que aplica o conjunto inteiro e diz em quantos produtos aparece; e os valores individuais como **chips clicáveis**. Nada é acrescentado sem clique. *Antes*: um botão "Usar os N valores" com a **união** do catálogo — 50 valores para "Tamanho" no banco local (`BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro`) | Acrescentar sozinho geraria linhas que a peça não tem. A união junta escalas que não convivem numa peça ("aro 9" e "45cm"); o conjunto que outra peça usa é o que um clique deve aplicar | **decidido em 2026-10-26 pela recomendação do QA, confirmar** |
| A2 — Ordem das sugestões | Nome: mais usado primeiro (nº de produtos), empate alfabético pt-BR. Valores (chips): pela ordem em que aparecem no produto que mais usa aquele nome; os demais depois, por uso. **Conjuntos**: mais usado primeiro (nº de produtos), empate pela primeira aparição; cada conjunto na grafia e na ordem do primeiro produto que o usou | "3,5 cm, 4,5 cm, 5,5 cm" precisa sair na ordem de tamanho, não alfabética | n (a ordem dos conjuntos: **decidido em 2026-10-26 pela recomendação do QA, confirmar**) |
| A3 — Nome igual com grafia diferente ("tamanho" × "Tamanho") | Agrupados pela dobra de busca do painel (`dobrarTexto`); exibe a grafia mais usada | Uma régua de igualdade de texto já existe; segunda régua divergiria | n |
| A4 — Acrescentar uma **nova opção** a um produto que já tem linhas | As linhas existentes **ganham o primeiro valor** da nova opção (mantendo preço, estoque, SKU, imagem); as demais combinações nascem com os padrões | Sem isso, toda linha viraria órfã e seria apagada — perderia preços digitados | n |
| A5 — Remover uma **opção inteira** | Para cada combinação restante, a **primeira** linha existente (ordem da grade) que casa nas opções restantes sobrevive, sem a chave removida; as outras são órfãs (regra acima) | Preserva os preços já digitados em vez de recriar tudo | n |
| A6 — Peso padrão | Copia `weight_kg` do produto quando > 0; senão `null` (a linha herda na cotação como hoje) | Mesmo critério do preço | n |
| A7 — Estoque das linhas novas | `0` (como `applyRegenerate` faz hoje) | Usuário não pediu estoque padrão | n |
| A8 — Upload de imagem pelo modal | Usa o **mesmo** motor da aba Mídia (`uploadProductImages`); a foto entra em `form.images` (aparece na aba Mídia) e já fica escolhida para a linha | Um segundo caminho de upload teria validação própria e divergiria (comentário do PMD-06) | n |
| A9 — O card "Imagem por variação" | **Removido**; a escolha passa a morar só na linha | Duas superfícies escrevendo `image_url` seriam dois donos | n |

**Open questions:** nenhuma sem registro — as marcadas `n` são defaults do agente, a confirmar no handoff.

---

## User Stories

### P1: A grade acompanha as opções sozinha ⭐ MVP

**User Story**: Como Adri, quero que a grade de variações se monte enquanto digito as opções, já ativa
e com os valores padrão do produto, para não ter de regerar nem preencher linha por linha.

**Why P1**: É o atrito maior do cadastro e o pedido central.

**Acceptance Criteria**:

1. **OPV-01** — WHEN a Adri acrescenta um valor a uma opção que tem nome THEN o sistema SHALL criar,
   no mesmo gesto e sem clique adicional, uma linha para cada combinação nova do cruzamento.
2. **OPV-02** — WHEN uma linha é criada por OPV-01 THEN ela SHALL nascer com `is_active = true`,
   `price` = preço padrão do produto (ou `null` se ele for 0), `compare_price` = preço "de" padrão (ou
   `null` se 0), `weight_kg` = peso padrão (ou `null` se 0), `stock = 0`, `sku = null`,
   `image_url = null`.
3. **OPV-03** — WHEN a grade é reconciliada THEN linhas que continuam no cruzamento SHALL permanecer
   **intactas** (mesmo objeto: preço, preço "de", estoque, peso, SKU, imagem e ativa inalterados).
4. **OPV-04** — WHEN a Adri remove um valor THEN as linhas que o usavam SHALL sair da grade; as que já
   existem no banco passam antes pela consulta de pedidos, e as **vendidas** (ou cuja consulta falhou)
   SHALL ficar na grade **pausadas**, com um aviso que nomeia cada uma e diz que elas continuam
   pausadas mesmo que o valor volte às opções e que se reativa pela grade — literal: "Estas variações
   já foram vendidas e ficaram pausadas: 3,5 cm. Continuam pausadas mesmo que o valor volte às opções;
   para vender de novo, ligue “Ativa” na linha da grade." WHEN o valor de uma linha vendida volta às
   opções THEN a linha SHALL continuar pausada (nada religa sozinho — ver *State-transition
   integrity*). **decidido em 2026-10-26 pela recomendação do QA, confirmar** (`BUG-20261026-valor-devolvido-volta-pausado`).
5. **OPV-05** — WHEN a Adri renomeia uma opção THEN as linhas SHALL passar a usar o novo nome, sem
   perder nenhum valor (nenhuma linha removida ou criada).
6. **OPV-06** — WHEN a Adri acrescenta uma nova opção com valores a um produto que já tem linhas THEN
   cada linha existente SHALL receber o **primeiro** valor da nova opção, mantendo seus valores, e as
   demais combinações SHALL nascer conforme OPV-02 (A4).
7. **OPV-07** — WHEN a Adri remove uma opção inteira THEN para cada combinação restante a primeira
   linha existente que casa SHALL sobreviver sem a chave removida, e as demais seguem OPV-04 (A5).
8. **OPV-08** — WHEN o produto é aberto para edição THEN a grade SHALL NOT ser alterada (nenhuma linha
   criada/removida e o formulário não fica "Alterações não salvas"), mesmo que a grade salva diverja
   do cruzamento.
9. **OPV-09** — WHEN as opções mudam sem mudar o cruzamento (ex.: reordenar opções, opção sem valores)
   THEN a grade SHALL permanecer a **mesma referência** de array.
10. **OPV-10** — O botão **"Regerar do cruzamento"**, o diálogo de confirmação dele e a frase do estado
    vazio que o cita SHALL deixar de existir; o estado vazio SHALL dizer "Nenhuma variação. Acrescente
    valores às opções acima e as variações aparecem aqui."

**Independent Test**: Num produto com preço R$ 89,90, preço "de" R$ 120,00 e peso 0,05 kg, criar
"Tamanho" com "3,5 cm, 4,5 cm" — duas linhas ativas aparecem com 89,90 / 120,00 / 0,05.

---

### P1: Imagem da variação na própria linha ⭐ MVP

**User Story**: Como Adri, quero escolher a foto de cada variação na linha dela, podendo enviar uma
foto nova ali mesmo.

**Why P1**: Pedido explícito; elimina o card separado.

**Acceptance Criteria**:

1. **OPV-11** — Cada linha da grade SHALL ter um botão de imagem de **48 × 48 px** (`h-12 w-12`) na
   mesma linha da variação: miniatura da imagem escolhida, ou um marcador vazio quando usa a principal,
   com nome acessível "Imagem de <variação>".
2. **OPV-12** — WHEN a Adri toca no botão THEN SHALL abrir um modal com **todas** as imagens do produto
   (`form.images`, na ordem da galeria), a opção **"Usar a principal"** e a imagem atual marcada.
3. **OPV-13** — WHEN a Adri escolhe uma imagem (ou "Usar a principal") THEN o `image_url` da linha SHALL
   ser atualizado (`null` para a principal) e o modal SHALL fechar.
4. **OPV-14** — O modal SHALL ter **"Adicionar imagens"**, que envia pelo mesmo motor da aba Mídia;
   WHEN o envio termina THEN as fotos SHALL entrar na galeria do produto (visíveis na aba Mídia) e a
   primeira enviada SHALL ficar escolhida para a linha.
5. **OPV-15** — WHILE um envio do modal está em curso THEN o salvar do produto SHALL ficar desabilitado
   (mesmo sinal `onUploadingChange` da galeria); WHEN o envio falha THEN SHALL aparecer a mensagem de
   `uploadFailureMessage` e nada mais muda.
6. **OPV-16** — O card **"Imagem por variação"** SHALL deixar de existir (A9).

**Independent Test**: Tocar na imagem da linha "4,5 cm", enviar `foto.jpg` pelo modal — ela aparece na
aba Mídia e na miniatura da linha.

---

### P2: Nomes e valores sugeridos do catálogo

**User Story**: Como Adri, quero que o nome da opção e os valores que já uso em outros produtos me
sejam sugeridos, para não digitar "3,5 cm, 4,5 cm, 5,5 cm" de novo.

**Why P2**: Acelera muito, mas a grade automática (P1) já entrega valor sozinha.

**Acceptance Criteria**:

1. **OPV-17** — O campo "Eixo N" SHALL se chamar **"Nome da opção"**, com o botão **"Adicionar opção"**
   e o resumo **"N de 3 opções"**; o campo de valores mantém **"Valores"**. Nenhum texto do editor
   SHALL usar a palavra "eixo".
2. **OPV-18** — WHEN a Adri foca/digita no "Nome da opção" THEN SHALL ver os nomes usados no catálogo
   que casam com o que digitou (pela dobra de busca), ordenados conforme A2, e poder escolher um ou
   manter texto livre.
3. **OPV-19** — WHEN o nome da opção casa com um nome conhecido THEN SHALL aparecer, sob "Conjuntos
   mais usados", até **3 conjuntos** de valores daquele nome (A1, A2), cada um um botão com os valores
   e "em N produtos" ("em 1 produto" no singular), e, sob "Valores usados em outros produtos", os
   valores individuais como chips. WHEN um conjunto é tocado THEN os valores dele que a opção ainda
   não tem (pela dobra) SHALL ser acrescentados de uma vez, na ordem do conjunto (respeitando OPV-01);
   WHEN um chip é tocado THEN só aquele valor. Os chips SHALL continuar visíveis **enquanto houver
   sugestão ainda não usada** (excluídos pela dobra os valores já presentes), e não só com a opção
   vazia; o conjunto que a opção já tem inteiro sai e dá lugar ao seguinte. Não há botão de usar a
   união do catálogo. **decidido em 2026-10-26 pela recomendação do QA, confirmar** (`BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro`,
   `BUG-20261026-sugestao-de-valores-some-no-primeiro-clique`).
4. **OPV-20** — WHEN a Adri digita no campo de valores THEN SHALL ver os valores conhecidos daquele nome
   que casam e ainda não estão na opção (pela dobra). A mesma exclusão vale para os chips e os
   conjuntos de OPV-19, e o acréscimo também compara pela dobra: "3,5 CM" já é "3,5 cm". **decidido em 2026-10-26 pela recomendação do QA, confirmar**.
5. **OPV-21** — WHEN a leitura das sugestões falha ou ainda não chegou THEN o editor SHALL funcionar
   como texto livre, sem erro bloqueante.
6. **OPV-22** — WHEN um produto é salvo THEN as sugestões SHALL refletir o salvamento na próxima
   abertura do editor (a leitura é invalidada por quem grava produto).

**Independent Test**: Num produto novo, digitar "tam" → escolher "Tamanho" → tocar no conjunto
"3,5 cm, 4,5 cm, 5,5 cm" → três linhas ativas na grade.

---

## Edge Cases

- **OPV-23** — WHEN duas opções têm o mesmo nome (pela dobra) THEN o editor SHALL mostrar "Já existe
  uma opção com este nome." na segunda e a grade SHALL NOT ser reconciliada enquanto o conflito durar.
- **OPV-24** — WHEN uma opção tem valores e o nome é apagado (temporariamente) THEN a grade SHALL NOT
  perder linhas; ao digitar um nome de novo, OPV-05 vale.
- **OPV-25** — WHEN a consulta de pedidos de OPV-04 responde depois de outra edição THEN o resultado
  SHALL ser aplicado por **id** sobre a grade atual (nunca restaurar um estado anterior).
- **OPV-26** — WHEN o produto não tem nenhuma imagem THEN o modal SHALL mostrar só "Usar a principal" e
  "Adicionar imagens", com a frase "Este produto ainda não tem imagens."
- **OPV-27** — WHEN uma imagem escolhida por uma linha é removida da galeria THEN a linha SHALL voltar a
  usar a principal (`clearMissingVariantImages`, comportamento atual mantido).
- **OPV-28** — O botão de imagem e os itens do modal SHALL ter alvo ≥ 44 px, e a grade em 390 px SHALL
  rolar dentro do próprio contêiner, sem rolagem horizontal do `body`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OPV-01..10 | P1: grade automática | Design | Pending |
| OPV-11..16 | P1: imagem na linha | Design | Pending |
| OPV-17..22 | P2: sugestões | Design | Pending |
| OPV-23..28 | Edge cases | Design | Pending |

**Coverage:** 28 total, 0 mapped to tasks, 28 unmapped ⚠️ (mapeados no `tasks.md`).

---

## Implicit-requirement sweep (Large)

| Dimensão | Requisito |
| --- | --- |
| Input validation & bounds | Máx. 3 opções (existente), valores deduplicados (`parseOptionValues`, existente), nome duplicado OPV-23 |
| Failure / partial-failure | Consulta de pedidos falha ⇒ pausa (OPV-04); upload falha (OPV-15); sugestões falham (OPV-21) |
| Idempotency / retry | Reconciliar com o mesmo cruzamento é no-op (OPV-09) |
| Auth boundaries | N/A because só admins alcançam a tela, e as leituras/gravações usam as policies existentes de `products`/`product_variants`/storage |
| Concurrency / ordering | OPV-25 |
| Data lifecycle | OPV-04/OPV-27; linhas vendidas nunca são apagadas |
| Observability | N/A because é estado de formulário no cliente; nenhuma métrica nova |
| External-dependency failure | Storage no upload (OPV-15) |
| State-transition integrity | Ativa/pausada: só OPV-02 (nasce ativa) e OPV-04 (vendida órfã ⇒ pausada) mudam `is_active` sozinhos |

## Success Criteria

- [ ] Cadastro de produto com 2 opções × 3 valores do catálogo: 6 linhas ativas com os padrões, sem
      clicar em gerar e sem digitar nenhum valor.
- [ ] Zero linha com pedido apagada pela reconciliação (provado por teste com linha vendida).
- [ ] Imagem da variação escolhida e enviada pela linha, provada em navegador em 390 e 1440.
