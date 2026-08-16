# Detalhe do Produto — descrição, Pix e variação com foto

**Feature 27** · escopo **Large** · loja (`apps/store`) + `@estrelinha/core`

## Problem Statement

A página do produto é a tela onde a cliente decide comprar, e hoje ela erra em três pontos ao mesmo
tempo. **A descrição sai quebrada na tela**: as 679 descrições do catálogo são HTML (medido no banco
local — 100% delas), e `ProductInfo` as imprime como texto puro, então a cliente lê literalmente
`<h2>Anel Afetivo Cora&ccedil;&otilde;es...` no lugar do texto. **O preço com Pix não existe aqui**:
a vitrine mostra "R$ 275,41 com Pix" em cada card, a página do produto — onde a decisão acontece —
não mostra, e a cliente perde de vista o desconto justamente no momento de comprar. **A variação é um
nome**: 540 dos 686 eixos do catálogo têm foto por valor, e mesmo assim a escolha sai como pílula de
texto, onde "Aço Inoxidável Folheado a Ouro Rose" é uma string de 37 caracteres que não diz que
aparência a peça terá.

Os três são defeitos de superfície com dado já pronto no banco: `products.description`,
`store_settings.pix_discount_percent` e `product_variants.image_url` (3.052 de 3.245 preenchidas).

## Goals

- [ ] A descrição completa é lida como texto formatado, na seção "Detalhes do Produto", e nenhuma
      entidade ou tag aparece crua na tela — verificável nos 679 produtos com descrição.
- [ ] O preço com desconto Pix aparece abaixo do preço na página do produto, e a fórmula passa a ter
      **um dono** em `@estrelinha/core/payment` — a segunda escrita, hoje inline no `ProductCard`,
      deixa de existir.
- [ ] O eixo de variação com fotos distintas é escolhido por **foto**; o eixo sem elas continua em
      pílula com o nome. A regra é pura e medida, não uma lista de nomes de eixo em código.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Pix na barra fixa de compra do mobile (`widgets/product-buy-bar`) | A barra empilha "de" riscado + preço num `shrink-0` ao lado do CTA, dentro de `BOTTOM_BAR_H` — constante compartilhada de que `ownsBottomBar` e a reserva de espaço do `StoreLayout` dependem. Uma terceira linha muda a altura da barra e move a régua de duas outras regras. O preço com Pix fica na coluna, que rola. |
| Foto de variação no card/sheet (`QuickAddDrawer`, `VariantSheet`) | O card já tem a placa de cor (`ColorPreview`, feature 26) e o sheet é painel estreito de decisão rápida. Esta feature é a **página**; mudar as três superfícies de uma vez mistura duas revisões de UI diferentes. |
| Campo de resumo/descrição curta no cadastro | Não existe coluna, e criar uma é decisão de cadastro (backoffice + importador), não de render. Decidido com o usuário: move-se a descrição inteira. |
| Sanitização no backoffice / na gravação | A sanitização é de **render**. Sanitizar na escrita destruiria o HTML original do importador de forma irreversível, e o `RichTextEditor` já controla o que a dona produz. |
| Reescrever o `<h2>` que a descrição repete do nome do produto | É dado da origem (Nuvemshop), em 1.358 ocorrências. O render **rebaixa o nível** do título (PDP-05); reescrever o texto é curadoria da dona. |
| `dangerouslySetInnerHTML` em qualquer outra tela | Só a descrição do produto na página do produto. Busca, card e admin seguem lendo o campo como hoje. |

---

## Assumptions & Open Questions

| Assumption / decisão | Escolha | Racional | Confirmado? |
| --- | --- | --- | --- |
| Como sanitizar o HTML | Allowlist puro em `@estrelinha/core`, sem dependência nova | Dado medido não usa **nenhum** atributo e só 7 tags; a cultura do projeto é regra pura com dono único e teste que lê a regra do disco. `DOMParser` em `text/html` não executa script nem carrega recurso. | **sim** (usuário) |
| Onde a descrição vai parar | Inteira no acordeão, seção "Detalhes do Produto", sem resumo no topo | Mediana de 2.271 caracteres com `h2`/`h3`/`ul` não cabe entre o preço e o seletor; derivar um resumo do próprio HTML faria o mesmo texto aparecer duas vezes na página. | **sim** (usuário) |
| Como o nome do valor aparece com foto | No cabeçalho do eixo (`Cor: Aço Inoxidável Folheado a Ouro Rose`) | Rótulo tem mediana 15 e **máximo 40** caracteres; sob uma vaga de 44–56px em 390px de viewport ele vira 3–4 linhas por vaga. | **sim** (usuário) |
| Nível de título dentro do acordeão | `h4` | `AccordionPrimitive.Header` do Radix renderiza `<h3>`; um `h2`/`h3` no conteúdo ficaria acima ou empatado com o próprio gatilho da seção. | não (derivado do código) |
| Tag fora da allowlist | **Desembrulha** (mantém o texto), exceto `script`/`style`/`iframe`/`object`/`embed`/`noscript`/`template`, que somem **com o conteúdo** | Desembrulhar um `<div>` preserva o texto que a dona escreveu; desembrulhar um `<script>` imprimiria o código como texto na tela. | não |
| `pix_discount_percent` fora de 0–100 | `pixPrice` devolve `null` | 100% zeraria o preço na tela e >100% o deixaria negativo. Nenhum dos dois é "desconto"; ausência é o único desfecho seguro. | não |
| Eixo com fotos **iguais** entre valores | Continua em pílula | É a razão já escrita no `COR-02`: N vagas com a mesma foto dizem à cliente que a escolha não muda a peça. Medido: `Com gravação` (36 produtos), `Com Base` (20), `Letra` (11) e 29 dos 32 `Tamanho` caem aqui. | não |
| Eixo com foto em alguns valores só | Vira foto se **≥2 valores** têm foto e as fotos presentes são distintas; o valor sem foto fica como vaga vazia | Mesma tolerância que a placa do card já pratica (`COR-15`). Atinge 7 eixos a mais que a regra estrita (540 × 533 de 686) — a diferença é pequena, e divergir do card seria a única inconsistência. | não |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## Dimensões implícitas (varredura obrigatória — escopo Large)

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | **PDP-03/04/05** (allowlist de tag, atributo e protocolo), **PDP-09** (limites de `pix_discount_percent` e de `amount`), **PDP-06** (descrição vazia / que sobra vazia depois da limpeza) |
| Falha / falha parcial | **PDP-06** (HTML que a limpeza esvazia por completo se comporta como ausente), **PDP-17** (valor sem foto) |
| Idempotência / repetição / duplicata | **N/A** — superfície de leitura; nenhuma escrita, nenhuma chamada mutante |
| Fronteira de auth / rate limit | **N/A** — página pública; nenhum dado privilegiado entra e o sanitizador é render no cliente |
| Concorrência / ordenação | **N/A** — sem estado compartilhado novo; a escolha de variação continua com dono único (`useProductPurchase`), garantido por **PDP-19** |
| Ciclo de vida do dado / expiração | **N/A** — nenhuma coluna nova; tudo lê `products.description`, `store_settings` e `product_variants.image_url` |
| Observabilidade | **N/A** — a loja não tem camada de log/métrica, e a mudança é de render |
| Falha de dependência externa | **PDP-17** — foto de variação inalcançável (Storage fora) desenha a vaga vazia, nunca o ícone de imagem quebrada |
| Integridade de transição de estado | **PDP-18** (indisponível aparece desabilitado, nunca escondido — `PST-08`), **PDP-19** (escolher pela foto percorre o mesmo `onChange` → galeria) |

---

## User Stories

### P1: A descrição se lê como texto ⭐ MVP

**User Story**: Como cliente decidindo sobre uma joia memorial, quero ler a descrição completa
formatada, para entender o que a peça é sem tropeçar em código.

**Why P1**: É defeito visível em produção hoje, em 679 de 680 produtos.

**Acceptance Criteria**:

1. WHEN a página do produto renderiza THEN `ProductInfo` SHALL NOT renderizar `product.description`
   em nenhum ponto da coluna de informação.
2. WHEN o produto tem descrição THEN o `ProductDetailsAccordion` SHALL renderizar essa descrição como
   HTML sanitizado dentro da seção `Detalhes do Produto`, **acima** dos bullets de `productSpecs`, e
   essa seção SHALL ser a aberta por padrão.
3. WHEN a descrição contém a entidade `&ccedil;` THEN a tela SHALL exibir o caractere `ç`, e nunca a
   sequência literal `&ccedil;`.
4. WHEN a descrição contém uma tag fora da allowlist (`p`, `br`, `strong`, `em`, `b`, `i`, `ul`, `ol`,
   `li`, `h4`, `h5`, `a`) THEN o sanitizador SHALL remover a tag e **preservar o texto** dela.
5. WHEN a descrição contém `script`, `style`, `iframe`, `object`, `embed`, `noscript` ou `template`
   THEN o sanitizador SHALL remover o elemento **junto com todo o conteúdo**.
6. WHEN qualquer elemento traz atributo THEN o sanitizador SHALL removê-lo, exceto `href` em `<a>`.
7. WHEN um `<a href>` aponta para `javascript:`, `data:` ou qualquer protocolo fora de
   `http:`/`https:`/`mailto:`/caminho relativo THEN o sanitizador SHALL remover o atributo `href`.
8. WHEN um `<a>` sobrevive com `href` THEN o sanitizador SHALL acrescentar `rel="noopener noreferrer"`.
9. WHEN a descrição traz `h1`, `h2` ou `h3` THEN o sanitizador SHALL emiti-los como `h4`.
10. WHEN a descrição é vazia, só espaço, ou fica vazia depois da limpeza THEN a seção
    `Detalhes do Produto` SHALL renderizar só os bullets de medida; e WHEN também não há medida THEN a
    seção inteira SHALL NOT ser montada e a aberta por padrão SHALL ser `Cuidados e Conservação`.

**Independent Test**: abrir `/produtos/<slug>` de um produto com descrição e ver o texto formatado no
acordeão, sem tag nem entidade na tela; abrir um produto sem descrição e sem medida e ver a seção
ausente com "Cuidados" aberta.

---

### P1: O desconto do Pix aparece onde se decide ⭐ MVP

**User Story**: Como cliente na página do produto, quero ver quanto a peça custa no Pix, para decidir
com o valor real e não descobrir o desconto só no caixa.

**Why P1**: A vitrine já promete o número; a página que converte, não. E a fórmula está escrita duas
vezes, o que é o "defeito 01" do projeto (dois donos do mesmo dado).

**Acceptance Criteria**:

1. WHEN `pix_enabled` é verdadeiro e `pix_discount_percent > 0` THEN a coluna de informação SHALL
   exibir o preço com Pix **entre** o preço cheio e a linha de parcelas, com o `PixIcon`.
2. WHEN `pix_enabled` é falso OU `pix_discount_percent <= 0` THEN nada de Pix SHALL ser exibido.
3. WHEN o produto tem grade e a cliente troca de variação THEN o preço com Pix SHALL ser recalculado a
   partir de `purchase.price` (o preço da variação escolhida), nunca de `product.price`.
4. WHEN `pixPrice(amount, percent)` é chamado THEN SHALL devolver
   `round2(amount - round2(amount * percent / 100))`, e `null` quando `amount <= 0`, `percent <= 0`
   ou `percent >= 100`.
5. WHEN o `ProductCard` calcula o preço com Pix THEN SHALL chamar `pixPrice` de
   `@estrelinha/core/payment/pix`, e o valor exibido SHALL ser **igual ao total que
   `resolveOrderPricing` cobra** por uma unidade daquele preço, sem cupom e sem frete, no método
   `pix`.

> **Emenda (fase Design).** A AC 4 dizia `round2(amount * (1 - percent/100))` e a AC 5 dizia "valor
> idêntico ao de hoje". As duas estavam erradas: essa é a fórmula **do card**, e ela **não é** a do
> caixa. `pricing.ts` cobra `subtotal − round2(subtotal × pct/100)`. Com o `pix_discount_percent = 5`
> de hoje, **81 dos 259 preços distintos do catálogo (31%) divergem em 1 centavo** — o card promete
> R$ 7,51 onde o caixa cobra R$ 7,50. Manter "idêntico ao de hoje" seria congelar a divergência.
> A consequência é declarada: **o valor exibido no card muda** em 31% dos preços, 1 centavo para
> baixo. Ver `design.md`, seção "Achado que muda uma AC da spec".

**Independent Test**: com `pix_discount_percent = 5`, abrir um produto de R$ 289,90 e ver
"R$ 275,41 com Pix" abaixo do preço; zerar a setting e ver a linha sumir do card **e** da página.

---

### P1: A variação se escolhe pela foto ⭐ MVP

**User Story**: Como cliente escolhendo entre elos, cores ou modelos, quero ver a peça de cada opção,
para escolher pela aparência em vez de adivinhar por um nome de 37 caracteres.

**Why P1**: 540 dos 686 eixos do catálogo têm foto distinta por valor, e nenhuma delas chega à tela
onde a escolha acontece.

**Acceptance Criteria**:

1. WHEN um eixo tem **≥2 valores com foto** e as fotos presentes são **todas distintas entre si**
   THEN o `VariantPicker` em `surface="page"` SHALL renderizar esse eixo como fotos.
2. WHEN um eixo não satisfaz a condição acima THEN SHALL continuar em pílula com o nome do valor,
   exatamente como hoje.
3. WHEN um eixo é renderizado como fotos THEN o cabeçalho SHALL exibir `<nome do eixo>: <valor
   escolhido>`; e WHEN nenhum valor está escolhido THEN SHALL exibir só o nome do eixo.
4. WHEN uma vaga de foto é renderizada THEN SHALL ser um `role="radio"` com `aria-label` igual ao
   valor e `aria-checked` refletindo a escolha.
5. WHEN um valor do eixo não tem foto THEN a vaga SHALL ser desenhada vazia
   (`bg-estrelinha-ground-deep`, sem `<img>`) e SHALL NOT usar a foto de outro valor nem a capa do
   produto.
6. WHEN um valor está indisponível na combinação atual THEN a vaga SHALL aparecer desabilitada e
   visível — nunca escondida (`PST-08`).
7. WHEN a cliente aciona uma vaga THEN SHALL chamar o mesmo `onChange` de hoje, e a galeria SHALL
   trocar para a foto da variação pelo caminho já existente (`useProductPurchase` → `onVariantImage`).
8. WHEN a vaga é renderizada THEN SHALL ter alvo de toque de no mínimo 44×44 — satisfeito pela
   própria caixa pintada de **56×56**, e não por `TAP_44` (o auxiliar existe para caixa *menor* que
   44; a varredura de `touchTarget.test.ts` só o cobra de `h-8`/`h-9`/`h-10`/`38px`).
9. WHEN o eixo escolhido é renderizado THEN a vaga escolhida SHALL ser marcada por
   `border-2 border-estrelinha-ink` e SHALL ocupar a mesma caixa da não escolhida, para a fileira não
   se deslocar a cada clique.

**Independent Test**: abrir um produto com eixo `Tipos de elo` e ver as fotos dos elos; abrir um com
`Com gravação` e ver que continua em pílula `Sim`/`Não`.

---

### P2: A política de trocas para de cravar 5%

**User Story**: Como dona da loja, quero que a página de políticas leia o percentual do Pix das
configurações, para não prometer um número que eu já mudei no painel.

**Why P2**: Não é a página do produto, mas é a mesma mentira de número que esta feature existe para
apagar — e é uma linha.

**Acceptance Criteria**:

1. WHEN `PoliciesPage` renderiza THEN o percentual do Pix SHALL vir de `pix_discount_percent`, e não
   do literal `5`.
2. WHEN `pix_enabled` é falso OU `pix_discount_percent <= 0` THEN a menção ao desconto no Pix SHALL
   NOT ser exibida.

**Independent Test**: mudar `pix_discount_percent` para 7 e ver a página de políticas acompanhar.

---

## Edge Cases

- WHEN a descrição é HTML malformado (tag não fechada) THEN o sanitizador SHALL devolver o que o
  `DOMParser` conseguiu montar, sem lançar exceção e sem quebrar a página.
- WHEN a descrição tem 3.225 caracteres (o máximo medido) THEN a seção SHALL rolar dentro do acordeão
  sem produzir scroll horizontal no `body` em 390px.
- WHEN a descrição contém `<a href="javascript:alert(1)">` THEN o link SHALL aparecer como texto sem
  `href`.
- WHEN um eixo tem 2 valores e só 1 tem foto THEN o eixo SHALL cair em pílula (a regra exige ≥2 fotos).
- WHEN todos os valores de um eixo apontam para a MESMA URL de foto THEN o eixo SHALL cair em pílula.
- WHEN um eixo com fotos tem 8 valores THEN as vagas SHALL quebrar linha (`flex-wrap`) sem estourar a
  largura da coluna em 390px.
- WHEN `product.description` é `null` THEN nada SHALL quebrar (o mapper já normaliza para `''`).
- WHEN a URL da foto responde 404 THEN a vaga SHALL manter a caixa desenhada, sem deslocar a fileira.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| PDP-01 | P1 Descrição — sai de `ProductInfo` | Design | Pending |
| PDP-02 | P1 Descrição — entra no acordeão, acima dos specs, seção aberta | Design | Pending |
| PDP-03 | P1 Descrição — entidades viram caractere | Design | Pending |
| PDP-04 | P1 Descrição — allowlist de tags (desembrulha o resto) | Design | Pending |
| PDP-05 | P1 Descrição — `script`/`style`/`iframe`/… somem com o conteúdo | Design | Pending |
| PDP-06 | P1 Descrição — atributos removidos, exceto `href` em `<a>` | Design | Pending |
| PDP-07 | P1 Descrição — protocolo de `href` restrito | Design | Pending |
| PDP-08 | P1 Descrição — `rel="noopener noreferrer"` em `<a>` sobrevivente | Design | Pending |
| PDP-09 | P1 Descrição — `h1`/`h2`/`h3` → `h4` | Design | Pending |
| PDP-10 | P1 Descrição — vazia / esvaziada pela limpeza / sem specs | Design | Pending |
| PDP-11 | P1 Pix — linha entre preço e parcelas, com `PixIcon` | Design | Pending |
| PDP-12 | P1 Pix — ausente com `pix_enabled` falso ou percentual ≤ 0 | Design | Pending |
| PDP-13 | P1 Pix — segue o preço da variação escolhida | Design | Pending |
| PDP-14 | P1 Pix — `pixPrice` puro em `@estrelinha/core/payment`, com limites | Design | Pending |
| PDP-15 | P1 Pix — `ProductCard` passa a consumir o helper; valor inalterado | Design | Pending |
| PDP-16 | P1 Variação — regra "≥2 fotos e todas distintas" decide foto × pílula | Design | Pending |
| PDP-17 | P1 Variação — eixo rejeitado continua em pílula | Design | Pending |
| PDP-18 | P1 Variação — cabeçalho `Eixo: valor escolhido` | Design | Pending |
| PDP-19 | P1 Variação — `role="radio"` + `aria-label` + `aria-checked` | Design | Pending |
| PDP-20 | P1 Variação — valor sem foto vira vaga vazia, nunca foto alheia | Design | Pending |
| PDP-21 | P1 Variação — indisponível desabilitado e visível (`PST-08`) | Design | Pending |
| PDP-22 | P1 Variação — escolha percorre o `onChange` e sincroniza a galeria | Design | Pending |
| PDP-23 | P1 Variação — alvo de 44px via `TAP_44`; escolhida não desloca a fileira | Design | Pending |
| PDP-24 | P2 Políticas — percentual do Pix vem das settings | Design | Pending |

**Coverage:** 24 requisitos · 24 mapeados a tasks · 24 **Verified** (ver `validation.md`) ✅

---

## Success Criteria

- [ ] Nenhuma tag ou entidade HTML aparece crua na página do produto, conferido em produto com
      descrição longa (3.225 caracteres) e em produto sem descrição.
- [ ] O preço com Pix aparece na página do produto e no card com o **mesmo** número, produzido pela
      **mesma** função — a expressão inline do `ProductCard` deixa de existir no fonte.
- [ ] Eixo com fotos distintas é escolhido por foto; `Com gravação`, `Com Base` e `Letra` continuam em
      pílula. Verificado com dado real do catálogo importado.
- [ ] QA em 390×844 antes de 1440: sem scroll horizontal do `body`, alvo de toque ≥44px em toda vaga.
- [ ] Sem erro novo de lint (baseline 30/8) nem de tipo (baseline store 0).
- [ ] `git diff --name-only` mostra `packages/core/src/payment/pricing.ts` e `installments.ts`
      **inalterados** — o helper de Pix entra em arquivo novo.
