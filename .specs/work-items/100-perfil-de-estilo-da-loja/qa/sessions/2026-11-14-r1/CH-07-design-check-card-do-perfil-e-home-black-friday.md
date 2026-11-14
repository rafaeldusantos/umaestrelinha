# Sessão CH-07 · design-check — o card do perfil, o modal da prévia e a Home de Black Friday

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check-card-do-perfil-e-home-black-friday.md` · design-check · P2 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 57 ações de browser de 50 (o excedente foi a saída da conta e o fechamento do browser; a conferência acabou em 46) |
| Ambiente    | painel http://localhost:8083/admin · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1) · viewports 1440 × 900, 900 × 900, 390 × 844 |
| Paridade    | dev server local; `*.supabase.co` e `**/g/collect*` abortados por rota; perfil salvo = Black Friday (S1), só lido — nada foi salvo |

## Missão

Conferir, tela a tela, o card, o modal e a Home de Black Friday contra o protótipo do Work Item, registrando cada
diferença com o valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir Configurações › Dados da loja, card "Perfil de estilo da loja" (1440) | Card com título, texto de apoio, duas opções (Padrão; Black Friday marcado, selo "Em uso"), aviso com relógio, "Ver a loja com este perfil" e "Salvar alterações" desabilitado. Textos literais iguais ao protótipo (o aviso tem a frase a mais de H7, decidida). Amostras na ordem e nos valores do design: Padrão #283a4a · #34495e · #b8945f · #f1ebe1; BF #0d0c0b · #1c1a18 · #c2a063 · #f0eadf | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` |
| 02 | Marcar Padrão, sem salvar   | Padrão marcado, borda da opção em `primary`, "Salvar alterações" habilitado. Nada foi salvo | `screenshots/2026-11-14-r1/CH-07-02-padrao-marcado-nao-salvo.png` |
| 03 | Abrir "Ver a loja com este perfil" | Modal "A loja com o perfil Padrão", subtítulo "Prévia, sem salvar. A loja publicada não muda.", largura 960 px, alternância Celular/Computador (H10), iframe, "Fechar" no rodapé; e um botão X com nome acessível "Close" | `screenshots/2026-11-14-r1/CH-07-03-modal-previa.png` |
| 04 | Fechar, voltar a marcar Black Friday, e estreitar para 900 px | As duas opções empilhadas numa coluna (718 px) — como o design abaixo de 1024 | `screenshots/2026-11-14-r1/CH-07-04-card-900.png` |
| 05 | Abrir a loja numa aba nova, Home em 1440 | `<html data-perfil="black-friday">`; os 14 tokens do perfil com os valores exatos de `bf.css`; cabeçalho #0d0c0b, faixa de departamentos #1c1a18, "Ver todos" e preço #1c1a18, parcelas #57524b, coração #161514 em #ffffff, círculo da busca #c2a063 com ícone #161514, botões ouro (#c2a063, texto #161514), faixa de declaração #161514 com olho #c2a063, faixas claras #f0eadf, subtítulos #57524b. Diferenças: sombra suave a 16 %, campo de e-mail sem borda, bordas em #e3dcce, peso do preço 600 | `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png` |
| 06 | Home em 390 (recarregada) | Cabeçalho #0d0c0b, aba ativa "Início" #1c1a18 (peso 600), preço #1c1a18; mesma sombra a 16 % e mesmo campo de e-mail sem borda — 2 de 2 | `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png` |
| 07 | Sair da conta e fechar o browser | Tela de login do painel | — |

**Edge cases tentados:** viewport estreita (900 px) no card; recarregar a Home ao trocar para 390.

## Casos

| TC        | Veredito | Passo  | Evidência                 | Nota                        |
| --------- | -------- | ------ | ------------------------- | --------------------------- |
| TC-UI-001 | fail     | 01–04  | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png`, `CH-07-03-modal-previa.png` | A-1, A-2. Textos, ordem e cores das amostras, selo "Em uso" (verde do "pago" do app, como o TC pede), modal (título, subtítulo, 960 px, "Fechar") e empilhamento abaixo de 1024 conferem |
| TC-UI-002 | fail     | 05–06  | `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png`, `CH-07-06-home-bf-390.png` | A-3, A-4, A-5, A-6. Todas as cores de papel por elemento conferem; as diferenças são sombra, borda de campo, cor da borda e peso |

Contagem: pass 0 · fail 2 · blocked 0 · skip 0

## Achados

### A-1 · [Painel · Perfil de estilo] As opções do perfil não seguem as proporções do protótipo — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 1 (escolher o perfil) · passos 01–02 do log               |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — visual; a escolha continua clara                                |
| Reproduziu          | sim (2 de 2 — Black Friday marcado e Padrão marcado)                  |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8083/admin/configuracoes/dados-da-loja`
2. Ir ao card "Perfil de estilo da loja"
3. Comparar as duas opções com a tela "Configurações · perfil de estilo" do protótipo

**Esperado:** opção com borda 2 px (marcada: `violet`, fundo #fbf9fe); miniatura com faixa do cabeçalho 22 px, faixa de departamentos 12 px, blocos 34 px com hachura, botão 14 px; amostras com raio 6 px e gap 4 px; nome com peso 600 — **fonte:** protótipo, `adm-bf.css` (`.perfil`, `.perfil-mini`, `.amostras`, `.perfil-tt b`)

**Observado:** borda 1 px (marcada: `primary` #6436ec, fundo `primary` a 5 %); miniatura 12 / 8 / 32 px (blocos tracejados, sem hachura) / 10 px; amostras com raio 4 px e gap 6 px; nome com peso 700.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` — as duas opções, BF marcado
- console: nada
- rede: nada

### A-2 · [Painel · Perfil de estilo] O aviso do prazo sai em laranja com borda, e não no cinza-lilás do protótipo — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 1 · passo 01 do log                                       |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — visual; o aviso continua legível (o laranja até chama mais atenção) |
| Reproduziu          | sim (2 de 2 — passos 01 e 02)                                         |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-loja`, abrir `http://localhost:8083/admin/configuracoes/dados-da-loja`
2. Olhar o aviso "Depois de salvar, quem abrir a loja…" no card do perfil

**Esperado:** caixa com fundo `elev` #f3eff8, sem borda, raio 10 px, texto `text2` #5a4e6f 12,5 px, ícone de relógio — **fonte:** protótipo, `adm-bf.css` › `.cache`

**Observado:** caixa de fundo branco com borda fina, ícone de relógio e texto em laranja #a2490a, 12 px.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` — o aviso abaixo das opções
- console: nada
- rede: nada

### A-3 · [Loja · Home Black Friday] A sombra suave sai a 16 % de opacidade, não a 18 % do perfil — para quem compra

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passo 1 · passos 05–06 do log                                   |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — imperceptível na prática                                        |
| Reproduziu          | sim (2 de 2 — 1440 e 390 após recarregar)                             |
| Viewport            | 1440 × 900 · 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Com o perfil Black Friday salvo, abrir `http://localhost:8082/`
2. Ler a sombra dos elementos com sombra suave na Home

**Esperado:** `0 14px 28px -10px rgba(22,21,20,.18)` — #161514 a 18 % — **fonte:** protótipo, `bf.css` › `.palco[data-tema="bf"]` `--shadow-soft`

**Observado:** `0 14px 28px -10px rgba(22,21,20,0.16)` — #161514 a 16 %, nos dois viewports. (A cor já é a do perfil, como a divergência decidida 3 diz; o que difere é a opacidade.)

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png`, `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png`
- console: nada
- rede: nada

### A-4 · [Loja · Home Black Friday] O campo de e-mail das novidades não tem borda — para quem compra

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passo 1 · passos 05–06 do log                                   |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — o campo está num bloco escuro e segue legível; o token `field` não aparece |
| Reproduziu          | sim (2 de 2 — 1440 e 390)                                             |
| Viewport            | 1440 × 900 · 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Com o perfil Black Friday salvo, abrir `http://localhost:8082/`
2. Ir ao bloco de novidades ("Me cadastrar") e olhar o campo "E-mail"

**Esperado:** borda 1 px `field` #857a6c — **fonte:** protótipo, `bf.css` › `.news input`; TC-UI-002 (bordas de campo = `field`)

**Observado:** borda 0 px (cor declarada #e3dcce, sem largura). O campo de busca do cabeçalho também tem borda 0 px, mas lá o design também não desenha borda.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png`, `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png`
- console: nada
- rede: nada

### A-5 · [Loja · Home Black Friday] As bordas leem #e3dcce, não o `line` #e4ddd0 do perfil — para quem compra

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passo 1 · passo 05 do log                                       |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — diferença de 1 em cada canal, invisível                         |
| Reproduziu          | sim (2 de 2 — 1440 e 390)                                             |
| Viewport            | 1440 × 900 · 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Com o perfil Black Friday salvo, abrir `http://localhost:8082/`
2. Ler a cor da borda superior do rodapé (e a cor de borda padrão dos campos)

**Esperado:** `line` #e4ddd0 (o próprio `--estrelinha-line` da página tem esse valor) — **fonte:** protótipo, `bf.css` › `.rod` `border-top: 1px solid var(--estrelinha-line)`

**Observado:** #e3dcce na borda do rodapé e na cor de borda dos campos.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png`
- console: nada
- rede: nada

### A-6 · [Loja · Home] Preço do cartão e aba ativa com peso 600, não 700 — para quem compra

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-03, passo 1 · passos 05–06 do log                                   |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — tipografia; não depende do perfil, provavelmente anterior ao WI |
| Reproduziu          | sim (2 de 2 — 1440 e 390)                                             |
| Viewport            | 1440 × 900 · 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Abrir `http://localhost:8082/`
2. Ler o peso do preço de um cartão de produto (1440) e da aba ativa "Início" da barra de abas (390)

**Esperado:** peso 700 — **fonte:** protótipo, `bf.css` › `.card-p` e `.abas a.on`

**Observado:** peso 600 nos dois. As cores (#1c1a18, `primary`) conferem.

**Evidência:**

- `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png`, `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png`
- console: nada
- rede: nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design` · lido pelo MCP do Claude Design (`adm-faixa-perfil.jsx`, `adm-bf.css`, `adm-base.css`, `bf.css`, `ds/tokens/colors.css`)

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/admin/configuracoes/dados-da-loja` · Configurações · perfil de estilo | opção do perfil (Padrão / Black Friday) | `border-width` | `2px` | `1px` · 1440 | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` | A-1 |
| D2 | idem | miniatura da opção | alturas (cabeçalho · departamentos · blocos · botão) | `22 · 12 · 34 · 14px`, blocos com hachura | `12 · 8 · 32 · 10px`, blocos tracejados · 1440 | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` | A-1 |
| D3 | idem | amostras de cor | `border-radius` · `gap` | `6px` · `4px` | `4px` · `6px` · 1440 | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` | A-1 |
| D4 | idem | nome do perfil ("Padrão", "Black Friday") | `font-weight` | `600` | `700` · 1440 | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` | A-1 |
| D5 | idem | aviso "Depois de salvar…" | `background-color` · `color` · borda | `#f3eff8` (`elev`) · `#5a4e6f` (`text2`) · sem borda | `#ffffff` · `#a2490a` · borda fina · 1440 | `screenshots/2026-11-14-r1/CH-07-01-card-bf-em-uso.png` | A-2 |
| D6 | `/` · Black Friday - Home (computador e celular) | elementos com sombra suave | `box-shadow` | `rgba(22,21,20)` a 18 % (`--shadow-soft`) | a 16 % · 1440 e 390 | `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png` | A-3 |
| D7 | idem | campo "E-mail" das novidades | `border-top-width` · cor | `1px` `#857a6c` (`field`) | `0px` · 1440 e 390 | `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png` | A-4 |
| D8 | idem | borda do rodapé e borda padrão dos campos | `border-color` | `#e4ddd0` (`line`) | `#e3dcce` · 1440 e 390 | `screenshots/2026-11-14-r1/CH-07-05-home-bf-1440.png` | A-5 |
| D9 | idem | preço do cartão (1440) · aba ativa "Início" (390) | `font-weight` | `700` | `600` | `screenshots/2026-11-14-r1/CH-07-06-home-bf-390.png` | A-6 |

**Conferido igual:** textos do card e do modal; ordem e valores das amostras; selo "Em uso" (o verde do "pago" do app, como o TC pede — o protótipo usa a classe do "pago", `p-paid`); modal com 960 px, título, subtítulo e "Fechar"; empilhamento abaixo de 1024; os 14 tokens do perfil na Home; cabeçalho `primary-strong`, departamentos/"Ver todos"/preço/aba ativa `primary`, parcelas e subtítulos `ink-soft`, coração e faixa de declaração `ink`, círculo da busca e botões ouro `accent` com texto `ink`, faixas claras `ground-deep`, tons comuns (ground #faf8f4, surface #ffffff, on-primary #f7f3ec, serenity #dce6ec, whatsapp #25d366).

**Telas não conferidas:** nada — os três frames (card, modal, Home 1440 e 390) foram abertos. A tipografia do card e do modal fora do perfil (raio e fundo do modal, título do card 18 px/600) é a do componente padrão do painel: token vence valor, não foi registrada.

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O modal da prévia tem, além de "Fechar", um botão X no canto com nome acessível em inglês ("Close"); o protótipo não desenha o X e H10 não fala dele | 03 | pré-existente |

## Fora da cobertura

- "A marca no tom escuro" na Home — li a cor do link da marca (#161514), mas o logotipo é um SVG com cores próprias e não conferi o preenchimento pela tela; fica para quem reabrir a Home
- Hover e foco dos elementos da Home e do card — o design não os desenha para este perfil; não provoquei
- O frame de celular do modal (o modal só tem frame de computador) — sem frame, sem régua
- O orçamento passou do teto (57 de 50) só com a saída da conta e o fechamento; a conferência terminou em 46

## Debrief

- **Surpresas:** os valores de token da Home batem com `bf.css` um a um; as diferenças estão fora dos tokens de cor (sombra, borda de campo, conversão de cor da borda, peso)
- **Próximo charter:** nada
- **Padrão novo:** nada
