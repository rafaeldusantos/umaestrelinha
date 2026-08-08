---
id: SHP-snapshot-destrava-backoffice
area: SHP
title: Pedido criado pela loja pode ter etiqueta cotada no backoffice
persona: Léo
journey: J-frete-real-melhor-envio
expected: A aba Melhor Envio do pedido cota sem estourar TypeError, porque orders.address_zip está preenchido
entry_points: http://localhost:8081/admin/pedidos
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps: 
---

Bug vivo antes da 08: `AddressStep` não devolvia o CEP, `orders.address_zip` ficava nulo, e
`MelhorEnvioTab.tsx:71` fazia `order.address_zip.replace(...)` — **TypeError em qualquer pedido criado
pela loja**.

SÓ é verificavel atravessando as duas superficies: comprar na loja, depois abrir no backoffice.
Nenhum teste de componente pega isso.
