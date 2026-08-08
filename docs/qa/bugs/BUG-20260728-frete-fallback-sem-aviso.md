# BUG-20260728-frete-fallback-sem-aviso: Fallback de frete aparece sem avisar que a cotação falhou

- **User impact:** Trust-Damage
- **Persona affected:** Marina
- **Journey / step:** J-frete-real-melhor-envio — passo 2 (ler as opções de envio)
- **Scenarios:** SHP-cotacao-indisponivel-nao-bloqueia
- **First seen:** 2026-07-28 · `../reports/2026-07-28-checkout-08-09.md`
- **Status:** **invalid — retirado em 2026-07-28 (erro de medição do QA)**

## Symptom (what the user experiences)

Quando o Melhor Envio não responde, o bloco Entrega mostra uma única opção — `Frete · Correios | Frete padrão | R$ 9,90` — **sem nenhum aviso** e **sem prazo de entrega**. A cliente não tem como saber que a cotação real falhou: ela lê aquilo como se fosse a oferta de frete da loja.

## Reproduction (from the persona's entry point)

1. Loja em 390x844, logada, com itens no carrinho.
2. Abrir `/checkout` e preencher o bloco Contato.
3. Digitar um CEP válido (usado: `04538133`) e o número.
4. Ler a seção de envio: aparece só `Frete padrão R$ 9,90`, sem aviso e sem data.

## Evidence

`docs/qa/evidence/2026-07-28-checkout-08-09/CH-frete-real-01-fallback-sem-aviso.png`

Medido por leitura do DOM: `temFretePadrao: true`, `temAviso: false`, texto da seção = `"Frete · Correios Frete padrão R$ 9,90"`.

## Why it matters

A spec é explícita em SHP-05: a opção de fallback **SHALL exibir aviso de que os prazos não puderam ser consultados**. Sem o aviso, a loja transforma uma falha de terceiro em promessa silenciosa — e a cliente escolhe frete sem saber que não há prazo por trás. É a classe de problema que a 08 veio corrigir (frete exibido que não corresponde à realidade), reaparecendo pelo lado da comunicação em vez do valor.

## Root cause (when known)

Não investigada em profundidade nesta sessão. O caminho de fallback existe e é selecionado corretamente; o que falta é o elemento de aviso ao lado dele.


---

## ⚠️ Retirado — o aviso existe e renderiza

**Corrigido em 2026-07-28, na análise pós-ciclo.** Este bug foi filado por erro de medição meu, não
por defeito do produto.

O aviso existe no código: `DeliveryBlock.tsx:38` define
`'Não conseguimos consultar os prazos agora. Seguimos com o frete padrão da loja.'`, e `:386` o
renderiza sob a mesma condição `quoteFailed` que cria a opção de fallback (`:130`, `:135`).

**Por que eu não o vi:** rodei o regex sobre `document.body.innerText` **depois** de preencher o
número do endereço — momento em que o acordeão já havia avançado para Pagamento e o bloco Entrega
estava **colapsado**. O aviso vive na visão expandida. Medi o estado errado e concluí ausência.

**O que sobra como observação legítima, sem virar bug:** quando o bloco colapsa, o resumo mostra
`Correios Frete padrão · R$ 9,90` sem nenhum vestígio de que aquilo é fallback. A informação foi dada
uma vez e desapareceu. Se isso deve persistir no resumo é decisão de produto, não defeito de spec —
SHP-05 pede o aviso e o aviso é exibido.
