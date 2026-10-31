# BUG-20261031-frete-antigo-depois-que-a-adri-atualiza: depois de "A Adri atualizou seu pedido", o frete cobrado é o da sacola antiga

- **Status:** open
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Cliente de luto pelo link
- **Journey Step:** J-concluir-pedido-montado, step "Concluir" (ramo editado com a página aberta)
- **Scenarios:** LOJA-montado-link-morto-ou-mudou
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

Com a página do link aberta e PAC escolhido (R$ 35,00 para 2 peças), a Adri acrescentou uma peça. Ao
concluir, a cliente recebe "A Adri atualizou seu pedido. Confira de novo antes de concluir." (certo) e
a página relê as peças. A lista de entrega passa a mostrar PAC a R$ 37,49 (cotação do pacote novo), mas
o Resumo e o botão continuam com "Frete · Correios PAC R$ 35,00". Na mesma tela, dois preços para o
mesmo PAC; o pedido nasce com o frete antigo.

## Reproduction

- **Charter:** CH-montado-link-que-mudou-ou-morreu · **Tour:** Multi-Tab Tour
- **Environment:** 390×844 (loja) + 1440 (painel), local

1. Abrir o link, preencher o CEP 01310-100 e escolher PAC.
2. No painel, Editar a proposta e subir a quantidade de uma peça; Salvar.
3. Na loja, tocar "Pagar"; recebe a frase de atualização.
4. Ler o Resumo e a lista de entrega; tocar "Pagar" de novo.

**Expected:** a entrega escolhida é recotada (ou desmarcada) e o total usa o frete do pacote novo.
**Actual:** Resumo "Frete · Correios PAC R$ 35,00", lista "Correios PAC … R$ 37,49"; pedido #0265 com `shipping_cost 35.00`.

## Evidence

- Resposta `melhor-envio?action=quote` depois da releitura: PAC `37.49`.
- `orders` #0265: `shipping_cost 35.00`, `total 1158.07`.
