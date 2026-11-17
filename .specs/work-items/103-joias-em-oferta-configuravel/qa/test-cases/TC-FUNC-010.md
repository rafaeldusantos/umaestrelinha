## TC-FUNC-010: A campanha que já tem outro bloco aparece indisponível, dizendo a posição e o título desse bloco

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.6
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passo 3
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a regra "um bloco por campanha" vista pela dona; determinístico

### Objetivo

A dona não monta, sem querer, dois blocos da mesma campanha — e sabe qual bloco já a usa.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com "Dia das Mães" e o título do CH-01; B-2 sem campanha
- Estado de partida: editor de B-2 aberto

### Condições reais

as da persona

### Passos

1. Abrir o seletor de campanha de B-2
   - **Esperado:** "Dia das Mães" aparece **desabilitada**, dizendo a posição de B-1 na Home e o título de B-1;
     "Natal" disponível
2. Tentar escolher "Dia das Mães" (clique e teclado)
   - **Esperado:** não é escolhida

### Esperado e fonte

Campanha que já tem outro bloco aparece desabilitada, dizendo a posição e o título desse bloco — fonte: PRD
CA-02.6

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| mover B-1 | arrastar B-1 para outra posição na lista e reabrir o seletor de B-2 | a frase diz a posição nova |
