# Resumo da sessão — WI 103 Joias em oferta configurável

**Data**: 2026-11-16 · **Branch**: `feature/103` (local, sem push) · **Base**: `master` `7bbf4ad4` · **Worktree**: `store-worktrees/store__feature-103` (monorepo único)
**Fase final**: `done` (Validation 1 PASS). O QA real-user (`pd-qa-validation`) fica com o orquestrador.

A delegação foi explícita, em mensagem do humano: "implemente a tarefa do início ao fim", com handoff, perguntas e decisões respondidas pela recomendação.

## Linha do tempo

1. **Worktree recriado.** A branch `feature/103` antiga era de outro WI, o da faixa de avisos. Ela foi preservada em `backup/103-faixa-de-avisos` (`a22794e5`, local), e o worktree foi removido e criado de novo sobre a `master`. O WI da faixa de avisos ainda usa o número 103 e precisa de renumeração quando for retomado.
2. **Planejamento.**
   - Lookup de design. O Claude Design da 102 está inacessível. O protótipo informado pelo humano (`claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq`) foi decodificado localmente e não tem a tela do bloco nem `/admin/home`.
   - Handoff inline, com as decisões D-01 a D-08.
   - `spec.md`, fila 01 a 04 e `waves.md` (`ONDAS: 01 | 02 | 03 | 04`).
   - `pd-task-audit`: a fila serve com correção. Os 3 achados e 1 lacuna foram aplicados.
3. **Corrida por ondas.** O orquestrador conduziu: pd-impl-task, depois pd-impl-review, depois correção quando houve, e um commit por tarefa.
4. **Validation 1**: PASS. Detalhes em `qa-report.md`.

## O que foi feito, por tarefa

| Tarefa | Commit | Repositórios / áreas | Entrega |
| --- | --- | --- | --- |
| T01 A campanha que a loja vê | `40c669a7` (12 arquivos, +256/−42) | `supabase/migrations`, `apps/store` | Migration `20261130160000_103-campanha-vigente.sql`: views `live_campaigns` e `live_product_campaigns`, com a vigência pelo `now()` do banco e `grant select` só a `anon`/`authenticated`. A loja lê a vigente e embute as marcações pelas views, então a sessão de admin deixa de ver campanha agendada, encerrada ou desligada (UC-06). Probes SQL (10 ok) e HTTP com token de admin (5 ok). Revisão: serve com correção |
| T02 O bloco na Home da loja | `d6af1b86` (21 arquivos, +1060/−82) | `supabase/migrations`, `packages/core`, `packages/supabase`, `apps/store`, ponta do `apps/backoffice` | Migration `20261130170000_103-joias-em-oferta-por-campanha.sql`: `home_sections.campaign_id` FK `set null`, índice único parcial por campanha, `campaign_offers` fora dos tipos únicos, sem escrita de dado. Regra do bloco em `core/home/campaignOffers.ts` (aparece, recuos, recusa, frases). "A campanha baixa esta peça?" foi para `core/campaigns/price.ts`, com a loja delegando. O widget da loja ganhou título e descrição, as peças escolhidas na ordem da dona com vaga vazia, e o modo automático sem escolha. O painel mapeia `campaign_id` e a bandeja oferece o segundo bloco. Probe `02` ok. Revisão: serve com correção |
| T03 O editor no painel | `0b5a21db` (26 arquivos, +2045/−71) | `apps/backoffice`, `packages/core/product-search` | Editor com título e descrição (contador), seletor de campanha (`radiogroup` com estado, vigência e a campanha tomada desabilitada com posição e título), busca recortada às peças marcadas (`ProductSearchField.permitidos`), lista com arraste e subir/descer/tirar, avisos (fora do ar, não barateada, agendada, falha de leitura), conferência ao abrir e ao trocar de campanha, `23505` do índice traduzido na frase de `core`, e a prévia levando a campanha do rascunho. Probe `03` (12 ok). Revisão: serve com correção, com aviso de falha da leitura das peças |
| T04 A linha e a bandeja | `18d70244` (5 arquivos, +487/−20) | `apps/backoffice` | A linha do bloco diz a campanha e o estado, e se não vai aparecer e por quê. Sem campanha ou com a campanha apagada, avisa mesmo desligada. Também diz "N das M saíram do ar" e as peças não barateadas, nomeando cada uma. O bloco novo da bandeja nasce desligado e sem campanha e pede a escolha. Revisão: serve |

**Fora dos commits de código:**
- A nota F13 (o WI 103 supera H-10 e I-10) em `.specs/work-items/102-desconto-de-campanha/spec.md`, escrita pela T02. É artefato de spec.
- Os artefatos deste WI. Os dois vão no commit de artefatos do orquestrador.

## Decisões e premissas

- **Handoff (D-01..D-08, `spec.md` › Decisões).**
  - O protótipo não tem a tela, então o editor segue o molde de "Produtos em destaque" e herda os padrões do protótipo: contador, recusa com ícone e subir/descer/tirar.
  - F3 vence Q-10: a migration não grava dado.
  - O conserto do UC-06 troca só a fonte da leitura.
  - D-04 fica fora.
  - O `23505` é reconhecido pelo nome do índice.
  - O "barateia?" vai para `core`.
  - A vigência é aplicada por views.
  - As marcações são lidas com paginação.
- **Da corrida (I-01..I-07, `spec.md` › Decisões).**
  - **I-01:** as views nasceram **com** `security_invoker`, contra o texto da D-07. Vale o `supabase/CLAUDE.md`, e o efeito está provado pelos probes.
  - **I-02:** o embed usa alias e mantém a chave `product_campaigns`.
  - **I-03:** a API de `core/home/campaignOffers.ts`. O teto de peças é o mesmo de "Produtos em destaque", por referência.
  - **I-04:** a busca ganhou `permitidos` e `rotuloDoConjunto`.
  - **I-05:** `SectionEditorProps` com campos obrigatórios, `updateSectionConfig(…, campaignId?)` e `fetchSections` devolvendo as linhas.
  - **I-06:** título e descrição sem `maxLength`, com recusa ao salvar. O contador usa o formato `n/limite` em vez do "n / teto" do protótipo.
  - **I-07:** regras de aviso da linha do bloco.

## Desvios do PRD e da costura

- **D-07 × I-01** (`security_invoker`): muda a forma, não o comportamento. O admin e o visitante veem só a campanha vigente.
- **Contador `n/limite`** em vez de "n / teto" (D-01): é desvio visual, para a QA conferir.
- **CA-02.4 e Q-10:** o bloco que já existe fica sem campanha até a dona escolher (D-02, decidido no handoff). Depois do deploy, ele **some da loja** até essa escolha.
- Nenhum critério do PRD foi tirado nem adiado.

## Gates executados

| Gate | Resultado |
| --- | --- |
| descoberta / prd-review r1 / handoff / fila | ver tabela Gates do `item.md` |
| Revisão adversarial por tarefa | T01, T02 e T03 servem com correção (corrigidas e reverificadas); T04 serve |
| **Validation 1** | **PASS**. Testes com exit 0: core 6240, store 7854, backoffice 5538, functions 1711. Tipos 0/7/11 e lint 2/2 e 23/5, iguais ao baseline. Build da loja e do painel PASS. 35/35 critérios cobertos, com o RNF-04 por proxy. 0 bugs abertos |

Ocorrências de ambiente na Validation, as duas repetidas com sucesso sem tocar código:
- A primeira rodada da loja saiu com exit 1 por um timeout de RPC do worker do vitest, com 7854 verdes.
- O build da loja falhou sem `apps/store/.env` no worktree, porque o placeholder `%VITE_SUPABASE_URL%` não era substituído. Com as variáveis do Supabase local, passou.

## Pendências conhecidas

1. **Produção:** as migrations `20261130160000` e `20261130170000` estão aplicadas **só no local**. Um push na `master` remota as aplica pelo `Supabase Deploy`. Pergunte ao humano antes. A ordem de publicação é migration e depois os bundles da loja e do painel.
2. **Dona, depois do deploy:** escolher a campanha do bloco "Joias em oferta" que já existe. Sem isso, ele não aparece (efeito de F3 e D-02).
3. **QA no navegador:**
   - RNF-04: 390 px sem rolagem horizontal e o editor a 200 % de fonte.
   - O CLS da fileira e a prévia no iframe.
   - Os dois "Não conferido" da revisão da T04: o aviso das peças antes de a leitura chegar, e a falha das marcações num bloco sem peças escolhidas.
4. **Dívida D-04:** com sessão de admin, a loja mostra peça despublicada (policy `for all` de `products`). Pede WI próprio.
5. **Renumerar** o WI antigo da faixa de avisos, que ainda usa o 103, quando for retomado. A branch de backup é `backup/103-faixa-de-avisos`.
6. **Baselines do `CLAUDE.md`:** as contagens de testes subiram (core 6240, store 7854, backoffice 5538, functions 1711). Atualizar a tabela e o `docs/baselines-historico.md` no fechamento/merge, pela regra do repositório.
