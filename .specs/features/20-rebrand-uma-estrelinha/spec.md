# 20 · Rebrand Uma Estrelinha — Especificação

> **Fatiada por [`AD-016`](../../STATE.md).** Esta feature é a **fundação**: renomeação técnica,
> identidade visual e remoção do domínio botton. A importação do catálogo real é a
> [`21-catalogo-nuvemshop`](../21-catalogo-nuvemshop/spec.md); o material afetivo é a
> [`22-material-afetivo`](../22-material-afetivo/spec.md). As três compartilham o
> [`context.md`](./context.md) desta pasta.
>
> Decisões de projeto ainda vigentes: [`STATE.md`](../../STATE.md) `AD-001`..`AD-016`.

## Problem Statement

O monorepo herdado é a loja **Nanita** — bottons de cultura pop —, madura em checkout, pagamento,
e-mail transacional, catálogo e promoções, mas com a marca e o vocabulário de outro produto
gravados em ~1.900 linhas de código, no schema, nos e-mails e no identificador npm. Há ainda um
Mockup Studio de 30 arquivos que compõe fotos de **botton** (relevo, alfinete, cartela) e uma página
de 769 linhas para montar kits de pins — ambos sem leitura possível no domínio novo.

A **Uma Estrelinha** vende joias afetivas artesanais em resina com material do cliente, num registro
sensível e memorial. Enquanto a loja se chamar Nanita e vestir rosa Carimbo, nada mais pode ser
demonstrado, testado ou validado com a dona do negócio.

## Goals

- [ ] Zero ocorrência de `nanapin`, `nanita` ou `nana` no código, schema, e-mails e ativos — provado
      por varredura com âncora de contagem, não por inspeção.
- [ ] A loja renderiza na identidade Uma Estrelinha derivada do Paper, com **todo token de texto e
      de contorno de controle medido** contra WCAG 2.1 e travado por teste.
- [ ] O que só existia por causa do botton sai do repositório — código, rota, tabela e bucket.
- [ ] `tsc` = 0 nos dois apps e lint **sem erro novo** contra a baseline herdada (30 err / 9 warn).
- [ ] `supabase start` sobe na faixa 5434x convivendo com as outras duas instâncias da máquina.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Importação do catálogo da Nuvemshop | Feature [`21`](../21-catalogo-nuvemshop/spec.md) (`AD-016`). Aqui o seed de desenvolvimento é o que sustenta a prova visual. |
| Material afetivo: página, campos, rastreio | Feature [`22`](../22-material-afetivo/spec.md) (`AD-016`). |
| Migração de clientes e histórico de pedidos | `C-04`. Dado pessoal (LGPD) e reconciliação de identidade. Vai ao `BACKLOG.md`. |
| Re-skin do backoffice na identidade Uma Estrelinha | `C-05`. Painel interno não carrega marca. Vai ao `BACKLOG.md`. |
| Tema por categoria na loja (4 paletas das landing pages) | `C-09`. Multiplica por 4 toda checagem de contraste e não tem resposta para um carrinho com itens de linhas diferentes. |
| Home redesenhada a partir do board `516-0` | O board está **vazio** (0 filhos). A home recebe paleta e chrome novos; o redesenho entra quando o desenho existir. |
| Kit de ícones custom (`5I2-0`) | Board vazio, mesmo motivo. Ícones seguem em `lucide-react`. |
| Corte de tráfego, DNS e desligamento da Nuvemshop | Operação de go-live. Depende de credenciais que ainda chegam (`C-08`). |
| Provedor de IA / geração de texto | `AD-011` segue valendo — o projeto não tem provedor de IA. |

---

## Assumptions & Open Questions

| Assumption / decisão | Default escolhido | Justificativa | Confirmado? |
| --- | --- | --- | --- |
| Chaves de `localStorage` podem ser renomeadas | Sim, prefixo `estrelinha-` | Nenhum navegador tem estado desta loja; a regra do `CLAUDE.md` protege clientes vivos da Nanita, que não existem aqui | **y** (`C-01`, `AD-016`) |
| Escopo npm e prefixo de token | `@estrelinha/*`, `--estrelinha-*` | Lê bem em import e em classe Tailwind | **y** (`C-10`) |
| Faixa de portas do Supabase local | 54341–54349 (shadow 54340), apps 8082/8083, inspector 8085 | 54320–54329 e 54330–54339 já ocupados na máquina | **y** (`C-11`) |
| Fonte da identidade | Tokens do Paper (idênticos aos das landing pages) + boards `5MC-0`/`6AU-0` + marca `78R-0` | Boards `516-0` e `5I2-0` estão vazios | **y** (`C-03`) |
| `pnpm-lock.yaml` após renomear o escopo | Regerado do zero | Renomear pacote de workspace invalida as entradas `link:`; editar à mão é fonte de divergência silenciosa | **y** — registrado no trade-off de `AD-016` |
| Tokens do backoffice | `--nana-*` → `--estrelinha-admin-*`, **valores inalterados** | O sufixo `admin` diz que aquele namespace não é a marca da loja, evitando que código novo os use por engano | n — validar na Design |
| Vocabulário de produto | **"joia"** genérico; "peça" no contexto de produção | O site usa "joias afetivas"; "peça" aparece em "cada peça é única" | n — validar na Design |
| Avaliações de demonstração | Mantidas com conteúdo de joia afetiva **ou** removidas | Depoimento inventado sobre a morte de alguém tem peso ético diferente de depoimento inventado sobre um pin | n — **decisão da Design**, com recomendação de remover |
| `NanaLogo` / `NanaMascot` de `packages/ui` | Removidos | Na Nanita sobreviviam por serem a persona da criadora; aqui não representam ninguém, e o `CLAUDE.md` que os protegia é reescrito nesta feature | n — validar na Design |
| Credenciais de produção | Sandbox/local; troca documentada por credencial | `C-08` — chegam durante a execução | **y** |

**Open questions:** nenhuma sem registro. As marcadas `n` são refinamentos de Design, não bloqueios
de escopo.

---

## Sweep de dimensões implícitas

Escopo Large — toda dimensão resolve em requisito ou em `N/A` explícito.

| Dimensão | Resolução |
| --- | --- |
| Validação de entrada e limites | `N/A` — esta feature não introduz entrada de usuário nova. As entradas existentes (checkout, cadastro) mudam de rótulo, não de regra. |
| Falha e falha parcial | `PIN-01` — a migration que apaga `mockup_templates` e o bucket precisa ser idempotente e sobreviver a banco que nunca teve a tabela. |
| Idempotência / retry / duplicata | `COP-01` — a migration de rebrand de `store_settings` é condicionada ao valor antigo, como a `20260801170000` já fez: roda de novo sem efeito e não sobrescreve o que a admin editou. |
| Fronteiras de auth e rate limit | `N/A` — nenhuma fronteira de auth muda. `has_role`, RLS e `RequireAdmin` seguem intactos; só o e-mail do admin de seed muda (`REN-02`). |
| Concorrência / ordenação | `IDN-01` e `IDN-07` — a ordem dos dois imports em `main.tsx` decide qual paleta vence; inverter devolve a loja ao tema do painel sem quebrar nada visível. Teste próprio. |
| Ciclo de vida do dado | `PIN-01` — objetos do bucket de mockup precisam sair junto da tabela, senão ficam órfãos pagando storage. |
| Observabilidade | `N/A` — nenhum caminho novo de execução. Log e métricas existentes seguem. |
| Falha de dependência externa | `COP-05` — trocar remetente e `sender_name` no `config.toml` derruba **todo** login por código se o domínio não estiver verificado no Resend. Já aconteceu uma vez (`BUG-20260728`). AC própria. |
| Integridade de transição de estado | `N/A` — nenhuma máquina de estado muda nesta feature. Pagamento e pedido seguem como estão. |

---

## User Stories

### P1: A loja é a Uma Estrelinha, tecnicamente ⭐ MVP

**User Story**: Como Adri, dona da Uma Estrelinha, quero abrir a loja e o painel e não encontrar
nenhum vestígio da marca anterior, para que o projeto seja meu e não uma adaptação visível.

**Why P1**: Nada mais pode ser demonstrado ou testado enquanto a loja se chamar Nanita. É a
fundação de que todas as outras histórias — e as features `21` e `22` — dependem.

**Acceptance Criteria**:

1. WHEN uma varredura case-insensitive por `nanapin`, `nanita` ou `nana` roda sobre `apps/`,
   `packages/`, `supabase/`, os `index.html` e os arquivos de configuração da raiz THEN o sistema
   SHALL reportar **zero ocorrência**, e a própria varredura SHALL falhar se inspecionar menos
   arquivos que sua âncora de contagem.
2. WHEN qualquer módulo importa um pacote do workspace THEN o especificador SHALL ser
   `@estrelinha/*`, resolvido igualmente por `tsconfig.base.json` (`paths`), pelos aliases do Vite
   dos dois apps e pelos `package.json` — e `pnpm install` SHALL resolver o workspace inteiro sem
   erro a partir de um lockfile regerado.
3. WHEN a loja grava carrinho, wishlist, cupom, rascunho de checkout, consentimento de visitante ou
   buscas recentes THEN a chave SHALL começar com `estrelinha-`, e nenhuma chave `nanapin-` SHALL ser
   lida ou escrita.
4. WHEN o backoffice renderiza THEN SHALL usar a mesma paleta roxo/rosa/navy de hoje, com os tokens
   renomeados para `--estrelinha-admin-*` e **valores inalterados**.
5. WHEN `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` roda nos dois apps THEN SHALL reportar
   **0 erro**.
6. WHEN `pnpm lint` roda THEN o total SHALL ser **≤ 30 erros / 9 warnings** — a baseline herdada,
   sem erro novo.
7. WHEN `supabase start` roda com as instâncias `nanapin-store` e `EducaPro/ingressos` ativas
   THEN SHALL subir sem colisão de porta, e a API SHALL responder em `http://127.0.0.1:54341`.

**Independent Test**: `pnpm install && pnpm dev` sobe os dois apps em 8082/8083; a varredura de marca
passa; `tsc` zera; `supabase start` sobe junto com as outras duas.

---

### P2: A identidade visual vem do Paper e é legível ⭐ MVP

**User Story**: Como cliente que acabou de perder alguém, quero uma loja que não grite, para que
comprar uma homenagem não pareça comprar um acessório.

**Why P1/MVP**: A paleta da Nanita (rosa Carimbo, Mata-borrão, Fita) é o oposto do registro do
negócio. Não há como demonstrar a loja para a Adri sem isto.

**Acceptance Criteria**:

1. WHEN os tokens de cor são declarados THEN SHALL existir em **dois arquivos** — `App.css` e
   `tailwind.config.ts` — e um teste SHALL ler os dois do disco e falhar se divergirem. (Divergir não
   quebra build, tipo nem teste de componente: a loja renderiza duas paletas ao mesmo tempo e quem
   descobre é a cliente.)
2. WHEN qualquer token é usado como **texto sobre o fundo da loja** THEN SHALL medir ≥ 4,5:1
   (WCAG 2.1 AA), e o teste SHALL falhar nomeando o token e a razão medida.
   Já medido sobre `ground #FAF8F4`: `accent #B8945F` = **2,66:1** e `accent-strong #A07E4C` =
   **3,55:1** ⇒ **nunca são texto**; `ink-soft #54616B` = 6,00:1 é o piso.
3. WHEN um `<input>`, `<select>`, `<textarea>` ou controle equivalente recebe contorno THEN a cor
   SHALL medir ≥ 3:1 sobre o fundo em que aparece (WCAG 1.4.11), e uma varredura de fonte SHALL
   falhar se um controle usar `--estrelinha-line` (1,25:1) ou `--estrelinha-accent` (2,66:1).
   **Um token de borda de campo nasce nesta feature** — o DS herdado das landing pages não tem, e
   os dois candidatos existentes reprovam.
4. WHEN o fundo da loja muda de branco para `ground` THEN toda superfície que dependia do contraste
   antigo SHALL mudar junto — faixa de seção, divisor e palco de foto —, porque um tom claro sobre
   `ground` pode empatar em luminância e apagar a seção inteira sem erro em lugar nenhum.
5. WHEN o header, o rodapé, o menu ou o checkout renderizam a marca THEN SHALL usar SVG **inline**
   derivado do board `78R-0`, na escada de redução logotipo completo → assinatura → selo circular, e
   nunca `<img src>` — o header não pode ter estado de carregamento.
6. WHEN os arquivos de path do SVG são gerados THEN SHALL vir de um script que lê os SVGs exportados
   do Paper, e um teste SHALL comparar caractere a caractere contra o arquivo-fonte.
7. WHEN a aba do navegador e o atalho do iOS exibem o ícone THEN SHALL ser o **selo circular**, com
   recorte próprio na aba (o navegador não arredonda o favicon) e sangrado no `apple-touch-icon`
   (o iOS aplica a própria máscara).
8. WHEN qualquer texto da loja é renderizado THEN a família SHALL ser **Libre Baskerville** (display)
   ou **Outfit** (corpo), e nenhuma fonte da identidade anterior SHALL ser requisitada — inclusive no
   `<link>` do Google Fonts.
9. WHEN o header, a navegação, o rodapé e a faixa de newsletter renderizam THEN SHALL seguir as
   boards `5MC-0` (desktop) e `6AU-0` (mobile), com **390px como alvo de desenho** e desktop como
   adaptação.
10. WHEN a loja é aberta em 390×844 THEN o `body` SHALL **não** rolar horizontalmente, nenhum alvo de
    toque SHALL ficar abaixo de 44px, e as regras de recolhimento do header e de barra única no
    rodapé SHALL continuar valendo.

**Independent Test**: abrir a loja em 390×844 e em 1440; rodar os testes de paleta, contraste e
borda de campo; conferir a aba do navegador e o atalho do iPhone.

---

### P3: O que é botton sai do produto ⭐ MVP

**User Story**: Como desenvolvedora entrando no repositório, quero não encontrar telas e tabelas de
um produto que não existe mais, para não gastar tempo entendendo código morto.

**Why P1/MVP**: `CustomPinPage` tem 769 linhas, o Mockup Studio ocupa 30 arquivos mais tabela e
bucket, e ambos são inintelegíveis no domínio de joia. Deixá-los é dívida nascida pronta.

**Acceptance Criteria**:

1. WHEN o Mockup Studio é removido THEN SHALL sair **inteiro**: rota `/admin/mockups` e seu item de
   navegação, `features/mockup-studio`, `entities/mockup`, `packages/core/src/mockup`, o tipo de
   mockup em `packages/supabase`, `features/mockup-preview` da loja, e a **tabela `mockup_templates`
   e o bucket** por migration versionada e idempotente.
2. WHEN a migration de remoção roda em um banco que nunca teve a tabela THEN SHALL completar sem
   erro; e WHEN roda em um banco que a tinha THEN os objetos do bucket SHALL sair junto, sem deixar
   arquivo órfão pagando storage.
3. WHEN o item `Mockups` sai da navegação do admin THEN a ordem textual das rotas em `app/App.tsx`
   SHALL continuar batendo com `navGroups`, porque `navItems.test.ts` lê o `App.tsx` do disco e
   compara.
4. WHEN a página de "monte seu kit" de pins é removida THEN a rota SHALL responder a 404 própria da
   loja, e nenhum link interno SHALL apontar para ela.
5. WHEN a ficha técnica de um produto é montada THEN SHALL sair do **cadastro** e nunca conter
   `Material: metal com acabamento premium`, `Fixação: alfinete com trava de segurança` ou
   `Arte exclusiva <marca>` — as três eram verdades de botton escritas à mão.
6. WHEN o seed de desenvolvimento roda THEN SHALL popular categorias e produtos de **joia afetiva**
   coerentes com as linhas reais (Uma Estrelinha/cinzas, Leite Materno, Dente de Leite, Pet,
   Maternidade, Masculina), e nenhuma string do domínio anterior SHALL sobreviver nele.
7. WHEN o seed roda em um banco recém-criado THEN SHALL completar até o fim, sem depender de tabela
   temporária que não exista — o `db reset` já quebrou por isso uma vez.

**Independent Test**: `/admin/mockups` responde 404; a varredura de marca e de vocabulário passa;
`supabase db reset` completa e a loja abre com produtos de joia.

---

### P4: A comunicação escrita é da Uma Estrelinha ⭐ MVP

**User Story**: Como cliente, quero que o e-mail de código de acesso e o de pedido falem da loja onde
eu comprei, para não achar que caí em golpe.

**Why P1/MVP**: E-mail com a marca errada é o ponto em que o rebrand vira problema de confiança —
e o de auth é o primeiro contato de toda cliente nova.

**Acceptance Criteria**:

1. WHEN a loja lê os defaults de `store_settings` THEN `store_name`, e-mail de contato e título de
   SEO SHALL ser da Uma Estrelinha, tanto nos defaults do TypeScript quanto no banco, e a migration
   SHALL ser condicionada ao valor antigo — idempotente e sem sobrescrever o que a admin editou.
2. WHEN uma migration nova é criada THEN o prefixo de timestamp SHALL ser maior que todos os
   existentes; a CLI chaveia a história pela **versão**, e um prefixo repetido faz a migration ser
   pulada **em silêncio**.
3. WHEN a aba do navegador, o compartilhamento em rede social ou o `theme-color` são lidos THEN os
   dois `index.html` SHALL descrever a Uma Estrelinha, e a `og:image` SHALL apontar para um ativo do
   projeto — nunca para o CDN herdado do template.
4. WHEN os três templates de auth (`magic_link`, `confirmation`, `recovery`) são renderizados THEN
   SHALL vestir a identidade nova mantendo as restrições de e-mail que já valem: tudo inline, layout
   em `<table>`, **sem webfont** (a pilha de fallback é a decisão de design, não um detalhe).
5. WHEN o remetente e o `sender_name` do auth são trocados no `config.toml` THEN o endereço SHALL ser
   **nu** (o nome vem de `sender_name`) e o domínio SHALL estar verificado no Resend **antes** da
   troca — remetente não verificado derruba **todo** login por código, e já derrubou uma vez.
6. WHEN o e-mail transacional é montado THEN o `RESEND_FROM` SHALL ser RFC 5322 (`Nome <addr>`) e
   SHALL permanecer **distinto** do remetente do auth: são dois streams, e confundi-los é a causa
   raiz do mesmo incidente.
7. WHEN a página Sobre é aberta THEN SHALL apresentar **Adri Muniz**, joalheira em Porto Alegre, no
   registro sensível do negócio — e nenhuma persona da loja anterior SHALL sobreviver na loja,
   inclusive no 404, nos estados vazios e na faixa de newsletter.
8. WHEN a cliente aciona o WhatsApp pela loja THEN a mensagem SHALL citar o nome da loja lido de
   `store_settings`, com fallback para `Uma Estrelinha`.

**Independent Test**: pedir código de acesso e conferir o e-mail no Mailpit; abrir Sobre, 404 e a
faixa de newsletter; compartilhar a home e conferir o card.

---

### P5: A documentação do repositório descreve o produto certo

**User Story**: Como desenvolvedora (ou agente) que abre este repositório, quero que as instruções
descrevam a Uma Estrelinha, para não implementar contra regras de outro produto.

**Why P2**: O repositório funciona sem isto, mas o `CLAUDE.md` herdado **proíbe ativamente** o que
esta feature faz (renomear `nanapin`) e descreve uma paleta que não existe mais. Deixá-lo é plantar
um erro para a próxima pessoa.

**Acceptance Criteria**:

1. WHEN o `CLAUDE.md` é lido THEN SHALL descrever a Uma Estrelinha, a paleta nova e o escopo
   `@estrelinha/*`, e a regra que proibia renomear `nanapin` SHALL ser substituída pelo registro de
   **por que** ela deixou de valer.
2. WHEN o `DESIGN.md` é lido THEN SHALL documentar a paleta medida, o papel de cada token e as
   proibições que os testes travam.
3. WHEN as specs, o `docs/qa/` e o `.lovable/` da Nanita são arquivados THEN SHALL ir para
   `.specs/archive/nanita/` preservados, e as decisões `AD-001`..`AD-015` SHALL **permanecer** no
   `STATE.md` — pagamento, e-mail, categorias e descontos não dependem do domínio de produto.
4. WHEN as baselines de qualidade são citadas THEN SHALL ser as medidas ao fim desta feature, não as
   herdadas.

**Independent Test**: ler o `CLAUDE.md` e não encontrar instrução que contradiga o estado do repo.

---

## Edge Cases

- WHEN o escopo npm é renomeado mas o `pnpm-lock.yaml` não é regerado THEN `pnpm install` SHALL
  falhar de forma visível — nunca resolver para um pacote fantasma.
- WHEN uma classe Tailwind antiga (`text-nanita-jam`) sobrevive em algum arquivo THEN SHALL não
  produzir estilo nenhum e a varredura SHALL pegá-la; o perigo é justamente **não** quebrar.
- WHEN um token novo é escrito certo em `App.css` e errado em `tailwind.config.ts` THEN o teste de
  paridade SHALL falhar nomeando o token e os dois valores.
- WHEN a varredura de marca é apontada para um caminho que não existe THEN SHALL falhar por âncora
  de contagem, nunca passar por ter varrido zero arquivo.
- WHEN a migration de remoção de mockups roda duas vezes THEN a segunda SHALL completar sem erro.
- WHEN os dois imports de CSS em `main.tsx` são invertidos THEN o teste de ordem SHALL falhar — a
  loja inteira voltaria à paleta do painel sem quebrar mais nada.
- WHEN o domínio de e-mail ainda não está verificado no Resend THEN a troca de remetente SHALL ficar
  **pendente e documentada**, e o ambiente local SHALL seguir capturando no Mailpit.

---

## Requirement Traceability

| ID | História | Fase | Status |
| --- | --- | --- | --- |
| INF-01 | P1 · `git init` + commit de baseline herdada | Design | Pending |
| INF-02 | P1 · Supabase local em 54341–54349, apps 8082/8083, inspector 8085 (AC 7) | Design | Pending |
| INF-03 | P1 · `.env` / `.env.example` dos dois apps e da raiz | Design | Pending |
| REN-01 | P1 · Escopo npm `@estrelinha/*` + lockfile regerado (AC 2) | Design | Pending |
| REN-02 | P1 · `project_id`, nome do monorepo, e-mail do admin de seed | Design | Pending |
| REN-03 | P1 · Chaves de `localStorage` / `sessionStorage` (AC 3) | Design | Pending |
| REN-04 | P1 · Tokens `--estrelinha-admin-*` no backoffice (AC 4) | Design | Pending |
| REN-05 | P1 · Varredura de marca com âncora de contagem (AC 1) | Design | Pending |
| IDN-01 | P2 · Paleta em dois arquivos + teste de paridade (AC 1) | Design | Pending |
| IDN-02 | P2 · Teste de contraste de texto ≥ 4,5:1 (AC 2) | Design | Pending |
| IDN-03 | P2 · Token de borda de campo ≥ 3:1 + varredura (AC 3) | Design | Pending |
| IDN-04 | P2 · Troca de chão: faixa, divisor e palco mudam junto (AC 4) | Design | Pending |
| IDN-05 | P2 · Marca SVG inline, escada de redução (AC 5) | Design | Pending |
| IDN-06 | P2 · `paths.ts` gerado do Paper + teste caractere a caractere (AC 6) | Design | Pending |
| IDN-07 | P2 · Favicon e `apple-touch-icon` do selo circular (AC 7) | Design | Pending |
| IDN-08 | P2 · Libre Baskerville + Outfit, sem fonte herdada (AC 8) | Design | Pending |
| IDN-09 | P2 · Chrome das boards `5MC-0` / `6AU-0`, mobile-first (AC 9) | Design | Pending |
| IDN-10 | P2 · Regressão mobile: sem scroll horizontal, alvo ≥ 44px, barra única (AC 10) | Design | Pending |
| IDN-11 | P2 · Ordem dos imports de CSS em `main.tsx` travada por teste | Design | Pending |
| PIN-01 | P3 · Remoção completa do Mockup Studio (AC 1) | Design | Pending |
| PIN-02 | P3 · Migration de remoção idempotente, bucket sem órfão (AC 2) | Design | Pending |
| PIN-03 | P3 · Ordem de rotas × `navGroups` preservada (AC 3) | Design | Pending |
| PIN-04 | P3 · Remoção da página de kit de pins (AC 4) | Design | Pending |
| PIN-05 | P3 · Ficha técnica sem verdades de botton (AC 5) | Design | Pending |
| PIN-06 | P3 · `seed.sql` de joia afetiva, `db reset` completo (AC 6, 7) | Design | Pending |
| PIN-07 | P3 · Destino das avaliações de demonstração | Design | Pending |
| COP-01 | P4 · `store_settings` defaults + migration condicionada (AC 1) | Design | Pending |
| COP-02 | P4 · Timestamp de migration maior que todos (AC 2) | Design | Pending |
| COP-03 | P4 · `index.html` dos dois apps: title, description, OG, theme-color (AC 3) | Design | Pending |
| COP-04 | P4 · Três templates de auth, inline e sem webfont (AC 4) | Design | Pending |
| COP-05 | P4 · Remetente do auth: endereço nu, domínio verificado antes (AC 5) | Design | Pending |
| COP-06 | P4 · `RESEND_FROM` RFC 5322 e distinto do auth (AC 6) | Design | Pending |
| COP-07 | P4 · Sobre, 404, estados vazios e newsletter (AC 7) | Design | Pending |
| COP-08 | P4 · WhatsApp lendo `store_name` com fallback (AC 8) | Design | Pending |
| DOC-01 | P5 · `CLAUDE.md` reescrito, com o porquê da regra revogada (AC 1) | Design | Pending |
| DOC-02 | P5 · `DESIGN.md` com a paleta medida e as proibições (AC 2) | Design | Pending |
| DOC-03 | P5 · Arquivo `.specs/archive/nanita/`, decisões preservadas (AC 3) | Design | Pending |
| DOC-04 | P5 · Baselines de lint, tipo e teste remedidas (AC 4) | Design | Pending |

**Cobertura:** 38 requisitos · 0 mapeados para tasks · **38 não mapeados** (a Design ainda não rodou).

---

## Success Criteria

- [ ] Varredura de marca retorna zero, com âncora de contagem provando que varreu.
- [ ] `npx tsc --noEmit` = **0** nos dois apps.
- [ ] `pnpm lint` ≤ **30 err / 9 warn** (baseline herdada, sem erro novo) — e o número final medido
      fica registrado no `CLAUDE.md`.
- [ ] `pnpm test` verde, e a suíte da loja **não encolhe**: os testes de identidade herdados (paleta,
      contraste, borda de campo, forma de botão, ordem de import, marca) são **reescritos** para a
      paleta nova, nunca apagados.
- [ ] `supabase start` sobe na faixa 5434x com as outras duas instâncias da máquina rodando.
- [ ] `supabase db reset` completa e a loja abre com o seed de joia afetiva.
- [ ] A loja atravessa uma compra de ponta a ponta em **390×844** com a identidade nova.
- [ ] Pedido de código de acesso chega no Mailpit vestido de Uma Estrelinha.
