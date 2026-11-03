## TC-INT-007: Só a dona grava a configuração do Compre Junto; a loja lê sem conseguir escrever

**Tipo:** integration
**Prioridade:** P1
**Origem:** RNF-07
**Autor:** dev
**Persona:** PER-02 Adri
**Jornada:** n/a
**Charter:** CH-03 (não executado na sessão: fica com o Dev)
**Situação:** ativo
**Automação:** target `integration` · status `missing`
**Spec:** —
**Nota:** permissão no banco (RLS); provado pelo probe `01-listas.sh` e por `compreJuntoSchema.test.ts`; a parte visível ao usuário é TC-SEC-001

### Objetivo

Ninguém além da dona muda o que a loja oferece junto.

### Pré-condições

- Conta: anônima e `admin-painel`
- Massa: M-02, M-01
- Estado de partida: banco local

### Condições reais

As da persona.

### Passos

1. Como anônimo, ler as listas e os adicionais
   - **Esperado:** a leitura funciona (é o que a loja usa)
2. Como anônimo e como cliente logada, tentar gravar ou apagar lista e adicional
   - **Esperado:** recusado
3. Como `admin-painel`, gravar
   - **Esperado:** grava

### Esperado e fonte

Fonte: PRD RNF-07.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| produto inativo | lê como anônimo um adicional que aponta para produto inativo | o produto não volta na leitura de produtos (RLS de `products`) |
