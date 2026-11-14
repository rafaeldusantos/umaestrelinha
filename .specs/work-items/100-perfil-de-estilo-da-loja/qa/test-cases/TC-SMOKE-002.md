## TC-SMOKE-002: O card do perfil de estilo aparece em Configurações → Dados da loja com as duas opções

**Tipo:** smoke
**Prioridade:** P0
**Origem:** UC-01
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 1
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** 2 minutos; a entrada da jornada P0 é alcançável

### Objetivo

Sem o card, a dona não tem chave nenhuma.

### Pré-condições

- Conta: `admin-loja`
- Massa: S0
- Estado de partida: painel logado

### Condições reais

1440 × 900.

### Passos

1. Abre Configurações → Dados da loja
   - **Esperado:** o card "Perfil de estilo da loja" com "Padrão" (Em uso) e "Black Friday"
2. Confere a lista de seções de Configurações
   - **Esperado:** as cinco de sempre, nenhuma nova

### Esperado e fonte

O card existe na seção certa, sem seção nova — fonte: PRD UC-01, D-01; spec R12, H11.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| —        | —    | —        |
