// O seletor de destino de um item curado da Home — coleção, peça ou caminho da loja.
//
// **Extraído do `BannerGridEditor` na feature 41**, quando o carrossel virou o segundo consumidor.
// Não é arrumação: o que esta peça carrega é uma regra, não um formulário — o `label_snapshot` é
// **congelado junto com a escolha**, porque depois do `on delete set null` não há de onde ler o nome
// da coleção apagada, e `HOME-24` pede que o painel diga **qual** destino se perdeu. Escrita duas
// vezes, a segunda esqueceria o congelamento e o painel passaria a dizer "este banner perdeu o
// destino" em vez de "a coleção Prata 925 foi apagada" — sem nada quebrar.
//
// Os três destinos moram em colunas próprias, com FK de verdade nas duas primeiras: é o que faz o
// `on delete set null` funcionar e o item sair de cena quando o destino é apagado, em vez de virar
// link para 404. Guardar o destino como texto perderia isso — é o defeito do `menu_promo` (`AD-014`).
//
// **Desde a feature 51 o ramo da PEÇA é uma busca, e o `<select>` continua existindo** (`A-12`,
// `BUS-19`). A troca é deliberadamente parcial: este seletor responde **três** perguntas, e duas
// delas não são sobre produto. Trocá-lo inteiro por uma busca de peça apagaria as coleções e o
// endereço livre. O que saiu foram as ~702 `<option>` do catálogo — que não tinham busca nenhuma,
// obrigavam a rolar a lista inteira e desciam junto com todo o `select('*')` de `useAdminProducts`.

import { useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { bySortOrder } from '@estrelinha/core/menu'
import { ProductSearchField } from '@/entities/product'
import type { AdminCategory } from '@/entities/category'
import type { DraftItem } from '../model/sectionDraft'

const OUTRO = '__outro'
/** O ramo da peça. Ele revela a busca; o id da peça **não** é valor do `<select>` (`BUS-07`). */
const PRODUTO = '__produto'

interface Props {
  item: DraftItem
  categories: readonly AdminCategory[]
  onChange: (patch: Partial<DraftItem>) => void
  /** Distingue o seletor quando há vários na mesma tela. */
  rotulo?: string
  /**
   * O rótulo do campo de caminho livre.
   *
   * Separado do `rotulo` de propósito: o padrão é o texto que o editor da grade de banners já usava,
   * e mudá-lo aqui renomearia um controle de uma tela que esta feature não pediu para tocar.
   */
  rotuloEndereco?: string
}

const DestinoDoItem = ({
  item,
  categories,
  onChange,
  rotulo = 'Leva para',
  rotuloEndereco = 'Endereço do banner',
}: Props) => {
  const colecoes = [...categories].filter(c => c.active !== false).sort(bySortOrder)
  const atual = item.category_id
    ? `cat:${item.category_id}`
    : item.product_id
      ? PRODUTO
      : item.href
        ? OUTRO
        : ''

  /**
   * O ramo escolhido à mão, quando ele ainda não está gravado no item.
   *
   * `null` = "siga o item". Ele existe porque escolher *Produto* ou *Outro endereço* abre um campo
   * **antes** de haver o que ler no rascunho: sem a lembrança, o `<select>` voltaria sozinho para
   * "Escolha um destino" no render seguinte e o campo sumiria debaixo da dona.
   */
  const [ramo, setRamo] = useState<string | null>(null)
  const valor = ramo ?? atual

  const escolher = (proximo: string) => {
    setRamo(proximo)

    if (proximo === OUTRO) {
      onChange({ category_id: null, product_id: null })
      return
    }

    if (proximo === PRODUTO) {
      // O `product_id` que já existir fica: trocar de coleção para peça e voltar não pode apagar a
      // escolha anterior sem a dona ter pedido.
      onChange({ category_id: null, href: null })
      return
    }

    if (proximo === '') {
      onChange({ category_id: null, product_id: null, href: null })
      return
    }

    const [tipo, id] = proximo.split(':')
    if (tipo !== 'cat') return
    const alvo = colecoes.find(c => c.id === id)
    // O rótulo é congelado JUNTO com a escolha: depois de a coleção ser apagada não há de onde
    // lê-lo, e `HOME-24` pede que o painel diga **qual** destino se perdeu.
    onChange({ category_id: id, product_id: null, href: null, label_snapshot: alvo?.name ?? null })
  }

  return (
    <div className="space-y-2">
      <select
        aria-label={rotulo}
        value={valor}
        onChange={e => escolher(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-[13px]"
      >
        <option value="">Escolha um destino</option>
        <optgroup label="Coleções">
          {colecoes.map(c => (
            <option key={c.id} value={`cat:${c.id}`}>
              Coleção · {c.name}
            </option>
          ))}
        </optgroup>
        <option value={PRODUTO}>Produto…</option>
        <option value={OUTRO}>Outro endereço da loja…</option>
      </select>

      {valor === PRODUTO && (
        <ProductSearchField
          id={`destino-peca-${item.key}`}
          rotulo={`${rotulo} · qual peça`}
          modo="unico"
          escolhido={item.product_id}
          // Só o rótulo de uma PEÇA vale aqui: `label_snapshot` também guarda nome de coleção, e
          // reaproveitá-lo cegamente faria o campo dizer que "Eternize as cinzas" é a peça escolhida
          // logo depois de a dona trocar de ramo.
          nomeEscolhido={item.product_id ? item.label_snapshot : null}
          onEscolher={produto =>
            // O `product_slug` é congelado JUNTO com a escolha, e ele é de TELA — `toNewItems` o
            // remove antes do `insert`. É o que faz a prévia mostrar o destino recém-escolhido em
            // vez de tratá-lo como fora do ar: `resolveItem` decide pela presença do slug, e antes
            // de salvar o rascunho é a única fonte que o tem (`DST-24`, `R-01`, `BUS-19`).
            onChange({
              category_id: null,
              product_id: produto.id,
              product_slug: produto.slug,
              href: null,
              label_snapshot: produto.name,
            })
          }
          onLimpar={() =>
            onChange({ product_id: null, product_slug: null, label_snapshot: null })
          }
        />
      )}

      {valor === OUTRO && (
        <Input
          aria-label={rotuloEndereco}
          placeholder="/como-enviar"
          value={item.href ?? ''}
          onChange={e => onChange({ href: e.target.value || null, category_id: null, product_id: null })}
        />
      )}
    </div>
  )
}

export default DestinoDoItem
