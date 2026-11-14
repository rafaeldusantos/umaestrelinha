## TC-SMOKE-001: A loja abre com a Home de sempre no perfil Padrão

**Tipo:** smoke
**Prioridade:** P0
**Origem:** CA-01
**Autor:** dev
**Persona:** PER-04 Lúcia
**Jornada:** J-04, passo 1
**Charter:** CH-06
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** 2 minutos; o build não quebrou a paleta

### Objetivo

Se a Home não abre ou abre sem cor, nada mais do plano faz sentido.

### Pré-condições

- Conta: `anonima`
- Massa: S0
- Estado de partida: navegador vazio

### Condições reais

390 × 844.

### Passos

1. Abre `http://localhost:8082/`
   - **Esperado:** a Home com cabeçalho `#283A4A` e os blocos de sempre
2. Abre um produto pelo primeiro cartão
   - **Esperado:** a página do produto com o preço legível

### Esperado e fonte

A loja abre no Padrão — fonte: PRD CA-01.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| —        | —    | —        |
