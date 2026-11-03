## TC-FUNC-009: Adicional que exige material entra normalmente, e o bloco não diz qual material

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.10, CA-03.13
**Autor:** dev
**Persona:** PER-01 Marina
**Jornada:** J-02, passo 2
**Charter:** CH-02
**Situação:** ativo
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** a ausência de nome de material é texto conferível no DOM

### Objetivo

A cliente leva uma peça que vai precisar do material dela sem a loja afirmar qual material — ela escolhe isso no pós-compra.

### Pré-condições

- Conta: anonima
- Massa: M-01 com A3 (`requires_material` ligado)
- Estado de partida: sacola vazia

### Condições reais

As da persona.

### Passos

1. Marcar A3 e ler o bloco
   - **Esperado:** nenhuma menção a cinzas, leite materno, cabelo, pelo, dente, coto, flores ou penas no bloco
2. Levar o conjunto
   - **Esperado:** A3 entra como linha própria, como qualquer adicional

### Esperado e fonte

Fonte: PRD CA-03.10 ("adicional que exige material entra normalmente"), CA-03.13.

### Variações

| Variação | Ação | Esperado |
| -------- | ---- | -------- |
| principal também exige material | M-01 com material | o bloco segue sem dizer qual material |
