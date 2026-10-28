---
id: PNL-seo-fonte-grande-e-telas
area: PNL
title: A aba SEO em 360/390/412/1440 com a fonte a 130 % e 200 %
persona: Adri cadastrando peças
journey: J-curar-seo-com-ia
expected: Prévia e selo legíveis (D1), botões dentro do cartão e com 44 px (D2); rolagem do body só pelo SlugField (anterior)
entry_points: aba SEO
qa_status: pass
bug_ids: BUG-20261027-previa-do-google-ilegivel-com-fonte-200
fix_status: fixed
retest_status: pass
fix_commits:
evidence: evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/360-200-previa.png;evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/390-200-previa.png;evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/390-130-previa.png;evidence/2026-10-27-backoffice-seo-com-ia/390-200-previa-automatica.png;evidence/2026-10-27-backoffice-seo-com-ia/360-200-previa-automatica.png;evidence/2026-10-27-backoffice-seo-com-ia/390-200-sugerido.png;evidence/2026-10-27-backoffice-seo-com-ia/390-130-sugerido.png
last_report: reports/2026-10-27-backoffice-seo-com-ia-reteste.md
overlaps:
---

Reteste de D1/D2 da prova-navegador.md.

2026-10-27: D2 passa (botões dentro do contêiner, ≥ 44 px, rótulo embrulha, em 360/390/412 a 130/200 % e 1440/200 %). D1 passa só em parte: o selo não come mais a largura, mas o título da prévia segue truncado em uma linha ("TESTE-…" a 390/200 %) e o selo sai da caixa a 360/200 %. Rolagem do body a 130 % (402) e 200 % (616) vem do SlugField, anterior à 84.

2026-10-27 (reteste 2, depois do segundo conserto — prévia sem `line-clamp`, selo `whitespace-nowrap max-w-full`): passa. Em 360/390/412 a 130 % e 200 % e em 1440/100 %, título e descrição da prévia inteiros (`scrollHeight` = `clientHeight`, sem reticências, `innerText` completo), selo "automático" numa linha e dentro da caixa nos 7 casos, nenhum elemento da prévia além da viewport. A rolagem do body que resta (402 a 130 %, 616 a 200 %; nenhuma a 412/130 % e 1440) é do `SlugField`, anterior à 84.
