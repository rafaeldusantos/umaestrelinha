## 01 · [supabase, packages/core, apps/backoffice] Listas do Compre Junto (menu Compre Junto › Listas)

**Status:** done

`UC-01, RNF-07` — WI-01

**Objetivo.** A dona cria, ordena, edita e apaga listas nomeadas e reutilizáveis de peças, e o banco e o `core` ficam com o contrato de dados e as regras puras que as outras tarefas consomem.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` da raiz › O "defeito 01", › Os guardas, › Convenções, › Baselines, › CI e deploy, › Feature-Sliced Design; `packages/core/CLAUDE.md` › Quando um código pertence ao pacote, › Pureza, › Os módulos; `apps/backoffice/CLAUDE.md` › O fornecedor da peça, › `/admin/perguntas`, › O editor de Produtos em destaque, › A busca de produto, › O movimento do painel; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram (e, na tarefa do pedido, › `checkout`). Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel — Compre Junto, Listas), §4 — Código, §7 — Decisões

**Depende de.** nada — é a primeira tarefa.
**Habilita.** 02 (tabelas, tipos, recusas), 03 (tabelas, `core/buy-together` e seu barrel), 06 e 07 (página e navegação do menu Compre Junto).

### Critérios de aceite

**UC-01 · A dona monta as listas do Compre Junto**
Numa tela própria do painel, a dona cria uma lista com um nome (ex.: "Correntes"), acrescenta peças, ordena-as e, em cada peça, escolhe quais variações valem.
- CA-01.1 A lista tem nome obrigatório, de até 40 caracteres com contador, e pelo menos uma peça para ser usada por um adicional. Uma lista sem peças pode ser salva, mas não pode ser escolhida por um adicional. O nome da lista é o que a cliente lê no bloco da loja [pedido; conhecimento; ajuste do usuário em 2026-11-02; gate principal 2026-11-02 · lista-nome-e-lista-vazia]
- CA-01.2 A dona reordena as peças da lista arrastando ou com "mover para cima/baixo", e a loja mostra a nova ordem [pedido; código: editor de Produtos em destaque, `apps/backoffice/CLAUDE.md` › feature 50]
- CA-01.3 Em cada peça da lista, a dona escolhe quais variações valem; nenhuma marcada vale todas as ativas [pedido ("e suas variantes"); gate Q-07]
- CA-01.4 Uma lista mostra em quantos produtos ela está em uso; editar a lista muda o bloco de todos eles [conhecimento]
- CA-01.5 Uma peça da lista que saiu do ar aparece marcada no painel ("saiu do ar") e é pulada pela loja [código: `apps/backoffice/CLAUDE.md` › "A vaga que sobra fica VAZIA, e o painel AVISA"]
- CA-01.7 Uma lista em uso não pode ser apagada. O painel diz em quais produtos ela está, e a dona a tira desses produtos antes de apagar. [PRD Tech Review r1]
- CA-01.6 A lista não vira vitrine nem página da loja: ela só existe dentro do Compre Junto [código: `AD-014`, `apps/store/CLAUDE.md:204-207`]


**Requisitos não-funcionais desta tarefa**
- RNF-07 Configuração gravável só pela dona; leitura pública da configuração sem condição de ativo, com o produto inativo filtrado pela leitura de produtos (a RLS de `products`), no precedente das perguntas frequentes [código: `supabase/CLAUDE.md:113-135`; gate principal 2026-11-02 · leitura-publica-ativo]

### Design — o que a tela faz

### Painel — Compre Junto, Listas (UC-01)

- **Índice** (`Catálogo › Compre Junto`): cabeçalho com título, subtítulo e "Nova lista"; abas "Listas" (com contagem) e "Adesão". Desktop: tabela com Lista, Peças, Em uso em, Atualizada, Editar; celular: cartões equivalentes (cada um abre a lista). Dados: nome (máx. 40); aviso "N peça(s) saiu/saíram do ar"; fotos em pilha (4 no desktop, 3 no cartão); "N de 12" / "N peça(s)"; "N joia(s)" ou "Nenhuma joia"; "Atualizada" relativa (só desktop). Vazio: "Uma lista junta as peças que você oferece junto com outras joias — por exemplo, as correntes. Monte uma vez e use em quantas joias quiser." mais "Nova lista". Carregando e erro: não desenhados.
- **Editor de lista:** migalha; título = nome; subtítulo "A ordem daqui é a ordem em que a cliente vê as peças, em todas as joias que usam esta lista."; "Excluir lista"; faixa de recusa; cartão "Lista" (nome, máx. 40, contador "n / 40", sem mensagem junto do campo além da barra) e cartão "Peças da lista" (busca de produto de 2 caracteres, até 8 resultados, sem acento, resultado desabilitado com motivo "Já está na lista" / "Fora do ar"; lista numerada com posição, foto, nome, "a partir de R$ X"; variações liberadas por peça: "todas as ativas (N)" ou "k de N", marcadores com foto, nenhuma marcada = todas as ativas, "inclusive as que você criar depois"); lateral "Em uso" ("N joia(s) oferece(m) esta lista", até 4 nomes, "Ver as N joias" acima de 4) e "Como a cliente vê"; barra de salvar ("Dê um nome à lista para salvar." / "Alterações não salvas" / "Tudo salvo"; "Salvar lista", "Voltar").
- **Ações por peça:** Subir/Descer (desabilitados na primeira/última), Tirar, arrastar pela alça (só mouse; os botões cobrem teclado e toque), "Escolher quais / Esconder / Oferecer todas".
- **Recusas escritas:** 13ª peça — "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista."; excluir lista em uso — "Esta lista está em uso em N joia(s) (nomes, até 3, e " e outras" se N > 3). Tire-a delas antes de excluir." (a exclusão não acontece).
- **Estados:** lista nova ("Nova lista", sem peças); sem peças ("Nenhuma peça ainda. A lista só pode ser usada numa joia depois de ter pelo menos uma."; o Salvar só exige nome); peça fora do ar (linha marcada: "Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar.", sem marcadores de variação); salvando ("Salvando…"). Toasts: "Lista salva.", "Lista “X” excluída.". Não há confirmação ao sair com alteração não salva nem ao excluir/tirar.
- **Não mostra:** carregando e erro de leitura/gravação; destino dos links "Em uso" e "Ver as N joias"; variante mobile do editor (só o índice e a adesão têm `cards-mob`).

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| tabela de listas (nome até 40, `updated_at`) | VOCÊ CRIA | nome | id, nome |
| tabela de peças da lista (lista, produto, posição, variações liberadas como lista de ids sem FK, até 12 por lista) | VOCÊ CRIA | produto, posição, variações | peças ordenadas |
| tabela de adicionais por produto (produto principal, posição 0..2, tipo `product`/`list`, produto-alvo ou lista-alvo, variações do alvo liberadas, variações do principal em que some) — **só o schema nasce aqui**; a tela é da tarefa 02. Duas FKs para `products` (principal e alvo): nomeie as duas, para o embed não dar `300 PGRST201`. Vínculo produto→lista `on delete restrict` | VOCÊ CRIA | — | — |
| view de uso da lista, `security_invoker`, que nomeia os produtos que a usam | VOCÊ CRIA | — | lista, produtos |
| `packages/core/src/buy-together/` (constantes 3, 12 e 40; recusas `string \| null`: 4º adicional, 13ª peça, nome vazio/longo, lista sem peças usada, apagar lista em uso, **o produto principal escolhido como adicional** e **o produto já escolhido em outro adicional do mesmo produto** (a tarefa 02 só as chama); tipos; barrel `index.ts`) e a entrada `./buy-together` em `packages/core/package.json` | VOCÊ CRIA | — | regra pura para painel, loja e `checkout` |
| `products`, `product_variants`, `has_role`, `store_settings` | JÁ EXISTE. Consuma; não altere. | — | — |
| `packages/supabase/src/types/index.ts` | JÁ EXISTE. Acrescente só os tipos novos | — | — |

### Decisões já tomadas

- (#8, `lista-nome-e-lista-vazia`) "Ratificar o protótipo: nome até 40 caracteres, lista vazia salvável mas inutilizável num adicional" → CA-01.1
- (#10, `teto-de-pecas-por-lista`) **D-teto-de-pecas-por-lista** — no máximo 12 peças por lista; a 13ª é recusada no painel com o motivo, sugerindo uma segunda lista (molde `featuredProductsRefusal`, `packages/core/src/home/featured.ts`). Motivo: `.in()` com ids na URL (BUG-20260809) e peso no 390 px
- (#11, `variacoes-liberadas-que-deixam-de-existir`) **D-variacoes-liberadas-que-deixam-de-existir** — "nenhuma marcada vale todas" só quando a dona não marcou nenhuma; se todas as liberadas deixarem de existir, o adicional (ou a peça da lista) sai da loja e o painel avisa; nunca passa a valer todas. **Consequência de modelagem:** variações liberadas guardadas como lista de ids sem FK com cascata (um `on delete cascade` deixaria zero linhas e seria lido como "todas") — inferência do code lookup, a confirmar na tarefa
- (#12, `listas-x-ad-014`) **D-listas-x-ad-014** — novo AD: a lista do Compre Junto ≠ coleção, sem rota, menu ou sitemap. Tabelas: listas, peças da lista (ordem, variações liberadas) e adicionais por produto (ordem, tipo, alvo — sem título —, variações do principal em que some). Leitura pública, escrita por `has_role`, guarda de schema no molde `faqSchema`/`fornecedorSchema`; uso contado por VIEW `security_invoker`; vínculo produto→lista `on delete restrict`
- (#17, `guardas-que-a-feature-toca`) **D-guardas** — por tarefa: `semMaterialNaPaginaDoProduto` (escopo literal, incluir o widget novo), `marcacaoSoPorAcao` (RPC nova), `animacaoRespeitaMovimento`, `rotasSobGuarda`/`navItems`/`focusRoutes`, `buscaDeProdutoComDonoUnico`, fixtures com `buy_together_ids`, e o guarda de schema novo (uma régua por comando, `mutar()` que lança)
- (#19, `gravacao-do-compre-junto-no-formulario-do-produto`) **D-gravacao-no-formulario** — recusas puras em `core/buy-together` (retorno `string \| null`); adicionais gravados recortados pelo principal; probe HTTP contra o banco local (`AD-012`)

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| migration de tabelas com leitura pública, escrita só do painel, `restrict` e view de uso | `supabase/migrations/20260816120000_28-perguntas-frequentes.sql` — tabelas (60-82), view `faq_usage` (107-114), RLS (154-194); `20261022150000_80-fornecedor-da-peca.sql` — `revoke` de `anon` e `has_role` no `using` e no `with check` |
| guarda de schema | `apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts` — o caminho literal da migration (24), os limites importados de `core` (28-70), `mutar()` que lança; e `faqSchema.test.ts` |
| módulo `core` com recusas e teto | `packages/core/src/home/featured.ts` › `featuredProductsRefusal` e `FEATURED_PRODUCTS_MAX` |
| pureza e alcance do Deno | `packages/core/src/checkout/__tests__/denoReach.test.ts` e `packages/core/src/proposals/__tests__/purity.test.ts` — o molde de pureza e de alcance do Deno (especificador relativo com `.ts` explícito, `import type` incluso) |
| entrada do pacote | `packages/core/package.json` — a entrada `./suppliers` (linha 41) |
| editor ordenável | `apps/backoffice/src/features/home-composition/ui/FeaturedProductsEditor.tsx` — arraste (62-74) e peça órfã (222); "mover para cima/baixo": `apps/backoffice/src/features/store-menu/ui/MenuTree.tsx` (380, 388, 475, 485) |
| biblioteca com "em N produtos" e apagar recusado | `apps/backoffice/src/pages/admin/AdminFaqsPage.tsx` e `features/faq-library/*` |
| busca de produto e variações da peça | `entities/product/ui/ProductSearchField.tsx` (38-90, `modo: 'multiplo'`, `excluir`); `entities/product/api/useProductVariants.ts` (30-60, `VariacaoDaPeca`) |
| rota auto-fechada dentro do `RequireAdmin` e item de nav | `apps/backoffice/src/app/App.tsx` (56-149) e `widgets/admin-layout/model/navItems.ts` (grupo Catálogo, 82-96) |

### Testes

- Unidade em `core/buy-together`: o 4º adicional, a 13ª peça, o principal escolhido como adicional e o produto repetido em outro adicional são recusados com o motivo escrito; nome vazio ou acima de 40 é recusado; lista sem peças não pode ser escolhida por um adicional; apagar lista em uso é recusado nomeando os produtos (nível: unidade).
- Pureza e alcance do Deno de `core/buy-together`: nenhum import de React/Supabase/Deno, todo relativo com `.ts` (nível: guarda que lê disco, com âncora de arquivos).
- Guarda de schema da migration, uma régua por comando: `if not exists`, `restrict` do vínculo produto→lista, `check`s de posição, tipo e limites **importados** de `core`, RLS (`has_role` no `using` e no `with check`, nenhum `grant` a `anon`), `security_invoker` da view, nenhuma escrita de dado; `mutar()` que lança (nível: guarda que lê disco).
- Probe `psql`/HTTP no banco local: anônimo lê e não escreve; escrita só com `has_role`; apagar lista em uso é recusado pelo banco; as tabelas novas respondem pelo PostgREST (nível: integração no banco local).
- Tela de Listas pela página real (client dublado): criar, reordenar por mover e por arraste, tirar peça, liberar variações, peça fora do ar marcada, 13ª recusada, excluir em uso recusado com os produtos, "em N joias" (nível: página real).
- Rota fora do guarda reprova (`rotasSobGuarda`), nav e foco (`navItems`, `focusRoutes`), movimento com par `motion-reduce:` (nível: guardas existentes estendidos).

### Obrigações

- **Core**: a regra mora em `core/buy-together` e a tela e a migration a leem/espelham; o limite do `check` do banco é **importado** do `core` no guarda (não copiado).
- **Banco**: leitura pública das tabelas novas sem condição de ativo (RNF-07 emendado); escrita só com `has_role` no `using` e no `with check`; nenhum `grant` a `anon`; `if not exists`; sem escrita de dado; prefixo da migration apurado na hora (o prefixo é a chave do `schema_migrations`); aplique só no local (`supabase migration up --local`) e **nunca** `--linked`.
- **Tipos** do banco são afirmação: prove por probe HTTP contra `:54441` que o painel lê e grava as tabelas novas (`AD-012`).
- **Import relativo em `core/buy-together` sempre com `.ts`**, `import type` incluso; não escreva em comentário a forma proibida do import.
- **Guardas a estender** (todos de `CLAUDE.md` › Os guardas): `rotasSobGuarda` (rota dentro do bloco do `RequireAdmin`, sem aninhar), `navItems`, `focusRoutes`, `animacaoRespeitaMovimento` (escopo literal: inclua os arquivos novos de UI com par `motion-reduce:`), `buscaDeProdutoComDonoUnico` (nenhuma consulta de `products` por nome fora de `entities/product/api`).
- **Mobile primeiro**: tabela no desktop e cartões no celular; alvos de 44 px; sem rolagem horizontal do body.
- **Documentação desta tarefa**: linha de `core/buy-together` na tabela de `packages/core/CLAUDE.md`; as tabelas novas em `supabase/CLAUDE.md`; a tela em `apps/backoffice/CLAUDE.md`.

### Não faça

- Desconto, "combinar o acabamento", campo de desconto do protótipo.
- A tela de adicionais no produto e a conversão de `buy_together_ids` (tarefa 02).
- A aba "Adesão" e a RPC do relatório (tarefa 06); a escolha da forma do bloco (tarefa 07).
- Página, rota ou sitemap para a lista na loja: a lista só existe dentro do Compre Junto.
- Mexer em `packages/core/src/payment/**`.
- `drop column` de `buy_together_ids`.

### Pronto quando

- [ ] a dona cria, nomeia (até 40), ordena (arraste e mover) e salva uma lista de até 12 peças com variações liberadas por peça; a 13ª peça é recusada com o texto do design
- [ ] apagar uma lista em uso é recusado pelo banco (`restrict`) **e** pela tela, nomeando os produtos
- [ ] peça fora do ar aparece marcada "saiu do ar" no editor e no índice
- [ ] probe contra o banco local: anônimo lê e não escreve; escrita só com `has_role`; as tabelas novas respondem pelo PostgREST
- [ ] `git diff --name-only -- packages/core/src/payment` vazio
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório tocado (tipos do workspace e a suíte do workspace com `--testTimeout=20000` sem o `--`; e a suíte da loja quando o painel mudou), sem comandos copiados aqui: estão em `CLAUDE.md` › Comandos e › Baselines e em `.specs/project/PROJECT.md` › Comandos de verificação


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
