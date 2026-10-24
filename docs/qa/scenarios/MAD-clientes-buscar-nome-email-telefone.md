---
id: MAD-clientes-buscar-nome-email-telefone
area: MAD
title: Achar a cliente por nome, e-mail ou pedaço do telefone
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Nome, e-mail e telefone (por dígitos, com ou sem máscara) acham a mesma pessoa; %, _, barra, parênteses e vírgula valem como texto; o termo não vai à URL
entry_points: /clientes → campo Nome, e-mail ou telefone
qa_status: pass
bug_ids: BUG-20261024-busca-nao-acha-colada-com-espaco-duplo-ou-nbsp; BUG-20261024-busca-nao-acha-email-colado-com-sinais; BUG-20261024-busca-sem-acento-nao-acha-nome-com-acento
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: 
---

Feature `76` (`MAC-06`, A14, `MAC-28`. Colar "(51) 99812-4471", 51998124471 e 99812; colar com espaços e quebra de linha; só espaços vale como sem busca; digitar rápido trocando de termo (resposta velha não ganha). CPF não acha ninguém.)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): Telefone com e sem máscara, +55, CPF fora, %,_,\\,(,vírgula como texto, termo fora da URL, corrida de respostas: pass. Fricções de colagem registradas nos bugs (não contradizem o expected).
