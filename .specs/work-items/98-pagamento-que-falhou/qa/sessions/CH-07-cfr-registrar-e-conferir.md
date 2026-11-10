# Sessão CH-07 · CFR — registrar e conferir/desfazer no painel

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-cfr-registrar-e-conferir.md` · cfr · P1     |
| Status      | done                                                                   |
| Persona     | PER-01 Adri no celular · conta: `admin` — `QA_ADMIN_*`                 |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 33 ações de browser de 35                                              |
| Ambiente    | painel http://localhost:8083 (`pnpm dev`) · build não exposto · Chromium (Playwright MCP headless) · viewports 390 × 844 (fonte 100/130/200 %) e 1440 × 900 |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados; e-mail à cliente pelo Resend com chave inválida (falha esperada no local); fonte grande simulada pelo `font-size` da raiz, não pela fonte do sistema; arquivos anexados pela API de file chooser do Playwright (cópias dos arquivos de QA em `.playwright-mcp/up`, apagadas no fim); `pnpm dev`, não o build |

## Missão

Refazer o registro e o desfazer como auditoria das qualidades transversais — retorno, recuperação de
erro, teclado e nomes, fonte grande e largura — só nas superfícies que o Work Item criou ou mudou.

Massa usada: **#0547** (M1b, livre) — registrado nesta sessão e desfeito nesta sessão. Ao fim ele está
em Pendente, com um registro desfeito no histórico: **não está mais "limpo"** para outra sessão.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir "Registrar pagamento" do #0547 em 390 e medir a 100, 130 e 200 % | `scrollWidth` 390 nas três escalas; nada cortado na lateral. A 100 %: botão da data **40 px** e "Limpar data" **36 px** de altura (o resto ≥ 44). A 130 % e 200 % todos ≥ 44 | `screenshots/CH-07-01-registrar-390-fonte-200.png` |
| 02 | A 200 %: escolher "Transferência", escrever a observação (174/1000) e **depois** tocar em "Comprovantes" e escolher JPG + PDF + HEIC | Nada entra na lista de comprovantes; nenhuma mensagem, nenhum erro no console. Repetido numa tela recarregada (meio + observação primeiro, arquivos depois): de novo nada (2 de 2) | — |
| 03 | Com o formulário preenchido e sem anexos, tocar em "Registrar pagamento" (200 %) | O portão abre: 760 px de altura, rola por dentro (`overflow-y: auto`), "Voltar" e "Registrar pagamento" com 292 × 88 abaixo da dobra, alcançáveis rolando o portão; documento continua em 390. O "Close" do X está em inglês (pré-existente, do componente compartilhado) | `screenshots/CH-07-02-portao-390-fonte-200.png` |
| 04 | Fechar o portão com Esc | O portão fecha; o foco volta ao "Registrar pagamento" que o abriu; meio e observação preservados | — |
| 05 | Tela recarregada, a 200 %: escolher **primeiro** os três comprovantes; depois meio e observação | Os três listados ("Tirar comprovante-qa98.jpg/.pdf/.heic") | — |
| 06 | Abrir o portão, desmarcar o e-mail e confirmar | Em 46 ms o botão vira "Registrando pagamento…" (`disabled`, `aria-busy`); em ~0,9 s volta ao pedido com "Pagamento registrado · sem e-mail à cliente (anotado no histórico)" numa região viva. **O foco fica no `<body>`** | — |
| 07 | No pedido registrado, medir a 200 / 130 / 100 % | 130 % e 100 %: `scrollWidth` 390. **200 %: `scrollWidth` 426** — o único elemento achado passando da borda é o botão "Em Separação" do cartão "Próximo passo" (right 391), que a mudança não tocou; a causa dos 36 px restantes não foi isolada | `screenshots/CH-07-03-pedido-registrado-390-fonte-200.png` |
| 08 | Em 1440, com `reducedMotion: reduce`, recarregar o pedido e chegar ao "Desfazer registro" só por Tab | 47 Tabs; foco visível (anel de 2 px); `scrollWidth` 1440. Enter abre "Desfazer o pagamento registrado" com o foco no campo "Motivo"; "Desfazer o registro" fica desabilitado até haver motivo; nenhuma animação ativa (`getAnimations()` vazio) | — |
| 09 | Escrever o motivo, Tab até "Desfazer o registro", cortar a rede e dar Enter | O diálogo fica aberto com "O registro não foi desfeito. O motivo continua aqui — tente de novo." (`role=alert`); o motivo continua escrito. Console: `POST …/rpc/undo_manual_payment` → `ERR_INTERNET_DISCONNECTED`. Depois da falha o foco fica no contêiner do diálogo (não no botão) | `screenshots/CH-07-04-desfazer-offline-1440.png` |
| 10 | Religar a rede, Tab até "Desfazer o registro" e Enter | "Registro desfeito. O pedido voltou a Pendente." (região viva); o diálogo fecha e o foco vai ao `H1 "Pedido #0547"` | `screenshots/CH-07-05-depois-do-desfazer-1440.png` |
| 11 | Sair da conta | Volta a `/admin/login` | — |

**Edge cases tentados:** fonte a 100/130/200 % em 390 (01, 07) · Esc no portão (04) · ordem de preenchimento diferente: arquivos por último × arquivos primeiro (02, 05) · rede cortada no confirmar do desfazer (09) e nova tentativa (10) · movimento reduzido (08) · só teclado no desfazer (08–10).

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-CFR-001 | fail | 02, 06, 09 | `screenshots/CH-07-04-desfazer-offline-1440.png` | Retorno do confirmar < 50 ms e envio de 3 comprovantes com "Registrando pagamento…" (dentro das metas); desfazer offline diz que não desfez e preserva o motivo. Falha: anexos escolhidos depois do resto do formulário somem em silêncio (A-1). Passo 2 (rede cortada no confirmar do **registro**) não executado — Fora da cobertura |
| TC-CFR-002 | fail | 06 | — | Rótulos dos campos presentes (Meio, Data, Hora, Observação, "Comprovantes" no input de arquivo); Esc fecha o portão e devolve o foco; desfazer inteiro pelo teclado; foco depois do desfazer vai ao H1; sem animação com movimento reduzido. Falha: depois de confirmar o registro o foco cai no `<body>` (A-2). Recusas de data/arquivo não reprovocadas aqui |
| TC-CFR-003 | fail | 01, 07 | `screenshots/CH-07-01-registrar-390-fonte-200.png` · `screenshots/CH-07-03-pedido-registrado-390-fonte-200.png` | Tela de registrar sem rolagem lateral nas três escalas; 1440 sem estouro. Falha: botões de data abaixo de 44 px a 100 % (A-3, já em CH-01 A-3). O pedido a 200 % rola 36 px na lateral (causa fora da mudança, ver Fora da cobertura); as medidas do bloco Pagamento (alvos de Desfazer/Gerar link) não foram isoladas |

Contagem: pass 0 · fail 3 · blocked 0 · skip 0

## Achados

### A-1 · [Registrar pagamento] Comprovantes escolhidos depois de preencher meio e observação somem em silêncio — o registro sai sem prova

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, anexar comprovantes · passos 02 e 05 do log                     |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | high — a dona preenche na ordem natural (meio, observação, depois o comprovante) e grava o pagamento sem a prova, sem nada na tela dizer que o arquivo não entrou |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844, fonte 200 %                                                |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `admin`, abrir `http://localhost:8083/admin/pedidos/<pedido pendente>/pagamento`
2. Escolher o meio "Transferência" e escrever qualquer observação
3. Tocar em "Comprovantes" e escolher JPG, PDF e HEIC válidos (< 10 MB)

**Esperado:** os três arquivos listados com "Tirar …", ou uma recusa com o motivo — **fonte:** PRD CA-03.2 / CA-03.10; TC-CFR-001 ("preservam o que foi digitado"); a frase da tela "Até 3 arquivos JPG, PNG, WebP, HEIC ou PDF".

**Observado:** a lista de comprovantes continua vazia; nenhuma mensagem, nenhum erro no console. Numa tela recarregada, escolhendo os mesmos três arquivos **antes** de tocar no meio e na observação, os três são listados (passo 05).

**Evidência:**

- passos 02 e 05 do log (snapshot sem os botões "Tirar …" × com os três)
- console: nada
- rede: nada

Provável mesma causa de CH-01 A-1 ("depois da primeira escolha, as outras são ignoradas"): aqui a interação anterior não é outra escolha de arquivo, e sim o meio e a observação — a triagem decide se é o mesmo bug.

### A-2 · [Registrar pagamento] Depois de confirmar o registro, o foco cai no `<body>` — quem usa teclado ou leitor de tela perde o lugar

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, confirmar no portão · passo 06 do log                           |
| TC                  | TC-CFR-002                                                            |
| Gravidade proposta  | medium — no fim da ação de dinheiro, o próximo Tab recomeça do topo da página; o desfazer, pelo contrário, leva o foco ao H1 do pedido |
| Reproduziu          | intermitente (1 de 1 — sem segunda tentativa, por orçamento)          |
| Viewport            | 390 × 844, fonte 200 %                                                |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `admin`, abrir `/admin/pedidos/<pedido pendente>/pagamento`
2. Tocar em "Registrar pagamento", desmarcar o e-mail e confirmar no portão
3. Na volta ao pedido, conferir onde está o foco

**Esperado:** o foco vai a um lugar do pedido (o título, ou o bloco Pagamento) — **fonte:** TC-CFR-002 meta "Foco: depois de confirmar, vai a um lugar do pedido (não ao `<body>`)"; regra do painel `shared/lib/foco.ts`.

**Observado:** `document.activeElement` = `BODY` ~1,5 s depois de voltar ao pedido; o aviso "Pagamento registrado · sem e-mail à cliente (anotado no histórico)" aparece na região viva.

**Evidência:**

- passo 06 do log
- console: nada
- rede: nada

### A-3 · [Registrar pagamento] Botão da data (40 px) e "Limpar data" (36 px) abaixo de 44 px a 100 %

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri no celular                                                |
| Jornada e passo     | J-01, data do pagamento · passo 01 do log                             |
| TC                  | TC-CFR-003                                                            |
| Gravidade proposta  | low — alvo pequeno no celular; a 130 % e 200 % já passa de 44         |
| Reproduziu          | sim — mesma medida de CH-01 passo 17 (duplicado provável de CH-01 A-3) |
| Viewport            | 390 × 844, fonte 100 %                                                |

**Passos para reproduzir** — de um estado limpo:

1. Logada como `admin`, abrir `/admin/pedidos/<pedido pendente>/pagamento` em 390 × 844
2. Medir a altura de "Data do pagamento (Brasília)" e "Limpar Data do pagamento (Brasília)"

**Esperado:** ≥ 44 px — **fonte:** `CLAUDE.md` › Mobile; TC-UI-001.

**Observado:** 40 px e 36 px.

**Evidência:**

- `screenshots/CH-07-01-registrar-390-fonte-200.png` (a imagem é a 200 %; a medida é do passo 01 a 100 %)

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Usabilidade           | fail     | comprovantes somem quando escolhidos por último | A-1 |
| J-01    | Acessibilidade        | friction | foco no `<body>` depois de registrar; alvos de data < 44 a 100 % | A-2, A-3 |
| J-01    | Performance percebida | pass     | — (botão trava em 46 ms; volta ao pedido em ~0,9 s com 3 comprovantes) | — |
| J-01    | Compatibilidade       | pass     | — (tela de registrar sem rolagem lateral a 100/130/200 % e em 1440) | — |
| J-01    | Recuperação de erro   | pass     | — (Esc no portão preserva tudo; rede cortada no registro não reprovada aqui) | — |
| J-01    | Paridade com produção | pass     | desvios listados no cabeçalho | — |
| J-02    | Usabilidade           | pass     | — | — |
| J-02    | Acessibilidade        | pass     | — (Tab/Enter, foco no Motivo ao abrir, no H1 ao concluir, anel visível, sem animação com movimento reduzido) | — |
| J-02    | Performance percebida | pass     | — | — |
| J-02    | Compatibilidade       | friction | pedido a 200 % rola 36 px (causa fora da mudança) | — |
| J-02    | Recuperação de erro   | pass     | — (frase simples, motivo preservado, nova tentativa funciona) | — |
| J-02    | Paridade com produção | pass     | desvios listados no cabeçalho | — |

**Categorias fora:** nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Depois da falha de rede no desfazer, o foco fica no contêiner do diálogo e não volta ao botão "Desfazer o registro"; nenhuma fonte define onde o foco deve ficar numa recusa | 09 | polimento |
| O botão do X dos diálogos (portão e desfazer) se chama "Close", em inglês | 03, 08 | pré-existente |
| No pedido a 200 % em 390, o documento rola 36 px na lateral; o botão "Em Separação" do "Próximo passo" (não tocado pela mudança) passa 1 px da borda; a origem dos outros 35 px não foi isolada | 07 | pré-existente |

## Fora da cobertura

- Rede cortada no confirmar do **registro** (TC-CFR-001 passo 2) — orçamento; CH-01 passo 18 já cortou a rede depois do confirmar
- Registro inteiro só pelo teclado em 1440 (Deve tentar 2) — orçamento gasto na reprodução de A-1; os rótulos foram lidos no snapshot em 390
- Recusas de data e de arquivo anunciadas (TC-CFR-002 passo 2) — não reprovocadas; CH-01 viu a recusa de GIF em `role=alert`
- Medidas do bloco Pagamento (alvos de "Desfazer registro", "Gerar link", comprovantes) a 100/130/200 % e o bloco de M11 (selos) — o bloco não foi isolado pela medição e o orçamento acabou
- Fonte do sistema real, leitor de tela real, celular real — fora do browser da sessão
- Se o botão "Desfazer o registro" trava durante a espera — com a rede cortada a falha é imediata, e com a rede de volta o diálogo fechou antes da primeira leitura (60 ms)

## Debrief

- **Surpresas:** a primeira tentativa de anexar por código foi bloqueada pela raiz de arquivos do MCP (arquivos fora do workspace), e isso escondeu por um tempo que o problema real é a ordem de preenchimento (A-1)
- **Próximo charter:** a ordem do formulário merece reteste junto com CH-01 A-1 — escolher arquivo depois de mexer em qualquer campo; e uma passada só de medida do bloco Pagamento a 200 %
- **Padrão novo:** "preencher na ordem natural da pessoa" (campos de texto antes do anexo) achou o bug que "arquivo primeiro numa tela recém-aberta" escondia
