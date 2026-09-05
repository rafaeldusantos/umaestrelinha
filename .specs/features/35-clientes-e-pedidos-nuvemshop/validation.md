# 35 · Validação

> ⚠️ **O autor é o verificador.** Terceira feature seguida nessa condição (a `33` e a `34` também).
> Toda evidência abaixo é **medida** — probe SQL contra o banco local, execução real do importador
> contra os arquivos reais, e navegador em 390×844 e 1440. Isso reduz o viés; não o elimina.
> Ninguém de fora conferiu contra a spec.

**Data**: 2026-08-30 · **Fonte**: os dois CSV exportados do painel da Nuvemshop
**Medição de base**: [`medicao.md`](medicao.md)

---

## Veredito: **PASS**, com três desvios declarados e um defeito encontrado em navegador

| Gate | Resultado |
| --- | --- |
| `catalog-import` | **509 testes / 23 arquivos** · exit 0 (baseline era 335/16) |
| Tipos `catalog-import` | 0 |
| Tipos `backoffice` | 0 |
| Lint `catalog-import` | 0 |
| Import real (3 execuções) | exit 0 nas três |
| Probe SQL | 9 blocos, todos conferem |
| Navegador 390×844 e 1440 | sem scroll horizontal, 0 erro de console |

---

## O que foi medido contra o banco

Import executado contra o Supabase local com o catálogo real dentro (691 produtos, 3.359 variações).

| Verificação | Esperado | Medido |
| --- | --- | --- |
| Pedidos importados | 35 | **35** ✅ |
| Itens | 59 | **59** ✅ |
| Linhas de histórico | — | 93 |
| Notas | — | 5 |
| Triplas observadas | 5, somando 35 | **5, somando 35** ✅ |
| `separating` produzido | 0 | **0** ✅ |
| Fila de material | 4 (`#163` `#165` `#166` `#169`) | **exatamente esses 4** ✅ |
| Casamento nos 4 da fila | 100% | **19/19 = 100%** ✅ |
| Taxa de casamento total | ≥ 25% | **24/59 = 40,7%** ✅ |
| Totais que não fecham | 0 | **0** ✅ |
| Faixa de `order_number` | `NS-135`..`NS-169` | **`NS-135`..`NS-169`** ✅ |
| Convidadas com telefone | 33 | **33** ✅ |
| Escrita em `customers` | nenhuma | **nenhuma** ✅ |

**A distribuição observada, lida do banco** (`nuvemshop_*` cru → destino):

| `Status do Pedido` | `Status do Pagamento` | `Status do Envio` | `status` | `payment_status` | n |
| --- | --- | --- | --- | --- | --: |
| Aberto | Confirmado | Entregue | `delivered` | `approved` | 22 |
| Aberto | Confirmado | Enviado | `shipped` | `approved` | 4 |
| Aberto | Confirmado | Não está embalado | `paid` | `approved` | 4 |
| Arquivado | Recusado | Não está embalado | `pending` | `expired` | 4 |
| Arquivado | Confirmado | Entregue | `delivered` | `approved` | 1 |

**Fuso conferido**: `NS-135` tem `created_at = 2025-07-04 00:48:18+00`, que é `03/07/2025 21:48:18`
em BRT — exatamente o que o CSV traz. O offset `-03:00` explícito funcionou; sem ele o pedido teria
sido gravado três horas adiantado.

### Idempotência e propriedade pós-cutover

| Execução | Resultado |
| --- | --- |
| 2ª | `pedidos: 35 lidos, 0 criados, 35 atualizados` · `itens: 59 lidos, 0 criados, 59 pulados` · exit 0 |
| `status` de `NS-165` alterado à mão para `shipped` + `tracking_code = FEITO-A-MAO` | — |
| 3ª | **o valor alterado SOBREVIVEU** ✅ · total continua 35 |
| 4ª, com `--ressincronizar-estado` | `NS-165` voltou a `paid`, rastreio limpo, e o relatório nomeou os 35 sobrescritos ✅ |

### Reencontro por e-mail

Provado em transação revertida, com um e-mail histórico **real** de cliente com 2 pedidos, criando a
conta com o e-mail em **caixa alta**:

- pedidos adotados: **2** ✅
- linhas em `customer_directory` para o e-mail: **1** ✅
- `has_account` depois: **true** ✅

---

## O defeito que só o navegador achou

**`chargeMaterialUrl` era chamado sem o telefone nos três pontos da tela.**

A coluna `orders.customer_phone` estava criada, gravada em 35/35 pedidos, e com teste de unidade
passando. Mesmo assim **todo** link de cobrança saía `wa.me/?text=…`, sem destinatário — porque
`AdminOrdersPage.tsx` chamava `chargeMaterialUrl(o)` e a view `order_list` (que enumera colunas uma a
uma) nunca ganhou a coluna nova.

Três coisas certas e o resultado errado — a assinatura do "defeito 01". Nenhum teste existente
poderia ter pego: cada peça, isolada, estava correta.

**Correção**: a migration ganhou a seção 5 (`order_list` v2, com as duas colunas **ao fim**, que é o
que `CREATE OR REPLACE VIEW` aceita), `AdminOrderRow` e `ORDER_LIST_SELECT` ganharam
`customer_phone`, e os três chamadores passam `o.customer_phone`.

**Guarda contra a regressão**: `orderList.test.ts` lê `AdminOrdersPage.tsx` do disco e exige que
**toda** ocorrência de `chargeMaterialUrl(` mencione `customer_phone`, com âncora de contagem (≥ 3
chamadas) e âncora de leitura (arquivo > 1.000 caracteres).

**Medido depois**: 10 links com número na tela, todos de pedido importado; os 8 sem número são os
pedidos nascidos na loja antes de a coluna existir — `35/35 importados têm telefone, 0/8 dos
nascidos aqui`.

---

## O achado que mudou o desenho

**A unicidade do SKU no catálogo local é fabricada, e casar por ela liga item ao produto errado.**

A primeira implementação casava por nome → nome-base → **SKU único no catálogo local**, dando
**74,6%**. Rodando contra o banco real, 20 dos vínculos vinham só do SKU, e pelo menos um está
claramente errado:

> `NS-162` ligava **"Corrente Veneziana de Prata 925 (45cm)"** a **"Corrente Singapura em Prata
> 925"**. São correntes diferentes.

A causa: `dedupeSkus` (feature 21) nulifica o SKU de todas as variações menos a primeira, porque
`product_variants.sku` é `UNIQUE` global. `BA-002` aparece **316 vezes em 68 produtos** na origem e
sobrevive numa variação **arbitrária**. Perguntar ao catálogo local "este SKU é único?" devolve `sim`
para um código que não identifica nada — e a própria feature 21 já tinha escrito que *"nesta loja o
SKU é um código de material, não um identificador de linha vendável"*.

**Decisão**: o SKU saiu da cadeia de casamento. A taxa caiu de 74,6% para **40,7%**, e **nenhum item
aponta para o produto errado**. `suggestBySku` devolve o candidato para o **relatório**, marcado
`(NÃO aplicado)`, para revisão à mão — a informação não se perde, só não vira dado.

O piso do gate foi ajustado de 50% para **25%**, e a razão está no código: ele é **detector de ordem
errada** (catálogo vazio ⇒ 0%), não alvo de qualidade. Apertá-lo até encostar na medição faria um
único produto renomeado derrubar o gate.

---

## Desvios declarados

| Desvio | Onde | Razão |
| --- | --- | --- |
| **Guarda de PII prova formato sintético, não ausência de dado real** | `csv/__tests__/fixtureSintetica.test.ts` | A spec pedia "nenhum CPF do arquivo real aparece na fixture". Inimplementável sem cometer o próprio problema: comparar exigiria os CPFs no repositório. E o arquivo real mora fora do git, então o teste passaria em verde em qualquer máquina sem ele — um no-op disfarçado. O que existe no lugar é mais forte: e-mail em `@exemplo.invalid`, documento com dígito repetido, telefone em bloco reservado — **dado real reprova por construção**, sem precisar ser conhecido. `SPEC_DEVIATION` marcado no arquivo. |
| **T06 executada antes da T05** | ordem das tasks | `mapOrder` chama `matchItem`; a `tasks.md` listou a dependência invertida. |
| **`--somente-pedidos` acrescentada** | `run.ts`, `cli.ts` | Não estava no design. A fase 4 é a **única** que lê seu insumo do banco em vez da fase anterior, então é a única que pode rodar sozinha. Sem ela, reimportar pedidos custaria 3.660 uploads de imagem — e a razão de re-execução é assimétrica: catálogo muda raramente, pedidos mudam a cada export. |

## Correções de rota durante a execução

| O que | Como apareceu |
| --- | --- |
| **Corte de BOM removido** | O teste falhou com razão. Decodificando Latin-1, `U+FEFF` é **inalcançável por construção** — o `if` era código morto fingindo proteção. Os bytes do arquivo confirmam: ele abre em `22 4e fa`, sem BOM. Quem protege é a conferência de cabeçalho. |
| **Histórico ordenado pela lógica, com clamp** | Teste falhou: `Data de pagamento` vem **sem hora**, e o `#138` foi criado às 22:16 e pago no mesmo dia — por timestamp, o pagamento (00:00) precedia a criação, e o painel mostraria "pago" acima de "recebido". |
| **Default de `--stop-after` mudou para `pedidos`** | Peguei antes de rodar: mantido em `imagens`, a fase 4 nunca rodaria sem a flag, e "não rodou" é indistinguível de "não achou nada". |

---

## Navegador — 390×844 e 1440

| Verificação | 390×844 | 1440 |
| --- | --- | --- |
| Scroll horizontal no `body` | **não** (`scrollWidth` 390 = `clientWidth`) | **não** (1440) |
| Subtítulo × aba `Precisa de ação` (`AD-024`) | **9 = 9** ✅ | **9 = 9** ✅ |
| União dos tiles acionáveis | 7 + 0 + 2 = **9** ✅ | idem |
| Erros de console | **0** | **0** |

**Detalhe de pedido importado com 4 itens ÓRFÃOS** (`NS-149`): abre inteiro, com nome, rótulo de
variação, quantidade e preço de cada item, sob o texto "Preços congelados no momento da compra". O
histórico mostra as três transições datadas, todas marcadas "Importado da Nuvemshop" — e o pagamento
aparece às `08:38:07`, provando o clamp.

**`/admin/clientes`**: 41 pessoas (4 com conta + 37 convidadas), as importadas rotuladas
`· convidada`, com gasto, data da primeira compra e materiais confiados.

---

## Requisitos

Todos os 31 (`ESP-01`..`ESP-31`) verificados. Os que só o probe ou o navegador alcançam estão nas
tabelas acima; os demais têm teste unitário com sensor.

**Sensores exercidos** (a régua reprova o que deve reprovar): leitura em UTF-8 quebra o cabeçalho ·
`Status do Envio = 'Teletransportado'` aborta o import · recorte ingênuo de parênteses erra o caso
aninhado · SKU no índice mas recusado por decisão · índice único parcial reprova · `security definer`
ausente reprova · adoção sem recorte de órfão reprova · comparação de e-mail sem `lower()` reprova ·
`grant` a `anon` reprova · taxa exatamente no piso passa (prova que o piso é o piso).
