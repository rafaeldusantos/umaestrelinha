# 45 — As políticas da loja: trocas/devoluções e privacidade

## Contexto

A loja tem **uma** página institucional de política, `/politicas`, com quatro parágrafos: Envio,
Pagamento, Trocas e Devoluções, Privacidade. Os dois últimos são resumos de uma frase, e o de trocas
**promete o que a loja não pode cumprir**:

> "Caso receba um produto com defeito, entre em contato em até 7 dias. Faremos a troca sem custo
> adicional."

Numa loja de joia afetiva isso é falso em dois sentidos: a peça é **personalizada com material
insubstituível da própria cliente** (refazer depende de sobrar material), e "troca sem custo" não é o
que o Código de Defesa do Consumidor obriga nem o que a Adri consegue fazer. Página de política é
obrigatória para loja virtual — é o que o Google Merchant Center, o meio de pagamento e o próprio CDC
pedem — e hoje ela existe pela metade.

Junto disso, três defeitos já registrados no `CLAUDE.md` e ainda abertos:

- **O rodapé linka três âncoras mortas.** `/politicas#trocas`, `/politicas#privacidade` e
  `/politicas#termos` — `PoliciesPage` não tem **um** `id` sequer. `ScrollToTop` manda ao topo, que é
  melhor que o meio da página, e continua sendo link que não vai aonde diz.
- **`#termos` não tem nem seção correspondente.** O `apps/store/CLAUDE.md` escreve que "consertar
  exige decisão de conteúdo, não `id`".
- **A loja em produção (`umaestrelinha.com.br`) já tem as duas páginas**, em endereços que o Google
  indexou, e a loja nova não serve nenhum dos dois.

## Objetivo

Servir as duas políticas como **páginas próprias**, nos endereços que a loja em produção já publica,
com um dono só para cada texto — e deixar `/politicas` como o índice que aponta para elas.

## Success Criteria

- `/politicas-de-trocas-e-devolucoes` e `/politica-de-privacidade` respondem, com canônica própria,
  cada uma num chunk próprio, as duas anunciadas no `sitemap.xml`.
- Nenhum texto de política tem dois donos: o que `PoliciesPage` dizia sobre trocas e privacidade sai
  de lá, e um guarda recusa a volta.
- Nenhum link do rodapé aponta para âncora que não existe.
- Baseline de testes sobe sem nenhuma queda não declarada; lint e tipos inalterados.

---

## Requisitos

### Endereçamento

**`POL-01`** — A loja SHALL servir a política de trocas em **`/politicas-de-trocas-e-devolucoes`** e a
de privacidade em **`/politica-de-privacidade`**.

> **Os dois slugs são os do site em produção, lidos do `sitemap.xml` dele em 2026-09-12**, e a
> divergência entre o plural do primeiro (`politicas-…`) e o singular do segundo (`politica-…`) é
> **do site**, não erro de digitação desta spec. É a mesma decisão de `AD-018` — a loja nova adota o
> formato que o tráfego orgânico já aponta —, e é o que a feature `31` já fez ao adotar
> `/como-enviar-seu-material-de-dna`, que também é literal do site em produção.

**`POL-02`** — Os dois primeiros segmentos SHALL entrar em `ROUTE_SLUGS` (`@estrelinha/core/routes`)
**na mesma mudança** que as rotas. Com categoria na raiz do domínio, rota de um segmento que não é
reservada encobre em silêncio a categoria homônima (`AD-018`).

**`POL-03`** — Os dois caminhos SHALL entrar em `SITEMAP_STATIC_PATHS`: são conteúdo público e
estável, e é o único jeito de o rastreador descobri-los sem executar o JavaScript da vitrine.

**`POL-04`** — Cada página SHALL declarar a própria `<link rel="canonical">` (`useCanonical`) e SHALL
ser carregada por `lazy()` no `App.tsx` (`PRF-16`).

### O texto da política de trocas

**`POL-05`** — A página SHALL levar o título **"Política de Trocas, Devoluções e Arrependimento"** e
apresentar, nesta ordem, as seções fornecidas pela dona:

| # | Seção |
| --- | --- |
| — | abertura (três parágrafos: produção artesanal · o que a cliente confia à loja · o CDC) |
| 1 | Joias afetivas, produtos artesanais e personalizados |
| 2 | Importante sobre o processo artesanal |
| 3 | E se minha joia apresentar um defeito de fabricação? |
| 4 | E no caso das joias afetivas? |
| 5 | Semijoias e joias de prata não personalizadas (com as duas perguntas: desistência e troca por preferência) |
| 6 | O que não é considerado defeito de fabricação? |
| 7 | Como solicitar uma troca ou devolução? |
| 8 | Cuidados com a peça |
| 9 | Nosso compromisso |

**`POL-06`** — O texto SHALL citar a **Lei nº 8.078/1990** (CDC) e, na desistência, o **art. 49** com
o prazo de **7 dias**. São os dois únicos números da página, e são de lei — não de configuração.

**`POL-07`** — A página SHALL passar na régua de tom da copy institucional: **sem emoji**, sem
exclamação de festa, sem vocabulário da loja anterior. O `✨` que fecha o texto original SHALL virar a
estrela desenhada (`EstrelinhaStarIcon`), como a feature `29` já fez na Sobre (`SOB-10`).

**`POL-08`** — A frase **"Não envie a peça sem antes entrar em contato conosco"** SHALL aparecer como
**aviso destacado**, não como parágrafo em fluxo. É a instrução operacional mais cara da página: peça
que chega sem aviso não tem pedido a que se ligar.

**`POL-09`** — O canal de contato SHALL sair de `store_settings`, **nunca cravado no JSX** — mesma
régua de `PDP-24`, que existe porque a página cravava "5% de desconto no PIX". O WhatsApp SHALL usar
o mesmo portão da Sobre (`SOB-08`): menos de 10 dígitos é número não configurado, e a ação sai de
cena em vez de abrir conversa com ninguém. O e-mail SHALL continuar visível nos dois casos.

### O texto da política de privacidade

**`POL-10`** — O texto base SHALL ser o publicado hoje em
`umaestrelinha.com.br/politica-de-privacidade/`, preservado em voz e conteúdo: é a Adri falando na
primeira pessoa, e a voz dela não é copy a reescrever.

**`POL-11`** — O texto SHALL acrescentar a **LGPD (Lei nº 13.709/2018)**: os direitos da titular
(confirmação, acesso, correção, eliminação, portabilidade, revogação do consentimento) e **como
exercê-los**, pelos mesmos canais de `POL-09`.

**`POL-12`** — O texto SHALL descrever com quem o dado é compartilhado **na prática, e só isso**:
meio de pagamento, transportadora e e-mail transacional. Nenhuma afirmação sobre tratamento que a
loja não faz — é a mesma régua que tirou da newsletter a promessa de e-mail (`FIX-04`) e da home a
prova social fabricada.

**`POL-13`** — O que o texto disser sobre **consentimento de marketing** SHALL corresponder ao que o
checkout de fato faz: caixa **opcional**, marcada pela cliente, com o texto "Quero receber lembretes
e novidades por e-mail. Você pode cancelar quando quiser." — e o lembrete de carrinho que ela
autoriza.

**`POL-14`** — O **material afetivo** SHALL ter parágrafo próprio. Cinzas, leite materno e mecha de
cabelo não são "dado pessoal" no vocabulário da LGPD, e são a coisa mais íntima que chega a esta
loja: uma política de privacidade que não os menciona está calada exatamente onde a cliente precisa
ler.

### ~~`/politicas` — o índice~~ — **SUPERSEDED em 2026-09-12**

> **`POL-15` e `POL-16` foram implementados e depois REVOGADOS por decisão do usuário.** A página
> `/politicas` não virou índice: ela foi **removida da loja**.
>
> O que aconteceu: uma segunda sessão, trabalhando na **mesma working tree**, recebeu do usuário dela
> a instrução explícita de apagar `/politicas` — junto com a entrega de uma terceira página de
> política (`/cuidados-com-sua-joia-afetiva`, construída sobre o `PolicyDocument` desta feature). As
> duas instruções eram incompatíveis num ponto só: o destino do índice. O usuário desta sessão,
> consultado com as duas na mesa, escolheu **aceitar a remoção**.
>
> **O que a revogação NÃO toca**: as duas páginas desta feature não dependiam do índice — `POL-15`
> existia para impedir que o índice virasse um segundo dono do texto, e sem índice o problema não
> existe. `POL-01`..`POL-14` e `POL-17`..`POL-22` seguem valendo, todos implementados.
>
> **O que a revogação CUSTA, e fica registrado como dívida:**
>
> 1. **Envio e Pagamento sumiram da loja.** Eram os dois blocos de `POL-16`, liam `store_settings`
>    (`usePaymentSettings`, `useFreeShipping`) e **não tinham outra casa**. Com o índice apagado, a
>    loja deixa de dizer por onde envia, em quanto tempo posta, que aceita Pix e cartão, e — quando o
>    interruptor da `37` estiver ligado — a partir de quanto o frete é grátis. Nenhuma outra página
>    diz isso.
> 2. **`/politicas` é rota antiga, não andaime desta feature.** Ela está commitada desde
>    `12c8ab7` ("baseline herdada da Nanita") e estava em `SITEMAP_STATIC_PATHS` até a remoção —
>    ou seja, foi anunciada para indexação. Removê-la **sem 301** é exatamente o tradeoff que
>    `AD-018` e `LEGACY_REDIRECTS` existem para não deixar acontecer por acidente em outros slugs. A
>    remoção foi feita sem redirect, por decisão do usuário da outra sessão; o registro fica aqui.
>
> **`POL-19` foi ESTREITADO junto** — ver a seção do guarda.

### O rodapé

**`POL-17`** — Os links do rodapé SHALL apontar para os endereços novos. `/politicas#trocas` e
`/politicas#privacidade` SHALL sair — as âncoras nunca existiram.

**`POL-18`** — O link **"Termos de uso"** SHALL sair do rodapé. Não há página de termos, e esta spec
**não a inventa**: link rotulado para conteúdo inexistente é promessa que a loja não cumpre, e é a
decisão de conteúdo que o `apps/store/CLAUDE.md` registrou como pendente.

### O guarda

**`POL-19`** — Um guarda SHALL ler os arquivos do disco e recusar:

1. ~~o texto de qualquer das duas políticas **reaparecer** em `PoliciesPage.tsx`~~ — **removida junto
   com o índice**. Régua que guarda arquivo inexistente varre zero e passa, que é pior que régua
   nenhuma;
2. um título de seção de uma política ser declarado em mais de um arquivo de `pages/`. **Ficou mais
   necessária, não menos**: são três documentos agora, e o par perigoso já está na árvore —
   "Cuidados com a peça" (dentro da política de trocas) e "Cuidados gerais com a joia" (a página de
   cuidados) falam do mesmo assunto;
3. qualquer arquivo de `apps/store/**` linkar para `/politicas` — **com ou sem fragmento**. A régua
   nasceu contra a âncora morta (`#trocas` nunca teve `id`) e foi **ampliada** quando a rota deixou
   de existir: agora o endereço nu também é 404. O recorte usa `(?![-\w])` e não `\b`, senão
   `/politicas-de-trocas-e-devolucoes` seria acusado junto (`L-034`).

Com **âncora de contagem** (`L-021`) e **sensor por mutação** nos três sentidos: régua que varre zero
arquivo passa em silêncio, que é a pior falha possível num teste deste tipo.

### O desenho

**`POL-20`** — As duas páginas SHALL sair de **um** componente de documento
(`shared/ui/PolicyDocument`): trilha, título, medida de leitura, escala tipográfica e espaçamento em
um lugar só. Duas escritas da mesma escala divergem sem quebrar build, `tsc` nem teste de componente.

**`POL-21`** — A trilha (`Trilha`) SHALL subir de `pages/AboutPage.tsx` para `shared/ui/`. O
comentário que a declarou escreveu a condição: *"componente compartilhado com um consumidor só é
abstração antes da hora; quando a segunda página pedir trilha, ela sobe com as duas necessidades na
mesa"*. São três consumidores agora.

**`POL-22`** — O desenho SHALL ser **mobile-first** (390px é o alvo), com alvo de toque de 44px nos
links (`TAP_ROW`) e **zero** rolagem horizontal do body.

---

## Out of Scope

| O quê | Por quê |
| --- | --- |
| Página de **Termos de uso** | Não existe texto, e inventar termos de uso é redigir contrato no lugar da dona. `POL-18` apaga o link em vez de fingir a página |
| Página de **frete e entrega** dedicada (`/politicas-de-frete-e-entrega` no site em produção) | `/politicas` cobre Envio lendo `store_settings`. Página própria é outra decisão de conteúdo |
| **301 de URL legada** | Não há legado a preservar *nesta* loja: os endereços nascem **iguais** aos do site em produção. A barra final indexada resolve pelo `trailingSlash: false` que já está no `vercel.json` |
| **Prova em navegador** (390×844 e 1440) | Fica na mesma fila da `32`, `33`, `34`, `35`, `37`, `39` e `41`, e é anotada no `validation.md` |
| Editor das políticas no painel | O texto é jurídico e muda por decisão da dona com advogado, não por campo de formulário |

## Riscos

- **O texto é jurídico e veio pronto.** Reescrevê-lo para "melhorar" é o risco principal: a spec
  preserva as frases da dona e só mexe no que o repositório proíbe (emoji) ou no que a loja precisa
  para não mentir (canal de contato vindo das settings).
- **`copyInstitucional.test.tsx` substitui o módulo de settings INTEIRO** (`vi.mock` sem
  `importOriginal`). Hook novo consumido por qualquer página coberta por ele derruba o **render**,
  não a asserção (`L-030`). As duas páginas novas leem `useGeneralSettings` — o mock precisa dele.
