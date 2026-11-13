> Segunda tentativa. A primeira ficou `blocked` por ambiente: a loja em `http://localhost:8092` recusava conexão porque o servidor do worktree não tinha subido. Nenhuma ação na loja foi gasta naquela tentativa.

# Sessão CH-03 · Achar a oferta pelo celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-achar-a-oferta-pelo-celular.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-02 Marina · conta: anonima |
| Tour · modo | Feature · com tour |
| Rodada      | exploração |
| Orçamento   | 52 ações de browser de 50 (o teto estourou com as ações de leitura; a exploração parou ali) |
| Ambiente    | http://localhost:8092 (a Entrada do charter diz 8082; o `ambiente` corrige para 8092) · build não exposto · Chromium (agent-browser, headless) · viewport 390 × 844 |
| Paridade    | rotas bloqueadas: `**/*.supabase.co/**` e `**/g/collect*` (as fotos do Storage hospedado não carregam; isso não é achado) |

## Missão

Como quem nunca abriu a loja e chegou pelo celular, confirmar que dá para achar as peças em oferta pela Home e por
`/ofertas` e entender, sem fazer conta, quanto cada uma custa, procurando cartão e página discordando do preço,
faixa cobrindo o que a cliente quer tocar, e promessa que a tela faz e não cumpre.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a Home no celular (390 × 844), sem login | A Home carrega. O bloco da campanha fica perto do fim: rótulo "BLACK FRIDAY", título **"Black Friday"** (não "Joias em oferta"), o texto "Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto.", e três links "Ver as peças com 10/15/20% de desconto". Abaixo, a fileira "Algumas das peças em oferta" com Anterior/Próximo e 4 cartões (M-C, M-B, M-D, M-A), cada um com a faixa "Black Friday, X% de desconto". **Nenhum "Ver todas"** em lugar nenhum da Home | `screenshots/CH-03-02-bloco-home.png` |
| 02 | Conferir os preços na fileira da Home | M-A: De R$ 385,00 → R$ 308,00, 4x de R$ 77,00 ✓. M-D: De R$ 340,00 → R$ 272,00, 4x de R$ 68,00 ✓. M-B: De R$ 439,00 → R$ 373,15, 4x de R$ 93,29 (15 % sobre a variação que o cartão mostra) ✓. **M-C: De R$ 349,90 → R$ 314,91**, 4x de R$ 78,73: os 10 % aplicados em cima do "por" (R$ 349,90), e o riscado é o "por", não o "de" R$ 374,00 → A-1 | `screenshots/CH-03-02-bloco-home.png` |
| 03 | Tocar no cartão "15%" da Home (antes, fechar o aviso de cookies e o convite do Instagram, que aparece por cima do bloco ao rolar) | Vai para `/ofertas?percentual=15`. Trilha "Início › Black Friday", h1 "Black Friday", "Peças com 10%, 15% e 20% de desconto até 30 de novembro." Chips "Todas · 4", "10% · 1", "15% · 1", "20% · 2". Só M-B na grade, "Mostrando 1 de 1 peças". No primeiro instante os chips mostravam "· 0" e a grade vazia, até a carga terminar | `screenshots/CH-03-03-ofertas-15.png` |
| 04 | Tocar em "Todas" | URL `/ofertas`, "Mostrando 4 de 4": exatamente M-C, M-B, M-D, M-A; nenhuma peça do Natal nem peça comum. Os preços são os mesmos da Home (M-C com o mesmo R$ 314,91) | — |
| 05 | No cartão de M-D, tocar na miniatura de cor | No celular, o cartão expõe 1 miniatura ("Ver na cor Prata 925 Folheado a Ouro Branco") no grupo "Cores disponíveis"; o "+N" não aparece na árvore de acessibilidade. Tocar na miniatura **não navega** (a URL fica em `/ofertas`). A troca de foto não dá para confirmar: a única miniatura exposta é a da cor atual, e as fotos vêm do Storage bloqueado. No snapshot, nenhum selo de canto, só a faixa | `screenshots/CH-03-05-card-md-390.png` |
| 06 | Tocar no chip "20%" e abrir M-A | "Mostrando 2 de 2" (M-D e M-A). Página `/produtos/pulseira-afetiva-com-leite-materno-em-prata-925`: o selo "Black Friday, 20% de desconto" logo acima do nome, R$ 308,00, "De R$ 385,00 · 4x de R$ 77,00 sem juros", R$ 286,44 com Pix (308 com 7 %). Igual ao cartão ✓. A barra fixa de baixo repete R$ 308,00 / R$ 385,00 / R$ 286,44 no Pix | `screenshots/CH-03-06-pdp-ma.png` |
| 07 | Tocar em "Adicionar à sacola" (cor padrão Prata 925 Folheado a Ouro Branco) e abrir a sacola | Nada acontece: nenhuma mensagem, nenhuma gaveta, o ícone da Sacola sem contador. Tocou de novo: o mesmo. Abriu a Sacola: o diálogo "Sua sacola" **vazio** (só "Explorar joias"). Console sem erro → A-2 | `screenshots/CH-03-07-sacola-ma.png` |

**Edge cases tentados:**

- Carga lenta da vitrine: os chips mostram "· 0" e a grade fica vazia até a carga terminar, sem indicador de carregando (passo 03). Ficou em Debrief: não foi provocado de propósito
- Popup por cima do bloco: o convite do Instagram ("Acompanhe de perto o meu trabalho") cobre o cartão de percentual ao rolar a Home (passo 03). É de antes, fora da Mudança

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-004 | fail | 01–02, 06, 07 | `screenshots/CH-03-06-pdp-ma.png`, `screenshots/CH-03-07-sacola-ma.png` | Passos 1–3 passam: a faixa no cartão, o "De" riscado acima do preço, 4x sobre o preço com desconto, nenhum selo de canto, o selo em linha na página. O passo 4 falha porque M-A não entra na sacola (A-2). Variações não feitas: 1440, busca, recarregar |
| TC-FUNC-007 | skip | 02 | — | Orçamento. Só a variação "cartão" foi vista: M-B a R$ 439,00 → R$ 373,15 (15 % ✓). A troca de variação na página e a sacola não foram feitas |
| TC-FUNC-011 | pass | 03–04 | `screenshots/CH-03-03-ofertas-15.png` | Passos 1–4: trilha, título, linha, chips com contagem certa, filtro 15 %/20 % com URL `?percentual=`, "Todas" com exatamente M-A..M-D. O passo 5 (`/black-friday`) **não foi executado** (orçamento). O chip pressionado não aparece no snapshot (sem estado pressed exposto); dá para conferir na screenshot. Alvo ≥ 44 px não medido |
| TC-FUNC-018 | fail | 01, 03 | `screenshots/CH-03-02-bloco-home.png` | O cartão 15 % leva a `/ofertas?percentual=15` ✓. A fileira tem a faixa e rola de lado ✓. **Sem "Ver todas" em 390 × 844** (A-3). O título é "Black Friday", não "Joias em oferta" (spec-gap). 1440 não feito |
| TC-FUNC-020 | skip | — | — | Orçamento: ordenação, "Com desconto" e faixa de preço não foram tocados |
| TC-UI-001 | skip | 05 | `screenshots/CH-03-05-card-md-390.png` | Parcial: a miniatura fica acima da faixa e o toque não navega. A troca de foto não deu para conferir (1 miniatura exposta, a da cor atual; fotos bloqueadas). 1440 não feito por orçamento |
| TC-JOURNEY-001 | pass | 01, 03, 06 | `screenshots/CH-03-06-pdp-ma.png` | Home → bloco → `/ofertas` → 20 % (M-A e M-D) → M-A com o selo, R$ 308,00 e "De R$ 385,00", igual ao cartão. O 20 % foi tocado no chip da vitrine; da Home foi tocado o cartão 15 %. Tempos dentro das esperas, sem cronômetro |

Contagem: pass 2 · fail 2 · blocked 0 · skip 3

## Achados

### A-1 · [Cartão e vitrine · M-C] Os 10 % da campanha somam ao "por" que a peça já tinha: R$ 314,91 em vez de R$ 336,60

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Marina |
| Jornada e passo     | J-03, passo 1 e 2 (olhar a vitrine) · passos 02 e 04 do log |
| TC                  | — (a regra é a do TC-FUNC-008, que é do CH-04; aqui vista no cartão) |
| Gravidade proposta  | high — a loja anuncia e cobra um desconto em cima de outro, o que a regra proíbe, e o "De" riscado mostra um valor que não é o "de" da peça |
| Reproduziu          | sim (2 de 2: na fileira da Home e na grade de `/ofertas`) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, abrir `http://localhost:8092/ofertas` em 390 × 844
2. Achar o cartão "Pulseira Afetiva Esferas com Leite Materno em Prata 925" (M-C, 10 % na Black Friday; "de" R$ 374,00 / "por" R$ 349,90)
3. Ler o preço

**Esperado:** o preço é o **menor** entre o "por" de hoje e o "de" com 10 %: min(R$ 349,90; R$ 374,00 × 0,9 = R$ 336,60) = **R$ 336,60**, com "De R$ 374,00" riscado. "Nunca o 'por' com mais 10 % em cima". **Fonte:** PRD CA-06, RN-06; `spec.md` T7, I-03 (via TC-FUNC-008); a regra da massa M-C no briefing.

**Observado:** "De R$ 349,90" riscado, **R$ 314,91**, "4x de R$ 78,73 sem juros" (349,90 × 0,9: os 10 % somados ao "por"). Igual na Home e em `/ofertas`. A página do produto e a sacola de M-C não foram abertas (orçamento).

**Evidência:**

- `screenshots/CH-03-02-bloco-home.png`: o cartão de M-C na fileira da Home
- console: nada
- rede: nada

### A-2 · [Página do produto · M-A] "Adicionar à sacola" não acrescenta nada nem dá retorno

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Marina |
| Jornada e passo     | J-03, depois do passo 3 (acrescentar a peça) · passo 07 do log |
| TC                  | TC-FUNC-004 (passo 4) |
| Gravidade proposta  | critical — a cliente que decidiu comprar não consegue pôr a peça na sacola e não recebe explicação. **Ressalva:** a sessão não comparou com uma peça fora da campanha, então pode ser ambiente (um host bloqueado) e não a Mudança. A triagem decide |
| Reproduziu          | sim (2 de 2, dois toques na mesma carga da página) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, sacola vazia, abrir `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925` em 390 × 844, com `*.supabase.co` bloqueado como manda o ambiente
2. Deixar a cor padrão (Prata 925 Folheado a Ouro Branco) e tocar em "Adicionar à sacola" na barra fixa de baixo
3. Tocar no ícone "Sacola"

**Esperado:** a peça entra na sacola com R$ 308,00, o cheio R$ 385,00 riscado e o selo em linha. **Fonte:** TC-FUNC-004 passo 4; PRD CA-03.

**Observado:** nenhuma reação ao toque (sem toast, sem gaveta, sem contador). A gaveta "Sua sacola" abre vazia, só com "Explorar joias".

**Evidência:**

- `screenshots/CH-03-07-sacola-ma.png`: a sacola vazia depois de dois toques em "Adicionar à sacola"
- console: nada (sem erro)
- rede: não lida (orçamento)

### A-3 · [Home · bloco da campanha] Sem "Ver todas" no celular

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Marina |
| Jornada e passo     | J-03, passo 1 (rolar até o bloco) · passo 01 do log |
| TC                  | TC-FUNC-018 (passo 3 e a variação "Ver todas no celular") |
| Gravidade proposta  | medium — a cliente chega às ofertas pelos cartões de percentual, mas não tem a entrada para ver todas de uma vez |
| Reproduziu          | intermitente (1 de 1: visto numa carga só, sem repetir por causa do orçamento; não aparece em nenhum ponto da árvore da Home) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** (de um estado limpo):

1. Sem login, abrir `http://localhost:8092/` em 390 × 844
2. Rolar até o bloco "Black Friday" e a fileira "Algumas das peças em oferta"
3. Procurar "Ver todas"

**Esperado:** "Ver todas" presente e alcançável, levando a `/ofertas`. **Fonte:** TC-FUNC-018 passo 3 e a variação "Ver todas no celular" ("se faltar, é achado"); `spec.md` › Home · "Joias em oferta".

**Observado:** a fileira tem só "Anterior"/"Próximo" e os 4 cartões. Não há link nem texto "Ver todas" na Home. Em 1440 não foi conferido.

**Evidência:**

- `screenshots/CH-03-02-bloco-home.png`: o bloco e a fileira sem "Ver todas"
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O título do bloco da Home é o nome da campanha ("Black Friday"); o TC-FUNC-018 espera "Joias em oferta", mas a fonte do mesmo TC diz "título e percentuais vindos da campanha" | 01 | polimento |
| Na carga de `/ofertas`, os chips mostram "· 0" e a grade fica vazia por um instante, sem indicador de carregando | 03 | polimento |

## Fora da cobertura

- `/black-friday` → `/ofertas` (TC-FUNC-011 passo 5): orçamento
- TC-FUNC-007 inteiro (variações de M-B na página e na sacola): orçamento
- TC-FUNC-020 inteiro (ordenar por menor preço, "Com desconto", faixa de preço na coleção): orçamento
- M-C na página do produto e na sacola (para ver se o A-1 também chega ao valor cobrado): orçamento
- 1440 × 900 (cartão de 220 px, 2 miniaturas, chips numa linha, "Ver todas" no computador, três cartões lado a lado): orçamento
- Troca de foto pela miniatura de M-D: só uma miniatura exposta em 390 e fotos do Storage bloqueadas
- Edge cases do charter: deep link `?percentual=15`/`?percentual=50`, voltar e avançar com o filtro, girar, 320 × 568, rolagem até o fim, movimento reduzido: orçamento
- Rede lenta (variação do TC-JOURNEY-001): o `agent-browser` não atrasa resposta
- A-2 contra uma peça fora da campanha (para separar ambiente de Mudança): orçamento

## Debrief

- **Surpresas:** M-C com o desconto somado ao "por" (A-1) e a sacola que não recebe M-A (A-2). O convite do Instagram cobre o cartão de percentual da Home ao rolar, então o primeiro toque da cliente cai no popup.
- **Próximo charter:** o CH-04 deve conferir M-C na página, na sacola e no checkout (TC-FUNC-008) e confirmar se "Adicionar à sacola" funciona numa peça comum com o mesmo bloqueio de rede. Repetir os TC deixados em `skip` (TC-FUNC-007, TC-FUNC-020, TC-UI-001 em 1440) e `/black-friday` numa sessão curta. O CH-08 deve conferir se os chips expõem o estado pressionado (o snapshot não mostra).
- **Padrão novo:** nada
