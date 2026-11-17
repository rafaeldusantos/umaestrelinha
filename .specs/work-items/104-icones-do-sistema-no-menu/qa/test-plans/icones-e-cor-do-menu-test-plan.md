```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — Ícones do sistema e cor do texto no Menu da loja",
  "summary": {
    "total_cases": 19,
    "by_priority": { "P0": 3, "P1": 14, "P2": 2, "P3": 0 }
  },
  "acceptance_criteria_covered": 7,
  "strategy": [
    "Exploração por charter no browser real (agent-browser, playwright-cli ou Playwright MCP), uma persona por sessão",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos",
    "Manual p/ usabilidade, acessibilidade e conferência visual contra o texto do plan.md e os ícones da marca (sem protótipo)"
  ],
  "cases": [
    { "id": "TC-JOURNEY-001", "title": "A dona destaca um item do menu com um ícone do sistema e uma cor para cada fundo, e a loja mostra", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-001", "title": "O seletor de ícone mostra \"Sem ícone\" fixa e os ícones em dois grupos, \"Da Uma Estrelinha\" e \"Do sistema\"", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-002", "title": "A busca do seletor acha ícones dos dois grupos por nome ou chave e esconde o grupo sem resultado", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-003", "title": "O ícone do sistema e as cores do rótulo continuam gravados depois de recarregar o painel", "priority": "P0", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-004", "title": "A prévia ao lado mostra o ícone do sistema e a cor de cada fundo antes de gravar", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-UI-001", "title": "Os ícones do sistema têm o traço e o realce dourado dos ícones da marca", "priority": "P1", "type": "ui", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-FUNC-005", "title": "Uma cor que deixa o rótulo ilegível no seu fundo é recusada antes de gravar, com a medida na frase", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-006", "title": "Um código de cor fora do formato não é gravado como cor", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-007", "title": "\"Usar a cor padrão\" devolve o rótulo ao padrão no painel e na loja", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-008", "title": "A cor do texto só aparece no item principal, nunca no item do submenu", "priority": "P2", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-009", "title": "Com a loja no perfil Black Friday, a cor aceita para a barra continua legível", "priority": "P2", "type": "functional", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-JOURNEY-002", "title": "A cliente no celular reconhece o item pelo ícone e pela cor e chega à página dele", "priority": "P0", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-010", "title": "Na lista do celular, o rótulo do item principal sai na cor da lista, no link direto e no acordeão", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-JOURNEY-003", "title": "A cliente no computador acha o item destacado na barra e abre o painel dele sem perder a cor", "priority": "P1", "type": "journey", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-FUNC-011", "title": "Na barra do computador, o rótulo sai na cor da barra e a mantém no hover e com o painel aberto", "priority": "P1", "type": "functional", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-REG-001", "title": "Itens sem cor, ícones da marca já gravados, submenu e \"ver tudo\" continuam como antes", "priority": "P1", "type": "regression", "automation": { "target": "e2e", "status": "missing" } },
    { "id": "TC-CFR-001", "title": "O editor de cor e o seletor de ícone funcionam só com teclado, a 200% de fonte e com alvos de 44 px", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-CFR-002", "title": "Na loja, o rótulo colorido mantém o contraste e nada rola na horizontal a 390, 768 e 1440", "priority": "P1", "type": "cfr", "automation": { "target": "manual", "status": "na" } },
    { "id": "TC-INT-001", "title": "Um documento de menu com cor fora do formato, ou sem o campo de cor, desenha o rótulo como hoje", "priority": "P1", "type": "integration", "automation": { "target": "integration", "status": "missing" } }
  ]
}
```

# Plano de QA — 104 · Ícones do sistema e cor do texto no Menu da loja

**Work Item:** 104 (improvement, entrada plano, sem PRD) · **Escopo:** completo · **Foco:** —
**Versão do plano:** 1 · **Escrito em:** 2026-11-17 · **Modo:** criar
**Gate 1:** aprovado em 2026-11-17
**Risco:** alto — contrato entre camadas: o documento store_settings.menu (campo novo de cor e chaves de ícone novas) é escrito pelo painel e lido pela loja via packages/core

## Resumo

- **Valor para o usuário:** a dona da loja passa a destacar um item comercial do menu (ex.: o que leva às ofertas) com um ícone do sistema — etiqueta, porcentagem, presente e mais sete, no traço da casa — e com uma cor própria para o rótulo, uma para a barra escura do computador e outra para a lista branca do celular; a loja recusa antes de gravar a cor que deixaria o rótulo ilegível. A cliente reconhece o item pelo ícone e pela cor e chega à página dele.
- **Maior risco para o usuário:** a cor ou o ícone gravados pelo painel não chegarem iguais à loja (ou sumirem na gravação seguinte), ou um rótulo ilegível chegar à cliente na barra ou na lista do celular.
- **Contagens:** personas 3 · jornadas 3 · charters 5 (CFR 1 · design-check 0) · TC 19 (P0 3 · P1 14 · P2 2 · P3 0)
- **Automação:** e2e 14 (missing 14 · existing 0 · blocked 0) · integration 1 · manual 4

## Escopo

**Dentro:** `/admin/menu` no painel — o seletor de ícone (dois grupos, busca, "Sem ícone"), o bloco "Cor do texto" do editor do item principal (dois campos, medida de contraste, recusa, "Usar a cor padrão") e a prévia ao lado; a loja — a barra do computador e a folha do menu do celular, para o ícone e o rótulo do item principal. Critérios C-01..C-07 do `plan.md`.

**Fora:** ícone e cor nos itens do submenu e no "ver tudo em X" (decisão P-04, `MNM-26`); cor de fundo do item; ícones de relógio, raio e estrela de cinco pontas (decisão de tom memorial — a ausência não é achado); `lucide-react` no menu; o app do ateliê (`apps/mobile-adm`); o resto de `/admin/menu` que a mudança não toca (adicionar, remover, reordenar, banners, chaves Computador | Celular, conflito por `updated_at`); a regra técnica do desenho dos ícones (`icons.test.ts`, `menuIconCatalog.test.ts`), que é da Validation.

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | ausente (improvement sem PRD)       | —                                          |
| Costura    | `.specs/work-items/104-icones-do-sistema-no-menu/plan.md` | critérios C-01..C-07, Design em texto, Fora do escopo, P-01..P-06 |
| Fontes de design | ausente — decisão "Seguir sem design" (`plan.md` › Design) | conferência contra o texto do `plan.md` e o padrão das telas existentes; sem charter `design-check` |
| Insumos    | `item.md` › Insumos (pedido complementar da cor do texto); `tasks/01-icones-do-sistema.md`, `tasks/02-cor-do-texto-do-item.md`, `waves.md` | C-06/C-07; as dez chaves e rótulos; o comportamento do editor e da loja |
| Validation | `qa-report.md` · Resultado: PASS · rodada 1 · 2026-11-17 (a data contra o HEAD é conferida na Fase 2) | gate técnico antes da execução             |
| Projeto    | `.specs/project/PROJECT.md` › Ambiente local; `CLAUDE.md` (raiz), `apps/backoffice/CLAUDE.md` (`/admin/menu`, A ponte da prévia), `apps/store/CLAUDE.md` (Menu (consumo), Modo prévia) | ambiente e regras de sessão |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | Adri, a dona | usuário ocasional | destacar o item de ofertas com um ícone comercial e uma cor que a cliente leia | `admin` | J-01 |
| PER-02 | Cliente no celular | usuário mobile | achar pelo menu a página que procura, com uma mão | `anonima` | J-02 |
| PER-03 | Cliente no computador | novo usuário | achar o departamento pela barra do topo na primeira visita | `anonima` | J-03 |

**Não cobertas:** tecnologia assistiva real (leitor de tela) — simulada no CFR por teclado e árvore de acessibilidade; usuário avançado em várias abas no painel — o conflito por `updated_at` é pré-existente e fora da mudança.

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | Destacar um item do menu com ícone do sistema e cor legível, e vê-lo na loja | PER-01 · — | P0 | J-01a, J-01b, J-01c | sim: painel → `store_settings.menu` → loja (`packages/core`) | [J-01](journeys/J-01-destacar-item-com-icone-e-cor.md) |
| J-02 | Chegar à página do item destacado pelo menu do celular | PER-02 · — | P0 | J-02a | sim: lê o documento gravado pelo painel | [J-02](journeys/J-02-chegar-pelo-menu-do-celular.md) |
| J-03 | Chegar ao departamento destacado pela barra do computador | PER-03 · — | P1 | J-03a | sim: lê o documento gravado pelo painel | [J-03](journeys/J-03-chegar-pela-barra-do-computador.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta ordem e, com o `agent-browser` ou o `playwright-cli`, por **Lote**: no máximo 3
charters, nunca dois da mesma conta ou da mesma massa, e o CFR sozinho, por último. Charter com outro
**Driver** roda sozinho. Cada charter com no máximo um TC a cada 5 ações do time-box.

Os cinco lotes são de um charter só, de propósito: CH-01 e CH-02 gravam o mesmo documento (`store_settings.menu`) com a mesma conta; CH-03 e CH-04 leem o que eles gravaram e são os dois `anonima`. Nenhuma combinação cabe no mesmo lote.

| Ordem | Lote | ID    | Missão                               | Persona   | Conta   | Massa                    | Driver | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ---- | ----- | ------------------------------------ | --------- | ------- | ------------------------ | ------ | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1 | L1 | CH-01 | a dona acha o ícone de etiqueta entre os dois grupos, dá ao item uma cor por fundo, vê na prévia e encontra tudo gravado depois de recarregar | PER-01 | `admin` | altera o menu: itens A e B (ícone do sistema e cores) | — | Feature | 60 min | P0 | TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-UI-001 | [CH-01](charters/CH-01-dona-destaca-item.md) |
| 2 | L2 | CH-02 | nenhuma cor ilegível, código malformado ou item de submenu chega a gravar cor no menu | PER-01 | `admin` | altera o menu: item C (termina sem cor); altera e restaura o perfil de estilo | — | Garbage | 60 min | P1 | TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009 | [CH-02](charters/CH-02-cor-ilegivel-nunca-grava.md) |
| 3 | L3 | CH-03 | a cliente no celular reconhece o item pelo ícone e pela cor e chega à página dele com uma mão | PER-02 | `anonima` | só lê (o menu deixado por CH-01 e CH-02) | — | Feature | 30 min | P0 | TC-JOURNEY-002, TC-FUNC-010 | [CH-03](charters/CH-03-cliente-no-celular.md) |
| 4 | L4 | CH-04 | na barra do computador o item destacado se lê, mantém a cor ao abrir, e tudo o que a dona não tocou continua como antes | PER-03 | `anonima` | só lê | — | Feature | 60 min | P1 | TC-JOURNEY-003, TC-FUNC-011, TC-REG-001 | [CH-04](charters/CH-04-barra-e-regressao.md) |
| 5 | L5 | CH-05 | CFR — J-01 (editor e efeito na loja) e J-02 (folha a 390) | PER-01 | `admin` | altera o menu: item C, devolvido sem cor | — | — | 45 min | P1 | TC-CFR-001, TC-CFR-002 | [CH-05](charters/CH-05-cfr.md) |

## Ambiente da execução

O que vale para toda sessão da Fase 2 — vai no campo `ambiente` do briefing, porque o explorer e o retester
rodam sem as instruções do projeto. Fontes: `PROJECT.md` › Ambiente local e as instruções do projeto.

- **App:** loja `http://localhost:8082`; painel `http://localhost:8083` (o menu em `/admin/menu`); Supabase local na API `:54441`. A prévia do painel só acende com `VITE_STORE_URL` do painel apontando para `http://localhost:8082` — sem ela o palco mostra o passo de configuração (é ambiente, não achado).
- **Bloquear:** `**/*.supabase.co/**` e `**/g/collect*`, **antes do primeiro `open`** de cada sessão (bloqueie o GA pelo caminho, nunca só pelo domínio).
- **E-mail de dev:** Mailpit em `http://localhost:54444` — todo código de acesso e confirmação cai ali.
- **Viewport alvo:** `390 × 844` primeiro, `1440 × 900` depois; telas alteradas também a 130% e 200% de fonte (CH-05). A prévia do painel tem as medidas dela: Celular 390 × 844, Computador 1024 × 768.
- **Nunca:** pagar de verdade nem digitar número de cartão; chamar serviço externo real (Mercado Pago, Resend, Melhor Envio, Claude API); `supabase stop --all`; migration fora do banco local; nada contra produção. Credencial só pelo nome da variável (`QA_ADMIN_USUARIO` / `QA_ADMIN_SENHA`, carregadas com `source` do arquivo que o briefing indica), nunca o valor em log, screenshot ou briefing. Não editar categorias nem `/admin/home` — a sessão mexe só no documento do menu (e CH-02 no perfil de estilo, restaurando).
- **Uploads:** não há.
- **Massa:** o menu do Supabase local (`store_settings.menu`) ainda está na forma **legada** (convertida na leitura até a primeira gravação, comportamento da feature 86 — a primeira gravação de CH-01 o converte em v2; não é achado). Perfil de estilo no início da rodada: **Black Friday** (encontrado assim no banco local em 2026-11-17; a rodada não altera dado existente para mudar isso). Itens identificados pela thread principal: **A = "Sobre"** (link, computador e celular, ícone da marca `estrela`); **B = "Joias afetivas"** (com submenu de 11, computador e celular, ícone `gota-afetiva`); **C = "Personalizados"** (com submenu de 7, ícone `gravacao`); **D = "Coleção Amuletos"** (ícone da marca `flor-prensada`, só no computador). Itens principais que a rodada usa, visíveis no computador e no celular — a thread principal os identifica pelo nome no briefing de cada sessão:
  - **Item A** — principal, link direto (sem submenu nem banner). CH-01 grava ícone `etiqueta`, cor da barra `#E8C77A`, cor da lista `#8A5A2B`. Ninguém mais altera.
  - **Item B** — principal **com submenu**. CH-01 grava ícone `presente` e **só** a cor da lista `#8A5A2B` (barra sem cor). Ninguém mais altera.
  - **Item C** — principal, de trabalho de CH-02 e CH-05; **termina sem cor nas duas superfícies**, com o ícone que tinha (`gravacao`).
  - **Item D** — principal com **ícone da marca já gravado antes da rodada** ("Coleção Amuletos", `flor-prensada`, só no computador); ninguém toca.
  - O perfil de estilo é alterado só por CH-02 (Configurações › Dados da loja › "Perfil de estilo da loja") e volta a **Black Friday** (o perfil em que a rodada começou) antes do fim da sessão.
  - Medidas de referência (fundos: barra Padrão `#34495E`, barra Black Friday `#1C1A18`, lista branca): `#E8C77A` ≈ 5,7:1 na barra e ≈ 1,6:1 na lista; `#8A5A2B` ≈ 5,9:1 na lista e ≈ 1,6:1 na barra. São aproximações para escolher o dado; a régua é a medida que o editor mostra.
  - **Rodada 2 (confirmação, 2026-11-17):** o menu já está em **v2** (a rodada 1 gravou). Estado no início: A "Sobre" com `etiqueta`, barra `#E8C77A`, lista `#8A5A2B`; B "Joias afetivas" com `presente`, só lista `#8A5A2B`; C "Personalizados" com `gravacao`, sem cor; D "Coleção Amuletos" com `flor-prensada`; perfil **Black Friday**. Quem mexer em A, B ou C para conferir volta o item a esse estado antes de terminar.
  - Rótulo **sem cor** hoje: barra `on-primary` (`#F7F3EC` no Padrão); lista `ink`/`primary` (`#23303A`/`#34495E`) — o que a loja desenhava antes do Work Item.

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  (`agent-browser`, ou `playwright-cli` / Playwright MCP como fallback); os `TC-*` são conferidos dentro do
  charter que os cita. As áreas de risco: o seletor e a gravação do ícone (CH-01), a régua de contraste e a entrada de cor (CH-02), o efeito na folha do celular (CH-03), o efeito na barra e o que não podia mudar (CH-04)
- **CFR:** usabilidade (a recusa explica e diz o próximo passo), acessibilidade (teclado, rótulos dos campos de cor, a medida não só por cor, contraste computado do rótulo na loja, 200% de fonte), performance percebida (a prévia reflete a cor sem atraso que confunda), compatibilidade (390 · 768 · 1440 — a mudança toca layout da barra, da folha e do editor), recuperação de erro (a recusa preserva o que a dona digitou). Paridade com produção como condição da rodada
- **Conferência visual:** sem fonte de design — fora. A régua visual é o texto de `plan.md` › Design e o padrão das telas que já existem (ícones da marca para os do sistema; `ColorsCard` de campanha como forma do controle de cor), conferida nos charters exploratórios (TC-UI-001)
- **Onde termina o simulado:** tudo roda contra o Supabase local; não há integração externa na mudança. Leitor de tela real e a leitura de um documento malformado gravado por fora do painel ficam fora do browser — o segundo é TC-INT-001, da suíte do Dev
- **Automação:** 14 casos `e2e` + `missing` ficam como pedido de automação E2E; 1 `integration` (TC-INT-001) fica com o Dev; `blocked`: nada

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1     | TC-JOURNEY-001 | J-01 | a dona escolhe ícone do sistema e cor, grava, e a loja mostra |
| 2     | TC-FUNC-003 | J-01 | o que a dona gravou volta igual depois de recarregar |
| 3     | TC-JOURNEY-002 | J-02 | a cliente no celular vê o ícone e a cor e chega à página do item |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md`
- [ ] App do branch rodando no ambiente local (loja `:8082`, painel `:8083`, Supabase local)
- [ ] App acessível num ambiente com paridade de produção (auth real, cookies habilitados)
- [ ] Credencial para cada persona que precisa de conta — `admin`: `QA_ADMIN_USUARIO` / `QA_ADMIN_SENHA` (pendente de confirmar que existem); `anonima`: nenhuma
- [ ] Massa de dados que atende as pré-condições das jornadas: menu v2 gravado com os itens A, B, C e D da seção Ambiente; perfil de estilo Padrão; `VITE_STORE_URL` do painel apontando para a loja local
- [ ] Driver de browser disponível — `agent-browser` 0.39+, ou `playwright-cli` / Playwright MCP headless como fallback

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| C-01 | plan | o seletor oferece, além dos da marca, os dez ícones do sistema | TC-FUNC-001, TC-JOURNEY-001 |
| C-02 | plan | os ícones do sistema no estilo da casa (grade 24, traço 1,5, contorno `currentColor`, realce dourado) | TC-UI-001 |
| C-03 | plan | a loja desenha o ícone do sistema na barra, na folha e na prévia | TC-JOURNEY-001, TC-FUNC-004, TC-JOURNEY-002, TC-FUNC-010, TC-JOURNEY-003, TC-FUNC-011 |
| C-04 | plan | dois grupos com título, "Sem ícone" fixa, busca alcança os dois | TC-FUNC-001, TC-FUNC-002, TC-CFR-001 |
| C-05 | plan | a chave do sistema grava no v2 e é lida igual pela loja e pelo painel; ícones já gravados não mudam | TC-FUNC-003, TC-JOURNEY-001, TC-REG-001, TC-INT-001 |
| C-06 | plan | duas cores livres por item principal (barra e lista), com seletor de cor; loja desenha na cor da superfície; sem cor = como hoje | TC-JOURNEY-001, TC-FUNC-003, TC-FUNC-004, TC-FUNC-007, TC-FUNC-008, TC-JOURNEY-002, TC-FUNC-010, TC-JOURNEY-003, TC-FUNC-011, TC-REG-001, TC-CFR-001 |
| C-07 | plan | cor abaixo de 4,5:1 no seu fundo (barra Padrão e Black Friday, lista branca) recusada antes de gravar, com a medida; fora de `#RRGGBB` = sem cor | TC-FUNC-005, TC-FUNC-006, TC-FUNC-009, TC-INT-001, TC-CFR-002 |

**Sem cobertura:** nada

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| a cor gravada some na loja, no painel ou na prévia, ou a gravação seguinte (de outro campo) a apaga | média | perde dado | TC-FUNC-003 (com a variação "gravar outro campo depois"), TC-JOURNEY-001, TC-INT-001 |
| rótulo ilegível chega à cliente (cor livre por `style` só é contida pela recusa) | média | abala confiança | TC-FUNC-005, TC-FUNC-006, TC-CFR-002 |
| com a cor da dona, a barra perde a pista de item aberto (o hover branco deixa de valer) | média | fricção | TC-FUNC-011, TC-JOURNEY-003 |
| perfil Black Friday troca o fundo da barra | baixa | abala confiança | TC-FUNC-009 |
| o grupo "Do sistema" fica abaixo da dobra e a dona não o acha | média | fricção | TC-FUNC-001, TC-FUNC-002 |
| itens sem cor ou com ícone da marca mudam de aparência sem a dona ter mexido | baixa | abala confiança | TC-REG-001 |
| o ícone herda a cor do rótulo e destoa do desenho da casa | média | cosmético | TC-FUNC-010, TC-FUNC-011 (pergunta 🟡 abaixo) |

## Perguntas

- 🔴 nada
- 🟡 Código de cor fora do formato no campo hex: o plano assume que o editor o **recusa** com frase própria e Salvar não grava (a tarefa 02 diz que `menuLabelColorRefusal` confere o formato antes do contraste) — TC-FUNC-006
- 🟡 Minúsculas (`#e8c77a`, o que o seletor nativo de cor produz) contam como `#RRGGBB` válido; espaço em volta de um código colado não é decidido por nenhuma fonte — o plano registra o que acontece, sem julgar — TC-FUNC-006
- 🟡 O texto exato da frase de recusa não está nas fontes: o plano confere que ela nomeia a superfície (barra ou lista) e traz a medida `N,NN:1` abaixo de 4,5:1 — TC-FUNC-005
- 🟡 Na folha do celular, o ícone mantém o tom dele e não herda a cor da dona (a tarefa 02 decide isso para a barra; para a folha, o plano assume o mesmo) — TC-FUNC-010
- 🟡 Se a prévia desenha uma cor que o editor está recusando não é decidido: o plano não julga, só registra — TC-FUNC-004, TC-FUNC-005
- 🟢 Com os tons de hoje, a barra do Black Friday (`#1C1A18`) é mais escura que a do Padrão (`#34495E`): toda cor clara aceita no Padrão também passa no Black Friday, e nenhuma cor escura passa em nenhuma das duas. A régua do Black Friday só vai recusar algo se os tons mudarem — a frase de recusa da barra, na prática, sempre vem do Padrão
- 🟢 A cor de uma superfície em que o item está desligado (ex.: item só no computador) continua editável na lista do celular; nenhuma fonte diz se o campo deveria se apagar — nota para o produto
