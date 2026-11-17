## TC-FUNC-019: Sem nenhuma peça escolhida valendo, o bloco mostra só os cartões de percentual

**Tipo:** functional
**Prioridade:** P1
**Origem:** CA-04.5, CA-04.6
**Autor:** dev
**Persona:** PER-01 Adri
**Jornada:** J-04, ramo J-04b
**Charter:** CH-05
**Situação:** ativo
**Automação:** target `e2e` — status `missing`
**Spec:** —
**Nota:** conferido na prévia, sem salvar — a prévia é o desenho da loja

### Objetivo

Quando todas as peças que a dona escolheu deixaram de valer, o bloco continua dizendo o desconto da campanha em vez
de completar com peças que ela não escolheu ou de virar uma fileira vazia.

### Pré-condições

- Conta: `admin-loja`
- Massa: B-1 com P-FORA (despublicada) e P-NB (não barateada) ainda na lista, além de P-3, P-1, P-2
- Estado de partida: editor de B-1, prévia em Celular

### Condições reais

as da persona

### Passos

1. No rascunho, remover P-3, P-1 e P-2 (ficam só as que não valem)
   - **Esperado:** a prévia mostra o bloco com o selo, o título, a descrição e os cartões de percentual, **sem** a
     fileira de peças — nem as primeiras da campanha
2. Cancelar
   - **Esperado:** a lista e a prévia voltam ao que estava salvo

### Esperado e fonte

Todas as escolhidas deixaram de valer ⇒ os cartões de percentual sem a fileira; os cartões continuam com ou sem
peças — fonte: PRD CA-04.5, CA-04.6

### Variações

| Variação                 | Ação                                    | Esperado                          |
| ------------------------ | --------------------------------------- | --------------------------------- |
| prévia em Computador | repetir o passo 1 | o mesmo |
