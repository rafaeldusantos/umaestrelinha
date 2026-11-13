## 11 · [apps/store · apps/backoffice · packages/core] BUG-002 — [Preço de campanha] Peça com “de/por” leva os 10 % sobre o “por”: R$ 314,91 em vez de R$ 336,60

**Status:** done

`BUG-002` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L2)

**Objetivo.** Peça com "de/por" marcada numa campanha mostra e cobra o menor entre o "por" e o "de" com o desconto, igual em todas as superfícies e no feed.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (tokens, página do produto, carrinho, checkout); `DESIGN.md`; `apps/backoffice/CLAUDE.md`; `packages/core/CLAUDE.md` › Dinheiro. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** nada desta rodada; as tarefas 01–09 (`done`) deixaram a campanha no ar.

**Onde mora.** Preço de campanha — loja (`apps/store/src/entities/product/lib/mapProduct.ts`, `apps/store/src/entities/cart/lib/campaignPricing.ts`, `apps/store/src/entities/campaign/model/types.ts`) e painel (`apps/backoffice/src/features/product-form/ui/CampaignPriceCards.tsx`, `apps/backoffice/src/entities/campaign/ui/CampaignCardPreview.tsx`); a regra pura é de `packages/core/src/campaigns/` (o feed, que já dá R$ 336,60, a usa). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-002 — [Preço de campanha] Peça com “de/por” leva os 10 % sobre o “por”: R$ 314,91 em vez de R$ 336,60

#### Resumo

A dona marca 10 % da Black Friday numa peça que já tinha "de/por" ("de" R$ 374,00, "por" R$ 349,90). No painel, o
topo do cartão da campanha diz R$ 314,91 e a tabela por variação, na mesma tela, diz R$ 336,60. Na loja, o cartão, a
página, a sacola, o checkout e o pedido gravado cobram R$ 314,91, com "De R$ 349,90" riscado. Pela regra da
campanha, o preço seria o menor entre o "por" de hoje e o "de" com 10 %: R$ 336,60, com "De R$ 374,00". A loja dá os
dois descontos somados, cobra R$ 21,69 a menos por unidade, mostra um "De" que não é o da peça, e o feed do Google
anuncia R$ 336,60 para a mesma peça.

**Origem:** sessões CH-01, CH-03 e CH-04 · painel e loja locais do worktree `store__feature-102`

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-01 Adri (a prévia do painel diz dois preços, e a loja cobra menos do que a regra
  manda) — outras: PER-02 Marina e PER-03 Helena (veem um "De" que não é o preço cheio da peça)
- **Jornada e passo:** J-01, passo 5 (marcar M-C com 10 %); J-03, passos 1–2 (olhar a vitrine); J-04, do passo 1 até
  o pedido
- **Frequência:** sempre — visto em todas as superfícies abertas com M-C
- **Contorno:** nenhum
- **Gravidade proposta na sessão:** high (CH-01, CH-03, CH-04) — mantida

#### Ambiente

- **URL:** painel `http://localhost:8093/admin` › Produtos › M-C › "Preços & variações"; loja
  `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925`, `/ofertas`, Home, sacola, checkout,
  `/pedido/:id`
- **Tela:** Painel · Produto e loja (cartão, página do produto, sacola, checkout, pedido) · **Componente:** cartão da
  campanha (painel) e preço com desconto da peça (loja)
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900 (painel, página, sacola, pedido) e
  390 × 844 (Home e `/ofertas`)
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Como `admin-loja`, com a campanha "Black Friday" (10 %, 15 %, 20 %) em vigência, abrir no painel a peça
   "Pulseira Afetiva Esferas com Leite Materno em Prata 925" (variação com "de" R$ 374,00 e "por" R$ 349,90), aba
   "Preços & variações"
2. No cartão "Black Friday", escolher 10 % e ler o topo do cartão e a tabela por variação; salvar
3. Sem login, abrir na loja `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925` e ler o preço
4. Tocar em "Adicionar à sacola", ir ao checkout como convidada, pagar com PIX e abrir `/pedido/:id`

#### Esperado

O preço da peça na campanha é o **menor** entre o "por" de hoje e o "de" com 10 %: min(R$ 349,90; R$ 374,00 × 0,9) =
**R$ 336,60**, com "De R$ 374,00" riscado — igual no painel (topo e tabela), no cartão, na página, na sacola, no
checkout, no pedido e no feed do Google. Nunca o "por" com mais 10 % em cima (R$ 314,91).

**Fonte:** PRD CA-06, RN-06 e RN-04 (um só dono do preço); `spec.md` I-03; TC-FUNC-003 passo 5; TC-FUNC-008

#### Observado

- Painel (passo 2): topo do cartão "R$ 349,90 → R$ 314,91"; tabela "Variação 1 · R$ 374,00 · R$ 336,60"
- Loja, Home e `/ofertas` (390): "De R$ 349,90" riscado, **R$ 314,91**, "4x de R$ 78,73 sem juros"
- Página do produto (1440): "BLACK FRIDAY −10%", R$ 314,91, "R$ 349,90 · 4x de R$ 78,73", R$ 292,87 no Pix
- Sacola: "de R$ 349,90 por R$ 314,91"
- Pedido #0604: M-C "de R$ 349,90 por R$ 314,91"; "Desconto de campanha −R$ 111,99" (= 77,00 da M-A + 34,99 da M-C);
  Total R$ 579,31, igual ao checkout
- Feed do Google local (CH-05): M-C `374.00 BRL` / `336.60 BRL` — diferente da página

#### Evidência

- `screenshots/CH-01-08-MC-10-de-por.png` — no painel, o topo com R$ 314,91 e a tabela com R$ 336,60 na mesma tela
- `screenshots/CH-03-02-bloco-home.png` — o cartão da M-C na fileira da Home, com R$ 314,91 e "De R$ 349,90"
- `screenshots/CH-04-11-mc-sacola-1440.png` — a linha da M-C na sacola, "de R$ 349,90 por R$ 314,91"
- `screenshots/CH-04-12-pedido-mc.png` — o pedido #0604 gravado com R$ 314,91

#### Ocorrências

| Sessão | Persona       | Passo                                                    | Evidência                                    |
| ------ | ------------- | -------------------------------------------------------- | -------------------------------------------- |
| CH-01  | PER-01 Adri   | passo 15 do log — cartão da campanha no painel            | `screenshots/CH-01-08-MC-10-de-por.png`      |
| CH-03  | PER-02 Marina | passos 02 e 04 do log — fileira da Home e `/ofertas`      | `screenshots/CH-03-02-bloco-home.png`        |
| CH-04  | PER-03 Helena | passos 14, 15 e 17 do log — página, sacola, pedido #0604  | `screenshots/CH-04-11-mc-sacola-1440.png`, `screenshots/CH-04-12-pedido-mc.png` |
| CH-05  | PER-01 Adri   | passo 09 do log — o feed traz R$ 336,60, a página R$ 314,91 | —                                          |

#### Relacionados

- **TC:** TC-FUNC-008, TC-FUNC-003 (passo 5)
- **Charter:** CH-01, CH-03, CH-04 (o feed, CH-05)
- **Critério:** CA-06, CA-10 (paridade página × feed)
- **Protótipo:** —
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-002 · [Preço de campanha] Peça com “de/por” leva os 10 % sobre o “por”: R$ 314,91 em vez de R$ 336,60 · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- RN-06 / CA-06 / `spec.md` I-03: o preço da campanha é o **menor** entre o "por" de hoje e o "de" com o desconto, calculado sobre o `compare_price` da própria variação; o "De" riscado é o preço cheio da peça. O feed do Google local já dá o valor certo (R$ 336,60 para M-C) — a regra de `core` está certa no feed; a loja e o topo do cartão do painel não chegam a ela pelo mesmo caminho. O conserto faz todas as superfícies passarem pela **mesma** função de `core` (RN-04, um dono do preço), sem uma segunda conta na tela.
- O pedido #0604 do banco local foi gravado com R$ 314,91: não se mexe nele (Regra 6 do orquestrador — corrija a escrita para valer daqui para frente). O servidor (`checkout`, `mercado-pago`) já relê o preço pelo banco: confira se ele recalcula com a regra certa e, se não, o conserto inclui o caminho do servidor.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Caso de `mapProduct` (e de `campaignPricing`, se for ele quem calcula na sacola) com uma variação "de" R$ 374,00 / "por" R$ 349,90 a 10 % ⇒ R$ 336,60 e "De" R$ 374,00, vermelho antes do conserto; e o par sem "de" (R$ 385,00 a 20 % ⇒ R$ 308,00) continuando verde.
- Caso do cartão da campanha no painel: o topo e a tabela por variação dão o mesmo valor (R$ 336,60) para a mesma variação.
- Paridade com o feed: o mesmo valor que `core/shopping`/feed produz para a peça (régua de `shoppingParity`, se couber).

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-002.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-002 foi visto funcionando no app local (relate como conferiu).

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
