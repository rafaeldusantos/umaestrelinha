# Sessão CH-07 · design-check — o card do perfil, o modal da prévia e a Home de Black Friday

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check-card-do-perfil-e-home-black-friday.md` · design-check · P2 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (rodada 2)                                                 |
| Orçamento   | 26 ações de browser de 25 na conferência (a 26ª foi a screenshot da reprodução do A-1), mais 5 de encerramento (fechar o modal, duas tentativas de achar "Sair", ler a URL, fechar o browser) |
| Ambiente    | painel http://localhost:8183/admin · loja http://localhost:8182 · build não exposto · Chromium (agent-browser 0.39.1) · viewport 1440 × 900 |
| Paridade    | dev server local do worktree; `*.supabase.co` e `**/g/collect*` abortados por rota antes do primeiro `open`; perfil salvo = Black Friday (S1), só lido. "Salvar alterações" nunca foi clicado; nenhuma escolha foi alterada |

## Missão

Conferir, tela a tela, o card, o modal e a Home de Black Friday contra o protótipo do Work Item, registrando cada
diferença com o valor do design e o observado.

Foco desta rodada: o TC-UI-001 inteiro de novo (o entorno das correções de BUG-003 e BUG-004) e a prévia em
"Computador" com Black Friday marcado. O TC-UI-002 já passou e não foi refeito.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir Configurações › Dados da loja, card "Perfil de estilo da loja" (1440) | Duas opções lado a lado (grade 353 px + 353 px, gap 12 px). Black Friday marcado com o selo "Em uso", "Salvar alterações" desabilitado. Opção: borda 2 px, raio 16 px, padding 12 px; a marcada com borda #6c3ce9 (`violet` do design) e fundo #6c3ce9 a 3 %, que sobre o branco dá o #fbf9fe do design. Miniatura: cabeçalho 22 px, departamentos 12 px, três blocos de 34 px **com hachura**, botão 14 px. Nome com peso 600. Amostras 20 × 20 px, raio 6 px, gap 4 px, na ordem e nos valores do design (Padrão #283a4a · #34495e · #b8945f · #f1ebe1; BF #0d0c0b · #1c1a18 · #c2a063 · #f0eadf). O aviso tem fundo #f3eff8 (`elev`), não tem borda, raio de 10 px e o texto em #5a4e6f (`text2`) a 12,5 px, com o relógio na mesma cor. O texto é literal (com a frase a mais de H7, que já estava decidida) | `screenshots/2026-11-14-r2/CH-07-01-card-bf-em-uso-1440.png` |
| 02 | Abrir "Ver a loja com este perfil" e passar a prévia para "Computador" | Modal com 960 px, título "A loja com o perfil Black Friday", subtítulo "Prévia, sem salvar. A loja publicada não muda.", "Fechar" no rodapé e a alternância Celular/Computador (H10), com a legenda "1024 × 768 · 60%". **Dentro da prévia, a Home não tem os blocos:** depois da faixa de avisos, do cabeçalho e da faixa de departamentos (já no preto e ouro) vem uma faixa clara vazia e, logo depois, "Siga-nos no Instagram" e o rodapé. Não aparece banner, vitrine, produto nem declaração. Esperei 15 s pelo conteúdo da prévia antes da screenshot | `screenshots/2026-11-14-r2/CH-07-02-previa-computador-bf-1440.png` |
| 03 | Passar a prévia para "Celular" e voltar para "Computador" | A mesma Home sem blocos (2 de 2) | `screenshots/2026-11-14-r2/CH-07-03-previa-computador-bf-repro.png` |
| 04 | Fechar o modal, sair da conta e fechar o browser | O modal fechou. Com o modal fechado e o card no topo da tela, nenhum controle "Sair" estava visível. O browser foi fechado, e a sessão vivia só na memória, sem perfil gravado | — |

**Edge cases tentados:** nada. Esta rodada é de confirmação, então não houve edge case novo. A alternância Celular → Computador do passo 03 serviu só para reproduzir o A-1.

## Casos

| TC        | Veredito | Passo  | Evidência                 | Nota                        |
| --------- | -------- | ------ | ------------------------- | --------------------------- |
| TC-UI-001 | fail     | 01–03  | `screenshots/2026-11-14-r2/CH-07-01-card-bf-em-uso-1440.png`, `CH-07-02-previa-computador-bf-1440.png`, `CH-07-03-previa-computador-bf-repro.png` | A-1. O card agora segue o protótipo nos pontos de BUG-003 (borda, miniatura, amostras, peso do nome) e de BUG-004 (o aviso). O título, o subtítulo, a largura de 960 px e o "Fechar" do modal também conferem. Falha porque a prévia em "Computador" mostra a Home sem os blocos. Ficaram resíduos `low` no card, que vão como sugestão de backlog (Fora da cobertura) |
| TC-UI-002 | skip     | —      | —                         | Já passou e o briefing diz para não refazer |

Contagem: pass 0 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Painel · Prévia do perfil] Em "Computador", a prévia mostra a Home sem os blocos — para a dona

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 4 (confere na prévia antes de salvar) · passos 02–03 do log |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | high (dano à confiança). A prévia é o instrumento que Adri usa para "conferir antes de ligar". Ela mostra a loja sem vitrine nem banner, logo abaixo de um card que promete "blocos da Home… continuam iguais". Com isso, Adri pode desistir de ligar ou achar que o perfil quebra a Home |
| Reproduziu          | sim (2 de 2 nesta sessão). Também aparece numa screenshot da rodada 1, que não foi registrada como achado na época |
| Viewport            | 1440 × 900 (prévia em 1024 × 768 a 60 %)                              |

**Passos para reproduzir** a partir de um estado limpo:

1. Entrar como `admin-loja` em `http://localhost:8183/admin/configuracoes/dados-da-loja`, com o perfil Black Friday salvo (S1)
2. No card "Perfil de estilo da loja", deixar Black Friday marcado e clicar "Ver a loja com este perfil"
3. No modal, clicar "Computador"

**Esperado:** a Home da loja com o perfil escolhido, com os blocos da Home como no protótipo "Black Friday - Home". **Fonte:** protótipo, `adm-faixa-perfil.jsx`, cujo corpo do modal diz "a Home da loja num iframe … com o perfil escolhido — veja o protótipo 'Black Friday - Home'"; texto do card: "Textos, blocos da Home, preços e menu continuam iguais"; TC-UI-001.

**Observado:** a prévia (iframe de `http://localhost:8182/?preview=1`) mostra a faixa de avisos, o cabeçalho e a faixa de departamentos no preto e ouro, uma faixa clara vazia e, logo depois, "Siga-nos no Instagram @umaestrelinha.adri" e o rodapé. Não há banner, vitrine, produto nem faixa de declaração. Isso continua igual depois de 15 s e depois de alternar Celular → Computador. A prévia em "Celular" não foi conferida.

**Evidência:**

- `screenshots/2026-11-14-r2/CH-07-02-previa-computador-bf-1440.png`: a prévia em Computador, sem os blocos
- `screenshots/2026-11-14-r2/CH-07-03-previa-computador-bf-repro.png`: a reprodução depois de alternar Celular → Computador
- console: não lido (o orçamento acabou)
- rede: não lida (o orçamento acabou). O iframe é de outra origem (8182), então o conteúdo dele não pôde ser lido pelo painel

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design` · lido pelo MCP do Claude Design (`adm-faixa-perfil.jsx` › `PerfilEstilo`, `adm-bf.css` › perfil de estilo, `adm-base.css` › `:root`)

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/admin/configuracoes/dados-da-loja` · Configurações · perfil de estilo (modal da prévia) | conteúdo da prévia em "Computador" | estrutura | a Home com os blocos ("Black Friday - Home") | só cabeçalho, uma faixa vazia, Instagram e rodapé · 1440 | `screenshots/2026-11-14-r2/CH-07-02-previa-computador-bf-1440.png` | A-1 |

**Conferido igual (as correções):** borda da opção 2 px; marcada `violet` #6c3ce9 com fundo equivalente a #fbf9fe; miniatura 22 · 12 · 34 · 14 px com hachura; amostras 20 px, raio 6 px, gap 4 px, ordem e valores; nome com peso 600; aviso com fundo `elev` #f3eff8, sem borda, raio 10 px, texto `text2` #5a4e6f a 12,5 px e relógio; lado a lado em 1440 (duas colunas de 353 px); modal com 960 px, título, subtítulo e "Fechar".

**Diferenças residuais `low`, que não são regressão e vão como sugestão de backlog (sem achado, conforme o briefing):**

- miniatura com raio de 12 px (design `.perfil-mini` 10 px)
- blocos hachurados da miniatura com raio de 4 px (design `.perfil-mini .bd i` 6 px)
- borda das amostras em #f0ebf4 (o token de borda do app); no design é `rgba(0,0,0,.08)`
- padding do aviso de 12 px em todos os lados e gap de 12 px; no design são `10px 12px` e gap de 8 px
- rádio com 20 px; no design `.perfil-tt input` tem 18 px. A cor #6436ec é o `primary` do app, e token vence valor

**Telas não conferidas:** o card em 1024 (lado a lado no limite) e em 390 (empilhado), porque o orçamento acabou. Ver Fora da cobertura. A Home avulsa (TC-UI-002) ficou fora por decisão do briefing.

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- O card em 1024 px (lado a lado a partir de 1024) e em 390 × 844 (empilhado) não foi conferido porque o orçamento acabou. Usei as últimas ações para reproduzir o A-1, que tem gravidade maior. Na rodada 1 o empilhamento foi confirmado em 900 px, e nesta rodada o lado a lado foi confirmado em 1440
- O estado "Padrão marcado e não salvo" não foi refeito. O estilo de opção marcada e não marcada foi lido nas duas opções do passo 01
- A prévia em "Celular" não foi conferida (orçamento); passei por ela só como alternância no passo 03
- Console e rede do A-1 não foram lidos (orçamento)
- Sugestões de backlog (`low`, não regressão): as cinco diferenças residuais do card listadas em Design
- A saída da conta pela tela não foi feita, porque com o modal fechado não havia "Sair" visível na área do card e o orçamento acabou. O browser foi fechado; a sessão era só em memória, sem perfil nem estado gravado em disco

## Debrief

- **Surpresas:** BUG-003 e BUG-004 parecem corrigidos no que foi medido. Já a prévia em Computador, que na rodada 1 tinha aparecido só numa screenshot, se reproduziu 2 de 2 e tira da dona o motivo de usar a prévia
- **Próximo charter:** uma rodada curta só da prévia (Celular × Computador, Padrão × Black Friday) com console e rede, e o card em 1024 e 390
- **Padrão novo:** nada
