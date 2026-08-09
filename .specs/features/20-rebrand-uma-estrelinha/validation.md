# 20 · Rebrand Uma Estrelinha — Validação

**Data**: 2026-08-08
**Spec**: [`spec.md`](./spec.md) · **Design**: [`design.md`](./design.md) · **Tasks**: [`tasks.md`](./tasks.md)
**Intervalo de diff**: `12c8ab7..HEAD` (`5167626`) — **49 commits**
**Verifier**: sub-agente independente (autor ≠ verificador), leitura sobre a árvore real; toda mutação
em estado descartável, revertida por `git checkout` com `git status --porcelain` vazio a cada passo.

**Veredito: PASS ✅** — 36/36 ACs com evidência localizada, **10/11 mutantes mortos**, gates verdes.
Um mutante sobreviveu e vira gap ranqueado (não bloqueante).

---

## Task Completion

As 42 tasks (T1–T41 + T22b) estão marcadas concluídas em `tasks.md`. Cinco desvios declarados no
"Registro de execução" foram auditados individualmente:

| Desvio declarado | Julgamento |
| --- | --- |
| **T11/T12 trocadas de ordem** (loja antes de `core`) | ✅ Defensável. A loja importava `useMockups`/`composeMockup` de `@estrelinha/core`; a ordem planejada deixaria o `tsc` da loja vermelho, violando o "Done when" da própria T11. Estado final idêntico ao planejado. |
| **T27 antes de T26** (ícone antes dos componentes) | ✅ Defensável, pelo mesmo mecanismo — `brandAssets.test.ts` acoplava o favicon ao path do lockup legado. |
| **`fill-rule="evenodd"` não transferido** (T24) | ✅ Defensável, e melhor que o plano. A marca é `fill="none"`; `fill-rule` não tem efeito sobre path que não preenche, e entraria inerte sugerindo uma regra que não vale. O que transferiu foi a **consolidação**, com critério novo (um `<path>` por papel de traço) e guarda correspondente — `paths.test.ts:106` `expect(new Set(larguras).size).toBe(larguras.length)`. |
| **Ícone é o símbolo reduzido, não o selo circular** (T27, contra a letra da `IDN-07`) | ✅ Defensável e **medido**. O selo carrega anel + 25 glifos de assinatura curva; a 16px o anel mede 0,23px. Adotar a letra da AC violaria o outro "Done when" da mesma task ("espessura mínima legível a 16px"). A régua está congelada em `brandAssets.test.ts:84` (`≥ 1,28px`) e `:92` (o símbolo grande **não** alcançaria o piso). Ver a AC P2.7 abaixo. |
| **SMTP do auth desligado** (T36, `COP-05`) | ✅ Satisfaz o edge case. Análise própria abaixo. |
| **T23 fechou com lista `PENDENTE`** de 42 arquivos | ✅ Resolvido. A lista fechou **vazia** na T38, e `brandScan.test.ts:181` (`expect(limpos).toEqual([])`) + `:196` (toda entrada nomeia dono) tornam a lista autodestrutiva. Verificado: `PENDENTE` é `{}` hoje e a suíte inteira está verde sem ela. |

---

## Julgamento dos dois pontos levantados com ceticismo

### 1. `COP-05` — o SMTP do auth foi DESLIGADO. Isso cumpre a AC?

**Sim.** A AC 5 de P4 é condicional (`WHEN o remetente e o sender_name … são trocados`) e o antecedente
não ocorreu: o remetente **não foi trocado**. Quem governa o caso é o edge case da spec —
*"WHEN o domínio de e-mail ainda não está verificado no Resend THEN a troca de remetente SHALL ficar
pendente e documentada, e o ambiente local SHALL seguir capturando no Mailpit"* — e as três metades
estão cumpridas:

- **Pendente**: `supabase/config.toml:249-256` traz o bloco `[auth.email.smtp]` comentado com o
  endereço **nu** `acesso@send.umaestrelinha.com.br` e `sender_name = "Uma Estrelinha"`, exatamente na
  forma que a AC exige quando a troca acontecer.
- **Documentada**: `config.toml:228-238` traz o `curl` de verificação (403 = ainda não, 200 = liberado)
  e os quatro passos, incluindo `supabase stop && supabase start`. `.env.example:149` registra a
  medição de 2026-08-08 e o motivo (`BUG-20260728`).
- **Mailpit**: `config.toml:93-96` — `[inbucket] enabled = true`, porta 54344. Com o bloco SMTP
  comentado, o GoTrue volta ao Inbucket, que é **o procedimento que o próprio arquivo herdado já
  documentava** (`12c8ab7:supabase/config.toml:207-208`: *"Para voltar a capturar e-mails localmente
  no Inbucket, basta comentar este bloco inteiro"*). Não é invenção do lote.

A alternativa "manter o valor antigo" colidiria de frente com a AC 1 de P1 (zero ocorrência em
`supabase/`), e a alternativa "trocar mesmo assim" reproduziria o `BUG-20260728`. **Não é gap.**

Ressalva registrada, não gap: com o SMTP desligado, um deploy hospedado que fizesse `config push`
cairia no remetente embutido do Supabase (rate-limit de 2/h). A loja não está no ar e o passo de
religar está escrito no arquivo, mas isso pertence ao go-live (`C-08`), não a esta feature.

### 2. Os quatro blocos de conteúdo removidos — alguma AC exigia o que saiu?

**Nenhuma.** Varri as 36 ACs procurando qualquer exigência sobre os blocos removidos:

| Removido | Fase | AC que o exigisse | Veredito |
| --- | --- | --- | --- |
| Avaliações de demonstração (`entities/review`) | 2 (T15) | Nenhuma. `PIN-07` é literalmente *"Destino das avaliações de demonstração"*, e a `design.md` decidiu **remover** com o motivo escrito (peso ético de depoimento inventado sobre um luto). | ✅ Coberto por decisão, e por teste: `pages/__tests__/ProductPage.test.tsx:158-159` |
| `DropCountdown` (contador de drop) | 5 (T31) | Nenhuma. "Drop" não aparece em AC nenhuma; a `PIN-06` já havia recusado semear a tabela `drops` pelo mesmo motivo. | ✅ |
| Depoimentos do `SocialProof` | 5 (T31) | Nenhuma. Mesma classe de `PIN-07`. | ✅ |
| Os doze fandoms de `TrendingTags` | 5 (T31) | Nenhuma — e mantê-los violaria `PIN-06`/`COP-07` (vocabulário do domínio anterior). Os doze levavam a `/busca?q=` com **zero resultado** nesta loja, com o link funcionando: defeito que nenhum teste pegaria. Substituídos por `pickTrendingCategories`. | ✅ Coberto por `widgets/.../TrendingTags` (6 testes) e `pages/__tests__/homeComposition.test.ts` (5) |

A única AC que fala do que a home mostra é a `IDN-04`/`IDN-09` (paleta e chrome), e a spec declara
**explicitamente fora de escopo** o redesenho da home (board `516-0` vazio). Nenhuma regressão de
cobertura: a suíte da loja **cresceu** de 986 para 1150 testes ao longo da feature.

---

## Critérios de Aceite — ancorados na spec

### P1 · A loja é a Uma Estrelinha, tecnicamente

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| AC1 · varredura `nanapin\|nanita\|nana` em `apps/`, `packages/`, `supabase/`, `index.html` e configs da raiz → zero, e a varredura falha se varrer menos que a âncora | **zero ocorrência**; âncora obrigatória | `shared/lib/__tests__/brandScan.test.ts:170` — `expect(encontrados).toEqual([])` · âncoras: `:137` `expect(arquivosVarridos.length).toBeGreaterThan(400)`, `:148` `expect(…filter(dir).length).toBeGreaterThan(10)` para `apps`/`packages`/`supabase` **escritos literalmente** (não iterando `ESCOPO`), `:150` `expect(…raiz).toBe(ARQUIVOS_DA_RAIZ.length)` | ✅ PASS |
| AC2 · especificador `@estrelinha/*` resolvido por `tsconfig.base.json`, aliases do Vite e `package.json`; `pnpm install` resolve com lockfile regerado | especificador único, install sem erro | `tsconfig.base.json:23-29` — `"@estrelinha/ui": ["packages/ui/src/index.ts"]` … · zero `@nanapin` nos 5 configs de Vite/Vitest (medido) · `pnpm-lock.yaml` — **0** ocorrências de `nanapin` (medido) · oráculo: `tsc` = 0 nos dois apps | ✅ PASS |
| AC3 · toda chave de storage começa com `estrelinha-`; nenhuma `nanapin-` lida ou escrita | prefixo `estrelinha-` | `entities/cart/model/cartStore.ts:131` `name: 'estrelinha-cart'` · `features/checkout/model/__tests__/checkoutStore.test.ts:56` `sessionStorage.getItem(CHECKOUT_STORAGE_KEY)` com `CHECKOUT_STORAGE_KEY='estrelinha-checkout'` · `features/search/ui/__tests__/SearchOverlay.test.tsx:112` `expect(JSON.parse(localStorage.getItem('estrelinha-recent-searches')!)).toEqual(['naruto'])` · a metade negativa ("nenhuma `nanapin-`") é a própria `brandScan` | ✅ PASS |
| AC4 · backoffice na mesma paleta, tokens `--estrelinha-admin-*`, **valores inalterados** | hex idênticos aos de `12c8ab7` | Verificado por diff normalizado: `git show 12c8ab7:packages/ui/src/styles.css \| sed 's/nana-/X-/'` vs. o atual com `estrelinha-admin-` → **única diferença são 3 comentários**; `tailwind.preset.ts` idem (2 comentários + aspas na chave). Todos os 22 hexes batem (`#6C3CE9`, `#FF3B7F`, `#1A0F2E`…) | ✅ PASS ⚠️ ver gap 3 |
| AC5 · `tsc --noEmit` nos dois apps | **0 erro** | Medido nesta sessão: `apps/store/tsconfig.app.json` exit **0**; `apps/backoffice/tsconfig.app.json` exit **0** | ✅ PASS |
| AC6 · `pnpm lint` | **≤ 30 err / 9 warn** | Medido: backoffice `28 errors, 7 warnings` · store `2 errors, 1 warning` = **30 err / 8 warn** | ✅ PASS |
| AC7 · `supabase start` sem colisão, API em `127.0.0.1:54341` | API responde em 54341 | `supabase/config.toml:5` `project_id = "uma-estrelinha-store"`, `:10` `port = 54341`, `:29` 54342, `:31` shadow 54340, `:39` 54349, `:85` 54343, `:96` 54344, `:416` `inspector_port = 8085`, `:451` 54347 · **probe HTTP próprio nesta sessão**: `GET 127.0.0.1:54341/rest/v1/store_settings` → 200 com o payload | ✅ PASS |

### P2 · A identidade visual vem do Paper e é legível

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| AC1 · tokens em **dois arquivos**, teste lê os dois do disco e falha se divergirem | falha nomeando o token e os dois valores | `shared/lib/__tests__/palette.test.ts:92` — `expect(`${token}=${tw[token]}`).toBe(`${token}=${css[token]}`)` (nome embutido na mensagem) · `:85` conjunto de chaves idêntico · âncora `:71` `expect(Object.keys(css).length).toBeGreaterThanOrEqual(14)` · **mutante 1 confirmou**: a falha diz `expected 'primary=#34495E' to be 'primary=#34495F'` | ✅ PASS |
| AC2 · token como texto sobre o fundo ≥ 4,5:1; `accent` 2,66 e `accent-strong` 3,55 **nunca** texto; `ink-soft` 6,00 é o piso | os números exatos da spec | `contrast.test.ts:70` — `expect(pisoDeTexto(token, fundo, 4.5)).toBe(`${token} sobre ${fundo}: OK`)` para 4 tokens × 3 superfícies · `:101` `expect(tetoDeNaoTexto(token, fundo, 4.5)).toBe(…'não é texto')` para os 2 acentos × 3 superfícies · `:83` `expect(piso).toBeGreaterThanOrEqual(4.5)` com `piso = contrastRatio(ink-soft, ground)` · `:105` `accent` sobre `ink` é o único uso de texto do acento · **complemento de fonte**: `accentText.test.ts:82` `expect(fora).toEqual([])` | ✅ PASS ⚠️ **gap 1** — a medição usa uma cópia própria da paleta, não a declarada |
| AC3 · contorno de controle ≥ 3:1; varredura falha se um controle usar `line` ou `accent` | falha nomeando o controle | `fieldBorder.test.ts:127` — `expect(offenders).toEqual([])` sobre `CONTROL_TAGS` que inclui `Input`, `Textarea`, `SelectTrigger`, `Checkbox`, `RadioGroupItem`, `Switch` (o furo de maiúscula da 19, fechado) · `:147` `expect(veredito).toBe(`field sobre ${nome}: OK`)` nas 3 superfícies · âncora dupla `:102` (>50 arquivos) e `:115` (>20 controles) · **mutante 2 confirmou**: `features/checkout/ui/ContactBlock.tsx:123 <Input>` | ✅ PASS |
| AC4 · faixa, divisor e palco mudam junto com o chão | a faixa aparece sobre o chão | `contrast.test.ts:159` — `expect(contrastRatio(ground-deep, ground)).toBeGreaterThanOrEqual(1.1)` · `:167` congela o empate real: `expect(contrastRatio('#FFEFF6','#F9F1EE')).toBeLessThan(1.01)` · `:177` `ink-soft` sobrevive à faixa (≥4,5) · o remap está guardado por `accentText.test.ts` (5 correções de leitura registradas) | ✅ PASS |
| AC5 · marca SVG **inline** em header, rodapé, menu e checkout, na escada; nunca `<img src>` | SVG inline, escada de 3 degraus | `shared/ui/brand/__tests__/brand.test.tsx:30` `expect(svg.tagName.toLowerCase()).toBe('svg')` · `:75` abaixo do piso cai para o símbolo (`expect(marca()).toHaveAttribute('viewBox', SYMBOL.viewBox)`) · `:107` a queda é encadeada · `:155/:159` a mesma chamada em duas larguras rende dois desenhos · consumidores verificados um a um: `Header.tsx:133`, `Footer.tsx:90`, `MobileMenu.tsx:74`, `CheckoutPage.tsx:87`, `AuthOverlay.tsx:43` — **todos** componentes inline, **zero** `<img src>` de marca | ✅ PASS |
| AC6 · `paths.ts` gerado por script, teste compara caractere a caractere contra o SVG-fonte | igualdade caractere a caractere | `shared/ui/brand/__tests__/paths.test.ts:80` — `expect(stroke.d).toBe(fonte[i].d)` · `:87` espessuras iguais · `:91` viewBox igual · âncoras `:58` `expect(ARTES.length).toBe(4)` e `:66` `expect(total).toBe(10)` papéis de traço | ✅ PASS |
| AC7 · ícone na aba e no iOS, recorte próprio na aba, sangrado no `apple-touch-icon` | recorte na aba, sangrado no iOS | `app/__tests__/brandAssets.test.ts:51` `expect(rx).toBe(3.84)` + `:52` `expect(rx/64).toBeCloseTo(0.06,3)` · `:111` `expect(fonte).not.toMatch(/<rect[^>]*\srx=/)` (a fonte do apple-touch-icon **não** tem canto) · `:102-103` 180×180 lido do IHDR · `:126` o `.ico` traz `[16,32,48]` | ⚠️ **Spec-precision gap declarado** — a spec diz "selo circular"; a implementação usa o **símbolo reduzido**, com a medição que justifica (`:84` ≥1,28px a 16px; `:92` o símbolo grande ficaria <1px). Desvio consciente, medido, registrado e travado por teste. Não é falha. |
| AC8 · Libre Baskerville + Outfit; nenhuma fonte anterior requisitada, inclusive no `<link>` | as duas famílias, e só elas | `brandAssets.test.ts:159-160` — `expect(fontLink).toMatch(/family=Libre\+Baskerville/)` e `/family=Outfit/` · `:166-168` pesos exatos (`0,400;0,700;1,400` e `300..700`) · `:173` `expect(fontLink).not.toContain(familia)` para `Fredoka`, `DM+Sans`, `Berkshire`, `Lilita` · `:182` **só duas origens** de rede · âncora `:155` `expect(fontLink).toMatch(/family=/)` | ✅ PASS ⚠️ ver gap 2 |
| AC9 · header, nav, rodapé e newsletter seguem `5MC-0`/`6AU-0`, 390px como alvo | conformidade visual às boards | `widgets/header/ui/__tests__/Header.test.tsx:152` `expect(bar(container)).toHaveClass('bg-estrelinha-primary-strong')` · `:190` `expect(marca).toHaveAttribute('width','202')` (a vaga 202×48 do board) · `:204-206` a segunda faixa é `primary` e `hidden md:block` · `Footer.test.tsx:87` `expect(faixa).toHaveAttribute('href','https://instagram.com/umaestrelinha.adri')` · `NewsletterBanner.test.tsx:24` superfície `primary-strong`, `:34` o único ouro é o `BUTTON`, `:68` um campo só | ⚠️ **Spec-precision gap** — "seguir a board" não tem resultado numérico universal; as **7 divergências deliberadas** estão tabuladas em `tasks.md` §Fase 5 com o motivo de cada uma, e a mais arriscada (rótulo `primary-strong` sobre `accent`) virou número em `contrast.test.ts:121`. Cobertura material presente; a AC é que é imprecisa. |
| AC10 · 390×844: sem scroll horizontal, alvo ≥ 44px, recolhimento do header e barra única | os quatro fatos | **alvo**: `shared/lib/__tests__/touchTarget.test.ts:31-33` `expect(TAP_44).toContain('before:h-11')` + `:119` `expect(ofensores).toEqual([])` com âncora dupla `:97`/`:108` · **header**: `Header.test.tsx:237` `-translate-y-full` ao descer, `:247` volta ao subir, `:264` segue `sticky` e não `fixed`, `:274` `md:translate-y-0` · **barra única**: `storeChrome.test.ts:6` `expect(ownsBottomBar('/produto/…')).toBe(true)` e `:11` false nas demais; `:30` a reserva é `calc(BOTTOM_BAR_H + env(safe-area-inset-bottom))` · **scroll horizontal**: sem asserção automatizada — auditoria Playwright em 10 rotas (`scrollWidth − clientWidth = 0`), registrada em `tasks.md` | ✅ PASS ⚠️ o quarto fato é evidência manual, não asserção (gap 5) |

### P3 · O que é botton sai do produto

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| AC1 · Mockup Studio sai inteiro (rota, nav, `features/mockup-studio`, `entities/mockup`, `core/mockup`, tipo, `features/mockup-preview`, tabela e bucket) | remoção completa | `widgets/admin-layout/model/navItems.test.ts:89-91` — `expect(allItems.map(i=>i.to)).not.toContain('/admin/mockups')`, `…label).not.toContain('Mockups')`, `expect(appRoutePaths()).not.toContain('/admin/mockups')` (lendo o `App.tsx` do disco) · `app/__tests__/routes.test.ts:63` `expect(offenders).toEqual([])` (nada importa a prévia de mockup) com âncora `:57` `>100` arquivos · varredura própria: os únicos "mockup" restantes são o valor `ImageSource='mockup'`, decisão registrada e justificada | ✅ PASS |
| AC2 · migration idempotente nos dois sentidos, sem objeto órfão | roda em banco que nunca teve e em banco que tinha | `supabase/migrations/20260808200541_remove-mockups.sql` — `delete from storage.objects where bucket_id='mockup-templates'` **antes** de `delete from storage.buckets`, 4 `drop policy if exists`, `drop table if exists … cascade`, `drop function if exists`; destrava e devolve a GUC `storage.allow_delete_query` · probe: `to_regclass('public.mockup_templates') is null` = `t` após `db reset` (`tasks.md`, gate `db` de 2026-08-08) | ✅ PASS (prova de execução, `AD-012`) |
| AC3 · ordem textual das rotas de `App.tsx` continua batendo com `navGroups` | igualdade de sequência | `navItems.test.ts:58` — `expect(declared).toEqual(allItems.map(i => i.to))`, com `declared` lido do `App.tsx` do disco | ✅ PASS |
| AC4 · a rota do kit de pins cai na 404 própria; nenhum link interno aponta para ela | 404 da loja, zero link | `app/__tests__/routes.test.ts:32` `expect(declaredRoutes()).not.toContain('/crie-seu-botton')` + `:35` `expect(APP).toMatch(/path="\*"\s+element=\{<NotFound \/>\}/)` · `:52` `expect(offenders).toEqual([])` sobre >100 arquivos · **mutante 11 confirmou**: reintroduzir o link derruba o teste nomeando `Footer.tsx:136` e `:142` | ✅ PASS |
| AC5 · ficha sai do cadastro; nunca `Material: metal…`, `Fixação: alfinete…`, `Arte exclusiva <marca>` | as três frases ausentes | `entities/product/lib/__tests__/productFacts.test.ts:146-148` — `expect(specs.some(s=>s.startsWith('Material:'))).toBe(false)`, `…'Fixação:'…false`, `expect(specs.some(s=>/Arte exclusiva/i.test(s))).toBe(false)` · `:129` `expect(specs).toEqual(['Tamanho: 3,8 cm','Peso: 10g'])` (o "de diâmetro" saiu como quarta verdade de botton) · `:153` ficha vazia quando não há dado | ✅ PASS |
| AC6 · seed de joia afetiva coerente com as linhas reais; nenhuma string do domínio anterior | 6 linhas + zero resíduo | `supabase/seed.sql` — categorias `uma-estrelinha`, `pet`, `leite-materno`, `dente-de-leite`, `maternidade`, `masculina` sob `joias-afetivas` · **probe REST próprio nesta sessão**: `GET /rest/v1/categories?select=slug` devolve exatamente esses 7 slugs · `brandScan` cobre `supabase/` | ✅ PASS ⚠️ 3 ocorrências deliberadas do vocabulário antigo (a **lista de slugs que o seed apaga**, `:62`/`:68`, e o comentário `:49-50`) — defensável: a migration `20260414121021` embute um seed antigo e roda a cada `db reset`; apagar por lista explícita evita levar junto produto cadastrado à mão |
| AC7 · `db reset` completa sem depender de tabela temporária | completa até o fim | `seed.sql` sem `pg_temp.*` nem `_pal` (defeito herdado, medido na T3/T9 e corrigido na T16) · `supabase db reset` exit **0** no gate `db` de 2026-08-08, com 7 categorias / 16 produtos / 24 variações | ✅ PASS (prova de execução) |

### P4 · A comunicação escrita é da Uma Estrelinha

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| AC1 · `store_name`, e-mail e título de SEO da Uma Estrelinha nos defaults do TS **e** no banco; migration condicionada, idempotente | os três valores nos dois lados | `shared/lib/__tests__/storeSettingsDefaults.test.ts:86-87` — `expect(DEFAULT_GENERAL.store_name).toBe('Uma Estrelinha')` **e** `expect(geralSql.store_name).toBe(DEFAULT_GENERAL.store_name)` (SQL lido do disco) · `:91` `contato@umaestrelinha.com.br` · `:96` `'Uma Estrelinha - Joias afetivas artesanais em resina'` · `:122` `expect(divergentes).toEqual([])` campo a campo nos 4 blocos · `:80` as duas migrations continuam idênticas · **probe REST próprio**: o banco devolve os três valores certos | ✅ PASS · a migration de correção deixou de ser necessária porque a `T22b` reescreveu os defaults na origem (`AD-017`) — o efeito exigido (banco correto, sem sobrescrever edição da admin) está provado |
| AC2 · timestamp de migration maior que todos | maior prefixo | `20260808200541_remove-mockups.sql` vs. topo anterior `20260803130200` — verificado por `ls` | ✅ PASS |
| AC3 · os dois `index.html` descrevem a Uma Estrelinha; `og:image` é ativo do projeto | nunca o CDN herdado | `brandAssets.test.ts:213` `expect(INDEX).toMatch(/<title>Uma Estrelinha[^<]*<\/title>/)` · `:221-227` título e descrição iguais em documento, OG e Twitter · `:235-236` `expect(og).not.toContain('gpt-engineer')` e `not.toContain('storage.googleapis.com')` · `:239` `expect(og).toMatch(/^https:\/\/umaestrelinha\.com\.br\//)` · `:243` o arquivo existe no disco · `:250-255` 1200×630 declarado **e** lido do IHDR · `:266` `theme-color` é um token **declarado no App.css** · `:270-271` backoffice com título novo e `noindex, nofollow` | ✅ PASS |
| AC4 · os três templates de auth vestem a identidade nova, tudo inline, `<table>`, **sem webfont** | inline + table + zero webfont | Sem asserção automatizada. **Verificação própria nesta sessão** sobre `supabase/templates/{magic_link,confirmation,recovery}.html`: `{{ .Token }}` presente nos três (1/1/2) · **0** ocorrências de `@font-face`/`fonts.googleapis`/`<link>` · 3/4/3 elementos `<table>` · **0** ocorrências de `nanita\|nanapin\|nana` · "Uma Estrelinha" presente nos três · prova de ponta a ponta no Mailpit registrada em `tasks.md` (200 + `verifyOtp` com sessão nos 3 fluxos) | ✅ PASS ⚠️ evidência manual, não asserção (gap 4) |
| AC5 · remetente nu, domínio verificado **antes** da troca | troca não acontece sem verificação | `config.toml:249-256` (bloco pendente, endereço nu + `sender_name`), `:228-238` (passo de troca + `curl`), `:93-96` (Inbucket ligado). Ver julgamento cético acima. | ✅ PASS |
| AC6 · `RESEND_FROM` RFC 5322 e **distinto** do remetente do auth | dois endereços, um domínio | `supabase/functions/send-email/__tests__/templates.test.ts:336-338` aceita `Uma Estrelinha <loja@send.umaestrelinha.com.br>` e `:345-350` recusa 5 formas malformadas · `handlers.test.ts:263`/`:388` `expect(sent.from).toBe('Uma Estrelinha <onboarding@resend.dev>')` (o **valor** emitido, não só a chamada) · `:490` env malformada é recusada · distinção: `loja@` (env `RESEND_FROM`) vs. `acesso@` (`admin_email` do `config.toml`), com o motivo em `config.toml:242-247` e `.env.example:24-25` | ✅ PASS |
| AC7 · Sobre apresenta Adri Muniz, joalheira em Porto Alegre; nenhuma persona anterior no 404, estados vazios e newsletter | os dois nomes + zero persona | `pages/__tests__/copyInstitucional.test.tsx:33-34` `expect(screen.getByText('Adri Muniz')).toBeInTheDocument()` e `/Porto Alegre/` · `:41-42` `cinzas` e `à mão` · `:53-54` `expect(texto).not.toMatch(PRODUTO_ANTERIOR)` e `not.toMatch(FESTIVO)` na Sobre, `:63-64` no 404, `:88` nas Políticas · `NewsletterBanner.test.tsx:52` `Quer saber das novidades?` (o "clube da Nana" saiu) · `Footer.test.tsx` reescrito | ✅ PASS |
| AC8 · WhatsApp cita o `store_name` de `store_settings`, fallback `Uma Estrelinha` | valor lido + fallback | `widgets/whatsapp-float/ui/__tests__/WhatsAppFloat.test.tsx:44` `expect(decodeURIComponent(link.getAttribute('href')!)).toContain('Uma Estrelinha Joias')` (o valor cadastrado, na **mensagem**) · `:56` fallback `Uma Estrelinha` · `:68` `whatsapp_message` cadastrada vence · `:75` sem WhatsApp o widget não renderiza · `:83` sem vocabulário anterior | ✅ PASS |

### P5 · A documentação do repositório descreve o produto certo

| Critério | Resultado que a spec define | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| AC1 · `CLAUDE.md` descreve a Uma Estrelinha, a paleta nova e `@estrelinha/*`; a regra que proibia renomear `nanapin` é substituída pelo **porquê** | escopo, paleta e revogação | `CLAUDE.md:16-20` registra a conversão e aponta `AD-016` e o arquivo · `:35-44` layout com `@estrelinha/*` e portas 8082/8083 · `:74` `project_id = "uma-estrelinha-store"` · `:118-121` aliases · `:143` tokens `--estrelinha-*` | ✅ PASS |
| AC2 · `DESIGN.md` documenta a paleta medida, o papel de cada token e as proibições | ratio por token + proibições | `DESIGN.md:48` `field #8C8073 3,63 ✓` · `:54` `accent 2,66 ✗ — Nunca texto sobre claro` · `:64` `accent sobre ink 4,78 — o único uso de texto` · `:69` `primary-strong sobre accent 4,15 ✗` · `:71-88` as três proibições, com o caso real de `ink` com opacidade sobre `accent` medido (4,78 → 3,50 a 80% → 1,95 a 45%) | ✅ PASS |
| AC3 · specs, `docs/qa/` e `.lovable/` arquivados em `.specs/archive/nanita/`; `AD-001..AD-015` permanecem no `STATE.md` | arquivo preservado + decisões intactas | `.specs/archive/nanita/` contém `features/`, `qa/`, `project/`, `brand/`, `DEPLOY.md`, `README.md` · `.specs/STATE.md` traz `AD-001`..`AD-017` (16 e 17 novas) · **assertado**: `brandScan.test.ts:159-160` — `expect(existsSync(join(ROOT, ARQUIVO_DA_NANITA, 'README.md'))).toBe(true)` **e** `expect(arquivosVarridos.filter(f=>rel(f).startsWith('.specs/'))).toEqual([])` (as duas metades juntas) | ✅ PASS |
| AC4 · baselines citadas são as medidas ao fim desta feature | números remedidos | `CLAUDE.md:398` `30 erros / 8 warnings` · `:410` `store 0 · backoffice 0` · `:411` `3188 testes em 185 arquivos`. **Os três batem com a minha medição independente.** | ✅ PASS |

**Status**: **36/36 ACs com evidência localizada.** 2 marcados ⚠️ *spec-precision* (P2 AC7 — desvio
medido e travado; P2 AC9 — "seguir a board" não é resultado numérico). Nenhum ❌.

---

## Edge Cases da spec

- [x] **Escopo renomeado sem lockfile regerado → `pnpm install` falha visivelmente.** `pnpm-lock.yaml` tem **0** ocorrências de `nanapin`; foi regerado (T8). `tsc` = 0 é o oráculo de que nada resolve para pacote fantasma.
- [x] **Classe Tailwind antiga sobrevive → a varredura pega.** `brandScan.test.ts:170`, mutante 5: `apps/store/src/shared/lib/storeChrome.ts:1  // nanita-jam`.
- [x] **Token certo num arquivo, errado no outro → paridade falha nomeando token e os dois valores.** Mutante 1: `expected 'primary=#34495E' to be 'primary=#34495F'`.
- [x] **Varredura apontada para caminho inexistente → falha por âncora, nunca passa.** Mutante 8: `ENOENT: no such file or directory, scandir '…\nao-existe\apps'`, `Test Files 1 failed`, `Tests: no tests`. Não há caminho por onde passar.
- [x] **Migration de remoção rodada duas vezes → segunda completa sem erro.** `if exists` em tudo; execução dupla registrada na T13.
- [x] **Imports de CSS invertidos → o teste de ordem falha.** Mutante 7 matou.
- [x] **Domínio não verificado → troca pendente e documentada, local no Mailpit.** Ver julgamento acima.

---

## Sensor de Discriminação

Profundidade **P0-full** (≥5 exigidos; **11 executados**). Cada mutação foi aplicada, o teste-alvo
rodado, e a árvore restaurada com `git checkout` + `git status --porcelain` vazio confirmado a cada
passo. **A árvore real nunca ficou modificada ao fim de nenhum passo.**

| # | Mutação | `file:line` | O que a falha disse | Killed? |
| --- | --- | --- | --- | --- |
| 1 | Hex trocado no `App.css` **sem** trocar no Tailwind (`--estrelinha-primary: #34495e → #34495f`) | `apps/store/src/app/App.css:46` | 2 testes: `expected 'primary=#34495E' to be 'primary=#34495F'` — nomeia o token e os dois valores | ✅ Killed |
| 2 | `<Input>` do checkout devolvido a `border-estrelinha-line` | `features/checkout/ui/ContactBlock.tsx:128` | `features/checkout/ui/ContactBlock.tsx:123 <Input>` — pega a **tag maiúscula**, o furo que a 19 tinha | ✅ Killed |
| 3 | `text-estrelinha-accent` num arquivo fora da lista curta | `pages/AboutPage.tsx:13` | `accentText.test.ts:82` — `expect(fora).toEqual([])` com o arquivo listado | ✅ Killed |
| 4 | `text-estrelinha-ink/45` dentro de superfície `bg-estrelinha-accent` | `features/checkout/ui/OrderBump.tsx:82` | `accentText.test.ts:122` — o defeito de opacidade que nenhum token acusaria | ✅ Killed |
| 5 | String `nanita` inserida num fonte qualquer | `shared/lib/storeChrome.ts:1` | `apps/store/src/shared/lib/storeChrome.ts:1  // nanita-jam` — **arquivo e linha** | ✅ Killed |
| 6 | Largura da marca do header 202 → 150 | `widgets/header/ui/Header.tsx:133` | `Header.test.tsx` — "a marca do topo é UMA só, a assinatura, e igual no celular e no desktop" falha no atributo `width` | ✅ Killed |
| 7 | Ordem dos dois imports de CSS invertida | `apps/store/src/main.tsx:5-6` | `importOrder.test.ts` — "`app/App.css` vem DEPOIS de `@estrelinha/ui/styles.css`" | ✅ Killed |
| 8 | `ROOT` da varredura apontado para caminho inexistente | `shared/lib/__tests__/brandScan.test.ts:35` | `ENOENT … scandir '…\nao-existe\apps'` · `Tests: no tests` — a âncora torna impossível passar por ter varrido zero | ✅ Killed |
| 9 | **`--estrelinha-ink-soft` `#54616B` → `#B0B8BE` nos TRÊS lugares declarados** (App.css, tailwind.config.ts, `PALETA` do `palette.test.ts`) | `App.css:44`, `tailwind.config.ts:57`, `palette.test.ts:33` | **NADA.** `palette.test.ts` + `contrast.test.ts` + `fieldBorder.test.ts` = **83/83 passed**. O token de texto secundário — "o piso" — caiu para **1,90:1** sobre `ground` (medido) e nenhum guarda viu | ❌ **Survived** |
| 10 | `DEFAULT_GENERAL.store_name` alterado só no TypeScript | `packages/supabase/src/types/settings.ts:55` | 2 testes: `Expected "Uma Estrelinha" / Received "Estrelinha Store"` + a comparação campo a campo SQL↔TS | ✅ Killed |
| 11 | Link interno reintroduzido para a rota removida | `widgets/footer/ui/Footer.tsx` | `routes.test.ts` — `Footer.tsx:136 — <FooterLink to="/crie-seu-botton">…` e `:142` | ✅ Killed |

**Resultado: 10/11 mortos.**

---

## Gate Check

| Gate | Comando | Resultado |
| --- | --- | --- |
| **full** | `pnpm test` (exit code capturado, sem pipe) | **exit 0** — `3188 testes em 185 arquivos`: loja 1150/90 · backoffice 1055/65 · core 725/26 · functions 258/4 |
| **build** | `npx tsc --noEmit -p apps/{store,backoffice}/tsconfig.app.json` | **0 · 0** |
| **build** | `pnpm lint` | exit 1 — backoffice `28 errors, 7 warnings` · store `2 errors, 1 warning` = **30 err / 8 warn**. Baseline herdada é 30/9 ⇒ **sem erro novo**, e 1 warning a menos. |
| **db** | `supabase db reset` + probe HTTP | Executado em 2026-08-08 (registro). **Reprovado independentemente nesta sessão** por probe REST anônimo em `127.0.0.1:54341`: `store_settings` com os 3 valores da Uma Estrelinha; `categories` com os 7 slugs de joia afetiva. |

**Integridade da suíte**: baseline de entrada 3098/180 → **3188/185** (+90 testes, +5 arquivos).
Os −73 do lote 2 são inteiramente os 7 arquivos de teste que saíram junto com seus módulos apagados;
**nenhum teste de código que permanece encolheu**. As asserções que mudaram de valor esperado
(`productFacts`, `navItems`, `MobileMenu`, `Header`, `NanaMascot`) mudaram porque o requisito
inverteu — várias ficaram **mais estritas** (`toContain` → `toEqual` da lista inteira).
`@estrelinha/core` fechou em **725/26**, idêntico à entrada: nenhum resultado de dinheiro mudou.

**Testes pulados**: nenhum.
**Flake conhecido**: RTL do backoffice sob carga (registrado no lote 4). Não reproduziu nesta sessão —
a corrida completa saiu verde de primeira, com o exit code capturado sem pipe.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Nada além do pedido | ✅ — as três expansões de escopo (`SearchDropdown`, `CartButton`, `App.css` na T28) estão registradas com o motivo, e cada uma resolve um defeito que a task deixaria em pé |
| Sem abstração para uso único | ✅ — `touchTarget` nasceu com **dois** auxiliares porque há dois casos reais medidos, não por generalidade |
| Sem "flexibilidade" desnecessária | ✅ — a chave custom `button` do raio foi **removida** com a medição que provou que o conflito acabou (`palette.test.ts:112` guarda que ela não volta) |
| Só arquivos necessários | ✅ |
| Não "melhorou" código alheio | ✅ — `packages/core/payment/**` intocado (725/26 idêntico) |
| Segue os padrões existentes | ✅ — os quatro guardas herdam a forma da 19 (ler do disco + âncora), e os dois novos (`accentText`, `touchTarget`) adotam a **âncora dupla** que a lição da `fieldBorder` produziu |
| Aprovado por engenheiro sênior | ✅ |
| Testes mapeiam ACs e não são rasos | ✅ — spot-check em P2: `contrast.test.ts` usa veredito em string para a falha nomear token e razão, em vez de `toBeGreaterThanOrEqual` cru; `fieldBorder` recorta o elemento em vez de usar janela fixa de N linhas, para não acusar o inocente |
| Valor asserido = valor da spec | ✅ nos 34; ⚠️ 2 spec-precision (P2 AC7, P2 AC9) |
| Expectativa de cobertura por camada | ✅ domínio 1:1; guardas com âncora; ⚠️ `config.toml`/templates/seed são camada "none + prova de execução" pela própria matriz (`AD-012`) |
| Nenhum teste órfão | ✅ — todo arquivo novo aponta requisito no cabeçalho (`REN-05`, `IDN-02`, `IDN-03`, `IDN-04`, `IDN-10`, `COP-01`, `COP-03`, `COP-07`, `COP-08`, `PIN-04`, `PIN-05`, `PIN-07`) |
| Diretrizes documentadas seguidas | ✅ — `CLAUDE.md` (mobile-first, dois temas, marca), `.specs/STATE.md` `AD-001..AD-017`, `DESIGN.md` |

---

## Gaps ranqueados

### Gap 1 — Major · `contrast.test.ts` mede uma cópia da paleta, não a paleta declarada

- **Onde**: `apps/store/src/shared/lib/__tests__/contrast.test.ts:21-36` (`const P = {…}`). O mesmo
  padrão em `fieldBorder.test.ts:133` (`const FIELD = '#8C8073'`) e `:48` (`PROIBIDAS` com as razões
  escritas à mão), e em `accentText.test.ts`, que raciocina sobre valores de `accent` que nunca lê.
- **Evidência**: mutante 9. Trocando `--estrelinha-ink-soft` de `#54616B` para `#B0B8BE` nos **três**
  lugares declarados — `App.css:44`, `tailwind.config.ts:57` e a tabela canônica `PALETA` de
  `palette.test.ts:33` — os três guardas de identidade seguiram **83/83 verdes**. Medido:
  `#B0B8BE` sobre `ground` = **1,90:1**, contra o piso de 4,5:1 que a AC P2.2 exige e os 6,00:1 que a
  spec chama de "o piso".
- **Por que importa**: a `design.md` D3 é explícita — *"Todos leem arquivo do **disco** — nenhum
  confia em import, porque o que se está provando é o conteúdo do fonte"*. Três dos quatro guardas
  cumprem; `contrast.test.ts` é a exceção. É a mesma armadilha de "dois arquivos que precisam
  concordar" que a feature inteira existe para fechar, aplicada às constantes do próprio guarda.
- **Quando bite**: só numa mudança **deliberada** de paleta — evento que este repositório já viveu
  duas vezes (v1 → v2 papelaria → Uma Estrelinha). Hoje os valores estão corretos e
  `palette.test.ts:74-80` os pina contra a tabela canônica, então **não há defeito em produção**.
- **Fix sugerido**: derivar `P` (e `FIELD`/`PROIBIDAS`) da leitura de `App.css` que `palette.test.ts`
  já faz — extrair `cssTokens()` para `shared/lib/paletteFromSource.ts` e ambos os guardas
  consumirem. Uma fonte, três leitores.
- **Prioridade**: Major (latente, silencioso, alto raio de alcance).

### Gap 2 — Minor · a família tipográfica também vive em dois arquivos, sem teste de paridade

- **Onde**: `apps/store/tailwind.config.ts:37-39` (`display/heading/body`) e
  `apps/store/src/app/App.css:139` (`"Libre Baskerville", Georgia, serif`) e `:156`
  (`"Outfit", system-ui, sans-serif`).
- **Por que importa**: é exatamente o defeito que a T28 **descobriu** (`tasks.md`: *"mudar só os dois
  arquivos listados deixaria a loja pedindo Libre Baskerville na rede e renderizando Fredoka na
  tela"*). Os valores foram corrigidos; a **paridade não foi travada**. `brandAssets.test.ts` cobre o
  `<link>` do `index.html`, não o `App.css`.
- **Fix sugerido**: acrescentar a `palette.test.ts` (ou a um `typography.test.ts`) a comparação
  `fontFamily` do Tailwind × `font-family` literal do `App.css`, com âncora.
- **Prioridade**: Minor.

### Gap 3 — Minor · os hexes do painel não estão travados por teste

- **Onde**: `packages/ui/src/styles.css`, `packages/ui/tailwind.preset.ts`. A AC P1.4 exige
  **valores inalterados**, e a prova hoje é o diff contra `12c8ab7` (que eu rodei e confirmei:
  a única diferença são 3 comentários). Nada na suíte impede que um hex do painel mude amanhã.
- **Atenuante**: o backoffice está fora do escopo de re-skin (`C-05`) e `importOrder.test.ts` garante
  que o tema da loja não vaza para lá.
- **Prioridade**: Minor.

### Gap 4 — Minor · `COP-04` (templates de auth) não tem asserção automatizada

- **Onde**: `supabase/templates/{magic_link,confirmation,recovery}.html`. Verifiquei manualmente
  nesta sessão (todos com `{{ .Token }}`, zero webfont, layout em `<table>`, zero marca anterior) e a
  prova de ponta a ponta no Mailpit está registrada. Mas nada no CI impede uma regressão — um
  `<link>` de webfont acrescentado amanhã passa em todos os gates.
- **Nota**: a matriz de cobertura declara esta camada como `none + prova manual`, então é uma decisão
  registrada, não um esquecimento. Ainda assim, um teste que leia os três HTMLs do disco (mesmo molde
  de `templates.test.ts:71-76`, que já faz isso para os transacionais) custaria pouco.
- **Prioridade**: Minor.

### Gap 5 — Minor · "sem scroll horizontal em 390px" é evidência manual

- **Onde**: AC P2.10. A auditoria Playwright cobriu 10 rotas com `scrollWidth − clientWidth = 0`, mas
  o resultado não vira asserção — só registro em `tasks.md`. Os outros três fatos da mesma AC (alvo de
  toque, recolhimento do header, barra única) **estão** travados por teste.
- **Prioridade**: Minor (jsdom não mede layout; um guarda real exigiria Playwright no CI).

### Gap 6 — Cosmético · vocabulário do domínio anterior em fixtures de teste

- **Onde**: `shared/lib/__tests__/storeChrome.test.ts:6` (`'/produto/botton-gojo-satoru'`),
  `features/search/ui/__tests__/SearchOverlay.test.tsx:78,112` e
  `features/search/model/__tests__/recentSearches.test.ts:11` (`naruto`, `gojo satoru`),
  `widgets/header/ui/MegaMenu.tsx:12` (comentário citando o board da era anterior).
- **Não é violação de AC**: a AC P1.1 é escopada a `nanapin|nanita|nana`, e a `brandScan` está limpa.
  A T38 registrou exatamente esta lacuna (*"ela procura **nome**, e o que sobrava era
  **vocabulário**"*) e cobriu as superfícies **visíveis** com `copyInstitucional.test.tsx` e
  `WhatsAppFloat.test.tsx`. O que sobra é fixture, invisível para a cliente.
- **Prioridade**: Cosmético.

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| INF-01, INF-02, INF-03 | Pending | ✅ Verified |
| REN-01, REN-02, REN-03, REN-05 | Pending | ✅ Verified |
| REN-04 | Pending | ✅ Verified (por diff; ver gap 3) |
| IDN-01, IDN-03, IDN-04, IDN-05, IDN-06, IDN-08, IDN-11 | Pending | ✅ Verified |
| IDN-02 | Pending | ✅ Verified ⚠️ **gap 1** — a medição não lê a paleta declarada |
| IDN-07 | Pending | ✅ Verified ⚠️ desvio medido e travado (símbolo reduzido ≠ selo circular) |
| IDN-09 | Pending | ✅ Verified ⚠️ spec-precision (7 divergências de board registradas) |
| IDN-10 | Pending | ✅ Verified ⚠️ 1 dos 4 fatos por evidência manual (gap 5) |
| PIN-01, PIN-02, PIN-03, PIN-04, PIN-05, PIN-06, PIN-07 | Pending | ✅ Verified |
| COP-01, COP-02, COP-03, COP-05, COP-06, COP-07, COP-08 | Pending | ✅ Verified |
| COP-04 | Pending | ✅ Verified ⚠️ sem asserção automatizada (gap 4) |
| DOC-01, DOC-02, DOC-03, DOC-04 | Pending | ✅ Verified |

**38/38 requisitos verificados.**

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored check**: **36/36 ACs** com `file:line` + asserção localizada · 2 spec-precision gaps
sinalizados (P2 AC7, P2 AC9), nenhum silenciado.
**Sensor**: **10/11 mutantes mortos** (profundidade P0-full).
**Gate**: `pnpm test` exit **0** (3188/185) · `tsc` **0 · 0** · `lint` **30 err / 8 warn** contra a
baseline de 30/9 ⇒ sem erro novo · `db reset` + probe REST reproduzido nesta sessão.

**O que funciona.** O rename barulhento fechou com o compilador como juiz (zero `@nanapin`, lockfile
regerado, `tsc` = 0). O rename silencioso — o de fato arriscado — ganhou os juízes que não tinha:
`brandScan` fecha em zero com a lista `PENDENTE` vazia e autodestrutiva; `palette` compara os dois
arquivos do disco; `fieldBorder` fechou o furo de tag maiúscula que custou 16 campos na feature 19;
`accentText` nasceu do defeito que nenhum token acusava (`ink` com opacidade sobre `accent`);
`touchTarget` adotou a lição da âncora dupla. Oito das onze mutações que injetei atacam classes de
defeito **invisíveis** — cor, ícone, ordem de import, largura de marca — e dez morreram nomeando
arquivo e linha. O domínio botton saiu inteiro, com a migration de remoção idempotente provada por
execução. A comunicação escrita fechou nos dois streams de e-mail, com o remetente do auth pendente
pelo motivo certo. `@estrelinha/core` fechou em 725/26, idêntico à entrada — nenhum resultado de
dinheiro se moveu.

**O que corrigir.** Um só item de peso: `contrast.test.ts` mede uma cópia da paleta em vez da paleta
declarada, e por isso um token de texto pode cair de 6,00:1 para 1,90:1 com a suíte verde. É a única
brecha estrutural que o sensor achou, e ela é a exceção — três dos quatro guardas já leem do disco.

**Próximo passo**: rotear o **gap 1** como fix task (derivar `P`/`FIELD` da leitura do `App.css`);
os gaps 2–6 são candidatos ao `BACKLOG.md`, não bloqueiam o fecho da feature 20.
