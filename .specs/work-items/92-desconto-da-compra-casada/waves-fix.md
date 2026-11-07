ONDAS: 19,20
- 19 posse: supabase/functions/mercado-pago/handlers.ts, supabase/functions/mercado-pago/__tests__/
- 20 posse: apps/backoffice/src/features/product-form/model/discountPreview.ts, apps/backoffice/src/features/product-form/ui/BuyTogetherTab.tsx, apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx

Por que uma onda só, em paralelo:
- sem arquivo em comum: 19 é a regravação do pedido no recálculo da function `mercado-pago` (BUG-014); 20 é a prévia da aba Compre junto do painel (BUG-006, reteste reprovado da 14).
- nenhum depende do outro: um é o cupom gravado no pedido, o outro a faixa anunciada no painel.
- nenhum toca config, migration, schema, lockfile nem rota. Se o diagnóstico de qualquer um levar a `packages/core` (a 19 ao cálculo do cupom em `core/payment`, a 20 à regra das peças que a loja pula), o arquivo de `core` de um não é o do outro; o implementador diz no retorno.
- ambos high; a 19 é o caminho do dinheiro (quatro superfícies), por isso vem primeiro na linha.
