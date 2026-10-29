---
id: PNL-menu-outro-endereco-invalido
area: PNL
title: Digitar outro endereço da loja inválido
persona: Adri montando o menu
journey: J-montar-o-menu-da-loja
expected: Endereço externo (https://, //), vazio, só espaços e caminho que não é rota da loja são recusados com motivo legível, sem gravar
entry_points: /admin/menu → Página da loja → Outro endereço da loja
qa_status: pass
bug_ids: BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe; BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar; BUG-20261029-filha-num-segmento-recusada-no-outro-endereco
fix_status: fixed
retest_status: verified
fix_commits:
evidence: evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-11-endereco-recusado-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-07-caminho-de-colecao-some-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-01-colecao-raiz-grava-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-02-nao-existe-recusado-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-03-colecao-filha-no-submenu-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-01-forma-curta-grava-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-01-forma-curta-grava-1440.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-02-fora-do-ar-390.png; evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4/r4-02-fora-do-ar-1440.png
last_report: reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
overlaps: 
---

Feature `86`. MNM-12. Tentar também: `/produtos/slug-inexistente`, `/sobre?x=1`, `/sobre/`, `SOBRE`, colado com espaço no fim, `javascript:`. Um endereço válido colado com espaço deve passar (ou ser recusado com motivo claro).

**Rodada 3 (2026-10-29).** Coleção ativa raiz e filha (com maiúsculas e barra final) gravam normalizadas, no menu principal e no submenu, 1 PATCH cada (`BUG-20261029-caminho-de-colecao-…` verified). Seguem recusadas, sem PATCH: `https://google.com`, `javascript:alert(1)`, `//evil.com`, vazio, só espaços, `/nao existe`, `/nao-existe`, `/produtos/inexistente-xyz`, peça inativa, `/black-friday` (inativa), `/personalizados/profissoes` (filha inativa), repetido na raiz ("Já está no menu.") e no submenu ("Já está neste submenu."); banner com destino digitado `/botanicas` continua recusado (regra da 39). Fail só pelo novo Low: a filha num segmento (`/colar-e-correntes`), que a loja abre, é recusada.

**Rodada 4 (2026-10-29).** Forma curta de subcategoria aceita e gravada na canônica, 390 e 1440: `/COLAR-E-CORRENTES/` ⇒ 1 PATCH, banco `/joias-e-acessorios/colar-e-correntes`; `/aneis?ordem=novos#topo` ⇒ `/joias-e-acessorios/aneis?ordem=novos#topo`; no submenu `/Nomes/` ⇒ `/personalizados/nomes`. A loja abre as três (h1 "Colar e correntes", "Anéis", "Nomes"). Repetidos recusados nas duas formas ("Já está no menu."/"Já está neste submenu."). Inativas (`/black-friday`, `/profissoes`, `/personalizados/profissoes`) dizem "fora do ar (desativada)"; pai errado, 3 segmentos, `/inventada-xyz`, `/nao-existe`, `javascript:` dizem "Não há página"; `https://`, `//` "só páginas da loja"; vazio; peça inexistente e inativa "Não há peça à venda". Zero PATCH em todas as recusas. `BUG-20261029-filha-num-segmento-…` verified.
