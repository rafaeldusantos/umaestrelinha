# BUG-20261029-produto-inexistente-abre-formulario-vazio: um endereço de produto que não existe abre um formulário vazio marcado "Publicado"

- **Status:** open
- **Impact (user-side):** Trust-Damage
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-enviar-foto-pelo-painel, entrada (abrir a peça)
- **Scenarios:** PNL-imagem-webp-intacto
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-qualidade-das-imagens.md

## Summary

Abrindo `/admin/produtos/<id>/editar` com um id que não existe (link antigo, peça apagada, id colado
errado), o painel não diz "peça não encontrada": mostra "Editar produto" com o selo **Publicado**, o
formulário vazio, e aceita enviar fotos — que vão para o Storage sem dono. Achado por acaso na sessão da
`87` (um id errado no roteiro); **não é da `87`**.

## Reproduction

- **Charter:** CH-imagem-enviar-pelo-painel · **Tour:** Garbage Tour
- **Environment:** painel local :8083, 1440×900, admin local

1. Entrar como admin.
2. Abrir `/admin/produtos/d8bc0b3c-ba6f-4e9e-b81d-be4db3d0b03d/editar` (id que não existe no banco local).
3. Enviar uma foto pelo Resumo.

**Expected:** a tela diz que a peça não existe e oferece voltar à lista; nada é enviado.
**Actual:** formulário vazio com "Publicado" e "Alterações não salvas"; a foto sobe ao Storage.

## Evidence

- `evidence/2026-10-29-qualidade-das-imagens/87-qa-06-painel-resumo-1440.png`
- Leitura independente: `select … from products where id = 'd8bc…'` → zero linhas.
