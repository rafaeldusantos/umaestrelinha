# 21 · Catálogo Nuvemshop — Especificação

> **Fatiada por [`AD-016`](../../STATE.md).** Depende da
> [`20-rebrand-uma-estrelinha`](../20-rebrand-uma-estrelinha/spec.md) estar fechada — o importador
> nasce escrevendo `@estrelinha/*` e gravando no Supabase local da faixa 5434x. Contexto,
> credenciais e decisões compartilhadas: [`20/context.md`](../20-rebrand-uma-estrelinha/context.md).

## Problem Statement

A Uma Estrelinha vende hoje na **Nuvemshop**, e é lá que estão os produtos reais, as fotos, os preços
e — o que mais importa — as **URLs que o Google já indexou** e que as landing pages vêm alimentando
com tráfego orgânico.

A loja nova sobe com um seed de desenvolvimento inventado. Sem catálogo real não há como validar
layout de card, grade de variação, faixa de preço nem o próprio fluxo de compra; e se os slugs não
forem preservados **no momento do import**, o SEO construído até aqui é perdido de forma
irreversível.

## Goals

- [ ] Categorias, produtos, variantes, preços e estoque reais no Supabase.
- [ ] **Imagens no Supabase Storage** — a loja nova não depende de uma conta Nuvemshop que pode ser
      cancelada.
- [ ] Slugs preservados, para que toda URL indexada continue resolvendo.
- [ ] Import **idempotente**: rodar de novo atualiza, nunca duplica.
- [ ] Relatório cujos totais conferem com o que a API devolveu.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Clientes e histórico de pedidos | `C-04`. Dado pessoal (LGPD), reconciliação de identidade e superfície de erro grande. Registrado no `BACKLOG.md` como feature futura. |
| Sincronização recorrente com a Nuvemshop | `C-04`. O import é **one-shot**: depois dele o Supabase é a fonte da verdade. |
| Redirects de URL antiga | Feature [`22`](../22-material-afetivo/spec.md) (`SEO-01..03`). Aqui o slug é **preservado**, que é o que evita precisar de redirect na maioria dos casos. |
| Marcar quais peças exigem material afetivo | Feature [`22`](../22-material-afetivo/spec.md). O import traz o catálogo como ele é. |
| Importar avaliações / depoimentos da Nuvemshop | Não existe tabela `product_reviews` no schema. |

---

## Assumptions & Open Questions

| Assumption / decisão | Chosen default | Rationale | Confirmado? |
| --- | --- | --- | --- |
| Onde o importador roda | Script Node no repositório, executado à mão | Precisa de credencial secreta e de service role; não pode ser edge function pública nem código de cliente | n — validar na Design |
| Identificador de idempotência | Coluna nova `nuvemshop_id` em `products` e `categories` | Slug pode mudar na origem; o id da Nuvemshop não. Chavear por slug faria um produto renomeado virar duplicata | n — validar na Design |
| Bucket das imagens | `product-images` (o que já existe) | Reusar evita política de RLS nova | n — validar na Design |
| Idioma dos campos localizados | `pt`, com fallback para o primeiro valor presente | Mesma regra que `../landing-pages/src/lib/nuvemshop.ts` já aplica | **y** |
| Produto sem variação na origem | Vira uma variante única, como o schema já exige | `product_variants` é obrigatório desde a migration de variantes; `base_price` é derivado por trigger | n — validar na Design |
| Reimportação e imagens | Não apaga imagem já no Storage; só acrescenta o que falta | Apagar por engano perde a única cópia; storage é barato | n — validar na Design |
| Produtos despublicados na Nuvemshop | Importados como `active = false` | Sumir com eles perderia o slug indexado e o histórico | n — validar na Design |

**Open questions:** nenhuma sem registro.

---

## Sweep de dimensões implícitas

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `CAT-08` — produto sem nome ou sem preço é pulado e reportado, nunca gravado incompleto |
| Falha e falha parcial | `CAT-07` — imagem que falha não descarta o produto; `CAT-06` — esgotadas as tentativas, o import **para com relatório**, sem produto meio-gravado |
| Idempotência / retry / duplicata | `CAT-01` — chave `nuvemshop_id`; segunda execução atualiza e cria zero duplicata |
| Fronteiras de auth e rate limit | `CAT-09` — credenciais lidas de env **fora do navegador**, service role; 500 req/h da Nuvemshop respeitados com backoff |
| Concorrência / ordenação | `CAT-05` — categorias pai importadas antes das filhas, senão `parent_id` aponta para nada |
| Ciclo de vida do dado | `CAT-03` — re-import não apaga imagem existente no Storage |
| Observabilidade | `CAT-08` — relatório com criados / atualizados / pulados / imagens falhadas, e conferência de total |
| Falha de dependência externa | `CAT-06` — Nuvemshop 429/5xx ⇒ backoff; Storage indisponível ⇒ parada limpa, nunca produto apontando para URL inexistente |
| Integridade de transição de estado | `N/A` — o import não move nenhuma máquina de estado |

---

## User Stories

### P1: O catálogo real está na loja ⭐ MVP

**User Story**: Como Adri, quero abrir a loja nova e ver os meus produtos de verdade — com as fotos,
os preços e os endereços que o Google já indexou — para avaliar a loja pelo que ela é, e não por um
seed inventado.

**Acceptance Criteria**:

1. WHEN o importador roda pela segunda vez com o mesmo catálogo THEN SHALL atualizar os registros
   existentes e criar **zero duplicata**, chaveando pelo identificador da Nuvemshop persistido no
   registro.
2. WHEN um produto é importado THEN o `slug` SHALL ser o mesmo que a Nuvemshop publica, para que a
   URL indexada continue resolvendo.
3. WHEN um produto tem imagens THEN cada imagem SHALL ser baixada e regravada no **Supabase
   Storage**, e o registro SHALL referenciar a URL do Storage — nunca o CDN da Nuvemshop.
4. WHEN um produto tem variações THEN preços e estoque SHALL ser gravados em `product_variants`, com
   `base_price` derivado pela regra que já existe no schema; produto sem variação na origem SHALL
   virar uma variante única.
5. WHEN as categorias são importadas THEN a hierarquia (`parent_id`) e a ordenação SHALL ser
   preservadas, as **pais SHALL ser gravadas antes das filhas**, e o vínculo produto↔categoria SHALL
   usar `product_categories`.
6. WHEN a API responde 429 ou 5xx THEN o importador SHALL aplicar backoff e, esgotadas as
   tentativas, SHALL **parar com relatório**, sem deixar produto gravado pela metade.
7. WHEN uma imagem individual falha THEN o produto SHALL ser importado **sem aquela imagem** e a
   falha SHALL constar do relatório — um produto nunca é descartado por causa de uma foto.
8. WHEN o import termina THEN SHALL emitir relatório com criados, atualizados, pulados e imagens
   falhadas, e o total gravado SHALL bater com o total lido da API menos os pulados.
9. WHEN o importador executa THEN as credenciais SHALL vir de variável de ambiente **fora do
   navegador**, e nenhuma SHALL aparecer em bundle de cliente.

**Independent Test**: rodar o import contra o catálogo real, abrir `/` e uma página de produto,
conferir a foto servida pelo Storage e o slug igual ao da Nuvemshop.

---

## Edge Cases

- WHEN um produto não tem preço ou não tem nome THEN SHALL ser pulado e reportado.
- WHEN dois produtos da origem geram o mesmo slug THEN o segundo SHALL ser reportado e pulado, nunca
  sobrescrever o primeiro.
- WHEN um slug colide com um registro já existente de **outro** `nuvemshop_id` THEN SHALL ser
  reportado e pulado.
- WHEN o mesmo produto é reimportado depois de perder uma imagem na origem THEN a imagem já no
  Storage SHALL permanecer.
- WHEN um produto está despublicado na origem THEN SHALL entrar com `active = false`, preservando o
  slug.
- WHEN o Storage está indisponível THEN o import SHALL parar com relatório.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| CAT-01 | P1 · Import idempotente por `nuvemshop_id` (AC 1) | Specify | Pending |
| CAT-02 | P1 · Slug preservado (AC 2) | Specify | Pending |
| CAT-03 | P1 · Imagens no Supabase Storage (AC 3) | Specify | Pending |
| CAT-04 | P1 · Variantes, preços e estoque (AC 4) | Specify | Pending |
| CAT-05 | P1 · Categorias, hierarquia e ordem de gravação (AC 5) | Specify | Pending |
| CAT-06 | P1 · Backoff, rate limit e parada limpa (AC 6) | Specify | Pending |
| CAT-07 | P1 · Falha de imagem não descarta produto (AC 7) | Specify | Pending |
| CAT-08 | P1 · Relatório com totais conferidos (AC 8) | Specify | Pending |
| CAT-09 | P1 · Credenciais fora do navegador (AC 9) | Specify | Pending |

**Cobertura:** 9 requisitos · aguardando o fecho da feature `20`.

---

## Success Criteria

- [ ] O catálogo real está no banco, com imagens servidas pelo Supabase Storage.
- [ ] Rodar o import duas vezes seguidas produz o mesmo estado — zero duplicata.
- [ ] Os totais do relatório conferem com o que a API devolveu.
- [ ] Toda URL de produto indexada resolve na loja nova.
