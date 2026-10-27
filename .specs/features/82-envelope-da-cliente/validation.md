# 82 — Validação independente

## Rodada 1 — 2026-10-26 — **FAIL** (4 mutantes sobreviventes; nenhum defeito de produto achado)

> Verificador ≠ autor. Evidência ou zero: toda afirmação abaixo vem de comando rodado nesta rodada, na
> working tree de `master` (sobre `744da7ea`) com a `82` sem commit. Nenhum arquivo de produto ou de
> teste foi editado pelo verificador: todo mutante foi aplicado no arquivo real e restaurado de cópia,
> com SHA-256 conferido (42/42 `sha_ok=True`; o arnês recusa alvo que não aparece exatamente uma vez e
> exige que o SHA mude ao aplicar — nenhum mutante virou no-op). Faixa do diff: `git diff --stat`
> **36 arquivos, +836/−82** e 16 não rastreados (os novos da `82` e `apps/mobile-adm/tsconfig.node.tsbuildinfo`,
> que já estava no `git status` inicial), idênticos antes e depois da rodada (52 linhas de `git status --short`).
> Não li os relatórios dos workers: a cobertura foi derivada da `spec.md` e do código.

### 1. Gate (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Testes / arquivos | Exit | Contra `baseline.md` |
| --- | --- | --- | --- |
| core | 4569 / 180 | 0 | +103 / +2 |
| mobile-adm | 2090 / 129 | 0 | +69 / +3 |
| store | 6030 / 327 | 0 | +17 / +1 |
| backoffice | 3923 / 225 | 0 | +7 / 0 |
| **Total** | **16612 / 861** | | **+196 / +6**, nenhuma queda |

- `tsc --noEmit`: store 0 · backoffice 0 · mobile-adm app 0 · mobile-adm node 0 · `packages/core` **11**
  (herdados, arquivo por arquivo: `carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1,
  `sitemap/urls` 2, `supabase/client.ts` 2 — iguais à baseline).
- `eslint .`: mobile-adm **0/0**, backoffice **23/5** — iguais à baseline.
- Probe `probes/01-rpc.sql` re-rodado contra o banco local (transação desfeita): **8 `ok —`, exit 0**.

### 2. Checagem AC a AC (evidência `arquivo:linha`)

Abreviações: `EV` = `packages/core/src/material/__tests__/envelope.test.ts`; `AA` =
`packages/core/src/order-actions/__tests__/appAction.test.ts`; `MT` = `…/order-actions/__tests__/materialTracking.test.ts`;
`OA` = `packages/core/src/orders/__tests__/appAction.test.ts`; `HI` = `…/orders/__tests__/history.test.ts`;
`FE` = `apps/mobile-adm/src/features/order-actions/ui/__tests__/FolhaDoEnvelope.test.tsx`; `PG` =
`apps/mobile-adm/src/pages/__tests__/envelopeDaCliente.test.tsx`; `CR` = `apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx`;
`ES` = `apps/store/src/shared/lib/__tests__/envelopeSchema.test.ts`; `DL` = `apps/backoffice/src/entities/order/api/useAdminOrders.delega.test.ts`.

| AC | Saída da spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ENV-01 | subseção abaixo dos passos, fio `line`, ícone `envio`, título "Envelope da cliente" 15/700 | PG:94 — `heading level 3 'Envelope da cliente'`, tokens `border-t border-estrelinha-line`, posição após "Passos do material", `svg[aria-hidden]` | ✅ (⚠️ precisão: o ícone é "um svg", não `EnvioIcon`; `text-[15px] font-bold font-display` sem asserção) |
| ENV-02 | editável ⇔ `aguardando_material`/`material_enviado` e não cancelado | EV:46–71 (`toEqual({rotulo:null})`, `toBeNull()` nos 4 estados e no cancelado) | ✅ (M01 morto) |
| ENV-03 | "Informar código do envelope", largura total, ≥44, ícone `+`; não editável ⇒ nada | PG:115 (`min-h-11`, `w-full`), PG:129/136 (nenhum botão) | ✅ (⚠️ ícone `+` sem asserção; M25 morto) |
| ENV-04 | "Alterar", ≥44, nome "Alterar o código do envelope"; não editável ⇒ nada | PG:145 (`name: 'Alterar o código do envelope'`, `min-h-11`), PG:170 (recebido sem Alterar) | ✅ (M23 morto) |
| ENV-05 | títulos, duas frases literais, rótulo, placeholder, valor inicial, botões, "A cliente" | EV:75–110 (frases por extenso); FE:83–112 | ✅ (M02 morto) |
| ENV-06 | normaliza ao digitar; recusa no campo, foco, zero requisições | FE:114 (`'AN123456789BR'`), FE:125 (frase, `aria-invalid`, foco, `gravarAcao` não chamado); AA:437 (core sem rede) | ✅ |
| ENV-07 | só `set_material_tracking` com código normalizado; gatilho só no `ok`; nenhum `update`, nenhuma RPC de estado | AA:372 (`rpcs`, `cadeias []`, `log`); MT:19–83; PG:446 (`escritasDe('orders')` 0, `set_material_status` []) | ✅ (M10, M11, M13, M41 mortos) |
| ENV-08 | frases "Código do envelope registrado." + "passou para "A caminho"." / "Pedido #NNNN atualizado."; invalida `chaveDoPedido` e `STORE_OVERVIEW_KEY` | OA (feature 82, `toEqual` das duas frases); FE:149/160; PG:446; PG:494 (`isInvalidated` true nas duas chaves) | ✅ (M12, M17, M28 mortos). ⚠️ a "vizinha intacta" de PG:516 é vazia: a chave vizinha é criada DEPOIS da invalidação, então é falsa nos dois mundos |
| ENV-09 | recusa da RPC ⇒ folha aberta, `role="alert"` com `materialTrackingRefusal` | EV:206 (frases); FE:197 (`getByRole('alert')` + frase) | ✅ |
| ENV-10 | `not_allowed` ⇒ conferência de papel: `42501` ⇒ recusa; papel de pé ⇒ `ORDER_CHANGED`, folha aberta | AA:418 (`nenhuma-linha`); CR (+3: par ok, 42501 ⇒ `/login` e nenhum aviso em >80 instantes, 200 ⇒ frase no `alert` da folha) | ✅ (M10, M14 mortos) |
| ENV-11 | rede/RPC falha ⇒ folha aberta, `ACTION_FAILED` em `alert` | MT:78–92; FE:197 (`falhou` ⇒ "Não consegui salvar. Tente de novo.") | ✅ |
| ENV-12 | foco volta, teclado, voltar do Android, `hideClose`, fecha só no sucesso, "Salvando…", trava, motion-reduce | FE:172 (Salvando…/`aria-disabled`/1 chamada), FE:218 (foco), FE:197 (não fecha) | ⚠️ voltar do Android com `origem: 'material'` sem caso próprio (herdado da `75`; a prova em navegador declara que não andou). Trava ao ABRIR sem régua: **M34 sobreviveu** |
| ENV-13 | linha deixa de ser editável ⇒ folha fecha | FE:233 (recebido ⇒ fecha + `ORDER_CHANGED`), FE:243 (cancelado) | ✅ (M29 morto) |
| ENV-14 | um dono (`writeMaterialTracking`), painel delega, forma `{ok, reason}` e refetch | DL (+6: identidade de client/notify, `{id, code}`, ok ⇒ relê lista e contagens, 4 desfechos) | ✅ (M20, M21 mortos) |
| ENV-15 | cartão `ground-deep` raio 12, eyebrow, código 18/600 `.08em`, origem | PG:145 (tokens e textos) | ✅ |
| ENV-16 | três frases de origem + " · chegou …", idade pelo `lido_em`; sem autoria nunca inventa | EV:121–163; PG:161 (fallback "Código informado há 3 dias") | ✅ (M03, M04 mortos) |
| ENV-17 | Copiar + Correios, 44px, também quando não editável | PG:170, PG:196 | ✅ com SPEC_DEVIATION (ver §4) |
| ENV-18 | `writeText(código)` ⇒ "Código copiado."; falha ⇒ frase de A9 | PG:240/251/261 | ✅ (M24 morto) |
| ENV-19 | `<a target=_blank rel=noopener noreferrer>`, URL oficial, `encodeURIComponent`, `aria-label` | PG:186 (`href` com `%20%26%23`) | ✅ (M26 morto) |
| ENV-20 | três frases na precedência recebido → cancelado → esperando | EV:166–202 (incluindo precedência); PG:115/129/136 | ✅ com SPEC_DEVIATION (§4) (M05 morto) |
| ENV-21 | linha do histórico com autoria e código, na data `set_at`; sem `set_at`, nenhuma | HI (feature 82); PG:446/477/487 | ⚠️ **M18 sobreviveu**: tirar a exigência de `set_at` fica verde, porque nenhum caso tem `set_by` preenchido com `set_at` nulo |
| ENV-22 | `set_by` pelo papel (`has_role`), `set_at = now()`, recusas não tocam | ES:189–233 (forma); probe 01-rpc.sql (semântica, 8 `ok —`) | ✅ (M35, M36, M38, M39, M40 mortos) |
| ENV-23 | um chip por material distinto do snapshot, ordem de `MATERIAL_KINDS`; falha ⇒ nada | EV:240–269; PG:274/289 | ✅ (M09, M42 mortos) |
| ENV-24 | `queueAgeLabel(rowQueueAge)` só nos dois estados; `ink-soft`, `wait` só em `stale` | EV:214–237; PG:296 (fresh ⇒ ink-soft), PG:305 (stale ⇒ wait), PG:314 (sem idade) | ⚠️ **M27 sobreviveu**: o degrau `warm` não tem caso, e `tier !== 'fresh'` pinta `warm` de `wait` |
| ENV-25 | "Colocar em produção" só em `material_recebido` não cancelado; frases; recusa; falha; trava | EV:272; AA (produção, 4 casos); PG:328–393; `ColocarEmProducao.test.tsx:28–54` | ✅ (M07, M32 mortos). ⚠️ precisão: na recusa, PG:382 só exige alerta não vazio — não a frase de `materialTransitionRefusal` |
| ENV-26 | `MATERIAL_CANCELLED_NOTE` no app e no painel | EV:37, EV:287; PG:403; `OrderMaterialCard.test.tsx` (texto por extenso) | ✅ (M08, M22 mortos) |
| ENV-27 | lembrete por último | PG:419 (ordem passos → chips → envelope → lembrete) | ✅ (M31 morto) |

**Edge cases**

- [x] Código igual ao atual vai à RPC — AA:402 (`rpcs` com 1 chamada); M16 morto. **Lado SQL não provado**: a RPC "atualiza `set_at`/`set_by`" num regravar do mesmo código só está escrita, não medida — **M37 sobreviveu** à suíte da loja **e** ao probe.
- [x] `customer_name` nulo ⇒ "A cliente" — EV:106, FE:108.
- [x] Código de 30+ caracteres quebra sem rolagem horizontal — só prova em navegador (`prova-navegador.md` §1, código de 30 em 360/390/1440 × 100/130/200); jsdom não mede.
- [x] Dois toques rápidos em Salvar ⇒ uma requisição — FE:172.
- [x] Realtime relê com a folha aberta e ela segue editável ⇒ fica com o digitado — FE:251; M29, M30 mortos.
- [x] `prefers-reduced-motion` — mesmo seletor da `75`; prova em navegador §3 (`getAnimations()` vazio).

**Success Criteria**

- [x] Probe contra o banco: código, estado, `set_by`, `set_at` — 01-rpc.sql (8 `ok —`); a linha em `order_notifications` é da prova em navegador §2.
- [x] Guardas passam sem afrouxar régua — `materialTransitions` passou a ler a RPC vigente com âncora de que a da `22` não é mais a vigente; `semDadoSensivelDeClienteNoApp` ganhou exceção de UMA linha com régua 1b e sensor (ver §4).
- [x] 390/360/1440 × 100/130/200 — `prova-navegador.md` (45 combinações).

### 3. Sensor de discriminação — 42 mutantes nos arquivos reais

Classificação pela saída do vitest. **Nenhum mutante morreu por compilação.** Cada um rodou a suíte
inteira do workspace afetado (core, backoffice, mobile-adm; store para a migration).

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| M01 | `material/envelope.ts` `esperando` | sem o corte de cancelado | morto (asserção) |
| M02 | `envelope.ts` `materialTrackingSheet` | frase longa também em `material_enviado` | morto |
| M03 | `envelope.ts` `materialTrackingOrigin` | `set_by` nulo vira "Informado pela cliente" (inventa autoria) | morto |
| M04 | `envelope.ts` origem | sem " · chegou …" | morto |
| M05 | `envelope.ts` `materialTrackingEmpty` | cancelado antes de recebido | morto |
| M06 | `envelope.ts` `materialWaitAge` | idade em todo estado | morto |
| M07 | `envelope.ts` `canStartProduction` | sem o corte de cancelado | morto |
| M08 | `envelope.ts` `materialCancelledNote` | também em `nao_aplicavel` | morto |
| M09 | `material/material.ts` `orderMaterialKinds` | item que não exige contribui | morto |
| M10 | `order-actions/materialTracking.ts` | `not_allowed` ⇒ `recusado` | morto |
| M11 | `materialTracking.ts` | aviso também na recusa | morto |
| M12 | `order-actions/appAction.ts` | `materialPassou` sem olhar o `antes` | morto |
| M13 | `appAction.ts` | código não normalizado | morto |
| M14 | `appAction.ts` | `nao-permitido` ⇒ `falhou` (sem conferir papel) | morto |
| M15 | `appAction.ts` | sem a guarda `materialTrackingEdit` (`mudou`) | morto |
| M16 | `appAction.ts` | código igual ⇒ `mudou` sem RPC | morto |
| M17 | `orders/appAction.ts` | `materialPassou` ausente ⇒ "passou" | morto |
| **M18** | `orders/history.ts:168` | sem a exigência de `set_at` | **SOBREVIVEU** |
| M19 | `history.ts` | admin rotulado como cliente | morto |
| M20 | backoffice `useAdminOrders.ts` | `nao-permitido` ⇒ `rpc_failed` | morto |
| M21 | `useAdminOrders.ts` | sem `fetchStatusCounts` no ok | morto |
| M22 | `OrderMaterialCard.tsx` | texto antigo no lugar da constante | morto |
| M23 | `EnvelopeDaCliente.tsx` | "Alterar" sem `edicao` | morto |
| M24 | `EnvelopeDaCliente.tsx` | falha da cópia diz "Código copiado." | morto |
| M25 | `EnvelopeDaCliente.tsx` | "Informar" sempre | morto |
| M26 | `shared/config/correios.ts` | sem `encodeURIComponent` | morto |
| **M27** | `MaterialChips.tsx:39` | `tier === 'stale'` → `tier !== 'fresh'` | **SOBREVIVEU** |
| M28 | `useAcaoDoPedido.ts` | sem `materialPassou` na confirmação | morto |
| M29 | `useFolhaNoHistorico.ts` | modo da chave muda com o código | morto |
| M30 | `FolhaDoRastreio.tsx` | volta a reiniciar o campo na releitura | morto |
| M31 | `BlocoMaterial.tsx` | lembrete antes do envelope | morto |
| M32 | `ColocarEmProducao.tsx` | sem devolver o foco | morto |
| M33 | `usePedido.ts` | `buildHistory` sem o 4º argumento | morto |
| **M34** | `EnvelopeDaCliente.tsx:70` | abrir a folha ignorando `acao.travado` | **SOBREVIVEU** |
| M35 | migration | `set_by` invertido | morto |
| M36 | migration | `set_at = coalesce(set_at, now())` | morto |
| **M37** | migration:72 | `where … and material_tracking_code is distinct from v_code` | **SOBREVIVEU** (suíte da loja **e** probe 01-rpc.sql contra a função mutada, em transação desfeita; função do banco conferida intacta depois) |
| M38 | migration | sem `revoke … from anon` | morto |
| M39 | migration | `order_list` sem `material_tracking_set_by` | morto |
| M40 | migration | `v_admin` aceitando prefixo do código | morto |
| M41 | `materialTracking.ts` | gatilho `material_status_changed` | morto |
| M42 | `BlocoMaterial.tsx` | sem os chips | morto |

**Resultado: 38/42 mortos por asserção, 4 sobreviventes — FAIL.**

### 4. Desvios declarados

- **ENV-20 (`em_producao` conta como recebido; sem `received_at` a frase não traz idade)** —
  sustentável. A spec diz "recebido"; `em_producao` só existe depois do recebimento, e a alternativa
  (cair em "ainda não informou") seria falsa. Omitir a idade em vez de inventar é coerente com A2.
  Provado em EV:195.
- **ENV-17 (grade `auto-fit` com piso em rem em vez de `1fr 1fr`)** — sustentável. Com fonte padrão
  continua duas colunas (medido em navegador); com fonte grande empilha, consertando D1 (rótulos
  partidos). A asserção foi reescrita para token exato + ausência de `grid-cols-N` fixo (PG:196) —
  não ficou mais frouxa no que ainda é verificável em jsdom. Falta a confirmação do usuário.
- **Exceção em `semDadoSensivelDeClienteNoApp`** — sustentável. Uma linha, por arquivo e texto exatos
  (`entities/order/model/linha.ts`), com régua 1b exigindo que seja a única no dono e zero na aba
  Clientes, e sensor provando que a mesma linha noutro arquivo é acusada. `ENV-23` exige a coluna;
  `MAC-29` (o que o guarda protege, a aba Clientes) segue intacto. Falta a confirmação do usuário.
- **Painel: exceção síncrona/rejeição do client vira `rpc_failed`** — sustentável e melhor que antes
  (antes a exceção propagava para a tela). A forma `{ ok, reason }` dos outros desfechos é a de antes,
  provada por DL (uma linha por desfecho; `recusado` sem motivo ⇒ `not_allowed`, como o `?? 'not_allowed'`
  antigo). Não esconde defeito.

### 5. Qualidade

- Escopo cirúrgico: o diff toca só o que o `design.md` lista; `buildHistory` ganhou argumento opcional
  e as chamadas de 3 argumentos estão provadas idênticas (HI). `payment/**` sem alteração.
- Um dono por regra: `canStartProduction` serve botão e guarda; `customerFirstName` substituiu o
  `quemRecebe` local por referência; `devolverFoco` saiu para `model/foco.ts` com dois leitores.
- Frases por extenso nos testes (nunca lidas da constante que provam), em core, app e painel.

### 6. Gaps ranqueados (fix tasks)

1. **M37 — a RPC não tem prova de que regravar o MESMO código atualiza `set_at`/`set_by`** (Edge Case
   da spec; é o que faz "Registrado por você" aparecer quando a Adri confirma o código que a cliente
   informou). `supabase/migrations/20261028120000_82-envelope-da-cliente.sql:66-72`. Mataria: um caso
   novo em `probes/01-rpc.sql` — cliente grava X, admin grava X de novo ⇒ `set_by = 'admin'` (e, num
   segundo passo com `update` de `set_at` para o passado, `set_at = now()`); opcionalmente uma régua em
   `envelopeSchema.test.ts` recusando condição além de `id = p_order_id` no `where` do `update`.
2. **M27 — o degrau `warm` não tem caso** (ENV-24, A3). `apps/mobile-adm/src/widgets/order-detail/ui/MaterialChips.tsx:39`.
   Mataria: em `envelopeDaCliente.test.tsx`, um pedido aguardando há 5 dias (`data-degrau="warm"`)
   com `text-estrelinha-ink-soft` e sem `text-estrelinha-wait`.
3. **M18 — "Sem `set_at`, nenhuma linha" só é provado com `set_by` também nulo** (ENV-21).
   `packages/core/src/orders/history.ts:168`. Mataria: em `history.test.ts`, `{ code: 'AN1…', set_at: null,
   set_by: 'admin' }` ⇒ `[]`.
4. **M34 — abrir a folha do envelope com a ação do pedido no ar não tem régua** (ENV-12, "mesma trava").
   `apps/mobile-adm/src/features/order-actions/ui/EnvelopeDaCliente.tsx:70`. Severidade baixa: o
   Salvar já fica `aria-disabled` com a trava. Mataria: pela página, com o "Colocar em produção"/rodapé
   pendurado, tocar "Informar código do envelope" ⇒ nenhum `dialog`.
5. Precisão (sem mutante): PG:516 — a "chave vizinha intacta" é criada depois da invalidação e é
   verdadeira nos dois mundos (popular a vizinha ANTES de salvar); PG:382 — a recusa de "Colocar em
   produção" deveria exigir a frase de `materialTransitionRefusal(status, 'em_producao')`; ENV-01/03 —
   ícone `EnvioIcon`/`+` e a tipografia 15/700 sem asserção; ENV-12 — voltar do Android com
   `origem: 'material'` sem caso próprio.

### 7. Lições

`.specs/LESSONS.md` L-072 (M37: regravar o mesmo valor precisa de caso no probe) e L-073 (M27: degrau
intermediário sem caso).

---

## Conserto da rodada 1 — 2026-10-26 (só testes e probe; nenhum código de produção alterado)

> Autor do conserto ≠ verificador da rodada 1, mas o conserto NÃO passou por verificador independente:
> os mutantes abaixo foram reinjetados pelo próprio autor do conserto. Nenhum teste novo revelou
> defeito de produto.

### Casos novos

| Arquivo | Casos | O quê |
| --- | --- | --- |
| `probes/01-rpc.sql` | **+1** (`caso 1b`) | a cliente grava X; `set_at` empurrado 1 h para trás; a admin regrava X ⇒ `set_by = 'admin'`, `set_at = now()`, código e estado intactos (M37). `now()` é o instante da transação, por isso o empurrão: sem ele "atualizou" e "ficou" seriam o mesmo valor. Re-rodado contra o banco local: **9 `ok —`, exit 0** (`01-rpc.out`) |
| `apps/store/…/envelopeSchema.test.ts` | **+1** | `whereDoUpdate`: o `where` do `update` é exatamente `id = p_order_id`; sensores com `mutar()` — a condição de M37, outra condição qualquer, e o `where` ausente devolvendo `null` (reprova, nunca aprova por ausência) |
| `packages/core/…/orders/__tests__/history.test.ts` | **+1** | `{ code, set_at: null, set_by: 'admin' }` e `'customer'` ⇒ `[]` (M18) |
| `apps/mobile-adm/src/pages/__tests__/envelopeDaCliente.test.tsx` | **+5** e 4 reforços | (+1) aguardando há 5 dias, `data-degrau="warm"`, `ink-soft` e não `wait` (M27); (+2) com "Recebi o material" pendurado no rodapé, tocar "Informar código do envelope" e "Alterar" não abre `dialog` nem chama a RPC (M34); (+1) o par: sem ação no ar, "Informar" abre; (+1) ENV-12: o voltar do navegador (`history.back()`) com a folha `origem: 'material'` aberta e o campo preenchido fecha a folha, fica em `/pedidos/<id>`, zero `set_material_tracking`, zero aviso. Reforços (precisão): ENV-01 compara os traços do ícone com os do `EnvioIcon` renderizado sozinho (`renderToStaticMarkup`) e exige `font-display`/`text-[15px]`/`font-bold` no título por token; ENV-03 exige `svg.lucide-plus` `aria-hidden` no botão; ENV-25 exige a frase exata de `materialTransitionRefusal('aguardando_material', 'em_producao')` (importada de core); ENV-08 cria a chave vizinha ANTES do Salvar e confere que ela segue válida depois |

### Mutantes reinjetados (arquivo real, alvo exatamente uma vez, SHA-256 conferido na restauração)

| # | Mutação | Rodado contra | Resultado |
| --- | --- | --- | --- |
| M37 | migration: `where id = p_order_id and material_tracking_code is distinct from v_code` | suíte da loja inteira (`--testTimeout=20000`) **e** o probe com a função mutada criada dentro da transação | **morto por asserção** nas duas: `envelopeSchema` ("expected 'id = p_order_id and material_tracking…' to be 'id = p_order_id'"), 1 falha em 6031; probe `FALHOU — caso 1b set_by=customer`, exit 3, transação desfeita. Função do banco conferida intacta depois (`md5(pg_get_functiondef)` igual antes/depois, `15a76da5…`, e sem a condição) |
| M27 | `MaterialChips.tsx`: `tier === 'stale'` → `tier !== 'fresh'` | `envelopeDaCliente.test.tsx` | **morto por asserção** — o caso `warm` ("expected [...] to include 'text-estrelinha-ink-soft'") |
| M18 | `history.ts`: sem `envelope?.material_tracking_set_at &&` | `history.test.ts` | **morto por asserção** ("expected [ { id: 'envelope-null', … } ] to deeply equal []") |
| M34 | `EnvelopeDaCliente.tsx`: `if (!acao.travado) controle.abrir()` → `controle.abrir()` | `envelopeDaCliente.test.tsx` | **morto por asserção** — os dois casos de M34 ("expected <div role="dialog" …> to be null") |

`sha_ok=True` nos quatro. Nenhum morreu por compilação.

### Gate (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Testes / arquivos | Exit | Contra a rodada 1 |
| --- | --- | --- | --- |
| core | 4570 / 180 | 0 | +1 |
| mobile-adm | 2095 / 129 | 0 | +5 |
| store | 6031 / 327 | 0 | +1 |

`tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` **0**; `eslint .` no mobile-adm **0/0**. Backoffice não tocado e
não remedido (3923/225 da rodada 1).

---

## Rodada 2 — consertos do QA (Fase 5, tasks 16–22) — 2026-10-27

> Verificador independente (não escreveu a feature nem os consertos). Cobertura derivada dos bugs e do
> código, não dos relatórios. Nenhum código de produção ou teste alterado nesta rodada.

**Veredito: FAIL (cobertura).** Nenhum defeito de produto novo achado pela suíte; 27 mutantes nos
consertos, **23 mortos por asserção, 0 por compilação, 4 sobreviventes** — dois deles em superfícies que a
matriz de T17 exige (o cartão da lista e o erro em dobro no bloco do envelope).

### Evidência por bug

| Bug / task | Prova (arquivo:linha) | Discrimina? |
| --- | --- | --- |
| T16 rede cai ao salvar | `pages/__tests__/envelopeDaCliente.test.tsx:645` (RPC grava, resposta perdida ⇒ alerta na folha, zero avisos; "Tentar de novo" ⇒ 2ª RPC com o MESMO código, 1 gatilho `material_tracking_set`, folha fecha, confirmação) e `:679` (folha fechada ⇒ alerta no bloco, retentativa regrava); `useAcaoDoPedido.test.tsx:375-397` (código normalizado na retentativa; exceção idem; recusa e outras ações sem retentativa); `FolhaDoEnvelope.test.tsx:273` | Sim (V12, V13 mortos). A retentativa num pedido que deixou de ser editável vira `mudou` sem rede: provado só em `core` (`order-actions/__tests__/appAction.test.ts`, V27 morto, 4 casos); não há caso pela tela (gap 4) |
| T17 erro com dono | `useAcaoDoPedido.test.tsx:412` (`it.each` das 4 origens × `erroDe`), `envelopeDaCliente.test.tsx:704-748` (primária × folha do envelope; envelope × rodapé; envelope × folha de saída; primária sobrescreve o envelope), ENV-25 reescritos (produção no bloco, rodapé sem alerta), `ColocarEmProducao.test.tsx:61-95` | Parcial: rodapé, folha de saída, bloco do envelope e produção discriminam (V03, V04, V06, V08, V09–V11 mortos). **O cartão da lista (`BotaoDaAcao`) não tem caso nenhum com erro de outra origem — V02 sobrevive.** O bloco do envelope com a folha ABERTA não tem régua — V07 sobrevive. A recusa por papel segue em `acoesComClientReal` (V10 matou 16 casos lá também); a 75 não regrediu (suíte inteira verde) |
| T18 carência de 5 s | `shared/lib/__tests__/useOnline.test.ts:48-110` (4.999/5.000, volta cancela, "contínuos" com volta no meio, leitura do fim, desmontar com `getTimerCount() === 0`); `envelopeDaCliente.test.tsx:751-797` (1 s com a folha aberta: folha, digitado e foco ficam; 4,9 s/5 s); `semConexao.test.tsx` (abrir offline imediato) | Sim (V16, V17 mortos). Dois `offline` seguidos sem `online` no meio não têm caso — V15 sobrevive (baixa gravidade). Escrita tentada offline dentro da carência: o mecanismo é o mesmo `falhou` de T16 (fetch rejeita ⇒ `ACTION_FAILED` + retentativa), sem caso próprio de "offline" — aceito |
| T19 código normalizado | core `orders/__tests__/tracking.test.ts:125`, `order-actions/__tests__/materialTracking.test.ts`, `appAction.test.ts`; painel `useAdminOrders.delega.test.ts:346` (dono real); loja `useSetMaterialTracking.test.tsx:127` (+ aviso contido em `:~100`); app `FolhaDoEnvelope.test.tsx:144` | Sim (V19, V20, V24, V25, V26 mortos). `normalizeTrackingCode` (saída) mantém o hífen — caso em `tracking.test.ts`; `normalizeTrackingCode` só ganhou `\p{Cf}` (QA anterior), hífen intocado |
| T20 a cliente no meio | core `orders/__tests__/appAction.test.ts:600,616,619`, `material/__tests__/envelope.test.ts` | Sim (V21, V22 mortos). Varredura: as demais frases com nome começam a frase. Fora do escopo do bug mas da mesma família: o lembrete do WhatsApp (`core/orders/charge.ts:48`) sai "Oi, Oi!" sem nome, preservado de propósito por `charge.test.ts:70` — o lembrete aparece no bloco Material da `82` (observação, não gap) |
| T21 "Esperando há" | core `material/__tests__/envelope.test.ts:223`; app `envelopeDaCliente.test.tsx:346` (singular) e os três degraus | Sim (V23 morto). `material/aging.ts` (`queueAgeLabel`) sem diff (`git status`) |
| T22 só doc | `apps/mobile-adm/CLAUDE.md:428`, `.specs/BACKLOG.md` `BL-055` | n/a — confirmado que nenhum código mudou para reavisar |

### Mutantes (arquivo real; alvo exatamente uma vez; suíte INTEIRA do workspace, `--testTimeout=20000`; SHA-256 conferido na restauração — `sha_ok=True` nos 27)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| V01 | `model/useAcaoDoPedido.ts` | `erroDe` ignora a origem | morto (11) |
| V02 | `ui/BotaoDaAcao.tsx` | cartão da lista lê `acao.erro` (qualquer origem) | **SOBREVIVEU** |
| V03 | `ui/RodapeDaAcao.tsx` | rodapé também com `producao` | morto (2) |
| V04 | `ui/FolhaDoRastreio.tsx` | folha de saída também com `rastreio-do-material` | morto (1) |
| V05 | `ui/FolhaDoRastreio.tsx` | folha do envelope também com `producao` | SOBREVIVEU — equivalente na prática: o erro de produção só nasce em `material_recebido`, estado em que a folha do envelope não abre (`materialTrackingEdit`) |
| V06 | `ui/EnvelopeDaCliente.tsx` | bloco também com `producao` | morto (2) |
| V07 | `ui/EnvelopeDaCliente.tsx` | tira `|| controle.aberta` (o erro no bloco E na folha) | **SOBREVIVEU** |
| V08 | `ui/ColocarEmProducao.tsx` | produção também com `primaria` | morto (1) |
| V09 | `model/useFolhaNoHistorico.ts` | `ORDER_CHANGED` sempre com origem `rastreio` | morto (1) |
| V10 | `model/useAcaoDoPedido.ts` | desfecho sem origem | morto (16) |
| V11 | `model/useAcaoDoPedido.ts` | exceção sem origem | morto (1) |
| V12 | `ui/FolhaDoRastreio.tsx` | "Tentar de novo" da folha sem `aoConcluir: fechar` | morto (2) |
| V13 | `ui/EnvelopeDaCliente.tsx` | retentativa do bloco reenvia `primaria` | morto (1) |
| V14 | `model/useAcaoDoPedido.ts` | sucesso não limpa o erro | morto (5) |
| V15 | `shared/lib/useOnline.ts` | `offline` repetido recomeça a carência | **SOBREVIVEU** |
| V16 | `shared/lib/useOnline.ts` | abrir offline deixa de ser imediato | morto (6) |
| V17 | `shared/lib/useOnline.ts` | carência 4.950 ms | morto (2) |
| V18 | `ui/FolhaDoRastreio.tsx` | alerta da folha visível com a ação no ar | morto (1) |
| V19 | core `orders/tracking.ts` | o envelope mantém o ponto | morto (7) |
| V20 | core `order-actions/materialTracking.ts` | vazio vai à RPC | morto (1) |
| V21 | core `orders/appAction.ts` | meio de frase "A cliente" | morto (4) |
| V22 | core `orders/appAction.ts` | "da Maria" com nome | morto (2) |
| V23 | core `material/envelope.ts` | "Esperando há 1 dias" | morto (1) |
| V24 | loja `useSetMaterialTracking.ts` | o aviso deixa de ser contido (relança) | morto (2) |
| V25 | loja `useSetMaterialTracking.ts` | `nao-permitido` perde `not_allowed` | morto (1) |
| V26 | painel `useAdminOrders.ts` | `recusado` sem motivo perde `not_allowed` | morto (1) |
| V27 | core `order-actions/appAction.ts` | retentativa em pedido não editável vai à rede | morto (4) |

### Gate (um workspace por vez, exit fora de pipe)

| Workspace | Testes / arquivos | Exit |
| --- | --- | --- |
| core | 4600 / 180 | 0 |
| mobile-adm | 2126 / 129 | 0 |
| store | 6035 / 327 | 0 |
| backoffice | 3926 / 225 | 0 |

`tsc`: store 0 · backoffice 0 · mobile-adm (app) 0 · mobile-adm (`tsconfig.node.json`) 0 · core 11 (herdados).
Lint: mobile-adm 0/0 · backoffice 23/5 · store 2/2. Idêntico ao fecho declarado da Fase 5.

### Gaps ranqueados

1. **V02 — o cartão da lista não tem caso com erro de outra origem** (`ui/BotaoDaAcao.tsx:39`). Alcançável:
   o envelope falha, "Agora não", voltar a `/pedidos` ⇒ com o mutante o cartão mostra "Não consegui salvar"
   ao lado de "Recebi o material" — o mesmo defeito do bug, na superfície de OUTRA rota (o erro mora em
   módulo e sobrevive à navegação). Mataria: em `envelopeDaCliente.test.tsx` (ou `acoesDoPedido.test.tsx`),
   falhar o envelope (e a produção), ir à lista pelo `<App />` real e exigir zero `role="alert"` no cartão
   do pedido; e o par: a falha da primária pelo cartão aparece no cartão.
2. **V07 — com a folha do envelope aberta, o bloco não tem régua de "sem alerta"**
   (`ui/EnvelopeDaCliente.tsx:72`). Com o mutante o erro aparece duas vezes (na folha e no bloco atrás dela).
   Mataria: no caso T16 `:645`, depois do Salvar que falha, `within(envelope()).queryByRole('alert', { hidden: true })` nulo com a folha aberta.
3. **V15 — dois `offline` seguidos sem `online`** (`shared/lib/useOnline.ts:39`). Com o mutante a carência
   recomeça e a tela "Sem conexão" atrasa; baixa gravidade. Mataria: em `useOnline.test.ts`, `offline`,
   3 s, `offline` de novo, 2 s ⇒ `false`.
4. **Precisão (sem mutante)**: a retentativa do envelope num pedido que deixou de ser editável vira
   `ORDER_CHANGED` sem rede — provado só em core; falta o caso pela tela (Agora não ⇒ realtime traz
   `material_recebido` ⇒ "Tentar de novo" ⇒ zero `set_material_tracking`, frase de pedido mudado no bloco).
   E o título de `envelopeDaCliente.test.tsx:737` diz que "a do envelope não some com uma nova falha da
   primária", mas o caso assere o contrário (o envelope SEM alerta) — título a corrigir. Consequência do
   modelo de erro único (decisão do T17): uma nova falha ou um sucesso de outra ação apaga a retentativa
   do envelope; com sucesso de "Recebi o material" o envelope deixa de ser editável e isso é inócuo, mas
   com uma FALHA da primária a Adri perde o "Tentar de novo" de um código que pode ter gravado sem aviso.
5. **Observação** (fora do escopo de T20): `core/orders/charge.ts:48` — o lembrete do WhatsApp sem nome sai
   "Oi, Oi!", preservado por `charge.test.ts:70`.

Mutantes e logs: scratchpad do verificador (`mut/mutantes.py`, `mut/resultados.txt`).

---

## Conserto da rodada 2 — 2026-10-27 (testes; e UM conserto de produto achado no reteste em navegador, abaixo)

> Autor do conserto ≠ verificador da rodada 2; o conserto NÃO passou por verificador independente — os
> mutantes abaixo foram reinjetados pelo próprio autor do conserto. Nenhum teste novo revelou defeito
> de produto.

### Casos novos e mudados

| Arquivo | Casos | O quê |
| --- | --- | --- |
| `pages/__tests__/envelopeDaCliente.test.tsx` | **+4** (V02) | pelo `<App />` real, montado sem `doApp` (o "Voltar" do detalhe vai a `/pedidos`, E7): o envelope falha ⇒ "Agora não" ⇒ lista ⇒ **zero** `role="alert"` (inclusive `hidden`) no cartão do pedido; o mesmo com "Colocar em produção" (500); o par: a falha da primária no rodapé do detalhe segue com o pedido e aparece no cartão; o par pelo cartão: a primária tocada no cartão falha ⇒ o alerta no cartão |
| idem | **+0**, 2 asserções (V07) | no caso T16 "a RPC gravou e a resposta se perdeu": com a folha aberta depois da falha, `within(envelope()).queryByRole('alert', { hidden: true })` nulo e um único `alert` na tela inteira (o da folha) |
| idem | **+1** (gap 4) | falha do envelope ⇒ "Agora não" ⇒ o Realtime (`fake.emitir('orders')`) traz `material_recebido` ⇒ "Informar/Alterar" saem, o alerta fica ⇒ "Tentar de novo" ⇒ `set_material_tracking` segue com **1** chamada, zero aviso, o alerta do envelope diz "Este pedido mudou enquanto você olhava." sem "Tentar de novo", nenhuma confirmação |
| idem | título (gap 4) | o caso de `:737` passou a dizer o que assere: "a falha da primária depois da do envelope: o alerta vai ao rodapé e o envelope fica SEM alerta (o erro é um por pedido; a última ação é a dona)" |
| `shared/lib/__tests__/useOnline.test.ts` | **+1** (V15) | `offline`, 3 s, `offline` de novo, 1.999 ms ⇒ ainda `true`; +1 ms ⇒ `false` (a contagem não recomeça) |

### Mutantes reinjetados (arquivo real, alvo exatamente uma vez, suíte INTEIRA do mobile-adm, SHA-256 conferido na restauração)

| # | Mutação | Resultado |
| --- | --- | --- |
| V02 | `BotaoDaAcao.tsx`: `acao.erroDe(ERROS_DO_RODAPE)` → `acao.erro` | **morto por asserção** — 2 casos ("expected [ <div role="alert" …> ] to have a length of +0 but got 1"), 2130 passaram |
| V07 | `EnvelopeDaCliente.tsx`: `acao.travado \|\| controle.aberta ? null` → `acao.travado ? null` | **morto por asserção** — 1 caso (T16, "expected <div role="alert" …> to be null") |
| V15 | `useOnline.ts`: `if (contagem !== null) return` → `desarmar()` (o segundo `offline` recomeça) | **morto por asserção** — 1 caso ("expected true to be false") |

`sha_ok=True` nos três; nenhum morreu por compilação.

### O "Oi, Oi!" (`core/orders/charge.ts:48`)

`charge.test.ts:70` o preserva com o título "o texto do painel, sem conserto de passagem": a razão
registrada é a da **subida byte a byte** do painel para `core` na `75` (`MAA-28`) — não mudar o texto no
mesmo movimento que muda o dono. Não é uma decisão de redação. **Não alterado.** Fica como decisão
pendente, com recomendação: sem primeiro nome, abrir com "Oi! Aqui é a Adri, da Uma Estrelinha." (uma
linha em `charge.ts`, a asserção de `:70` reescrita para o novo esperado, e o painel acompanha por
referência — `lembreteNoCore`). O lembrete só aparece com telefone válido, mas o nome pode faltar
(convidada antiga, importação).

### Achado do reteste em navegador (2026-10-27) — o foco no `<body>` depois do "Tentar de novo" do bloco

No reteste do `BUG-20261026-rede-cai-ao-salvar-…` (6,5 s sem rede ⇒ "Sem conexão" ⇒ a folha some ⇒ o erro no
bloco do envelope), o "Tentar de novo" do BLOCO regravou e o aviso saiu, mas o botão sai da tela com o
sucesso e o foco caiu no `<body>` — a mesma classe de C03 (`75`) e D3 (`82`). Também no desfecho `mudou`
(a frase fica, sem retentativa). Conserto mínimo em `ui/EnvelopeDaCliente.tsx`: a retentativa do bloco passa
`{ aoConcluir: () => devolverFoco(null) }` e, sem sucesso, se o foco ficou no `<body>`, `devolverFoco(null)`
(o título da página). Testes: duas asserções `document.activeElement === h1` (o caso T16 "com a folha
fechada" e o caso do gap 4), com o botão FOCADO antes do toque — o `fireEvent.click` do jsdom não move o
foco, e sem isso as duas passavam com o defeito (medido). Reprovaram antes do conserto (2 × `expected <body>
to be <h1>`). Mutantes: F1 (sem o `aoConcluir`) e F2 (sem o recuo do `mudou`) reinjetados, suíte inteira,
`sha_ok=True`, **mortos por asserção** (1 caso cada). Retestado no build servido: foco no `h1` "Pedido #P82-A".

### Gate (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe; depois do conserto do foco)

| Workspace | Testes / arquivos | Exit | Contra a rodada 2 |
| --- | --- | --- | --- |
| mobile-adm | 2132 / 129 | 0 | +6 |
| store | 6035 / 327 | 0 | 0 (remedida: os guardas varrem `apps/**`) |
| backoffice | 3926 / 225 | 0 | 0 (remedida) |

`tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` **0**; `eslint .` no mobile-adm **0/0**. Core não tocado
e não remedido; `pnpm --filter @estrelinha/mobile-adm build` verde.
