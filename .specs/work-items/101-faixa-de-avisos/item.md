---
id: 101
titulo: Faixa de avisos no topo da loja (textos ou imagens que se alternam)
tipo: feature
entrada: prd
fase: done
criado: 2026-11-13
---
## Descrição
Pedido de 2026-11-13:

"possiveis elementos para dar destaque nas promoçoes como um topheader destacando a blackfriday" · "top header passando informaçoes sobre as promoçoes da BlackFriday, esse pode ser mais um compomente da Home possibilidar adicionar uma imgens que fica passando ou os textos Black Friday."

## Insumos
- PRD: `prd.md` (escrito nesta sessão)
- Protótipo: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`), página **`Black Friday - Home.html`** — a faixa dourada acima do cabeçalho, com o painel do protótipo alternando Textos · Imagens · Desligada (`FaixaTopo` em `bf-loja.jsx`, estilos `.faixa*` em `bf.css`) — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html. O Claude Design avulso sai do ar até 2026-12-14.
- Protótipo do painel: **`Painel - Campanhas, faixa e perfil.html`**, tela **Faixa de avisos** (UC-03, D-02: interruptor, prévia no computador e no celular 390 com anterior/próximo, lista de até 5 avisos com ordem, tipo texto ou imagem, recusa de destino externo e de imagem sem texto alternativo; cenário "Destino externo") — https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html (escolher a tela no painel do protótipo; `adm-faixa-perfil.jsx`)
- O cromo da loja: `apps/store/src/widgets/header/ui/Header.tsx`, `apps/store/src/widgets/store-layout`, `apps/store/src/shared/lib/storeChrome`
- O molde de carrossel com giro, pausa e movimento reduzido: `apps/store/src/widgets/hero-carousel` (`useHeroCarousel`)
- A régua de destino interno: `ctaHrefRefusal` (`@estrelinha/core/home`)
- Envio de imagem no painel: `apps/backoffice/src/shared/lib/uploadImage.ts`
- O HTML servido (para reservar a altura sem salto): `apps/store/server/page.ts`, `packages/core/src/page/head.ts`

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| decisões do PRD (chat) | 2026-11-13 | D-01 loja inteira, menos o checkout · 2 perguntas abertas (onde a dona edita; cor da faixa) |
| decisões do PRD (chat) r2 | 2026-11-13 | pela recomendação: D-02 tela própria no grupo Loja · D-03 cor fixa `accent` + `ink` · 0 perguntas abertas |
| prd-review r1 | 2026-11-13 | changes_requested_blocking · 5 aplicados ao `prd.md` · 10 em Decisões · 0 abertos · inline a pedido (pela recomendação) |
| handoff | 2026-11-13 | pass · 24 itens → `spec.md` Decisões (H-01..H-24) · 0 travados · inline a pedido (pela recomendação) |
| fila | 2026-11-13 | aprovada · 01–04 · ondas 01 \| 02,04 \| 03 · auditoria `a fila serve com correção` (2 corrigidos: ordinal masculino na 01, citação da miniatura na 04) |
| execução | 2026-11-13 | autorizada: 01–04 (pelo orquestrador) |
| validation 1 | 2026-11-13 | PASS · core 5832 · store 7258 · backoffice 5294 · mobile-adm 2729 · functions 1669 · build e lint sem regressão · navegador (RN-07, CA-05..07) → QA |
| QA · perguntas do plano | 2026-11-13 | 2 itens · 2 respondidos (Q-01: a 200 % a faixa cresce além de duas linhas · Q-02: interceptar o documento e escrever data-faixa) |
| QA · Gate 1 — plano | 2026-11-13 | aprovado (árbitro, por delegação) · 4 personas · 5 jornadas · 7 charters em 6 lotes · 27 TC · 19/19 critérios |
| QA · Gate 3 — veredito | 2026-11-13 | rodada 1 · fail (confirmado pelo árbitro, por delegação) · 2 bugs novos: BUG-002 high, BUG-001 high · pass 14 · fail 2 · skip 11 · CH-06 not-run (sem escopo do Claude Design) |
| QA · Gate 3 — veredito | 2026-11-13 | rodada 2 (confirmação) · partial (confirmado pelo árbitro, por delegação) · 0 bugs novos · BUG-001 e BUG-002 → resolved · pass 20 · fail 0 · blocked 1 (TC-FUNC-011: a sacola não recebe a peça no local, fora do WI) · skip 6 · CH-06 not-run (sem escopo do Claude Design) |
| fix tasks | 2026-11-13 | rodada 1 · 05 (BUG-002) · 06 (BUG-001) · lotes de um, como o QA sugeriu · ondas 05 \| 06 · aprovados pelo orquestrador |
| validation 2 | 2026-11-13 | PASS · core 5838 · store 7262 · backoffice 5295 · functions 1669 · mobile-adm 2729 · tipos e lint iguais à baseline · build verde · BUG-001 e BUG-002 aguardando reteste do QA |
