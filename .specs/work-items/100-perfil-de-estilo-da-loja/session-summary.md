# WI 100 · Perfil de estilo da loja — resumo da sessão

**Data**: 2026-11-14 · **Branch**: `feature/100` (local, base `master` em `76c51acb`) · **Fase**: `done` (Validation 1 PASS)

O WI deixa a loja trocar de paleta entre **Padrão** e **Black Friday** (preto e ouro) por uma escolha em
Configurações › Dados da loja, sem deploy. Só a loja muda; o painel, o app do ateliê e os e-mails ficam no Padrão.

## Como a sessão correu

1. **Planejamento** (`/feature start 100`, entrada com PRD). Revisão técnica do PRD, handoff, costura (`spec.md`) e fila de 7 tarefas com auditoria. Os gates técnicos foram decididos pela recomendação, porque o usuário mandou orquestrar de ponta a ponta sem esperar resposta:
   - prd-review r1: 16 achados, 6 aplicados ao `prd.md` e 12 registrados em Decisões (R1–R12);
   - handoff: 13 itens, H1–H13;
   - auditoria da fila: 1 correção (a sombra do `CookieNotice` lê `--estrelinha-ink-rgb`).
2. **Implementação em ondas** `01,03 | 02,04,05 | 06,07`. Em cada tarefa, um wi-impl-task implementou, um wi-impl-review revisou, e a tarefa foi marcada `done` e commitada pelo orquestrador.
3. **Validation 1**: PASS (abaixo).

## Commits na branch (`git log --oneline master..HEAD`)

| Commit | Tarefa | Arquivos | Revisão |
| --- | --- | --- | --- |
| `9ddc8914` | T01 O perfil como configuração da loja (`core/appearance`, tipo, default e canal da prévia) | 15 (+528/−1) | serve |
| `f2acebe8` | T03 A marca desenhada acompanha o perfil | 4 (+40/−7) | serve |
| `d12dac96` | T02 A paleta da loja por perfil (tokens, Tailwind por variável, blocos do `App.css` e guardas) | 9 (+1010/−94) | serve com correção |
| `6531dc6b` | T04 O HTML servido já chega com o perfil | 7 (+265/−39) | serve |
| `2a5a50da` | T05 A loja aplica o perfil sem troca de cor diante da cliente, e a prévia recebe o rascunho | 7 (+511/−22) | serve |
| `a6793f5f` | T06 O desconto em ouro no Black Friday, e as sombras soltas no perfil | 9 (+115/−13) | serve |
| `b244cebc` | T07 Configurações › Dados da loja › card "Perfil de estilo da loja" com a prévia | 10 (+840/−8) | serve |

São 61 arquivos (+3309/−184). Os artefatos do WI ficam fora destes commits; o orquestrador os commita na limpeza.

## O que mudou, por repositório e área

Há um repositório só (o monorepo). A mudança passou por estes workspaces:

- **`packages/core`**:
  - `appearance/`, novo, alcançável pelo Deno com `.ts` explícito: `STYLE_PROFILES = ['padrao','black-friday']`, `StyleProfile`, `DEFAULT_APPEARANCE`, `STYLE_PROFILE_ATTRIBUTE = 'data-perfil'`, `normalizeAppearance`/`styleProfileOf` (valor desconhecido vira Padrão), o canal da prévia (`draft`/`ready`, com parse que recusa) e a cópia do card;
  - `hooks/useStyleProfile.ts` e a chave `appearance` em `DEFAULTS` de `useStoreSettings`;
  - `page/head.ts` › `markStyleProfile`; `page/serve.ts` lê o perfil na mesma leitura da faixa (`marcarHtml`) e põe `no-store` quando a leitura falha.
- **`packages/ui`**:
  - `tokens/estrelinha.ts`: `ESTRELINHA_PROFILES` (o `padrao` é a mesma referência de `ESTRELINHA_COLORS`), os tokens de desconto `sale`/`on-sale`/`sale-bar`, a sombra por perfil e os nomes das variáveis;
  - `BrandSvg` lê `var(--estrelinha-primary-strong, #283A4A)` e `var(--estrelinha-accent, #B8945F)`.
- **`packages/supabase`**: o tipo `AppearanceSettings` na chave `appearance` de `store_settings`. **Sem migration**: chave ausente significa Padrão.
- **`apps/store`**:
  - `App.css`: um bloco por perfil, com o hex, a versão `-rgb` (para o Tailwind), a camada HSL do shadcn e a sombra;
  - `tailwind.config.ts`: as classes leem `rgb(var(--…-rgb) / <alpha-value>)`, o que mantém o `/80`;
  - `server/page.ts` escreve `data-perfil` no `<html>`;
  - `StyleProfileApplier`: o atributo da carga vale até a primeira navegação, e depois a configuração decide;
  - `useStyleProfilePreview`: recebe o rascunho só dentro da prévia;
  - `shared/lib/useNavigatedSinceLoad.ts`: extraído do `useAnnouncementBar`;
  - o desconto passa a usar o papel `sale` no `ProductCard`, na `ProductPage` e na barra do `CartDrawer`;
  - as sombras do `InstagramInviteSheet` e do `CookieNotice` leem variável.
- **Guardas da loja**:
  - `palette` lê os perfis do disco e compara com o dono;
  - `contrast` aplica os pisos nos dois perfis e os tetos só no Padrão;
  - `accentText` ganhou a régua do papel de desconto;
  - também mudaram `fieldBorder`, `storeSettingsDefaults` e `brandAssets`;
  - `perfilDeEstiloComDonoUnico` é novo e cobre o hex do BF e o literal do atributo.
- **`apps/backoffice`**:
  - `features/style-profile/`: o card com as duas opções e as amostras, e a prévia num Dialog com Celular/Computador e a ponte `postMessage`;
  - o card entra por último em `StoreDataSection`;
  - `useSettingsSave.salvar` ganhou um 3º argumento opcional para o aviso de sucesso;
  - guardas `previaUnica` e `folgaDoPalco` ampliados ao quarto palco.

## Decisões e premissas que valem além de uma tarefa

- **Variáveis**: `--estrelinha-<t>` continua em hex (os consumidores diretos, o Brick do Mercado Pago e os ícones, não quebram). Nasce `--estrelinha-<t>-rgb` só para o Tailwind (R8, revisada em H1).
- **Paleta à mão no `App.css`**, um bloco por perfil, conferida por `palette.test.ts` contra `ESTRELINHA_PROFILES`. O plugin `addBase` foi descartado pela ordem do `@layer base`.
- **Atributo `data-perfil`** no `<html>`, sempre escrito (inclusive `padrao`) pelo servidor e pela loja. Na falha de leitura, o atributo fica ausente e a resposta vai com `no-store` (H6, T04 e T05).
- **Regra de carga, no molde da faixa (RN-04)**: a loja não toca o `<html>` enquanto a configuração carrega. Um atributo desconhecido conta como "não sei".
- **Prévia**:
  - o `draft` com perfil desconhecido é recusado, não normalizado;
  - o canal tem só `draft` e `ready`;
  - o rascunho vence só dentro da prévia (T01, T05).
- **Camada HSL do shadcn no BF ampliada além da lista do R5**: entraram `secondary`, `muted`, `accent` e `secondary-foreground`, porque sem elas esses fundos ficariam no Padrão (T02).
- **Guarda de dono único** sem medir hex em `packages/core`: as cores de campanha do WI 102 coincidem com as do perfil (T02).
- **Card**: o botão é o `SettingsSaveButton` ("Salvar alterações", e não o "Salvar" do Design). A mensagem própria H8 é um argumento opcional, e a frase compartilhada de `useSettingsSave.ts:30` não mudou (T07).
- **O palco do modal não usa `useFullscreenStage`**: o modal já é a vista ampliada, e `fixed inset-0` dentro de um `translate` se prenderia ao modal (T07).

## Desvios do PRD e da costura

- **RN-01, o chip de desconto da sacola**: não existe na sacola um elemento que mostre o desconto com fundo `primary` (procurado em `CartDrawer.tsx:267` e em `CouponInput.tsx:80-93`). Por H4, nada mudou. No BF ficam ouro dois dos três elementos de RN-01: o selo de desconto (cartão e página do produto) e a barra do frete grátis.
- **R5, a lista HSL**: ampliada, como acima.
- **Contrato C2**: o `StyleProfile` entra em `packages/ui` por `import type` relativo com `.ts`, como C2 pede (achado da revisão da T02, corrigido no mesmo commit).
- **Design × obrigação**: o rótulo do botão é "Salvar alterações" (acima).
- **Caducou**: nada. Nenhuma afirmação de tarefa fechada ficou falsa.

## Gates executados (Validation 1, `qa-report.md`)

| Gate | Resultado real |
| --- | --- |
| Testes, um workspace por vez, `--testTimeout=20000`, exit 0 | core **6092/256** · store **7630/409** · backoffice **5422/308** · mobile-adm **2734/176** · functions **1705/49** |
| Tipos (`tsc --noEmit`) | store 0 · backoffice 7 · mobile-adm 0 · `tsconfig.server.json` 0 · core 11. Idênticos ao baseline da corrida por arquivo e código: todos herdados |
| Lint (`npx eslint .`) | store 2/2 · backoffice 23/5 · mobile-adm 0/0 = 25/7, igual à baseline |
| Build (`pnpm build`) | verde, 3 de 3 tasks, mas só com env de placeholder. A 1ª execução reprovou a loja com `URI malformed` porque o worktree não tem `apps/store/.env` e o `%VITE_SUPABASE_URL%` do `index.html` fica sem valor, um problema de ambiente. O bundle tem `html[data-perfil=black-friday]` e classes com `rgb(var(--…-rgb) / α)`; o painel e o ateliê não têm `data-perfil` |
| Cobertura | 17/17 critérios das unidades da fila com teste passando. RN-08 foi adiada à QA real-user |

Não subi nenhum container. Os arquivos de baseline de tipos foram apagados no fecho do build check.

## Pendências conhecidas

- **Prova em navegador** (RN-08), para a QA real-user:
  - as telas em 390×844 e 1440×900, nos dois perfis: Home, categoria, produto, gaveta, checkout, confirmação e conta;
  - a captura do CA-01 (o Padrão idêntico ao de hoje);
  - o CA-02 com rede lenta (o primeiro HTML já no BF, sem pintar o Padrão);
  - a pintura de RN-04;
  - a prévia num iframe de verdade;
  - as opções lado a lado a partir de 1024 px e o modal de 960 px.
- **Documentação**:
  - `apps/store/CLAUDE.md` (O HTML servido) só descreve o `data-faixa`, e o `data-perfil` passou a sair em toda resposta HTML;
  - as baselines de testes do `CLAUDE.md` da raiz precisam dos números acima no fecho;
  - a contagem "5 seções" do backoffice (H13).
- **RN-01 incompleto no BF**: falta o chip da sacola, por H4. Se a dona quiser um chip de desconto em ouro na sacola, é um elemento novo, ou seja, escopo novo.
- **Operação**: a loja abre no Padrão até a dona escolher o Black Friday no card e salvar. A troca leva até 1 hora para chegar a todas as páginas no primeiro acesso (RN-05), e o card avisa isso.
