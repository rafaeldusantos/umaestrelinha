## TC-FUNC-011: Com uma campanha agendada escolhida, o editor avisa que a prévia só mostra o bloco a partir do início

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-05.2
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 4
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** o aviso substitui mostrar o bloco agendado na prévia (gate Q-07)

### Objetivo

A dona que escolhe a "Natal" e não vê o bloco na prévia entende que é porque a campanha ainda não começou — não
que algo deu errado.

### Pré-condições

- Conta: `admin-loja`
- Massa: C-AGE ("Natal") agendada
- Estado de partida: editor de B-2 aberto, sem campanha

### Condições reais

as da persona

### Passos

1. Escolher "Natal"
   - **Esperado:** o editor avisa que a prévia só mostra o bloco a partir do início da campanha
   - **Esperado:** a prévia não mostra B-2
2. Escrever o título "Natal QA", escolher duas peças de "Natal" e salvar
   - **Esperado:** grava; o aviso continua

### Esperado e fonte

Com campanha agendada escolhida, o editor avisa que a prévia só mostra o bloco a partir do início — fonte: PRD
CA-05.2

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| voltar à vigente | num bloco sem outra campanha, trocar de "Natal" para uma em vigência livre (se houver) | o aviso some e a prévia mostra o bloco |
