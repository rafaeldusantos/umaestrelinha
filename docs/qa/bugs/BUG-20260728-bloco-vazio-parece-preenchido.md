# BUG-20260728-bloco-vazio-parece-preenchido: Bloco colapsado vazio mostra pontuação órfã e ação 'Alterar'

- **User impact:** Friction
- **Persona affected:** Bia
- **Journey / step:** J-compra-pix-celular — passo 1 (abrir o checkout)
- **Scenarios:** CHK-um-bloco-aberto
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** **fixed** (retestado em persona)

## Symptom (what the user experiences)

Ao abrir o checkout com os dados em branco, os blocos 2 e 3 aparecem colapsados exibindo resumos vazios: o bloco **Entrega** mostra literalmente `, — /` (vírgula, travessão e barra, sem nenhum dado) e o bloco **Pagamento** mostra `PIX · CPF` — o rótulo do campo, não um valor. Os dois trazem a ação **'Alterar'**, que é a afordância de bloco já concluído.

## Reproduction (from the persona's entry point)

1. Loja em 390x844, conta nova (nenhum endereço ou CPF salvo).
2. Abrir `/checkout` com itens no carrinho.
3. Rolar até os blocos 2 e 3, ainda sem preencher nada.
4. Observar `, — /` no resumo de Entrega e `PIX · CPF` no de Pagamento, ambos com 'Alterar'.

## Evidence

`docs/qa/evidence/2026-07-28-checkout-08-09/CH-money-pix-mobile-03-rodape-sobrepoe.png` — os dois blocos visíveis no mesmo quadro.

## Why it matters

Para quem chega pela primeira vez, 'Alterar' comunica *já está pronto, mexa se quiser* — e a pontuação órfã comunica *quebrado*. A cliente não sabe que precisa preencher aqueles blocos, e o CTA fica desabilitado sem dizer por quê. Confirmado que **com dados preenchidos os resumos ficam corretos** (`Avenida Brigadeiro Faria Lima, 3477 — São Paulo/SP`), então o defeito é só do estado vazio.

## Root cause (when known)

O template do resumo colapsado concatena os campos com separadores fixos sem testar se há conteúdo, e a afordância não distingue 'concluído' de 'nunca preenchido'.


---

## Fix — 2026-07-30

- **O que mudou:** Resumo vazio traz convite em vez de pontuação órfã; ação diz 'Preencher' enquanto incompleto.
- **Commit:** `99c90cc`
- **Teste de regressão:** `apps/store/src/features/checkout/ui/__tests__/PaymentBlock.test.tsx` — vermelho antes, verde depois; discriminação provada por mutação.
- **Retestado:** re-caminhada em 390×844 (iPhone 14 emulado) como Marina, sessão fresca com
  `sessionStorage` limpo. Gate completo: **842 testes, 0 falhas** · `pnpm build` 2/2.
