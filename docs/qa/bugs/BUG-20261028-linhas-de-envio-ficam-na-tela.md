# BUG-20261028-linhas-de-envio-ficam-na-tela: As linhas "enviada" ficam no Resumo, até de foto que já foi removida

- **Status:** fixed — retestado em navegador (2026-10-28, working tree, sem commit; `verified` depois do commit) · reteste em `reports/2026-10-28-backoffice-resumo-com-imagens-reteste.md`
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, Adicionar imagens → Editar mídia → remover
- **Scenarios:** PNL-midia-adicionar-pelo-resumo; PNL-midia-produto-sem-imagem
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

Depois de um envio, as linhas "teste85-verde.png · enviada" continuam no Resumo indefinidamente (até salvar e
recarregar). Se a Adri remove aquela foto no modal, a linha segue dizendo "enviada" — numa peça sem foto nenhuma o
card mostra "Nenhuma imagem ainda" e, logo abaixo, "teste85-vermelho.png · enviada". Ela fica sem saber se a foto
está ou não na peça.

## Reproduction

- **Charter:** CH-midia-ver-e-cuidar-da-peca-no-celular / CH-midia-produto-sem-imagem · **Tour:** Money / Feature
- **Environment:** 390×844, Chromium, pt-BR

1. `/admin/produtos/novo`, enviar um PNG pelo Resumo (ou pelo modal).
2. Editar mídia → Remover imagem 1 → Esc.

**Expected:** a linha some quando o envio termina, ou ao menos quando a foto sai.
**Actual:** "Nenhuma imagem ainda | Adicionar imagens | … | teste85-vermelho.png | enviada".

## Evidence

- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-06-resumo-depois-modal-390.png` (verde removida, linha "enviada"), `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-26-novo-depois-remover-390.png`

## Fix

- **Root cause:** `useProductImageUpload` só limpava o progresso no começo do envio seguinte; as linhas "enviada" ficavam até recarregar.
- **Fix commit:** commit pendente (sem commit, regra do projeto) — aplicado na working tree: `features/product-form/model/useProductImageUpload.ts` — quando o ÚLTIMO lote termina, as linhas "enviada" saem depois de `UPLOAD_DONE_LINGER_MS` (4000 ms); as "falhou" ficam até o próximo envio (a Adri precisa ler qual arquivo não entrou; o toast some sozinho). Um envio novo cancela a limpeza agendada, outro lote no ar a adia, e desmontar a cancela.
- **Regression test:** `useProductImageUpload.test.ts` › "as linhas \"enviada\" saem depois do envio" (5 casos com relógio falso: os 4000 ms cravados, saem as enviadas e ficam as falhas, nada sai com outro lote no ar, envio novo cancela a limpeza — mutante sem o cancelamento morto —, desmontar não deixa temporizador) — vermelhos antes.

## Reteste (2026-10-28) — passou

390×844, `/admin/produtos/novo`, bundle com `UPLOAD_DONE_LINGER_MS` conferido.

- Envio de 1 PNG pelo "Adicionar" do Resumo: "rt85-azul.png · enviada" aparece e **sai 4,35 s** depois do fim do lote.
- Lote de 2 pelo Resumo com o 1º upload forçado a 500 (rota interceptada): no fim, "rt85-verde.png · falhou" e
  "rt85-azul.png · enviada"; aos 3 s, as duas; aos 5 s, **só "falhou"**; aos 15 s, "falhou" segue.

Evidência: `.playwright-mcp/85-reteste-04-enviada-resumo-390.png`, `85-reteste-05-enviada-e-falhou-390.png`,
`85-reteste-06-so-falhou-fica-390.png`.
