## TC-FUNC-011: Sem ninguém numa joia, a lista diz "Ninguém olhando uma joia agora." — categoria, busca e sacola não entram

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-31, LAV-32
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-02
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** único caso do estado vazio de C (LAV-32)

### Objetivo

A lista fala só de joias; quem está numa vitrine não vira uma linha sem foto, e a lista vazia não parece falha.

### Pré-condições

- Conta: `admin-atelie`
- Massa: ambiente do CH-01
- Estado de partida: `/ao-vivo`, ninguém na loja

### Condições reais

as da persona

### Passos

1. Ninguém na loja
   - **Esperado:** "Ninguém olhando uma joia agora."
2. Uma cliente numa categoria, outra na busca, outra na sacola
   - **Esperado:** o total é 3, e a lista continua "Ninguém olhando uma joia agora."
3. Uma delas abre uma joia
   - **Esperado:** a frase some e a joia aparece

### Esperado e fonte

Páginas que não são de joia não entram; a frase de vazio sem ninguém em joia — fonte: PRD LAV-31, LAV-32

### Variações

| Variação      | Ação                       | Esperado              |
| ------------- | -------------------------- | --------------------- |
| página `/conta` | cliente na conta           | não entra na lista    |
