# Performance da loja no celular — Context

**Gathered:** 2026-09-05
**Spec:** `.specs/features/38-performance-mobile/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Reduzir o tempo de abertura e o peso em KB da **loja pública** no celular, sem mudar nada do que a
cliente vê. Três frentes: pedir a foto no tamanho da vaga, baixar só o código da tela aberta, e
trazer da consulta só o que o card desenha. Fora da fronteira: Framer Motion, paginação no servidor,
busca no servidor, cache de borda da página do produto, e o backoffice.

---

## Implementation Decisions

### Como servir a foto em tamanho de exibição

- **Endpoint `render/image` do Supabase**, gerado sob demanda a partir do objeto que já está no
  Storage. Nada é pré-gerado e nada muda no que está gravado.
- **O custo recorrente é conhecido e aceito**: US$ 5 por 1.000 imagens de origem por mês, 100
  inclusas no plano Pro. Com 3.618 imagens no catálogo, o teto é ~US$ 20 no primeiro mês.
- A razão de não pré-gerar: **rendição faltando vira imagem quebrada**. Uma foto enviada antes desta
  feature, ou um upload que falhou no meio, produziria um `srcset` apontando para um objeto que não
  existe — e o navegador não tem fallback silencioso para isso. O endpoint sob demanda não tem esse
  estado.
- A razão de não reduzir o original: a lupa da galeria é o único lugar da loja onde 1024 px é o
  tamanho certo, e é justamente onde a peça é examinada antes da compra.
- **Consequência que vira requisito**: o cache de um ano (`PRF-05`) deixa de ser "higiene" e passa a
  ser o que segura a conta — cada batida servida pelo CDN é uma transformação que não é cobrada.

### Até onde levar a correção da consulta

- **Select enxuto, e só.** Filtro, ordenação e a janela de rolagem infinita continuam no cliente,
  exatamente como a feature `32` os deixou.
- A razão: levar filtro e ordenação para o servidor reescreveria os 14 requisitos `LST-*` — incluindo
  a contagem do cabeçalho, que hoje descreve a coleção filtrada inteira, e a reancoragem por valor de
  `LST-04`. O ganho marginal não paga esse risco enquanto a maior categoria tem 505 produtos.
- **A decisão foi adiada com endereço**: vira `BL-024`, com o número medido (307 KB → ~8 KB por
  leva), para o dia em que o catálogo crescer.
- Junto vai um **teto explícito** nas consultas de listagem: o corte de 1.000 linhas do PostgREST
  hoje é um limite herdado que ninguém declarou, e ele morde em silêncio.

### Escopo das fases

- **Fase 1** (fotos e dicas ao navegador) e **Fase 2** (bundle e consultas) entram inteiras.
- **As fontes próprias entram** — é mecânico, testável, e tira uma origem de terceiro do caminho
  crítico.
- **O Framer Motion fica fora.** 42 KB gzip em 11 arquivos de interface, com regressão que só
  aparece em navegador real. Vira `BL-023`, com o número medido, para uma feature que possa pagar o
  QA visual.

### Agent's Discretion

- Nome e assinatura exata do helper de URL, e como as três larguras são declaradas.
- Forma do guarda de dono único (`PRF-15`) e do guarda de carregamento sob demanda (`PRF-16`),
  desde que os dois carreguem âncora de contagem, como todos os guardas do repositório.
- Estratégia de `manualChunks` no `vite.config.ts`.
- Como o passe de `cacheControl` é entregue (script em `tools/`, comando do importador, ou
  subcomando novo).
- Onde a função de prioridade do LCP mora e como as superfícies de listagem a consomem.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi declinada. Tudo que não foi perguntado está na tabela de assunções da spec com o
padrão escolhido e a razão — larguras do `srcset`, qualidade 75, ausência de fallback de rendição,
casa do helper em `core/media`, tratamento de imagem de host externo, e o passe sobre os objetos
existentes.

---

## Specific References

- **A auditoria que abriu a feature** é a medição de 2026-09-05: build local, `curl` contra o deploy
  provisório e contra a REST do projeto hospedado, e duas rodadas de Lighthouse em perfil móvel
  fornecidas pelo usuário (home e `/joias-e-acessorios/colar-e-correntes`).
- **A régua de "dois donos" é a do `CLAUDE.md`** ("defeito 01"), e o molde do guarda novo é
  `freeShippingSingleOwner.test.ts` da feature `37`: allowlist curta, âncora dupla e sensor embutido.
- **O molde do guarda de rota** é `reservedSlugs.test.ts`, que já lê o `App.tsx` do disco e é
  bidirecional.
- **A prova de fecho é medida, não afirmada**, pela mesma regra de `AD-021`: o número que fecha esta
  feature é um Lighthouse em aba anônima, e não a impressão de que ficou mais rápido.

---

## Deferred Ideas

| Ideia | Vira |
| --- | --- |
| Retirar o Framer Motion do chunk inicial (−42 KB gzip, 11 arquivos) | `BL-023` |
| Paginação, filtro e ordenação no servidor (307 KB → ~8 KB por leva) | `BL-024` |
| Busca no servidor, que também fecha o teto de 1.000 linhas do PostgREST | `BL-025` |
| Cache de borda da página do produto (TTFB de ~1 s) | `BL-017`, já aberto |
