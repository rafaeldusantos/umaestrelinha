# 35 · Clientes e pedidos da Nuvemshop — o espelho da operação

> **Revisada em 2026-08-30**: a fonte deixou de ser a API e passou a ser **dois CSV exportados do
> painel**. O plano da loja é o Essencial, e os escopos `read_orders`/`read_customers` exigem os
> planos Escala ou Next. **Toda medida citada aqui está em [`medicao.md`](medicao.md)**, feita contra
> os arquivos reais e contra os 692 produtos do catálogo.

## Problem Statement

A feature `21` trouxe da Nuvemshop **só o catálogo**, por decisão deliberada de escopo. O resultado é
um painel que sabe **o que a loja vende** e não sabe **para quem já vendeu**: `/admin/pedidos` mostra
8 pedidos de teste e `/admin/clientes` mostra 4 fichas, enquanto a operação real da Adri — **35
pedidos, 59 itens, 33 clientes, R$ 15.282,90 entre jul/2025 e ago/2026** — vive numa plataforma que a
loja nova está substituindo. Sem esse histórico, o painel da `34` opera no vazio e o cutover não pode
acontecer: não se desliga a Nuvemshop enquanto os pedidos abertos só existem lá.

## Goals

- [x] Os 35 pedidos e as 33 clientes espelhados no Supabase, com **data, valor e itens da época** —
      não recalculados pelo catálogo de hoje.
- [x] Um **de-para de status auditável**, derivado do vocabulário em português do CSV, com toda
      combinação declarada e **aborto** em combinação desconhecida.
- [x] Os pedidos abertos chegam operáveis: os **4** que ainda esperam material entram nas filas de
      `/admin/pedidos` (decisão de cutover do usuário, 2026-08-30).
- [x] A cliente que volta e se cadastra com o mesmo e-mail **encontra o histórico** em Minha conta.
- [x] Re-executar o import **não desfaz** o trabalho que a Adri já fez no painel.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ler `/orders` e `/customers` da API | 403 `Missing required scope`, e o plano Essencial não dá acesso a "Aplicativos sob medida". Medido em 2026-08-30 |
| **Os pedidos `#100–134`** | São de **outro negócio** — artigos religiosos — que ocupou a mesma loja Nuvemshop até jun/2025. Zero e-mail em comum com a Uma Estrelinha. Decisão do usuário |
| Os 32 clientes exclusivos de `#100–134` e os 14 sem pedido | Pelo mesmo corte, e por `AD-023`: ficha de quem não pediu ficha não é escrita |
| Importar cupons | O CSV traz `Cupom de Desconto` como texto e o desconto já vem como valor. Cupom histórico não é reutilizável |
| Escrever de volta na Nuvemshop | O import é **uma via**. A origem segue intacta — mesma regra da `21` |
| Sincronização contínua / webhook | Espelho **one-shot re-executável**, como o catálogo |
| Reprocessar pagamento no Mercado Pago | Pagamento importado é **fato consumado**: nenhum `mp_payment_id`, nenhum webhook, nenhuma cobrança |
| E-mail transacional para pedido importado | Dispararia e-mail para quem comprou em 2025. `send-email` não é alcançada por nenhum caminho desta feature |
| Casar item **por SKU**, de qualquer forma | `dedupeSkus` (feature 21) fabrica a unicidade local nulificando o SKU de todas as variações menos a primeira. Medido: subia o casamento de 40,7% para 74,6% e ligava "Corrente Veneziana" a "Corrente Singapura" |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Corte do recorte | Só `#135–169` | Dois negócios no mesmo arquivo, corte exato entre `#134` e `#135`, zero e-mail em comum | **y** (usuário, 2026-08-30) |
| Os 4 PIX expirados entram | `pending` / `expired` | Aconteceram. O painel não os trata como fila, e omiti-los apagaria quatro tentativas reais | **y** (usuário) |
| Chave de idempotência do pedido | `Identificador do pedido` do CSV → `orders.nuvemshop_id` | É o id real da Nuvemshop, estável, e sobrevive a renomeação — mesmo raciocínio da migration `20260809120000` | y |
| **Item não tem id na origem** | Itens de pedido importado são **imutáveis**: gravados no INSERT, nunca atualizados | Sem id, qualquer chave de update seria posicional ou por nome — as duas quebram em silêncio numa reexportação. `--reimportar-itens` apaga e regrava o conjunto inteiro do pedido | y |
| `Recusado` é ambíguo | PIX vencido sem pagamento → `expired`; cartão com parcelas → `rejected` | O próprio arquivo desfaz: `Vencimento do pagamento` vs. `Parcelas`. Juntar os dois apagaria a diferença entre "não pagou" e "cartão negado" | y |
| Material é **inferido**, não observado | `initialMaterialStatus`, com dois cortes (terminal e pagamento) | O CSV não tem o dado. Inferir e **declarar que inferiu** é honesto; adivinhar em silêncio não | y |
| Cliente não vira linha em `customers` | Derivada dos pedidos | `AD-023`. Escrever marcaria `has_account = true` — mentira sobre gente que nunca criou conta | y |
| Preço do item é o da época | Snapshot, nunca releitura do catálogo | Preço de 2025 não é preço de hoje, e releitura faria `subtotal` deixar de fechar |  y |

**Open questions:** nenhuma. **Nenhum bloqueio externo** — os dois arquivos estão em mãos.

---

## User Stories

### P1: O histórico chega inteiro ⭐ MVP

**User Story**: Como Adri, quero ver no painel todos os pedidos de joia afetiva que já fiz, com a
data, o valor e os itens que eles tinham na época.

**Acceptance Criteria**:

1. WHEN o import roda sobre o CSV de vendas THEN o sistema SHALL gravar **exatamente 35 linhas** em
   `orders` com `nuvemshop_id` não nulo, uma por pedido de `#135` a `#169`.
2. WHEN o parser lê o arquivo THEN ele SHALL agrupar as **243 linhas em 70 pedidos** pela regra "a
   linha com `Data` preenchida abre um pedido; as seguintes com o mesmo `Número do Pedido` são itens
   dele" — e SHALL falhar se um `Número do Pedido` aparecer sem nenhuma linha-cabeça.
3. WHEN o arquivo é lido THEN ele SHALL ser decodificado como **Latin-1**, e `Não está embalado` SHALL chegar íntegro ao mapeamento. WHEN o arquivo vier em outro encoding THEN a conferência de cabeçalho SHALL falhar nomeando a coluna divergente — o nome quebrado aponta para a causa.
4. WHEN um pedido é gravado THEN `orders.created_at` SHALL ser a `Data` da origem (`dd/mm/yyyy
   hh:mm:ss`), e não a data do import.
5. WHEN um pedido é gravado THEN `subtotal`, `discount`, `shipping_cost` e `total` SHALL vir do
   snapshot, e `total` SHALL bater com o `Total` da origem ao centavo.
6. WHEN os itens são gravados THEN SHALL haver **59 linhas** em `order_items`, com `product_name`,
   `quantity` e `unit_price` da origem.
7. WHEN `Código de rastreio do envio` é lido THEN o sistema SHALL desfazer o escape de planilha
   (`="AD779152389BR"` → `AD779152389BR`, `=""` → `null`) antes de gravar.
8. WHEN o import termina THEN a soma de `unit_price × quantity` de cada pedido SHALL ser conferida
   contra `subtotal` — hoje **zero divergem** — e qualquer divergência SHALL entrar no relatório
   sem abortar.

**Independent Test**: probe SQL contando 35 pedidos e 59 itens, e três pedidos amostrados conferidos
campo a campo contra o CSV.

---

### P2: O de-para de status é auditável e fecha ⭐ MVP

**Acceptance Criteria**:

1. WHEN a origem diz `Status do Pedido = Cancelado` THEN `orders.status` SHALL ser `'cancelled'`,
   **independente** dos outros dois eixos.
2. WHEN não está cancelado THEN `orders.status` SHALL sair de `Status do Envio`: `Entregue` →
   `delivered`; `Enviado` → `shipped`; `Não está embalado` e `Pronto para enviar` → `'paid'` se o
   pagamento mapear para `approved`, senão `'pending'`.
3. WHEN qualquer pedido é mapeado THEN `orders.status` SHALL **nunca** receber `'separating'`.
4. WHEN `Status do Pagamento` é `Confirmado` THEN `payment_status` SHALL ser `approved`; WHEN é
   `Pendente` THEN `pending`.
5. WHEN `Status do Pagamento` é `Recusado` THEN o destino SHALL ser `expired` se `Vencimento do
   pagamento` estiver preenchido **e** `Data de pagamento` vazia, e `rejected` caso contrário.
6. WHEN qualquer um dos três eixos traz valor **fora** do vocabulário declarado THEN o import SHALL
   **abortar** com relatório parcial e código de saída ≠ 0, nomeando o valor e o `Número do Pedido`
   — nunca escolher um padrão.
7. WHEN o import termina THEN o relatório SHALL trazer a **distribuição observada**: cada tripla
   encontrada, quantas vezes, e o par de destino — e a soma das triplas SHALL ser igual ao número de
   pedidos lidos. Hoje: **5 triplas, somando 35**.
8. WHEN um pedido é gravado THEN `nuvemshop_status`, `nuvemshop_payment_status` e
   `nuvemshop_shipping_status` SHALL guardar os três valores **crus em português**, e **nenhum**
   arquivo de `apps/**` SHALL lê-las.

**Independent Test**: tabela exercida caso a caso, com **sensor** — uma tripla inventada
(`Status do Envio = 'Teletransportado'`) tem de derrubar a suíte.

---

### P3: Os pedidos abertos ficam operáveis (o cutover) ⭐ MVP

**Acceptance Criteria**:

1. WHEN um pedido importado tem `status` `'pending'` ou `'paid'` THEN ele SHALL aparecer nas visões e
   tiles de `/admin/pedidos` pelos **mesmos predicados** dos pedidos nascidos aqui — nenhum filtro
   por origem.
2. WHEN um pedido tem `payment_status = 'approved'`, `status` não terminal, e ao menos um item cujo
   produto local exige material THEN `material_status` SHALL ser `'aguardando_material'`, derivado
   por `initialMaterialStatus` de `@estrelinha/core/material` — a **mesma** função do checkout.
3. WHEN `status` é `'shipped'`, `'delivered'` ou `'cancelled'` THEN `material_status` SHALL ser
   `'nao_aplicavel'`, **mesmo que os itens exijam material** — a máquina não tem estado final, e o
   pedido ficaria na fila para sempre.
4. WHEN `payment_status` **não** é `'approved'` THEN `material_status` SHALL ser `'nao_aplicavel'`,
   mesmo com `status = 'pending'`: cobrar material de quem não pagou é fila falsa. Sem este corte a
   fila nasceria com **8** pedidos em vez de **4**.
5. WHEN o import termina THEN exatamente **4** pedidos SHALL estar em `'aguardando_material'` —
   `#163`, `#165`, `#166`, `#169` — e o relatório SHALL listá-los nominalmente.
6. WHEN `material_status` é inferido THEN o sistema SHALL gravar `order_notes` declarando que o
   estado foi **inferido dos itens**, não observado na origem.

**Independent Test**: `/admin/pedidos` em 390×844 e 1440, conferindo `AD-024` — subtítulo, aba
`Precisa de ação` e os quatro tiles concordam entre si.

---

### P4: Item casa com o catálogo quando dá, e nunca casa errado ⭐ MVP

**User Story**: Como Adri, quero que o item do pedido aponte para o produto certo quando isso for
possível — e prefiro item sem link a item apontando para o produto errado.

**Acceptance Criteria**:

1. WHEN um item é mapeado THEN o sistema SHALL tentar casar nesta ordem, e **só nela**: **nome
   completo exato** → **nome sem o grupo de parênteses final balanceado**.
2. WHEN o nome não resolve THEN o item SHALL ser órfão — `variant_id = null`,
   `product_id = 'nuvemshop:<nome normalizado>'` — **mesmo que o `SKU` exista no catálogo local e
   pareça único**. A unicidade local é fabricada por `dedupeSkus`, que nulifica o SKU de todas as
   variações menos a primeira; medido, casar por ele ligava "Corrente Veneziana" a "Corrente
   Singapura". O candidato SHALL sair no relatório marcado `(NÃO aplicado)`.
3. WHEN o nome tem parênteses **aninhados** (`(Folheado a ouro (Prata 925))`) THEN o recorte SHALL
   ser **balanceado**, removendo o grupo inteiro — recorte ingênuo pelo primeiro `(` derruba a taxa
   de casamento de 50,8% para 40,7%, medido.
4. WHEN um item casa THEN `product_id` SHALL ser o uuid local e `variant_id` SHALL ser o uuid da
   variação quando ela também casar; quando não casar, `variant_id` SHALL ser `null`.
5. WHEN um item é órfão THEN nome, preço e quantidade SHALL ser preservados intactos, e o item SHALL
   entrar na seção `itens órfãos` do relatório.
6. WHEN o import termina THEN a taxa de casamento SHALL ser **≥ 25%** no total (medido: 24 de 59, 40,7%) e **100%** nos 4 pedidos da fila de material (medido: 19 de 19). O piso é **detector de ordem errada** — catálogo vazio produz 0% e passaria em verde sem ele —, e não alvo de qualidade: apertá-lo até encostar na medição faria um único produto renomeado derrubar o gate.

**Independent Test**: teste puro sobre uma fixture com os dois arranjos de parênteses, o SKU ambíguo
e o órfão; e conferência da taxa contra o catálogo real no `validation.md`.

---

### P5: A cliente que volta encontra o histórico

**Acceptance Criteria**:

1. WHEN um pedido é importado THEN `orders.customer_id` SHALL ser `null` e `customer_email` SHALL ser
   o e-mail da origem — a pessoa é **derivada** por `customer_directory` (`AD-023`), sem escrita em
   `customers`.
2. WHEN o import termina THEN `customer_directory` SHALL devolver **33** pessoas novas, todas com
   `has_account = false`.
3. WHEN alguém cria conta em `auth.users` com e-mail que já aparece em `orders.customer_email`
   (comparado por `lower()`) THEN `handle_new_customer` SHALL, além de criar a ficha, preencher
   `customer_id` de **todos** os pedidos daquele e-mail que estavam nulos.
4. WHEN isso acontece THEN a pessoa SHALL passar a aparecer com `has_account = true`, **sem linha
   duplicada**, e `useOrdersByCustomerId` SHALL devolver os pedidos importados em Minha conta.
5. WHEN ninguém se cadastra THEN nada muda, e a data de entrada da convidada SHALL ser a do
   **primeiro pedido histórico** dela.

---

### P6: O telefone e o documento sobrevivem

**Acceptance Criteria**:

1. WHEN um pedido é gravado THEN `orders.customer_phone` e `orders.customer_document` SHALL receber
   `Telefone` e `CPF / CNPJ` normalizados para dígitos. Medido: **0 dos 35 estão sem telefone**.
2. WHEN `CPF / CNPJ` vem como `-` ou vazio THEN a coluna SHALL ficar `null`, não a string literal.
3. WHEN `customer_directory` deriva uma convidada THEN `phone` e `cpf` SHALL vir do pedido **mais
   recente** daquele e-mail que os tenha.
4. WHEN o painel monta a cobrança por WhatsApp de um pedido importado THEN `chargeMaterialUrl` SHALL
   produzir `https://wa.me/<numero>?text=…`, e não a forma sem número.

---

### P7: Re-executar não desfaz trabalho

**Acceptance Criteria**:

1. WHEN o import roda uma segunda vez THEN SHALL criar **zero** duplicata — casamento por
   `orders.nuvemshop_id`, com índice único.
2. WHEN um pedido **já existe** THEN a re-execução SHALL deixar intactas as colunas operacionais —
   `status`, `payment_status`, `material_status`, `material_tracking_code`, `tracking_code`,
   `shipping_carrier`, `cancel_reason`, `paid_at` — e atualizar só proveniência e snapshot.
3. WHEN um pedido já existe THEN seus **itens não são tocados** — o CSV não tem id de item, e
   qualquer casamento posicional erraria em silêncio numa reexportação.
4. WHEN `--ressincronizar-estado` é passada THEN as colunas operacionais SHALL ser sobrescritas, e o
   relatório SHALL nomear os pedidos afetados.
5. WHEN `--reimportar-itens` é passada THEN os itens do pedido SHALL ser **apagados e regravados** em
   bloco, e o relatório SHALL nomear os pedidos afetados.
6. WHEN o import termina THEN `report.balance` SHALL fechar para pedidos e itens, e não fechar SHALL
   produzir código de saída ≠ 0.

---

## Edge Cases

- WHEN uma linha tem `Número do Pedido` fora de `135..169` THEN ela SHALL ser **descartada antes do
  mapeamento** e contada em `fora do recorte` — 35 pedidos e 184 linhas hoje.
- WHEN um pedido não tem e-mail THEN `customer_email` SHALL receber
  `sem-email+<nuvemshop_id>@importado.invalid`. **Nenhum dos 35 cai neste caso**, e o teste existe
  para o dia em que cair.
- WHEN um `Número do Pedido` colide com um `order_number` já no banco THEN o import SHALL abortar
  nomeando os dois. O prefixo `NS-` afasta a colisão com o `NP-` da loja.
- WHEN `Motivo do cancelamento` vem preenchido THEN `cancel_reason` SHALL receber o texto como está —
  já vem em português (`"O cliente mudou de ideia"`, `"Venda de teste"`, `"Outro motivo"`). Nenhum
  ocorre no recorte.
- WHEN o catálogo local está **vazio** (estado de hoje: 0 produtos) THEN o import SHALL avisar em log
  **antes** da fase e todos os 59 itens ficarão órfãos, reprovando o piso de 50% de `P4`.
- WHEN o CSV traz uma coluna a mais ou a menos THEN o parser SHALL falhar nomeando o cabeçalho
  esperado — 60 colunas, primeira `Número do Pedido`.

---

## Implicit-Requirement Dimensions

| Dimensão | Requisito |
| --- | --- |
| Input validation & bounds | `ESP-13` (vocabulário fechado, aborta), `ESP-30` (forma do arquivo: 60 colunas, Latin-1) |
| Failure / partial-failure | Qualquer `throw` para o import com relatório parcial e exit ≠ 0 (`CAT-06`) |
| Idempotency / retry / duplicate | `ESP-26`..`ESP-29`; itens **imutáveis** por falta de id na origem |
| Auth boundaries & rate limits | N/A para a leitura — é arquivo local. A escrita segue com service role, fora do navegador (`CAT-09`) |
| Concurrency / ordering | Sequencial, à mão. **Ordem obrigatória**: catálogo antes de pedidos |
| Data lifecycle / expiry | N/A — pedido importado é registro permanente; `anonymize_customer` já existe e continua valendo |
| Observability | `ESP-14` (distribuição observada), `ESP-20` (fila nominal), `ESP-08` (órfãos), `ESP-31` (taxa de casamento) |
| External-dependency failure | N/A — não há chamada de rede no caminho de pedidos. O 403 da API está em Out of Scope |
| State-transition integrity | `ESP-09`..`ESP-19` — o de-para, a proibição de `separating`, e os **dois** cortes de material |

---

## Requirement Traceability

| ID | Story | Task | Status |
| --- | --- | --- | --- |
| ESP-01 | P1: parser agrupa 243 linhas em 70 pedidos | T01 | In Tasks |
| ESP-02 | P1: Latin-1 e as 60 colunas conferidas | T01 | In Tasks |
| ESP-03 | P1: 35 pedidos gravados, recorte aplicado | T05, T09 | In Tasks |
| ESP-04 | P1: `created_at` é a `Data` da origem | T05 | In Tasks |
| ESP-05 | P1: dinheiro do snapshot, `total` fecha | T05 | In Tasks |
| ESP-06 | P1: 59 itens com nome/qtd/preço da época | T05 | In Tasks |
| ESP-07 | P1: rastreio desescapado do Excel | T01 | In Tasks |
| ESP-08 | P4: item órfão preserva snapshot e é reportado | T06 | In Tasks |
| ESP-09 | P2: `Cancelado` vence os outros eixos | T04 | In Tasks |
| ESP-10 | P2: `status` de `Status do Envio` | T04 | In Tasks |
| ESP-11 | P2: `separating` nunca é produzido | T04 | In Tasks |
| ESP-12 | P2: `Confirmado`/`Pendente`/`Recusado` | T04 | In Tasks |
| ESP-13 | P2: valor desconhecido **aborta** | T04 | In Tasks |
| ESP-14 | P2: distribuição observada soma 35 | T08, T09 | In Tasks |
| ESP-15 | P2: nota para estado inferido | T07 | In Tasks |
| ESP-16 | P2: proveniência não lida por `apps/**` | T02, T03 | In Tasks |
| ESP-17 | P3: importado entra nas filas sem filtro | T10 | In Tasks |
| ESP-18 | P3: material por `initialMaterialStatus` | T05 | In Tasks |
| ESP-19 | P3: os **dois** cortes — terminal e pagamento | T05 | In Tasks |
| ESP-20 | P3: fila nominal de 4 no relatório | T07, T08 | In Tasks |
| ESP-21 | P5: pedido nasce sem `customer_id`; 33 derivadas | T05, T09 | In Tasks |
| ESP-22 | P5: trigger adota pedidos por e-mail | T03, T09 | In Tasks |
| ESP-23 | P5: uma linha só em `customer_directory` | T03, T09 | In Tasks |
| ESP-24 | P6: telefone e documento no pedido | T02, T05 | In Tasks |
| ESP-25 | P6: `customer_directory` deriva telefone | T02, T09 | In Tasks |
| ESP-26 | P7: idempotência por `nuvemshop_id` | T02, T07, T09 | In Tasks |
| ESP-27 | P7: colunas operacionais preservadas | T07, T09 | In Tasks |
| ESP-28 | P7: itens imutáveis; `--reimportar-itens` | T07 | In Tasks |
| ESP-29 | P7: `balance` fecha, exit ≠ 0 | T08 | In Tasks |
| ESP-30 | Edge: forma do arquivo, e-mail ausente, catálogo vazio | T01, T08 | In Tasks |
| ESP-31 | P4: ordem de casamento, SKU ambíguo é órfão, piso de 50% | T06 | In Tasks |

**Coverage:** 31 total, **31 mapeados**, 0 sem task.

---

## Success Criteria

- [x] `select count(*) from orders where nuvemshop_id is not null` == **35**; `order_items` == **59**.
- [x] `customer_directory` ganha **33** pessoas, todas `has_account = false`.
- [x] Distribuição observada: **5 triplas somando 35**, sem nenhuma caindo em padrão silencioso.
- [x] Exatamente **4** pedidos em `aguardando_material`: `#163`, `#165`, `#166`, `#169`.
- [x] Taxa de casamento **≥ 50%** no total e **100%** nos 4 da fila.
- [x] Segunda execução: `criados: 0`, `count(*)` inalterado, e um `status` alterado à mão sobrevive.
- [x] `/admin/pedidos` em 390×844: subtítulo, aba e tiles concordam (`AD-024`).
- [x] Cliente de teste cadastrada com e-mail histórico vê os pedidos antigos em Minha conta.
