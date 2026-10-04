---
id: BUG-20261004-cartao-aprovado-cai-na-home
status: fixed
impact: Trust-Damage
area: checkout / aprovação do cartão
found: 2026-10-04 (QA, sessões s3-confirmacao e s6-afetivo)
---

# Cartão aprovado leva à Home com a sacola vazia, e não à confirmação do pedido

## O que a cliente vê

Ela paga, o cartão é aprovado — e a loja abre a **Home com a gaveta "Sua sacola está vazia"**.
Sem número de pedido, sem "recebemos seu pedido". Num produto afetivo é pior: a confirmação é a
tela que diz **como enviar o material** (`OrderMaterialBlock`), e ela nunca aparece.

## Reprodução (persona: cliente no celular, 390×844, sem conta)

Checkout completo com cartão de teste aprovado (`APRO`), produto `piramide-afetiva-pet`.

**Medido (`s6-afetivo`), a sequência de URLs:**

```
20:03:19.468 pushState    /pedido/d1b05a46-…   o checkout navega para a confirmação
20:03:19.497 replaceState /carrinho            29 ms depois: a guarda de sacola vazia do checkout
20:03:19.587 replaceState /                    /carrinho abre a gaveta e volta para a Home
```

Destino final: `/` (`s3-confirmacao-FALHA.png`, `s6-afetivo-06-destino.png`).

## Causa

`handlePaymentSuccess` navega para `/pedido/:id` e, em seguida, limpa a sacola. No app,
`/checkout` fica FORA do `StoreLayout` e `/pedido/:id` DENTRO dele, sob o `Suspense` de topo: a
troca de rota suspende, e o React **esconde o checkout sem desmontá-lo** enquanto a página nova
carrega. Ele segue ouvindo a sacola, e quando ela esvazia a guarda
`items.length === 0 → <Navigate to="/carrinho">` dispara. O comentário do código confiava na ordem
das duas chamadas ("navegar antes de limpar"), e a ordem não decide nada aqui.

O teste `a confirmação não é o redirecionamento de carrinho vazio` passava em jsdom porque a suíte
montava o checkout DENTRO das rotas: lá a troca de rota o desmonta antes e a guarda nunca dispara.

## Conserto

`CheckoutPage.tsx`: uma ref `compraConcluida`, marcada em `handlePaymentSuccess` antes da
navegação. Com ela ligada, a guarda de sacola vazia devolve `null` em vez de `<Navigate>`.

Teste de regressão: `CheckoutPage.test.tsx` → "com o checkout AINDA MONTADO quando a sacola
esvazia (como no app), a cliente fica na confirmação" — monta o checkout FORA das rotas, que é o
estado que o `Suspense` produz no app. **Vermelho antes** (`passagensPeloCarrinho` = 1), verde depois.
Duas tentativas de reproduzir de outro jeito (navegação adiada; confirmação `lazy`) NÃO
reprovaram, e foram descartadas por isso.

Re-walk no navegador (`s6-afetivo-pos`): `/pedido/41ffc8da-…` e nada depois; a tela mostra
"Pedido #0173 · Pago" e "Aguardando seu material / Envie o seu material".
