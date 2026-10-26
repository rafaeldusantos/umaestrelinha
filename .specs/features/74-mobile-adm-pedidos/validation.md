# 74 — Validação independente

## Rodada 1 — 2026-10-24 — **FAIL** (uma lacuna de cobertura, nenhum defeito de produto)

> Verificador ≠ autor. Evidência ou zero: toda afirmação abaixo vem de comando rodado nesta rodada,
> no worktree `store-74-mobile-adm-pedidos` (branch `feat/74-mobile-adm-pedidos`, sobre `775e407e`),
> com a árvore sem commit da `74`. Nenhum arquivo de produto ou de teste foi editado pelo verificador:
> todo mutante foi reinjetado no arquivo real e restaurado com SHA-256 conferido (o arnês lança se o
> alvo não existe ou se a restauração diverge).

### 1. Suítes, tipos e lint (medidos agora, um workspace por vez, exit fora de pipe)

| Workspace | Arquivos | Testes | Exit |
| --- | --- | --- | --- |
| mobile-adm | 61 | 790 | 0 |
| core | 158 | 3988 | 0 |
| backoffice | 210 | 3670 | 0 |
| store | 318 | 5849 | 0 |
| functions | 21 | 957 | 0 |
| catalog-import | 23 | 512 | 0 |
| **Total** | **791** | **15766** | |

Bate exatamente com a linha *Testes* que o autor escreveu no `CLAUDE.md` raiz. Contra a baseline de
entrada (`baseline.md`, 15184/756): +582/+35, nenhuma queda.

- `tsc --noEmit`: mobile-adm 0, backoffice 0, store 0; `packages/core` **11** (os herdados, iguais à
  baseline).
- `eslint .`: mobile-adm **0/0**; backoffice **23/5** (= baseline).
- Painel "sem asserção tocada" (`MAP-47`): o diff de `useAdminOrderList.test.ts` é **só aditivo**
  (um import e um `describe` novo); nenhuma linha antiga removida. `regrasDoPedidoNoCore.test.ts`
  cobra os 17 caminhos por `toBe`.

### 2. Probes contra o banco local (re-rodados pelo verificador)

- `probes/02-lista.sh`: **exit 0, 50 `ok`, "TUDO OK"**, banco restaurado (54 → 54). Cobre as seis
  visões (app = painel = SQL escrito à mão), os quatro blocos (lista = `store_overview` = tile do
  painel), `#0244`/`0244`/`244`, os três `or=` juntos, a paginação com `insert` no meio e o sensor R1
  (cursor por `Date` pula/repete).
- `probes/03-cliente-sem-papel.sh`: **"TUDO OK"**, restaurado (54/9). A cliente sem papel recebe o
  pedido DELA da `order_list` sem erro, e `atelie_clock` a recusa com `42501` — a premissa do G-A1
  está medida, não suposta.
- Migration `20261024120000` registrada no banco local (`schema_migrations`: 1 linha).

### 3. Sensor de mutação — 77 mutantes nos arquivos reais

Arnês: substitui o alvo (lança se ausente), roda `vitest run` só nos arquivos do assunto, classifica a
morte por compilação (`SyntaxError`/`Transform failed`/…) ou por asserção, restaura e confere o
SHA-256. **Nenhum mutante morreu por compilação.**

| Lote | Onde | Mutantes | Mortos por asserção | Sobreviventes |
| --- | --- | --- | --- | --- |
| V01–V54 | app (`lerComPapel`, hooks, páginas, lista, linha, detalhe, selo, Início, busca, chips, endereço) | 54 | 52 | **2** (V19, V39) |
| C01–C18 | `core/orders` (`list`, `views`, `delivery`, `labels`, `row`) e `core/material/steps` | 18 | 17 | **1** (C12) |
| B01–B05 | regras subidas, medidas pela suíte do **painel** (`MAP-47`/`MAP-48`) | 5 | 5 | 0 |
| S01–S06 | migration `atelie_clock` (`atelieClockSchema`) e a lista literal de RPCs (`marcacaoSoPorAcao`) | 6 | 6 | 0 |
| G01–G05 | guardas do app (`regraDePedidoSoNoCore`, `enderecoDePedidosComDonoUnico`, `movimentoDosPedidos`, `rotasSobGuarda`/`abasSaoAsRotas`) | 5 | 5 | 0 |

Os que mais pesavam, todos mortos: a recusa ignorada ou vencida pela falha da consulta (V01, V02), o
200 sem `lido_em` (V03), **o cache desenhado na recusa** na lista e no detalhe (V04, V05 — `MAP-36`
"nem o de antes"), o canal aberto antes da confirmação (V06, V07), o chip empilhando histórico (V08),
a geração do `carregarMais` (V10, E3), a janela relida só com 25 (V11, G-A11), a próxima página
pedindo contagem (V12, G-A9a), o histórico ignorando a falha das notas (V16), o Total recalculado
(V32), o WhatsApp sem normalizar (V35), a retirada com endereço (V37), o selo com número de cache na
falha (V40), "Últimos pedidos" sem link (V44), o cursor `gte`/sem aspas/sem desempate (C01–C03), a
ordem da fila (C04, C05), o bloco virando a visão de nome parecido (C11), a frase do painel mudando
em `core` (B01–B03, a suíte do painel acusa), a cópia no lugar da reexportação (B04), e cada régua
da migration (S01–S05).

**Sobreviventes:**

| # | Mutação | Veredito |
| --- | --- | --- |
| V19 | `ListaDePedidos`: a sentinela fica `ativo` com a próxima página em falha | **Equivalente.** Na falha da próxima o ramo desenha `FalhaDoBloco` no lugar da sentinela; o `ref` de callback recebe `null`, e `useSentinela` não observa nada sem alvo. Não há estado observável diferente |
| C12 | `applyOrderSlice`: o `in` antes do `or` | **Equivalente.** Nenhuma das seis visões tem `or` **e** `in` ao mesmo tempo, e o PostgREST combina parâmetros por AND sem depender da ordem |
| **V39** | `BlocoMaterial`: `materialSubline(pedido, new Date().toISOString())` — a linha sob o título pelo **relógio do aparelho** em vez do `lido_em` | **LACUNA (G1, abaixo).** Sobreviveu por coincidência de calendário |

### 4. Lacuna G1 — "nada pelo relógio do aparelho" (A2, decidido no gate) não é provado no bloco Material

O caso `CabecalhoClienteMaterial.test.tsx:160–166` assere `'Recebido há 1 dia'` (recebido
`2026-10-22T14:30Z`) e `'Pedido feito há 3 dias'` (`2026-10-20T14:00Z`) contra
`LIDO_EM = 2026-10-23T14:30Z`, **sem fixar o relógio do sistema**. `relativeAge` é duração em dias
inteiros; no instante desta rodada (`2026-10-24T04:15Z`) o relógio real dá 1d13h e 3d14h — os
**mesmos** rótulos. A asserção é verdadeira nos dois mundos hoje; a partir de ~`2026-10-24T14:30Z`
o mutante passa a morrer, e o teste decide pelo calendário, não pela regra.

Os irmãos **não** têm o furo — e é isso que prova que é lacuna e não equivalência: o mesmo mutante no
cabeçalho (V50), no histórico (V49), na linha da lista (V22) e na idade da linha (V51) **morre**,
porque aqueles casos usam datas cuja distância ao relógio real muda o rótulo.

- **Requisito afetado**: A2/G-A2 ("nada pelo relógio do aparelho"), aplicado a A23/`MAP-23` (a linha
  "Recebido há…"/"Pedido feito há…" do bloco Material afetivo). O código de hoje está **certo** (passa
  o `lidoEm`); falta a prova.
- **Conserto proposto (só teste)**: no caso de `MAP-23`/A23, fixar o relógio do aparelho longe do
  `LIDO_EM` (`vi.useFakeTimers(); vi.setSystemTime('2027-01-01T00:00:00Z')`, restaurado no `afterEach`),
  ou escolher `material_received_at`/`created_at` tais que o relógio real nunca produza o mesmo
  rótulo. Reinjetar V39 e conferir a morte por asserção; conferir que V49/V50 continuam mortos.

### 5. Testes que montam a própria árvore / asserção verdadeira nos dois mundos

- As páginas são provadas pelo `<App />` real (`montarApp`, `PedidosPage.test.tsx`,
  `PedidoPage.test.tsx`) com sessão admin sobre o dublê que registra a cadeia; a fiação Início →
  bloco → lista → detalhe → voltar é provada pela árvore real (V24, V25, V27, V44 morrem). Não achei
  teste que recrie a composição da página.
- O recorte esperado é montado passando um gravador por `applyOrderSlice` (derivação de `core`), e o
  que a página prova é "o endereço chega ao hook sem acréscimo"; a independência de `core` vem do
  probe `02-lista` (oráculo SQL à mão). Aceito.
- Única asserção verdadeira nos dois mundos encontrada: a de G1.

### 6. Observações (não bloqueiam)

- **O1/O2 do `prova-navegador.md`** ("há 0 dias" na idade de um pedido de horas; "Falha ao enviar
  aviso … enviado") confirmados como herdados e byte a byte iguais ao painel (`MAP-48`): fora da `74`.
- `lerDestinoDePedidos('?bloco=xyz&visao=tudo')` devolve `null` (⇒ "Precisa de ação") em vez de
  obedecer à visão válida. Coerente com a régua escrita da `73` ("bloco vence visão") e coberto por
  teste (V47 morre); só registro.
- `order_items` é lido sem `order(...)`: a ordem dos itens no detalhe é a do banco. O painel também
  não ordena; nenhuma AC pede ordem.
- O nome acessível das linhas de "Últimos pedidos" usa `customer_name` sem queda para o e-mail (a
  linha da lista cai). `orders.customer_name` é `NOT NULL` no banco local; só uma string vazia
  produziria "Pedido #x, ".
- Não verificado nesta rodada (fica com a prova do autor): navegador real (360/390/412, fonte
  130/200 %), app instalado em Android.

### Veredito da rodada 1

**FAIL** — por uma lacuna de cobertura (G1), sem defeito de produto. 77 mutantes: 74 mortos por
asserção, 0 por compilação, 2 equivalentes declarados (V19, C12) e 1 sobrevivente real (V39).
Suítes, tipos, lint e probes sem regressão. Para a rodada 2: fechar G1 pelo conserto da §4 e
reinjetar V39.

## Conserto da rodada 1 (G1) — 2026-10-24

- **G1 fechado, só teste.** `apps/mobile-adm/src/widgets/order-detail/__tests__/CabecalhoClienteMaterial.test.tsx`: o `describe` do material passou a fixar o relógio do aparelho em `2027-01-01T00:00:00Z` (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime`, restaurado com `vi.useRealTimers()` no `afterEach`). Nenhuma asserção mudou; nenhum código de produto mudou.
- **V39 reinjetado** no arquivo real (`materialSubline(pedido, new Date().toISOString())` em `BlocoMaterial.tsx`): **morto por asserção**, 2 casos — "Recebido há 70 dias" ≠ "Recebido há 1 dia" e "Pedido feito há 72 dias" ≠ "Pedido feito há 3 dias". Restaurado com SHA-256 conferido.
- Gates do workspace tocado: `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` exit 0, **790 testes em 61 arquivos** (contagem inalterada — nenhum caso novo); `tsc -p apps/mobile-adm/tsconfig.app.json` 0; eslint do mobile-adm 0/0. Os outros workspaces não foram tocados.

## Rodada 2 — 2026-10-24 — **FAIL** (um desvio de `G-A28`, três lacunas de cobertura, uma suíte instável)

> Verificador ≠ autor. Evidência ou zero, medida nesta rodada no mesmo worktree, com a árvore sem
> commit da `74` (o conserto de G1 incluso). Nenhum arquivo de produto ou de teste da feature foi
> editado: todo mutante foi reinjetado no arquivo real e restaurado com SHA-256 conferido (o arnês
> lança se o alvo não aparece exatamente uma vez ou se a restauração diverge). Uma sonda temporária
> (`src/shared/lib/zzSondaDoVerificador.test.tsx`) foi criada, rodada e **apagada** (§4, D1).

### 1. Suítes, tipos e lint (um workspace por vez, exit fora de pipe)

| Workspace | Arquivos | Testes | Exit |
| --- | --- | --- | --- |
| mobile-adm | 61 | 790 | 0 (ver §5: 1 reprovação em 5 execuções completas) |
| core | 158 | 3988 | 0 |
| backoffice | 210 | 3670 | 0 |
| store | 318 | 5849 | 0 |
| functions | 21 | 957 | 0 |
| catalog-import | 23 | 512 | 0 |
| **Total** | **791** | **15766** | |

Idêntico à rodada 1 (o conserto de G1 não acrescentou caso). `tsc --noEmit`: mobile-adm 0,
backoffice 0, store 0, `packages/core` 11 (os herdados). `eslint .` do mobile-adm: 0/0.

### 2. G1 da rodada 1 — **fechado**

`CabecalhoClienteMaterial.test.tsx` fixa o relógio do aparelho em `2027-01-01T00:00:00Z` no
`describe` do material (`vi.useFakeTimers({ toFake: ['Date'] })`, restaurado no `afterEach`). V39
reinjetado (`materialSubline(pedido, new Date().toISOString())` em `BlocoMaterial.tsx`): **morto por
asserção**, 2 casos ("Recebido há 1 dia", "Pedido feito há 3 dias"). Os irmãos do relógio também
morrem: o histórico (R35) e o cabeçalho (R36).

### 3. Sensor de mutação — 58 mutantes novos (R01–R40, L01–L14, C01–C04) + V39

Arnês próprio (Python): substitui, roda a suíte **inteira** do mobile-adm (ou `src/orders` de `core`),
classifica compilação × asserção, restaura e confere o SHA-256. **Nenhum mutante morreu por
compilação.** Cada morte foi conferida pelo nome do caso que caiu (§5: o caso instável MAF-06 nunca
foi a única morte de um mutante).

Mortos por asserção (54, contando V39): o selo (99 ⇒ "99+" cedo, 0 com selo, o singular trocado, o nome acessível
apagado, **o número de cache com a releitura falhada** — R01–R05), a rolagem (sem restaurar, gravando
0 — R06, R07), o detalhe no topo (R08), o título do documento (R09), "N joias" por linhas (R10),
"grátis" (R11), as três linhas de desconto com `>= 0` e o cupom sem código (R12, R14–R16), o tom do
pagamento (R13), o endereço sem complemento, sem bairro e o CEP sem máscara (R17–R19), o nome sem
queda para o e-mail no detalhe e na linha (R20, L02), `noreferrer` e `_blank` (R21, R22), o telefone
com o `55` (R23), a ordinal sumindo (R24), a falha trocando o dado pela releitura falhada (R25), as
duas linhas de "Não consegui atualizar agora." (R26, R27), o debounce zerado (R28), os três ramos do
"Voltar" (R29–R31), a gravação de espaços (R32), o preço unitário multiplicado (R33), o aviso que
falhou sem alerta (R34), o relógio do aparelho no histórico e no cabeçalho (R35, R36), "Limpar
filtro" indo a outra visão (R37), a chave sem aparar (R38), o total sem `count` (R40), a ordinal sem
recorte (L03), o ponto de cor (L04), o "Tentar de novo" do fim relendo a janela (L05), o `aria-busy`
(L06), o foco no `h1` (L08), a sentinela observando com página no ar (L09), o fim nunca chegando
(L11), o canal abrindo sem `lido_em` (L12), a linha sem `state.doApp` (L13), o histórico vazio (L14),
e `shippingLine` (`separating`, código só de espaços, retirada — C01–C03).

**Sobreviventes (5):**

| # | Mutação | Veredito |
| --- | --- | --- |
| C04 | `listCountLine`: `!total \|\| total < 1` → `!total` | **Equivalente** — difere só para total negativo ou fracionário, que `count: 'exact'` não produz |
| **R39** | `useListaDePedidos` (a `queryFn` da janela): `fim: linhas.length < limite` → `< ORDER_PAGE_SIZE` | **LACUNA G2** |
| **L01** | `ListaDePedidos`: `termo.trim() !== ''` → `termo !== ''` na linha de contagem | **LACUNA G3** |
| **L07** | `PedidosPage`: `useRolagemRestaurada(!!janela)` → `useRolagemRestaurada(true)` | **LACUNA G4**, e ela esconde o desvio D1 |
| L10 | `ListaDePedidos`: o `Traco` do fim com página no ar apagado | **Lacuna menor (O-r2-2)** — não há AC; o caso se chama "um esqueleto marca o fim" e só assere o `aria-busy` do invólucro |

### 4. Defeito e lacunas

**D1 — `G-A28` "Sem cache, abre no topo" não é o que o código faz (desvio, severidade baixa).**
`useRolagemRestaurada` restaura a posição guardada da entrada quando `pronto` vira verdadeiro pela
primeira vez — e `pronto` é `!!janela`, que fica verdadeiro também quando a janela vem de uma leitura
**nova** (sem cache). Sonda (temporária, apagada): montar com `scrollY = 840`, desmontar, remontar a
mesma entrada com `pronto = false` ⇒ nenhum `scrollTo`; `pronto = true` ⇒ `scrollTo(0, 840)`.
Cenário real: a Adri fica mais de 5 min no detalhe (o `gcTime` padrão do React Query apaga a lista
inativa; o app não o configura), volta, a lista relê só 25 linhas e a página é rolada para o `y` antigo,
que pode passar do fim da primeira página — ela cai perto do fim de uma lista que não é a que ela
rolou, nem no topo que o gate decidiu. **Conserto proposto**: restaurar só quando a janela estava no
cache na montagem (ex.: `pronto` = "havia dado na primeira renderização desta entrada"), com um caso
que remove a consulta do cache (`queryClient.removeQueries`) antes do voltar e assere `scrollTo` não
chamado com a posição guardada. L07 tem de morrer depois.

**G2 — `MAP-15` no caminho da releitura da janela (G-A11) não é provado.** Na primeira leitura
`limite = 25 = ORDER_PAGE_SIZE`, então os dois `fim` coincidem; eles divergem só na releitura de uma
janela maior que uma página (Realtime, foco, puxar, voltar) que volta mais curta que o `limite` mas
com ≥ 25 linhas (ex.: 50 carregadas, o recorte encolheu para 30). Com o mutante a sentinela continua
ativa, sai uma ida a mais e o esqueleto do fim pisca — o que `MAP-15` proíbe. **Conserto (só teste)**:
no `useListaDePedidos.test.tsx`, carregar 50, reler com o dublê devolvendo 30 e asserir `fim === true`
e que `carregarMais` não chama a rede. Reinjetar R39.

**G3 — `MAP-12` ("só espaços vale como sem busca") × `MAP-08` não é provado na linha de contagem.** A
chave apara (R38 morre), mas a frase "N pedidos precisam de você, do mais antigo para o mais novo."
depende de `termo.trim()` dentro da `ListaDePedidos`, e nenhum caso passa um termo só de espaços.
**Conserto (só teste)**: em "Precisa de ação" com `termo = '   '` e dado, a contagem é a frase da fila.
Reinjetar L01.

**G4 — o "depois que a lista tem o que desenhar" de `useRolagemRestaurada` não tem régua.** Os casos
do voltar sempre têm cache, então `pronto` já é verdadeiro na primeira renderização e L07 passa. É a
mesma régua que D1 precisa — um caso cobre os dois.

### 5. Suíte instável (O-r2-1, bloqueia o gate por confiabilidade)

`App.routing.test.tsx` › "MAF-06 — com a sessão resolvida na hora, a splash fica até 600 ms e sai aos
600" reprovou em **1 de 5** execuções completas do mobile-adm na árvore limpa (`expect(splash())
.toBeInTheDocument()` com `null` na linha 74) e apareceu em 2 das 59 execuções do arnês (sempre ao
lado de outras mortes). Passa isolado (6/6). O caso usa `vi.useFakeTimers({ shouldAdvanceTime: true })`
e mede a fronteira 599/600 ms: com o relógio falso andando junto do real, o tempo real gasto montando
`/pedidos` — agora a `PedidosPage` de verdade, não mais o "em construção" — consome a margem. O
arquivo não foi tocado pela `74`; **não medi a taxa na base `775e407e`**. Conserto proposto: o caso
de fronteira com `shouldAdvanceTime: false` (ou montar numa rota leve), sem afrouxar o 599/600.

### 6. Montagem da própria árvore / asserção verdadeira nos dois mundos

Nada novo além das lacunas acima: as páginas continuam provadas pelo `<App />` real, e os casos de
R06/R07/R29–R31/L13 mostram a fiação lista → detalhe → voltar morrendo pela árvore real. As asserções
verdadeiras nos dois mundos achadas são as de G2, G3, G4 e O-r2-2.

### Veredito da rodada 2

**FAIL.** G1 fechado. 59 mutantes (58 novos + V39): 54 mortos por asserção, 0 por compilação, 1
equivalente declarado (C04), 4 sobreviventes (R39, L01, L07, L10). Um desvio de produto de baixa
severidade (D1, `G-A28`), três lacunas de cobertura (G2, G3, G4) e um caso instável no gate (O-r2-1).
Suítes, tipos e lint sem regressão. Para a rodada 3: D1 + G4 por um caso só, G2 e G3 por teste,
O-r2-1 sem afrouxar a fronteira, e reinjetar R39, L01 e L07.

## Conserto da rodada 2 — 2026-10-24 (autor; a rodada 3 é do verificador)

| Achado | Conserto | Prova (mutante reinjetado no arquivo real, SHA-256 conferido) |
| --- | --- | --- |
| **D1 + G4** | `useRolagemRestaurada` decide **uma vez por entrada, na primeira renderização dela**: com cache (`pronto` já verdadeiro) restaura o `y`; sem cache e com posição guardada, `scrollTo(0, 0)` — a leitura nova chegando depois não reabre a decisão. Entrada nova continua sem tocar na rolagem | caso novo em `PedidosPage.test.tsx` ("voltar SEM cache…"): Início, 5 min + 1 s no relógio falso (o `gcTime` padrão apaga a lista inativa), voltar; assere a leitura nova, as 3 linhas, `scrollTo(0, 840)` ausente e `scrollTo(0, 0)`. **L07** (`useRolagemRestaurada(true)`) morto por asserção; o hook antigo (`scrollTo(0, y)` sem olhar `pronto`) morto por asserção |
| **G2** | só teste: `useListaDePedidos.test.tsx`, janela de 50 relida que volta com 30 ⇒ `limit 50`, 30 linhas, `fim`, e `carregarMais` sem ida à rede | **R39** (`< ORDER_PAGE_SIZE`) morto por asserção (`expected false to be true` no `fim`). A leitura de `result.current` depois do `refetch` espera o render (`waitFor`): sem ela o caso reprovava 2 em 4 por corrida do teste, não do hook |
| **G3** | só teste: linha `'   '` em "Precisa de ação" no `it.each` de `MAP-08` | **L01** morto por asserção |
| **O-r2-2** | só teste: o caso "página no ar" assere UM `Traco` (`animate-pulse`, `h-20 w-full`, `motion-reduce:animate-none`) dentro do fim; o par "sem página no ar" assere nenhum | **L10** morto por asserção; o inverso (o `Traco` sempre desenhado) morto pelo par |
| **O-r2-1** | `MAF-06` reinstala o relógio falso com `shouldAdvanceTime: false` só nesse caso; a fronteira 599/600 intocada | 6/6 isolado; `SPLASH_MIN_MS` 599 e 601 mortos por asserção (a fronteira ainda morde); mobile-adm completo **5 de 5** com exit 0 |

Medido um workspace por vez, exit fora de pipe: **mobile-adm 794/61** (+4: os casos de D1, G2 e o
par de O-r2-2, e a linha de G3), cinco execuções seguidas verdes; **store 5849/318**, idêntico (os
guardas que varrem `apps/**`). Core, backoffice, functions e catalog-import não foram tocados nesta
rodada. `tsc` do mobile-adm 0; `eslint .` do mobile-adm 0/0. Sem commit.

## Rodada 3 — 2026-10-24 — **FAIL** (duas lacunas de cobertura, nenhum defeito de produto)

> Verificador ≠ autor. Evidência ou zero, medida nesta rodada no mesmo worktree, árvore sem commit
> da `74` com o conserto da rodada 2. Nenhum arquivo de produto ou de teste foi deixado alterado: todo
> mutante foi reinjetado no arquivo real e restaurado com SHA-256 conferido (o arnês lança se o alvo
> não aparece exatamente uma vez ou se a restauração diverge). Uma sonda temporária
> (`entities/order/api/__tests__/zzSondaDoVerificadorR3.test.tsx`) foi criada, rodada e **apagada** (§4, G5).

### 1. Suítes, tipos, lint e probes

| Workspace | Arquivos | Testes | Exit |
| --- | --- | --- | --- |
| mobile-adm | 61 | 794 | 0 — **5 de 5** execuções completas verdes (O-r2-1 não reapareceu) |
| core | 158 | 3988 | 0 |
| backoffice | 210 | 3670 | 0 |
| store | 318 | 5849 | 0 |
| functions | 21 | 957 | 0 |
| catalog-import | 23 | 512 | 0 |
| **Total** | **791** | **15770** | |

Um workspace por vez, exit fora de pipe. Contra a rodada 2: +4 no mobile-adm (os casos do conserto),
o resto idêntico. `tsc -p apps/mobile-adm/tsconfig.app.json` 0; `eslint .` do mobile-adm 0/0.
Probes re-rodados: `02-lista.sh` exit 0, 50 `ok`, "TUDO OK", banco 54 → 54; `03-cliente-sem-papel.sh`
exit 0, "TUDO OK", 54/9 → 54/9.

### 2. Os consertos da rodada 2 — **fechados**

| Achado r2 | Mutante reinjetado | Resultado |
| --- | --- | --- |
| D1 + G4 | X01 `useRolagemRestaurada(true)` (o L07); X02 `prontoAgora ? y : 0` → `y`; X03 a forma do defeito (efeito em `[key, pronto]` restaurando quando a leitura nova chega); X05 sem cache não rola | os quatro **mortos por asserção** ("voltar SEM cache … abre no topo") |
| — | X04 `if (y === undefined) return` apagado | morto por asserção ("entrada nova não mexe na rolagem") |
| G2 | X07 `fim: … < ORDER_PAGE_SIZE` (o R39) | morto por asserção |
| G3 | X08 `termo !== ''` (o L01) | morto por asserção |
| O-r2-2 | X09 o `Traco` do fim apagado (o L10) | morto por asserção |
| O-r2-1 | X10/X11 `SPLASH_MIN_MS` 599 e 601 | os dois mortos por asserção — a fronteira 599/600 ainda morde com `shouldAdvanceTime: false` |

O caso de D1 foi lido: força a leitura nova (`cadeiasDe('order_list')` +1), exige as 3 linhas
desenhadas **e** `scrollTo(0, 840)` ausente **e** `scrollTo(0, 0)` presente — não é verdadeiro nos dois
mundos.

### 3. Sensor de mutação — 36 mutantes (X01–X11, N01–N03, N05–N25, N16b)

Arnês próprio (Python): substitui, roda a suíte **inteira** do mobile-adm (os de `core` rodam também
`src/orders` e `src/material` de `core`), classifica compilação × asserção, restaura e confere o
SHA-256. **Nenhum mutante morreu por compilação.**

Mortos por asserção: 31 (os 10 de X da §2 e 21 novos): a margem da sentinela (N01), o rearme (N02), a sentinela
disparando sem interseção (N03), a falha da próxima herdada por outro recorte (N06), a janela
arredondada para baixo (N07), o carregar mais em dobro sem `emVoo` (N08) e com a janela em releitura
(N09), o histórico ignorando a falha das notificações (N10), o id que não é uuid indo à rede (N11), os
itens em falha desenhados como vazios (N12), a recusa repetida por `retry: 3` (N13), a lista e o
detalhe sem reler no primeiro plano (N14, N15), a falha sem dado desenhada como esqueleto na recusa
(N17), um chip marcado com bloco (N18), o debounce sem `clearTimeout` (N19), "Material usado na joia"
só em `shipped` (N21), o passo atual marcado como feito (N22), o rastreio do envelope só de espaços
(N23), o tom de "Estornado" (N24) e o histórico em ordem crescente (N25).

**Sobreviventes (5):**

| # | Mutação | Veredito |
| --- | --- | --- |
| X06 | `useRolagemRestaurada`: `prontoAgora.current = pronto` apagado | **Equivalente.** O `useRef(pronto)` já guarda o `pronto` da primeira renderização da instância, e cada entrada com posição guardada é uma montagem nova (o voltar remonta a página; o chip troca a chave por `replace` e cai em entrada sem posição) |
| N20 | `nomeDaAbaComSelo`: `n === 1 ? 'precisa' : 'precisam'` → `n > 1 ? 'precisam' : 'precisa'` | **Equivalente** para inteiros: só difere em `0 < n < 1`, que `count` não produz |
| **N05** | `useListaDePedidos.carregarMais`, no `catch`: `if (geracaoDe(daVez) === geracao) setFalhaDaProxima(…)` → `setFalhaDaProxima(…)` | **LACUNA G5** |
| **N16** | `PedidosPage`: `if (recusada) setConfirmada(false)` apagado (o canal deixa de fechar na recusa) | **LACUNA G6** |
| **N16b** | o mesmo em `PedidoPage` | **LACUNA G6** |

### 4. Lacunas

**G5 — `MAP-40`/E3 provado só no ramo de SUCESSO da página seguinte.** Os dois casos de E3
(`useListaDePedidos.test.tsx`, "releitura EM VOO" e "releitura TERMINADA") soltam a página com dado;
nenhum a solta com **erro**. O código de hoje está certo (descarta a falha velha pela geração), mas o
ramo do `catch` não tem régua. Sonda temporária, no molde do caso "releitura EM VOO", com a página
respondendo `{ data: null, error: 'Failed to fetch' }` depois de a releitura começar e asserindo
`proximaFalhou === false` ao fim: **passa no código real; com N05, reprova por asserção**
(`expected true to be false`). Consequência real do mutante: depois de uma releitura (Realtime, foco,
puxar) que coincida com uma página em voo que falhou, o fim da lista mostra "Tentar de novo" sobre uma
janela que já é a verdade, a sentinela desliga e a rolagem para de carregar sozinha (`MAP-13`); e o
erro velho vai à vigia da recusa. **Conserto (só teste)**: o caso da sonda (e o irmão com a releitura
TERMINADA antes da falha), no `describe` de E3. Reinjetar N05.

**G6 — "o canal fecha na recusa" é decisão de implementação declarada (T20/T24, "para o Verificador")
e não tem régua, na lista nem no detalhe.** Os casos de canal provam "nenhum antes da confirmação", "UM
depois" e "fecha ao sair"; nenhum leva a página à recusa **ficando montada** (o `42501` com o papel
ainda admin) e confere `canaisAbertos()`. Com N16/N16b a suíte inteira fica verde. Consequência real:
na recusa com o papel ainda admin (a página continua montada, sem dado), o canal segue aberto e cada
aviso relê a lista e o resumo — idas à rede e confirmações de papel enquanto a tela está em recusa;
e o motivo que o próprio comentário dá (a RLS entregaria a uma conta sem papel os avisos dos pedidos
dela) deixa de ter contenção provada. Severidade baixa, mas é um comportamento que o código afirma e
nenhum teste mede. **Conserto (só teste)**: em `PedidosPage.test.tsx` e `PedidoPage.test.tsx`, confirmar
uma leitura (canal aberto), fazer a releitura responder `42501` com o papel ainda admin, e asserir
`canaisAbertos()` sem o canal da página. Reinjetar N16 e N16b.

### 5. Montagem da própria árvore / asserção verdadeira nos dois mundos

Nada novo: as páginas seguem provadas pelo `<App />` real, e os casos do conserto r2 (D1, G2, G3,
O-r2-2) foram lidos e mordem nos dois sentidos. As asserções ausentes são as de G5 e G6.

### 6. Observação (não bloqueia, para o QA)

- **A busca não sobrevive ao voltar do detalhe.** O termo é estado da página (A13, decidido) e some ao
  desmontar; o "voltar" de `MAP-20` promete recorte e posição, não o termo — então está dentro da letra.
  Mas o percurso real ("a cliente manda o nome no WhatsApp → busco → abro → volto") cai na lista sem
  busca, e, havendo cache do termo vazio, `useRolagemRestaurada` aplica o `y` da lista **buscada** à
  lista sem busca (o mesmo formato de D1, em menor escala: lista buscada é curta, `y` costuma ser
  pequeno). Vale andar no QA e decidir se o termo deve ficar em memória por entrada (sem ir ao
  endereço, preservando a régua de A13).

### Veredito da rodada 3

**FAIL** — por duas lacunas de cobertura (G5, G6), sem defeito de produto. Os achados da rodada 2
(D1, G2, G3, G4, O-r2-1, O-r2-2) estão fechados, com os mutantes deles mortos por asserção. Os
mutantes (36): 31 mortos por asserção, 0 por compilação, 2 equivalentes declarados (X06, N20) e 3
sobreviventes reais (N05, N16, N16b). Suítes, tipos, lint e probes sem regressão; mobile-adm 5/5
estável. Conserto proposto: só teste, os casos de G5 e G6, reinjetando N05, N16 e N16b.

## Conserto da rodada 3 — 2026-10-24 (só teste, autor)

> Autor ≠ verificador **não** vale para esta passada: é o conserto, e pede a rodada 4 do Verificador
> independente. Nenhum arquivo de produto foi tocado. Cada mutante foi reinjetado no arquivo real e
> restaurado com SHA-256 conferido (o arnês lança se o alvo não aparece exatamente uma vez).

**G5 — fechada.** Dois casos novos no `describe` de E3 de `useListaDePedidos.test.tsx`: "releitura EM
VOO quando a página FALHA" (o caso da sonda do verificador) e "releitura TERMINADA antes de a página
FALHAR" (o irmão). Os dois exigem `proximaFalhou === false` e `erroDaProxima === null`, e o primeiro
exige de novo depois de a releitura chegar. O par sem releitura ("a falha da página seguinte MANTÉM
as linhas", que marca a falha) já existia: juntos, provam que quem decide é a geração, não o erro.
**N05 reinjetado, suíte inteira do mobile-adm: os dois casos novos reprovam por asserção**
(`expected true to be false`), e nenhum outro.

**G6 — a régua foi escrita; N16 e N16b são EQUIVALENTES no `<App />` real, e isso foi medido.**
Dois casos novos, "a recusa com a página montada fecha o canal — e um aviso depois dela não relê
nada", em `PedidosPage.test.tsx` e `PedidoPage.test.tsx`: confirmam uma leitura (o canal da página
aberto), fazem a releitura responder `42501` com o papel ainda admin, e exigem o canal fechado, a
falha na tela, o endereço mantido, um segundo aviso sem ouvinte (`emitir` devolve 0) e nenhuma
leitura nova.

A premissa da lacuna ("a página continua montada") **não vale na árvore real**: a primeira recusa do
episódio faz a vigia chamar `retryAdminCheck`, que liga o `loading` do `AuthProvider`
(`AuthContext.tsx:283-289`); o `RequireAdmin` troca a página pelo `fallback` (a splash), e a página
desmonta (o mecanismo que `useRecusaDePapel.ts` documenta desde a T18). Desmontar já fecha o canal.
Na remontagem, o `42501` em cache deixa `recusada` verdadeiro, então `confirmada` nasce falso e o
canal não reabre. Só três telas usam a vigia (Início, Pedidos, Pedido), uma montada por vez, e todo
caminho que reabre o canal passa por uma leitura confirmada, que encerra o episódio. Por isso a
próxima recusa reconfere de novo e desmonta de novo. A linha `if (recusada) setConfirmada(false)` é
a segunda defesa, para a página que fica montada. Medido, sempre com os arquivos reais:

| Mutante | Resultado |
| --- | --- |
| N16 (só a linha da lista), suíte inteira | verde: **equivalente** |
| N16b (só a linha do detalhe), suíte inteira | verde: **equivalente** |
| só a reconferência da vigia apagada (`void retryAdminCheck()`) | reprovam os 4 casos de recusa já existentes; **os dois casos novos de G6 passam** (a linha sozinha fecha o canal) |
| a reconferência apagada **+** N16 **+** N16b, suíte inteira | 17 reprovações, entre elas **os dois casos novos de G6 e nenhum outro caso de canal** |

Ou seja: a régua mede o resultado prometido (canal fechado na recusa) em qualquer dos dois
mecanismos, e morde a linha assim que a página passa a ficar montada. O motivo está escrito no
comentário dos dois casos.

**Gates** (um workspace por vez, exit fora de pipe): mobile-adm **798/61**, exit 0, em duas execuções
seguidas (794 → 798: +2 de G5 e +2 de G6); store **5849/318**, exit 0, idêntico (guardas que varrem
`apps/**`); `tsc -p apps/mobile-adm/tsconfig.app.json` 0; `eslint .` do mobile-adm 0/0. Core,
backoffice, functions e catalog-import não foram tocados.

**Observação do QA (sem conserto, não bloqueia)**: o termo de busca some ao voltar do detalhe, e com o
termo vazio em cache `useRolagemRestaurada` aplica o `y` da lista buscada à lista sem busca. Fica
para o QA andar esse caminho.

## Rodada 4 — 2026-10-24 — **FAIL** (um defeito de `MAP-36`, duas lacunas de cobertura)

> Verificador ≠ autor. Evidência ou zero, medida nesta rodada no mesmo worktree, árvore sem commit
> da `74` com o conserto da rodada 3. Nenhum arquivo de produto ou de teste foi deixado alterado: todo
> mutante foi reinjetado no arquivo real e restaurado com SHA-256 conferido (o arnês lança se o alvo
> não aparece exatamente uma vez ou se a restauração diverge). Uma sonda temporária
> (`pages/__tests__/zzSondaDoVerificadorR4.test.tsx`, pela árvore real `montarApp`) foi criada,
> rodada e **apagada**; o corpo do caso que prova D2 está na §4.

### 1. Suítes, tipos, lint e probes

| Workspace | Arquivos | Testes | Exit |
| --- | --- | --- | --- |
| mobile-adm | 61 | 798 | 0 |
| core | 158 | 3988 | 0 |
| backoffice | 210 | 3670 | 0 |
| store | 318 | 5849 | 0 |
| functions | 21 | 957 | 0 |
| catalog-import | 23 | 512 | 0 |
| **Total** | **791** | **15774** | |

Um workspace por vez, exit fora de pipe. Contra a rodada 3: +4 no mobile-adm (G5 e G6), o resto
idêntico. `tsc -p apps/mobile-adm/tsconfig.app.json` 0; `eslint .` do mobile-adm 0 (exit 0).
Probes re-rodados: `02-lista.sh` exit 0, 50 `ok`, "TUDO OK", banco 54 → 54; `03-cliente-sem-papel.sh`
exit 0, "TUDO OK", 54/9 → 54/9.

### 2. Os consertos da rodada 3

| Achado r3 | Mutante reinjetado | Resultado |
| --- | --- | --- |
| G5 | N05 (`setFalhaDaProxima` sem o teste da geração) | **morto por asserção** — os dois casos novos de E3 ("releitura EM VOO quando a página FALHA", "releitura TERMINADA antes de a página FALHAR") |
| G6 | N16 e N16b sozinhos | sobrevivem — **equivalência aceita**, com a medida abaixo |
| G6 | N16 + N16b + `void retryAdminCheck()` apagado (a página fica montada) | morto por asserção; entre as 6 reprovações das duas suítes de página estão **os dois casos novos de G6** ("a recusa com a página montada fecha o canal…") |

G6 fica fechada: a régua mede o resultado prometido (o canal fechado na recusa) e morde a linha assim
que a página passa a ficar montada.

### 3. Sensor de mutação — 33 mutantes novos (Q01–Q33) + N05, N16, N16b, G6combo

Arnês próprio (Python), suíte **inteira** do mobile-adm por mutante, compilação × asserção, SHA-256 na
restauração. **Nenhum mutante morreu por compilação.**

Mortos por asserção (30 dos Q): o "Tentar de novo" da próxima sem limpar a falha (Q01), o `emVoo` nunca
desligado (Q02), o cursor da PRIMEIRA linha (Q03), o desempate por `id` sempre ascendente (Q04), a
janela de limite 0 sem o piso de 25 (Q05), `staleTime` de 60 s (Q06), o total pelas linhas carregadas
(Q07), o erro do PEDIDO ignorado (Q08), o `fetch` que lança virando bloco vazio (Q09), as
notificações sem `order_id` (Q10), os itens filtrados por `id` (Q11), o detalhe sem repetição de rede
(Q12) e sem reler no primeiro plano (Q13), o aviso do Realtime sem reler o resumo na lista e no
detalhe (Q14, Q15), o título sem "· Ateliê" (Q17), "Voltar aos pedidos" indo à Início (Q18), o
detalhe sem esqueleto (Q19), o episódio da vigia nunca encerrado (Q20), a sentinela ativa com página
no ar (Q21), a dica do vazio sem o termo (Q22), o rearme sem a janela (Q25), a faixa com o id do bloco
(Q26), a busca reemitindo o mesmo termo (Q27), a idade em todo estado (Q28), a linha sem
`state.doApp` (Q29), o nome acessível do selo com o número errado (Q30), o endereço vazio abrindo em
"Tudo" (Q31), o puxar sem reler na lista e no detalhe (Q32, Q33).

**Sobreviventes (3):**

| # | Mutação | Veredito |
| --- | --- | --- |
| Q24 | `ListaDePedidos`: `temMais` sem `janela.linhas.length > 0` | **Equivalente.** A lista vazia sai pelo ramo do vazio antes de desenhar a sentinela; o `ref` não recebe alvo e `useSentinela` não observa nada |
| **Q16** | `PedidosPage`: `useRecusaDePapel([lista.error, lista.erroDaProxima])` → `[lista.error]` (a recusa da PÁGINA SEGUINTE não chega à vigia) | **LACUNA G8** — e a sonda que a fecharia achou o defeito **D2** |
| **Q23** | `ListaDePedidos`: `<LinhaDoPedido lidoEm={new Date().toISOString()} />` (a linha pelo relógio do aparelho) | **LACUNA G7** |

### 4. Defeito e lacunas

**D2 — `MAP-36` violado na recusa da PÁGINA SEGUINTE com o papel ainda admin ("nem o de antes" e
"uma vez por episódio").** O erro da página seguinte mora em `useState` dentro de `useListaDePedidos`
(`falhaDaProxima`). No `42501` dela, a vigia reconfere o papel (`retryAdminCheck`); com o papel ainda
admin, o `RequireAdmin` troca a página pela splash e a página **desmonta** (o mesmo mecanismo da G6).
Na remontagem o erro da página seguinte se perdeu, e a janela no cache do React Query é de uma leitura
**bem-sucedida** — então `recusada` nasce falso, e as **25 linhas de antes e o "Atualizado às 11h30."
são desenhados** enquanto a confirmação da releitura da janela está no ar. Quando ela responde `42501`,
a vigia — cujo episódio foi encerrado pela remontagem sem recusa — **reconfere de novo** e a página
desmonta de novo. Na recusa da JANELA isso não acontece porque o erro fica no cache da query.

Sonda pela árvore real (`montarApp('/pedidos?visao=tudo')`, sessão admin), apagada depois de rodar:

```ts
fake.responderTabela('order_list', { data: vinteECinco, error: null, count: 60 })
fake.aoChamarRpc('atelie_clock', (n) =>
  n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : n === 2 ? { data: null, error: RECUSA } : new Promise(() => {}),
)
await montarApp('/pedidos?visao=tudo'); await andar(50)          // 25 linhas
act(() => { dispararInterseccao(screen.getByTestId('sentinela')) }) // a página seguinte: 42501
await andar(3000)
expect(screen.queryAllByTestId('linha-do-pedido')).toHaveLength(0) // REPROVA no código real: 25
```

Medido: com a confirmação da remontagem pendurada, **25 linhas e o frescor na tela** (o tempo de uma
ida e volta na rede real; indefinido se ela travar). Com a confirmação respondendo `42501` na hora,
o fim é a falha certa, mas `user_roles` é lido **3 vezes** (a sessão + **duas** reconferências) contra
2 no caso irmão da janela (`'42501' com o papel ainda admin … e UMA reconferência'`, que exige 2).
Severidade: média-baixa (só com o papel ainda admin e a função recusando; a conta sem papel cai na
recusa da `72` sem remontar), mas é exatamente a régua "nem o de antes" que `MAP-36` escreve.
**Conserto proposto**: manter o erro da página seguinte fora do estado do componente — por exemplo,
na recusa da página seguinte, marcar a QUERY da janela como recusada (`queryClient.setQueryData`
removendo a janela, ou `queryClient.resetQueries`/um erro gravado por chave em módulo, no molde de
`geracoes`), de modo que a remontagem já nasça recusada. O caso da sonda vira teste em
`PedidosPage.test.tsx`, com o par de reconferências (`papeisPerguntados()` = 2).

**G8 — a recusa da página seguinte não tem régua na página.** `useListaDePedidos.test.tsx:215` prova
que o hook expõe o `42501` em `erroDaProxima`; nenhum teste da `PedidosPage` leva a página seguinte à
recusa. Q16 (o erro fora da vigia) deixa a suíte inteira verde, e com ele a página mostraria as linhas
com "Tentar de novo" no fim a uma recusa. Fecha junto com D2 (o mesmo caso, que mata Q16 por asserção).

**G7 — "nada pelo relógio do aparelho" (A2) não é provado na fiação da lista.** O mutante V22 da
rodada 1 estava dentro de `LinhaDoPedido`; Q23 troca o `lidoEm` que `ListaDePedidos` PASSA à linha e
sobrevive, porque nenhum teste da lista ou da página fixa o relógio longe do `LIDO_EM`
(`2026-10-23T14:30Z`): a fixtura `created_at = 2026-10-20T13:04Z` dá "há 3 dias" contra os dois
relógios até ~`2026-10-24T13:04Z` — a mesma coincidência de calendário da G1. Sonda (apagada):
`vi.setSystemTime('2027-01-01')`, uma linha, e o texto `[data-parte="compra"]` contendo "3 dias" —
**passa no código real; com Q23, reprova por asserção**. **Conserto (só teste)**: esse caso em
`ListaDePedidos.test.tsx` ou `PedidosPage.test.tsx`; reinjetar Q23.

### 5. Montagem da própria árvore / asserção verdadeira nos dois mundos

As páginas seguem provadas pelo `<App />` real; a sonda de D2 também. A paginação, porém, só é
provada no hook e no widget — a página nunca dispara a sentinela (`dispararInterseccao` só aparece em
`ListaDePedidos.test.tsx`), e é por esse buraco que D2 passou. A asserção verdadeira nos dois mundos
nova é a de G7.

### Veredito da rodada 4

**FAIL** — por um defeito de produto (D2, `MAP-36`) e duas lacunas de cobertura (G7, G8). G5 e G6 da
rodada 3 fechadas. 37 mutantes: 32 mortos por asserção (30 Q + N05 + G6combo), 0 por compilação,
3 equivalentes declarados/aceitos (Q24, N16, N16b) e 2 sobreviventes reais (Q16, Q23). Suítes, tipos,
lint e probes sem regressão. Para a rodada 5: D2 + G8 por um caso pela página real (25 linhas, a
página seguinte em `42501`, a confirmação da remontagem pendurada ⇒ nenhuma linha; e duas leituras de
`user_roles`), G7 por teste, reinjetar Q16 e Q23.

## Conserto da rodada 4 — 2026-10-24 (autor; aguarda a rodada 5 do Verificador)

**D2 (pela causa).** A recusa (`42501`) da página seguinte passou a ser guardada também em MÓDULO, em
`useListaDePedidos.ts` (`recusasDaProxima`, por chave), presa ao `dataUpdatedAt` da leitura da janela
sobre a qual aconteceu — no molde de `geracoes` e de `reconferidoPara`. A remontagem que o
`RequireAdmin` provoca já nasce recusada: nenhuma linha, nenhum frescor, e a vigia não abre um segundo
episódio. Uma releitura que confirma o papel muda o `dataUpdatedAt` e a recusa deixa de valer; a
releitura recusada leva o próprio `42501` no erro da query. Só a RECUSA vai ao registro: a falha de
rede da próxima continua no estado do componente (a remontagem rearma a sentinela, `MAP-35`).
A chave é o `dataUpdatedAt`, e não a identidade do objeto: a primeira escrita usou identidade e o caso
"a confirmação CONFIRMA" reprovou, porque o compartilhamento estrutural do React Query devolve o MESMO
objeto a uma releitura com os mesmos dados. A linha que limpava o registro ao pedir a próxima de novo
foi retirada por inalcançável (com a recusa a lista mostra a falha e não oferece a próxima): o mutante
dela sobrevivia e não havia caminho que o matasse.

**Dono único da pergunta "é recusa?".** O predicado passou a `isAccessDenied` em
`@estrelinha/core/hooks/useStoreOverview` (com `retryUnlessDenied` delegando); `ehRecusaDePapel` da vigia
é a mesma referência, e o hook da lista o importa — sem isso o conserto seria a terceira escrita de
`code === '42501'`. +1 caso puro em `core`.

**Casos novos.** `PedidosPage.test.tsx` (+3, pelo `<App />` real, 25 linhas e `dispararInterseccao` na
sentinela): a confirmação da remontagem pendurada ⇒ 0 linhas, sem frescor, falha na tela e
`papeisPerguntados() === 2` (a sonda do Verificador); a confirmação recusada ⇒ a falha e `user_roles`
lido 2 vezes, mesmo 30 s depois; a confirmação que CONFIRMA ⇒ as 25 linhas e o frescor de volta.
`useListaDePedidos.test.tsx` (+2): a recusa sobrevive à remontagem e a confirmação nova a apaga; a falha
de rede não sobrevive. `ListaDePedidos.test.tsx` (+1, G7): aparelho em `2027-01-01`, a parte "compra"
diz "3 dias".

**Mutantes reinjetados** (arquivo real, suíte inteira do mobile-adm, SHA-256 conferido na restauração;
nenhum morreu por compilação):

| Mutante | Resultado |
| --- | --- |
| Q23 (`lidoEm={new Date().toISOString()}`) | morto por asserção — o caso de G7 |
| Q16 (`useRecusaDePapel([lista.error])`) | morto por asserção — os 3 casos novos da página |
| registro nunca gravado | morto — os 2 casos de recusa da página e o da remontagem do hook |
| registro sem o `dataUpdatedAt` | morto — 8 casos, entre eles "a confirmação CONFIRMA" |
| registro gravando qualquer erro (rede inclusa) | morto — "a falha de REDE da próxima NÃO sobrevive à remontagem" |

**Gates** (um workspace por vez, exit fora de pipe): mobile-adm **804/61** (+6), core **3989/158** (+1),
store **5849/318** e backoffice **3670/210** idênticos; `tsc` mobile-adm 0, backoffice 0, core 11
(herdados); `eslint .` do mobile-adm 0. Functions e catalog-import não tocados.

## Verificação do conserto do QA, rodada 1 — 2026-10-24 — **FAIL** (duas lacunas de cobertura em B02, nenhum defeito de produto)

> Verificador independente (autor ≠ verificador). Escopo: `B01` e `B02` do `tasks.md`
> (`BUG-20261024-pagamento-por-cartao-aparece-como-card` e
> `BUG-20261024-voltar-do-pedido-buscado-perde-a-busca`). **A rodada 5 do conserto da rodada 4 (D2,
> G7, G8) NÃO faz parte deste escopo** e segue sem verificação independente registrada aqui.

### 1. Suítes, tipos e lint (remedidos agora, um workspace por vez, exit fora de pipe)

| Workspace | Medido | Exit | Bate com o autor |
| --- | --- | --- | --- |
| core | 3998/158 | 0 | sim |
| mobile-adm | 809/61 | 0 | sim |
| store | 5852/319 | 0 | sim |
| backoffice | 3671/210 | 0 | sim |

`tsc --noEmit` 0 em mobile-adm, store e backoffice (`tsconfig.app.json`); `eslint .` do mobile-adm 0.
Functions e catalog-import não tocados pelos consertos.

### 2. B01 — o meio de pagamento — **fechado**

Conferido no disco: `card: 'Cartão de crédito'`, `PAYMENT_METHOD_FALLBACK` e `paymentMethodLabel`
em `core/orders/labels.ts`; o ateliê (`BlocoValores.tsx`) chama `paymentMethodLabel`; a loja parte do
mapa de `core` e troca só `manual`; o chip do painel lê o mapa de `core` pela reexportação de
`orderQuery` (identidade provada por `regrasDoPedidoNoCore.test.ts`). Não há mais nenhum mapa de meios
fora de `core` em `apps/**` (grep). O painel não deriva opções de filtro do mapa, então acrescentar
`card` não cria uma opção nova na tela do painel — a única mudança visível no painel é a palavra do
chip, declarada no `tasks.md`. Fica registrado, como o autor já fez, que o "Método" de
`AdminOrderPage.tsx` e o CSV do painel seguem com o valor cru (fora do escopo do bug).

Mutantes (arquivo real, SHA-256 conferido na restauração, nenhum morto por compilação):

| Mutante | Resultado |
| --- | --- |
| V1 `card` apagado de `core` | morto — `ItensValoresEntregaHistorico` ("meio card … Cartão de crédito") |
| V2 o ateliê recuando ao valor cru fora da lista | morto — "meio wallet_xyz … Outra forma de pagamento" |
| V3 `paymentMethodLabel` sem `trim` | morto — `paymentLabels.test.ts` (`" pix "`) |
| V4 recuo cru em `core` (`method \|\| FALLBACK`) | morto — "meio fora da lista (wallet_xyz) nunca sai cru" |
| V5 `core` ignorando o mapa recebido (a loja perderia a voz de `manual`) | morto — `OrderPaymentDelivery.test.tsx` ("manual → Combinado com a loja") |
| V6 a loja sem a troca de `manual` | morto — 2 casos (loja) |
| V7 a loja com uma chave só dela (`debit_card`) | morto — "nenhuma chave que core não conheça" |
| V8 o chip do painel com a cópia de quatro de volta | morto — "o chip do meio usa as palavras de core" |
| V9 `orderQuery` com cópia local (já com `card`) | morto — `regrasDoPedidoNoCore` (`toBe`) |

**9 de 9 mortos por asserção.** B01 aprovado.

### 3. B02 — o termo da busca no voltar — **conserto correto, cobertura incompleta**

Conferido no disco: `useTermoDaEntrada` (`Map` em módulo por `location.key`, gravado na desmontagem
ou troca de entrada, apagado quando vazio), `BuscaDePedidos` com `inicial`, `PedidosPage` usando o
hook, e `esquecerTermos()` em `LimparCacheNaTrocaDeConta`. O termo não vai ao endereço (A13 — provado
pelo caso "entrada NOVA … abre sem termo"). O "Voltar" do detalhe com `state.doApp` é `navigate(-1)`,
o mesmo caminho do `history.back()` usado no teste. No logout, a página desmontada grava o termo DEPOIS
de `esquecerTermos` (efeito passivo depois do de layout), mas o `RequireAdmin` navega com `replace` e
aquela entrada sai do histórico: inalcançável — não é defeito.

| Mutante | Resultado |
| --- | --- |
| W3 `esquecerTermos` vira no-op | morto — `trocaDeContaLimpaCache` (B02) |
| W4 a busca ignora `inicial` | morto — "abrir um resultado e voltar" |
| W5 a página não passa `inicial` | morto — idem |
| W6 o hook não lê o `Map` | morto — idem |
| **W1 o efeito com deps `[]`** (grava só sob a PRIMEIRA `key` da montagem) | **SOBREVIVEU** — 809/809 verdes |
| **W2 sem o `else termos.delete(key)`** (o termo limpo não apaga o guardado) | **SOBREVIVEU** — 809/809 verdes |
| W7 o termo também em `sessionStorage` | sobreviveu — **observação**, não lacuna: a spec (A13) só fala do endereço; "nada em storage" é afirmação do comentário do hook, não AC |
| W8 `emitido` nascendo vazio (reemite o `inicial` na montagem) | sobreviveu — **equivalente**: `setTermo` com o mesmo valor não muda a chave nem a tela |

**G-B02-1 (W1) — o caminho mais comum do uso real não tem régua.** A aba Pedidos abre em "Precisa de
ação"; a Adri toca em "Tudo" (o chip troca o endereço por **substituição**, e a `key` da entrada
muda), busca, abre e volta. O único caso de B02 abre a página já em `?visao=tudo` e nunca troca de
chip, então ninguém prova que o termo é gravado sob a `key` VIGENTE. Com W1 o bug relatado volta
inteiro nesse percurso. Sonda (apagada depois): abrir `pedidosHref({ visao: 'precisa-acao' })`, tocar
no chip "Tudo", buscar "Helena", abrir o resultado, `history.back()` ⇒ caixa com "Helena" e 1 linha.
**Passa no código real; com W1, reprova por asserção.**

**G-B02-2 (W2) — a busca LIMPA ressuscita.** Buscar "Helena", abrir, voltar (a caixa volta com
"Helena"), apagar a caixa, abrir outro pedido da lista inteira e voltar: a caixa tem de vir vazia.
Com W2 a entrada guarda o "Helena" da primeira desmontagem e a busca reaparece — a Adri veria um
recorte que ela mesma tinha desfeito. Sonda (apagada): o percurso acima, `caixa().value === ''` e 3
linhas no fim. **Passa no código real; com W2, reprova por asserção.**

**Conserto (só teste, sem código de produto)**: os dois casos das sondas em
`pages/__tests__/PedidosPage.test.tsx`, no `describe` de B02; reinjetar W1 e W2.

### 4. Rastreabilidade (observação, não bloqueia)

`spec.md` não registra o comportamento novo de B02 (o termo volta com a entrada do histórico) nem a
palavra de recuo de B01. `MAP-20` fala de "mesmo recorte e posição" e `A13` só do endereço. Vale uma
linha em `MAP-20` (ou uma assunção nova ao lado de A13) dizendo que o termo volta por entrada, só em
memória, e é esquecido na troca de conta — senão o próximo leitor da spec acha o `Map` e não acha a
regra que ele cumpre.

### 5. Montagem da própria árvore / asserção verdadeira nos dois mundos

Os casos de B02 rodam pelo `<App />` real (`montarApp`), e o de troca de conta também. B01 é provado
no componente real do ateliê, na função de `core`, no `OrderPaymentDelivery` real da loja e no chip
real do painel. Nenhuma asserção verdadeira nos dois mundos achada além das lacunas de §3.

### Veredito

**FAIL** — B01 aprovado (9/9 mutantes mortos por asserção). B02 sem defeito de produto, mas com duas
lacunas de cobertura (G-B02-1, G-B02-2): 8 mutantes, 4 mortos por asserção, 2 sobreviventes reais,
1 equivalente (W8), 1 observação (W7). Para fechar: os dois casos de §3 no teste da página, W1 e W2
reinjetados e mortos.

## Verificação do conserto do QA, rodada 2 (B03) — 2026-10-24 — **PASS** (nenhum defeito, nenhuma lacuna de cobertura; duas observações)

> Verificador independente (autor ≠ verificador). Escopo: só `B03` do `tasks.md`
> (`BUG-20261024-falha-de-aviso-diz-enviado`). B01/B02 e a rodada 5 do conserto da rodada 4 ficam
> fora deste escopo.

### 1. Suítes, tipos e lint (remedidos agora, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

| Workspace | Medido | Exit | Bate com o gate do B03 |
| --- | --- | --- | --- |
| core | 4016/158 | 0 | sim |
| mobile-adm | 811/61 | 0 | sim |
| backoffice | 3671/210 | 0 | sim |
| store | 5852/319 | 0 | sim |

`tsc --noEmit` 0 em mobile-adm, backoffice e store (`tsconfig.app.json`); `packages/core` 11 (os
herdados). Functions não tocado: `history.ts` não está no grafo Deno de nenhuma function (as duas
importações de `core/orders` em `send-notification` são de `format.ts`), e o import novo
(`../notifications/catalog.ts`) traz `.ts` e `catalog.ts` só importa **tipo** de `events.ts` — o grafo
segue puro (`purity.test.ts` verde na suíte de core).

### 2. O conserto contra o bug e a spec

Conferido no disco (`packages/core/src/orders/history.ts`): a linha de FALHA usa `nomeDoEvento`
(`NOTIFICATION_EVENT_NAMES`, "que evento é este?"), com recuo ao slug fora do vocabulário; a linha do
aviso que SAIU continua com `rotuloDoEvento` (o rótulo de histórico, no passado). O título fica
"Falha ao enviar o aviso: Pagamento aprovado (E-mail)" — o "Expected" do bug. O detalhe continua
"A cliente NÃO foi avisada" (ou o erro), então `MAP-28` segue cumprido. Não há outra escrita de
"Falha ao enviar" em código de produção: o ateliê (`Historico.tsx:41`) e o painel desenham `ev.title`
de `buildHistory` — um dono só, e a frase sai igual nos dois (`MAP-48` no sentido de dono único).

### 3. Sensor de mutação — 8 mutantes (K1–K7 em `history.ts`, K8 em `catalog.ts`)

Arquivo real, alvo exigido com ocorrência única (o arnês lança sem alvo), SHA-256 conferido na
restauração (`history.ts` `d3124f01…`, `catalog.ts` `37ee5491…`); suítes rodadas: `history.test.ts`
(core), `orderDetail.test.ts` + `AdminOrderPage.test.tsx` (painel), `ItensValoresEntregaHistorico.test.tsx`
(ateliê). Nenhuma morte por compilação.

| Mutante | Resultado |
| --- | --- |
| K1 a falha volta a `rotuloDoEvento` (o defeito original; o M10 do autor) | morto — core 19, painel 2 |
| K2 o recuo do slug vira `Aviso <slug> enviado` | morto — core 1 ("fora do vocabulário … sem enviado") |
| K3 `nomeDoEvento` lendo `NOTIFICATION_EVENT_LABELS` | morto — core 18, painel 2 |
| K4 o canal da falha cravado em `(E-mail)` | morto — core 1 (o caso do WhatsApp) |
| K5 a linha que SAIU passa a usar o nome do evento | morto — core 3, painel 10 |
| K6 a frase volta a "Falha ao enviar aviso de …" | morto — core 19, painel 2 |
| K7 `nomeDoEvento` devolve sempre o slug cru | morto — core 18, painel 2 |
| K8 o NOME de `order_paid` no catálogo vira "Pagamento aprovado enviado" | morto — `history.test.ts` (o `not.toMatch(/enviad[oa]/i)` pega mesmo com o esperado derivado da constante) e `catalog.test.ts` (o particípio) |

**8/8 mortos por asserção.** O `it.each` dos 17 eventos não é verdadeiro nos dois mundos: o esperado
deriva de `NOTIFICATION_EVENT_NAMES`, mas a régua vizinha `/enviad[oa]/` é independente da constante
e mata K8.

### 4. Observações (não bloqueiam)

- **O1 — a superfície do ateliê só confere o prefixo.** `ItensValoresEntregaHistorico.test.tsx:182`
  assere `/^Falha ao enviar /`, e nenhum mutante de K1–K8 a derruba (33/33 verdes em todos). Não é
  lacuna: o widget desenha `ev.title` sem transformação, o texto é provado no dono (core) e na
  superfície do painel (`AdminOrderPage.test.tsx:334`), que lê o mesmo `buildHistory`. Se um dia o
  `Historico` passar a compor o título, a régua do ateliê precisa ficar exata.
- **O2 — rastreabilidade e a decisão contra `AD-056`.** O conserto muda texto do PAINEL
  (`/admin/pedidos/:id`, a linha de falha) e reescreve duas asserções do painel
  (`orderDetail.test.ts:229`, `AdminOrderPage.test.tsx:334`), contra a letra de `MAP-47` ("suíte do
  painel verde **sem asserção tocada**") e de `MAP-48` ("byte a byte a do painel"). Está declarado no
  `tasks.md` (B03, *Nota contra `AD-056`*), mas **não** na `spec.md`, e o próprio bug registra a mudança
  como "decisão humana". Vale uma linha de `SPEC_DEVIATION` em `MAP-47`/`MAP-48` (a frase de falha
  mudou de propósito, por `BUG-20261024-falha-de-aviso-diz-enviado`) e a confirmação do usuário no
  handoff. Não bloqueia o gate: a mudança é o conserto do defeito, nos dois apps ao mesmo tempo, com
  um dono só.

### Veredito

**PASS** — B03 fecha o bug no dono (`core`), as duas superfícies leem a frase nova, 8/8 mutantes
mortos por asserção, suítes e tipos sem regressão. Pendente só o reteste do QA (o bug segue
`fixed (aguarda reteste)`) e as duas observações de §4.

## Fecho — 2026-10-24 (orquestração; autor ≠ verificador só no que está marcado)

### G-B02-1 e G-B02-2 — fechados

Os dois casos pedidos pela verificação do conserto do QA (rodada 1) estão em
`apps/mobile-adm/src/pages/__tests__/PedidosPage.test.tsx`, no `describe` de B02 ("depois de trocar de
chip … devolve o termo" e "uma busca apagada não volta …"). W1 e W2 reinjetados no arquivo real
(`useTermoDaEntrada.ts`, alvo de ocorrência única, SHA-256 conferido na restauração):

| Mutante | Resultado |
| --- | --- |
| W1 o efeito com deps `[]` | morto por asserção — "depois de trocar de chip …" |
| W2 sem o `else termos.delete(key)` | morto por asserção — "uma busca apagada não volta …" |

### Gates do fecho (um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe)

store **5852/319** · backoffice **3671/210** · mobile-adm **811/61** · core **4016/158** · functions
957/21 · catalog-import 512/23 = **15819/792**, exit 0 nos seis (+635/+36 contra a entrada 15184/756).
`tsc` 0 em store (app e server), backoffice, mobile-adm (app e node) e catalog-import; core 11
(herdados). Lint 2/2 · 23/5 · 0/0. `pnpm --filter @estrelinha/mobile-adm build` verde.

### O que segue SEM verificação independente

- **O conserto da rodada 4 (D2, G7, G8)** — a recusa da página seguinte guardada em módulo
  (`useListaDePedidos.ts`) e `isAccessDenied` em `core/hooks/useStoreOverview`. O autor reinjetou Q16,
  Q23 e três mutantes do registro (todos mortos por asserção); a rodada 5 do Verificador não correu.
