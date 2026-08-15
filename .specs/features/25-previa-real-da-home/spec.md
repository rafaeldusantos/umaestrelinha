# 25 · Prévia real da Home

**Escopo**: Large — dois apps, um contrato novo entre eles, remoção de um componente inteiro.
**Design aprovado**: Paper, página `24 · Home gerenciável`, artboards `25 · …` (Mobile, Editor do
hero, Computador, 390px).

---

## O problema

A feature `24` matou a **segunda escrita da derivação** (`pickHomeCollections` e companhia saíram de
`apps/store` para `@estrelinha/core/home/derive.ts`, T35) e deixou viva a **segunda escrita do
desenho**:

| desenho | onde | linhas |
| --- | --- | ---: |
| o que a cliente vê | `apps/store/src/widgets/home-renderer/**` | 130 |
| o que o painel promete que ela vê | `apps/backoffice/src/features/home-composition/ui/HomePreview.tsx` | 277 |

São duas respostas para a mesma pergunta, mantidas à mão, em apps que não se importam. Toda seção
nova precisa ser desenhada duas vezes, e a divergência **não quebra nada**: build, `tsc` e teste de
componente passam com o painel prometendo um arranjo que a loja não renderiza. É a classe de defeito
que o `CLAUDE.md` descreve em "dois donos do mesmo dado".

Dois sintomas medidos, além disso:

1. **A prévia tem 380px de 1440.** Nenhuma representação de desktop cabe ali; a atual nem tenta.
2. **Não há alternador de dispositivo.** ~90% da loja é celular e o painel não mostra o celular.

## A solução

A prévia passa a ser **a própria loja**, num `<iframe>`, em modo prévia, alimentada por
`postMessage` com o rascunho ainda não salvo. O painel deixa de desenhar seção da Home.

Consequências que valem por si:

- **Impossível divergir por construção.** O que a prévia mostra é o que a loja renderiza, com os
  mesmos componentes, os mesmos tokens e as mesmas media queries.
- **O alternador vira real**: quem responde à largura é a loja, não um segundo layout desenhado.
- **A separação de tokens fica intacta.** Renderizar widget da loja dentro do painel traria
  `--estrelinha-*` para o documento de `--estrelinha-admin-*` — o defeito que `importOrder.test.ts` e
  `palette.test.ts` existem para pegar. Um iframe é outro documento.

---

## Requisitos

### P1 — Modo prévia na loja

**PRV-01** · A loja SHALL entrar em modo prévia quando `?preview=1` estiver na URL **e** a janela
estiver dentro de um iframe (`window.parent !== window`). Fora de iframe o parâmetro SHALL ser
ignorado e a Home SHALL ser a normal.

*AC 1*: `/` com `?preview=1` fora de iframe renderiza a composição do banco, sem ponte.
*AC 2*: `/` com `?preview=1` dentro de iframe não lê `home_sections` do banco.
*AC 3*: `/` sem o parâmetro, dentro de iframe, renderiza a composição do banco.

**PRV-02** · Em modo prévia a composição SHALL vir exclusivamente do `postMessage` do pai. A leitura
de `home_sections` SHALL ficar desligada (`enabled: false`), não filtrada depois.

*AC 1*: nenhuma consulta a `home_sections` é disparada em modo prévia.
*AC 2*: a Home desenhada é a das seções recebidas na mensagem, na ordem recebida.

**PRV-03** · O aperto de mão SHALL ser: a loja posta `{ source: 'estrelinha-home-preview', type:
'ready' }` ao pai assim que monta; o pai responde com `{ …, type: 'draft', sections }`; toda mudança
do rascunho reposta `draft`.

*AC 1*: a loja posta `ready` uma vez ao montar em modo prévia.
*AC 2*: recebido `draft`, a Home é redesenhada sem recarregar o documento.
*AC 3*: antes do primeiro `draft` a loja não desenha seção nenhuma e **não** cai em
`DEFAULT_HOME_COMPOSITION` — o piso existe para erro de leitura, e em modo prévia não há leitura.

**PRV-04** · A loja em modo prévia SHALL aceitar `draft` e `highlight` **somente** de
`window.parent`, e SHALL ignorar mensagem de qualquer outra janela ou sem o campo `source`.

*AC 1*: mensagem com `source` errado é ignorada.
*AC 2*: mensagem cujo `event.source` não é `window.parent` é ignorada.

**PRV-05** · Em modo prévia a loja SHALL interceptar cliques em links e botões: nada navega, e a
seção clicada SHALL ser devolvida ao pai como `{ type: 'select', sectionId }`. O rastreador de
carrinho abandonado NÃO SHALL ser montado.

*AC 1*: clicar num card de produto dentro da prévia não muda a rota da loja.
*AC 2*: o clique devolve ao pai o id da seção que contém o elemento clicado.
*AC 3*: `AbandonedCartTracker` não é montado em modo prévia.

**PRV-06** · Em modo prévia a loja SHALL contornar a seção indicada pela última mensagem
`{ type: 'highlight', sectionId }`, com etiqueta do nome da seção; `sectionId: null` remove o
contorno.

*AC 1*: recebido `highlight` com um id, o bloco correspondente ganha contorno e etiqueta.
*AC 2*: recebido `highlight` com `null`, nenhum bloco fica contornado.

### P2 — A ponte, no painel

**PRV-07** · O painel SHALL postar o rascunho com `targetOrigin` igual à origem exata da loja
(derivada de `VITE_STORE_URL`), **nunca** `'*'`.

*AC 1*: a chamada de `postMessage` recebe a origem da loja como segundo argumento.

**PRV-08** · O painel SHALL agir apenas em mensagens cuja `event.origin` seja a origem da loja **e**
cujo `event.source` seja a janela do próprio iframe.

*AC 1*: mensagem de outra origem não abre editor nenhum.
*AC 2*: mensagem de outra janela, mesmo com a origem certa, é ignorada.

**PRV-09** · O rascunho postado SHALL ser as seções do banco **com as edições não salvas do editor
aberto aplicadas por cima**, e SHALL ser reenviado com debounce de 200 ms. O iframe NÃO SHALL
recarregar entre um envio e outro.

*AC 1*: digitar no título do hero muda o título na prévia sem recarregar o iframe.
*AC 2*: envios em rajada dentro de 200 ms produzem um `postMessage` só.
*AC 3*: sem editor aberto, o rascunho é igual ao que veio do banco.

**PRV-10** · Recebido `select`, o painel SHALL navegar para `/admin/home/:sectionId`.

*AC 1*: clique na prévia abre o editor daquela seção.

**PRV-11** · O painel SHALL postar `highlight` com o id da seção sob o cursor na lista, e com o id da
seção em edição enquanto o editor estiver aberto. Sem nenhum dos dois, `null`.

*AC 1*: o mouse sobre uma linha posta o id daquela seção.
*AC 2*: sair da linha posta `null`.
*AC 3*: com o editor aberto, o id da seção em edição é postado.

### P3 — Layout e alternador

**PRV-12** · Em `lg+` o corpo de `/admin/home` SHALL ser **rail de 380px à esquerda** e palco da
prévia ocupando o resto — a inversão exata das larguras de hoje (lista 748 / prévia 380).

*AC 1*: a coluna da lista mede 380px e vem primeiro na ordem do DOM.
*AC 2*: o palco ocupa a largura restante.

**PRV-13** · O palco NÃO SHALL remontar ao entrar ou sair do editor de seção — a mesma garantia que a
`24` já dá, agora medida sobre o `<iframe>`.

*AC 1*: o nó do `<iframe>` é o **mesmo** antes e depois de abrir o editor (identidade de nó).

**PRV-14** · O alternador SHALL ter dois estados — **Celular 390 × 844** e **Computador
1024 × 768** — e SHALL abrir em Celular.

*AC 1*: ao montar, o estado ativo é Celular e o iframe mede 390 × 844.
*AC 2*: em Computador o iframe mede 1024 × 768 em atributos, e é reduzido por `transform: scale`
para caber na largura disponível.
*AC 3*: trocar de dispositivo **não** recarrega o iframe.

**PRV-15** · A barra do palco SHALL mostrar `<largura> × <altura> · <escala>%`, um botão de recarregar
a prévia e um de abrir a loja em nova aba.

*AC 1*: em Celular a barra diz `390 × 844 · 100%`.
*AC 2*: a escala exibida é a mesma aplicada no `transform`, arredondada ao inteiro.

**PRV-16** · Abaixo de `lg` as abas `Seções` / `Prévia` SHALL continuar existindo, com o alternador
dentro da aba Prévia.

*AC 1*: em viewport estreita as duas abas aparecem e só uma coluna é visível por vez.

### P4 — Substituição e estados

**PRV-17** · Sem `VITE_STORE_URL` configurada, o palco SHALL mostrar estado vazio **declarado**, com o
passo exato de configuração, e a lista e o editor SHALL continuar funcionando.

*AC 1*: sem a env, nenhum `<iframe>` é montado.
*AC 2*: o texto do estado vazio nomeia a variável e o arquivo onde ela vai.

**PRV-18** · `HomePreview.tsx`, seu export no barrel e `HomePreview.test.tsx` SHALL ser removidos.
Nenhum arquivo de `apps/backoffice` SHALL desenhar seção da Home depois desta feature.

*AC 1*: os dois arquivos não existem.
*AC 2*: uma varredura do fonte de `features/home-composition` não encontra renderização de tipo de
seção (o `switch (section.type)` do desenho).

---

## Fora de escopo

| item | por quê |
| --- | --- |
| `product_carousel` e `category_grid` | continuam sem renderer na loja (pendência declarada da `24`); a prévia real herda a ausência sem inventá-la |
| Prévia de outras páginas (produto, categoria) | esta feature é a Home |
| Arrastar seção **dentro** da prévia | reordenar segue no rail; arrastar no iframe exigiria um segundo alvo de solta cross-document |
| Ampliar a prévia em tela cheia | o botão de abrir em nova aba já entrega 100%; overlay é trabalho próprio |
| Re-skin do painel | `C-05` |

## Contabilidade de testes — declarada, não silenciosa

`HomePreview.test.tsx` tem **14 testes** e vai embora com o componente. O `CLAUDE.md` diz que queda de
contagem só é aceitável quando o mesmo número reaparece do outro lado — aqui **não reaparece**, e o
motivo é que a asserção deixou de fazer sentido: "a prévia mostra a ordem e os textos reais" passa a
ser verdadeira **por construção**, e quem já a mede é `homeComposition.test.tsx` na loja.

O que entra no lugar cobre coisa diferente: a ponte (`preview.ts` em `core`), o modo prévia da loja,
a ponte do painel, o alternador, o estado vazio e a não-remontagem. **A meta é ≥ 14 testes novos**, e
o número final vai no fecho.
