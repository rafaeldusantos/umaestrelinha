# Sessão CH-05 · CFR — o editor de cor e o rótulo colorido na loja

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-05-cfr.md` · cfr · P1                         |
| Status      | done (cobertura parcial: o orçamento acabou, veja Fora da cobertura)  |
| Persona     | PER-01 Adri, a dona · conta: admin — `QA_ADMIN_*`                     |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 38 ações de browser de 38 (mais o `close` final)                       |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewports 1440 × 900 (painel e loja) · 390 × 844 (loja) |
| Paridade    | backend Supabase local (:54441), não o de produção; `*.supabase.co` e `g/collect` bloqueados; login por e-mail e senha, o mesmo da dona; dado sintético de QA |

## Missão

Refazer como auditoria a montagem do destaque pela dona e a leitura dele na folha do celular, conferindo se o editor de cor se usa só com teclado e com fonte grande, e se o rótulo colorido se lê e cabe em todas as larguras.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel por `/admin/menu` e abrir o editor de "Personalizados" (Ações › Editar nome, ícone e banners), a 1440 × 900 | O login devolve ao Dashboard, não ao Menu (pré-existente, fora da Mudança). O editor abre com o seletor em dois grupos ("DA UMA ESTRELINHA" e "DO SISTEMA", títulos `h3` e `group` na árvore), busca "Buscar ícone pelo nome", e o bloco "Cor do texto" com os campos "Na barra do computador (fundo escuro)" e "Na lista do celular (fundo branco)", cada um com seletor de cor (rótulo "… — seletor") e "Usar a cor padrão" (desabilitado sem cor). Estado de partida de C: ícone "Gravação" (`aria-pressed=true`), sem cor nas duas superfícies | — |
| 02 | Só com teclado: ir à busca, digitar "presente", Tab até o resultado, Enter; medir os alvos | A grade filtra para "Sem ícone" e "Presente"; o Tab chega a "Presente" com foco visível (contorno do browser, `outline: auto`, azul). Enter escolhe. Alvos: busca 492 × 44, ícones 100 × 76, seletores de cor 44 × 44, campos hex 128 × 44, Editar banners / Remover / Cancelar / Salvar com 44 de altura — todos ≥ 44 px. Cada campo hex tem `<label>` associado; os seletores de cor têm `aria-label` | — |
| 03 | Seguir com Tab até o hex da barra e digitar uma cor escura demais (`#333333`) | Tab → seletor de cor da barra → hex da barra. A recusa aparece em texto com a medida: "A cor do texto na barra do computador mede 1,4:1 sobre a barra no perfil Padrão: o nome fica difícil de ler. Escolha uma cor mais clara (o mínimo é 4,5:1)." O código digitado continua no campo. Mas o parágrafo não é `alert`/`status` nem região viva, e o campo não tem `aria-invalid` nem `aria-describedby` → A-1. O texto é vermelho `rgb(239, 67, 67)` a 14 px/400 sobre o fundo do editor `rgb(255, 249, 245)` — 3,6:1 → A-2. Os dois botões "Usar a cor padrão" têm o mesmo nome acessível → A-3 | `screenshots/CH-05-03-recusa-teclado.png` |
| 04 | Esc para sair do editor sem salvar | Esc enviado; Salvar nunca foi acionado nesta sessão. O fechamento do diálogo e a volta do foco não foram conferidos (orçamento) | — |
| 05 | Loja a 390 × 844, página inicial | `scrollWidth` 390 = janela; primeira pintura útil 380 ms. A folha do menu não foi aberta (orçamento): o rótulo de A e B na lista branca não foi medido | — |
| 06 | Loja a 1440 × 900, medir o rótulo na barra | `scrollWidth` 1440 = janela. Barra `rgb(28, 26, 24)`: "Sobre" (A) `rgb(232, 199, 122)` = 10,64:1; "Joias afetivas" (B, sem cor na barra) `rgb(247, 243, 236)` = 15,69:1; "Personalizados" (C) `rgb(247, 243, 236)` = 15,69:1 — C segue sem cor na barra | — |

**Edge cases tentados:** recusa seguida de continuar no campo (o código digitado fica) · viewport 390 na loja (sem rolagem horizontal). Movimento reduzido, 320 × 568, zoom 200% na barra: não tentados (orçamento).

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | fail | 02–03 | `screenshots/CH-05-03-recusa-teclado.png` | A-1 (recusa não anunciada — `friction` pela meta do TC), A-2 (texto da recusa a 3,6:1). Passaram: alcance por Tab da busca, do ícone, do seletor de cor e do hex; foco visível; rótulos associados; alvos ≥ 44 px; código preservado após a recusa. Não conferidos: 130%/200% de fonte, painel a 390 × 844, Esc no seletor de ícone, foco depois de Esc |
| TC-CFR-002 | skip | 05–06 | — | Orçamento. O que foi medido passou: barra a 1440 (A 10,64:1, B 15,69:1), sem rolagem horizontal a 390 e 1440, FCP 380 ms. Faltaram: a folha a 390 (A e B no branco), 768, movimento reduzido, 320 × 568, zoom 200% |

Contagem: pass 0 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Editor do item › Cor do texto] a recusa da cor não é anunciada a quem usa leitor de tela

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01, passo 5 (escolher a cor) · passo 03 do log                       |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | low — a dona que enxerga lê a frase; quem usa tecnologia assistiva digita a cor e não fica sabendo da recusa até tentar salvar |
| Reproduziu          | sim — atributos estáticos lidos duas vezes (passo 02, campo sem `aria-describedby`; passo 03, com a recusa na tela) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin`, em `http://localhost:8083/admin/menu`, "Ações de “Personalizados”" › "Editar nome, ícone e banners"
2. Tab até o campo "Na barra do computador (fundo escuro)" e digitar `#333333`
3. A frase "A cor do texto na barra do computador mede 1,4:1 … (o mínimo é 4,5:1)." aparece abaixo

**Esperado:** recusa anunciada (`alert`/`status`) e ligada ao campo — **fonte:** TC-CFR-001, meta "a medida e a recusa em texto (não só cor), recusa anunciada (`alert`/`status`)" — "texto presente, sem anúncio = `friction`"

**Observado:** o texto está presente, num `<p>` sem `role`, sem `aria-live` em nenhum ancestral, sem `id`; o campo hex fica sem `aria-invalid` e sem `aria-describedby`.

**Evidência:**

- `screenshots/CH-05-03-recusa-teclado.png` — a recusa em texto com a medida, o código preservado
- console: nada lido
- rede: nada

### A-2 · [Editor do item › Cor do texto] o texto da recusa, em vermelho, fica abaixo de 4,5:1

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01, passo 5 (escolher a cor) · passo 03 do log                       |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | low — a frase que explica por que a cor não serve é ela mesma de leitura difícil; lê-se, mas com esforço, para quem tem visão reduzida |
| Reproduziu          | sim — cores computadas, determinísticas (1 leitura de cor, 1 de fundo) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como no A-1, digitar `#333333` no campo da barra
2. Ler a frase de recusa

**Esperado:** texto ≥ 4,5:1 contra o fundo — **fonte:** `cfr.md` › Acessibilidade › Visual; ambiente (piso de contraste 4,5:1)

**Observado:** cor `rgb(239, 67, 67)`, 14 px, peso 400, sobre `rgb(255, 249, 245)` → ≈ 3,6:1.

**Evidência:**

- `screenshots/CH-05-03-recusa-teclado.png`
- console: nada lido
- rede: nada

### A-3 · [Editor do item › Cor do texto] os dois "Usar a cor padrão" têm o mesmo nome na árvore

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri, a dona                                                   |
| Jornada e passo     | J-01, passo 5 · passos 01 e 03 do log                                  |
| TC                  | TC-CFR-001                                                            |
| Gravidade proposta  | low — só com teclado e leitor de tela, não se distingue qual superfície o botão limpa sem voltar ao campo anterior |
| Reproduziu          | sim (2 de 2 — snapshots dos passos 01 e 03)                            |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Abrir o editor de "Personalizados" como no A-1
2. Ler a árvore de acessibilidade do grupo "Cor do texto"

**Esperado:** nome que diga a superfície ("Usar a cor padrão na barra do computador") — **fonte:** `cfr.md` › Estrutura e nomes ("botão com nome que descreve a ação"); TC-CFR-001 passo 1

**Observado:** `button "Usar a cor padrão"` duas vezes, um depois de cada campo, sem `aria-label` nem `aria-describedby` que os distinga.

**Evidência:**

- `screenshots/CH-05-03-recusa-teclado.png`
- console: nada lido
- rede: nada

## CFR

| Jornada | Categoria             | Marca                    | Itens que não passaram | Achado |
| ------- | --------------------- | ------------------------ | ---------------------- | ------ |
| J-01    | Usabilidade           | pass                     | — (a recusa diz a medida, o mínimo e o próximo passo em linguagem simples) | — |
| J-01    | Acessibilidade        | friction                 | recusa sem anúncio; texto da recusa a 3,6:1; dois botões com o mesmo nome | A-1 · A-2 · A-3 |
| J-01    | Recuperação de erro   | pass                     | — (código preservado, explicação e próximo passo) | — |
| J-01    | Performance percebida | pass                     | — (a recusa aparece ao digitar, sem espera perceptível) | — |
| J-01    | Compatibilidade       | não medida               | 130%/200% de fonte e 390 × 844 no painel não alcançados | — |
| J-02    | Acessibilidade        | pass (parcial)           | — na barra a 1440; a folha a 390 não medida | — |
| J-02    | Compatibilidade       | pass (parcial)           | — sem rolagem a 390 e 1440; 768, 320 e zoom não medidos | — |
| J-02    | Performance percebida | pass                     | — FCP 380 ms | — |
| J-02    | Paridade com produção | registrada no cabeçalho  | backend local | — |

**Categorias fora:** nada cortado por decisão; o que não coube está em Fora da cobertura.

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A frase de recusa diz "sobre a barra no perfil Padrão", enquanto o ambiente declara a loja no perfil Black Friday (barra #1C1A18); a medida 1,4:1 bate com #1C1A18. Não se sabe se o nome do perfil na frase é o certo | 03 | polimento |
| O seletor de cor do campo vazio ("Na lista do celular") anuncia `#000000`, embora o campo esteja sem cor (cor padrão) | 03 | polimento |

## Fora da cobertura

- Painel a 130% e 200% de fonte — o browser da sessão não muda a fonte do sistema sem alterar o DOM, e o equivalente por largura (720 px) não coube no orçamento
- Painel a 390 × 844 (abas "Itens do menu" / "Prévia") — orçamento
- Esc no seletor de ícone e volta do foco ao gatilho; fechamento do editor por Esc — orçamento
- Loja: folha do celular a 390 (contraste de A e B no branco), 768 × 1024, 320 × 568, zoom 200% na barra, movimento reduzido — orçamento
- Logout explícito — orçamento; a sessão do agent-browser foi fechada sem perfil em disco, o que descarta o login
- Leitor de tela real; Safari, Firefox e browsers móveis — fora do browser da sessão (só Chromium)

## Debrief

- **Surpresas:** o login devolve ao Dashboard e não à rota pedida (pré-existente), custando ações; o orçamento de 38 não cobre teclado + 200% + três viewports com contraste
- **Próximo charter:** CH-05 continuação — painel a 200%/390 e a folha do celular a 390/320/768 com contraste de A e B, movimento reduzido
- **Padrão novo:** nada

Estado final do item C: nada foi salvo nesta sessão (Salvar nunca acionado). C segue com o ícone "Gravação" e sem cor nas duas superfícies — o editor abriu com os dois campos vazios e "Usar a cor padrão" desabilitado, e a loja a 1440 mostra "Personalizados" na cor padrão da barra (`rgb(247, 243, 236)`). A cor de C na folha do celular não foi vista na loja.
