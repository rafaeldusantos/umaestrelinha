## 01 · [apps/store · supabase · packages/core] Presença na loja — o navegador avisa que está na loja, e a Política diz isso

**Status:** done

`UC-01, UC-02, UC-07 (pageKind, sourceBucket, deviceBucket, contrato), UC-08, UC-09 (parte)` — 90

**Objetivo.** Com aceite de estatística, cada navegador na loja de produção grava, a cada minuto com a aba visível, uma presença efêmera (tipo de página, joia, itens na sacola, faixa de origem, faixa de aparelho), sem IP, user agent, referrer ou URL, e a Política de Privacidade diz isso.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §O "defeito 01", §Convenções, §Os guardas, §Baselines, §CI e deploy); `apps/store/CLAUDE.md` › O contador de visitas únicas (feature 71) e › Endereçamento; `packages/core/CLAUDE.md` › Quando um código pertence · Pureza · `time` e `visits` · `live`; `supabase/CLAUDE.md` › Migrations · RLS · Edge functions · `visit` — a visita única. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código (O que nasce: PresencePing, presence/, contrato do pulso, pageKind, tabelas, `record_store_presence`); §6 · spec.md — Decisões D-01, D-02, D-04..D-09, D-12, D-13, D-17, D-18.

**Habilita.** 02 e 04 leem as tabelas da presença (o estado efêmero, o registro por minuto e a marca diária "com sacola" por (dia, id da presença) com a hora da primeira sacola). 02 usa `pageKind`, `LIVE_WINDOW_MIN` não (é dela).

### Critérios de aceite

**LAV-12 (a definição de presença que a gravação sustenta)**

- **LAV-12** "Pessoa na loja" = visitante com batida nos **últimos 5 min**. A janela é uma constante única no `core` (`LIVE_WINDOW_MIN = 5`).

**LAV-40/LAV-41/LAV-45 (o que se guarda da origem e do aparelho)**

- **LAV-40** Barra empilhada + legenda em grade de duas colunas (a quinta faixa ocupa a linha inteira), contando as pessoas que estão na loja agora — as mesmas do total "Agora na loja"; com ninguém na loja, a seção mostra "Ninguém na loja agora." As faixas são fixas, calculadas **no servidor**, no primeiro pulso da sessão:
  - **Instagram** (`instagram.com`, `l.instagram.com`, `utm_source=instagram`);
  - **Google** (busca e Shopping, `utm_source=google`);
  - **WhatsApp** (`wa.me`, `api.whatsapp.com`, `utm_source=whatsapp`). Quem chega por um link sem marcação de origem, aberto dentro do app do Instagram ou do WhatsApp, conta como "Direto", e a seção diz isso em letra pequena;
  - **Direto** (sem referência);
  - **Outros**.
  As regras moram numa função pura no `core` (`sourceBucket(referrer, utm)`) com teste.
- **LAV-41** Guarda só a **faixa**, nunca o referrer ou a URL de origem.

#### E. No celular (Fase 3)
- **LAV-45** "{m} de {n}" + "o resto pelo computador ou tablet" (sem a segunda linha quando todos estão no celular). Com ninguém na loja, o bloco mostra "Ninguém na loja agora." O aparelho é só `celular | computador | tablet`, calculado no servidor a partir do user agent, **sem gravar o user agent**.

**§6.2 Fase 2 — presença** (o SQL e o comentário do id são superados pelas Decisões D-01, D-02 e D-04 abaixo)

### 6.2 Fase 2 — presença
```sql
-- efêmera: TTL 30 min; poda na gravação, na leitura e por pg_cron (se existir), molde da 71
create table public.store_presence (
  visitor_id   uuid primary key,          -- o MESMO id aleatório do VisitCounter
  last_seen_at timestamptz not null,
  page_kind    text not null check (page_kind in ('joia','lista','sacola','checkout','guia','outra')),
  product_id   uuid null,                 -- só quando page_kind = 'joia'
  cart_items   smallint not null default 0,
  source       text null,                 -- faixa (Fase 3)
  device       text null                  -- faixa (Fase 3)
);
-- RLS ligada, nenhuma policy, revoke de anon/authenticated (molde de store_visits)

create table public.store_presence_minutes (   -- para o gráfico de 30 min, sem id
  minute timestamptz primary key, visitors int not null
);
create table public.store_presence_daily (     -- para "Com sacola", sem id
  day date primary key, with_cart int not null default 0, at_checkout int not null default 0
);
```
- **Gravação:** nova ação na função `visit` (ex.: `POST /visit?action=ping`) com os mesmos portões (rate limit por IP sem gravar o IP, robô, origem, corpo validado por `core/visits`) e a RPC `record_store_presence(p_id, p_page_kind, p_product_id, p_cart_items, p_source, p_device)` com `security definer` e grant só para `service_role`.
- **Loja:** `PresencePing` ao lado do `VisitCounter`, com a mesma decisão `visitRefusal`. Bate a cada 60 s com `document.visibilityState === 'visible'`, na troca de rota e na mudança da sacola. Não gasta bateria em segundo plano e para no opt-out.
- **Leitura:** `store_live(p_agora timestamptz default now())`, `security definer`, só admin, devolve:
```json
{ "lido_em": "...", "janela_min": 5,
  "agora": { "total": 7, "olhando": 4, "sacola": 2, "checkout": 1 },
  "compraram_30min": 0,
  "minutos": [3,4,4,…,7],
  "joias": [{ "id": "...", "nome": "...", "image_url": "...", "pessoas": 3 }],
  "origens": [{ "faixa": "instagram", "n": 3 }],
  "aparelho": { "celular": 6, "computador": 1, "tablet": 0 },
  "abandono_horas": 4 }
```


**§6.3**

### 6.3 Regras no `core` (um dono só, com teste)
- `packages/core/src/live/`:
  - `LIVE_WINDOW_MIN`;
  - `funnelOf(agora)` (exclusividade de LAV-21);
  - `sourceBucket(referrer, utm)` e `deviceBucket(ua)`;
  - `accessDelta(atual, anterior)`;
  - `conversion(vendas, visitas)`;
  - frases (`liveCardLine`, `checkoutNote(horas)`, estados vazios).
- `pageKind(pathname)` em `core/routes` para a loja e o servidor classificarem do mesmo jeito.

---


**§7 Privacidade (LGPD)**

## 7. Privacidade (LGPD)
- Sem consentimento de estatística, nenhum pulso, como já acontece com o `VisitCounter`. Deixar claro na tela, em letra pequena: "Conta só quem aceitou cookies de estatística."
- Nenhum IP, user agent, referrer ou URL completa no banco. Só faixas.
- A presença expira em 30 min. Por até 1 hora fica o registro de quem estava na loja em cada minuto, e por até 14 dias fica, por dia, a marca de que aquele navegador pôs joia na sacola e a hora em que pôs; os dois guardam só o código da presença, um código aleatório que troca todo dia e não se liga ao código da visita.
- Atualizar a Política de Privacidade da loja antes da publicação, com texto aprovado pela Adri, dizendo: que, enquanto a loja está aberta na tela, o navegador avisa a cada minuto que a pessoa está na loja; que, por até 30 minutos, fica registrado só o tipo de página que ela vê (joia, lista, sacola, checkout, guia), qual joia, quantos itens tem na sacola, de que tipo de lugar ela veio (Instagram, Google, WhatsApp, direto ou outros) e se usa celular, computador ou tablet — nunca o IP, o endereço completo da página ou de onde veio; que, depois disso, por até 1 hora fica o registro de quem estava na loja a cada minuto e, por até 14 dias, a marca de que aquele navegador pôs joia na sacola naquele dia e a hora em que pôs, as duas coisas ligadas só a um código aleatório que troca todo dia e não se liga ao código da visita; e que os registros de visita passam a ser apagados depois de 14 dias. Sem essa aprovação, nada das Fases 2 e 3 vai ao ar.


**§10 Critérios de aceite (os desta tarefa: 3, 4, 6)**

## 10. Critérios de aceite (resumo)
1. Os números de Visitas e Vendas da Loja ao vivo são **idênticos** aos da faixa do Início para o mesmo período.
2. A soma Olhando + Sacola + Checkout é igual ao total "Agora na loja".
3. Um navegador sem consentimento, robô, host interno ou com opt-out nunca aparece em nenhum número.
4. Fechar a aba da loja tira a pessoa do total em até 5 min.
5. Com o app em segundo plano, não sai nenhuma leitura.
6. O banco não guarda IP, user agent, referrer nem URL (teste de esquema).
7. O cartão do Início na Fase 1 não mostra nenhum número ao vivo.


### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `store_presence` (estado efêmero: id da presença, último instante, tipo de página, joia, itens na sacola, faixa de origem, faixa de aparelho) | VOCÊ CRIA | o pulso | 02 (`store_live`) |
| registro por minuto `(minuto, id da presença)`, vida ≤ 1 h | VOCÊ CRIA | o pulso | 02 (as 30 barras) |
| marca diária `(dia, id da presença, hora da primeira sacola)`, poda 14 dias | VOCÊ CRIA | o pulso com sacola > 0 | 04 (`store_movement` › Com sacola) |
| `record_store_presence(...)` security definer, `grant execute` só `service_role` | VOCÊ CRIA | a function `visit` | `{ desfecho, ate, agora }` |
| `POST /functions/v1/visit?action=ping` | VOCÊ CRIA (handler próprio na `visit`) | corpo do contrato de `core/visits` + `Origin` + UA | `{ ate, agora }` ou recusa |
| `pageKind(pathname)` em `packages/core/src/routes/` | VOCÊ CRIA | caminho | `'joia'\|'lista'\|'sacola'\|'checkout'\|'guia'\|'outra'` |
| `sourceBucket`, `deviceBucket` (folha Deno em `packages/core/src/live/`, ex.: `buckets.ts`) | VOCÊ CRIA | referrer + utm / UA | faixa |
| contrato do corpo do pulso (folha em `packages/core/src/visits/`, sem import) | VOCÊ CRIA | JSON | veredito `string \| null` |
| `visitRefusal` | JÁ EXISTE. Consuma; não altere. (`apps/store/src/shared/lib/visits/refusal.ts:48`) | | |
| `store_production_host()`, `store_day()`, `store_day_start()` | JÁ EXISTE (migration da 71). Consuma. | | |

### Decisões já tomadas

- D-01: "Id próprio da presença, por navegador e por dia, sem ligação com o id do contador; ele troca à meia-noite de Brasília. [...] VIS-12 e o guarda ficam como estão."
- D-02: marca por (dia, id da presença) com a hora da primeira sacola do dia; poda de 14 dias. O comentário "o MESMO id aleatório do VisitCounter" e a tabela `store_presence_daily` de contagens sem id do §6.2 estão superados.
- D-04: o registro por minuto guarda (minuto, id da presença), sem contar duas vezes, e vive até 1 hora.
- D-05: limitador separado para o pulso (120/min por IP), a visita mantém o dela (30/min); o pulso não lê `store_clock`; teto de 5.000 linhas na tabela de presença.
- D-06: `record_store_presence` recebe o host da origem e compara com `store_production_host()` no SQL; fora dele não grava e responde `interno`.
- D-07: a resposta do pulso devolve `{ ate, agora }` do servidor; a loja converte por duração (`ate − agora`), nunca pelo relógio.
- D-08: corpo = id da presença, tipo de página, **slug** da joia (o servidor resolve o id), itens da sacola, faixa de origem; a faixa é calculada na loja por `sourceBucket` no pouso (primeira página da aba) e guardada em `sessionStorage`; o servidor revalida a faixa contra o vocabulário e calcula só o aparelho pelo UA, sem gravá-lo.
- D-09: produto e legado ⇒ joia; categoria (1 ou 2 segmentos) e `/busca` ⇒ lista; `/carrinho` ⇒ sacola; `/checkout`, `/pedido-montado`, `/pedido/:id/pagamento` ⇒ checkout; Guia e legado ⇒ guia; o resto (inclusive `/pedido/:id`) ⇒ outra. Delegando a `classifyPath` no que ele já sabe.
- D-12: `Access-Control-Max-Age` num preflight próprio da `visit`, sem mexer no dono do CORS (`_shared/http.ts`).
- D-13: o parágrafo "Medição de audiência" da Política (`apps/store/src/pages/PrivacyPolicyPage.tsx`) é reescrito com o texto do §7 acima — já corrigido (r1a do `prd.md`) para dizer o que fica depois dos 30 min: o registro por minuto por até 1 h e a marca diária de sacola por até 14 dias, os dois ligados só ao código diário da presença (presença por até 30 min, por minuto até 1 h, faixas, sem IP/UA/endereço, visitas apagadas depois de 14 dias); `politicaDoContador.test.ts` acompanha. A aprovação da Adri é pré-condição da publicação, não da implementação. A retenção de 14 dias de `store_visits` é implementada na tarefa 04; o texto já a diz aqui.
- D-17: guardas novos: esquema da presença (molde `visitasSchema`), dono único do id e da chave da presença, "só um arquivo da presença faz rede".
- D-18: poda na gravação e na leitura; job do `pg_cron` só se a extensão existir.
- Faixas de origem: `instagram`, `google`, `whatsapp`, `direto`, `outros`; `utm_source` vence o referrer; sem referência ⇒ `direto`. Aparelho: `celular`, `computador`, `tablet`.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Componente invisível montado no App com as recusas | `apps/store/src/app/VisitCounter.tsx` (`contexto`, `podeChamar`, `agendar`) |
| Envio cru à function | `apps/store/src/shared/lib/visits/send.ts › postVisit` |
| Id no armazenamento com prazo do servidor | `apps/store/src/shared/lib/visits/visitor.ts › ensureVisitorId` / `saveClock` |
| Montagem | `apps/store/src/app/App.tsx` — a linha `{!previewMode && <VisitCounter />}` |
| Contrato de corpo Deno | `packages/core/src/visits/visitor.ts › visitBody` / `visitBodyRefusal` |
| Handler com portões e log de uma linha | `supabase/functions/visit/handlers.ts › route` e `index.ts` (wiring, `createRateLimiter`) |
| Migration: tabela fechada, RPC definer, pg_cron condicional | `supabase/migrations/20261021120000_71-visitas-unicas.sql` |
| Guarda de esquema | `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts` + `visitasRegras.ts` |
| Guarda de dono único / rede | `apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts`, `idDoVisitanteSoNoEnvio.test.ts` |
| Probe SQL e da function | `.specs/features/83-loja-ao-vivo/probes/01-acessos.sql`, `.specs/features/71-visitas-unicas-no-dashboard/probes/function-visit.sh` |

### Testes

- Unidade `packages/core`: `pageKind` (produto e legado ⇒ joia; categoria de 1 e 2 segmentos e busca ⇒ lista; carrinho ⇒ sacola; checkout, pedido montado e pagamento ⇒ checkout; Guia e legado ⇒ guia; resto, inclusive a confirmação do pedido ⇒ outra); `sourceBucket` (cinco faixas, `utm_source` vence o referrer, sem referência ⇒ direto); `deviceBucket` (celular, computador, tablet); contrato do corpo (chave a mais, tipo fora do vocabulário, slug inválido, itens acima do teto, faixa fora do vocabulário); `denoReach` das folhas novas de `visits` e `live`.
- Unidade na loja (jsdom): o pulso não sai sem consentimento, com robô, em host interno, com opt-out, na prévia ou antes dos settings; sai a cada 60 s só com a aba visível, na troca de rota e na mudança da sacola, e para em segundo plano; o id muda quando o prazo do servidor vence; a recusa de cookies apaga o id da presença; a origem é calculada uma vez no pouso e mantida; sem JWT; o id do contador nunca entra no pulso.
- Function (vitest, deps injetadas): o pulso não lê `store_clock`; os dois limitadores não se consomem; robô não grava; log sem id, IP e UA; aparelho pelo UA e o UA não vai à RPC; o preflight da `visit` traz `Max-Age`.
- Política: o parágrafo novo palavra por palavra (`politicaDoContador`).
- Guardas novos: esquema da presença (nenhuma coluna de IP, UA, referrer ou URL; RLS sem policy; `revoke` dos papéis; `grant` só `service_role`; poda; teto); dono único da chave e do id da presença; só um arquivo da presença faz rede.
- Integração local (probe `begin … rollback` contra a 54442, e a function servida com `supabase functions serve`): grava e poda o que passou de 30 min; o minuto não conta a mesma pessoa duas vezes; a marca diária é única por (dia, id) e guarda a hora da primeira sacola; poda de 14 dias da marca; teto de linhas; só `service_role` executa; fora do host de produção não grava; pulso e visita do mesmo IP não se derrubam.

### Obrigações

- Folhas alcançáveis pelo Deno: todo especificador relativo com `.ts` explícito, inclusive `import type`, e nenhum import de pacote nos arquivos que a `visit` importa (`packages/core/src/visits/__tests__/denoReach.test.ts` tem lista literal de folhas e conta os especificadores do barril — acrescente as folhas novas nela).
- Em comentário de arquivo alcançável pela function, descreva o import sem extensão, não o escreva (`supabase/CLAUDE.md` › Edge functions).
- `visit/index.ts` só faz wiring (`AD-004`); a lógica do pulso mora num handler testável.
- RLS ligada, nenhuma policy, `revoke all` de `public`/`anon`/`authenticated`, `grant execute` explícito a `service_role` (sem ele toda batida dá 500).
- O id e a origem da presença moram em `apps/store/src/shared/lib/presence/` (nunca em `shared/lib/visits`, onde `idDoVisitanteSoNoEnvio.test.ts` só deixa `send.ts` fazer rede); chave(s) de armazenamento novas com dono único, acrescentadas à lista "Chaves em uso hoje" do `CLAUDE.md` da raiz.
- `cookieConsentStore.ts` (a recusa): chamar o "esquecer" da presença ao lado de `forgetVisitorId`.
- `marcacaoSoPorAcao.test.ts` (lista literal de RPCs): acrescentar `record_store_presence`, com o `create function` conferido.
- `contadorSemGa.test.ts` e `contadorMontado.test.tsx`: estender o escopo ao `PresencePing` (sem GA4; montado fora das `Routes`, só fora da prévia).
- `wiringResolve.test.ts` reage ao `index.ts` novo da `visit`: tem de seguir verde.
- `Migration nova em `supabase/migrations/`: apure o maior prefixo existente na hora (hoje o último é `20261103120000_89-pedido-montado.sql`) e use um prefixo maior e único; compare o **prefixo**, não o nome (`CLAUDE.md` › o merge da 48/49). Aplique só no local: `supabase migration up --local` (nunca `--linked`, nunca `supabase stop --all`). Confira `supabase status` antes; sem o local de pé, pare e relate.
- `strictNullChecks: false`: veredito de recusa como `string | null`.
- O gate inclui a suíte da loja **e** a do painel (os guardas da loja varrem os dois apps), um workspace por vez, `--testTimeout=20000` sem o `--`, exit code fora de pipe.

### Não faça

- Não crie `store_live`, o hook de leitura nem nada do app do ateliê (tarefas 02 e 03).
- Não mude `store_visits`, `record_store_visit`, `store_movement` nem `prune_store_visits` (tarefa 04).
- Não reuse o id do contador nem leia `ensureVisitorId`/`readMarker` fora de `shared/lib/visits`.
- Não guarde IP, user agent, referrer nem URL em coluna nenhuma.
- Não mexa em `supabase/functions/_shared/http.ts`.
- Cidades (LAV-48): fora.
- Nada de commit, nada de `--linked`.

### Pronto quando

- [ ] uma batida com consentimento, no host de produção, grava a presença com tipo de página, joia, sacola, origem e aparelho, e nenhuma coluna guarda IP, UA, referrer ou URL (probe e guarda de esquema)
- [ ] sem consentimento, com robô, em host interno ou com opt-out, nenhuma presença é gravada (loja e function)
- [ ] a presença passa a não contar depois de 30 min sem batida e é podada; o minuto e a marca diária não contam duas vezes (probe)
- [ ] o pulso e a visita têm limitadores separados, e o pulso não lê `store_clock`
- [ ] a Política tem o parágrafo novo e `politicaDoContador` passa com ele
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (`CLAUDE.md` §Comandos e §Baselines; o que ele não declara, `.specs/project/PROJECT.md` › Comandos de verificação)

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
