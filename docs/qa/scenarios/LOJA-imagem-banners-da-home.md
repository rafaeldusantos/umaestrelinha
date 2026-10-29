---
id: LOJA-imagem-banners-da-home
area: LOJA
title: Os banners de largura cheia chegam em 1080 no celular
persona: Cliente navegando pelo menu
journey: J-ver-a-joia-nitida
expected: Chamada principal (foto), grade de banners e Coleção em destaque com srcset 360/480/720/1080 e o 1080 escolhido em 390 @3x; Banner principal do celular com 360/720/1080; computador do Banner principal segue 840/1680
entry_points: /
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-29-qualidade-das-imagens/87-qa-04-home-390.png
last_report: reports/2026-10-29-qualidade-das-imagens.md
overlaps: 
---

IMG-04, IMG-05. Interceptar home_sections/home_section_items trocando as URLs por imagens do Storage local (as do banco local são do hospedado).
