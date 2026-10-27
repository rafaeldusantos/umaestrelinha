# BUG-20261026-queda-curta-de-rede-apaga-o-codigo: Um segundo sem rede apaga o código que ela estava digitando

- **Status:** verified (retestado em navegador no build servido, 2026-10-27 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md, *Reteste*) — opção 1, com `SPEC_DEVIATION` de `MAF-19`
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passo 3
- **Scenarios:** MAD-envelope-queda-curta-com-folha-aberta
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

Com a folha aberta e o código digitado, a rede pisca por 1 s (`offline`/`online`). O app inteiro troca para "Sem
conexão" e desmonta (`MAF-19`); ao voltar, a folha não está mais lá, o que ela digitou sumiu e o foco caiu no
`<body>`. No balcão do correio, com 4G instável, é o caso comum. Vale para a folha do rastreio de saída também.

## Reproduction

- **Charter:** CH-envelope-com-rede-ruim · **Tour:** Network Tour

1. P82-F → "Informar código do envelope" → digitar `FF33334444BR`.
2. `setOffline(true)`, 1 s, `setOffline(false)`.

**Expected:** a folha e o digitado continuam; no máximo um aviso de sem conexão.
**Actual:** folha fechada, digitado perdido, foco no `<body>`.

## Decisão pendente

1. Só trocar para "Sem conexão" depois de alguns segundos offline (ou só na abertura), mantendo a árvore montada numa queda curta; a escrita sem rede já cai em "Não consegui salvar". Custo: rever `MAF-19` (nenhuma chamada ao Supabase sem rede).
2. Guardar o rascunho da folha em memória de módulo (nunca storage) e reabrir na volta. Custo: mais estado.

**Recomendação:** 1.

## Conserto (2026-10-27, feature `82`, Fase 5)

Opção 1, com carência de **5 s**.

- `apps/mobile-adm/src/shared/lib/useOnline.ts`: `CARENCIA_SEM_CONEXAO_MS = 5000` (o único lugar). O `offline` arma a contagem; no fim, se `navigator.onLine` continua falso, o app vai a "Sem conexão". O `online` desarma e volta na hora (`MAF-21`); cair de novo recomeça a contagem. Abrir já offline continua imediato. Passados os 5 s, o comportamento da `72` é o mesmo (nada do Supabase monta).
- `SPEC_DEVIATION` registrado em `.specs/features/72-mobile-adm-fundacao/spec.md` (`MAF-19`) e em `apps/mobile-adm/CLAUDE.md` (A árvore).
- Testes (reprovaram antes): `shared/lib/__tests__/useOnline.test.ts` › "a carência de 5 s" (5, timers falsos: 4.999 ainda online e 5.000 não; a volta antes cancela; "contínuos"; a leitura do fim; desmontar sem timer sobrando) e `pages/__tests__/envelopeDaCliente.test.tsx` › "T18 — …" (2, pela árvore real: 1 s sem rede com a folha aberta ⇒ folha, código digitado e foco ficam, e nada de "Sem conexão" depois; 4,9 s ainda a tela, 5 s a tela da `72`).
- **Testes antigos alterados** (asseriam a troca imediata, que é o defeito): só o RELÓGIO andou até os 5 s, nenhuma asserção mudou — `useOnline.test.ts` › "segue os eventos" (antes: `false` logo depois do `offline`; depois: com `vi.advanceTimersByTime(5000)` no mesmo `act`); `app/__tests__/semConexao.test.tsx` (`cair('offline')`: 700 ms → 5.700 ms; a volta segue 700); `app/__tests__/anuncios.test.tsx` › MAF-30 (50 → 5.050 ms); `pages/__tests__/acoesDoPedido.test.tsx` › MAA-25 (700 → 5.700 ms); `pages/__tests__/InicioPage.test.tsx` › MAI-18 (`cair('offline')` 700 → 5.700 ms).
- Sensor: M18 (o `offline` derrubando na hora) e M18b (a volta sem desarmar a contagem) — mortos por asserção; SHA-256 restaurado.

## Reteste (2026-10-27) — passou

- **Ambiente:** build servido (`vite preview` :4582, bundle `index-D3v4wZjc.js` conferido), Supabase local real, `functions serve` com a chave do Resend inválida, conta `adri.qa`, 390×844 toque; fixturas P82-A..G (`fixturas.sql` + as duas da sessão de QA), restauradas a cada percurso e apagadas no fim (contagens idênticas às de antes).
P82-A, folha aberta, `FF33334444BR` digitado e o campo focado; `context.setOffline(true)` por N ms e de volta:
- 1.000, 3.000 e 4.500 ms ⇒ "Sem conexão" nunca aparece; ao voltar, folha aberta, valor `FF33334444BR`, foco no campo.
- 6.000 ms ⇒ "Sem conexão" aos ~5.080 ms; ao voltar a folha não existe (o comportamento da `72`).
- Evidência: `evidence/2026-10-27-mobile-adm-envelope-da-cliente-reteste/18-3s-folha-intacta.png`, `18-6s-sem-conexao.png`.
