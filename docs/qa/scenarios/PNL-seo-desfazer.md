---
id: PNL-seo-desfazer
area: PNL
title: Desfazer devolve o texto curado anterior
persona: Adri cadastrando peças
journey: J-curar-seo-com-ia
expected: Desfazer devolve exatamente os dois textos; some na edição, na próxima sugestão e no save
entry_points: aba SEO com texto já escrito
qa_status: pass
bug_ids: BUG-20261027-segunda-sugestao-perde-o-texto-da-adri
fix_status: fixed
retest_status: pass
fix_commits:
evidence: 
last_report: reports/2026-10-27-backoffice-seo-com-ia-reteste.md
overlaps:
---

SIA-12.

2026-10-27: Desfazer devolve os dois textos e some na edição, no save e na próxima sugestão — como a spec manda. Mas a segunda sugestão seguida descarta o texto escrito à mão (o Desfazer passa a devolver a primeira sugestão): decisão de produto, ver BUG-20261027-segunda-sugestao-perde-o-texto-da-adri.
