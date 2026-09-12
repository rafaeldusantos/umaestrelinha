# 45 — Tasks

**Commits**: um só, ao fim (`BL-012` / `CLAUDE.md`). Nada de commit por task.
**Gate por task**: o workspace tocado roda sozinho, com exit code capturado **fora de pipe**.

---

## T1 — `01-trilha-em-shared` (`POL-21`)

Mover `Trilha` de `pages/AboutPage.tsx` para `shared/ui/Trilha.tsx`, com a página atual por prop.
`AboutPage` passa a consumi-la.

**Done when**
- `shared/ui/Trilha.tsx` exporta `Trilha({ paginaAtual })`, com `aria-label="Trilha de navegação"`,
  o link `Início` para `/` e `aria-current="page"` no rótulo final.
- `AboutPage.tsx` não declara mais a trilha e renderiza `<Trilha paginaAtual="Sobre" />`.
- `AboutPage.test.tsx` passa **sem edição** — é a prova de que o movimento não mudou o DOM.

## T2 — `02-invólucro-do-documento` (`POL-20`, `POL-22`)

`shared/ui/PolicyDocument.tsx`: `PolicyDocument`, `PolicySection`, `PolicyList`, `PolicyNote`.

**Done when**
- Coluna de leitura de 720px no desktop, 20px de respiro lateral no mobile, sem `prose`.
- Corpo 17/28 → 19/34 em `ink-soft`; títulos de seção em `font-display`/`ink`.
- `PolicyNote` usa ouro como **traço**, nunca como texto.
- `PolicyDocument.test.tsx` cobre: título vira `<h1>`, seção vira `<h2>` com `id` derivado do título,
  lista vira `<ul><li>`, e a trilha aparece com a página atual recebida.

## T3 — `03-endereços-reservados` (`POL-02`, `POL-03`)

`packages/core/src/routes/routes.ts`: `politicas-de-trocas-e-devolucoes` e `politica-de-privacidade`
em `ROUTE_SLUGS`; os dois caminhos em `SITEMAP_STATIC_PATHS`.

**Done when**
- `routes.test.ts` (core) atualizado nas três âncoras de contagem: `ROUTE_SLUGS` 17, `RESERVED_SLUGS`
  20, `SITEMAP_STATIC_PATHS` 6 — e um caso novo por caminho, nomeando-o.
- `pnpm --filter @estrelinha/core test` verde.

> Esta task sozinha deixa `reservedSlugs.test.ts` **reprovando** (entrada sem rota), e isso é
> esperado: a T4 e a T5 fecham a bidirecionalidade. O gate desta task é o workspace `core`.

## T4 — `04-política-de-trocas` (`POL-01`, `POL-04`..`POL-09`)

`pages/ReturnsPolicyPage.tsx` + rota `lazy` em `App.tsx`.

**Done when**
- As dez seções de `POL-05` saem na ordem da tabela, com o texto da dona.
- "Lei nº 8.078/1990" e "artigo 49" com os "7 dias" aparecem literalmente (`L-009`: a frase inteira,
  não o fragmento).
- `PolicyNote` carrega "Não envie a peça sem antes entrar em contato conosco".
- O bloco de contato lê `useGeneralSettings`: WhatsApp só com ≥10 dígitos; e-mail sempre.
- `ReturnsPolicyPage.test.tsx`: uma asserção por seção, o portão do WhatsApp nos **dois** estados,
  o `href` do `wa.me` com os dígitos limpos, e a ausência de emoji.

## T5 — `05-política-de-privacidade` (`POL-01`, `POL-04`, `POL-10`..`POL-14`)

`pages/PrivacyPolicyPage.tsx` + rota `lazy` em `App.tsx`.

**Done when**
- O texto do site em produção está preservado parágrafo a parágrafo.
- LGPD (Lei nº 13.709/2018) e os seis direitos aparecem, cada um como item de lista (`L-010`: um item
  de verificação por elemento).
- O compartilhamento nomeia pagamento, entrega e e-mail — e nada além.
- O parágrafo do material afetivo existe e nomeia cinzas, leite materno e cabelo.
- A frase do consentimento do checkout é citada **literal**.
- `PrivacyPolicyPage.test.tsx` com uma asserção por elemento acima.

## T6 — `06-políticas-vira-índice` (`POL-15`, `POL-16`)

`PoliciesPage.tsx` perde o texto de trocas e o de privacidade e ganha os dois links.

**Done when**
- Envio e Pagamento continuam lendo settings, e os quatro casos de `copyInstitucional.test.tsx` que
  medem Pix e frete grátis continuam passando **sem afrouxar** — só mudam de objeto quando o objeto
  deixou de existir.
- O describe "Políticas" do `copyInstitucional.test.tsx` passa a asserir o índice: as duas seções
  que ficaram, os dois links com `href` exato, e a **ausência** da promessa antiga.
- Nenhum `id` novo: as âncoras não voltam.

## T7 — `07-rodapé-sem-âncora-morta` (`POL-17`, `POL-18`)

**Done when**
- "Trocas e devoluções" → `/politicas-de-trocas-e-devolucoes`; "Política de privacidade" →
  `/politica-de-privacidade`; "Políticas" continua em `/politicas`.
- "Termos de uso" sai.
- `Footer.test.tsx` ganha o caso dos três `href` e o da ausência de `/politicas#`.

## T8 — `08-guarda-do-dono-único` (`POL-19`)

`pages/__tests__/politicaComDonoUnico.test.ts`, mais as âncoras de contagem dos guardas existentes.

**Done when**
- As três réguas de `design.md` §5 estão escritas, cada uma com sensor por mutação.
- Âncora dupla: arquivos lidos **e** títulos encontrados.
- CRLF normalizado antes da remoção de comentário (`L-031`).
- `routeSplitting.test.ts` 14 → 16, `sitemapRoutes.test.ts` 19 → 21,
  `supabase/functions/sitemap/__tests__/handlers.test.ts` 8 → 10.
- Os cinco workspaces medidos **um por vez**, exit code fora de pipe; baselines atualizadas no
  `CLAUDE.md` da raiz e no `apps/store/CLAUDE.md`.

---

## Verificação final (sempre, autor ≠ verificador)

`validation.md` com: evidência por AC, sensor de discriminação (mutação real nos arquivos reais,
revertida), faixa de diff, e a lista do que **não** foi provado — a prova em navegador em 390×844 e
1440 entra nessa lista, porque jsdom devolve 0 para toda medida de layout.
