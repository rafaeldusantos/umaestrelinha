## 14 · [apps/store] BUG-007 — [Bloco Compre junto · Com fórmula] A faixa usa pílulas de texto no lugar das fotos

**Status:** done

`CA-09.1`, `CA-09.5` — WI-01

**Objetivo.** Na forma "Com fórmula", a faixa acima da lista fica no desenho do protótipo da loja (`cj-loja-bloco.jsx` › `formula` e `cj-loja.css` › `.formula`): cada item é a foto da peça (64×80, raio 12) com o nome em 11px abaixo, o primeiro item é a foto da própria joia com "Esta joia", "+" entre os itens, o adicional não marcado com a foto a 35% de opacidade, e a faixa sem fundo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines; `apps/store/CLAUDE.md` › Página do produto; `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 07 (a forma "Com fórmula", `FormulaStrip.tsx`) e a 12 (o desenho da linha, com `Foto` exportada de `AddonPanel.tsx`). Confira que existem.

### Critérios de aceite

### BUG-007 — [Bloco Compre junto · Com fórmula] A faixa usa pílulas de texto no lugar das fotos

O envelope completo está em `qa/issues/BUG-007.md`. Esperado, lido do protótipo (projeto Claude Design `69224d8a-17ae-4b1f-a251-a8105b41edc2`, `cj-loja.css` › `.formula`):

| Propriedade | Esperado (protótipo) | Hoje |
| ----------- | -------------------- | ---- |
| Faixa | `display:flex; align-items:center; gap:6px; overflow-x:auto; padding:2px 2px 6px`, sem barra de rolagem visível, **sem fundo** | `flex-wrap`, fundo areia (`bg-estrelinha-ground-deep`), `rounded-md`, `px-3 py-2` |
| Item (`.fx`) | coluna centrada, `gap:4px`, `flex:none`, largura 72px, sem borda e sem fundo | pílula com borda (`rounded-full border px-3`) |
| Foto do item | 64×80, raio 12px, `transition: opacity 150ms` (desligada com menos movimento) | não há foto |
| Nome do item | 11px, `ink-soft`, centrado, `line-height:1.25` | 14px, `font-semibold`, dentro da pílula |
| Item não marcado (`.fx.off`) | foto a 35% de opacidade | pílula branca |
| Item marcado | opacidade plena | pílula preenchida em `primary` |
| Primeiro item (`.fx.principal`) | foto da joia da página e "Esta joia", sem ação (`cursor:default`) | só o texto "Esta joia", em negrito |
| "+" (`.mais`) | 18px, `ink-soft`, peso 300, `flex:none` | 14px herdado |

Continuam como estão: `aria-hidden="true"` na faixa, o nome do adicional como botão com `tabIndex={-1}` que alterna a marca (CA-09.5), e a faixa acima da lista.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `FormulaStrip` (`apps/store/src/entities/product/ui/buy-together/FormulaStrip.tsx`) | JÁ EXISTE | `mainPhoto: string \| null` (novo) | o desenho da tabela acima; a foto de cada adicional é `addon.photo` pela `Foto` de `AddonPanel.tsx` (`size="h-20 w-16"`, raio 12px); a da joia é `mainPhoto` |
| `BuyTogetherBlock` (`buy-together/BuyTogetherBlock.tsx`) | JÁ EXISTE | `mainPhoto?: string \| null` (novo, opcional, padrão `null`) | repassa ao `FormulaStrip` |
| `ProductInfo` (`apps/store/src/entities/product/ui/ProductInfo.tsx`) | JÁ EXISTE | | passa `mainPhoto={purchase.variant?.image_url \|\| product.image_url \|\| null}` ao `BuyTogetherBlock` — a foto da variação escolhida, a mesma regra de `useProductPurchase`/galeria |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-007 · [Bloco Compre junto · Com fórmula] A faixa usa pílulas de texto no lugar das fotos · low
- **Fechamento**: a tarefa fecha com o fix do bug; ele segue `open` até o reteste do QA
- **Causa raiz**: `FormulaStrip.tsx:15-40` foi escrito com pílulas de texto (`rounded-full border px-3`) sobre um contêiner `bg-estrelinha-ground-deep` com `flex-wrap`, sem ler o `.formula` de `cj-loja.css`; o componente nem recebe a foto da joia (o `BuyTogetherBlock` só lhe passa `addons` e `toggle`).
- **Premissa (orquestrador, sem humano)**: a foto da joia na faixa é a da variação escolhida, com recuo para a do produto (`purchase.variant?.image_url || product.image_url`), a mesma que a galeria mostra; sem foto, a `Foto` desenha o quadro vazio na cor de fundo, como na linha. A faixa rola na horizontal dentro dela mesma (protótipo), nunca o body. Raio de alcance: o desenho da faixa na forma "Com fórmula" e uma prop nova opcional no bloco.
- **Revisão (wi-impl-review: serve)**: o nome do item em `text-[11px]` em caixa normal fica abaixo do piso de `DESIGN.md:138` (11–12px só em caixa alta); mantido pelo protótipo e pelo bug, como nos achados de convenção da tarefa 12 — a faixa é `aria-hidden` e decorativa, e a lista abaixo repete cada nome no tamanho de leitura. O recuo variação → produto do `mainPhoto` não tem teste próprio (o bloco Testes não o pede).
- **Fora desta tarefa**: as formas "Na linha" (BUG-005) e "Em folha" (BUG-006), a frase do que falta, os demais bugs.

### Testes

- página real (`apps/store/src/pages/__tests__/ProductPageBuyTogetherForma.test.tsx`), forma "Com fórmula":
  - a faixa não tem fundo nem `flex-wrap`, e tem `overflow-x-auto` (token exato, `L-034`)
  - cada adicional da faixa traz a foto (`img` com a rendição de `addon.photo`) e o nome; o primeiro item traz a foto da joia da página e "Esta joia"
  - o adicional não marcado tem a foto a 35% de opacidade, e ao marcar (pela caixa da lista) ela vai a opacidade plena; nenhum item tem `bg-estrelinha-primary` nem `rounded-full`
  - o nome do item em 11px (`text-[11px]`)
  - a transição de opacidade tem o par `motion-reduce:transition-none`
- os casos existentes da faixa (acima da lista, fora do leitor de tela, `tabindex=-1`, o nome alterna a marca) seguem verdes sem afrouxar asserção
- os guardas da loja seguem verdes (`touchTarget`, `contrast`, `accentText`, `arbitraryTextColor`, `semMaterialNaPaginaDoProduto`)

### Não faça

- Não mexa nos outros bugs da QA
- Não mude a regra de marcar/desmarcar (`toggle`) nem a lista abaixo da faixa
- Não crie um segundo componente de foto: use a `Foto` de `AddonPanel.tsx`

### Pronto quando

- [ ] a faixa da forma "Com fórmula" no desenho do protótipo (fotos, nome em 11px, "+", 35% no não marcado, sem fundo), com a foto da joia no primeiro item
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu, que reprovou antes do código
- [ ] a suíte inteira da loja (`pnpm --filter @estrelinha/store test --testTimeout=20000`) passando, exit 0 fora de pipe
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` com 0 erros e `npx eslint` nos arquivos tocados sem erro novo
---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```

