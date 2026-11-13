# Sessão CH-03 · Achar a oferta pelo celular

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-03-achar-a-oferta-pelo-celular.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-02 Marina · conta: anonima |
| Tour · modo | Feature · com tour (rodada de confirmação: sem tour, só os TC e o entorno das correções) |
| Rodada      | confirmação |
| Orçamento   | 55 ações de browser de 50 (navegação, toque/clique, rolagem, viewport, rotas; leituras — snapshot, eval, get, screenshot — fora da conta). Passou 5 do teto por rolagens até o bloco da Home, que o modal do Instagram escondia |
| Ambiente    | http://localhost:8092 (worktree `store__feature-102`) · build não exposto · Chromium headless (agent-browser 0.39.1, `set device "iPhone 12"`) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | `*.supabase.co` e `**/g/collect*` bloqueados por rota. O `set device` do agent-browser não liga o toque (`maxTouchPoints` = 0) e o `tap` dele é o mesmo `click` de mouse; o toque real foi feito com `Input.dispatchTouchEvent` (touchStart/touchEnd) pelo CDP do browser da sessão, com `Emulation.setTouchEmulationEnabled` — um toque por chamada, no centro do elemento conferido antes com `elementFromPoint`. Os cliques de seleção (variação, ordenação, filtros, 1440) foram de mouse |

## Missão

Como quem nunca abriu a loja e chegou pelo celular, confirmar que dá para achar as peças em oferta pela Home e por
`/ofertas` e entender, sem fazer conta, quanto cada uma custa — procurando cartão e página discordando do preço,
faixa cobrindo o que a cliente quer tocar, e promessa que a tela faz e não cumpre.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Em 390 × 844, abriu M-A, fechou o aviso de cookies, rolou e tocou (toque real) em "Adicionar à sacola" na barra fixa | A gaveta "Sua sacola" abriu com M-A: "de R$ 385,00 por R$ 346,50", selo "DIA DAS MÃES · −10%", Subtotal R$ 346,50. Na página: selo em linha, R$ 346,50, "De R$ 385,00", 4x de R$ 86,63, R$ 322,24 no Pix | `screenshots/CH-03-r2-01-toque-ma-sacola-390.png` |
| 02 | Na gaveta, tocou na lixeira de M-A | A peça saiu; a gaveta ficou aberta, vazia, com "Explorar joias". A lixeira mede 16 × 16 px | `screenshots/CH-03-r2-02-lixeira-sacola-vazia-390.png` |
| 03 | Abriu M-E (peça comum), rolou e tocou em "Adicionar à sacola" na barra fixa | A gaveta abriu com M-E a R$ 340,00, sem selo, com "Faltam 2 para cada peça sair a R$ 306,00" (promoção progressiva) | `screenshots/CH-03-r2-03-toque-me-sacola-390.png` |
| 04 | Tocou na lixeira de M-E | A peça saiu; a sacola ficou vazia (2 de 2 remoções pela lixeira com toque) | — |
| 05 | Na Home em 390, rolou até o bloco da campanha (fechou antes o convite do Instagram, "Agora não") | Bloco "Dia das Mães" com 10 % e 15 %, "Ver as peças →"; a fileira "Algumas das peças em oferta" com "Ver todas" ao lado, e os 4 cartões com a faixa. "Ver todas" mede 56 × 20 px | `screenshots/CH-03-r2-04-home-ver-todas-390.png` |
| 06 | Tocou em "Ver todas" | Chegou a `/ofertas`: "Todas · 4", "10% · 2", "15% · 2" | — |
| 07 | Em 1440 × 900, voltou à Home e clicou em "Ver todas" | O link está ao lado do subtítulo e leva a `/ofertas` | `screenshots/CH-03-r2-05-home-ver-todas-1440.png` |
| 08 | Em `/ofertas` (1440), olhou o cartão de M-D e clicou na miniatura "Ouro Rose" | Cartão de 224 px; faixa de 30 px no pé da foto; 3 miniaturas de 45 px a 14 px da esquerda, 12 px acima da faixa (42 px do pé da foto), sem sobrepor. O clique trocou a foto (outro arquivo) e a URL ficou em `/ofertas` | `screenshots/CH-03-r2-06-md-cor-1440.png` |
| 09 | Em 390, recarregou `/ofertas` e olhou o cartão de M-D | Cartão de 171 px; faixa de 30 px; 1 miniatura de 40 px (a cor atual) + "+2", 10 px acima da faixa (40 px do pé da foto), sem sobrepor | `screenshots/CH-03-r2-07-md-miniatura-390.png` |
| 10 | Tocou na miniatura visível (a cor atual) | Nada navegou; a URL ficou em `/ofertas` | `screenshots/CH-03-r2-07-md-miniatura-390.png` |
| 11 | Escolheu outra cor em 1440, voltou a 390 sem recarregar e tocou na miniatura "Ouro Branco", agora não pressionada | A foto do cartão trocou, a miniatura ficou pressionada e a URL ficou em `/ofertas` | `screenshots/CH-03-r2-08-md-troca-foto-390.png` |
| 12 | Ordenou `/ofertas` por "Menor preço" (390) | URL `?ordem=menor-preco`. Ordem: M-D R$ 289,00 · M-B R$ 373,15 · M-C R$ 336,60 · M-A R$ 346,50. O cartão de M-B mostra "De R$ 439,00 R$ 373,15", mas a ordem bate com o preço da variação mais barata de M-B (R$ 383,00 → R$ 325,55); pelo preço cheio, a ordem seria M-D, M-C, M-B, M-A | `screenshots/CH-03-r2-09-ofertas-menor-preco-390.png` |
| 13 | Abriu M-B; ficou na variação de partida (sem base, Prata 925, sem gravação), a mais barata | R$ 325,55, "De R$ 383,00", 4x de R$ 81,39, R$ 302,76 no Pix — 15 % sobre R$ 383,00. O cartão da mesma peça mostra R$ 373,15 | — |
| 14 | Escolheu a variação mais cara (com base, Ouro Rose, com gravação) | R$ 474,30, "De R$ 558,00", 4x de R$ 118,58, R$ 441,10 no Pix | — |
| 15 | Tocou em "Adicionar à sacola" na barra fixa e depois na lixeira | Gaveta: "de R$ 558,00 por R$ 474,30", "DIA DAS MÃES · −15%", com base, Ouro Rose e gravação, Subtotal R$ 474,30. A lixeira tirou a peça | `screenshots/CH-03-r2-10-mb-cara-sacola-390.png` |
| 16 | Abriu `/black-friday` | Redirecionou para `/ofertas` | `screenshots/CH-03-r2-11-black-friday-redirect-390.png` |
| 17 | Na coleção `pulseiras-afetivas` (`/joias-e-acessorios/pulseiras-afetivas`), abriu "Filtros" | Faixa de preço de 192 a 383 — o teto fica abaixo do cheio de M-A (R$ 385) e do de M-B (até R$ 558), coerente com o cálculo pelo preço com desconto | — |
| 18 | Ligou "Apenas com desconto" e aplicou | `?desconto=1`, 4 peças: M-C, M-B, M-D e M-A — M-A, M-B e M-D só entram pela campanha | `screenshots/CH-03-r2-12-colecao-com-desconto-390.png` |
| 19 | Desligou o filtro de desconto, pôs o teto em 360 (entre R$ 346,50 e R$ 385,00 de M-A) e aplicou | `?preco=192-360`, 12 peças, com M-A (R$ 346,50). M-B também aparece, com o cartão mostrando R$ 373,15, acima do teto de 360 | `screenshots/CH-03-r2-13-colecao-ate-360-390.png` |

**Edge cases tentados:** nada novo (rodada de confirmação). Só os da correção: toque real em vez do clique de mouse, uma peça da campanha e uma comum, e a lixeira com toque.

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-FUNC-004 | pass | 01–04 | `screenshots/CH-03-r2-01-toque-ma-sacola-390.png` · `CH-03-r2-03-toque-me-sacola-390.png` | O BUG-001 não reproduziu com toque real: a barra fixa acrescentou M-A (R$ 346,50, cheio riscado, selo em linha) e M-E (R$ 340,00); a lixeira tirou as duas. Passos 1–3: cartão de M-A em `/ofertas` com a faixa "DIA DAS MÃES, 10%", "De R$ 385,00 R$ 346,50", 4x de R$ 86,63 e nenhum selo de canto no nome acessível; a página igual |
| TC-FUNC-018 | pass | 05–07 | `screenshots/CH-03-r2-04-home-ver-todas-390.png` · `CH-03-r2-05-home-ver-todas-1440.png` | Correção do BUG-006 confirmada: "Ver todas" em 390 (pelo toque) e em 1440 levam a `/ofertas` |
| TC-FUNC-011 | pass | 16 | `screenshots/CH-03-r2-11-black-friday-redirect-390.png` | Só o passo 5 (`/black-friday` → `/ofertas`), pelo briefing. Chips em `/ofertas`: Todas · 4, 10 % · 2, 15 % · 2 |
| TC-FUNC-020 | fail | 12, 19 | `screenshots/CH-03-r2-09-ofertas-menor-preco-390.png` · `CH-03-r2-13-colecao-ate-360-390.png` | Ordenação, "Com desconto" e faixa usam o preço com desconto (R-06 cumprido: M-A entra no "Com desconto" e no teto de 360). Falha o texto do passo 1, "a ordem segue o preço com desconto **que cada cartão mostra**": o cartão de M-B mostra R$ 373,15 (variação de R$ 439) e fica antes de M-C, que mostra R$ 336,60. Pela regra da rodada, vai como sugestão de backlog SB-1, não como achado (não é regressão de correção nem critical/high) — a triagem decide |
| TC-UI-001 | pass | 08–11 | `screenshots/CH-03-r2-06-md-cor-1440.png` · `CH-03-r2-07-md-miniatura-390.png` · `CH-03-r2-08-md-troca-foto-390.png` | Miniaturas acima da faixa, sem sobrepor (10 px em 390, 12 px em 1440); o toque e o clique trocam a foto sem navegar. Em 1440 aparecem as 3 miniaturas e o "+2" fica oculto; o TC fala em "2 + +N" — M-D tem só 3 cores e cabem as 3. Em 390, a única miniatura visível é a cor atual: só deu para trocar a foto pelo toque depois de mudar a cor em 1440 (passo 11) |
| TC-FUNC-007 | pass | 13–15 | `screenshots/CH-03-r2-10-mb-cara-sacola-390.png` | Mais barata R$ 383,00 → R$ 325,55; mais cara R$ 558,00 → R$ 474,30; o riscado acompanha; a sacola tem o mesmo valor da página |

Contagem: pass 5 · fail 1 · blocked 0 · skip 0

## Achados

nada

**Sugestões de backlog** (rodada de confirmação: não são regressão nem critical/high):

- **SB-1 · [Cartão de M-B] o preço do cartão não é o da variação que ordena, filtra e abre a página** — medium proposta.
  O cartão de M-B (em `/ofertas`, na Home e na coleção) mostra "De R$ 439,00 R$ 373,15", mas a página abre na variação
  de R$ 383,00 → R$ 325,55, e a ordenação por menor preço e a faixa de preço usam R$ 325,55. A Marina vê M-B (R$ 373,15)
  antes de M-C (R$ 336,60) em "Menor preço" e vê M-B num teto de R$ 360 com R$ 373,15 no cartão. Não paga a mais (a
  página mostra menos), mas a tela parece errada. Passos 12, 13 e 19. Pode já existir antes do WI (cartão com variação
  de preço diferente): não comparável com a r1 nesta sessão. Fonte: TC-FUNC-020 passo 1; TC-FUNC-007, variação "cartão".
- **SB-2 · [Gaveta da sacola] a lixeira tem 16 × 16 px** — low proposta. Abaixo do alvo de toque de 44 px do ambiente.
  Tirou a peça nos 3 toques da sessão (passos 02, 04 e 15). Fica para o CH-08 (CFR).
- **SB-3 · [Home · bloco da campanha] "Ver todas" com 56 × 20 px em 390** — low proposta. Abaixo do alvo de 44 px; o toque
  funcionou (passo 06).

## Spec-gaps

nada

## Fora da cobertura

- TC-UI-001, variação "+N": em 390, o "+2" é um texto dentro do link do cartão, e o toque nele navegaria para a peça. Sem
  como saber o "comportamento de antes", não toquei
- TC-UI-001, variação 768 × 1024 e a peça comum com cores: fora do foco do briefing
- TC-FUNC-011, passos 1–4 e variações (deep link, percentual inexistente, título da aba): só o passo 5 estava no foco. O
  título da aba em `/ofertas` é o genérico da loja
- TC-FUNC-020, variações "maior preço" e "limites da régua" além do que o painel de filtros mostrou (192–383): não conferidas
- TC-FUNC-004, variações busca, recarregar e 1440: não conferidas
- TC-JOURNEY-001: fora do foco da confirmação
- Orçamento: a sessão passou o teto em 5 ações (55 de 50)

## Debrief

- **Surpresas:** o `set device` do agent-browser 0.39.1 não liga o toque (`navigator.maxTouchPoints` = 0) e o `tap` é um
  clique de mouse; o toque real só foi possível pelo `Input.dispatchTouchEvent` do CDP. Na Home, o convite do Instagram
  abre como modal e esconde o resto da página da árvore de acessibilidade até ser fechado
- **Próximo charter:** o preço do cartão de peça com variações de preço (SB-1), na ordenação e na faixa de preço, com e
  sem campanha
- **Padrão novo:** reteste de bug de toque com `Input.dispatchTouchEvent` pelo CDP da sessão, em vez do `tap`/`click` do
  driver — candidato ao guia de browser
