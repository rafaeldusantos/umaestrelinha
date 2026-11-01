# Sessão CH-NN · <título do charter>

<!--
Um arquivo por sessão: sessions/CH-NN-<slug>.md, com o mesmo slug do charter. Quem lê é o wi-qa-triager, sem
poder perguntar a você: cada achado precisa se sustentar sozinho. Toda seção é obrigatória; sem conteúdo,
`nada`. Remova as seções CFR e Design fora desses tipos, e este comentário.
Nunca escreva aqui credencial, token ou dado pessoal.
-->

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-NN-<slug>.md` · <tipo> · <prioridade>         |
| Status      | done · blocked (<credencial · massa · ambiente · design>) · not-run (<motivo>) |
| Persona     | PER-NN <nome> · conta: <slug — `QA_<CONTA>_*`, nunca o valor · anonima> |
| Tour · modo | <tour> · <modo> — `—` no cfr e no design-check                         |
| Rodada      | exploração · confirmação                                               |
| Orçamento   | X ações de browser de Y                                                |
| Ambiente    | <URL> · build <versão visível, ou `não exposto`> · <engine do browser> · viewports <1280 · 375> |
| Paridade    | <desvios de produção — mock, atalho de login, dado sintético — ou `nenhum`> |

## Missão

<A missão do charter, copiada.>

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | <ação em linguagem de usuário> | <o que a tela mostrou>                 | `screenshots/CH-NN-01.png` · — |

**Edge cases tentados:** <um por item, da lista do charter ou improvisado — ou `nada`>

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-…   | pass · fail · blocked · skip   | 04    | `screenshots/CH-NN-04.png` | <`fail` ⇒ A-N · `blocked`/`skip` ⇒ o porquê> |

Contagem: pass X · fail X · blocked X · skip X

## Achados

<!-- Um bloco por achado, registrado no momento em que aconteceu. Sessão sem achado: `nada`. -->

### A-1 · <[Superfície] o que quebra — para quem>

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-NN <nome>                                                         |
| Jornada e passo     | J-NN, passo N (<verbo>) · passo <NN> do log                           |
| TC                  | TC-… · —                                                              |
| Gravidade proposta  | critical · high · medium · low — <o impacto na persona, em uma frase> |
| Reproduziu          | sim (2 de 2) · intermitente (1 de 2)                                  |
| Viewport            | <largura × altura>                                                    |

**Passos para reproduzir** — de um estado limpo:

1. <com qual persona, em qual conta, partindo de qual URL>
2. <ação>
3. <o passo onde quebra>

**Esperado:** <o comportamento certo> — **fonte:** <PRD §… · P1-AC03 · C-02 · TC-… · protótipo, tela …>

**Observado:** <o que a persona viu. Mensagem de erro copiada exata.>

**Evidência:**

- `screenshots/CH-NN-<passo>.png` — <o que a imagem prova>
- console: <`TypeError: …` · `nada`>
- rede: <`POST /api/… → 500` · `nada`>

## CFR

<!-- Só no tipo cfr. Uma linha por jornada × categoria. `friction` e `fail` têm achado. -->

| Jornada | Categoria             | Marca                    | Itens que não passaram | Achado |
| ------- | --------------------- | ------------------------ | ---------------------- | ------ |
| J-NN    | Acessibilidade        | pass · friction · fail   | <foco visível no modal> | A-N · — |

**Categorias fora:** <categoria — por quê, ou `nada`>

## Design

<!-- Só no tipo design-check. Uma linha por diferença, valores normalizados. Cada diferença tem achado. -->

**Protótipo:** `<id>` · <name> · `<tool>` · lido por <MCP da fonte · aba do browser>

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | <rota> · <frame>     | <nome acessível> | `font-weight` | `500` (token `…`)      | `400` · 1280           | `screenshots/CH-NN-<passo>-<slug>.png` | A-N |

**Telas não conferidas:** <tela — `blocked` (não localizada na fonte) · sem frame para 375 — ou `nada`>

## Spec-gaps

<!-- Comportamento que nenhuma fonte define, ou protótipo × PRD em conflito. Descreva, não investigue. A
classe é proposta; quem decide é a triagem. `mudança` só na superfície da Mudança do charter e quando decide
se a persona conclui a jornada. Na rodada de confirmação: `nada`. -->

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
|                         |              | mudança · pré-existente · polimento |

## Fora da cobertura

<!-- O que o charter pedia e a sessão não alcançou, e por quê: orçamento, fora do alcance do browser, bloqueio. -->

- <item — motivo>

## Debrief

- **Surpresas:** <o que não se esperava e mudou a sessão — ou `nada`>
- **Próximo charter:** <o que merece outra sessão — ou `nada`>
- **Padrão novo:** <padrão improvisado que achou bug, candidato a tour — ou `nada`>
