## TC-FUNC-012: A linha do bloco de campanha agendada diz que ele não vai aparecer na loja e por quê, e a loja não o mostra

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-02.3, CA-02.2
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-03, passos 5–6
**Charter:** CH-04
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** a outra campanha em vigência não pode vazar para o bloco agendado

### Objetivo

A dona lê na lista que o bloco da "Natal" está pronto mas fora da loja até o início — e a cliente não vê nada dele,
nem o desconto da campanha que está valendo no lugar.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-2 salvo com "Natal" e "Natal QA" (TC-FUNC-011), ligado; B-1 com "Dia das Mães"
- Estado de partida: `/admin/home`; aba da loja sem login

### Condições reais

as da persona

### Passos

1. Ler a linha de B-2
   - **Esperado:** "Natal", o estado "Agendada", que o bloco não vai aparecer na loja e o motivo (a campanha ainda
     não começou)
2. Recarregar a loja
   - **Esperado:** só B-1 ("Dia das Mães"); nenhum bloco com "Natal QA", nem com os percentuais de "Dia das Mães"
     sob o título "Natal QA"

### Esperado e fonte

A linha diz a campanha e o estado e, fora de vigência, que não vai aparecer e por quê; antes do início o bloco não
aparece na loja — fonte: PRD CA-02.3, CA-02.2 (cenário "outra campanha em vigência enquanto a escolhida está
agendada")

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| loja em 1440 | repetir o passo 2 | o mesmo |
