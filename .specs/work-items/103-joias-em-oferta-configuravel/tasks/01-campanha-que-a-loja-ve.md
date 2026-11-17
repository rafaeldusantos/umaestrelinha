## 01 · [supabase, apps/store] A campanha que a loja vê — vigência aplicada pelo banco, também para sessão de admin

**Status:** done

`UC-06` — WI 103

**Objetivo.** Com sessão de admin ou sem ela, a loja (bloco, selo, preço, sacola e vitrine `/ofertas`) só recebe do banco a campanha em vigência e as marcações dela, decidida pelo relógio do banco.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` › Comandos, › O "defeito 01", › Convenções, › Os guardas, › Baselines, › CI e deploy (migration só no local) · `supabase/CLAUDE.md` › Migrations, › RLS — o molde · `apps/store/CLAUDE.md` › Mobile, › a exceção `/ofertas` · `packages/core/CLAUDE.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (UC-06, Decisões F9 e D-07)

**Habilita.** A 02 consome `useLiveCampaign()` (agora só a vigente) e o embed de produto novo em `mapProduct.ts`; a 02 também edita `mapProduct.ts` e `campanhaNaLoja.test.ts` depois desta.

### Critérios de aceite

**UC-06 · A loja só mostra campanha em vigência, também para quem é admin**
- CA-06.1 Com uma sessão de admin aberta na loja ou na prévia, o bloco, o selo e os preços mostram só a campanha em vigência — nunca uma agendada, encerrada ou desligada. Primeiro se prova o defeito no ambiente local; confirmado, se conserta nesta WI. [código: apps/store/src/entities/campaign/api/useLiveCampaign.ts:47-55; supabase/migrations/20261130120000_102-campanhas.sql:251-255; gate: X-01]

**RNF**
- RNF-02 A falha da leitura das peças não derruba a Home nem os cartões de percentual. [código: CampaignOffers.tsx:23-24; FeaturedProducts.tsx:18-19]
- RNF-03 A loja nunca decide a vigência pelo relógio do aparelho da cliente. [código: useLiveCampaign.ts:1-6; prd 102 RN-03]

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| view `public.live_campaigns` | VOCÊ CRIA (migration nova) | — | as colunas de `campaigns` que a loja lê hoje, só a linha com `active and starts_at <= now() and now() < ends_at` |
| view `public.live_product_campaigns` | VOCÊ CRIA (mesma migration) | — | `product_id`, `campaign_id`, `percent` e o necessário para o embed da loja, só das marcações da campanha vigente |
| `grant select` nas duas views a `anon` e `authenticated` | VOCÊ CRIA | — | — |
| `useLiveCampaign` / `liveCampaignQueryOptions` (`apps/store/src/entities/campaign/api/useLiveCampaign.ts`) | JÁ EXISTE. Muda a fonte para `live_campaigns`; a forma de saída (`LiveCampaign`) não muda | — | a campanha vigente ou `null`; erro tipado nunca vira `null` |
| `PRODUCT_CAMPAIGNS_EMBED` e `toProductCampaign` (`apps/store/src/entities/product/lib/mapProduct.ts`) | JÁ EXISTE. Muda o embed para `live_product_campaigns(…)` | — | `Product.campaign` igual ao de hoje para o visitante |
| recorte `oferta:product_campaigns!inner(campaign_id)` (`apps/store/src/entities/product/api/useOfferProducts.ts`) | JÁ EXISTE. Muda para a view | — | — |
| policies `campaigns_public_read`, `campaigns_admin_*`, `product_campaigns_admin_write` (`supabase/migrations/20261130120000_102-campanhas.sql`) | JÁ EXISTE. Consuma; não altere (o painel precisa ler tudo) | — | — |

### Decisões já tomadas

- F9: provar no local e consertar com leitura que aplica a vigência no banco. Já provado em 2026-11-16 (role `authenticated` + `sub` de `admin@umaestrelinha.dev`: `campaigns` devolve 3 linhas, `product_campaigns` as marcações das três; `anon` vê só Dia das Mães). O probe desta tarefa refaz a prova antes e depois.
- D-07: views `live_campaigns` e `live_product_campaigns`, donas = `postgres`, **sem** `security_invoker` (rodam com o dono e ignoram a RLS de admin), filtro `active and starts_at <= now() and now() < ends_at` pelo relógio do banco; `grant select` a `anon` e `authenticated`; a loja lê `live_campaigns` e embute `live_product_campaigns(…)` no lugar de `product_campaigns(…campaigns(…))`, inclusive no `!inner` de `useOfferProducts`. Prove o embed pelo PostgREST local (sem `PGRST200/201`); se o PostgREST não inferir a relação pela view, caia para RPC `security definer` com `search_path = ''` e registre a troca no retorno.
- D-03: só a fonte da leitura muda; para o visitante selo, preço, sacola e vitrine continuam iguais.
- A migration não grava dado e não toca nas policies existentes; prefixo depois de `20261130150000`, apurado na hora como o próximo livre.
- As functions (`supabase/functions/_shared/campaigns.ts`) e a página servida (`apps/store/server/page.ts`) ficam como estão: usam service role ou chave publicável sem sessão.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| migration com objeto de leitura | `supabase/migrations/20261107120000_compre-junto-adesao.sql` (o molde de leitura; aqui é view, não função) e `20261130120000_102-campanhas.sql:244-248` — a policy pública cujo predicado a view repete |
| guarda de migration | `apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts` (âncora, `mutar()` que lança) |
| paridade do predicado | `apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts` (interpreta `campaigns_public_read`) |
| probe | `.specs/work-items/102-desconto-de-campanha/probes/01-campanhas.sql` (transação desfeita, `ok —`/`FALHA —`) |

### Testes

- Leitura da campanha vigente vem de `live_campaigns` e devolve a vigente ou `null`; erro de leitura continua erro tipado (unitário do hook; `useLiveCampaign.test.tsx` muda a tabela esperada).
- O mapeador lê a campanha da peça pelo embed novo e produz o mesmo `Product.campaign`/preços de hoje (unitário de `mapProduct`).
- Guarda de schema: as duas views existem, sem `security_invoker`, com o predicado de vigência pelo `now()`, `grant select` só a `anon`/`authenticated`, sem escrita de dado (guarda que lê o disco, com sensor por mutação).
- Paridade: o predicado das duas views é o mesmo de `campaigns_public_read` e de `isCampaignLive` (guarda de paridade estendido).
- `campanhaNaLoja.test.ts`: a metade negativa (`:81-89`, nenhum relógio do aparelho) continua; a metade positiva (`:91-95`) passa a exigir o embed novo (`live_product_campaigns(`) no lugar do literal antigo — reescrita de propósito.
- Probe local `probes/01-campanha-vigente.sql` (transação desfeita): como admin autenticado, `campaigns` cru devolve as 3 e `live_campaigns` só a vigente; `live_product_campaigns` só as marcações da vigente; como `anon`, o mesmo; e um GET HTTP no PostgREST local (:54441) de `products?select=…,live_product_campaigns(…)` com o token de admin responde 200 sem marcação de agendada.

### Obrigações

- Migration só no banco local: `supabase migration up --local` (nunca `--linked`, nunca `supabase stop --all`).
- Nenhum literal de domínio, nenhum relógio do aparelho na loja (`campanhaNaLoja.test.ts:81-89`).
- `strictNullChecks: false`: nada de união discriminada por booleano.
- Guarda que recusa string: descreva a forma proibida em comentário, não a escreva (`CLAUDE.md` › Os guardas).

### Não faça

- Não altere nem derrube as policies de `campaigns`/`product_campaigns` (o painel lê todas as campanhas pela de admin).
- Não toque na policy de admin de `products` (D-04, fora deste WI).
- Não mexa em `home_sections`, no bloco `campaign_offers`, em `core/home` nem no painel (tarefas 02..04).
- Não extraia ainda "a campanha baixa esta peça?" para `core` (é da 02).
- Não mude as functions nem `apps/store/server/page.ts`.

### Pronto quando

- [ ] o probe mostra, com sessão de admin, só a campanha vigente e só as marcações dela pelas views e pelo embed HTTP
- [ ] `useLiveCampaign` e o embed de produto da loja leem das views, e para o visitante nada muda no selo, no preço nem em `/ofertas`
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
