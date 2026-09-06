# Menu configurável (39) — relatório de verificação

> **Duas iterações, dois Verifiers independentes, e este arquivo carrega as duas.** A iteração 1
> (abaixo, íntegra) devolveu **FAIL ❌** com 6 lacunas; o commit `c413ce2` disse ter fechado quatro
> delas; a **iteração 2** (seção própria, depois do veredito da 1) reinjetou cada mutação por conta e
> mediu o gate de novo. **Veredito atual: PASS ✅, com dois riscos de entrega declarados.**
>
> **Nada da iteração 1 foi apagado nem reescrito** — é o registro de que o processo pegou o que
> pegou, e a régua da 2 é justamente comparar contra ele.

---

## Iteração 1 — 2026-09-05 · HEAD `3f1b6ba` · **FAIL ❌**

> **Verifier independente.** Quem escreve isto não escreveu o código e não usou o relato de quem
> escreveu como evidência: cada AC abaixo foi ancorada em `arquivo:linha` lido do disco, cada número
> de gate foi **medido nesta sessão**, e os pontos de maior risco foram exercidos por **injeção de
> falha em estado descartável**, desfeita depois (`git status` limpo no fecho).
>
> **Veredito: FAIL ❌** — não por defeito de comportamento encontrado na loja, mas por **três lacunas
> de cobertura**, uma delas com **mutante sobrevivente na migration** cuja consequência cai em
> produção, no celular, e não quebra nada. Detalhe em *Lacunas*.
>
> A seção `## Probes (T7)` e os sensores `T9/T10/T11` abaixo são **evidência crua do implementador**,
> preservadas na íntegra: foram conferidas por leitura, não reexecutadas (o probe fala com o banco
> local, e reexecutá-lo mexeria no catálogo real importado).

**Data**: 2026-09-05 · **Base**: `146561e` · **HEAD**: `3f1b6ba` · **Branch**: `feat/39-menu-configuravel`
· **Worktree**: `C:\Projetos\uma-estrelinha\store-39-menu`

---

## 1. Gate — medido por mim, um workspace por vez, exit code capturado

| Medida | Reportado pelo autor | **Medido por mim** | Veredito |
| --- | --- | --- | --- |
| core | 1691 / 67 | **1691 / 67** · `exit=0` | ✅ bate |
| store | 2182 / 144 | **2182 / 144** · `exit=0` | ✅ bate |
| backoffice | 1891 / 115 | **1891 / 115** · `exit=0` | ✅ bate |
| functions | 350 / 7 | **350 / 7** · `exit=0` | ✅ bate |
| catalog-import | 509 / 23 | **509 / 23** · `exit=0` | ✅ bate |
| **total** | 6623 / 356 | **6623 / 356** | ✅ |
| Lint | 27 erros / 5 warnings | **27 / 5** — store 2/1 · backoffice 25/4 | ✅ bate |
| Tipos | 0 · 0 | **0 · 0 · 0** (store · backoffice · catalog-import) | ✅ bate |
| `pnpm build` | verde | `exit=0` — **`FULL TURBO`, 2 de 2 em cache** | ⚠️ ver nota |

- **Nenhuma baseline regrediu**, e nenhum número do autor precisou ser corrigido. Cada workspace
  rodou isolado, com `echo "exit=$?"` fora de pipe.
- **`packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` seguem intocados** —
  conferido por `git diff --name-only 146561e..3f1b6ba -- <os dois caminhos>`, que devolve **vazio**.
  O diff inteiro são **152 arquivos**.
- **Nota sobre o build**: ele saiu do cache do Turbo (`2 cached, 2 total`), então o que ficou provado
  é que *nada mudou desde um build verde anterior nesta árvore*, não uma compilação nova executada por
  mim. O sinal forte de compilação é o `tsc --noEmit` dos três projetos, que rodei do zero.

---

## 2. Verificação ancorada na spec — 48 ACs

**Régua**: existir asserção não basta; o **valor asserido** tem de bater com o resultado que a AC
define. Onde ele não bate, ou onde a AC tem duas metades e só uma está asserida, marco a metade
faltante — nunca "provavelmente coberta".

**Resultado: 43 de 48 com valor asserido batendo · 5 parciais · 0 sem evidência nenhuma.**

### 2.1 As que fecham (43)

Cada uma com asserção de valor que bate a AC. Amostra do ancoramento (a lista completa foi conferida
arquivo a arquivo):

| AC | Onde | O valor asserido |
| --- | --- | --- |
| NAV-01 | `apps/store/src/entities/category/api/__tests__/useMenu.test.tsx:65` | `expect(menu('desktop').items.map(i => i.name)).toEqual(['Personalizados'])` + `menu('mobile')…toEqual(['Correntes'])` |
| NAV-02 | `apps/backoffice/src/pages/admin/AdminMenuPage.test.tsx:267` | `expect(screen.getByTestId('aviso-personalizados')).toHaveTextContent('desligada no celular')` |
| NAV-03 | `packages/core/src/menu/__tests__/menuItems.test.ts:143` | `expect(menuItems({ categories: vinte }, 'desktop')).toHaveLength(20)`; e na tela, `AdminMenuPage.test.tsx:239` → `'21 itens'` + `expect(toast).not.toHaveBeenCalled()` |
| NAV-05 | `AdminMenuPage.test.tsx:215` | `toHaveTextContent('5 itens')` **e** `not.toHaveTextContent('vaga')` |
| NAV-06 | `menuItems.test.ts:100` | `expect(barra).toEqual(['Joias','Coleção Afetivas'])` + `joias.children…toEqual(['Correntes','Pingentes'])` |
| NAV-07 | `menuItems.test.ts:167` · `AdminMenuPage.test.tsx:326` | some das duas superfícies **e** `toHaveTextContent('não aparece na loja')` |
| NAV-09 | `MenuLinkDialog.test.tsx:50` | igualdade **exata** do payload: `{label, href, icon:'envio', desktop:true, mobile:false}` |
| NAV-10 | `packages/core/src/menu/__tests__/target.test.ts:131` | `expect(recusadas).toEqual([])` sobre **toda** `ROUTE_SLUGS`, com âncora `ROUTE_SLUGS.length >= 10`; e `useMenuLinks.test.ts:168` prova que `db.upsert` **não** foi chamado |
| NAV-11 | `MegaMenu.test.tsx:286` · `MobileMenu.test.tsx:241` | `target="_blank"` **e** `rel="noopener noreferrer"` nas duas superfícies |
| NAV-12 | `menuItems.test.ts:279` | `expect(item).not.toHaveProperty('children')` / `not.toHaveProperty('hasPanel')` |
| NAV-14 | `menuItems.test.ts:241` | `toEqual(['Ajuda','Joias','Coleção Afetivas','Sobre'])` — categorias e links **fundidos** numa ordem só |
| NAV-19 | `packages/core/src/menu/__tests__/icons.test.ts:64` | 11 casos inválidos → `expect(menuIconKey(raw)).toBeNull()` |
| NAV-21 | `apps/store/src/shared/lib/__tests__/menuIconCatalog.test.ts:127` | `expect(MENU_ICON_COMPONENTS).toBe(ESTRELINHA_ICONS)` — **identidade de objeto**, não igualdade |
| NAV-24 | `panelColumns.test.ts:29` | `it.each` com `[9,[8,1]]`, `[17,[8,8,1]]`, `[25,[8,8,8,1]]` |
| NAV-26 | `MegaMenu.test.tsx:110` | `getByRole('link',{name:'ver tudo em Coleção Afetivas'})` → `href = '/afetivas'` |
| NAV-28/29 | `banners.test.ts:272` · `MenuBannerEditor.test.tsx:83` | `toHaveLength(MENU_BANNER_LIMIT)` e `toHaveTextContent('comporta 2 banners')` |
| NAV-30 | `banners.test.ts:58,65,78` | destino apagado / inativo / não provado → `toEqual([])` |
| NAV-31 | `target.test.ts:236` | `expect(resolvido).toBe(!recusado)` sobre 6 endereços — **a igualdade das duas portas é a asserção** |
| NAV-32 | `banners.test.ts:143,149,242` | herança de nome/descrição, e `image:null` + `title:'Coleção Afetivas'` sem quadro vazio |
| NAV-34 | `banners.test.ts:226` | `toMatchObject({ image:'/desktop.jpg', imageReused:true })` |
| NAV-36 | `MobileMenu.test.tsx:349,403` | banner só existe com o acordeão aberto **e** `queryByTestId('mobile-menu-promo')` é `null` |
| NAV-43 | `previaUnica.test.ts:157,177,199` | `MenuBarPreview.tsx` não existe; a única prévia é `MenuLivePreview.tsx`; o painel não chama `menuPanelColumns`/`resolveMenuBanners` |
| NAV-44 | `MenuLivePreview.test.tsx:165` | `draft.categories` **e** `draft.links` por valor, `targetOrigin === 'http://localhost:8082'`, e `every(alvo => alvo !== '*')` |
| NAV-47 | `MenuLivePreview.test.tsx:231,245,259` | origem estranha, janela estranha e carimbo da home → `expect(postMessage).not.toHaveBeenCalled()` |
| NAV-48 | `MenuIconPicker.test.tsx:71,80` | caixa e acento dobrados; busca casa **rótulo e chave** |

*(As demais — NAV-13, 15, 16, 17, 18, 22, 25, 27, 33, 35, 37, 40, 41, 46 — foram igualmente
ancoradas; ver as ressalvas de precisão em 2.2 para as que têm meia-metade fraca.)*

### 2.2 As cinco parciais

| AC | O que está provado | **O que não está** |
| --- | --- | --- |
| **NAV-04** | A **forma**: `Header.test.tsx:197` (`overflow-x-auto`), `:201` (`not.toContain('flex-wrap')`), `:208` (a faixa não é posicionada — é o que impede o painel de ser clipado), `MegaMenu.test.tsx:408` (`min-w-max`) | A **medida**. Não existe uma asserção de `scrollWidth`, de largura de viewport ou de rolagem do `body` em `apps/store/**` — busquei por `scrollWidth` no repositório inteiro e o único acerto é um **comentário** em `ProductPage.test.tsx:245`, de outra feature. "sem esconder item" e "o `body` nunca rola" continuam **sem prova**, e jsdom não pode dá-la |
| **NAV-08** | Backfill 1 asserido literalmente (`menuSchema.test.ts:257`); ordem antes do `drop`; guarda `attgenerated`; `on conflict do nothing`; o "Sobre" semeado com `desktop:true`/`mobile:true` | **O "nos dois" do backfill 2 não é asserido** — o guarda confere só os predicados (`c.parent_id = p.id`, `p.show_in_menu`, `c.active`). **Mutante sobrevivente**, ver 3.2. E "a loja renderiza igual antes e depois" não tem teste de antes/depois nem probe que compare os dois estados |
| **NAV-20** | Metade 1: `MegaMenu.test.tsx:244` → `expect(svg.getAttribute('class')).toContain('text-estrelinha-accent')` | Metade 2 — "**o rótulo SHALL continuar em `on-primary`**" — **não tem asserção nenhuma**. **Mutante sobrevivente**, ver 3.2. Ressalva de precisão adicional: `toContain('text-estrelinha-accent')` casa também `text-estrelinha-accent-strong`, que é justamente o token que a AC opõe |
| **NAV-23** | Metade 1: `menuItems.test.ts:108` → filha desmarcada não entra no painel | Metade 2 — "**a tela SHALL dizer isso em texto**" — **não tem teste**. O literal existe em `MenuPanelEditor.tsx:61-62`, e **`MenuPanelEditor.test.tsx` não existe** (conferido: o diretório `ui/` tem teste para `MenuBannerEditor`, `MenuIconPicker`, `MenuLinkDialog` e `MenuLivePreview`, e para mais nenhum). Grep do literal em todo `*.test.ts(x)` de `apps/` e `packages/`: **zero acertos** |
| **NAV-45** | `MenuLivePreview.test.tsx:87` (`width=390`, `height=844`), `:94` (`style.transform` contém `scale(`, `transformOrigin === 'top left'`), `AdminMenuPage.test.tsx:311` (1024 → 390 ao trocar de aba) | O **fator de escala**: a asserção é `toContain('scale(')`, e sob jsdom (sem `ResizeObserver`) `previewScale` devolve 1 — o valor renderizado é sempre `scale(1)`. Nada mede layout, viewport computado, nem que a loja escolhe de fato as media queries do celular |

**Lacunas de precisão da spec** (a spec não define resultado exato, e por isso não aprovo nem reprovo):

- **NAV-39** diz "recusar **com o motivo**". O teste (`AdminMenuPage.test.tsx:362`) assere
  `toMatchObject({ variant: 'destructive' })` e `updateSortOrders` não chamado — **o texto do motivo
  não é asserido**. A spec não fixa o texto, então isto é lacuna de precisão da spec, não do teste.
- **NAV-41** diz "com botão de tentar de novo". O teste assere a faixa e a mensagem
  (`AdminMenuPage.test.tsx:380`), **não o botão** — que existe em `AdminMenuPage.tsx:89`. A AC nomeia
  o botão; a asserção não o alcança.
- **NAV-42** tem duas cláusulas. "diz o que não salvou" está asserido (`:418`, título exato). "**o
  estado da tela SHALL voltar ao que está no banco**" **não tem asserção** — estruturalmente o switch
  é controlado por props e `useAdminCategories.ts:127` só refaz a leitura `if (!error)`, mas ninguém
  mede a reversão.
- **NAV-46** — "SHALL continuar editável" é provado pela **frase renderizada**
  (`toHaveTextContent('continua editável')`), não por um caso que edite com a env ausente:
  `AdminMenuPage.test.tsx:129` fixa `STORE_URL` em todos os casos da página.

---

## 3. Sensor de discriminação — 8 mutações, 6 mortas, **2 sobreviventes**

Cada mutação é de **comportamento**, aplicada ao arquivo real, medida com a suíte relevante e
**desfeita** em seguida (`git status` limpo, conferido a cada passo).

### 3.1 As seis mortas

| # | Onde | A mutação | O que matou |
| --- | --- | --- | --- |
| 1 | `core/menu/menu.ts:412` — o **papel derivado da árvore** | tirar o recorte `&& !(c.parent_id && marcadas.has(c.parent_id))`: toda marcada vira entrada da barra | **3 falhas** em `menuItems.test.ts` — inclusive o caso do **ciclo** (`:372`), que é o que impede o header de travar |
| 2 | `core/menu/target.ts:141` — a **validação de destino** | `if (ROUTE_SLUGS.includes(primeiro))` → `if (primeiro !== '')`: qualquer caminho interno passa | **5 falhas**, e a distribuição é a prova de `NAV-31`: **4 em `target.test.ts`** (o item de link) **e 1 em `banners.test.ts`** (o banner). Uma régua só, dois consumidores — a AC do dono único é **discriminada**, não só declarada |
| 3 | `core/menu/banners.ts:93` — a **herança de arte** | `arte()` deixa de recuar para a outra superfície | **3 falhas** em `banners.test.ts` (`NAV-33`/`NAV-34`), inclusive "arte em branco lê como arte ausente" |
| 4a | migration `:165` — a **coluna gerada** | `generated always as (menu_desktop or menu_mobile) stored` → `not null default false` | **3 falhas** em `menuSchema.test.ts`, e **duas delas são os sensores embutidos** do próprio guarda: a régua reprova a coluna comum **e** reprova derivar de uma superfície só |
| 5 | `backoffice/…/useMenuPreviewBridge.ts:82` — a **régua de origem** | remover `if (event.origin !== origin) return`, deixando só a checagem de janela | **1 falha**: "ignora `ready` de OUTRA origem, mesmo vindo da janela do iframe". A dupla checagem é discriminada nas duas pontas |
| 8 | `core/menu/banners.ts:76` | `MENU_BANNER_LIMIT = 2` → `3` | **3 falhas**, incluindo a **âncora do número que a AC cita** |

### 3.2 Os dois sobreviventes — as lacunas que importam

**Mutante A — o backfill 2 da migration perde o celular, e nada reprova.**

```sql
-- injetado em supabase/migrations/20260905130000_39-menu-configuravel.sql:126
update public.categories c
   set menu_desktop = true          -- ← `menu_mobile = true` REMOVIDO
  from public.categories p
 where c.parent_id = p.id ...
```

`pnpm --filter @estrelinha/store test` → **144 arquivos, 2182 testes, todos passando.**

Por que passa: `menuSchema.test.ts:257` casa
`/set menu_desktop = true,\s*menu_mobile\s*=\s*true\s*where show_in_menu/i`, que termina em
`where show_in_menu` — a forma do **backfill 1**. O backfill 2 tem `from public.categories p` entre o
`set` e o `where`, então a régua não o alcança; o que sobra para ele são as asserções de **predicado**
(`menuSchema.test.ts:261`), que não olham as colunas do `set`.

Por que importa: com essa forma no disco, o `db push` deixaria **todas as filhas** com
`menu_mobile = false`. O papel é derivado (`marcada && pai marcado ⇒ painel`), logo **todo painel do
menu do celular nasceria vazio** — a superfície que responde por ~90% dos acessos —, enquanto o do
computador ficaria intacto. `NAV-08` ("a loja renderiza igual antes e depois") seria violada, e o modo
de falhar é o pior da casa: aplica limpo, não quebra teste nenhum, e quem descobre é a cliente.

*(Não é defeito no código entregue — a migration no disco está correta. É o **guarda** que não
discrimina, exatamente na asserção que a spec nomeia como `menuSchema.test.ts`.)*

**Mutante B — o rótulo do menu perde a cor, e nada reprova.**

```ts
// injetado em apps/store/src/widgets/header/ui/navItem.ts:24
// `text-estrelinha-on-primary` REMOVIDO de NAV_ITEM
```

`pnpm --filter @estrelinha/store test` → **144 arquivos, 2182 testes, todos passando.**

Confirma a lacuna de `NAV-20`: a metade "o rótulo continua em `on-primary`" não tem asserção. O
rótulo passaria a herdar cor sobre a faixa `primary` escura, e `contrast.test.ts` não pega — ele mede
**tokens**, não o uso de token neste arquivo; `accentText.test.ts` também não, porque mede quem pinta
ouro, e `navItem.ts` já está no allowlist dele. É a família de defeito que este repositório documenta
como a mais cara: identidade errada **não quebra nada**.

---

## 4. Os pontos que a auditoria pediu por nome

### 4.1 `NAV-04` e `NAV-45` — o que continua sem prova, com todas as letras

A prova por **forma** existe, é boa, e está nos lugares certos (2.2). O que **não** existe, e não
pode existir em jsdom:

- que a faixa do desktop de fato **rola** em vez de estourar — nada mede `scrollWidth` contra
  `clientWidth`;
- que o **`body` não rola na horizontal** em 390 com o menu cheio — a AC diz "nunca", e a asserção
  mais próxima é a ausência de `flex-wrap`;
- que a prévia do celular é **390 escalado** e não 390 encolhido — o `scale()` asserido é sempre
  `scale(1)` sob jsdom, então o que se prova é que existe um `transform`, não que a escala é
  calculada; e nada prova que a loja dentro do iframe escolhe as media queries de 390.

**Isso é UAT de navegador, em 390 e em 1440, e não foi feito.** Não é lacuna do implementador ter
declarado: a spec (`spec.md:381-384`) e o `tasks.md` declaram os dois. É lacuna de **execução**, e é a
mesma pendência que a `27` só fechou quando alguém abriu um navegador — e achou a página de produto
inteira rolando na horizontal com todos os testes verdes.

### 4.2 `resolveMenuBanners` trunca em 2 — a contrapartida **existe e é alcançável**

Conferido no código e por teste:

- o editor lê o jsonb **cru**, não o resolvido: `MenuBannerEditor.tsx:50` (`listaDe` → `menuBannerSlots`,
  sem corte) e `:67` (`gravados = listaDe(host.menu_banners, surface)`);
- ele **acusa**: `:188-201`, `data-testid="banners-excedentes"`, com o texto "3 banners gravados, 2
  cabem no painel";
- ele **renderiza o excedente** (`:220`, `const excedente = indice >= MENU_BANNER_LIMIT`, com moldura
  âmbar), então o terceiro é **deletável**;
- e os dois estão asseridos: `MenuBannerEditor.test.tsx:94` (`toHaveTextContent('3 banners gravados')`
  + `getByTestId('banner-2')` com o conteúdo do terceiro) e `:103` ("apagar o excedente e salvar grava
  exatamente dois", com `expect(gravado).toHaveLength(2)`).

**Contrapartida T25 cumprida.** A divergência com o princípio de `menuEntries` está declarada no
comentário de `banners.ts:107-110` e é defensável: lá o retorno honesto existia porque a tela do admin
era o único lugar onde a 5ª podia ser desligada; aqui o editor mostra as três.

**Ressalva de precisão encontrada de passagem** (não é AC, é dívida): o painel **reescreve** o
predicado de `arte()` em vez de lê-lo. `MenuBannerEditor.tsx:218-219` calcula
`arteDaSuperficie`/`arteDaOutra` por truthiness da string crua; `core/banners.ts:90-94` usa `texto()`,
que **apara espaço**. Um `image_mobile: "   "` chegado por SQL faria a loja reaproveitar a arte do
computador (`imageReused: true`) e a tela **não avisar**. A mutação 3 comprova a separação: com
`arte()` quebrado em `core`, **os 1891 testes do backoffice passaram**. É a forma do "defeito 01" em
miniatura — hoje as duas concordam no caso comum, e nada as obriga a continuar concordando.

### 4.3 As allowlists de dívida — **zeradas de verdade**

- **`show_in_menu` / `menu_promo` em `apps/**`**: `grep -rn` bruto devolve 79 acertos; li os 79.
  **Nenhum é código de produção** — são 6 comentários (`useAdminCategories.ts:26`,
  `BannerGridEditor.tsx:54`, `CollectionFeatureEditor.tsx:8`, `MenuSlotList.tsx:14`,
  `AdminMenuPage.tsx:3,12`, `useCategories.ts:15`) e o resto são fixtures de teste. O guarda
  (`menuSurfaceSingleOwner.test.ts`) tira comentário antes de varrer e exclui teste, então mede
  **zero**, corretamente.
- **Item de menu em JSX**: `menuSemItemFixo.test.ts:243` fecha a lista de destinos literais nas quatro
  superfícies a `/`, `/conta`, `/favoritos` (chrome), e `:255` assere `/sobre` ausente por nome.
- **O guarda reprovaria se voltassem** — não é inferência minha, os dois carregam **sensor por
  mutação embutido** que roda na suíte: `menuSurfaceSingleOwner.test.ts:249` prova que a régua pega
  `c.show_in_menu` e `category.menu_promo` num arquivo sintético da loja, e `:261` prova que ela
  **não** acusa a leitura legítima por superfície; `menuSemItemFixo.test.ts:279` pega o
  `<Link to="/sobre">` de volta no `Header`, `:294` pega `FIXED_ENTRIES`/`FIXED_MENU_ENTRIES` e
  `/crie-seu-botton`, e `:306` prova que destino **dinâmico** não é acusado.
- **Âncora dupla presente nos dois**: arquivos lidos (`varridos.length > 400`,
  `producao.length > 200`, os dois apps nomeados) **e** alvos encontrados
  (`menuSurfaceSingleOwner:168` exige `menuItems` achado ≥1; `menuSemItemFixo:129` exige que as
  **quatro** superfícies existam no disco, e `:148` que a régua de destino case ≥4).

### 4.4 A migration nunca foi exercida do zero — **risco de entrega**

O probe (T7, preservado abaixo) aplicou a migration **três vezes sobre o banco local com catálogo**,
com hash de estado antes/depois provando idempotência. **`supabase db reset` não foi rodado**, nem
por mim: rodá-lo apagaria o catálogo real importado da máquina de quem desenvolve, e o `seed.sql` não
o repõe desde a feature 21.

O que verifiquei por leitura, e que **reduz** o risco sem eliminá-lo:

- nenhuma view, policy ou índice fora da própria migration depende de `show_in_menu` (grep em
  `supabase/**`): os únicos acertos são a migration da `16`, um comentário na da
  `20260803130000_promotions-progressive.sql` e o `select` da function do sitemap;
- **`seed.sql` não escreve `show_in_menu`**, então o seed pós-reset não bate na coluna gerada;
- no reset, a `16` roda antes e cria a coluna comum, então a guarda `attgenerated = ''` abre e o bloco
  converte — com os três `update` afetando 0 linhas num banco sem catálogo.

**O que continua sem prova**: que o `drop column show_in_menu` dentro do `do $$` não esbarre em
dependência que só existe no grafo completo das 48 migrations, e que a semeadura do "Sobre" case com
o `store_settings` recém-criado. É leitura, não execução. **Registro como risco de entrega**, com o
motivo (custo destrutivo no ambiente local) e o caminho de fechamento (rodar num banco descartável,
não no de trabalho).

### 4.5 A ponte da prévia — a divergência é **defensável**, e é para melhor

O `ready` da loja vai para a origem do painel deduzida do `document.referrer`
(`useMenuPreview.ts:59-66,97-98`), e **não sai** quando não há referrer; o canal da home continua
postando com `'*'` (`useHomePreview.ts:72,78`). A divergência é o canal novo sendo **mais estrito**
que o antigo, não menos — e o caminho que ela poderia abrir (prévia em branco sem referrer) está
fechado pela entrega no `onLoad` do iframe, feita pelo lado que **conhece** a origem
(`useMenuPreviewBridge.ts:38-43`, ligada em `MenuLivePreview.tsx:161`), com teste em
`MenuLivePreview.test.tsx:218` (`toEqual(['draft','open'])`) e o par em `useMenuPreview.test.tsx:114`
("sem referrer, o `ready` NÃO sai").

**Não é buraco.** A ressalva que registro é de leitura da AC, não de segurança: `NAV-47` está
discriminado **só na ponta do painel** (mutação 5). Na ponta da loja não há comparação de `event.origin`
— a régua é `event.source !== window.parent` (`useMenuPreview.ts:86`) mais o carimbo. A assimetria é
declarada nos dois arquivos e é o desenho herdado da `25` (quem **age** é estrito; quem só **desenha**
confia no pai), e eu a considero correta; o que não existe é uma asserção que cubra a palavra "origem"
do lado da loja. Deixaria como está, com o registro.

**Dívida de vizinhança encontrada**: `supabase/functions/sitemap/index.ts:56` ainda traz
`show_in_menu` no `select` de colunas. É inofensivo hoje (`MenuCategory` não declara mais o campo, e
nada o lê para decidir), mas o escopo do guarda é literalmente `['apps']` — `supabase/functions/**`
está fora dele. Vale tirar da lista de colunas no próximo toque na function.

---

## 5. Os desvios declarados no `tasks.md` — conferidos um a um

Confirmei no código **todos** os desvios que o implementador declarou. Amostra do que foi verificado:

| Desvio declarado | Conferido |
| --- | --- |
| `core/menu/preview.ts` **não** reexporta os genéricos | ✅ `preview.ts:23` **importa** `PREVIEW_DEVICES` de `../home/preview.ts`; o barrel `index.ts` exporta só o que o arquivo declara |
| `core/home/preview.ts` ganhou `.ts` no `import type` | ✅ `preview.ts:17` → `from './types.ts'`; e `core/menu/__tests__/purity.test.ts:165-190` caminha o grafo **transitivo** com âncora (`visitados >= 8`) e **sensor por mutação** (`:188`) |
| O `ready` vai para a origem do painel, não `'*'` | ✅ (4.5) |
| A T28 mexeu no `MobileMenu`, que a task não nomeava | ✅ o arquivo está no diff (312 linhas) e a folha abre sozinha em modo prévia (`MobileMenu.test.tsx:413`) |
| `useMenu` importa `useMenuPreview` por **caminho profundo** | ✅ `useMenu.ts:7` → `'@/entities/menu/model/useMenuPreview'` |
| Não há alternador de dispositivo dentro do palco | ✅ asserido em `MenuLivePreview.test.tsx:103` |
| A T30 removeu **sete** símbolos | ✅ `menuSemTeto.test.ts:161-162` cobre os sete, com sensores em `:228` e `:237` e o par negativo de `MobileMenuEntry` em `:247` |
| `BL-018` virou `BL-027` | ✅ `.specs/BACKLOG.md:927`, com o motivo em `:932` |

> **Renumeração posterior, no merge com a `master` (feature `38`).** A entrada foi registrada como
> `BL-023` e conferida com esse número; a `38`, escrita em paralelo a partir da mesma base, também
> registrou a sua primeira dívida como `BL-023` e chegou primeiro à `master`. No merge, as duas
> entradas da `39` desceram para **`BL-027`** e **`BL-028`**, e todas as citações — código, teste e
> documento, este incluído — foram renumeradas junto. A evidência acima continua válida: o que
> mudou foi o número, não o achado. O registro da colisão está no `.specs/BACKLOG.md`.
| `icons.test.ts` ficou na suíte da loja (`packages/ui` não tem runner) | ✅ o guarda varre `packages/ui/src/icons`, e são **29** `.tsx` (28 do catálogo + `PixIcon`, fora do conjunto) |

**Desvio não declarado encontrado**: um só, o de 4.2 — o painel reescrevendo o predicado de `arte()`.
Não está na lista de desvios do `tasks.md` e é o único ponto do diff onde uma regra do menu tem duas
escritas.

---

## 6. Veredito

**FAIL ❌**, e o motivo é estreito: **nenhum defeito de comportamento foi encontrado no que a loja
entrega**, e o gate está integralmente confirmado por medição própria. O que reprova são três lacunas
de **cobertura**, duas delas provadas por mutante sobrevivente, num repositório cuja regra escrita é
que guarda que não discrimina é pior que guarda nenhum.

### Lacunas, ranqueadas

1. **`NAV-08` — o backfill 2 não tem as colunas asseridas, e o mutante sobrevive** (3.2, mutante A).
   Consequência se alguém mexer: painel do menu vazio **no celular**, em produção, com a suíte verde.
   Conserto: uma asserção em `menuSchema.test.ts` que case o `set` do backfill 2 nas **duas** colunas
   (a régua atual casa só a forma do backfill 1), com sensor por mutação ao lado.
2. **`NAV-20` — o rótulo em `on-primary` não tem asserção, e o mutante sobrevive** (3.2, mutante B).
   Conserto: uma asserção em `MegaMenu.test.tsx` sobre a classe do rótulo, e trocar
   `toContain('text-estrelinha-accent')` por uma régua que **distinga** `accent` de `accent-strong`
   (hoje ela casa os dois, e a AC os opõe).
3. **`NAV-23` — a metade "a tela diz isso em texto" não tem teste, porque
   `MenuPanelEditor.test.tsx` não existe.** É o único componente novo do painel sem arquivo de teste,
   e o `tasks.md` (T24) previa "(+ teste)". Conserto: o arquivo, com o literal asserido.
4. **`NAV-04` e `NAV-45` continuam provados só pela forma, e a prova de navegador não foi feita**
   (4.1). Não é regressão nem surpresa — está declarado na spec —, mas é a pendência que decide se a
   feature está pronta para a Adri, e é onde este repositório já foi mordido com todos os testes
   verdes.
5. **A migration nunca rodou do zero** (4.4). Risco de entrega, com caminho de fechamento barato num
   banco descartável.
6. **Duas escritas do predicado de `arte()`** (4.2), desvio não declarado. Divergem hoje no caso de
   espaço em branco; divergirão mais no primeiro ajuste.
7. **Ressalvas de precisão sem mutante**: `NAV-39` (motivo não asserido), `NAV-41` (botão de tentar de
   novo não asserido), `NAV-42` (a reversão do estado não asserida), `NAV-46` ("continua editável"
   provado por copy). Nenhuma delas é defeito; todas são asserção mais fraca do que a AC escreve.

### O que está sólido, e merece registro

- **A regra pura tem dono único, e isso foi discriminado, não só declarado**: a mutação 2 derrubou o
  teste do item de link **e** o do banner, que é a prova de `NAV-31` que nenhuma leitura de código
  daria.
- **Os cinco guardas novos têm âncora dupla e sensor embutido**, e os sensores rodam na suíte —
  incluindo o do ponto cego do removedor de comentário (linha × bloco na mesma varredura), que é o
  defeito real que o lote 4 achou e transformou em teste.
- **As allowlists de dívida estão zeradas de verdade** (4.3), e a ausência delas é a asserção.
- **O teto de vagas foi apagado, não depreciado**, e o vocabulário de "vaga" é recusado nas cinco
  superfícies.
- **Nenhuma linha de dinheiro foi tocada**, conferido por diff.

---

# Iteração 2 — 2026-09-06 · HEAD `c413ce2` · **PASS ✅**

> **Segundo Verifier independente.** Não escrevi o código, não escrevi as correções, e **não usei o
> relato do commit `c413ce2` como evidência de nada**: cada uma das quatro lacunas que ele diz ter
> fechado foi **reinjetada por mim** no arquivo de produção, medida com a suíte relevante e desfeita
> por cópia de backup (nunca `git stash`, cuja pilha é compartilhada). `git status --porcelain`
> conferido **vazio depois de cada passo** e no fecho, junto com `git diff --stat`.
>
> **Data**: 2026-09-06 · **Base**: `146561e` · **HEAD**: `c413ce2` · **Branch**:
> `feat/39-menu-configuravel` · **Worktree**: `C:\Projetos\uma-estrelinha\store-39-menu` · diff da
> branch: **155 arquivos**; diff do `c413ce2`: **14 arquivos, +927/−51**.

---

## I2.1 — Gate, medido por mim, um workspace por vez, exit code fora de pipe

| Medida | Reportado pelo worker | **Medido por mim** | Veredito |
| --- | --- | --- | --- |
| core | 1691 / 67 | **1691 / 67** · `exit=0` | ✅ bate |
| store | 2190 / 144 | **2190 / 144** · `exit=0` | ✅ bate |
| backoffice | 1908 / 116 | **1908 / 116** · `exit=0` | ✅ bate |
| functions | 350 / 7 | **350 / 7** · `exit=0` | ✅ bate |
| catalog-import | 509 / 23 | **509 / 23** · `exit=0` | ✅ bate |
| **total** | 6648 / 357 | **6648 / 357** | ✅ |
| Lint | 27 erros / 5 warnings | **27 / 5** — store **2/1** · backoffice **25/4** | ✅ bate |
| Tipos | 0 · 0 | **0 · 0 · 0** (store · backoffice · catalog-import) | ✅ bate |

- **Nenhum número do worker precisou ser corrigido.** Cada workspace rodou isolado, com
  `echo "exit=$?"` numa linha própria — nunca depois de um `| tail`, cujo código de saída é o do
  `tail`.
- **Delta contra a iteração 1**: **+25 testes, +1 arquivo** (store 2182→**2190**, backoffice
  1891/115→**1908/116**). Core, functions e catalog-import **não mudaram de contagem**, e o diff
  confirma que não foram tocados na parte de teste.
- **`packages/core/src/payment/**` e `supabase/functions/mercado-pago/**` seguem intocados em TODA a
  branch** — `git diff --name-only 146561e..HEAD -- <os dois caminhos>` devolve **zero linhas**,
  medido por mim no HEAD da iteração 2.

### Nenhuma asserção foi afrouxada para o gate subir

Régua: `git show c413ce2 --unified=0` filtrado por linhas removidas que contenham `it(`/`describe(` e
por linhas removidas que contenham `expect(`. **Cinco casos e quatro asserções saíram, e cada um foi
substituído no mesmo lugar por versão estritamente mais forte** — conferido um a um:

| O que saiu | O que entrou no lugar | Mais forte porque |
| --- | --- | --- |
| `expect(sql).toMatch(/set menu_desktop = true,\s*menu_mobile…where show_in_menu/i)` | `ligaAsDuasSuperficies()` aplicado aos **três** backfills, + âncora de "cada marca casa 1 `update`" + 3 sensores | a régua antiga era a **forma do backfill 1** e não alcançava os outros dois |
| `expect(bloco).toContain("'desktop'")` / `toContain("'mobile'")` | `camposDoBanner(bloco,'mobile')).toEqual(camposDoBanner(bloco,'desktop'))` com o conjunto literal `['badge','id','kind','subtitle','target','title']` | igualdade de conjunto de campos × presença de uma chave |
| `expect(svg.getAttribute('class')).toContain('text-estrelinha-accent')` | `temToken(…,'text-estrelinha-accent')).toBe(true)` **e** `temToken(…,'text-estrelinha-accent-strong')).toBe(false)` + a metade do rótulo + sensor | `toContain` casava o token que a AC **opõe** |
| `it('a varredura enxerga os dois apps')` · `it('não sobrou allowlist … de apps/**')` | as mesmas, com escopo `['apps','supabase/functions']` e uma asserção **nova** só das edge functions | escopo maior, âncora nomeando `supabase/functions/sitemap/index.ts` |

---

## I2.2 — As quatro lacunas: **mutação reinjetada por mim**, uma a uma

**11 mutações, 11 mortas, 0 sobreviventes.** Todas no arquivo de **produção** real (nunca no teste),
desfeitas por cópia de backup guardada fora do repositório.

| # | Lacuna | Onde injetei | A mutação | Resultado |
| --- | --- | --- | --- | --- |
| 1 | `NAV-08` | `…39-menu-configuravel.sql:126` | **backfill 2** reduzido a `set menu_desktop = true` — *a mutação exata que sobreviveu na iteração 1* | ❌→ **2 falhas** (`backfill 2 — as filhas ativas…` + `SENSOR`). Rodada na **suíte inteira da loja**: 2190 testes, 2 reprovaram |
| 2 | `NAV-08` | `…:114` | **backfill 1** reduzido a `set menu_desktop = true` | ❌→ **2 falhas** |
| 3 | `NAV-08` | `…:148` | **backfill 3** com `'mobile', '[]'::jsonb` — a chave fica, o anúncio some | ❌→ **1 falha** (`backfill 3 — o card da 16 vira o MESMO banner…`) |
| 4 | `NAV-08` | `…:151` | **backfill 3** com o celular perdendo **só** `subtitle` (parênteses balanceados) | ❌→ **1 falha**. É a mutação sutil que uma régua de `toContain("'mobile'")` deixaria passar |
| 5 | `NAV-20` | `navItem.ts:24` | `text-estrelinha-on-primary` **removido** de `NAV_ITEM` | ❌→ **1 falha** (`o RÓTULO continua em on-primary`) |
| 6 | `NAV-20` | `navItem.ts:38` | `text-estrelinha-accent` → `text-estrelinha-accent-strong` em `NAV_ITEM_ICON` | ❌→ **1 falha** (`o ícone sai em accent — e NÃO em accent-strong`) |
| 7 | `NAV-23` | `MenuPanelEditor.tsx:34` | `marcada` lendo `menu_desktop` **nas duas** superfícies | ❌→ **3 falhas** |
| 8 | `NAV-23` | `MenuPanelEditor.tsx:60-62` | a frase da consequência **apagada**, mantendo a das colunas | ❌→ **2 falhas** |
| 9 | Predicado da arte | `core/src/menu/banners.ts:112` | `menuBannerArt` deixa de recuar para a outra superfície | ❌→ **2 falhas em `MenuBannerEditor.test.tsx`, no BACKOFFICE**. Na iteração 1 esta mesma quebra deixava os 1891 do painel verdes |
| 10 | Escopo do guarda | `supabase/functions/sitemap/index.ts:61` | `show_in_menu` devolvido ao `select` de colunas | ❌→ **2 falhas** em `menuSurfaceSingleOwner.test.ts` (a asserção das functions **e** a de "não sobrou allowlist") |
| 11 | — | (probe puro, sem tocar no repositório) | a régua `(?:^|\s)token(?![-\w])` avaliada em Node sobre 10 entradas construídas | ✅ **distingue de verdade**, e **não por ordem** — ver I2.3 |

### I2.3 — A régua de token distingue `accent` de `accent-strong` por construção, não por acidente

A auditoria pediu por nome que eu não aceitasse "passou". Copiei `temToken` **literalmente** de
`MegaMenu.test.tsx` para um script fora do repositório e avaliei os dois sentidos, inclusive a ordem
invertida — que é onde uma régua ingênua acerta por sorte:

```
"h-4 text-estrelinha-accent-strong"                        → accent        : false  ✅
"h-4 text-estrelinha-accent"                               → accent        : true   ✅
"text-estrelinha-accent-strong text-estrelinha-accent"     → accent        : true   ✅  ← ordem invertida
"text-estrelinha-accent text-estrelinha-accent-strong"     → accent        : true   ✅
"text-estrelinha-accent-strong"                            → accent-strong : true   ✅
"xtext-estrelinha-accent"                                  → accent        : false  ✅  ← não casa sufixo
"text-estrelinha-accentX" / "text-estrelinha-accent_x"     → accent        : false  ✅
null                                                       → accent        : false  ✅
```

O par que fecha a pergunta é o terceiro: com `-strong` **antes** do token real, a régua ainda
responde `true` — ela procura o token, não a primeira ocorrência do prefixo. E o primeiro caso, com
**só** o `-strong` presente, responde `false`. O `(?![-\w])` é o que faz isso: `\b` não fecharia nada,
porque `-` não é caractere de palavra.

### I2.4 — `MenuPanelEditor.test.tsx`: os 16 casos asserem VALOR, não renderização

Conferido caso a caso contra `spec.md:177` (`NAV-20`) e a AC 2 da história de curadoria (`NAV-23`:
*"SHALL sumir do menu e SHALL continuar existindo na loja (página, busca, rodapé, grade da home) — a
tela SHALL dizer isso em texto"*):

| O que a spec exige | `file:line` + asserção | Resultado |
| --- | --- | --- |
| a tela **diz** que a categoria continua na loja, e nomeia onde | `MenuPanelEditor.test.tsx:77-79` — `getByText(/continua existindo na loja/)`, `/página, busca, rodapé e grade/`, `/só não aparece no menu do computador/` | ✅ o literal da consequência está asserido |
| a consequência é **por dispositivo** | `:84` — `getByText(/só não aparece no menu do celular/)` | ✅ |
| marcar grava **só** a booleana da superfície corrente | `:98-107` — `caixaDe('pingentes')` **marcada** no desktop e **desmarcada** no mobile, com a mesma árvore | ✅ mata a leitura cruzada (mutação 7) |
| o evento carrega id + valor, e nada mais é decidido ali | `:114-118` — `toHaveBeenCalledWith('aneis', true)`, `toHaveBeenLastCalledWith('correntes', false)`, `toHaveBeenCalledTimes(2)` | ✅ igualdade exata |
| "N de M" bate com a **árvore** | `:135` `'2 de 3'` · `:140` `'1 de 3'` · `:149` `'0 de 0'` · `:159` `'2 de 4'` | ✅ e a fixture traz `velas`, filha de **outro** pai, que é o que impede M de virar "quantas categorias existem" |
| o corte é `MENU_PANEL_COLUMN_SIZE`, nunca um número escrito à mão | `:181` `toHaveLength(MENU_PANEL_COLUMN_SIZE)` · `:184` `0 de ${SIZE+2}` · `:206` sem botão com a coluna exata | ✅ o corte é de **exibição**; a contagem continua falando da árvore inteira |
| a ordem é a da árvore | `:218` — `toEqual(['Pôr Abelha…','Pôr Zebra…'])` com `sort_order` 1 e 9 fora de ordem na entrada | ✅ |

**Nenhum dos 16 é "renderizou sem quebrar".** O `aria-label` completo (`'Pôr Pingentes no painel do
celular'`) é asserido literal, e é ele que morre junto na mutação 7.

### I2.5 — O predicado da arte tem um dono, e o painel não recalcula em superfície nenhuma

`menuBannerArt` e `menuBannerImage` passaram a ser **export** de `packages/core/src/menu/banners.ts`
(`:87` e `:105`), e `resolveMenuBanners:146` os consome. Varredura de `MenuBannerEditor.tsx` por
`image_desktop|image_mobile|arteDaSuperficie|arteDaOutra`: **cinco acertos, nenhum é predicado**.

| Superfície onde ele decidia sozinho | Como está agora | Linha |
| --- | --- | --- |
| a miniatura do banner | `const { image: arteMostrada, imageReused: reaproveitando } = menuBannerArt(banner, surface)` | `MenuBannerEditor.tsx:220` |
| o rótulo "arte do computador / do celular · falta" | `menuBannerImage(banner, campo === 'image_desktop' ? 'desktop' : 'mobile')` | `:410` |
| o aviso "a loja vai reaproveitar a do computador" | `{reaproveitando && …}` | `:452` |

Os dois acertos restantes não são leitura de predicado: `:102` é a **normalização de escrita** (campo
vazio **sai** do jsonb em vez de virar `""`, e já usa `.trim()`, coerente com `texto()`) e `:131` é o
nome do campo de upload.

**A prova de que a delegação é medida, e não declarada**: `MenuBannerEditor.test.tsx:140-166` monta a
tela com `image_mobile: '   '` e compara **o veredito da tela** com `resolveMenuBanners` sobre o
**mesmo jsonb** — `expect(naLoja[0]).toMatchObject({ image: 'https://x/d.webp', imageReused: true })`
ao lado de `getByTestId('arte-reaproveitada-0')` e `getByTestId('arte-image_mobile-0')` com `'falta'`.
Com `menuBannerArt` quebrada em `core`, **o painel reprova** (mutação 9) — que é exatamente o que não
acontecia na iteração 1.

`previaUnica.test.ts` **não foi tocado** por `c413ce2`, e continua recusando `menuPanelColumns` e
`resolveMenuBanners` em fonte de produção do painel (`:205`, sobre `FONTES_MENU`, que já excluía
`.test.tsx` antes desta feature). O import de `resolveMenuBanners` que entrou está num **arquivo de
teste** e por isso fora do escopo — corretamente: a regra proíbe o painel ter um segundo **desenho**,
e o que ele passou a fazer é o oposto disso.

---

## I2.6 — O que a iteração 1 aprovou, e não regrediu

Amostra dirigida aos pontos de maior risco tocados por `c413ce2` — não refiz as 48 ACs.

- **As allowlists continuam vazias, e a ausência continua sendo a asserção.** `grep` por
  `ALLOWLIST|allowlist|PERMITIDOS|EXCECOES|EXCEÇ` em `menuSurfaceSingleOwner`, `menuSemItemFixo`,
  `menuSemTeto` e `previaUnica`: **nenhuma constante de exceção**, só prosa explicando que não há uma.
  A asserção que fica de pé é `expect(procurar(LEGADO).map(…)).toEqual([])` sobre o escopo inteiro.
- **O escopo novo `['apps','supabase/functions']` ACUSA** — provado pela mutação 10, e com **âncora
  nomeando o arquivo**: `expect(varridos.some(a => a.rel === 'supabase/functions/sitemap/index.ts'))`.
  Sem essa âncora, um caminho errado varreria zero arquivo e a asserção passaria por vacuidade.
- **A âncora dupla do guarda sobreviveu ao alargamento**: `varridos.length > 400` e a separação
  produção × teste continuam, e as duas contagens só cresceram.
- **A migration continua com quatro `update public.categories`** (três backfills + a limpeza de
  `icon`), e a âncora nova assere que **cada marca casa exatamente um** — o que impede uma marca
  frouxa de cobrir o backfill errado e deixar o certo sem guarda nenhum.
- **`supabase/functions/sitemap/__tests__/handlers.test.ts`** perdeu `show_in_menu: false` da fixture,
  acompanhando o tipo. A contagem de functions ficou **350/7**, então nenhum caso saiu.

---

## I2.7 — Os dois desvios que o worker declarou

**1. As baselines de quatro `CLAUDE.md`.** Batem com o que **eu** medi:

| Arquivo | O que ele escreveu | O que eu medi |
| --- | --- | --- |
| `CLAUDE.md` (raiz) | `6648 em 357 arquivos` — store 2190/144 · backoffice 1908/116 · core 1691/67 · functions 350/7 · catalog-import 509/23 | ✅ **idêntico**, os cinco isolados com exit code |
| `CLAUDE.md` (raiz) | lint **27/5**, tipos **0 · 0 · 0** | ✅ store 2/1 · backoffice 25/4; `tsc` limpo nos três |
| `apps/backoffice/CLAUDE.md` | lint do painel **25/4** | ✅ |
| `apps/store/CLAUDE.md` · `packages/core/CLAUDE.md` · `apps/backoffice/CLAUDE.md` | o dono único de `menuBannerArt`, e o escopo do guarda alcançando `supabase/functions/**` | ✅ o texto descreve o código que está no disco |

O delta declarado (**+25**, sendo store **+8** e backoffice **+17/+1**) fecha com a aritmética:
2182→2190 e 1891/115→1908/116.

**2. O `validation.md` da iteração 1 commitado junto.** Conferido por `diff` contra a versão anterior
do arquivo (`3c00b09`), recortada a partir de `## Probes (T7)`:

- **A seção `## Probes (T7)` está preservada byte a byte** — as 227 linhas do probe (as três execuções
  da migration, os hashes de idempotência `67171ec1…`/`2ddd6c77…`, o catálogo do sistema com
  `attgenerated = 's'`, os **9 probes HTTP** incluindo o `428C9` da recusa de escrita na coluna gerada
  e o `200` com `[]` do falso verde da RLS) chegam **sem uma diferença**.
- O commit removeu **13 linhas**, e são exatamente o cabeçalho antigo do arquivo (`# Menu configurável
  — evidência de execução`, que declarava ser evidência parcial do implementador) e a lista
  `## Pendente para o Verifier`. As duas foram **substituídas** pelo relatório do Verifier, que
  reabsorveu os três itens pendentes em `## Pendente depois desta verificação` — nenhum sumiu.
- **Nada do texto do Verifier foi reescrito**: os 6 itens ranqueados, os dois mutantes sobreviventes
  com o SQL injetado, e as cinco ACs parciais estão como ele os escreveu.

---

## I2.8 — O que continua SEM PROVA — riscos de entrega

Nada em `c413ce2` tocou nestes três, e eu não os fechei. **Eles são a razão de o PASS vir com
ressalva**, e não devem ser lidos como "coberto por teste":

### 1. `NAV-04` — a faixa rola em vez de estourar, e o `body` nunca rola em 390

**Provado só pela FORMA.** `Header.test.tsx:197` (`overflow-x-auto`), `:201`
(`not.toContain('flex-wrap')`), `:208` (a faixa não é posicionada), `MegaMenu.test.tsx:408`
(`min-w-max`). **Remedido por mim nesta iteração**: `grep` por `scrollWidth|clientWidth|offsetWidth`
em todo `apps/store/src/**/*.test.ts(x)` devolve **um** acerto, e é um **comentário** em
`ProductPage.test.tsx:245`, de outra feature. Continua **zero** medida de layout.

- **O que falta medir**: em **1440**, ligar itens de menu até a faixa estourar e conferir que ela
  **rola** (`scrollWidth > clientWidth` no `<nav>`) e que `document.body.scrollWidth` continua igual
  a `clientWidth`; em **390**, com a folha aberta e um acordeão com banner, conferir ausência de
  rolagem horizontal do `body` e alvo de toque ≥ 44px.
- **Onde**: navegador real, loja em `:8082`. jsdom devolve **0** para toda medida de layout — nenhum
  teste de componente pode fechar isto, hoje ou depois.
- **Por que importa aqui mais que o normal**: esta feature **apagou o teto de itens**. Antes, o
  estouro era impossível por construção; agora a resposta ao estouro é a rolagem, e ela nunca foi
  vista funcionando. É a cicatriz da `27` na mesma casa — página de produto inteira rolando na
  horizontal, `scrollWidth` 634 em viewport de 390, com todos os testes verdes.

### 2. `NAV-45` — a prévia é 390 **escalado**, não 390 encolhido

**Provado só pela FORMA.** `MenuLivePreview.test.tsx:87` (`width=390`, `height=844`), `:94`/`:99`
(`style.transform` contém `scale(`, `transformOrigin === 'top left'`), `AdminMenuPage.test.tsx:311`
(1024 → 390 ao trocar de aba). **Remedido**: a asserção continua sendo `toContain('scale(')`, e sob
jsdom (sem `ResizeObserver`) `previewScale` devolve **1** — o valor renderizado é sempre `scale(1)`.
O que está provado é que **existe** um `transform`, não que a escala é calculada.

- **O que falta medir**: em `/admin/menu`, trocar para a aba Celular e confirmar que o iframe mede
  **390 de verdade** nas media queries — o sinal barato é que a barra de departamentos
  (`hidden md:block`) **some**, porque se o iframe estivesse encolhido por CSS ele continuaria
  medindo 1024 e a barra apareceria. **O erro se apresenta como um menu que não deveria estar ali.**
- **Onde**: navegador real, painel em `:8083` com `VITE_STORE_URL` apontando para `:8082`.

### 3. A migration nunca rodou do zero

O probe (T7, preservado abaixo) aplicou o `.sql` **três vezes sobre o banco local com o catálogo real
importado**, com hash de estado antes/depois provando idempotência. **`supabase db reset` não foi
rodado, nem por mim** — rodá-lo apagaria o catálogo real da máquina de quem desenvolve, e o
`seed.sql` não o repõe desde a feature 21.

- **O que falta medir**: `supabase db reset` **num banco descartável**, com as 48 migrations em
  ordem, e depois conferir que (a) o `drop column show_in_menu` dentro do `do $$` não esbarra em
  dependência que só existe no grafo completo, (b) `show_in_menu` nasce `attgenerated = 's'`, e (c) a
  semeadura do "Sobre" casa com o `store_settings` recém-criado (`insert … on conflict (key) do
  nothing` afeta 1 linha, não 0 por tabela ausente).
- **Onde**: instância Supabase descartável — **nunca** a de trabalho, na faixa 54341–54349.
- **O que já reduz o risco, por leitura**: nenhuma view, policy ou índice fora da própria migration
  depende de `show_in_menu`; o `seed.sql` não escreve na coluna; e a `16` roda antes, criando a coluna
  comum que a guarda `attgenerated = ''` espera encontrar.

---

## I2.9 — Veredito da iteração 2

**PASS ✅**

**As quatro lacunas que o commit `c413ce2` diz ter fechado estão fechadas, e eu provei cada uma
reinjetando a mutação eu mesmo** — 11 mutações, 11 mortas, **0 sobreviventes**. As duas que a
iteração 1 marcou como **mutante sobrevivente** (o backfill 2 da migration e o rótulo em
`on-primary`) agora reprovam a suíte, e a mutação do backfill 2 é literalmente a mesma que o Verifier
anterior usou. O gate bate número por número com o que o worker reportou, medido por mim, um
workspace por vez, com exit code fora de pipe. Nenhuma asserção foi afrouxada para o gate subir:
os cinco casos e as quatro asserções que saíram do diff foram substituídos no mesmo lugar por versões
estritamente mais fortes.

### Lacunas da iteração 1 — situação

| # | Lacuna | Situação |
| --- | --- | --- |
| 1 | `NAV-08` — backfill 2 sem colunas asseridas, mutante sobrevivente | ✅ **FECHADA** — mutações 1–4 |
| 2 | `NAV-20` — rótulo em `on-primary` sem asserção, mutante sobrevivente | ✅ **FECHADA** — mutações 5–6 e o probe da régua |
| 3 | `NAV-23` — `MenuPanelEditor.test.tsx` não existia | ✅ **FECHADA** — 16 casos, mutações 7–8 |
| 6 | Duas escritas do predicado de `arte()` | ✅ **FECHADA** — dono único em `core`, mutação 9 |
| — | *(extra, não pedido)* escopo do guarda era `['apps']` | ✅ fechado — mutação 10 |
| 4 | `NAV-04` e `NAV-45` sem prova de navegador | ⚠️ **ABERTA — risco de entrega**, I2.8 §1 e §2 |
| 5 | A migration nunca rodou do zero | ⚠️ **ABERTA — risco de entrega**, I2.8 §3 |
| 7 | Ressalvas de precisão (`NAV-39`, `NAV-41`, `NAV-42`, `NAV-46`) | ⚠️ **inalteradas** — nenhuma é defeito; todas são asserção mais fraca do que a AC escreve. Não bloqueiam |

**As duas que continuam abertas não são regressão nem surpresa**: as duas primeiras estão declaradas
na própria spec (`spec.md:381-384`), e a terceira tem o custo declarado (destruir o catálogo local).
Nenhuma delas se fecha com código — as três se fecham **abrindo um navegador e um banco
descartável**, e é isso que separa "a suíte está verde" de "a feature está pronta para a Adri".

### Como esta iteração foi conduzida

- **Árvore de trabalho intocada.** Nenhuma linha de código, teste ou spec foi escrita ou corrigida
  por mim. As 10 mutações de arquivo foram aplicadas ao arquivo **real**, medidas e desfeitas por
  **cópia de backup** guardada fora do repositório — nunca `git stash`, cuja pilha é compartilhada com
  o repositório principal. `git status --porcelain` conferido **vazio depois de cada restauração** e
  no fecho, junto com `git diff --stat` vazio. A 11ª mutação é um probe puro, num script fora da
  árvore.
- **Gate um workspace por vez**, com `echo "exit=$?"` em linha própria.
- **O relato do commit `c413ce2` não foi usado como evidência de nada.** Cada afirmação dele foi
  reproduzida ou recusada por medição própria; as que conferi todas bateram.

---

## I2.10 — Lições a registrar (não gravadas por restrição de escopo)

`.specs/LESSONS.md` **não tem nenhuma entrada da feature 39** (`grep -c '39-menu-configuravel'` → 0),
e a iteração 1 produziu sinal graúdo: **dois mutantes sobreviventes**. Não rodei
`scripts/lessons.py add` porque a instrução desta verificação é fechar com `git status` limpo exceto
por este arquivo, e o script escreve `.specs/lessons.json` **e** `.specs/LESSONS.md`. Ficam aqui, com
o *grounding* pronto, para quem fechar a feature gravar:

| Sinal | Escopo | Lição | Grounding |
| --- | --- | --- | --- |
| `surviving_mutant` | `apps/**/__tests__` (guardas que leem `.sql`) | Uma régua por **comando**, nunca uma para a família: guarda que casa um `update` inteiro numa expressão só mede a **forma do primeiro**, e o segundo, com uma cláusula a mais no meio (`from`), escapa em silêncio. Recorte o `set` e assere as colunas nele. | `menuSchema.test.ts` + `20260905130000_39-menu-configuravel.sql:126` — backfill 2 reduzido a `menu_desktop` deixava 2182 testes verdes |
| `surviving_mutant` | `testing/tokens` | Régua de classe utilitária precisa recusar **hífen** depois do token: `toContain` casa o sufixo (`accent` casa `accent-strong`) e `\b` não fecha nada, porque `-` não é caractere de palavra. A forma que fecha é `(?:^|\s)token(?![-\w])`. | `MegaMenu.test.tsx` + `navItem.ts:38` — `accent` → `accent-strong` passava batido |
| `ac_gap` | `testing/guardas de dono único` | Guarda com escopo menor que a regra é allowlist com outro nome: `['apps']` deixava `supabase/functions/**` fora, e a function do sitemap seguia pedindo a coluna legado ao banco. Escopo de varredura é parte da asserção, e precisa de âncora que **nomeie um arquivo** de cada ponta. | `menuSurfaceSingleOwner.test.ts:ESCOPO` + `supabase/functions/sitemap/index.ts:61` |
| `ac_gap` | `apps/backoffice/**` | AC com duas metades — "o sistema faz X" **e** "a tela diz isso em texto" — precisa de asserção sobre o **literal**: o componente único sem arquivo de teste é onde a segunda metade some, e apagar a frase não quebra nada. | `NAV-23` + `MenuPanelEditor.tsx:60-62`, que não tinha teste nenhum |

---

## Evidência crua do implementador — preservada na íntegra

> As seções abaixo foram escritas **durante a implementação**, por quem implementou. Estão aqui
> como insumo: o probe HTTP (T7) contra o banco local e os sensores embutidos dos guardas novos
> (T9/T10/T11). O Verifier as leu e não as reexecutou — reexecutar o probe mexeria no catálogo real
> importado na máquina de desenvolvimento.

## Probes (T7)

**Quando**: 2026-09-05 · **Onde**: Supabase local (`http://127.0.0.1:54341`), banco com o catálogo
real importado (37 categorias, 680 produtos) — **sem `db reset`**, como manda `supabase/CLAUDE.md`
para migration nova sobre banco com catálogo.

**Por que este probe existe**: `AD-012`. `DbCategory` já declarou três colunas que o banco não tinha
e **toda gravação de categoria falhou com `PGRST204`** — sem que build, `tsc` ou teste de componente
acusassem, porque o tipo mentia e os testes mockavam o client. A regra que saiu dali é que o tipo
escrito à mão é **afirmação**, e a verificação é HTTP contra o banco. **Nenhuma linha da T8 foi
escrita antes desta seção.**

`Prefer: return=representation` em todo `PATCH` não é enfeite: PostgREST responde **204 sem gravar
nada** a um update que casou zero linhas sob RLS, e um probe que só olhasse o status "provaria" uma
coluna inexistente. O passo 8 abaixo mostra exatamente essa forma de falso verde (`200` com `[]`).

### Preparação — a migration aplicada à mão, três vezes

```
$ docker cp supabase/migrations/20260905130000_39-menu-configuravel.sql \
      supabase_db_uma-estrelinha-store:/tmp/39.sql
$ docker exec supabase_db_uma-estrelinha-store \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/39.sql
```

**1ª execução** (sobre o estado da feature 16 — 2 categorias com `show_in_menu`, 1 com `menu_promo`):

```
ALTER TABLE
COMMENT · COMMENT · COMMENT
DO
COMMENT · COMMENT
CREATE INDEX
UPDATE 0          <- limpeza de `icon`: o catálogo importado não tem emoji gravado
COMMENT
INSERT 0 1        <- a chave `menu` semeada
exit=0
```

**2ª e 3ª execuções** (idempotência):

```
NOTICE: column "menu_desktop" of relation "categories" already exists, skipping
NOTICE: column "menu_mobile"  of relation "categories" already exists, skipping
NOTICE: column "menu_banners" of relation "categories" already exists, skipping
DO                <- o bloco guardado não roda: `show_in_menu` já é gerada
NOTICE: relation "categories_show_in_menu_idx" already exists, skipping
UPDATE 0
INSERT 0 0        <- `on conflict (key) do nothing`
exit=0
```

Idempotência medida por **hash do estado**, não por leitura do log — antes e depois da 3ª execução:

```
$ psql -At -c "select md5(string_agg(id||':'||menu_desktop||':'||menu_mobile||':'||show_in_menu
                ||':'||coalesce(menu_banners::text,'-')||':'||coalesce(icon,'-'), '|' order by id))
                from public.categories"
     antes: 67171ec19c2acc49020b750c67508aed
    depois: 67171ec19c2acc49020b750c67508aed
$ psql -At -c "select md5(value::text) from public.store_settings where key='menu'"
     antes: 2ddd6c774c0dc135b1a8e0e79742162a
    depois: 2ddd6c774c0dc135b1a8e0e79742162a
```

Estado resultante da conversão, lido do catálogo do sistema:

```
$ psql -c "select attname, attgenerated, attnotnull from pg_attribute
            where attrelid='public.categories'::regclass and attname in (...)"
   attname    | attgenerated | attnotnull
--------------+--------------+------------
 icon         |              | f
 menu_banners |              | f
 menu_desktop |              | t
 menu_mobile  |              | t
 menu_promo   |              | f          <- PRESERVADA (legado não lido)
 show_in_menu | s            | t          <- 's' = generated always … stored

$ psql -c "select pg_get_expr(adbin, adrelid) from pg_attrdef where …"
 (menu_desktop OR menu_mobile)

$ psql -c "select indexdef from pg_indexes where indexname='categories_show_in_menu_idx'"
 CREATE INDEX categories_show_in_menu_idx ON public.categories USING btree (sort_order) WHERE show_in_menu
```

Os três backfills, medidos: **2** categorias estavam na barra da feature 16
(`personalizados`, `joias-afetivas`); depois da migration há **20** com `menu_desktop and
menu_mobile` — as 2 mais as 18 filhas ativas que o `MegaMenu` já mostrava. `joias-afetivas` é a única
com `menu_banners` preenchido, convertido do `menu_promo` que ela tinha.

### Os probes HTTP

Categoria de sonda criada e apagada ao fim (`slug = 'sonda-39-menu'`, `active = false`); o hash do
catálogo depois da limpeza é **idêntico** ao de antes do probe (`67171ec1…`), então nenhuma curadoria
real foi tocada.

**1. `POST /rest/v1/categories` — as colunas nascem com o default certo** → `HTTP 201`

```json
[{"id":"39393939-0000-4000-8000-000000000039","name":"Sonda 39","slug":"sonda-39-menu",
  "icon":null,"menu_promo":null,"menu_desktop":false,"menu_mobile":false,
  "menu_banners":null,"show_in_menu":false}]
```

**2. `PATCH` das quatro colunas novas, com `Prefer: return=representation`** → `HTTP 200`

```
$ curl -s -X PATCH "$URL/categories?id=eq.$ID" -H "apikey: $SR" -H "Authorization: Bearer $SR" \
    -H 'Content-Type: application/json' -H 'Prefer: return=representation' \
    -d '{"menu_desktop":true,"menu_mobile":false,"icon":"corrente",
         "menu_banners":{"desktop":[{"target":{"kind":"category","id":"3939…0039"},
                                     "badge":"Novo","title":"Sonda",
                                     "image_desktop":"https://exemplo.invalid/a.jpg"}],
                         "mobile":[]}}'
```

```json
[{"id":"39393939-0000-4000-8000-000000000039", …,
  "icon":"corrente",
  "menu_desktop":true, "menu_mobile":false,
  "menu_banners":{"mobile": [], "desktop": [{"badge": "Novo", "title": "Sonda",
     "target": {"id": "39393939-0000-4000-8000-000000000039", "kind": "category"},
     "image_desktop": "https://exemplo.invalid/a.jpg"}]},
  "show_in_menu":true}]
```

**Os valores voltam persistidos, não ecoados** — é `HTTP 200` com corpo, não `204`. O jsonb chega de
volta na forma exata que `menuBannerSlots` e `resolveMenuBanners` esperam (`{desktop:[], mobile:[]}`,
`target: {kind, id}`).

**3. Leitura de volta com `select` explícito das colunas novas** → `HTTP 200`

```json
[{"id":"3939…0039","menu_desktop":true,"menu_mobile":false,"show_in_menu":true,
  "icon":"corrente","menu_banners":{…},"menu_promo":null}]
```

Nomear as colunas no `select` é o que separa "a coluna existe" de "a coluna veio no `*`": o defeito
da feature 35 (`orders.customer_phone` gravado em 35/35 pedidos e ausente de toda tela) nasceu de uma
view que enumera colunas uma a uma.

**4. e 5. A derivada acompanha as duas booleanas** → `HTTP 200` nas duas

```json
{"menu_desktop":false,"menu_mobile":true,  "show_in_menu":true}     ← só o celular
{"menu_desktop":false,"menu_mobile":false, "show_in_menu":false}    ← nenhuma
```

**6. `PATCH` direto em `show_in_menu` — a RECUSA** → `HTTP 400`

```json
{"code":"428C9",
 "details":"Column \"show_in_menu\" is a generated column.",
 "hint":null,
 "message":"column \"show_in_menu\" can only be updated to DEFAULT"}
```

É o comportamento que a T6 procurava: a coluna continua **legível** pelo JS publicado da loja durante
a janela entre o `db push` e o deploy da Vercel, e deixa de ter dois donos porque **não aceita
escrita**. O custo declarado no cabeçalho da migration é a outra ponta desta mesma resposta: o
`/admin/menu` **antigo** falha ao gravar enquanto a janela durar.

**7. `store_settings.menu` lido pela chave publicável (`anon`)** → `HTTP 200`

```json
[{"key":"menu","value":{"links": [{"id": "sobre", "href": "/sobre", "icon": null,
   "label": "Sobre", "mobile": true, "desktop": true, "sort_order": 100}]}}]
```

**8. `anon` não escreve `store_settings`** → `HTTP 200` com **`[]`**

```
$ curl -s -X PATCH "$URL/store_settings?key=eq.menu" -H "apikey: $AN" … -d '{"value":{"links":[]}}'
[]
```

Corpo vazio: a RLS não casou linha nenhuma. **É este o falso verde que `AD-012` descreve** — sem
`return=representation` esta resposta seria um `204` indistinguível de sucesso. Conferido depois: a
chave `menu` continua com o "Sobre" (hash `2ddd6c77…` inalterado).

**9. Limpeza** → `HTTP 204`; `select count(*) … where slug='sonda-39-menu'` devolve **0**.

### O que este probe NÃO prova

- Que a tela grava. Ele fala com o PostgREST, não com o `AdminMenuPage` — a prova daquilo é da fase 5.
- Que a migration roda a partir do zero (`supabase db reset`). Ela foi aplicada **sobre o catálogo
  real**, de propósito, porque é o caminho que o `db push` fará em produção e porque o `seed.sql` não
  tem catálogo desde a feature 21. O caminho do reset entra no gate final da feature.
- Que o hospedado aceita. Nada foi enviado para `hgkrsfpupypxtygjgthf`.

---

## Sensores por mutação (T9, T11)

Cada guarda novo teve pelo menos uma asserção provada por **injeção de falha**: a régua é aplicada a
uma cópia mutada do texto real, dentro do próprio arquivo de teste, e o caso falha se a mutação
**passar**. Sem isso, uma asserção que sempre passa é indistinguível de uma que funciona.

### `menuSchema.test.ts` (T9) — sensores embutidos, rodam na suíte

| Asserção sensoreada | A mutação injetada | Prova |
| --- | --- | --- |
| `show_in_menu` é coluna **gerada** | trocar `generated always as (…) stored` por `not null default false` | a régua reprova a coluna comum |
| `menu_promo` **não** é apagada | acrescentar `drop column menu_promo;` ao texto | a régua acusa a remoção |
| os backfills vêm **antes** do `drop column show_in_menu` | mover o `drop` para antes do primeiro `update` | a régua acusa a inversão |
| a semeadura é `on conflict (key) do nothing` | trocar por `do update set value = excluded.value` | a régua reprova o upsert |
| nenhum `grant` alcança `anon` | acrescentar `grant update on public.categories to anon;` | a régua acusa |
| o índice parcial volta | remover o `create index … where show_in_menu` | a régua acusa a ausência |

### `menuIconCatalog.test.ts` (T11) — sensores embutidos, rodam na suíte

| Asserção sensoreada | A mutação injetada | Prova |
| --- | --- | --- |
| toda chave de `MENU_ICON_KEYS` tem componente | remover uma chave do registro copiado | a régua acusa a chave órfã |
| nenhum arquivo da loja importa `shared/ui/icons` | um caminho falso com o import antigo | a régua acusa o caminho de volta |

### `icons.test.ts` (T10) — âncoras de contagem preservadas na mudança de casa

A varredura passou a apontar para `packages/ui/src/icons`, e as âncoras que impedem "varrer zero
arquivo e passar em verde" continuam as mesmas: `TODOS.length >= 12`, `PixIcon.tsx` presente,
`comTraco === CONJUNTO.length`, `comGrupo >= 5`, `comRealce >= 5`. Sensor por caminho: apontar o
`ICONS_DIR` para o diretório **antigo** faz `readdirSync` lançar `ENOENT` — a varredura vazia não é
alcançável.

---


## Pendente depois desta verificação

O que o implementador deixou como pendente continua pendente, e eu não o fechei:

- **Navegador real em 390 e 1440.** É a pendência nº 4 acima. `NAV-04` (a barra rola, o `body` não) e
  `NAV-45` (390 escalado, não encolhido) só se provam ali, e jsdom devolve 0 para toda medida de
  layout. Roteiro mínimo: em 1440, ligar itens até estourar a faixa e conferir que ela rola e o `body`
  não; em 390, abrir a folha, um acordeão com banner, e conferir alvo de toque e ausência de rolagem
  horizontal; em `/admin/menu`, trocar de aba e conferir que o quadro vira 390 **escalado** — a barra
  de departamentos é `hidden md:block`, então se o iframe estivesse encolhido em vez de escalado o
  erro apareceria como **um menu que some**.
- **`supabase db reset` limpo**, com a migration rodando do zero (4.4). Em banco descartável, nunca no
  de trabalho — o `seed.sql` não repõe catálogo desde a feature 21.
- **A janela de deploy.** A recusa medida no passo 6 do probe (`428C9`) protege a loja publicada e
  quebra o `/admin/menu` **antigo** enquanto o deploy da Vercel não sai. É custo declarado no cabeçalho
  da migration; a conferência em produção é do fecho.
- **Nada foi enviado ao projeto hospedado `hgkrsfpupypxtygjgthf`** por esta verificação.

## Como esta verificação foi conduzida

- **Árvore de trabalho intocada.** Nenhuma linha de código ou de teste foi escrita ou corrigida por
  mim. As 8 mutações foram aplicadas ao arquivo real, medidas e **desfeitas por cópia de backup**
  (nunca `git stash`, cuja pilha é compartilhada), com `git status --short` conferido vazio a cada
  passo e ao final — `git diff --stat` vazio no fecho.
- **Gate medido um workspace por vez**, com `echo "exit=$?"` fora de pipe, para o código de saída não
  ser o do `tail`. Os cinco passaram isolados.
- **A evidência do implementador foi lida, não reexecutada**, e está preservada acima com a marcação
  de origem. Ela não foi usada como prova de nada que eu não tenha ancorado por conta.

---

## UAT em navegador (390 × 1440)

> **Data**: 2026-09-06 · **HEAD**: `19ac788` · **Branch**: `feat/39-menu-configuravel` · **Worktree**:
> `C:\Projetos\uma-estrelinha\store-39-menu` · Chromium via `playwright-cli` 0.1.17.
>
> **Escopo estrito**: só o que o jsdom não alcança — largura, rolagem, sobreposição e recorte. Nenhuma
> linha de código, teste ou spec foi escrita ou corrigida por esta execução; `git status --short`
> vazio no início e no fecho. Fecha os dois riscos de entrega §1 (`NAV-04`) e §2 (`NAV-45`) da seção
> `I2.8`. **O risco §3 (a migration do zero) continua aberto e não foi tocado.**

### Como subiu — e por que NÃO foi nas portas 8082/8083

As portas 8082 e 8083 **já estavam ocupadas, e por outra árvore**: os servidores de dev que respondiam
ali servem `C:\Projetos\uma-estrelinha\store` (branch `feat/38-performance-mobile`), não este worktree.
Medido antes de qualquer coisa, por impressão digital do módulo servido:

| Prova | 8082/8083 (já de pé) | Este worktree |
| --- | --- | --- |
| `GET /src/widgets/header/ui/MegaMenu.tsx` | 5 × `hasPanel`, 4 × `MenuEntry`, 1 × `menuEntries` | 1 × `hasPanel`, 0 × `MenuEntry` |
| `GET /src/pages/admin/AdminMenuPage.tsx` | 1 × `vaga`, 0 × `MenuPanelEditor` | 2 × `MenuPanelEditor`, 2 × `MenuBannerEditor` |

Rodar a medição contra elas teria medido a feature **38**. Subi então os desta árvore em portas
livres, e derrubei só o que subi:

- loja: `pnpm --filter @estrelinha/store exec vite --port 8092 --strictPort` → `http://localhost:8092`
- painel: `VITE_STORE_URL=http://localhost:8092 pnpm --filter @estrelinha/backoffice exec vite --port
  8093 --strictPort` → `http://localhost:8093`
- Supabase local **já estava de pé** (`GET http://127.0.0.1:54341/rest/v1/` → `200`). Nada foi
  iniciado nem parado ali; **`supabase stop --all` não foi executado**.
- Login do painel: `admin@umaestrelinha.dev` / `admin123` (do `supabase/seed.sql:135-147`). Entrou na
  primeira tentativa.
- **Zero erro de console** nas duas aplicações durante toda a sessão (loja: 5 mensagens, 0 erros, 2
  avisos; painel: 10 mensagens, 0 erros, 5 avisos).

---

### A. `NAV-04` no computador (1440 × 900) — a faixa rola, e o painel não é cortado ✅

**Estado semeado (o que a loja entrega hoje)**: 3 itens na barra, `scrollWidth` **1280** =
`clientWidth` **1280** — não estoura, logo não prova nada. Para provocar o estouro liguei 14
categorias direto no banco (lista e desfazimento em *Estado do banco*, abaixo), chegando a **17
itens**.

| Medida | Antes (3 itens) | **Com 17 itens** | Veredito |
| --- | --- | --- | --- |
| `nav.scrollWidth` × `nav.clientWidth` | 1280 × 1280 | **2619 × 1280** | ✅ a faixa **estoura e rola** |
| `document.body.scrollWidth` × `clientWidth` | 1440 × 1440 | **1440 × 1440** | ✅ o `body` **não** rola |
| `documentElement.scrollWidth` × `clientWidth` | 1440 × 1440 | **1440 × 1440** | ✅ |
| `window.scrollX` | 0 | **0** | ✅ |
| `getComputedStyle(nav).overflowX` | — | `auto` | ✅ |

**Alcançar o último item — medido, não presumido.** Com `scrollLeft = 0`, o item "Sobre" fica em
`x = 2636..2683`, **fora** da caixa do `<nav>` (`80..1360`) — `ultimoVisivelNoNav: false`. Levando
`scrollLeft` ao fim: **1339**, que é exatamente `scrollWidth − clientWidth` (2619 − 1280), e o "Sobre"
passa a `1297..1344`, **dentro** do `<nav>` — `ultimoVisivelNoNav: true`, com `body` ainda 1440 × 1440.

**Gestos reais, não só `scrollLeft`:**

| Gesto | Resultado | Leitura |
| --- | --- | --- |
| roda **horizontal** sobre a faixa (`wheel(300, 0)`) | `nav.scrollLeft = 300`, `window.scrollX = 0` | ✅ trackpad e `shift`+roda rolam a faixa |
| roda **vertical** sobre a faixa (`wheel(0, 300)`) | `nav.scrollLeft = 0`, `window.scrollY = 300` | a página rola; a faixa não. O cabeçalho é `sticky`, então ela continua à vista |
| **teclado** — `focus()` no último item | `nav.scrollLeft = 1339`, item visível dentro do `<nav>` | ✅ tabular alcança o fim da faixa sem gesto de ponteiro |

Sem barra de rolagem consumindo layout: `nav.offsetHeight` **52** = `clientHeight` **52** e
`offsetWidth` **1280** = `clientWidth` **1280** (barra em sobreposição neste Chromium).

**O painel do mega menu NÃO é cortado — a parte não óbvia, e ela passa.** Com os 17 itens e o painel
de "Joias afetivas" aberto:

- o painel **é descendente do `<nav>` no DOM** (`nav.contains(painel) === true`), e o ancestral que
  clipa mais próximo é o próprio `<nav>`, com `overflow-x: auto` e **`overflow-y: auto`** (o `visible`
  computa para `auto` quando o outro eixo não é `visible`);
- e mesmo assim ele desenha em **`[x=0, y=136, w=1440, h=349]`** — mais largo que o `<nav>`
  (`80..1360`) e **abaixo** dele (`84..136`), com `scrollHeight` **348** = `clientHeight` **348** (não
  há recorte interno). É o `absolute` cujo bloco contentor é o `<header>`, exatamente como o
  comentário de `Header.tsx:213-218` prevê;
- **prova por hit-test, não por retângulo**: `document.elementFromPoint` em `(40, 300)` e
  `(1400, 300)` — os dois **fora** da faixa horizontal do `<nav>` — devolve o `div` do painel; em
  `(700, 470)` devolve o `container` interno. O primeiro link (`ver tudo em Joias afetivas`,
  `[96,168,480,18]`) e o último (`[1024,168,320,62]`) devolvem a si mesmos no centro: **13 links,
  todos clicáveis**.

*Observação sem AC*: rolar a faixa por script com o painel aberto **fecha** o painel — o ponteiro deixa
a entrada e o fechamento por `pointerleave` dispara. É comportamento de hover, não recorte.

---

### B. `NAV-04` no celular (390 × 844) — nada rola na horizontal ✅

Folha do menu aberta, acordeão "Joias afetivas" (a única categoria com banner semeado) expandido e
fechado de novo. Três medições na mesma sessão:

| Medida | fechado | **aberto** | refechado |
| --- | --- | --- | --- |
| `body.scrollWidth` × `clientWidth` | 390 × 390 | **390 × 390** | 390 × 390 |
| `documentElement.scrollWidth` × `clientWidth` | 390 × 390 | **390 × 390** | 390 × 390 |
| `window.scrollX` | 0 | **0** | 0 |
| `dialog.scrollWidth` × `clientWidth` | 390 × 390 | **390 × 390** | 390 × 390 |
| banners `[data-testid="mobile-menu-banner"]` | **0** | **1** | **0** |
| alvos de toque na `nav[aria-label="Coleções"]` | 3 | **16** | 3 |
| menor altura medida | 56 | **44,0** | 56 |
| alvos abaixo de 44px | **0** | **0** | **0** |
| alvo cuja borda direita passa de 390 | **0** | **0** (máx. 370) | **0** |

- **O banner vive dentro do acordeão** (`NAV-36`): retângulo `[32, 704, 338, 47]`, e
  `nav[aria-label="Coleções"].contains(banner) === true`. Ele **não existe no DOM** com o acordeão
  fechado, e some de novo ao fechar — 0 → 1 → 0.
- **Alvos de toque**: as 12 filhas e o "ver tudo em Joias afetivas →" medem **44,0px** de altura por
  `getBoundingClientRect`; os três botões de primeiro nível medem **56**; o banner, 47. Largura 338 ou
  350, borda direita máxima **370** numa viewport de 390.
- **Varredura de rolagem horizontal dentro da folha**: os únicos nós com `scrollWidth > clientWidth`
  são dois `sr-only` (`clientWidth: 1`, `overflow-x: hidden`) e o botão "Fechar menu", cujo
  pseudo-elemento de 44px (`before:`, o `TAP_44`) transborda a caixa de 36px com
  `overflow-x: visible`. **Nenhum deles chega ao `body`**, que fica em 390 × 390 nas três etapas.
- A faixa de departamentos em 390: presente no DOM, mas com o invólucro (`hidden bg-estrelinha-primary
  md:block`) em `display: none`, retângulo **0 × 0** e `checkVisibility() === false`.

---

### C. As bordas que só o navegador mostra ✅

**Menu vazio na superfície do computador.** Desliguei **tudo**: `menu_desktop = false` nas 34
categorias marcadas **e** `desktop: false` nos dois itens de link (sem isso a barra continuaria com o
"Sobre" e o caso não seria o vazio). Em 1440:

| Medida | Com menu | **Vazio** |
| --- | --- | --- |
| `nav[aria-label="Departamentos"]` no DOM | presente | **ausente** |
| altura do `<header>` | 136 (84 + 52) | **84** |
| filhos diretos do `<header>` | 2 | **1** |
| marca, busca e ações | presentes | **presentes** — `"O que você está procurando?"`, `Buscar`, `Entrar`, `Carrinho`, `Abrir menu` |
| `body.scrollWidth` × `clientWidth` | 1440 × 1440 | **1440 × 1440** |

**Não sobra faixa de altura zero**: o header perde os 52px inteiros e volta a ter um único filho
direto. Estado desfeito em seguida.

**Item de link com destino externo.** Criado **pela tela**, não por SQL: `/admin/menu` → "Adicionar um
link" → rótulo `Instagram UAT`, destino `https://www.instagram.com/umaestrelinha`. A gravação foi
aceita (`sort_order: 101`, `desktop: true`, `mobile: true`), o que exercita `NAV-09`/`NAV-10` de ponta
a ponta. No DOM renderizado da loja:

| Superfície | `href` | `target` | `rel` |
| --- | --- | --- | --- |
| barra do computador (1440) | `https://www.instagram.com/umaestrelinha` | **`_blank`** | **`noopener noreferrer`** |
| folha do celular (390) | `https://www.instagram.com/umaestrelinha` | **`_blank`** | **`noopener noreferrer`** |

O link foi apagado no desfazimento.

---

### D. `NAV-45` — a prévia é 390 **escalado**, não encolhido ✅

Em `/admin/menu`, com o painel logado. O sinal barato que a `I2.8 §2` nomeia — a barra de
departamentos, que é `hidden md:block`, **tem de sumir** — foi medido pelo lado de **dentro** do
iframe, e não por aparência:

| Medida | aba **Computador** | aba **Celular** (painel a 1440) | aba **Celular** (painel a **1000 × 620**) |
| --- | --- | --- | --- |
| atributo `width` × `height` | 1024 × 768 | **390 × 844** | **390 × 844** |
| `offsetWidth` × `offsetHeight` | 1024 × 768 | **390 × 844** | **390 × 844** |
| `style.transform` | `scale(0.591797)` | `scale(1)` | **`scale(0.451422)`** |
| `transform-origin` | `0px 0px` | `0px 0px` | `0px 0px` |
| retângulo **visual** | 606 × 455 | 390 × 844 | **176 × 381** |
| `window.innerWidth` **dentro** | 1024 | **390** | **390** |
| `matchMedia('(min-width: 768px)')` dentro | **true** | **false** | **false** |
| faixa de departamentos dentro | visível, `[0, 84, 1024, 52]` | **`display: none`, 0 × 0, `checkVisibility() = false`** | **`display: none`, 0 × 0, `checkVisibility() = false`** |
| `body.scrollWidth` dentro | 1024 | **390** | **390** |

**A terceira coluna é a que fecha a AC.** Com a janela do painel em 1000 × 620 o palco não comporta os
390 e a escala cai para **0,451422**, mas o `iframe` continua medindo **390 × 844** e a loja lá dentro
continua reportando `innerWidth = 390` com a media query de `md` **falsa**. Se fosse encolhimento por
CSS, `innerWidth` continuaria 1024 e a barra apareceria. O `scale(1)` da segunda coluna não é constante
cravada: é o valor calculado quando o palco cabe — e as outras duas colunas provam o cálculo vivo, em
dois valores diferentes.

`src` do iframe: `http://localhost:8092/?preview=1`.

---

### Estado do banco — devolvido, e provado pela mesma consulta

**O que mexi**, tudo no Postgres local `54342` (nada foi enviado ao projeto hospedado):

1. `update public.categories set menu_desktop = true where slug in (…)` — **14 slugs**: `aneis`,
   `berloques`, `brincos1`, `colar-e-correntes`, `colares-afetivos`, `corrente`, `pingentes1`,
   `pingentes-afetivos`, `pulseiras1`, `pulseiras-afetivas`, `amuletos`, `botanicas`,
   `joias-codigo-morse`, `colecao-fragmentos`.
2. `update public.categories set menu_desktop = false where menu_desktop` (34 linhas) — a borda do
   menu vazio.
3. `store_settings.menu`: `desktop: false` nos dois links, e o item `Instagram UAT` criado pela tela.
4. `menu_mobile` **nunca foi tocado** em nenhum momento.

**Desfazimento e prova:**

| Prova | Antes | Depois |
| --- | --- | --- |
| `md5(string_agg(id‖menu_desktop‖menu_mobile))` sobre `categories` | `f0f8a9ca3f0616b533a44335eb64f310` | **`f0f8a9ca3f0616b533a44335eb64f310`** |
| `diff` do dump completo das 37 categorias (slug, pai, as duas booleanas, `active`) | — | **idêntico byte a byte** |
| `store_settings.menu` | `{"links": [{"id": "sobre", …, "desktop": true, "sort_order": 100}]}` | **string idêntica** |
| render da loja em 1440 | 3 itens, `scrollWidth` 1280 = `clientWidth` 1280 | **3 itens, 1280 = 1280** |
| `git status --short` | vazio | **vazio** |

---

### O que esta execução NÃO prova

- **A migration do zero** (`I2.8 §3`) segue aberta, e não foi tocada: `supabase db reset` apagaria o
  catálogo real da máquina de trabalho. Continua precisando de banco descartável.
- **Aparelho real.** Tudo acima foi medido em Chromium de desktop com a viewport redimensionada para
  390 × 844. Rolagem por inércia, barra de navegação do sistema e `100vh` no iOS Safari **não** foram
  exercitados — o que se prova é geometria e recorte, não gesto de toque de verdade.
- **A afordância da rolagem da faixa para quem só tem mouse.** A barra de rolagem é em sobreposição
  (`offsetHeight` = `clientHeight`) e a roda **vertical** sobre a faixa rola a página, não a faixa.
  Sobram `shift`+roda, trackpad horizontal, teclado e arrastar a barra em sobreposição. Nenhuma AC
  pede afordância visual, e por isso **não reprovo** — registro como observação de produto: com a
  faixa cheia, no computador com mouse, não há pista de que há mais item à direita.
- **`NAV-39`, `NAV-41`, `NAV-42`, `NAV-46`** — as ressalvas de precisão da `I2.9` continuam como
  estavam; não são de layout e estavam fora deste escopo.

### Veredito do UAT

**PASS ✅ — nenhum defeito de layout encontrado.** Os dois riscos de entrega de navegador estão
fechados com número medido: a faixa **estoura e rola** (2619 × 1280) sem que o `body` saia de
1440 × 1440, o último item é alcançável (`scrollLeft` 1339, o item indo de `2636` para `1297`), o
painel do mega menu **não é cortado** apesar de morar dentro do container que rola (hit-test em
`x = 40` e `x = 1400`), o celular não rola na horizontal em nenhuma das três etapas (390 × 390), o
banner só existe com o acordeão aberto, todo alvo mede **≥ 44px**, e a prévia é **390 escalado** —
provado com duas escalas diferentes (`0,591797` e `0,451422`) enquanto o `iframe` fica em 390 e a
media query de `md` continua falsa lá dentro.
