## 04 · [apps/store] Cartão, página do produto e listagens — o selo e o preço da campanha

**Status:** done

`UC-05 (cartão e página do produto) · RN-10 · RN-13` — 102

**Objetivo.** Durante a vigência, toda peça marcada aparece na loja com o preço da campanha, o cheio riscado e o selo da campanha, no cartão, na página do produto e nas listagens; fora dela, a loja é a de hoje.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` › A listagem de categoria / os filtros · Carrinho, chrome e checkout · A sacola v4; `packages/core/CLAUDE.md` › Pureza · Dinheiro. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Selo · a faixa; Selo · em linha; Cartão com miniaturas de cor); §4 · spec.md — Código; §7 · spec.md — Decisões.

**Depende de.** 01 — as tabelas com a leitura pública da campanha em vigência, `packages/core/src/campaigns/` (`price.ts`, as cores padrão) e os tipos. Confira que existem antes de começar.
**Habilita.** 05, 06 e 07: `apps/store/src/entities/campaign/` (a campanha em vigência lida da RLS — nome, texto do selo, cores, percentuais, fim), o **preço efetivo** da peça e de cada variação no mapeador, e os componentes do selo (faixa de 30 px e em linha de 26 px) em `apps/store/src/entities/`.

### Critérios de aceite

### UC-05 · A peça na loja, durante a vigência
- Cartão: o selo, o preço com desconto e o preço cheio riscado ("De R$ 209,90" para leitor de tela).
- Página do produto: o selo em linha acima do nome, o preço com desconto, o cheio riscado, as parcelas e o PIX
  calculados sobre o preço com desconto.
- Sacola e checkout: o item com o preço com desconto e o cheio riscado; o Total igual ao que o servidor cobra.
- Fora da vigência, nada disso aparece, mesmo com a peça marcada.
- Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela
  confirme de novo; nunca é cobrado um valor maior que o mostrado. Se a campanha começar nesse meio-tempo, a sacola
  passa a mostrar o preço com desconto na próxima vez que for aberta.

- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.

- **RN-06 · Desconto não soma com o "de/por".** Peça com `compare_price` maior que o preço: o preço cheio é o
  `compare_price`; o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha. Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.

- **RN-10 · Os filtros e a ordenação contam o preço com desconto.** Durante a vigência, a peça de campanha aparece em
  "Com desconto", entra na faixa de preço pelo preço com desconto e é ordenada por ele.

- **RN-11 · O texto do selo é o da campanha, e cabe.** O selo do cartão mostra o **texto do selo** em versalete e o
  percentual ("BLACK FRIDAY · −20%"). Medido no protótipo: "BLACK FRIDAY" (12 caracteres) cabe no cartão de 173 px ao
  lado do bloco do percentual; o teto de **14 caracteres** é o que cabe com folga. Nome maior que isso exige um
  texto do selo mais curto, e o painel mostra a prévia do selo em 173 px enquanto a dona digita.

- **RN-12 · As cores do selo são da campanha** (Decisão D-02). Duas cores, escolhidas no cadastro: a **cor da
  faixa** e a **cor de destaque**. O selo as usa cruzadas, como no protótipo: o texto da campanha sai na cor de
  destaque sobre a faixa, e o percentual sai na cor da faixa sobre o bloco de destaque. Por isso **um** número decide
  se o par serve: o contraste entre as duas cores, que tem de ser **≥ 4,5:1** (texto de 11–13 px). Par abaixo disso é
  recusado no cadastro com a razão medida ("3,2:1 — escolha cores com mais diferença"). A medida é a de
  `@estrelinha/core/color` (feature `34`), a mesma dos guardas. A campanha nasce com o preto #161514 e o ouro
  #C2A063 do protótipo (7,4:1). As cores do selo **não** dependem do perfil de estilo (WI 100).

- **RN-13 · O selo é a faixa do protótipo v2.** No pé da foto, 30 px; substitui o selo "−X%" de hoje (nunca dois
  selos na mesma foto); as miniaturas de cor (`ColorPreview`) sobem para 10–12 px acima da faixa, sem mudar de tamanho
  nem de quantidade por largura (1 + "+N" em 173 px, 2 + "+N" em 220). Em linha (página do produto, acima do nome;
  sacola, no lugar do chip de desconto): a mesma faixa em 26 px, cantos de 6 px. `alvoDeToqueNaoRoubaPosicao`,
  `cardSkeletonBox` e `accentText` continuam valendo. Durante a vigência, a peça de campanha mostra só a faixa da campanha: os selos do
  canto (desconto de hoje, Novo, Últimas, Destaque) não aparecem nela. Fora da campanha, o cartão volta a ser o de hoje.

- **RN-14 · Tom.** O selo diz o texto da campanha e o percentual; a vitrine diz até quando vale, por data ("até 30 de
  novembro"). Nada de contagem regressiva, "últimas horas" ou escassez — em nenhuma superfície da campanha.

- **RN-15 · Celular primeiro.** Selo inteiro no cartão de 173 px; fonte do sistema a 200 % sem cortar o percentual;
  nenhuma rolagem horizontal; a tela de campanhas do painel em 390 sem rolagem lateral.

- **CA-03** Marcar 20% numa peça de R$ 209,90, em vigência ⇒ cartão, página do produto, sacola e checkout mostram
  R$ 167,92 com R$ 209,90 riscado e o selo "BLACK FRIDAY · −20%"; o servidor cobra R$ 167,92 (antes de PIX, cupom e
  frete).

- **CA-04** A mesma peça antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine — na loja e no
  servidor.

- **CA-05** Peça com variações de preços diferentes: cada variação aparece e é cobrada com o percentual sobre o
  próprio preço.

- **CA-06** Peça com `compare_price` R$ 259,90 e preço R$ 239,90, marcada com 10%: cobra R$ 233,91 (o menor), "de"
  R$ 259,90; nunca R$ 215,91.

- **CA-07** Tirar da campanha (ou encerrar a campanha) devolve o preço de sempre em todas as superfícies, e
  `price`/`compare_price` no banco são os mesmos de antes.

- **CA-11** Cartão com miniaturas de cor e selo: as miniaturas ficam acima da faixa, sem sobrepor; tocar numa
  miniatura continua trocando a foto sem navegar.

- **CA-12** Uma campanha com outro nome ("Dia das Mães", texto do selo "DIA DAS MÃES") mostra esse texto no selo, na
  vitrine e no bloco da Home, sem mudança de código.

- **CA-14** O selo usa as duas cores da campanha (cruzadas: texto na cor de destaque sobre a faixa, percentual na
  cor da faixa sobre o destaque); um par abaixo de 4,5:1 é recusado no cadastro com a razão medida; sem escolha, sai
  preto #161514 e ouro #C2A063. O selo não usa nenhuma cor da paleta da loja: muda a paleta, o selo continua igual.

- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

(Nesta tarefa: o cartão e a página do produto, e as listagens; a sacola e o checkout são da tarefa 05.)

### Design — o que a tela faz

Copie spec.md › Design › "Selo · a faixa (cartão)", "Selo · em linha" (a parte da página do produto) e "Cartão com miniaturas de cor" — é a fonte. Obrigatório: faixa de 30 px no pé da foto, cortada pelos cantos de 20 px do contêiner; texto na cor de destaque sobre a cor da faixa (11 px, negrito, maiúsculas, 0,08 em, folga 12/8 px, sem quebra, sem reticências) e percentual na cor da faixa sobre o destaque (13 px, folga 11 px, "−20%" com sinal de menos tipográfico); nome acessível "{texto do selo}, {pct}% de desconto"; selo em linha 26 px, cantos 6 px; preço cheio riscado acima do preço com desconto, com "De " só para leitor de tela; parcelas e PIX sobre o preço com desconto; miniaturas a 40 px do pé no celular e 42 px a partir de 768 px quando há selo (14 px sem selo), mesma quantidade por largura de hoje.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/entities/campaign/` | VOCÊ CRIA | a leitura pública (RLS por `now()`) | a campanha em vigência ou nenhuma; a loja nunca decide a vigência com o relógio do navegador |
| preço efetivo no mapeador (`apps/store/src/entities/product/lib/mapProduct.ts › PRODUCT_CARD_SELECT`, `mapDbToProduct`) | VOCÊ MUDA | o embed `product_campaigns(...)` filtrado pela RLS | preço efetivo e cheio da peça e de cada variação, e o percentual |
| componentes do selo (faixa e em linha) | VOCÊ CRIA | texto, duas cores, percentual | o selo, por `style` inline |
| `packages/core/src/campaigns/price.ts` | JÁ EXISTE (tarefa 01). Consuma; não altere. | preço, "de", percentual | preço de campanha e cheio |

### Decisões já tomadas

- T5: a loja nunca chama a função de vigência com `new Date()`; a campanha em vigência vem da leitura pública filtrada por `now()`. Guarda de fonte recusando a chamada da vigência em `apps/store/src` fora do mapeador.
- T8: o mapeador expõe o preço efetivo da peça e de cada variação; filtros, ordenação, limites da régua e o card leem esse campo; `hasDiscount` = efetivo < cheio.
- T16: o selo lê só as duas cores da campanha, por `style` inline, nunca um token da loja; guarda de fonte recusa token `estrelinha-*` nos componentes do selo.
- T17: colunas `products.base_price`/`original_price`, `product_variants.price`/`compare_price`.
- H-09: larguras 173 e 220 px do PRD; os selos do canto (desconto de hoje, Novo, Últimas, Destaque) saem só na peça de campanha.
- O selo mora em `entities/` porque card, página e sacola o leem (`AD-033`).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| embed no select da vitrine | `apps/store/src/entities/product/lib/mapProduct.ts:106-134 — PRODUCT_CARD_SELECT`; o guarda `cardSelect.test.ts` |
| cartão | `apps/store/src/entities/product/ui/ProductCard.tsx:39 CardBadge`, `:159-164 hasDiscount`, `:304-312 a cadeia de selos` |
| miniaturas | `apps/store/src/entities/product/ui/ColorPreview.tsx:139 — absolute bottom-3.5 left-3.5` |
| dono único com metade positiva | `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts` |

### Testes

- Mapeador: com a marcação em vigência, preço efetivo de R$ 209,90 a 20% = R$ 167,92 e cheio R$ 209,90; sem marcação (ou campanha fora da leitura), o preço de sempre; cada variação sobre o próprio preço; CA-06 numa variação.
- Cartão (componente): a faixa com texto e percentual nas cores cruzadas; nenhum selo do canto na peça de campanha e os de hoje fora dela; "De R$ 209,90" para leitor de tela; as miniaturas acima da faixa e tocar numa troca a foto sem navegar; com "DIA DAS MÃES" e as cores da campanha.
- Página do produto real: selo em linha acima do nome, parcelas e PIX sobre o preço com desconto.
- Filtros e ordenação: "Com desconto", a faixa de preço e a ordenação pelo efetivo.
- Guardas: selo sem token `estrelinha-*`; vigência não calculada no navegador fora do mapeador; o contraste da semente pelas cores (calculado com `contrastRatio`).
- As demais leituras de `price` (busca, cross-sell, analytics, carrinho abandonado) lendo o efetivo.

### Obrigações

- `cardSkeletonBox`, `alvoDeToqueNaoRoubaPosicao`, `accentText`, `touchTarget`, `cardSelect`, `fiacaoDaVitrine` e `renditionSingleOwner` verdes sem afrouxar.
- Sem rolagem horizontal em 390; o percentual não corta com fonte a 200 % (prova de layout fica com o QA, jsdom devolve 0).
- `strictNullChecks: false`.

### Não faça

- Sacola, checkout, `payment/pricing.ts`, cupom e functions (tarefa 05); a vitrine `/ofertas` e o servidor de páginas (tarefa 06); o bloco da Home (tarefa 07); o feed e o JSON-LD (tarefa 08); qualquer mudança em `core/campaigns` (tarefa 01).

### Pronto quando

- [ ] CA-03 e CA-04 no cartão e na página do produto, CA-05, CA-06, CA-11, CA-12 (selo) e CA-14 (cores e sem paleta) provados por teste
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

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
