# QA Run Report — 2026-10-22 — mobile-adm-inicio-reteste

- **Scope:** branch `feat/73-mobile-adm-inicio` depois do conserto do QA: as duas grades de números da Início (`MovementHero`, `MonthCards`) passam a cair para uma coluna quando a fonte do sistema cresce (`BUG-20261022-numeros-se-sobrepoem-com-fonte-grande`). Jornadas vizinhas: abrir, trocar período, Precisa de você, pedido novo ao vivo.
- **Cadence tier:** sanity (+ reteste)
- **Build:** working tree sobre `e9e68ed0` (sem commit), `vite build` + `vite preview --port 4373`; bundle servido `index-GZ7K9Uwk.js` + `index-BITPjDQV.css`, conferido pela rede (contextos novos com o service worker **bloqueado**, para o bundle velho não ser servido do cache) · **Environment:** http://localhost:4373, Supabase local real
- **Started:** 2026-10-23T03:07Z · **Status:** closed (2026-10-23T03:20Z)

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Equipe com TalkBack | Accessibility-Reliant | Android 360×800 e 412×915, fonte raiz 100–200 %, pt-BR | CH-inicio-com-leitor-de-tela (reteste) |
| Adri no celular | Mobile User | Android 412×915, pt-BR | CH-inicio-numeros-certos-do-dia, CH-inicio-ao-vivo-e-atualizado (vizinhas) |

## Flows in Scope

- `J-acompanhar-a-loja` (`../journeys/J-acompanhar-a-loja.md`)

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-inicio-com-leitor-de-tela | J-acompanhar-a-loja / MAD-inicio-com-leitor-de-tela (reteste da fonte grande) | Equipe com TalkBack | Feature | Fixed | BUG-20261022-numeros-se-sobrepoem-com-fonte-grande (retest pass) | working tree (sem commit) |
| 2 | CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-numeros-grandes (vizinha) | Adri no celular | Money | Pass | | |
| 3 | CH-inicio-ao-vivo-e-atualizado | J-acompanhar-a-loja / MAD-inicio-pedido-novo-ao-vivo (vizinha) | Adri no celular | Interrupt | Pass | | |
| 4 | CH-inicio-com-leitor-de-tela | J-acompanhar-a-loja / MAD-inicio-com-leitor-de-tela (achado novo) | Equipe com TalkBack | Feature | Blocked (human decision) | BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima | |

Status legend: `Pending | Pass | Fixed | Skipped | Blocked (needs human verify) | Blocked (human decision)`

## Session Debriefs

### CH-inicio-com-leitor-de-tela — Equipe com TalkBack (reteste)

- **Ran:** 03:07Z → 03:14Z, sessões novas (login do zero), em 360 e 412, com o período Ontem
  (R$ 99.999 · 10 · R$ 9.999,90) e o mês R$ 101.055.
- **Walk — estouro de cada número sobre a célula (px) e colunas, por escala da fonte:**

  | Fonte | 360: colunas · estouro | 412: colunas · estouro |
  | --- | --- | --- |
  | 100 % | 2 · 0 (mês −1) | 2 · 0 (mês −1) |
  | 115 % | 1 · 0 | 2 · 0 |
  | 130 % | 1 · 0 | 1 · 0 |
  | 150 % | 1 · 0 | 1 · 0 |
  | 200 % | 1 · 0 | 1 · 0 |

  Antes do conserto, na mesma régua: 130 % +17, 150 % +47, 200 % +123. Com a fonte padrão a faixa
  continua em duas colunas, como o protótipo. `pass`
- **Achado novo:** a 175 %+ em 360, a página passa a rolar para o lado (364 / 416 px) por causa da
  coluna da direita de "Últimos pedidos" (o total e o selo "Aguardando pagamento", `shrink-0`). Até
  165 % não acontece. **Não** é do conserto: trocar as duas grades de volta para `grid-cols-2` na página
  viva mantém os 416. Registrado como `BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima` (P3).
- **Evidence:** `R1-texto-100-360.png`, `R1-texto-100-412.png`, `R1-texto-150-360.png`,
  `R1-texto-150-412.png`, `R1-texto-200-360.png`, `R1-texto-200-ultimos-pedidos-360.png`
  (em `evidence/2026-10-22-mobile-adm-inicio-reteste/`)

### Vizinhas — Adri no celular

- **Ran:** 03:14Z → 03:16Z, 412, build novo.
- **Walk:** Início com "sexta-feira, 23 de outubro"; um pedido pago inserido no banco entrou em Hoje
  (R$ 359 · 1 · R$ 359,00) e em "Últimos pedidos" ("agora") sozinho; Ontem/Hoje trocam; "Aguardando
  material" leva a `/pedidos?bloco=aguardando` e o voltar devolve; duas colunas em 412, `scrollWidth`
  412. `pass`
- **Evidence:** `R2-inicio-412-pedido-novo.png`

## What Was Fixed

Ver `2026-10-22-mobile-adm-inicio.md` → *What Was Fixed* (o conserto, o teste de regressão e os 3
mutantes). Nenhum conserto novo nesta rodada.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Equipe com TalkBack | J-acompanhar-a-loja step 1 | com a fonte grande os quatro números ficam um embaixo do outro: a faixa escura fica bem mais alta, e Precisa de você desce para a segunda tela | dull | aceito: é o preço de não sobrepor |

## Runtime Errors Observed

- Nenhum.

## Human Verifications Needed

- [ ] As do relatório principal (linha 14): app instalado, voltar ao primeiro plano e TalkBack, agora
  com a fonte do sistema no máximo — os números um embaixo do outro, nenhum sobre outro.

## Decisions for a Human

### Últimos pedidos empurra a tela para o lado com a fonte no máximo (BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima)
- What's broken: a 175 %+ em 360, a linha com "Aguardando pagamento" fica mais larga que a tela e o
  corpo rola na horizontal. Evidência: `R1-texto-200-ultimos-pedidos-360.png`.
- Why not auto-fixed: não há forma certa sem escolha de desenho — a coluna da direita precisa ceder, e
  isso é truncar o selo (perde a situação), quebrar a linha (o total e o selo descem para baixo do
  nome) ou deixar o nome sumir. O selo já tem `truncate`, mas a coluna `shrink-0` o impede, e só soltar
  a coluna faz o **nome** da cliente encolher a zero.
- Options:
  1. Com a fonte grande, a linha quebra: nome em cima, total e selo embaixo (`flex-wrap` + coluna que
     pode encolher) — custo: linha mais alta, só nessa escala.
  2. Truncar o selo ("Aguardando pag…") — custo: perde a informação que a linha existe para dar.
  3. Aceitar (175 %+ é raro; o resto da tela segura) — custo: rolagem lateral, contra a regra do repo.
- Recommendation: 1, junto da decisão do selo (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`),
  porque as duas mexem na mesma linha.

## Learnings

- **O conserto tira um estouro da frente e mostra o de trás**: com os números no lugar, a régua de
  rolagem do corpo achou a linha de Últimos pedidos — só aparece com um Pix pendente entre os 4
  últimos. Reteste com os dados do dia, não só com a fixtura que produziu o bug.
- O service worker continua servindo o bundle velho depois do rebuild: os contextos do reteste
  nasceram com `serviceWorkers: 'block'` e a rede confirmou `index-BITPjDQV.css`.

## Final Status

- **Exit gate:** o mesmo do relatório principal (rodado depois do conserto; nenhuma linha de código
  mudou desde então): core 3826/146 · mobile-adm 400/39 · store 5812/317 · backoffice 3645/208, todos
  exit 0; `tsc` 0 · 0 · 0; eslint mobile-adm 0/0, backoffice 23/5 (baseline).
- **Issues by user impact:** Trust-Damage 1 (verified) · Friction 1 novo (decisão humana)
- **Coverage:** o bug retestado e as jornadas vizinhas andadas de novo; nada skipped.
- **Verdict:** ready with blocked items — a fonte grande não sobrepõe mais número nenhum; a linha de
  Últimos pedidos a 175 %+ espera decisão de desenho.
