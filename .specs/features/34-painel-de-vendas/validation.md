# Validation — 34 · Painel de vendas (Pedidos e Clientes)

> **O autor é o verificador.** A execução foi inline, como na `33`. Toda evidência abaixo é medida —
> comando, saída e número —, e os guardas novos tiveram a sensibilidade provada por injeção de
> falha. Isso reduz o viés; não o elimina. Entra na mesma fila das `22`, `28`, `32` e `33`.

Data: **2026-08-29** · Banco local: `uma-estrelinha-store` (API 54341) · Navegador: Chromium

---

## 1. A validação que veio ANTES do código

O pedido foi "valide antes de implementar". Dez achados, todos medidos.

### Confirmado — a spec estava certa

| Alegação | Como foi medido |
| --- | --- |
| `estrelinha-admin-amber` / `-emerald` não existem | `grep` em `styles.css` e `tailwind.preset.ts`: ausentes dos dois |
| "Limpar filtros" ignora status e material | `AdminOrdersPage.tsx:147-149`, na limpeza **e** na condição de exibição |
| CSV exporta a página | `exportOrdersCsv(orders)` com `PAGE_SIZE = 20` |
| `fetchStatusCounts` sem `where` nem paginação | `useAdminOrders.ts:34-55` |
| `orders.notes` existe e não está em `DbOrder` | migration inicial, linha 88 |
| `addresses` nunca lida pelo painel · `customers.email` sem único | `grep` + DDL |
| 699 / 232 / 54 linhas | `wc -l` |
| 7 pranchas no Paper | página `34 · Pedidos e Clientes` |

### Achados contra os artefatos

**1. Baselines do `tasks.md` estavam velhas (pré-`33`).** Mandavam bater store 1903/130, core 1363/52,
functions 337/6, total 5494/301. Medido na hora: core **1418/55**, functions **350/7**, backoffice
**1556/97**, store **1922/132** — total **5581/307**, que é o que o `CLAUDE.md` já dizia.

**2. `OrderDetailDialog.test.tsx` tinha 8 casos, não 12.** A queda autorizada é 8.

**3. 🔴 `orders.status` recusava `'separating'`.** Não estava na spec. Provado contra o banco local:

```
ERROR: new row for relation "orders" violates check constraint "orders_status_check"
CHECK (status = ANY (ARRAY['pending','paid','shipped','delivered','cancelled']))
```

`ORDER_STATUSES` declara seis estados, `STATUS_LABELS` rotula "Em Separação", `StatusBadge` pinta, e
três linhas das pranchas mostram. **Toda gravação falhava com 23514**, e nada acusava — o tipo é
`text`, o `tsc` acha certo, os testes mockam o client. Terceira ocorrência da família `AD-012`.
`PED-29` depende dele. Entrou na migration.

**4. `orders_customer_email_idx` seria índice duplicado.** `idx_orders_email` já existe desde
`20260415090935:75`. Removido do plano.

**5. A justificativa do índice de material era falsa.** `idx_orders_material_status` já existe,
**parcial** em `material_status <> 'nao_aplicavel'`. O composto entrou com o mesmo predicado.

**6. `contrastRatio` era só da loja.** Segundo app consumidor ⇒ `@estrelinha/core/color`.

**7. A régua do guarda não pode ser preset ∪ styles.css.** O preset mapeia a chave `muted` →
`--estrelinha-admin-text-muted`; a união aprovaria `text-estrelinha-admin-text-muted`, classe que o
Tailwind **não emite**. A régua é o conjunto de **chaves do preset**.

**8. `fetchAllFiltered` devia usar `readAllPages`.** Existe desde a `33` e é o dono de "lê tudo ou falha".

**9. 🔴 A cliente convidada não existe em `customers`.** Aquela tabela só recebe linha do trigger
`on_auth_user_created_customer`, sobre `auth.users`; o checkout de convidada grava
`customer_id = null` e **não cria cadastro**. Consequências: a tela de Clientes mostrava só quem criou
conta, e a spec descreve o defeito da duplicata **ao contrário** — "comprando como convidada duas
vezes vira duas linhas" é falso, ela vira **zero** linhas. `CLI-01`, `CLI-06` e `CLI-14` não teriam o
que ler. Resolvido pela view `customer_directory`.

**10. Banco local sem massa** (0 pedidos, 1 cliente). Semeada massa descartável para os probes.

---

## 2. A cor que não existia (`PED-01`, `PED-02`, `PED-03`)

**Os valores da prancha não passavam na própria régua da prancha.** `#B45309` entrega:

| Fundo | Razão |
| --- | --- |
| `card` (#FFFFFF) | 5,02:1 ✅ |
| **o próprio /10 sobre `card`** | **4,39:1 ❌** |
| **o próprio /10 sobre `bg`** | **4,20:1 ❌** |

O selo é `bg-<token>/10 text-<token>`: o texto **não** está sobre o card, está sobre o token a 10%
sobre o card. Medir contra o card puro superestima. Valores adotados, com o pior caso dos quatro fundos:

| Token | Light | pior caso | Dark | pior caso |
| --- | --- | --- | --- | --- |
| `amber` | `#A2490A` | **4,98:1** | `#F59E0B` | **6,91:1** |
| `emerald` | `#047857` | **4,57:1** | `#34D399` | **7,64:1** |
| `text-muted` | `#726591` (era `#9B8EC4`, 2,97:1) | **5,27:1** | `#9B8EC4` (era `#7B6FA8`, 3,92:1) | **5,91:1** |

O `text-muted` do **dark** também reprovava, e a task só mandava "medir e ajustar se não passar".

### Sensibilidade do guarda, provada por injeção

Removidos os dois tokens do preset e rodado `adminTokens.test.ts`:

```
Tests  4 failed | 15 passed (19)
FAIL  a leitura do preset encontrou o mapa inteiro
FAIL  nenhuma classe do painel aponta para token inexistente
  + "apps\backoffice\src\entities\order\ui\MaterialStatusBadge.tsx: estrelinha-admin-amber"
  + "apps\backoffice\src\entities\order\ui\MaterialStatusBadge.tsx: estrelinha-admin-emerald"
FAIL  os dois tokens que faltavam agora existem
FAIL  `amber` e `emerald` leem a VARIÁVEL, não um hex
```

Restaurado: 19/19 verdes. O guarda **nomeia o arquivo e a classe**.

O guarda também pegou a si mesmo: a checagem de existência lia só hexes, e
`--estrelinha-admin-border-hover` é `rgba(…)`. Corrigido para separar "nomes declarados" de "mapa de
hexes".

---

## 3. Prova de gravação por HTTP (`TST-06`, `AD-012`)

Contra `http://127.0.0.1:54341/rest/v1`, com JWT de `admin@umaestrelinha.dev`.

| # | Probe | Resultado |
| --- | --- | --- |
| 1 | `orders?select=notes` | `"notes":"Recado da cliente no checkout"` ✅ |
| 2 | `customer_stats` como admin | 3 linhas, com `total_spent` e `material_kinds` ✅ |
| 3 | `customer_directory` inclui convidada | `{"name":"Probe Convidada","has_account":false}` ✅ |
| 4 | `POST customer_notes` como admin | 201 + representação ✅ |
| 5 | `customer_notes` como `anon` | **401** `42501 permission denied` ✅ |
| 6 | `rpc/anonymize_customer` como `anon` | **401** `42501 permission denied` ✅ |
| 7 | `rpc/anonymize_customer` como admin | `{"ok":true,"orders_preserved":2,"had_account":false}` ✅ |
| 8 | pedidos após anonimizar | número, valor e status **intactos**; nome e e-mail em lápide ✅ |

E o defeito do `separating`, provado nos dois sentidos: antes da migration o `update` falhava com
23514; depois, o `insert` com `status='separating'` passa.

**`supabase db reset` do zero**: `45/45` migrations, e os seis objetos da `34` presentes
(`customer_directory`, `customer_stats`, `customer_list`, `order_list`, `customer_notes`,
`anonymize_customer`) mais o `separating` no CHECK.

---

## 4. Navegador real — 390 × 844 e 1440 × 900

`pnpm dev:backoffice`, Chromium, sessão autenticada. **0 erros de console** em todas as telas.

| Tela | Viewport | `body.scrollWidth` | Alvos < 44px |
| --- | --- | --- | --- |
| `/admin/pedidos` | 390 × 844 | **390** (= viewport) | **0** |
| `/admin/pedidos` | 1440 × 900 | 1440 | — |
| `/admin/clientes` | 390 × 844 | **390** | **0** |
| `/admin/clientes` | 1440 × 900 | 1440 | — |
| `/admin/pedidos/:id` | 1440 × 900 | 1440 | — |
| `/admin/clientes/:id` | 1440 × 900 | 1440 | — |

### Três defeitos que só o navegador achou

Nenhum dos três quebrava teste — todos eram números que se contradiziam na mesma tela.

**a) O subtítulo somava conjuntos que se sobrepõem.** Com 8 pedidos, o cabeçalho dizia
"**7** esperando alguma coisa sua" e a aba logo abaixo dizia "Precisa de ação **4**". Os tiles se
sobrepõem: um pedido pago que ainda espera o envelope está em "aguardando" **e** em "a separar".
Passou a usar a união que o servidor já calcula.

**b) O tile "Pago, a separar" contava pedidos ainda travados no material** — contradizendo o próprio
texto dele ("Material já recebido ou não exigido"). Dizia **3**, e o clique trazia **4**. Contador e
filtro passaram a ser o mesmo predicado, com a lista de estados exportada de um lugar só. Com a massa
de QA ele agora diz **0**, que é a verdade: os três pedidos pagos estão todos bloqueados.

**c) Pedido sem material mostrava travessão na coluna de idade.** Todo pedido tem idade; só a fila do
**material** pode estar parada. A idade do pedido foi para a coluna `Pedido` e o `parado há N dias`
para a coluna `Material`, sob o selo — como nas pranchas.

Mais os alvos de toque: as duas ações do cabeçalho (36px), os nomes nos cartões (24px) e os dois
controles do app bar (36px e 24px) foram a 44px. **Depois: zero.**

### Evidência visual

`pedidos-1440-v2.png` · `pedidos-390.png` · `clientes-1440.png` · `clientes-390.png` ·
`pedido-1440.png` · `cliente-1440.png`

O que as capturas confirmam: os quatro selos de material **com cor**; os três degraus de idade
(`há 1 dia` neutro, `há 6 dias`, `parado há 21 dias` em âmbar); as convidadas listadas em Clientes
com o rótulo `convidada`; `Tereza Lins` com `0` pedidos pagos, `—` em Gastou/Ticket e `em aberto` em
âmbar; os dois rastreios em blocos separados com rótulo de direção; o recado da cliente distinto da
nota interna; e o bloco de privacidade escrevendo o que apaga e o que preserva.

---

## 5. Baselines — remedidas na hora, por workspace, com exit code

Cada uma rodada **sozinha**. Duas execuções concorrentes produziram timeouts de 5s em testes que
varrem disco (`routes.test.ts`, `AdminOrdersPage.test.tsx`); os dois passam isolados. É a flake que o
`CLAUDE.md` registra e a razão do `--concurrency=1` no CI.

| Workspace | Antes | Depois | Δ | Exit |
| --- | --- | --- | --- | --- |
| store | 1922 / 132 | **1922 / 132** | — | 0 |
| backoffice | 1556 / 97 | **1756 / 106** | **+200 / +9** | 0 |
| core | 1418 / 55 | **1444 / 57** | **+26 / +2** | 0 |
| functions | 350 / 7 | **350 / 7** | — | 0 |
| catalog-import | 335 / 16 | **335 / 16** | — | 0 |
| **total** | 5581 / 307 | **5807 / 318** | **+226 / +11** | |

**Queda autorizada**: os 8 casos de `OrderDetailDialog.test.tsx`, reescritos em
`AdminOrderPage.test.tsx` com **25** — o mapeamento caso a caso está no topo daquele arquivo.

| Medida | Baseline | Agora |
| --- | --- | --- |
| Tipos | 0 · 0 · 0 | **0 · 0 · 0** |
| Lint | 30 err / 8 warn | **27 err / 5 warn** (store 2/1 · backoffice 25/4) |
| `packages/core/src/payment/**` | intocado | **intocado** (`git status --porcelain` vazio) |

O lint melhorou porque `OrderDetailDialog.tsx` saiu, e com ele três `no-explicit-any`.

---

## 6. O que fica em aberto

- **A `31` e a `32` seguem sem `validation.md`**, e esta é a segunda seguida em que o autor verifica.
- **O corte de 8 dias e o uso do painel no celular continuam a confirmar com a Adri** — a spec os
  marca como assunção, e nada aqui os confirmou. O número mora numa constante só (`STALE_AFTER_DAYS`).
- **Anonimizar preserva os pedidos é decisão jurídica**, não técnica. Implementado como a spec
  declara — e com a correção de limpar também as cópias em `orders`, sem a qual o nome e o e-mail
  continuariam gravados em cada linha de pedido.
- **`BL-008` foi reduzida, não fechada**: `fetchStatusCounts` deixou de existir, e as contagens agora
  são `head: true` no servidor. As outras leituras sem paginação do painel continuam abertas.
- **`material_kinds` sem CHECK** (`BL-015`): um valor fora de `MATERIAL_KINDS` renderiza a chave crua.
  Confirmado por acidente com uma massa de QA errada (`pelo_de_pet` em vez de `pelo_pet`). A
  degradação é a correta — chave crua é melhor que vazio —, e a curadoria segue sendo da dona.

---

## 7. Adendo — a pergunta sobre os itens dos pedidos (2026-08-30)

**Pergunta**: "os pedidos criados nenhum conta os produtos que deveriam estar neles — é bug ou a
massa não tem produtos?"

**Resposta medida**: era a **massa**, e a conferência achou **dois** problemas dela e **um** do código.

```
 order_number | total  | itens | soma_itens
 1027         | 168.00 |     0 |       0.00     ← sem itens
 1029         | 212.00 |     0 |       0.00     ← sem itens
 1033         | 320.00 |     0 |       0.00     ← sem itens
 1036         | 948.00 |     0 |       0.00     ← sem itens
 1037         | 179.00 |     0 |       0.00     ← sem itens
 1042         | 369.55 |     2 |     389.00     ← total não fechava
```

Da massa: cinco dos oito pedidos ficaram sem `order_items`, e o `1042` tinha o total já com o
desconto Pix aplicado mas `pix_discount = 0` — então a tela mostrava `Subtotal 389,00` e
`Total 369,55` **sem linha que explicasse os 19,45**. Corrigidos: os oito pedidos agora reconciliam
(`itens − descontos + frete = total`, zero linhas divergentes), e o bloco de pagamento do `1042`
exibe `Desconto Pix − R$ 19,45`.

**Do código**: `useAdminOrder` engolia o erro da leitura de itens (`itensRes.data ?? []`), e o
comentário ao lado afirmava que a de e-mails "é a única das quatro cujo erro é tolerado" — **o
comentário mentia**, as quatro eram toleradas igual.

É a família do `PED-08` que a feature corrigiu na listagem e deixou passar no detalhe, e aqui ela
tem custo específico: **um pedido sem itens é impossível** — o checkout sempre os grava —, então
`Itens · 0 peças` numa tela de pedido pago é uma afirmação falsa, e é o conteúdo que a folha de
separação leva para a bancada. Imprimir uma folha em branco parecia um pedido vazio.

Agora a tela separa os três casos:

| Situação | O que aparece |
| --- | --- |
| Itens carregados | `Itens · N peças`, a lista |
| Leitura **falhou** | faixa de erro com a mensagem; o cabeçalho **para** de prometer uma contagem |
| Zero itens, **sem** erro | aviso em âmbar: "não é um estado esperado — vale conferir antes de separar ou imprimir" |

Três casos novos em `AdminOrderPage.test.tsx`. Backoffice: **1754 / 106**, exit 0.

---

## 8. Adendo — as duas telas contra as pranchas (2026-08-30)

**Pedido**: "as imagens das peças não aparecem no detalhe do pedido (`BYB-0`), ajustar header também;
no detalhe do Clientes a lista de pedidos precisa do mesmo layout do Paper (`CZN-0`)".

Medidas tiradas por `get_jsx` das duas pranchas, não de captura.

### `BYB-0` — o pedido

| O que | Antes | Agora |
| --- | --- | --- |
| Foto da peça | **não existia** | `order_items.product_image`, caixa 46×46 `rounded-[10px]`, com moldura mesmo sem imagem |
| Faixas da linha | larguras automáticas | `un` em 60px centrado, preço em 110px à direita |
| Trilha | não existia | `Vendas › Pedidos › #1042` |
| Selos | linha solta **abaixo** do cabeçalho | **em linha** com o título |
| Idade | selo separado | no subtítulo, junto do nome e da data |
| 2ª ação | `WhatsApp` | `Nota interna`, que leva ao campo do histórico e o foca |

**A foto é `product_image` do ITEM, não do produto** — é snapshot do momento da compra, então trocar a
imagem no cadastro não muda o que a bancada vai separar. A moldura existe mesmo sem imagem: senão a
linha sem foto desalinha da linha com foto.

### `CZN-0` — a ficha

A linha de pedido passou a ter as quatro faixas da prancha: `#número` + dia (74px), **o que ela
levou** + o que segura (cresce), selo de status (96px centrado), valor (110px à direita).

O "o que ela levou" exigiu carregar `order_items` dos pedidos da ficha — **uma leitura para todos**,
com `in`, não uma por linha. A segunda linha é regra, não texto fixo:

| Estado | Segunda linha |
| --- | --- |
| Material na fila há ≥8 dias | `Aguardando material · parado há 9 dias`, **em âmbar** |
| Entregue | `Entregue · BR31 0092 4` |
| Enviado **sem** código | `Enviado sem código — a cliente não foi avisada`, em âmbar |
| Pix pendente | `Pix aguardando` |

### O que saiu disso além do pedido

**`shared/ui/RecordPageHeader`** — as duas telas precisavam de trilha + selos em linha + ações
livres, e nem `PageHeader` (sem trilha, sem selo) nem `FormPageHeader` (exige `isDirty`/`onSave`;
um registro que se lê não tem save) davam. Dois consumidores ⇒ `shared/ui`.

**Alvos de toque, medidos em 390 depois da mudança**: a ficha tinha 4 abaixo de 44px (trilha, os dois
links de pedido, `Copiar`). A trilha passou a ser `hidden md:flex` — no celular ela seria um alvo de
16px, e o voltar de 44px ao lado leva ao mesmo lugar. Os outros ganharam área de 44 só no mobile.
**Ficha: zero.**

O **detalhe do pedido** em 390 mantém **5** alvos pequenos, todos em `OrderMaterialCard` (feature 22)
e `MelhorEnvioTab`. Não foram tocados de propósito: a `D9` declara que o Melhor Envio migra **sem
alteração interna**, e a `D8` limita o escopo móvel desta feature à **listagem**. Fica registrado
como o que falta se alguém decidir levar o detalhe ao celular.

Backoffice **1756 / 106**, exit 0 · tipos **0** · lint **27 / 5**.
