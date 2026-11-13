# Sessão CH-03 · O cliente que vem do Google, no computador

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-cliente-no-computador.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-04 Rodrigo · conta: anonima                                        |
| Tour · modo | Feature · com tour                                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | http://localhost:8082 (worktree feature-101, Supabase local 127.0.0.1:54441) · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 · 390 × 844 |
| Paridade    | dev local: a faixa entra depois da primeira pintura (HTML sem `data-faixa`, esperado em dev); rotas `*.supabase.co` e `**/g/collect*` abortadas; artes de teste lisas |

## Missão

Confirmar que o Rodrigo, no computador, percorre os avisos pelas setas sem o aviso trocar sob o ponteiro, vê a arte da campanha inteira e nítida, e que o Banner principal da Home continua girando como antes.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Chega em /joias-afetivas (C1) a 1440 × 900 e olha a faixa | Região "Avisos da loja" no topo, A1 "Black Friday · novembro inteiro com joias em oferta · Ver ofertas". Faixa 48 px de alto; "Aviso anterior" em x=88 e "Próximo aviso" em x=1308, ambas 44 × 44; miolo de 80 a 1360 (1280 px, centralizado); `scrollWidth` 1440 = largura da janela (sem rolagem lateral) | `screenshots/CH-03-01.png` |
| 02 | Clica "Próximo aviso" duas vezes e "Aviso anterior" uma vez (logo após o carregamento) | A1 → A2 → A3 → A2. Faixa em 48 px em cada aviso. Numa primeira tentativa, mais lenta, o giro automático já tinha levado a A2 antes do primeiro clique (A2 → A3 → A4 → A3) — giro normal, não achado; A4 também mediu 48 px | — |
| 03 | Lê o A2 (o texto de 90 caracteres) | Uma linha (20 px de alto, `line-height` 20), sem corte: link de 1168 px com `scrollWidth` = `clientWidth`, rótulo "Ver as peças" inteiro | `screenshots/CH-03-02-a2.png` |
| 04 | Deixa o ponteiro sobre o texto da faixa por 15 s | O aviso continuou A2 os 15 s. Tirou o ponteiro (para o menu de departamentos) e em 7 s trocou para A3 | — |
| 05 | Chega com Tab ao link do aviso (a partir da seta "Aviso anterior") e espera 15 s | Foco no link (no momento, o A4 de imagem); anel de foco interno de 2 px em rgb(35, 48, 58) (escuro, tom do `ink`). O aviso não trocou nos 15 s com o foco dentro da faixa | `screenshots/CH-03-03-foco.png` |
| 06 | Olha a arte do A4 no computador | `<picture>` com `<source media="(min-width: 768px)">` (rendições 720 e 1440 da arte do computador). Imagem com alt "Black Friday na Uma Estrelinha: joias em oferta em novembro", natural 1440 × 48, caixa 1168 × 48 entre as setas, `object-fit: contain` (inteira, sem corte nem esticamento, centralizada) | `screenshots/CH-03-04-a4.png` |
| 07 | Confere as imagens da faixa que a página baixou a 1440 | Só `…/announcements/24fa1ffa-….webp` (a arte do computador), uma vez por carregamento; nenhuma requisição da arte do celular | — |
| 08 | Estreita para 390 × 844 e recarrega | Nova requisição só de `…/announcements/59f0c29c-….webp` (a arte do celular); nenhuma nova da do computador. Imagem natural 390 × 48 (rendição na proporção de 780 × 96), caixa 374 × 52, `contain`, faixa 52 px, sem rolagem lateral | `screenshots/CH-03-05-a4-390.png` |
| 09 | Abre a Home a 1440 × 900 | A faixa acima do cabeçalho e a região "Banners da loja" com "Banner anterior", "Próximo banner" e os pontos "Ver o banner 1: Coleção Leite Materno" e "Ver o banner 2: Linha joia afetiva com dente". O orçamento acabou aqui; o giro do banner não foi medido | — |

**Edge cases tentados:**
- Recarregar (passo 08, a 390) — só a arte do dispositivo baixada
- Viewport estreita 390 (passo 08)
- Do A3, "Próximo aviso" leva ao A4 (passo 02, primeira tentativa)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-016 | pass | 01, 02, 04, 05 | `screenshots/CH-03-01.png`, `screenshots/CH-03-03-foco.png` | Setas 44 × 44 nas pontas; A1→A2→A3→A2; pausa com ponteiro (15 s) e retoma em ≤ 7 s; pausa com foco (15 s). Cor do anel de foco lida como rgb(35, 48, 58), sem confirmar o nome do token. Variações (768, 767, duplo clique, depois do último) não feitas — ver Fora da cobertura |
| TC-UI-002 | pass | 01, 02, 03 | `screenshots/CH-03-01.png`, `screenshots/CH-03-02-a2.png` | 48 px com A1, A2, A3 e A4; setas 44 × 44; miolo de 1280 centralizado; sem rolagem lateral; A2 numa linha com o rótulo inteiro. Variação do zoom a 200 % não feita |
| TC-FUNC-015 | pass | 06, 07, 08 | `screenshots/CH-03-04-a4.png`, `screenshots/CH-03-05-a4-390.png` | Uma arte por dispositivo, alt do manifesto, contida. Variações (1024, arte que falha) não feitas |
| TC-REG-001 | skip | 09 | — | O Banner principal existe na Home local, mas o orçamento de 50 ações acabou antes de observar o giro, a pausa e as setas do banner |

Contagem: pass 3 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- TC-REG-001 inteiro (giro de ~6 s do Banner principal, pausa com ponteiro e o que a faixa faz ao mesmo tempo, setas do banner) — orçamento esgotado no passo 09; o banner está na Home local, então o caso é executável numa próxima sessão
- TC-FUNC-016, variações: larguras 768 e 767 (setas a partir de 768), duplo clique na seta, "Próximo aviso" no A4 — orçamento
- TC-FUNC-015, variações: 1024 × 768 (arte contida com ouro dos lados) e arte que falha (bloquear a URL da arte) — orçamento
- TC-UI-002, variação: zoom do navegador a 200 % — orçamento
- Viewport enorme 2560 × 1440 — orçamento
- A nitidez da arte "aos olhos" não foi avaliada além da rendição baixada (1440 de largura natural para uma caixa de 1168 no computador; 390 para 374 no celular): as artes de teste são lisas

## Debrief

- **Surpresas:** o giro automático (6 s) corre entre comandos da sessão: a leitura de qualquer sequência de setas precisa começar logo depois do carregamento, senão parece que a seta pulou um aviso. Não é bug.
- **Próximo charter:** uma sessão curta só para TC-REG-001 e as variações de largura (767/768/1024/2560) e o duplo clique na seta.
- **Padrão novo:** nada
