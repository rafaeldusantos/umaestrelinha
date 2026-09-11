# Gaveta de material — Verificação independente

> **Autor ≠ verificador.** Esta rodada foi executada por um verificador que não implementou a
> feature, sem herdar o modelo mental de quem a escreveu: a cobertura foi re-derivada do `spec.md`,
> e toda afirmação abaixo é **evidência medida ou zero**.

**Veredito final (rodada 2): PASS com ressalvas.** Os quatro mutantes que sobreviveram na rodada 1
**morrem agora**, e os seis achados foram endereçados. O que sobra são **seis mutantes novos, todos
em cima dos consertos** — nenhum deles quebra comportamento hoje, e todos deixam uma invariante
declarada sem prova. Ver **Rodada 2**, ao fim.

> **A rodada 1 fica INTEIRA abaixo, e de propósito.** O histórico do que sobreviveu é o valor: é ele
> que explica por que cada caso novo existe, e é a única defesa contra alguém "simplificar" de volta
> um teste que parece redundante.

---

## Rodada 1 — veredito da época: **FAIL**

O motivo é o mesmo achado nº 1 da feature `41`, repetido letra por letra: **as duas pontas estão
provadas e o fio entre elas não**. Apagar `<MaterialDrawer />` de `pages/ProductPage.tsx` deixa a
suíte inteira do store verde — **2828 testes, 182 arquivos, exit 0** — e a gaveta fica inalcançável
na loja. O arquivo que diz cobrir exatamente isso (`ProductPageMaterialDrawer.test.tsx`) monta a
própria árvore com `<MaterialDrawer />` escrito **no teste**, então ele prova a composição que o
teste faz, não a que a página faz. O `tasks.md` registra como *done when* da T14 a frase "um teste
que apagar `<MaterialDrawer />` reprova": esse *done when* está **falso**.

Mais três mutantes sobreviveram, os três em cima de uma AC.

---

## Intervalo de diff avaliado

| Item | Valor |
| --- | --- |
| Base (HEAD) | `9d873d6` — *feat(produto): frete no lugar dos selos, e a barra de compra revela após a foto* (2026-09-11) |
| Avaliado | O **diff não commitado** sobre esse HEAD: 19 arquivos modificados (286 inserções / 75 remoções) + os não rastreados de `entities/material/**`, `widgets/material-drawer/**`, `entities/product/ui/__tests__/MaterialTriggerPlacement.test.tsx`, `pages/__tests__/ProductPageMaterialDrawer.test.tsx` e `.specs/features/44-gaveta-de-material/` |
| Fora do escopo | O trabalho anterior da barra de compra / página do produto — já **commitado** em `9d873d6`, não avaliado |

**Medidas da árvore limpa** (um workspace por vez, exit code capturado fora de pipe):

| Medida | Resultado |
| --- | --- |
| `npx vitest run` (store) | **2828 / 182**, `EXIT=0` — bate com a baseline escrita no `CLAUDE.md` |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | `EXIT=0` |
| `pnpm --filter @estrelinha/store lint` | **2 erros / 2 warnings** — igual à baseline do store; os 2 warnings de fronteira continuam sendo os **dois** de `ProductInfo.tsx` (`entities → features`), e o import novo é `entities → entities`, que não somou warning |
| Emoji / urgência fabricada nos 17 arquivos novos | nenhum |

---

## 1 · Checagem ancorada na spec

| AC | Veredito | Evidência (arquivo:linha) |
| --- | --- | --- |
| **GAV-01** rótulo, apoio e posição | **COBERTA** | `entities/material/ui/__tests__/MaterialSendTrigger.test.tsx:40` (as duas frases **inteiras**); `entities/product/ui/__tests__/MaterialTriggerPlacement.test.tsx:177` (depois de "Em estoque") e `:191` (antes do "Adicionar ao carrinho") |
| **GAV-02** só com `requires_material` | **COBERTA** | `MaterialSendTrigger.test.tsx:48` e `:53` (os **dois** estados falsos, `false` e `null`); `MaterialTriggerPlacement.test.tsx:171` |
| **GAV-03** o gatilho não nomeia material | **PARCIAL** | `MaterialSendTrigger.test.tsx:58` percorre **todos** os `MATERIAL_KIND_LABELS`. Falta: o fixture tem `material_kinds: ['cinzas']`, e só o rótulo de `cinzas` coincide com a **chave crua**. Um gatilho que renderizasse `product.material_kinds` cru numa peça de `pelo_pet` sairia "pelo_pet" na tela e passaria (o rótulo é "Pelo do pet"). Some-se a isso que `entities/material/ui` **não está no escopo** do guarda de fonte (ver GAV-08) |
| **GAV-04** aciona → gaveta pela direita, sem navegar | **PARCIAL** | O lado: `widgets/material-drawer/ui/__tests__/MaterialDrawer.test.tsx:41` (`right-0` + `slide-in-from-right`). A abertura: `pages/__tests__/ProductPageMaterialDrawer.test.tsx:93`. **Falta a metade que importa**: nada prova que a gaveta está montada **na página** — ver achado **A1** |
| **GAV-05** alvo de 44px | **COBERTA** | `MaterialSendTrigger.test.tsx:69`, por **token exato** (`min-h-[64px]`) |
| **GAV-06** o guarda continua recusando as sete formas | **COBERTA** | `entities/product/ui/__tests__/semMaterialNaPaginaDoProduto.test.ts:145` — **uma asserção por forma**. Confirmado por injeção real (mutante M13): `materialKindsOf` em `ProductInfo.tsx` derruba 2 casos |
| **GAV-07** a régua aceita `requiresMaterial`, com sensor | **COBERTA** | `semMaterialNaPaginaDoProduto.test.ts:161` — quatro grafias do interruptor, todas `false` |
| **GAV-08** escopo não alcança a gaveta, e há prova | **PARCIAL** | `semMaterialNaPaginaDoProduto.test.ts:189` prova que a fronteira existe — mas contra **`entities/material/model/guide.ts`**, não contra a gaveta. A AC pede "um teste SHALL provar que **a gaveta** de fato nomeia material"; nenhum caso lê um arquivo de `widgets/material-drawer/` com a régua. `:203` prova só a ausência do caminho no escopo. Ver achado **A6** |
| **GAV-09** ordem nota → pergunta → chips → passos | **COBERTA** | `MaterialDrawer.test.tsx:92`, por índice de texto no DOM. Mutante M9 (trocar a ordem) **morto** |
| **GAV-10** escolher troca o corpo sem fechar, e o chip fica distinto | **PARCIAL** | Troca sem fechar: `MaterialDrawer.test.tsx:141` e `ProductPageMaterialDrawer.test.tsx:109`. **"Visualmente distinto" não tem asserção**: só `aria-pressed` é conferido (`:149`), e o mutante M17 (colapsar os dois ramos de classe do chip) **sobreviveu** |
| **GAV-11** ficha rica completa | **PARCIAL** | `MaterialDrawer.test.tsx:211` cobre quantidade (valor **e** nota), `listaTitulo`, itens, passos e avisos — **mas só de `cinzas`**, que tem **um** aviso. `todos os avisos` e `alerta`/`calma` visualmente distintos ficaram sem prova: mutantes **M16** e **M15** sobreviveram |
| **GAV-12** cartão simples sem bloco vazio | **COBERTA** | `MaterialDrawer.test.tsx:226` — presença dos itens **e** ausência de "Quantidade"/"Recipientes aceitos" |
| **GAV-13** preparo em casa | **PARCIAL** | `MaterialDrawer.test.tsx:238` cobre o aviso e **todos** os passos. **"numerados" não é asserido** — a numeração sai em `<span aria-hidden>` e nenhum caso a lê |
| **GAV-14** vídeo dentro da gaveta, e ausência quando não há | **COBERTA** | `MaterialDrawer.test.tsx:269` (nenhum `iframe` antes do toque, medido no `document` e não no `container`), `:279` (`youtube-nocookie`), `:297` (material sem vídeo). Mutante M7 **morto** (4 casos) |
| **GAV-15** a escolha sobrevive ao fechar | **COBERTA** | `ProductPageMaterialDrawer.test.tsx:119` — **pela tela**. Mutante M4b (limpar `anchor` no caminho real de fechamento) **morto** por esse único caso. Ressalva: o teste de store (`materialDrawerStore.test.ts:41`) exercita `closeDrawer`, que **nenhuma tela chama** — ver achado **A4** |
| **GAV-16** rodapé aponta para a âncora escolhida | **COBERTA** | `MaterialDrawer.test.tsx:163`, `:170` e `:177` (um caso **por entrada** de `ATALHOS_DE_MATERIAL`). Ressalva de desenho no achado **A3** |
| **GAV-17** dono único do conteúdo | **COBERTA** | `entities/material/model/__tests__/donoUnicoDoGuia.test.ts:201` (nenhuma segunda declaração em 223 arquivos de produção), `:214` (o diretório antigo não existe), `:226` (sem import lateral). Âncora dupla em `:120` e `:133`; remoção de comentário provada com LF, CRLF e o glob de dois asteriscos em `:182` |
| **GAV-18** a página do guia não regride | **PARCIAL** | `HowToSendMaterialPage.tsx` e `HowToSendMaterialPage.test.tsx` **não mudaram uma linha** (`git status`), e os 34 casos passam. As classes de `MaterialAviso` reproduzem **exatamente** as que saíram de `MaterialFicha.tsx` (conferido token a token). Mas o **tom** do aviso ficou sem guarda nas duas superfícies: M15 sobreviveu na suíte inteira |
| **GAV-19** `MATERIAIS_SEM_ANCORA` vazio | **COBERTA** | `donoUnicoDoGuia.test.ts:234` |
| **GAV-20** `rotuloCurto` ≤ 20 caracteres | **COBERTA** | `entities/material/model/__tests__/rotuloCurto.test.ts:61` (um caso por entrada), com âncora de contagem derivada das três origens em `:35` e régua como predicado em `:31`. Mutante M11 **morto** (3 casos) |
| **GAV-21** 480px · tela − 48px · o véu fecha | **PARCIAL** | As duas larguras: `MaterialDrawer.test.tsx:50`, por token exato, **com o par negativo** (`w-3/4` e `sm:max-w-sm` do variant do `Sheet` não podem sobreviver ao `cn`). Mutante M12 **morto**. **"A faixa restante SHALL fechar a gaveta ao ser acionada" não tem asserção nenhuma** — depende do comportamento padrão do `Dialog.Overlay` do Radix, que ninguém mede aqui |
| **GAV-22** o foco volta para o gatilho | **COBERTA** | `ProductPageMaterialDrawer.test.tsx:142`. Mutante M10 (remover o `useEffect`) **morto** |
| **GAV-23** saída externa do vídeo preservada | **COBERTA** | `MaterialDrawer.test.tsx:288` — nos **dois** estados |

### Edge Cases da spec (fora da tabela de rastreabilidade)

| Edge Case | Veredito |
| --- | --- |
| `ATALHOS_DE_MATERIAL` ganha entrada ⇒ chip aparece sem alteração | **COBERTA** — a lista é derivada e percorrida (`MaterialDrawer.test.tsx:116`) |
| **`Outro material` ⇒ aviso do cartão + saída para WhatsApp** | **AUSENTE** — a gaveta **não tem saída para WhatsApp em ponto nenhum**; `grep` por `wa.me`/`whatsapp` em `widgets/material-drawer/**` devolve zero. Ver achado **A5** |
| Capa do YouTube não carrega ⇒ bloco legível pelo título, sem imagem quebrada | **PARCIAL** — o título está ao lado (`MaterialDrawerVideo.tsx:86`), mas o `alt` é **vazio** (`:73`), e o `design.md` prescreve "alt descritivo" |
| Player bloqueado ⇒ `videoUrl` como saída externa | **COBERTA** (`MaterialDrawer.test.tsx:288`) |
| Foco volta ao fechar | **COBERTA** (GAV-22) |
| A linha não fica encoberta pela barra fixa no celular | **NÃO MEDIDO** — jsdom devolve 0 para layout; é prova em navegador |

### Lacunas de precisão da spec

1. **`GAV-10` "visualmente distinto" não define o quê.** A implementação respondeu com `aria-pressed`
   + classes; a suíte só assere o atributo. Uma AC que diz "visual" precisa nomear a propriedade
   asserível, senão ela nasce sem guarda — foi o que aconteceu (M17).
2. **`GAV-11` "com `alerta` e `calma` visualmente distintos"** tem o mesmo defeito, e custou M15.
3. **`GAV-21` "a faixa restante SHALL fechar a gaveta"** não diz por qual mecanismo, e o mecanismo
   escolhido (o overlay do Radix) é justamente o que jsdom não exercita. Sem uma régua declarada, a
   AC fica com zero asserção.
4. **`GAV-04` "sem navegar"** não tem resultado esperado definido (nenhuma asserção de rota, de
   `history` ou de ausência de `<a>`). Hoje é verdade por construção, não por prova.
5. **O Edge Case de `Outro material`** contradiz o *Out of Scope* da própria spec, que tira o
   endereço e o pós-compra da gaveta — e nunca foi rastreado num `GAV-xx`, então passou por fora da
   matriz de cobertura e não foi implementado.

---

## 2 · Sensor de discriminação (mutação)

Cada mutante foi aplicado **um por vez**, no código de **produção**, com o exit code capturado fora
de pipe, e desfeito a partir de backup em seguida. A árvore foi conferida ao fim: `git diff --stat`
devolve os mesmos **19 arquivos / 286 inserções / 75 remoções** do início.

| # | Mutação | Escopo rodado | Resultado |
| --- | --- | --- | --- |
| **M1** | apagar `<MaterialDrawer />` de `pages/ProductPage.tsx:289` | **suíte inteira do store** | **SOBREVIVEU** — 2828/182, `EXIT=0` |
| M2 | apagar `<MaterialSendTrigger product={product} />` de `entities/product/ui/ProductInfo.tsx:182` | `MaterialTriggerPlacement` + `ProductPageMaterialDrawer` | MORTO (7 casos) |
| M3 | `if (!requiresMaterial(product)) return null` → `if (false) return null` | `entities/material` + fio + página | MORTO (4 casos) |
| M4 | `closeDrawer: () => set({ open: false, anchor: null })` | `entities/material` + página | MORTO (2 casos) — **mas só pelo teste de store; a tela não reprovou, porque nenhuma tela chama `closeDrawer`** (achado A4) |
| **M4b** (acrescentado) | `setDrawerOpen` limpando `anchor` ao fechar — **o caminho real** | `entities/material` + gaveta + página | MORTO (1 caso: `ProductPageMaterialDrawer.test.tsx:119`) |
| M5 | `atalho.rotuloCurto` → `atalho.rotulo` em `MaterialDrawerChips.tsx:54` | gaveta + página | MORTO (7 casos) |
| M6 | remover o bloco de quantidade da ficha rica (`MaterialDrawerBody.tsx:89-97`) | gaveta | MORTO (1 caso) |
| M7 | renderizar o `<iframe>` sempre (`MaterialDrawerVideo.tsx:34`) | gaveta | MORTO (4 casos) |
| M8 | `side="right"` → `side="bottom"` (`MaterialDrawer.tsx:55`) | gaveta | MORTO (1 caso) |
| M9 | `<MaterialDrawerSteps />` antes de `<MaterialDrawerChips />` | gaveta | MORTO (1 caso) |
| M10 | remover o `useEffect` de devolução de foco (`MaterialSendTrigger.tsx:49-52`) | `entities/material` + página | MORTO (1 caso) |
| M11 | remover `rotuloCurto: 'Unhas'` de `guide.ts:261` | modelo + gaveta | MORTO (3 casos) |
| M12 | `w-[calc(100%-48px)]` → `w-full` (`MaterialDrawer.tsx:58`) | gaveta | MORTO (1 caso) |
| M13 (acrescentado) | injetar `materialKindsOf(product)` em `ProductInfo.tsx` — o *Independent Test* da spec | guarda estreitado | MORTO (2 casos) |
| M14 (acrescentado) | o gatilho passa a nomear o material com `MATERIAL_KIND_LABELS` | `entities/product` + `entities/material` + página | MORTO (2 casos) |
| **M15** (acrescentado) | `if (aviso.tom === 'alerta')` → `if (false)` em `MaterialAviso.tsx:43` — os dois tons colapsam | **suíte inteira do store** | **SOBREVIVEU** — 2828/182, `EXIT=0` |
| **M16** (acrescentado) | `ficha.avisos.map` → `ficha.avisos.slice(0, 1).map` (`MaterialDrawerBody.tsx:119`) | gaveta + página | **SOBREVIVEU** |
| **M17** (acrescentado) | colapsar os dois ramos de classe do chip — escolhido e não escolhido ficam idênticos | gaveta + página | **SOBREVIVEU** |

---

## 3 · Julgamento próprio — achados por severidade

### A1 · CRÍTICO — a gaveta pode sumir da loja inteira com a suíte verde (`GAV-04`, T14)

`pages/ProductPage.tsx:289` é a única linha que monta `<MaterialDrawer />` na loja, e **nenhum teste
a lê**. `ProductPageMaterialDrawer.test.tsx:69` monta a própria composição:

```tsx
const Pagina = ({ value }: { value: Product }) => (
  <>
    <ProductInfo product={value} purchase={useProductPurchase(value)} />
    <MaterialDrawer />
  </>
)
```

O `<MaterialDrawer />` está **escrito no teste**. O comentário de `:94` — *"Este é o caso que reprova
se `<MaterialDrawer />` sair de `ProductPage.tsx`"* — é falso, e medi: com a linha apagada, os **2828
testes** do store passam. O efeito na loja é total: a cliente toca em "Como enviar seu material de
DNA" e **nada acontece**, em toda peça que exige material.

É a forma exata do achado nº 1 da `41` ("as duas pontas provadas, o fio no meio não") e da sobra de
`deleteSection`. O agravante é que o `tasks.md` previu o risco por escrito e o *done when* que o
cobria não foi cumprido — o arquivo novo prova o fio entre **gatilho e gaveta**, não entre **página e
gaveta**. A prova possível é ou renderizar `ProductPage` de verdade, ou um guarda de fonte que leia
`ProductPage.tsx` do disco e exija a montagem (o molde já existe em `previaUnica.test.ts`).

### A2 · ALTO — o tom `alerta` do aviso perdeu o guarda nas DUAS superfícies (`GAV-11`, `GAV-18`)

`MaterialAviso.tsx` foi extraído de `MaterialFicha.tsx` **para não dar dois donos ao tom** — e o
movimento saiu sem asserção nenhuma sobre o tom. Com `if (aviso.tom === 'alerta')` trocado por
`if (false)`, os 2828 testes passam: o único aviso `alerta` do guia (o "nunca use fita adesiva" da
ficha de cabelos) perderia a barra, o rosa de advertência e o ícone `!`, e sairia com a mesma cara do
aviso que **tranquiliza**. O guia é o documento que impede a cliente de estragar o material; ali a
distinção entre "isto acalma" e "isto estraga" é informação, não estilo.

Some-se a isso que **os avisos com tom `alerta` só existem na ficha de cabelos**, e a gaveta só é
testada com `cinzas` — então nem por acidente algum caso passa por esse ramo.

### A3 · MÉDIO — defeito 01 introduzido: a URL do guia com âncora ganhou um segundo dono (`GAV-16`)

`MaterialDrawer.tsx:50` monta o link do rodapé à mão:

```ts
const hrefGuia = escolhido ? `${GUIA_MATERIAL_PATH}#${escolhido.anchor}` : GUIA_MATERIAL_PATH
```

O dono dessa forma já existe e é **`materialGuideHref(anchor?: string | null)`** em
`@estrelinha/core/routes:120` — que aceita exatamente o que a gaveta tem (uma âncora `string`),
devolve o caminho sem `#` quando a âncora é nula **ou só espaço**, e tem teste próprio
(`packages/core/src/routes/__tests__/routes.test.ts:239`). O `design.md` listou `guiaMaterialHref`
como reuso e o *done when* da T13 diz "Reuses `guiaMaterialHref` / `MATERIAL_GUIDE_PATH`"; a
implementação reescreveu a regra. Hoje os dois concordam — que é precisamente a propriedade que torna
o defeito 01 caro. A objeção previsível ("`guiaMaterialHref` pede `MaterialKind`, e duas âncoras não
são `MaterialKind`") vale para o atalho de `entities/material`, **não** para o de `core/routes`, que
já é por string.

### A4 · MÉDIO — `closeDrawer` é exportado, testado e **não tem consumidor** (a sobra de `deleteSection`)

`grep` em produção: `closeDrawer` aparece só na própria declaração
(`materialDrawerStore.ts:30` e `:40`). Quem fecha a gaveta de verdade é o `onOpenChange` do `Sheet`,
que chama **`setDrawerOpen`** (`MaterialDrawer.tsx:53`) — e `setDrawerOpen` **não está no `design.md`**,
que declara a interface como `openDrawer` · `closeDrawer` · `setAnchor`.

O custo não é a linha morta: são os **dois casos de `materialDrawerStore.test.ts`** que provam
`GAV-15` contra uma função que nenhuma tela executa. Medido: M4 (fazer `closeDrawer` apagar a escolha)
derruba o teste de store e **não** derruba a tela; M4b (o mesmo defeito no caminho real) derruba
exatamente **um** caso, no arquivo de fio. A AC está protegida por um fio de cabelo, e o teste que
parece protegê-la não protege.

### A5 · MÉDIO — o Edge Case de `Outro material` não foi implementado

A spec diz: *"WHEN o material escolhido é `Outro material` THEN a gaveta SHALL exibir o aviso do
cartão **e a saída para WhatsApp**"*. A gaveta não tem saída para WhatsApp em lugar nenhum — o cartão
renderiza dois itens em lista, e o primeiro deles **manda falar com a loja** ("Fale com a gente antes
de enviar") sem oferecer como. No registro memorial desta marca, mandar a cliente procurar o contato
sozinha é o oposto do que a feature existe para fazer. Ou a saída entra, ou o Edge Case sai da spec
com a razão escrita.

### A6 · MÉDIO — o escopo do guarda estreitado não acompanhou a superfície nova (`GAV-03`, `GAV-08`)

O `ESCOPO` de `semMaterialNaPaginaDoProduto.test.ts:38` continua sendo
`['entities/product/ui', 'widgets/product-buy-bar', 'pages/ProductPage.tsx']`. Mas a coluna de
informação da página do produto agora renderiza um arquivo que mora **fora** dele:
`entities/material/ui/MaterialSendTrigger.tsx`. A regra do guarda é sobre a **página**, não sobre o
diretório — e o diretório deixou de conter a página inteira no dia em que esta feature nasceu.

Hoje o que segura essa ponta é `MaterialSendTrigger.test.tsx:58`, que é teste de render contra um
fixture de um material só. Um `materialKindsOf(product)` dentro do gatilho, usado para decidir algo
sem renderizar rótulo, passa pelos dois. **Guarda com alcance menor que a regra é allowlist com outro
nome** — é a lição que a `39` já pagou quando o escopo de `menuSurfaceSingleOwner` parou em `apps/`.

E a prova de `GAV-08` mede o arquivo errado: ela lê `entities/material/model/guide.ts` para mostrar
que a fronteira existe, quando a AC pede que **a gaveta** seja o objeto da prova.

### A7 · BAIXO — `GAV-10` e `GAV-13` sem asserção de forma

O estado escolhido do chip (M17) e a numeração dos passos de preparo em casa não têm nenhuma
asserção. No caso do chip, colapsar os dois ramos de classe deixa a gaveta **sem resposta visível** a
um toque — a cliente toca, a ficha aparece embaixo, e o chip não muda: fica sem saber o que está
vendo. `aria-pressed` corrige para leitor de tela, não para o olho.

### A8 · BAIXO — pontas de acessibilidade e de convenção do repositório

- O gatilho não anuncia que abre uma camada: sem `aria-haspopup="dialog"` nem `aria-expanded`
  (`MaterialSendTrigger.tsx:60`). O `Sheet` é um `Dialog` do Radix, e o par é o padrão da role.
- Escolher um chip troca o corpo da gaveta **sem nada anunciar** — não há `aria-live` nem movimento
  de foco. Para quem usa leitor de tela, a resposta à única pergunta da gaveta acontece em silêncio.
- A capa do vídeo usa `alt=""` (`MaterialDrawerVideo.tsx:73`) onde o `design.md` prescreve "alt
  descritivo". O título ao lado salva a legibilidade; a prescrição continua não cumprida.
- **Imports profundos onde há barrel**: `ProductInfo.tsx:13` importa
  `@/entities/material/ui/MaterialSendTrigger` e `MaterialFicha.tsx:6` importa
  `@/entities/material/ui/MaterialAviso`, enquanto `entities/material/index.ts:50` exporta os dois. O
  `CLAUDE.md` diz "novo código deve importar do slice".
- `widgets/material-guide/index.ts` virou `export * from '@/entities/material'`, o que faz o barrel do
  **guia** reexportar `useMaterialDrawerStore` e `MaterialSendTrigger` — peças da gaveta saindo pela
  porta do guia. Não é import lateral (o guarda `importaLateralmente` está certo em não acusar), mas é
  uma porta a mais para o acoplamento que a feature acabou de desfazer.

### O que continua não medido (e não é achado, é fila)

`jsdom devolve 0 para toda medida de layout`, e **tudo** o que esta feature entrega de visual está
nessa categoria: a largura de 480px no computador, a faixa de véu de 48px alcançável pelo dedo, a
rolagem interna da gaveta, e o critério de sucesso escrito na própria spec — *"a pergunta 'Qual é o
seu material?' e todos os chips ficam acima da dobra em 390×844"*. Nenhuma linha da suíte chega perto
disso. A prova em navegador, em 390×844 e 1440, entra na fila da `32`, `33`, `34`, `35`, `37`, `39` e
`41`.

---

## Para passar

1. **A1** — provar o fio `ProductPage → MaterialDrawer` (renderizando a página de verdade, ou lendo
   `ProductPage.tsx` do disco), e corrigir o comentário que afirma o que não é feito.
2. **A2** — asserir a distinção dos dois tons de `MaterialAviso`, nas duas superfícies, e cobrir uma
   ficha com mais de um aviso (`cabelo` ou `leite_materno`).
3. **A5** — decidir e registrar: a saída para WhatsApp entra na gaveta, ou o Edge Case sai da spec.
4. **A3** — o rodapé passa a chamar `materialGuideHref`.
5. **A4** — `closeDrawer` vira o caminho real ou é apagado; o `design.md` passa a declarar
   `setDrawerOpen`.
6. **A6** — o escopo do guarda alcança `entities/material/ui`, com a allowlist escrita para o que
   deve passar; a prova de `GAV-08` mede a gaveta.
7. **A7** — asserção de forma para o chip escolhido e para a numeração dos passos.

---
---

# Rodada 2 — reverificação dos consertos

> **Autor ≠ verificador**, o mesmo verificador da rodada 1. Nada foi consertado aqui: toda mutação
> foi aplicada uma por vez, medida com exit code fora de pipe, e desfeita a partir de backup.
> Ao fim, `git diff --stat` devolve os mesmos **19 arquivos / 320 inserções / 77 remoções** do
> início, e `git status --porcelain` as mesmas 28 linhas.

**Veredito: PASS com ressalvas.**

**Medidas da árvore limpa** (base `9d873d6`, um workspace por vez):

| Medida | Resultado | Contra a rodada 1 |
| --- | --- | --- |
| `npx vitest run` (store) | **2841 / 183**, `EXIT=0` | +13 casos, +1 arquivo — bate com a baseline declarada |
| `npx tsc --noEmit -p apps/store/tsconfig.app.json` | `EXIT=0` | igual |
| `pnpm --filter @estrelinha/store lint` | **2 erros / 2 warnings** | igual; os 2 warnings continuam sendo os dois `entities → features` de `ProductInfo.tsx` |

## 1 · Os quatro sobreviventes da rodada 1, reinjetados

Cada um foi reaplicado **exatamente** como na rodada 1, no mesmo arquivo e na mesma linha.

| # | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- |
| **M1** | apagar `<MaterialDrawer />` de `pages/ProductPage.tsx:289` | **MORTO** (5 casos) | `pages/__tests__/ProductPageMaterialDrawer.test.tsx` — "acionar a linha ABRE a gaveta montada pela PÁGINA" (`:109`), "escolher material…" (`:126`), "fechar pelo X…" (`:136`), "fechar por ESCAPE…" (`:150`), "fechar devolve o foco…" (`:173`) |
| **M15** | `if (aviso.tom === 'alerta')` → `if (false)` em `entities/material/ui/MaterialAviso.tsx:43` | **MORTO** (3 casos) | `entities/material/ui/__tests__/MaterialAviso.test.tsx:25`, `:34` e `:52` |
| **M16** | `ficha.avisos.map` → `ficha.avisos.slice(0, 1).map` em `widgets/material-drawer/ui/MaterialDrawerBody.tsx:119` | **MORTO** (2 casos) | `MaterialDrawer.test.tsx` — "ficha com DOIS avisos mostra os dois" e "cada ficha rica mostra TODOS os seus avisos" |
| **M17** | colapsar os dois ramos de classe do chip (`MaterialDrawerChips.tsx:48-52`) | **MORTO** (1 caso) | `MaterialDrawer.test.tsx` — "o chip escolhido também MUDA DE CARA — `aria-pressed` sozinho não basta" |

**O conserto do M1 é o que mais importa, e ele é real.** A montagem agora é
`MemoryRouter` + `Route path="/produtos/:slug"` + `<ProductPage />`, com dublê **só nas bordas**
(`useProduct`, `useProducts`, `useProductFaqs`, `useCategories`, `sonner`, `ProductGallery`,
`ProductDetailsAccordion`, `RelatedProducts`, `ProductBuyBar`, `ShareButtons`, `ShippingCalc`,
`useStoreSettings`). **`ProductInfo` e `MaterialDrawer` não estão na lista de `vi.mock`** — conferido
linha a linha — e o arquivo carrega a própria âncora anti-vacuidade em `:97` ("a PÁGINA renderiza a
linha do gatilho"), que **passou** sob o M1 enquanto os outros cinco reprovavam. Isto é exatamente o
que distingue um teste de fio de um teste que monta a árvore que quer provar: sob a mutação, a
âncora fica verde e o fio fica vermelho.

## 2 · Os consertos dos achados, conferidos

| Achado | Conserto | Verificação |
| --- | --- | --- |
| **A3** (defeito 01 na URL do rodapé) | `MaterialDrawer.tsx:50` chama `materialGuideHref(escolhido?.anchor)` de `@estrelinha/core/routes`; a interpolação à mão saiu | **OK**. O dono único trata `undefined`, `null` e string em branco (`packages/core/src/routes/__tests__/routes.test.ts:239`), e os 3 casos do rodapé continuam verdes, inclusive o laço por **todas** as 10 entradas |
| **A4** (`closeDrawer` sem consumidor) | `closeDrawer` **removido**; `setDrawerOpen` é o caminho único, com a razão escrita em `materialDrawerStore.ts:30-38` | **OK**, e provado: `materialDrawerStore.test.ts:65` assere `'closeDrawer' in getState() === false`. O mutante N8 (fechar limpando `anchor`) agora morre por **4** casos — dois de store e dois de tela —, contra **1** na rodada 1 |
| **A5** (Edge Case de `Outro material`) | `MaterialDrawerWhatsApp.tsx` novo, renderizado por `MaterialDrawerBody.tsx:147` quando `cartao.kind === 'outro'` | **Parcial** — ver B1 e B2 |
| **A6** (escopo do guarda menor que a regra) | `ESCOPO` ganhou `entities/material/ui`; a prova de `GAV-08` passou a ler `MaterialDrawerBody.tsx`; caso novo assere que o escopo alcança `MaterialSendTrigger.tsx` | **OK**, e provado em arquivo real pelo mutante **N7** |
| **A7** (`GAV-10` sem asserção de forma) | caso novo do chip | **OK** (M17 morre) |
| **A8** (a11y e `alt`) | `aria-haspopup="dialog"` + `aria-expanded={open}` no gatilho; `alt` descritivo na capa do vídeo | **Feito, sem guarda** — ver B6 |

**Não regrediu nada do que já estava provado**: `GAV-11` ganhou o laço por todas as fichas ricas,
`GAV-15` ganhou o segundo caminho de fechamento (Escape), `GAV-18` segue com
`HowToSendMaterialPage.tsx` e o teste dela intocados, e `MaterialAviso.test.tsx:71` carrega âncora de
catálogo — se o guia perdesse todo aviso `alerta`, os casos contra objetos literais continuariam
verdes, e essa âncora é quem avisa.

## 3 · Mutantes novos — mirando o que os consertos introduziram

| # | Mutação | Escopo rodado | Resultado |
| --- | --- | --- | --- |
| **N1** | `MaterialDrawerWhatsApp.tsx:23` — `if (digitos.length < 10) return null` → `if (false) return null` | gaveta + fio da página | **SOBREVIVEU** |
| **N2** | `MaterialDrawerWhatsApp.tsx:28` — remover `encodeURIComponent` da mensagem | gaveta | **SOBREVIVEU** |
| **N3** | `MaterialDrawerBody.tsx:147` — `cartao.kind === 'outro'` → `cartao.kind !== null` | gaveta | **SOBREVIVEU** |
| **N4** | `MaterialDrawer.tsx:50` — `materialGuideHref(escolhido?.anchor)` → `materialGuideHref(anchor)` | gaveta | **SOBREVIVEU** |
| **N5** | `MaterialSendTrigger.tsx:67-68` — remover `aria-haspopup` e `aria-expanded` | `entities/material` + `entities/product/ui` + fio | **SOBREVIVEU** |
| **N6** | `MaterialDrawerVideo.tsx:77` — `alt` descritivo → `alt=""` | gaveta | **SOBREVIVEU** |
| N7 | injetar `materialKindsOf(product)` em `MaterialSendTrigger.tsx` — arquivo real do **escopo novo** | guarda | MORTO (1 caso) |
| N8 | `setDrawerOpen` limpando `anchor` ao fechar — o **caminho único** agora | `entities/material` + gaveta + fio | MORTO (4 casos) |
| N9 | remover `<MaterialDrawerWhatsApp />` de `MaterialDrawerBody.tsx:147` | gaveta | MORTO (1 caso) |

## 4 · Achados novos, por severidade

### B1 · MÉDIO — "sem WhatsApp configurado o bloco não renderiza" não tem uma asserção (N1)

`MaterialDrawerWhatsApp.tsx:12-14` declara a invariante por escrito — *"sem WhatsApp configurado o
bloco não renderiza — mesma regra do `GuideWhatsAppCta`. Um botão para um número que não existe mais
é pior do que botão nenhum"* — e o único arquivo que renderiza o componente
(`MaterialDrawer.test.tsx:6`) mocka `useGeneralSettings` com um número **sempre válido**. Apagar a
recusa deixa os 31 casos verdes.

O que a cliente veria com `store_settings.whatsapp` vazio: um botão verde "Falar com a gente no
WhatsApp" apontando para `https://wa.me/?text=…`, justamente no material em que a spec diz que a
conversa é **obrigatória antes de enviar**. E o `GuideWhatsAppCta`, de quem a regra foi copiada,
**também não tem teste** — então a régua não existe em superfície nenhuma da loja. Falta o caso com
`whatsapp: ''` / `whatsapp: null` e a ausência asserida.

### B2 · MÉDIO — o "par" que guarda a estreiteza do WhatsApp mede o material errado (N3)

`MaterialDrawer.test.tsx:321` — *"os OUTROS materiais não oferecem WhatsApp"* — abre **`cinzas`**, que
é uma **ficha rica**. `MaterialDrawerWhatsApp` nem é alcançável nesse ramo do `MaterialDrawerBody`: o
bloco só existe dentro do ramo de **cartão**. O caso assere a ausência num caminho onde a presença é
impossível — passa igual se a régua tivesse sumido.

Medido: trocar a condição para `cartao.kind !== null` põe o botão de WhatsApp em **Dentes de leite,
Coto umbilical e Flores e pétalas**, e os 31 casos continuam verdes. O par certo é outro **cartão** —
`dente-leite`, `flores` ou `unhas` —, não uma ficha. É a asserção que passa sempre: mais barata de
escrever, e indistinguível de nenhuma.

### B3 · BAIXO-MÉDIO — a `44` acrescentou o **sétimo** escritor da URL do WhatsApp

`grep 'wa.me/'` em `apps/store/src` (fora de testes) devolve **sete** montagens da mesma URL —
`ProductInfo.tsx:71`, `ShareButtons.tsx:27`, `AboutPage.tsx:141`, `MaterialDrawerWhatsApp.tsx:28`
(**nova**), `GuideWhatsAppCta.tsx:21`, `MaterialAddress.tsx:37` e `WhatsAppFloat.tsx:67` — e a
pergunta "há WhatsApp configurado?" tem **três respostas diferentes** no disco: `digitos.length < 10`
(dois arquivos), `?.replace(/\D/g,'') || ''` sem recusa nenhuma (três arquivos) e
`whatsapp.replace(…)` sem guarda (um). É dívida **anterior** a esta feature, e por isso não é motivo
de FAIL — mas a `44` a aumentou, e a resposta do repositório para isto está escrita no `CLAUDE.md`:
quem tem dois consumidores vai para um dono único (aqui, `shared/lib` ou `packages/core`). Vale uma
entrada de backlog.

### B4 · BAIXO — a mensagem do WhatsApp pode sair sem escape (N2)

Remover `encodeURIComponent` não derruba caso nenhum. Hoje o texto é uma constante do arquivo, mas
`whatsapp_message` é **campo do painel**: um `&` ou `#` digitado pela Adri corta a mensagem no meio, e
a cliente abre o WhatsApp com meia frase. Uma asserção sobre o `?text=` do `href` resolve.

### B5 · BAIXO — o rodapé sanitiza âncora desconhecida, e ninguém prova (N4)

`escolhido?.anchor` faz o rodapé cair no guia **sem fragmento** quando o `anchor` do store não existe
na lista. Trocar por `anchor` cru produz `/como-enviar-seu-material-de-dna#material-que-nao-existe` —
a falha que o próprio arquivo de teste descreve em `:177` ("âncora quebrada NÃO dá 404: a página
abre, não rola, e ninguém descobre") — e os 31 casos passam. O caso de âncora desconhecida (`:328`)
assere só o **corpo**; falta estendê-lo ao `href` do rodapé. Hoje o estado é inalcançável (os chips
vêm da lista derivada), então é latente, não ativo.

### B6 · BAIXO — os dois consertos de acessibilidade nasceram sem guarda (N5, N6)

`aria-haspopup="dialog"` + `aria-expanded={open}` no gatilho e o `alt` descritivo da capa são
exatamente o tipo de coisa que some numa refatoração sem nada acusar: nenhum dos dois tem asserção, e
removê-los deixa 255 e 31 casos verdes, respectivamente. Não são AC — são o achado A8 da rodada 1 —,
mas conserto sem guarda tem prazo de validade.

### B7 · BAIXO — prosa que ficou mentindo, e sobra de barrel

- `ProductPageMaterialDrawer.test.tsx:151` diz *"o X chama `closeDrawer`, mas Escape e o toque no véu
  passam por `onOpenChange` → `setDrawerOpen(false)`"*. **`closeDrawer` não existe mais** (A4): o X é
  um `SheetClose`, e os três caminhos passam pelo mesmo `onOpenChange`. O caso continua válido e útil
  — são de fato dois gestos distintos —, mas a explicação descreve um store que foi apagado.
- `entities/material/index.ts:50-51` exporta `MaterialAviso` e `MaterialSendTrigger`, e **nenhum
  consumidor usa o barrel**: `ProductInfo.tsx:13` e `MaterialFicha.tsx:6` importam o caminho profundo.
  São duas exportações sem consumidor — a forma pequena do `deleteSection` — e ainda contrariam o
  "novo código deve importar do slice" do `CLAUDE.md`. Agravante herdado:
  `widgets/material-guide/index.ts` faz `export * from '@/entities/material'`, então o barrel do
  **guia** reexporta o store da gaveta e o gatilho da página do produto para o app inteiro.

## 5 · O que continua não medido

Inalterado desde a rodada 1, e é a maior parte do que esta feature entrega de visual: largura de
480px, véu de 48px alcançável pelo dedo, rolagem interna, e o critério de sucesso da própria spec —
*"a pergunta 'Qual é o seu material?' e todos os chips ficam acima da dobra em 390×844"*. **jsdom
devolve 0 para toda medida de layout.** Prova em navegador, em 390×844 e 1440, entra na fila da `32`,
`33`, `34`, `35`, `37`, `39` e `41`.

## 6 · Para fechar as ressalvas

1. **B1** — caso com `whatsapp` vazio asserindo a ausência do bloco (e o mesmo para `GuideWhatsAppCta`).
2. **B2** — trocar o par de `cinzas` por um **cartão** (`dente-leite` ou `flores`), e acrescentar um
   laço por todos os cartões que **não** são `outro`.
3. **B4** — asserir o `?text=` do `href`, com uma mensagem contendo `&`.
4. **B5** — estender o caso de âncora desconhecida ao `href` do rodapé.
5. **B6** — asserir `aria-haspopup`/`aria-expanded` e o `alt` da capa.
6. **B7** — corrigir o comentário de `:151`; decidir entre barrel e caminho profundo, e usar um só.
7. **B3** — abrir backlog para o dono único da URL do WhatsApp (sete escritores hoje).
