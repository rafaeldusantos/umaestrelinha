## TC-FUNC-020: Trocar a campanha tira as peças que a nova não tem, diz quais saíram, e Cancelar desfaz a troca

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-03.6
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, passo 5
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** depende de P-AMBAS (marcada nas duas campanhas) e de a "Natal" ainda não ter bloco — por isso o CH-05 roda antes do CH-04

### Objetivo

A dona que experimenta outra campanha no bloco sabe quais peças a troca levaria embora, e pode desistir sem perder
nada.

### Pré-condições

- Conta: `admin-loja`; a loja sem login
- Massa: B-1 com "Dia das Mães" e, entre as escolhidas, P-AMBAS (acrescentá-la antes, se não estiver) e P-1 (só em "Dia das Mães"); "Natal" sem bloco
- Estado de partida: editor de B-1 sem alterações

### Condições reais

as da persona

### Passos

1. Trocar a campanha de B-1 para "Natal"
   - **Esperado:** as peças que não estão marcadas na "Natal" saem da lista, e o editor diz quais saíram; P-AMBAS
     fica
2. Cancelar
   - **Esperado:** a campanha volta a "Dia das Mães" e todas as peças voltam, na ordem de antes
3. Recarregar a loja
   - **Esperado:** B-1 igual a antes do passo 1 — nada foi gravado

### Esperado e fonte

Trocar a campanha com peças escolhidas tira as não marcadas na nova e diz quais; as marcadas nas duas ficam; nada
grava antes de salvar; Cancelar desfaz — fonte: PRD CA-03.6

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| ida e volta | trocar para "Natal" e voltar a "Dia das Mães" sem Cancelar | anotar se as peças que saíram voltam ou ficam fora (a fonte não decide a volta — sem achado), e Cancelar |
