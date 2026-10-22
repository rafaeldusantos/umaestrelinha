# 76 — mobile-adm: Clientes

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — telas **Clientes** e **Cliente**.

## Escopo
- Lista com busca e os recortes *Com pedido em aberto* e *Compraram mais de uma vez*.
- Detalhe: contato (e-mail, telefone, cidade), "Conversar no WhatsApp" e os pedidos dela, levando ao detalhe da `74`.

## Regras
A leitura é `customer_directory` (a view da `35`, `security_invoker`, que já dedupa a convidada).
Os recortes nascem em `core` se o painel também os usar; se forem só do app, ficam no app.
O WhatsApp usa `whatsappHref` (e não mais um `wa.me` à mão).

## P1 — critérios
1. WHEN a lista abre THEN cada cliente SHALL aparecer **uma** vez, inclusive a convidada que virou conta. (`MAC-01`)
2. WHEN um recorte é tocado THEN a lista SHALL filtrar pelo predicado declarado (aberto = algum pedido não `delivered`/`cancelled`). (`MAC-02`)
3. WHEN a cliente tem telefone válido THEN "Conversar no WhatsApp" SHALL abrir `wa.me` com o número normalizado. Sem telefone, o botão SHALL não aparecer. (`MAC-03`)
4. WHEN um pedido da cliente é tocado THEN SHALL abrir o detalhe do pedido da `74`. (`MAC-04`)

## Perguntas abertas
- Notas internas da cliente (`customer_notes`): ler, escrever ou nenhum dos dois?
- "Em aberto" no protótipo é o recorte ou o total em aberto da cliente?
