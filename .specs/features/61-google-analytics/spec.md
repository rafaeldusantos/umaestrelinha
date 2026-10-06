# 61 · Google Analytics 4 na loja — Specification

> Fase 1 da medição. Fonte: o documento de planejamento "Google Analytics 4 na Uma Estrelinha —
> plano de implementação" (Claude Docs, 2026-10-05) e as decisões do usuário registradas em
> `context.md`. Desenho: Paper, página **"61 · Google — Analytics e Shopping"** (painel em 1440 e
> 390, e o aviso da loja em 390).

## Problem Statement

A loja nova não mede nada: não há gtag, nem dataLayer, nem aviso de cookies. A loja atual
(Nuvemshop) envia dados para a propriedade GA4 `G-SQL517XDQZ`, e, no dia em que o domínio
`umaestrelinha.com.br` passar a apontar para a loja nova, esse histórico para de ser alimentado. O
pedido é medir navegação, vitrine, produto, sacola, as etapas do checkout e a compra, com a chave
configurável pelo painel — e sem contar compra em dobro nem perder a compra do PIX aprovado depois
que a cliente fechou a página.

## Goals

- [ ] A dona liga a medição, informa o ID e guarda a chave secreta **pelo painel**, sem deploy e sem
      linha de comando.
- [ ] Os 13 eventos de comércio eletrônico do GA4 listados em `EVT-*` chegam ao DebugView com os
      parâmetros corretos, numa sessão real em 390×844.
- [ ] Cada pedido aprovado gera **exatamente um** `purchase` — nem zero, nem dois —, inclusive o PIX
      aprovado com a aba fechada.
- [ ] A cliente que recusa a medição deixa de ser medida a partir daquele instante, em qualquer
      página.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Google Ads, Meta Pixel, TikTok Pixel | Fase 2. O usuário confirmou que não há campanha ativa (2026-10-05) |
| Carregar o contêiner `GTM-K5N4XKF` na loja nova | Ele carrega a tag do GA4 e contaria tudo em dobro. Fase 2 decide se volta, sem a tag do GA4 |
| Remarketing, Google Signals, personalização de anúncios | A base legal escolhida (legítimo interesse) não cobre publicidade; a Política de Privacidade continua recusando "remarketing" |
| `view_promotion` / `select_promotion` (banners da Home) | Opcional no plano; fica para depois de medir o básico |
| Verificação do Search Console por meta tag | O `google-site-verification` vive no HTML da Nuvemshop e some na troca de domínio. A saída recomendada é verificar a **propriedade de domínio por DNS**, que não depende de código — registrada como passo de operação |
| Newsletter como `generate_lead` | O formulário não grava nem envia nada hoje; medir um envio que não acontece seria afirmar o que a loja não faz |
| Reenvio automático de `purchase` que falhou | Ver Assumptions: a falha fica registrada e visível; reenviar é decisão de uma feature própria |
| Configurações dentro do GA (filtros, retenção, referências) | São passos de operação no painel do Google, listados no Apêndice B — não código |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Propriedade | A mesma `G-SQL517XDQZ`, também na homologação | Decisão do usuário (2026-10-05) | y |
| Base legal da medição | **Legítimo interesse**: mede desde a primeira página; o aviso informa e oferece recusar | Decisão do usuário (2026-10-05). O Guia de Cookies da ANPD aceita legítimo interesse para cookies de análise de audiência; publicidade pede consentimento | y |
| Tráfego da homologação | Em host diferente do de produção, todo evento leva `traffic_type=internal`, e o filtro "Tráfego interno" do GA4 o exclui dos relatórios | Mesma propriedade sem poluir os números reais. O host de produção é configuração, não literal no código | n — confirmar que o filtro será ativado (Apêndice B) |
| Onde mora a chave secreta | Fora de `store_settings` — essa tabela tem `SELECT using (true)` para `anon`. Gravada só por um caminho restrito a admin e lida só pelo servidor | Uma chave em `store_settings` estaria publicada para qualquer visitante | y (requisito, mecanismo no design) |
| ID de medição | Mora em `store_settings`, chave `analytics`, e é semeado com `G-SQL517XDQZ` e `enabled: false` | É público por natureza (aparece no HTML de qualquer página). Semear poupa um passo; desligado por padrão, no molde do Google Shopping e do frete grátis | n |
| Recusa e a compra do servidor | Pedido de quem recusou **não** gera `purchase`. Pedido sem `client_id` por outro motivo (bloqueador, cookie limpo) gera, com identificador sintético e sem sessão | A recusa é uma escolha e vale também para o servidor; a ausência por bloqueador não é escolha da loja, e a receita deve entrar | n |
| Falha no envio do `purchase` | Uma tentativa, resultado gravado no pedido (`enviado` · `falhou` · `não enviado por recusa`), visível no painel; nunca interrompe o pagamento | Reenvio exige fila e regra de idade do evento (o GA4 aceita `timestamp_micros` até 72h atrás) — escopo de outra feature | n |
| `login` e `sign_up` | P2 | Úteis, mas fora do funil de compra pedido | n |
| Texto do aviso e da política | O proposto no Apêndice A, com aprovação da dona antes do deploy | `POL-10` exige que a voz da dona seja preservada | n — aguarda a Adri |

**Open questions:** nenhuma sem registro acima.

---

## User Stories

### P1: A dona configura a medição pelo painel ⭐ MVP

**User Story**: Como dona da loja, quero informar o ID do GA4, guardar a chave secreta e ligar a
medição numa tela do painel, para não depender de deploy nem de linha de comando.

**Why P1**: sem isso não há como ligar nada sem um desenvolvedor.

**Acceptance Criteria**:

1. WHEN a dona abre `/admin/google` THEN o painel SHALL mostrar a seção **Google** com duas abas,
   **Analytics** e **Shopping**, e cada aba SHALL exibir o próprio estado (`Ligado`/`Desligado`).
2. WHEN alguém abre `/admin/google-shopping` THEN o painel SHALL redirecionar para
   `/admin/google/shopping`, que SHALL exibir a tela de Google Shopping atual sem perder nenhum
   bloco (estado, a ordem da virada, o que o feed publica).
3. WHEN a dona digita um ID que não casa `^G-[A-Z0-9]{6,12}$` (depois de aparar espaços e passar para
   maiúsculas) THEN o painel SHALL recusar a gravação e dizer, junto ao campo, "O ID começa com G-,
   seguido de letras e números."
4. WHEN a dona tenta ligar a medição sem ID válido gravado THEN o painel SHALL recusar e dizer, com
   o texto exato, *"Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar."*
5. WHEN a dona cola a chave secreta e salva THEN o servidor SHALL guardá-la, e o painel SHALL passar
   a mostrar **"Guardada no servidor"** com a data, sem nunca exibir a chave de volta.
6. WHEN qualquer requisição de `anon` ou de usuário não admin tenta ler ou gravar a chave secreta
   THEN o banco ou o servidor SHALL recusar.
7. WHEN a chave secreta não está guardada e a medição está ligada THEN o painel SHALL avisar que as
   compras não estão sendo enviadas e apontar o passo a passo de onde criá-la.
8. WHEN a dona desliga a medição THEN a loja SHALL parar de carregar o gtag e o servidor SHALL parar
   de enviar `purchase`, a partir da próxima leitura de configuração.
9. WHEN a tela é aberta em 390×844 THEN SHALL não haver rolagem horizontal do body e todo controle
   SHALL ter alvo de toque de pelo menos 44px.

**Independent Test**: no painel local, gravar ID e chave, ligar; conferir com `anon` que a chave não
é legível; abrir `/admin/google-shopping` e cair na aba Shopping.

---

### P1: O aviso de cookies e as preferências ⭐ MVP

**User Story**: Como cliente, quero ser avisada de que a loja usa cookies e poder mudar isso, sem que
o aviso atrapalhe a compra.

**Why P1**: é a condição do legítimo interesse — transparência e saída fácil. O modelo é o das
grandes lojas (referência do usuário: Americanas), mais simples e induzido ao aceite.

**Acceptance Criteria**:

1. WHEN a cliente ainda não respondeu THEN a loja SHALL mostrar um aviso **compacto** no rodapé da
   tela, com o texto exato *"Usamos cookies para melhorar a sua experiência. Ao continuar navegando,
   você concorda com a nossa Política de Privacidade."* (o trecho final é link para
   `/politica-de-privacidade`), **"Aceitar"** como botão principal em destaque, **"Preferências"**
   como link de texto discreto, menor e sem contorno (alvo de toque ≥ 44px), e um **X**. O aviso SHALL
   não nomear o Google — quem nomeia é a política.
2. WHEN a medição está desligada no painel THEN o aviso SHALL continuar existindo (os cookies
   necessários existem de qualquer forma) e a categoria "Estatísticas" SHALL não aparecer nas
   preferências.
3. WHEN a cliente toca em "Aceitar" **ou no X**, ou simplesmente segue navegando THEN a medição SHALL
   continuar — fechar não é recusar — e o aviso, depois de "Aceitar" ou do X, SHALL não voltar nas
   visitas seguintes do mesmo navegador. A medição SHALL acontecer desde a primeira página.
4. WHEN a cliente toca em "Preferências" THEN a loja SHALL abrir uma folha **"Preferências de
   cookies"** com duas categorias: **Necessários** ("Sempre ativos", sem interruptor) e
   **Estatísticas**, com interruptor **já ligado**; e as ações **"Aceitar todos"** (principal) e
   **"Salvar escolhas"** (link discreto).
5. WHEN a cliente desliga "Estatísticas" e salva THEN nenhum evento SHALL sair do navegador dali em
   diante, os cookies `_ga` e `_ga_*` do domínio SHALL ser apagados, e a escolha SHALL valer nas
   visitas seguintes.
6. WHEN a cliente quer mudar a escolha depois THEN o rodapé da loja SHALL oferecer o link
   **"Preferências de cookies"**, que reabre a folha.
7. WHEN o aviso ou a folha estão abertos em 390×844 THEN eles SHALL não causar rolagem horizontal, o
   aviso SHALL não impedir o toque na barra fixa de compra, e a folha SHALL poder ser fechada pelo X e
   pelo gesto de voltar. WHEN a cliente está numa **tela de dinheiro** — `/checkout` ou
   `/pedido/:id/pagamento` — THEN o aviso SHALL não aparecer (no celular ele cobria ~150px do fim da
   página, onde fica o CTA de pagar; a medição já vale sem aceite, então escondê-lo ali não muda o
   que se mede), e WHEN ela volta a qualquer outra rota sem ter respondido THEN o aviso SHALL
   reaparecer. A folha de preferências, aberta pelo link do rodapé, não é afetada (o rodapé nem
   existe nessas telas). *(Revisada na correção da feature: a primeira entrega mostrava o aviso no
   checkout, "no fim da tela", por cima do CTA.)*
8. WHEN a loja roda dentro da prévia do painel (`previewMode`) THEN aviso e folha SHALL não aparecer
   e nenhum evento SHALL sair.

**Independent Test**: aba anônima em 390×844; navegar sem tocar no aviso → `collect` na aba Rede;
Preferências → desligar Estatísticas → Salvar → zero `collect` dali em diante, também depois de
recarregar.

---

### P1: Os eventos do funil ⭐ MVP

**User Story**: Como dona, quero ver no GA4 onde as clientes desistem — da vitrine ao pagamento.

**Why P1**: é o pedido original.

**Acceptance Criteria** (todos valem só com a medição ligada e sem recusa; nenhum sai em `localhost`,
nos testes ou na prévia):

1. **`EVT-01` page_view** — WHEN a rota muda (pathname) THEN SHALL sair um `page_view` com
   `page_location` e `page_title`; a mudança só de query string SHALL não gerar `page_view`. A
   medição automática de histórico do GA4 SHALL não ser usada.
2. **`EVT-02` view_item_list** — WHEN uma listagem com produtos renderiza (categoria, busca,
   carrossel da Home, relacionados, favoritos) THEN SHALL sair um evento por listagem carregada, com
   `item_list_id`, `item_list_name` e os itens visíveis com `index`.
3. **`EVT-03` select_item** — WHEN a cliente toca num card THEN SHALL sair `select_item` com a lista
   de origem e o `index` do card.
4. **`EVT-04` view_item** — WHEN a página do produto abre THEN SHALL sair um `view_item` com
   `currency=BRL`, `value` e o item.
5. **`EVT-05` add_to_cart** — WHEN a cliente adiciona pela página do produto ou pela sugestão da
   sacola THEN SHALL sair **um** evento com a quantidade adicionada. A restauração de sacola
   abandonada SHALL não gerar evento.
6. **`EVT-06` remove_from_cart** — WHEN a cliente remove ou diminui a quantidade THEN SHALL sair o
   evento com a quantidade retirada.
7. **`EVT-07` view_cart** — WHEN a gaveta da sacola abre com itens THEN SHALL sair `view_cart`.
8. **`EVT-08` add_to_wishlist** — WHEN a cliente favorita THEN SHALL sair o evento; desfavoritar
   SHALL não gerar evento.
9. **`EVT-09` search** — WHEN a busca é enviada (não a cada tecla) THEN SHALL sair `search` com
   `search_term`.
10. **`EVT-10` begin_checkout** — WHEN `/checkout` abre com itens THEN SHALL sair **um**
    `begin_checkout` por entrada na página. Com cupom aplicado, o evento SHALL levar `coupon` com o
    código; sem cupom, SHALL não levar a chave.
11. **`EVT-11` add_shipping_info** — WHEN a cliente **toca** numa opção de frete THEN SHALL sair o
    evento com `shipping_tier` = o nome do serviço (`PAC`, `SEDEX`, `Frete padrão`…). A pré-seleção
    automática (opção única, ou a mais barata do endereço salvo) e o frete restaurado do rascunho
    **não são escolha** e SHALL não emitir. **Cada toque conta**, inclusive o re-toque na opção que
    já está selecionada: SEDEX tocado duas vezes SHALL emitir dois eventos (leitura literal de "toca
    numa opção"; decisão de 2026-10-06). Com cupom aplicado, o evento SHALL levar `coupon` com o
    código.
12. **`EVT-12` add_payment_info** — WHEN a cliente **toca** em PIX ou em cartão THEN SHALL sair o
    evento com `payment_type` = `PIX` ou `Cartão de crédito` (texto exato, `PAYMENT_TYPE_LABELS`).
    A pré-seleção do meio de pagamento SHALL não emitir. Com cupom aplicado, o evento SHALL levar
    `coupon` com o código.

    *O cupom nos três eventos do funil (`EVT-10`..`EVT-12`) é decisão de 2026-10-06: o mesmo código
    nos três, ou o GA4 mostraria um desconto que some no meio do caminho.*

    *`EVT-11` e `EVT-12` têm a MESMA política de propósito — só o toque da cliente conta. Até a
    verificação de 2026-10-06 o frete contava a pré-seleção e o pagamento não, e dois passos irmãos
    do funil mediam coisas diferentes. O custo aceito: quem segue com o frete e o meio pré-selecionados
    chega ao `purchase` sem `add_shipping_info`/`add_payment_info` daquela visita.*
13. **`EVT-13` itens** — WHEN qualquer evento leva itens THEN cada item SHALL ter `item_id` igual ao
    identificador público **do produto** no Google Shopping (`publicProductId` de
    `@estrelinha/core/shopping`, o `item_group_id` do feed), `item_name`, `item_brand="Uma Estrelinha"`, `item_category`,
    `item_variant`, `price` e `quantity`. `item_category` SHALL ser o **slug** da categoria de exibição
    (`PST-06`: menor `categories.sort_order`, desempate por `product_categories.position`), escolhida
    pela MESMA função na loja e no servidor (`displayCategorySlug`, `@estrelinha/core/product`).
14. **`EVT-14` sem dado pessoal** — WHEN qualquer evento é montado THEN ele SHALL não conter nome,
    e-mail, telefone, CPF, endereço nem o **texto de gravação** da joia.
15. **`EVT-15` dono único** — WHEN um arquivo de produção fora do módulo dono chamar o gtag ou
    escrever no `dataLayer` THEN um guarda SHALL reprovar a suíte.

**Independent Test**: percurso completo em 390×844 com o DebugView aberto; cada evento aparece uma
vez com os parâmetros.

---

### P1: A compra confirmada pelo servidor ⭐ MVP

**User Story**: Como dona, quero que toda venda aprovada apareça no GA4 uma vez só, inclusive o PIX
pago com a página fechada.

**Why P1**: é o número que importa, e o único que o navegador não consegue garantir.

**Acceptance Criteria**:

1. WHEN o pedido é criado THEN o checkout SHALL enviar ao servidor o `client_id` e o `session_id` do
   GA (quando existirem) e se a cliente recusou a medição, e o servidor SHALL guardá-los no pedido.
2. WHEN a aprovação é aplicada **pela primeira vez** (o `applied` de `apply_payment_approval`, no
   cartão síncrono ou no webhook) THEN o servidor SHALL enviar **um** `purchase` pelo Measurement
   Protocol, com `transaction_id` = `orders.order_number` **cru** (`0244`, `NS-169` — sem o `#`),
   `value`, `currency=BRL`, `shipping`, `coupon`, `discount` e os itens no formato de `EVT-13`.

   *Decisão de 2026-10-06 (orquestrador): o `#` é apresentação — quem o põe é `formatOrderNumber`, na
   tela e no e-mail —, e o `transaction_id` é chave que o GA4 compara como texto. O painel e o e-mail
   continuam mostrando `#0244`; o relatório do GA4 mostra `0244`.*
3. WHEN a mesma aprovação chega de novo (webhook repetido, corrida entre cartão e webhook) THEN SHALL
   não sair um segundo `purchase`.
4. WHEN o pedido registra recusa da medição THEN SHALL não sair `purchase`, e o pedido SHALL ficar
   marcado como "não enviado por recusa".
5. WHEN o pedido não tem `client_id` e não registra recusa THEN o `purchase` SHALL sair com um
   `client_id` sintético derivado do pedido.
6. WHEN a medição está desligada ou a chave secreta não existe THEN SHALL não sair `purchase` e o
   pagamento SHALL seguir normalmente.
7. WHEN o envio ao Google falha ou demora THEN o pagamento SHALL seguir normalmente, e o pedido SHALL
   ficar marcado como "falhou", sem a chave secreta em log nenhum.
8. WHEN a loja é a de homologação (host diferente do de produção) THEN o `purchase` SHALL levar
   `traffic_type=internal`.
9. WHEN um arquivo de `apps/**` monta um evento `purchase` THEN um guarda SHALL reprovar a suíte —
   a compra tem um dono só, o servidor.

**Independent Test**: no banco local, aprovar um pedido duas vezes pelo webhook e conferir uma única
chamada ao Measurement Protocol (dublê que registra o corpo).

---

### P1: A Política de Privacidade diz a verdade sobre a medição ⭐ MVP

**User Story**: Como cliente, quero ler na política o que é medido e como recusar.

**Why P1**: o legítimo interesse exige transparência; a política hoje lista três parceiros e passaria
a omitir um.

**Acceptance Criteria**:

1. WHEN a medição existe THEN a política SHALL ter uma seção sobre a medição de audiência com o texto
   aprovado (Apêndice A), dizendo o que é coletado, o que não é, a base legal e como recusar.
2. WHEN a lista "Com quem compartilhamos" é lida THEN ela SHALL incluir o Google Analytics, e o
   guarda da política SHALL ser ampliado (não afrouxado) para quatro entradas.
3. WHEN a política é lida THEN ela SHALL continuar sem afirmar remarketing, anúncios personalizados
   ou publicidade comportamental.

---

### P2: O painel mostra se as compras estão chegando

**Acceptance Criteria**:

1. WHEN a aba Analytics abre THEN o painel SHALL mostrar o último pedido com `purchase` enviado (número
   formatado por `formatOrderNumber`, data e valor) e a contagem de pedidos aprovados nos últimos 30
   dias que ficaram fora por recusa ou por falha.
2. WHEN nenhum `purchase` foi enviado ainda THEN o painel SHALL dizer "Nenhuma compra enviada ainda",
   nunca um zero que pareça defeito.

### P2: Entrada e cadastro

1. **`EVT-16`** — WHEN a cliente entra na conta THEN SHALL sair `login` com `method` = `codigo` (os 6
   dígitos por e-mail), `senha` ou `google` (contado na volta do redirecionamento).
2. **`EVT-17`** — WHEN a cliente cria conta THEN SHALL sair `sign_up` com `method` = `codigo` — conta
   nova só nasce pelo código; senha e Google entram em conta existente, e a loja não sabe distinguir
   no retorno do Google se ele criou uma.

---

## Edge Cases

- WHEN o gtag é bloqueado por extensão THEN a loja SHALL funcionar igual, sem erro no console que
  afete a cliente.
- WHEN a leitura de `store_settings` falha THEN a loja SHALL não carregar o gtag (desligado é o
  estado seguro) e SHALL funcionar normalmente.
- WHEN o `localStorage` lança (aba privada) THEN o aviso SHALL aparecer a cada visita e a escolha
  SHALL valer na sessão em curso.
- WHEN a cliente recarrega `/pedido/:id` THEN SHALL não sair nenhum `purchase` do navegador.
- WHEN o ID de medição muda no painel THEN a loja SHALL usar o novo a partir da próxima leitura de
  configuração.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ANL-01..09 | P1: painel (AC 1–9) | Design | Pending |
| AVS-01..08 | P1: aviso e preferências (AC 1–8) | Design | Pending |
| EVT-01..15 | P1: eventos | Design | Pending |
| CMP-01..09 | P1: compra no servidor | Design | Pending |
| PRV-01..03 | P1: política | Design | Pending |
| ANL-10..11 | P2: último envio | Design | Pending |
| EVT-16..17 | P2: login/sign_up | Design | Pending |

**Coverage:** 48 total, 0 mapped to tasks.

---

## Success Criteria

- [ ] Uma compra de teste por PIX, com a aba fechada antes da aprovação, aparece no DebugView como
      **um** `purchase` com o número do pedido.
- [ ] O mesmo webhook reenviado não gera segundo `purchase` (provado por teste com dublê).
- [ ] Com "Estatísticas" desligada nas preferências, a aba Rede mostra **zero** requisições a `google-analytics.com` e
      `googletagmanager.com` no percurso seguinte.
- [ ] `anon` não consegue ler a chave secreta (probe HTTP contra o banco local).
- [ ] Sem rolagem horizontal e alvos ≥ 44px em 390×844, no painel e no aviso.

---

## Apêndice A — Texto proposto (aguarda aprovação da Adri)

**Aviso na loja**

> Usamos cookies para melhorar a sua experiência. Ao continuar navegando, você concorda com a nossa
> [Política de Privacidade]. ✕
> Preferências (link discreto) · **[Aceitar]** (botão principal)

**Folha "Preferências de cookies"**

> **Necessários** — Guardam a sua sacola, os favoritos e o andamento da compra. Sem eles a loja não
> funciona. *Sempre ativos*
> **Estatísticas** — Ajudam a entender como a loja é visitada, de forma anônima, para melhorá-la.
> [interruptor ligado]
> Salvar escolhas (link discreto) · **[Aceitar todos]**

**Política de Privacidade — novo item na lista "Com quem os seus dados são compartilhados"**

> Google Analytics, para medir a audiência da loja — quais páginas são vistas e como as compras
> acontecem, sem o seu nome, e-mail, telefone ou endereço.

**Política de Privacidade — nova seção "Medição de audiência", depois de "Cookies e navegação"**

> Para entender como a loja é usada, usamos o Google Analytics. Ele registra as páginas vistas, os
> produtos acessados, o que vai para a sacola e as etapas da compra, junto com informações gerais do
> aparelho, como o tipo de navegador e a cidade aproximada.
>
> Não enviamos ao Google o seu nome, e-mail, telefone, CPF, endereço nem o texto gravado na sua joia.
> Esses dados também não são usados para anúncios.
>
> Fazemos essa medição com base no legítimo interesse da loja em melhorar o site, como permite a Lei
> Geral de Proteção de Dados. Se preferir não ser medida, abra "Preferências de cookies" — no aviso
> da loja ou no rodapé — e desligue "Estatísticas". A partir daí, nada mais é enviado do seu
> navegador.

O parágrafo original de "Cookies e navegação" ("traçar um perfil do público… garantir as melhores
ofertas e promoções") fica intacto por `POL-10`. **Recomendação para a dona**: ele promete ofertas e
promoções a partir da navegação, que a loja não faz. Vale ela decidir se o mantém.

## Apêndice B — Passos de operação (fora do código)

| Quando | Onde | Passo |
| --- | --- | --- |
| — | GTM `GTM-K5N4XKF` | **Nada a fazer.** A suspeita de `page_view` em dobro foi medida em 2026-10-05 (Chrome real, 390×844, contando as requisições `/g/collect`) e **não se confirmou**: o gtag é carregado uma vez só para `G-SQL517XDQZ` e sai **um** `page_view` por página, às vezes atribuído ao GTM, às vezes à integração da Nuvemshop |
| Agora | GA4 → Administrador → Retenção de dados | 14 meses |
| Agora | GA4 → Fluxo de dados → Configurar tag → Listar referências indesejadas | `accounts.google.com` e `mercadopago.com` |
| Agora | GA4 → Configurações da conta/propriedade | Google Signals desligado |
| Antes de ligar a homologação | GA4 → Administrador → Filtros de dados | Filtro "Tráfego interno" em **Ativo** |
| Depois da implementação | GA4 → Fluxos de dados → Chaves secretas do Measurement Protocol | Criar a chave "loja nova" e colar no painel |
| **Antes de ligar a medição no painel** | GA4 → Administrador → Fluxos de dados → Medição otimizada → Visualizações de página → Configurações avançadas | **Obrigatório.** Desmarcar "Mudanças de página com base em eventos do histórico do navegador". Medido no fecho (2026-10-06, Chrome real): com ela ligada chegam **8** `page_view` para **6** páginas — a loja manda um por página, e o GA4 manda outro a cada troca de rota feita pelo router. Na loja da Nuvemshop (que recarrega a página) desligar não muda nada, então pode ser feito já |
| Na troca de domínio | Nuvemshop → Códigos externos | Desvincular o GA4 da Nuvemshop e apagar a chave secreta antiga no GA |
| Na troca de domínio | Search Console | Verificar a propriedade de domínio por DNS |
| Depois da troca | GA4 → DebugView | Percurso de compra conferido |
