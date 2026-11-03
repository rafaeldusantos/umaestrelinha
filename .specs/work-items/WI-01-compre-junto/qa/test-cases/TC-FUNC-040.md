## TC-FUNC-040: A lista do Compre Junto não vira vitrine, página nem item de menu da loja

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-01.6
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** J-03, passo 8
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a dona confere a loja como visitante

### Objetivo

A dona não ganha, sem querer, uma página pública para cada lista que monta.

### Pré-condições

- Conta: `admin-painel` (a loja como visitante)
- Massa: M-02 salva
- Estado de partida: loja aberta

### Condições reais

As da persona.

### Passos

1. Procurar "Correntes" no menu da loja, na Home e na busca
   - **Esperado:** nenhuma vitrine ou página da lista (a busca pode achar as peças, como produtos)
2. Abrir `/correntes` e `/colecoes/correntes`
   - **Esperado:** a página de "não encontrado" da loja, não uma vitrine da lista
3. Em `/admin/menu` e `/admin/home`, procurar a lista entre os destinos
   - **Esperado:** a lista não é destino escolhível

### Esperado e fonte

Fonte: PRD CA-01.6.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| sitemap | abre `/sitemap.xml` | nenhuma `<loc>` da lista |
