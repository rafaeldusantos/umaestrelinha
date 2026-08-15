// A composição da Home como dado (feature 24).
//
// `AD-012` — TIPO ESCRITO À MÃO É AFIRMAÇÃO, NÃO VERIFICAÇÃO. As duas interfaces abaixo não foram
// escritas do `design.md`: foram derivadas do `information_schema` do banco local **depois** de a
// migration `20260815120000_24-home-gerenciavel.sql` rodar do zero (`supabase db reset`), e a
// gravação de cada tabela foi provada por **probe HTTP** na mesma sessão — `POST` com
// `Prefer: return=representation` devolvendo os valores persistidos, não `PGRST204`.
//
// Isso importa porque a alternativa já custou caro três vezes neste repo: `DbCategory` declarou
// `parent_id`/`banner_url`/`color_accent` por meses sem que o banco as tivesse (toda gravação de
// categoria falhava com `PGRST204`), `DbAbandonedCart` descrevia uma tabela que não existia em
// migration nenhuma, e `DbCollection` descrevia uma que nunca existiu em lugar nenhum. Em todos os
// casos o `tsc` achou o código certo — porque o tipo mentia — e só um probe contra o banco real
// acusou.
//
// O que o probe gravou e leu de verdade (2026-08-15, `:54341`):
//
//   1. `insert` de seção com `type`/`position`/`active`/`config` → devolveu as 7 colunas.
//   2. seção criada sem `active` nasceu `false` (HOME-10).
//   3. `insert` em lote de 3 itens, um por destino (categoria, produto, caminho) → devolveu as 10
//      colunas, com `alt` e `label_snapshot` persistidos.
//   4. `insert` com DOIS destinos na mesma linha → `23514`, o CHECK `num_nonnulls(...) <= 1`.
//   5. `delete` da categoria e do produto de destino → **HTTP 204**, e os 3 itens SOBREVIVERAM com
//      a arte e o `label_snapshot` intactos, só com o destino nulo. É a prova das duas decisões de
//      origem: `set null` em vez de `cascade`, e o CHECK `<= 1` em vez de `= 1` — com `= 1` este
//      `delete` teria falhado.
//   6. `delete` da seção → os itens dela sumiram junto (cascade).
//   7. `patch active=false` e `delete` no hero → `23514` nas duas, com a mensagem do trigger; o hero
//      seguiu ativo, e desligar a newsletter continuou permitido.
//   8. `insert` anônimo → `42501`; `select` anônimo devolveu 6 de 7 seções com a newsletter
//      desligada (HOME-05).
//
// Duas armadilhas do PostgREST que o probe encontrou, e que quem for escrever a gravação precisa
// saber (não são defeito de schema):
//
//   - **Upsert de reordenação precisa mandar `type` junto.** `{ id, position }` sozinho devolve
//     `23502 null value in column "type"`, porque o upsert é um `insert ... on conflict` e `type` é
//     `not null` sem default. `{ id, type, position }` funciona, e repetir a chamada dá o mesmo
//     resultado (idempotência de `HOME-11`, conferida). A alternativa é um `patch` por linha.
//   - **`insert` em lote exige as MESMAS chaves em todos os objetos** (`PGRST102 All object keys
//     must match`). Os itens com destinos diferentes vão com `null` explícito nos outros dois, e não
//     com a chave ausente.
//
// Snapshot do schema conferido (ordem e nulidade incluídas):
//
//   home_sections       id uuid NN dgen_random_uuid() · type text NN · position integer NN d0 ·
//                       active boolean NN dfalse · config jsonb NN d'{}' ·
//                       created_at timestamptz NN dnow() · updated_at timestamptz NN dnow()
//   home_section_items  id uuid NN dgen_random_uuid() · section_id uuid NN · position integer NN d0 ·
//                       category_id uuid NULL · product_id uuid NULL · href text NULL ·
//                       image_url text NULL · alt text NULL · label_snapshot text NULL ·
//                       created_at timestamptz NN dnow()

/**
 * Uma seção da Home, como o banco a guarda.
 *
 * `type` é `string`, e **não** o union `HomeSectionType`, de propósito: tipá-lo aqui faria
 * `@estrelinha/supabase` importar de `@estrelinha/core`, que já importa daqui — ciclo entre pacotes
 * por causa de um tipo. Mesma decisão de `material_kinds` em `DbProduct`. Quem interpreta é
 * `@estrelinha/core/home`, cujo `sectionMeta` devolve `null` para tipo desconhecido — uma linha
 * gravada por uma versão mais nova é **pulada**, nunca derruba a Home.
 *
 * `config` é `Record<string, unknown>` pela mesma razão, e porque é o que o `jsonb` de fato entrega:
 * texto, número e URL de imagem, **nunca referência**. Toda referência mora em `DbHomeSectionItem`,
 * onde tem FK de verdade — é a linha divisória que impede o defeito do `menu_promo` (`AD-014`) de
 * reentrar por outra porta.
 */
export interface DbHomeSection {
  id: string
  type: string
  position: number
  /** Seção nova nasce `false` (`HOME-10`). O hero não desliga — o trigger recusa (`HOME-08`). */
  active: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
  /**
   * A curadoria da dona, quando a leitura pede a relação embutida
   * (`select('*, items:home_section_items(*)')`).
   *
   * **Ausente ou vazia NÃO é "seção sem conteúdo": é a derivação automática de hoje.** Curadoria é a
   * PRESENÇA de itens, não uma flag — ter itens é o override, não ter é `pickHomeBanners` /
   * `pickHomeCollections` / `pickTrendingCategories` como sempre foi.
   */
  items?: DbHomeSectionItem[]
}

/**
 * Um item curado de uma seção.
 *
 * **As três colunas de destino são mutuamente exclusivas, mas o banco só exige "no máximo uma"** —
 * `check (num_nonnulls(category_id, product_id, href) <= 1)`. Zero destinos é o estado ÓRFÃO, e é
 * legítimo: o `on delete set null` das FKs o produz quando a coleção ou o produto é apagado. Um
 * CHECK de igualdade faria a exclusão da categoria falhar. "Exatamente um para salvar" é regra de
 * formulário (`destinationRefusal`, em `@estrelinha/core/home`), a única camada onde "ainda não
 * escolhi" e "perdi o que tinha" se distinguem.
 */
export interface DbHomeSectionItem {
  id: string
  /** A única FK em cascade: apagar a seção apaga os itens dela (`HOME-30`). */
  section_id: string
  position: number
  category_id: string | null
  product_id: string | null
  href: string | null
  /** Arte própria (banner livre). Sem imagem, a seção deriva a arte do destino. */
  image_url: string | null
  alt: string | null
  /**
   * O rótulo congelado no momento da escolha.
   *
   * Depois do `set null` não há de onde ler o nome da coleção apagada, e `HOME-24` pede que o painel
   * **diga** o que se perdeu. **A loja nunca o lê** — só o painel, e só no caso órfão.
   */
  label_snapshot: string | null
  created_at: string
}
