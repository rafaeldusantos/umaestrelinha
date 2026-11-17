## TC-FUNC-002: A lista de campanhas do bloco oferece as em vigência e as agendadas, na ordem do início, com estado e vigência

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.1
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-01, passo 3
**Charter:** CH-01
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** regra de lista determinística sobre a massa do manifesto

### Objetivo

A dona escolhe a campanha certa sem ser tentada por uma que já acabou ou que ela desligou, e sabe pela própria
lista qual está valendo e qual começa depois.

### Pré-condições

- Conta: `admin-loja`
- Massa: C-VIG em vigência, C-AGE agendada, C-ENC encerrada
- Estado de partida: editor de B-1 aberto, sem campanha

### Condições reais

as da persona

### Passos

1. Abrir o seletor de campanha
   - **Esperado:** "Dia das Mães" e "Natal", nessa ordem (pelo início), cada uma com o estado ("Em vigência",
     "Agendada") e a vigência (datas)
   - **Esperado:** "Black Friday" (encerrada) não aparece como opção
2. Ler o rótulo do seletor
   - **Esperado:** o seletor tem rótulo acessível

### Esperado e fonte

Opções = em vigência + agendadas, na ordem do início, com estado e vigência; encerradas e desligadas fora — fonte:
PRD CA-02.1. A segunda metade (a atual aparece mesmo encerrada ou desligada) é do TC-FUNC-021

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| campanha desligada existente | se C-DES já existir (CH-03), abrir o seletor de qualquer bloco | "QA103 Desligada" não é opção |
| teclado | abrir e percorrer o seletor só pelo teclado | todas as opções alcançáveis, estado lido junto do nome |
