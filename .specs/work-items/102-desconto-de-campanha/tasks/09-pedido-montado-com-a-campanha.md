## 09 · [supabase · packages/core · apps/backoffice · apps/mobile-adm] Pedido montado pela dona — a campanha no painel e no app do ateliê

**Status:** done

`RN-04 (pedido montado) · RN-16` — 102

**Objetivo.** No pedido que a dona monta, no painel ou no app do ateliê, a peça marcada entra com o preço da campanha durante a vigência, o cupom não vale para ela, e o preço fica travado na proposta.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `packages/core/CLAUDE.md` › `proposals` · Dinheiro; `apps/backoffice/CLAUDE.md` › (a seção do pedido montado); `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94); `supabase/CLAUDE.md` › Edge functions. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (Pedido montado); §7 · spec.md — Decisões (T10, H-06).

**Depende de.** 01 — `core/campaigns`. 05 — `resolveOrderPricing` com `campaign`, `couponRefusal` com o subtotal elegível e o nome da campanha, as colunas do pedido e `supabase/functions/_shared/campaigns.ts`. Confira que existem antes de começar.

### Critérios de aceite

- **RN-04 · Um dono do preço de campanha, em `core`.** A mesma função responde "quanto custa esta peça/variação
  agora" para o cartão, a página do produto, a sacola, o checkout, a function `checkout` (`unit_price`,
  `full_unit_price`), a function `mercado-pago` (que reprecifica pelo banco), o feed do Google e o JSON-LD. Uma tela
  calculando à parte daria um preço exibido e outro cobrado — o "defeito 01" no caminho do dinheiro. A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.

- **RN-16 · Cupom não vale em peça de campanha** (Decisão D-03). Durante a vigência, a linha da sacola com peça
  marcada fica **fora da base do cupom**: o cupom de percentual ou de valor desconta só das outras linhas. Sacola só
  com peças de campanha ⇒ o cupom é recusado com o motivo ("Este cupom não vale para peças da Black Friday."; o nome
  vem da campanha). A regra mora em `resolveOrderPricing` (`packages/core/src/payment/pricing.ts`), que a loja e o
  `mercado-pago` chamam — é a primeira mudança desta campanha no código de dinheiro, e a suíte de `payment` ganha os
  casos sem perder nenhum. O que acompanha a regra (D-06):
  - o **PIX** continua valendo sobre o total, com peça de campanha ou não;
  - o **cupom de frete grátis** continua valendo: ele zera o frete, não desconta a peça;
  - o **valor mínimo** do cupom é conferido sobre as linhas que entram na base (sem as peças de campanha).
  - o **frete grátis por valor** conta a soma do que a cliente paga pelas peças, já com o desconto da campanha.

- **CA-03** Marcar 20% numa peça de R$ 209,90, em vigência ⇒ cartão, página do produto, sacola e checkout mostram
  R$ 167,92 com R$ 209,90 riscado e o selo "BLACK FRIDAY · −20%"; o servidor cobra R$ 167,92 (antes de PIX, cupom e
  frete).

- **CA-16** Sacola com uma peça de campanha (R$ 167,92) e uma peça comum (R$ 100,00), cupom de 10%: o cupom desconta
  R$ 10,00 (só da comum); a loja e o servidor dão o mesmo total. Sacola só com peças de campanha: o cupom é recusado
  com o motivo. Cupom de frete grátis continua zerando o frete. O PIX de 5% vale sobre o total.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `order-proposals` (`supabase/functions/order-proposals/handlers.ts:369,376,433,481-505`) | VOCÊ MUDA | a campanha pelo leitor único, com o relógio da function | o preço de campanha na montagem, travado na proposta; o cupom recusado para a peça de campanha |
| `packages/core/src/proposals/pricing.ts`, `proposals/piece.ts` | VOCÊ MUDA | a campanha da peça | o preço da peça na montagem |
| painel `apps/backoffice/src/features/order-proposal/*` e app `apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts`, `features/order-proposal/model/sacola.ts`, `ui/FolhaDaVariacao.tsx` | VOCÊ MUDA | | o preço de campanha mostrado (a dona ainda pode dar um desconto combinado por cima) |
| `_shared/campaigns.ts`, `resolveOrderPricing`, `couponRefusal` | JÁ EXISTE (tarefa 05). Consuma; não altere. | `liveCampaignMarks(client, now, productIds)`; por linha, `campaign: { percent, compare_price? }` com `unit_price` = preço de TABELA (a linha só é de campanha quando a campanha baixa o preço dela — `lineCampaignPercent`); `couponRefusal(row, { subtotal, now, eligibleSubtotal, campaignName })`, com `couponEligibleSubtotal(input)` de `payment/pricing.ts` | `{ error, campaign: { id, name } \| null, percentOf: Map<productId, percent> }`; `outcome.campaignDiscount` (só quando alguma linha trouxe `campaign`); a recusa `campaignCouponRefusal(nome)` |

### Decisões já tomadas

- T10: `couponRefusal` com o subtotal elegível e o nome da campanha, chamado também por `order-proposals`.
- H-06: a function lê a campanha só por `_shared/campaigns.ts`; a cópia da promoção em `promocoesVigentes` não é tocada.
- O preço travado na proposta (feature 89) continua valendo depois do fim da campanha (D-05).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| preço na montagem | `supabase/functions/order-proposals/handlers.ts:433 — resolveItemPrice` |
| leitura do app com papel | `apps/mobile-adm/src/shared/api/lerComPapel.ts` (o guarda `leituraSoComPapel`) |

### Testes

- Handler de `order-proposals`: montada em vigência, a peça marcada sai com o preço de campanha e trava; o cupom recusado para a peça de campanha com a frase da campanha; fora da vigência, o preço de sempre.
- `core/proposals`: o preço da peça com campanha.
- Página real do painel e do app: a montagem mostra o preço de campanha na peça marcada.
- Guardas do app (`escritaSoPelaPorta`, `leituraSoComPapel`, `semDadoDeClienteNoAparelho`) verdes; se a leitura da campanha no app não couber em `lerComPapel`, registre no retorno.

### Obrigações

- `.ts` explícito no que a function importa de `core`.
- `movimentoDosPedidos` e `animacaoRespeitaMovimento` (escopo literal) se arquivos de UI novos nascerem.

### Não faça

- O checkout e o `mercado-pago` (tarefa 05); o feed (08); a promoção progressiva no `order-proposals`.

### Pronto quando

- [ ] o pedido montado com peça de campanha provado pelo handler e pelas páginas reais
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
