# 45 — Design

## 1. Por que duas páginas, e não âncoras em `/politicas`

A alternativa barata era dar `id` às quatro seções que já existem e deixar o rodapé funcionar. Ela foi
descartada por três razões, na ordem em que pesam:

1. **O endereço já existe, e não é nosso.** `umaestrelinha.com.br` publica
   `/politicas-de-trocas-e-devolucoes/` e `/politica-de-privacidade/` desde 2025 e as duas estão no
   `sitemap.xml` dele. Servir o mesmo conteúdo num fragmento (`/politicas#trocas`) descarta o sinal
   que o tráfego orgânico construiu — é exatamente o que `AD-018` decidiu não fazer com produto e
   categoria.
2. **Quem cobra a política cobra uma URL.** O Google Merchant Center pede a URL da política de
   devolução; o meio de pagamento e o próprio CDC pedem uma página localizável. Fragmento não é
   endereço: `#trocas` nunca chega ao servidor.
3. **O texto é grande.** A política de trocas tem dez seções. Empilhá-la dentro de uma página que
   também fala de Envio e Pagamento faz a leitora rolar por três assuntos até achar o dela — no
   celular, que é ~90% dos acessos.

**Os slugs são literais do site em produção**, plural e singular inclusive. A tentação de
"padronizar" os dois é uma mudança de endereço disfarçada de arrumação.

## 2. O mapa da mudança

```
apps/store/src/
  app/App.tsx                          + 2 lazy + 2 <Route>
  pages/
    ReturnsPolicyPage.tsx              NOVO   POL-05..POL-09
    PrivacyPolicyPage.tsx              NOVO   POL-10..POL-14
    PoliciesPage.tsx                   VIRA ÍNDICE  POL-15, POL-16
    __tests__/
      ReturnsPolicyPage.test.tsx       NOVO
      PrivacyPolicyPage.test.tsx       NOVO
      politicaComDonoUnico.test.ts     NOVO   POL-19
      copyInstitucional.test.tsx       o describe de Políticas muda de objeto
  shared/ui/
    PolicyDocument.tsx                 NOVO   POL-20
    Trilha.tsx                         MOVIDO de AboutPage  POL-21
  widgets/footer/ui/Footer.tsx         POL-17, POL-18
packages/core/src/routes/routes.ts     + 2 em ROUTE_SLUGS, + 2 em SITEMAP_STATIC_PATHS
```

Guardas existentes que **mudam de número por construção** (nenhum muda de régua):

| Arquivo | O que muda | Por quê |
| --- | --- | --- |
| `core/routes/__tests__/routes.test.ts` | `ROUTE_SLUGS` 15 → 17 · `RESERVED_SLUGS` 18 → 20 · `SITEMAP_STATIC_PATHS` 4 → 6 | são âncoras de contagem |
| `store/app/__tests__/sitemapRoutes.test.ts` | rotas declaradas 19 → 21 | idem |
| `store/app/__tests__/routeSplitting.test.ts` | páginas preguiçosas 14 → 16 | idem |
| `functions/sitemap/__tests__/handlers.test.ts` | `<loc>` 8 → 10 | 6 institucionais + 2 categorias + 2 produtos |

`reservedSlugs.test.ts` **não muda**: ele deriva as duas listas do disco e compara. É o formato certo,
e serve de contraprova — se ele passar sem edição, as duas pontas de `POL-02` concordam de verdade.

## 3. Onde o conteúdo mora — e por que NÃO em `entities/`

A feature `44` mudou o conteúdo do guia de material de `widgets/` para `entities/material/model/`
(`AD-033`), e a pergunta se repete aqui. A resposta é diferente **porque a contagem de consumidores é
diferente**: cada política tem **um** leitor, a própria página. Conteúdo com um consumidor só, posto
numa camada compartilhada, é abstração antes da hora — a mesma razão pela qual `Trilha` ficou dentro
de `AboutPage` até hoje.

O que sobe para `shared/ui` é o **invólucro**, que tem três consumidores (as duas políticas e, pela
trilha, a Sobre). Conteúdo em JSX na página; escala tipográfica, medida de leitura e espaçamento no
invólucro.

## 4. `PolicyDocument` — o invólucro

```tsx
<PolicyDocument
  titulo="Política de Trocas, Devoluções e Arrependimento"
  paginaAtual="Trocas e devoluções"
  abertura={<>…</>}
>
  <PolicySection titulo="…">…</PolicySection>
  <PolicyList itens={[…]} />
  <PolicyNote>…</PolicyNote>     {/* POL-08 */}
</PolicyDocument>
```

- **Faixa de largura cheia com coluna de leitura de 720px**, o mesmo número da faixa "A história" da
  Sobre (`SOB-02`): a medida de leitura desta loja já foi decidida uma vez.
- **Sem `prose`.** O preset tem `@tailwindcss/typography`, e o plugin traz a própria paleta
  (`--tw-prose-*`), que `contrast.test.ts` não mede. Seletor de filho explícito mantém toda cor em
  token auditável — regra do `apps/store/CLAUDE.md`.
- **Escala do corpo idêntica à da Sobre**: 17/28 no mobile, 19/34 no desktop, em `ink-soft` (6,00:1,
  o piso). Títulos de seção em `font-display`/`ink`.
- `PolicyNote` é `ground-deep` com fio `accent` à esquerda — **ouro como traço, nunca como texto**
  (2,66:1 sobre claro).

## 5. O guarda `politicaComDonoUnico.test.ts`

Três réguas, cada uma com sensor por mutação:

| Régua | O que ela lê | O mutante que ela mata |
| --- | --- | --- |
| 1 — o índice não tem prosa de política | `PoliciesPage.tsx` | colar de volta o parágrafo "Faremos a troca sem custo adicional" |
| 2 — cada título de seção tem um declarante | todos os `.tsx` de `pages/` | duplicar "O que não é considerado defeito de fabricação?" numa segunda página |
| 3 — não existe link para `/politicas#` | todos os `.tsx` de `apps/store/src/**` | o rodapé voltar a apontar para a âncora morta |

**Âncora dupla** (`L-021`): prova que leu arquivos **e** que a régua encontra os títulos que deveria
encontrar. Sem a segunda metade, um regex quebrado varre tudo e não acha nada — e passa.

A remoção de comentário normaliza **CRLF antes** (`L-031`): num checkout Windows o stripper de linha
fica inerte e o guarda acusa a própria prosa que explica o defeito.

## 6. O risco do `vi.mock` total (`L-030`)

`copyInstitucional.test.tsx` substitui `@estrelinha/core/hooks/useStoreSettings` **inteiro**, sem
`importOriginal`. Ele já monta `PoliciesPage`; vai passar a montar as duas páginas novas, que leem
`useGeneralSettings`. Esse hook **já está no mock** (a feature `29` o acrescentou pela Sobre) — mas a
verificação é olhar o arquivo, não supor. O mesmo vale para `useFreeShipping`, que `PoliciesPage`
consome de outro módulo (`@estrelinha/core/hooks/useFreeShipping`) e que o arquivo mocka à parte.

## 7. O que este design NÃO faz

- **Não cria `NON_INDEXABLE_PATHS` novo.** As duas páginas são indexáveis; entram em
  `SITEMAP_STATIC_PATHS`.
- **Não toca `vercel.json`.** Sem legado, sem redirect. `vercelRedirects.test.ts` passa sem edição, e
  isso é resultado, não sorte.
- **Não mexe em `packages/core/src/payment/**`.** Conferido por `git diff --name-only` no gate.
