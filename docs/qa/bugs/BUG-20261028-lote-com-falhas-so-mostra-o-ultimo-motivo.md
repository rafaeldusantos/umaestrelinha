# BUG-20261028-lote-com-falhas-so-mostra-o-ultimo-motivo: Quando vários arquivos do lote falham, só o motivo do último aparece

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, Adicionar imagens (falha)
- **Scenarios:** PNL-midia-falha-de-envio
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

A Adri solta um GIF, um PDF e um HEIC no Resumo. As três linhas dizem só "falhou"; o toast mostra o motivo
("formato não aceito — use PNG, JPG ou WebP") apenas do último arquivo — os anteriores são trocados na hora. O
mesmo com a rede caindo num lote de dois: só "teste85-verde.png: falha ao enviar". O lote segue (o que deu certo
entra) e o Salvar volta a habilitar — isso passa.

## Reproduction

- **Charter:** CH-midia-falhas-de-envio · **Tour:** Network Tour
- **Environment:** 390×844, Chromium, pt-BR (drop sintético; rede por `context.setOffline`)

1. Soltar `a1.gif` + `b2.pdf` sobre a foto principal do Resumo.
2. Olhar o toast nos 2 s seguintes.

**Expected:** dá para saber o motivo de cada arquivo recusado (`ADI-05`: "o toast com a mensagem de `uploadFailureMessage`").
**Actual:** um toast só, do último (`Notifications (F8)`, Radix, um por vez); as linhas não dizem o motivo.
Provavelmente anterior à 85 (motor e toaster compartilhados com a galeria) — não conferido na `master`.

## Evidence

- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-11-gif-pdf-heic-390.png`, `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-14-dois-recusados-390.png`, `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-15-offline-390.png`
