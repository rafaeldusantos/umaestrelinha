# Sessão CH-03 · Listas e adicionais no painel sob maus-tratos

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-listas-e-adicionais-no-painel.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` (usuário de dev do `supabase/seed.sql` §5 — valor não registrado) |
| Tour · modo | Garbage · por técnica (valor limite)                                   |
| Rodada      | confirmação (rodada 2) — TC-FUNC-036 e entorno de BUG-009..012         |
| Orçamento   | 18 ações de browser de 25 (várias ações agrupam passos num script de Playwright) |
| Ambiente    | painel http://localhost:8083 · dev server do worktree feature/WI-01 · Chromium headless (Playwright MCP) · 1440 × 900, com passagens em 390 × 844 |
| Paridade    | Supabase local :54441; `*.supabase.co` e `**/g/collect*` bloqueados por rota; dado sintético (produtos QA-*) |

## Missão

Confirmar que a dona monta a lista e os adicionais sem perder o que fez, mesmo empurrando os limites, e que toda recusa vem escrita, com o motivo. Nesta rodada: só o TC que falhou (TC-FUNC-036) e o entorno imediato das correções (busca do adicional, aba Compre junto do produto, editor de lista, índice).

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entrou e abriu Catálogo › Compre Junto (1440) | Subtítulo "As listas de peças que você oferece junto com outras joias, e como elas estão saindo. O Compre Junto de cada joia se monta na página dela."; aba "Listas 2" com a contagem; "Editar" com borda (botão pequeno); QA Correntes 5 de 12 · 2 joias; QA Probe Sem Venda 1 de 12 · Nenhuma joia | `screenshots/R2-CH-03-01-indice-1440.png` |
| 02 | O mesmo índice em 390 | Cartões "5 peças · em uso em 2 joias" e "1 peça · em nenhuma joia"; `scrollWidth` 390, sem rolagem lateral | `screenshots/R2-CH-03-02-indice-390.png` |
| 03 | Abriu M-01 (QA Pingente Estrela), aba "Compre junto" | Frase "Até três peças que a cliente pode levar junto com esta joia, na ordem em que aparecem na loja. Nada vem marcado: ela escolhe o que quer."; 3 de 3 adicionais (QA Correntes · QA Berloque Coração 2 de 3 · QA Medalha Afetiva todas as ativas (2)); "a partir de R$ 69,90 / R$ 149,90" ao lado de "Trocar"; dicas "O nome da lista/do produto é o que a cliente lê no bloco."; "Variações oferecidas: …" com "Escolher quais"/"Esconder"; cartão lateral "Na loja" com a ordem e "Quando a peça sai do ar" na lateral; no adicional da lista, "Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma." A tela abriu com "Alterações não salvas · Rascunho salvo automaticamente · há 1 s" sem edição (observação) | `screenshots/R2-CH-03-03-aba-m01-1440.png` |
| 04 | "Acrescentar um adicional" com 3 montados | Continua "3 de 3 adicionais" e a recusa "Cada joia leva até 3 adicionais. Tire um para acrescentar outro." | `screenshots/R2-CH-03-03-aba-m01-1440.png` |
| 05 | "Trocar" no adicional 3 e buscou "QA Pingente Estrela" (a própria joia) | A joia aparece na lista **desabilitada com "É esta joia"**; "QA Pingente Estrela Guia…" (outra peça) segue escolhível. Ao abrir sem digitar a busca mostra "Mostrando 20 de 747. Escreva mais do nome para estreitar a busca." (já registrado no reteste, observação) | `screenshots/R2-CH-03-04-busca-propria-joia.png` |
| 06 | Na mesma busca, "QA Berloque" | "QA Berloque Coração — Já está em outro adicional" desabilitado; o Berloque Vazado segue escolhível | `screenshots/R2-CH-03-05-busca-berloque.png` |
| 07 | "Descartar" no M-01 | Voltou ao banco e à lista de produtos; ao reabrir M-01: 3 de 3 adicionais, QA Correntes / QA Berloque Coração (2 de 3) / QA Medalha Afetiva (todas as ativas (2)) — igual à massa | — |
| 08 | M-04 (QA Joia Sem Compre Junto): novo adicional "Uma peça só", buscou "joia sem compre" (minúsculas, o caso do BUG-009) | "QA Joia Sem Compre Junto — É esta joia", desabilitada. M-04 abriu com rascunho local "1 de 3 adicionais"; "Descartar" pediu confirmação ("Descartar as alterações? … Esta ação não pode ser desfeita.") e, recarregado, M-04 voltou a "0 de 3 adicionais · Sem Compre Junto. A página desta joia fica como hoje, sem o bloco." | `screenshots/R2-CH-03-06-m04-sem-acento.png` |
| 09 | Editor da lista QA Correntes (1440) | Trilha "Compre Junto › QA Correntes"; "12 / 40"; dica "É este nome que a cliente lê no Compre Junto, na página de cada joia que usa a lista…"; "Acrescentar uma peça · 747 no catálogo" sem resultados abertos; "Variações oferecidas: todas as ativas (N)"; "Em uso: 2 joias oferecem esta lista. Mudar aqui muda o Compre Junto de todas elas." (QA Pingente Estrela, QA Pingente Lua); "Como a cliente vê: Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem…" | `screenshots/R2-CH-03-07-editor-1440.png` |
| 10 | O mesmo editor em 390 | `scrollWidth` 390. Os nomes das peças da lista continuam cortados: largura 38 px para conteúdo de 130–153 px ("QA ...") — a N-1 do reteste, já conhecida (observação) | `screenshots/R2-CH-03-08-editor-390.png` |
| 11 | Busca do editor: "q" (1 letra) e "qa corrente" | Com 1 letra nada abre; com "qa corrente" as três correntes da lista vêm "Já está na lista" desabilitadas. Estado seguiu "Tudo salvo"; nada gravado | — |
| 12 | Saiu pelo menu "Conta e saída" › Sair e abriu direto `/admin/compre-junto` e a URL da lista | As duas redirecionam a `/admin/login`, nenhum dado da lista aparece | `screenshots/R2-CH-03-09-deslogada.png` |
| 13 | Limpou o storage e os cookies de :8083 e fechou o browser | — | — |

**Edge cases tentados:** 4º adicional; busca da própria joia em minúsculas; "Trocar" com a busca reaberta; busca de 1 letra no editor; 390 no índice e no editor; rota direta deslogada.

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-036 | pass | 05, 06, 03, 08 | `screenshots/R2-CH-03-04-busca-propria-joia.png`, `screenshots/R2-CH-03-05-busca-berloque.png`, `screenshots/R2-CH-03-06-m04-sem-acento.png` | Passo 1 "É esta joia" (M-01 e M-04), passo 2 "Já está em outro adicional", passo 3 aviso da lista; variação "Trocar" zera e reabre a busca |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

Os outros TC do charter passaram na rodada 1 e não foram reexecutados; o entorno conferido (TC-FUNC-035 recusa do 4º, TC-SEC-001 rota deslogada, textos de BUG-010/011/012) se manteve.

## Achados

nada — nenhuma regressão nem achado novo critical/high.

Observações (não viram bug nesta rodada):

- **O-1 (N-1 do reteste, persiste):** editor de lista em 390, nomes das peças em 38 px ("QA ..."). Passo 10, `screenshots/R2-CH-03-08-editor-390.png`.
- **O-2 (já registrada, pré-existente):** M-01 abre com "Alterações não salvas · Rascunho salvo automaticamente · há 0–1 s" sem edição e dispara `beforeunload` ao sair; M-04 abriu com um rascunho local antigo ("1 de 3 adicionais") que não estava no banco. Passos 03, 08.
- **O-3 (já registrada no reteste de BUG-011):** a busca do adicional na aba do produto abre 20 resultados sem digitar ("Mostrando 20 de 747…"), enquanto o editor de lista só abre a partir de 2 letras. Passo 05.

## Spec-gaps

nada (rodada de confirmação).

## Fora da cobertura

- TC do charter que passaram na rodada 1 (TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-029/030/031/035/038/039/040, TC-SEC-001, TC-PERSONA-002) — não reexecutados por escopo da confirmação; só o entorno das correções foi conferido.
- Conferência na loja do texto/ordem após editar — nenhuma gravação foi feita (regra de não mexer na massa).
- Aba do produto em 390 — não aberta, por escopo.

## Estado final da massa tocada

- **M-01**: editado (Trocar no adicional 3) e **descartado**; reaberto igual à massa (3 de 3, Berloque 2 de 3, Medalha todas as ativas).
- **M-04**: adicional novo e rascunho local antigo **descartados**; no banco segue "0 de 3 adicionais".
- **Lista QA Correntes**: só aberta e buscada; "Tudo salvo", nada gravado.
- O storage de :8083 foi limpo ao fim, o que apagou também os rascunhos automáticos locais dos formulários de produto (nada no banco).
- Nenhum produto não-QA foi editado.

## Debrief

- **Surpresas:** nenhuma; as quatro correções se mantiveram.
- **Próximo charter:** se a N-1 virar bug, retestar o editor de lista em 390 com nomes reais longos.
- **Padrão novo:** o `beforeunload` dos formulários com rascunho automático interrompe roteiros que navegam entre produtos; aceitar o diálogo antes de seguir.
