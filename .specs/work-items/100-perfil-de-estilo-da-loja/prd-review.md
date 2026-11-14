# PRD Tech Review — Registro

**Work Item**: 100 — Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel
**PRD**: `prd.md` · origem: escrito na sessão de 2026-11-13

---

## Rodada r1

**Data**: 2026-11-14 · **PRD revisado**: versão 1 · **Gate**: inline a pedido — o usuário mandou decidir os gates na
sessão pelas recomendações ("não espere resposta do humano"), em 2026-11-14.

### Envelope `prd-review/v1` (resumo dos findings; corpo completo com `caminho:linha` no parecer do subagente)

```json
{
  "schema": "prd-review/v1", "work_item_ref": "100", "round": 1, "prd_version": 1,
  "reviewed_at": "2026-11-14T10:00:00-03:00", "skill": "wi-workflow/prd-tech-review", "skill_version": "4.0.0",
  "summary": { "verdict": "changes_requested_blocking", "blocking": 1, "gaps": 4, "questions": 2, "tech_decisions": 9 },
  "findings": [
    {"id":"F01","key":"tetos-de-nunca-texto-reprovam-o-bf","category":"blocking","owner":"tech_prd_edit","severity":"high","title":"Com os valores do protótipo, os tetos de 'nunca texto' de contrast.test.ts:107-124 reprovam (accent-strong/ink 4,55; primary-strong/accent 7,91)"},
    {"id":"F02","key":"html-em-cache-e-aplicacao-no-navegador","category":"gap","owner":"tech_prd_edit","severity":"high","title":"Aplicar pela configuração do navegador sobre HTML em cache troca a cor diante da cliente (molde: useAnnouncementBar.ts:1-14)"},
    {"id":"F03","key":"loja-aberta-ve-em-minutos","category":"gap","owner":"tech_prd_edit","severity":"low","title":"staleTime de 5 min em useStoreSettings.ts:81-87"},
    {"id":"F04","key":"componentes-que-trocam-de-papel-no-prototipo","category":"question","owner":"negocio","severity":"medium","title":"bf.css troca selo de desconto, chip de desconto e barra do frete grátis para ouro"},
    {"id":"F05","key":"marca-desenhada-na-pagina","category":"question","owner":"negocio","severity":"medium","title":"BrandSvg.tsx:17-25 com cor fixa ardósia"},
    {"id":"F06","key":"tokens-que-nao-mudam","category":"gap","owner":"negocio","severity":"low","title":"Tokens fora da tabela (serenity, on-primary, wait/alert/done, whatsapp)"},
    {"id":"F07","key":"formato-da-variavel-quebra-consumidores-diretos","category":"gap","owner":"tech","severity":"high","title":"Variável em canais quebra App.css, ICON_ACCENT, GuideHeroArt e o Brick do cartão"},
    {"id":"F08","key":"camada-hsl-do-shadcn","category":"gap","owner":"tech","severity":"medium","title":"App.css:173-215, a camada HSL do shadcn"},
    {"id":"F09","key":"sombras-literais","category":"gap","owner":"tech","severity":"low","title":"ESTRELINHA_SHADOW rgba literal, .glow-*, InstagramInviteSheet, CookieNotice"},
    {"id":"F10","key":"leitor-da-paleta-com-dois-blocos","category":"gap","owner":"tech","severity":"medium","title":"paletteFromSource.ts:64 grava o último valor de cada token"},
    {"id":"F11","key":"dono-unico-e-css-gerado","category":"improvement","owner":"tech","severity":"medium","title":"Variáveis geradas do dono pelo plugin do Tailwind"},
    {"id":"F12","key":"mecanismo-do-html-ja-existe","category":"overlap","owner":"tech","severity":"medium","title":"data-faixa do WI 101 já marca o <html> (serve.ts:214-262, head.ts:95-116)"},
    {"id":"F13","key":"sem-migration","category":"improvement","owner":"tech","severity":"low","title":"Chave sem migration; DEFAULTS de useStoreSettings"},
    {"id":"F14","key":"previa-quarto-palco","category":"gap","owner":"tech","severity":"medium","title":"Prévia é um palco novo + canal style-profile; previaUnica.test.ts:390-410"},
    {"id":"F15","key":"configuracoes-tem-cinco-secoes","category":"naming","owner":"tech","severity":"low","title":"Configurações tem 5 seções"},
    {"id":"F16","key":"prova-do-primeiro-html-precisa-da-funcao","category":"improvement","owner":"none","severity":"low","title":"CA-02 só se mede com api/page servida"}
  ]
}
```

### Respostas (decididas na sessão pela recomendação)

| key | owner final | resposta | estado |
| --- | --- | --- | --- |
| tetos-de-nunca-texto-reprovam-o-bf | tech_prd_edit | sugestão; no Padrão os tetos continuam valendo como hoje, no Black Friday a regra é guardada pelo uso (accentText) | aplicado (RN-03 + Decisões) |
| html-em-cache-e-aplicacao-no-navegador | tech_prd_edit | sugestão (regra de carga da faixa) | aplicado (RN-04 + Decisões) |
| loja-aberta-ve-em-minutos | tech_prd_edit | sugestão | aplicado (UC-01) |
| componentes-que-trocam-de-papel-no-prototipo | negocio | segue o protótipo: o selo "-X%", o chip de desconto e a barra do frete grátis ficam ouro com texto escuro no Black Friday | aplicado (RN-01) |
| marca-desenhada-na-pagina | negocio | acompanha o perfil, no tom escuro do perfil | aplicado (RN-06) |
| tokens-que-nao-mudam | negocio | sugestão | aplicado (abaixo da tabela) |
| formato-da-variavel-quebra-consumidores-diretos | tech | hex + `-rgb` ao lado | aplicado (Decisões) |
| camada-hsl-do-shadcn | tech | redefinida por perfil, gerada do dono, com guarda | aplicado (Decisões) |
| sombras-literais | tech | sombra da loja por variável; ateliê segue no objeto | aplicado (Decisões) |
| leitor-da-paleta-com-dois-blocos | tech | leitor por perfil com recorte de bloco | aplicado (Decisões) |
| dono-unico-e-css-gerado | tech | variáveis geradas do dono no build | aplicado (Decisões) |
| mecanismo-do-html-ja-existe | tech | reusar o caminho da faixa | aplicado (Decisões) |
| sem-migration | tech | sem migration; DEFAULTS | aplicado (Decisões) |
| previa-quarto-palco | tech | palco novo + canal `style-profile` | aplicado (Decisões) |
| configuracoes-tem-cinco-secoes | tech | 5 seções | aplicado (Decisões) |
| prova-do-primeiro-html-precisa-da-funcao | none | — | sem item |

### Leitura humana

O PRD estava ancorado e o caminho do `<html>` já existe desde o WI 101. O bloqueio era dos tetos de "nunca texto"
contra os valores do protótipo: a regra virou "pisos medidos em cada perfil, uso do ouro guardado pelo uso". As
decisões técnicas seguem as sugestões do parecer e vão à seção Decisões do `spec.md`.
