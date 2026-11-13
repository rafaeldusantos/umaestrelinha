# Sessão CH-07 · CFR — a faixa na loja, pelo teclado, com fonte grande e rede lenta

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-03 Marta · conta: anonima |
| Tour · modo | — · — |
| Rodada      | confirmação (r2) — alvos: TC-CFR-003, TC-CFR-004 e o risco residual A-1 da r1 (Tab pulando o link). TC-CFR-001 e TC-CFR-002 passaram na r1 e não foram refeitos (log da r1: `sessions/2026-11-13-r1/CH-07-cfr.md`) |
| Orçamento   | 15 ações de browser de 18 |
| Ambiente    | http://localhost:4173 (build servido, `vite preview`, worktree HEAD f649a843) · build não exposto · Chromium (playwright-cli 0.1.24, headless) · viewports 1440 × 900, 390 × 844 e 720 × 450 (zoom 200 % de 1440 × 900) |
| Paridade    | (1) documento **sem** `data-faixa` (sem `route.fulfill`): a faixa decidiu pela configuração (ligada, A1..A4); por isso não foi preciso a permissão `local-network-access`; (2) `*.supabase.co` e `**/g/collect*` abortados por rota; Supabase local; (3) fonte do sistema simulada por `document.documentElement.style.fontSize` (130 % e 200 %), aplicada na mesma carga; (4) zoom do navegador a 200 % simulado pelo viewport CSS equivalente, 720 × 450; (5) movimento reduzido por `emulateMedia` (`set-reduced-motion`); (6) as leituras de giro, foco e medida foram feitas por `run-code` com amostragem (200–250 ms; 40 ms na entrada do aviso), não por snapshot por passo — orçamento |

## Missão

Refazer a leitura dos avisos como a Marta (teclado, fonte grande, movimento reduzido) e a chegada da Bia em rede lenta, auditando se a faixa pula, anuncia, some do foco ou corta o link.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Com "reduzir movimento" ligado, abrir a Home em 1440 × 900 e olhar a faixa por 20 s | Só o A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" os 20 s; nenhuma troca; nenhum elemento da faixa com opacidade < 1 nem `transform` | `screenshots/CH-07-r2-01-reduzido-1440-20s.png` |
| 02 | Apertar "Próximo aviso" | O A2 "10%, 15% e 20% de desconto · em anéis, colares e pingentes selecionados no ateliê · Ver as peças" já na primeira leitura (19 ms), opacidade 1, sem `transform` em nenhuma das 8 leituras até 800 ms | `screenshots/CH-07-r2-02-reduzido-proximo-a2.png` |
| 03 | Sem a redução, em 1440: Tab desde o topo, três vezes (recarregando antes de cada uma; primeiro Tab a 0,3 s, 2,5 s e 4,7 s da carga; 1,2 s entre Tabs), registrando cada `focusin` | As três: "Aviso anterior" → link do aviso (A1) → "Próximo aviso". Nenhuma troca de aviso entre os Tabs (a faixa não trocou enquanto o foco estava nela, mesmo passando dos 6 s da carga na 3ª). Ex. 3ª: 4704 ms "Aviso anterior", 5907 ms link A1, 7143 ms "Próximo aviso" | `screenshots/CH-07-r2-03-tab-1440-rep1.png` · `-04-…-rep2.png` · `-05-…-rep3.png` |
| 04 | Sem a redução, em 1440, sem foco na faixa, olhar 16 s; depois ligar "reduzir movimento" com a página aberta e olhar mais 16 s | Troca a cada ~6 s (A1 → A2 em 5995 ms → A3 em 12026 ms). Na entrada, o aviso novo vem com `translateY` 6 px → 0 em ~300 ms, opacidade 1 em todas as leituras (40 ms). Ligada a redução sem recarregar: parou no A3, nenhuma troca em 16 s | — (valores no passo) |
| 05 | Com a redução, em 390 × 844, recarregar e olhar 20 s | Só o A1, nenhuma troca, nenhuma seta (nenhum botão na região), nada animado | `screenshots/CH-07-r2-06-reduzido-390-20s.png` |
| 06 | Sem a redução, em 390, no produto `/produtos/pingente-olho-grego-folheado-a-ouro`, raiz a 130 %, esperar os 4 avisos | Faixa 68 px nos quatro. A1 3 linhas, "Ver ofertas" inteiro dentro da faixa (10–380 px), tocável e no Tab; A2 3 linhas, "Ver as peças" inteiro, tocável e no Tab; A3 2 linhas, sem link; A4 imagem com link. Nenhum corte, rolagem lateral nenhuma (scrollWidth 390), cabeçalho não cobre a faixa | `screenshots/CH-07-r2-07-fonte130-390-1..4.png` |
| 07 | O mesmo com a raiz a 200 % | Faixa 104 px nos quatro (cresce, Q-01). A1 3 linhas, "Ver ofertas" inteiro (16–374 px), tocável e no Tab; A2 3 linhas, "Ver as peças" inteiro, tocável e no Tab; A3 2 linhas; A4 imagem. Nenhum corte na faixa, cabeçalho não cobre. **A página rola para o lado** (scrollWidth 435 de 390), mas pela borda de um bloco do cabeçalho (right 392) e pelo botão "Compartilhar" do produto (right 423); a faixa termina em 390 | `screenshots/CH-07-r2-08-fonte200-390-1..4.png` |
| 08 | Simular o zoom do navegador a 200 % em 1440 × 900 (viewport 720 × 450), na Home | Faixa 52 px com o A1 inteiro, link dentro (8–712 px), sem rolagem lateral (scrollWidth 720). **As setas "Aviso anterior" e "Próximo aviso" estão `display: none` (0 × 0)**: o Tab vai do link do aviso direto ao logo do cabeçalho; a faixa gira sozinha a cada ~6 s sem controle | `screenshots/CH-07-r2-09-zoom200-1440.png` |
| 09 | Repetir o 08 recarregando, e de novo com "reduzir movimento" ligado | Sem redução: setas `display: none`, Tab "Black Friday…" → "Uma Estrelinha — página inicial" → "Favoritos", giro A1 → A2 (6133 ms) → A3 (12008 ms). Com redução: setas `display: none` e só o A1 por 13 s — A2, A3 e A4 inalcançáveis | `screenshots/CH-07-r2-10-zoom200-1440-reduzido-sem-setas.png` |
| 10 | Em 1440, sem redução, Tab rápido (100 ms entre teclas) no instante da troca: primeiro Tab a 5850, 5950 e 6050 ms da carga | As três: "Aviso anterior" → link → "Próximo aviso". Na 3ª, o A2 entrou a 5968 ms e os Tabs caíram durante a animação de entrada (6056, 6159, 6264 ms) — o link do A2 recebeu o foco | — (log de `focusin` no passo) |

**Edge cases tentados:** movimento reduzido (1440 e 390); ligar a redução com a faixa girando; só teclado (Tab desde o topo, 6 vezes, cadência lenta e rápida, inclusive no instante da troca); raiz a 130 % e 200 % em 390; zoom 200 % em 1440 (720 × 450), com e sem redução

## Casos

| TC         | Veredito | Passo  | Evidência | Nota |
| ---------- | -------- | ------ | --------- | ---- |
| TC-CFR-003 | pass     | 01–05  | `screenshots/CH-07-r2-01-reduzido-1440-20s.png`, `CH-07-r2-02-reduzido-proximo-a2.png`, `CH-07-r2-06-reduzido-390-20s.png` | 1440: 0 trocas em 20 s, seta troca de imediato; 390: só A1, sem setas, 0 trocas; sem redução: entrada de 6 px em ~300 ms, nunca opacidade 0; variação (ligar com a página aberta): parou sem recarregar. Passo 4 conferido por valores computados a cada ~40 ms, não por screenshot a cada 50 ms |
| TC-CFR-004 | fail     | 06–09  | `screenshots/CH-07-r2-08-fonte200-390-1..4.png`, `CH-07-r2-10-zoom200-1440-reduzido-sem-setas.png` | Os passos 1 e 2 (390 a 130 % e 200 %) cumprem as metas da faixa: links inteiros, alcançáveis por toque e Tab, nada cortado, cabeçalho não cobre; a 200 % a faixa tem 104 px e 3 linhas no A1/A2 (Q-01). A rolagem lateral a 200 % vem do cabeçalho e do "Compartilhar" (resto da página, pré-existente pelo charter, sem achado). Falha a variação zoom 200 % em 1440: sem setas ⇒ A-1 |

Contagem: pass 1 · fail 1 · blocked 0 · skip 0

**Risco residual da r1 (A-1 da r1, Tab pulando o link em 1440):** não reproduziu — 0 de 6 na r2 (passos 03 e 10), contra 1 de 2 na r1; total 1 de 8. Em nenhuma das 6 o aviso trocou entre um Tab e outro com o foco na faixa; o único Tab no meio de uma troca (passo 10, 3ª) foi ao link do aviso novo. Não vira bug.

## Achados

### A-1 · [Faixa de avisos, 1440 com zoom 200 %] As setas somem e o aviso gira sem controle (ou, com movimento reduzido, só o A1 fica alcançável) — para quem navega com zoom

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-03 Marta |
| Jornada e passo     | J-04, passo 6 (ler os avisos com a tela ampliada) · passos 08–09 do log |
| TC                  | TC-CFR-004 (variação "zoom do navegador 200 % em 1440") |
| Gravidade proposta  | medium — a Marta, com zoom a 200 % e "reduzir movimento", só vê o A1 e não tem como chegar ao desconto (A2), ao frete (A3) nem à arte (A4); sem a redução, o aviso troca a cada 6 s sem seta para voltar. A compra segue possível |
| Reproduziu          | sim (2 de 2) |
| Viewport            | 1440 × 900 a 200 % (viewport CSS 720 × 450) |

**Passos para reproduzir** — de um estado limpo:

1. Conta anônima, `http://localhost:4173/`, browser em 1440 × 900 com zoom a 200 % (ou viewport 720 × 450), faixa ligada com A1..A4
2. Olhar a faixa e apertar Tab desde o topo
3. Repetir com "reduzir movimento" ligado no sistema e recarregar

**Esperado:** sem rolagem lateral; setas "Aviso anterior" e "Próximo aviso" visíveis e alcançáveis (toque e Tab) — **fonte:** TC-CFR-004, variação "zoom do navegador 200 % em 1440"; PRD RN-07, CA-07

**Observado:** as setas estão na árvore mas com `display: none` (0 × 0); o Tab vai de "Black Friday · novembro inteiro com joias em oferta · Ver ofertas" direto a "Uma Estrelinha — página inicial". Sem redução, a faixa gira (A1 → A2 a ~6,1 s → A3 a ~12 s). Com redução, fica no A1 e nenhum outro aviso aparece. A rolagem lateral, essa, não acontece (scrollWidth 720). É o mesmo comportamento que o TC-CFR-003 espera em 390 (sem setas, só A1 com redução) — a 720 de largura a faixa usa o layout de celular

**Evidência:**

- `screenshots/CH-07-r2-09-zoom200-1440.png` — a faixa a 200 %, sem setas
- `screenshots/CH-07-r2-10-zoom200-1440-reduzido-sem-setas.png` — com redução, só o A1, sem setas
- console: nada lido
- rede: nada

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-04    | Acessibilidade        | friction | zoom 200 % em 1440: setas fora do layout; com redução, só A1 alcançável | A-1 |
| J-04    | Acessibilidade        | pass     | — (Tab: 6 de 6 com a ordem seta → link → seta; link inteiro e alcançável a 130/200 % em 390) | — |
| J-04    | Usabilidade           | pass     | — (troca a cada ~6 s; a faixa não troca com o foco nela; com redução, não troca) | — |
| J-04    | Compatibilidade       | pass     | — (movimento reduzido, inclusive ligado com a página aberta; raiz 130/200 %) — só Chromium | — |
| J-02    | Paridade com produção | registrada no cabeçalho | build servido; documento sem atributo; fonte e zoom simulados | — |

**Categorias fora:** Performance percebida — passou na r1 (TC-CFR-001), não refeita na confirmação; Recuperação de erro — cortada pelo charter

**Pré-existentes (sem achado):** a 200 % da raiz em 390, no produto, a página rola para o lado (scrollWidth 435): um bloco do cabeçalho (right 392) e o botão "Compartilhar" (right 423) — fora da faixa.

## Spec-gaps

nada

## Fora da cobertura

- TC-CFR-003 passo 4: screenshots a cada 50 ms durante a troca — substituídos por `opacity`/`transform` computados a cada ~40 ms (orçamento)
- TC-CFR-004: setas ≥ 44 px em 1440 a 200 % — não mensuráveis, as setas não aparecem (A-1); zoom real do navegador (Ctrl +) — simulado por viewport 720 × 450, sem `deviceScaleFactor` 2
- Tema escuro do sistema, Safari/Firefox e celulares reais — fora da rodada de confirmação / só o Chromium do driver
- Leitor de tela real — fora do browser da sessão (charter)

## Debrief

- **Surpresas:** a 720 px de largura (zoom 200 % do desktop) a faixa já usa o layout de celular, sem setas — o esperado do TC-CFR-004 (setas alcançáveis) e o do TC-CFR-003 em 390 (sem setas) se encontram aqui; a triagem decide qual vale para o desktop ampliado
- **Próximo charter:** nada
- **Padrão novo:** registrar `focusin` com o texto do aviso e um `MutationObserver` na região, e disparar o Tab no instante da troca (offset medido do giro) — mostra se a troca rouba o foco sem depender da sorte
