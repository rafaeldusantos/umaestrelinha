// O seletor de destino de um item curado da Home — coleção, produto ou caminho da loja.
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

import { useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { bySortOrder } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import type { DraftItem } from '../model/sectionDraft'
import type { EditorProduct } from './sectionEditors'

const OUTRO = '__outro'

interface Props {
  item: DraftItem
  categories: readonly AdminCategory[]
  products: readonly EditorProduct[]
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
  products,
  onChange,
  rotulo = 'Leva para',
  rotuloEndereco = 'Endereço do banner',
}: Props) => {
  const colecoes = [...categories].filter(c => c.active !== false).sort(bySortOrder)
  const atual = item.category_id
    ? `cat:${item.category_id}`
    : item.product_id
      ? `prod:${item.product_id}`
      : item.href
        ? OUTRO
        : ''

  const [livre, setLivre] = useState(atual === OUTRO)

  const escolher = (valor: string) => {
    if (valor === OUTRO) {
      setLivre(true)
      onChange({ category_id: null, product_id: null })
      return
    }
    setLivre(false)

    if (valor === '') {
      onChange({ category_id: null, product_id: null, href: null })
      return
    }

    const [tipo, id] = valor.split(':')
    if (tipo === 'cat') {
      const alvo = colecoes.find(c => c.id === id)
      // O rótulo é congelado JUNTO com a escolha: depois de a coleção ser apagada não há de onde
      // lê-lo, e `HOME-24` pede que o painel diga **qual** destino se perdeu.
      onChange({ category_id: id, product_id: null, href: null, label_snapshot: alvo?.name ?? null })
      return
    }
    const alvo = products.find(p => p.id === id)
    onChange({ category_id: null, product_id: id, href: null, label_snapshot: alvo?.name ?? null })
  }

  return (
    <div className="space-y-2">
      <select
        aria-label={rotulo}
        value={livre ? OUTRO : atual}
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
        <optgroup label="Produtos">
          {products.map(p => (
            <option key={p.id} value={`prod:${p.id}`}>
              Produto · {p.name}
            </option>
          ))}
        </optgroup>
        <option value={OUTRO}>Outro endereço da loja…</option>
      </select>

      {livre && (
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
