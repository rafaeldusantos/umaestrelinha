# Sessão CH-07 · design-check: o card do perfil, o modal da prévia e a Home de Black Friday

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check-card-do-perfil-e-home-black-friday.md` · design-check · P2 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` (`QA_ADMIN_LOJA_*`)                  |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (rodada 3)                                                 |
| Orçamento   | 26 ações de browser de 25 (a 26ª foi a screenshot final da prova), mais 2 de encerramento (Esc no modal e fechar o browser). Do total, 7 ações foram para o login: a primeira tentativa, por `batch`, não entrou e foi refeita campo a campo |
| Ambiente    | painel http://localhost:8183/admin · loja http://localhost:8182 (no iframe da prévia) · build não exposto · Chromium (agent-browser 0.39.1) · viewport 1440 × 900 |
| Paridade    | dev server local do worktree; `*.supabase.co` e `**/g/collect*` bloqueados por rota antes do primeiro `open`, então as imagens do Storage hospedado aparecem como texto alternativo (não é achado). O perfil salvo é Black Friday (S1) e só foi lido. "Salvar alterações" não foi clicado e nenhuma escolha foi alterada |

## Missão

Conferir, tela a tela, o card, o modal e a Home de Black Friday contra o protótipo do Work Item, registrando cada
diferença com o valor do design e o observado.

Foco desta rodada (confirmação): só o TC-UI-001, que falhou na rodada 2 pelo BUG-005 (a prévia mostrava a Home sem os
blocos). O BUG-005 foi corrigido no commit 41f85963 e ficou `resolved` no reteste.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel e abrir Configurações › Dados da loja, no card "Perfil de estilo da loja" (1440) | O card mostra as opções Padrão ("Ardósia e ouro, a cara de sempre da loja.") e Black Friday, marcada e com o selo "Em uso" ("Preto e ouro, para a campanha."). Também mostra "Ver a loja com este perfil" e "Salvar alterações" desabilitado. A estrutura é a mesma da rodada 2 e não houve regressão no snapshot | — (snapshot) |
| 02 | Clicar em "Ver a loja com este perfil" | O modal "A loja com o perfil Black Friday" abre com o subtítulo "Prévia, sem salvar. A loja publicada não muda." e com a alternância Celular/Computador. Abre em "Celular", com a legenda "390 × 844 · 55%". **O iframe traz a Home completa**: a faixa de avisos, o cabeçalho, os "Banners da loja" (2), a barra de benefícios (4x sem juros, WhatsApp, envio, 7% no Pix), as coleções e a vitrine "Joias Árvore da Vida" com produtos, preço e parcelas | `screenshots/CH-07-01-previa-celular-bf-1440.png` |
| 03 | Passar a prévia para "Computador" | A legenda muda para "1024 × 768 · 60%" e a Home continua completa. Na tela aparecem a faixa de avisos em ouro, o cabeçalho e os departamentos em preto, o banner (que mostra o texto alternativo por causa do bloqueio do Storage), a barra de benefícios e os círculos de coleção. No snapshot do iframe aparecem as vitrines "Joias Árvore da Vida", "Linha Leite Materno" e "Decorativos" e a faixa de declaração "Cada joia é uma memória eternizada à mão". O "Fechar" está no rodapé e o modal tem a mesma largura da rodada 2 | `screenshots/CH-07-02-previa-computador-bf-1440.png` |
| 04 | Fechar o modal (Esc) e fechar o browser | O modal fechou e o browser foi fechado. A sessão existia só em memória, sem perfil nem estado gravado em disco | — |

**Edge cases tentados:** nada (rodada de confirmação).

## Casos

| TC        | Veredito | Passo  | Evidência                 | Nota                        |
| --------- | -------- | ------ | ------------------------- | --------------------------- |
| TC-UI-001 | pass     | 01–03  | `screenshots/CH-07-01-previa-celular-bf-1440.png`, `screenshots/CH-07-02-previa-computador-bf-1440.png` | A prévia mostra a Home com os blocos em Celular e em Computador, então o BUG-005 está confirmado como corrigido. O card, o título, o subtítulo e o "Fechar" do modal estão como na rodada 2, sem regressão. Os resíduos `low` do card registrados na rodada 2 continuam no backlog e não contam como achado novo |
| TC-UI-002 | skip     | —      | —                         | rodada 2 (já passou; esta rodada roda só o TC com fail) |

Contagem: pass 1 · fail 0 · blocked 0 · skip 1

## Achados

nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Uma Estrelinha - Black Friday · `claude_design`. **O MCP do
Claude Design não abriu nesta sessão** (`needs_design_scopes`: o token não tem acesso ao Claude Design). Conforme o
briefing, a régua foi o log da rodada 2 (`sessions/2026-11-14-r2/CH-07-…md`), que leu o protótipo pelo MCP. Para o
corpo do modal, a régua desse log é `adm-faixa-perfil.jsx`: "a Home da loja num iframe … com o perfil escolhido, veja
o protótipo 'Black Friday - Home'". Por falta de orçamento, a cópia publicada (link) não foi aberta.

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| —  | —                    | —               | —             | —                      | —                      | —                                  | —      |

Nenhuma diferença nova. A D1 da rodada 2 (a prévia em Computador sem os blocos) não se reproduziu: a prévia mostra
a Home com os blocos (passo 03).

**Telas não conferidas:** o card em 1024 e em 390 e o estado "Padrão marcado e não salvo" (ver Fora da cobertura). A
Home avulsa (TC-UI-002) também não foi conferida, porque já passou na rodada 2.

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- A fonte de design não foi relida nesta sessão porque o MCP do Claude Design estava sem permissão. A régua foi o log da rodada 2, como o briefing permite. Os valores do card não foram medidos de novo com `getComputedStyle`: a confirmação era do BUG-005, e o card só foi conferido pela estrutura no snapshot
- O card em 1024 px e em 390 × 844 (empilhado) não foi conferido, por falta de orçamento
- Console e rede da prévia não foram lidos, porque não foi preciso: o conteúdo apareceu
- A saída da conta pela tela não foi feita. A sessão do browser era só em memória e foi fechada, sem estado gravado em disco

## Debrief

- **Surpresas:** o login por `batch` com as variáveis não entrou na primeira tentativa e custou 4 ações. Campo a campo funcionou
- **Próximo charter:** nada
- **Padrão novo:** nada
