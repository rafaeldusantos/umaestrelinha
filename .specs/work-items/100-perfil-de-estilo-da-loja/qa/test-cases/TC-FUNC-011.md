## TC-FUNC-011: A marca desenhada acompanha o tom escuro do perfil, e o ícone, a cor do navegador e a imagem de compartilhamento não mudam

**Tipo:** functional
**Prioridade:** P1
**Origem:** RN-06
**Autor:** dev
**Persona:** PER-02 Bia
**Jornada:** J-03, passos 1 e 5
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** `stroke` computado da marca e os atributos do `<head>`, determinísticos

### Objetivo

A marca nas páginas veste a campanha; a marca que vai para fora (aba, favoritos, WhatsApp) continua a de sempre.

### Pré-condições

- Conta: `anonima`
- Massa: perfil salvo = Black Friday; anotados, com o Padrão (ou na referência do CH-06), `theme-color`, o `href` do
  favicon e `og:image`
- Estado de partida: Home em 390 × 844

### Condições reais

As da persona.

### Passos

1. Lê a cor da marca no rodapé e no menu do celular aberto
   - **Esperado:** `#0D0C0B` (primary-strong do Black Friday)
2. Lê a marca da Home e do cabeçalho do checkout
   - **Esperado:** `#0D0C0B`
3. Lê `meta[name=theme-color]`, o favicon e `meta[property="og:image"]`
   - **Esperado:** iguais aos anotados no Padrão

### Esperado e fonte

A marca desenhada nas páginas no tom escuro do perfil; `theme-color`, favicon e imagem de compartilhamento fixos —
fonte: PRD RN-06.

### Variações

| Variação | Ação           | Esperado                                  |
| -------- | -------------- | ----------------------------------------- |
| 1440     | repete rodapé e Home | o mesmo                             |
| Padrão   | (CH-06)        | a marca `#283A4A`, como hoje              |
