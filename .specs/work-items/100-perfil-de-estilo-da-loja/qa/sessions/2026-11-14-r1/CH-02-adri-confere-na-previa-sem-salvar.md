# Sessão CH-02 · Adri confere o Black Friday na prévia e desiste sem salvar

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-adri-confere-na-previa-sem-salvar.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-01 Adri · conta: `admin-loja` — `QA_ADMIN_LOJA_*`                  |
| Tour · modo | Back-Button · com tour                                                 |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | painel http://localhost:8083/admin · loja http://localhost:8082 · build não exposto · Chromium (agent-browser 0.39.1, headless) · viewport 1440 × 900 |
| Paridade    | dev server (Vite) sem `data-perfil` vindo de `api/page`; rotas `*.supabase.co` e `**/g/collect*` abortadas; Supabase local |

## Missão

Como a dona com receio de errar, confirmar que a prévia mostra a loja exatamente no perfil marcado, que o voltar do
navegador, o Esc, o fundo e o "Fechar" a tiram dali sem gravar nada, e que a loja publicada nunca muda por causa dela.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar no painel pelo link de Dados da loja | tela de login; depois de entrar caiu no Dashboard (`/admin`), não em Dados da loja | — |
| 02 | Abrir Configurações | URL `/admin/configuracoes`; seções: Dados da loja, Vendas, Frete e Material, Notificações, Usuários do painel (cinco, nenhuma nova). Card "Perfil de estilo da loja" (h2) com rádios "Padrão · Em uso · Ardósia e ouro…" (marcado) e "Black Friday · Preto e ouro, para a campanha.", botão "Ver a loja com este perfil" e "Salvar alterações" desabilitado | `screenshots/2026-11-14-r1/CH-02-01-card.png` |
| 03 | Marcar Black Friday (sem salvar) e tocar "Ver a loja com este perfil" | modal `dialog` "A loja com o perfil Black Friday", subtítulo "Prévia, sem salvar. A loja publicada não muda.", grupo "Dispositivo da prévia" (Celular `aria-pressed=true` por padrão, Computador), iframe "Prévia da loja com o perfil de estilo" (`src` http://localhost:8082/?preview=1), botões "Fechar" e "Close" (X) | `screenshots/2026-11-14-r1/CH-02-02-previa-bf-celular.png` |
| 04 | Olhar a loja dentro do quadro | nos primeiros ~20 s o iframe ficou em branco (o dev server da loja ainda carregava módulos, rede 200) | `screenshots/2026-11-14-r1/CH-02-02b-iframe-bf-celular.png` · `screenshots/2026-11-14-r1/CH-02-03-iframe-bf-computador.png` |
| 05 | Alternar para Computador | o quadro alargou (212 → 613 px na tela), legenda "1024 × 768 · 60%" | `screenshots/2026-11-14-r1/CH-02-03-iframe-bf-computador.png` |
| 06 | Abrir a loja publicada numa aba nova, com a prévia aberta e Black Friday marcado | loja com `data-perfil=padrao`, cabeçalho ardósia rgb(40, 58, 74) — Padrão | `screenshots/2026-11-14-r1/CH-02-04-loja-publicada.png` |
| 07 | Voltar à aba do painel e olhar a prévia de novo | a loja no quadro com cabeçalho e rodapé pretos e destaques em ouro — Black Friday | `screenshots/2026-11-14-r1/CH-02-05-previa-bf-computador.png` |
| 08 | Fechar pelo "Fechar" | modal some; Black Friday continua marcado; "Em uso" segue no Padrão; "Salvar alterações" do card habilitado | — |
| 09 | Reabrir a prévia e fechar com Esc | o modal fecha; Black Friday segue marcado; **o foco foi para o `<body>`**, não para "Ver a loja com este perfil" (A-1) | — (leitura de `document.activeElement` depois do modal sumir) |
| 10 | Sair da conta | o item "Sair" não foi encontrado no menu "Sua conta" pelo texto; orçamento esgotado. O browser da sessão (perfil só em memória) foi fechado | — |

**Edge cases tentados:** abrir a loja publicada em aba nova com a prévia aberta (Padrão, ok); alternância
Celular/Computador com Black Friday (segue Black Friday).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-002 | pass | 02 | `screenshots/2026-11-14-r1/CH-02-01-card.png` | card com Padrão (Em uso) e Black Friday; as cinco seções de sempre |
| TC-FUNC-005 | skip | 03–07 | `screenshots/2026-11-14-r1/CH-02-05-previa-bf-computador.png` · `screenshots/2026-11-14-r1/CH-02-04-loja-publicada.png` | parcial por orçamento: passos 1, 2 e 4 conferem (título, subtítulo, Black Friday no quadro, Computador/Celular, loja publicada Padrão, "Em uso" Padrão); passo 3 (Padrão marcado → título "… Padrão", ardósia) e as variações não rodaram |
| TC-FUNC-006 | fail | 08–09 | — | passo 1 (Fechar) ok; passo 3: Esc fecha sem mudar nada, mas o foco não volta ao botão ⇒ A-1 (intermitente, 1 de 1). Passos 2 (fundo), 4 (clique no iframe), 5 depois dos fechamentos e as variações voltar/recarregar não rodaram (orçamento) |
| TC-CFR-003 | skip | — | — | percurso só-teclado não rodou (orçamento). O passo 3 dele (Esc devolve o foco) é o mesmo observável de A-1 |

Contagem: pass 1 · fail 1 · blocked 0 · skip 2

## Achados

### A-1 · [Prévia do perfil] Ao fechar com Esc, o foco vai para o topo da página e não volta a "Ver a loja com este perfil" — para quem usa teclado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, ramo J-01a (desistir da prévia) · passo 09 do log               |
| TC                  | TC-FUNC-006 (passo 3) · TC-CFR-003 (passo 3)                          |
| Gravidade proposta  | medium — quem navega por teclado perde o lugar e tem de voltar com Tab desde o topo até o card; a jornada se conclui |
| Reproduziu          | intermitente (1 de 1) — a segunda tentativa não coube no orçamento    |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. `admin-loja`, entrar no painel e abrir Configurações → Dados da loja (perfil salvo Padrão)
2. Marcar "Black Friday" (sem salvar) e clicar "Ver a loja com este perfil"; esperar "Prévia, sem salvar."
3. (Nesta sessão houve antes um abrir/fechar pelo "Fechar" e a alternância Computador.) Apertar Esc
4. Depois que o modal some, ver onde está o foco

**Esperado:** o modal fecha e o foco volta a "Ver a loja com este perfil" — **fonte:** TC-FUNC-006 passo 3; TC-CFR-003
passo 3; spec › Design (modal), H10 (Dialog do `@estrelinha/ui`, Esc, foco e retorno).

**Observado:** o modal fecha e nada muda (Black Friday marcado, "Em uso" no Padrão), mas `document.activeElement` é o
`<body>`. Logo após o Esc o `dialog` ainda estava no DOM (animação de saída); a leitura do foco foi feita depois de o
`dialog` sumir.

**Evidência:**

- leitura do estado: `{dlg:false, focus:"BODY"}` depois do Esc
- console: não coletado
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O X do modal da prévia tem nome acessível em inglês, "Close", ao lado do "Fechar" em português | 03 | polimento |
| Entrar pelo link direto de Dados da loja sem sessão leva, depois do login, ao Dashboard, e não à página pedida | 01 | pré-existente |

## Fora da cobertura

- Fechar clicando no fundo; clicar dentro do iframe sem fechar; navegar dentro do iframe — orçamento
- Voltar do navegador com o modal aberto e recarregar com o modal aberto (o centro do tour Back-Button) — orçamento
- Marcar Padrão e abrir a prévia (título "… Padrão", ardósia); trocar a opção com o modal fechado e reabrir; abrir/fechar três vezes rápido — orçamento
- Loja publicada numa aba nova **depois** de cada fechamento (só foi conferida com a prévia aberta, passo 06) — orçamento
- Percurso só-teclado (Tab, setas no grupo de rádio, Enter, Tab preso no modal), foco visível e alvo de toque — orçamento
- Card a 390 × 844 e fonte a 200 % — orçamento
- Segunda reprodução de A-1 — orçamento
- Sair da conta: o item do menu não foi achado pelo texto "Sair" e o orçamento acabou; o browser da sessão, sem perfil em disco, foi fechado

## Debrief

- **Surpresas:** na primeira abertura, o iframe da prévia ficou em branco por ~20 s enquanto o dev server da loja
  servia os módulos (ambiente frio, não achado). No quadro, entre o cabeçalho e o rodapé não apareceu conteúdo da Home —
  fora do escopo deste charter (o que a loja mostra além da cor), vale olhar no CH que cobre a Home. O orçamento de 50 ações
  não comporta o tour inteiro com login e esperas: a sessão cobriu o ramo principal e um fechamento só.
- **Próximo charter:** o resto do CH-02 (voltar/recarregar com o modal aberto, fundo, teclado, 390 × 844, prévia em Padrão),
  com a segunda reprodução de A-1
- **Padrão novo:** nada
