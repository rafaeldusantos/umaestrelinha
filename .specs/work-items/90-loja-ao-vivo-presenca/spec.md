# 90 · Loja ao vivo, Fases 2 e 3 — presença, funil, joias vistas, origem e aparelho

Costura de 2026-11-01. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| --- | --- | --- |
| UC-01 | Presença na loja: o navegador avisa que está na loja (LAV-12, §6.2 Loja, §7) | comportamento numerado nesta costura, a partir do PRD |
| UC-02 | Gravação da presença no servidor (§6.2 Gravação, LAV-41, LAV-45) | idem |
| UC-03 | Leitura ao vivo para o app (§6.2 Leitura, LAV-20 item 4, LAV-61) | idem |
| UC-04 | Cartão "Agora na loja" no Início (LAV-01..LAV-05) | idem |
| UC-05 | Tela "Loja ao vivo", blocos A–E (LAV-10..12, 20..22, 30..32, 40..41, 45, 60..65) | idem |
| UC-06 | Acessos: "Com sacola" e "vs semana anterior" (LAV-51) | idem |
| UC-07 | Regras em `core/live` e `pageKind` em `core/routes` (§6.3) | idem |
| UC-08 | Política de Privacidade (§7) | idem |
| UC-09 | Guardas que reagem e guardas novos (§8, `BL-058`) | idem |

**Achados de eval que este Work Item resolve**

`nada`: o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| --- | --- | --- | --- |
| Claude Design `a780eec8-…`, `prompts/PRD - Loja ao vivo.md` | PRD | copiado fiel em `prd.md`, revisado na r1 | todos |
| Protótipo `Ateliê Admin.dc.html` (etag `1793064028832969`) | fonte de design | ver **Design** | UC-04, UC-05, UC-06 |
| `.specs/features/83-loja-ao-vivo/prototipo.md` e `prototipo/` | descrição e capturas do protótipo | contrato de tela provisório do code lookup; capturas em 390 | UC-04, UC-05 |
| `.specs/features/83-loja-ao-vivo/spec.md` (`AD-066`) | spec da Fase 1 | as decisões da 83 que a 90 mantém: frescor pela chegada da resposta, frase de falha do app, notas do contador do dono único, RPC admin sem `lerComPapel` | UC-03, UC-05, UC-06 |
| `.specs/BACKLOG.md` › `BL-056`, `BL-058` | backlog | `BL-056`: a semana anterior pede 14 dias de retenção e nova aprovação da Política; `BL-058`: "pessoas" na presença | UC-06, UC-08, UC-09 |

## Fora do escopo

Do `prd.md` (verbatim, §11 revisado):
- Mapa de calor, gravação de sessão, identificação de clientes logadas ("Juliana está na loja").
- Notificação push de "alguém no checkout": combina mal com o tom memorial. Pode ser reavaliada como opção desligada por padrão.
- Histórico além de 14 dias. As visitas passam a ficar guardadas por 14 dias, o necessário para comparar a semana atual com a anterior; nada além disso.

Do `item.md`: Cidades (Fase 4, LAV-48). E a Fase 1 (LAV-04, LAV-50, LAV-52..54), que já existe (feature `83`) e só muda no que UC-06 nomeia.

## Design

Fontes: Claude Design, projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, arquivo `Ateliê Admin.dc.html` (etag `1793064028832969`, 1526 linhas) — link de design informado pelo humano no pedido e em `item.md` › Insumos. O PRD não tem seção "Expectativas de UI/UX" e não o cita como fonte.

### Início — cartão "Agora na loja" (LAV-01..05)

- Lugar: logo abaixo da faixa escura do Início, antes de "Precisa de você"; área com padding 16 no topo e 20 nas laterais.
- `<button>` de largura inteira, `surface`, borda `line`, raio 20, padding 16, `shadow-soft`; linha com gap 14:
  1. texto (flex 1, gap 4): eyebrow com ponto 8×8 `accent` estático e "Agora na loja" (11/600, caixa alta, .1em, `ink-soft`); número `font-display` 700 30px −0.02em `primary` com "pessoa"/"pessoas" 14px `ink-soft`; linha do funil 13px `ink-soft`.
  2. mini gráfico 96×40, alinhado embaixo, gap 2, **15 barras**; altura relativa ao maior valor dos 30 min (piso 3, teto 40); a última `accent`, as outras `line`; raio 2.
  3. chevron `chevron-right` 20px `ink-soft`.
- Toque abre "Loja ao vivo". No protótipo não há `aria-label`.
- Desenhado só o estado cheio. **Não desenhados**: carregando, falha, zero pessoas, loja não medida.

### Tela "Loja ao vivo" (LAV-10..12, 20..22, 30..32, 40..41, 45, 51, 60..65)

- Sobreposição de tela cheia, fundo `ground`, sem a barra de abas. Cabeçalho 60px `surface` com borda `line`: Voltar 44×44 (`chevron-left` 22, `aria-label="Voltar"`), título "Loja ao vivo" (`div`, display 700 17px) e o frescor 12px `ink-soft`.
- Corpo rolável, padding 16, gap 12. Ordem: A · B · C · D · grade 2 colunas com E e Cidades · Acessos (margem superior extra de 12).
- **A, "Agora na loja"**: `ink`, texto `on-primary`, raio 20, padding 20; eyebrow com ponto `accent` em `on-ink-strong`; número 56px display 700, line-height 1, −0.03em, **`accent`**; ao lado "{pessoa|pessoas} nos últimos 5 minutos" 15/300 `on-ink-strong`; gráfico de **30 barras** (56px, gap 3, raio 2, última `accent`, outras `on-ink-border`, proporcional ao maior, piso 3); legenda 11px `on-ink` "30 min atrás" · "agora". No mock a última barra é igual ao número grande.
- **B, "O que estão fazendo"**: cartão `surface` padding 16, `h3` 17px; quatro linhas, rótulo 14px e número display 700 `primary`, trilho 6px `ground-deep` raio 999 com preenchimento `round(n ÷ max(1,total) × 100)%` e `transition: width 300ms`; cores: "Olhando joias" `field`, "Com joia na sacola" `primary`, "No checkout" `accent`, "Compraram (últimos 30 min)" `primary` (com barra no protótipo). Nota condicional (checkout > 0): margem 14, padding-top 12, borda superior `line`, 13px/1.45 `ink-soft`.
- **C, "Joias sendo vistas agora"**: cartão padding 4/16, `h3` 17; linhas com padding vertical 10, gap 12, divisória `line` a partir da 2ª; caixa 40×40 raio 6 `ground-deep` com **ícone** 22px `primary`; nome 14px; "{n} pessoa(s)" 13px `ink-soft` sem quebra. O Guia (ícone `envio`) aparece misturado na ordem dos dados.
- **D, "De onde vieram"**: barra empilhada 10px raio 999, gap 2, `flex: n`; legenda `1fr 1fr`, gap 8/12, 14px, quadrado 10×10 raio 3, número display 700 `primary`. Quatro faixas: Instagram `primary`, Google `primary-strong`, WhatsApp `accent`, Direto `field`; faixa com zero some.
- **E, "No celular"**: 1ª célula de `1fr 1fr` (gap 12); eyebrow; "{m} de {n}" display 700 20px `primary`; "o resto pelo computador" 12px `ink-soft`, sempre.
- **Acessos** (só o que muda): números "Visitas", "Visitantes únicos", "Sacolas criadas", "Conversão" em `1fr 1fr`; variação 12px "(+|−)N% vs {ontem|anteontem|semana anterior}", `done` para ≥ 0, `ink-soft` para queda, sempre visível; seletor sem `aria-pressed`.
- Desenhado só o estado cheio. **Não desenhados**: carregando, falha, ninguém na loja (A–E), loja não medida, "Ninguém olhando uma joia agora.", só gente no Guia, "Ninguém na loja agora." em D e E, recusa de acesso, puxar para atualizar, `document.title`, a nota de consentimento, a nota da Semana de "Com sacola", a faixa "Outros", a foto da joia, 5 joias + o Guia, E sem Cidades ao lado.

Divergências entre fontes: uma fonte só. As 18 divergências design × PRD do design lookup (cartão sem nome acessível; "com joia(s) na sacola" sem sumir no zero; o funil não exclusivo no mock; barra em "Compraram"; nota com prazo e "Backoffice"; ícone no lugar da foto; Guia sem regra; 4 faixas sem "Outros"; "o resto pelo computador"; Visitantes únicos/Sacolas criadas; variação sempre visível e sem corte; seletor sem `aria-pressed`; 7 dias corridos; título `div`; grades fixas; transição sem movimento reduzido; relógio do aparelho; 5 s de atualização) — **vale o `prd.md` revisado em todas**, decidido pela conferência (o PRD manda sobre o protótipo, regra da 83).

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

- **Instruções** — `CLAUDE.md` (raiz); `DESIGN.md` › 2. Paleta; `apps/mobile-adm/CLAUDE.md` › A Início (73) · A Loja ao vivo (83) · Os guardas do app · Testes; `packages/core/CLAUDE.md` › Quando um código pertence · Pureza · `time` e `visits` · `live`; `supabase/CLAUDE.md` › Migrations · RLS · Edge functions · `visit` · A hora da primeira visita e a chave `acessos` · `store_overview`; `apps/store/CLAUDE.md` › Endereçamento · O contador de visitas únicas (71) · O pedido montado (89).
- **Recorte** — UC-01..UC-09, todos.

**O que já serve**

| O que | Onde | Cobre |
| --- | --- | --- |
| A decisão de contar (ambiente, prévia, settings, host, consentimento, marca, robô) | `apps/store/src/shared/lib/visits/refusal.ts:48 › visitRefusal` | UC-01: as mesmas recusas; importável sem disparar `idDoVisitanteSoNoEnvio` |
| Contexto no instante da tentativa e releitura do consentimento | `apps/store/src/app/VisitCounter.tsx:49 › contexto`, `:65 › podeChamar` | UC-01 |
| Agendamento fora do caminho crítico | `apps/store/src/app/VisitCounter.tsx:107 › agendar` | UC-01 (batida na troca de rota) |
| Opt-out | `apps/store/src/shared/lib/visits/visitor.ts:176-195`, `packages/core/src/visits/optOut.ts › readOptOutParam` | UC-01 |
| Robôs | `packages/core/src/visits/bots.ts › isBotUserAgent` (folha Deno) | UC-01/02 |
| Host interno × produção | `packages/core/src/analytics/host.ts › trafficType` (`refusal.ts:52`, `handlers.ts:174`) | UC-01/02 |
| Envio cru com a chave publicável | `apps/store/src/shared/lib/visits/send.ts:28 › postVisit` (molde) | UC-01 |
| Limitador por IP instanciável | `supabase/functions/_shared/rateLimit.ts:21 › createRateLimiter`, `:50 › clientIp` | UC-02 |
| CORS e JSON | `supabase/functions/_shared/http.ts:25 › json`, `:33 › preflight` | UC-02 |
| Dia e hora de Brasília no banco | `store_time_zone/store_day/store_day_start/store_week_start/store_production_host` (71:25-74), `store_hour` (83:23) | UC-02/03/06 |
| Poda condicionada ao pg_cron | 71:369-376 | UC-02 |
| Régua de venda | `store_movement` 83:265-268 | UC-03 ("Compraram") |
| Fotos das joias | `20261027120000_inicio-fotos-das-joias.sql:78`, `apps/mobile-adm/src/widgets/top-jewels/ui/TopJewels.tsx:2-3` | UC-03/05 |
| Conversão, variação, frase, frescor, nota de consentimento | `packages/core/src/live/access.ts:30,43,61,23,173` | UC-06/07 |
| Notas do contador | `packages/core/src/stats/counterNotes.ts:38 › emptyCounterLine` | UC-04/05 (loja não medida) |
| Hook admin com intervalo visível e parada na recusa | `packages/core/src/hooks/useStoreMovement.ts:52-62`, `useStoreOverview.ts:24,28` | UC-03/04/05 |
| Vigia da recusa com várias leituras | `apps/mobile-adm/src/pages/InicioPage.tsx:64-67` | UC-03 |
| Instante mais antigo | `apps/mobile-adm/src/pages/InicioPage.tsx:33 › maisAntigo` | UC-05 |
| Único relógio permitido | `apps/mobile-adm/src/shared/lib/useSegundosDesde.ts` | UC-05 |
| Estados de leitura | `apps/mobile-adm/src/shared/ui/leitura.tsx`, `leituraDe.ts` | UC-04/05 |
| Ícone `envio` | `packages/ui/src/icons/EnvioIcon.tsx` | UC-05 |
| Endereços do Guia e do pedido montado | `packages/core/src/routes/routes.ts:141,187,293` | UC-07 |
| Classificação de caminho | `packages/core/src/page/classify.ts:66 › classifyPath` | UC-07 (base de `pageKind`) |
| Sacola persistida | `apps/store/src/entities/cart/model/cartStore.ts:100-169` | UC-01 |
| Produto por slug | `apps/store/src/entities/product/api/useProduct.ts:16` | UC-01 |

**O que muda**

| O que | Onde | Mudança |
| --- | --- | --- |
| Function `visit` | `supabase/functions/visit/handlers.ts:117 › route` | despachar a ação do pulso num handler próprio; o portão `store_clock` (:162) não roda no pulso; robô e origem continuam; log sem id, IP ou UA |
| Wiring | `supabase/functions/visit/index.ts:28` | segunda instância de `createRateLimiter` só para o pulso |
| Preflight | `supabase/functions/_shared/http.ts:19-22,33` | `Access-Control-Max-Age` (ver Decisões D-12) |
| Poda das visitas | `20261021120000_71-visitas-unicas.sql:120-127 › prune_store_visits` | recriada em migration nova, 14 dias |
| `store_movement` | `20261029120000_83-loja-ao-vivo.sql:134-337` | recriada: `comparacao.semana` (hoje `null`, :329), "Com sacola" por período, janela de leitura estendida; snapshot ainda em UM `from public.store_visits` |
| Tipo do movimento | `packages/core/src/stats/movement.ts:102-103` | `comparacao.semana` e o número novo |
| Acessos | `packages/core/src/live/access.ts:51,74,67-71,93` | quatro cartões, "Com sacola", caso Semana |
| Barril `core/live` | `packages/core/src/live/index.ts` | reexportar o arquivo novo, com `.ts` |
| Frases do cartão | `packages/core/src/live/card.ts:9-16` | trocadas pelas da presença |
| Barril `core/visits` | `packages/core/src/visits/index.ts:3-5` | folha do contrato do pulso |
| Cartão da Início | `apps/mobile-adm/src/widgets/visits-card/ui/CartaoVisitasHoje.tsx`, `InicioPage.tsx:114` | cartão novo sobre `store_live` (30 s visível), preservando `gravarPeriodoNaEntrada` |
| Início | `apps/mobile-adm/src/pages/InicioPage.tsx:61-89` | terceira leitura na vigia, no puxar e no `maisAntigo` |
| Loja ao vivo | `apps/mobile-adm/src/pages/AoVivoPage.tsx:28-44` | segundo hook, vigia, puxar com as duas chaves, frescor da mais antiga, blocos acima de `SecaoAcessos` |
| Leituras do app | `apps/mobile-adm/src/entities/stats/api/leituras.ts:17` | hook irmão de `useMovimento` |
| Seção Acessos | `apps/mobile-adm/src/widgets/store-access/ui/SecaoAcessos.tsx` | quarto número, nota da soma dos dias, variação na Semana |
| Política | `apps/store/src/pages/PrivacyPolicyPage.tsx:194-200` | texto novo (D-13) |
| Recusa de cookies | `apps/store/src/entities/cookie-consent/model/cookieConsentStore.ts:121-124` | esquecer também o id da presença |
| Montagem | `apps/store/src/app/App.tsx:117` | `PresencePing` ao lado do `VisitCounter`, mesma forma |

**O que nasce**

| O que | Onde |
| --- | --- |
| `PresencePing` | `apps/store/src/app/PresencePing.tsx` |
| Id diário, faixa de origem do pouso e envio do pulso | `apps/store/src/shared/lib/presence/` (nunca em `shared/lib/visits`) |
| Contrato do corpo do pulso | folha em `packages/core/src/visits/` (sem import) |
| `pageKind(pathname)` | `packages/core/src/routes/` (pode delegar a `page/classify.ts`) |
| `LIVE_WINDOW_MIN`, `funnelOf`, `sourceBucket`, `deviceBucket`, `checkoutNote`, plurais, estados vazios | arquivo novo em `packages/core/src/live/`, alcançável pelo Deno |
| Tabelas da presença (efêmera, por minuto, marca diária "com sacola") | migration nova, prefixo depois de `20261103120000` |
| `record_store_presence` e `store_live` | mesma migration |
| Job pg_cron da poda da presença | mesma migration, dentro do `if exists pg_cron` |
| `useStoreLive` | `packages/core/src/hooks/` + wrapper em `apps/mobile-adm/src/entities/stats/api/leituras.ts` |
| Widgets dos blocos A–E e o cartão novo | `apps/mobile-adm/src/widgets/` |
| Guardas novos | esquema da presença; tom da presença com "pessoas"; dono único do id e da chave da presença e "só um arquivo faz rede" |
| Probes | `.specs/work-items/90-loja-ao-vivo-presenca/probes/` (molde dos probes da 71 e da 83) |

- **Exemplares** — `VisitCounter.tsx` (componente invisível com recusas); `visits/send.ts` (envio cru); `visits/visitor.ts › ensureVisitorId/saveClock` (id com prazo do servidor); `core/visits/visitor.ts › visitBody/visitBodyRefusal` (contrato Deno); `visit/handlers.ts › route` (portões e log); migration da 71 (tabela fechada, RPC definer, pg_cron condicional); `store_movement` da 83 (RPC recriada com snapshot único); foto da joia (`20261027120000…:78` + `TopJewels.tsx`); `useStoreMovement.ts` (hook admin); `InicioPage.tsx` (duas leituras e frescor); `CartaoVisitasHoje.tsx` (cartão-botão); `core/live/access.ts` (frases puras); `visitasSchema.test.ts` + `visitasRegras.ts` (guarda de esquema); `tomDaLojaAoVivo.test.ts` (tom e movimento); `aoVivoComClientReal.test.tsx` (client real); `83…/probes/01-acessos.sql` (probe SQL).
- **Obrigações transversais** — defeito 01 (regras em `core`); alcance pelo Deno com `.ts` explícito, inclusive `import type`; comentário não escreve a forma proibida; `index.ts` só wiring (`AD-004`); migration aplicada é imutável (`AD-017`), prefixo único; migration só no local; RLS fechada sem policy, `revoke all`, `grant execute` explícito à `service_role`; leitura admin com `has_role` como primeiro comando ⇒ `42501`, `execute` só a `authenticated`; dia e hora do banco, o navegador converte o prazo por duração; nenhum relógio do aparelho no app; gate de probe para quem recria `store_movement`/`record_store_visit` (`BL-057`); ordem de publicação migration → function → bundles, com a aprovação da Adri da Política antes; mobile primeiro, 390 a 100/130/200 %, `auto-fit` piso `9rem`; `motion-reduce:` em toda transição; ouro como texto só sobre `ink`; tom memorial; `strictNullChecks: false` (veredito `string | null`); chave de armazenamento nova com dono único e na lista do `CLAUDE.md` da raiz; tipos pelo `tsc` (build não checa); suíte cruzada da loja e do painel, um workspace por vez, `--testTimeout=20000` sem o `--`.
- **Testes** — copiados do code lookup:
  - **Unidade em `packages/core`**: `pageKind` (produto e legado ⇒ joia; categoria de 1 ou 2 segmentos e busca ⇒ lista; `/carrinho` ⇒ sacola; `/checkout`, `/pedido-montado`, `/pedido/:id/pagamento` ⇒ checkout; Guia e legado ⇒ guia; resto ⇒ outra); `funnelOf` exclusivo e somando o total; `sourceBucket` (cinco faixas, `utm_source` vence o referrer, sem referência ⇒ Direto); `deviceBucket`; contrato do corpo (chave a mais, tipo fora do vocabulário, joia inválida, itens acima do teto, faixa revalidada); plurais; nota do checkout sem prazo; cartões de Acessos (quatro, semana anterior só quando contada até o ponto, soma dos dias declarada); `denoReach` de `visits` e `purity` de `live`.
  - **Unidade na loja (jsdom)**: o pulso não sai sem consentimento, com robô, em host interno, com opt-out, na prévia ou antes dos settings; 60 s só com a aba visível, na troca de rota e na mudança da sacola; para em segundo plano; o id muda quando o prazo do servidor vence; a recusa de cookies apaga o id; a origem é calculada uma vez no pouso; sem JWT; o id do contador nunca entra no pulso.
  - **Function (vitest, deps injetadas)**: o pulso não lê `store_clock`; os dois limitadores não se consomem; robô e origem fora do host não gravam; log sem id, IP e UA; aparelho pelo UA e o UA não vai à RPC; preflight com `Max-Age`.
  - **Componente no app (`<App />` real sobre o `fakeSupabase`)**: estados do cartão (traços, falha, zero com gráfico, não medida, plural no nome acessível, partes que somem no zero); blocos A–E (barra de agora = número grande; "Compraram" sem barra; 5 joias + Guia, só Guia sem a frase vazia; origem e aparelho sem ninguém; "o resto…" some com todos no celular); falha de uma leitura com a outra de pé; `42501` da `store_live` ⇒ recusa sem número; nenhuma leitura em segundo plano.
  - **Client REAL** (`src/test/clientReal.ts`): `store_live` 403 `42501` ⇒ Login sem número em instante algum; 500 ou rede ⇒ falha, nunca recusa.
  - **Integração local** (54442, probes `begin … rollback`; function servida): `record_store_presence` (grava, poda 30 min, minuto sem dupla contagem, marca diária única por (dia, id), poda 14 dias, teto de linhas, só `service_role`); `store_live` (`42501`, barras pela janela de 5 min com a última igual ao total, "Compraram" pela régua de venda, recorte pela janela sem poda, imagens); `store_movement` recriada (`periodos` idêntico, semana anterior até o mesmo ponto, "Com sacola" ≤ Visitas, variação some sem período medido); poda de `store_visits` em 14 dias; function servida (pulso e visita do mesmo IP não se derrubam; nenhuma coluna de IP, UA, referrer ou URL); probes da 71 e da 83 com exit 0.
  - **Navegador** (sem prova automatizada): 390 × 844 a 100/130/200 % e 1440; Playwright neutralizando `webdriver`/`HeadlessChrome`, bloqueando `*.supabase.co` e o GA por caminho.
- **Depende / Expõe** — repositório único. Contratos internos: o pulso `POST /functions/v1/visit?action=ping` (corpo validado por `core/visits`, resposta com `{ ate, agora }`); `store_live` (jsonb); `store_movement` com a chave `acessos` estendida; o painel continua lendo `periodos` de `store_movement` (`packages/core/src/hooks/useStoreMovement.ts:27`) e **não** lê `comparacao` (conferido: nenhum arquivo de produção de `apps/backoffice/src` cita `comparacao`).

## Fronteira entre repositórios

`nada`: topologia de repositório único (`.specs/project/PROJECT.md`).

## Cobertura dos UCs

| UC | Reivindicado por |
| --- | --- |
| UC-01 | `.` (monorepo) |
| UC-02 | `.` |
| UC-03 | `.` |
| UC-04 | `.` |
| UC-05 | `.` |
| UC-06 | `.` |
| UC-07 | `.` |
| UC-08 | `.` |
| UC-09 | `.` |

## Decisões

O gate principal não abriu página: **a pedido do humano** ("Quero sua ajuda para resolver as questões em aberto do PRD, deixe apenas as que de fato vão precisar de uma decisão mais específica"), os conflitos e incertezas do lookup foram resolvidos pelo agente com a saída defensável abaixo, e nenhum exigiu decisão de produto nova. Qualquer linha pode ser revista na aprovação da fila.

| # | A pergunta | A resposta | Quem decidiu |
| --- | --- | --- | --- |
| D-01 | Que identificador a presença usa? | "(Recomendado) Id próprio da presença, por navegador e por dia, sem ligação com o id do contador; ele troca à meia-noite de Brasília. 'Com sacola' conta cada navegador uma vez por dia, na mesma régua de Visitas no dia. Na Semana, 'Com sacola' é a soma dos dias (quem pôs joia na sacola em dois dias conta 2), dito em letra pequena. VIS-12 e o guarda ficam como estão." | o humano no gate do PRD Tech Review (`id-do-visitante-na-presenca` · `tech` · r1) |
| D-02 | Como contar "Com sacola" sem contar duas vezes? | Marca por (dia, id da presença) com a **hora da primeira sacola** do dia (para a variação de Hoje por horas completas); poda de 14 dias; Semana = soma dos dias. O comentário de `store_presence.visitor_id` em `prd.md` §6.2 ("o MESMO id aleatório do VisitCounter") e a tabela `store_presence_daily` de contagens sem id ficam **superados** por esta linha | o humano no gate do PRD Tech Review (`com-sacola-contagem-distinta-por-dia` · `tech` · r1, decorrente de D-01) + a conferência (a hora, conflito 4 do lookup) |
| D-03 | Onde "Com sacola" é lido? | Em `store_movement`, na chave `acessos`, ao lado de Visitas — a mesma leitura que alimenta a faixa do Início (critério 1). O número é limitado por Visitas no dia (`least`), porque o pulso pode gravar quando a visita não grava (429, teto, falha) | a conferência (incerteza do lookup; conflito 3) |
| D-04 | Barras por minuto | Cada barra = pessoas presentes naquele minuto pela mesma janela de 5 min do total; o registro por minuto guarda (minuto, id da presença), sem contar duas vezes, e vive até 1 hora (como o §7). A barra de agora é igual ao número grande. `prd.md` LAV-11 trocado na r1 | o humano no gate do PRD Tech Review (`barras-por-minuto-distintos-subcontam` · `tech_prd_edit` · r1) + a conferência (conflito 5) |
| D-05 | Limite por IP | Limitador separado para o pulso, mais folgado (120/min por IP), a visita mantendo o dela (30/min); o pulso não lê `store_clock`; teto de 5.000 linhas na tabela de presença | `pulso-no-mesmo-teto-por-ip` · `tech` · r1 + a conferência (os valores) |
| D-06 | O host de produção sem `store_clock` | `record_store_presence` recebe o host da origem e o compara com `store_production_host()` dentro do SQL; fora do host, não grava e responde `interno`. O host continua decidido pelo servidor | a conferência (conflito 1) |
| D-07 | A troca do id à meia-noite | A resposta do pulso devolve `{ ate, agora }` do servidor, como a da visita; a loja converte por duração (`ate − agora`), nunca pelo relógio | a conferência (conflito 2) |
| D-08 | Contrato do corpo | Contrato próprio do pulso em `core/visits`: id da presença, tipo de página, slug da joia (o servidor resolve o id; a loja não lê o cache de produto fora das `Routes`), itens da sacola e faixa de origem; a faixa é calculada na loja por `sourceBucket` no pouso e guardada em `sessionStorage` (pouso = primeira página da aba); o servidor revalida a faixa contra o vocabulário e calcula só o aparelho pelo UA, sem gravá-lo | `contrato-do-corpo-do-pulso` · `tech` · r1 + a conferência (slug, `sessionStorage`) |
| D-09 | `pageKind` | produto e legado ⇒ joia; categoria (1 ou 2 segmentos) e `/busca` ⇒ lista; `/carrinho` ⇒ sacola; `/checkout`, `/pedido-montado`, `/pedido/:id/pagamento` ⇒ checkout; Guia e legado ⇒ guia; o resto (inclusive `/pedido/:id`) ⇒ outra. Delegando a `classifyPath` no que ele já sabe | a conferência (conflito 9) |
| D-10 | Leitura | RPC própria `store_live` com `has_role` no corpo, chave de cache própria, sem `lerComPapel`; a recusa entra na mesma vigia; desvio de LAV-60 como na 83. Sem `abandono_horas` no contrato (a nota não cita prazo) | `leitura-da-presenca-e-confirmacao-de-papel` · `tech` · r1 + a conferência (conflito 7) |
| D-11 | "Loja ainda não medida" | O mesmo sinal de Acessos (`emptyCounterLine`, `contagem_desde` nulo) e a mesma frase, no cartão e na tela | a conferência (incerteza do lookup) |
| D-12 | `Access-Control-Max-Age` | Num preflight próprio da `visit`, sem mexer no dono do CORS das outras functions (`http.test.ts` compara por `toBe`) | a conferência |
| D-13 | Política de Privacidade | O parágrafo de "Medição de audiência" é reescrito com o texto do `prd.md` §7 revisado (presença por até 30 min; depois, por até 1 h o registro por minuto e por até 14 dias a marca diária de sacola com a hora, os dois ligados só ao código diário da presença; faixas; sem IP/UA/endereço; visitas 14 dias — corrigido na r1a pelo achado 1 da auditoria da fila); `politicaDoContador.test.ts` acompanha o texto novo. A aprovação da Adri é pré-condição da publicação | `politica-de-privacidade-presenca-e-retencao` · `negocio` · r1 |
| D-14 | Frescor | Régua da 83 (duração desde a chegada da resposta); na tela, o da leitura mais antiga das duas | `frescor-pela-chegada-da-resposta` · `tech` · r1 |
| D-15 | Foto da joia | `store_live` devolve `imagens` como `store_overview`; o app usa `primaryImage` | `foto-da-joia-pelo-molde-real` · `tech` · r1 |
| D-16 | "Compraram (últimos 30 min)" | Mesma régua de venda de `store_movement` (`approved` e não cancelado), janela pelo instante do servidor, sem canal de Realtime novo | `compraram-pela-regua-de-venda` · `tech` · r1 |
| D-17 | Guardas | Lista completa no Código (Conflitos do lookup); guarda novo de esquema da presença no molde de `visitasSchema`; régua de tom própria da presença com "pessoas" permitido só nela e "últimos" só seguido de duração, que é janela e não urgência (fecha `BL-058`; achado 2 da auditoria); dono único do id e da chave da presença | `guardas-que-vao-reagir` · `tech` · r1 |
| D-18 | Poda sem pg_cron | Poda na gravação e na leitura como fonte de verdade; job do pg_cron só se existir; a leitura sempre recorta pela janela | `poda-da-presenca-sem-pg-cron` · `tech` · r1 |
| D-19 | Bloco E sem Cidades | "No celular" ocupa a linha inteira (a grade de 2 colunas some com Cidades fora) | a conferência (lacuna do design) |
| D-20 | Estados não desenhados | Seguem `shared/ui/leitura.tsx` (traços, `FALHA_DE_LEITURA` + `TENTAR_DE_NOVO`) e as frases do `prd.md` revisado; movimento das barras com par `motion-reduce:` | a conferência (lacuna do design) |

**Guardas que reagem por desenho** (do lookup, a acompanhar sem afrouxar): `visitasSchema.test.ts:328-336` (poda de 7 dias lida da 71); `visitasPorHoraSchema.test.ts` (vigente de `store_movement` na 83 :526; `periodos` byte a byte; um `from public.store_visits`; colunas de `store_visits`; âncoras :114-131); `visitasRegras.ts:242,279`; `politicaDoContador.test.ts:31-32`; `marcacaoSoPorAcao.test.ts:180-198` (`record_store_presence`, `store_live`); `tomDaLojaAoVivo.test.ts` (`ESCOPO` :122, âncora "Visitas hoje" :133, "pessoas" :90); `aoVivoSemRelogioDoAparelho.test.ts:28-48`; `core/live/__tests__/purity.test.ts:28`; `core/visits/__tests__/denoReach.test.ts:25,58`; `idDoVisitanteSoNoEnvio.test.ts:18-22`; `contadorSemGa.test.ts:24-25`; `contadorMontado.test.tsx`; `visitanteComDonoUnico.test.ts:28-29`; `wiringResolve.test.ts`; `http.test.ts`. `semPessoas.test.ts` (painel) não muda.

## Não resolvido

- **A aprovação da Adri do texto da Política** (D-13): fora deste repositório; condição da publicação, não da implementação.
- **Se os links divulgados no Instagram e no WhatsApp passam a levar `utm`**: prática da Adri, fora do código; sem eles, essas visitas contam como "Direto" com a nota em letra pequena (LAV-40 revisado).
- **O ambiente local** não foi conferido pelo lookup (`supabase status`, pg_cron no local): fica para o preflight da corrida.

Nada aqui trava escopo.
