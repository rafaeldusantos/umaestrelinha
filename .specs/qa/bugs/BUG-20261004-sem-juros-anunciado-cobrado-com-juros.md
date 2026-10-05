---
id: BUG-20261004-sem-juros-anunciado-cobrado-com-juros
status: blocked-verify
impact: Trust-Damage
area: vitrine / página do produto / checkout com cartão / painel → Vendas
found: 2026-10-04 (QA "parcelas do cartão", sessões S1 e S2, em produção)
---

# A loja anuncia "4x sem juros" e o caixa cobra juros desde 2x

## O que a cliente vê

Na página do produto (`/produtos/piramide-afetiva-pet`, 390×844): **"ou 4x de R$ 59,98 sem juros"**.
No checkout, depois de digitar o número do cartão: só **"À vista · R$ 255,61"** de cara, e "Mais
parcelas, com juros (até 10x)" — 2x de R$ 140,13 (total R$ 280,25), 4x de R$ 71,16 (total
R$ 284,65). A promessa da página não chega ao caixa.

Evidência: `scratchpad/qa/s2-produto-390.png`, `s1-lista-390.png`, `s3-escolha-390.png`.

## Causa (separada do sintoma)

**A conta do Mercado Pago não tem parcelamento sem juros configurado.** Medido duas vezes
(2026-10-04, manhã e noite) em `GET /v1/payment_methods/installments` com a chave pública da loja:
`installment_rate` de 9,64% em 2x, 11,36% em 4x, em todas as bandeiras e emissores.

O campo do painel ("Parcelas sem juros", `store_settings.payment.max_installments` = 4) controla o
que a loja **anuncia**. Quem decide se a cobrança tem juros é a conta do Mercado Pago — e desde
`45a8845` o caixa mostra a tabela real dela, em vez de esconder os juros atrás do número do painel.
O checkout está **certo**: mostra o que vai ser cobrado. Quem está errada é a promessa.

## Por que não foi consertado aqui

Falha o governor em "sem trade-off de produto": as três saídas custam dinheiro de formas diferentes
e a escolha é da dona. Ver *Decisions for a Human* em
`reports/2026-10-04-parcelas-cartao.md`.

## O que já foi feito (dentro do governor)

O painel passou a dizer, acima do campo, que **quem deixa de cobrar os juros é o Mercado Pago** e
onde se liga, e a dica do campo descreve o número digitado ("Até 4x sem juros. De 5x a 10x, com os
juros do Mercado Pago."). Teste: `AdminSettingsPage.test.tsx`.

## Re-diagnóstico (2026-10-04, noite) — a causa provável é a CREDENCIAL, não a configuração

A dona mostrou o painel do Mercado Pago: **"Oferecer parcelado vendedor" ligado até 4x**, com
mínimos (2x a partir de R$ 30, 3x de R$ 60, 4x de R$ 90) — a conta da loja antiga (Nuvemshop) tem as
4x sem juros. Mesmo assim, as duas chaves públicas do repositório devolvem juros desde 2x:

| Chave | Onde | Tabela (R$ 255,61, BIN Nubank e Itaú) |
| --- | --- | --- |
| `APP_USR-1871249c…` | `apps/store/.env` | 2x 9,64% · 3x 11,23% · 4x 11,36% |
| `APP_USR-c79bf0c6…` | `apps/store/.env.develop` **e o bundle de PRODUÇÃO** | idem |

E a QA de 2026-10-04 (`reports/2026-10-04-checkout-cartao.md`) aprovou pagamento com o **cartão de
teste** (titular `APRO`) em produção — credencial de conta real recusa cartão de teste. A leitura que
fecha as duas medições: **a loja nova está ligada a uma conta de TESTE do Mercado Pago**, com
configuração de parcelamento própria (sem promoção), e não à conta do painel da dona.

Consequências:
- O código do caixa **não muda**: com a credencial da conta real, a tabela devolve 2x–4x a 0% acima
  dos mínimos, e a lista pinta "Sem juros" sozinha.
- **Pagamento de cartão em produção hoje é de teste.** Nenhuma venda real passou pela loja nova
  ainda (ela é provisória; a loja no ar é a Nuvemshop), mas trocar a credencial é pré-condição de
  lançamento, independentemente das parcelas.
- Não verificado: a conta dona de cada chave (não há endpoint público que diga). A prova é a dona
  comparar a chave pública de produção da aplicação da conta real com `APP_USR-c79bf0c6…`.

Novo efeito colateral a acompanhar: os **mínimos por parcela** do Mercado Pago (R$ 30/60/90) não
existem nas settings da loja. A vitrine anuncia pelo par "Parcelas sem juros" + "Valor mínimo da
parcela" (hoje 4 e R$ 20): uma peça de R$ 80 seria anunciada em "4x de R$ 20 sem juros", e o Mercado
Pago só dá 4x sem juros a partir de R$ 90. O caixa segue a tabela e não erra; a vitrine erra.
