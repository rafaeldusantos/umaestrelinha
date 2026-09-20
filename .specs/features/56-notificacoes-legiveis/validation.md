# 56 — Validation

**Data**: 2026-09-20 · **Veredito**: PASS

> **Autor = verificador.** Esta feature não teve verificador independente, e isso está declarado aqui
> em vez de escondido: a `BL-012` não separou os papéis, e a prática deste repositório mostra que a
> separação é o que mais paga — a `48`, a `50` e a `55` foram **reprovadas na primeira entrega** por
> um verificador de olhos frescos. O que reduz o viés aqui, sem eliminá-lo, são duas coisas: o sensor
> de discriminação (18 mutantes reinjetados nos arquivos reais) e a prova em navegador, que é a parte
> que nenhum teste deste repositório alcança.

---

## Baseline de entrada — medida com a árvore parada

Medida em 2026-09-20, **antes de qualquer edição**, um workspace por vez, com `--testTimeout=20000` e
o código de saída capturado fora de pipe. Os cinco bateram **exatamente** a tabela do `CLAUDE.md`
(10011 em 515) — é a primeira feature em muitas em que a baseline escrita não estava envelhecida, e
o motivo é que a `55` mediu de verdade ao fechar.

| Workspace | Entrada | Saída | Δ |
| --- | --- | --- | --- |
| store | 3517/221 | 3517/221 | **0** |
| backoffice | 2947/164 | **3008/166** | +61/+2 |
| core | 2383/93 | **2395/94** | +12/+1 |
| functions | 652/14 | 652/14 | 0 — não tocado, remedido |
| catalog-import | 512/23 | 512/23 | 0 — não tocado, remedido |
| **Total** | 10011/515 | **10084/518** | **+73/+3** |

Lint em **26 erros / 6 warnings** (store 2/2 · backoffice 24/4), tipos em **0 · 0 · 0**, `pnpm build`
verde nos dois apps, e `packages/core/src/payment/**` com **zero** arquivos alterados
(`git diff --name-only -- packages/core/src/payment`).

> **A suíte da LOJA foi medida, e ficou idêntica.** É a quarta feature seguida do painel em que isso
> importa: os guardas de `apps/store/src/shared/lib/__tests__` varrem **os dois apps**, e a `51`, a
> `53` e a `55` cada uma quebrou um deles sem tocar em `apps/store`. Aqui o que estava em risco era
> `notificationSingleOwner.test.ts` — a feature acrescenta três `Record` keyed por evento, e se eles
> tivessem nascido no painel os quinze literais quebrariam aquele guarda. Nasceram em `core`.

---

## Evidência por AC

| AC | Como foi provado | Onde |
| --- | --- | --- |
| `LEG-01` | os 15 nomes existem, são únicos, cabem em 40 caracteres, **nenhum é igual ao rótulo de histórico** e nenhum está no particípio dele — com sensor que envenena um e vê a régua acusar | `catalog.test.ts` · `EventCard.test.tsx` |
| `LEG-02` | 15 descrições únicas, ≤ 90 caracteres, todas começando por "Enviado", nenhuma com exclamação; a descrição só existe com o card aberto | `catalog.test.ts` · `EventCard.test.tsx` |
| `LEG-03` | vocabulário fechado de 15 chaves, todas usadas, todas distintas, nenhuma órfã; par chave↔componente bidirecional com âncora, mais o percurso evento → chave → componente | `catalog.test.ts` · `eventIcons.test.ts` |
| `LEG-04` | guarda pré-existente da feature 42, rodado na suíte da **loja**, verde | `notificationSingleOwner.test.ts` |
| `LEG-05` | nenhum dos 5 campos no DOM recolhido **e** todos presentes aberto; os 15 nascem `aria-expanded="false"`; a montagem depois de remontar também | `EventCard.test.tsx` · `NotificationsTab.test.tsx` |
| `LEG-06` | abrir três deixa **exatamente um** aberto, e é o terceiro; clicar no aberto fecha sem abrir outro | `NotificationsTab.test.tsx` |
| `LEG-07` | editar → fechar → reabrir preserva; **e** editar → abrir OUTRO → voltar preserva (o percurso real, que uma implementação com estado por card montado não sobreviveria) | `NotificationsTab.test.tsx` |
| `LEG-08` | clicar no interruptor chama `onToggle` e **não** `onToggleExpanded`; **e** o interruptor não é descendente do botão — a asserção estrutural, porque a primeira é verdadeira também com um `stopPropagation` costurado | `EventCard.test.tsx` |
| `LEG-09` | o cabeçalho é `<button type="button">` — é a TAG que dá Enter e Espaço, e jsdom não sintetiza a ação padrão do teclado, então nenhum `keyDown` distinguiria os mundos; `aria-expanded` nos dois sentidos | `EventCard.test.tsx` |
| `LEG-10` | **reabrir** o card não traz a prévia de volta, e o botão volta a dizer "Ver prévia" — ver *o mutante que sobreviveu*, abaixo | `NotificationsTab.test.tsx` |
| `LEG-11` | recusa e aviso viram sinal com o motivo inteiro em `sr-only`; sem pendência não há sinal; **aberto os sinais somem e as formas longas aparecem** | `EventCard.test.tsx` |
| `LEG-12` | **navegador real** — ver abaixo | Chromium |
| `LEG-13` | o tom do ícone muda entre recolhido e aberto, com asserção positiva e negativa nos dois estados | `EventCard.test.tsx` |
| `LEG-14` | contador e rótulo com o **mesmo pai**, e o contador **não** irmão da `hint`; denominador de `COPY_LIMITS` | `FieldGroup.test.tsx` · `EventCard.test.tsx` |
| `LEG-15` | nem o cabeçalho nem a linha que o contém carregam `border-border` | `EventCard.test.tsx` |
| `LEG-16` | a frase **inteira** nomeia a moldura; largura, iframe, texto e selo contidos nela; carga e erro na mesma moldura; sem pedido, moldura nenhuma | `EmailPreviewFrame.test.tsx` |
| `LEG-17` | as três contagens saem de `groupedEvents()`, a soma bate 15, e o número casa com a **quantidade de cards renderizados** no grupo | `NotificationsTab.test.tsx` |
| `LEG-18` | `flex-col` e `lg:flex-row` com asserção positiva cada (`L-029`); o campo dentro da linha; e o título `hidden lg:block` com as duas metades | `NotificationsTab.test.tsx` |
| `LEG-19` | os 4 campos mostram `n/limite`, o rótulo não diz mais "caracteres", e o contador **acompanha o que é digitado** (sem esse caso, um `<span>0/60</span>` cravado passaria) | `AdminSettingsPage.test.tsx` |
| `LEG-20` | `w-full`, `sm:w-auto` e `h-11` **por token exato** (`L-034`), nos botões das três seções reais | `AdminSettingsPage.test.tsx` |
| `LEG-21` | cabeçalho `min-h-11` por token exato, prévia `h-11`, remover observação `h-11`, salvar `h-11`, switch com a área estendida | `EventCard.test.tsx` · `EmailPreviewFrame.test.tsx` · `FieldGroup.test.tsx` |

---

## Sensor de discriminação — 18 mutantes, 18 mortos

Cada mutante foi **reinjetado no arquivo real**, a suíte alvo rodou, e o arquivo foi restaurado com
comparação byte a byte. O arnês **lança** quando a string alvo não é encontrada — mutação que vira
no-op em silêncio não prova nada (a lição do `mutar()` da feature 52, onde dois sensores já tinham
virado no-op por perderem o alvo do `.replace()`).

**Rodada 1: 16 mortos, 1 sobrevivente, 1 morto pelo motivo errado.**

### O mutante que SOBREVIVEU, e por quê

**`LEG-10`: apagar `setPreview(null)` de `alternarCard` deixou a suíte inteira verde.**

A assinatura de sempre — **a asserção verdadeira nos dois mundos**. A régua que existia media a
prévia *dentro do card já recolhido*:

```
expect(within(cardA).queryByTestId('email-preview-iframe')).toBeNull()
```

…e lá o iframe está ausente **de qualquer jeito**, porque o corpo inteiro sai do DOM por `LEG-05`. A
asserção de `LEG-10` estava subsumida pela de `LEG-05` e não media nada próprio.

A consequência real do mutante só aparece na **volta**: o card reabre mostrando a prévia de um texto
que pode ter mudado desde então, com o botão dizendo "Fechar prévia" — a Adri lendo um e-mail que a
loja já não manda. O caso novo abre A, pede a prévia, abre B, **volta para A**, e cobra as duas
coisas: nenhum iframe, e o botão de volta em "Ver prévia" (que lê `previewActive`, o estado que o
mutante deixava vivo). Reinjetado: **morre por asserção**.

### O mutante que morreu pelo MOTIVO ERRADO

O primeiro mutante de `LEG-16` ("os controles de largura saem da moldura") foi escrito com um
fragmento JSX sem fechar. Ele derrubou a suíte — **por erro de compilação**, não porque alguma régua
o tenha pego. Um mutante assim prova que o compilador funciona, e nada mais.

Refeito como mutação **sintaticamente válida** (o miolo vira irmão da moldura em vez de filho) e
reinjetado: morre por asserção, com `moldura.contains(...)` reprovando. A rodada 2 imprime, para cada
mutante, se a morte foi por asserção ou por compilação — a distinção que a rodada 1 não fazia.

**Rodada 2: 2 mutantes, 2 mortos, os dois por asserção.**

Os outros 16, todos mortos na rodada 1: o corpo do card deixando de depender de `expanded`; o sinal
de recusa sumindo do card recolhido; o interruptor virando filho do botão; o ícone deixando de mudar
de tom; o cabeçalho perdendo o piso de 44px; o contador voltando para baixo do campo; vários cards
abertos ao mesmo tempo; a contagem do grupo virando literal; o título voltando a aparecer no celular;
a barra perdendo a frase que nomeia a prévia; o botão de salvar perdendo a largura cheia; o rótulo
voltando a carregar o teto; **o nome do evento virando cópia do rótulo de histórico**; uma chave de
ícone perdendo o componente; e uma segunda escrita do contador à mão.

---

## O que só o navegador provou

Chromium, banco local, sessão real do painel. jsdom devolve 0 para toda medida de layout, então nada
disto é alcançável por teste de componente.

### `LEG-12` — a medida que motivou a feature

| Viewport | Antes | Depois | Teto da AC |
| --- | --- | --- | --- |
| 1440×1000 | **13.292px** | **1.693px** | 2.500px |
| 390×844 | **13.592px** | **1.833px** | 2.500px |

Medidas por `document.documentElement.scrollHeight`, com os 15 cards recolhidos.

### As demais medidas

| O quê | Medido |
| --- | --- |
| Rolagem horizontal do corpo | **nenhuma** nos dois viewports (`body.scrollWidth` = `window.innerWidth`) |
| Altura do card recolhido | 74px |
| Alvo de toque do cabeçalho | **44px** exatos |
| Interruptor | 44×24 visual, com o pseudo `before:` de −10px/−10px → **44px clicável** |
| Card aberto em 390 | 342px de largura, sem estouro interno; os 5 campos entre 260 e 312px |
| `<iframe>` de 390px dentro do card de 342 | rola **dentro do próprio container** (`overflow-x-auto`), e o corpo da página não |
| Barra da moldura | 38px e uma linha em 1440; o selo desce de linha em 390 e o título fica inteiro |

### Dois defeitos que só o navegador achou — e os dois foram corrigidos

1. **O título "Notificações" aparecia DUAS VEZES no celular.** O cabeçalho de voltar da
   `AdminSettingsPage` (`PageHeader` com `backTo`) já nomeia a seção e a descreve; o título da aba
   imprimia o mesmo nome logo abaixo, com outra descrição, antes do primeiro evento. **A duplicação
   é anterior a esta feature** — `NotificationsSection` já fazia isso —, e ela não aparecia nas
   outras três seções porque lá os títulos vêm do `FormCard` ("Geral", "SEO", "Frete", "Material") e
   são diferentes do nome da seção. Corrigido com `hidden lg:block`, a mesma alternância que o resto
   da tela usa. Custo medido: **−84px** acima da dobra em 390.
2. **O rótulo da moldura da prévia quebrava em três linhas em 390**, partindo no hífen de "e-mail",
   porque o selo "Prévia de exemplo" espremia a frase. Corrigido com `flex-wrap` + piso de largura no
   título: quem desce de linha passa a ser o selo, que é o elemento curto e opcional.

### Uma prova de infraestrutura, e um achado junto

`catalog.ts` entra no barrel que a edge function `send-notification` importa por caminho relativo — o
Deno resolve o grafo inteiro, **inclusive o de tipos**. A prova de que ele é alcançável foi feita
contra o runtime de verdade.

**E ela revelou um achado**: o container do edge runtime local **não enxerga arquivo novo** em
`packages/core`. Ele respondia `503` com `worker boot error: Module not found ".../catalog.ts"` —
para um arquivo que existe no disco. É bind-mount obsoleto, o **mesmo sintoma** que a feature 53
registrou. Depois de `supabase stop` (sem `--all`) + `supabase start`, a mesma requisição passou a
responder **401** — ou seja, o worker inicializa e o grafo resolve; o 401 é só a falta do header de
auth no `curl`. Pela tela do painel, com sessão real, a prévia renderiza o e-mail completo.

**Isto é local, não produção**: `supabase functions deploy` empacota os arquivos na hora. Mas custa
uma sessão de depuração a quem não souber, e agora está no `CLAUDE.md`.

---

## O que NÃO foi provado

- **Nenhum teste alcança `prefers-reduced-motion` ligado.** Os quatro arquivos desta feature entraram
  no escopo literal de `animacaoRespeitaMovimento.test.ts` (9 → 13 arquivos, âncoras 14/7 → 38/18),
  que prova que **existe o par** `motion-reduce:` na mesma linha. Que o navegador de fato congele o
  movimento com a preferência ligada continua sem prova — é a mesma dívida que a `50` registrou.
- **Leitor de tela.** `LEG-11` põe o motivo da recusa no nome acessível do botão por `sr-only`, e
  isso está provado por `toHaveTextContent`. Como um leitor real anuncia um cabeçalho de acordeão com
  um nome longo não foi verificado.
- **Um segundo par de olhos.** Ver o aviso no topo.
