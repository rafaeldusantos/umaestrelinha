// A régua do tom memorial, com UM dono: o guarda do Compre Junto e o da faixa de avisos chamam a mesma
// função. Urgência, contagem, escassez, prova social, apelo à economia, exclamação e emoji.

export const tomProibido = (texto: string): boolean =>
  /economiz|últim[ao]s?\b|\brestam?\b|\bresta\b|corra|aproveite|\bhoje\b|por tempo limitado|\bsó (?:até|hoje)|esgotando|poucas unidades|mais (?:vendid|comprad)|\bclientes? (?:amam|escolheram)|!|\p{Extended_Pictographic}/iu.test(
    texto,
  )
