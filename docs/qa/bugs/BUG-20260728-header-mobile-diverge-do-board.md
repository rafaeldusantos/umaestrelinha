# BUG-20260728-header-mobile-diverge-do-board: Header do checkout no mobile usa o desenho de desktop

- **User impact:** Cosmetic
- **Persona affected:** Marina
- **Journey / step:** J-compra-pix-celular — passo 1 (abrir o checkout)
- **Scenarios:** CHK-pix-celular-happy
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** open

## Symptom (what the user experiences)

Em 390px o header do checkout mostra **logo Nanita + 'Ambiente seguro'** (o desenho de desktop), enquanto o board `07 · Checkout Mobile` desenha um header compacto: **seta de voltar + 'Finalizar compra' + 'SEGURO'**. Como o título não está no header, a página repete um H1 'Finalizar compra' e um link '← Voltar ao carrinho' abaixo da barra de resumo.

## Reproduction (from the persona's entry point)

1. Loja em 390x844, logada, com itens no carrinho.
2. Abrir `/checkout`.
3. Comparar o header com o artboard `BBG-0` do Paper.

## Evidence

`docs/qa/evidence/2026-07-28-checkout-08-09/CH-money-pix-mobile-02-checkout-390px.png` versus artboard `BBG-0`.

| | Paper (board 07) | Implementado |
| --- | --- | --- |
| Header | `←` + 'Finalizar compra' + 'SEGURO' | logo Nanita + 'Ambiente seguro' |
| Título | dentro do header | H1 separado, abaixo da barra de resumo |
| Voltar | seta no header | link '← Voltar ao carrinho' abaixo do H1 |

## Why it matters

Custo real em 390px: o header gasta a largura com o logo, e o título mais o link de voltar empurram o primeiro bloco para baixo — o board 07 é mais apertado justamente porque o espaço vertical no celular é o recurso escasso. Classificado como Cosmetic porque nada deixa de funcionar; vira Friction se o objetivo de reduzir passos até o pagamento for medido.

## Root cause (when known)

A rota `/checkout` monta um único header para os dois viewports, em vez de trocar o conteúdo no breakpoint.
