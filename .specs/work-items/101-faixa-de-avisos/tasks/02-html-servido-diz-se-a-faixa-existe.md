## 02 · [packages/core/src/page, apps/store/server, apps/store/scripts] O HTML servido diz se a faixa existe

**Status:** done

`UC-01, UC-04 (RN-02)` — 101

**Objetivo.** Toda página da loja — a Home inclusive — sai do servidor com o veredito "a faixa existe / não existe"
gravado no `<html>`, para a loja reservar a altura desde a primeira pintura.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `packages/core/CLAUDE.md`. Dos grandes demais, leia as
seções: `apps/store/CLAUDE.md › O HTML servido — a função api/page` · `apps/store/CLAUDE.md › A home não salta enquanto
carrega` · `apps/store/CLAUDE.md › Quem pode enquadrar a loja` · `CLAUDE.md › Os guardas — o que trava o quê`
(`vercelRedirects`, `paginasFixasServidas`, `rotasDeApp`) · `CLAUDE.md › Estado da infraestrutura` (a prova pelo
`Content-Type` e pelo corpo, `AD-021`) · `CLAUDE.md › CI e deploy` · `CLAUDE.md › Baselines`. Divergindo desta tarefa
sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; e §7 · spec.md — Decisões (PR-1, PR-7, H-02, H-13, H-17, H-18, H-24).

**Depende de.** 01 — `packages/core/src/announcements/` com `normalizeAnnouncements` e `announcementBarExists`, e a
chave `announcements` em `settings.ts`. Confira que existe antes de começar.
**Habilita.** 03 — o atributo no `<html>` (nome e valores abaixo), que a faixa lê na primeira renderização.

### Critérios de aceite

- **RN-02 · Sem salto quando a faixa chega.** A configuração chega pelo navegador depois da primeira pintura; a faixa
  aparecendo ali empurraria a página inteira para baixo (o CLS que a feature `40` mediu e fechou). Por isso a página já
  sai do servidor dizendo se a faixa existe — em toda página da loja, Home inclusive — e a loja reserva a altura desde a
  primeira pintura. Quem decide se a faixa aparece numa visita é essa resposta do servidor; a configuração que chega
  depois só preenche os avisos.

### UC-04 · Sem avisos
- Interruptor desligado ou lista vazia: a faixa não existe e o cabeçalho volta para o topo, como hoje.

- **CA-06** Com a faixa ligada, o CLS da Home e da página de produto não sobe (medido em navegador, rede lenta).

- **CA-08** Depois de ligar, a faixa aparece em produto e categoria em até 5 minutos e em todas as páginas em até 1
  hora; nenhuma página a mostra empurrando o conteúdo nesse meio-tempo.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| Atributo `data-faixa` na tag `<html>` do HTML servido: `"1"` (existe), `"0"` (não existe); **ausente** quando a leitura da configuração falhou | VOCÊ CRIA | o veredito de `announcementBarExists` | toda resposta HTML: Home, produto, categoria, página fixa, rota de app (checkout inclusive) e 404 |
| Função nova em `packages/core/src/page/head.ts` que marca a tag `<html …>` (substitui, nunca duplica; sem tag, o shell volta intacto; o `lang` fica) | VOCÊ CRIA | o HTML e o veredito | o HTML |
| `PageSettings` (`packages/core/src/page/serve.ts:73-78`) ganha o veredito da faixa (`boolean \| null`, `null` = não sei) | VOCÊ ALTERA | — | — |
| `servePage` lê a configuração em **todo** ramo HTML, em paralelo com as leituras do ramo; leitura de configuração que falha ⇒ atributo ausente e `Cache-Control: no-store` naquele ramo; o caminho com extensão (`notfound` por classificação) continua 404 sem ler o catálogo | VOCÊ ALTERA (`serve.ts › lerConfiguracoes` :293-302, `servirFixa` :195-209, `app` :181-182, `naoEncontrada` :144-158, `servirProduto` :309) | — | — |
| `readSettings` (`apps/store/server/page.ts:166-181`): `announcements` no `.in('key', …)` (:170) e a tradução para `PageSettings` pelo `normalizeAnnouncements` + `announcementBarExists` de `core/announcements` | VOCÊ ALTERA | — | — |
| A Home servida pela função: `apps/store/scripts/build-server.mjs` tira `dist/index.html` da saída publicada **só quando roda na Vercel** (variável `VERCEL`, precedente `apps/store/scripts/build-robots.mjs`), depois de embutir o shell; localmente o arquivo fica (para `vite preview`) | VOCÊ ALTERA | — | — |
| O catch-all `/:path*` → `/api/page?__path=/:path*` (`apps/store/vercel.json:24`) e `originalUrl` (`server/page.ts:70-79`) | JÁ EXISTE. Consuma; não altere | — | — |
| `/` classificado `app` (`classify.ts:67`) com `PAGE_CACHE.fixed` (`serve.ts:116-121`) | JÁ EXISTE. Consuma; não altere a classificação nem o cache | — | — |
| `core/announcements` (`normalizeAnnouncements`, `announcementBarExists`) | JÁ EXISTE (da 01). Consuma; não altere | — | — |

### Decisões já tomadas

- PR-1: a Home passa a ser servida pela função `api/page`, com o mesmo cache de hoje para `/` (3600 s); toda resposta
  HTML grava o atributo; o atributo manda na existência da faixa naquela visita.
- H-18: leitura de `store_settings` que falha com o resto do ramo bom ⇒ atributo ausente e `no-store`.
- H-17: o `index.html` sai da saída publicada só na Vercel.
- H-02: o atributo sai também em rotas onde a faixa não monta (`/checkout`); é a loja (tarefa 03) que só reserva a
  altura dentro do `StoreLayout`. Não escreva CSS aqui.
- H-13: atualize os comentários que passam a mentir (`classify.ts:3,54`, `serve.ts:6`) e a seção `apps/store/CLAUDE.md
  › O HTML servido` (a Home agora passa pela função; o atributo `data-faixa` e os três estados).
- H-24: o aumento de tempo da Home é risco registrado; não otimize nada por conta.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Marcar o HTML servido | `packages/core/src/page/head.ts › injectIntoHead` (:88-92) e `applyHead` (:146-185) — "substitui, nunca duplica", e o shell intacto sem a tag |
| Ler a chave | `apps/store/server/page.ts › readSettings` (:166-181) |
| Passo de build só na Vercel | `apps/store/scripts/build-robots.mjs` (o ramo pela variável `VERCEL`) |
| Teste de `servePage` com dublês | `packages/core/src/page/__tests__/serve.test.ts` (os casos de produto que já leem configuração) |
| Teste da função com dublê que registra tabela e filtro | `apps/store/server/__tests__/page.test.ts:244-268` |

### Testes

- `servePage` grava `data-faixa="1"` com a faixa ligada e um aviso válido, e `"0"` desligada ou sem aviso, em Home,
  produto, categoria, página fixa, rota de app e 404 (unidade, `core/page`).
- Leitura de configuração que falha ⇒ o `<html>` sem o atributo, o status inalterado e `no-store` (unidade).
- O atributo sai uma vez só, o `lang` fica, e o HTML sem `<html>` volta intacto (unidade, `head.ts`).
- O caminho com extensão continua 404 sem ler o catálogo (reescreva os casos que diziam "não lê nada" com a vizinha
  nova: lê só `store_settings`) (unidade).
- A função pede `announcements` no `.in('key', …)` e traduz a linha pela regra de `core` (unidade, `server/page.test.ts`
  com o dublê que registra a chamada).
- O build tira `dist/index.html` com `VERCEL` definido e o mantém sem ela (unidade, `scripts/__tests__/shell.test.ts`).
- `vercelRedirects.test.ts` e `paginasFixasServidas.test.ts` seguem verdes com o comportamento novo (guardas; a âncora de
  dois rewrites continua).
- Integração no ambiente local: `pnpm --filter @estrelinha/store build` e importar `apps/store/.server/page.mjs` com
  `node --env-file=.env` contra o Supabase local (API 54441), chamando `?__path=/`, `?__path=/produtos/<slug>` e
  `?__path=/<categoria>` com a chave ligada, desligada e ausente; o atributo no corpo confere (`apps/store/CLAUDE.md ›
  O HTML servido` diz como). Use só o banco local; nunca `*.supabase.co`.

### Obrigações

- `core/page` é empacotado por esbuild fora do Vite: imports por arquivo, com `.ts` explícito, sem alias
  (`classify.ts:7`, `serve.ts:23`).
- Asserção de guarda pode ser reescrita quando a régua ganha casos, nunca afrouxada; a reescrita ganha vizinha
  (`CLAUDE.md › Baselines`, regras de leitura).
- Não use a chave de serviço em `apps/**` (`chaveDeServidorForaDoNavegador`).

### Não faça

- O widget da faixa, a reserva de altura em CSS, a leitura do atributo pela loja (tarefa 03).
- A tela do painel (tarefa 04).
- Mudar o cache de `PAGE_CACHE` ou a classificação de rotas.
- Migration.

### Pronto quando

- [ ] Toda resposta HTML da função, Home inclusive, traz `data-faixa="1"` ou `"0"` conforme a regra de `core`.
- [ ] A leitura que falha deixa o atributo ausente e a resposta `no-store`.
- [ ] O build publicado na Vercel não leva `dist/index.html`; o local leva.
- [ ] A prova local com `api/page.mjs` contra o banco local mostra os três estados.
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
