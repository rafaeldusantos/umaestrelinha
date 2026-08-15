// Feature 22 — as fichas de preparo, uma por material (MAT-01).
//
// Por que uma ficha por material e não uma página genérica: **preparar leite materno não é preparar
// cinzas não é preparar cabelo**. Uma instrução única obrigaria a cliente a adivinhar o que vale
// para o caso dela — e o caso dela é insubstituível.
//
// Dado puro, separado do componente, porque é ele que a página do produto endereça por âncora
// (`/como-enviar-o-material#cinzas`) e é ele que o teste percorre elemento a elemento.
//
// O tom segue a régua do projeto: quem lê isto muitas vezes acabou de perder alguém. Instrução
// clara, sem eufemismo e sem consolo fabricado.

import { MATERIAL_KINDS, MATERIAL_KIND_LABELS, type MaterialKind } from '@estrelinha/core/material'

export interface MaterialFicha {
  kind: MaterialKind
  /** O `id` da seção. É `materialAnchor(kind)`, e é o destino do link da página do produto. */
  anchor: string
  titulo: string
  /** Quanto a Adri precisa. Vago aqui vira material demais enviado — ou de menos. */
  quantidade: string
  /** Como preparar antes de embalar. */
  preparo: readonly string[]
}

const FICHAS: Record<MaterialKind, { quantidade: string; preparo: readonly string[] }> = {
  cinzas: {
    quantidade: 'Uma colher de chá é mais do que suficiente.',
    preparo: [
      'Retire a quantidade com uma colher limpa e seca.',
      'Guarde em saquinho plástico bem fechado, e depois em um segundo saquinho.',
      'Não precisa peneirar nem tratar de nenhuma forma.',
    ],
  },
  leite_materno: {
    quantidade: 'De 5 a 10 ml — o equivalente a duas colheres de chá.',
    preparo: [
      'Pode ser leite fresco ou congelado; se estiver congelado, envie ainda gelado, em saquinho duplo.',
      'Use um frasco pequeno com tampa de rosca, cheio até quase a borda para não bater no transporte.',
      'Vede a tampa com fita e coloque dentro de um saquinho plástico fechado.',
    ],
  },
  cabelo: {
    quantidade: 'Uma mecha da espessura de um lápis, com pelo menos 3 cm.',
    preparo: [
      'Amarre a mecha com uma linha nas duas pontas — solta, ela se desfaz no caminho.',
      'O cabelo precisa estar seco.',
      'Guarde em saquinho plástico ou envelope pequeno bem fechado.',
    ],
  },
  pelo_pet: {
    quantidade: 'Uma pequena porção, do tamanho de uma moeda.',
    preparo: [
      'Recolha com a mão ou com uma escova limpa.',
      'O pelo precisa estar seco e sem resíduo de pele.',
      'Guarde em saquinho plástico bem fechado.',
    ],
  },
  dente_leite: {
    quantidade: 'Um dente. Se quiser mais de um na mesma peça, avise antes.',
    preparo: [
      'Lave com água e sabão neutro e deixe secar completamente por 24 horas.',
      'Enrole em papel-toalha e coloque em uma caixinha rígida — dente solto no envelope quebra.',
    ],
  },
  coto_umbilical: {
    quantidade: 'O coto inteiro, como caiu.',
    preparo: [
      'Deixe secar ao ar por alguns dias, longe de umidade.',
      'Guarde em saquinho plástico ou caixinha rígida.',
      'Não use álcool nem produto nenhum.',
    ],
  },
  placenta: {
    quantidade: 'Um pedaço pequeno, já desidratado.',
    preparo: [
      'Envie somente material já desidratado.',
      'Guarde em saquinho plástico duplo, bem fechado.',
      'Se ainda não estiver desidratado, fale com a gente antes de enviar.',
    ],
  },
  flores: {
    quantidade: 'Algumas pétalas ou uma flor pequena.',
    preparo: [
      'Prense entre as páginas de um livro por alguns dias, até secar por completo.',
      'Pétala fresca escurece dentro da resina.',
      'Envie entre duas folhas de papel, dentro de um envelope rígido.',
    ],
  },
  penas: {
    quantidade: 'Uma ou duas penas pequenas.',
    preparo: [
      'A pena precisa estar seca e limpa.',
      'Envie em envelope rígido, para não amassar.',
    ],
  },
  outro: {
    quantidade: 'Combine com a gente antes de enviar.',
    preparo: [
      'Fale com a gente para acertar quantidade e preparo do seu caso.',
      'Não envie nada antes dessa conversa: alguns materiais precisam de preparo específico.',
    ],
  },
}

/** As fichas na ordem de `MATERIAL_KINDS` — a mesma ordem em que o pedido lista os materiais. */
export const MATERIAL_FICHAS: readonly MaterialFicha[] = MATERIAL_KINDS.map(kind => ({
  kind,
  anchor: kind.replace(/_/g, '-'),
  titulo: MATERIAL_KIND_LABELS[kind],
  quantidade: FICHAS[kind].quantidade,
  preparo: FICHAS[kind].preparo,
}))

/** Os passos do envio, antes das fichas. */
export const PASSOS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Faça o pedido',
    texto:
      'Escolha a joia e finalize a compra. Só depois de o pedido existir é que você envia o material — assim ele chega com o seu nome já vinculado.',
  },
  {
    titulo: 'Separe e prepare o material',
    texto:
      'Cada material tem um preparo próprio. Confira a ficha do seu logo abaixo — a quantidade é sempre menor do que as pessoas imaginam.',
  },
  {
    titulo: 'Embale com folga dupla',
    texto:
      'Material dentro de um saquinho fechado, esse saquinho dentro de outro, e os dois dentro do envelope. Escreva seu nome e o número do pedido em um papel junto.',
  },
  {
    titulo: 'Poste e registre o código',
    texto:
      'Envie com rastreio. Depois, registre o código na página do seu pedido — assim você acompanha e a gente sabe que está a caminho.',
  },
]

/** O que conferir antes de fechar o envelope. */
export const CHECKLIST: readonly string[] = [
  'O material está seco e bem fechado no saquinho.',
  'Tem um segundo saquinho ou caixinha por fora do primeiro.',
  'Seu nome e o número do pedido estão em um papel dentro do envelope.',
  'O envio tem código de rastreio.',
  'A quantidade segue a ficha do material — enviar demais não acelera nada.',
]
