## 18 · [packages/core · apps/store] BUG-009 — [Pedido] Com promoção progressiva, o resumo omite o “Desconto PIX” e as linhas não fecham o total

**Status:** done

`BUG-009` — 102 · fix task da QA, rodada 2 (`qa/qa-result.md`, lote L3)

**Objetivo.** O resumo do pedido traz as mesmas linhas do resumo do checkout — inclusive "Desconto PIX" quando há promoção progressiva — e as linhas fecham o Total.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (carrinho, checkout, pedido); `packages/core/CLAUDE.md` › Dinheiro; `supabase/CLAUDE.md` (edge functions, servir no local com `--env-file` de chaves inválidas). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** a tarefa 17 (BUG-002, onda anterior), que mexe na mesma tela do pedido (`apps/store/src/entities/order/`).

**Onde mora.** As linhas de desconto do pedido em `packages/core/src/orders/summary.ts` (quem decide quais linhas aparecem, inclusive `pix`) e a tela do pedido da loja (`apps/store/src/entities/order/ui/OrderItemsSummary.tsx`, `apps/store/src/pages/OrderConfirmationPage.tsx`); o checkout mostra a linha certa (`apps/store/src/features/checkout/ui/OrderSummary.tsx`). Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-009 — [Pedido] Com promoção progressiva, o resumo omite o “Desconto PIX” e as linhas não fecham o total

#### Resumo

A cliente compra quatro peças: uma da campanha e três comuns que alcançam a promoção progressiva. Ela paga com PIX e
abre o pedido para conferir. O checkout mostrava "Desconto PIX −R$ 88,45". No pedido, essa linha não aparece:
Subtotal R$ 1.379,80, Desconto de campanha −R$ 13,30, Desconto progressivo −R$ 102,99 e Frete R$ 19,90 somam
R$ 1.283,41, mas o Total diz R$ 1.194,96. O total está certo e é igual ao do checkout. Só que quem confere a conta
linha a linha não chega nele. Num pedido sem a promoção (#0606), a linha "Desconto PIX" aparece.

**Origem:** sessão CH-04 (rodada 2, confirmação) · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-03 Helena, a cliente que confere o total antes e depois de pagar. Outras: PER-01
  Adri (o pedido que ela e a cliente veem não explica o valor)
- **Jornada e passo:** J-04, passo 6 (abrir o pedido criado)
- **Frequência:** sempre que o pedido tem promoção progressiva e PIX (1 pedido visto, sem ambiguidade na tela)
- **Contorno:** nenhum. O total está certo, mas não há como ver de onde ele vem
- **Gravidade proposta na sessão:** nenhuma. A sessão registrou no Debrief, como sugestão. A triagem leva a high
  porque as linhas do pedido não somam o total. Pode ser anterior ao WI (a promoção já existia). Mesmo assim vira
  bug, porque é `high`

#### Ambiente

- **URL:** `http://localhost:8092/pedido/:id` (pedido #0608)
- **Tela:** Pedido · **Componente:** resumo de valores do pedido
- **Branch / build:** `feature/102`, HEAD `36196100`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, com a sacola vazia, a "Dia das Mães" em vigência (M-C com 10 %) e a promoção "QA102 Progressiva
   Pulseiras" ligada (3 peças ou mais da coleção `pulseiras-afetivas` ⇒ 10 %), acrescentar à sacola:
   - a M-C (`/produtos/pulseira-esferas-leite-materno-prata-925`)
   - duas unidades da M-E (`/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925`)
   - a M-E2 (`/produtos/pulseira-afetiva-redonda-com-coto-umbilical-em-prata-925`)
2. Na sacola, conferir "Desconto progressivo"; ir ao checkout e escolher PIX (o resumo mostra a linha "Desconto PIX")
3. Preencher como convidada e tocar em "Pagar … com PIX"
4. Abrir `/pedido/:id` e ler o resumo de valores

#### Esperado

O resumo do pedido traz as mesmas linhas do resumo do checkout: Subtotal, Desconto de campanha, Desconto progressivo,
Desconto PIX e Frete. Elas somam o Total, como no pedido #0606.

**Fonte:** BUG-003 (Esperado confirmado no Gate 3 de 2026-11-13: checkout e pedido com as mesmas linhas, o mesmo
subtotal e o mesmo total); TC-FUNC-005 (a sacola, o checkout e o pedido dão o mesmo resultado); TC-FUNC-016 passo 4;
PRD CA-13 (o pedido guarda o que foi cobrado)

#### Observado

- Checkout (1440): "Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo −R$ 102,99 ·
  PIX −R$ 88,45 · Frete R$ 19,90 · Total R$ 1.194,96"
- Pedido #0608: "Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo −R$ 102,99 · Frete
  R$ 19,90 · Total R$ 1.194,96", sem a linha "Desconto PIX". As linhas somam R$ 1.283,41
- Pedido #0606 (M-A + M-E, cupom, sem promoção): tem a linha "Desconto PIX −R$ 45,68", e as linhas fecham o total

#### Evidência

- `screenshots/CH-04-r2-12-checkout-promo-1440.png`: o checkout com a linha do PIX
- `screenshots/CH-04-r2-13-pedido-0608-promo.png`: o pedido #0608 sem a linha "Desconto PIX"
- `screenshots/CH-04-r2-05-pedido-0606-390.png`: um pedido sem a promoção, com a linha "Desconto PIX"

#### Relacionados

- **TC:** nenhum que tenha falhado por ele (TC-FUNC-016 ficou `skip`: o passo do Compre Junto não rodou)
- **Charter:** CH-04
- **Critério:** CA-13, CA-17
- **Protótipo:** —
- **Bugs:** BUG-003 (resolvido nesta rodada: checkout × pedido, sem promoção)

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-009 · [Pedido] Com promoção progressiva, o resumo omite o “Desconto PIX” e as linhas não fecham o total · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- Esperado do BUG-003 (Gate 3 da rodada 1): checkout e pedido com as mesmas linhas, o mesmo subtotal e o mesmo total; PRD CA-13 (o pedido guarda o que foi cobrado).
- Escopo decidido (2026-11-13, inline por delegação do humano, depois de a T18 abortar duas vezes pela ressalva do árbitro): o defeito **é anterior ao WI 102** — a lógica de linhas de `packages/core/src/orders/summary.ts` na `master` já tinha o mesmo comportamento —, e **a correção entra neste WI** mesmo assim: o resumo do pedido é superfície que este WI alterou (ganhou a linha "Desconto de campanha"), o defeito é de exibição de dinheiro e o conserto é pequeno. **Não pare por o defeito ser anterior ao WI**: corrija. Registre no retorno onde estava a causa (gravação de `pix_discount` no servidor ou montagem das linhas) e, se a causa estiver no servidor, o conserto vale para os pedidos gravados daqui em diante.
- Pedido #0608 já gravado não se toca (Regra 6).

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Caso de `core/orders/summary` com um pedido que tem `promotion_discount` e `pix_discount` (o #0608: subtotal 1.379,80, campanha 13,30, progressivo 102,99, PIX 88,45, frete 19,90): a lista traz a linha "Desconto PIX" e as linhas somam o total R$ 1.194,96; vermelho antes do conserto. O par sem promoção (#0606) continua verde.
- Caso da tela do pedido renderizando essas linhas.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps); mudança em `supabase/functions` roda a suíte de `functions`.
- Os guardas do repositório continuam verdes sem afrouxar asserção.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos #0603–#0608, marcações, campanhas da QA): corrija a escrita para valer daqui para frente.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-009.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-009 foi visto funcionando no app local (relate como conferiu).

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
