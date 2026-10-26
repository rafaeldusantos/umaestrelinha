---
id: MAD-clientes-privacidade-nada-no-aparelho
area: MAD
title: Nome, e-mail e telefone não ficam na URL, no armazenamento nem no console
persona: Adri no celular
journey: J-achar-uma-cliente
expected: Depois de buscar e abrir fichas, URL, history.state, localStorage, sessionStorage, IndexedDB, título do documento e console não têm dado da cliente; só requisições ao Supabase da loja
entry_points: /clientes → busca → ficha
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: 
---

Feature `76` (`MAC-28`, `MAC-29`. Varredura em navegador com fixturas @exemplo.invalid (não capturar tela com dado real). A rota da ficha leva só o UUID. O service worker não guarda resposta de dado.)
