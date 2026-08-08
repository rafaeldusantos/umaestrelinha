// Formatação de dinheiro — a MESMA função que o checkout, o backoffice e o e-mail transacional usam.
//
// Este módulo é deliberadamente SEM IMPORTS, e isso é a razão de ele existir separado de `date.ts`:
// a edge function `send-email` importa `formatPrice` por caminho relativo `.ts` (o repo não tem
// `deno.json`/import map), e o Deno não resolve o especificador nu `'date-fns'` que o irmão usa.
// Antes deste split, `formatPrice` era inalcançável do servidor — e a alternativa (duplicar a
// formatação dentro do e-mail) produz recibo com moeda diferente da tela, que é exatamente a classe
// de bug que BMP-04 e a lição L-007 documentam.
//
// Mesma regra de autocontenção de `payment/status.ts`. Não adicione import aqui.
export const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
