# BUG-20261027-previa-do-google-ilegivel-com-fonte-200: com a fonte a 200 %, a prévia do Google mostra só "TESTE-…" e o selo passa da caixa

- **Status:** consertado — retestado (reteste 2 de 2026-10-27: título e descrição inteiros, selo numa palavra e dentro da caixa, de 360 a 1440 e de 100 % a 200 %; `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças (celular, fonte grande)
- **Journey Step:** J-publicar-peca-sem-escrever-seo, passo "Aba SEO: prévia"
- **Scenarios:** PNL-seo-fonte-grande-e-telas; PNL-seo-previa-e-o-servido
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-backoffice-seo-com-ia.md
- **Origin:** resto do defeito D1 de `.specs/features/84-seo-do-produto-com-ia/prova-navegador.md`

## Summary

O conserto de D1 tirou o selo "automático" de ao lado do título (ele não come mais a largura), mas o título
da prévia continua em **uma linha com reticências**: a 390/200 % ela lê "TESTE-…" (130 px de largura), a
360/200 % "TEST…" (100 px), e a descrição "Um pinge…". Ela não consegue conferir o que o Google vai mostrar,
que é o propósito da prévia (`SIA-05`). A 360/200 % o selo (154 px, fonte 24 px) passa ~21 px da borda da
caixa cinza da prévia.

## Reproduction

- **Charter:** CH-seo-fonte-grande-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 390×844 e 360×844, `html { font-size: 200% }`

1. Peça sem SEO → aba SEO, rolar até "Preview no Google".

**Expected:** título e descrição da prévia legíveis, embrulhando (o esperado de D1 na prova).
**Actual:** título truncado em 4–6 caracteres; selo fora da caixa a 360.

## Evidence

- evidence/2026-10-27-backoffice-seo-com-ia/390-200-previa-automatica.png
- evidence/2026-10-27-backoffice-seo-com-ia/360-200-previa-automatica.png
- A 100 % (390) o título também trunca em uma linha, legível; a 130 % trunca em 220 px.

## Conserto

- **O que mudou:** `apps/backoffice/src/features/product-form/ui/SeoPreview.tsx` — o título da prévia
  trocou `truncate` por `line-clamp-2 break-words` (até duas linhas); a descrição ganhou `break-words`;
  o selo "automático" ganhou `max-w-full break-words` (ele é item de uma coluna flex, então o teto de
  largura vale); a caixa da prévia ganhou `min-w-0`.
- **Teste que reprovou antes:** `apps/backoffice/src/features/product-form/ui/__tests__/SeoPreview.test.tsx` › "a prévia embrulha em vez de cortar (fonte
  grande)" (5 casos, token exato). jsdom não mede layout: a medida a 390/360 × 200 % é do reteste.
- **Mutantes reinjetados:** o `truncate` de volta no título (morto, 1); o selo sem `max-w-full
  break-words` (morto, 2); a caixa sem `min-w-0` (morto, 1). SHA-256 conferido.

## Fix

Ver *Conserto*.

## Regressed

Reteste de 2026-10-27: conserto parcial — ver *Verification*. Segundo conserto (decisão: opção 1 do relatório):
o título e a descrição da prévia ficaram sem `truncate`/`line-clamp`, com `break-words`; o selo "automático" é
`whitespace-nowrap` + `max-w-full`. Reteste 2: passa — ver *Verification*.

## Verification

**Reteste 2 — passou** (2026-10-27, navegador real contra o :8083 local, `*.supabase.co` e `**/g/collect*` bloqueados).
Bundle servido conferido: `SeoPreview.tsx` sem `line-clamp`, título e descrição com `break-words`, selo com
`max-w-full whitespace-nowrap`. Peça local sem SEO de nome longo (68 caracteres, "Joia afetiva Pipas coração com leite
materno coto umbilical e cabelo"), aba SEO, nada salvo. Medido por `getBoundingClientRect`, `scrollHeight`/`clientHeight`
e `innerText`:

| Viewport/fonte | Caixa | Título (largura, linhas, sH/cH) | Descrição (linhas, sH/cH) | Selo (largura, altura = 1 linha + padding, dentro?) | Rolagem do body / quem estoura |
|---|---|---|---|---|---|
| 360/200 % | 166 px | 100 px, 17 linhas, 681/680 | 20, 800/800 | 100 px, 40 px (lh 32), nowrap, dentro | 616 — `SlugField` (prefixo + input) e botões do topo; 0 elementos da prévia |
| 390/200 % | 196 px | 130 px, 14 linhas, 561/560 | 15, 600/600 | 130 px, 40 px, dentro | 616 — `SlugField`; 0 da prévia |
| 412/200 % | 218 px | 152 px, 11 linhas, 441/440 | 12, 480/480 | 152 px, 40 px, dentro | 616 — `SlugField`; 0 da prévia |
| 360/130 % | 233 px | 190 px, 5 linhas, 130/130 | 6, 156/156 | 100 px, 26 px (lh 20,8), dentro | 402 — `SlugField`; 0 da prévia |
| 390/130 % | 263 px | 220 px, 5 linhas, 130/130 | 5, 130/130 | 100 px, 26 px, dentro | 402 — `SlugField` (input); 0 da prévia |
| 412/130 % | 285 px | 242 px, 4 linhas, 104/104 | 5, 130/130 | 100 px, 26 px, dentro | nenhuma |
| 1440/100 % | 710 px | 676 px, 1 linha, 20/20 | 2, 40/40 | 77 px, 20 px (lh 16), dentro | nenhuma |

Em todos: `text-overflow: clip`, `-webkit-line-clamp: none`, e o `innerText` do título é o texto inteiro ("… e cabelo | Uma
Estrelinha"), o da descrição também ("… e mecha de cabelo."). O selo é uma palavra numa linha (altura = line-height +
`py-0.5`) e cabe na caixa nos 7 casos. Rolagem horizontal: nenhum elemento da prévia passa da viewport; o que estoura é o
`SlugField` (anterior à 84). Observações, não defeitos deste bug: a 200 % palavras longas partem no fim da linha
("umbilica / l", "Estrelinh / a") pelo `break-words` numa coluna de 100–150 px; a linha da URL da prévia continua com
`truncate` ("umaestreli…"), fora do escopo deste bug. Evidência:
evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/360-200-previa.png,
evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/390-200-previa.png,
evidence/2026-10-27-backoffice-seo-com-ia-reteste-2/390-130-previa.png.

**Reteste 1 — reaberto (parcial)** (2026-10-27, `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`). Peça sem SEO, prévia automática, `html { font-size }`:

| Viewport/fonte | Caixa | Título (largura, linhas) | Selos "automático" (folga esq./dir. na caixa) | Lido na tela |
|---|---|---|---|---|
| 360/200 % | 166 px | 100 px, 2 linhas, cortado | 33/33 px — dentro | "TESTE / -84-…" |
| 390/200 % | 196 px | 130 px, 2 linhas, cortado | 33/33 px — dentro | "TESTE- / 84-RT-…" |
| 360/130 % | 233 px | 190 px, 2 linhas, cortado | dentro | — |
| 390/130 % | 263 px | 220 px, 2 linhas, cortado | dentro | "TESTE-84-RT- / Pingente Coração co…" |
| 390/100 % | 292 px | 258 px, 2 linhas, cortado | dentro | — |
| 1440/100 % | 710 px | 676 px, 1 linha, inteiro | dentro | — |

O que passou: o selo não sai mais da caixa a 360/200 % (antes ~21 px fora). O que não passou: a 200 % o título mostra
~10–12 caracteres em duas linhas (antes 4–6) e a descrição "Um / pingente…" — ela ainda não consegue conferir o que o Google
vai mostrar, que é o esperado deste bug ("legíveis, embrulhando"). O gargalo é a largura da caixa (166–196 px), não o
`truncate`. Novo detalhe visual: a 200 % o selo quebra no meio da palavra ("automáti / co") por causa do `break-words`.
Evidência: evidence/2026-10-27-backoffice-seo-com-ia-reteste/390-200-previa.png, evidence/2026-10-27-backoffice-seo-com-ia-reteste/360-200-previa.png, evidence/2026-10-27-backoffice-seo-com-ia-reteste/390-130-previa.png.
Decisão para um humano: (1) deixar o título da prévia sem `line-clamp` a partir de uma fonte grande (embrulha inteiro, a
prévia cresce); (2) aceitar duas linhas; (3) tirar recuo/padding da caixa no celular para ganhar largura.
