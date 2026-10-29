# 86 — O menu montado pela dona: Validation

**Date**: 2026-10-28
**Spec**: `.specs/features/86-menu-montado-pela-dona/spec.md`
**Diff range**: working tree contra `d101ca2f` (sem commits). 49 arquivos rastreados alterados (+1926 / −3495) e os não rastreados de `core/menu` (`structure.ts`, `refusals.ts` e 4 testes), `store-menu` (`documentOps`, `useStoreMenu`, `paginasDaLoja`, `textosDoMenu`, `MenuTree`, `MenuTargetPicker`, `MenuItemEditor`, `MenuRemoveConfirm` e testes) e da loja (`menuDocumentoComDonoUnico`, `HeaderMenuDocumento`, `MenuDocumentoReal`).
**Verifier**: sub-agente independente (autor ≠ verificador). Nenhum arquivo de produto ou de teste foi alterado; as mutações foram temporárias, restauradas por cópia e conferidas por SHA-256.

## Veredito final (2026-10-29): ✅ PASS com fecho de lacunas

Três rodadas do Verificador, as três FAIL só por cobertura e nenhuma por defeito de produto. As três lacunas da r3 (F16, F17, F25) foram fechadas sem rodada 4 (precedente da `72`, da `73` e da `83`), com os mutantes reinjetados e mortos por asserção. Detalhe na seção *Fecho das lacunas da r3*, no fim. O fecho foi feito por implementador, não por Verifier.

---

## Veredito: ❌ FAIL — por cobertura, não por defeito de produto

O produto faz o que a spec pede em todo AC que verifiquei. O gate bate o `tasks.md` exatamente. O probe de gravação, rodado de novo por mim contra o banco local, dá 15/15 `ok`. Dos 38 mutantes de comportamento, 36 morreram por asserção e **2 sobreviveram**. Os dois caem sobre ACs da spec (MNM-37 e MNM-30), e pela régua do `validate.md` um mutante sobrevivente vira tarefa de correção antes de fechar a feature.

---

## Task Completion

Todas as tasks de T01 a T23 estão ✅ no `tasks.md`. A queda de T20 está declarada (backoffice −66/−4, mais +2 portados), com uma tabela que diz onde cada caso reaparece. Nenhuma task está parcial nem bloqueada.

---

## Spec-Anchored Acceptance Criteria

| AC | Resultado definido pela spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| MNM-01 | linha com nome, tipo, destino, ícone, chaves, contagem do submenu | `MenuTree.test.tsx:91` (bloco MNM-01/03); `AdminMenuPage.test.tsx:221` — `expect(linhas).toEqual(['item-n-chaveiros','item-n-presentes','item-n-sobre'])`; `:236` contagem `'3 no computador · 2 no celular'` | ✅ |
| MNM-02 | submenu na ordem gravada | `MenuTree.test.tsx:172` (bloco MNM-02/23/24) | ✅ |
| MNM-03 | categoria fora do menu não aparece | `AdminMenuPage.test.tsx:225-226` — `queryByText('Coleção extra 3')`/`('Joias')` `toBeNull()` (37 categorias, 3 linhas) | ✅ |
| MNM-04 | vazio com "Adicionar item ao menu" | `AdminMenuPage.test.tsx:253` — `getByTestId('menu-vazio')` + abre o seletor | ✅ |
| MNM-05 | falha de leitura ⇒ faixa com "Tentar de novo", nunca o vazio | `AdminMenuPage.test.tsx:261` — `menu-erro` presente, `menu-vazio` null, retry relê; `useStoreMenu.test.ts:155` | ✅ |
| MNM-06 | 390 sem rolagem horizontal; alvos ≥ 44 | `MenuTree.test.tsx:311` (token exato), `MenuTargetPicker.test.tsx:236`; layout em `prova-navegador.md` §(c) (390 = 390, nenhum controle da lista abaixo de 44) | ✅ (o layout é provado em navegador, não em jsdom) |
| MNM-07 | seletor com abas Categoria (busca, caminho, inativa) e Página da loja | `MenuTargetPicker.test.tsx:55`; M35 (selo "Inativa" removido) morto | ✅ |
| MNM-08 | entra no FIM, nome da categoria, sem ícone, nos dois dispositivos | `AdminMenuPage.test.tsx:296-297` — `items.at(-1)` `toMatchObject({label:null, icon:null, desktop:true, mobile:true})`; M10 morto | ✅ |
| MNM-09 | submenu nasce com as subcategorias ATIVAS, na ordem da árvore | `AdminMenuPage.test.tsx:298` — `toEqual(['aneis','colares','pulseiras'])` (a inativa `antiga` fica fora); M09 morto | ✅ ⚠️ ver gap de precisão 3 |
| MNM-10 | "Já está no menu", não escolhível | `AdminMenuPage.test.tsx:331` — `motivo-chaveiros` + `toBeDisabled()`; M23 morto | ✅ |
| MNM-11 | página com o nome sugerido (editável) e o endereço | `AdminMenuPage.test.tsx:338` — `toMatchObject({target:{kind:'link',href:'/perguntas-frequentes'},label:'Perguntas frequentes'})` | ✅ |
| MNM-12 | recusa não-rota, externo, vazio, com motivo legível | `AdminMenuPage.test.tsx:351` (externo, zero escrita); `refusals.test.ts:46`; M13 morto | ✅ |
| MNM-13 | a prévia mostra o item sem recarregar o iframe | `AdminMenuPage.test.tsx:310` — rascunho com 4 itens + `open` = id novo; VIV-03 `expect(quadro()).toBe(antes)` | ✅ |
| MNM-14 | "Usar o nome da categoria" + nome próprio até 40 com contador | `MenuItemEditor.test.tsx:99`; `refusals.test.ts:25`; M26 morto | ✅ |
| MNM-15 | rename em `/admin/categorias` ⇒ a loja mostra o nome novo | `structureMenuItems.test.ts:186` — `toBe('Joias finas')` pela porta; M03 morto em core (11), loja (15) e painel (5) | ✅ (provado na porta que a loja chama; não há caso pelo `Header` com rename) |
| MNM-16 | vazio/só espaços recusado com motivo | `AdminMenuPage.test.tsx:389` — `editor-recusa` + zero escrita; `MenuItemEditor.test.tsx:139` | ✅ |
| MNM-17 | ícone escolhido/tirado é o que a loja desenha | `AdminMenuPage.test.tsx:380` grava `icon:'gota-afetiva'` no nó; `structureMenuItems.test.ts` (ícone via `menuIconKey`) | ✅ |
| MNM-18 | a ordem vale na loja; **nenhuma** `sort_order` de `categories` muda | por comportamento: o `afterEach` de `AdminMenuPage.test.tsx:213` cobra `escritasEm('categories')).toEqual([])` em todos os 45 casos; `useStoreMenu.test.ts:366` com sensor; **probe** (rodado de novo por mim, exit 0): retrato md5 das 37 linhas igual antes e depois, com sensor; guarda `menuDocumentoComDonoUnico` régua 4 | ✅ |
| MNM-19 | "Mover…" desabilitado nas pontas | `MenuTree.test.tsx:245`; `documentOps.test.ts:147`; M11 morto | ✅ |
| MNM-20 | confirmação nomeia o item e quantos saem junto | `AdminMenuPage.test.tsx:451-453` — `'Remover “Presentes” do menu?'`, `'Os 2 itens do submenu saem junto.'`; M16 morto | ✅ |
| MNM-21 | a categoria fica intocada e volta a ser escolhível | `AdminMenuPage.test.tsx:471` — `opcao-categoria-chaveiros` `toBeEnabled()` | ✅ |
| MNM-22 | "Adicionar ao submenu" com o mesmo seletor | `AdminMenuPage.test.tsx:490` | ✅ |
| MNM-23 | reordenar/remover no submenu, sem confirmação | `AdminMenuPage.test.tsx:432` (↑↓) e `:479` (`confirmar-remocao` null) | ✅ |
| MNM-24 | a 24, desabilitado com "O submenu tem o máximo de 24 itens" | `MenuTree.test.tsx:172`; M33 e M14 mortos | ✅ |
| MNM-25 | "Já está neste submenu" | `AdminMenuPage.test.tsx:494`; `refusals.test.ts:130`; M30 morto | ✅ |
| MNM-26 | filho de categoria tem "Usar o nome da categoria" | `MenuItemEditor.test.tsx:206` | ✅ |
| MNM-27 | submenu **ou** banner ⇒ seta e painel; sem os dois, link direto (também para link) | `structureMenuItems.test.ts:247-280`; `MenuDocumentoReal.test.tsx:114` (Header real, link só com banner); M02, M18, M24 e M37 mortos | ✅ |
| MNM-28 | "Celular" desligado ⇒ some só da folha | `AdminMenuPage.test.tsx:509` (`mobile:false` gravado); `structureMenuItems.test.ts:209`; M01 morto | ✅ |
| MNM-29 | filho desligado num dispositivo ⇒ só aquele painel o perde | `structureMenuItems.test.ts:219` — `children` `toEqual([])` × `['Anéis']`; M20 morto (só em core) | ✅ |
| MNM-30 | desligado nos dois ⇒ **esmaecido** + "Fora do menu"; a loja não mostra | `MenuTree.test.tsx:157` — o caso se chama "esmaecido e com “Fora do menu”", mas só confere o selo; `structureMenuItems.test.ts:214` (a loja não mostra) | ❌ **GAP**: M36 (o `opacity-60` removido) **sobreviveu** |
| MNM-31 | link externo já gravado continua lido, editável, não criável | `refusals.test.ts:150`; `structureMenuItems.test.ts` (externo marcado) | ✅ ⚠️ a edição do nome de um externo legado não tem caso pela página |
| MNM-32 | o alternador troca só a prévia | `AdminMenuPage.test.tsx:516` — largura 1024 para 390, lista e contagem iguais | ✅ |
| MNM-33 | banners por item (categoria **e** link) | `AdminMenuPage.test.tsx:399`; `MenuBannerEditor.test.tsx:108`; `MenuDocumentoReal.test.tsx:164` | ✅ |
| MNM-34 | os banners legados aparecem no item e vão gravados na 1ª ação | `legacy.test.ts` (MNM-34); M21 morto em core (3) e na loja (1), **sobrevive no painel** (246/246) | ✅ (por construção: o painel grava `proximo.items` do documento convertido; ver gap 3) |
| MNM-35 | inativa: some da loja (com o submenu); selo na tela | `structureMenuItems.test.ts:228`; `MenuTree.test.tsx:294`; M19 e M22 mortos | ✅ |
| MNM-36 | apagada: some da loja; "Categoria apagada" com a única ação "Remover do menu" | `MenuTree.test.tsx:300` — `toEqual(['Remover do menu'])`; `structure.test.ts:103`; `structureMenuItems.test.ts:233` | ✅ |
| MNM-37 | segunda gravação recusa ("O menu mudou em outra janela — recarregue") | `AdminMenuPage.test.tsx:530` (frase, faixa, rollback, sem `salvo`); `:316` (filtros `key`+`updated_at`); `useStoreMenu.test.ts:169`; probe (0 linhas com `updated_at` velho); M06 e M08 mortos | ⚠️ **GAP**: a saída do conflito ("Recarregar" limpa a faixa) não tem asserção; M34 **sobreviveu** |
| MNM-38 | falha ⇒ volta ao estado anterior e diz que não salvou; nunca `Salvo` | `AdminMenuPage.test.tsx:546` — `title:'Não salvou'`, `aria-pressed` volta a `true`, `salvo` null; `useStoreMenu.test.ts:246`; M07 e M38 mortos | ✅ |
| MNM-39 | 20 itens: a barra rola, a tela não recusa | `structureMenuItems.test.ts:202` (20 ⇒ 20); `menuSemTeto.test.ts` (superfície `MenuTree.tsx`) | ✅ |
| MNM-40 | a conversão repetida dá o mesmo documento | `legacy.test.ts:138` | ✅ |
| MNM-41 | escrita só com `has_role(admin)`; leitura pública só do que a loja desenha | probe: `anon não grava (status 200, 0 linhas)` e o menu intacto | ✅ escrita · ⚠️ precisão da leitura (gap 4) |

### Success Criteria

| Critério | Evidência | Resultado |
| --- | --- | --- |
| A tela nunca lista categoria fora do menu | MNM-03 (`AdminMenuPage.test.tsx:225`, `MenuTree.test.tsx:91`) | ✅ |
| Reordenar deixa `categories.sort_order` byte a byte igual (probe) | `probes/01-gravacao.mjs`, rodado de novo por mim: 15/15 `ok`, exit 0, retrato com sensor | ✅ |
| No deploy, a barra e a folha ficam idênticas às de antes | `structureMenuItems.test.ts` (equivalência item a item com `legacyMenuItems`, nas duas superfícies, sobre a árvore real da 16/39, inclusive o `href` dos filhos); `prova-navegador.md` §(a) (`diff` vazio contra o `menuItems` de `d101ca2f` sobre o banco local); M04 e M31 mortos | ✅ local. A produção não foi medida, o que é esperado antes do deploy. |
| Fiação pela página real | `AdminMenuPage.test.tsx` monta a `AdminMenuPage` real (só o client dublado; o dublê registra tabela, método e argumentos); `MenuDocumentoReal.test.tsx` monta o `Header` real com `useMenu`/`useMenuBanners`/`useCategories`/`useStoreSettings`/`useMenuPreview` reais | ✅ |

**Status**: ❌ dois ACs com mutante sobrevivente (MNM-30, MNM-37) · ⚠️ três gaps de precisão da spec.

---

## Gate Check

Um workspace por vez, exit code capturado fora de pipe, `--testTimeout=20000` sem o `--`:

| Medida | Comando | Resultado | Exit | `tasks.md` |
| --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | **4878 / 190** | 0 | 4878/190 ✅ |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **4343 / 242** | 0 | 4343/242 ✅ |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | **6216 / 333** | 0 | 6216/333 ✅ |
| tsc store | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | 0 | 0 | ✅ |
| tsc backoffice | `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` | 0 | 0 | ✅ |
| tsc core | `npx tsc --noEmit -p packages/core/tsconfig.json` | 11 (exit 2) | 2 | os 11 herdados, nenhum em `menu/` ✅ |

Os 11 erros de `core` estão em `home/__tests__/carousel` (5), `pickHomeBanners` (1), `pickHomeCollections` (1), `sitemap/__tests__/urls` (2) e `packages/supabase/src/client.ts` (2). São idênticos à baseline.

- **Contagem antes → depois**: core 4767 → 4878 (+111) · backoffice 4301 → 4343 (+42, já com a queda declarada de −66) · store 6176 → 6216 (+40). Nada pulado e nada falhando.
- **Probe**: `node .specs/features/86-menu-montado-pela-dona/probes/01-gravacao.mjs` rodou de novo, com 15 `ok` e exit 0, e restaurou `store_settings.menu`.
- Não rodei lint nem `pnpm build`. O `tasks.md` registra lint 2/2 · 23/5 e o build verde.

---

## Discrimination Sensor

**Profundidade**: expandida. São 38 mutações de comportamento em arquivos reais de produção, uma por vez. Para cada uma rodei as suítes relevantes: `core src/menu`, depois `backoffice src/features/store-menu` com `AdminMenuPage.test.tsx`, depois `store` com `widgets/header`, `widgets/mobile-menu`, `useMenu.test.tsx`, `entities/menu` e `widgets/store-layout`. O arnês falha se o trecho-alvo não aparecer exatamente uma vez, restaura o arquivo por cópia e confere o SHA-256: `sha_ok = true` nas 38. Classifiquei a morte de cada mutante como por asserção ou por compilação; nenhuma foi por compilação.

| # | Arquivo | Mutação | core | painel | loja | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| M01 | `structure.ts` | `menuItems` ignora a chave da superfície | 7✗ | — | 4✗ | morto |
| M02 | `structure.ts` | `hasPanel` só para categoria | 1✗ | — | 4✗ | morto |
| M03 | `structure.ts` | `label: null` usa o slug, não o nome | 11✗ | 5✗ | 15✗ | morto |
| M04 | `structure.ts` | `legacyMenuDocument` troca desktop/mobile | 6✗ | — | 13✗ | morto |
| M05 | `structure.ts` | `parseMenuDocument` aceita `version: 1` | 2✗ | — | 1✗ | morto |
| M06 | `useStoreMenu.ts` | sem `.eq('updated_at', visto)` | — | 5✗ | — | morto |
| M07 | `useStoreMenu.ts` | falha de gravação mostra `saved` | — | 2✗ | — | morto |
| M08 | `useStoreMenu.ts` | conflito sem rollback | — | 2✗ | — | morto |
| M09 | `documentOps.ts` | `addRootNode` com filhas inativas | — | 2✗ | — | morto |
| M10 | `documentOps.ts` | `addRootNode` entra no começo | — | 5✗ | — | morto |
| M11 | `documentOps.ts` | `moveNode` aceita destino além da ponta | — | 2✗ | — | morto |
| M12 | `documentOps.ts` | remover a raiz promove o submenu em vez de levá-lo | — | 2✗ | — | morto |
| M13 | `refusals.ts` | `internalMenuHrefRefusal` aceita `https://` | 3✗ | 2✗ | — | morto |
| M14 | `refusals.ts` | sem o teto de 24 | 1✗ | 0 | — | morto (só em core) |
| M15 | `refusals.ts` | categoria repetida na raiz aceita | 1✗ | 0 | — | morto (só em core) |
| M16 | `textosDoMenu.ts` | a confirmação sem a contagem | — | 3✗ | — | morto |
| M17 | `useMenu.ts` | o rascunho da prévia é ignorado | — | — | 5✗ | morto |
| M18 | `MegaMenu.tsx` | painel só para categoria | — | — | 2✗ | morto |
| M19 | `structure.ts` | raiz de categoria inativa aparece | 2✗ | — | 0 | morto (só em core) |
| M20 | `structure.ts` | filho não filtrado por superfície | 3✗ | — | 0 | morto (só em core) |
| M21 | `structure.ts` | o legado não copia os banners | 3✗ | 0 | 1✗ | morto (não no painel) |
| M22 | `MenuTree.tsx` | sem o selo de inativa/apagada | — | 2✗ | — | morto |
| M23 | `AdminMenuPage.tsx` | `usadas` vazio (some "Já está no menu") | — | 2✗ | — | morto |
| M24 | `MobileMenu.tsx` | painel decidido por `kind` | — | — | 3✗ | morto |
| M25 | `useStoreMenu.ts` | sem a recusa local antes da rede | — | 1✗ | — | morto |
| M26 | `refusals.ts` | sem o teto de 40 do nome | 2✗ | 2✗ | — | morto |
| M27 | `structure.ts` | `categoryHref` sobre todas as categorias (pai inativo na URL) | 2✗ | — | 0 | morto (só em core) |
| M28 | `structure.ts` | chave de superfície ausente vira ligada | 1✗ | — | 0 | morto |
| M29 | `structure.ts` | o rótulo próprio não é aparado | 2✗ | 0 | 0 | morto |
| M30 | `refusals.ts` | repetida no MESMO submenu aceita | 1✗ | 0 | — | morto |
| M31 | `structure.ts` | filhos do legado fora da ordem da árvore | 1✗ | — | 0 | morto |
| M32 | `MenuTree.tsx` | sem o selo "Fora do menu" | — | 1✗ | — | morto |
| M33 | `MenuTree.tsx` | "Adicionar ao submenu" só desabilita acima de 24 | — | 1✗ | — | morto |
| **M34** | `useStoreMenu.ts:262` | `reload()` não limpa `conflict` | — | **0** | — | ❌ **sobreviveu** |
| M35 | `MenuTargetPicker.tsx` | sem o selo "Inativa" | — | 1✗ | — | morto |
| **M36** | `MenuTree.tsx` | sem o esmaecimento (`opacity-60`) do item fora do menu | — | **0** | — | ❌ **sobreviveu** |
| M37 | `structure.ts` | banners nulos para item de link | 1✗ | — | 3✗ | morto |
| M38 | `useStoreMenu.ts` | resposta sem `updated_at` aceita como sucesso | — | 1✗ | — | morto |

**Resultado**: 38 injetados, 36 mortos (todos por asserção), 2 sobreviventes. ❌

**O que os mortos "só em core" querem dizer**: M14, M15, M19, M20, M27, M28, M29, M30 e M31 deixam a suíte da loja e/ou a do painel verdes. Isso é aceitável porque a regra mora uma vez só, em `core`, e a fiação está provada por M01, M03 e M04, que morrem na loja. Ainda assim, os gates de loja e painel sozinhos não protegem essas regras. Qualquer mudança em `core/menu` precisa da suíte de `core` no gate. É o que o Gate "Full" do `tasks.md` já manda fazer.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo / mudanças cirúrgicas | ✅ a tela antiga foi apagada em vez de mantida, e sem migration |
| Sem escopo além do pedido | ✅. O conserto da prévia do celular em `StoreLayout.tsx` saiu do escopo, mas está declarado, tem teste e era pré-condição da prova. |
| Segue os padrões | ✅ `string \| null` nas recusas, `.ts` explícito em `structure.ts`/`refusals.ts`, `menu.ts` sem importar `structure.ts` |
| Spec-anchored | ⚠️ veja os gaps |
| Testes mapeiam AC | ✅ todos os arquivos novos citam MNM-xx |
| Diretrizes seguidas | `CLAUDE.md` raiz (guardas com âncora e sensor, página real, um workspace por vez) ✅ |

---

## Edge Cases

- [x] Duas abas (MNM-37): o conflito é detectado e a página e o probe o provam. Falta provar que se sai dele (gap 1).
- [x] Falha de gravação (MNM-38)
- [x] 20 itens (MNM-39)
- [x] Conversão idempotente (MNM-40)
- [ ] Categoria com mais de 24 subcategorias ativas, ou um legado com mais de 24 filhas marcadas: a spec não define o que acontece (gap 3)

---

## Ranked gaps

1. **MNM-37: sair do conflito não tem prova.** O mutante M34 sobreviveu (`useStoreMenu.ts:262`, `setConflict(false)` apagado).
   - **Consequência real**: depois de "Recarregar", a faixa "O menu mudou em outra janela" ficaria na tela para sempre, sobre o menu já relido. `setConflict(false)` é a única linha que limpa o estado.
   - **Correção**: em `AdminMenuPage.test.tsx`, no caso de conflito (`:530`), trocar `db.escrita` para sucesso e clicar em `within(screen.getByTestId('menu-conflito')).getByRole('button', { name: 'Recarregar' })`. Depois cobrar `await waitFor(() => expect(screen.queryByTestId('menu-conflito')).toBeNull())` e que uma nova ação grava com o `updated_at` relido.
   - Opcionalmente, um par em `useStoreMenu.test.ts`: conflito, `reload()`, `expect(result.current.conflict).toBe(false)`.

2. **MNM-30: o "esmaecido" não tem asserção.** O mutante M36 sobreviveu (`MenuTree.tsx`, `fora && 'opacity-60'` removido). O caso `MenuTree.test.tsx:157` se chama "esmaecido e com “Fora do menu”", mas só cobra o selo. É um teste que afirma uma sensibilidade que não tem.
   - **Correção**: no mesmo caso, cobrar o token exato na linha do item, `expect(within(screen.getByTestId('item-n-sobre')).getByText(...).closest('div')!.className.split(/\s+/)).toContain('opacity-60')`. Melhor ainda é marcar o contêiner da linha com um `data-testid` e asserir nele, sem subir o DOM a partir do texto.
   - Junto, o inverso: um item ligado num dispositivo **não** tem `opacity-60`.

3. **⚠️ Precisão da spec: MNM-09 contra MNM-24.** A spec manda que "todas as subcategorias ativas" entrem e também põe o teto de 24.
   - Hoje uma categoria com 25 ou mais filhas ativas não pode ser adicionada: `menuDocumentRefusal` recusa o documento inteiro com "O submenu tem o máximo de 24 itens".
   - Pior: um legado convertido com mais de 24 filhas marcadas trava toda ação, inclusive "tirar um filho", porque 30 → 29 continua acima do teto. A única saída seria remover a raiz.
   - Medido no banco local, o máximo de filhas ativas é 11, então o risco hoje é baixo.
   - **Correção**: decidir na spec entre cortar nas 24 primeiras com aviso ou recusar com o motivo. Também faltam a régua "recusar só quando a op AUMENTA o submenu acima de 24" e um caso em `documentOps.test.ts` ou `useStoreMenu.test.ts` com um documento de 30 filhos em que remover um passa.

4. **⚠️ Precisão da spec: a leitura de MNM-41.** "Leitura pública só do que a loja desenha" não se cumpre ao pé da letra.
   - `store_settings.menu` é público e inteiro: nós desligados nos dois dispositivos, nós de categoria inativa ou apagada, nomes próprios e os `links` legados preservados.
   - Nada disso é sensível, e o design o aceita. Mas a frase da spec é mais forte que a implementação, e nenhum teste a mede.
   - **Correção**: reescrever a frase da spec ("a leitura pública é a do documento inteiro, que só contém curadoria de menu"). Restringir a leitura exigiria migration.

5. **Menor, MNM-34 no painel.** O mutante M21 (o legado sem os banners) passa na suíte do painel. A garantia vem por construção, porque o painel grava o documento convertido, e `core` e a loja o pegam.
   - **Correção**: um caso em `useStoreMenu.test.ts` com `menu_banners` numa categoria legada. A primeira `apply` deve gravar `items[0].banners` igual ao jsonb da coluna.

6. **Menor, MNM-31 pela tela.** Falta um caso de página com um link externo legado no documento: editar o nome grava, reordenar grava, e o seletor não oferece criar outro externo. Hoje só a régua de `core` o prova (`refusals.test.ts:150`).

---

## Fix Plans

| Fix | O quê | Onde | Done when |
| --- | --- | --- | --- |
| F01 | "Recarregar" sai do conflito | `AdminMenuPage.test.tsx` (+ par em `useStoreMenu.test.ts`) | M34 reinjetado morre por asserção |
| F02 | o esmaecido de "Fora do menu" com régua | `MenuTree.test.tsx:157` | M36 reinjetado morre; o inverso passa |
| F03 | decisão sobre o teto × as filhas (gap 3) | `spec.md` + `refusals.ts`/`documentOps.ts` + teste | a spec decide; com 30 filhos, remover um grava |
| F04 | frase de MNM-41 | `spec.md` | texto alinhado ao que o banco serve |
| F05/F06 | MNM-34 e MNM-31 pela tela | `useStoreMenu.test.ts`, `AdminMenuPage.test.tsx` | M21 morre também no painel |

Prioridade: F01 e F02 são o que reprova a rodada. F03 e F04 são decisões de spec. F05 e F06 são reforço.

---

## Conferência final do working tree

- Os 68 caminhos alterados ou não rastreados do início têm o mesmo SHA-256 no fim. Os 38 arquivos mutados foram restaurados (`sha_ok` em todos), e não sobrou nenhum `bak_*`.
- `git status --short` mudou só em `docs/qa/**`: `README.md` e `personas.md` alterados, e charters, journeys e scenarios do menu novos. Escreveu isso outra frente, o QA, que rodou em paralelo. **Este verificador não tocou nesses arquivos.** Só criou este `validation.md`.
- O probe restaurou `store_settings.menu` ao valor original e conferiu `categories` byte a byte.

## Summary

**Overall**: ❌ Não pronto, por cobertura. Não há defeito de produto aberto.
**Spec-anchored check**: 39 de 41 ACs com evidência que discrimina; 2 com mutante sobrevivente (MNM-30, MNM-37); 3 gaps de precisão da spec.
**Sensor**: 36 de 38 mortos.
**Gate**: core 4878 · backoffice 4343 · store 6216, os três exit 0; tipos 0 · 0 · core com 11 herdados.

---
---

# Rodada 2 (2026-10-29)

**Spec**: `spec.md` (MNM-01..41; MNM-09, MNM-24 e MNM-41 revistos em 2026-10-28).
**Diff range**: working tree contra `d101ca2f` + não rastreados (sem commits), agora com as correções da verificação r1 e do QA r1, r2 e r3 (`tasks.md`).
**Verifier**: sub-agente independente (autor ≠ verificador). Nenhum arquivo de produto ou de teste foi alterado. As mutações foram temporárias nos arquivos reais, restauradas por cópia e conferidas por SHA-256 (`sha_ok` nas 44). No fim, `git status --short` e o SHA-256 dos 143 arquivos alterados ou não rastreados são **idênticos** aos do início. A única exceção é este `validation.md`.

## Veredito: ❌ FAIL — por cobertura, não por defeito de produto

Os gaps da r1 estão fechados: M34, M36 e M21 (no painel) agora morrem, e MNM-09/24 revistos e MNM-31 pela página têm prova. O gate bate o `tasks.md` exatamente, e o probe de gravação dá 15/15 `ok` de novo.

O sensor expandido injetou **44** mutantes (37 novos sobre o código das correções, 5 controles da r1 e 2 extras):

- **38 morreram, todos por asserção.** Nenhum morreu por compilação.
- **1 é equivalente declarado** (N15).
- **5 sobreviveram de verdade.** Quatro deles caem sobre comportamento que as correções de QA prometem (S03, R01 e Q07), e pela régua do `validate.md` isso vira tarefa de correção.

Não achei defeito de produto: em todos os sobreviventes o código de hoje faz o que a correção diz. O que falta é a régua.

## Correções da r1: fechadas

| Gap r1 | Prova agora | Mutante | Resultado |
| --- | --- | --- | --- |
| MNM-37 sair do conflito | `AdminMenuPage.test.tsx:896` ("Recarregar" sai do conflito, a próxima ação grava com o `updated_at` relido); `useStoreMenu.test.ts:271` | C34 (= M34) | morto (2) ✅ |
| MNM-30 esmaecido | `MenuTree.test.tsx:163-165` (`opacity-60` por token, inverso nos ligados); `:179-180` (filho) | N26 (= M36) | morto ✅ |
| MNM-09 × MNM-24 (revistos) | `AdminMenuPage.test.tsx:335` (24 primeiras e o aviso "As outras N…"); `:360` (submenu de 30: tirar grava, adicionar desabilita); `useStoreMenu.test.ts:380`; core `refusals.test.ts` | C09 (sem o `.slice`), N16 (`>` → `>=`) | mortos ✅ |
| MNM-34 no painel | `useStoreMenu.test.ts:420` | C21 (= M21) | **morto no painel agora** ✅ |
| MNM-31 pela tela | `AdminMenuPage.test.tsx:818/832/841` | — (M13 morto na r1) | ✅ |
| MNM-41 (frase) | spec revista: a leitura pública é o documento inteiro; probe `anon não grava` | — | ✅ |

## Spec-Anchored Acceptance Criteria (r2)

Os ACs sem nota repetem a evidência da r1, que foi reconferida: o arquivo e o caso continuam lá e o gate está verde. Abaixo vão só as linhas que mudaram ou ganharam evidência nova.

| AC | Evidência r2 | Resultado |
| --- | --- | --- |
| MNM-01..04 | como na r1 (`AdminMenuPage.test.tsx:228-267`, `MenuTree.test.tsx:92-141`) | ✅ |
| MNM-05 | `AdminMenuPage.test.tsx:269` e `:286` (Q08, sem `TypeError`); `useStoreMenu.test.ts:179` | ✅ ⚠️ só a falha de `store_settings` é exercitada. A falha da leitura de **categorias** (`erroDasCategorias`) não tem caso, e N38 (o erro de categorias chegando cru no `error` do hook) sobrevive. A página não desenha `error`, então não há efeito visível hoje |
| MNM-06 | `MenuTree.test.tsx:332/366-456` (Q06: embrulho e `break-words`, token exato); Q06b nos quatro testes de UI; layout em navegador (`tasks.md` Q06/Q06b) | ✅ (N27 morto) |
| MNM-07 | `MenuTargetPicker.test.tsx` (abas, busca, R04 foco na busca, S02 reabrir) | ✅ (N22, N25 mortos) |
| MNM-08 | como na r1 | ✅ (C10 morto, 12) |
| MNM-09 (revisto) | `AdminMenuPage.test.tsx:335`; `documentOps.test.ts` "24 PRIMEIRAS" | ✅ (C09 morto) |
| MNM-10, MNM-11 | como na r1 | ✅ |
| MNM-12 (+Q03/R01/S01) | `AdminMenuPage.test.tsx:416-489`; `enderecoDaLoja.test.ts:22-191` (com a propriedade "o aceito pelo seletor passa em `menuDocumentRefusal`", `:180`); core `refusals.test.ts` R01 | ✅ com ressalva: N14 sobrevive (query com aspas/`<>` não é recusada por nenhum teste). A recusa existe no código, mas a R01 a anuncia e nenhum caso a cobra |
| MNM-13 | como na r1 | ✅ |
| MNM-14..17 | como na r1 + `MenuItemEditor.test.tsx:118-225` | ✅ |
| MNM-18 | `afterEach` com zero escrita em `categories` + probe (15/15, exit 0, retrato md5 igual) | ✅ |
| MNM-19 | + Q04: `AdminMenuPage.test.tsx:585-653` (um toque duplo vira uma gravação; desabilitado enquanto grava) | ✅ (N28, N34 mortos) |
| MNM-20..23 | como na r1 + Q07 (`:654-746`) | ✅ ⚠️ N35 (ver gap 3) |
| MNM-24 (revisto) | `refusals.test.ts` ("30 → 30 grava", "mexer em OUTRO item grava"); `AdminMenuPage.test.tsx:360` | ✅ (N16 morto em core 3 e no painel 1) |
| MNM-25..29 | como na r1 | ✅ |
| MNM-30 | `MenuTree.test.tsx:157-180` | ✅ (N26 morto) |
| MNM-31 | `AdminMenuPage.test.tsx:809-857` | ✅ |
| MNM-32 | como na r1 | ✅ |
| MNM-33 (+Q05) | `MenuItemEditor.test.tsx:307-429` (os dois dispositivos vão juntos, Esc pergunta, descartar e salvar apagam do Storage, R03 foco); `uploadImage.test.ts` | ✅ (N29..N33 mortos) |
| MNM-34 | `useStoreMenu.test.ts:420` | ✅ (C21 morto no painel) |
| MNM-35..36 | como na r1 | ✅ |
| MNM-37 (+Q02/S03) | `AdminMenuPage.test.tsx:880/896/935/951`; `useStoreMenu.test.ts:194-339, 494-710` | ✅ com ressalva: N08 e N11 sobrevivem (gaps 1 e 4) |
| MNM-38 (+R02) | `AdminMenuPage.test.tsx:923` e `:935` (incerto: título neutro, sem `destructive`) | ✅ (N36 morto) |
| MNM-39, MNM-40 | como na r1 | ✅ |
| MNM-41 (revisto) | probe: `anon não grava (200, 0 linhas)`; documento público por desenho (spec revista) | ✅ |
| Q01 (prévia: a folha abre só na prévia do MENU) | `StoreLayoutOverlays.test.tsx:187/199/227/248/260` | ✅ (N01, N02 mortos) |
| Q09 (Ver na loja da Home) | `AdminHomePage.test.tsx` | ✅ (N39 morto) |

**Status**: 41/41 ACs com evidência. Os cinco sobreviventes reais recaem em MNM-12 (R01), MNM-20 (Q07) e MNM-37 (S03) e em MNM-05 (menor).

## Cobertura das correções de QA (pergunta 2)

| Bug | O teste reprova sem o conserto? | Mutante |
| --- | --- | --- |
| Q01 prévia só abre a folha na prévia do menu | sim | N01, N02 ✅ |
| Q02 resposta perdida (igualdade estrutural, adota o `updated_at`) | sim | N03 (5), N04, N05 ✅ |
| Q03 outro endereço tem de existir | sim | N21 (5), N23, N24 ✅ |
| Q04 trava do Mover | sim | N28, N34 ✅ |
| Q05 rascunho por dispositivo, Storage, confirmar | sim | N29..N32 ✅ |
| Q06/Q06b embrulho | sim (token exato; o layout real foi provado em navegador) | N27 ✅ |
| Q07 foco depois de fechar ou remover | **parcial**: N37 morre (9), mas N35 (seguinte × anterior) sobrevive | ❌ gap 3 |
| Q08 erro cru | para `store_settings` sim; para categorias não (N38) | ⚠️ gap 5 |
| Q09 | sim | N39 ✅ |
| R01 forma em `core` × existência no painel | sim para `..` (core), forma curta, propriedade seletor ⇒ gravação; **não** para a query com aspas/`<>` (N14) | ❌ gap 2 |
| R02 incerto não destrutivo | sim | N36 ✅ |
| R03 foco no "Continuar editando" | sim | N33 ✅ |
| R04 foco na busca | sim | N25 ✅ |
| R05 sem reticências | sim (token exato, `MenuTargetPicker.test.tsx` R05) | não mutado; asserção conferida |
| S01 forma curta pela `resolveCategoryRoute` | sim | N18, N19 (8), N20 (4) ✅ |
| S02 reabrir na aba Categoria | sim | N22 ✅ |
| S03 releitura automática com espera | resolve: sim (N07, N10, N12). Sem conflito falso: sim (N06). Espera (2º passo): sim, só pela página (N09). **PARAR: não** (N08). Gatilho `online`: não (N11) | ❌ gap 1 |

## Gate Check

Um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`:

| Medida | Resultado | Exit | `tasks.md` (QA r3) |
| --- | --- | --- | --- |
| core | **4909 / 190** | 0 | 4909/190 ✅ |
| backoffice | **4462 / 243** | 0 | 4462/243 ✅ |
| store | **6218 / 333** | 0 | 6218/333 ✅ |
| tsc store | 0 erros | 0 | ✅ |
| tsc backoffice | 0 erros | 0 | ✅ |
| tsc core | 11 (exit 2): carousel 5, pickHomeBanners 1, pickHomeCollections 1, sitemap/urls 2, supabase/client 2 | 2 | os 11 herdados, nenhum em `menu/` ✅ |

- **Probe** `probes/01-gravacao.mjs` (só 127.0.0.1:54441): 15 `ok`, exit 0, e `01-gravacao.saida.txt` com o mesmo SHA.
- Não rodei lint nem `pnpm build` (o `tasks.md` registra 2/2 · 23/5 e build verde).

## Discrimination Sensor (r2)

Rodei o arnês do repositório de sempre: o alvo tem de casar exatamente uma vez, a saída é o reporter JSON do vitest (para separar asserção de erro de carga), o arquivo é restaurado por cópia e o SHA é conferido. Suítes usadas: core `src/menu` · painel `features/store-menu` + `AdminMenuPage.test.tsx` + `uploadImage.test.ts` (e `AdminHomePage.test.tsx` para N39) · loja `widgets/{header,mobile-menu,store-layout}` + `entities/menu`.

| # | Arquivo | Mutação | Falhas | Resultado |
| --- | --- | --- | --- | --- |
| N01 | `StoreLayout.tsx` | a folha abre em qualquer prévia (a da Home inclusa) | loja 1 | morto |
| N02 | `StoreLayout.tsx` | a folha abre também no quadro de 1024 | loja 1 | morto |
| N03 | `useStoreMenu.ts` | `mesmoValor` por `JSON.stringify` (sensível à ordem de chave) | 5 | morto |
| N04 | `useStoreMenu.ts` | resposta perdida não adota o `updated_at` relido | 1 | morto |
| N05 | `useStoreMenu.ts` | a próxima `apply` depois da incerteza não adota a linha relida | 1 | morto |
| N06 | `useStoreMenu.ts` | reconciliação acusa conflito também quando não gravou | 1 | morto |
| N07 | `useStoreMenu.ts` | reconciliação nunca resolve | 4 | morto |
| **N08** | `useStoreMenu.ts:358,387` | **a releitura não PARA**: sem a saída antecipada e reagendando sempre (lê o banco a cada 15 s para sempre) | **0** | ❌ sobreviveu |
| N09 | `useStoreMenu.ts:57` | espera: 2º passo em 60 s | 1 (só a página) | morto |
| N10 | `useStoreMenu.ts:419` | `incerto` nunca agenda a releitura | 4 | morto |
| **N11** | `useStoreMenu.ts:403` | sem o gatilho `online` | **0** | ❌ sobreviveu |
| N12 | `useStoreMenu.ts:362` | reconciliação não limpa a incerteza | 1 | morto |
| N13 | `refusals.ts` | forma aceita o segmento `..` | core 1 · painel 0 | morto (só em core) |
| **N14** | `refusals.ts:79` | **forma aceita aspas, `<>` e quebra de linha na query/âncora** | core 0 · painel 0 | ❌ sobreviveu |
| N15 | `refusals.ts:73` | sem a recusa de `\` inicial | 0 · 0 | ⚪ **equivalente**: `\x` vira `/\x`, e `SEGMENTO` já recusa `\` |
| N16 | `refusals.ts` | teto: `>` → `>=` (recusa o que não cresce) | core 3 · painel 1 | morto |
| N17 | `refusals.ts` | repetição antiga na raiz deixa de ser tolerada | core 1 · painel 0 | morto (só em core) |
| N18 | `enderecoDaLoja.ts` | slug ambíguo entre ativas aceito | 1 | morto |
| N19 | `enderecoDaLoja.ts` | forma curta gravada sem virar canônica | 8 | morto |
| N20 | `enderecoDaLoja.ts` | categoria inativa aceita | 4 | morto |
| N21 | `enderecoDaLoja.ts` | peça sem conferir existência | 5 | morto |
| N22 | `MenuTargetPicker.tsx` | reabrir não volta à aba Categoria (S02) | 2 | morto |
| N23 | `MenuTargetPicker.tsx` | página repetida não recusada no seletor | 2 | morto |
| N24 | `MenuTargetPicker.tsx` | peça não conferida (sem rede) aceita | 1 | morto |
| N25 | `MenuTargetPicker.tsx` | abre sem foco na busca (R04) | 3 | morto |
| N26 | `MenuTree.tsx` | sem o esmaecido (**controle r1, M36**) | 1 | morto |
| N27 | `MenuTree.tsx` | controles do item com `shrink-0`, sem embrulho (Q06) | 1 | morto |
| N28 | `MenuTree.tsx` | "Mover para cima" não desabilita enquanto grava | 1 | morto |
| N29 | `MenuBannerEditor.tsx` | o rascunho de um dispositivo descarta o do outro | 1 | morto |
| N30 | `MenuItemEditor.tsx` | descartar não apaga a arte do Storage | 2 | morto |
| N31 | `MenuBannerEditor.tsx` | salvar não apaga a arte trocada | 1 | morto |
| N32 | `MenuItemEditor.tsx` | Esc com banner sujo não pergunta | 4 | morto |
| N33 | `MenuItemEditor.tsx` | "Continuar editando" ignora o controle de origem (R03) | 1 | morto |
| N34 | `AdminMenuPage.tsx` | sem a trava por `ref` do Mover (Q04) | 1 | morto |
| **N35** | `AdminMenuPage.tsx:340` | **foco depois de remover vai ao ANTERIOR, não ao seguinte** | **0** | ❌ sobreviveu |
| N36 | `AdminMenuPage.tsx` | `incerto` vira toast destrutivo (R02) | 1 | morto |
| N37 | `AdminMenuPage.tsx` | nenhum foco devolvido (Q07) | 9 | morto |
| **N38** | `useStoreMenu.ts:438` | o erro de categorias chega cru no `error` do hook (Q08) | **0** | ❌ sobreviveu (sem efeito visível hoje) |
| N39 | `AdminHomePage.tsx` | "Ver na loja" da Home volta a `/` (Q09) | 1 | morto |
| C34 | `useStoreMenu.ts` | `reload()` não limpa o conflito (**r1 M34**) | 2 | morto |
| C06 | `useStoreMenu.ts` | sem a guarda de `updated_at` (**r1 M06**) | 11 | morto |
| C10 | `documentOps.ts` | `addRootNode` entra no começo (**r1 M10**) | 12 | morto |
| C09 | `documentOps.ts` | sem o corte em 24 (F03) | 2 | morto |
| C21 | `structure.ts` | o legado não copia os banners (**r1 M21**, agora no painel) | painel 1 | morto |

**Resultado**: 44 injetados · 38 mortos (todos por asserção) · 1 equivalente (N15) · **5 sobreviventes reais** (N08, N11, N14, N35, N38). ❌

## Ranked gaps (r2)

1. **S03: nada prova que a releitura PARA (N08).** Também falta prova do gatilho `online`/`focus` (N11). Com N08 o painel leria `store_settings` a cada 15 s para sempre, depois de qualquer incerteza, e a suíte ficaria verde.
   - **Correção**: em `useStoreMenu.test.ts`, no S03 #1, depois de `saved`, avançar o relógio falso por mais de 30 s (`vi.useFakeTimers` + `advanceTimersByTimeAsync`) e cobrar que o número de `maybeSingle` em `store_settings` não cresceu.
   - Par: com a incerteza, e com as leituras falhando, as releituras seguem a sequência 0·1·2·4·8·15·15 s. Isso cobre também a espera, que hoje só a página prova (N09).
   - Para N11: incerteza, rede falhando com espera longa, `window.dispatchEvent(new Event('online'))` e cobrar uma leitura imediata.

2. **R01: a recusa da query com aspas, `<>` ou quebra de linha não tem caso (N14).** O `tasks.md` (R01) anuncia "recusa … aspas, `<>`", e só a do caminho é provada. **Correção**: em core `refusals.test.ts`, `menuLinkPathRefusal('/busca?q="x"')`, `('/sobre#<b>')` e `('/busca?q=a\nb')` devem ser `not.toBeNull()`, mantendo o inverso que já existe (`/busca?q=Anel de prata` passa).

3. **Q07: o foco depois de remover um item do MEIO não tem caso (N35).** O caso "SEGUINTE" (`AdminMenuPage.test.tsx:705`) remove o **primeiro** item, onde "seguinte ?? anterior" e "anterior ?? seguinte" dão a mesma resposta. **Correção**: remover `n-presentes` (o do meio) e cobrar `acoes-n-sobre`. Mesmo molde para tirar um filho do meio do submenu (`:733`).

4. **N11** está agrupado no gap 1.

5. **Menor, MNM-05/Q08: a falha da leitura de categorias.** Nenhum caso faz `categories` falhar, e N38 sobrevive. Hoje a página não desenha `error`, então não há defeito visível. **Correção**: em `useStoreMenu.test.ts`, com `categories` respondendo erro, cobrar `state === 'error'` e `error === STORE_MENU_LOAD_FAILURE`, e pela página cobrar a faixa `menu-erro` (nunca o vazio).

6. **Informativo**: N13 e N17 morrem só em `core`, como os "só em core" da r1. O gate Full já roda `core`.

## Fix Plans (r2)

| Fix | O quê | Onde | Done when |
| --- | --- | --- | --- |
| G01 | a releitura para, a espera tem régua, `online` relê | `useStoreMenu.test.ts` (relógio falso) | N08, N09 (no hook) e N11 reinjetados morrem por asserção |
| G02 | query mal formada recusada | core `refusals.test.ts` | N14 morre |
| G03 | foco ao remover do meio | `AdminMenuPage.test.tsx` Q07 | N35 morre |
| G04 | falha de categorias | `useStoreMenu.test.ts`, `AdminMenuPage.test.tsx` | N38 morre; a página mostra `menu-erro` |

Nenhuma é decisão de spec. Todas são régua faltando, e o produto já faz o certo.

## Summary (r2)

**Overall**: ❌ não pronto, por cobertura. Não há defeito de produto aberto.
**Gaps da r1**: todos fechados (M34, M36 e M21 no painel morrem; MNM-09/24/31/41 cobertos).
**Spec-anchored**: 41/41 com evidência. As ressalvas estão em MNM-05, MNM-12, MNM-20 e MNM-37.
**Sensor**: 38 de 44 mortos, 1 equivalente, 5 sobreviventes reais.
**Gate**: core 4909/190 · backoffice 4462/243 · store 6218/333, os três exit 0; tsc 0 · 0 · core 11 herdados; probe 15/15.
**Working tree**: status e SHA-256 idênticos ao início, exceto este arquivo.

---

# Rodada 3 (2026-10-29) — a última do limite de 3

**Verifier**: sub-agente independente, novo (autor ≠ verificador). Superfície: working tree contra `d101ca2f` mais os não rastreados, agora com as correções G01..G04 da r2 (`tasks.md`, *Correções da verificação r2*), que só mexem em testes. Nenhum arquivo de produto ou de teste foi alterado. Cada mutação foi temporária, restaurada por cópia e conferida por SHA-256 (`sha_ok = true` nas 36). O arnês recusa alvo que não case exatamente uma vez e separa falha por asserção de falha de carga (reporter JSON do vitest). Nenhuma morte foi por compilação nem por carga.

## Veredito: ❌ FAIL — por cobertura, não por defeito de produto

Os gaps da r2 fecharam todos, e o gate bate o `tasks.md` exatamente. No sensor fresco, de 29 mutantes novos, 25 morreram por asserção, 1 é equivalente (F29) e **3 sobreviveram** (F16, F17 e F25). F17 recai sobre um comportamento que o S03 declara ("outra ⇒ conflito verdadeiro"). F16 recai sobre o gatilho `focus`, que o S03 também declara e que o G01 deixou de fora. Pela régua do `validate.md`, mutante sobrevivente vira tarefa de correção. **Esta é a 3ª iteração, então o caso vai para o usuário** em vez de abrir uma r4. Não há defeito de produto aberto: nos três casos o código faz o certo hoje, e o que falta é uma asserção.

## Gaps da r2: fechados

Reinjetei nos arquivos reais os mutantes da r2. Todos morreram por asserção.

| # | Mutação | Falhas | Quem mata |
| --- | --- | --- | --- |
| N08 | reconciliação sem `if (!enviado) return` e reagendando sempre | 2 | G01 "depois de resolver… não lê mais" e "voltar a ficar online… e parou" |
| N09 | 2º degrau da espera em 60 s | 3 | G01 (a constante, os degraus por extenso) e S03 da página |
| N11 | sem o ouvinte `online` | 1 | G01 "voltar a ficar online relê na hora" |
| N14 | sem a régua de aspas, `<>` e controle na query/âncora | core 9 | R01 `it.each` (painel 0, porque a regra mora em core) |
| N35 | foco depois de remover vai ao anterior | 1 | Q07 "remover o item do MEIO" |
| N35c | o mesmo em `removerFilho` | 1 | Q07 "tirar o filho do MEIO" |
| N38 | erro de categorias cru no `error` | 1 | "falha na leitura das CATEGORIAS" (hook) |

**As asserções novas medem o que dizem?** Sim. O G01 escreve os degraus por extenso (0·1·2·4·8·15·15·15 s): 1 ms antes não há leitura, e no instante há uma, então derivar da constante não basta para passar. O caso "parou" conta as leituras do dublê depois de 5 min de relógio, o que é falso no mundo de N08. O caso do Q07 remove o item do **meio**, a única posição em que "seguinte ?? anterior" e "anterior ?? seguinte" divergem. O caso do G04 tem um inverso: "sem incerteza, `online` não lê". Nenhuma delas é verdadeira nos dois mundos.

## Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | Esperado (`tasks.md`) | Medido | Exit |
| --- | --- | --- | --- |
| core | 4918 / 190 | **4918 / 190** | 0 |
| backoffice | 4471 / 243 | **4471 / 243** | 0 |
| store | 6218 / 333 | **6218 / 333** | 0 |
| tsc store · backoffice · core | 0 · 0 · 11 | **0 · 0 · 11** (herdados) | — |
| eslint store · backoffice | 2/2 · 23/5 | **2/2 · 23/5** | — |
| `pnpm build` | verde | **verde** (os três apps) | 0 |

## Discrimination Sensor (r3): 29 mutações novas

Nenhuma repete a r1 nem a r2. As suítes usadas foram: core `src/menu`; painel `features/store-menu` com `AdminMenuPage.test.tsx`; e loja `widgets/{header,mobile-menu,store-layout}` com `entities/{menu,category}`.

| # | Arquivo | Mutação | Falhas | Resultado |
| --- | --- | --- | --- | --- |
| F01 | `structure.ts` `parseList` | id repetido não é descartado | core 1 · painel 0 · loja 0 | morto (só em core) |
| F02 | `structure.ts` `menuItems` | ícone cru, sem `menuIconKey` | core 1 · loja 0 | morto (só em core) |
| F03 | `structure.ts` | `hasPanel` ignora os filhos | core 3 · loja 7 | morto |
| F04 | `structure.ts` `legacyMenuDocument` | link do legado sem rótulo | core 5 · loja 4 | morto |
| F05 | `refusals.ts` | comprimento do nome contado sem aparar | core 1 · painel 0 | morto (só em core) |
| F06 | `refusals.ts` `rotuloDoNo` | link sem rótulo aceito | core 1 · painel 0 | morto (só em core) |
| F07 | `refusals.ts` `enderecoDoNo` | externo já gravado recusado (MNM-31) | core 1 · painel 2 | morto |
| F08 | `refusals.ts` | repetição de página já existente na raiz deixa de ser tolerada (Q03) | core 1 · painel 0 | morto (só em core) |
| F09 | `refusals.ts` | teto: `filhos > tinha` → `>=` | core 3 · painel 1 | morto |
| F10 | `refusals.ts` | banners do celular não conferidos | core 1 · painel 0 | morto (só em core) |
| F11 | `documentOps.ts` `toggleSurface` | a raiz liga/desliga os dois dispositivos | 2 | morto |
| F12 | `documentOps.ts` `addChildNode` | entra no começo do submenu | 2 | morto |
| F13 | `enderecoDaLoja.ts` | rota fixa gravada como digitada, sem normalizar | 2 | morto |
| F14 | `enderecoDaLoja.ts` | canônica da categoria perde query/âncora | 1 | morto |
| F15 | `useStoreMenu.ts` | o `value` gravado descarta as outras chaves da linha | 1 | morto |
| **F16** | `useStoreMenu.ts:404` | **sem o ouvinte `focus`** da reconciliação | **0** | ❌ sobreviveu |
| **F17** | `useStoreMenu.ts:376` | **reconciliação que relê OUTRA versão não acusa conflito** | **0** | ❌ sobreviveu |
| F18 | `useStoreMenu.ts` | `23505` do insert vira desfecho de erro, e o resto vira conflito | 1 | morto |
| F19 | `useStoreMenu.ts` | op que não muda nada vai à rede | 1 | morto |
| F20 | `AdminMenuPage.tsx` `frasesDoNovo` | contagem do submenu sem o teto de 24 no aviso | 1 | morto |
| F21 | `AdminMenuPage.tsx` | contagem do celular calculada como a do computador | 2 | morto |
| F22 | `AdminMenuPage.tsx` `usadas` | o modo submenu olha o menu principal ("Já está neste submenu") | 1 | morto |
| F23 | `AdminMenuPage.tsx` | item novo não fica selecionado (`open` da prévia) | 1 | morto |
| F24 | `MegaMenu.tsx` | filho externo vira `<Link>` (sem `target`) | 1 | morto |
| **F25** | `MobileMenu.tsx:~250` | **filho externo vira `<Link>`** (sem `target="_blank"`/`rel`) | **0** | ❌ sobreviveu |
| F26 | `MobileMenu.tsx` | "ver tudo em…" aparece também sem filhos | 1 | morto |
| F27 | `useMenu.ts` | settings carregando ⇒ desenha o legado (L-037) | 1 | morto |
| F28 | `useMenu.ts` | os links legados não chegam à porta | 3 | morto |
| F29 | `MegaMenu.tsx` | externo sem painel cai no ramo com painel | 0 | ⚪ **equivalente**: os dois ramos desenham `<a target="_blank" rel>`. O ramo com painel só acrescenta `onClick: close`, `aria-expanded/controls` como `undefined` sem painel, e a mesma classe `border-transparent` |

**Resultado**: 29 injetados · 25 mortos (todos por asserção) · 1 equivalente (F29) · **3 sobreviventes** (F16, F17, F25). ❌

Sobre os mortos "só em core" (F01, F02, F05, F06, F08, F10): o padrão é o mesmo da r1 e da r2. A regra mora uma vez, em core, e o gate Full roda core.

## Ranked gaps (r3)

1. **F17: o "conflito verdadeiro" da reconciliação não tem caso.** O S03 declara o comportamento: depois do `incerto`, se a releitura mostra outra versão (nem o valor enviado nem a versão vista), a tela acusa conflito. O ramo `else if (vista && relida.updatedAt !== vista.updatedAt) setConflict(true)` pode ser apagado e a suíte continua verde. Só o inverso ("sem conflito falso", N06) é provado. Com F17, a dona não seria avisada de que outra janela gravou. O conflito só apareceria na próxima ação, como recusa. **Correção**: em `useStoreMenu.test.ts`, no S03, deixar a gravação incerta e, antes da releitura, pôr no dublê outra linha (outro `value` e outro `updated_at`). Depois de avançar o degrau, cobrar `conflict === true` e `saving !== 'saved'`.
2. **F16: o gatilho `focus` não tem caso.** O S03 declara `online`/`focus`, e o G01 só provou o `online`. **Correção**: copiar o caso do G01 "voltar a ficar online relê na hora", trocando o evento por `window.dispatchEvent(new Event('focus'))`, e manter o inverso "sem incerteza, `focus` não lê".
3. **Menor, F25: o filho externo na folha do celular.** O F24 (o mesmo no mega menu) morre, o F25 não. O risco é baixo: o seletor recusa criar externo e o legado só põe categoria no submenu, então um filho externo só nasce de jsonb editado à mão. Mas o código trata o caso e nada o prova. **Correção**: em `MobileMenu.test.tsx`, um item com um filho `external: true` e cobrar `target="_blank"` e `rel="noopener noreferrer"` no link do filho, no molde de `MegaMenu.test.tsx`.

## Fix Plans (r3)

| Fix | O quê | Onde | Done when |
| --- | --- | --- | --- |
| H01 | a reconciliação acusa o conflito verdadeiro | `useStoreMenu.test.ts` S03 | F17 reinjetado morre por asserção |
| H02 | `focus` relê na hora | `useStoreMenu.test.ts` G01 | F16 morre |
| H03 | filho externo no celular abre em aba nova | `MobileMenu.test.tsx` | F25 morre |

As três são só de teste. Nenhuma é decisão de spec. **Como a r3 é a última iteração, quem decide entre corrigir sem nova rodada (como na `72`, na `73` e na `83`) e rodar uma r4 é o usuário.**

## Conferência final do working tree (r3)

`git status --short` saiu idêntico ao do início (145 linhas). O SHA-256 dos 142 arquivos alterados ou não rastreados (todos, menos este) também saiu idêntico ao do início.

## Summary (r3)

**Overall**: ❌ não pronto, por cobertura. Não há defeito de produto aberto. Os 3 gaps são de teste, e o caso vai para o usuário (limite de 3 iterações).
**Gaps da r2**: todos fechados (N08, N09, N11, N14, N35, N35c, N38 mortos por asserção).
**Gate**: 4918/190 · 4471/243 · 6218/333, os três exit 0. tsc 0 · 0 · 11 herdados. Lint 2/2 · 23/5. Build verde.
**Sensor**: 29 novos · 25 mortos · 1 equivalente · 3 sobreviventes (F16, F17, F25).

---

# Fecho das lacunas da r3 (sem rodada 4) — 2026-10-29

**Quem fez**: sub-agente implementador, **não** um Verifier. Autor ≠ verificador vale para as três rodadas; este fecho é do autor das correções, e é declarado como tal. Precedente: a `72`, a `73` e a `83`, onde a r3 era a última rodada e as lacunas dela foram fechadas com o mutante reinjetado, sem rodada 4.

**Só testes.** Nenhum código de produção mudou: nos três casos o código já fazia o certo, e faltava a asserção. Cada mutante foi reinjetado no arquivo real (alvo conferido para casar exatamente uma vez), a suíte do arquivo rodou, e o arquivo foi restaurado por cópia com SHA-256 igual ao de antes.

| Fix | Teste novo | Mutante reinjetado | Morte |
| --- | --- | --- | --- |
| H01 | `useStoreMenu.test.ts`, S03: "a releitura acha OUTRA versão (outra janela gravou): conflito verdadeiro, sem Salvo, sem ação nenhuma" — gravação incerta, o dublê passa a ter outra linha (outro `value`, outro `updated_at`); a reconciliação sozinha acusa `conflict === true`, `saving !== 'saved'`, e nenhuma escrita nova | **F17** (`useStoreMenu.ts`, sem o `else if (vista && relida.updatedAt !== vista.updatedAt) setConflict(true)`) | 1 caso, por asserção (`expected false to be true`) ✅ |
| H02 | `useStoreMenu.test.ts`, G01: "voltar à aba ("focus") relê na hora, sem esperar o degrau; e resolve" (cópia do caso do `online` com o evento trocado) e o inverso "sem incerteza, "focus" não lê nada" | **F16** (`useStoreMenu.ts`, sem `window.addEventListener('focus', agora)`) | 1 caso, por asserção (`expected 7 to be 8`) ✅ |
| H03 | `MobileMenu.test.tsx`, NAV-12: "filho externo do acordeão é <a> com target _blank e noopener noreferrer; o interno não" | **F25** (`MobileMenu.tsx`, o ramo `filho.external` trocado por `false`, ou seja, o filho externo vira `<Link>`) | 1 caso, por asserção (`toHaveAttribute("target", "_blank")`) ✅ |

## Gate (um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`)

| Medida | r3 | Depois do fecho | Exit |
| --- | --- | --- | --- |
| core | 4918 / 190 | **4918 / 190** | 0 |
| backoffice | 4471 / 243 | **4474 / 243** (+3) | 0 |
| store | 6218 / 333 | **6219 / 333** (+1) | 0 |
| tsc store · backoffice · core | 0 · 0 · 11 | **0 · 0 · 11** (herdados) | — |
| eslint store · backoffice | 2/2 · 23/5 | **2/2 · 23/5** | — |
| `pnpm build` | verde | **verde** | 0 |

Lição registrada: `L-084` em `.specs/LESSONS.md`.
