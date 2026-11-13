## 06 · [packages/core · apps/store] Vitrine `/ofertas`

**Status:** done

`UC-06` — 102

**Objetivo.** `/ofertas` reúne as peças da campanha em vigência, com o nome dela no título, chips por percentual e os filtros da categoria; sem campanha, diz que não há ofertas, sai do Google e do sitemap; `/black-friday` leva para lá.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` › Endereçamento · O `<title>` de cada rota · O HTML servido (`api/page`) · Sitemap · A listagem de categoria / os filtros; `packages/core/CLAUDE.md` › Os módulos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Vitrine `/ofertas`); §4 · spec.md — Código; §7 · spec.md — Decisões (T6, H-02, H-03, H-09, H-10, H-11).

**Depende de.** 01 — `core/campaigns` (texto da vitrine, conversão do fim) e a leitura pública. 04 — `apps/store/src/entities/campaign/`, o preço efetivo e o selo. Confira que existem antes de começar.

### Critérios de aceite

### UC-06 · A vitrine da campanha
- Uma página só, no endereço fixo **`/ofertas`** (Decisão D-01), com o nome da campanha no título ("Black Friday"), a linha "Peças
  com 10%, 15% e 20% de desconto até 30 de novembro." (percentuais e data lidos da campanha), a grade das peças
  marcadas e os chips "Todas · 10% · 15% · 20%" com a contagem.
- Filtros, ordenação e rolagem infinita são os da categoria (`CategoryPage`).
- A dona põe o link no menu pelo editor de menu (item de link). O menu não ganha item fixo.
- Durante a vigência, a página aparece no Google com o nome da campanha no título. Fora dela, diz que não há ofertas
  agora, leva às coleções e deixa de ser indexada — a troca acontece em até 5 minutos depois do início ou do fim.
- A categoria antiga "Black Friday", que veio da loja anterior e está desligada, continua desligada; o endereço
  /black-friday leva para /ofertas.

- **RN-08 · A vitrine é derivada, nunca vinculada.** Ela lista as peças marcadas na campanha em vigência; não é uma
  linha em `categories` com vínculos gravados. O endereço é `/ofertas` (D-01), o mesmo para toda campanha, e entra
  nas listas de rotas
  (`ROUTE_SLUGS`, `NON_INDEXABLE_PATHS`/`SITEMAP_STATIC_PATHS`, `usePageMeta`, `api/page`, `reservedSlugRefusal`).

- **RN-14 · Tom.** O selo diz o texto da campanha e o percentual; a vitrine diz até quando vale, por data ("até 30 de
  novembro"). Nada de contagem regressiva, "últimas horas" ou escassez — em nenhuma superfície da campanha.

- **CA-04** A mesma peça antes do início e depois do fim: preço de sempre, sem selo, fora da vitrine — na loja e no
  servidor.

- **CA-09** A vitrine lista exatamente as peças marcadas e ativas da campanha em vigência, com os chips de cada
  percentual e a contagem; sem campanha em vigência, diz que não há ofertas, tem `noindex` e não entra no sitemap.

- **CA-12** Uma campanha com outro nome ("Dia das Mães", texto do selo "DIA DAS MÃES") mostra esse texto no selo, na
  vitrine e no bloco da Home, sem mudança de código.

- **CA-15** Em 390×844 e 1440×900: o selo inteiro nos cartões de 173 e 220 px, sem rolagem horizontal; fonte a 200 %
  sem cortar o percentual; a tela de campanhas do painel sem rolagem lateral em 390.

### Design — o que a tela faz

Copie spec.md › Design › "Vitrine `/ofertas`" — é a fonte. Trilha "Início › {nome}", título = nome, linha "Peças com {lista} de desconto até {data}.", chips "Todas · N" e "{p}% · n" (pressionado, rolam de lado no celular, alvo 44 px), grade 2/3/4 colunas, cartões com a faixa nas cores da campanha; sem campanha, "Não há ofertas agora" com o texto e o botão "Ver as coleções" literais.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| rota `/ofertas` (página `lazy`) | VOCÊ CRIA | `?percentual=<p>` e os parâmetros da categoria | a grade |
| `{ kind: 'offers' }` em `classifyPath` e o ramo em `servePage` | VOCÊ CRIA | a campanha em vigência pela RLS | `<head>` da campanha, `s-maxage=300`; sem campanha, `noindex` |
| `/ofertas` em `ROUTE_SLUGS`, `APP_ROUTE_PATTERNS` e a terceira classe (nem estática nem não indexável); sitemap só com campanha em vigência | VOCÊ MUDA | — | — |
| `/black-friday → /ofertas` em `LEGACY_REDIRECTS` e `apps/store/vercel.json` | VOCÊ CRIA | — | redirect |
| `entities/campaign`, preço efetivo, selo | JÁ EXISTE (tarefa 04). Consuma; não altere. | `useLiveCampaign()` (leitura pública por `now()`; `LiveCampaign`: `id`, `name`, `badge_text`, `band_color`, `accent_color`, `ends_at` exclusivo, `percents` em ordem) e `mapDbToProduct` | a campanha em vigência ou `null`; `Product.price`/`compare_price` (e os das variações) já com a campanha, e `Product.campaign` (com `percent`) na peça cujo preço ela baixa — o `ProductCard` já desenha a faixa (`CampaignBand`) e o cheio riscado; o selo em linha é `CampaignBadgeInline` |

### Decisões já tomadas

- T6 (verbatim): `/ofertas` ganha uma classe própria em `classifyPath` (dinâmica, como produto), com `<head>` montado da campanha em vigência, `s-maxage=300` e o sitemap incluindo `/ofertas` só com campanha em vigência; os dois guardas de classificação ganham o terceiro conjunto.
- H-02: `/ofertas` é a exceção declarada ao AD-014; registre a exceção em `apps/store/CLAUDE.md` › Endereçamento (nesta onda só esta tarefa edita esse arquivo).
- H-03: só redirect (`LEGACY_REDIRECTS` + `vercel.json`); `black-friday` **não** entra em `ROUTE_SLUGS`; a categoria continua desligada.
- H-09: os filtros, a ordenação e a rolagem infinita da categoria, com os chips por percentual por cima; a lista de ordenação própria do protótipo não entra; o link "Ofertas" no menu é a dona quem põe.
- H-10: o filtro do chip na URL é `?percentual=<p>`.
- H-11: o cache de 300 s na virada é aceito.
- RN-08: a vitrine é derivada das marcações, nunca uma linha em `categories`.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| ramo dinâmico do servidor de páginas | `packages/core/src/page/serve.ts:117 — o ramo de produto (s-maxage=300)`; `page/classify.ts:66-89 classifyPath` |
| listagem com filtros e rolagem | `apps/store/src/pages/CategoryPage` e `features/category-filters` |
| rotas e redirects | `packages/core/src/routes/routes.ts:22-79,222-240,254-284,302-311,356-362` |
| meta | `packages/core/src/seo/pages.ts › staticPageMeta`, hook `usePageMeta` |

### Testes

- `core/page`: `classifyPath('/ofertas')` é `offers`; `servePage` com campanha monta título, descrição e canônica da campanha e `s-maxage=300`; sem campanha, `noindex` no HTML.
- Sitemap: `/ofertas` presente só com campanha em vigência.
- Rotas: os guardas bidirecionais com a âncora nova (`reservedSlugs`, `routes`, `sitemapRoutes`, `rotasDeApp`, `routeSplitting`, `metaPorRota`, `paginasFixasServidas`, `seo`, `vercelRedirects`) atualizados para o número verdadeiro, sem afrouxar; `/black-friday` redireciona para `/ofertas`.
- Página real (jsdom): lista exatamente as peças marcadas e ativas; chips com a contagem; `?percentual=15` filtra; sem campanha, o estado vazio com o link; com "Dia das Mães", título e selo da campanha.

### Obrigações

- Âncoras medidas em 2026-11-13 (spec.md › Obrigações transversais): `metaPorRota` 20, `rotasDeApp` 27/16, `sitemapRoutes`/`paginasFixasServidas` 27, `routeSplitting` 20, `seo` 18, `vercelRedirects` 4 — confira no disco e suba para o número verdadeiro.
- `usePageMeta(` na página nova; `server/__tests__/page.test.ts` sem nomear a chave de serviço.
- Nesta onda só esta tarefa edita `core/page/*`, `apps/store/server/*`, `core/routes/*`, `apps/store/src/app/App.tsx` e `apps/store/CLAUDE.md`.

### Não faça

- O preço, o cartão e o selo (tarefa 04); o bloco da Home (07); o JSON-LD do produto e o feed (tarefa 08); um item fixo de menu.

### Pronto quando

- [ ] CA-09 e o redirect de `/black-friday` provados; UC-06 pela página real e por `servePage`
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
