# BACKLOG

Itens **deliberadamente adiados** — desenhados, discutidos ou descobertos, mas fora do escopo de
qualquer feature ativa. Cada item registra *o que é*, *por que ficou de fora* e *o que precisa ser
decidido* antes de virar feature.

Não é lista de ideias: só entra aqui o que já tem lastro (um artboard, um achado de código, uma
decisão de adiar registrada no [`STATE.md`](./STATE.md)).

---

## BL-001 — Geração de texto por IA no cadastro de produto

- **Status**: adiado · **Registrado em**: 2026-07-31 · **Decisão**: [`AD-011`](./STATE.md)
- **Origem**: desenho no Paper, arquivo **Nanapin**, página **Backoffice - Produtos**.

**O que é.** Dois botões desenhados e não implementados:

| Botão | Artboard | O que faria |
| ----- | -------- | ----------- |
| **Sugerir com IA** | *Produto — aba Geral* | Gerar a descrição do produto |
| **Gerar com IA** | *Produto — aba SEO* | Gerar título e descrição de SEO (respeitando os limites de 60 / 160 caracteres já exibidos na tela) |

**Os botões continuam no Paper de propósito** — a decisão foi não implementar agora, não descartar a
ideia. Quem for implementar a `11-product-form-v2` **não deve** implementá-los a partir do artboard;
está declarado no [`context.md` do programa](./features/07-product-catalog-admin/context.md).

**Não confundir com alt-text.** A geração de **alt-text** (`Gerar` na aba Mídia e "Gerar alt-text de
cada render" no estúdio) **está no escopo** da [`12-product-media-studio`](./features/12-product-media-studio/spec.md),
como template determinístico (`PMD-01`, A20). Os artboards nunca a rotulam como IA, e ela não precisa
de modelo nenhum.

**Por que ficou de fora.** Está desenhado sem uma única AC, não aparece em nenhum dos 22 itens que o
próprio desenho priorizou, e o projeto **não tem provedor de IA**. Entrar agora arrastaria escopo que
ninguém dimensionou.

**O que precisa ser decidido antes de virar feature:**

1. **Provedor e modelo** — a orientação do repositório (`CLAUDE.md` global) é usar os modelos Claude
   mais capazes em aplicações novas; para geração de copy curta, um modelo rápido tende a bastar. Falta
   escolher e medir.
2. **Onde roda** — edge function nova (mesmo molde de `send-email`: `index.ts` só wiring, lógica em
   `handlers.ts` com deps injetadas, testada em `@nanapin/functions`) ou chamada direta do backoffice?
   A primeira opção mantém a chave fora do bundle; é o padrão já estabelecido por `AD-004`/`AD-005`.
3. **Custo por chamada e teto** — quantas gerações por produto, com ou sem limite.
4. **Latência no caminho do save** — a lição de `AD-008` se aplica: chamada de saída no caminho de
   request é `await` limitado por `AbortController`, nunca trabalho em background. Aqui é ainda mais
   simples, porque a geração é acionada por botão, não pelo save — mas o teto de tempo continua valendo.
5. **Fallback quando a API cai** — o botão desabilita, avisa, ou o campo segue editável à mão? (A
   resposta óbvia é a terceira, mas precisa estar escrita.)
6. **O texto gerado é rascunho ou definitivo** — entra no campo para revisão do admin (provável) ou
   salva direto?

**Tamanho estimado**: feature pequena — 1 edge function, 2 botões, 2 campos. O custo real está nas
decisões acima, não no código.

---

## BL-002 — `packages/core` e `packages/supabase` estão fora do `pnpm lint`

- **Status**: aberto · **Registrado em**: 2026-08-03
- **Origem**: achado do lote 1 da [`17-promocoes-desconto-progressivo`](./features/17-promocoes-desconto-progressivo/tasks.md), medido durante o gate de fecho da Phase 2.

**O que é.** Nenhum dos dois pacotes tem script `lint`, e `pnpm lint` é `turbo run lint` — então o
Turbo nunca inspeciona nenhum dos dois. Consequência concreta: `packages/core/src/payment/pricing.ts`,
que é **o código de dinheiro do projeto** (soma do pedido, cupom, order bump e agora a faixa
progressiva), é type-checado por `tsc` e coberto por vitest, mas **não passa por ESLint nenhuma vez**.
O mesmo vale para os tipos de domínio em `packages/supabase`.

**Por que ficou de fora da 17.** Ligar o lint nos dois pacotes revela um número desconhecido de erros
pré-existentes, e isso **move a baseline de lint do projeto** (hoje 30 err / 9 warn) no meio de uma
feature cujo gate é exatamente *"sem erros novos"*. Fazer as duas coisas juntas deixaria o gate
ilegível: não daria para distinguir erro novo da feature de erro que sempre existiu e acabou de ficar
visível.

**O que precisa ser decidido antes de virar tarefa:**

1. **Medir primeiro.** Rodar `npx eslint packages/core packages/supabase` e anotar o número real, sem
   consertar nada. Sem essa medida não se sabe se é tarefa de 10 minutos ou de meio dia.
2. **As fronteiras FSD valem para pacotes?** `eslint.fsd.mjs` foi escrito para as camadas dos *apps*
   (`app → pages → widgets → features → entities → shared`). Pacote não tem essas camadas; aplicar a
   config dos apps produziria ruído. Provável resposta: config própria, só com as regras de TS.
3. **A baseline do `CLAUDE.md` passa a ter quatro números** (store, backoffice, core, supabase) em vez
   de dois — e o texto que descreve a dívida precisa acompanhar.

**Tamanho estimado**: desconhecido até o passo 1. O código é pequeno; o risco está no número de erros
que aparecem.

---

## BL-003 — O seed deixa as categorias planas: a árvore `Bottons › …` não sobrevive a `db reset`

- **Status**: aberto · **Registrado em**: 2026-08-03
- **Origem**: probes do lote 1 da [`17-promocoes-desconto-progressivo`](./features/17-promocoes-desconto-progressivo/tasks.md) (T2/T3), depois de um reset completo do banco local.

**O que é.** Depois de `db reset` + seed, as 8 categorias nascem **sem hierarquia**: todas com
`parent_id` nulo. A árvore `Bottons › {Academia, Anime, K-Pop, Filmes, Bandas, Games, Séries, Mangá,
Kawaii}` — que o Handoff da 16 descreve como "a árvore real" e que o `CLAUDE.md` documenta como *"no
banco real os universos são filhas de Bottons"* — foi montada **à mão** em algum momento e não está em
migration nem em seed.

**Por que isso importa mais do que parece.** Quatro consequências já visíveis:

1. A premissa **A9** da spec da 17 ("elegibilidade inclui descendentes, senão escopo `Bottons` não
   pega nada") descreve o banco de *uma máquina*, não o que um ambiente novo produz. Num ambiente
   recém-criado, uma promoção escopada em `Bottons` não pegaria produto nenhum — não por bug da
   feature, mas porque não existe filha.
2. `browseCategories` na loja "pula o guarda-chuva" justamente porque existe um guarda-chuva. Com
   árvore plana, a grade da home se comporta de outro jeito.
3. A **tela de kit da 18** assume que o escopo alcança produtos.
4. Qualquer QA "com dados reais" num ambiente novo está exercitando **outra taxonomia** que não a
   descrita na documentação.

**Está encavalado com um bug já conhecido.** `supabase db reset` ainda morre no `TEMP TABLE _pal` do
seed (`BUG-20260801-seed-temp-table-quebra-db-reset`) — ou seja, o caminho do seed já não roda limpo,
e foi preciso um contorno por `psql` para os probes da 17. Consertar a hierarquia sem consertar isso
antes é construir sobre um passo que falha.

**O que precisa ser decidido antes de virar tarefa:**

1. **O seed passa a ser a fonte da taxonomia pretendida?** Se sim, ele precisa escrever `parent_id` e
   os vínculos em `product_categories` — e aí a documentação para de mentir. Se não, a árvore é
   *fixture de ambiente* e isso tem de estar escrito onde hoje se afirma o contrário.
2. **Ordem**: o `_pal` primeiro. Sem seed que roda, nada do resto é verificável.
3. **Quem mais depende disso** — auditar o que no código assume raiz com filhas antes de mudar o seed,
   para não trocar um desalinhamento por outro.

**Tamanho estimado**: pequeno em código (um bloco de seed), médio em verificação — mexe na premissa de
navegação da loja.

---

## BL-004 — A vigência morre à meia-noite do dia prometido

**Descoberto em**: 2026-08-03, feature 18 (telas internas de Descontos), ao trocar
`<input type="date">` pelo seletor de calendário.

**O que é.** `valid_until` é gravado como **meia-noite local** do dia escolhido, e os dois leitores
comparam `new Date(coupon.valid_until) < now`. Logo, um cupom (ou promoção) configurado como
"válido até 30/09" **para de valer às 00:00 de 30/09** — o dia que a tela promete não vale.

**Onde.** A gravação é `isoFromDateOnly` (`apps/backoffice/src/shared/lib/dateOnly.ts`), usada pelas
duas telas de Descontos. A leitura acontece em dois lugares, os dois no caminho do dinheiro:

- `packages/core/src/hooks/useCoupons.ts` → `validateCoupon` (`'Cupom expirado.'`);
- `supabase/functions/mercado-pago/handlers.ts` → o filtro de vigência das promoções.

E há um terceiro leitor, de exibição: `couponStatus`/`promotionStatus` mostram `Expirado` um dia antes
do que a dona da loja esperaria.

**Por que ficou de fora da 18.** A 18 é conversão de moldura (modal ⇒ tela) e padronização de
listagem; o gate dela é "sem erro novo" e "regra intacta". Corrigir isto **muda semântica de
gravação** e exige AC própria com teste nas duas pontas — inclusive em `@nanapin/functions`, que é
onde o servidor decide se cobra o desconto. Mexer nisso no meio de uma feature de UI misturaria uma
mudança de comportamento de cobrança com uma troca de componente.

**O que precisa ser decidido antes de virar tarefa:**

1. **Onde mora o "fim do dia"** — na gravação (`valid_until` = 23:59:59.999 local) ou na comparação
   (`< startOfNextDay(valid_until)`). A segunda é mais segura para o que **já está gravado**: mudar só
   a escrita deixaria as linhas antigas com a semântica velha, e as duas conviveriam sem marca no dado.
2. **`valid_from` tem o problema simétrico?** Meia-noite local é o começo certo do dia — provavelmente
   não muda. Precisa ser verificado, não suposto.
3. **Migration de correção**, se a decisão for mudar a escrita: as linhas existentes precisariam de
   `+1 dia - 1ms`, e isso é escrita em dado de cobrança.

**Tamanho estimado**: pequeno em código (três leitores), médio-alto em verificação — é caminho de
dinheiro, e a prova precisa cobrir "o último dia ainda vale" nas duas pontas.

---

## BL-005 — Clientes e histórico de pedidos da Nuvemshop

- **Status**: adiado · **Registrado em**: 2026-08-08 · **Decisão**: [`AD-016`](./STATE.md)
- **Origem**: definição de escopo na abertura da conversão para Uma Estrelinha (`C-04`).

**O que é.** A [`21-catalogo-nuvemshop`](./features/21-catalogo-nuvemshop/spec.md) importa **só o
catálogo** — categorias, produtos, variantes, preços e imagens. A base de clientes e o histórico de
pedidos que a Uma Estrelinha acumulou na Nuvemshop ficam de fora.

**Por que ficou de fora.** Três coisas que o catálogo não tem:

1. **Dado pessoal.** Nome, e-mail, telefone, CPF e endereço de cliente real. Importar é tratamento de
   dado sob LGPD, com base legal, retenção e direito de eliminação — não é `INSERT`.
2. **Reconciliação de identidade.** A loja nova autentica por código de 6 dígitos e Google
   (`supabase.auth`); a Nuvemshop tem a própria conta. Um cliente importado **não tem login** até
   entrar pela primeira vez, e casar as duas identidades pelo e-mail é uma decisão, não um detalhe.
3. **Pedido é snapshot de um schema que não é o nosso.** `orders` daqui carrega `promotion_discount`,
   `mp_order_id`, snapshot de frete e itens com variação. Um pedido histórico não tem nada disso, e
   inventar valor para caber é pior que não ter o pedido.

**O que precisa ser decidido antes de virar feature:**

1. **Para que serve o histórico** — atendimento ("o que essa cliente já comprou") é caso diferente de
   relatório de faturamento. O primeiro talvez se resolva com uma tabela **somente-leitura** separada
   de `orders`, sem tentar caber no schema atual.
2. **Base legal e comunicação** — a cliente precisa saber que os dados dela mudaram de sistema.
3. **O que fazer com pedido em aberto** na hora do corte.

**Tamanho estimado**: médio em código, alto em decisão. Nada aqui é urgente enquanto as duas lojas
não trocarem de dono do tráfego.

---

## BL-006 — Re-skin do backoffice na identidade Uma Estrelinha

- **Status**: adiado · **Registrado em**: 2026-08-08 · **Decisão**: [`AD-016`](./STATE.md)
- **Origem**: definição de escopo na abertura da conversão (`C-05`).

**O que é.** Na [`20-rebrand-uma-estrelinha`](./features/20-rebrand-uma-estrelinha/spec.md) o
backoffice só tem os **tokens renomeados** (`--nana-*` → `--estrelinha-admin-*`), com os valores
roxo/rosa/navy inalterados. As ~30 telas do painel continuam vestindo a paleta herdada.

**Por que ficou de fora.** Painel interno não carrega marca — quem o usa é uma pessoa só, que sabe
onde está. E o re-skin tocaria `packages/ui`, que é o território estável do backoffice: a separação
entre os dois temas depende da **ordem de dois imports** em `main.tsx` e está travada por
`importOrder.test.ts`. Misturar isso com uma feature cujo gate é "sem erro novo" trocaria risco alto
por ganho estético.

**O que precisa ser decidido antes de virar feature:**

1. **Um tema ou dois.** Unificar significa a loja e o painel compartilharem `packages/ui`, e aí a
   proteção de ordem de import deixa de fazer sentido — é simplificação real, mas é decisão de
   arquitetura, não de cor.
2. **A paleta Uma Estrelinha serve para densidade de painel?** `ground #FAF8F4` com `primary #34495E`
   foi desenhada para página de marketing e vitrine. Tabela densa, badge de status e gráfico exigem
   uma escala de cinzas e um conjunto semântico (sucesso/aviso/erro) que o DS herdado não define.
3. **Vale o custo?** ~30 telas, com os testes de cada uma.

**Tamanho estimado**: grande e inteiramente opcional.
