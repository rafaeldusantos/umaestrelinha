## 01 · [packages/core, packages/supabase] A regra da faixa de avisos e a régua de destino interno

**Status:** done

`UC-01, UC-02, UC-03, UC-04 (a regra)` — 101

**Objetivo.** A loja, a função `api/page` e o painel passam a ter uma só resposta para "que avisos existem, quais são
válidos, a faixa existe?", e nenhuma superfície aceita mais `//` ou `/\` como destino interno.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `packages/core/CLAUDE.md` e `packages/ui/CLAUDE.md` (só a
seção dos tokens). Do `CLAUDE.md` da raiz (grande demais), leia as seções: `CLAUDE.md › O "defeito 01": dois donos do
mesmo dado` · `CLAUDE.md › Convenções que valem em todo o repositório` (`strictNullChecks`) · `CLAUDE.md › Alias de
import` (o parágrafo do `.ts` explícito) · `CLAUDE.md › Os guardas — o que trava o quê` · `CLAUDE.md › Baselines`.
Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §4 · spec.md — Código; e §7 · spec.md — Decisões (PR-1..PR-10, H-03..H-05, H-12, H-19, H-21).

**Habilita.** As tarefas 02 (o servidor pergunta "a faixa existe?" a esta regra), 03 (a loja normaliza, lê as alturas
e o canal de prévia) e 04 (o painel recusa por esta regra e manda o rascunho por este canal).

### Critérios de aceite

### UC-01 · A faixa na loja
- Acima do cabeçalho, largura total, fundo `accent` e texto `ink` (sólido, regra da marca para superfície ouro).
  Altura fixa, a mesma para todos os avisos: no celular, a de duas linhas de texto; no computador, 48 px. O texto de um
  aviso cabe em até duas linhas no celular (o painel recusa o que passar disso).
- Um aviso por vez. Com mais de um, troca a cada 6 s (o mesmo ritmo do Banner principal) com uma entrada curta
  (deslocamento, nunca de opacidade zero).
- **Pausa** com o ponteiro em cima, com o foco dentro e enquanto o dedo está na faixa.
- **Computador**: setas de anterior/próximo nas pontas (alvo de 44 px). **Celular**: sem setas; a faixa gira
  sozinha e o aviso inteiro é o link.
- `prefers-reduced-motion`: não gira sozinha; no computador as setas continuam; no celular aparece só o primeiro
  aviso.
- O aviso de texto é um link inteiro (o trecho em destaque, o texto e o rótulo sublinhado do link). Sem link, é texto.
- A faixa rola junto com a página (não é fixa) e não muda o comportamento do cabeçalho que se recolhe no celular.

### UC-02 · Aviso de imagem
- A dona envia duas artes (computador 1440 × 48 e celular 780 × 96), o texto alternativo (obrigatório) e o destino. A
  arte aparece inteira, centralizada na faixa, sem corte; em telas mais largas ou mais estreitas sobra fundo ouro dos
  lados.
- `<picture>` com uma arte por dispositivo (o navegador baixa uma só), rendição do tamanho da vaga.

### UC-03 · O painel
- Uma tela "Faixa de avisos": interruptor geral, a lista de avisos (arrastar para ordenar, até 5), e por aviso: tipo
  (texto ou imagem); texto: trecho em destaque, texto, rótulo do link, destino; imagem: as duas artes, texto
  alternativo, destino.
- O destino é um caminho da loja (`/ofertas`, `/aneis`), recusado pela mesma régua do Banner principal
  (`ctaHrefRefusal`): nada de endereço externo.
- Prévia: a faixa como a cliente vê, nos dois tamanhos.
- O texto de ajuda lembra o tom da loja (sem contagem regressiva, sem "últimas unidades", sem exclamação).

### UC-04 · Sem avisos
- Interruptor desligado ou lista vazia: a faixa não existe e o cabeçalho volta para o topo, como hoje.

- **RN-03 · O tom da loja.** Nenhum tipo de aviso com contagem regressiva, estoque ou prova social, e o catálogo de
  tipos asserta a ausência (como `homeSections.test.ts`). O painel não impede o texto livre; o guia de tom fica na
  ajuda da tela.

- **CA-04** Destino externo é recusado no painel com o motivo; aviso sem destino é texto, sem link.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `packages/core/src/announcements/` + subpath `./announcements` em `packages/core/package.json` | VOCÊ CRIA | — | tipos, constantes, normalização, recusas, `announcementBarExists`, canal de prévia |
| Tipo `AnnouncementSettings` `{ enabled: boolean; items: Announcement[] }`, `Announcement` discriminado por `kind: 'text' \| 'image'` (cada um com `id: string`; texto: `highlight`, `text`, `linkLabel`, `href`; imagem: `imageDesktop`, `imageMobile`, `alt`, `href`) | VOCÊ CRIA (em `core/announcements`) | — | os três consumidores |
| `DEFAULT_ANNOUNCEMENTS` (`enabled: false`, `items: []`) | VOCÊ CRIA | — | `DEFAULTS` e `settings.ts` |
| `normalizeAnnouncements(raw: unknown): AnnouncementSettings` | VOCÊ CRIA | o `value` cru do banco | lixo vira padrão; item de tipo desconhecido ou campo do outro tipo é descartado; do sexto em diante ignorado; nunca lança |
| `announcementRefusal(item, index): string \| null` e `announcementsRefusal(settings): string \| null` | VOCÊ CRIA | o rascunho do painel | o primeiro motivo legível, com ordinal masculino ("o 2º aviso": declare-o em `core/announcements`, no molde de `ordinalF` em `packages/core/src/home/carousel.ts:105`, que é feminino e não serve a "aviso"), ou `null` |
| `announcementBarExists(settings): boolean` | VOCÊ CRIA | o valor normalizado | `true` só com `enabled` **e** ao menos um aviso válido |
| Constantes `ANNOUNCEMENT_LIMIT = 5`, `ANNOUNCEMENT_HIGHLIGHT_MAX = 40`, `ANNOUNCEMENT_TEXT_MAX = 60`, `ANNOUNCEMENT_LINK_LABEL_MAX = 20`, `ANNOUNCEMENT_COMBINED_MAX = 90`, as alturas (`ANNOUNCEMENT_BAR_HEIGHT` com celular e computador em `rem`) e as vagas da arte (`ANNOUNCEMENT_ART_SLOTS`: computador 1440 × 48, celular 780 × 96) | VOCÊ CRIA | — | loja e painel |
| Canal de prévia `core/announcements/preview.ts`: carimbo próprio e duas mensagens — o rascunho (`draft`) e "mostre o aviso N" (`show`) — com o parser que recusa qualquer outro carimbo | VOCÊ CRIA | — | a ponte do painel (04) e o recebedor da loja (03) |
| Chave `announcements` em `SettingsKey`/`SettingsMap` (`packages/supabase/src/types/settings.ts`), com o tipo **reexportado** de `core` | VOCÊ CRIA | — | `useStoreSettings` |
| `DEFAULTS.announcements` em `packages/core/src/hooks/useStoreSettings.ts` (sem ela a linha é descartada em silêncio, `:30-31`) | VOCÊ CRIA | — | `fetchAllSettings` |
| `ctaHrefRefusal` (`packages/core/src/home/refusals.ts:134-157`) | JÁ EXISTE. Altere: recusa caminho que começa com `//` ou `/\` | o destino | motivo ou `null` |
| `internalMenuHrefRefusal` (`packages/core/src/menu/refusals.ts:87-97`) | JÁ EXISTE. Altere: recusa também `/\` | o destino | motivo ou `null` |
| `store_settings` (tabela key/jsonb) | JÁ EXISTE. Consuma; não altere. Sem migration | — | — |

### Decisões já tomadas

- Sem migration: a chave nasce da ausência de linha; o padrão desligado mora no TypeScript (PR-7).
- Validade (H-19): texto exige ao menos o trecho em destaque **ou** o texto; rótulo só com destino (rótulo sem destino
  é recusado com "Sem destino, o rótulo do link não aparece."); destino sem rótulo vale. Imagem: as duas artes e o
  texto alternativo obrigatórios (vazio: "Descreva a arte: é o que o leitor de tela e o Google leem."); destino
  opcional. Destino recusado: a mensagem é a de `ctaHrefRefusal`; o painel mostra "Use um caminho da loja, começando
  com / (ex.: /ofertas). Endereço de fora não é aceito." — se a régua do dono tiver outra frase, a do dono vale e o
  painel a exibe.
- Tetos (H-05): 40 / 60 / 20 por campo e 90 no conjunto (destaque + texto + rótulo), premissa a medir em navegador.
- Alturas (H-04): em `rem` — celular `calc(2 * 1.125rem + 1rem)` (duas linhas de 18 px + 16 px de recuo), computador
  `3rem`; dono único aqui, levado à loja por variável CSS na tarefa 03.
- Mais de 5: a normalização ignora do sexto em diante; a recusa da lista diz o motivo quando houver mais de 5.
- RN-03: o catálogo de tipos é `['text', 'image']`; um teste assere a ausência de qualquer tipo de contagem
  regressiva, estoque ou prova social (molde `homeSections.test.ts`). Guarda de string não escreve a forma proibida por
  extenso no código de produção: descreva-a.
- A régua de destino (PR-6, H-12): o conserto vale para `ctaHrefRefusal` e `internalMenuHrefRefusal`.
- Canal de prévia (H-21): rascunho e "mostre o aviso N" são mensagens distintas no mesmo carimbo.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| Chave nova sem migration | `packages/supabase/src/types/settings.ts:417-421` — `buy_together`; `useStoreSettings.ts:53-54` — a entrada em `DEFAULTS`; `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts:581-595` — o bloco "nenhuma migration grava a chave" |
| Tipo declarado em `core` e reexportado | `settings.ts:20,22` — `NotificationSettings`/`DEFAULT_NOTIFICATIONS` |
| Normalização na leitura | `packages/core/src/buy-together/settings.ts › normalizeBuyTogetherForm` |
| Recusa `string \| null` com ordinal | `packages/core/src/home/featured.ts › featuredProductsRefusal`; `carousel.ts › heroCarouselSlidesRefusal` |
| Canal de prévia com carimbo | `packages/core/src/menu/preview.ts › MENU_PREVIEW_SOURCE`, `parseMenuPreviewMessage` |
| Pureza e alcance do módulo | `packages/core/src/page/__tests__/purity.test.ts` |

### Testes

- A faixa existe só com o interruptor ligado e ao menos um aviso válido; desligada, sem aviso ou só com avisos
  inválidos, não existe (unidade).
- O valor gravado é normalizado na leitura: do sexto aviso em diante é ignorado; tipo desconhecido, campo do outro tipo,
  `null`, número e texto solto nunca lançam (unidade).
- As recusas, em ordem e com ordinal: texto vazio, rótulo sem destino, cada teto por campo, o teto conjunto de 90,
  imagem sem uma das artes, sem texto alternativo, destino externo, mais de 5 (unidade).
- O catálogo de tipos não tem contagem regressiva, estoque nem prova social (unidade, molde `homeSections.test.ts`).
- `ctaHrefRefusal` e `internalMenuHrefRefusal` recusam `//host` e `/\host` e continuam aceitando `/ofertas` e `/a/b`
  (unidade, nos testes existentes de cada régua).
- O canal de prévia aceita só o carimbo dele e recusa a mensagem da Home e a do menu; a mensagem `show` com índice fora
  da lista é recusada (unidade).
- `core/announcements` não importa React, Supabase, alias nem especificador relativo sem `.ts` (`import type` incluso)
  (guarda de pureza no molde de `core/page/__tests__/purity.test.ts`).
- `storeSettingsDefaults`: a chave `announcements` nasce desligada e nenhuma migration a grava (guarda da loja).

### Obrigações

- Todo especificador relativo de `core/announcements` com `.ts` explícito, `import type` incluso (a função `api/page`
  o empacota fora do Vite — `packages/core/src/page/classify.ts:7`).
- Vereditos `string | null`, nunca união por literal booleano (`strictNullChecks: false`).
- Mudança em `packages/core` tem gate de três workspaces: rode a suíte de `core`, da loja e do painel (o painel chama
  `ctaHrefRefusal` por `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts`).
- Acrescente ao `packages/core/CLAUDE.md` a entrada do módulo `announcements` (o que ele decide e quem o lê).

### Não faça

- Migration nenhuma, nem `check` no jsonb.
- O widget da loja, o atributo no `<html>`, a função `api/page` (tarefas 02 e 03).
- A tela do painel, a ponte e o palco da prévia (tarefa 04).
- Agendamento por data, faixa por página, fechar a faixa, contador de tempo (fora do PRD).

### Pronto quando

- [ ] `announcementBarExists` responde `true` só com o interruptor ligado e ao menos um aviso válido.
- [ ] A recusa de destino externo devolve o motivo, e `//host` e `/\host` são recusados pelas duas réguas.
- [ ] O catálogo de tipos assere a ausência de contagem regressiva, estoque e prova social.
- [ ] `useStoreSettings` devolve `announcements` com o padrão desligado quando a linha não existe.
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
