## TC-FUNC-020: A promoção vigente aparece na folha da variação e na linha da sacola

**Tipo:** functional
**Prioridade:** P1
**Origem:** UC-06
**Autor:** dev
**Persona:** PER-01 Adri no WhatsApp
**Jornada:** J-02, passo 3
**Charter:** CH-03
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a etiqueta foi corrigida na Validation (`09b5b575`)

### Objetivo

A Adri vê que a peça está em promoção antes de combinar outro desconto.

### Pré-condições

- Conta: `admin-atelie`
- Massa: uma promoção vigente de 15 % sobre uma peça; uma promoção já vencida sobre outra
- Estado de partida: passo 2

### Condições reais

As da persona.

### Passos

1. Abre a peça em promoção
   - **Esperado:** a etiqueta "<nome da promoção> · 15% nesta peça"
2. Acrescenta
   - **Esperado:** a linha da sacola com a etiqueta "<promoção> · 15%"; no passo 3, a linha da promoção (−) no resumo
3. Abre a peça da promoção vencida
   - **Esperado:** sem etiqueta

### Esperado e fonte

"promoção vigente" na folha — fonte: PRD › Passo 2; spec Design › Passo 2 e folha da variação.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| botão da folha | olha "Acrescentar · R$ X" | preço × quantidade, sem a promoção (Design) |
