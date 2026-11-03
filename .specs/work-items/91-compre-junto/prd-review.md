# PRD Tech Review — WI 91 · Compre Junto

## Rodada r1

`prd_version` revisada: 3 · 2026-11-02 · subagente genérico (exploração `thorough`, banco local só leitura) · gate pela página, respondido em 2026-11-02T15:05Z.

### Envelope `prd-review/v1`

```json
{
  "schema": "prd-review/v1", "work_item_ref": "91", "round": 1, "prd_version": 3,
  "reviewed_at": "2026-11-02T11:23:52-03:00", "skill": "wi-workflow/prd-tech-review", "skill_version": "1.0.0",
  "summary": { "verdict": "changes_requested_blocking", "blocking": 2, "gaps": 7, "questions": 4, "tech_decisions": 9 },
  "findings": [
    { "id": "F1", "key": "cta-do-conjunto-x-barra-fixa-do-celular", "category": "blocking", "owner": "negocio", "severity": "high",
      "title": "No celular, a barra fixa leva só o principal e ignora os adicionais marcados; no computador, dois botões de compra",
      "body": "ProductBuyBar.tsx:32-39 é a única superfície de compra no mobile e chama purchase.add() (só o principal, useProductPurchase.tsx:143). ProductInfo.tsx:185-187 recusa duas ações primárias." },
    { "id": "F2", "key": "combinar-acabamento-sem-base-no-catalogo", "category": "blocking", "owner": "negocio", "severity": "high",
      "title": "'Combinar o acabamento' não tem base no catálogo de hoje",
      "body": "Banco local: 7 correntes são produtos separados por acabamento (eixo só Tamanho); acabamento do pingente em 'Tipos de elo' (6 grafias) ou 'Cor', valores divergentes ('Folheado a ouro (Prata 925)', 'Prata 925 Folheado a Ouro'…)." },
    { "id": "F3", "key": "adicional-irrelevante-para-variacao-chaveiro", "category": "question", "owner": "negocio", "severity": "medium",
      "title": "147 produtos oferecem 'Chaveiro' como opção do principal; a corrente continua oferecida" },
    { "id": "F4", "key": "botao-do-conjunto-com-principal-indisponivel", "category": "gap", "owner": "negocio", "severity": "medium",
      "title": "O bloco e o botão com o principal indisponível ou sem adicional marcado" },
    { "id": "F5", "key": "teto-de-pecas-por-lista", "category": "gap", "owner": "tech_prd_edit", "severity": "medium",
      "title": "Sem teto de peças por lista (URL do .in(), peso no 390px; molde featured.ts = 12)" },
    { "id": "F6", "key": "lista-oferece-o-proprio-principal", "category": "gap", "owner": "negocio", "severity": "medium",
      "title": "Lista reutilizável pode conter o próprio principal ou peça de outro adicional" },
    { "id": "F7", "key": "identidade-da-linha-acompanha-na-sacola", "category": "question", "owner": "negocio", "severity": "medium",
      "title": "A sacola soma peças iguais (cartStore.ts:85-113); 'acompanha' com peça repetida ou dois principais" },
    { "id": "F8", "key": "definicao-de-comprado-junto-no-relatorio", "category": "question", "owner": "negocio", "severity": "medium",
      "title": "'Comprado junto' no relatório: pela marca ou pela presença (régua do WI 92)" },
    { "id": "F9", "key": "superficies-que-mostram-acompanha", "category": "question", "owner": "negocio", "severity": "low",
      "title": "'Acompanha' no e-mail, na folha de separação e no app do ateliê" },
    { "id": "F10", "key": "variacoes-liberadas-que-deixam-de-existir", "category": "gap", "owner": "tech_prd_edit", "severity": "low",
      "title": "'Nenhuma marcada vale todas' ambígua quando as liberadas deixam de existir" },
    { "id": "F11", "key": "rnf-04-promete-mais-que-o-bloco-calcula", "category": "improvement", "owner": "tech_prd_edit", "severity": "low",
      "title": "RNF-04 cita resolveOrderPricing; o bloco usa a conta de exibição (core/payment/pix)" },
    { "id": "F12", "key": "total-do-conjunto-com-quantidade-do-principal", "category": "gap", "owner": "negocio", "severity": "low",
      "title": "Total do conjunto com quantidade do principal > 1" },
    { "id": "F13", "key": "apagar-lista-em-uso", "category": "gap", "owner": "negocio", "severity": "low",
      "title": "Apagar uma lista em uso (precedente faqs ↔ product_faqs on delete restrict)" },
    { "id": "F14", "key": "corrente-nao-e-variacao-do-pingente", "category": "improvement", "owner": "none", "severity": "info",
      "title": "O Conflito 4 da descoberta não se confirma: 'Tipos de elo' é o acabamento do elo; 121 descrições dizem 'vendida separadamente da corrente'" },
    { "id": "T1", "key": "listas-x-ad-014", "category": "overlap", "owner": "tech", "severity": "medium", "title": "Lista do Compre Junto ≠ coleção: AD novo ao lado do AD-014" },
    { "id": "T2", "key": "marca-acompanha-carrinho-e-order-items", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Marca 'acompanha': carrinho v4, colunas explícitas em create-order" },
    { "id": "T3", "key": "relatorio-de-adesao-rpc-e-regua-ad-055", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Relatório: RPC admin com a régua do AD-055" },
    { "id": "T4", "key": "leitura-da-configuracao-na-pagina", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Configuração embutida no select do produto" },
    { "id": "T5", "key": "estado-de-compra-por-adicional-e-gravacao", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Estado de compra, gravação e add_to_cart para vários produtos" },
    { "id": "T6", "key": "guardas-que-a-feature-toca", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Guardas a estender" },
    { "id": "T7", "key": "conversao-e-queda-de-buy-together-ids", "category": "improvement", "owner": "tech", "severity": "medium", "title": "Conversão de buy_together_ids em duas etapas" },
    { "id": "T8", "key": "gravacao-do-compre-junto-no-formulario-do-produto", "category": "improvement", "owner": "tech", "severity": "low", "title": "Gravação dos adicionais no formulário do produto" },
    { "id": "T9", "key": "evento-ga4-com-varios-itens", "category": "improvement", "owner": "tech", "severity": "low", "title": "GA4: lista própria do bloco e add_to_cart com vários itens" },
    { "id": "T10", "key": "estoque-nao-validado-no-servidor", "category": "improvement", "owner": "none", "severity": "info", "title": "create-order e create-payment não validam estoque; não exige mudança no 91" },
    { "id": "T11", "key": "duas-pecas-com-material-um-envelope", "category": "improvement", "owner": "none", "severity": "info", "title": "Duas peças com material no mesmo pedido: o comportamento de hoje cobre" }
  ]
}
```

O corpo completo de cada finding (evidência com `caminho:linha`) está na leitura do subagente, reproduzido nos itens da página (`corpo`) e resumido abaixo onde virou decisão.

### Respostas da página, por `key`

| key | owner final | escolha | estado |
| --- | --- | --- | --- |
| cta-do-conjunto-x-barra-fixa-do-celular | negocio | botão único que vira "Levar o conjunto"; barra fixa no celular; bloco entre a escolha da variação e o botão | aplicado |
| combinar-acabamento-sem-base-no-catalogo | negocio | levar para um Work Item próprio e lançar o 91 sem ele | aplicado |
| botao-do-conjunto-com-principal-indisponivel | negocio | bloco visível com o botão bloqueado; produto esgotado ⇒ bloco some; nunca adicionais sem o principal | aplicado |
| lista-oferece-o-proprio-principal | negocio | ratificada | aplicado |
| identidade-da-linha-acompanha-na-sacola | negocio | soma à linha existente, que passa a dizer "acompanha"; dois principais ⇒ "acompanha o X e o Y" | aplicado |
| definicao-de-comprado-junto-no-relatorio | negocio | pela marca: entrou pelo bloco e o principal está no pedido; o pedido guarda principal e lista | aplicado |
| superficies-que-mostram-acompanha | negocio | só confirmação, Minha Conta e painel, como está | aplicado (sem edição) |
| adicional-irrelevante-para-variacao-chaveiro | negocio | a dona pode marcar em quais variações do principal um adicional some | aplicado |
| total-do-conjunto-com-quantidade-do-principal | negocio | ratificada | aplicado |
| apagar-lista-em-uso | negocio | lista em uso não pode ser apagada | aplicado |
| teto-de-pecas-por-lista | **tech** (rebaixado) | "é detalhe de implementação — não muda o PRD" | aplicado em Decisões |
| variacoes-liberadas-que-deixam-de-existir | **tech** (rebaixado) | "é detalhe de implementação — não muda o PRD" | aplicado em Decisões |
| rnf-04-promete-mais-que-o-bloco-calcula | tech_prd_edit | ratificada | aplicado |
| listas-x-ad-014 | tech | ratificada | Decisões |
| marca-acompanha-carrinho-e-order-items | tech | ratificada | Decisões |
| relatorio-de-adesao-rpc-e-regua-ad-055 | tech | ratificada | Decisões |
| leitura-da-configuracao-na-pagina | tech | ratificada | Decisões |
| estado-de-compra-por-adicional-e-gravacao | tech | ratificada | Decisões |
| guardas-que-a-feature-toca | tech | ratificada | Decisões |
| conversao-e-queda-de-buy-together-ids | tech | duas etapas; a contagem em produção é conferida pelo usuário antes do deploy | Decisões |
| gravacao-do-compre-junto-no-formulario-do-produto | tech | ratificada | Decisões |
| evento-ga4-com-varios-itens | tech | ratificada | Decisões |
| corrente-nao-e-variacao-do-pingente | none | — | sem item (o item de Fora sobre corrente como variação parte de premissa falsa; inofensivo) |
| estoque-nao-validado-no-servidor | none | — | sem item |
| duas-pecas-com-material-um-envelope | none | — | sem item |

### Aplicado ao `prd.md`

Trechos alterados (antes → depois, resumido; o texto novo é o da escolha, verbatim):
- **Escopo › Dentro**, o bullet do bloco: "logo abaixo da escolha do principal e antes do acordeão, com um botão próprio "Levar o conjunto"" → o botão único (F1).
- **Escopo › Dentro**, bullet "Combinar o acabamento" → removido; **Fora** ganhou "Combinar o acabamento … vai a um Work Item próprio (93)" (F2). CA-03.9 removido.
- **UC-03** intro: "Logo abaixo da escolha do produto principal, antes do acordeão" → "Na coluna de informação, entre a escolha da variação do principal e o botão de compra" (F1).
- **UC-04** intro → o botão de compra da página diz "Levar o conjunto" com adicionais marcados (F1).
- **CA-03.1** → "…disponível para a variação escolhida do principal"; **CA-02.9** novo: a dona marca em quais variações do principal o adicional some (F3).
- **CA-04.8** novo (F4) · **CA-03.7** + exclusão do principal e de peça repetida (F6) · **CA-04.1** + soma à linha e "acompanha o X e o Y" (F7) · **CA-06.1** + definição pela marca (F8) · **CA-03.4** + quantidade do principal (F12) · **CA-01.7** novo (F13) · **RNF-04** reescrito (F11).
- Cenários preliminares: −1 (acabamento), +6.

### Decisões (para a costura — `spec.md`, ou o que o `/feature` usar)

- **D-teto-de-pecas-por-lista** — uma lista tem no máximo 12 peças; a 13ª é recusada no painel com o motivo, sugerindo uma segunda lista (molde `featuredProductsRefusal`, `packages/core/src/home/featured.ts`). Motivo: `.in()` com ids na URL (BUG-20260809) e peso no 390px.
- **D-variacoes-liberadas-que-deixam-de-existir** — "nenhuma marcada vale todas" só quando a dona não marcou nenhuma; se todas as liberadas deixarem de existir, o adicional (ou a peça da lista) sai da loja e o painel avisa; nunca passa a valer todas.
- **D-listas-x-ad-014** — novo AD: a lista do Compre Junto ≠ coleção, sem rota, menu ou sitemap. Tabelas: listas, peças da lista (ordem, variações liberadas) e adicionais por produto (ordem, tipo, alvo — sem título: ajuste do usuário em 2026-11-02 —, variações do principal em que some). Leitura pública filtrada, escrita por `has_role`, guarda de schema no molde `faqSchema`/`fornecedorSchema`; uso contado por VIEW `security_invoker`; vínculo produto→lista `on delete restrict` (CA-01.7).
- **D-marca-acompanha** — campo opcional no item do carrinho (`estrelinha-cart` v3→v4 preservando; chave inalterada), frase derivada na renderização; `create-order` passa a gravar `order_items` por lista explícita de colunas (molde `COLUNAS_DO_PEDIDO`) e descarta a marca cujo principal não está no pedido; a marca guarda principal e lista (CA-06.1). Preço segue recalculado no servidor.
- **D-relatorio** — RPC admin única (`has_role` ⇒ `42501` primeiro, `security definer`, `search_path=''`), régua do AD-055 por fragmento comparado em teste, período em dias de Brasília no banco; entra em `marcacaoSoPorAcao.test.ts`; rota nova ⇒ `rotasSobGuarda`, `navItems`, `focusRoutes`.
- **D-leitura-na-pagina** — configuração embutida no select do produto com FK nomeada (evita PGRST201); produtos dos adicionais e das listas por `useProductsByIds`; esqueleto só quando há adicionais; erro ⇒ página de pé.
- **D-estado-de-compra** — regra pura "o conjunto pode ser levado?" em `entities/product/lib` (ou `core` se o painel validar); `EngravingField` parametrizado por id; `add_to_cart` com vários itens em `core/analytics`. O botão único (F1) faz a barra fixa (`ProductBuyBar`) conhecer o conjunto.
- **D-guardas** — listar por tarefa: `semMaterialNaPaginaDoProduto` (ESCOPO literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança).
- **D-buy-together-ids** — duas etapas: (1) tabelas novas + conversão idempotente (até 3, na ordem do array) + painel sem a coluna; (2) depois do deploy do painel, `drop column`. **O usuário confere a contagem em produção antes do deploy** (banco local: 0 de 734).
- **D-gravacao-no-formulario** — recusas puras em `core/buy-together` (retorno `string | null`); adicionais gravados recortados pelo principal; probe HTTP contra o banco local (`AD-012`).
- **D-ga4** — `addToCartEvent` aceita lista de itens (ou função irmã) em `core/analytics`, com teste de "principal uma vez"; `item_list_id` nos adicionais.

### Leitura humana

Saiu `changes_requested_blocking` (2 bloqueios de negócio), e os dois fecharam no gate: o botão de compra é único e muda de rótulo, e "combinar o acabamento" saiu do 91 para um Work Item próprio. As outras 11 perguntas de produto foram respondidas, inclusive uma regra nova (a dona esconde um adicional por variação do principal). Nada segue aberto. O desenho no Claude Design ainda reflete a versão anterior em três pontos (botão próprio do bloco, combinar o acabamento, sem o "some com Chaveiro").
