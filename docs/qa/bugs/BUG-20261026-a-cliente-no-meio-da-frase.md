# BUG-20261026-a-cliente-no-meio-da-frase: Sem o nome da cliente, as frases saem "Use quando A cliente…" e "O material de A cliente…"

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1
- **Impact (user-side):** Cosmetic
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passos 2 e 5
- **Scenarios:** MAD-envelope-sem-nome-e-sem-materiais
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

`customerFirstName` devolve "A cliente" quando não há nome. No começo da frase está certo ("A cliente ainda não
informou o rastreio…"); no meio, a `82` escreve "Use quando A cliente mandar o código pelo WhatsApp." (folha) e
"O material de A cliente está na bancada." (aviso de "Colocar em produção"). A `ENV-05` define `{PrimeiroNome}` =
"A cliente", e `FolhaDoEnvelope.test.tsx` crava a forma — por isso é decisão.

## Reproduction

- **Charter:** CH-envelope-com-leitor-de-tela · **Tour:** Feature Tour

1. P82-F (`customer_name` vazio) → "Informar código do envelope": ler a frase.
2. P82-F → "Recebi o material" → "Colocar em produção": ler o aviso.

## Evidence

- evidence/2026-10-26-mobile-adm-envelope-da-cliente/s8-folha-a-cliente.png · evidence/2026-10-26-mobile-adm-envelope-da-cliente/s6-a-cliente-no-meio-da-frase.png

## Decisão pendente

1. Uma segunda forma em `core` para o meio da frase ("a cliente"; e "O material da cliente está na bancada."). Custo: a frase muda e uma asserção da spec é reescrita.
2. Manter. Custo: duas frases erradas, raras (pedido sem nome é importado ou antigo).

**Recomendação:** 1 (a frase é de `core`, o conserto é uma linha por frase).

## Conserto (2026-10-27, feature `82`, Fase 5, T20)

Opção 1 (recomendação do QA). Varridas todas as frases de `core` que interpolam o primeiro nome
(`customerFirstName`, `quemRecebe`, `materialTrackingSheet`, `materialTrackingEmpty`,
`actionConfirmation`): só DUAS punham o nome no meio da frase. As outras ("{quem} recebe a confirmação…",
"{quem} recebe o aviso…", "{quem} recebe o aviso de postagem…", "{nome} ainda não informou…") começam a
frase, e "A cliente" maiúsculo continua certo nelas.

- `packages/core/src/orders/appAction.ts`: `customerFirstNameMidSentence` (nome, ou "a cliente") e
  `customerFirstNameAfterDe` ("de Maria", ou "da cliente"), exportadas por `core/orders`.
  `actionConfirmation('producao')` ⇒ "O material da cliente está na bancada." sem nome.
- `packages/core/src/material/envelope.ts`: `materialTrackingSheet` ⇒ "Use quando a cliente mandar…".
- Spec: notas em `ENV-05` e `ENV-25` (a forma sem nome mudou, decisão de 2026-10-27).
- Testes novos: core `orders/__tests__/appAction.test.ts` — cada frase da ação SEM nome (null, '', '   '):
  registrar-recebimento, separar com material, marcar-enviado, salvar-rastreio (começo: "A cliente…") e
  produção (meio: "da cliente"); e os dois auxiliares. `material/__tests__/envelope.test.ts` — as duas
  frases da folha sem nome.
- **Asserções antigas alteradas** (antes ⇒ depois):
  - `packages/core/src/material/__tests__/envelope.test.ts`: "Use quando A cliente mandar o código pelo
    WhatsApp." ⇒ "Use quando a cliente mandar o código pelo WhatsApp." (+ a forma com "A caminho").
  - `packages/core/src/orders/__tests__/appAction.test.ts`: "O material de A cliente está na bancada." ⇒
    "O material da cliente está na bancada.".
  - `apps/mobile-adm/src/features/order-actions/ui/__tests__/FolhaDoEnvelope.test.tsx`:
    `/^Use quando A cliente mandar…/` ⇒ `/^Use quando a cliente mandar…/`.
- Vermelho antes: as asserções foram escritas antes do código, mas a suíte só correu depois; a prova de
  que reprovam sem o conserto é o sensor abaixo (o conserto revertido no arquivo real).
- Sensores: M20a a folha volta a `customerFirstName` ⇒ core 3 e app 1 reprovam; M20b a produção volta a
  "de ${quem}" ⇒ core 4. Por asserção; SHA-256 restaurado.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
P82-F (`customer_name` vazio):
- folha: "Use quando a cliente mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail."
- "Recebi o material" ⇒ "Material registrado. O pedido #P82-F foi para a bancada."; "Colocar em produção" ⇒ "Pedido em produção. O material da cliente está na bancada."
- No começo da frase continua "A cliente ainda não informou o rastreio. …".
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/20-folha-sem-nome.png`, `20-producao-sem-nome.png`.
