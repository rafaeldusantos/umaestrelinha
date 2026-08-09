# Identidade Papelaria (Nanita v2) — Specification

## Problem Statement

A loja roda hoje na identidade Nanita v1 — "confeitaria": chão branco, uma família de rosa em 327°
(glacê / framboesa / geleia), wordmark escrito como **texto** em Berkshire Swash e favicon com o rosto
da mascote. As pranchas 18 · 19b · 20b · 22 · 23 do Paper fecharam a v2 — "papelaria": chão de papel,
rosa em 343°, um neutro quente para borda de campo, wordmark **vetorizado**, botão de canto 14px e
favicon de monograma. Os assets já existem em `.specs/brand/nanita-v2/`, **nada está plugado**, e o
README daquele diretório avisa que a troca do chão **não pode ser parcial**: `--nanita-sugar`
(`#FFEFF6`) sobre Papel (`#F9F1EE`) dá **1,00:1** — a faixa de seção continuaria no CSS e
simplesmente não apareceria.

## Goals

- [ ] A loja inteira (`apps/store`) renderiza na paleta papelaria, com **zero** regressão de contraste
      contra os pisos WCAG declarados na prancha 18.
- [ ] O wordmark deixa de ser texto e passa a ser o SVG vetorizado, na escada de redução medida na
      prancha 21 (lockup ≥140px · wordmark ≥110px · monograma ≤48px).
- [ ] Botão da loja tem **um** padrão de forma (canto 14px) e três variantes de cor, e pílula fica
      reservada a badge / chip / campo — a distinção é verificável por teste.
- [ ] A aba do navegador mostra o monograma N (squircle) e o atalho do iPhone o quadrado sangrado.
- [ ] As treze seções da home batem com os artboards **23 · Home Mobile** (390px) e
      **22 · Home Desktop** (1440px).
- [ ] `DESIGN.md` e o bloco de design do `CLAUDE.md` descrevem a v2 — não a v1.

## Out of Scope

| Item | Motivo |
|---|---|
| Backoffice (`apps/backoffice`, `packages/ui/styles.css`, `tailwind.preset.ts`) | Convivência de dois temas é decisão vigente do `CLAUDE.md`. A v2 é da loja. |
| Trocar Fredoka por Outfit | O README da v2 levanta a divergência (terminais arredondados × retos), mas **os artboards 22/23 usam Fredoka em tudo** — o desenho já decidiu. Trocar a fonte de títulos é feature de marca à parte. |
| Aposentar `NanaMascot` | A mascote é a persona da criadora, não o wordmark (`CLAUDE.md`). Segue em 404, estados vazios e Sobre. Só sai da **aba** — e isso é `PAP-05`. |
| Renomear `@nanapin/*`, tokens `--nana-*` do backoffice, chaves de `localStorage` | Contrato técnico e contrato com o navegador da cliente (`CLAUDE.md`). |
| Redesenhar telas fora da home | A troca de token as reveste automaticamente; revisitar layout de checkout/produto/conta é escopo próprio. Só o **botão** é normalizado em toda a loja (`PAP-03`). |
| Seção "Compre Junto" | Já registrada como não implementada por motivo de cobrança server-side (`CLAUDE.md`). |
| `og:image` novo | O asset atual aponta para um bucket externo; gerar arte social nova é trabalho de marca, não de adoção. |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Racional | Confirmado? |
|---|---|---|---|
| Base do favicon | **B · squircle** na aba (`favicon.svg`/`.ico`/`512`), **C · quadrado sangrado** no `apple-touch-icon` 180px | Escolha do usuário nesta sessão, e é a recomendação medida da prancha 19b: haste do N em 2,5px/2,6px a 16px contra 2,1px do disco. | **y** |
| Berkshire Swash | **Retirada da loja** — inclusive do `<link>` do Google Fonts | Perde as duas funções que tinha: o wordmark vira SVG (prancha 18) e a inicial marca-d'água do card de coleção sai em **Fredoka 700** nos artboards 22/23. Fonte carregada e não usada é payload morto. | n |
| Alcance da troca de paleta | **Loja inteira**, via valor dos tokens `nanita-*` | O README da v2 prova que o chão não entra sozinho; e a loja já consome o namespace `nanita-*` em ~190 arquivos, então trocar valor reveste tudo de uma vez. Layout continua igual fora da home. | n |
| `--nanita-glaze` / `--nanita-raspberry` / `--nanita-sugar` etc. | **Mantêm o nome, trocam o valor** (glaze→Carimbo, raspberry→Selo, jam→Carmim, ink→Grafite, plum→Carbono, sugar→Mata-borrão, border→Dobra, butter→Fita inalterado) | Renomear 190 arquivos de classe Tailwind é churn sem ganho e risco de deixar meia loja na paleta velha. Os nomes viram apelidos; `DESIGN.md` passa a documentar o **papel**, que é o que importa. | n |
| Dois tokens novos | `--nanita-paper` (`#F9F1EE`, o chão) e `--nanita-rule` (`#8F7268`, borda de campo) | Nenhum tom claro chega aos 3:1 que a WCAG 1.4.11 exige de borda de controle; `--nanita-border` (1,19:1) é divisor, não borda de campo. Duas funções, dois valores. | n |
| Forma do botão | `rounded-button` (14px) — token novo no Tailwind da loja | Os artboards usam `--radius-button: 14px` em **todo** botão (hero, kit, newsletter, lembrete). `rounded-pill` continua existindo e continua correto em badge, chip, tag e campo de busca. | n |
| Onde mora o wordmark em React | `apps/store/src/shared/ui/` | É identidade **só da loja**. `packages/ui` é compartilhado com o backoffice, e `NanaLogo`/`NanaMascot` só estão lá por herança. | n |
| Sombra rosa | Recalibrada para o rosa novo (`#FF51B9` → `#E93A6D`), mantendo os três nomes | Sombra é elevação, não identidade; trocar o nome quebraria 10 usos sem devolver nada. | n |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

### Varredura de dimensões implícitas

| Dimensão | Resolução |
|---|---|
| Validação de entrada / limites | N/A — nenhuma entrada de usuário muda. |
| Falha / falha parcial | **Aplicável.** O SVG do wordmark é **inline** (componente React), não `<img src>`: não há estado de carregamento nem 404 possível no header. Ver `PAP-04`. |
| Idempotência / retry | N/A — sem efeito externo. |
| Auth / rate limit | N/A. |
| Concorrência / ordenação | **Aplicável.** `App.css` precisa continuar sendo importado **depois** de `@nanapin/ui/styles.css`; inverter a ordem devolve a loja à paleta do backoffice. Ver `PAP-09`. |
| Ciclo de vida de dado / expiração | **Aplicável por negação.** Nenhuma chave de `localStorage` muda — a troca é puramente de apresentação. Ver `PAP-09`. |
| Observabilidade | N/A — sem lógica nova. |
| Falha de dependência externa | **Aplicável.** O `<link>` do Google Fonts perde Berkshire Swash. Fredoka e DM Sans continuam com fallback `system-ui`. Ver `PAP-04`. |
| Integridade de transição de estado | N/A. |

---

## User Stories

### P1: A loja veste a paleta papelaria ⭐ MVP

**User Story**: Como cliente da loja, quero ver a identidade nova em toda a navegação, para que a
marca da aba, do header, do card e do botão seja a mesma coisa.

**Why P1**: É o alicerce. Sem os tokens trocados, todo o resto (botão, home, logo) fica sobre a
paleta velha e o resultado é uma loja de duas identidades.

**Acceptance Criteria**:

1. WHEN o tema da loja é resolvido THEN os tokens SHALL valer exatamente:
   `--nanita-paper #F9F1EE` · `--nanita-sugar #F7D6E0` · `--nanita-border #EBDDD7` ·
   `--nanita-rule #8F7268` · `--nanita-glaze #F1678D` · `--nanita-raspberry #E93A6D` ·
   `--nanita-jam #A62348` · `--nanita-plum #7E5769` · `--nanita-ink #2E2028` ·
   `--nanita-butter #FFC95C` — nos **dois** lugares (`App.css` e `tailwind.config.ts`), sem divergir
   entre si.
2. WHEN o contraste de cada token é medido sobre `--nanita-paper` pela fórmula WCAG 2.1 THEN os
   pisos SHALL ser atendidos: `jam` ≥ 4,5 · `plum` ≥ 4,5 · `ink` ≥ 7 · `rule` ≥ 3 ·
   `raspberry` ≥ 3 — e `glaze`, `sugar`, `border`, `butter` SHALL ficar **abaixo** de 3 (são
   preenchimento, e o teste registra isso como fato, não como falha).
3. WHEN o `<body>` da loja é renderizado THEN o fundo SHALL ser `--nanita-paper`, não `#FFFFFF`.
4. WHEN qualquer superfície de card, pílula ou barra de navegação é renderizada THEN o fundo SHALL
   ser branco `#FFFFFF` — o branco vira o card, não o chão.
5. WHEN `--nanita-sugar` e `--nanita-paper` são comparados THEN a razão de contraste SHALL ser
   ≥ 1,15 — a guarda direta contra o defeito de 1,00:1 que motivou a feature.
6. WHEN o tema shadcn é resolvido THEN `--background`, `--foreground`, `--primary`, `--secondary`,
   `--muted-foreground`, `--border`, `--input` e `--ring` SHALL apontar para os valores papelaria
   equivalentes, em HSL.

**Independent Test**: `pnpm --filter @nanapin/store test` roda a suíte de paleta; abrir a loja em
390px mostra chão bege e cards brancos.

---

### P2: Botão tem uma forma só, e ela não é pílula ⭐ MVP

**User Story**: Como cliente, quero que toda ação da loja tenha a mesma forma, para que eu reconheça
o que é clicável sem precisar aprender de novo em cada tela.

**Why P1/P2**: É o padrão que o usuário pediu por nome, e é o que mais destoa hoje: 78 ocorrências de
`rounded-pill` misturam botão, badge, chip e campo numa forma só.

**Acceptance Criteria**:

1. WHEN o Tailwind da loja é resolvido THEN SHALL existir `rounded-button` = `14px`, e
   `rounded-pill` = `999px` SHALL continuar existindo.
2. WHEN um **botão** (elemento `<button>` ou `<a>` que dispara ação) é renderizado em qualquer
   arquivo da loja THEN ele SHALL usar `rounded-button` — nunca `rounded-pill`. Exceção declarada e
   única: o **disco de ação** (`rounded-full`, ex. o `+` do card, as setas do carrossel, o ícone do
   header), porque o disco é a forma-assinatura do produto.
3. WHEN um badge, chip, tag ou campo de busca é renderizado THEN ele SHALL continuar em
   `rounded-pill`.
4. WHEN a variante **primária** é usada THEN SHALL ser `bg-nanita-jam` (Carmim) + texto branco +
   `rounded-button`, rótulo em Fredoka 600.
5. WHEN a variante **secundária** é usada THEN SHALL ser fundo transparente + `border-2
   border-nanita-ink` + texto Grafite + `rounded-button`.
6. WHEN um botão é usado **sobre superfície Grafite** THEN SHALL ser `bg-nanita-glaze` (Carimbo) +
   texto Grafite + `rounded-button` — nunca Carmim, que sobre Grafite lê a 2,18:1.
7. WHEN o botão primário do shadcn (`variant="default"`) é renderizado na loja THEN SHALL herdar a
   mesma forma de 14px.

**Independent Test**: um teste de varredura de fonte falha se `rounded-pill` aparecer na mesma
`className` de um `<button>`; snapshot de `OrderConfirmationPage` mostra o CTA em 14px.

---

### P3: O wordmark é vetor, não fonte ⭐ MVP

**User Story**: Como dona da loja, quero a marca nova no header e no rodapé, para que a loja mostre o
logotipo que foi desenhado e não uma aproximação em fonte de terceiro.

**Why P1**: O logo é o que o usuário pediu primeiro, e é o que segura a percepção de "identidade
nova" mesmo antes de a home mudar.

**Acceptance Criteria**:

1. WHEN o header da loja é renderizado THEN SHALL mostrar o **wordmark** SVG (`nanita-wordmark`,
   viewBox `0 0 690.06 172.04`) — inline no DOM, não `<img>` — com largura ≥ 110px, proporção
   4,01:1 travada, e `aria-label` "Nanita".
2. WHEN o rodapé da loja é renderizado THEN SHALL mostrar o **lockup** completo (wordmark +
   descritor "PERSONALIZADOS", viewBox `0 0 690.06 237.8`) com largura ≥ 140px.
3. WHEN o lockup é renderizado **sobre Grafite** THEN o descritor SHALL ser Dobra (`#EBDDD7`), não
   Carbono — Carbono sobre Grafite dá 2,55:1 e desaparece.
4. WHEN o SVG é servido THEN cada cor SHALL ser **um único `<path>` com `fill-rule="evenodd"`" — a
   estrutura que faz os contadores do `a`, `P`, `R`, `O`, `A`, `D` serem buracos e não miolo pintado.
5. WHEN a folha do menu mobile e o header do checkout são renderizados THEN SHALL usar o mesmo
   componente de wordmark — não uma segunda cópia.
6. WHEN a inicial marca-d'água do card de coleção é renderizada THEN SHALL ser **Fredoka 700**, não
   Berkshire Swash.
7. WHEN o `index.html` é servido THEN o `<link>` do Google Fonts SHALL pedir **apenas** Fredoka e DM
   Sans, e a classe `.nanita-wordmark` (Berkshire Swash) SHALL deixar de existir no CSS e no código.

**Independent Test**: renderizar `Header` e conferir `<svg role="img" aria-label="Nanita">`; grep por
`Berkshire` no `apps/store` retorna vazio.

---

### P4: A aba do navegador mostra o N ⭐ MVP

**User Story**: Como cliente, quero reconhecer a Nanita entre 20 abas abertas, para voltar à loja sem
ler o título.

**Why P1**: Foi pedido explicitamente, e é um arquivo — barato e imediatamente visível.

**Acceptance Criteria**:

1. WHEN o navegador pede `/favicon.svg` THEN SHALL receber um **squircle** 64×64 (canto 18px ≈ 28%)
   em Carimbo `#F1678D` com o N do lockup em Grafite `#2E2028`.
2. WHEN um cliente sem suporte a SVG pede `/favicon.ico` THEN SHALL receber 16 · 32 · 48 do mesmo
   squircle.
3. WHEN o iOS pede o atalho da tela inicial THEN `/apple-touch-icon.png` (180×180) SHALL ser o
   **quadrado sangrado** — sem canto arredondado, porque o iOS aplica a própria máscara e arte
   pré-arredondada deixa sobra de canto.
4. WHEN o `index.html` é servido THEN SHALL declarar `icon` (svg), `icon` (ico), `apple-touch-icon` e
   `theme-color` = `#A62348` (Carmim) — hoje aponta para a geleia velha `#B0176B`.
5. WHEN o N é desenhado em qualquer base THEN SHALL ser o **mesmo path** do lockup, sem redesenho.

**Independent Test**: abrir a loja e conferir a aba; teste assere existência dos quatro arquivos e o
`viewBox`/`rx` do SVG.

---

### P5: A home bate com os artboards 22 e 23

**User Story**: Como cliente, quero a home nova, para que a primeira tela da loja seja a que foi
desenhada.

**Why P2**: Depende de P1 (paleta), P2 (botão) e P3 (logo). É o maior volume, e é o que mais se
beneficia de ser feito depois que o alicerce está de pé.

**Acceptance Criteria**:

1. WHEN a home é renderizada THEN SHALL ter as mesmas treze seções, na mesma ordem, dos artboards
   22/23 — nenhuma seção nasce, nenhuma morre.
2. WHEN o **hero** é renderizado THEN o fundo SHALL ser Mata-borrão, o título SHALL ter duas cores
   (linha 1 Grafite, linha 2 Carmim), o CTA primário SHALL ser Carmim com seta e o secundário
   contorno Grafite; a arte SHALL ser a **cartela de pins** (não a mascote).
3. WHEN o **card de coleção** é renderizado THEN o ritmo por posição SHALL ser
   **1º Carimbo → 2º Grafite → demais Mata-borrão**, com a inicial em Fredoka 700 a 76px, opacidade
   ~50%, sangrando no topo direito.
4. WHEN o **card de produto** é renderizado THEN o palco SHALL ser Mata-borrão `rounded-lg`, o selo
   Grafite em pílula, o disco `+` Grafite 38px, o coração em disco branco 36px, a categoria em
   Carbono 12/600/0.1em, o nome em Fredoka 18/500 Grafite e o preço em Fredoka 20/600 **Carmim**.
5. WHEN o **card de kit** destacado é renderizado THEN SHALL ser superfície Grafite com números e CTA
   em Carimbo, e a fita "MAIS POPULAR" em Fita sobre Grafite, cantada no topo direito.
6. WHEN a **newsletter** é renderizada THEN a superfície SHALL ser Carimbo com texto Grafite, o campo
   branco e o botão Grafite com texto branco.
7. WHEN o **rodapé** é renderizado THEN SHALL ser Grafite, com o lockup em Carimbo/Dobra e os títulos
   de coluna em Carimbo.
8. WHEN a home é aberta em **390×844** THEN não SHALL haver rolagem horizontal do `body`, e todo alvo
   de toque SHALL ter ≥ 44px.

**Independent Test**: abrir `/` em 390px e 1440px lado a lado com os artboards.

---

### P6: A documentação descreve a v2

**User Story**: Como pessoa que vai mexer na loja depois, quero ler as regras vigentes, para não
re-derivar uma decisão que já foi tomada.

**Why P2**: Sem isso, o próximo trabalho de UI reintroduz pílula e geleia — foi exatamente o que o
`DESIGN.md` v1 evitou por seis features.

**Acceptance Criteria**:

1. WHEN `DESIGN.md` é lido THEN §2 (paleta), §3 (tipografia), §4 (forma), §5 (componentes) e §7
   (escopo) SHALL descrever a papelaria, com os contrastes medidos sobre **Papel**, e SHALL registrar
   por que o chão não pode entrar sozinho.
2. WHEN `DESIGN.md` §5 é lido THEN SHALL dizer que botão é 14px e pílula é badge/chip/campo — o
   inverso do que diz hoje ("Todo botão é pílula").
3. WHEN `DESIGN.md` §8 é lido THEN o checklist SHALL checar os pisos novos (Carimbo nunca texto sobre
   Papel; Fita só sobre Grafite; borda de campo em Papelão).
4. WHEN o bloco de design do `CLAUDE.md` é lido THEN SHALL nomear a paleta papelaria, o botão de
   14px, o wordmark vetorial e o favicon de monograma, e SHALL manter intactas as proibições de
   renomeação (`@nanapin/*`, `--nana-*` do backoffice, chaves de `localStorage`).
5. WHEN `.specs/brand/nanita-v2/README.md` é lido THEN a seção "Se for adotar" SHALL registrar que a
   adoção aconteceu, com o número da feature.

**Independent Test**: leitura; e o checklist §8 aplicado à home não acusa violação.

---

## Edge Cases

- WHEN um arquivo ainda usa `bg-nana-*` ou `.gradient-cta` THEN SHALL resolver para a cor chapada
  papelaria equivalente — a camada de compatibilidade continua, com valores novos.
- WHEN o wordmark é renderizado abaixo de 110px de largura THEN o componente SHALL cair para o
  monograma, nunca renderizar o lockup borrado.
- WHEN a home carrega **sem produtos** (banco vazio) THEN as seções de carrossel SHALL continuar sem
  quebrar layout — o skeleton segue na paleta nova.
- WHEN `prefers-reduced-motion` está ativo THEN a marquee e o recolher do header SHALL continuar
  respeitando a preferência (comportamento vigente, não pode regredir).
- WHEN a classe `.dark` cai no documento por um componente shadcn THEN os tokens papelaria SHALL
  continuar valendo — a loja é light-only.
- WHEN o `apple-touch-icon` é renderizado pelo iOS THEN o N SHALL ficar dentro da área segura da
  máscara (o quadrado é sangrado, o **N** não).

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| PAP-01 | P1: paleta nos tokens (`App.css` + `tailwind.config`) | Design | Pending |
| PAP-02 | P1: chão Papel, card branco, shadcn remapeado | Design | Pending |
| PAP-03 | P1: contraste medido sobre Papel, com guarda de 1,15 em `sugar × paper` | Design | Pending |
| PAP-04 | P2: `rounded-button` 14px + três variantes; pílula fica em badge/chip/campo | Design | Pending |
| PAP-05 | P3: wordmark/lockup/monograma como componentes SVG inline, escada de redução | Design | Pending |
| PAP-06 | P3: Berkshire Swash retirada (CSS, código e `<link>` de fonte) | Design | Pending |
| PAP-07 | P4: favicon squircle + ico + apple-touch-icon quadrado + `theme-color` | Design | Pending |
| PAP-08 | P5: home conforme artboards 22/23, treze seções | Design | Pending |
| PAP-09 | P1: invariantes de convivência — ordem de import, backoffice intacto, `localStorage` intacto | Design | Pending |
| PAP-10 | P6: `DESIGN.md`, `CLAUDE.md` e README da marca atualizados | Tasks | Pending |

**Cobertura:** 10 total, 0 mapeados para tasks ainda.

---

## Success Criteria

- [ ] `pnpm --filter @nanapin/store test` verde, sem teste enfraquecido ou removido.
- [ ] `npx tsc --noEmit -p apps/store/tsconfig.app.json` → **0 erros** (baseline vigente é zero).
- [ ] `pnpm lint` sem **erros novos** contra a baseline 30 err / 9 warn.
- [ ] Screenshot da home em 390×844 e 1440×900 batendo com os artboards 23 e 22.
- [ ] `git diff --stat` mostra **zero** linha alterada em `apps/backoffice/` e em
      `packages/ui/src/styles.css` / `packages/ui/tailwind.preset.ts`.
- [ ] Nenhuma chave de `localStorage` renomeada (`git diff` não toca as strings `nanapin-*`).
