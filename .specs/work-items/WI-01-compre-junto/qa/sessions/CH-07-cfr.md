# Sessão CH-07 · CFR — montar o conjunto (J-01) e fechar o pedido (J-02)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr.md` · cfr · P1                          |
| Status      | done                                                                   |
| Persona     | PER-03 Helena · conta: anonima                                         |
| Tour · modo | —                                                                      |
| Rodada      | confirmação (rodada 2, depois das fix tasks 08 e 09 — BUG-001 e BUG-002 `resolved`) |
| Orçamento   | 5 ações de browser de 18 (cada ação agrupou várias medições num script de leitura) |
| Ambiente    | http://localhost:8082 · build não exposto (dev server Vite do worktree feature/WI-01) · Chromium (Playwright MCP headless) · viewports 390×844, 1440×900, 720×450 (=1440 a 200 %) |
| Paridade    | dev server, não build de produção; Supabase local (:54441); `*.supabase.co` e `**/g/collect*` bloqueados por rota; rede lenta simulada atrasando 1,8 s cada requisição a `/rest/v1/` (não é perfil Slow 4G); zoom 200 % em 1440 simulado por viewport 720×450; o foco inicial foi posto por script na caixa do adicional e no botão "Levar o conjunto" — dali em diante só teclado (Space, Tab, Enter); posições, CLS e regiões vivas lidas por script (amostragem a cada 100 ms, `PerformanceObserver` de layout-shift, `MutationObserver`) |

## Missão

Refazer J-01 e J-02 como auditoria das qualidades que a cliente percebe no bloco — largura em 390, alvo de toque, teclado, anúncio, salto de layout, movimento e tom —, só sobre o que o Work Item mudou. Nesta rodada: só os TC que falharam (TC-CFR-002, TC-CFR-003) e o entorno das correções.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir M-01 com rede lenta em 390×844, amostrando o botão de compra e "Em estoque" por 8 s | ~0,2 s esqueleto da página (`aria-busy`). ~2,15 s produto e bloco aparecem juntos: "Adicionar à sacola" em y 882 e "Em estoque" em y 1453, e não mudam mais até 8 s. CLS 0,929 em dois saltos (238 ms e 2094 ms), as duas fontes = `FOOTER` (rodapé subindo/descendo com o esqueleto da página) | `screenshots/R2-CH-07-390-m01-carregando.png` · `R2-CH-07-390-m01-final.png` |
| 02 | Mesma coisa em 1440×900 | ~2,05 s produto e bloco juntos: "Adicionar à sacola" em y 1047, "Em estoque" em y 1019, parados até 8 s (antes: 584 → 928 → 1104). CLS 0,899: fontes `FOOTER`, `MAIN` e a grade do rodapé; nenhuma fonte dentro da coluna de informação | `screenshots/R2-CH-07-1440-m01-carregando.png` · `R2-CH-07-1440-m01-final.png` |
| 03 | M-04 (sem Compre Junto) com rede lenta em 390 | Sem esqueleto de bloco; "Adicionar à sacola" 882, "Em estoque" 836, parados; CLS 0,929 com os MESMOS dois saltos de `FOOTER` da M-01 ⇒ o CLS restante é da página, não do bloco. Produto aparece no mesmo tempo (~2,13 s) que a M-01 | `screenshots/R2-CH-07-390-m04-final.png` |
| 04 | 720×450, só teclado: Space em "Levar junto: QA Berloque Coração", Tab até "Prata 925", Space; Tab até "Folheado a ouro", Space; voltar à caixa e Space para desmarcar | O nó `role=status` (sr-only) existe vazio desde a carga; recebe, na ordem: "Total do conjunto: R$ 259,90, R$ 241,71 no Pix" (marcar sem escolher) → "R$ 329,80, R$ 306,71 no Pix" (Prata 925) → "R$ 334,80, R$ 311,36 no Pix" (Folheado) → "" (desmarcar). Nome da caixa "Levar junto: QA Berloque Coração, Folheado a ouro". `scrollWidth` 720 | `screenshots/R2-CH-07-total-anunciado-720.png` |
| 05 | 720×450, só teclado: Space em "Levar junto: QA Correntes" sem escolher a peça, Enter em "Levar o conjunto" | `alert` "Falta uma escolha em 1 peça. Ela está marcada acima."; `status` "Escolha a peça." e, à parte, o status do total "R$ 259,90, R$ 241,71 no Pix"; foco foi para "QA Corrente Veneziana" (a primeira peça a escolher) | `screenshots/R2-CH-07-falta-escolha-720.png` |

**Edge cases tentados:** rede lenta (01–03); zoom 200 % em 1440 por 720×450 (04–05). Nenhum novo, pela regra da rodada.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-002 | pass | 04, 05 | `screenshots/R2-CH-07-total-anunciado-720.png` · `R2-CH-07-falta-escolha-720.png` | Total anunciado em `role=status` a cada marca/troca e esvaziado ao desmarcar; falta anunciada em `alert`; nome da caixa com peça e variação. Ordem e foco visível não remedidos (pass na rodada 1, fora do entorno da correção) |
| TC-CFR-003 | pass | 01–03 | `screenshots/R2-CH-07-390-m01-final.png` · `R2-CH-07-1440-m01-final.png` | Botão de compra e "Em estoque" sem deslocamento quando o bloco chega (390 e 1440); bloco chega junto com o produto, sem esqueleto tardio; M-04 sem esqueleto de bloco e sem espera extra. CLS da carga (~0,9) vem do rodapé/esqueleto da página e é igual na M-04 — fora da mudança |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

**Observações (não viram achado nesta rodada):**

- O CLS da carga lenta continua ~0,9 em 390 e em 1440, mas as fontes medidas são o `FOOTER`, o `MAIN` e a grade do rodapé, com o mesmo valor e os mesmos saltos na M-04 (sem Compre Junto). É `pré-existente` da página do produto (esqueleto da página mais curto que a página), não do bloco.
- Ao acionar "Levar o conjunto" com a escolha faltando, o foco agora vai a "QA Corrente Veneziana" (primeira peça a escolher), não mais ao botão "Esconder opções" como na rodada 1 — o spec-gap de polimento da rodada 1 parece resolvido.
- Depois de desmarcar a caixa, o nome acessível continua "Levar junto: QA Berloque Coração, Folheado a ouro" (a escolha fica guardada) — coerente com a escolha preservada; registrado só como observação.

## CFR

| Jornada | Categoria             | Marca     | Itens que não passaram | Achado |
| ------- | --------------------- | --------- | ---------------------- | ------ |
| J-01    | Acessibilidade        | pass      | — (total e falta anunciados) | — |
| J-01    | Performance percebida | pass      | — no bloco; CLS restante da página é pré-existente | — |
| J-01    | Usabilidade · Compatibilidade · Recuperação de erro | — | não remedidas nesta rodada (pass na rodada 1) | — |
| J-02    | todas                 | —         | não remedidas nesta rodada (pass na rodada 1) | — |
| J-01/J-02 | Paridade com produção | —      | dev server; Supabase local; rede lenta por atraso de rota; zoom simulado por viewport | — |

**Categorias fora:** Usabilidade, Compatibilidade e Recuperação de erro, e toda a J-02 — a rodada de confirmação só confere os TC que falharam e o entorno das correções.

## Spec-gaps

nada (rodada de confirmação não registra spec-gap)

## Fora da cobertura

- Passe completo de CFR (fontes 130/200 %, 320, 768, movimento reduzido, tema escuro, J-02) — fora da rodada de confirmação; pass na rodada 1
- Rede Slow 4G real — simulada por atraso de 1,8 s por requisição REST
- Leitor de tela real — o anúncio foi conferido pelas mutações da região `role=status`, não por um leitor
- Fonte do sistema real e zoom real do browser — simulados

## Debrief

- **Surpresas:** nenhuma; as duas correções se sustentam e o entorno (alert de falta, nome da caixa) segue certo.
- **Próximo charter:** se o CLS da página do produto importar, abrir item próprio para o esqueleto da página (rodapé saltando), fora do WI-01.
- **Padrão novo:** comparar as FONTES do layout-shift com a joia sem o bloco (M-04) separa o CLS da mudança do CLS da página.
