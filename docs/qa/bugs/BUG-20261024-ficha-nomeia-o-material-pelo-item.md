# BUG-20261024-ficha-nomeia-o-material-pelo-item: Os pedidos da ficha leem em voz alta o material ("com Cinzas de Cremação") contra a regra de tom

- **Status:** open (aguarda decisão humana, task aberta no `tasks.md`)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack (e Adri no celular)
- **Journey Step:** J-ver-uma-cliente, passo "ver o que ela já levou"
- **Scenarios:** MAD-cliente-tom-memorial; MAD-clientes-tom-memorial
- **Found:** 2026-10-24 · **Report:** reports/2026-10-24-mobile-adm-clientes-leitor-de-tela.md

## Summary

Cada pedido da ficha mostra "#número · nome do primeiro item" (MAC-18). Os nomes de produto do catálogo
trazem o material: "Joia Afetiva … com Leite Materno e Cabelo", "Pulseira Esfera com Cinzas de Cremação…",
"… com Dente de Leite". A spec, em MAC-35 e no Out of Scope, diz que a ficha **não SHALL nomear o material que a
pessoa confiou** ("exposição sem ganho" numa lista de contatos), e o cenário `MAD-cliente-tom-memorial`
espera "sem material_kinds". Hoje a tela não lê `material_kinds`, mas o nome do item diz a mesma coisa, e o
TalkBack o lê em voz alta, num aparelho que pode estar em lugar público. As duas exigências da spec se
contradizem; nenhuma das duas sabe da outra.

## Reproduction

- **Charter:** CH-clientes-com-leitor-de-tela · **Tour:** Feature Tour (varredura de frases)
- **Environment:** Chromium 390×844, build servido, Supabase local (pedidos importados da Nuvemshop)

1. Abrir Clientes; abrir as 25 primeiras fichas.
2. Varrer o texto de cada ficha por "cinzas", "leite", "cabelo", "material".

**Expected:** nenhuma frase fixa ou dado nomeando o material confiado.
**Actual:** 16 das 25 fichas listam item com o material no nome (ex.: "Pulseira Afetiva Esferas com Leite Materno em Prata 925"). Sem exclamação, emoji, ranking, VIP ou urgência em nenhuma ficha.

## Evidence

- Varredura descrita acima (saída com dados de clientes reais não guardada de propósito).
- O status "Aguardando material"/"Material a caminho" vem de `orderSituation` (`core`), é o estado do pedido, não o tipo de material; não foi contado como achado.

## Fix

Decisão humana: (a) cortar o item da linha da ficha (só número, data, total, situação), (b) manter e reescrever MAC-35,
ou (c) mostrar só a categoria da peça. Não aplicado.

## Fix applied

Não aplicado: a spec se contradiz (`MAC-18` manda o nome do item, `MAC-35` manda não nomear o material). Decisão humana pendente (B12).
