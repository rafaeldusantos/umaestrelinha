// "Produtos relacionados" e "Compre junto" do formulário de produto.
//
// **Desde a feature 51 isto é um invólucro fino** (`BUS-07`). O que sobrou aqui é o que NÃO é
// busca: os chips do que já foi escolhido, que são a lista de quem chama. A busca — a dobra de
// acento, o casamento por palavra, a ordenação, o teto de 20 e o vazio explicado — mora em
// `ProductSearchField`, e é a mesma nas cinco telas do painel.
//
// O que esta tela tinha antes, e por que trocar não foi arrumação: a régua era
// `p.name.toLowerCase().includes(termo.toLowerCase())` sobre o catálogo inteiro que
// `useAdminProducts` baixava. Ela **não dobrava acento** — digitar `coracao` não achava
// `Anel Coração`, e a dona não tinha como saber que a peça existia. Na Home, a mesma digitação
// achava 106 peças, porque lá a régua era outra. Duas escritas da mesma pergunta, discordando.

import { X } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import { ProductSearchField, useProductPool } from '@/entities/product'

interface Props {
  label: string
  selected: string[]
  onChange: (ids: string[]) => void
  /** O produto sendo editado. Ele **some** da lista: ninguém se relaciona consigo mesmo. */
  excludeId?: string
}

const RelatedProductsSelect = ({ label, selected, onChange, excludeId }: Props) => {
  // O mesmo pool das outras quatro superfícies — não é consulta própria, é a porta única. Ele já
  // está em memória quando o campo abaixo monta, porque a chave do React Query é a mesma.
  const { produtos } = useProductPool()

  const escolhidos = selected
    .map(id => produtos.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  return (
    <div className="space-y-2">
      <ProductSearchField
        id={`busca-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        rotulo={label}
        modo="multiplo"
        selecionados={selected}
        // `excluir` some da lista, `selecionados` aparece desabilitado — e a diferença é
        // deliberada: quem já está na lista precisa ser VISTO para a dona entender por que não pode
        // escolhê-lo de novo; o produto sendo editado nunca foi uma opção, e mostrá-lo seria ruído.
        excluir={excludeId ? [excludeId] : undefined}
        rotuloJaEscolhida="já está na lista"
        onEscolher={produto => onChange([...selected, produto.id])}
      />

      {escolhidos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {escolhidos.map(p => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.name}
              <button
                type="button"
                aria-label={`Remover ${p.name}`}
                onClick={() => onChange(selected.filter(id => id !== p.id))}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default RelatedProductsSelect
