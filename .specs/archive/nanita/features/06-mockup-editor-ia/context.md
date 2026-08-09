# Context — mockup-editor-ia

Evolução da feature `mockup-generator` (concluída em 2026-07-21) em três frentes: **tela cheia para o
editor de mockup**, **guias de sangria** e **assistência por IA no backend**. Este documento consolida
funcionalidades, comportamentos, decisões e opções levantadas nas sessões de design de **2026-07-27**.

O desenho vive no Paper (arquivo **Nanapin**, página **Backoffice**):
<https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/5-0>

Feature-mãe: [`.specs/features/05-mockup-generator/`](../05-mockup-generator/context.md).
Nada foi implementado ainda — este documento é o insumo para `spec.md` / `design.md` / `tasks.md`.

---

## Artboards de referência

| Artboard (Paper) | O que fixa |
| ---------------- | ---------- |
| **Editor de Mockup — /admin/mockups/:id/editar** | Tela cheia em modo **Prévia**: palco com o composto realista, camadas isoláveis, bateria de artes de teste, calibragem rebaixada a ferramenta, inspetor à direita |
| **Editor de Mockup — modo Editor (sangria)** | O mesmo layout em modo **Editor**: guias de sangria / corte / área segura sobre a arte crua, faixa da aba, alerta de violação |
| **Mockups — sugestões de melhoria** | As 16 melhorias priorizadas (1 = junto com a tela cheia, 2 = próxima leva, 3 = mexe na engine) + mapa de onde cada uma encosta no código |
| **IA no fluxo de mockups — avaliação e desenho** | A divisão "IA lê" × "IA cria", avaliação de provedores, arquitetura de backend e riscos |
| **Ferramentas de IA — UI no editor** | UI de `Gerar cenário` (com máscara) e do card `Assistente` no inspetor |

---

## Problema

O cadastro de mockup hoje é um `Dialog` ([`MockupTemplateDialog.tsx`](../../../apps/backoffice/src/features/mockup-studio/ui/MockupTemplateDialog.tsx))
com duas colunas apertadas. Dentro dele, a hierarquia está invertida: a superfície com os eixos de
calibragem aparece primeiro e grande, e o composto real — o resultado — aparece abaixo, pequeno, com
uma arte de amostra gerada em canvas que escreve a palavra "ARTE"
([`MockupTemplateDialog.tsx:34-63`](../../../apps/backoffice/src/features/mockup-studio/ui/MockupTemplateDialog.tsx#L34-L63)).
O admin calibra no escuro: a amostra não revela defeito nenhum, e três classes de falha do engine
acontecem em silêncio (ver T5–T7 adiante).

Falta também qualquer noção de **sangria**: nem o admin nem o cliente sabem que a faixa externa da
arte dobra para trás do botton e desaparece.

---

## Frentes e escopo

| Frente | Conteúdo | Depende de |
| ------ | -------- | ---------- |
| **A — Tela cheia** | Rotas próprias, cabeçalho fixo, palco/prévia como protagonista, inspetor sticky, guarda de saída | nada |
| **B — Sangria e calibragem** | Modo Editor com guias em mm, campos numéricos, presets, verificações automáticas | A |
| **C — IA no backend** | Edge function `ai-assist`, leitura de imagem por LLM, geração de cenário com máscara | A · B (as guias alimentam o item 4 de C) |

Frentes A e B não têm custo externo nem secret novo. C introduz dependência de terceiros e gasto por
request — pode ser adiada sem bloquear A/B.

---

## Funcionalidades e comportamentos

### A — Tela cheia (`/admin/mockups/novo`, `/admin/mockups/:id/editar`)

| # | Funcionalidade | Comportamento |
| - | -------------- | ------------- |
| A1 | Rotas próprias | Molde de `AdminProductFormPage`: `novo` e `:id/editar`. Link compartilhável, voltar do browser funciona, F5 não perde a calibragem (draft em `sessionStorage`) |
| A2 | Lista navega em vez de abrir modal | O lápis em `AdminMockupsPage` faz `navigate`, não `setDialogOpen`. `MockupTemplateDialog` deixa de existir |
| A3 | Cabeçalho fixo | Breadcrumb, nome, badge de status, badge "Alterações não salvas", ações Duplicar / Descartar / Salvar (⌘S) |
| A4 | Guarda de saída | Sair com alterações pendentes pede confirmação. O modal protegia por acidente (fechar era um gesto só); numa rota isso precisa ser explícito |
| A5 | Inspetor sticky à direita (380 px) | Cards: Arquivos, Acabamento, Verificações, Publicação |
| A6 | Atalhos | ⌘S salva, Esc volta, ⌘Z desfaz a calibragem |
| A7 | Status rascunho / ativo | Rascunho salva sem expor na loja nem no estúdio. Hoje só existe `is_active` booleano |
| A8 | Ordem por arraste na lista | `sort_order` deixa de ser campo numérico manual |

### A9 — Palco da prévia (modo Prévia)

| Comportamento | Detalhe |
| ------------- | ------- |
| Prévia composta é o protagonista | Grande, no topo. Fundo + arte recortada + relevo medido + overlay — o que a loja e o estúdio vão gerar |
| Camadas isoláveis | Ligar/desligar **Fundo · Arte · Relevo · Overlay** na própria prévia. É como se descobre *qual* etapa deixou o centro cinza |
| Antes / depois | Cortina comparando fundo cru × composto |
| Zoom + lupa na aba | 200 % preso à borda da elipse — onde o assentamento (últimos 6 % do raio, `EDGE_START`/`EDGE_DARK` em [`domeShading.ts`](../../../packages/core/src/mockup/domeShading.ts)) entrega a colagem |
| Chips de estado | "Composto ao vivo · 28 ms" e "1600 × 1600 · PNG" |
| Enviar arte para visualizar | Botão no cabeçalho do card + tile "Enviar" na bateria. A arte de teste **não é salva** no template |

### A10 — Bateria de artes de teste

Substitui a amostra única "ARTE". Cada arte expõe um defeito diferente:

| Arte | Expõe |
| ---- | ----- |
| Catálogo (arte real) | Sanity check final |
| Alvo (círculos concêntricos) | Descentralização e rotação da art-zone |
| Listras diagonais | Distorção / elipse onde deveria ser círculo |
| Clara (quase branca) | Relevo lavando a arte (teto por headroom de cor) |
| Escura (quase preta) | Relevo sujando o centro |
| Linha 1 px | Nitidez e serrilha da borda |

Ação **Rodar bateria completa** compõe as seis e reporta a pior.

### B — Modo Editor: guias de sangria

Toggle `Editor | Prévia` acima do palco. Em modo Editor o palco mostra a arte crua com três guias
concêntricas, escala derivada do **tamanho do botton**, não do arquivo:

| Guia | Medida (default 45 mm) | Traço | Significado |
| ---- | ---------------------- | ----- | ----------- |
| **Sangria** | 57 mm | tracejado framboesa `#B0176B` | A arte tem que chegar até aqui. Fundo branco nessa faixa vira borda clara no produto |
| **Corte** | 45 mm | cheio violeta `#6C3CE9` | Diâmetro do botton |
| **Área segura** | 38 mm | tracejado tinta `#1A0F2E` | Texto e logo só aqui dentro — a curvatura do domo distorce o resto |

Comportamentos:

- Faixa entre corte e sangria hachurada, rotulada **"vira aba · 6 mm"**.
- Elemento cruzando a área segura dispara alerta ancorado no ponto (ex.: "wordmark fora da área segura").
- Toggles por guia + régua em mm na barra flutuante.
- Legenda ao lado do disco explica cada guia em uma frase (não é tooltip: fica visível).
- Modo Prévia continua mostrando o composto realista, sem guias.

### B — Calibragem precisa

| # | Funcionalidade | Comportamento |
| - | -------------- | ------------- |
| B1 | Calibragem vira **ferramenta**, não resultado | Desce para um card próprio rotulado "ferramenta", ao lado dos campos |
| B2 | Campos numéricos | `cx`, `cy`, `rx`, `ry`, rotação — com o equivalente em px ao lado |
| B3 | Teclado | Setas 1 px, Shift 10 px, ⌘Z desfaz |
| B4 | Travar círculo perfeito em px | Compensa a proporção do fundo (ver T5) |
| B5 | Presets de área | 45 mm frontal · 45 mm ¾ · 32 mm · "copiar de outro mockup" |
| B6 | Detectar área automaticamente | Botão no cabeçalho da calibragem. Implementação por IA (C1) ou detector de círculo |

### B — Verificações do template (linter)

Card no inspetor, roda a cada mudança. Os quatro primeiros itens hoje falham **em silêncio**:

| Verificação | Hoje |
| ----------- | ---- |
| Relevo não pôde ser medido (canvas tainted por CORS, zona degenerada, grade rala) | `extractShadingModel` devolve `null` e a arte sai chapada sem aviso |
| Overlay com dimensão diferente do fundo | É esticado para `bgW × bgH` sem aviso |
| Overlay sem canal alpha | Cobre a arte inteira |
| Blend `normal` com overlay | Apaga o que está embaixo |
| Área extrapolando o fundo, ou encostando na aba | — |
| Fundo já estampado no centro | O percentil mede tinta em vez de substrato |
| Fundo pequeno para o render final | — |
| Assets com CORS liberado | ✓ (informativo) |

Complementos: **mapa do relevo medido** (heatmap do campo ajustado, 16 × 32 células) e ação corretiva
inline quando existir ("Recuar 2 %").

### B — Coerência da coleção

Strip com a mesma arte composta nos outros mockups **ativos**, para o conjunto não parecer fotografado
em dias diferentes. Não é "onde este mockup é usado": os renders são cópias em `product-images` sem
vínculo com o template, então essa lista não existe (ver O6).

### C — IA: o que lê (Claude, visão + JSON)

| # | Ação (edge function) | Entrada → saída |
| - | -------------------- | --------------- |
| C1 | `detect-art-zone` | Foto do fundo → `{cx, cy, rx, ry, rotation, confidence}` |
| C2 | `audit-template` | Fundo + overlay → lista de achados para o card Verificações ("a luz vem da direita, não de frente") |
| C3 | `judge-render` | PNG composto → `{score 0-10, motivo, sugestão}`. Roda sobre a bateria e devolve a **pior** nota |
| C4 | `review-customer-art` | Arte do cliente + guias → resolução baixa para 57 mm, texto fora da área segura, fundo branco na faixa da aba, contraste que morre no domo |
| C5 | `describe` | Imagem → nome do mockup, alt-text, título e descrição de SEO |
| C6 | `moderate` | Arte do cliente → sinaliza conteúdo proibido / marca registrada óbvia para revisão humana |

### C — IA: o que cria (provedor separado)

| # | Ação | Comportamento |
| - | ---- | ------------- |
| C7 | `generate-scene` | Foto real do botton em branco + **máscara derivada da art-zone** → o modelo pinta só o entorno (mesa de madeira, jaqueta jeans, cartela kraft, na mão). O produto sai intacto porque nunca foi regenerado |
| C8 | Coleção de uma vez | 4–6 cenários no mesmo pedido, mesma foto como referência → resolve C-oerência sem sessão de fotos |
| C9 | `cleanup` | Upscale, remoção de fundo, correção de perspectiva da foto do fornecedor |
| C10 | Copiloto | "Um 45 mm frontal em fundo rosa pastel, luz suave de cima" → gerador faz a cena, Claude propõe art-zone e acabamento, engine compõe a arte de teste, Claude julga. Admin aprova ou pede outra |

### C — UI das ferramentas de IA

- **Card `Assistente`** no inspetor: três ações com o **custo estimado em cada uma**, contador do dia e teto mensal.
- **Sugestão de art-zone**: valores + confiança (ex.: 94 %) + linha "validada pela engine: cabe no fundo e o sombreamento foi medido" + par **Aplicar / Descartar**.
- **Veredito do juiz visual**: nota grande, motivo em prosa, barras por arte de teste.
- **`Gerar cenário`**: foto-fonte e máscara lado a lado (a máscara mostra o disco branco = protegido), prompt com presets, 4 thumbs em estados distintos (pronto / gerando / na fila), `Usar como fundo` → cria template **em rascunho** com art-zone já proposta.
- Regra transversal: **toda saída de IA chega com confiança, custo e um par Aplicar/Descartar**. Se o admin não clicar, nada muda no template.

---

## Decisões

| # | Questão | Opções consideradas | Escolha | Rationale |
| - | ------- | ------------------- | ------- | --------- |
| D1 | Cadastro de mockup: modal ou tela? | (a) Modal atual · (b) **Tela cheia com rota** | **Tela cheia com rota** | Pedido do usuário. O modal não cabe palco + calibragem + inspetor; e rota dá deep link, voltar do browser e F5 sem perda |
| D2 | Hierarquia do palco | (a) Calibragem primeiro (hoje) · (b) **Prévia primeiro, calibragem como ferramenta** | **Prévia primeiro** | Pedido do usuário. A imagem de baixo "deveria ser a prévia de fato"; a superfície com eixos é configuração, não resultado |
| D3 | Como ver a arte no editor | (a) Só composto · (b) **Dois modos: Editor (guias) + Prévia (composto)** | **Dois modos** | Pedido do usuário. São perguntas diferentes: "o que vai ser cortado" × "como vai ficar" |
| D4 | Arte de amostra | (a) Manter amostra única "ARTE" · (b) **Bateria de artes de teste** | **Bateria** | Uma amostra só não revela defeito nenhum. Seis artes cobrem descentralização, distorção, relevo lavando/sujando e nitidez |
| D5 | O que a IA gera | (a) O mockup composto final · (b) **O cenário (fundo do template)** | **O cenário** | Um modelo generativo redesenha o que recebe — a estampa do cliente sairia com texto derretido e cores trocadas. Gerando só o fundo, a engine determinística continua compondo a arte real. Custo por template em vez de por prévia, e encaixa em `background_url` sem mudar o schema |
| D6 | Geração livre ou com máscara? | (a) Livre por prompt · (b) **Image-to-image com máscara obrigatória** | **Máscara obrigatória** | Sem máscara o modelo reinventa o botton e o produto deixa de ser o produto. A máscara sai da art-zone que já existe |
| D7 | Provedor de LLM (texto + visão) | (a) **Claude** · (b) OpenAI · (c) os dois atrás de abstração | **Claude** | Visão até 2576 px sem downscale, structured outputs por `json_schema`, prompt caching a partir de 512 tokens, um SDK só no Deno da edge function. Detalhes em T12 |
| D8 | Provedor de geração de imagem | (a) OpenAI GPT Image 2 · (b) Google Gemini 3 Pro Image / Imagen 4 · (c) **FLUX Kontext / 2 Pro** · (d) decidir depois | **Adiada — critério fixado, favorito FLUX** | Claude **não gera imagem**. O critério eliminatório é inpainting por máscara (D6); FLUX Kontext atende e o 2 Pro aceita até 8 referências. Fechar só depois de gerar 20 cenários reais |
| D9 | Onde a IA roda | (a) Client-side no backoffice · (b) **Edge function** | **Edge function** | O backoffice é Vite: qualquer chave em `VITE_*` vai no bundle público. E o gasto precisa de gate de admin + auditoria |
| D10 | Autonomia da IA | (a) Aplicar direto · (b) **Propor, engine validar, humano aprovar** | **Propor / validar / aprovar** | Número alucinado gravado direto no template é caro de descobrir. A art-zone proposta passa pela validação que já existe antes de aparecer como sugestão |

---

## Decisões técnicas derivadas

| # | Decisão | Rationale / fonte |
| - | ------- | ----------------- |
| T1 | Escala das guias vem do **tamanho do botton** (mm), não das dimensões do arquivo | 57 mm no disco de 336 px ⇒ 5,9 px/mm. Um fundo de 1600 px e outro de 2400 px têm que mostrar a mesma sangria |
| T2 | `MockupTemplateDialog` é **removido**, não adaptado | Duas superfícies para a mesma coisa divergem. A rota substitui |
| T3 | Draft em `sessionStorage` por template | Rota permite F5; sem isso a calibragem se perde |
| T4 | Prévia continua coalescida por `requestAnimationFrame` | A composição com sombreamento custa ~20-30 ms e o drag dispara a cada `pointermove` ([`ArtZoneEditor.tsx:109-125`](../../../apps/backoffice/src/features/mockup-studio/ui/ArtZoneEditor.tsx#L109-L125)) |
| T5 | Travar "círculo perfeito" compensa a proporção do fundo | Armadilha atual: `resolveArtZone` escala `rx` pela **largura** e `ry` pela **altura** ([`mockupGeometry.ts:6-15`](../../../packages/core/src/mockup/mockupGeometry.ts#L6-L15)). Em foto não quadrada, `rx = ry` produz elipse — e o sombreamento é medido torto |
| T6 | Linter reporta quando o relevo **não pôde** ser medido | `extractShadingModel` devolve `null` em canvas tainted, zona degenerada ou grade com menos de 50 % de células preenchidas ([`domeShading.ts:238-290`](../../../packages/core/src/mockup/domeShading.ts#L238-L290)) e a composição segue chapada sem sinal |
| T7 | Linter avisa overlay com dimensão diferente do fundo | `drawMockup` desenha o overlay em `bgW × bgH` qualquer que seja o original ([`composeMockup.ts:59-62`](../../../packages/core/src/mockup/composeMockup.ts#L59-L62)) |
| T8 | Resolução/formato de saída configurável | O render sobe comprimido em ≤ 1200 px WebP, herdado de `uploadProductImage`. Foto de vitrine merece escolher 1600/2000 px |
| T9 | Uma edge function `supabase/functions/ai-assist` com switch de `action` | Molde de `mercado-pago`: um arquivo, um switch. Actions: `detect-art-zone`, `audit-template`, `judge-render`, `review-customer-art`, `describe`, `moderate`, `generate-scene`, `cleanup` |
| T10 | `has_role(auth.uid(),'admin')` verificado **dentro** da function | RLS de tabela não protege uma edge function, e cada chamada gasta dinheiro. Mesmo padrão do `create-payment` |
| T11 | Tabela `ai_jobs` | `action`, `provider`, `model`, `tokens_in/out`, `cost`, `template_id`, `result`, `created_by`. Sem ela não existe resposta para "por que a conta deu isso", nem teto de gasto |
| T12 | SDK oficial `@anthropic-ai/sdk` via especificador `npm:` no Deno | Evita HTTP na mão; mesmo padrão de dependência das outras functions |
| T13 | Cache por `hash(imagem) + action` na `ai_jobs` | Reabrir o mesmo template não repaga a mesma auditoria. Do lado do modelo, prompt caching no system prompt do auditor (longo e estável) |
| T14 | Geração de imagem é **assíncrona** | 5–20 s não cabem num request de UI: cria o job, devolve o id, a tela faz polling. O fundo aprovado sobe para o bucket `mockup-templates` |
| T15 | Interface por **capacidade**, não por fornecedor | `lerImagem()` / `gerarCenario()`. O provedor vira detalhe de implementação — é o que permite trocar o gerador em uma tarde quando o preço mudar |
| T16 | IA nunca roda automática no editor | Uma foto a 2576 px custa ~4.800 tokens de entrada. Só sob demanda, com o custo visível no botão |
| T17 | Cenário gerado entra como template **em rascunho** | Nunca como foto final de produto (D5/D6) |

---

## Avaliação de provedores

### Texto + visão — Claude (D7)

| Modelo | Preço (entrada / saída por 1M) | Papel |
| ------ | ----------------------------- | ----- |
| `claude-opus-5` | US$ 5 / 25 | Juiz visual (C3) e detecção de área (C1) — onde errar significa refazer o template |
| `claude-sonnet-5` | US$ 3 / 15 (promocional US$ 2 / 10 até 2026-08-31) | Auditoria em lote da coleção (C2). Mesma visão de alta resolução do Opus |
| `claude-haiku-4-5` | US$ 1 / 5 | Nome, alt-text, SEO, triagem (C5, C6) |

Por que Claude e não OpenAI:

- Visão de alta resolução até **2576 px** no lado maior — a foto do template chega inteira, sem downscale que apaga a borda do domo. Custa até ~4.784 tokens por imagem.
- **Structured outputs** por `output_config.format` com `json_schema`: a art-zone volta como número validado, não como texto para dar parse.
- **Prompt caching a partir de 512 tokens** no Opus 5 — o system prompt do auditor fica cacheado entre um template e o próximo.
- Um SDK só. Um segundo LLM significa dois secrets, dois formatos de erro e duas contas para conciliar; se um dia precisar de fallback, o lugar dele é atrás da interface de T15.

### Geração de imagem — a decidir (D8)

Critério eliminatório, em ordem:

1. **Inpainting por máscara** — obrigatório (D6). Elimina candidato, não importa o preço.
2. **Imagens de referência** — mantém o mesmo botton entre a cena da mesa e a da jaqueta.
3. **Saída ≥ 1600 px** — abaixo disso não serve como fundo de template.
4. **Custo previsível por imagem** — a conta tem que caber num teto mensal configurável.

| Candidato | Preço observado | Nota |
| --------- | --------------- | ---- |
| FLUX Kontext / 2 Pro | ~US$ 0,02 / imagem | Kontext faz inpainting por máscara; 2 Pro aceita até 8 referências. **Favorito** |
| Gemini 3 Pro Image · Imagen 4 | US$ 0,02 (Fast) · 0,04 (Std) · 0,06 (Ultra) | Edição por instrução em linguagem natural; Imagen forte em fotorrealismo |
| GPT Image 2 (OpenAI) | US$ 0,006 – 0,21 conforme qualidade | Melhor em seguir instrução e texto renderizado — não é o que um fundo de cenário exige |

> ⚠️ Nomes e preços de geração de imagem são de **2026-07-27** e mudam rápido. Reconfirmar antes de
> implementar. Fontes: [IntuitionLabs](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai),
> [llm-stats](https://llm-stats.com/leaderboards/best-ai-for-image-generation),
> [TokenMix](https://tokenmix.ai/blog/ai-image-generation-api-comparison),
> [API.market](https://api.market/blog/astrosoft/image-generation/best-ai-Image-generation-apis).

---

## Opções levantadas e não escolhidas

| # | Opção | Por que ficou fora |
| - | ----- | ------------------ |
| O1 | Detector de círculo próprio (Hough simplificado) para a art-zone | C1 resolve com visão e acerta em foto torta, com mão, com três bottons. O detector fica como plano B se a IA for adiada |
| O2 | Warp esférico da estampa (pinch radial) acompanhando o domo | Maior salto de realismo que resta e o mais caro. Fase 3 — mexe em `composeMockup` |
| O3 | Grão e exposição casados com a foto | Fase 3. A foto tem ruído e temperatura; a arte entra limpa e denuncia a colagem |
| O4 | Borda suave (feather 1–2 px) no clip da elipse | Fase 3, mas é o defeito mais visível num render de 1600 px: o clip é hard-edge e serrilha em diagonal |
| O5 | Sombra de contato do botton no fundo | Fase 3, valor menor que O4 |
| O6 | Card "onde este mockup é usado" | **Impossível hoje**: os renders são cópias em `product-images` sem FK para o template. Substituído por "Coerência da coleção" |
| O7 | Dois LLMs atrás de abstração desde o início | Complexidade sem demanda. T15 deixa a porta aberta |
| O8 | Prévia realista gerada por IA a cada arte do cliente | Custo por prévia em vez de por template, e o gerador distorceria a arte. Contraria D5 |
| O9 | IA aplicando a art-zone direto ao salvar | Contraria D10 |

---

## Riscos e guarda-corpos

| Risco | Guarda-corpo |
| ----- | ------------ |
| Número alucinado aplicado direto | D10: engine valida (cabe no fundo? o sombreamento mediu?) e a sugestão aparece com confiança + Aplicar/Descartar |
| Produto inventado pelo gerador | D6: máscara obrigatória; T17: resultado entra como fundo de template em rascunho |
| Custo silencioso | T16 (nunca automático), T11 (`ai_jobs` + teto), T13 (cache). Auditar 6 templates ≈ 29 mil tokens: barato uma vez, caro num loop a cada arraste |
| Triagem derrubando venda boa | C6 sinaliza para revisão humana, não bloqueia. Falso positivo aqui custa um pedido |
| Chave de API vazando no bundle | D9 + T10: nada de `VITE_*`; secrets via `supabase secrets set` |
| Lock-in de fornecedor | T15: interface por capacidade |
| Cenário lindo, produto mentiroso | O fundo gerado tem que combinar com o que a gráfica entrega. Brilho metálico exagerado vende expectativa que o produto não cumpre — C3 também serve para pegar isso |
| Guias de sangria erradas | As medidas de B são **defaults a confirmar** com o fornecedor (ver Open questions) |

---

## Impacto no código

| Arquivo | Ação |
| ------- | ---- |
| `apps/backoffice/src/pages/admin/AdminMockupEditorPage.tsx` | **novo** — rota, estado, salvar, guarda de saída |
| `apps/backoffice/src/features/mockup-studio/ui/MockupPreviewStage.tsx` | **novo** — palco, camadas, A/B, zoom, toggle Editor/Prévia |
| `apps/backoffice/src/features/mockup-studio/ui/BleedGuides.tsx` | **novo** — guias em mm sobre a arte |
| `apps/backoffice/src/features/mockup-studio/lib/testArts.ts` | **novo** — a bateria, gerada em canvas |
| `apps/backoffice/src/features/mockup-studio/lib/lintTemplate.ts` | **novo** — função pura, testável |
| `apps/backoffice/src/features/mockup-studio/ui/ArtZoneEditor.tsx` | **muda** — perde a prévia, ganha campos numéricos e teclado |
| `apps/backoffice/src/pages/admin/AdminMockupsPage.tsx` | **muda** — lápis navega; ordem por arraste |
| `apps/backoffice/src/app/App.tsx` | **muda** — 2 rotas novas |
| `apps/backoffice/src/features/mockup-studio/ui/MockupTemplateDialog.tsx` | **removido** (T2) |
| `packages/core/src/mockup/composeMockup.ts` · `domeShading.ts` | **muda (fase 3)** — feather, grão, exposição |
| `supabase/functions/ai-assist/index.ts` | **novo** — frente C |
| `supabase/migrations/<ts>_create_ai_jobs.sql` | **novo** — T11 |
| `supabase/migrations/<ts>_add_mockup_bleed_and_status.sql` | **novo** — mm das guias + `status` rascunho/ativo (A7) |

---

## Open questions

| # | Questão | Estado |
| - | ------- | ------ |
| Q1 | Medidas reais de sangria/corte/área segura do fornecedor | **Aberta.** 57 / 45 / 38 mm são defaults plausíveis usados no desenho. Confirmar com quem imprime antes de codificar — e guardar por tamanho de botton (32 / 45 / 55 mm), não fixo |
| Q2 | As medidas ficam por template ou por tamanho de produto? | **Aberta.** Provável: tabela de tamanhos, com o template apontando para um |
| Q3 | Provedor de geração de imagem | **Aberta** por decisão (D8). Fechar após 20 cenários reais |
| Q4 | Teto de gasto mensal de IA | **Aberta.** US$ 20/mês aparece no desenho como placeholder |
| Q5 | As guias de sangria aparecem também na loja (`CustomPinPage`)? | **Aberta.** C4 sugere que sim, de forma simplificada — o cliente é quem manda a arte fora da área segura |
| Q6 | Frente C entra nesta leva ou depois de A/B? | **Aberta.** Recomendação: A + B primeiro (sem custo externo, sem secret), C em seguida |

---

## Próximo passo

Rodar a Skill `tlc-spec-driven` sobre este documento para produzir `spec.md`, `design.md` e `tasks.md`
— com os itens numerados `01-nome-implementacao` conforme a convenção do `CLAUDE.md`. Sugestão de
fatiamento: **A + B** como uma feature (`mockup-editor-fullscreen`), **C** como outra (`mockup-ai-assist`),
já que C depende de decisão de fornecedor e de secret novo.
