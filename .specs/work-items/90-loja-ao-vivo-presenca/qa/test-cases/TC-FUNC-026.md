## TC-FUNC-026: "Com sacola" conta cada navegador uma vez no dia e nunca passa de Visitas

**Tipo:** functional
**Prioridade:** P1
**Origem:** LAV-51
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 4
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** —

### Objetivo

A Adri quer saber quantas das visitas chegaram a pôr uma joia na sacola; contar a mesma pessoa duas vezes
inventa interesse.

### Pré-condições

- Conta: `admin-atelie`; clientes `anonima` com estatística aceita
- Massa: ambiente do CH-01; Hoje com Visitas e Com sacola anotados
- Estado de partida: Acessos em Hoje

### Condições reais

as da persona

### Passos

1. Uma cliente nova pousa e põe uma joia na sacola; espera as leituras
   - **Esperado:** Visitas +1; Com sacola +1
2. A mesma cliente esvazia e põe de novo, duas vezes
   - **Esperado:** Com sacola não sobe mais
3. Uma cliente nova pousa e não põe nada na sacola
   - **Esperado:** Visitas +1; Com sacola igual
4. Compara Com sacola e Visitas em Hoje e em Ontem
   - **Esperado:** Com sacola ≤ Visitas nos dois

### Esperado e fonte

Uma vez por navegador no dia; nunca acima de Visitas — fonte: PRD LAV-51 item 2; spec D-02, D-03

### Variações

| Variação                          | Ação                                    | Esperado                      |
| --------------------------------- | --------------------------------------- | ----------------------------- |
| cliente sem estatística põe na sacola | Helena (recusou) põe joia na sacola    | nem Visitas nem Com sacola sobem |
