# PRD Tech Review — WI 101 · Faixa de avisos

## Rodada r1

### Envelope

```json
{
  "schema": "prd-review/v1", "work_item_ref": "101", "round": 1, "prd_version": 1,
  "reviewed_at": "2026-11-13T10:33:00-03:00", "skill": "wi-workflow/prd-tech-review", "skill_version": "4.0.0",
  "summary": { "verdict": "changes_requested_blocking", "blocking": 1, "gaps": 4, "questions": 0, "tech_decisions": 6 },
  "findings": [
    { "id": "F1", "key": "home-nao-passa-pela-funcao-api-page", "category": "blocking", "owner": "tech_prd_edit", "severity": "critical",
      "title": "A Home não passa pelo api/page e as páginas fixas não leem store_settings: a reserva de RN-02 não chega onde o CA-06 mede",
      "evidencia": "packages/core/src/page/classify.ts:3,54; apps/store/server/page.ts:166-180 (só produto, chaves google_shopping/seo); packages/core/src/page/serve.ts:116-121,181,195,309; packages/core/src/hooks/useStoreSettings.ts:76-82" },
    { "id": "F2", "key": "atraso-entre-ligar-e-aparecer", "category": "gap", "owner": "negocio", "severity": "high",
      "title": "Quanto tempo entre ligar/desligar e a faixa valer em todas as páginas (cache 300 s / 3600 s)" },
    { "id": "F3", "key": "altura-unica-da-faixa", "category": "gap", "owner": "tech_prd_edit", "severity": "high",
      "title": "Altura que varia por aviso quebra a reserva única; falta teto de caracteres" },
    { "id": "F4", "key": "arte-entre-768-e-1440", "category": "gap", "owner": "tech_prd_edit", "severity": "medium",
      "title": "Artes 30:1 e 8:1 não seguem a proporção do Banner; corte entre 768 e 1440",
      "evidencia": "packages/core/src/home/carousel.ts:39-42; packages/core/src/media/rendition.ts:46,93" },
    { "id": "F5", "key": "giro-diferente-do-hook-do-banner", "category": "gap", "owner": "tech_prd_edit", "severity": "medium",
      "title": "5 s e pausa permanente contradizem useHeroCarousel (6 s, pausa enquanto há toque, arrasto)",
      "evidencia": "packages/core/src/home/carousel.ts:63; apps/store/src/widgets/hero-carousel/model/useHeroCarousel.ts:170-173; HeroCarousel.tsx:148" },
    { "id": "F6", "key": "previa-e-a-loja-num-iframe", "category": "improvement", "owner": "tech", "severity": "high",
      "title": "Prévia do painel = a loja num iframe com rascunho (previaUnica)" },
    { "id": "F7", "key": "cta-href-refusal-aceita-barra-dupla", "category": "improvement", "owner": "tech", "severity": "medium",
      "title": "ctaHrefRefusal aceita //externo (packages/core/src/home/refusals.ts:134-159)" },
    { "id": "F8", "key": "store-settings-sem-migration-nem-check", "category": "improvement", "owner": "tech", "severity": "medium",
      "title": "Chave nova em store_settings sem migration nem check; DEFAULTS de fetchAllSettings e readSettings precisam aprender a chave" },
    { "id": "F9", "key": "extrair-hook-para-camada-abaixo", "category": "improvement", "owner": "tech", "severity": "low",
      "title": "Mover useHeroCarousel para shared/lib (AD-033)" },
    { "id": "F10", "key": "foco-e-setas-sobre-o-ouro", "category": "improvement", "owner": "tech", "severity": "low",
      "title": "Anel de foco e setas de 44 px sobre o ouro" },
    { "id": "F11", "key": "lista-de-guardas-do-plano", "category": "naming", "owner": "tech", "severity": "low",
      "title": "A lista de guardas do plano aponta guardas da loja para rota do painel" },
    { "id": "F12", "key": "dependencia-do-wi-100", "category": "overlap", "owner": "none", "severity": "info",
      "title": "O canal e os dois perfis do WI 100 ainda não existem; quem chegar primeiro constrói o atributo no <html>" }
  ]
}
```

### Respostas (gate respondido inline a pedido do usuário, pela recomendação do parecer)

O usuário pediu, em 2026-11-13: "quero que você analise e use suas melhores recomendações. Se tiver dúvidas use um
outro agente para discutir a solução. Faça isso para todas as paradas com perguntas". A página foi aberta e fechada sem
resposta; cada item foi decidido pela primeira sugestão (a recomendação). Nenhum ficou em dúvida real.

| key | escolha | owner final | estado |
| --- | --- | --- | --- |
| home-nao-passa-pela-funcao-api-page | Home pela função `api/page`; toda resposta HTML grava o atributo no `<html>`; o atributo manda na existência da faixa | tech_prd_edit | aplicado |
| atraso-entre-ligar-e-aparecer | aceitar até 1 h (5 min em produto/categoria), avisado no painel; CA-08 novo | negocio | aplicado |
| altura-unica-da-faixa | altura fixa por dispositivo (celular: duas linhas; computador: 48 px), teto de caracteres medido | tech_prd_edit | aplicado |
| arte-entre-768-e-1440 | arte inteira, contida e centralizada sobre o ouro | tech_prd_edit | aplicado |
| giro-diferente-do-hook-do-banner | 6 s, pausa enquanto há ponteiro/foco/dedo; movimento reduzido no celular = só o primeiro, sem arrasto | tech_prd_edit | aplicado |
| previa-e-a-loja-num-iframe | loja num iframe 390/1024 com canal de rascunho no molde de `useMenuPreview`; `previaUnica` ampliado | tech | aplicado (Decisões) |
| cta-href-refusal-aceita-barra-dupla | consertar no dono, dentro deste WI | tech | aplicado (Decisões) |
| store-settings-sem-migration-nem-check | sem migration; default desligado no TS; tetos e recusa em `core/announcements` | tech | aplicado (Decisões) |
| extrair-hook-para-camada-abaixo | mover para `apps/store/src/shared/lib`, intervalo por parâmetro; guarda de opacidade zero novo | tech | aplicado (Decisões) |
| foco-e-setas-sobre-o-ouro | anel `ink`, link em `ink` sólido, setas sem `TAP_44`+`absolute` | tech | aplicado (Decisões) |
| lista-de-guardas-do-plano | trocar a lista de guardas na spec | tech | aplicado (Decisões) |
| dependencia-do-wi-100 | — | none | sem item |

### Aplicado no `prd.md`

- **atraso-entre-ligar-e-aparecer** — antes: "3. **Liga e desliga no painel**, sem deploy." · depois: "… sem deploy. Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas (até 5 minutos em produto e categoria), e o painel avisa isso ao lado do interruptor." · e CA-08 acrescentado.
- **altura-unica-da-faixa** — antes: "Altura de 40 px no texto (pode embrulhar em duas linhas no celular) e 48 px na imagem no computador." · depois: "Altura fixa, a mesma para todos os avisos: no celular, a de duas linhas de texto; no computador, 48 px. O texto de um aviso cabe em até duas linhas no celular (o painel recusa o que passar disso)."
- **giro-diferente-do-hook-do-banner** — UC-01: "troca a cada 5 s …" / "depois de qualquer toque na faixa" → "troca a cada 6 s (o mesmo ritmo do Banner principal) …" / "enquanto o dedo está na faixa"; CA-02 → "Troca a cada 6 s; para com o ponteiro, com o foco e enquanto há um toque; com movimento reduzido não gira."
- **arte-entre-768-e-1440** — UC-02, primeiro item → "A dona envia duas artes (computador 1440 × 48 e celular 780 × 96), o texto alternativo (obrigatório) e o destino. A arte aparece inteira, centralizada na faixa, sem corte; em telas mais largas ou mais estreitas sobra fundo ouro dos lados."
- **home-nao-passa-pela-funcao-api-page** — RN-02 reescrita: "… Por isso a página já sai do servidor dizendo se a faixa existe — em toda página da loja, Home inclusive — e a loja reserva a altura desde a primeira pintura. Quem decide se a faixa aparece numa visita é essa resposta do servidor; a configuração que chega depois só preenche os avisos."
- A tabela "Plano técnico (para a spec)" do PRD não foi editada (é insumo): onde ela diverge (migration, `check`, lista de guardas), valem as Decisões da spec.

### Leitura humana

Veredicto `changes_requested_blocking` por um único bloqueio: a reserva de altura que o PRD supunha pronta não existia
fora da página de produto, e a Home nem passa pelo servidor. Resolvido levando a Home à função e fazendo toda página
dizer se a faixa existe, ao custo de até 1 h de atraso para ligar/desligar valer em todas as páginas. Os outros ajustes
alinham altura, arte e giro ao que o código já faz. Nada ficou aberto.
