# BUG-20261028-ordenar-fotos-so-arrastando: Só dá para mudar a ordem das fotos arrastando — sem teclado, e a peça de 28 fotos vira uma lista de 13 mil px

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack; Adri cadastrando peças (celular)
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, modal Mídia → ordenar
- **Scenarios:** PNL-midia-teclado-e-leitor; PNL-midia-modal-edicao-completa; PNL-midia-muitas-fotos
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

No modal Mídia a ordem só muda arrastando o ladrilho (HTML5 drag-and-drop). Pelo Tab a pessoa passa por Remover,
Alt-text e Gerar de cada foto, mas não existe controle de "mover" — quem usa teclado ou leitor não consegue
escolher a principal. No celular, com 28 fotos, a lista tem 13.208 px de altura numa área de 632 px: levar a última
para o topo é um arrasto de dezenas de telas (e o arrasto HTML5 com o dedo no Android não está provado).

## Reproduction

- **Charter:** CH-midia-teclado-e-leitor / CH-midia-muitas-fotos · **Tour:** Feature Tour
- **Environment:** 1440×900 teclado; 390×844 com `fdc81401-…` (28 fotos, sem salvar)

1. Editar mídia; Tab por todo o modal.
2. Em 390, abrir o modal da peça de 28 fotos e medir a área rolável.

**Expected:** a principal pode ser escolhida sem arrastar (ex.: "Tornar principal"/"Mover para cima").
**Actual:** ordem de Tab: Enviar imagens → (Remover n, Alt-text n, Gerar)×N → Vídeo → Concluir → Close; nenhum
controle de ordem. Área rolável 632 px, conteúdo 13.208 px. **Anterior à 85** (a galeria é a mesma da antiga aba).

## Evidence

- `evidence/2026-10-28-backoffice-resumo-com-imagens/85-qa-18-modal-28-390.png`; relatório, sessões 4 e 6.
